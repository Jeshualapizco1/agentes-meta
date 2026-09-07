# Quinto avance: piloto visual de Hoy

6 de septiembre de 2026. Avance local de **IM-21**, sobre la base de [componentes IM-22](10-sistema-visual-codex.md) y [shell IM-23](11-shell-navegacion-codex.md).

**El piloto está implementado y probado con datos ficticios. IM-21 sigue parcial:** falta aprobación visual e integración con lecturas reales verificables. No se reemplazó la página operativa de Hoy, no se conectaron los nuevos controles a sus Server Actions, no se desplegó ni se hizo commit/push.

## Qué se puede revisar

- Tablero carbón/naranja/violeta, cuatro KPI compactos y composición bento. Las propuestas y alertas preceden al detalle de actividad; no hay un ROAS gigante desplazando las decisiones.
- Cuenta, moneda, calendario, ventana efectiva y modo visibles. Los dos primeros avisos se ordenan por severidad y recencia; los adicionales quedan desplegables. Lo mismo ocurre con propuestas adicionales.
- Panel lateral de revisión: entidad, alcance, presupuesto actual/propuesto, diferencia diaria, creación, vencimiento, referencias de evidencia y candados al momento de generación.
- Simulación, aprobación pendiente de confirmar, ejecución registrada, rechazo, fallo y resultado desconocido tienen significados distintos. Una aprobación o un fallo nunca se convierten en una confirmación de Meta.
- Control del agente accesible desde el encabezado. Detenerlo no afirma pausar anuncios. En la demo, liberar el freno requiere vista admin y motivo, y deja el agente en off.
- En móvil, KPI en dos columnas, tarjetas apiladas y panel de ancho completo. El diálogo contiene el foco, cierra con Escape/fondo/botón, devuelve el foco y bloquea el scroll del fondo.
- Tabla de datos accesible por teclado junto a la gráfica; los huecos cortan la línea. La tabla diferencia dato ausente, ROAS no calculable y cero real.

No se añadieron dependencias ni recursos externos para este corte. Se reutilizaron tipografía local, tokens y componentes de IM-22.

## Frontera entre componente y demostración

| Capa | Archivos | Alcance |
|---|---|---|
| Contrato y cálculos puros | [hoy-view.ts](../apps/web/lib/hoy-view.ts) | Presentación determinista; no consulta servicios ni autoriza operaciones |
| Componentes reutilizables | [HoyDashboard](../apps/web/components/hoy/HoyDashboard.tsx), [HoyTrend](../apps/web/components/hoy/HoyTrend.tsx), [ProposalDetails](../apps/web/components/hoy/ProposalDetails.tsx), [DialogPanel](../apps/web/components/DialogPanel.tsx) | Reciben datos/callbacks, sin capacidad de ejecutar acciones reales incorporada |
| Laboratorio | [HoyDemo](../apps/web/preview/HoyDemo.tsx), [HoyReview](../apps/web/preview/HoyReview.tsx), [fixtures](../apps/web/preview/hoy-fixtures.ts) | Cuentas sintéticas, reloj fijo, formularios y decisiones solo en memoria |
| Aplicación existente | `app/(private)/hoy/page.tsx`, `app/hoy/actions.ts` | No modificadas en este corte; no consumen todavía el nuevo dashboard |

La ruta `/hoy` del servidor Vite es la demo. La ruta `/hoy` de Next continúa siendo la pantalla operativa anterior. No confundirlas por compartir URL relativa.

El ensayo de aprobación bloquea estado real/desconocido, freno, modo off, lectura incompleta/desactualizada, vigencia inválida/vencida, falta de evidencia/candados y decisiones previas inciertas. Verifica la propuesta actual del snapshot, no solo una referencia anterior con el mismo ID. **Son límites del ensayo de UI, no una corrección del ejecutor ni una frontera de seguridad del servidor.**

Los nuevos formularios conservan importe y motivo ante error, bloquean envíos repetidos mientras están pendientes y exigen motivo al corregir o rechazar. Los importes se convierten de unidades a centavos enteros; se rechazan valores negativos, cero, exponentes, separadores ambiguos y más de dos decimales. Los movimientos entre campañas solo tienen presentación de lectura: no simulan una transacción de dos operaciones.

No hay persistencia: aprobar, rechazar y cambiar el freno modifican únicamente el estado React. Recargar/cambiar escenario reinicia el ejemplo. La corrección de un importe no implementa límites financieros reales; estos deben validarse de nuevo en servidor con la política vigente antes de cualquier integración.

## Contrato de datos del piloto

- Recibe una fila **ya agregada por día de la cuenta**, no filas de campañas para sumar ciegamente. `reportingDate` corresponde al calendario de la cuenta; los instantes de actividad se rotulan en CDMX.
- Los cuatro KPI usan exactamente los siete días calendario anteriores a `reportingDate`; se comparan con los siete inmediatamente anteriores solo si ambas ventanas están completas y vigentes.
- No reemplaza días faltantes con otros más antiguos. Excluye días abiertos, duplicados y filas con importes inválidos/compras fraccionarias. Sin lectura se muestra ausencia, no cero; con datos parciales se explicita cobertura y se suprimen comparaciones.
- ROAS = valor atribuido / inversión; CPA = inversión / compras. Denominadores cero o resultados no finitos quedan sin valor. Las compras son atribuidas por Meta, no ventas netas. Una subida de gasto no se colorea automáticamente como mejora.
- Los importes de KPI están en unidades monetarias; los presupuestos de propuestas están en centavos. Los ejemplos usan MXN y no establecen una política universal para monedas sin dos decimales.
- Una corrida de recolección registrada no acredita cobertura total. El piloto recibe la frescura como estado; todavía no la deriva de un contrato verificable de ingesta.
- El fixture principal calcula inversión de **$24,860.00 MXN**, **214 compras**, **ROAS 3.42×** y **CPA $116.17** para el 30 de agosto–5 de septiembre de 2026. Las referencias de cada propuesta pertenecen a su propia entidad/ventana sintética, no al agregado de la cuenta.

**Esto no cierra IM-13/16/31.** Falta comprobar cobertura por entidad, paginación, corte por zona de cuenta, reexpresión, frescura y trazabilidad de resultados en el adaptador real. El número de días disponibles no demuestra por sí solo que se hayan recibido todas las campañas.

## Escenarios de revisión

El selector inferior, plegado por defecto, permite 13 estados: propuestas en simulación, sin propuestas, parcial, desactualizado, error, vacío, carga, sin permiso, freno, off, resultado por confirmar, modo real de solo lectura y vencimiento.

También permite nombres/importes largos, vista admin y fallo de guardado local. Cambiar a la segunda cuenta sintética no conserva la cola anterior. Una cuenta inexistente ofrece recuperación explícita; escenarios de URL desconocidos no se aceptan como claves válidas.

La vista sin permiso no dibuja datos de cuenta. Como se trata de fixtures enviados al navegador, esta prueba **no demuestra aislamiento de datos**: el acceso real se debe resolver antes de enviar el DTO al cliente.

## Verificación

| Suite | Resultado |
|---|---:|
| Web, 21 archivos | 332 aprobadas |
| Core | 76 aprobadas + 1 omitida preexistente |
| DB unitarias | 8 aprobadas |
| PostgreSQL 17 efímero | 49 aprobadas |
| Chromium, laboratorio | 49 aprobadas |
| **Total** | **514 aprobadas + 1 omitida preexistente** |

Se añadieron **78 regresiones** respecto al corte anterior: 48 del modelo de Hoy, 4 de representación de la tendencia y 26 de navegador. Cubren ventanas, unidades, estados, fechas, límites numéricos, huecos, borradores, teclado, roles de ensayo, cambio de cuenta y anchos 320/390/768/1440. Las 23 pruebas de navegador previas también pasan.

Build Next, build Vite y tipos de los cinco paquetes aprobados. El build de Vite avisa que ignora directivas `use client` porque este laboratorio es cliente; no modifica su significado en Next. No se alteró el archivo incremental versionado. Las suites SQL eliminaron exclusivamente su base y contenedor efímeros; no se aplicaron migraciones reales.

La skill de navegador no encontró una instancia conectada tras la recuperación documentada; se continuó con Chromium aislado de pruebas. Las pruebas de Hoy abortan solicitudes fuera del origen local y métodos diferentes de GET/HEAD. No se accedió a perfiles personales, credenciales, cuentas reales ni servicios de Meta/Supabase. Esto es QA del laboratorio, **no E2E de Next/Auth/Meta ni certificación de accesibilidad completa**.

Capturas nuevas inspeccionadas visualmente:

- [Escritorio completo](capturas/codex-im21-hoy-escritorio.png) y [primer viewport](capturas/codex-im21-hoy-inicio.png).
- [Panel de propuesta en escritorio](capturas/codex-im21-propuesta-escritorio.png).
- [Hoy en móvil](capturas/codex-im21-hoy-movil.png) y [panel móvil](capturas/codex-im21-propuesta-movil.png).

## Abrir el piloto

Con el laboratorio activo: **http://127.0.0.1:4173/hoy?account=100**. El catálogo anterior continúa en `/` y el shell de prueba en `/anuncios?account=100&days=7`.

Si se detuvo, ejecutar desde la raíz:

```powershell
corepack pnpm --filter @agentes-meta/web visual:dev
```

Para repetir las pruebas del navegador: `corepack pnpm --filter @agentes-meta/web test:visual`. El runner usa su propio puerto 4174 y lo cierra al terminar.

## Siguiente corte y condiciones de cierre

1. Revisar con Jeshua la composición de Hoy en escritorio/móvil. El cierre visual requiere su aprobación; disponer de capturas no la sustituye.
2. Construir un adaptador de lectura probado para Hoy: errores explícitos por sección, cuenta autorizada, consultas completas/paginadas, calendario, cobertura/frescura y estados de decisiones que no infieran ejecución. Integrar inicialmente en lectura, conservando la separación entre demo y aplicación.
3. Antes de conectar controles reales, completar autorización por registro/cuenta, validación de importes, concurrencia, intención durable, revalidación y reconciliación de IM-03/04/08–12/16. No conectar el nuevo formulario directamente a la acción heredada de aprobar.
4. Continuar IM-22/23/25/34: adopción en otras pantallas, cuentas predeterminadas, gráficas, E2E de autenticación, lector de pantalla, otros motores y zoom/reflow. Este piloto no constituye la auditoría visual ejecutada de las doce rutas.
5. Conservar puertas de despliegue y dinero real: historial de migraciones, ensayo de actualización, 0020 antes de publicar la web y autorización específica para habilitar ejecución. Ninguna de estas capacidades se activa con una aprobación estética.
