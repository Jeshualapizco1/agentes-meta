# Accesos necesarios para arrancar (Fase 0)

## 1. Token de Meta (lo único que bloquea el desarrollo)

### Camino rápido (hoy mismo, dura 60 días)
1. Entra a https://developers.facebook.com/tools/explorer/
2. En "Meta App" elige cualquier app tuya (si no tienes, crea una en https://developers.facebook.com/apps → "Crear app" → tipo "Empresa").
3. En "Permisos" agrega: `ads_read`, `read_insights`, `business_management`.
4. Clic en "Generar token de acceso" y acepta en el popup.
5. Copia el token y pégalo en el archivo `.env` (copia `.env.example` a `.env`).
   Si tu usuario ve todas las cuentas, un solo token sirve para las tres variables.
6. Opcional: conviértelo a token de larga duración en https://developers.facebook.com/tools/debug/accesstoken/ → "Extender token de acceso".

### Camino correcto para producción (token que no expira)
Por cada Business Manager (Aromante, Somos Vita Plus, CAR STUDIO):
1. https://business.facebook.com/settings → Usuarios → Usuarios del sistema → Agregar.
2. Nombre: `agentes-meta`, rol: Empleado.
3. "Asignar activos" → Cuentas publicitarias → marca las cuentas → permiso "Ver rendimiento" (lectura). Cuando lleguemos a la Fase 4b se sube a "Administrar campañas".
4. "Generar nuevo token" → elige la app → permisos `ads_read`, `read_insights`, `business_management` → caducidad "Nunca".
5. Pega el token en la variable correspondiente del `.env`.

## 2. Supabase
Proyecto nuevo "agentes-meta" en la organización "Jeshua MP". Lo creo yo con tu autorización (el plan Free permite 2 proyectos; si ya no cabe, Pro cuesta 25 USD/mes).

## 3. Cuentas incluidas (confirmar)
Aromante 1 Principal · Aromante 2 · Aromante 3 (confirmado 2026-09-03)

## 4. Perfil por cuenta (no bloquea, pero lo necesito antes de la Fase 3)
Por cuenta: margen bruto %, ROAS de equilibrio, CPA objetivo, techo y piso de gasto diario, campañas que el agente puede tocar (lista blanca).

## 5. Usuarios de la app (para la Fase 1)
Correos de quienes entrarán: tú, Eduardo Torres y quien más opere cuentas.

## Estado al 2026-09-03 (tarde)
- Token corto recibido y usado: sirvió para bajar 90 días de Aromante 1 (3,595 eventos). Meta lo invalidó el mismo día. **Pendiente: token nuevo y extendido.**
- Supabase: proyecto `agentes-meta` creado (ref `njkyghbgquaqzzaylmwl`, us-east-1), esquema aplicado (migraciones 0001 y 0002).
- **Pendiente: contraseña de la base de datos** (Supabase → Project Settings → Database → Reset database password) para `DATABASE_URL`, y la **service role key** (Project Settings → API Keys → Secret keys) para `SUPABASE_SERVICE_ROLE_KEY`. Ambas van en `.env`, no en el chat.

### Cómo extender el token (para que dure 60 días)
1. Genera el token en el Graph API Explorer como antes (permisos `ads_read`, `read_insights`, `business_management`).
2. Ábrelo en https://developers.facebook.com/tools/debug/accesstoken/ y pulsa "Extender token de acceso".
3. Copia el token extendido y pégalo en `.env` en `META_TOKEN_AROMANTE=`.

## Shopify (Admin API, solo lectura)
La tienda es **Aromante** (`aromante-4957.myshopify.com`, Shopify Plus, zona America/Mazatlan, precios con IVA incluido). El collector baja pedidos y arma `shopify_daily` (ventas netas, pedidos, clientes nuevos) para calcular MER y CAC en la vista Cuenta.

Crear el token (una sola vez, lo hace el dueño de la tienda):
1. Admin de Shopify → **Configuración → Aplicaciones y canales de venta → Desarrollar aplicaciones** (si no aparece, primero "Permitir desarrollo de aplicaciones personalizadas"; en cuentas nuevas Shopify lo manda al Dev Dashboard, el flujo es el mismo).
2. **Crear aplicación** → nombre `agentes-meta`.
3. **Configurar permisos de Admin API**: `read_orders`, `read_all_orders` (sin este solo se ven 60 días de historial) y `read_customers`. Nada de escritura.
4. **Instalar aplicación** → copiar el **token de acceso de Admin API** (`shpat_…`). Se muestra una sola vez.
5. Pegarlo en `.env` como `SHOPIFY_ADMIN_TOKEN` (nunca en el chat) y subirlo a GitHub:
   ```bash
   cd "/Users/jeshua/agentes Meta"
   gh secret set SHOPIFY_ADMIN_TOKEN --body "$(grep '^SHOPIFY_ADMIN_TOKEN=' .env | cut -d= -f2 | cut -d'#' -f1 | xargs)"
   ```
6. Backfill de 90 días (una vez) y luego el cron lo mantiene con 14 días de traslape en cada corrida:
   ```bash
   pnpm --filter @agentes-meta/agents collector -- --accounts=1703313583465547 --shopifyDays=90
   ```

Qué cuenta usa la tienda: columna `accounts.shopify_domain` (hoy solo Aromante 1 Principal). Si Aromante 2 o 3 vuelven a gastar, ponerles el mismo dominio: el MER se calcula con el gasto de todas las cuentas que comparten tienda.

Definiciones (aproximan a Analítica de Shopify; ver `packages/core/src/shopify.ts`): ventas netas = subtotal después de descuentos − reembolsos, sin envío; cliente nuevo = el pedido es el primero de su cliente; reembolsos atribuidos a la fecha del pedido. Las sesiones de la tienda no están en la Admin API, por eso `sessions` queda vacío.
