-- Revisión y orden simulada en una sola transacción. No genera estados que tome el ejecutor real.
create function public.review_proposal_simulation_v1(
  p_actor text, p_account text, p_id uuid, p_decision text, p_after jsonb,
  p_reason text, p_profile_at timestamptz, p_rule_version integer
) returns text language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  v_profile public.account_profiles%rowtype;
  v_p public.proposals%rowtype;
  v_entity public.entities%rowtype;
  v_rule public.rules%rowtype;
  v_zone text; v_today date; v_before numeric; v_after numeric; v_pct numeric; v_prior numeric;
  v_count integer; v_order jsonb; v_days integer; v_spend numeric; v_purchases numeric; v_value numeric;
  v_metric numeric; v_min_fetch timestamptz; v_complete boolean; v_each boolean;
begin
  if p_actor is null or p_decision is null or p_decision not in ('simulada','rechazada') or p_reason is null or length(p_reason)>1000 or p_after is null or p_rule_version is null then raise exception 'DECISION_INVALID'; end if;
  perform 1 from public.app_users where email=p_actor and role in ('admin','buyer') for share;
  if not found then raise exception 'DECISION_UNAUTHORIZED' using errcode='42501'; end if;
  select timezone_name into v_zone from public.accounts where id=p_account and enabled for update;
  if not found then raise exception 'DECISION_ACCOUNT_UNAVAILABLE'; end if;
  v_today := (clock_timestamp() at time zone v_zone)::date;
  select * into v_profile from public.account_profiles where account_id=p_account for update;
  if not found then raise exception 'DECISION_PROFILE_UNAVAILABLE'; end if;
  select * into v_p from public.proposals where id=p_id and account_id=p_account for update;
  if not found then raise exception 'DECISION_PROPOSAL_UNAVAILABLE'; end if;
  if v_p.status=p_decision and v_p.decided_by=p_actor and v_p.after_value is not distinct from p_after then return v_p.status; end if;
  if v_p.status<>'pendiente' then raise exception 'DECISION_ALREADY_REVIEWED'; end if;
  if p_decision='rechazada' then
    if length(btrim(p_reason))=0 then raise exception 'DECISION_REASON_REQUIRED'; end if;
    update public.proposals set status='rechazada',decided_by=p_actor,decided_at=clock_timestamp(),decision_reason=p_reason where id=p_id;
    update public.rules set approved_streak=0,mode='semi',updated_by=p_actor where id=v_p.rule_id and account_id=p_account;
    return 'rechazada';
  end if;
  if v_profile.dry_run is distinct from true or v_profile.mode<>'semi' or v_profile.updated_at is distinct from p_profile_at then raise exception 'DECISION_PROFILE_CHANGED'; end if;
  if exists(select 1 from public.emergency_brakes where account_id=p_account and active) then raise exception 'DECISION_BRAKE'; end if;
  if v_p.expires_at is null or v_p.expires_at<=clock_timestamp() then raise exception 'DECISION_EXPIRED'; end if;
  select * into v_rule from public.rules where id=v_p.rule_id and account_id=p_account for update;
  if not found or v_rule.status<>'activa' or v_rule.version<>p_rule_version or v_rule.action<>v_p.action or
     (v_rule.valid_from is not null and v_rule.valid_from>v_today) or (v_rule.valid_to is not null and v_rule.valid_to<v_today) then raise exception 'DECISION_RULE_CHANGED'; end if;
  if not exists(select 1 from jsonb_array_elements(v_p.evidence) e where e->>'ref'='RULE_VERSION' and e->>'value'=p_rule_version::text) then raise exception 'DECISION_RULE_CHANGED'; end if;
  select * into v_entity from public.entities where id=v_p.entity_id and account_id=p_account for share;
  if not found or v_entity.effective_status is distinct from 'ACTIVE' or v_entity.level<>v_p.entity_level or
     v_entity.snapshot_at<clock_timestamp()-interval '30 hours' or v_entity.snapshot_at>clock_timestamp() then raise exception 'DECISION_ENTITY_CHANGED'; end if;
  if not (coalesce(case when v_entity.level='campaign' then v_entity.id else v_entity.campaign_id end,'')=any(v_profile.whitelist_campaign_ids)) then raise exception 'DECISION_NOT_WHITELISTED'; end if;
  if exists(select 1 from public.entity_freezes where account_id=p_account and entity_id in (v_entity.id,v_entity.campaign_id) and until>clock_timestamp()) then raise exception 'DECISION_FROZEN'; end if;
  if exists(select 1 from public.experiments where account_id=p_account and status in ('activo','evaluando') and coalesce(v_entity.campaign_id,v_entity.id)=any(campaign_ids)) then raise exception 'DECISION_EXPERIMENT'; end if;
  if exists(select 1 from public.proposals where account_id=p_account and id<>p_id and status in ('pendiente','aprobada','fallida') and (entity_id=v_entity.id or campaign_id=coalesce(v_entity.campaign_id,v_entity.id))) then raise exception 'DECISION_PENDING'; end if;
  select count(*) into v_count from public.proposals where account_id=p_account and status in ('simulada','ejecutada') and (decided_at at time zone v_zone)::date=v_today;
  if v_count>=v_profile.max_actions_per_day then raise exception 'DECISION_DAILY_LIMIT'; end if;
  if exists(select 1 from public.change_groups where account_id=p_account and (object_id in (v_entity.id,v_entity.campaign_id) or campaign_id=coalesce(v_entity.campaign_id,v_entity.id)) and started_at>clock_timestamp()-make_interval(hours=>v_profile.cooldown_hours)) then raise exception 'DECISION_COOLDOWN'; end if;
  v_days := (v_rule.condition->>'days')::integer;
  if v_rule.condition->>'version' is distinct from '1' or v_days is null or v_days not between 1 and 14 or v_rule.condition->>'level' is distinct from v_entity.level::text then raise exception 'DECISION_INVALID_POLICY'; end if;
  select count(distinct date),sum(spend),sum(coalesce(purchases,0)),sum(coalesce(purchase_value,0)),min(fetched_at),
    bool_and(is_closed_day and spend is not null and spend>=0 and coalesce(purchases,0)>=0 and coalesce(purchase_value,0)>=0 and fetched_at between clock_timestamp()-interval '30 hours' and clock_timestamp()),
    bool_and(case when v_rule.condition->>'metric'='roas' then case when v_rule.condition->>'operator'='gt' then coalesce(purchase_value,0)/nullif(spend,0)>(v_rule.condition->>'threshold')::numeric else coalesce(purchase_value,0)/nullif(spend,0)<(v_rule.condition->>'threshold')::numeric end
      when v_rule.condition->>'metric'='cpa' then case when v_rule.condition->>'operator'='gt' then spend/nullif(purchases,0)>(v_rule.condition->>'threshold')::numeric else spend/nullif(purchases,0)<(v_rule.condition->>'threshold')::numeric end else false end is true)
    into v_count,v_spend,v_purchases,v_value,v_min_fetch,v_complete,v_each
    from public.insights_daily where account_id=p_account and entity_id=v_entity.id and date>=v_today-v_days and date<v_today;
  if v_count<>v_days or v_complete is distinct from true or v_min_fetch<clock_timestamp()-interval '30 hours' or v_min_fetch>clock_timestamp() then raise exception 'DECISION_DATA_INCOMPLETE'; end if;
  if v_purchases<(v_rule.condition->>'minPurchases')::numeric or v_spend<(v_rule.condition->>'minSpend')::numeric then raise exception 'DECISION_SAMPLE'; end if;
  v_metric := case v_rule.condition->>'metric' when 'roas' then v_value/nullif(v_spend,0) when 'cpa' then v_spend/nullif(v_purchases,0) when 'spend_without_purchases' then case when v_purchases=0 then v_spend else null end end;
  if v_metric is null or not (case when v_rule.condition->>'operator'='gt' then v_metric>(v_rule.condition->>'threshold')::numeric else v_metric<(v_rule.condition->>'threshold')::numeric end) or
     ((v_rule.condition->>'consecutive')::boolean and v_each is distinct from true) then raise exception 'DECISION_CRITERIA_CHANGED'; end if;
  if v_p.action in ('subir_presupuesto','bajar_presupuesto') then
    if v_entity.level not in ('campaign','adset') or jsonb_typeof(p_after) is distinct from 'number' or jsonb_typeof(v_p.before_value) is distinct from 'number' or v_entity.daily_budget is null then raise exception 'DECISION_BUDGET_INVALID'; end if;
    if v_entity.level='adset' and exists(select 1 from public.entities where id=v_entity.campaign_id and daily_budget>0) then raise exception 'DECISION_CBO'; end if;
    v_before:=(v_p.before_value #>> '{}')::numeric; v_after:=(p_after #>> '{}')::numeric;
    if v_before<=0 or v_before*100<>v_entity.daily_budget or v_after<=0 or v_after*100<>trunc(v_after*100) or v_after*100>9007199254740991 then raise exception 'DECISION_BUDGET_CHANGED'; end if;
    if (v_p.action='subir_presupuesto' and v_after<=v_before) or (v_p.action='bajar_presupuesto' and v_after>=v_before) then raise exception 'DECISION_DIRECTION'; end if;
    v_pct:=abs((v_after-v_before)/v_before*100);
    if v_pct>v_profile.max_budget_change_pct then raise exception 'DECISION_CHANGE_LIMIT'; end if;
    select coalesce(sum(abs((details->'budget'->>'pct')::numeric)),0) into v_prior from public.change_groups where account_id=p_account and object_id=v_entity.id and kind='budget' and started_at>=clock_timestamp()-make_interval(days=>v_profile.cumulative_window_days);
    if v_prior+v_pct>v_profile.max_cumulative_change_pct then raise exception 'DECISION_CUMULATIVE_LIMIT'; end if;
    select coalesce(sum(e.daily_budget),0)/100 into v_prior from public.entities e where e.account_id=p_account and e.effective_status='ACTIVE' and (e.level='campaign' or (e.level='adset' and exists(select 1 from public.entities c where c.id=e.campaign_id and c.effective_status='ACTIVE' and coalesce(c.daily_budget,0)=0)));
    if v_p.action='bajar_presupuesto' and v_profile.daily_spend_floor is not null and v_prior-v_before+v_after<v_profile.daily_spend_floor then raise exception 'DECISION_SPEND_FLOOR'; end if;
    if v_p.action='subir_presupuesto' then
      if v_profile.daily_spend_ceiling is null or v_prior+v_after-v_before>v_profile.daily_spend_ceiling*v_profile.max_committed_budget_factor then raise exception 'DECISION_COMMITTED_CEILING'; end if;
      select sum(spend),bool_and(is_closed_day) into v_spend,v_complete from public.insights_daily where account_id=p_account and level='campaign' and date=v_today-1;
      if v_spend is null or v_complete is distinct from true or v_spend>v_profile.daily_spend_ceiling then raise exception 'DECISION_SPEND_CEILING'; end if;
    end if;
    v_order:=jsonb_build_object('op','cambiar_presupuesto','entity_id',v_entity.id,'level',v_entity.level,'daily_budget_cents',v_after*100,'previous_cents',v_before*100);
  elsif v_p.action='pausar_anuncio' and v_entity.level='ad' and p_after='"PAUSED"'::jsonb then
    v_order:=jsonb_build_object('op','pausar_anuncio','ad_id',v_entity.id,'previous_status','ACTIVE');
  else raise exception 'DECISION_ACTION_UNSUPPORTED';
  end if;
  if p_after is distinct from v_p.after_value and length(btrim(p_reason))=0 then raise exception 'DECISION_REASON_REQUIRED'; end if;
  insert into public.executions(proposal_id,account_id,order_payload,state,dry_run,response,reread)
    values(p_id,p_account,v_order,'confirmada',true,jsonb_build_object('simulated',true,'not_sent',true),jsonb_build_object('simulated',true,'remote_verification',false));
  update public.proposals set status='simulada',decided_by=p_actor,decided_at=clock_timestamp(),decision_reason=nullif(btrim(p_reason),''),
    corrected=p_after is distinct from v_p.after_value,proposed_value=v_p.after_value,after_value=p_after,
    execution_note='Decisión y orden simulada registradas de forma atómica. No se contactó Meta ni se verificaron permisos remotos.' where id=p_id;
  if p_after is distinct from v_p.after_value then update public.rules set approved_streak=0,mode='semi',updated_by=p_actor where id=v_p.rule_id; end if;
  return 'simulada';
end;
$$;
revoke all on function public.review_proposal_simulation_v1(text,text,uuid,text,jsonb,text,timestamptz,integer) from public, anon, authenticated;
grant execute on function public.review_proposal_simulation_v1(text,text,uuid,text,jsonb,text,timestamptz,integer) to service_role;
