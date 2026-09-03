# PENDIENTES · agentes Meta

Actualizar al final de cada sesión. Arriba lo más urgente.

## Bloqueado por el usuario
- [ ] Datos del perfil de Aromante 1: margen bruto %, ROAS de equilibrio, CPA objetivo, techo y piso de gasto diario, campañas que el agente podrá tocar.
- [ ] Decidir canal de alertas (WhatsApp, Slack o email) y credenciales.
- [ ] System User de Meta para token permanente (opcional hasta el 2026-11-02).

## Siguiente sesión
- [ ] Desplegar la app (Vercel) para que el equipo la vea sin correrla en local. Al desplegar: agregar la URL pública en Supabase → Authentication → URL Configuration (Site URL y Redirect URLs) y en `APP_URL`.
- [ ] Vista de nomenclatura con entidades que tienen `issues`.
- [ ] Insights por hora (base del dayparting) en el collector; trasladar Mazatlán → CDMX.
- [ ] Shopify: ventas netas diarias, MER, clientes nuevos (conector ya disponible).
- [ ] Vista por anuncio con miniatura y "anuncios sin revisar".
- [ ] Probar el enlace mágico con un correo real (el SMTP integrado de Supabase permite pocos correos por hora; para producción configurar SMTP propio).
- [ ] Verificar que el cron de GitHub Actions corrió solo a las 00:00 CDMX (revisar en /estado o `gh run list --workflow=collector`).

## Hecho (últimas sesiones)
- 2026-09-03 (tarde) · Repo GitHub + cron activo y probado desde la nube; login con enlace mágico y RLS; ingesta de insights diarios con reexpresión; vista Cuenta con gasto/ROAS/CPA y cambios marcados; CLAUDE.md, ROADMAP.md, PENDIENTES.md.
- 2026-09-03 · Análisis de viabilidad, benchmark Testmia, esquema Supabase, backfill 90 días, paquete core con 13 pruebas, collector idempotente, app web (timeline, detalle con anotaciones, estado), workflow cron, README, CLAUDE.md, ROADMAP.md.

## Bloqueos y notas
- Repo remoto: https://github.com/Jeshualapizco1/agentes-meta (privado). Secretos de Actions cargados el 2026-09-03. Para leer valores de .env en comandos usar `grep`/`cut`, no `source` (el clasificador de permisos lo bloquea).
- Meta invalidó el primer token el mismo día; el actual vence 2026-11-02.
- Chrome DevTools MCP no pudo abrir el navegador (perfil ocupado); verificar la UI a mano en el navegador.
