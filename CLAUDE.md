# CLAUDE.md · agentes Meta

Lee esto completo al iniciar cualquier sesión. Después lee `PENDIENTES.md` (qué sigue) y, si vas a planear, `ROADMAP.md`.

## Qué es este proyecto
Bitácora inteligente de Meta Ads para Aromante (fragancias para hombres, México). Tres agentes:
1. **Collector** (diario 00:00 CDMX + cada 6 h): baja cambios y entidades de Meta, los agrupa en sesiones legibles con hora, responsable y acción.
2. **Analista semanal** (domingo 23:59 CDMX, también manual): cruza cambios con resultados, dice qué ayudó y qué no, con nivel de confianza.
3. **Estratega**: highlights, cuándo escalar, recortar y hacer dayparting. Solo recomienda; nunca ejecuta sin aprobación humana.
Todo se ve en una app web muy visual (`apps/web`).

Documentos de fondo: `docs/00-analisis-viabilidad-y-roadmap.md` (análisis completo), `docs/01-benchmark-testmia.md` (ideas adoptadas de Testmia), `docs/02-accesos.md`, `docs/03-deploy-cron.md`.

## Reglas de trabajo (no negociables)
- **Idioma:** todo en español (código comentado en español, UI, docs, commits).
- **Commit por cada cambio** con mensaje descriptivo. Autor git: `-c user.email=admin@aromante.mx -c user.name="Jeshua"`. Push a `origin main` después de cada commit si el remoto existe.
- **Nunca pegar tokens ni llaves en chat, docs o código.** Solo en `.env` (ignorado por git). Si el usuario pega un secreto en el chat, guardarlo en `.env` y recordarle rotarlo.
- **Los números los calcula código determinista**, nunca el LLM. El LLM solo redacta a partir de un paquete de evidencia.
- **Nunca juzgar el día en curso.** Veredictos solo con días cerrados. Si un dato está incompleto, la UI lo dice; no se rellena con estimaciones.
- **Lenguaje de los análisis:** "coincidió con", nunca "causó" (salvo A/B formal).
- **Los agentes no escriben en Meta** hasta la Fase 4b, y entonces solo con aprobación humana y write-ahead log (primero se registra, luego sale la orden).
- Al terminar cada sesión de trabajo: actualizar `PENDIENTES.md` (hecho / siguiente / bloqueos) y commitear.

## Hechos técnicos que no se deducen del código
- Cuentas activas: Aromante 1 Principal `1703313583465547` (la que opera), Aromante 2 `868659071242640` y Aromante 3 `699409435248329` (dormidas). Business Manager `3477342209205826`.
- **Zonas horarias:** Aromante 1 y 2 están en `America/Mazatlan` (UTC-7); Aromante 3 en `America/Mexico_City` (UTC-6). CDMX no tiene horario de verano. Todo se muestra en CDMX; los insights por hora de Meta llegan en la zona de la cuenta y se trasladan con `shiftHourCell`.
- **Meta usa nombres heredados:** `CAMPAIGN_GROUP` = campaña, `CAMPAIGN` = ad set, `ADGROUP` = anuncio. En eventos de anuncio, `extra_data.campaign_id` es el **ad set**.
- **Los textos de `extra_data` vienen localizados** ("Activo", "Procesamiento pendiente"). Usar códigos numéricos de `run_status`: 1 activo, 8/15 pausado, 17 procesamiento pendiente. Presupuestos en centavos.
- Cada edición humana genera pares 1→17→1 (revisión). Se agrupan en sesiones (mismo actor, huecos ≤ 3 min) y se reportan como "Editó (pasó por revisión)"; Meta después "Aprobó y activó".
- Retención del log de Meta: ~90 días. Nuestra base es la fuente de verdad después del backfill.
- Token de Meta: token de usuario extendido (60 días), vence 2026-11-02. Renovar antes y actualizar el secreto en GitHub. Producción ideal: System User que no expira.
- Supabase: proyecto `agentes-meta`, ref `njkyghbgquaqzzaylmwl`, plan Free. Migraciones en `packages/db/migrations/` y aplicadas vía MCP; mantener ambos en sincronía.
- Personas que operan la cuenta (aparecen como actores): Eduardo Torres, Tavo Cortez Vera, Josué Suárez, Jeshua Acosta. Usuarios de la app: jeshualapizco@gmail.com, jeshua@aromante.mx (admin), ernesto@aromante.mx, josue@aromante.mx.
- Dayparting nativo de Meta solo funciona con presupuesto total (lifetime). Con presupuesto diario, solo se recomienda.
- Ideas adoptadas de Testmia (ver benchmark): candados codificados, modos off/semi/auto, ventanas de evaluación 72h/7d/14d, experimentos con criterio de éxito previo, freno de emergencia manual, "cada error vuelve como regla".

## Producción
App: https://bitacora-aromante.netlify.app (Netlify, desplegar desde `apps/web` con `CI=1 netlify deploy --build --prod < /dev/null`). Collector: GitHub Actions en https://github.com/Jeshualapizco1/agentes-meta. Detalles en `docs/03-deploy-cron.md` y `docs/04-deploy-web.md`.

## Cómo correr
```bash
pnpm install
pnpm --filter @agentes-meta/core test                       # pruebas del core
pnpm --filter @agentes-meta/agents collector -- --days=90   # collector (usa .env de la raíz)
cd apps/web && pnpm dev -- -p 3010                          # app en http://localhost:3010
```
Preferir `pnpm --filter` o `node_modules/.bin/<bin>` dentro del paquete; pnpm aísla binarios por paquete.
El hook GateGuard pide presentar dos hechos antes del primer Bash de cada sesión: la solicitud del usuario y qué produce el comando.

## Estructura
`packages/core` (normalize, grouping, sessions, naming, time) · `packages/meta` (Graph API) · `packages/db` (Supabase) · `packages/agents` (collector, cli) · `apps/web` (Next.js 15, Tailwind 4) · `scripts/` (backfill y preview offline) · `data/raw/` (ignorado, muestras crudas).
