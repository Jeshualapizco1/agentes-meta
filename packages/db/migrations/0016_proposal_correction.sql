-- Corrección de monto al aprobar: proposed_value guarda lo que propuso el agente; after_value queda con lo corregido (corrected = true).
alter table proposals add column if not exists proposed_value jsonb;
comment on column proposals.proposed_value is 'Valor que propuso el agente; after_value queda con el valor corregido por la persona cuando corrected = true';
