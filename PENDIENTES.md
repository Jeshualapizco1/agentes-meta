# PENDIENTES · agentes Meta

Actualizar al final de cada sesión. Arriba lo más urgente.

## Bloqueado por el usuario
- [ ] Datos del perfil de Aromante 1: margen bruto %, ROAS de equilibrio, CPA objetivo, techo y piso de gasto diario, campañas que el agente podrá tocar.
- [ ] Decidir canal de alertas (WhatsApp, Slack o email) y credenciales.
- [ ] System User de Meta para token permanente (opcional hasta el 2026-11-02).

## Siguiente sesión
- [ ] Autenticación con enlace mágico (Supabase Auth) limitada a `app_users`; proteger `/bitacora`, `/sesion`, `/estado`.
- [ ] Vista de nomenclatura con entidades que tienen `issues`.
- [ ] Fase 2: ingesta de `insights_daily` (campaña, ad set, anuncio; 14 días con reexpresión) en el collector.
- [ ] Desplegar la app (Vercel) para que el equipo la vea sin correrla en local.

## Hecho (últimas sesiones)
- 2026-09-03 · Análisis de viabilidad, benchmark Testmia, esquema Supabase, backfill 90 días, paquete core con 13 pruebas, collector idempotente, app web (timeline, detalle con anotaciones, estado), workflow cron, README, CLAUDE.md, ROADMAP.md.

## Bloqueos y notas
- El clasificador de permisos bloqueó `gh repo create` combinado con `source .env`. Si vuelve a pasar, el usuario corre `docs/03-deploy-cron.md` a mano.
- Meta invalidó el primer token el mismo día; el actual vence 2026-11-02.
- Chrome DevTools MCP no pudo abrir el navegador (perfil ocupado); verificar la UI a mano en el navegador.
