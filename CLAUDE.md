# CLAUDE.md · agentes Meta

Lee esto completo al iniciar cualquier sesión. Después lee `PENDIENTES.md` (qué sigue) y, si vas a planear, `ROADMAP.md`.

## Qué es este proyecto
Bitácora inteligente de Meta Ads para Aromante (fragancias para hombres, México).

**Propósito, en este orden (fijado por el dueño el 2026-09-03):**
1. **Un agente que analice toda la operación y diga qué funciona** (analista: bitácora + ventanas + reporte semanal).
2. **Mejorar cómo se testea:** hipótesis y criterio de éxito declarados *antes* del cambio, veredicto automático contra ese criterio (experimentos).
3. **Automatizar la operación de la cuenta.** El destino es el **modo auto con candados**, no solo recomendar. El camino: modo **semi** (propuesta → aprobación en un clic → ejecución con write-ahead log y rollback) y **paso a auto por regla** cuando esa regla lleve N propuestas aprobadas seguidas sin corrección. Diseño en `ROADMAP.md` (Fase 4 y 4b).

Tres agentes:
1. **Collector** (diario 00:00 CDMX + cada 6 h): baja cambios y entidades de Meta, los agrupa en sesiones legibles con hora, responsable y acción.
2. **Analista semanal** (construido 2026-09-03; corre tras cada collector y genera el reporte los lunes 00:17 CDMX): ventanas 72h/7d/14d por sesión (campañas tocadas vs. resto de la cuenta), evidencia determinista en `analyses.evidence`, narrativa con Claude `claude-opus-5` si hay `ANTHROPIC_API_KEY`. Pantalla /analisis.
3. **Estratega** (Fase 4): highlights, cuándo escalar, recortar y hacer dayparting, como **propuestas** en una cola en Hoy (modo semi: aprobar/rechazar en un clic con razón). En Fase 4b un **ejecutor** aplica lo aprobado con write-ahead log y rollback, y cada regla pasa a **auto** cuando acumula N propuestas aprobadas sin corrección; cualquier rechazo, corrección o rollback la regresa a semi. Freno de emergencia por cuenta.
Todo se ve en una app web muy visual (`apps/web`).

Documentos de fondo: `docs/00-analisis-viabilidad-y-roadmap.md` (análisis completo), `docs/01-benchmark-testmia.md` (ideas adoptadas de Testmia), `docs/02-accesos.md`, `docs/03-deploy-cron.md`, `docs/04-deploy-web.md`, **`docs/05-analista.md` (definiciones exactas de ventanas, dos lecturas por ventana, umbrales, confianza, salvedades y reglas de la narrativa; si cambia el código, cambia el doc en el mismo commit)**, **`docs/06-criterio-operacion.md` (cuestionario de criterio para Eduardo: el estratega de la Fase 4 se construye leyendo ese documento como reglas, no inventándolas)**.

## Reglas de trabajo (no negociables)
- **Idioma:** todo en español (código comentado en español, UI, docs, commits).
- **Commit por cada cambio** con mensaje descriptivo. Autor git: `-c user.email=admin@aromante.mx -c user.name="Jeshua"`. Push a `origin main` después de cada commit si el remoto existe.
- **Nunca pegar tokens ni llaves en chat, docs o código.** Solo en `.env` (ignorado por git). Si el usuario pega un secreto en el chat, guardarlo en `.env` y recordarle rotarlo.
- **Los números los calcula código determinista**, nunca el LLM. El LLM solo redacta a partir de un paquete de evidencia, y **cada oración con una cifra cita la fila de evidencia de donde sale** (`[T]`, `[S3]`, `[C2]`…; ver `docs/05-analista.md` §9).
- **Nunca juzgar el día en curso.** Veredictos solo con días cerrados. Si un dato está incompleto, la UI lo dice; no se rellena con estimaciones.
- **Lenguaje de los análisis:** "coincidió con", nunca "causó" (salvo A/B formal).
- **Los agentes no escriben en Meta** hasta la Fase 4b. Cuando escriban, ninguna orden sale sin: (1) propuesta registrada con evidencia, (2) aprobación humana (modo semi) o regla en modo auto que se lo ganó (N aprobadas seguidas sin corrección), (3) candados verificados (máximo por cambio, espera, tope diario, lista blanca, noes duros), (4) write-ahead log (primero se registra la intención, luego sale la orden, luego se confirma), (5) rollback registrado y a un clic. Cualquier rechazo, corrección o rollback regresa la regla a semi; el freno de emergencia pone la cuenta en off.
- **El control no siempre es independiente:** Aromante 1 tiene una campaña dominante en CBO; mover su presupuesto mueve el gasto del resto. Por eso cada ventana tiene **dos lecturas** (frente al resto de la cuenta y la campaña frente a su propia semana previa): la confianza solo se queda alta cuando coinciden; si se contradicen el veredicto es "mixto" y lo dice. Las salvedades (presupuesto compartido, control inestable, control pequeño) no son ruido: son la cuenta. No subir esos umbrales para que "salga limpio".
- **Lo que el agente nunca hace, en cualquier modo:** borrar; tocar creativo, segmentación, puja u objetivo; encender algo nuevo solo; reactivar lo que pausó una persona; operar si el día no cerró. Lista literal en `docs/01-benchmark-testmia.md` §6.
- **El estratega no inventa criterio:** umbrales, esperas, lista blanca y noes salen de `docs/06-criterio-operacion.md` (respuestas de Eduardo) y del perfil de cuenta. El collector calcula en cada pasada el techo contra el gasto real de todas las campañas activas y contra el presupuesto activo (`agent_runs.stats.ceiling`).
- **Techo en dos capas (decisión del dueño, 2026-09-04):** el techo diario es real. (1) Gasto real del último día cerrado > techo → alerta warning, sin propuestas de subida ese día. (2) Suma de presupuestos diarios activos > techo × `max_committed_budget_factor` (1.3 por defecto, en Configuración) → alerta info "presupuesto comprometido X % del techo", sin propuestas de subida. `stats.ceiling.blocks_scaling` es el candado que lee el estratega; recortes y pausas no se bloquean.
- Al terminar cada sesión de trabajo: actualizar `PENDIENTES.md` (hecho / siguiente / bloqueos) y commitear.

## Hechos técnicos que no se deducen del código
- Cuentas activas: Aromante 1 Principal `1703313583465547` (la que opera), Aromante 2 `868659071242640` y Aromante 3 `699409435248329` (dormidas). Business Manager `3477342209205826`.
- **Zonas horarias:** Aromante 1 y 2 están en `America/Mazatlan` (UTC-7); Aromante 3 en `America/Mexico_City` (UTC-6). CDMX no tiene horario de verano. Todo se muestra en CDMX; los insights por hora de Meta llegan en la zona de la cuenta y se trasladan con `shiftHourCell`.
- **Meta usa nombres heredados:** `CAMPAIGN_GROUP` = campaña, `CAMPAIGN` = ad set, `ADGROUP` = anuncio. En eventos de anuncio, `extra_data.campaign_id` es el **ad set**.
- **Los textos de `extra_data` vienen localizados** ("Activo", "Procesamiento pendiente"). Usar códigos numéricos de `run_status`: 1 activo, 8/15 pausado, 17 procesamiento pendiente. Presupuestos en centavos.
- Cada edición humana genera pares 1→17→1 (revisión). Se agrupan en sesiones (mismo actor, huecos ≤ 3 min) y se reportan como "Editó (pasó por revisión)"; Meta después "Aprobó y activó".
- Retención del log de Meta: ~90 días. Nuestra base es la fuente de verdad después del backfill.
- Token de Meta: token de usuario extendido (60 días), vence 2026-11-02. El collector consulta `debug_token` en cada corrida y crea la alerta `meta_token_expiring` (warning, visible en /estado) cuando faltan menos de 10 días. Renovar antes y actualizar el secreto en GitHub. Producción ideal: System User que no expira.
- Supabase: proyecto `agentes-meta`, ref `njkyghbgquaqzzaylmwl`, plan Free. Migraciones en `packages/db/migrations/` y aplicadas vía MCP; mantener ambos en sincronía.
- Personas que operan la cuenta (aparecen como actores): Eduardo Torres, Tavo Cortez Vera, Josué Suárez, Jeshua Acosta. Usuarios de la app: jeshualapizco@gmail.com, jeshua@aromante.mx (admin), ernesto@aromante.mx, josue@aromante.mx. Acceso por usuario y contraseña (Supabase Auth); los admins crean usuarios en `/usuarios` vía API de administración (`apps/web/lib/admin.ts`). No usar enlace mágico: el SMTP integrado limita a pocos correos por hora.
- **La verdad es Meta.** El proyecto es 100% paid media de Meta (el trafficker solo ve Meta y TikTok Ads, nunca la tienda). Los números de Meta son confiables porque la cuenta tiene conectado wetracked.io (atribución server-side). No integrar Shopify ni métricas de tienda (MER, CAC, ventas netas): se construyó y se eliminó el 2026-09-03 por decisión del dueño.
- Dayparting nativo de Meta solo funciona con presupuesto total (lifetime). Con presupuesto diario, solo se recomienda.
- Ideas adoptadas de Testmia (ver benchmark): candados codificados, modos off/semi/auto, ventanas de evaluación 72h/7d/14d, experimentos con criterio de éxito previo, freno de emergencia manual, "cada error vuelve como regla".
- **Regrupado seguro:** sesiones y grupos tienen UUID v5 determinista; un evento tardío de Meta puede cambiar el inicio (y el ID) de una sesión. `planRelink` (core) re-enlaza anotaciones y ventanas de evaluación (por sesión y por grupo) antes de borrar; anotación sin sucesora = el collector falla y no borra nada; ventana duplicada = se suelta y el analista la recalcula en la misma corrida. Las FK se quedan sin cascade a propósito.

## Producción
- **Cron de GitHub Actions:** `17 0,6,12,18 * * *` UTC (minuto 17 a propósito: GitHub retrasa o salta los crons en minuto 0). GitHub **desactiva los schedules tras 60 días sin commits** en el repo; si la bitácora deja de actualizarse, revisar `gh workflow list` (debe decir `active`) y hacer un commit. Verificar corridas automáticas con `gh run list --workflow=collector` (columna trigger = `schedule`).
App: https://bitacora-aromante.netlify.app (Netlify; desplegar desde la RAÍZ con `CI=1 netlify deploy --prod --filter @agentes-meta/web < /dev/null`; el middleware no corre en Netlify, cada página protege con `requireUser()`). Collector: GitHub Actions en https://github.com/Jeshualapizco1/agentes-meta. Detalles en `docs/03-deploy-cron.md` y `docs/04-deploy-web.md`.

## Cómo correr
```bash
pnpm install
pnpm --filter @agentes-meta/core test                       # pruebas del core
pnpm --filter @agentes-meta/agents collector -- --days=90   # collector (usa .env de la raíz)
pnpm --filter @agentes-meta/agents analyst -- --weekly=force # analista: ventanas + reporte semanal del periodo que termina ayer
cd apps/web && pnpm dev -- -p 3010                          # app en http://localhost:3010
```
Preferir `pnpm --filter` o `node_modules/.bin/<bin>` dentro del paquete; pnpm aísla binarios por paquete.
El hook GateGuard pide presentar dos hechos antes del primer Bash de cada sesión: la solicitud del usuario y qué produce el comando.

## Estructura
`packages/core` (normalize, grouping, sessions, naming, time, ids) · `packages/meta` (Graph API) · `packages/db` (Supabase) · `packages/agents` (collector, analyst, narrative, cli) · `apps/web` (Next.js 15, Tailwind 4) · `scripts/` (backfill y preview offline) · `data/raw/` (ignorado, muestras crudas).
