# Auditoría profunda y mejoras propuestas — agentes-meta

Fecha: 5 de septiembre de 2026. Revisión realizada por Codex a solicitud de Jeshua.

Base auditada: rama `main`, commit [`cec893b`](https://github.com/Jeshualapizco1/agentes-meta/tree/cec893b77f0dd3c703e1876f98908c0b585de76f).

## 1. Conclusión ejecutiva

El inventario contiene **109 hallazgos y mejoras**: 12 P0, 55 P1, 40 P2 y 2 P3. Incluye defectos, pendientes conocidos y oportunidades de producto; no son 109 vulnerabilidades. Para una primera lectura, revisa esta conclusión, la comparación con Testmia (sección 4), las reproducciones (14) y el plan priorizado (16).

**Conservaría la base del proyecto. No activaría todavía la ejecución real ni la autonomía.** Hay una arquitectura razonable, trabajo valioso de dominio y una interfaz bastante más avanzada que un prototipo vacío. El problema principal no es que se haya construido con Claude: es que varias garantías descritas en los documentos y probadas como funciones aisladas todavía no se cumplen al conectar aprobación, base de datos, Meta, recuperación y evaluación.

Mi diagnóstico: hoy tienes una **herramienta interna de observación y evaluación con infraestructura parcial de ejecución**, no todavía un operador autónomo fiable. Eso es una buena base para el objetivo original, siempre que se distinga claramente lo operativo, lo simulado, lo pendiente de criterio humano y lo que aún necesita demostrar seguridad.

Los hallazgos más importantes son estos:

| Prioridad | Hallazgo | Consecuencia | Referencia |
|---|---|---|---|
| P0 | El ejecutor no vuelve a comprobar los candados de negocio | Una aprobación puede terminar ejecutándose con modo `off`, lista blanca vacía o un aumento fuera de límite | S01–S03 |
| P0 | No hay reclamación atómica de una propuesta | Dos invocaciones concurrentes pueden enviar la misma orden | S04 |
| P0 | Un movimiento de presupuesto no se recupera correctamente ante fallos parciales | Se puede dejar un movimiento a medias o aumentar el presupuesto total al compensar un resultado desconocido | S05–S07 |
| P0 | Los congelamientos se escriben, pero no son una barrera efectiva de ejecución | Se puede volver a tocar una entidad que debería estar protegida | S08 |
| P0 | La configuración sensible no exige rol administrador en el servidor | Un usuario autenticado puede cambiar límites o desmarcar la simulación | A02 |
| P1 | La madurez de las evaluaciones depende del calendario, no de la cobertura observada | Reproduje confianza alta y propuesta de graduación con solo 1 de 7 días posteriores presentes | E01, X01 |
| P1 | El reporte histórico modifica evaluaciones actuales y puede conservar una narrativa vieja | La evidencia y lo que dice el sistema pueden dejar de coincidir | E06–E07 |
| P1 | El repositorio es público, aunque los documentos dicen privado | Hay información operativa y comercial accesible sin autenticación | A04 |
| P1 | Una notificación fallida queda excluida de los reintentos | Un aviso crítico puede perderse definitivamente | O03 |
| P1 | Los workflows pueden terminar verdes pese a errores internos por cuenta | El semáforo de GitHub no demuestra salud funcional | O01 |

P0 significa **bloqueante antes de habilitar escrituras reales**, no que haya demostrado un incidente de gasto en producción. No consulté la configuración viva de las cuentas ni ejecuté órdenes contra Meta.

### El orden que cambiaría respecto a tus pendientes

En [PENDIENTES.md](PENDIENTES.md), el botón de reversión y la lectura de `entity_freezes` dependen de haber llegado a ejecución real. Invertiría esa dependencia: **recuperación, congelamientos, permisos e idempotencia deben funcionar y probarse antes de desactivar `dry_run`**. Dos semanas de simulaciones revisadas son útiles, pero no prueban cómo se comporta un POST que sí se aplicó y cuya confirmación se perdió.

## 2. Alcance, método y límites

### Identificación y trabajo realizado

- Repositorio clonado en `C:\Users\usuar\proyectos\agentes-meta`.
- SHA exacto auditado: `cec893b77f0dd3c703e1876f98908c0b585de76f`.
- Revisión de los cinco paquetes del workspace, flujos de servidor, componentes, esquema/migraciones, workflows, pruebas, scripts, documentación de diseño y pendientes.
- Contraste entre las promesas de seguridad y las rutas que realmente llegan a Meta.
- Revisión de la oferta pública de Testmia, sin acceso a su producto autenticado ni a su implementación interna.
- Instalación reproducible con lockfile, comprobación de tipos, pruebas existentes, compilación web y auditoría de dependencias.
- Veinte escenarios diagnósticos locales con funciones reales del proyecto y dobles de Supabase/Meta en memoria. Se bloqueó `fetch` en ese diagnóstico; no se usaron credenciales reales.
- Consultas de solo lectura a GitHub para visibilidad, workflows, ejecuciones recientes y protecciones de rama.

No se modificó la lógica de la aplicación, no se aplicaron migraciones, no se enviaron avisos, no se hicieron cambios en Meta, no se desplegó y no se hizo commit ni push. Este documento es el entregable de la auditoría.

### Comprobaciones ejecutadas

| Comprobación | Resultado observado |
|---|---|
| `corepack pnpm install --frozen-lockfile` | Correcta, sin cambiar el lockfile |
| `corepack pnpm -r typecheck` | Correcta en todos los paquetes |
| `corepack pnpm -r test` | 10 archivos; **76 pruebas aprobadas y 1 omitida** |
| `corepack pnpm --filter @agentes-meta/web build` | Compilación de producción correcta; Next 15.5.25 |
| `corepack pnpm audit --json` | 4 avisos transitivos: 2 altos y 2 moderados, ninguno crítico |
| Diagnóstico adicional | 20 escenarios documentados en el anexo; todos reprodujeron el comportamiento descrito |
| Interfaz interactiva | No se pudo verificar en navegador: no había navegador conectado disponible |

La prueba omitida depende de una captura real de actividades que no está incluida en el clon. Las pruebas existentes se concentran en `core`; aprobarlas no equivale a probar concurrencia, RLS, Server Actions ni fallos parciales de una integración.

La revisión visual se limitó al código y a una captura existente de Hoy. No afirmo haber probado móvil, accesibilidad completa, sesiones autenticadas de producción ni interacción real con el selector de fechas.

### Estado remoto observado, no supuesto

- GitHub informó `isPrivate: false`: el repositorio es **público** al momento de la revisión.
- Los workflows `collector` y `ci` estaban activos. El collector tenía ejecuciones programadas exitosas recientes; el pendiente de comprobar si alguna corrida `schedule` existe ya tiene respuesta positiva.
- La ejecución [`33989991055`](https://github.com/Jeshualapizco1/agentes-meta/actions/runs/33989991055), creada el 5 de septiembre a las 20:24:06 UTC, terminó correctamente. Sus logs registraron tres cuentas con collector y analista correctos, además de ausencia de configuración de Telegram y de clave de narrativa.
- El cron está definido a las 00:17, 06:17, 12:17 y 18:17 UTC. Varias ejecuciones recientes se crearon horas después de los horarios nominales. `created_at` permite observar esa diferencia, pero no reconstruir por sí solo todos los motivos del retraso ni garantizar qué slot originó cada corrida.
- El endpoint de protección de `main` respondió `Branch not protected`, y la consulta de rulesets no devolvió reglas. Esto describe el estado visible durante la auditoría; puede cambiar posteriormente.

### Cómo interpretar el inventario

- **R — Reproducido:** comportamiento observado en un diagnóstico local aislado.
- **C — Código/configuración:** conclusión sustentada por una ruta de código o configuración inspeccionada; no implica explotación o incidente en producción.
- **V — Verificado externamente:** estado consultado en una fuente o servicio.
- **K — Ya conocido:** aparece en tus propios pendientes; no lo presento como descubrimiento nuevo.
- **M — Mejora:** oportunidad de producto o ingeniería, no necesariamente un error actual.
- **P0:** barrera para dinero real. **P1:** integridad, seguridad o fiabilidad prioritaria. **P2:** calidad y operación. **P3:** expansión opcional.

Es un inventario amplio de **todo lo detectado en esta revisión**, no una garantía de ausencia de otros defectos. Las limitaciones que requieren acceso a producción se dejan explícitas al final.

## 3. Lo que está bien y conservaría

1. **Separación de cálculo y red.** `core` concentra fórmulas y reglas puras; `meta`, `db` y `agents` separan adaptadores y orquestación. Es una buena estructura para seguir construyendo.
2. **Los números no dependen del LLM.** La narrativa recibe evidencia determinista. Conservaría esa frontera también si cambias Claude por otro proveedor.
3. **No comenzar directamente en automático.** La intención `off → semi → auto` por regla, la lista blanca y `dry_run` son buenas decisiones de diseño.
4. **Registro previo a la escritura.** La idea del write-ahead log es correcta. Lo que falta es completar sus garantías de concurrencia, recuperación y persistencia, no descartarla.
5. **Eventos originales, grupos y sesiones.** Hay trabajo real para convertir ruido de actividades en decisiones entendibles y preservar anotaciones al reagrupar.
6. **Atención a la atribución tardía y a las zonas horarias.** El código ya contempla reexpresiones y fecha de la cuenta. Hay inconsistencias concretas, pero el problema fue identificado desde el diseño.
7. **Referencias explícitas y salvedades.** El analista intenta explicar contra qué compara y cuándo hay poca evidencia; eso es mejor base que un ROAS aislado presentado como verdad causal.
8. **Historial de reglas, perfiles, propuestas y veredictos.** Son piezas útiles para auditar y aprender, aunque algunas rutas aún no sean transaccionales.
9. **RLS activado y clave privilegiada en servidor.** No encontré una entrega deliberada de la `service_role` al navegador. No es correcto decir que la app carece de autenticación o que RLS no existe.
10. **CI, lockfile y documentación de decisiones.** El proyecto compila, tiene pruebas y explica por qué descartó Shopify. No recomendaría una reescritura de framework ni volver a añadir integraciones sin una necesidad concreta.

### Mapa de las responsabilidades actuales

| Capa | Responsabilidad | Principal brecha |
|---|---|---|
| `packages/meta` | Lectura y escritura en Graph API | Confirmación por tipo, errores ambiguos, límites de API |
| `packages/db` y migraciones | Persistencia y paginación | Invariantes transaccionales, permisos y migraciones reproducibles |
| `packages/core` | Normalización, sesiones, evaluación, reglas y órdenes | Cobertura de datos y contratos completos de seguridad |
| `packages/agents` | Collector, analista, estratega, ejecutor y avisos | Recuperación de fallos, estado durable e idempotencia |
| `apps/web` | Lectura operativa, configuración y decisiones humanas | Autorización central, validación y visibilidad de datos incompletos |

## 4. Qué significa acercarse a Testmia

La comparación debe basarse en lo que Testmia **publica**, no en suponer cómo implementa sus agentes. Su página del [agente Meta Ads](https://testmia.com/es/agente-meta-ads) describe pasadas periódicas, restricciones operativas, aprobaciones y registro de acciones. Esa es la comparación más relevante para este repositorio.

| Capacidad | Lo que anuncia Testmia | Situación aquí | Qué haría |
|---|---|---|---|
| Supervisión periódica de Meta | Agente con ciclos de revisión | Collector y vigilancia programados | Medir frescura y cobertura, no solo cantidad de corridas |
| Decisiones con límites | Guardrails y control de autonomía | Candados y propuestas existen; generador de acciones vacío | Completar el circuito seguro antes de nuevas reglas |
| Identidad del negocio | Contexto de marca, negocio y cliente | Perfil principalmente numérico | Añadir contexto operativo útil, no un formulario decorativo |
| Creativos/anuncios | Revisión y trabajo sobre anuncios | Galería, métricas y marca de revisado | Primero transformar revisiones en aprendizaje consultable |
| Resultados comerciales | Integración de negocio más amplia | Fuente de rendimiento limitada deliberadamente a Meta | Etiquetar atribución; integrar ventas solo si se decide ampliar alcance |
| Otros canales | Parte de la expansión pública/proyectada | Fuera del alcance actual | No convertirlo ahora en plataforma multicanal |

Las páginas de [Identidad](https://testmia.com/es/identidad), [Anuncios](https://testmia.com/es/anuncios) y [Próximamente](https://testmia.com/es/proximamente) ayudan a distinguir módulos anunciados y expansión futura. No doy por existentes todas las funciones futuras ni por verificadas las promesas comerciales de rendimiento.

Para Aromante, priorizaría este producto concreto: **un copiloto operativo de Meta que explica los cambios humanos, registra experimentos antes de ejecutarlos y solo propone/ejecuta acciones acotadas con evidencia y aprobación verificables**. No hace falta copiar toda la suite para cumplir esa promesa.

## 5. Seguridad de ejecución y reglas

### S01 — P0 · R/C · El ejecutor no aplica la política vigente

Evidencia: [executor.ts](packages/agents/src/executor.ts), `executeProposal`, especialmente la lectura del perfil; [hoy/actions.ts](apps/web/app/hoy/actions.ts), `decideProposal`. El ejecutor lee del perfil únicamente `dry_run`. No revalida `mode`, lista blanca, límites de cambio, cobertura, cooldown, regla vigente ni presupuesto comprometido. El filtro previo del estratega no protege una aprobación corregida o antigua.

En R01, una propuesta aprobada de $1,000 a $100,000 pasó a `ejecutada` con modo `off`, lista blanca vacía y máximo de cambio de 17%. Es una reproducción con servicios simulados, no un gasto real observado.

Mejora: una función de autorización de ejecución, compartida y obligatoria, que recalcule todos los candados con estado fresco justo antes de enviar. Ninguna corrección humana debe saltarse límites; una excepción extraordinaria necesita un flujo separado y auditado.

Cierre: los tres casos anteriores deben producir **cero POST** y una causa de bloqueo visible.

### S02 — P0 · R/C · Un error al leer el freno permite continuar

Evidencia: `executeProposal` obtiene `{ data }` e ignora `error` en la consulta a `emergency_brakes`. R02 inyectó ese fallo y la orden se ejecutó. Otras lecturas de seguridad también convierten ausencia/error en valores por defecto sin distinguirlos.

Mejora: ante error, ambigüedad o falta de configuración obligatoria, cerrar la salida de escritura. Diferenciar “freno ausente con política inicial explícita” de “no pudimos consultar el freno”. Un freno guardado en una DB inaccesible tampoco debe ser la única barrera.

Cierre: pruebas de fallo de cada dependencia de autorización; todas deben detener el envío y producir señal operativa.

### S03 — P0 · C · Una aprobación no queda ligada al contexto que se aprobó

Evidencia: [executor.ts](packages/agents/src/executor.ts) y [hoy/actions.ts](apps/web/app/hoy/actions.ts). Se comprueba el estado textual, pero no la caducidad de la aprobación, el estado vivo previo de la entidad, la versión de la regla/perfil ni el modo aprobado. Una propuesta pendiente de token puede quedar aprobada y ejecutarse después de desmarcar `dry_run`.

Mejora: guardar una huella inmutable de cuenta, entidades, importes, evidencia, versiones, modo y vencimiento. Releer presupuesto/estado antes del POST; si una persona ya cambió la campaña, invalidar y pedir nueva aprobación. Cambiar de simulación a real no debe convertir aprobaciones históricas en órdenes reales.

Cierre: aprobar en simulado, cambiar configuración y reintentar no envía dinero; modificar la entidad en Meta entre aprobación y ejecución tampoco ejecuta sobre una precondición falsa.

### S04 — P0 · R/C · Falta idempotencia transaccional y exclusión entre ejecutores

Evidencia: `executeProposal`, `decideProposal` y [0018_executions.sql](packages/db/migrations/0018_executions.sql). Leer `aprobada` y luego insertar una ejecución no reclama la propuesta atómicamente. El índice `(proposal_id, step)` no es único. R03 ejecutó dos invocaciones concurrentes y observó dos envíos y dos registros.

Un presupuesto absoluto repetido no significa necesariamente gastar el doble, pero sí permite duplicar operaciones, carreras con cambios humanos y trazas inconsistentes. La concurrencia del workflow no cubre la web, el CLI y otros procesos.

Mejora: transición condicional en DB, lease/propietario de ejecución, exclusión por entidad y claves únicas por intención/paso/intento. Las transiciones deben comprobar el estado almacenado y el número de filas afectadas, no solo una variable local.

Cierre: dos aprobadores y dos workers simultáneos generan una única ejecución lógica; reintentar devuelve el resultado existente o reconcilia un estado incierto.

### S05 — P0 · R · Fallar al registrar el segundo paso deja el primero aplicado

Evidencia: el retorno temprano ante fallo de `insert executions` en [executor.ts](packages/agents/src/executor.ts). En R04, origen $1,000 → $800 se aplicó; falló el registro del segundo paso y el destino siguió en $500. La nota decía “nada se envió”, aunque sí se había enviado el primer paso.

Mejora: registrar la intención completa del movimiento antes de enviar cualquiera de sus partes y tratar todos los errores posteriores dentro de una máquina durable de recuperación. La nota debe describir exactamente qué quedó confirmado, desconocido o pendiente.

Cierre: inyectar error en cada escritura de DB del movimiento; nunca perder conocimiento del paso anterior ni declarar que no hubo envío cuando sí lo hubo.

### S06 — P0 · R · Un timeout de confirmación puede aumentar el total del movimiento

Evidencia: `pairFailurePlan` en [execution.ts](packages/core/src/execution.ts) y su uso en `executeProposal`. R05 partió de $1,000 + $500. Meta simulado aplicó $800 + $700; la relectura del destino falló. La recuperación restauró solo el origen a $1,000 y dejó el destino en $700: **$1,500 → $1,700**.

El problema es confundir “no pude confirmar” con “no se aplicó”. No se arregla agregando un `catch` o repitiendo todos los POST.

Mejora: estado explícito `desconocida/reconciliando`, consulta de ambos extremos con reintentos acotados y compensación calculada desde el estado confirmado. Si no se puede determinar el resultado, congelar ambas entidades, bloquear nuevas acciones y escalar a una persona.

Cierre: perder la respuesta del POST y perder la relectura deben tener pruebas distintas; ninguna debe incrementar inadvertidamente el presupuesto total.

### S07 — P0 · C · Recuperación y rollback incompletos

Evidencia: bloque de compensación en [executor.ts](packages/agents/src/executor.ts). Si falla la inserción del rollback, `rbx!.id` puede fallar también dentro del `catch`. Hay actualizaciones cuyo error no se comprueba, no se relee el resultado de la compensación y la nota puede decir “revertida” aunque falló. Tampoco hay un reconciliador de órdenes que quedaron `registrada` o `enviada` cuando murió el proceso.

Mejora: saga persistente con estado por paso, resultados de compensación separados y recuperación al arrancar. Un rollback es otra operación externa que puede fallar, no una garantía automática. Conservar el valor realmente observado antes del cambio y no sobreescribir cambios humanos posteriores al revertir.

Cierre: matar el worker en cada frontera DB/POST/relectura; reiniciarlo debe recuperar o dejar un caso inequívocamente bloqueado, nunca inventar éxito.

### S08 — P0 · C/K · Congelamientos sin barrera efectiva y cooldown demasiado estrecho

Evidencia: el ejecutor escribe `entity_freezes`, pero [strategist.ts de core](packages/core/src/strategist.ts) no recibe esa tabla en `LockContext`. El [estratega de agents](packages/agents/src/strategist.ts) busca cambios de presupuesto por ID exacto. No protege de forma completa relaciones anuncio → conjunto → campaña, otros cambios significativos ni el destino de un movimiento. La falta de lectura de `entity_freezes` ya está en los pendientes.

Mejora: resolver el ámbito afectado y comprobar congelamientos/cambios humanos relevantes tanto al proponer como al ejecutar. Definir cómo interactúan pausas de emergencia, experimentos y cambios del comprador con esas esperas.

Cierre: modificar un hijo o congelar cualquiera de los extremos impide una nueva orden incompatible; la interfaz muestra causa y vencimiento.

### S09 — P0 · R/C · El techo mira el estado anterior, no el resultado de la propuesta

Evidencia: `evaluateLocks` utiliza `over_committed` ya calculado. R11 tenía $1,290 comprometidos, límite $1,300 y una subida de $200; todos los candados pasaron aunque el resultado sería $1,490.

Mejora: proyectar el presupuesto tras cada acción y reservar capacidad para propuestas aprobadas/en vuelo. Para movimientos, calcular ambos extremos y su jerarquía; no sumar presupuesto de campaña y de sus hijos como si fueran gasto independiente. Separar “impedir nuevas subidas” de “garantizar un máximo real de gasto”.

Cierre: tanto una propuesta individual como varias concurrentes respetan el límite proyectado. El gasto real de Meta sigue siendo una magnitud diferente que necesita vigilancia.

### S10 — P1 · R/C · Las propuestas de una pasada no se coordinan entre sí

Evidencia: `runPass` evalúa todos los candidatos con el mismo `ctx`. R12 aceptó una subida y una bajada sobre la misma entidad. Tampoco reserva cooldown, cambio acumulado o capacidad después de aceptar el primer candidato.

Mejora: arbitraje determinista por entidad y regla, orden de prioridad explícito, coalescencia cuando proceda y simulación del estado resultante de la pasada. Los bloqueados deben conservar por qué perdieron frente a otra propuesta.

Cierre: ningún lote contiene decisiones contradictorias o dos acciones que individualmente pasan pero juntas exceden los límites.

### S11 — P0 · R/C · Validación insuficiente de las órdenes de movimiento

Evidencia: `validateOrder`, `orderForProposal` y `expandOrders` en [execution.ts](packages/core/src/execution.ts). R09 aceptó origen igual a destino: la expansión acabaría subiendo esa misma entidad. R10 aceptó mover todo el presupuesto del origen y produjo una orden de presupuesto cero que la validación individual rechaza.

Mejora: IDs distintos, pertenencia a la misma cuenta, nivel permitido, moneda consistente, enteros seguros en centavos y límites del presupuesto resultante. Validar también cada orden expandida **antes de simularla o enviarla**. El nombre de la acción y la dirección del cambio deben coincidir después de una corrección.

Cierre: pruebas de origen=destino, cuenta cruzada, cero, negativos, valores fuera de rango, decimales y corrección que invierte una subida en bajada.

### S12 — P1 · C/V · La confirmación de una pausa solicita un campo de presupuesto del anuncio

Evidencia: [write.ts](packages/meta/src/write.ts), `reread`, pide siempre `daily_budget`, incluso para un objeto `ad`. El [SDK oficial de Meta, objeto Ad](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/ad.py), expone `status` y `effective_status`, pero no `daily_budget` como campo de ese objeto.

Esto es un riesgo de integración concreto, no una llamada real fallida que haya observado aquí. Puede aplicar la pausa y luego fallar la confirmación por la selección de campos.

Mejora: relectura por tipo de orden/entidad, contrato de respuesta validado y prueba de integración con la versión Graph configurada. Permitir consistencia eventual acotada sin confundirla con rechazo.

Cierre: una pausa y cada variante de presupuesto se confirman con campos válidos para su tipo.

### S13 — P1 · C · Existen caminos alternativos de escritura sin la orquestación de seguridad

Evidencia: `MetaWriter` expone `pauseAd`, `setDailyBudget` y `moveBudget`; `execute` puede invocar el movimiento con `onStep` vacío. `MetaClient.post` también es público. La ruta actual del ejecutor expande los pares, pero la API interna permite que código futuro evite WAL y política sin darse cuenta.

Mejora: mantener el transporte genérico dentro del adaptador y exponer al resto del proyecto una única capacidad de ejecución autorizada. Eliminar la duplicación de lógica de pares entre writer y executor o hacer inequívoco cuál es el responsable.

Cierre: una búsqueda de llamadas de escritura muestra un único límite de autorización y registro, con pruebas que impidan nuevos atajos.

### S14 — P1 · C · La simulación comprueba menos de lo que su mensaje sugiere

Evidencia: `hasAdsManagement` mira el scope, pero no combina `is_valid`, tipo, vencimiento y acceso concreto a la cuenta. En el camino real tampoco se detiene por `perm.ok === false`. `WriteResult.ok` se fija a `true` sin comprobar `success` del cuerpo.

Mejora: distinguir validación local, token válido, acceso a la cuenta, simulación y confirmación real. Una simulación no verifica los presupuestos vivos ni la recuperación ante un efecto externo; no presentarla como certificación completa de ejecutabilidad.

Cierre: token inválido con scopes antiguos, permiso insuficiente y respuesta `success:false` producen estados y mensajes correctos, sin avanzar falsamente a confirmado.

### S15 — P1 · C/K · Algunas restricciones del perfil no son reglas ejecutables

Evidencia: `hard_noes` y `daily_spend_floor` se capturan en Configuración, pero no aparecen como barreras operativas en los candados. `max_actions_per_day` se utiliza como máximo de la pasada, sin un contador durable del día. Si el cálculo del porcentaje devuelve `null`, límites de porcentaje se marcan “no aplica”.

Mejora: separar restricciones estructuradas y comprobables de notas humanas. Validar configuración numérica y rechazar un presupuesto cuya variación no se puede calcular. Definir con precisión límites por día, pasada, entidad y ventana. No prometer que un texto libre se cumple automáticamente.

Cierre: cada control visible tiene una regla servidor, una prueba y una explicación de alcance; los controles todavía informativos se identifican como tales.

### S16 — P2 · C · El freno automático y su lenguaje no coinciden totalmente

Evidencia: `brakeTriggers` frena si candidatos > máximo por pasada, mientras algunos textos hablan de más del doble. Puede detener toda la pasada por candidatos que habrían sido descartados. Solo se consideran ciertos estados de pago, no un modelo completo de cuenta operable.

Mejora: definir si un exceso de candidatos es una anomalía o una situación normal de priorización; usar umbrales coherentes. Separar freno del agente de pausa de entrega en Meta: **activar el freno no detiene por sí mismo campañas que ya gastan**.

Cierre: seis candidatos con máximo cinco tienen el comportamiento documentado; la UI no dice “frenar cuenta” si solo suspende el algoritmo.

### S17 — P1 · R/C · Las órdenes propias no se reconocen con el formato normalizado real

Evidencia: [normalize.ts](packages/core/src/normalize.ts) y `isOwnOrder` en [execution.ts](packages/core/src/execution.ts). R06 mostró que un presupuesto anidado deja `newValue` como objeto, aunque `budgetNewCents` sí es numérico. Compararlo como string con el valor enviado falla. Los tests actuales usan valores sintéticos más simples que el flujo real.

Mejora: comparar campos canónicos por tipo: centavos para presupuesto, estado normalizado para pausas; añadir cuenta, entidad, operación y ventana temporal. Tratar coincidencias ambiguas como ambiguas: una persona también podría enviar el mismo importe poco después.

Cierre: prueba completa raw Meta → normalize → reconocimiento → sesión, tanto para presupuesto como para estado; no atribuir automáticamente al agente un cambio humano similar.

### S18 — P1 · C/K · La autonomía no debe ganarse solo acumulando aprobaciones

Evidencia: `decideProposal` incrementa `approved_streak` al aprobar, antes del resultado real. Las actualizaciones pueden competir entre sí; no hay reinicio equivalente en fallo de ejecución/rollback. La promoción automática sigue pendiente, por lo que es el momento de corregir el criterio.

Mejora: vincular la racha a una versión de regla y distinguir aprobada, simulada, ejecutada y evaluada. Añadir mínimos de desempeño y cobertura, límites de exposición, reversibilidad y degradación ante incidentes. Cambiar la regla debe invalidar evidencia anterior incompatible.

Cierre: una regla con diez aprobaciones pero ejecuciones fallidas o evaluaciones desfavorables no puede promoverse.

## 6. Autenticación, permisos y exposición

### A01 — P1 · C · La membresía de la aplicación no se verifica en cada acceso

Evidencia: [auth.ts](apps/web/lib/auth.ts), `requireUser`, comprueba usuario de Supabase con email, no pertenencia vigente a `app_users`. El login sí consulta la lista y algunas acciones también, pero no es una frontera uniforme. Quitar a alguien de `app_users` no vuelve a comprobarse en todas las rutas de una sesión existente.

Mejora: centralizar `requireMember`/`requireRole` y usarlo en cada lectura sensible y Server Action, no solo en páginas o formulario de login. Comprobar acceso de cuenta cuando corresponda. Si Supabase permite alta directa, un usuario externo autenticado sería otro camino de entrada: **esa configuración no fue verificada**.

Cierre: usuario autenticado pero no autorizado, usuario revocado y acceso directo a una acción son rechazados en servidor.

### A02 — P0 · C · Cualquier usuario autenticado puede cambiar la política de dinero real

Evidencia: [configuracion/actions.ts](apps/web/app/configuracion/actions.ts), `saveProfile`, no exige administrador; acepta `dry_run`, límites, lista blanca y `mode: auto` aunque la opción auto esté deshabilitada en la UI. Deshabilitar un control HTML no es autorización.

Mejora: reservar al rol/propietario acordado el cambio de modo, techos, whitelist y simulación. Reautenticación o confirmación reforzada para habilitar escrituras, mostrando claramente cuenta, límite y efectos. El servidor debe rechazar modos aún no implementados.

Cierre: un comprador no puede cambiar esos campos enviando su propio FormData; un admin tampoco habilita auto antes de superar sus requisitos.

### A03 — P1 · C · `service_role` amplifica cualquier omisión de autorización

Evidencia: [db.ts](apps/web/lib/db.ts), [packages/db](packages/db/src/index.ts) y migraciones RLS. Usar una clave privilegiada en servidor es una decisión posible para una herramienta interna, pero evita las restricciones RLS. Supabase lo documenta en su guía de [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

Mejora: matriz de permisos central y consultas acotadas por cuenta/usuario; separar capacidad de administración Auth de las lecturas normales. Valorar una conexión con permisos limitados o políticas de usuario según necesidades reales. No basta activar RLS y concluir que hay aislamiento entre clientes.

Cierre: pruebas negativas en una DB de ensayo para anónimo, usuario no miembro, comprador y administrador. Si se comercializa, aislamiento multiempresa obligatorio antes de incorporar clientes.

### A04 — P1 · V/C/K · Repositorio público con información comercial y operativa

Evidencia: GitHub devuelve `isPrivate:false`, en contraste con README/pendientes de repo privado. Migraciones, documentos, logs/capturas versionadas contienen identificadores de cuentas, personas y datos comerciales. No todos son secretos de autenticación, pero no son material de demostración anónimo.

Mejora: decidir explícitamente si será privado o un proyecto público saneado. Para hacerlo público, sustituir semillas y capturas por datos ficticios y revisar también el historial. La rotación de credenciales que los pendientes reconocen haber compartido sigue siendo necesaria; borrar una línea no revoca un token.

No encontré archivos `.env` versionados en la comprobación de sus rutas habituales, pero **no realicé una certificación exhaustiva de secretos en todo el historial**. Recomiendo escáner de secretos y revisión humana, sin publicar sus resultados sensibles.

Cierre: decisión de visibilidad documentada, datos comerciales retirados o aprobados explícitamente, secretos expuestos revocados y nuevas capturas sintéticas. No cambié la visibilidad ni roté credenciales durante esta auditoría.

### A05 — P1 · C · Falta validación uniforme de entradas y pertenencia de IDs

Evidencia: acciones de [Hoy](apps/web/app/hoy/actions.ts), [Experimentos](apps/web/app/experimentos/actions.ts), [Anuncios](apps/web/app/anuncios/actions.ts) y [Configuración](apps/web/app/configuracion/actions.ts). Se convierten cadenas a número y se aceptan IDs aportados por el formulario sin un esquema común de dominio. Hay consultas con filtros de texto construidos a partir de parámetros.

Mejora: esquema validado en servidor para números finitos/rangos, enums, fechas y longitudes; resolver cuenta desde la entidad/propuesta almacenada, no confiar en el `account` del formulario. No interpolar sintaxis de filtros sin validación. No lo describo como SQL injection: el riesgo aquí es manipular filtros o introducir relaciones incoherentes.

Cierre: IDs de otra cuenta, valores negativos/extremos, filtros malformados y textos excesivos se rechazan antes de escribir.

### A06 — P1 · C · Gestión de usuarios con operaciones demasiado acopladas

Evidencia: [usuarios/actions.ts](apps/web/app/usuarios/actions.ts), [usuarios/page.tsx](apps/web/app/usuarios/page.tsx) y [admin.ts](apps/web/lib/admin.ts). Alta, cambios de rol y contraseña requieren distinguir Auth de `app_users`; fallar a mitad puede dejar estados divergentes. El listado Auth está limitado y la contraseña se captura como texto visible. No hay protección explícita del último administrador.

Mejora: separar alta, cambio de rol, baja y restablecimiento de contraseña; ocultar contraseña por defecto, exigir reautenticación para acciones delicadas, paginar usuarios y reconciliar fallos entre sistemas. Impedir perder al último admin y registrar quién cambió qué, sin guardar contraseñas en logs.

Cierre: fallo parcial no deja una cuenta inadvertidamente habilitada; borrar/degradar al último administrador se bloquea y una baja revoca el acceso efectivo.

### A07 — P2 · C · Redirecciones locales y mensajes de error necesitan endurecimiento

Evidencia: [login/actions.ts](apps/web/app/login/actions.ts), acciones de anuncios y páginas que aplican `decodeURIComponent` a parámetros ya decodificados. Comprobar únicamente `startsWith('/')` admite `//otro-dominio`; una decodificación extra de `%` puede lanzar una excepción.

Mejora: aceptar exclusivamente rutas internas normalizadas del origen, rechazar URLs de protocolo relativo y no volver a decodificar valores ya procesados por el framework. Renderizar errores amigables, no respuestas internas completas de la base o proveedor.

Cierre: pruebas con `//example.com`, barras invertidas, `%25`, codificación inválida y parámetros vacíos; nunca redirección externa inesperada ni pantalla rota.

### A08 — P1 · C/K · La sesión real en Netlify necesita una prueba de despliegue

Evidencia: [middleware.ts](apps/web/middleware.ts), [server.ts](apps/web/lib/supabase/server.ts) y la incidencia documentada de middleware no ejecutándose en Netlify. La protección adicional por página es valiosa, pero no demuestra por sí misma renovación de cookies ni cobertura de cada acción.

Mejora: comprobar en el despliegue vigente acceso sin sesión, sesión expirada, refresh, logout, usuario revocado y POST directo a acciones. Registrar la resolución actual de la incidencia y usar rutas servidor adecuadas para renovar cookies cuando sea necesario. No migraría de hosting sin medir primero el problema concreto.

Cierre: pruebas de humo autenticadas y no autenticadas después de cada despliegue; no afirmar que producción sigue expuesta solo porque hubo una incidencia anterior.

### A09 — P2 · C/M · Faltan límites de abuso y separación de credenciales

Evidencia: login/acciones de forzar análisis, cliente Meta único y configuración de entorno. Agregar límites de intentos, cuotas de trabajos costosos, tamaño de entrada y exclusión de recomputaciones repetidas. Evitar mensajes que faciliten enumerar usuarios cuando no aporten utilidad al equipo.

Separar token lector, token escritor y credencial de administración de Supabase; no distribuir un token personal de gestión a procesos que solo necesitan leer datos. La separación de tokens Meta ya estaba pendiente. Un System User tampoco elimina la necesidad de vigilar validez y permisos.

Cierre: web sin capacidad de escritura Meta salvo decisión explícita, worker escritor con alcance mínimo y un botón repetido que no dispare trabajo ilimitado.

## 7. Ingesta, calidad de datos y bitácora

### D01 — P1 · C · No existe un contrato de cobertura por cuenta, fecha y nivel

Evidencia: [insights.ts](packages/agents/src/insights.ts), [hourly.ts](packages/agents/src/hourly.ts) y [strategist.ts](packages/agents/src/strategist.ts). Tener alguna fila del último día cerrado no demuestra que hayan terminado todas las páginas, niveles y entidades esperadas. `closedRows > 0` puede habilitar la pasada con un subconjunto o con datos de una captura anterior.

Mejora: manifiesto de ingesta con intervalo solicitado, nivel, páginas, estado completo/parcial/fallido, API version, zona, hora de consulta y última reconciliación. Separar la presencia de una fila de la disponibilidad del conjunto de datos.

Cierre: fallar a mitad de campaña/adset/ad deja cobertura incompleta y bloquea las decisiones que dependan de esa información.

### D02 — P1 · C · Ausencia, cero y dato desconocido terminan confundidos

Evidencia: `loadRows` en [analyst.ts](packages/agents/src/analyst.ts) transforma compras/valor nulos en cero. Varias vistas hacen conversiones similares. Una fila omitida por la API, una campaña sin entrega y una ingesta fallida tienen significados distintos.

Mejora: modelar calidad/causa junto a la métrica. Solo materializar ceros cuando se confirmó una consulta completa y se conoce la semántica de ausencia del proveedor. Mantener “no disponible” para lo no observado.

Cierre: tres fixtures diferentes —cero real, campo ausente e ingesta fallida— producen mensajes y decisiones diferentes.

### D03 — P1 · C · El horizonte de datos no cubre de forma garantizada el horizonte analítico

Evidencia: [cli.ts](packages/agents/src/cli.ts) carga normalmente actividades de hasta 90 días, insights diarios de unos 14 días y horarios de 7; el analista busca sesiones de 30 días y datos previos de hasta 45 días. Un backfill manual histórico puede haber completado producción, pero el arranque desde cero no lo garantiza.

Mejora: calcular la fecha mínima requerida por sesiones/experimentos, sus baselines y ventanas. Preparar backfill verificable e incremental antes de habilitar veredictos históricos. Distinguir rango inicial de carga y rango recurrente de reexpresión.

Cierre: una instalación vacía identifica explícitamente qué ventanas no puede evaluar; no llama “campaña nueva” a una campaña cuya historia simplemente no cargó.

### D04 — P1 · C · Reexpresiones incompletas y posible conservación de filas obsoletas

Evidencia: [insights.ts](packages/agents/src/insights.ts) hace upsert de las filas recibidas, pero no reconcilia las que dejan de aparecer. El historial solo se dispara por gasto, compras o valor; `null` y cero se igualan. La búsqueda de versiones previas depende de `out[0].date`: si la primera fila es de hoy, puede excluir datos antiguos aunque también vengan en la respuesta.

Mejora: reconciliar una partición únicamente cuando la descarga esté completa, con el rango solicitado explícito, no inferido de la primera fila. Definir qué campos requieren historial, versionar la captura y evitar duplicar historial si el proceso se reintenta entre guardar la versión previa y el upsert.

Cierre: respuestas reordenadas, filas que desaparecen, `null → 0`, actualización tardía y fallo a mitad del guardado conservan un historial correcto.

### D05 — P1 · C/M · Falta fijar y mostrar el contrato de atribución

Evidencia: `act` selecciona tipos alternativos de compras y valor en [insights.ts](packages/agents/src/insights.ts), pero no guarda cuál eligió. Compras y valor podrían provenir de tipos diferentes. Los informes no conservan suficientemente la configuración de atribución con la que se compararon periodos.

Mejora: documentar fuente, acción elegida, moneda, fecha de reporte y configuración de atribución soportada por la versión de API utilizada. Comparar una muestra con Ads Manager usando el mismo contrato. Revisar la documentación vigente de Meta antes de añadir parámetros: no asumir que parámetros de tutoriales antiguos siguen teniendo efecto.

Cierre: se puede explicar una diferencia entre app y Ads Manager a partir de metadatos, no por intuición. Wetracked conectado no sustituye esta verificación ni convierte ventas atribuidas en beneficio neto.

### D06 — P1 · C · Watermark de eventos y recuperación del reagrupado están acoplados

Evidencia: [collector.ts](packages/agents/src/collector.ts). El watermark sigue la última actividad observada; una cuenta sin actividad puede volver a consultar un rango grande. El solape acotado tampoco garantiza recuperar eventos tardíos fuera de él. Si la ingesta se guarda y después falla el reagrupado, una pasada sin eventos nuevos puede no repetir el trabajo pendiente.

Mejora: checkpoints independientes para descarga exitosa, normalización, jerarquía, agrupación, métricas y evaluación. Mantener una marca durable de “reagrupado necesario” y reparación profunda periódica acotada.

Cierre: fallo después del upsert de eventos y antes del reagrupado se recupera en la siguiente corrida aunque Meta no devuelva eventos nuevos.

### D07 — P1 · R/C · La huella de eventos depende del orden textual del JSON

Evidencia: `fingerprintOf` en [normalize.ts](packages/core/src/normalize.ts). R14 produjo huellas distintas para `{"a":1,"b":2}` y `{"b":2,"a":1}` dentro de un evento semánticamente igual.

Mejora: identidad estable del proveedor cuando exista y serialización canónica de los campos pertinentes como respaldo. Versionar la normalización y conservar el evento original para replays, incluyendo metadatos relevantes de la aplicación que produjo el cambio cuando estén disponibles.

Cierre: variaciones irrelevantes de orden/espacios no duplican eventos; dos cambios realmente distintos sí se distinguen.

### D08 — P1 · C · Paginación sin orden total estable

Evidencia: [fetchAll](packages/db/src/index.ts) y usos que ordenan solo por fecha/hora o no ordenan. Paginar por rangos necesita un orden determinista; dos filas con la misma fecha o inserciones concurrentes pueden provocar repetidos u omisiones.

Mejora: ordenar por clave completa —por ejemplo fecha más ID— y usar paginación por cursor para colecciones en movimiento. Acotar cada extracción a un corte estable cuando su exactitud sea necesaria. No basta cambiar un `.select()` por `fetchAll()`.

Cierre: dataset con empates de timestamp y escrituras concurrentes devuelve cada fila una sola vez o declara un snapshot consistente.

### D09 — P1 · C · Reagrupar no es una operación atómica sobre todas sus referencias

Evidencia: [collector.ts](packages/agents/src/collector.ts), `regroup`, y [ids.ts](packages/core/src/ids.ts), `planRelink`. Se reubican algunas referencias, luego se actualizan/borran estructuras en varias operaciones. Experimentos, historial de veredictos y enlaces externos a sesiones también necesitan una estrategia cuando cambia un ID.

Mejora: planificar y validar todo el cambio antes de aplicarlo, ejecutar las modificaciones relacionales en transacción y conservar alias `old_id → new_id`. Si la correspondencia no es inequívoca, no borrar y emitir una incidencia recuperable.

Cierre: notas, experimentos, ventanas, historial y URLs antiguas sobreviven al reagrupado; un fallo intermedio no los deja apuntando a objetos inexistentes.

### D10 — P1 · R · Una anotación antigua puede perder su única ancla

Evidencia: `planRelink` en [ids.ts](packages/core/src/ids.ts). R15 usó una nota asociada solo a `group_id`, sin `session_id`, y un grupo obsoleto sin sucesor. El plan puso `group_id:null` sin devolver error. La protección de anotaciones huérfanas cubre otros casos, pero no este.

Mejora: invariante “toda anotación conserva al menos una referencia válida o una referencia archivada explícita”. Ampliar la validación a todos los formatos heredados.

Cierre: ese fixture bloquea el borrado con diagnóstico estructurado o preserva una entidad histórica consultable; nunca pierde silenciosamente el contexto humano.

### D11 — P1 · C · Las sesiones sintéticas del ejecutor no constituyen aún una traza íntegra

Evidencia: [executor.ts](packages/agents/src/executor.ts) crea sesiones con `group_count:1` y `event_count:1`, sin crear los grupos/eventos correspondientes. Para adset/ad no completa la campaña; en un movimiento reutiliza metadatos de origen. A su vez, el reagrupado preserva sesiones de actor agente y puede añadir otra representación del evento real.

Mejora: separar “pasada de observación” de “acción ejecutada”, ligar ejecución ↔ evento Meta ↔ grupo ↔ sesión, y reconciliar la observación posterior con la intención inicial. No inventar contadores ni duplicar la misma decisión en dos sesiones independientes.

Cierre: desde una propuesta ejecutada se llega a sus pasos, confirmaciones y evento observado; desde el evento se vuelve a esa misma propuesta.

### D12 — P2 · C · Snapshot diario sobrescrito y entidades desaparecidas sin ciclo de vida claro

Evidencia: [collector.ts](packages/agents/src/collector.ts). El snapshot diario se vuelve a guardar durante el día; no preserva cada observación. Entidades que dejan de aparecer pueden conservar estado activo antiguo. Los fallbacks de jerarquía deben consultar campos válidos por tipo.

Mejora: conservar una vista actual y observaciones históricas con `run_id/observed_at`; definir `last_seen_at`, ausencia confirmada y tombstones sin confundir “no llegó esta página” con eliminación. Guardar jerarquía y presupuesto efectivos al momento de decidir.

Cierre: una campaña eliminada no sigue contribuyendo indefinidamente al presupuesto activo; una descarga parcial no la marca eliminada por error.

### D13 — P2 · C · Moneda y zona horaria están parcialmente generalizadas

Evidencia: utilidades de [time.ts](packages/core/src/time.ts), formato web y perfil monetario. Hay moneda/horarios de Aromante mezclados con estructuras de múltiples cuentas. Un cambio de timezone o moneda requiere revisar datos derivados, no solo actualizar `accounts`.

Mejora: declarar soporte actual MXN y zonas concretas; bloquear cuentas incompatibles o llevar moneda/zona explícitas de extremo a extremo. Mantener IDs de Meta como cadenas para evitar pérdida de precisión numérica. Versionar recálculos si cambia la interpretación temporal.

Cierre: una cuenta no MXN no se muestra ni se ejecuta como si sus unidades fueran pesos mexicanos; fechas de negocio y timestamps no se confunden.

### D14 — P2 · C/M · Faltan contratos de entrada, cuarentena y reconciliación de integridad

Evidencia: respuestas de Meta y JSON de DB se convierten con tipos/assertions, sin validación runtime uniforme. Un campo nuevo, nulo o malformado puede pasar como cero o romper una cuenta completa.

Mejora: validar respuestas en los límites, aislar eventos no interpretables conservando raw y motivo, medir tasa de desconocidos y ofrecer un comando de reparación con previsualización. Añadir comprobaciones de entidades sin jerarquía, sesiones sin grupos, filas sin cuenta y divergencias de totales por nivel cuando los filtros sean comparables.

Cierre: un evento inesperado no desaparece ni detiene toda la ingesta; queda visible para corregir y reprocesar.

## 8. Evaluaciones y narrativa

### E01 — P1 · R · Madurez temporal presentada como evidencia completa

Evidencia: `evaluateChange` en [evaluation.ts](packages/core/src/evaluation.ts), alrededor del cálculo de `closedAfterDays` y `status`. La madurez depende de fechas. R07 recibió siete días previos y solo un día posterior, pero devolvió `mature`, `confidence:high` y `closed_days:7`, aunque `treatment.after.days` era 1.

Mejora: separar días transcurridos, días ingeridos completamente, cobertura por entidad y latencia de atribución. Un conteo global de fechas tampoco basta si una de varias campañas carece de datos. Exigir el manifiesto D01 y reglas explícitas para ceros confirmados.

Cierre: 1/7 días observados jamás aparece como 7/7 comprobados ni habilita confianza alta o graduación.

### E02 — P1 · C/K · “Confianza” es una heurística que necesita límites y calibración

Evidencia: `evaluateChange` suma compras de antes y después. Muchas compras previas pueden sostener confianza alta con muy pocas posteriores. `agreement:none` no fuerza por sí mismo confianza insuficiente; algunos comentarios sobre control pequeño ya no reflejan los topes implementados.

Mejora: mínimos por periodo y referencia, cobertura, tamaño relativo del control y coherencia entre estado/lectura/confianza. Llamar al nivel “solidez de evidencia” si no representa probabilidad estadística. Calibrar con casos revisados por Eduardo y un conjunto de validación separado.

Cierre: tabla de decisiones publicada y pruebas para cada combinación; no vender “alta” como un 95% de certeza ni escoger umbrales solo porque tres ejemplos salen bien.

### E03 — P1 · C · Causas de referencia ausente pueden explicar algo que no ocurrió

Evidencia: `firstDate` se interpreta como nacimiento de la campaña; una historia no descargada puede producir “campaña nueva”. El texto de `single` dice “se tocó toda la cuenta” también cuando falta control por volumen o gasto, no necesariamente porque todas las campañas se tocaran.

Mejora: usar fecha de creación/observación y manifiesto de cobertura, conservar causas diferenciadas y construir el veredicto desde `missing_refs`. No deducir una causa de negocio únicamente de ausencia de datos.

Cierre: campaña antigua sin backfill, control con pocas compras y cambio sobre toda la cuenta producen explicaciones distintas y verificables.

### E04 — P1 · C/M · Intervenciones solapadas y controles cambiantes no están suficientemente identificados

Evidencia: evaluación por sesiones mayores y `campaign_ids`. Cambios sucesivos sobre la misma campaña pueden compartir buena parte del “después”; cada sesión recibe una lectura del mismo resultado. El resto de la cuenta puede sufrir cambios humanos, de composición o de presupuesto durante la ventana.

Mejora: marcar contaminación por intervenciones posteriores y cambios relevantes en controles; conservar composición por periodo. Mostrar análisis agregado de la secuencia cuando separar efectos no sea defendible. Un cambio CBO redistribuye dentro de su campaña; no afirmar que todo cambio de presupuesto de campaña necesariamente redistribuye el gasto de las otras campañas.

Cierre: dos cambios cercanos no se presentan como dos confirmaciones independientes de éxito; las limitaciones aparecen antes del veredicto.

### E05 — P2 · C · Comparar periodos de distinta duración distorsiona gasto y estabilidad

Evidencia: antes usa N días y después puede usar solo K días en estado preliminar. Comparar sus sumas produce caída aparente de gasto aunque el gasto diario sea idéntico; puede disparar salvedad de control inestable. Las ventanas “72h” representan tres días completos excluyendo el día del cambio, no 72 horas exactas transcurridas.

Mejora: mostrar duración/cobertura y usar medias diarias o intervalos equivalentes para variables de volumen. Aclarar la semántica de tres días cerrados. Evaluar sesgo por días de semana y promociones al interpretar 3/7/14 días.

Cierre: gasto constante con una ventana parcial no se etiqueta como desplome ni como cambio de control solo por duración desigual.

### E06 — P1 · R · Construir un reporte histórico retrocede las evaluaciones actuales

Evidencia: `buildWeekly` llama `evaluateSessions`, que escribe `evaluation_windows` con `today = periodEnd + 1`. R17 primero guardó una evaluación madura al 9 de septiembre; guardar el reporte al 3 de septiembre la volvió preliminar. Completar narrativas pendientes también entra por esa ruta.

Mejora: cálculo puro para reportes “a fecha de” y persistencia separada de las evaluaciones actuales. Si se guardan snapshots históricos, su clave debe incluir corte/versión; no deben sobrescribir el último estado.

Cierre: generar cualquier reporte del pasado deja intacta la evaluación actual y su historial de maduración.

### E07 — P1 · R · Se actualiza evidencia y se conserva texto generado con evidencia anterior

Evidencia: `saveWeekly` mantiene `existing.narrative`, pero reconstruye y reemplaza `evidence`. R18 conservó una narrativa vieja después de cambiar sus datos. Las referencias `[S1]`/`[C1]` también pueden apuntar a filas diferentes tras reordenar.

Mejora: hash del paquete de evidencia, versión de prompt/modelo y vínculo inmutable de la narrativa a ese paquete. Si cambian datos, generar una nueva versión o invalidar el texto anterior; nunca mezclar silenciosamente ambos.

Cierre: toda cifra y referencia visible puede rastrearse al snapshot exacto con el que fue redactada.

### E08 — P1 · C · El analista excluye las acciones del propio agente

Evidencia: [analyst.ts](packages/agents/src/analyst.ts) filtra `actor_kind = person` tanto en evaluación habitual como semanal. Era coherente para analizar compradores, pero deja sin evaluación posterior a las acciones autónomas y semiaprobadas.

Mejora: incluir acciones confirmadas del agente con identidad y campañas correctas, manteniendo separado “quién propuso”, “quién aprobó” y “quién ejecutó”. Usar esos resultados para la salud de la regla, no solo para la bitácora.

Cierre: una acción real confirmada recorre 3/7/14 días y contribuye al historial de la versión de regla que la produjo.

### E09 — P1 · R/C · Zonas y corte semanal mezclan CDMX, cuenta y UTC

Evidencia: `runAnalyst` decide si es lunes en CDMX, pero calcula cierre con la fecha de la cuenta; `buildWeekly` filtra sesiones con `-06:00`; las ventanas se guardan con `Z` pese a ser días de la cuenta. R19 verificó que el lunes 7 de septiembre a las 06:17 UTC todavía es domingo en Mazatlán: esa primera pasada nominal puede cerrar sábado, y otra del mismo lunes cerrar domingo.

Mejora: una función única que determine periodo de negocio por cuenta. Guardar límites como fechas de negocio o instantes correctamente convertidos, sin añadir `Z` a una fecha local por conveniencia.

Cierre: pruebas alrededor de medianoche/domingo/lunes en CDMX y Mazatlán; una semana corresponde a un único periodo esperado.

### E10 — P2 · C · El reporte semanal no organiza el aprendizaje por maduración

Evidencia: `buildWeekly` recoge principalmente sesiones ocurridas en la semana reportada. Muchas todavía no completaron 7/14 días, mientras decisiones de semanas anteriores maduran ahora y no entran en ese conjunto. El historial de cambios de veredicto se guarda, pero no organiza la lectura principal.

Mejora: separar “cambios realizados”, “evaluaciones que maduraron”, “conclusiones que cambiaron por nuevos datos” y “pendientes de revisión”. No confundir actividad semanal con aprendizaje semanal.

Cierre: el reporte de esta semana incluye un cambio de hace dos semanas cuyo horizonte acaba de completar, con enlace al veredicto anterior.

### E11 — P2 · C/M · La exigencia de citas a la narrativa solo vive en el prompt

Evidencia: [narrative.ts](packages/agents/src/narrative.ts) y presentación de análisis. Pedir `[T]`/`[S#]` ayuda, pero no valida referencias, números o conclusiones. Nombres de campañas/anotaciones son entradas no confiables que podrían intentar dar instrucciones al modelo.

Mejora: salida estructurada con IDs de evidencia válidos, validación de referencias y comprobaciones de cifras; marcar narrativa como no disponible si falla. Tratar nombres/comentarios como datos, limitar su longitud y probar entradas maliciosas. Mantener al LLM sin credenciales ni capacidad de decidir candados.

Cierre: referencia inexistente, cifra inventada o instrucción incrustada en el nombre de una campaña no se publica como análisis validado. El resumen determinista sigue disponible.

### E12 — P2 · C · Recalcular y guardar historial no es una unidad atómica

Evidencia: `evaluateSessions` guarda ventanas y después inserta cambios de veredicto. Si falla la segunda parte, el siguiente recálculo puede no recuperar el cambio perdido porque la ventana ya contiene el nuevo resultado. Dos analistas simultáneos también pueden registrar transiciones duplicadas.

Mejora: transacción o función DB para snapshot + transición, control de versión y clave de deduplicación; almacenar fuente, corte, normalizador, evaluador y versión de criterios. Distinguir revisión de cifras, cambio de lectura y primera maduración.

Cierre: fallo entre ambas escrituras no pierde el historial y reejecutar con los mismos datos no lo duplica.

### E13 — P2 · C/M · Evitar convertir dos referencias correlacionadas en demostración causal

Evidencia: `diff_roas_pts` compara variaciones porcentuales y la segunda referencia comparte datos con la primera; a siete días comparten incluso parte esencial del baseline. No son dos experimentos independientes. El lenguaje “coincidió” ya es acertado y conviene conservarlo.

Mejora: explicar exactamente la métrica, unidad y limitaciones; no confundir puntos de variación de ROAS con puntos de ROAS absoluto o efecto causal. Añadir replay y calibración con promociones, stock, cambios de precio y otros factores anotados. Métodos causales más complejos solo cuando el diseño y los datos los justifiquen.

Cierre: el lector entiende qué se observó, qué comparación se hizo y qué no puede concluirse. Un “alto” no autoriza automáticamente una acción financiera.

## 9. Experimentos

### X01 — P1 · R · Se puede proponer graduación sin completar la evidencia

Evidencia: `evaluateExperiment` en [experiments.ts](packages/core/src/experiments.ts). R08 propuso `graduar` con una ventana declarada de siete días y una sola fecha posterior observada. Hereda E01 y solo exige compras/umbral sobre el subconjunto disponible.

Mejora: madurez temporal + cobertura validada + criterio de muestra + datos estabilizados según política. Separar “cumple provisionalmente” de “listo para decidir”.

Cierre: un experimento con seis días faltantes queda pendiente de datos aunque el ROAS del día restante supere el objetivo.

### X02 — P1 · C · Las transiciones se permiten fuera del estado esperado

Evidencia: [experimentos/actions.ts](apps/web/app/experimentos/actions.ts). Activar, cancelar y decidir no usan una transición condicional completa; decidir no exige que esté `evaluando` con evaluación vigente. Un POST directo puede saltarse las condiciones sugeridas por la interfaz.

Mejora: máquina de estados servidor, roles, motivo obligatorio para excepciones, versión de evaluación aprobada y `UPDATE ... WHERE status = esperado`. Hacer una nueva revisión explícita para reabrir un experimento terminado.

Cierre: no se gradúa un borrador ni se reactiva silenciosamente uno cancelado; dos decisiones concurrentes no sobrescriben la primera.

### X03 — P1 · C/M · “Convertir en experimento” puede registrar una hipótesis después de ver resultados

Evidencia: creación desde una sesión previa, fecha de inicio libre y validación que solo comprueba que exista fecha. Eso sirve para análisis retrospectivo, pero no demuestra el criterio declarado antes que forma parte de tu propósito original.

Mejora: distinguir experimento predeclarado de análisis retrospectivo. Registrar `registered_at`, `activated_at`, criterio y baseline inmutables, y cambios mediante enmiendas fechadas. Validar fechas reales y no etiquetar retroactivamente como predeclarado un cambio ya observado.

Cierre: una revisión histórica conserva su utilidad, pero la UI y los informes la identifican como retrospectiva.

### X04 — P2 · C · Los borradores incompletos no tienen un ciclo de edición completo

Evidencia: `saveExperiment` inserta un experimento nuevo; la UI permite guardar borrador, pero no ofrece un flujo equivalente para editar/completar el existente. El evaluador propone extender la ventana en casos sin evidencia, sin operación de extensión claramente implementada.

Mejora: editar borradores por ID, validación progresiva, vista previa del criterio y extensión mediante enmienda con motivo que preserve la versión inicial. Añadir cancelación con explicación útil.

Cierre: guardar incompleto → volver otro día → completar → activar funciona sin duplicar el experimento ni perder su sesión de origen.

### X05 — P1 · C · Presupuesto de exploración sin reserva atómica ni seguimiento de gasto real

Evidencia: `budgetCheck` consulta sumas y después se escribe por separado. Dos activaciones pueden pasar con la misma capacidad. El presupuesto declarado no demuestra gasto real, duración ni que las campañas asociadas pertenezcan a la cuenta correcta.

Mejora: reserva transaccional por cuenta, presupuesto diario y total claramente diferenciados, límites por campaña y seguimiento de consumo. No permitir experimentos simultáneos incompatibles sobre la misma campaña. El estratega debe respetar campañas bajo experimento o registrar que las contaminó.

Cierre: activaciones concurrentes no exceden capacidad; una regla no modifica inadvertidamente la variable que se está probando.

### X06 — P2 · C · Criterio CPA y carga de baseline no son completamente coherentes

Evidencia: `evaluateExperiment` decide revisar por `window.agreement`, calculado con ROAS, incluso si la métrica objetivo es CPA. `evaluateExperiments` carga solo unos ocho días previos al inicio más antiguo, aunque `window_days` admite horizontes mayores que requieren más periodo anterior.

Mejora: referencias y salvedades específicas de la métrica objetivo; rango de datos derivado del máximo horizonte necesario. Validar enteros finitos y límites razonables para ventana y compras mínimas.

Cierre: experimento CPA no se bloquea o valida por una lectura ROAS no declarada; un experimento de 30 días dispone de su baseline o declara que falta.

### X07 — P2 · C/M · Graduación, causalidad y aprendizaje necesitan semántica explícita

Evidencia: graduar actualiza estado, no transfiere presupuesto automáticamente. No hay asignación aleatoria ni holdout formal; por tanto es un registro de intervención con criterio, no necesariamente un A/B test causal. Las evaluaciones se sobrescriben y falta una biblioteca estructurada de aprendizajes.

Mejora: explicar “graduado por decisión humana” separado de “presupuesto principal actualizado”; si requiere acción, crear una propuesta bajo las mismas garantías del ejecutor. Guardar hipótesis, variable cambiada, resultados, limitaciones y aprendizaje reutilizable, incluyendo descartes.

Cierre: el equipo puede contestar qué probó, qué aprendió y qué acción ocurrió, sin confundir un cambio de estado con una escritura en Meta.

## 10. Operación, cron y notificaciones

### O01 — P1 · C · El proceso puede reportar éxito global con cuentas fallidas

Evidencia: `runCollector` y `runAnalyst` capturan errores por cuenta, los guardan/loguean y continúan, sin propagar necesariamente un código de salida no cero. Continuar con otras cuentas es correcto; terminar verde sin una señal global diferenciada no lo es. Fallar al insertar `agent_runs` también puede provocar otro error al acceder a `run!.id`.

Mejora: resultado estructurado por etapa/cuenta, estado global `ok/degraded/failed`, código de salida acorde y registro seguro incluso cuando falla la DB. No usar únicamente el estado del workflow como disponibilidad funcional.

Cierre: una cuenta falla, las otras continúan, y GitHub/Estado muestran claramente la degradación con el paso fallido.

### O02 — P1 · V/C · Cuatro horarios configurados no equivalen a vigilancia puntual

Evidencia: cron y retrasos observados en las corridas remotas. GitHub advierte que los eventos programados pueden retrasarse y, bajo carga, descartarse; en repositorios públicos también contempla desactivación por inactividad. Véase [documentación de eventos programados](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

Mejora: definir tolerancia máxima de antigüedad y vigilarla desde un observador externo al propio collector. Mostrar slot esperado, hora real, duración y retraso por cuenta. Si el riesgo de gasto exige intervalos fiables, elegir un scheduler adecuado con recuperación de slots; no asumir que mover el minuto a 17 resuelve la garantía.

Cierre: faltar una corrida genera aviso aunque el collector nunca arranque; datos vencidos bloquean escritura. La elección de hosting del worker viene después de fijar ese requisito.

### O03 — P1 · R · Telegram no reintenta mensajes fallidos o atascados

Evidencia: [telegram.ts](packages/agents/src/telegram.ts) considera hecha toda clave que exista en `notifications`, sin filtrar `status`. R13 dejó una fila `failed` y la siguiente pasada la omitió. Un proceso muerto con `sending` también queda sin recuperación.

Mejora: outbox con intentos, `next_retry_at`, lease, último error y dead-letter/aviso de fallo permanente. La clave única evita duplicados de intención, pero no debe impedir reintentar. Documentar entrega al menos una vez: si se pierde la respuesta de Telegram, puede haber ambigüedad y no existe magia de “exactamente una vez”.

Cierre: fallo temporal y crash tras reservar mensaje vuelven a intentarse; éxito confirmado no se reenvía normalmente.

### O04 — P1 · C/K · Los avisos llegan tarde en el pipeline y hay eventos sin canal efectivo

Evidencia: los avisos se procesan al final del collector y antes del analista del workflow. Un fallo anterior o una cuenta lenta retrasa alertas; el resumen puede consultar ventanas del análisis anterior. `experiment_ready` es informativo y no entra como alerta crítica en `notifyPending`. Las alertas antiguas quedan fuera del rango de tres días.

Mejora: despachador independiente y posterior a los productores, prioridades para críticos, backlog durable y enlaces al estado actual. Añadir recordatorios y reconocimiento humano donde corresponda. Verificar el freno activo persistente, no deducirlo solo de los motivos generados en la pasada actual.

Cierre: freno crítico se intenta notificar sin esperar al análisis de todas las cuentas; un experimento listo llega al responsable y puede abrirse desde el aviso.

### O05 — P2 · C/V · Faltan particionado y política de límites en Telegram

Evidencia: [sendTelegram](packages/agents/src/telegram.ts) manda un texto único. Telegram documenta un límite de 4096 caracteres para `sendMessage`, después del procesamiento de entidades: [Bot API](https://core.telegram.org/bots/api#sendmessage).

Mejora: dividir mensajes respetando HTML/entidades, gestionar 429 y tiempos de reintento, limitar volumen y agrupar ruido. Conservar el escape HTML que ya existe. Minimizar datos comerciales en grupos/chats y comprobar destino autorizado al configurar el bot.

Cierre: reporte largo, caracteres especiales, respuesta 429 y chat inválido producen resultados recuperables, no silencio definitivo.

### O06 — P1 · R/C · “Primera semana en solitario” no mide continuidad real

Evidencia: [week-report.ts](packages/agents/src/week-report.ts) calcula cobertura con la primera corrida programada de los últimos siete días. R16 demostró que una única corrida de hace 6.95 días basta para considerar listo el reporte, sin exigir slots ni éxito de todas las cuentas. Además, una ventana móvil con umbral 6.9 puede no coincidir con el espaciado real de corridas y retrasar indefinidamente su elegibilidad.

Mejora: definir inicio de observación durable, slots esperados/completados por cuenta, gaps, fallos y exclusiones justificadas. Una ejecución manual de diagnóstico no debería reiniciar todo por accidente si la política permite reparación: decidirlo explícitamente.

Cierre: una semana con un solo éxito no certifica autonomía; una semana completa con retrasos tolerados sí tiene una evaluación reproducible.

### O07 — P2 · C · El reporte “una sola vez” puede repetirse, y `--force` no es solo vista previa

Evidencia: `weekReport` deduplica por fechas dentro de los últimos siete días, no por un hito único. La actualización `.like(key, prefijo%)` puede afectar varios intentos manuales. `--force` **envía** si hay Telegram configurado, aunque la documentación lo llama previsualización.

Mejora: separar `--preview` sin red de `--send/--force-send`; clave única del hito y actualización por ID exacto. El texto “aprobadas” debe considerar decisiones históricas aunque después fallen, y “ventanas maduras” no confundir primera inserción madura con una transición observada.

Cierre: preview nunca envía; una primera semana se notifica una vez con reintentos seguros; estados fallidos no desaparecen de los totales.

### O08 — P1 · C · Un fallo de insights puede dejar operar con datos anteriores

Evidencia: `runCollector` trata ciertos fallos de ingesta como advertencia y sigue con vigilancia/estratega/ejecuciones. El estado de éxito del collector no expresa necesariamente éxito de todos los datos necesarios. La secuencia también acopla reagrupado de bitácora con tareas de seguridad que podrían necesitar ejecutarse aunque aquel falle.

Mejora: grafo de dependencias explícito: observación crítica de estado puede continuar, propuestas y escrituras requieren sus datasets completos y recientes. Aislar cuentas/etapas, sin ocultar fallos ni dejar que un fallo narrativo detenga un aviso crítico.

Cierre: insights fallidos con filas viejas en DB permiten lectura etiquetada como obsoleta, pero cero nuevas acciones que dependan de esos datos.

### O09 — P2 · C · Reintentos y límites del cliente Meta necesitan una política completa

Evidencia: [MetaClient](packages/meta/src/index.ts) tiene timeout/reintentos, pero no una estrategia suficiente para todos los 5xx/errores transitorios, jitter, `Retry-After`, cabeceras de uso o presupuesto total del trabajo. La paginación acumula resultados en memoria sin un límite operativo claro ni protección frente a ciclos.

Mejora: clasificar errores permanentes/transitorios, presupuesto de tiempo por cuenta, paginación por lotes, límites de páginas y validación del host de la siguiente URL. Las escrituras con resultado desconocido requieren reconciliación, no el mismo retry genérico de GET.

Cierre: rate limit sostenido no agota a ciegas los 30 minutos del job; una cuenta problemática no consume toda la ventana de las demás.

### O10 — P2 · C/M · Faltan métricas y procedimientos para operar sin estar mirando logs

Evidencia: `agent_runs`, alertas y `/estado` son un inicio, pero no forman aún una vista completa de frescura por dataset, cola atascada, duraciones por fase o recuperación. El aviso de token no reemplaza un monitor independiente de expiración/acceso.

Mejora: panel con última ingesta completa, cobertura, retraso, intentos pendientes, estados desconocidos y versión desplegada. Runbooks concretos para token inválido, cuota DB, reagrupado huérfano, Meta parcial, rollback incompleto y credencial comprometida. Cada alarma necesita responsable y acción.

Cierre: otra persona del equipo puede identificar la causa y aplicar un procedimiento seguro sin leer el código ni pedir al autor original que reconstruya la sesión.

### O11 — P2 · C/M · Respaldos, recuperación y retención no están demostrados

Evidencia: migraciones y datos históricos abundantes, sin prueba reproducible de restauración en el repo. No consulté el plan, backups ni tamaño reales de Supabase, así que no afirmo que no existan.

Mejora: definir RPO/RTO razonables, verificar backups disponibles, restaurar a un entorno separado y comprobar notas, reglas, aprobaciones e historial. Política de retención para raw, snapshots, insights y logs; medir tamaño antes de elegir particiones o ampliar plan.

Cierre: restauración ensayada con resultado y fecha; no depender solo de “Supabase se encarga”.

### O12 — P2 · C/K · La configuración de despliegue no es aún una receta única y validada

Evidencia: `.env.example`, scripts y documentación mencionan variables adicionales de negocios que el cliente actual no selecciona; faltan variables nuevas como Telegram en la plantilla. Se documenta un symlink de `.env.local` que no existe en un clon limpio. `loadDotenv` es un parser casero con semántica limitada.

Mejora: contrato de entorno por proceso, validación al arrancar y `.env.example` sin secretos que enumere obligatorias/opcionales y capacidades activadas. No buscar archivos de entorno de otros proyectos por accidente. Mantener tokens de administración fuera del runtime habitual y procedimiento portable para Windows/macOS/Linux.

Cierre: un nuevo clon arranca siguiendo una sola guía, sin adivinar variables, crear symlinks implícitos ni copiar credenciales del historial de conversación.

## 11. Interfaz, experiencia de uso y claridad operativa

### U01 — P2 · C · Los presets del selector de fechas no actualizan su valor controlado

Evidencia: [DateRange.tsx](apps/web/components/DateRange.tsx), `select` con `value={custom ? 'custom' : String(days)}`; `onChange` solo cambia `custom`. Elegir otro número no actualiza el valor numérico que controla React. El contrato está explicado en la [documentación oficial de select](https://react.dev/reference/react-dom/components/select).

Mejora: estado controlado para el preset elegido o select no controlado coherente con el formulario GET; sincronizar cambios de props/navegación. No afirmo haberlo reproducido en un navegador conectado: esta conclusión procede del código.

Cierre: seleccionar 7 → 30 → Filtrar manda `days=30`; alternar personalizado/preset y usar atrás/adelante conserva lo elegido.

### U02 — P1 · C · Rangos y páginas admiten valores no acotados

Evidencia: [range.ts](apps/web/lib/range.ts) valida fechas solo por forma y permite `days` enorme/no finito. `listDays` puede generar rangos excesivos o lanzar al recibir una fecha inválida. Los parámetros de página/métrica tampoco tienen un esquema único.

Mejora: fechas calendario válidas, enteros finitos, intervalo máximo, orden y recorte de futuros definido. Validar en servidor antes de consultas/arrays. Una herramienta interna también debe protegerse de errores accidentales al editar una URL.

Cierre: `days=Infinity`, valores negativos/fraccionarios, `2026-99-99`, rango de siglos y página fuera de límites no provocan consultas gigantes ni pantalla de error inesperada.

### U03 — P1 · C · Todavía hay consultas truncables pese a la auditoría de paginación anterior

Evidencia: [Hoy](apps/web/app/hoy/page.tsx) y [Cuenta](apps/web/app/cuenta/page.tsx) consultan insights por campaña sin paginar; [Análisis](apps/web/app/analisis/page.tsx) consulta ventanas con `.in(ids)` sin paginar; [Bitácora](apps/web/app/bitacora/page.tsx) tiene límite 800 y listado de actores sin paginación. Por ejemplo, 100 campañas × 21 fechas supera 1,000 filas. No afirmo que hoy todas esas vistas estén truncadas: depende de volumen y configuración real.

Mejora: paginar o agregar en SQL, obtener conteos exactos y avisar de límites. Paginar también listas de IDs enviadas en filtros grandes. No mostrar el resto de días como “sin cambios” si simplemente quedaron fuera del límite.

Cierre: fixtures con más de 1,000 filas y más de 800 sesiones muestran totales y filtros completos o un recorte explícito, nunca silencioso.

### U04 — P1 · C · Error, vacío y “todo en orden” se mezclan en varias pantallas

Evidencia: numerosas lecturas extraen `data` e ignoran `error`. Colecciones vacías por fallo pueden mostrar cero gasto, todo revisado, sin cambios o ausencia de alertas. No hay estados de error/carga consistentes por segmento.

Mejora: modelo de carga con éxito vacío, éxito con datos, incompleto, obsoleto y error; banner de frescura por cuenta y tarjetas no disponibles cuando no hay evidencia. En Bitácora, “sin coincidencias con estos filtros” no es lo mismo que “no hubo cambios”.

Cierre: cortar la DB muestra problema de conexión; no presenta una cuenta en calma ni ceros como si fueran métricas válidas.

### U05 — P2 · C · Cambiar de sección pierde el contexto de cuenta y periodo

Evidencia: [Nav.tsx](apps/web/components/Nav.tsx) enlaza a rutas sin query; varias páginas vuelven al ID de cuenta predeterminado. En una herramienta de varias cuentas, esto facilita revisar o configurar la cuenta equivocada.

Mejora: contexto persistente de cuenta, preservación deliberada del periodo y encabezado inequívoco en acciones de riesgo. Backlinks al origen en detalle. Ocultar navegación administrativa según permisos y usar layout distinto para login; eso mejora claridad, pero no reemplaza A01/A02.

Cierre: navegar Hoy → Cuenta → Anuncios → Configuración mantiene la cuenta elegida; una acción muestra siempre su cuenta real.

### U06 — P1 · C · “Últimos siete días” puede significar últimas siete fechas con filas

Evidencia: Hoy/Cuenta usan `closed.slice(-7)` y `slice(-14,-7)`. Si faltan fechas, no comparan necesariamente semanas calendario equivalentes. Anuncios agrega el día actual sin transportar al resultado la condición de cierre/frescura con la misma claridad.

Mejora: rangos calendario explícitos y distintivo de día parcial/cobertura. El usuario puede preferir una UI sin jerga de “días cerrados”, pero esa información no debe desaparecer: “hasta ayer, actualizado a…” funciona mejor.

Cierre: faltan dos fechas y la tarjeta dice cobertura incompleta en vez de extender silenciosamente la semana o comparar periodos desiguales.

### U07 — P0 · C · Textos de aprobación y freno pueden inducir una decisión equivocada

Evidencia: Hoy muestra después de aprobar “nadie escribe en Meta hasta la Fase 4b”, pero la acción ya llama al ejecutor, capaz de escribir si `dry_run=false`. Configuración describe garantías de gasto más fuertes que los candados implementados; “Frenar cuenta” puede interpretarse como pausar campañas.

Mejora: etiquetas desde el estado real: “Simulación: no envía”, “Aprobación para ejecución real”, “Bloquear nuevas acciones del agente”. Confirmación antes de dinero real, efecto presupuestario completo, estado en vuelo y resultado confirmado/desconocido. Botones pendientes deshabilitados como ayuda UX, además de idempotencia servidor.

Cierre: una persona entiende antes de pulsar si habrá POST, sobre qué cuenta, por cuánto y qué seguirá gastando si activa el freno.

### U08 — P2 · C · Falta una vista completa de propuestas, ejecuciones y cambios de veredicto

Evidencia: Hoy enseña cinco decisiones recientes y una cola pendiente; no existe un explorador completo de descartadas, expiradas, pasos, relecturas, compensaciones y causas. `verdict_changes` se registra sin una vista equivalente de seguimiento.

Mejora: historial filtrable por cuenta/entidad/regla/persona/estado, detalle de ejecución y comparación entre propuesto, corregido, enviado y observado. Exportación acotada para revisión operativa, sin secretos. Un enlace desde alerta debe abrir el incidente concreto.

Cierre: investigar una orden de hace un mes no requiere acceso a Supabase ni reconstruir logs.

### U09 — P2 · C · Reportes sin navegación histórica ni referencias navegables

Evidencia: Análisis carga seis reportes pero muestra solo `reports[0]`. La narrativa Markdown se imprime como texto con saltos; `[T]`/`[S1]` no forman un recorrido claro a la evidencia. El detalle de sesión no reúne las ventanas antes/después completas con la decisión.

Mejora: selector de periodos/versiones, renderizado Markdown seguro o salida estructurada, referencias clicables a métricas/sesión y explicación local de términos. Mantener escape/sanitización: no introducir HTML arbitrario del modelo.

Cierre: el comprador abre un reporte anterior, sigue una cifra a su fuente y ve la evaluación desde la sesión sin cambiar de herramienta.

### U10 — P2 · C · Pequeños controles prometen algo distinto de lo que hacen

Evidencia: [SessionRow.tsx](apps/web/components/SessionRow.tsx) espera `annotation_count`, pero las consultas no calculan ese contador. [Filters.tsx](apps/web/components/Filters.tsx) implementa “limpiar” eliminando solo `sig`, preservando otros filtros. El catálogo de actores puede truncarse y no incluir al Estratega.

Mejora: contador real de notas o relación agregada, acción de limpiar con semántica clara y catálogo completo de responsables. Probar cada indicador con datos que activen y desactiven su estado.

Cierre: anotar una razón hace visible el distintivo; limpiar elimina exactamente lo prometido; el agente aparece como filtro cuando tiene sesiones.

### U11 — P2 · C/M · Las gráficas necesitan representar huecos y ofrecer interacción precisa

Evidencia: [TimeSeries.tsx](apps/web/components/TimeSeries.tsx) usa `onMouseMove` sobre un grupo SVG y escala su bounding box como si fuera todo el viewBox. Los puntos se espacian por índice, lo que oculta fechas faltantes; los tooltips dependen del ratón y pueden quedar recortados por tarjetas con overflow. Revisar también la marca del primer punto abierto y la correspondencia de colores con la leyenda.

Mejora: coordenadas transformadas del SVG, escala temporal real, huecos visibles, soporte de pointer/teclado y tabla equivalente. Colorear gasto según contexto, no suponer que bajar gasto siempre es bueno. Una sola referencia no debería parecer visualmente “dos lecturas coinciden”.

Cierre: hover/touch muestra la fecha correcta en distintos tamaños; faltar un día no dibuja continuidad ficticia.

### U12 — P2 · C/K/M · Accesibilidad y móvil necesitan verificación real

Evidencia: hay buenas bases (`lang=es`, navegación etiquetada, foco y controles nativos), pero también texto de 9–11 px, inputs cuyo único nombre es placeholder, tablas densas y tooltips `title`. El móvil sigue pendiente en los documentos y no había navegador conectado para comprobarlo aquí.

Mejora: probar teclado, lector de pantalla, contraste, zoom 200%, reducción de movimiento, objetivos táctiles y teléfono real. Etiquetas persistentes y errores asociados al campo. Tablas con scroll identificado o vista compacta según tarea; estados de carga/error anunciados.

Cierre: aprobar/rechazar, filtrar, leer una cifra y registrar una nota son realizables sin ratón y sin zoom manual constante en móvil. No declaro incumplimiento normativo medido: es trabajo de QA pendiente.

### U13 — P2 · C/M · “Revisado” es demasiado pobre para cerrar el trabajo sobre un anuncio

Evidencia: [Anuncios](apps/web/app/anuncios/page.tsx) registra que alguien lo vio en siete días, con nota opcional. Eso no distingue revisión creativa, problema detectado, tarea pendiente o conclusión. El rendimiento agregado puede excluir entidades no disponibles en el inventario actual y filtros de activos pueden sesgar una revisión histórica.

Mejora: detalle de creativo/versiones, enlaces a Meta, historial de revisiones, categorías de problema/aprendizaje y fecha de próxima revisión. Mostrar mínimo de muestra para rankings y aclarar si se revisan solo activos actuales o el conjunto histórico.

Cierre: “todo revisado” no implica “sin problemas”; un anuncio pausado que gastó en el periodo sigue siendo explicable en el análisis correspondiente.

### U14 — P1 · C · El mapa horario no recorta correctamente el rango convertido

Evidencia: [Horarios](apps/web/app/horarios/page.tsx) consulta `range.from/to` como fechas de la cuenta y después desplaza a CDMX. Para Mazatlán → CDMX se necesita incluir parte del día anterior de origen y recortar después de convertir; actualmente puede faltar la primera hora y entrar una hora fuera del final solicitado.

Mejora: transformar primero los límites del rango objetivo a origen, consultar con el margen necesario y filtrar cada celda convertida contra el rango solicitado. Mostrar días efectivos por celda, no solo compras acumuladas. Con pocos bloques, evitar que el mismo aparezca simultáneamente entre mejores y peores.

Cierre: una fixture horaria con valores únicos por hora conserva el total exacto dentro del rango CDMX, especialmente en sus dos extremos.

### U15 — P2 · C · Guardar configuración puede perder selecciones o cambios concurrentes

Evidencia: Configuración genera whitelist a partir de las opciones actualmente visibles/activas y `saveProfile` reemplaza la lista completa. Una campaña previamente autorizada pero no visible puede desaparecer de ella sin una acción explícita. Guardar el formulario completo sobrescribe cambios recientes de otra persona; el historial se inserta después y su error se ignora.

Mejora: mostrar autorizaciones inactivas con estado, diffs antes/después, versión del perfil y control optimista de concurrencia. Guardar perfil e historial en una transacción. Separar restablecer valor por defecto de introducir un valor inválido.

Cierre: una selección invisible no se elimina al editar otro campo y dos administradores reciben conflicto en vez de sobreescribirse silenciosamente.

## 12. Ingeniería, pruebas, dependencias y mantenimiento

### T01 — P1 · C · Faltan pruebas de integración de las garantías más importantes

Evidencia: suite en `packages/core/src/*.test.ts`; no hay cobertura equivalente del circuito Server Action → DB → executor → Meta → reconciliación. Los 20 diagnósticos de esta auditoría muestran huecos aunque la suite existente apruebe.

Mejora: pruebas de orquestación con red falsa y DB de ensayo, autorización de acciones, concurrencia real en PostgreSQL, fallos de WAL, timeouts posteriores al POST y recuperación tras crash. Los dobles en memoria detectan lógica, pero no sustituyen restricciones/aislamiento SQL reales.

Cierre: CI incluye matriz de fallos de cada frontera, y cualquier regresión S01–S11 o A01–A02 impide fusionar.

### T02 — P1 · C · El fixture omitido y los tests simplificados dejan puntos ciegos

Evidencia: prueba omitida por ausencia del NDJSON real; reconocimiento de órdenes probado sin atravesar el formato normalizado anidado. Fechas, actores y montos necesitan casos representativos pero sin información privada.

Mejora: fixtures sintéticos/anónimos versionados, reloj inyectable y pruebas de propiedades: idempotencia, invariancia al orden de JSON, conservación del presupuesto de un par y supervivencia de referencias al reagrupar. Casos frontera con medianoche, vacío, duplicados y datos tardíos.

Cierre: clon limpio ejecuta toda la suite sin depender de archivos privados del autor; una prueba omitida esencial hace fallar el gate correspondiente.

### T03 — P1 · C · CI no construye la web ni verifica una instalación de DB

Evidencia: [ci.yml](.github/workflows/ci.yml) ejecuta tipos y pruebas, no `web build`, migraciones, smoke test ni pruebas de seguridad. La compilación local sí pasó, pero conviene convertirla en garantía continua.

Mejora: build de producción, DB efímera con migraciones, integración, análisis de dependencias/secretos y smoke test del despliegue. Separar checks rápidos de los más costosos. Un build correcto tampoco demuestra que una página SSR con datos reales funcione.

Cierre: un PR que rompe compilación o autorización falla antes de desplegar.

### T04 — P1 · V · Cuatro avisos en PostCSS transitivo

El lockfile instalado resolvió `postcss@8.4.31` a través de `apps/web → next → postcss`. La auditoría devolvió:

| Aviso | Severidad del aviso | Versión corregida indicada |
|---|---|---|
| [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) | Moderada | `>=8.5.10` |
| [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) | Alta | `>=8.5.12` |
| [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) | Moderada | `>=8.5.23` |
| [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) | Alta | `>=8.5.18` |

Son avisos sobre tratamiento de CSS/source maps; **no demostré que un usuario de esta app pueda explotar esas rutas**. La severidad del paquete no se debe confundir con explotación remota confirmada del dashboard.

Mejora: actualizar la dependencia padre a una combinación soportada que resuelva una versión corregida; si se considera override temporal, documentar alcance y verificar build/estilos/integración. No aplicar `audit fix --force` a ciegas.

Cierre: auditoría limpia para estos avisos o excepción acotada, justificada y con vencimiento; lockfile y pruebas de build actualizados.

### T05 — P1 · C · El comando de migración documentado no está implementado

Evidencia: [package.json](package.json) define `db:migrate` delegando a `@agentes-meta/db migrate`, pero [packages/db/package.json](packages/db/package.json) no tiene ese script. Hay 19 migraciones SQL, sin un recorrido reproducible único que registre versiones/checksums y compruebe drift del entorno vivo.

Mejora: runner/CLI de migraciones con historial, bloqueo y plan revisable, separación desarrollo/ensayo/producción y estrategia expandir-migrar-contraer para cambios incompatibles. Las migraciones históricas destructivas requieren respaldo y contexto; no ejecutarlas indiscriminadamente sobre una base existente.

Cierre: crear una DB vacía y llegar al esquema esperado es automatizable; aplicar a una DB al día no repite ni omite pasos. No ejecuté migraciones durante esta auditoría.

### T06 — P1 · C · La base acepta estados que el dominio considera imposibles

Evidencia: tablas `proposals`, `executions`, perfiles y experimentos usan textos/JSON con pocos `CHECK` de dominio. La transición validada en TypeScript no evita una escritura incoherente desde otra ruta privilegiada.

Mejora: restricciones de estados/acciones, no negatividad y rangos, coherencia de timestamps, cuenta/entidad y unicidad de intención/paso. Operaciones críticas en transacciones/RPC con permisos concretos. Diseñar migraciones que primero detecten y reparen datos heredados incompatibles.

Cierre: intentar insertar estado desconocido, presupuesto inválido o par incoherente falla en DB, incluso evitando la UI.

### T07 — P2 · C · El tipado de Supabase y de JSON no protege suficientemente el contrato

Evidencia: tipos manuales repetidos, `Record<string, unknown>`, conversiones `as` y estructuras libres para reglas/evidencia/órdenes. Typecheck aprobó pese a discrepancias semánticas entre columnas y flujos.

Mejora: generar tipos `Database` desde el esquema y definir esquemas versionados para JSON de dominio, con parseo al leer/escribir. Unificar tipos monetarios/IDs/fechas y distinguir fecha local de instante UTC.

Cierre: renombrar una columna o añadir una variante de estado obliga a actualizar todos sus consumidores, y datos inválidos no se aceptan solo por un cast.

### T08 — P2 · C/M · Funciones densas y estados mezclados dificultan auditar seguridad

Evidencia: varias funciones largas concentran consultas, decisiones, renderizado y manejo de errores en líneas muy comprimidas. También quedan conceptos duplicados como `rules.active` frente a `status`, APIs de movimiento repetidas y estructuras heredadas sin consumidor claro.

Mejora: refactorizar por límites de responsabilidad tras fijar tests; funciones pequeñas para cargar contexto, validar, reclamar, enviar, reconciliar y representar. Eliminar duplicación solo después de verificar usos/datos. Añadir lint/formato y reglas contra promesas/errores ignorados.

Cierre: una revisión de código puede seguir cada frontera crítica sin reconstruir varias operaciones comprimidas en una sola línea. No hace falta cambiar Next ni introducir microservicios.

### T09 — P2 · C/M · Rendimiento y volumen se resuelven principalmente cargándolo todo

Evidencia: Anuncios pagina la presentación después de descargar/agregar inventario, métricas y revisiones; otras vistas hacen scans repetidos por sesión/horizonte. `fetchAll` corrige truncación pero puede aumentar memoria, latencia y tráfico sin límites.

Mejora: medir primero y mover agregación/paginación al servidor/SQL cuando corresponda; índices guiados por `EXPLAIN` y consultas reales, cache ligada a versión de ingesta y deduplicación de recomputaciones. Definir objetivos de latencia y volumen soportado.

Cierre: una cuenta de ensayo con diez veces el volumen responde dentro de objetivos medidos; no añadir indiscriminadamente índices, colas y particiones sin datos.

### T10 — P1 · V/C · La rama principal no tiene controles de cambio efectivos observados

Evidencia: respuesta de protección de rama y rulesets descrita en alcance. [CLAUDE.md](CLAUDE.md) promueve un flujo de commit/push muy directo, útil para prototipar pero delicado para código que mueve presupuestos y un repo público.

Mejora: PRs pequeños, revisión de cambios financieros/auth, checks obligatorios y protección de `main`; versiones/releases para correlacionar incidentes con despliegues. Mantener acciones de publicar, desplegar o rotar secretos sujetas a autorización explícita, independientemente de la herramienta que escriba código.

Cierre: un cambio sin checks aprobados no llega a la rama desplegable; existe una forma conocida de volver al código anterior sin revertir ciegamente efectos de Meta.

### T11 — P2 · C/M · Endurecimiento de cadena de suministro y workflows

Evidencia: Actions referenciadas por tags, permisos no declarados explícitamente y entradas `workflow_dispatch` interpoladas en scripts shell. La inyección de esas entradas requiere capacidad de disparar el workflow; no es una vulnerabilidad anónima demostrada.

Mejora: `permissions` mínimos, pinning de acciones cuando se adopte esa política, actualizaciones automatizadas revisadas, inputs por variables de entorno con validación y quoting correcto. Añadir responsables (`CODEOWNERS` si sirve al equipo), política de seguridad y licencia explícita si seguirá público; sin licencia no se expresa claramente permiso de reutilización.

Cierre: entradas con caracteres especiales no se convierten en comandos; el workflow solo tiene los permisos necesarios y las actualizaciones de seguridad tienen dueño.

### T12 — P2 · C/K · Documentación de estado desactualizada y poco portable

Evidencia: pendientes de fases ya construidas, contador “77 pruebas” sin distinguir omitidas, repo descrito como privado, cron aún por verificar, comandos de `analyst` que no corresponden a scripts del paquete y notas locales de Mac/red/symlinks. El benchmark mezcla decisiones históricas con estado actual.

Mejora: una tabla única de capacidad → implementado → probado → desplegado → habilitado; decisiones históricas en ADRs y pendientes depurados. Instrucciones comunes del repositorio para asistentes y personas: datos sintéticos, tests obligatorios, sin secretos y sin cambios financieros no autorizados. No hace falta competir entre archivos de Claude y Codex ni duplicar toda la especificación.

Cierre: una persona nueva distingue funciones reales de infraestructura preparada y ejecuta todos los comandos documentados desde un clon limpio.

### T13 — P2 · C/V/M · La narrativa necesita control de versión, coste y terminación

Evidencia: [narrative.ts](packages/agents/src/narrative.ts) fija modelo y usa una beta/fallback; guarda el modelo devuelto, lo cual es útil, pero no registra consumo, coste, latencia, hash del prompt ni terminación truncada. Una respuesta cortada por límite de tokens puede tener texto no vacío y guardarse como completa.

El ID `claude-opus-5` sí aparece en la [documentación oficial consultada](https://platform.claude.com/docs/en/models/overview); **no lo marco como modelo inexistente**. Falta probar acceso y capacidades concretas con tu cuenta cuando configures la clave.

Mejora: configuración explícita de modelo, contratos de fallback, versión de prompt, manejo de `max_tokens/stop_reason`, métricas de consumo y límite de coste. Comparar alternativas con un conjunto de reportes de referencia antes de cambiar proveedor/modelo. Redactar evidencia no requiere necesariamente el modelo más costoso.

Cierre: texto truncado no se presenta como reporte terminado; se conoce qué modelo/evidencia produjo cada versión y cuánto costó, sin depender de una integración narrativa para operar los cálculos.

## 13. Mejoras de producto para cumplir la intención original

Estas son oportunidades, no fallos de seguridad. No conviene convertirlas todas en requisitos del primer lanzamiento.

### P01 — P2 · M · Definir una promesa de producto verificable

“Agentes para Meta” es demasiado amplio para priorizar. Formularía tres trabajos: explicar qué cambió y quién; registrar qué se intentó aprender y cuándo puede juzgarse; proponer/ejecutar ajustes acotados con razones y trazabilidad.

Cierre: una página de alcance y exclusiones que permita rechazar funciones que no mejoran esos trabajos. El éxito no se mide por cantidad de agentes o pantallas.

### P02 — P1 · C/K · El generador de acciones todavía no genera candidatos

Evidencia: `generateCandidates` en [strategist.ts](packages/core/src/strategist.ts) termina en `flatMap(() => [])`, incluso para reglas distintas de los candados. Es una decisión deliberada mientras llegan respuestas de Eduardo, no un fallo oculto. Sin embargo, “revisó N entidades” cuenta entidades sin demostrar que evaluó su rendimiento para proponer acciones.

Mejora: mostrar “vigilancia activa; reglas de acción aún no configuradas”. Convertir cada respuesta de Eduardo en especificación, ejemplo positivo/negativo, datos requeridos, acción y prueba de replay. Implementar primero una regla simple, reversible y acotada; un JSON `condition` almacenado no es por sí mismo un motor ejecutable. El contrato de candidatos debe incluir ambos extremos para movimientos.

Cierre: cada regla activa produce o descarta candidatos con evidencia real y motivo trazable. No inventar sus umbrales en nombre del comprador.

### P03 — P2 · M · Contexto de negocio útil para interpretar y restringir

Inspiración: el módulo público de [Identidad de Testmia](https://testmia.com/es/identidad). Aquí incorporaría objetivo por campaña, etapa/propuesta de valor, promociones, restricciones de inventario, calendario comercial, márgenes operativos y quién puede autorizar excepciones.

Ese contexto debe tener dueño, vigencia y efecto explícito. Parte será solo anotación para el análisis; parte podrá convertirse en condiciones estructuradas. No meter instrucciones vagas en un prompt esperando que controlen dinero.

Cierre: una promoción o falta de stock aparece junto a la evaluación y, si se acordó, bloquea reglas concretas mediante código comprobable.

### P04 — P3 · M · Pasar de galería de anuncios a memoria creativa

Inspiración: [Anuncios de Testmia](https://testmia.com/es/anuncios). Antes de generar imágenes o videos, vincular creatividad, versión, ángulo, hook, formato, audiencia e hipótesis a sus métricas y revisiones. Conservar lo que aprendió el comprador y por qué descartó una variante.

Cierre: responder “qué ángulos funcionaron, bajo qué condiciones y con cuánta evidencia” sin buscar notas sueltas. Generación de variantes sería una fase posterior con aprobación de marca y sin publicar automáticamente.

### P05 — P2 · M · Convertir Hoy en una bandeja de trabajo priorizada

Reunir incidentes críticos, datos incompletos, aprobaciones por vencer, experimentos listos, anuncios con revisión pendiente y evaluaciones contradictorias. Cada elemento con responsable, urgencia, razón y siguiente acción; evitar que todas las tarjetas tengan la misma prioridad visual.

Cierre: el comprador sabe qué debe hacer ahora y el dueño puede ver qué está bloqueado, sin abrir diez secciones ni confundir una alerta técnica con una recomendación de presupuesto.

### P06 — P2 · M · Onboarding y simulación revisable con datos de demostración

Wizard corto de cuenta/zona/moneda, permisos, techo, lista blanca y modo; validación de completitud y recorrido de una propuesta sintética. Un modo demo separado permite mostrar el producto sin exponer datos comerciales.

Cierre: otra persona puede aprender el flujo aprobar/corregir/rechazar sin tener capacidad de modificar Meta. Los criterios iniciales quedan confirmados por su responsable, no precargados como verdades universales.

### P07 — P3 · M · Economía de negocio como ampliación deliberada, no vuelta automática a Shopify

El retiro de Shopify fue una decisión expresa. La respetaría. Con Meta como fuente, etiquetaría “ingresos atribuidos por Meta”, no ventas netas ni beneficio. La fórmula `1/margen` de ROAS de equilibrio solo representa las partidas que realmente estén incluidas en ese margen.

Si después quieres optimizar beneficio o verificar ventas netas, hará falta un contrato adicional de pedidos, devoluciones, descuentos, impuestos/costes y solapamiento entre canales. Eso es una ampliación de alcance que debe decidirse, no una corrección técnica obligatoria de esta auditoría.

Cierre: cualquier métrica económica explica qué incluye y excluye; no promete rentabilidad que los datos actuales no permiten medir.

### P08 — P2 · M · Medir el beneficio de la herramienta y su calidad de decisión

Definir indicadores: tiempo ahorrado revisando, porcentaje de cambios con razón, evaluaciones con cobertura suficiente, propuestas corregidas/rechazadas, incidentes evitados, acciones desconocidas, coste de operación y resultados de reglas por versión. No usar solo “aprobaciones” o ROAS agregado como prueba del valor del agente.

Cierre: después del piloto se puede decidir con evidencia si conservar, ajustar o apagar una regla y si vale la pena expandir a otras marcas. Multiempresa, facturación y otros canales quedarían para un producto SaaS separado, después de aislamiento y onboarding seguros.

## 14. Anexo de reproducciones locales

Se ejecutó un arnés temporal dentro de `node_modules/.codex-audit/`, no versionado, que importó las funciones reales de `core` y `agents`. Supabase y Meta se sustituyeron por objetos en memoria con fallos inyectables. Se prohibió cualquier petición de red en el arnés. Estos resultados detectan errores de lógica/orquestación; no simulan todas las particularidades de PostgreSQL/PostgREST ni prueban la API viva.

| Caso | Preparación | Comportamiento observado | Debe convertirse en regresión para |
|---|---|---|---|
| R01 | Propuesta aprobada $1,000 → $100,000; `off`, whitelist vacía, máximo 17%, `dry_run=false` | Se envía y termina `ejecutada` | Política obligatoria al ejecutar |
| R02 | Error al consultar `emergency_brakes` | Se envía igualmente | Fallo cerrado |
| R03 | Dos `executeProposal` concurrentes sobre el mismo ID | Dos POST y dos registros | Reclamación atómica/idempotencia |
| R04 | Movimiento $1,000/$500; falla el registro del paso 2 | Queda $800/$500 y la nota dice “nada se envió” | Recuperación del par y veracidad del estado |
| R05 | Movimiento aplicado en ambos extremos; timeout al releer destino | Compensa origen solamente: $1,000/$700 | Estado desconocido y reconciliación |
| R06 | Evento realista con `extra_data.new_value` anidado | No se reconoce la orden propia, aunque hay centavos canónicos | Contrato raw → normalizado → ejecución |
| R07 | Siete fechas previas; una posterior; calendario ya cumplido | `mature/high`, informa 7 días; observados 1 | Cobertura de evaluación |
| R08 | Mismo conjunto incompleto y criterio ROAS cumplido | Propone `graduar` | Cobertura de experimento |
| R09 | Movimiento con origen = destino | Orden aceptada y expandida en dos cambios de la misma entidad | Validación de pares |
| R10 | Mover el 100% del presupuesto del origen | Orden padre válida; hijo con cero que su propio validador rechaza | Validación de expansión/simulación |
| R11 | Comprometido $1,290; límite $1,300; subida $200 | Todos los candados pasan; proyectado $1,490 | Techo posterior y reservas |
| R12 | Subida y bajada sobre misma entidad en una pasada | Ambas aceptadas | Arbitraje de candidatos |
| R13 | Notificación existente con estado `failed` | Omitida como ya procesada | Reintentos del outbox |
| R14 | JSON semánticamente igual con distinto orden de claves | Fingerprints distintos | Canonicalización |
| R15 | Nota con solo grupo, grupo obsoleto sin sucesor | Única ancla puesta a null sin error | Integridad del reagrupado |
| R16 | Una corrida programada de hace 6.95 días | Reporte considerado listo; solo falta token de Telegram | Cobertura real de la semana |
| R17 | Ventana actual madura; guardar reporte de corte anterior | Ventana actual retrocede a preliminar | Separación histórico/actual |
| R18 | Reporte existente con narrativa y evidencia anterior | Reemplaza evidencia, conserva narrativa vieja | Versionado del reporte |
| R19 | 2026-09-07 06:17 UTC | Lunes CDMX y todavía domingo Mazatlán | Corte semanal por cuenta; reproducción del desfase de calendario |
| R20 | `isClosedDay` un minuto después de medianoche; margen 3h | Devuelve true; el margen no se aplica | Contrato de cierre/latencia |

R20 se localiza en [time.ts](packages/core/src/time.ts), `isClosedDay`: el parámetro `marginHours` no se utiliza. Además, la ingesta calcula su propio booleano de cierre. Unificar esa política y probar que la función realmente se utilice evita corregir solo una utilidad desconectada.

### Ejemplo mínimo y portable del problema de cobertura

Este fragmento puede convertirse en test de regresión en `packages/core`. No necesita DB ni tokens:

```ts
import { evaluateChange, type DailyRow } from './evaluation';

const rows: DailyRow[] = [];
for (let d = 25; d <= 31; d++) {
  for (const entity_id of ['c1', 'c2']) {
    rows.push({ entity_id, date: `2026-08-${d}`,
      spend: 100, purchases: 10, value: 400 });
  }
}
rows.push(
  { entity_id: 'c1', date: '2026-09-02', spend: 100, purchases: 10, value: 600 },
  { entity_id: 'c2', date: '2026-09-02', spend: 100, purchases: 10, value: 400 },
);

const result = evaluateChange({
  changeDate: '2026-09-01', campaignIds: ['c1'], rows,
  horizon: '7d', today: '2026-09-09',
});
// Comportamiento del SHA auditado:
// result.status === 'mature'
// result.confidence === 'high'
// result.closed_days === 7
// result.treatment.after.days === 1
```

La corrección no debería limitarse a comparar `days === 7`: primero hay que distinguir filas ausentes de días sin entrega confirmada y verificar cobertura por campaña.

## 15. Qué ya sabías, qué cambió y qué no conviene sobrerreaccionar

| Tema | Estado antes de esta revisión | Lectura de la auditoría |
|---|---|---|
| Respuestas de Eduardo | Pendientes explícitamente | Siguen siendo requisito; no inventaría reglas de negocio |
| Generador de candidatos | Pendiente deliberado | Hacer visible que aún no analiza acciones; implementarlo después de las barreras P0 |
| Telegram y narrativa | Claves pendientes | Último run consultado confirma que faltaban; además hay errores de entrega/versionado por corregir |
| System User y tokens separados | Pendiente | Mantener, sin confundir permiso de API con seguridad del ejecutor |
| Congelamientos y reversión | Pendientes posteriores a ejecución real | Moverlos a requisito previo; se encontraron fallos de recuperación adicionales |
| Cron programado | Por confirmar en documentos | Sí hay corridas `schedule`; ahora el problema es continuidad/frescura y retraso |
| Paginación | Documentada como corregida | Se corrigieron varias rutas; todavía quedan otras truncables |
| Reagrupado y anotaciones | Varias reparaciones previas | Conservarlas; ampliar a formatos heredados, transacciones y todas las referencias |
| 77 pruebas | Documentadas como total | En el clon: 76 pasan y 1 se omite; no equivalen a pruebas de ejecución real |
| Visibilidad del repo | Documentada como privada | GitHub lo reporta público |
| Shopify | Retirado por decisión del dueño | No lo reintroduciría sin cambiar explícitamente la pregunta de negocio |
| Cambio de Claude a Codex | Nueva mirada solicitada | No obliga a cambiar el proveedor de narrativa ni a reescribir la aplicación |

Tampoco recomendaría, de entrada: microservicios, una base vectorial, un enjambre de agentes, un chat como única interfaz, cambiar de framework, automatizar campañas sin reglas confirmadas o añadir todos los canales anunciados por Testmia. Ninguna de esas cosas arregla los fallos reproducidos.

## 16. Plan de ejecución recomendado

Los bloques son dependencias y puertas de salida, no fechas inventadas. Se puede trabajar en UX/documentación en paralelo, pero no saltar una puerta financiera porque el dashboard ya se vea terminado.

### Bloque 0 — Contención y verdad operativa

- Mantener `dry_run` y modo restringido hasta completar los P0; comprobar esos valores vivos con autorización del dueño.
- Corregir primero A01/A02 y mensajes U07 para que nadie pueda habilitar dinero real por una ruta no autorizada.
- Decidir visibilidad del repositorio y revisar/rotar las credenciales expuestas ya reconocidas.
- Publicar en UI qué capacidades están habilitadas, qué datos están frescos y qué integraciones faltan.
- Resolver dependencias con avisos y añadir build a CI.

Salida: permisos y exposición revisados, lectura útil y segura, sin promesas de ejecución/cobertura no demostradas.

### Bloque 1 — Motor de ejecución seguro

- Política compartida y revalidación de propuestas/estado vivo.
- Reclamación atómica, unicidad y exclusión por entidad/cuenta según operación.
- Intención completa registrada, estados desconocidos, reconciliación y recuperación tras crash.
- Congelamientos jerárquicos, límites proyectados y coordinación de candidatos.
- Pruebas R01–R06 y R09–R12, más pruebas con PostgreSQL y fallos en cada frontera.

Salida: ante cualquier fallo inyectado, **no hay envío no autorizado, no se pierde una intención y no se declara confirmado algo desconocido**.

### Bloque 2 — Evidencia que se pueda defender

- Manifiestos de cobertura y backfill requerido por horizonte.
- Semántica de cero/ausencia, reexpresiones reconciliadas y fechas de cuenta consistentes.
- Evaluador con madurez temporal separada de suficiencia de datos.
- Históricos inmutables; reportes y narrativas ligados a su evidencia.
- R07/R08/R14/R15/R17–R20 como regresiones y veredictos calibrados con revisión humana.

Salida: cada veredicto muestra datos suficientes o explica por qué no puede concluir. Generar un reporte antiguo no cambia el presente.

### Bloque 3 — Operación desatendida verificable

- Resultado global degradado/fallido cuando corresponda.
- Monitor externo de corridas/frescura, outbox recuperable y alertas con responsable.
- Reconciliador de órdenes y jobs atascados, runbooks y restauración ensayada.
- Primera semana medida por cobertura y continuidad, no por una fecha aislada.
- Historial navegable y estados útiles en Hoy/Estado.

Salida: una caída se detecta sin estar mirando la app y el equipo sabe qué hacer sin improvisar órdenes en Meta.

### Bloque 4 — Piloto con una regla y un experimento

- Eduardo confirma una regla específica y su evidencia mínima.
- Replay histórico sin sesgo de usar datos futuros que no estaban disponibles al decidir.
- Shadow mode: registrar qué habría hecho y revisar falsos positivos, correcciones y límites.
- Simulaciones completas y ejercicio de recuperación.
- Solo después, autorización expresa para un piloto real limitado por cuenta, whitelist e importes.
- Primer experimento predeclarado, sin contaminación por otras reglas, seguido hasta decisión humana.

Salida: una decisión real puede explicarse y seguirse desde criterio → evidencia → aprobación → escritura → confirmación → evaluación.

### Bloque 5 — Autonomía y expansión opcional

Promover una versión de regla únicamente con evidencia operativa y de resultados; límites de exposición y degradación automática. Después valorar contexto de negocio, memoria creativa, otras marcas o integraciones de ventas. Si se transforma en SaaS, abrir un proyecto explícito de aislamiento multiempresa, permisos, onboarding, privacidad y soporte.

### Condiciones mínimas antes de desactivar `dry_run`

- [ ] No hay P0 abiertos en ejecución, permisos o mensajes de aprobación.
- [ ] Una propuesta corregida/antigua no evita ningún candado.
- [ ] Dos workers no duplican una intención.
- [ ] Fallos parciales y resultados desconocidos se reconcilian sin inflar presupuesto.
- [ ] Congelamientos, límites proyectados y pertenencia de entidades funcionan.
- [ ] Se distingue claramente freno del agente de pausa de campañas Meta.
- [ ] Datos completos/recientes y criterio de atribución comprobado.
- [ ] Token válido de alcance mínimo y decisión explícita de quién puede usarlo.
- [ ] Alertas probadas, recuperación ensayada y persona responsable disponible durante el piloto.
- [ ] Aprobación expresa de Jeshua sobre cuenta, regla, versión y exposición máxima.

## 17. Verificaciones que requieren acceso o decisiones posteriores

No hacen falta para entregar esta auditoría, pero sí para certificar operación real:

1. Configuración viva de `mode/dry_run`, whitelist, frenos, reglas y perfiles por cuenta; el esquema por defecto no demuestra sus valores actuales.
2. Esquema y RLS efectivos de Supabase frente a migraciones, políticas de signup, sesiones vigentes, backups y capacidad del plan.
3. Rotación efectiva de credenciales que se compartieron antes, sin volver a pegarlas en chats o documentación.
4. Permisos reales de tokens Meta, acceso por cuenta, campos de confirmación y consistencia de API con un entorno/piloto autorizado.
5. Muestreo de cifras contra Ads Manager con misma atribución, zona y periodo; cobertura histórica real, no solo la disponible por defecto al instalar.
6. Pruebas de autenticación, renovación y acciones en el despliegue actual de Netlify.
7. QA de interacción en navegador y móvil real; no hubo navegador conectado durante esta sesión.
8. Criterios de Eduardo, reglas de excepción y decisión del dueño sobre alcance interno frente a producto comercial.

## 18. Mi recomendación final

No empezaría por añadir más “inteligencia”. Empezaría por hacer que **cada cifra tenga cobertura, cada permiso se compruebe en el servidor, cada orden tenga un único dueño y cada fallo deje un estado verdadero y recuperable**.

Después construiría una regla pequeña de punta a punta y comprobaría si realmente ayuda al comprador. Ese camino aprovecha lo que ya hiciste, reduce el riesgo de dinero real y acerca el proyecto a la promesa operativa que te interesó de Testmia mucho más que añadir nuevas pantallas o cambiar de modelo.
