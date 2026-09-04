-- Fase 4 · Estratega en modo semi: reglas versionadas con historial, propuestas, freno de emergencia. docs/06-criterio-operacion.md.

-- rules (de 0001) se amplía; `definition` queda como texto libre de la regla original
alter table rules add column if not exists description text;
alter table rules add column if not exists condition jsonb not null default '{}'::jsonb;
alter table rules add column if not exists action text not null default 'bloquear_subidas';   -- pausar_anuncio | subir_presupuesto | bajar_presupuesto | mover_presupuesto | bloquear_subidas
alter table rules add column if not exists params jsonb not null default '{}'::jsonb;
alter table rules add column if not exists status text not null default 'activa';              -- activa | inactiva
alter table rules add column if not exists mode text not null default 'semi';                  -- semi | auto (auto se gana con approved_streak ≥ promote_after; Fase 4b)
alter table rules add column if not exists approved_streak int not null default 0;
alter table rules add column if not exists promote_after int not null default 10;
alter table rules add column if not exists valid_from date;
alter table rules add column if not exists valid_to date;
alter table rules add column if not exists updated_by text;
alter table rules add column if not exists updated_at timestamptz not null default now();

-- historial de cambios de reglas (como profile_changes): lo escribe un trigger para que ningún camino lo salte
create table if not exists rule_changes (
  id bigserial primary key,
  rule_id uuid not null references rules(id),
  account_id text references accounts(id),
  changed_by text not null,
  version int not null,
  patch jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists rule_changes_rule_idx on rule_changes(rule_id, created_at desc);
alter table rule_changes enable row level security;
create or replace function rules_bump_version() returns trigger language plpgsql as $$
begin new.version := old.version + 1; new.updated_at := now(); return new; end $$;
create or replace function rules_history() returns trigger language plpgsql as $$
begin
  insert into rule_changes(rule_id, account_id, changed_by, version, patch)
    values (new.id, new.account_id, coalesce(new.updated_by, 'sistema'), new.version, to_jsonb(new) - 'updated_at');
  return new;
end $$;
drop trigger if exists rules_bump_version_trg on rules;
create trigger rules_bump_version_trg before update on rules for each row execute function rules_bump_version();
drop trigger if exists rules_history_trg on rules;
create trigger rules_history_trg after insert or update on rules for each row execute function rules_history();

-- propuestas del estratega (write-ahead: primero la fila, luego cualquier orden en Fase 4b)
create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  account_id text not null references accounts(id),
  rule_id uuid references rules(id),
  rule_name text,
  run_id uuid references agent_runs(id),
  entity_id text not null, entity_level entity_level not null, entity_name text, campaign_id text,
  action text not null,
  before_value jsonb, after_value jsonb,
  evidence jsonb not null default '[]'::jsonb,      -- filas etiquetadas [W1], [T]… como en el analista
  locks jsonb not null default '[]'::jsonb,         -- candados evaluados con resultado y razón
  status text not null default 'pendiente',         -- pendiente | aprobada | rechazada | expirada | ejecutada | fallida | descartada (por candado)
  blocked_by text[] not null default '{}',
  decided_by text, decided_at timestamptz, decision_reason text,
  corrected boolean not null default false,
  created_at timestamptz not null default now(), expires_at timestamptz
);
create index if not exists proposals_account_status_idx on proposals(account_id, status, created_at desc);
alter table proposals enable row level security;

-- freno de emergencia por cuenta: se activa solo o a mano; se libera solo a mano, por admin, con razón
create table if not exists emergency_brakes (
  account_id text primary key references accounts(id),
  active boolean not null default false,
  engaged_by text, engaged_at timestamptz, engage_reason text,
  released_by text, released_at timestamptz, release_reason text,
  updated_at timestamptz not null default now()
);
alter table emergency_brakes enable row level security;

-- las dos reglas de techo ya decididas (2026-09-04), como candados sobre cualquier subida, para cada cuenta habilitada
insert into rules (account_id, name, description, definition, condition, action, params, status, mode, origin, updated_by)
select a.id, 'techo_gasto_real', 'Gasto real del último día cerrado por encima del techo: alerta warning y ninguna propuesta de subida ese día.',
  '{"fuente":"docs/06 G1/G2, decisión de Jeshua 2026-09-04"}'::jsonb,
  '{"metric":"spend_last_closed","op":">","ref":"daily_spend_ceiling"}'::jsonb, 'bloquear_subidas', '{"alert":"spend_over_ceiling","severity":"warning"}'::jsonb, 'activa', 'semi', 'manual', 'admin@aromante.mx'
from accounts a where a.enabled and not exists (select 1 from rules r where r.account_id = a.id and r.name = 'techo_gasto_real');
insert into rules (account_id, name, description, definition, condition, action, params, status, mode, origin, updated_by)
select a.id, 'techo_presupuesto_comprometido', 'Suma de presupuestos diarios activos por encima de techo × factor: alerta info "presupuesto comprometido X % del techo" y ninguna propuesta de subida.',
  '{"fuente":"docs/06 G1/G2, decisión de Jeshua 2026-09-04"}'::jsonb,
  '{"metric":"budget_active","op":">","ref":"daily_spend_ceiling","factor_ref":"max_committed_budget_factor"}'::jsonb, 'bloquear_subidas', '{"alert":"budget_committed","severity":"info"}'::jsonb, 'activa', 'semi', 'manual', 'admin@aromante.mx'
from accounts a where a.enabled and not exists (select 1 from rules r where r.account_id = a.id and r.name = 'techo_presupuesto_comprometido');
