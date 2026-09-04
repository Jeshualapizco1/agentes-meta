# PENDIENTES · agentes Meta

Actualizar al final de cada sesión. Arriba lo más urgente.

## Bloqueado por el usuario
- [ ] **Token de Shopify**: crear la app personalizada (read_orders, read_all_orders, read_customers), pegar `SHOPIFY_ADMIN_TOKEN` en `.env`, subirlo con `gh secret set` y correr el backfill de 90 días. Pasos exactos en docs/02-accesos.md. Hasta entonces la vista Cuenta muestra el aviso "Shopify todavía sin datos".
- [ ] Dar de alta a Ernesto y Josué en https://bitacora-aromante.netlify.app/usuarios con sus contraseñas.
- [ ] Rotar el token personal de Supabase y la contraseña admin, ambos pegados en el chat.
- [x] Perfil de Aromante 1 capturado en la app (margen 30%, equilibrio 2.5, objetivo 6, CPA 170, techo 15,000, piso 9,000, cambio máx. 17%).
- [ ] Decidir canal de alertas (WhatsApp, Slack o email) y credenciales.
- [ ] System User de Meta para token permanente (opcional hasta el 2026-11-02).

## Siguiente sesión
- [x] Shopify: ingesta en el collector (`shopify_daily`), MER/CAC/ticket promedio y gráficas en Cuenta. Falta solo el token (arriba).
- [ ] Shopify: recompra (clientes que vuelven) y top productos por día.
- [ ] Vista por anuncio con miniatura y "anuncios sin revisar"; vista de nomenclatura.
- [ ] Fase 3: ventanas de evaluación 72h/7d/14d por sesión de cambios y agente semanal.
- [x] Desplegada en Netlify: https://bitacora-aromante.netlify.app (ver docs/04-deploy-web.md).
- [x] Supabase Auth: Site URL y Redirect URLs de producción y localhost configuradas por API (2026-09-03). Token personal en `.env` como `SUPABASE_ACCESS_TOKEN`; reusar `scripts/supabase-auth-urls.mjs` si cambia el dominio.
- [ ] Capturar la lista blanca de campañas y los noes duros en Configuración (el resto del perfil ya está).
- [ ] Vista de nomenclatura con entidades que tienen `issues`.
- [x] Insights por hora en el collector (28 días cargados; 7 días en cada corrida) y pantalla Horarios con mapa día × hora en CDMX, regla de evidencia mínima y bloques mejores/peores.
- [x] Acceso cambiado a usuario y contraseña (el enlace mágico chocó con el límite de correos de Supabase). Admin: jeshua@aromante.mx. Alta de usuarios en /usuarios (solo administradores).
- [ ] Verificar que el cron de GitHub Actions corrió solo a las 00:00 CDMX (revisar en /estado o `gh run list --workflow=collector`).

## Hecho (últimas sesiones)
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
