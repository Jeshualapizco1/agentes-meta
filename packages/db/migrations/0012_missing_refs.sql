-- Fase 3 · Causa por la que falta cada referencia de la ventana ({rest, self}; null = existe). Ver docs/05-analista.md §4c.
alter table evaluation_windows add column if not exists missing_refs jsonb;
