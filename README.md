# agentes Meta

Bitácora inteligente de Meta Ads para Aromante: qué cambió, quién, cuándo y qué pasó después.

## Estructura
- `packages/core`   normalización de eventos, grupos, sesiones, parser de nomenclatura, zonas horarias (con pruebas)
- `packages/meta`   cliente de Graph API (paginación, reintentos, timeouts)
- `packages/shopify` cliente de la Admin API de Shopify (pedidos → ventas netas, clientes nuevos)
- `packages/db`     cliente de Supabase y utilidades
- `packages/agents` Agente 1 · collector (`pnpm collector`)
- `apps/web`        app visual (Next.js): bitácora, detalle de sesión con anotaciones, estado del sistema
- `docs/`           análisis, benchmark, accesos, despliegue

## Correr en local
```bash
pnpm install
pnpm --filter @agentes-meta/core test          # pruebas
pnpm --filter @agentes-meta/agents collector   # bajar cambios de Meta a Supabase
cd apps/web && pnpm dev                        # http://localhost:3000
```
`.env` en la raíz (ver `.env.example`). La app lee `apps/web/.env.local`, que es un enlace simbólico a `../../.env`.

## Programación
Ver `docs/03-deploy-cron.md` (GitHub Actions cada 6 h; la corrida de 00:00 CDMX es la consolidación diaria).
