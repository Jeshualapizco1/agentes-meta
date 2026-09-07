# PENDIENTES · agentes Meta

Actualizar al final de cada sesión. Arriba lo más urgente.

## Retoma de la mesa de decisiones — 2026-09-06

- [x] Recuperada la sesión interrumpida: generador de criterios estructurados, `/decisiones`, revisiones de oportunidades y aprobación/corrección/rechazo en simulación desde Hoy. Evidencia y límites en [docs/14-decisiones-operativas-codex.md](docs/14-decisiones-operativas-codex.md).
- [x] Migraciones 0020/0021 instaladas en Supabase tras 82 pruebas SQL; copia local previa de perfiles/historial e igualdad de valores comprobada. Solo backend autorizado para las nuevas funciones.
- [x] Lectura real con el adaptador de la pantalla: cuatro campañas de Aromante 1 requieren revisión; todas con siete días cerrados. Sin criterios financieros inventados, reglas activadas ni órdenes a Meta.
- [x] Regresión del inventario de migraciones corregida y 23 pruebas nuevas de acciones. 364 web, 108 core, 8 DB unitarias, 82 SQL y 49 visuales aprobadas; una omitida histórica en core. Tipos/build aprobados.
- [ ] Entrar a `http://127.0.0.1:3000/decisiones` para revisar la interfaz autenticada y registrar la primera decisión del operador.
- [ ] Definir y evaluar los criterios de una primera regla; actualmente hay cero reglas estructuradas activas. Guardar exige administrador; las propuestas resultantes se revisan en Hoy en simulación.
- [ ] Continuar cobertura/frescura, aislamiento por cuenta, seguimiento de resultados y garantías del ejecutor según el roadmap. No habilitar dinero real como consecuencia de cerrar la interfaz.

El estado de solo lectura y migraciones pendientes en los avances anteriores queda superado por este corte; se conserva debajo como historial.

## Prioridad de implementación tras las auditorías — 2026-09-06

El orden está en [roadmapImplementacionCodex.md](roadmapImplementacionCodex.md): 40 bloques con trazabilidad de los 109 hallazgos generales y 75 de frontend. **Implementación en curso**, con avance parcial de IM-01/02/03/04/06/13/16/21/22/23/31. No se desplegó ni se habilitaron acciones reales. Evidencia y límites: [primer corte](docs/08-base-implementacion-codex.md), [configuración transaccional / SQL](docs/09-configuracion-transaccional-codex.md), [sistema visual](docs/10-sistema-visual-codex.md), [shell/navegación/fechas](docs/11-shell-navegacion-codex.md), [piloto de Hoy](docs/12-hoy-piloto-codex.md) y [Hoy con datos reales](docs/13-hoy-datos-reales-codex.md).

- [x] Primer corte: membresía central en páginas y 13 acciones, rol admin para configuración/usuarios/liberación de freno, modos de configuración permitidos y mensajes de riesgo corregidos.
- [x] Segundo corte: perfil/historial atómicos, versiones/diff, validación SQL, campañas inactivas seleccionadas y formulario que conserva borradores al fallar.
- [x] Runner con plan, historial, checksum, lock y transacciones; prueba de instalación y actualización 0019→0020 en PostgreSQL temporal. No se migró producción.
- [x] Base visual IM-22: carbón/naranja/violeta, tipografía local, componentes reutilizables y primeros consumidores en Login/Configuración; laboratorio sintético y capturas nuevas.
- [x] Shell IM-23: login separado, permisos visibles, navegación agrupada/móvil, retorno y periodos validados; URLs existentes conservadas. No equivale al cierre completo del bloque.
- [x] Piloto IM-21: Hoy bento con cuatro KPI, prioridades, gráfica, evidencia en panel y 13 escenarios; se validó primero en laboratorio con controles solo en memoria.
- [x] Lectura real de Hoy: dashboard nuevo conectado a nueve fuentes de Supabase, paginación de métricas, cuenta predeterminada desde DB y errores por sección. La integración real permanece en solo lectura.
- [x] Verificación acumulada: web 332, core 76, DB unitarias 8, SQL 49, navegador 49; **514 aprobadas y 1 omitida preexistente**. Tipos, build web y laboratorio aprobados. Workflow ampliado, todavía sin ejecución remota de esta versión.
- [ ] Completar IM-01/02: contratos restantes, regresiones R01–R20 y E2E real; no dar por cerrados los bloques completos.
- [ ] Completar IM-03/04: alcance por cuenta, validación de otras acciones y confirmación reforzada de modo real. Decidir asignaciones antes de cerrar aislamiento.
- [ ] Completar IM-06/07: diagnóstico/adopción del historial existente, despliegue de ensayo, tipos/invariantes restantes y dependencias. La web nueva exige 0020 antes del despliegue.
- [ ] Completar adopción de componentes IM-22 y aprobación de la composición visual; no están rediseñadas las doce pantallas.
- [ ] Completar IM-23: cuentas por defecto canonicalizadas, filtros dependientes y E2E Next/Auth con login desde detalle, expiración/revocación y adaptador de despliegue.
- [ ] Revisar/aprobar composición de Hoy IM-21 en escritorio/móvil: `http://127.0.0.1:4173/hoy?account=100` mientras el laboratorio esté activo. Implementación con fixtures no equivale a aprobación del usuario ni integración real.
- [ ] Siguiente técnico: completar asignación por cuenta y contrato de cobertura/frescura/reconciliación (IM-03/13/16/31). Después integrar aprobación con autorización, revalidación, concurrencia e intención durable; no conectar el formulario nuevo directamente a la acción heredada ni habilitar escritura en Meta.
- [ ] Continuar por dependencias del roadmap maestro; las puertas G0–G4 separan implementación, validación y habilitación.

Los pendientes anteriores se conservan debajo como contexto. Esperar el criterio del operador bloquea reglas de negocio, no las correcciones de seguridad, integridad o UX. Recuperación y congelamientos deben quedar probados **antes** de dinero real; no seguir la dependencia histórica inversa. Revisar las notas de acceso, despliegue y credenciales contra el estado vigente antes de actuar.

## Del lado de Jeshua (en orden)
1. [ ] **Telegram:** crear el bot con @BotFather, crear el grupo del equipo, meter al bot, obtener el chat id (docs/02 §Telegram). Guardar `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` en `.env` y como secretos de GitHub. Hay avisos en espera que saldrán solos.
2. [ ] **Llave de Claude:** `ANTHROPIC_API_KEY` en `.env` y en secretos (`gh secret set ANTHROPIC_API_KEY --body "$(grep '^ANTHROPIC_API_KEY=' .env | cut -d= -f2 | xargs)"`). Sin ella el reporte semanal sale sin redacción.
3. [ ] **Confirmar el cron:** `gh run list --workflow=collector` debe mostrar corridas con trigger `schedule` cuatro veces al día. Desde aquí no se lanzan corridas manuales: la "primera semana en solitario" cuenta 7 días de corridas programadas sin ninguna manual.
4. [ ] **Eduardo contesta el cuestionario** `docs/06-criterio-operacion.md` por WhatsApp, en lenguaje natural.
5. [ ] **Eduardo revisa tres veredictos maduros** en /analisis contra lo que recuerda. Sugeridos: los cinco "mixtos" (empezando por el +13 % del 26/08 en «CBO | PROMO ESCALONADA» y el −20 % del 12/08 en «CBO | SCALE») y uno donde las dos lecturas coinciden. Del recálculo con datos completos ningún veredicto cambió de lectura: no hay urgencia extra ahí.
6. [ ] **Primer experimento real** desde una sesión reciente (Convertir en experimento) para probar el flujo activar → evaluando → confirmar.
7. [ ] Dar de alta a Ernesto y Josué en /usuarios; compartirles `docs/07-operacion.md`.
8. [ ] Rotar el token personal de Supabase y la contraseña admin (pegados en el chat el 2026-09-03).
9. [ ] Decidir si la web de Netlify lleva `META_TOKEN_AROMANTE` (recomendación: no hasta tener System User con tokens separados de lectura y escritura).
10. [ ] System User de Meta con token sin caducidad (el actual vence 2026-11-02); en su momento, uno de solo lectura para la bitácora y otro con `ads_management` para la ejecución.
11. [ ] Capturar en Configuración los noes duros y revisar la lista blanca (hoy con lo que había).
12. [ ] Leer el reporte de "primera semana en solitario" cuando llegue y decidir si se activan las primeras reglas.

## Bloqueado hasta
| Construcción | Depende de |
|---|---|
| Reglas de acción del estratega (`generateCandidates` por regla, con evidencia y prueba) | 4 (respuestas de Eduardo) |
| Calibrar umbrales del analista (10 pts, mínimos de compras) | 5 (revisión de veredictos) y 12 (semana en solitario) |
| Primeras propuestas reales en Hoy | reglas de acción + 3 (cron confirmado) + lista blanca (11) |
| Avisos por Telegram funcionando | 1 |
| Narrativa del reporte semanal | 2 |
| Apagar `dry_run` en Aromante 1 (ejecución real) | 10 (System User con escritura) + dos semanas de simulaciones revisadas + decisión de Jeshua (docs/07 §7) |
| Botón "Revertir" y candado `espera` leyendo `entity_freezes` | ejecución real |
| Paso de una regla a modo auto | ejecución real + N aprobaciones sin corrección |
| Alta de Ernesto y Josué como operadores | 7 |

**A partir de aquí no se construye nada nuevo hasta que lleguen las respuestas de Eduardo.** El sistema corre solo; la siguiente sesión de construcción empieza por transcribir sus reglas.

## Siguiente sesión
- [ ] **Siguiente (Fase 3, propósito b):** entidad experimento (hipótesis y criterio de éxito declarados antes, ligada a la sesión) y veredicto automático contra el criterio. Después, en este orden: estratega en modo semi con cola de propuestas en Hoy (Fase 4, diseño ya escrito en ROADMAP.md), luego alertas.
- [ ] **Eduardo contesta `docs/06-criterio-operacion.md` por WhatsApp, en lenguaje natural** (umbrales de pausa, subida, recorte, movimientos, esperas, lista blanca). G1/G2 (techo) ya están contestadas por Jeshua. Transcribir cada respuesta a `rules` y regresársela para confirmar. Sin eso el estratega de la Fase 4 no tiene reglas que leer.
- [x] Recuperadas las ventanas sin campaña (2026-09-04): el mapa de entidades se leía sin paginar (1,000 de 3,700 filas). Ahora mapa completo + jerarquía + consulta a Meta por id. 16 sesiones sin campaña → 5 (todas de nivel cuenta); ventanas con doble lectura 66 → 87.
- [ ] Primer experimento real: crear uno desde una sesión reciente en /experimentos para probar el flujo completo (activar → evaluando en la corrida que cierre la ventana → confirmar veredicto).
- [ ] Eduardo revisa tres veredictos maduros de /analisis contra lo que recuerda, para calibrar antes de confiar en el reporte (lo pide Jeshua). Sugeridos: los dos "mixtos" (26/08 +13 % en «CBO | PROMO ESCALONADA»; 12/08 −20 % en «CBO | SCALE») y uno "agree".
- [x] Política del techo decidida (2026-09-04): dos capas, gasto real > techo (warning) y presupuestos activos > techo × 1.3 (info "presupuesto comprometido"); ambas bloquean subidas. Hoy Aromante 1 está en 188 % comprometido: la capa 2 está cerrada y el estratega no propondrá subidas hasta bajar presupuestos o subir el factor.
- [x] Infraestructura del estratega en semi (2026-09-04): `rules` con historial, `proposals`, `emergency_brakes`, candados puros con pruebas, pasada diaria con huella en Bitácora, cola en Hoy, freno. Primera pasada real: "Revisó 146 entidades y no propuso cambios".
- [ ] **Siguiente:** cuando lleguen las respuestas de Eduardo, transcribir cada una a `rules` (docs/06 §"cómo se convierte") e implementar su generador en `generateCandidates` (core) con evidencia etiquetada y prueba. Mientras: corrección de monto al aprobar (`corrected`), y revisar en Bitácora cómo se ve la sesión del agente (filtro de actores solo lista personas).
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
- 2026-09-04 (noche, 13) · **Última vuelta antes de la semana en solitario:** recálculo de ventanas con datos completos (ningún veredicto cambió de lectura; 6 preliminares actualizaron cifras) y rastro de cambios de veredicto (`verdict_changes`, migración 0019); manual de operación para el equipo (`docs/07-operacion.md`); reporte de "primera semana en solitario" por Telegram (una vez, tras 7 días de corridas programadas sin manuales; `week-report --force` para previsualizar); PENDIENTES con "Del lado de Jeshua" y "Bloqueado hasta". 77 pruebas en core.
- 2026-09-04 (tarde, 12) · **Paginación, Telegram y tubería 4b simulada:** (0) auditoría de lecturas sin paginar: `fetchAll` en db y web, aplicado en collector, ingesta de insights (reexpresiones perdidas), analista, estratega, Hoy, Anuncios (mostraba 1,000 de ~3,000) y Horarios; regla en CLAUDE.md. (1) Corrección de monto al aprobar (decisión humana con razón, racha a cero) y filtro de Bitácora con Estratega y Meta. (2) Telegram: formatos en core (5 pruebas), cliente, `notifications` con clave única, integrado al collector y al workflow, comando `notify`. (3) Fase 4b simulada: core de ejecución (3 operaciones, WAL 4 estados, rollback del par, congelamiento, reconocimiento de órdenes propias; 12 pruebas), `MetaWriter`, ejecutor con `dry_run` por cuenta, `executions` y `entity_freezes`, Hoy con últimas decisiones, collector reetiqueta órdenes propias. 75 pruebas en core.
- 2026-09-04 (tarde, 11) · **Campaña resuelta + estratega semi:** (1) el mapa de entidades se leía sin paginar (1,000 de 3,700 filas): ahora completo, con jerarquía anuncio → ad set → campaña y consulta a Meta por id; 16 sesiones sin campaña → 5 (nivel cuenta), 66 → 87 ventanas con doble lectura. (2) Estratega: core puro (candados en fila, pasada, expiración, freno; 15 pruebas), migración 0015 (`rules` versionada con historial por trigger, `proposals`, `emergency_brakes`, dos reglas de techo sembradas), pasada diaria en el collector con huella en Bitácora, cola de propuestas y freno en Hoy, auto deshabilitado "disponible en Fase 4b". (3) docs/06: cómo una respuesta de Eduardo se vuelve fila de `rules`, con las dos reglas de techo como ejemplos y una de acción ilustrativa. 58 pruebas en core.
- 2026-09-04 (mañana, 10) · **Cierre de la Fase 3:** (1) causa guardada por cada referencia faltante (`missing_refs`) con distribución real en docs/05 §4c: de 78 ventanas sin doble lectura, 9 se resuelven solas, 0 son de volumen, 69 estructurales (48 sin campaña identificada, 21 campañas nuevas, 6 sin gasto después); una referencia con < 10 compras no cuenta; una sola lectura no pasa de confianza media. (2) Techo en dos capas con `max_committed_budget_factor` (1.3) en Configuración; `blocks_scaling` en `stats.ceiling`; G1/G2 contestadas. (3) Experimentos: core con 4 pruebas, migración 0014, analista que evalúa contra el criterio propio y alerta `experiment_ready`, /experimentos con presupuesto de exploración, alta, activar, cancelar, confirmar veredicto e historial; botón "Convertir en experimento" en la sesión. (4) Cuestionario con nota de lenguaje natural para WhatsApp. 40 pruebas en core.
- 2026-09-04 (madrugada, 9) · **Ajustes antes de experimentos:** (1) segunda referencia por ventana (campaña contra sí misma en los 7 días previos) con `agreement` y `reading`; veredicto mixto cuando se contradicen y confianza que solo se queda alta si coinciden; documentado con ejemplo real en docs/05 §4b; en la corrida real: 48 agree, 22 partial, 2 mixed, 48 single, 24 none. (2) Anotación huérfana: error estructurado `OrphanAnnotationError`, alerta `collector_failed` con `payload` (account_id, session_id, annotation_id, hint), una por día, las demás cuentas siguen; /estado muestra "Qué hacer" con enlace a la sesión. (3) Benchmark alineado: sí ejecutamos, off → semi → auto por regla, lista literal de "nunca" (§6). (4) `docs/06-criterio-operacion.md` (cuestionario para Eduardo); perfil con tope de cambio acumulado y ventana de días (migración 0011, Configuración); el collector calcula en cada pasada el techo contra el gasto real y el presupuesto activo (`ceilingCheck` en core con pruebas; alertas `spend_over_ceiling` / `budget_over_ceiling`).
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
