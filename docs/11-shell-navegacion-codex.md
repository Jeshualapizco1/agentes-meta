# Cuarto avance: navegación, acceso y periodos

6 de septiembre de 2026. Implementación local de una parte sustancial de **IM-23**, después de la [base visual IM-22](10-sistema-visual-codex.md).

Registro histórico de este corte. El avance posterior de Hoy y la verificación acumulada actual están en [el quinto corte](12-hoy-piloto-codex.md); las cifras y siguientes pasos de abajo corresponden al momento de este avance, no al cierre completo de IM-23.

**IM-23 sigue parcial. No se desplegó, no se hizo commit/push y no se habilitó escritura en Meta.** El diseño final de Hoy corresponde al siguiente corte IM-21. La autorización de membresía de páginas y acciones se conserva; no se presenta el menú como aislamiento por cuenta.

## Lo implementado

### Estructura pública y privada

- El layout raíz solo contiene documento, estilos, tipografía y salto al contenido. Ya no consulta la sesión ni dibuja navegación alrededor del login.
- Las once páginas privadas viven ahora en `apps/web/app/(private)/…/page.tsx`. Se mantienen `/hoy`, `/cuenta`, `/sesion/[id]` y todas las demás URLs existentes. Las acciones siguen en sus rutas de archivo anteriores; no se reescribió el motor de negocio.
- El layout privado verifica membresía y solo pasa email/rol al shell cliente. Las guardas de cada página y cada acción siguen siendo necesarias: el layout puede conservarse al navegar.
- Login tiene estructura propia, campos visibles, destino de retorno validado, mensaje de continuación y botón con pendiente/deshabilitado durante el envío.
- Título de pestaña por pantalla; estados de carga, error recuperable y recurso no encontrado. El error de vista no imprime mensajes internos de DB ni ofrece reintentar operaciones financieras.
- El middleware sobrescribe el encabezado interno de retorno con la ruta/query real. El refresco de cookies lo conserva. Este encabezado se usa únicamente para construir el retorno al login, nunca para autorizar. Si falta, se utiliza el destino interno de la guarda.

### Navegación y móvil

Se reutilizan [AppShell](../apps/web/components/AppShell.tsx), [AuthShell](../apps/web/components/AuthShell.tsx) y [NavMenu](../apps/web/components/NavMenu.tsx) en la aplicación y el laboratorio.

| Grupo | Destinos |
|---|---|
| Operación | Hoy, Anuncios, Bitácora |
| Análisis | Rendimiento (`/cuenta`), Aprendizajes (`/analisis`), Experimentos |
| Acceso secundario | Horarios, debajo de Rendimiento |
| Administración desplegable | Configuración, Usuarios solo para admin, Estado del sistema |

Hay seis destinos principales cotidianos. Horarios permanece visible como acceso secundario; no se eliminó esa pantalla. Configuración continúa disponible en lectura para buyer. Usuarios también conserva su guarda admin en servidor, aunque el menú lo oculte al operador.

En móvil se reemplaza la tira horizontal de diez enlaces por un panel modal nativo: botón con estado expandido, nombre del diálogo, foco inicial, recorrido circular de teclado, cierre con Escape/fondo/botón/enlace, restauración de foco y bloqueo de scroll de fondo. Se cierra al pasar a escritorio. Se excluyen del recorrido los enlaces de Administración mientras su sección esté plegada.

### Cuenta, filtros y detalle

El [contrato de enlaces](../apps/web/lib/nav-context.ts) transporta únicamente contexto compatible:

- Entre Bitácora, Rendimiento, Anuncios y Horarios: cuenta explícita y periodo válido. Si la URL no especifica periodo, se conserva el predeterminado de la pantalla de origen.
- Hacia Hoy, Aprendizajes, Experimentos o Configuración: cuenta, sin fechas que sus consultas no utilizan.
- Hacia Usuarios/Estado: sin filtros de cuenta ni periodo.
- Al elegir de nuevo la misma sección: conserva todos los filtros de su URL. Al cambiar de sección: no arrastra orden, página, estado de anuncio ni otros filtros particulares.
- Formularios GET remontados con el contexto de URL: cuenta y selectores no quedan desincronizados al usar Atrás/Adelante.
- Bitácora, Rendimiento, Hoy, Aprendizajes y Experimentos enlazan a la sesión con retorno de origen. El detalle ofrece volver a ese origen y su navegación lo reconoce. Retornos externos, a otras clases de ruta o con otra cuenta explícita se descartan.
- “Limpiar” en Bitácora ahora dice exactamente lo que hace: **Limpiar responsable y tipo**, conservando cuenta y periodo.

No se añadió almacenamiento global de cuenta/periodo ni selector global duplicado. Todavía falta canonicalizar las cuentas elegidas por defecto en páginas heredadas sin `?account=…`; algunas conservan IDs fijos históricos. Tampoco se garantiza continuidad de un periodo al atravesar una pantalla que no lo consume. Estos límites impiden cerrar IM-23 por completo.

### Fechas

El [selector](../apps/web/components/DateRange.tsx) mantiene el preset elegido en estado: seleccionar 30 envía 30 aunque la pantalla haya llegado con 7. Cambiar las props de navegación restaura el rango. Un periodo recibido que no aparece entre los atajos se añade como opción seleccionada.

No mueve el foco al escribir la fecha inicial ni abre automáticamente otro calendario. Las etiquetas están vinculadas a los controles y el límite de hoy usa CDMX, no el día UTC.

La [validación de servidor](../apps/web/lib/range.ts) rechaza fechas inexistentes, rangos incompletos/invertidos/futuros, días fraccionarios/no finitos y ventanas superiores a **366 días**. Ese máximo limita consultas y listas de la interfaz; no es un umbral de negocio del agente. Cualquier necesidad de histórico mayor debe diseñar una consulta paginada/exportación, no quitar el límite sin alternativa.

Los cuatro consumidores muestran “Revisa el periodo” y recuperación que conserva cuenta, antes de consultar datos del periodo. No sustituyen silenciosamente la solicitud por otra ventana. Los enlaces antiguos `weeks` de Horarios siguen resolviéndose cuando no hay `days/from/to` explícitos.

Los extremos se calculan con `America/Mexico_City`, incluidos los cambios históricos de horario de verano. Se conserva el contrato inclusivo para las consultas existentes. **Esto no cierra IM-13:** siguen pendientes calendario de cada cuenta, hora de origen/recorte de Horarios, frescura, cobertura y ventana de cada KPI.

## Verificación y evidencia

| Suite | Resultado |
|---|---:|
| Web, 19 archivos | 280 aprobadas |
| Core | 76 aprobadas + 1 omitida preexistente |
| DB unitarias | 8 aprobadas |
| PostgreSQL 17 efímero | 49 aprobadas |
| Chromium, laboratorio | 23 aprobadas |
| **Total** | **436 aprobadas + 1 omitida preexistente** |

Incluye regresiones de 7→30, cambios de props/URL, fechas inválidas antes de consultas, días de 23/25 horas, retorno de sesión, refresco de cookies, roles visibles, guardas del layout, menú modal y anchos 320/390/768/1440. Se conservan las pruebas de permisos y configuración transaccional anteriores.

Build Next y build Vite aprobados. Se verificaron tipos sin modificar el archivo incremental versionado. El build de Next confirma que las URLs originales siguen existiendo. Vite sigue avisando que ignora `use client` en su laboratorio; Next sí utiliza esa frontera en la aplicación.

Las capturas nuevas se inspeccionaron visualmente:

- [Escritorio](capturas/codex-im23-escritorio.png).
- [Móvil](capturas/codex-im23-movil.png).
- [Menú móvil](capturas/codex-im23-menu-movil.png).
- [Acceso público, formulario de demostración](capturas/codex-im23-login.png).

La skill de navegador confirmó de nuevo que no había instancias conectadas. Tras su recuperación documentada se usó Chromium aislado de pruebas, no perfiles ni sesiones personales. Se permiten solamente solicitudes al origen local del laboratorio. **Estas capturas prueban componentes compartidos con fixtures; no prueban las doce pantallas ni un login real en Supabase.** El formulario demo nunca envía credenciales. Sus métricas están etiquetadas como fixtures fijos y no aparentan recalcularse con el filtro.

### Revisar localmente

Con el servidor del laboratorio activo:

- Shell: `http://127.0.0.1:4173/anuncios?account=100&days=7`.
- Acceso de ejemplo: `http://127.0.0.1:4173/login`.
- Catálogo anterior: `http://127.0.0.1:4173/`.

Si el servidor se detuvo, desde la raíz:

```powershell
corepack pnpm --filter @agentes-meta/web visual:dev
corepack pnpm --filter @agentes-meta/web test:visual
```

El runner de pruebas usa su propio puerto 4174 y lo cierra al terminar. Las pruebas SQL destruyen exclusivamente su contenedor/base temporal. No se aplicaron migraciones en producción.

## Pendiente y siguiente corte

1. **IM-21:** Hoy premium con fixtures: decisiones prioritarias, evidencia, estado de datos y diferencias entre simulación, aprobación y ejecución. No habilitar escritura para revisar diseño.
2. **Cierre IM-23:** prueba E2E real de Next con autenticación de ensayo, login desde detalle, expiración/revocación durante navegación, cuentas predeterminadas canonicalizadas, cambios de cuenta con filtros dependientes y todas las acciones que regresan a una lista. Comprobar el encabezado de retorno en el adaptador de despliegue, no solo en el middleware local.
3. Accesibilidad completa: lector de pantalla, Firefox/WebKit, zoom/reflow y contenido largo de pantallas reales. La suite no certifica WCAG de toda la aplicación.
4. Completar IM-22/25/26 e IM-13: componentes restantes, gráficas, semántica temporal y ausencia/frescura de datos. Los KPI heredados de Rendimiento aún usan su ventana propia de siete días.
5. Mantener bloqueos de despliegue: adopción segura del historial de migraciones, 0020 antes de publicar la web, aislamiento por cuenta y P0 del ejecutor. El rol visible del shell puede estar en un layout conservado; la autorización vigente siempre se verifica en servidor.

Referencias de implementación: separación de layouts sin cambiar URLs mediante [route groups de Next 15](https://nextjs.org/docs/15/app/api-reference/file-conventions/route-groups), contexto reactivo con [useSearchParams](https://nextjs.org/docs/15/app/api-reference/functions/use-search-params) y comportamiento del [diálogo modal nativo](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog).
