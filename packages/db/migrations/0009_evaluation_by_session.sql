-- Fase 3 · Las ventanas de evaluación se calculan por sesión de cambios (campañas tocadas vs. resto de la cuenta)
alter table evaluation_windows alter column group_id drop not null;
alter table evaluation_windows add column if not exists session_id uuid references change_sessions(id);
alter table evaluation_windows add column if not exists account_id text references accounts(id);
create unique index if not exists evaluation_windows_session_horizon_idx on evaluation_windows(session_id, horizon);
create index if not exists evaluation_windows_account_idx on evaluation_windows(account_id, computed_at desc);
create unique index if not exists analyses_account_kind_period_idx on analyses(account_id, kind, period_end);
