-- Fase 4b · Tubería de ejecución en modo simulado (dry_run por cuenta, activado por defecto).
create table if not exists executions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references proposals(id),
  account_id text not null references accounts(id),
  step int not null default 1,
  pair_key text,                                -- las dos órdenes de un movimiento comparten clave
  order_payload jsonb not null,                 -- la orden validada (core.validateOrder)
  state text not null default 'registrada',     -- registrada | enviada | confirmada | fallida
  dry_run boolean not null default true,
  token_scopes text[],
  sent_at timestamptz, confirmed_at timestamptz, failed_at timestamptz,
  error text, response jsonb, reread jsonb,
  rollback_of uuid references executions(id),   -- esta ejecución revierte a aquella
  created_at timestamptz not null default now()
);
create index if not exists executions_proposal_idx on executions(proposal_id, step);
create index if not exists executions_account_sent_idx on executions(account_id, sent_at desc);
alter table executions enable row level security;
-- congelamiento: ninguna regla vuelve a tocar la entidad hasta `until`
create table if not exists entity_freezes (
  entity_id text primary key,
  account_id text not null references accounts(id),
  until timestamptz not null,
  reason text,
  execution_id uuid references executions(id),
  created_at timestamptz not null default now()
);
alter table entity_freezes enable row level security;
alter table account_profiles add column if not exists dry_run boolean not null default true;
-- destino de un movimiento de presupuesto y nota de ejecución en la propuesta
alter table proposals add column if not exists move_to_entity_id text;
alter table proposals add column if not exists move_to_before numeric;
alter table proposals add column if not exists execution_note text;
