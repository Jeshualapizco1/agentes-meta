-- Fase 3 · Experimentos con presupuesto de exploración (docs/05-analista.md §11). Se reutiliza la tabla de 0001 ampliándola.
alter table experiments alter column start_at drop not null;
alter table experiments alter column evaluate_at drop not null;
alter table experiments alter column success_criterion drop not null;
alter table experiments alter column status set default 'borrador';   -- borrador | activo | evaluando | graduado | descartado | cancelado
alter table experiments add column if not exists metric text;         -- roas | cpa
alter table experiments add column if not exists threshold numeric;
alter table experiments add column if not exists min_purchases int not null default 10;
alter table experiments add column if not exists window_days int not null default 7;
alter table experiments add column if not exists entity_ids text[] not null default '{}';    -- campañas o ad sets vinculados (como los eligió la persona)
alter table experiments add column if not exists campaign_ids text[] not null default '{}';  -- campañas resueltas para evaluar
alter table experiments add column if not exists start_date date;
alter table experiments add column if not exists session_id uuid;      -- sesión de origen (sin FK a propósito: el regrupado puede cambiar el ID; es informativo)
alter table experiments add column if not exists evaluation jsonb;     -- última evaluación del analista
alter table experiments add column if not exists proposed_verdict text; -- esperar | graduar | descartar | sin_evidencia | revisar
alter table experiments add column if not exists verdict_reason text;
alter table experiments add column if not exists decided_by text;
alter table experiments add column if not exists decided_at timestamptz;
alter table experiments add column if not exists updated_at timestamptz not null default now();
create index if not exists experiments_account_status_idx on experiments(account_id, status);
alter table account_profiles add column if not exists exploration_budget_pct numeric not null default 10;  -- % del techo reservado a pruebas
