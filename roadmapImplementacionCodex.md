# Roadmap maestro de implementación — Agentes Meta

Actualización de la retoma (2026-09-06): [mesa de decisiones y simulación persistente](docs/14-decisiones-operativas-codex.md) implementadas; 0020/0021 aplicadas y verificadas en Supabase. Avance adicional parcial en IM-08/09/16/21. El operador aún debe fijar la primera regla y verificar la interfaz autenticada; no se habilitó dinero real ni se cerraron los 40 bloques. El detalle siguiente conserva la planificación y los cortes anteriores.

Fecha del plan: 5 de septiembre de 2026. Avance actualizado: 6 de septiembre de 2026. Código base: `3ccb9f4`. Estado: **implementación en curso; IM-01/02/03/04/06/21/22/23 parciales**. Evidencia: [primer avance](docs/08-base-implementacion-codex.md), [configuración transaccional / PostgreSQL](docs/09-configuracion-transaccional-codex.md), [base visual / navegador](docs/10-sistema-visual-codex.md), [shell y fechas](docs/11-shell-navegacion-codex.md) y [piloto de Hoy](docs/12-hoy-piloto-codex.md).

Fuentes: [auditoría general](mejorasCodex.md) y [auditoría del frontend](auditoriaFrontendCodex.md). Este documento unifica su ejecución: **109 referencias generales + 75 de frontend = 184 referencias cubiertas por 40 bloques de trabajo**. Hay solapamientos entre auditorías; no se trata de 184 funcionalidades independientes.

## 1. Resultado que vamos a construir

Un centro de operaciones de Meta Ads que permita:

1. Entender qué cambió, quién lo hizo y con qué resultados observados.
2. Registrar experimentos antes de intervenir y evaluarlos con evidencia suficiente.
3. Revisar propuestas comprensibles y ejecutar únicamente acciones autorizadas, acotadas y recuperables.
4. Operar desde un dashboard premium carbón/naranja/violeta, con layout bento, poca carga visual y detalle accesible.
5. Detectar fallos, datos incompletos y resultados desconocidos sin depender de mirar logs constantemente.

Conservar: monorepo, separación `core/meta/db/agents/web`, cálculo determinista y narrativa subordinada a evidencia. No se plantea una reescritura de framework, cambiar Claude por otro proveedor por preferencia personal ni reconstruir integraciones eliminadas.

### Qué cambia respecto al plan anterior

- “Existe código” no equivale a “probado”, “desplegado” o “habilitado”. Los checks históricos de `ROADMAP.md` no cierran los defectos de las auditorías.
- No es necesario esperar el criterio de Eduardo para corregir permisos, pruebas, datos, formularios, navegación o diseño. Sus respuestas sí condicionan los umbrales y acciones de negocio.
- Recuperación, congelamientos y reconciliación se implementan **antes** de dinero real; no se posponen hasta después de activarlo.
- La apariencia premium empieza pronto, en paralelo al trabajo de seguridad y datos. No autoriza activar escrituras porque la pantalla ya esté terminada.
- La autonomía se conserva como destino, pero no se obtiene solamente por acumular aprobaciones.
- La estimación histórica de 8–9 semanas no se reutiliza como compromiso. Este plan añade trabajo de integridad, migraciones, pruebas y UX que no estaba contemplado con ese detalle.

## 2. Alcance, estado y autorizaciones

La versión inicial produjo planificación. Tras la autorización de iniciar, se implementó un primer corte local de acceso, configuración y pruebas, documentado en [el registro inicial](docs/08-base-implementacion-codex.md). El [segundo corte](docs/09-configuracion-transaccional-codex.md) añade perfil/historial transaccionales y un runner probado exclusivamente en PostgreSQL efímero. No se migró producción, modificaron credenciales reales, publicaron cambios, desplegaron versiones ni operó Meta.

Los bloques `IM-01` a `IM-40` partieron pendientes. IM-01/02/03/04/06/21/22/23 tienen avance parcial y todavía no están cerrados; algunos detalles de IM-05 se adelantaron. El tercer corte incorpora tokens/componentes, el [cuarto corte](docs/11-shell-navegacion-codex.md) añade shell público/privado, navegación móvil, contexto y fechas validadas, y el [quinto corte](docs/12-hoy-piloto-codex.md) implementa el piloto de Hoy con evidencia en panel y controles solo en memoria. Capturas y pruebas usan un laboratorio sin datos reales. Los demás conservan sus criterios y estado pendiente. Implementado localmente no significa desplegado ni habilitado.

Etapas E00–E09: objetivo principal. E10: autonomía, con habilitación posterior explícita. E11: expansión deliberada, con decisión de alcance. Incluir una idea en el roadmap no implica que se deba activar, contratar o integrar sin esa decisión.

La auditoría del frontend no contó con navegador conectado y utilizó código más cinco capturas históricas. El tercer corte ya añade pruebas Chromium y capturas nuevas del laboratorio de componentes, no de las doce pantallas de producción. La validación E2E, la aprobación de Hoy y el QA completo siguen pendientes.

### Reglas para ejecutar el roadmap

- Cada cambio se desarrolla en un entorno de prueba sin capacidad de gastar en Meta por defecto.
- Tests de escritura usan transporte falso con red real bloqueada. Las pruebas SQL usan una DB efímera o de ensayo, nunca una base real por conveniencia.
- No pegar credenciales en documentación, fixtures, capturas o registros. Separar credenciales de lectura, escritura y administración.
- No levantar `dry_run`, habilitar reglas reales, modificar visibilidad del repositorio, proteger ramas, rotar secretos o enviar notificaciones reales como efecto colateral de implementar una pantalla. Esas operaciones se preparan y se ejecutan cuando exista autorización específica.
- Antes de migrar datos existentes: revisar diagnóstico, respaldo, alcance y plan de recuperación. Las migraciones históricas no se vuelven a lanzar indiscriminadamente.
- No cambiar las restricciones de negocio para que los tests pasen o las gráficas se vean mejores.
- El trabajo que ya exista en el directorio se preserva. Documentar qué pertenece a cada bloque; no incluir archivos ajenos en commits generales.

## 3. Etapas, dependencias y entregas

Los identificadores de etapa son agrupaciones, **no una cola estrictamente serial**. El diseño E02 y la plataforma E01 pueden avanzar tras E00; motor E03 y datos E04 son ramas coordinadas. Su integración para dinero real exige completar ambas.

| Etapa | Entrega | Bloques | Depende de | Criterio para avanzar |
| --- | --- | --- | --- | --- |
| E00 · Base verificable | Alcance, inventario de capacidades, fixtures y primeras regresiones | IM-01, IM-02 | Auditorías y código actual | Existe forma segura y repetible de comprobar los cambios |
| E01 · Acceso y plataforma | Permisos, configuración segura, migraciones, CI y entorno | IM-03 a IM-07 | E00 | Acceso y acciones sensibles controlados; esquema reproducible |
| E02 · Diseño y piloto visual | Tokens, componentes, shell y Hoy en lectura/simulación | IM-22, IM-23, IM-21 | E00; contratos de acceso de E01 para integración | Dirección visual aprobada en Hoy; navegación, fechas y estados comprensibles |
| E03 · Motor de ejecución | Autorización, exclusión, intención durable, recuperación y trazabilidad | IM-08 a IM-12, IM-16 | Base SQL/tests de E00/E01; contratos de E04 | Cero envíos no autorizados; resultados inciertos se reconcilian o bloquean |
| E04 · Datos confiables | Cobertura, calendario, reexpresión, paginación y reagrupado íntegros | IM-13 a IM-15 | E00 y migraciones/contratos de E01 | Se distingue ausencia de actividad de ausencia de datos, sin perder referencias |
| E05 · Analista defendible | Evaluaciones consistentes, históricos y narrativa versionada | IM-17 a IM-19 | E04; traza de IM-16 para evaluar acciones del agente | Cada conclusión tiene evidencia compatible y limitaciones explícitas |
| E06 · Experimentos y contexto | Dominio seguro, borradores, flujo guiado y onboarding | IM-20, IM-28, IM-38 | E02/E04/E05; reservas/límites de E03 | Experimentos no se juzgan antes de tiempo ni contaminan otras decisiones sin aviso |
| E07 · Frontend completo | Anuncios, rendimiento, aprendizajes, horarios, bitácora y sesión | IM-24 a IM-27 | E02; contratos E04/E05 y trazas E03 | Las 12 pantallas quedan cubiertas junto a las entregas de E01/E06/E08 |
| E08 · Operación recuperable | Pipeline, avisos, vigilancia, backups y rendimiento | IM-29 a IM-33 | Se inicia tras E01; integra E03–E07 | Un fallo tiene estado veraz, detección, responsable y recuperación ensayada |
| E09 · Validación y piloto | QA transversal, una regla, shadow mode y piloto aprobado | IM-34, IM-35, IM-37 | Todas las garantías anteriores | Una decisión se sigue de criterio a evaluación; dinero real requiere puerta específica |
| E10 · Autonomía controlada | Promoción por versión de regla y degradación | IM-36 | E09 y evidencia suficiente por regla | Habilitación explícita y limitada, no promoción ciega por contador |
| E11 · Expansión de producto | Memoria creativa y decisión sobre economía/otras integraciones | IM-39, IM-40 | Beneficio demostrado y decisión de alcance | Cada ampliación tiene contrato, coste, permisos y métrica de éxito propios |

### Tres recorridos que se coordinan

```text
E00: base de pruebas y contratos
  ├─ E01: acceso y plataforma ─ E03: ejecución segura ───────────────┐
  │                         └─ E04: datos ─ E05: analista ─ E06 ────┤
  ├─ E02: diseño + Hoy ────────────── E07: pantallas completas ─────┤
  └─ E08: operación (arranca después de la base E01 e integra todo) ┤
                                                                 ↓
                                  E09: QA → shadow → piloto autorizado
                                                                 ↓
                                  E10: autonomía      E11: expansión
```

Los contratos se acuerdan antes de integrar: cobertura/calendario, permisos, estado de propuesta, unidad monetaria y estado de ejecución. El frontend puede trabajar con fixtures de esos contratos mientras se construye la implementación. Un mock de “ejecutada” nunca habilita el botón real.

## 4. Backlog de implementación

Un bloque es una unidad de resultado, no necesariamente un único PR. Los grandes deben partirse en cambios revisables. Tamaño **S/M/L** = localizado / varios módulos / flujo transversal; no son días estimados. Responsabilidades son funciones, no personas o agentes ya asignados.

### IM-01 · Línea base, alcance y documentación única

**Etapa:** E00. **Responsable:** producto + ingeniería. **Tamaño:** M. **Depende de:** ninguna implementación nueva.

- Registrar commit, capacidades actuales y estado separado de implementado/probado/desplegado/habilitado.
- Revalidar qué hallazgos siguen vigentes; no repetir arreglos que ya hayan llegado al código.
- Definir los tres trabajos de producto, exclusiones y vocabulario. Conservar decisiones históricas sin tratarlas como instrucciones de estado actual.
- Establecer una matriz de permisos y contratos de fecha, moneda, cobertura y estados. Decisiones no resueltas quedan explícitas, no se rellenan con supuestos financieros.
- Depurar gradualmente `ROADMAP.md`, `PENDIENTES.md` y guías de trabajo, apuntando a este plan en vez de mantener prioridades contradictorias.

**Cierre:** inventario versionado y cola de trabajo consistente. Un elemento marcado “probado” enlaza evidencia, no únicamente un commit.

### IM-02 · Base de pruebas y CI

**Etapa:** E00. **Responsable:** ingeniería + QA. **Tamaño:** L. **Depende de:** IM-01 para alcance.

- Convertir las reproducciones R01–R20 en regresiones versionadas y sintéticas, por dominio. El arnés temporal de la auditoría no es una suite de producto.
- Reloj inyectable, red falsa con bloqueo de red real y fixtures de respuestas válidas, parciales, tardías y erróneas.
- Levantar PostgreSQL de ensayo con migraciones; probar concurrencia real, no solo objetos en memoria. La instalación reproducible se completa con IM-06.
- Añadir build web e integración a CI; separar pruebas rápidas de las de DB/navegador. Revisar el test omitido y sustituir fixtures privados por sintéticos.
- Los defectos pueden comenzar como pruebas rojas en una rama de trabajo, pero no se cierran ni se ocultan con skips para conservar un check verde.

**Cierre:** instalación limpia reproducible y pruebas que fallan ante las regresiones conocidas y pasan con sus correcciones. Ninguna prueba necesita escribir en Meta.

### IM-03 · Autorización y contratos de lectura/entrada

**Etapa:** E01. **Responsable:** backend + seguridad. **Tamaño:** L. **Depende de:** IM-01/02.

- Centralizar membresía, rol y acceso a cuenta en páginas, consultas sensibles y Server Actions.
- Validar IDs, enums, números finitos, longitudes y fechas. Resolver pertenencia desde registros almacenados, no desde un campo `account` enviado por el navegador.
- Separar lectura ordinaria de administración; reducir el alcance de `service_role` y demostrar qué protege realmente cada política.
- Introducir un resultado de lectura que distinga datos, vacío confirmado, parcial y error. Impedir que una consulta fallida termine en “todo en orden”.

**Áreas:** `apps/web/lib`, middleware, acciones, consultas y políticas DB. **Cierre:** pruebas con no autenticado, miembro revocado, rol insuficiente y cuenta cruzada; ninguna obtiene datos o modifica registros fuera de su alcance. Fallos de DB producen estado de error, no éxito vacío.

### IM-04 · Política de cuenta y mensajes de riesgo

**Etapa:** E01, con acabado visual al existir IM-22. **Responsable:** backend + frontend + dueño de política. **Tamaño:** L. **Depende de:** IM-03; IM-06 para transacciones.

- Restringir cambio de modo, simulación, límites y campañas autorizadas a la capacidad acordada; validar siempre en servidor.
- Verificar el modo efectivo y la presencia de capacidad de escritura por proceso/cuenta con acceso autorizado. No asumir que el valor por defecto de `dry_run` coincide con producción; acordar contención en off/simulación si hay exposición antes de cerrar los bloqueos.
- Perfil e historial atómicos, control de versión, diff y preservación de campañas seleccionadas inactivas.
- Corregir inmediatamente la semántica de aprobación, simulación, ejecución, fallo y freno, sin esperar el rediseño completo de Hoy.
- Configuración por secciones con unidades, estados sin guardar y confirmación reforzada al habilitar ejecución real. Notas informativas no se anuncian como candados automáticos.
- Explicar cuándo graduar un experimento solo cambia el registro. La revisión de importes/alcance de propuestas se integra con IM-08/21.

**Áreas:** `configuracion/*`, `hoy/*`, `experimentos/*`, perfil y eventos de auditoría. **Cierre:** operador sin permiso no cambia política; una edición concurrente no sobreescribe silenciosamente; no se muestra éxito para `fallida` ni se promete “no cambia Meta” cuando el modo permite hacerlo.

### IM-05 · Ciclo de usuarios, sesión y límites de abuso

**Etapa:** E01. **Responsable:** backend + frontend. **Tamaño:** M. **Depende de:** IM-03.

- Separar alta, cambio de rol, baja y contraseña; impedir perder al último administrador y reconciliar fallos entre Auth y membresía.
- Contraseña oculta, errores seguros, redirecciones internas normalizadas y conservación de destino al entrar.
- Limitar intentos y trabajos costosos; evitar que repetir “Actualizar análisis” lance cálculo ilimitado.
- Probar sesión expirada, renovación, logout, revocación y POST directo en despliegue de ensayo.

**Áreas:** `usuarios/*`, `login/*`, `lib/auth`, `lib/admin`, cliente SSR. **Cierre:** usuarios y accesos tienen pruebas de extremo a extremo; las acciones están separadas y sus efectos son claros. No cambiar de hosting sin demostrar que sea necesario.

### IM-06 · Migraciones, invariantes y tipos

**Etapa:** E01. **Responsable:** backend/DB. **Tamaño:** L. **Depende de:** IM-01 y el arnés inicial de IM-02, no de su suite SQL ya terminada. El runner permite completar después la integración SQL de IM-02.

- Implementar el runner que falta detrás de `db:migrate`: historial, bloqueo, estado y plan revisable.
- Distinguir instalación vacía de actualización de una DB existente. Diagnosticar datos incompatibles antes de añadir constraints.
- Diseñar transacciones/RPC de reclamación, perfil, reservas y cambios de veredicto junto con sus bloques consumidores.
- Restricciones de estados, relaciones, importes y unicidad; tipos DB generados y esquemas versionados para JSON.
- Usar expandir → migrar → contraer; no prometer rollback automático de una migración destructiva.

**Áreas:** `packages/db`, migraciones y contratos de `core`. **Cierre:** DB vacía y copia sintética del esquema anterior migran correctamente; se rechazan estados imposibles y se comprueban permisos de funciones críticas.

### IM-07 · Dependencias, secretos y entrega segura

**Etapa:** E01. **Responsable:** plataforma + dueño del repositorio. **Tamaño:** M. **Depende de:** IM-01/02.

- Volver a comprobar los avisos de dependencias señalados en la auditoría; actualizar con pruebas a una combinación soportada. No elegir una versión solo porque elimina una alerta textual.
- Contrato de entorno por proceso, validación al arrancar, `.env.example` sin valores privados y credenciales separadas.
- Preparar revisión de información comercial en archivos, capturas e historial; proponer privado o público saneado. Rotación y cambios remotos requieren decisión explícita.
- Preparar checks obligatorios, revisión de cambios financieros/auth, política de releases y permisos mínimos de workflows; activar protecciones remotas cuando se autorice.
- Documentar licencia si se distribuye públicamente y responsables de revisión cuando resulte útil.

**Cierre:** build/tests siguen pasando, no hay secretos nuevos en artefactos, y la configuración permite saber qué capacidades están activadas. Ningún borrado del historial o publicación se hace como limpieza automática.

### IM-08 · Autorización única de ejecución

**Etapa:** E03. **Responsable:** backend/core. **Tamaño:** L. **Depende de:** IM-03/04/06; contrato de cobertura IM-13.

- Una única entrada autorizada para ejecutar; el transporte Meta no se expone como atajo de negocio.
- Revalidar política vigente, cuenta, modo, whitelist, límites, cobertura, espera y freno justo antes de enviar.
- Fallar de forma cerrada ante error o dato obligatorio desconocido.
- Ligar aprobación a cuenta, entidades, importes, evidencia, versiones, modo y vencimiento; invalidar cambios de contexto.
- Releer precondiciones de la entidad. Corregir un monto no permite saltar límites; pasar de simulado a real no convierte aprobaciones antiguas en órdenes reales.
- Diferenciar simulación local, acceso al proveedor y confirmación de ejecución.

**Áreas:** `core/strategist`, `core/execution`, `agents/executor`, `hoy/actions`. **Cierre:** R01/R02 y pruebas de expiración/cambio de perfil producen cero POST. Toda ruta de escritura pasa por la misma política.

### IM-09 · Órdenes y confirmación por tipo

**Etapa:** E03. **Responsable:** adaptador Meta + core. **Tamaño:** M. **Depende de:** contratos IM-06/08.

- Validar pares y cada orden expandida: IDs distintos, pertenencia, nivel, moneda, enteros seguros y presupuesto final válido.
- Rechazar una corrección que invierte la dirección de una acción sin generar una nueva revisión coherente.
- Relectura específica para pausa y presupuesto; distinguir rechazo, consistencia eventual y resultado no confirmado.
- Verificar el contrato con la versión Graph configurada antes de una prueba externa autorizada; no asumir campos por analogía entre entidades.

**Áreas:** `packages/core/src/execution.ts`, `packages/meta/src/write.ts`. **Cierre:** R09/R10 y matriz por tipo de orden; ningún movimiento inválido se simula como correcto o llega al transporte.

### IM-10 · Reclamación atómica y exclusión

**Etapa:** E03. **Responsable:** backend/DB. **Tamaño:** L. **Depende de:** IM-06/08/09.

- Reclamación condicional de la propuesta, clave única de intención/paso, propietario y vencimiento de la reclamación.
- Exclusión por ámbito afectado, incluyendo ambos extremos de movimientos; comprobar filas afectadas en cada transición.
- Coordinar web, CLI y workers, no confiar solamente en la concurrencia del workflow.
- Recuperar una reclamación vencida mediante reconciliación del estado, no reenviando a ciegas.

**Cierre:** R03 con PostgreSQL y procesos concurrentes produce una intención lógica; caída/reintento devuelve el resultado existente o deja la operación en reconciliación.

### IM-11 · Intención durable, incertidumbre y recuperación

**Etapa:** E03. **Responsable:** backend/DB + QA. **Tamaño:** L. **Depende de:** IM-09/10.

- Registrar la intención completa de un movimiento antes del primer envío.
- Persistir estado por paso: preparado, enviado, confirmado, desconocido y compensación pendiente/confirmada/fallida, según el contrato final.
- Distinguir perder respuesta del POST de perder una consulta posterior. Consultar ambos extremos y compensar desde estado confirmado.
- Reconciliador reiniciable para operaciones atascadas; congelar y escalar si no se puede determinar el resultado.
- Verificar compensaciones y no sobreescribir cambios humanos posteriores. “Revertida” requiere confirmación, no únicamente intentar el rollback.

**División recomendada:** intención/estados → reconciliación → compensación → pruebas de caída. **Cierre:** R04/R05 y fallos inyectados en cada frontera; no se pierde un paso ni se incrementa inadvertidamente el total por una recuperación incorrecta. No se promete exactamente una vez frente a un proveedor sin esa garantía.

### IM-12 · Límites proyectados y coordinación de acciones

**Etapa:** E03. **Responsable:** core + DB. **Tamaño:** L. **Depende de:** IM-08/10. El modelo de reservas se define aquí y lo reutiliza IM-20; no hace falta terminar experimentos para construirlo.

- Presupuesto resultante, capacidad reservada para órdenes en vuelo y límites por cuenta/entidad/ventana.
- Resolver jerarquía para no sumar campaña e hijos como presupuestos independientes.
- Arbitraje determinista de candidatos contradictorios y contexto actualizado después de aceptar cada uno.
- Leer congelamientos y cambios humanos en ámbitos relacionados; coordinar experimentos y pausas de seguridad.
- Separar “detener nuevas acciones del agente” de “detener anuncios que siguen gastando”. Definir cuándo exceso de candidatos es alerta o simple priorización.

**Cierre:** R11/R12 y concurrencia con varias propuestas/experimentos. No se rebasa el límite proyectado conjunto y cada bloqueo tiene razón y vigencia consultables.

### IM-13 · Cobertura, nulidad y calendario de negocio

**Etapa:** E04. **Responsable:** datos + core. **Tamaño:** L. **Depende de:** IM-06.

- Manifiestos por cuenta, intervalo, entidad/nivel y consulta: solicitado, recibido, completo/parcial/fallido, versión y última reconciliación.
- Contrato explícito de moneda, atribución, zona y latencia de cierre. MXN/zonas soportadas se declaran; cuentas incompatibles no se aceptan silenciosamente.
- Calendarios completos: cero confirmado, ausencia, valor indefinido y error se distinguen. Unificar la función de cierre y su margen con la ingesta que realmente la usa.
- Derivar horizonte de backfill de baselines y ventanas requeridas; recolección recurrente y carga histórica son procesos distintos.
- Validar respuestas, preservar raw no interpretable en cuarentena y preparar reconciliación de integridad.

**Áreas:** `agents/insights`, `agents/hourly`, `core/time`, DB y contratos de lectura. **Cierre:** R07/R19/R20 como casos de datos/calendario, pruebas de cobertura por entidad y muestra comparada con el proveedor bajo el mismo contrato cuando se autorice. Tener una fecha con una fila no acredita un día completo.

### IM-14 · Reexpresión, snapshots y paginación

**Etapa:** E04. **Responsable:** datos/DB. **Tamaño:** L. **Depende de:** IM-13.

- Reconciliar particiones solo después de terminar la descarga; manejar filas retiradas y versionar correcciones sin duplicar historial en reintentos.
- Orden total/cursor y corte estable; paginar listas de IDs y obtener conteos precisos.
- Separar entidad actual de observaciones históricas; `last_seen`, ausencia confirmada y ciclo de vida explícitos.
- Resolver consultas truncables del frontend con agregación/paginación real, no únicamente botones de página sobre un conjunto incompleto.

**Cierre:** extracción superior al límite del proveedor, páginas fallidas, filas desaparecidas y reexpresión repetida. No se declara cobertura total ni se borran datos por una descarga parcial.

### IM-15 · Eventos y reagrupado sin pérdida de referencias

**Etapa:** E04. **Responsable:** core + datos/DB. **Tamaño:** L. **Depende de:** IM-06/13.

- Checkpoints separados de descarga, normalización, agrupación y métricas; marca durable de reparación pendiente.
- Identidad/JSON canónicos y versiones del normalizador; eventos tardíos reprocesables.
- Plan transaccional de reagrupado y alias entre IDs antiguos/nuevos; contemplar anotaciones heredadas ancladas solo a grupos.
- Ante sucesor ambiguo, conservar referencias y emitir incidencia. No borrar primero para reparar después.

**Cierre:** R14/R15, permutación de claves, evento tardío y caída a mitad del proceso. Notas, experimentos y evaluaciones conservan referencia válida o archivada explícita.

### IM-16 · Trazabilidad completa de las acciones

**Etapa:** E03; integración con E04. **Responsable:** ejecución + datos. **Tamaño:** M. **Depende de:** IM-09/11/15.

- Enlazar propuesta, aprobación/corrección, ejecución, observación Meta, grupo y sesión.
- Reconocer acciones propias usando campos canónicos y cuenta/entidad/ventana; mantener coincidencias ambiguas como tales.
- Separar pasada de vigilancia de acción confirmada; no duplicar decisiones ni inventar contadores de cambios.

**Cierre:** R06 y replay raw → normalizado → ejecución. Se puede reconstruir quién propuso, aprobó, envió y confirmó sin inferirlo de una sola etiqueta de actor.

### IM-17 · Evaluaciones con evidencia suficiente

**Etapa:** E05. **Responsable:** core + responsable de criterio. **Tamaño:** L. **Depende de:** IM-13/14/16.

- Separar madurez temporal, cobertura, volumen, latencia y solidez de evidencia.
- Causas de referencia ausente basadas en datos de cobertura, no en suposiciones de negocio.
- Ventanas equivalentes, cortes por cuenta, composición del control y contaminación por otras intervenciones.
- Incorporar acciones confirmadas del agente; coherencia entre lectura, acuerdo, madurez y tono visual.
- Calibrar con un conjunto revisado y otro de validación. Hablar de resultados observados, no de causalidad o probabilidades no estimadas.

**Cierre:** R07 y casos de una referencia, contradicción, cuenta dominante, falta de filas, cambios simultáneos y día parcial. Cada veredicto explica por qué concluye o por qué todavía no puede concluir.

### IM-18 · Históricos y paquetes de evidencia inmutables

**Etapa:** E05. **Responsable:** analista + DB. **Tamaño:** L. **Depende de:** IM-06/17.

- Separar evaluación actual de consulta histórica “a fecha de”; claves por corte y versión.
- Guardar evidencia, transición y referencias transaccionalmente; idempotencia de cambios de veredicto.
- Vincular narrativa por hash a la evidencia exacta; invalidarla o versionarla si cambian cifras.
- Organizar reportes por cambios realizados, evaluaciones listas, revisiones de conclusiones y pendientes.

**Cierre:** R17/R18: crear un reporte antiguo no retrocede el estado actual, y nunca conviven cifras nuevas con narrativa anterior presentada como vigente.

### IM-19 · Narrativa verificable y coste controlado

**Etapa:** E05. **Responsable:** analista + ingeniería. **Tamaño:** M. **Depende de:** IM-18.

- Salida estructurada o Markdown seguro, referencias existentes y validación de cifras contra evidencia.
- Nombres/notas se tratan como datos no confiables; pruebas de instrucciones maliciosas. El modelo no recibe credenciales ni autoridad para saltar candados.
- Versionar prompt/modelo, distinguir terminación incompleta, fallback y ausencia de narrativa; medir consumo y fijar presupuesto aprobado.
- Comparar alternativas solo mediante reportes de referencia. La falta de llave o un fallo narrativo no detiene alertas críticas ni cálculo determinista.

**Cierre:** referencia inexistente, cifra alterada, salida truncada y fallo del proveedor se detectan; la interfaz conserva acceso a la evidencia y no publica una conclusión inventada.

### IM-20 · Dominio de experimentos y reservas

**Etapa:** E06. **Responsable:** core + DB + responsable de experimentación. **Tamaño:** L. **Depende de:** IM-12/17/18.

- Máquina de estados servidor con transición condicional, permisos, evaluación/versiones y motivo para excepciones.
- Registro/activación separados, hipótesis y baseline predeclarados; retrospectivos etiquetados como tales. Enmiendas fechadas en vez de sobrescrituras silenciosas.
- Criterios propios de ROAS/CPA, ventana, muestra y cobertura; impedir graduación prematura.
- Reservas atómicas por cuenta, límites diarios/totales y consumo real; conflictos entre experimentos y reglas explícitos.
- Graduación es decisión humana registrada; cualquier cambio de presupuesto posterior nace como propuesta normal.

**Cierre:** R08, activación concurrente, transición desde estado inválido y ampliación de ventana. Ningún experimento se inicia sin capacidad o se presenta retrospectivamente como predeclarado.

### IM-21 · Hoy como centro de decisiones

**Etapa:** E02. **Responsable:** frontend/producto. **Tamaño:** L. **Depende de:** IM-22/23; IM-04 para estados y permisos. Datos definitivos de IM-13/16/31.

- Cuatro KPI compactos y un bento con atención prioritaria, tendencia y actividad secundaria.
- Cuenta, periodo efectivo, modo, frescura y control del agente visibles; alertas ordenadas por impacto.
- Revisión de propuesta en panel con importe, diferencia, entidad, vigencia, evidencia y consecuencia real de confirmar.
- Fechas inequívocas y vacíos útiles; no instrucciones sobre fases de desarrollo ni reglas aún inexistentes.
- Estados con/sin propuestas, datos parciales, error, freno, simulada y resultado por confirmar. Los datos ficticios quedan exclusivamente en entorno demo/pruebas.

**Áreas:** `hoy/*`, tarjetas, KPI y componentes de decisión. **Cierre visual:** aprobación de Hoy con fixtures representativos en escritorio/móvil. **Cierre funcional:** datos reales conectados bajo contratos y permisos; cero ambigüedad entre aprobar y ejecutar. No habilitar escritura para obtener la aprobación estética.

**Avance local 2026-09-06:** [piloto implementado](docs/12-hoy-piloto-codex.md) con cuatro KPI deterministas, bento, revisión en panel, 13 estados y pruebas de teclado/móvil. Solo consume fixtures en Vite; la página Next y sus acciones heredadas no se sustituyeron en este corte. Pendientes aprobación visual, adaptador de lectura de IM-03/13/16/31 e integración segura. IM-21 no se da por cerrado.

**Avance posterior del mismo día:** la [integración de lectura real](docs/13-hoy-datos-reales-codex.md) sustituyó la presentación de `/hoy` en Next y conecta métricas, perfil, propuestas, decisiones, alertas, actividad, freno y corridas existentes. El laboratorio de fixtures sigue separado. Los controles reales continúan desconectados; permanecen pendientes aprobación visual, cobertura/frescura demostrable, asignación por cuenta y garantías del ejecutor. IM-21 sigue parcial.

### IM-22 · Sistema visual y componentes reutilizables

**Etapa:** E02. **Responsable:** diseño/frontend. **Tamaño:** M. **Depende de:** IM-01; puede empezar mientras se desarrolla E01.

- Aplicar la dirección documentada: superficies carbón, naranja para acción principal y violeta para agente/datos; evitar brillo generalizado.
- Tipografía legible, espaciado, radios, bordes, foco y movimiento reducido. Revisar azul literal en SVG y texto blanco sobre naranja.
- Componentes de botones, campos, avisos, tarjetas, KPI, badges y formularios con pendiente/error/guardado.
- Diccionario de microcopy y estados: identidad no equivale a éxito; una nota no equivale a una restricción ejecutable.
- Validación de componentes con textos largos, grandes importes, disabled, foco, carga y datos ausentes.

**Áreas:** `globals.css`, componentes compartidos y estilos de consumo. **Cierre:** tokens y patrones consistentes, contraste comprobado en estados reales, ninguna página obliga a reinventar botones o campos. No incorporar librerías por estética sin una necesidad verificada.

### IM-23 · Shell, navegación, fechas y autenticación visual

**Avance local 2026-09-06:** estructura pública/privada, seis destinos principales agrupados, menú móvil, cuenta/periodo compatible, retorno desde sesión, presets/validación temporal, metadata y estados de ruta implementados. [Evidencia y límites del cuarto corte](docs/11-shell-navegacion-codex.md). Sigue parcial: falta E2E Next/Auth de ensayo, canonicalizar cuentas predeterminadas y completar continuidad/filtros y contratos IM-13.

**Etapa:** E02. **Responsable:** frontend. **Tamaño:** L. **Depende de:** IM-03/05/22 y contrato temporal IM-13 para integración.

- Agrupar Operación, Análisis y Administración, con seis destinos cotidianos y permisos coherentes.
- Preservar cuenta/periodo compatible, filtros y retorno; mantener rutas existentes y enlaces profundos.
- Corregir presets controlados, límites de fechas, validación servidor y salto de foco del calendario. Hoy puede tener ventana fija, pero no aparentar que un selector modifica algo que no modifica.
- Separar login y shell privado; etiquetas, sesión expirada, destino de retorno y errores recuperables.
- Menú móvil accesible, metadata por pantalla y estados de carga/error/no encontrado.

**Cierre:** 7 → 30 días, Atrás/Adelante, cambio de cuenta, login desde detalle y navegación por teclado funcionan sin pérdida ni mezcla de contexto.

### IM-24 · Anuncios y revisión de creativos

**Etapa:** E07. **Responsable:** frontend + backend de consultas. **Tamaño:** M. **Depende de:** IM-14/22/23.

- Tabla inicial de seis columnas, búsqueda contextual, filtros reales de pendientes y conteos fiables.
- Panel con creativo ampliado, fallback de imagen, métricas e historial de revisión; quitar formularios abiertos por fila.
- Registrar revisión con fecha, motivo/categoría útil y siguiente revisión cuando proceda; conservar filtros/página al volver.
- Mostrar alcance y muestra del ranking; distinguir activos actuales del conjunto histórico.

**Cierre:** encontrar/revisar un anuncio sin perder contexto; listas grandes completas/paginadas, imágenes rotas recuperables y controles accesibles. La memoria creativa avanzada se reserva a IM-39, no se simula aquí.

### IM-25 · Gráficas precisas, adaptables y accesibles

**Etapa:** E07. **Responsable:** frontend + datos. **Tamaño:** L. **Depende de:** IM-13/22.

- Escala temporal real o calendario densificado, valores nulos, marcas enlazadas, referencias/objetivos y leyendas uniformes.
- Formateador único de unidades, precisión, porcentaje y moneda; gasto no se pinta favorable solo por bajar.
- Interacción pointer/teclado y alternativa tabular; corregir coordenadas, tooltips, ticks y texto al adaptar SVG.
- Casos cero/un punto/todos nulos, huecos, extremos, múltiples cambios y día parcial.

**Áreas:** `TimeSeries`, `Sparkline`, `Kpi`, `format` y marco de gráfica. **Cierre:** mismo dato y significado en KPI, gráfica, tooltip y tabla; valor consultable sin ratón y sin texto ilegible en móvil.

### IM-26 · Rendimiento, Aprendizajes y Horarios

**Etapa:** E07. **Responsable:** frontend + analista. **Tamaño:** L. **Depende de:** IM-14/17/18/23/25.

- Cuenta → Rendimiento: KPI del periodo efectivo y una métrica principal con comparación equivalente; no repetir tres grandes gráficas por defecto.
- Análisis → Aprendizajes: síntesis de hallazgos, ventanas por madurez, contradicciones visibles, historial y referencias navegables.
- Horarios: cobertura primero, bloques comparables y detalle de 168 celdas opcional; rango convertido recortado correctamente.
- Evitar mejores/peores repetidos y distinguir cero, falta de cobertura y muestra insuficiente. No inferir causalidad mediante título o color.

**División recomendada:** un PR por pantalla después del componente de gráfica. **Cierre:** cambiar rango y abrir evidencia conserva contexto; tono/veredicto coinciden; una narrativa vieja no acompaña evidencia nueva como si fuera vigente.

### IM-27 · Bitácora, sesión e historial de decisiones

**Etapa:** E07. **Responsable:** frontend + datos. **Tamaño:** L. **Depende de:** IM-14/15/16/18/22/23.

- Cronología centrada en cambios, agrupación de vacíos confirmados, filtros efectivos y conteo real de notas.
- Sesión: qué cambió/antes-después primero; autor, motivo y anotaciones después; datos técnicos desplegables.
- Historial de propuesto, corregido, enviado y observado; enlaces desde alertas a incidentes concretos.
- Anotaciones con autor/fecha, recuperación al fallar y protección de texto sin guardar. Exportación acotada solo con datos autorizados.

**Cierre:** un cambio se reconstruye de punta a punta y se puede documentar sin perder notas o filtros. Nunca se rellena un tramo truncado del historial con “sin cambios”.

### IM-28 · Experimentos: creación guiada y borradores

**Etapa:** E06. **Responsable:** frontend. **Tamaño:** M. **Depende de:** IM-20/22/23.

- Mostrar activos/listos/borradores antes del formulario; creación en hipótesis/alcance → criterios/límites → revisión.
- Guardado parcial sin que `required` del inicio impida guardar un borrador; edición por ID, reanudación y enmiendas.
- Unidades y validaciones visibles, protección de cambios y cancelación con significado inequívoco.
- Progreso de días/compras frente a criterios, no porcentaje ficticio de probabilidad de éxito.

**Cierre:** una persona guarda, reabre, completa y evalúa un experimento; el servidor valida transiciones y la interfaz no presenta un registro retrospectivo como test predeclarado.

### IM-29 · Pipeline por etapas y política de reintentos

**Etapa:** E08. **Responsable:** agentes/plataforma. **Tamaño:** L. **Depende de:** IM-07/13; integra IM-08/11/17/19.

- Resultado por cuenta/etapa y global `ok/degraded/failed`, con código de salida y trazas correlacionadas.
- El grafo de dependencias permite observación crítica aunque falle narrativa, pero bloquea propuestas/escrituras si falta su evidencia.
- Reintentos de lectura acotados por clase de error, tiempo y páginas; validar destinos de paginación.
- No reutilizar un retry genérico de GET para un POST con resultado desconocido; ese caso pertenece al reconciliador.

**Cierre:** un fallo de insights no deja operar con datos antiguos; fallo de una cuenta no oculta su estado ni impide observar las demás; una narrativa fallida no suprime avisos críticos.

### IM-30 · Notificaciones recuperables

**Etapa:** E08. **Responsable:** agentes + DB. **Tamaño:** M. **Depende de:** IM-06/07 y eventos de IM-11/29.

- Outbox con reclamación temporal, intentos, próximo reintento, error y cola de fallos permanentes.
- Despacho independiente, prioridad de críticos y recordatorios pertinentes; no esperar a que termine todo el pipeline para avisar de un incidente grave.
- Fragmentar mensajes y manejar límites/429 sin romper escape/HTML. Deduplicar intenciones sin impedir reintentos.
- Destino autorizado y contenido mínimo; ensayar con transporte falso antes de una prueba de canal aprobada.

**Cierre:** R13, timeout, envío atascado y error permanente son recuperables/visibles. La entrega puede ser al menos una vez; no prometer ausencia absoluta de duplicados tras una respuesta perdida.

### IM-31 · Vigilancia, Estado y procedimientos de incidente

**Etapa:** E08. **Responsable:** operaciones + frontend. **Tamaño:** L. **Depende de:** IM-13/22/29/30.

- Vigilar frescura y slots esperados desde un observador independiente del collector; fijar tolerancias con el dueño de operación.
- Estado por cuenta/componente con última finalización válida, atraso, cobertura, órdenes inciertas, versión y siguiente acción.
- Medir continuidad real para “semana en solitario”; separar previsualización sin red de envío de reportes y deduplicar hitos por clave.
- Runbooks: token inválido, DB inaccesible, cuota, ingesta parcial, reagrupado bloqueado, resultado desconocido, compensación fallida y credencial expuesta.
- Logs y estadísticas técnicas a un clic; una zona distinta no es fallo y “fuera de las últimas 30 filas” no significa “nunca”.

**Cierre:** R16 y caída deliberada del proceso en ensayo generan detección externa; el responsable encuentra qué pasó y qué hacer sin improvisar cambios de presupuesto.

### IM-32 · Respaldo, restauración y retención

**Etapa:** E08. **Responsable:** DB/operaciones. **Tamaño:** M. **Depende de:** IM-06/07; antes de cambios materiales en datos existentes.

- Acordar pérdida de datos y tiempo de recuperación tolerables; comprobar disponibilidad real del respaldo, no asumirla por el plan contratado.
- Restaurar a un entorno separado y verificar notas, perfiles, reglas, aprobaciones, ejecuciones e históricos.
- Política de retención por tipo de dato, crecimiento medido y borrados solo sobre alcance aprobado.
- Procedimiento de recuperación de app, DB y jobs; no mezclar revertir un despliegue con revertir una operación externa.

**Cierre:** restauración ensayada, resultados y tiempos registrados, responsable definido. Tener una exportación sin haberla restaurado no cierra el bloque.

### IM-33 · Mantenibilidad y rendimiento medidos

**Etapa:** E08, por cambios incrementales durante otras etapas. **Responsable:** ingeniería. **Tamaño:** M. **Depende de:** IM-02/14 y mediciones de las rutas afectadas.

- Separar carga de contexto, validación, reclamación, envío, reconciliación y representación después de fijar regresiones.
- Tipado y manejo de errores consistentes; lint/formato y reglas contra promesas ignoradas.
- Agregar/paginar en servidor, índices guiados por consultas/planes reales, caché ligada a versión de datos y deduplicación de recomputaciones.
- Medir latencia, volumen soportado, memoria, JavaScript y consultas antes/después; mantener Server Components donde aportan valor.

**Cierre:** no hay regresión de invariantes y se documenta una mejora o un presupuesto de rendimiento verificado. No se agregan servicios, caches o particiones solo por anticipar escala hipotética.

### IM-34 · QA transversal y validación visual

**Etapa:** E09; pruebas por componente desde E02. **Responsable:** QA + frontend/producto. **Tamaño:** L. **Depende de:** todas las pantallas y contratos que se liberarán.

- Matriz de las 12 rutas × roles × estados relevantes; desktop, tablet, móvil, teclado y tacto.
- Anchos 360/390/768/1024/1280/1440, zoom 200%, contraste sobre fondos finales, foco, lector de pantalla y movimiento reducido.
- Regresión de fechas/contexto, error/vacío, doble envío, retorno de panel y borradores.
- Ronda cualitativa con cinco participantes: identificar cuenta/periodo, encontrar una tarea, explicar el efecto de aprobar, revisar anuncio y reabrir experimento.
- Capturas nuevas sintéticas/anonimizadas; registrar defectos con reproducción y no aprobar solo el caso ideal.

**Cierre:** no hay ambigüedad sobre consecuencias financieras ni barreras en tareas principales; cualquier limitación residual queda documentada. La aprobación estética no sustituye las pruebas funcionales.

### IM-35 · Una primera regla completa y shadow mode

**Etapa:** E09; especificación puede empezar en E00. **Responsable:** criterio de negocio + core/agentes. **Tamaño:** L. **Depende de:** criterio confirmado, IM-08 a IM-19, IM-29/31 y contexto pertinente de IM-38.

- Transcribir una regla concreta del responsable: datos requeridos, condiciones, casos positivos/negativos, excepciones, acción, vigencia y límites.
- Implementar `generateCandidates` para esa regla, con evidencia y descarte explicable; no inventar umbrales ni activar todos los tipos a la vez.
- Replay histórico usando solo información disponible al decidir. Si el historial no permite reconstruirla, declarar esa limitación y recoger shadow prospectivo.
- Modo sombra: registrar propuestas sin enviar, revisar errores, falsos positivos, correcciones y conflictos.
- Simulaciones completas con fallos inyectados. Cumplir la duración mínima acordada de simulación —el pendiente histórico pide dos semanas— sin tratar el paso del tiempo como suficiente por sí solo.

**Cierre:** cada candidato tiene explicación y se comprueba el camino criterio → evidencia → propuesta → revisión → simulación. Un contador de entidades examinadas no demuestra una regla operativa.

### IM-36 · Autonomía por versión de regla

**Etapa:** E10. **Responsable:** dueño de operación + core/seguridad. **Tamaño:** L. **Depende de:** IM-37 y evaluación suficiente de la versión candidata.

- Separar aprobaciones, simulaciones, ejecuciones confirmadas y resultados evaluados; asociar evidencia a versión de regla/perfil.
- Requisitos de promoción: cobertura, exposición, correcciones, incidentes y resultados; racha de aprobaciones solo como una señal.
- Límites por cuenta/regla, período de gracia si se acuerda, freno y degradación automática ante datos obsoletos, cambios de regla o incidentes.
- Ensayar promoción/degradación en prueba antes de habilitar una regla real. Cambiar una versión invalida evidencia incompatible.

**Cierre:** promoción explícita y auditable, simulación de incidentes y retorno a semi/off verificado. No hay expansión automática a otras cuentas por haber funcionado una regla.

### IM-37 · Piloto limitado y medición del valor

**Etapa:** E09. **Responsable:** Jeshua + operador + ingeniería/QA. **Tamaño:** L. **Depende de:** IM-20/21/29 a IM-35/38 y puertas de liberación de la sección 6.

- Primero piloto de lectura/simulación; después, solo con aprobación específica, una cuenta, una regla/version, whitelist e importes limitados.
- Primer experimento genuinamente predeclarado; revisar si otras intervenciones contaminan su evaluación.
- Medir tiempo de revisión, cambios con motivo, cobertura, correcciones/rechazos, órdenes desconocidas, incidentes, coste y resultados por versión.
- Mantener persona responsable durante la primera ejecución y capacidad de detener al agente; reconciliar/evaluar el resultado después.
- Decisión documentada de continuar, corregir o detener. Un ROAS global favorable no demuestra el beneficio causal del agente.

**Cierre:** recorrido completo probado y evaluación humana registrada. “Piloto real completado” solo se marca después de una operación autorizada realmente confirmada y revisada; sin autorización queda pendiente esa subetapa, no se finge completitud.

### IM-38 · Contexto de negocio y onboarding

**Etapa:** E06; definición mínima desde E00. **Responsable:** producto + frontend/core. **Tamaño:** M. **Depende de:** IM-03/04/13/22/23; condiciones ejecutables pasan por IM-08.

- Cuenta, moneda/zona, permisos, límites, lista blanca y modo en un recorrido corto con validación de completitud.
- Contexto con dueño/vigencia: promociones, objetivo, restricciones de inventario y quién autoriza excepciones.
- Distinguir información para interpretar de una condición ejecutable probada. No usar notas en un prompt como control de dinero.
- Demo separada con propuesta sintética para practicar aprobar/corregir/rechazar sin permisos de escritura.

**Cierre:** una persona nueva completa el recorrido y entiende modo/límites; una promoción o restricción acordada se refleja en análisis y, si corresponde, en un bloqueo probado.

### IM-39 · Memoria creativa

**Etapa:** E11. **Responsable:** producto + operador creativo. **Tamaño:** M. **Depende de:** IM-24/37 y decisión de prioridad frente a otras mejoras.

- Vincular creativo/versiones, formato, ángulo, hook, audiencia, hipótesis, revisión y evidencia del resultado.
- Búsqueda de aprendizajes bajo condiciones comparables; conservar descartes y limitaciones, no solo ganadores.
- No incluir generación/publicación automática de imágenes o anuncios en esta entrega. Requeriría un alcance posterior separado.

**Cierre:** responder qué se probó, qué se aprendió y con cuánta evidencia sin revisar notas dispersas. No etiquetar un ángulo como ganador universal.

### IM-40 · Economía de negocio y expansión: decisión explícita

**Etapa:** E11. **Responsable:** dueño de producto + datos/seguridad. **Tamaño:** S para especificación; implementación por estimar. **Depende de:** IM-37 y decisión de ampliar alcance.

- Mantener ingresos atribuidos por Meta y explicar qué incluye el margen; estas etiquetas se corrigen ya en E02/E07, no esperan esta ampliación.
- Si se decide medir ventas netas/beneficio, diseñar contrato de pedidos, devoluciones, descuentos, costes y solapamiento entre canales antes de elegir integración.
- Respetar la decisión existente de no integrar Shopify. Reintroducirlo, añadir otros canales, multiempresa o facturación requiere una aprobación nueva y un sub-roadmap propio.
- Para SaaS público, revisar aislamiento por organización, permisos, privacidad, soporte y operación como proyecto específico; la apariencia SaaS no implica esas capacidades.

**Cierre:** decisión documentada: mantener alcance Meta o aprobar una ampliación con fuentes, responsables, presupuesto y criterios de éxito. Una ampliación descartada se marca fuera de alcance, no “implementada”. Si se aprueba, se agregan sus tareas y pruebas antes de desarrollarla.

## 5. Primeras entregas y orden real de trabajo

### Entrega A — Base segura y primer resultado visual

Orden sugerido dentro del primer ciclo:

1. IM-01: fijar base, contratos, alcance y estado real de capacidades.
2. IM-02: fixtures sintéticos y regresiones iniciales de permisos, fechas y ejecución. Ampliar CI/migraciones con IM-06.
3. IM-03 + parte urgente de IM-04: acceso, política y textos veraces; cubrirlos con pruebas antes de embellecer los botones.
4. IM-06/07: base de migraciones, entorno y revisión de dependencias, coordinada con los contratos que consumirán los siguientes bloques.
5. IM-22: tokens y componentes; puede avanzar desde IM-01 mientras se resuelve backend.
6. IM-23: navegación/fechas/login; IM-21: Hoy con fixtures y sin capacidad de escritura real.

**Resultado que se puede enseñar:** Hoy carbón/naranja/violeta, navegación clara, periodo correcto y estados realistas. **Resultado técnico:** una base que permite trabajar sin usar credenciales productivas para demostrar cada cambio.

No es necesario esperar todas las decisiones de negocio para llegar aquí. Sí se necesita un navegador disponible antes de declarar el resultado visual validado.

### Entrega B — Núcleo íntegro

Construir motor IM-08 a IM-12 y datos IM-13 a IM-15 en ramas coordinadas. Integrar IM-16, luego IM-17 a IM-20. Arrancar operación IM-29/30 y planificación de restauración IM-32 desde que existan sus contratos, no al final.

**Resultado:** los fallos conocidos se vuelven regresiones y las decisiones se apoyan en datos completos o se bloquean con causa.

### Entrega C — Producto premium completo

Extender patrones aprobados a IM-24 a IM-28, terminar presentación de Configuración/Equipo/Estado y añadir onboarding IM-38. Completar notificaciones, observador, procedimientos y rendimiento IM-29 a IM-33.

**Resultado:** las doce pantallas coherentes y un flujo completo de lectura, revisión, experimento y diagnóstico, todavía sin obligación de activar dinero real.

### Entrega D — Regla validada y piloto

IM-34/35/37: QA, criterio confirmado, replay, shadow, evaluación y piloto real únicamente después de autorización. Los tests y revisiones acompañan todo el trabajo anterior; esta entrega consolida y prueba el conjunto.

### Entrega E — Autonomía y expansión

IM-36 cuando la versión de una regla haya reunido evidencia suficiente y se autorice. IM-39/40 según valor demostrado y alcance elegido; no son prerequisitos para un piloto de Meta confiable.

## 6. Puertas de liberación

### G0 — Listo para desarrollar sin tocar producción

- [ ] Fixtures disponibles y red real bloqueada en tests de ejecución. DB de ensayo aislada antes de iniciar integración SQL; los tests puros pueden arrancar antes.
- [ ] Estado de cada hallazgo revalidado o marcado como pendiente de comprobación.
- [ ] Contratos mínimos y matriz de permisos acordados; secretos ausentes de artefactos.

### G1 — Listo para entregar lectura y diseño

- [ ] Acceso por cuenta/rol probado; no exposición por rutas directas o sesión revocada.
- [ ] Error, falta de cobertura y actividad cero se distinguen.
- [ ] Diseño aprobado con datos representativos; fechas, teclado y móvil verificados.
- [ ] La app no afirma capacidades inexistentes ni permite una aprobación financiera ambigua.

### G2 — Listo para simular el circuito completo

- [ ] Todos los P0 de las dos auditorías cerrados para el circuito afectado, con pruebas enlazadas.
- [ ] Política revalidada al ejecutar, contexto de aprobación inmutable y precondiciones vivas.
- [ ] Exclusión/idempotencia probadas con PostgreSQL y más de un proceso.
- [ ] Intención completa, estados desconocidos y recuperación tras crash ensayados.
- [ ] Límites proyectados, reservas, jerarquía, congelamientos y experimentos coordinados.
- [ ] Simulación etiquetada como simulación; no se confunde con confirmación de Meta.

Cerrar estos P0 **no basta** para dinero real: también se requieren los bloqueos P1 pertinentes de cobertura, avisos, atribución y operación. El número de prioridad no reemplaza el análisis de riesgo del flujo.

### G3 — Listo para solicitar piloto real

- [ ] G0/G1/G2 aprobadas; R01–R20 y regresiones posteriores cubiertas.
- [ ] Datos actuales completos/recientes, atribución y campos de confirmación contrastados con el proveedor en un entorno autorizado.
- [ ] Regla y versión confirmadas; shadow revisado, sin usar datos futuros en replay.
- [ ] Criterios de tiempo/muestra y duración mínima de simulación acordados y cumplidos; sin convertir “dos semanas” en una garantía automática.
- [ ] Alertas críticas probadas, responsable disponible y runbooks/recuperación ensayados.
- [ ] Respaldo/restauración comprobados; cambios desplegados identificados por versión.
- [ ] Credencial de escritura de alcance mínimo y separación del acceso de administración verificadas, sin exponer secretos.
- [ ] Jeshua autoriza expresamente cuenta, regla/versiones, entidades, importe/exposición máximos, ventana y persona de supervisión.

**La puerta G3 prepara una solicitud de habilitación. No apaga `dry_run` por sí sola.** El checklist en verde tampoco es permiso general para escribir en otras cuentas.

### G4 — Listo para autonomía de una regla

- [ ] Piloto real confirmado y evaluado; resultados por versión y calidad de evidencia suficientes.
- [ ] Incidentes, correcciones y resultados desconocidos considerados, no solo aprobaciones.
- [ ] Exposición, gracia, freno y degradación verificados.
- [ ] Habilitación expresa de esa regla/cuenta, con observación y reversión de modo disponibles.

## 7. Pruebas de aceptación: mapa mínimo

| Familia | Bloques principales | Evidencia exigida |
| --- | --- | --- |
| Autorización/política | IM-03/04/05/08 | No miembro, rol inferior, cuenta cruzada, propuesta editada/antigua y fallo de lectura; cero efectos no autorizados |
| Órdenes/concurrencia | IM-09/10/12 | R01–R03, R09–R12, dos aprobadores/workers y reservas simultáneas en DB real de ensayo |
| Recuperación | IM-11/16 | R04–R06; caída antes/después de DB/POST/relectura/compensación y reanudación sin inventar éxito |
| Datos/bitácora | IM-13/14/15 | R14/R15/R19/R20; páginas incompletas, reexpresión, null/cero, medianoche, notas heredadas y orden de JSON |
| Evaluación/experimentos | IM-17/18/20 | R07/R08/R17/R18; muestra, corte, contradicción, histórico, enmienda y transición concurrente |
| Narrativa | IM-19 | IDs inexistentes, cifras alteradas, instrucción en un nombre, corte de salida, cambio de evidencia y caída del proveedor |
| Operación/avisos | IM-29/30/31/32 | R13/R16; cuenta fallida, collector ausente, outbox atascado, 429, restauración y pérdida de credencial |
| Frontend | IM-21 a IM-28, IM-04/05/31/34/38 | Las 12 rutas; estados de carga/vacío/error/parcial/sin permisos; teclado, móvil, importes largos y borradores |
| Producto | IM-35/37/36 | Replay sin información futura, shadow, piloto autorizado y promoción/degradación por versión |

Los IDs R01–R20 corresponden al anexo de reproducciones de `mejorasCodex.md`. Varias se comparten entre bloques: la prueba de datos incompletos debe proteger tanto cálculo como presentación y autorización.

Comandos locales existentes útiles para la base, **no ejecutados por crear este roadmap**:

```powershell
pnpm --filter @agentes-meta/core test
pnpm -r typecheck
pnpm --filter @agentes-meta/web build
```

Ya existen pruebas web y `pnpm --filter @agentes-meta/db test:integration` en PostgreSQL efímero. El alias `db:migrate` tiene runner y por defecto solo prepara/consulta un plan; su uso y la adopción histórica pendiente están en [el segundo corte](docs/09-configuracion-transaccional-codex.md). Faltan las suites restantes de IM-02/34 y certificar el entorno real. `collector`, `analyst`, `--force` y scripts de backfill pueden escribir o enviar: no son pruebas inocuas de lectura.

## 8. Forma de trabajar y definición de terminado

### PRs y secuencia dentro de cada bloque

1. Contrato y prueba que demuestra el defecto o el resultado esperado.
2. Migración compatible, cuando corresponda, con diagnóstico de datos heredados.
3. Implementación y pruebas de error/concurrencia, no solo camino feliz.
4. Integración de UI con contratos reales y permisos.
5. Evidencia de validación, actualización del estado y preparación de despliegue.

Separar presentación, lógica financiera y migración cuando mezclarlo dificulte revisión. IM-11, IM-13, IM-20 e IM-26 no deberían convertirse en un único PR cada uno si eso impide inspeccionar sus garantías. Mantener compilación y compatibilidad entre pasos; no conservar una API insegura por comodidad durante la transición.

### Un bloque se cierra cuando

- [ ] Todos sus IDs primarios tienen resolución, prueba o decisión de alcance explícita; no se cierra por arreglar solo el título del problema.
- [ ] Casos positivos, negativos y de fallo pertinentes están automatizados o tienen validación manual reproducible justificada.
- [ ] Migración/contrato y documentación están actualizados; no se perdieron datos ni permisos.
- [ ] UI, cuando exista, fue validada con estados reales/sintéticos representativos y no solo captura feliz.
- [ ] Se registran PR/commit, pruebas, captura/log no sensible y limitaciones.
- [ ] Se distingue completado en desarrollo, verificado en ensayo, desplegado y habilitado.

Estados de seguimiento: **pendiente → en desarrollo → en validación → implementado y probado**. Despliegue y habilitación son columnas separadas. Si se descarta una ampliación opcional, usar **fuera de alcance por decisión**, con fecha y responsable.

Plantilla de seguimiento para cada bloque:

| Campo | Qué registrar |
| --- | --- |
| ID y etapa | `IM-xx`, `Exx` |
| Responsable | Persona designada; no asumir disponibilidad |
| Estado | Uno de los estados anteriores |
| Referencias | IDs de la matriz de cobertura |
| Entrega | PR/commit y módulos modificados |
| Evidencia | Tests, casos de fallo, capturas anonimizadas y validación |
| Desplegado | No / entorno y versión |
| Habilitado | No / alcance aprobado y quién lo autorizó |
| Pendiente/bloqueo | Dato o decisión concreta, sin “falta todo” genérico |

### Estimación y capacidad

No asigno fechas de entrega sin conocer capacidad, acceso a ensayo y número de revisores. El orden y las condiciones de salida ya permiten iniciar; al cerrar E00 se estima cada PR, se identifica responsable y se fija calendario por Entregas A–E.

La duración total no se obtiene sumando indiscriminadamente bloques paralelizables ni suponiendo que todas las fases son de un día. El seguimiento debe medir resultados verificados, defectos abiertos por riesgo y dependencias resueltas, no líneas de código o pantallas repintadas.

## 9. Decisiones necesarias, y cuándo hacen falta

No son bloqueos para escribir el roadmap ni para toda la implementación. Cada una frena solo la parte que depende de ella.

| Decisión/acceso | Responsable propuesto | Necesario antes de | Mientras tanto se puede avanzar |
| --- | --- | --- | --- |
| Privado o público saneado; licencia si aplica | Jeshua | Publicación/saneamiento y cambios remotos IM-07 | Diagnóstico local y fixtures sintéticos |
| Matriz de permisos y capacidad de cambiar política | Jeshua/administración | Cierre de IM-03/04/05 | Proponer matriz, escribir tests y bloquear acciones no autorizadas |
| Entorno DB de ensayo y restauración | Ingeniería + dueño de infraestructura | Integración/migración sobre datos existentes | Tests puros y diseño de migraciones |
| Navegador/entorno UI de prueba | Equipo de desarrollo | Aprobación visual E02 y cierre IM-34 | Código, componentes y fixtures; no declarar QA interactivo realizado |
| Fuente/atribución, zona, moneda y latencia válidas | Dueño de datos/operación | Cierre IM-13 y decisiones basadas en esas métricas | Modelado de cobertura y pruebas temporales |
| Regla inicial, umbrales y excepciones | Eduardo o responsable designado + Jeshua | Cierre IM-35 | Seguridad, datos, UX y especificación del contrato de reglas |
| Canal/destino de avisos y responsable de guardia | Jeshua/operación | Prueba real de IM-30/31 y G3 | Outbox y simulación de fallos |
| Credenciales mínimas y autorización de piloto | Jeshua | Dinero real, después de G3 | Toda lectura, simulación y shadow sin envío |
| Versión elegible y límites de autonomía | Jeshua + operador | IM-36 habilitado | Máquina de promoción/degradación en pruebas |
| Memoria creativa, beneficio neto, SaaS u otros canales | Jeshua/producto | E11 según ampliación | Terminar el producto Meta sin expandir su alcance |

No pedir ni pegar secretos en el chat para resolver estas decisiones. Usar el mecanismo seguro del entorno cuando corresponda.

## 10. Matriz completa de cobertura

Cada referencia tiene **un bloque primario responsable de cerrarla**. Otros bloques pueden colaborar o depender de ella; esa colaboración no duplica el conteo. Las prioridades de las auditorías se conservan: si difieren por solapamiento, aplicar el riesgo mayor al flujo afectado y no rebajarlo por su etiqueta visual.

La tabla enumera todos los IDs explícitamente para comprobar omisiones y duplicados. “—” significa que ese bloque agrupa únicamente hallazgos de la otra auditoría.

| Bloque | Etapa | Auditoría general | Auditoría frontend |
| --- | --- | --- | --- |
| IM-01 | E00 | T12, P01 | — |
| IM-02 | E00 | T01, T02, T03 | — |
| IM-03 | E01 | A01, A03, A05, U04 | V-I04 |
| IM-04 | E01 | A02, U07, U15 | V-H02, V-H03, V-F01, V-F02, V-F03, V-F04, V-E05 |
| IM-05 | E01 | A06, A07, A08, A09 | V-U01, V-U02, V-U03 |
| IM-06 | E01 | T05, T06, T07 | — |
| IM-07 | E01 | A04, T04, T10, T11, O12 | — |
| IM-08 | E03 | S01, S02, S03, S13, S14, S15 | — |
| IM-09 | E03 | S11, S12 | — |
| IM-10 | E03 | S04 | — |
| IM-11 | E03 | S05, S06, S07 | — |
| IM-12 | E03 | S08, S09, S10, S16 | — |
| IM-13 | E04 | D01, D02, D03, D05, D13, D14, U06 | — |
| IM-14 | E04 | D04, D08, D12, U03 | — |
| IM-15 | E04 | D06, D07, D09, D10 | — |
| IM-16 | E03 | S17, D11 | — |
| IM-17 | E05 | E01, E02, E03, E04, E05, E08, E09, E13 | — |
| IM-18 | E05 | E06, E07, E10, E12 | — |
| IM-19 | E05 | E11, T13 | — |
| IM-20 | E06 | X01, X02, X03, X05, X06, X07 | — |
| IM-21 | E02 | P05 | V-H01, V-H04, V-H05, V-H06 |
| IM-22 | E02 | — | V-G01, V-G02, V-G03, V-G04, V-G08, V-G09, V-G10, V-G11, V-G12, V-I03, V-I05 |
| IM-23 | E02 | U01, U02, U05 | V-G05, V-G06, V-G07, V-I01, V-I02, V-I06, V-L01, V-L02, V-L03 |
| IM-24 | E07 | U13 | V-A01, V-A02, V-A03, V-A04, V-A05 |
| IM-25 | E07 | U11 | V-D01, V-D02, V-D03, V-D04, V-D05, V-D06, V-D07, V-D08 |
| IM-26 | E07 | U09, U14 | V-C01, V-C02, V-C03, V-C04, V-N01, V-N02, V-N03, V-N04, V-R01, V-R02, V-R03, V-R04 |
| IM-27 | E07 | U08, U10 | V-B01, V-B02, V-B03, V-B04, V-S01, V-S02, V-S03, V-S04 |
| IM-28 | E06 | X04 | V-E01, V-E02, V-E03, V-E04 |
| IM-29 | E08 | O01, O08, O09 | — |
| IM-30 | E08 | O03, O04, O05 | — |
| IM-31 | E08 | O02, O06, O07, O10 | V-T01, V-T02, V-T03 |
| IM-32 | E08 | O11 | — |
| IM-33 | E08 | T08, T09 | — |
| IM-34 | E09 | U12 | — |
| IM-35 | E09 | P02 | — |
| IM-36 | E10 | S18 | — |
| IM-37 | E09 | P08 | — |
| IM-38 | E06 | P03, P06 | — |
| IM-39 | E11 | P04 | — |
| IM-40 | E11 | P07 | — |

## 11. Siguiente acción recomendada

El inicio de **IM-01/02/03/04** y los pilotos de **IM-22/23/21** ya tienen avances locales, no cierres completos. El siguiente paso es revisar con Jeshua el [piloto de Hoy](docs/12-hoy-piloto-codex.md) y construir su adaptador de lectura con permisos, errores explícitos, calendario, consultas completas, cobertura/frescura y estados de decisión verificables (**IM-03/13/16/31**). Integrar primero en lectura, sin conectar el nuevo formulario al ejecutor heredado.

En paralelo al lenguaje visual, construir la base SQL y las garantías de ejecución/datos. El punto de integración es una propuesta que se entiende, se autoriza correctamente, se confirma sin ambigüedad y deja evidencia evaluable.

El criterio de éxito del roadmap es **una herramienta visualmente terminada y operativamente confiable, con el recorrido completo de decisión probado**.
