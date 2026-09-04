-- Rastro de cambios de veredicto por ventana (lo escribe el analista al recalcular). `matured` = el cambio ocurrió al madurar.
create table if not exists verdict_changes (
  id bigserial primary key,
  account_id text not null references accounts(id),
  session_id uuid not null,
  horizon horizon not null,
  from_status window_status, to_status window_status,
  from_reading text, to_reading text,
  from_confidence confidence, to_confidence confidence,
  from_verdict text, to_verdict text,
  matured boolean not null default false,
  changed_at timestamptz not null default now()
);
create index if not exists verdict_changes_account_idx on verdict_changes(account_id, changed_at desc);
alter table verdict_changes enable row level security;
