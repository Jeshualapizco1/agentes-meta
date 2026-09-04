-- Techo en dos capas (docs/06 G1/G2): factor sobre el techo para la suma de presupuestos diarios activos.
alter table account_profiles add column if not exists max_committed_budget_factor numeric not null default 1.3;
