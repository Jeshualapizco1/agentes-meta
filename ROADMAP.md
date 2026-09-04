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
- ~~Shopify (ventas netas, MER, CAC)~~ eliminado el 2026-09-03: la verdad es Meta (wetracked.io conectado); el proyecto es solo paid media
- [~] Regla de día cerrado (hecha en ingesta y vista Cuenta) + insignias de madurez y cobertura en cada métrica (pendiente)
- [x] Gráficas con los cambios marcados sobre ROAS, CPA y gasto (vista Cuenta, v1)
- [x] Vista por anuncio (/anuncios) con miniatura, gasto/ROAS/CPA/CTR por periodo, marcar revisado y contador de "anuncios sin revisar" (también en Hoy)
- [x] Rediseño Bento UI tema oscuro (tokens, Card/Kpi/Sparkline, barra lateral) — 2026-09-03
- [x] Panel "Hoy" (/hoy, página de inicio): ROAS héroe vs objetivo, gasto y compras, gasto de ayer vs techo, CPA, últimos cambios, alertas, propuestas (vacío hasta Fase 4)
- [ ] Criterio: ver cualquier cambio y su "después" en una sola pantalla

## Fase 3 · Agente semanal (semanas 5-6)
- [x] Ventanas de evaluación por sesión a 72 h, 7 d y 14 d: campañas tocadas vs. resto de la cuenta, antes vs. después, solo días completos (core con pruebas; tabla `evaluation_windows`)
- [x] Entidad experimento con hipótesis y criterio de éxito declarados antes (propósito (b)): presupuesto de exploración (% del techo), estados borrador/activo/evaluando/graduado/descartado/cancelado, evaluación contra el criterio propio con las dos referencias, veredicto propuesto por el analista y confirmado por una persona, "Convertir en experimento" desde la sesión, pantalla /experimentos, 4 pruebas en core — 2026-09-04
- [x] Definiciones por escrito en `docs/05-analista.md`; salvedades por ventana (presupuesto compartido, control pequeño, control inestable); narrativa con cita obligatoria de la fila de evidencia — 2026-09-03
- [x] Segunda referencia por ventana (la campaña contra sí misma en los 7 días cerrados previos); veredicto con las dos lecturas: coinciden → confianza normal, una plana → indicio (tope media), se contradicen → mixto (tope baja) — 2026-09-04
- [x] Paquete de evidencia determinista (`buildWeeklyEvidence`) + narrativa con Claude (claude-opus-5; requiere `ANTHROPIC_API_KEY` en secretos)
- [x] Corrida automática los lunes 00:17 CDMX (cierre del domingo) en el mismo workflow del collector + botón "Forzar análisis" en /analisis
- [x] Veredicto pendiente → preliminar → maduro por ventana; reporte en /analisis
- [ ] Reporte enviable (correo/WhatsApp) — depende del canal de alertas
- [ ] Criterio: el media buyer acepta el reporte como justo dos semanas seguidas

## Fase 4 · Agente estratega en modo semi (semanas 7-8)
Propósito (c) del proyecto: automatizar la operación. El destino es **auto con candados**; esta fase construye el camino: toda acción nace como propuesta, se aprueba en un clic y deja rastro para que la regla se gane el modo auto.

**Modelo de datos**
- [x] `rules` versionada por cuenta con historial por trigger (`rule_changes`): nombre, condición, acción (pausar anuncio, subir, bajar, mover, bloquear subidas), parámetros, estado, modo semi/auto, `approved_streak`, `promote_after`, vigencia. Sembradas las dos reglas de techo — 2026-09-04
- [x] `proposals`: cuenta, regla, entidad, acción, antes/después, evidencia etiquetada, candados evaluados con razón, estado (pendiente, aprobada, rechazada, expirada, ejecutada, fallida, descartada por candado), quién, razón, fecha; expiran si no se deciden antes de la siguiente pasada — 2026-09-04
- [x] Candados como función pura en core, en fila, con prueba por candado: freno, día cerrado, lista blanca, cambio máximo, cambio acumulado en ventana, espera (persona o agente), tope por pasada, techo por gasto real, techo por presupuesto comprometido — 2026-09-04
- [x] Pasada del estratega en el collector solo con el día anterior cerrado; las otras vigilan; huella en Bitácora como actor agente aunque no proponga — 2026-09-04
- [x] Freno de emergencia por cuenta (`emergency_brakes`): automático por gasto del día > techo × 1.5, exceso de propuestas, fallo de registro o problema de pago; cualquiera frena desde Hoy, solo admin libera con razón — 2026-09-04
- [ ] **Las reglas de acción salen de `docs/06-criterio-operacion.md`** (respuestas de Eduardo): cada respuesta → fila en `rules` (§"cómo se convierte") y su generador de candidatos en `generateCandidates`.

**Reglas v1** (una recomendación por semana que el equipo decida ejecutar)
- [ ] Escalar: ventana 7d madura con confianza ≥ media, ROAS ≥ objetivo y `diff_roas_pts ≥ +10` sin salvedad de presupuesto compartido → subir presupuesto ≤ máximo por cambio.
- [ ] Recortar: ROAS < equilibrio dos ventanas maduras seguidas y ≥ 30 compras → bajar presupuesto ≤ máximo por cambio; pausar solo si ROAS < equilibrio × 0.6.
- [ ] Alerta de reinicio de aprendizaje y highlights diarios/semanales (sin acción, solo informativos).
- [ ] Dayparting: matriz día × 4 bloques con ≥ 4 semanas de datos; con presupuesto diario solo se propone como texto (Meta no lo aplica).

**Cola de propuestas en Hoy (modo semi)**
- [x] Tarjeta por propuesta en Hoy: qué, evidencia y candados desplegables, Aprobar / Rechazar con razón obligatoria al rechazar; aprobar en semi solo cambia el estado — 2026-09-04
- [ ] Editar el monto al aprobar cuenta como corrección (`corrected`) y reinicia la racha.
- [x] Modo por cuenta (off / semi; auto "disponible en Fase 4b") en Configuración — 2026-09-04
- [ ] Criterio de éxito: cuatro semanas seguidas con al menos una propuesta aprobada por semana y menos de 30 % rechazadas.

## Fase 4b · Ejecución y paso a auto (después)
- [x] **Tubería en modo simulado (2026-09-04):** cliente de escritura con solo tres operaciones (pausar anuncio, cambiar presupuesto de campaña o ad set, mover presupuesto entre dos campañas como par atado; cualquier otra se rechaza en core); write-ahead log en `executions` con cuatro estados (registrada → enviada → confirmada releyendo la entidad | fallida con rollback); si no se registra, no se envía y se activa el freno; par atado: si falla la segunda se revierte la primera y ambas quedan congeladas 72 h (`entity_freezes`); `dry_run` por cuenta activado por defecto: simula todo, verifica `ads_management` con debug_token y deja la propuesta como "simulada"; al ejecutar de verdad entra a la bitácora como actor Estratega y el collector reconoce la orden propia en activities. 12 pruebas en core.
- [ ] Apagar `dry_run` en una cuenta (decisión del dueño) con System User que tenga `ads_management`; primera ejecución real vigilada.
- [ ] Botón "Revertir" a un clic desde la propuesta ejecutada (pasa por el mismo WAL con la orden inversa; pausar no tiene inversa).
- [ ] El candado `espera` debe leer también `entity_freezes` (hoy lee cambios de presupuesto recientes).
- [ ] **Paso a auto por regla:** una regla pasa de semi a auto cuando acumula N propuestas aprobadas seguidas **sin corrección** (N en `rules.promote_after`, default 10) y sin rollback en 30 días. Cualquier rechazo, corrección o rollback pone `approved_streak = 0` y regresa la regla a semi. En auto, la propuesta se ejecuta tras un periodo de gracia (2 h) durante el cual se puede detener desde Hoy; queda registrada igual que una aprobada.
- [ ] Token de escritura: System User de Meta con permiso `ads_management` solo para la cuenta operada; el token de lectura sigue aparte.
- [ ] Criterio de éxito: una regla llega a auto y opera dos semanas sin rollback ni intervención.

## Fase 5 · Calibración (continuo)
- [ ] Cada error vuelve como regla versionada; veredicto humano por propuesta alimenta umbrales
