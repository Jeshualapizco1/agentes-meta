-- Canal de alertas (Telegram): cada envío registrado con clave única para no duplicar y saber qué se avisó.
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,                 -- alert:<id> | summary:<cuenta>:<día> | proposal_pending:<id> | proposal_expired:<id>
  channel text not null default 'telegram',
  kind text not null,                       -- alerta_critica | resumen_diario | propuesta_pendiente | propuesta_expirada
  account_id text references accounts(id),
  message text not null,
  status text not null default 'sending',   -- sending | sent | failed
  response jsonb,
  created_at timestamptz not null default now(), sent_at timestamptz
);
create index if not exists notifications_created_idx on notifications(created_at desc);
alter table notifications enable row level security;
