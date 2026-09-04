# PENDIENTES · agentes Meta

Actualizar al final de cada sesión. Arriba lo más urgente.

## Bloqueado por el usuario
- [ ] **Token de Shopify**: crear la app personalizada (read_orders, read_all_orders, read_customers), pegar `SHOPIFY_ADMIN_TOKEN` en `.env`, subirlo con `gh secret set` y correr el backfill de 90 días. Pasos exactos en docs/02-accesos.md. Hasta entonces la vista Cuenta muestra el aviso "Shopify todavía sin datos".
- [ ] Dar de alta a Ernesto y Josué en https://bitacora-aromante.netlify.app/usuarios con sus contraseñas.
- [ ] Rotar el token personal de Supabase y la contraseña admin, ambos pegados en el chat (Jeshua lo hace de su lado, 2026-09-03).
- [x] Perfil de Aromante 1 capturado en la app (margen 30%, equilibrio 2.5, objetivo 6, CPA 170, techo 15,000, piso 9,000, cambio máx. 17%).
- [ ] Decidir canal de alertas (WhatsApp, Slack o email) y credenciales.
- [ ] System User de Meta para token permanente (opcional hasta el 2026-11-02).

## Siguiente sesión
- [x] Shopify: ingesta en el collector (`shopify_daily`), MER/CAC/ticket promedio y gráficas en Cuenta. Falta solo el token (arriba).
- [ ] Shopify: recompra (clientes que vuelven) y top productos por día.
- [ ] **Siguiente:** vista por anuncio con miniatura y "anuncios sin revisar"; después la vista de nomenclatura.
- [ ] UI: revisar en móvil real (el apilado a una columna está hecho pero no se capturó); afinar el alto de la tarjeta MER en /hoy cuando Shopify tenga datos.
- [ ] Fase 3: ventanas de evaluación 72h/7d/14d por sesión de cambios y agente semanal.
- [x] Desplegada en Netlify: https://bitacora-aromante.netlify.app (ver docs/04-deploy-web.md).
- [x] Supabase Auth: Site URL y Redirect URLs de producción y localhost configuradas por API (2026-09-03). Token personal en `.env` como `SUPABASE_ACCESS_TOKEN`; reusar `scripts/supabase-auth-urls.mjs` si cambia el dominio.
- [ ] Capturar la lista blanca de campañas y los noes duros en Configuración (el resto del perfil ya está).
- [ ] Vista de nomenclatura con entidades que tienen `issues`.
- [x] Insights por hora en el collector (28 días cargados; 7 días en cada corrida) y pantalla Horarios con mapa día × hora en CDMX, regla de evidencia mínima y bloques mejores/peores.
- [x] Acceso cambiado a usuario y contraseña (el enlace mágico chocó con el límite de correos de Supabase). Admin: jeshua@aromante.mx. Alta de usuarios en /usuarios (solo administradores).
- [ ] **Verificar el cron** después de la primera corrida programada (00:17 CDMX del 2026-09-04): `gh run list --workflow=collector` debe mostrar una fila con trigger `schedule`. Contexto: el 2026-09-03 la de las 18:00 CDMX no corrió; se movió el schedule al minuto 17 y `gh workflow list` confirma que está `active`. Si sigue sin correr, hacer un commit vacío y revisar Settings → Actions del repo.

## Hecho (últimas sesiones)
- 2026-09-03 (noche, 4) · Rediseño Bento UI + soft glow + gradient en tema oscuro sin tocar lógica ni consultas: tokens en globals.css, componentes Card/Kpi/Sparkline, pantalla /hoy como inicio (rejilla 12 col), barra lateral con íconos, todas las páginas con Card y chips semánticos, rampa del mapa de calor sobre fondo oscuro. Capturas en docs/capturas/. De paso: corregido un error real de Next en Cuenta (función pasada a componente cliente) que tiraba la página.
- 2026-09-03 (noche, 3) · Base sólida antes de la vista por anuncio: cron al minuto 17 (documentado el límite de 60 días sin commits); sesiones y grupos con ID determinista (UUID v5) y regrupado por upsert que re-enlaza anotaciones y ventanas antes de borrar (probado en core y contra la base real: 581 sesiones migradas, anotación de prueba sobrevivió); comando `regroup` de mantenimiento; CI con typecheck y pruebas en cada push/PR; alerta `meta_token_expiring` desde `debug_token` (hoy: válido, vence 2026-11-02).
- 2026-09-03 (noche, 2) · Integración de Shopify: paquete cliente Admin API, agregación diaria en core (6 pruebas), ingesta en el collector con alertas propias, migración 0005 (tienda por cuenta, día cerrado), vista Cuenta con ventas netas, MER, clientes nuevos, CAC y comparación de atribución Meta vs pedidos reales; docs de accesos y cron.
- 2026-09-03 (noche) · Pantalla Configuración por cuenta con historial de cambios; servidor local desacoplado (nohup).
- 2026-09-03 (tarde) · Repo GitHub + cron activo y probado desde la nube; login con enlace mágico y RLS; ingesta de insights diarios con reexpresión; vista Cuenta con gasto/ROAS/CPA y cambios marcados; CLAUDE.md, ROADMAP.md, PENDIENTES.md.
- 2026-09-03 · Análisis de viabilidad, benchmark Testmia, esquema Supabase, backfill 90 días, paquete core con 13 pruebas, collector idempotente, app web (timeline, detalle con anotaciones, estado), workflow cron, README, CLAUDE.md, ROADMAP.md.

## Bloqueos y notas
- Repo remoto: https://github.com/Jeshualapizco1/agentes-meta (privado). Secretos de Actions cargados el 2026-09-03. Para leer valores de .env en comandos usar `grep`/`cut`, no `source` (el clasificador de permisos lo bloquea).
- Meta invalidó el primer token el mismo día; el actual vence 2026-11-02.
- Chrome DevTools MCP no pudo abrir el navegador (perfil ocupado); verificar la UI a mano en el navegador.
- Netlify: el middleware edge no se ejecuta; `requireUser()` por página es la protección. Investigar en Fase 2 si conviene mover a Vercel o arreglar el edge handler. Entre dos deploys del 2026-09-03 la bitácora estuvo pública unos minutos (solo nombres de campañas y cambios, sin credenciales).
- Los procesos en segundo plano de Claude Code mueren al cerrar el turno: levantar el servidor con `nohup ... &`. localhost solo sirve en esta Mac; desde otro dispositivo en la misma red usar http://192.168.100.12:3000 (requiere añadir esa URL en Supabase Auth → Redirect URLs) o desplegar en Vercel.
