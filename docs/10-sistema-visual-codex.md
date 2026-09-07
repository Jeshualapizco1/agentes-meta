# Tercer avance: base visual premium y laboratorio aislado

6 de septiembre de 2026. Seguimiento de IM-22 del [roadmap maestro](../roadmapImplementacionCodex.md), después del [guardado transaccional](09-configuracion-transaccional-codex.md).

Registro histórico del tercer corte. El avance posterior y los resultados vigentes de navegación están en [el cuarto corte IM-23](11-shell-navegacion-codex.md).

**IM-22 implementado parcialmente. No se declara aprobado el diseño de Hoy ni rediseñadas las doce pantallas. No hubo push, despliegue, cambios de política real ni operaciones en Meta.**

## Dirección aplicada

Se sustituyó el tema azul translúcido por superficies carbón sólidas. Naranja identifica acciones principales; violeta identifica agente/datos. Verde, ámbar y rosado conservan el significado de resultado, atención y peligro. El brillo generalizado desaparece; una tarjeta focal puede llevar un halo violeta tenue.

La tipografía Plus Jakarta Sans ahora se sirve desde el proyecto, con `@fontsource-variable/plus-jakarta-sans` y su licencia OFL. Se eliminó la petición a Google Fonts del layout. La fuente monoespaciada utiliza alternativas locales del sistema. No se introdujo una librería de componentes ni se cambió el framework de la aplicación.

Cambios compartidos:

- Tokens de superficies, texto, acción, bordes de controles, estados, foco, radios y movimiento en [globals.css](../apps/web/app/globals.css).
- Texto oscuro sobre naranja, también en consumidores heredados. No quedan botones primarios ni avatares con `var(--gradient-accent)` y `text-white` juntos.
- Tarjetas sólidas, títulos legibles y cabeceras capaces de envolver acciones largas; badges sin truncamiento forzado.
- Foco visible, salto al contenido, indicadores de expansión, movimiento reducido y tratamiento básico de colores forzados.
- Controles nuevos de al menos 44 px, etiquetas visibles, ayudas y errores vinculados; input del componente `Field` a 16 px.
- Selección de navegación neutral con señal naranja. Se conservan rutas y estructura actual; agrupación, permisos y menú móvil completo pertenecen a IM-23.
- SVG de `Sparkline/TimeSeries` usan tokens de datos en lugar de azules literales. No se dan por solucionadas todas sus escalas, interacciones o limitaciones de IM-25.

## Componentes entregados

| Pieza | Contrato |
| --- | --- |
| [Button / IconButton](../apps/web/components/Button.tsx) | Primario, secundario, discreto y peligro; pendiente, deshabilitado y nombre accesible. El tipo por defecto es `button`: un envío debe indicar `type="submit"` |
| [Field / FormSection](../apps/web/components/Field.tsx) | Etiqueta, unidad, ayuda, error, descripción accesible y agrupación semántica |
| [StatusBadge](../apps/web/components/StatusBadge.tsx) | Traduce un estado explícito a texto/tono. No deduce ejecución de una aprobación o del modo simulado |
| [DataState](../apps/web/components/DataState.tsx) | Vacío, error, parcial, desactualizado, sin permisos y carga; mensaje útil sin inventar éxito |
| [PageHeader](../apps/web/components/PageHeader.tsx) | Título, contexto y acción en una cabecera adaptable |
| [MetricCard](../apps/web/components/MetricCard.tsx) | Valor, periodo y comparación explícita; no compara como completas lecturas parciales/desactualizadas/ausentes |
| [ChartFrame](../apps/web/components/ChartFrame.tsx) | Título, unidad, periodo, leyenda y tabla alternativa de datos accesible por teclado |

Se conservaron `Card`, `Chip` y `Kpi` como base compatible. `Kpi` ahora distingue cero de dato ausente, no imprime valores/comparaciones no finitos, trata un delta cero como neutral y no marca un objetivo incumplido cuando falta el valor. Son correcciones de presentación: no cambian el cálculo determinista ni los candados de los agentes.

Los nuevos `Button/Field` ya se consumen en Login y Configuración. El formulario transaccional mantiene las garantías del segundo corte: rol en servidor, versión, borrador conservado, pendiente y error. El resto de botones heredados recibe el tema y contraste corregidos; no se presenta como una migración terminada de todas las pantallas al nuevo componente.

## Laboratorio y capturas

La [vista de prueba](../apps/web/preview/main.tsx) vive **fuera de las rutas Next**. Usa exclusivamente [fixtures sintéticos](../apps/web/preview/fixtures.ts): no reutiliza layouts con Auth, consultas, Server Actions ni datos de cuentas reales. Su cabecera/lateral son una composición de ensayo, no el shell definitivo de IM-23.

Permite probar una revisión de ejemplo, guardado solo en memoria, campos, estados de datos y cifras largas. Los botones no aprueban propuestas ni escriben en DB. Cualquier cifra/estado mostrado pertenece a esa demostración, no a la operación real.

- [Vista general de escritorio](capturas/codex-im22-vista-general.png).
- [Catálogo completo de escritorio](capturas/codex-im22-escritorio.png).
- [Inicio móvil](capturas/codex-im22-movil-inicio.png).
- [Catálogo completo móvil](capturas/codex-im22-movil.png).

Estas imágenes son capturas del código renderizado, no imágenes generadas ni capturas históricas. Se inspeccionaron visualmente después de la ejecución. Todavía necesitan revisión del dueño para acordar la composición final de Hoy.

La skill de navegador se utilizó para intentar la conexión y su recuperación documentada; no había instancias disponibles. Por eso la comprobación se hizo con Chromium headless de pruebas, sin perfiles ni sesiones del usuario. No se validó la aplicación de producción por ese medio.

### Reproducir localmente

Desde la raíz del repositorio:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @agentes-meta/web visual:dev
```

Abrir `http://127.0.0.1:4173`. La sesión de esta entrega deja ese servidor local disponible; si se detiene, el comando anterior lo levanta de nuevo. No publicarlo como aplicación real ni añadirle credenciales. El contenido no necesita `.env`.

```powershell
corepack pnpm --filter @agentes-meta/web exec playwright install --only-shell chromium
corepack pnpm --filter @agentes-meta/web test:visual
corepack pnpm --filter @agentes-meta/web visual:build
```

El runner visual levanta su propio servidor en `127.0.0.1:4174`, rechaza reutilizar uno preexistente y lo cierra al terminar. Intercepta las solicitudes del navegador para permitir únicamente ese origen. El laboratorio limita la carga de variables al directorio `preview`, con prefijo propio, y rechaza importaciones conocidas de servicios/acciones. Estas barreras no son un sandbox del sistema operativo ni sustituyen la revisión de código.

Vite y Playwright son herramientas de desarrollo del laboratorio, no una sustitución de Next ni dependencias de la interfaz publicada. `visual-dist`, trazas y resultados transitorios están ignorados por Git. Las capturas elegidas para documentación sí se conservan. El build independiente avisa que ignora las directivas `use client` de componentes reutilizados; Next conserva su frontera servidor/cliente en su propia compilación.

## Verificación

- Web: **213 pruebas aprobadas** en 14 archivos, incluidas 25 de contratos visuales y 28 de contraste.
- Core: **76 aprobadas y 1 omitida preexistente**.
- DB unitarias: **8 aprobadas**.
- PostgreSQL efímero: **49 aprobadas**; su base/contenedor de ensayo se eliminan al terminar.
- Chromium: **10 aprobadas**, incluyendo tamaños 320/390/768/1440, importes largos, pendiente/deshabilitado, foco, tabla con teclado, ausencia/error y movimiento reducido.
- Total: **356 aprobadas y 1 omitida preexistente**.
- Tipos de los cinco paquetes, build Next y build del laboratorio: aprobados. Instalación con lockfile congelado verificada.

La CI incorpora compilación del laboratorio, instalación de Chromium y tests visuales, además de las comprobaciones anteriores. El workflow editado aún no ha corrido remotamente. Las capturas son evidencia revisada, no una suite de comparación píxel a píxel contra baselines multiplataforma aprobadas.

### Qué significa la comprobación de contraste

Los tests calculan luminancia sRGB sin redondear antes de aprobar: texto normal ≥4.5:1 y contorno/foco contra superficies previstas ≥3:1. Cubren naranja normal/hover/presionado, estados semánticos, superficies principales y el máximo halo de la tarjeta focal. El navegador comprueba además los colores efectivos del botón y su tamaño/foco.

No es una certificación WCAG de toda la app. Faltan lector de pantalla, zoom/reflow exhaustivo, más navegadores, controles heredados y tareas completas de producción. Criterios consultados: [contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum) y [contraste no textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast).

## Siguiente tramo

1. IM-23: shell privado/público, grupos de navegación, permisos visibles, contexto de cuenta/periodo y menú móvil accesible.
2. IM-21: aplicar la base a Hoy; priorizar decisiones, estado de datos y efecto real de las acciones. Validar su composición con datos de ensayo y después con contratos reales.
3. Completar IM-22 al integrar los patrones en sus consumidores y revisar estados reales; IM-25 para gráficas accesibles completas.

Se mantienen los bloqueos de seguridad anteriores: adopción del historial y migración 0020 antes del despliegue de la web nueva, decisiones de aislamiento por cuenta y P0 del ejecutor. Una apariencia terminada no autoriza dinero real.
