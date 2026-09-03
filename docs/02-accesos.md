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
Aromante 1 Principal · Aromante 2 · Aromante 3 · Venta Por Menor - Aromante · Pestañas Sarahí · Car Studio

## 4. Perfil por cuenta (no bloquea, pero lo necesito antes de la Fase 3)
Por cuenta: margen bruto %, ROAS de equilibrio, CPA objetivo, techo y piso de gasto diario, campañas que el agente puede tocar (lista blanca).

## 5. Usuarios de la app (para la Fase 1)
Correos de quienes entrarán: tú, Eduardo Torres y quien más opere cuentas.
