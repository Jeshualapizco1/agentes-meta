-- Fase 3 · Salvedades por ventana (presupuesto compartido / control no independiente, control pequeño, gasto del control movido).
-- Las calcula core (evaluateChange) y el reporte las dice tal cual. Definiciones en docs/05-analista.md.
alter table evaluation_windows add column if not exists caveats jsonb not null default '[]'::jsonb;
comment on column evaluation_windows.caveats is 'Salvedades deterministas de la comparación (lista de textos en español)';
