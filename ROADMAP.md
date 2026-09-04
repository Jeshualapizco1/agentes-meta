# ROADMAP · agentes Meta

Estimación v1: 8 a 9 semanas desde el 2026-09-03. Cada fase tiene criterio de éxito. Marca `[x]` al cerrar.

## Fase 0 · Spike y accesos (2-3 días) — cerrada 2026-09-03
- [x] Verificar API: log de cambios con actor/acción/valores; insights por hora
- [x] Proyecto Supabase + esquema (migraciones 0001, 0002)
- [x] Backfill 90 días de las 3 cuentas
- [x] Token de Meta extendido (vence 2026-11-02)
- [ ] Perfil por cuenta (margen, ROAS de equilibrio, CPA objetivo, techo/piso de gasto, lista blanca) — necesita datos del usuario
- [ ] System User de Meta (token sin caducidad) para producción

## Fase 1 · Bitácora (semanas 1-2)
- [x] Collector idempotente: entidades, snapshot diario, activities por huella, grupos, sesiones, agent_runs, alertas
- [x] Sesiones legibles con verbos, nombres de campaña, ↻ reinicio de aprendizaje
- [x] Parser de nomenclatura + chequeo de cumplimiento (guardado en `entities.parsed_name.issues`)
- [x] App: timeline por día con filtros, detalle de sesión, anotación de razón/hipótesis/criterio, estado del sistema
- [x] Días sin cambios reportados explícitamente
- [x] Cron cada 6 h (GitHub Actions) con consolidación 00:00 CDMX — repo y secretos listos 2026-09-03
- [x] Autenticación: enlace mágico de Supabase Auth restringido a `app_users` (RLS activo en todas las tablas)
- [ ] Alertas por WhatsApp/Slack/email de fallos del collector y cuenta deshabilitada
- [ ] Vista de nomenclatura: entidades con issues
- [ ] Criterio de éxito: todo cambio del Ads Manager aparece al día siguiente con hora CDMX, responsable y antes/después

## Fase 2 · Métricas y contexto (semanas 3-4)
- [x] Insights diarios por campaña/ad set/anuncio, últimos 14 días con reexpresión (`insights_daily` + historial)
- [x] Insights por hora (zona de cuenta → CDMX) y pantalla Horarios
- [x] Ventas netas de Shopify, MER, clientes nuevos, CAC, ticket promedio (collector + vista Cuenta; falta el token para llenar datos)
- [ ] Shopify: recompra y top productos
- [~] Regla de día cerrado (hecha en ingesta y vista Cuenta) + insignias de madurez y cobertura en cada métrica (pendiente)
- [x] Gráficas con los cambios marcados sobre ROAS, CPA y gasto (vista Cuenta, v1)
- [ ] Vista por anuncio con miniatura y contador de "anuncios sin revisar"
- [x] Rediseño Bento UI tema oscuro (tokens, Card/Kpi/Sparkline, barra lateral) — 2026-09-03
- [x] Panel "Hoy" (/hoy, página de inicio): ROAS héroe vs objetivo, MER/CAC, gasto de ayer vs techo, CPA, últimos cambios, alertas, propuestas (vacío hasta Fase 4)
- [ ] Criterio: ver cualquier cambio y su "después" en una sola pantalla

## Fase 3 · Agente semanal (semanas 5-6)
- [ ] Ventanas de evaluación por cambio a 72 h, 7 d y 14 d contra el resto de la cuenta
- [ ] Entidad experimento con hipótesis y criterio de éxito declarados antes
- [ ] Paquete de evidencia determinista + narrativa con Claude API
- [ ] Corrida domingo 23:59 CDMX + botón "forzar análisis"
- [ ] Veredicto preliminar → maduro; reporte enviable
- [ ] Criterio: el media buyer acepta el reporte como justo dos semanas seguidas

## Fase 4 · Agente estratega (semanas 7-8)
- [ ] Reglas de escalar/recortar con umbrales configurables y candados (máximo por cambio, espera, tope diario, lista blanca)
- [ ] Matriz de dayparting día × 4 bloques con significancia mínima (≥ 4 semanas)
- [ ] Alertas de reinicio de aprendizaje y highlights diarios/semanales
- [ ] Cola de propuestas con aprobar/rechazar y razón; modos off/semi por cuenta; freno de emergencia
- [ ] Criterio: una recomendación por semana que el equipo decida ejecutar

## Fase 4b · Ejecución asistida (después)
- [ ] Write-ahead log; movimientos atados con rollback y congelamiento 72 h; matriz de acciones permitidas

## Fase 5 · Calibración (continuo)
- [ ] Cada error vuelve como regla versionada; veredicto humano por propuesta alimenta umbrales
