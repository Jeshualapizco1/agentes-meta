-- Fase 3 · Segunda referencia por ventana: la campaña tocada contra sí misma en los 7 días cerrados previos (baseline),
-- acuerdo entre las dos lecturas (agree | partial | mixed | single | none) y lectura combinada (up | flat | down).
alter table evaluation_windows add column if not exists baseline jsonb;
alter table evaluation_windows add column if not exists agreement text;
alter table evaluation_windows add column if not exists reading text;
comment on column evaluation_windows.agreement is 'agree: resto y semana previa coinciden · partial: una clara y otra plana · mixed: se contradicen · single: solo una lectura · none';
-- Perfil · tope de cambio acumulado de presupuesto sobre la misma campaña en una ventana de días (docs/06-criterio-operacion.md)
alter table account_profiles add column if not exists max_cumulative_change_pct numeric not null default 35;
alter table account_profiles add column if not exists cumulative_window_days int not null default 7;
