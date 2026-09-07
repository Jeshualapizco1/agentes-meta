-- Expansión: no cambia la política de las cuentas existentes ni elimina su historial.
alter table public.account_profiles add column version integer not null default 1 check (version > 0);
alter table public.profile_changes add column from_version integer;
alter table public.profile_changes add column to_version integer;
alter table public.profile_changes add column before_profile jsonb;
alter table public.profile_changes add column after_profile jsonb;
create unique index profile_changes_account_version_idx on public.profile_changes(account_id, to_version)
  where to_version is not null;

-- Incluso una escritura administrativa directa invalida formularios anteriores.
create function public.bump_account_profile_version() returns trigger
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if TG_OP = 'INSERT' then new.version := 1;
  else new.version := old.version + 1;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.bump_account_profile_version() from public, anon, authenticated;
create trigger account_profile_version before insert or update on public.account_profiles
  for each row execute function public.bump_account_profile_version();

-- Contrato v1: reemplazo completo de campos editables, actor verificado por el servidor.
-- SECURITY INVOKER no eleva privilegios. Solo el backend service_role puede invocarlo.
create function public.save_account_profile_v1(
  p_account_id text, p_expected_version integer, p_changed_by text, p_profile jsonb
) returns integer
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  v_before public.account_profiles%rowtype;
  v_after public.account_profiles%rowtype;
  v_input public.account_profiles%rowtype;
  v_key text;
  v_number numeric;
  v_ids text[];
  v_count integer;
  v_found boolean;
  v_diff jsonb;
  v_keys constant text[] := array[
    'gross_margin_pct','breakeven_roas','target_roas','target_cpa','daily_spend_ceiling','daily_spend_floor',
    'max_budget_change_pct','cooldown_hours','max_actions_per_day','max_cumulative_change_pct',
    'cumulative_window_days','max_committed_budget_factor','exploration_budget_pct',
    'dry_run','whitelist_campaign_ids','hard_noes','mode'
  ];
begin
  if p_account_id is null or p_account_id !~ '^[0-9]{1,32}$' or p_expected_version is null or p_expected_version < 0 then
    raise exception using errcode = '22023', message = 'PROFILE_INVALID';
  end if;
  -- El bloqueo mantiene válida la autorización hasta terminar esta transacción.
  perform 1 from public.app_users where email = p_changed_by and role = 'admin' for share;
  if not found then raise exception using errcode = '42501', message = 'PROFILE_ADMIN_REQUIRED'; end if;
  -- Serializa también la creación inicial, cuando aún no existe una fila de perfil.
  perform 1 from public.accounts where id = p_account_id and enabled for update;
  if not found then raise exception using errcode = 'P0001', message = 'PROFILE_ACCOUNT_UNAVAILABLE'; end if;
  select * into v_before from public.account_profiles where account_id = p_account_id for update;
  v_found := found;
  if coalesce(v_before.version, 0) <> p_expected_version then
    raise exception using errcode = 'P0001', message = 'PROFILE_VERSION_CONFLICT';
  end if;
  if p_profile is null or jsonb_typeof(p_profile) <> 'object' then
    raise exception using errcode = '22023', message = 'PROFILE_INVALID';
  end if;
  if not (p_profile ?& v_keys) or exists(select 1 from jsonb_object_keys(p_profile) k where not (k = any(v_keys))) then
    raise exception using errcode = '22023', message = 'PROFILE_INVALID_FIELDS';
  end if;
  foreach v_key in array v_keys[1:13] loop
    if jsonb_typeof(p_profile->v_key) = 'null' and v_key = any(v_keys[1:6]) then continue; end if;
    if jsonb_typeof(p_profile->v_key) <> 'number' then
      raise exception using errcode = '22023', message = 'PROFILE_INVALID_NUMBER';
    end if;
    v_number := (p_profile->>v_key)::numeric;
    -- Límite de representación del cliente JS, no umbral de negocio.
    if v_number < 0 or v_number > 9007199254740991 then
      raise exception using errcode = '22023', message = 'PROFILE_INVALID_NUMBER';
    end if;
    if v_key = any(array['gross_margin_pct','breakeven_roas','target_roas','target_cpa','max_committed_budget_factor','cumulative_window_days']) and v_number <= 0 then
      raise exception using errcode = '22023', message = 'PROFILE_INVALID_NUMBER';
    end if;
    if v_key = any(array['gross_margin_pct','exploration_budget_pct']) and v_number > 100 then
      raise exception using errcode = '22023', message = 'PROFILE_INVALID_NUMBER';
    end if;
    if v_key = any(array['cooldown_hours','max_actions_per_day','cumulative_window_days']) and (trunc(v_number) <> v_number or v_number > 2147483647) then
      raise exception using errcode = '22023', message = 'PROFILE_INVALID_INTEGER';
    end if;
  end loop;
  if jsonb_typeof(p_profile->'mode') <> 'string' or p_profile->>'mode' not in ('off','semi') or
     jsonb_typeof(p_profile->'dry_run') <> 'boolean' or
     jsonb_typeof(p_profile->'hard_noes') not in ('string','null') or length(p_profile->>'hard_noes') > 10000 then
    raise exception using errcode = '22023', message = 'PROFILE_INVALID';
  end if;
  if jsonb_typeof(p_profile->'whitelist_campaign_ids') <> 'array' then
    raise exception using errcode = '22023', message = 'PROFILE_INVALID_WHITELIST';
  end if;
  if exists(select 1 from jsonb_array_elements(p_profile->'whitelist_campaign_ids') item
      where jsonb_typeof(item) <> 'string' or item #>> '{}' !~ '^[0-9]{1,32}$') then
    raise exception using errcode = '22023', message = 'PROFILE_INVALID_WHITELIST';
  end if;
  select coalesce(array_agg(distinct id order by id), '{}') into v_ids
    from jsonb_array_elements_text(p_profile->'whitelist_campaign_ids') id;
  -- Pausadas seleccionadas sí; entidades de otra cuenta o nivel nunca.
  perform 1 from public.entities where id = any(v_ids) and account_id = p_account_id and level = 'campaign' order by id for share;
  get diagnostics v_count = row_count;
  if v_count <> cardinality(v_ids) then
    raise exception using errcode = '22023', message = 'PROFILE_INVALID_WHITELIST';
  end if;
  select * into v_input from jsonb_populate_record(null::public.account_profiles, p_profile);
  if v_input.daily_spend_floor > v_input.daily_spend_ceiling then
    raise exception using errcode = '22023', message = 'PROFILE_FLOOR_ABOVE_CEILING';
  end if;
  insert into public.account_profiles (
    account_id, gross_margin_pct, breakeven_roas, target_roas, target_cpa, daily_spend_ceiling, daily_spend_floor,
    max_budget_change_pct, cooldown_hours, max_actions_per_day, max_cumulative_change_pct, cumulative_window_days,
    max_committed_budget_factor, exploration_budget_pct, dry_run, whitelist_campaign_ids, hard_noes, mode
  ) values (
    p_account_id, v_input.gross_margin_pct, v_input.breakeven_roas, v_input.target_roas, v_input.target_cpa,
    v_input.daily_spend_ceiling, v_input.daily_spend_floor, v_input.max_budget_change_pct, v_input.cooldown_hours,
    v_input.max_actions_per_day, v_input.max_cumulative_change_pct, v_input.cumulative_window_days,
    v_input.max_committed_budget_factor, v_input.exploration_budget_pct, v_input.dry_run, v_ids, v_input.hard_noes, v_input.mode
  ) on conflict (account_id) do update set
    gross_margin_pct = excluded.gross_margin_pct, breakeven_roas = excluded.breakeven_roas,
    target_roas = excluded.target_roas, target_cpa = excluded.target_cpa,
    daily_spend_ceiling = excluded.daily_spend_ceiling, daily_spend_floor = excluded.daily_spend_floor,
    max_budget_change_pct = excluded.max_budget_change_pct, cooldown_hours = excluded.cooldown_hours,
    max_actions_per_day = excluded.max_actions_per_day, max_cumulative_change_pct = excluded.max_cumulative_change_pct,
    cumulative_window_days = excluded.cumulative_window_days, max_committed_budget_factor = excluded.max_committed_budget_factor,
    exploration_budget_pct = excluded.exploration_budget_pct, dry_run = excluded.dry_run,
    whitelist_campaign_ids = excluded.whitelist_campaign_ids, hard_noes = excluded.hard_noes, mode = excluded.mode
  returning * into v_after;
  select coalesce(jsonb_object_agg(key, value), '{}') into v_diff
    from jsonb_each(to_jsonb(v_after)) where key = any(v_keys)
      and (not v_found or to_jsonb(v_before)->key is distinct from value);
  insert into public.profile_changes(account_id, changed_by, patch, from_version, to_version, before_profile, after_profile)
    values (p_account_id, p_changed_by, v_diff, coalesce(v_before.version, 0), v_after.version,
      case when v_found then to_jsonb(v_before) else null end, to_jsonb(v_after));
  return v_after.version;
end;
$$;
revoke all on function public.save_account_profile_v1(text, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_account_profile_v1(text, integer, text, jsonb) to service_role;
