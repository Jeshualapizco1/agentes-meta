create table change_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id text not null references accounts(id),
  actor_id text, actor_name text, actor_kind actor_kind not null,
  started_at timestamptz not null, ended_at timestamptz not null,
  kind change_kind not null default 'other',
  significance significance not null default 'minor',
  resets_learning boolean not null default false,
  summary text not null,
  campaign_ids text[] not null default '{}',
  group_count int not null default 0, event_count int not null default 0,
  counts jsonb,
  created_at timestamptz not null default now()
);
create index on change_sessions(account_id, started_at desc);
create index on change_sessions(account_id, significance, started_at desc);
alter table change_groups add column session_id uuid references change_sessions(id);
create index on change_groups(session_id);
alter table annotations add column session_id uuid references change_sessions(id);
alter table annotations alter column group_id drop not null;
