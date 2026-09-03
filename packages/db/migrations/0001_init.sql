-- agentes-meta · esquema inicial (Fase 0/1)
create extension if not exists pgcrypto;

create type actor_kind as enum ('person','agent','meta','rule');
create type entity_level as enum ('campaign','adset','ad');
create type account_mode as enum ('off','semi','auto');
create type change_kind as enum ('budget','status','targeting','creative','bid','schedule','audience','name','objective','delivery','review','other');
create type significance as enum ('major','minor','system');
create type horizon as enum ('72h','7d','14d');
create type window_status as enum ('pending','preliminary','mature');
create type confidence as enum ('high','medium','low','insufficient');
create type reco_status as enum ('proposed','approved','rejected','applied','expired');
create type run_status as enum ('running','ok','failed','skipped');

create table accounts (
  id text primary key,                         -- numérico sin act_
  name text not null,
  business_id text, business_name text,
  currency text not null default 'MXN',
  timezone_name text not null,                 -- zona horaria REAL de la cuenta (Aromante 1/2 = America/Mazatlan)
  account_status int,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table account_profiles (
  account_id text primary key references accounts(id),
  gross_margin_pct numeric, breakeven_roas numeric, target_roas numeric, target_cpa numeric,
  daily_spend_ceiling numeric, daily_spend_floor numeric,
  whitelist_campaign_ids text[] not null default '{}',
  hard_noes text,
  mode account_mode not null default 'off',
  max_budget_change_pct numeric not null default 20,
  cooldown_hours int not null default 72,
  max_actions_per_day int not null default 5,
  updated_at timestamptz not null default now()
);

create table entities (
  id text primary key,
  account_id text not null references accounts(id),
  level entity_level not null,
  parent_id text, campaign_id text,
  name text not null,
  status text, effective_status text, objective text,
  daily_budget bigint, lifetime_budget bigint,
  bid_strategy text, optimization_goal text,
  created_time timestamptz, updated_time timestamptz,
  parsed_name jsonb,                            -- salida del parser de nomenclatura
  raw jsonb not null,
  snapshot_at timestamptz not null default now()
);
create index on entities(account_id, level);
create index on entities(campaign_id);

create table entity_snapshots (
  id bigserial primary key,
  entity_id text not null, account_id text not null references accounts(id),
  snapshot_date date not null,
  raw jsonb not null,
  unique(entity_id, snapshot_date)
);

create table change_events (
  id bigserial primary key,
  account_id text not null references accounts(id),
  event_time timestamptz not null,
  event_type text not null,
  actor_id text, actor_name text,
  actor_kind actor_kind not null default 'person',
  object_id text, object_name text, object_type text,
  application_name text,
  extra_data jsonb,
  old_value jsonb, new_value jsonb,
  fingerprint text not null unique,             -- idempotencia del collector
  group_id uuid,
  ingested_at timestamptz not null default now()
);
create index on change_events(account_id, event_time desc);
create index on change_events(object_id, event_time);
create index on change_events(group_id);

create table change_groups (
  id uuid primary key default gen_random_uuid(),
  account_id text not null references accounts(id),
  actor_id text, actor_name text, actor_kind actor_kind not null,
  object_id text, object_name text, object_type text, campaign_id text,
  started_at timestamptz not null, ended_at timestamptz not null,
  kind change_kind not null default 'other',
  significance significance not null default 'minor',
  resets_learning boolean not null default false,
  summary text not null,                        -- "Presupuesto diario $800 → $1,200 (+50%)"
  details jsonb,
  event_count int not null default 0,
  created_at timestamptz not null default now()
);
create index on change_groups(account_id, started_at desc);
create index on change_groups(campaign_id, started_at);
alter table change_events add constraint change_events_group_fk foreign key (group_id) references change_groups(id);

create table annotations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references change_groups(id),
  author_email text not null,
  reason text not null,
  hypothesis text, success_criterion text,
  created_at timestamptz not null default now()
);

create table experiments (
  id uuid primary key default gen_random_uuid(),
  account_id text not null references accounts(id),
  name text not null, hypothesis text not null, success_criterion text not null,
  budget numeric, start_at timestamptz not null, evaluate_at timestamptz not null,
  status text not null default 'running',       -- running | won | lost | inconclusive | cancelled
  verdict text, group_ids uuid[] not null default '{}',
  created_by text, created_at timestamptz not null default now()
);

create table insights_daily (
  account_id text not null references accounts(id),
  level entity_level not null,
  entity_id text not null,
  date date not null,                           -- en la zona horaria de la cuenta
  spend numeric, impressions bigint, reach bigint, clicks bigint, link_clicks bigint,
  purchases numeric, purchase_value numeric, add_to_cart numeric, initiate_checkout numeric,
  roas numeric, cpa numeric, cpm numeric, ctr numeric, frequency numeric,
  is_closed_day boolean not null default false,
  fetched_at timestamptz not null default now(),
  raw jsonb,
  primary key (entity_id, date)
);
create index on insights_daily(account_id, level, date);

create table insights_daily_history (            -- reexpresiones de Meta: se conserva cada captura
  id bigserial primary key,
  entity_id text not null, date date not null, fetched_at timestamptz not null,
  spend numeric, purchases numeric, purchase_value numeric, raw jsonb
);

create table insights_hourly (
  account_id text not null references accounts(id),
  level entity_level not null,
  entity_id text not null,
  date date not null, hour smallint not null,   -- hora local de la CUENTA; convertir a CDMX en consultas
  spend numeric, impressions bigint, clicks bigint, purchases numeric, purchase_value numeric,
  fetched_at timestamptz not null default now(),
  primary key (entity_id, date, hour)
);

create table shopify_daily (
  account_id text not null references accounts(id),
  date date not null,
  gross_sales numeric, discounts numeric, refunds numeric, net_sales numeric,
  orders int, new_customers int, new_customer_revenue numeric, sessions int,
  fetched_at timestamptz not null default now(),
  primary key (account_id, date)
);

create table evaluation_windows (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references change_groups(id),
  horizon horizon not null,
  starts_at timestamptz not null, ends_at timestamptz not null,
  status window_status not null default 'pending',
  metrics_before jsonb, metrics_after jsonb, control jsonb, delta jsonb,
  confidence confidence, verdict text,
  computed_at timestamptz,
  unique(group_id, horizon)
);

create table analyses (
  id uuid primary key default gen_random_uuid(),
  account_id text not null references accounts(id),
  kind text not null,                           -- weekly | manual | daily_highlights
  period_start date not null, period_end date not null,
  evidence jsonb not null, narrative text, model text,
  triggered_by text, created_at timestamptz not null default now()
);

create table recommendations (
  id uuid primary key default gen_random_uuid(),
  account_id text not null references accounts(id),
  analysis_id uuid references analyses(id),
  kind text not null,                           -- scale | cut | daypart | pause | learning_alert | naming
  entity_id text, payload jsonb not null, rationale text not null,
  confidence confidence not null,
  status reco_status not null default 'proposed',
  decided_by text, decided_at timestamptz, decision_reason text,
  created_at timestamptz not null default now()
);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  account_id text references accounts(id),
  kind text not null, severity text not null,   -- info | warning | critical
  message text not null, payload jsonb,
  created_at timestamptz not null default now(), acknowledged_at timestamptz, acknowledged_by text
);

create table rules (
  id uuid primary key default gen_random_uuid(),
  account_id text references accounts(id),
  name text not null, definition jsonb not null, version int not null default 1,
  active boolean not null default true, origin text,   -- manual | lesson:<recommendation_id>
  created_at timestamptz not null default now()
);

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent text not null, account_id text references accounts(id),
  started_at timestamptz not null default now(), finished_at timestamptz,
  status run_status not null default 'running',
  stats jsonb, error text, triggered_by text not null default 'schedule'
);

create table app_users (
  email text primary key, name text, role text not null default 'buyer',
  created_at timestamptz not null default now()
);

insert into accounts (id,name,business_id,business_name,currency,timezone_name,account_status) values
 ('1703313583465547','Aromante 1 Principal','3477342209205826','Aromante | Fragancias para Hombres','MXN','America/Mazatlan',1),
 ('868659071242640','Aromante 2','3477342209205826','Aromante | Fragancias para Hombres','MXN','America/Mazatlan',1),
 ('699409435248329','Aromante 3','3477342209205826','Aromante | Fragancias para Hombres','MXN','America/Mexico_City',1);
insert into account_profiles (account_id) values ('1703313583465547'),('868659071242640'),('699409435248329');
insert into app_users (email,name,role) values
 ('jeshualapizco@gmail.com','Jeshua','admin'),('jeshua@aromante.mx','Jeshua','admin'),
 ('ernesto@aromante.mx','Ernesto','buyer'),('josue@aromante.mx','Josué','buyer');
