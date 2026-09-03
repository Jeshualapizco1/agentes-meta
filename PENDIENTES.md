# PENDIENTES · agentes Meta

Actualizar al final de cada sesión. Arriba lo más urgente.

## Bloqueado por el usuario
- [ ] Capturar el perfil de Aromante 1 en la app (http://localhost:3000/configuracion): margen, ROAS de equilibrio/objetivo, CPA objetivo, techo/piso, lista blanca, noes duros.
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
- 2026-09-03 (noche) · Pantalla Configuración por cuenta con historial de cambios; servidor local desacoplado (nohup).
- 2026-09-03 (tarde) · Repo GitHub + cron activo y probado desde la nube; login con enlace mágico y RLS; ingesta de insights diarios con reexpresión; vista Cuenta con gasto/ROAS/CPA y cambios marcados; CLAUDE.md, ROADMAP.md, PENDIENTES.md.
- 2026-09-03 · Análisis de viabilidad, benchmark Testmia, esquema Supabase, backfill 90 días, paquete core con 13 pruebas, collector idempotente, app web (timeline, detalle con anotaciones, estado), workflow cron, README, CLAUDE.md, ROADMAP.md.

## Bloqueos y notas
- Repo remoto: https://github.com/Jeshualapizco1/agentes-meta (privado). Secretos de Actions cargados el 2026-09-03. Para leer valores de .env en comandos usar `grep`/`cut`, no `source` (el clasificador de permisos lo bloquea).
- Meta invalidó el primer token el mismo día; el actual vence 2026-11-02.
- Chrome DevTools MCP no pudo abrir el navegador (perfil ocupado); verificar la UI a mano en el navegador.
- Los procesos en segundo plano de Claude Code mueren al cerrar el turno: levantar el servidor con `nohup ... &`. localhost solo sirve en esta Mac; desde otro dispositivo en la misma red usar http://192.168.100.12:3000 (requiere añadir esa URL en Supabase Auth → Redirect URLs) o desplegar en Vercel.
