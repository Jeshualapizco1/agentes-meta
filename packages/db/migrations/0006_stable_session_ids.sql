-- IDs de sesiones y grupos deterministas (UUID v5 en packages/core/src/ids.ts). El regrupado hace upsert por id,
-- re-enlaza anotaciones y ventanas de evaluación a la sesión/grupo nuevo que contiene los mismos eventos, y solo
-- entonces borra lo viejo. Las FK se quedan sin cascade a propósito: si algo falla, falla el collector, no se
-- pierden las razones que escribió el equipo.
comment on column change_sessions.id is 'UUID v5 de session|account_id|actor_id|started_at (estable entre corridas)';
comment on column change_groups.id is 'UUID v5 de group|account_id|actor_id|object_id|started_at (estable entre corridas)';
create index if not exists annotations_session_id_idx on annotations(session_id);
create index if not exists annotations_group_id_idx on annotations(group_id);
create index if not exists evaluation_windows_group_id_idx on evaluation_windows(group_id);
