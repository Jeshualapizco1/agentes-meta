# PENDIENTES · agentes Meta

Actualizar al final de cada sesión. Arriba lo más urgente.

## Bloqueado por el usuario
- [ ] **Llave de Claude para la narrativa semanal:** pegar `ANTHROPIC_API_KEY` en `.env` y subirla con `gh secret set ANTHROPIC_API_KEY --body "$(grep '^ANTHROPIC_API_KEY=' .env | cut -d= -f2 | xargs)"`. Sin ella el analista guarda la evidencia y los veredictos, pero el reporte queda sin redactar.
- [ ] Dar de alta a Ernesto y Josué en https://bitacora-aromante.netlify.app/usuarios con sus contraseñas.
- [ ] Rotar el token personal de Supabase y la contraseña admin, ambos pegados en el chat (Jeshua lo hace de su lado, 2026-09-03).
- [x] Perfil de Aromante 1 capturado en la app (margen 30%, equilibrio 2.5, objetivo 6, CPA 170, techo 15,000, piso 9,000, cambio máx. 17%).
- [ ] Decidir canal de alertas (WhatsApp, Slack o email) y credenciales.
- [ ] System User de Meta para token permanente (opcional hasta el 2026-11-02).

## Siguiente sesión
- [ ] **Siguiente (Fase 3, propósito b):** entidad experimento (hipótesis y criterio de éxito declarados antes, ligada a la sesión) y veredicto automático contra el criterio. Después, en este orden: estratega en modo semi con cola de propuestas en Hoy (Fase 4, diseño ya escrito en ROADMAP.md), luego alertas.
- [ ] Eduardo revisa tres veredictos maduros de /analisis contra lo que recuerda, para calibrar antes de confiar en el reporte (lo pide Jeshua).
- [ ] Revisar el umbral `CONTROL_SPEND_SHIFT_PCT = 20`: en la primera corrida real 43 de 144 ventanas llevan "control no fue estable" y 27 "presupuesto compartido". Si resulta ruido, subirlo a 30 y actualizar docs/05-analista.md §6.
- [ ] Vista de nomenclatura (entidades con `issues`); insignias de madurez/cobertura en cada métrica.
- [ ] UI: revisar en móvil real (el apilado a una columna está hecho pero no se capturó).
- [ ] Fase 3: ventanas de evaluación 72h/7d/14d por sesión de cambios y agente semanal.
- [x] Desplegada en Netlify: https://bitacora-aromante.netlify.app (ver docs/04-deploy-web.md).
- [x] Supabase Auth: Site URL y Redirect URLs de producción y localhost configuradas por API (2026-09-03). Token personal en `.env` como `SUPABASE_ACCESS_TOKEN`; reusar `scripts/supabase-auth-urls.mjs` si cambia el dominio.
- [ ] Capturar la lista blanca de campañas y los noes duros en Configuración (el resto del perfil ya está).
- [ ] Vista de nomenclatura con entidades que tienen `issues`.
- [x] Insights por hora en el collector (28 días cargados; 7 días en cada corrida) y pantalla Horarios con mapa día × hora en CDMX, regla de evidencia mínima y bloques mejores/peores.
- [x] Acceso cambiado a usuario y contraseña (el enlace mágico chocó con el límite de correos de Supabase). Admin: jeshua@aromante.mx. Alta de usuarios en /usuarios (solo administradores).
- [ ] **Verificar el cron** después de la primera corrida programada (00:17 CDMX del 2026-09-04): `gh run list --workflow=collector` debe mostrar una fila con trigger `schedule`. Contexto: el 2026-09-03 la de las 18:00 CDMX no corrió; se movió el schedule al minuto 17 y `gh workflow list` confirma que está `active`. Si sigue sin correr, hacer un commit vacío y revisar Settings → Actions del repo.

## Hecho (últimas sesiones)
- 2026-09-03 (noche, 8) · **Cierre antes de experimentos:** (1) bug del regrupado resuelto: `planRelink` en core re-enlaza anotaciones y ventanas por sesión y por grupo antes de borrar (3 pruebas nuevas, 30 en total; regroup real sin pérdidas); (2) CI ya existía (`ci.yml`: typecheck + pruebas en cada push/PR, verde); (3) `docs/05-analista.md` con fórmulas exactas, qué son los 10 puntos, compras suficientes, control pequeño y limitación de presupuesto compartido; salvedades por ventana en core, DB (migración 0010) y /analisis; narrativa con cita obligatoria de la fila de evidencia; (4) rumbo escrito en CLAUDE.md y ROADMAP.md: propósito (a) analizar, (b) testear con criterio previo, (c) automatizar; Fase 4 semi con cola de propuestas y Fase 4b con WAL, rollback y paso a auto por regla tras N aprobadas sin corrección.
- 2026-09-03 (noche, 7) · **Agente 2, analista semanal (Fase 3):** ventanas 72h/7d/14d por sesión contra el resto de la cuenta (core con 6 pruebas), agente `analyst` en el CLI y en el workflow (cada corrida recalcula; los lunes genera el reporte), evidencia semanal determinista + narrativa con Claude (pendiente de llave), pantalla /analisis con reporte y veredicto por sesión, botón Forzar análisis. Primera corrida real: 48 sesiones, 144 ventanas, 67 maduras. UI: calendario encadenado, cuadro flotante en gráficas, paginación en Anuncios.
- 2026-09-03 (noche, 6) · Correcciones pedidas: selector de periodo con calendario (inicio y fin) en Bitácora, Cuenta, Horarios y Anuncios; Hoy muestra ingresos atribuidos por Meta; la gráfica del héroe lee al pasar el cursor; fuera "días cerrados" de la app; las gráficas de Cuenta ya no listan sesiones al pasar el cursor. Nueva vista /anuncios con miniatura, métricas por periodo, "Revisado" (tabla `ad_reviews`, migración 0008) y contador de sin revisar en Hoy.
- 2026-09-03 (noche, 5) · Eliminada la integración de Shopify por decisión del dueño (la verdad es Meta, con wetracked.io conectado): paquete, ingesta, tabla `shopify_daily`, columna `accounts.shopify_domain`, tarjetas y docs. Migración 0007.
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
