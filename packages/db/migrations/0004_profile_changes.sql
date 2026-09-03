-- Historial de cambios de configuración por cuenta (quién cambió qué)
create table profile_changes (
  id bigserial primary key,
  account_id text not null references accounts(id),
  changed_by text not null,
  patch jsonb not null,
  created_at timestamptz not null default now()
);
create index on profile_changes(account_id, created_at desc);
alter table profile_changes enable row level security;
