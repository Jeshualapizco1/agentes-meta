# Inicio de implementación: acceso y base de pruebas

Fecha: 5 de septiembre de 2026. Base anterior a estos cambios: `3ccb9f4`.

> Registro histórico del primer corte. El avance posterior de perfiles transaccionales, migraciones y PostgreSQL se documenta en [el segundo corte](09-configuracion-transaccional-codex.md); sus resultados actualizan los pendientes y recuentos siguientes sin reescribir esta evidencia inicial.

Seguimiento del [roadmap maestro](../roadmapImplementacionCodex.md). Esta entrega inicia IM-01/02/03/04 y adelanta correcciones pequeñas de IM-05/23. **No cierra ninguno de esos bloques completos. No se desplegó ni se habilitaron escrituras en Meta.**

## 1. Alcance de producto y límites de esta entrega

Se mantienen tres trabajos: explicar cambios y resultados observados; registrar/evaluar experimentos; proponer y ejecutar ajustes autorizados con trazabilidad. No se agregan reglas de negocio, canales, Shopify, facturación, multiempresa ni una nueva identidad visual en esta entrega.

Se implementa una barrera común de membresía y rol, una primera suite web offline y correcciones inmediatas de configuración/mensajes. Se conserva la estructura `core/meta/db/agents/web` y el proveedor de narrativa existente.

No se ejecutaron collector, analyst, backfills, migraciones, envío de Telegram ni solicitudes a Meta/Supabase de producción. No se leyeron valores de `.env`, se cambiaron credenciales o se incluyó el archivo de texto ajeno al trabajo.

## 2. Contrato de acceso aplicado

| Capacidad | Sin sesión / no miembro / rol desconocido | Buyer vigente | Admin vigente |
| --- | --- | --- | --- |
| Leer pantallas de negocio | Denegada | Permitida bajo el alcance global existente | Permitida bajo el alcance global existente |
| Anotar, revisar anuncio y operar registros de experimentos | Denegada | Se conserva el permiso existente | Permitida |
| Aprobar/rechazar propuestas | Denegada | Se conserva el permiso existente; las garantías del ejecutor siguen pendientes | Permitida, con las mismas limitaciones del ejecutor |
| Activar el freno del agente | Denegada | Permitida | Permitida |
| Liberar el freno | Denegada | Denegada | Permitida con razón |
| Modificar configuración de cuenta | Denegada | Solo consulta | Permitida |
| Gestionar usuarios | Denegada | Denegada | Permitida |
| Guardar `mode=auto` desde Configuración | Denegada | Denegada | Denegada: modo no habilitado |

Reglas implementadas:

- La identidad procede de `auth.getUser()`; si devuelve error, no se utiliza un usuario recibido junto al error.
- `requireMember` consulta `app_users` en cada invocación. Solo reconoce `buyer/admin`, con correo normalizado y consistente con la identidad.
- `appRole` se mantiene separado del `role` del token. `user_metadata` y el formulario no conceden permisos.
- Fallo de consulta, incluso con una fila recibida, bloquea acceso con mensaje seguro. Una excepción de la consulta tampoco permite continuar.
- `requireUser` conserva su nombre para las páginas existentes, pero ahora aplica el control de membresía.
- Las 13 acciones de negocio/administración usan `requireMember` o `requireAdmin` antes de consultar/modificar sus datos. Login y logout siguen siendo entradas públicas necesarias.
- Configuración de un buyer se renderiza como consulta, con controles deshabilitados y sin botón de guardar. El bloqueo real también existe en la acción de servidor.

**No es aislamiento por cuenta:** el esquema actual no define asignaciones usuario → cuenta. No se inventó una relación ni se afirmó que exista multiempresa. La validación de una cuenta activa al guardar un perfil tampoco equivale a demostrar pertenencia individual. Quedan pendientes matriz definitiva por cuenta, relaciones y pruebas SQL/RLS.

La revocación se verifica al iniciar cada operación; esto no transforma autorización y escritura en una transacción atómica. Las carreras que requieren invariantes DB pertenecen a los siguientes bloques.

## 3. Cambios de comportamiento

- Un usuario autenticado pero retirado de `app_users` ya no conserva acceso por el simple hecho de tener una sesión.
- Un buyer que envía una petición directa para cambiar modo, límites o política es rechazado antes de escribir.
- `saveProfile` comprueba formato del ID, existencia de cuenta habilitada y modos permitidos `off/semi`. No acepta `auto` manipulando el formulario ni sustituye un modo inválido silenciosamente por `off`.
- Se reutiliza el control admin en usuarios y liberación de freno; Hoy usa el rol ya verificado para mostrar ese control.
- Login deja de redirigir a Hoy únicamente por encontrar una sesión. Esto evita el ciclo login → Hoy → login cuando la membresía fue revocada.
- Los destinos de login y retorno de revisión se restringen a rutas internas; se conserva `next` al fallar el ingreso. El middleware preserva el destino con sus filtros y compara rutas públicas exactas.
- Se elimina la segunda decodificación de mensajes ya procesados por Next y se oculta la contraseña nueva en Usuarios.
- Hoy ya no usa el parámetro `decidido` como texto libre de éxito ni afirma que una aprobación nunca escribe en Meta. Indica consultar el estado persistido.
- Una excepción del ejecutor se presenta como resultado no confirmado, advierte de posibles efectos y pide revisar antes de reintentar. No se filtra el error interno en la URL.
- Se aclara que el freno no pausa campañas, que el techo de la app no es un límite de facturación de Meta, que un porcentaje no garantiza preservar aprendizaje y que las notas no son restricciones ejecutables.

Estas correcciones de lenguaje no demuestran que el ejecutor aplique ya todos los candados. No se cambió su lógica, ni los valores vivos de `mode/dry_run`, ni la política financiera de ninguna cuenta.

## 4. Inventario de avance verificable

| Capacidad/bloque | Implementado localmente | Probado | Desplegado | Habilitado en producción |
| --- | --- | --- | --- | --- |
| Membresía central y rol admin — IM-03/04 parcial | Sí | Tests de servidor con dobles | No | No cambiado |
| Controles de consulta/admin y mensajes de riesgo — IM-04 parcial | Sí | Build; comportamiento servidor probado; sin QA interactivo | No | No cambiado |
| Validación de modo/cuenta en perfil — IM-04 parcial | Sí | Tests positivos y negativos | No | No cambiado |
| Login/retornos y middleware — adelanto IM-05/23 | Sí | Tests unitarios/de middleware | No | No cambiado |
| Suite web y bloqueo de red — IM-02 parcial | Sí | 106 pruebas aprobadas | No aplica | No aplica |
| Build web en CI — IM-02 parcial | Workflow editado | Build local aprobado; workflow remoto no ejecutado | No | No cambiado |
| Aislamiento por cuenta, RLS y validación completa de entidades — IM-03 | Pendiente | No | No | No |
| Perfil/historial transaccionales, concurrencia y whitelist inactiva — IM-04/06 | Pendiente | No | No | No |
| PostgreSQL de ensayo y runner de migraciones — IM-02/06 | Pendiente | No | No | No |
| Regresiones durables R01–R20 de la auditoría general | Pendientes de incorporación a la suite de agentes/DB | No se dan por incorporadas por crear tests de acceso | No aplica | No aplica |
| Política única, intención durable y reconciliación — IM-08–16 | Pendiente | No cerrado | No | No |
| Cobertura, evaluación y narrativa — IM-13–19 | Sin cambios en esta entrega | Suite core existente conservada | No | No cambiado |
| Sistema visual y Hoy premium — IM-21/22/23 | Pendientes, salvo correcciones acotadas de acceso/textos | Sin aprobación visual | No | No |

Referencias atendidas parcialmente: A01/A02/A07, U07, T01/T03 y componentes relacionados de V-I04, V-H02, V-F02, V-U01, V-L03. Los IDs conservan sus criterios de cierre completos en las auditorías. El fallo de lectura de membresía está cubierto; **no** se solucionaron todos los `data ?? []` de la aplicación.

## 5. Evidencia de pruebas

Antes de corregir:

- Core: 76 aprobadas y una omitida preexistente.
- Typecheck web: aprobado.
- Primer conjunto nuevo: 54 tests, 17 aprobados y 37 fallidos. Los fallos incluían membresía ausente, rol, consultas de permisos fallidas y comportamiento de retorno esperado; no equivalen a 37 vulnerabilidades independientes.

Después de corregir y ampliar:

- **Web: 106 aprobadas, ocho archivos de tests.**
- **Core: 76 aprobadas y una omitida, diez archivos.** No se ocultaron fallos nuevos mediante skips.
- **Total: 182 aprobadas y una omitida preexistente.**
- Typecheck: aprobado en `core`, `meta`, `db`, `agents` y `web`.
- Build de producción de Next: aprobado. Esto valida compilación, no autenticación/RLS/despliegue real ni apariencia en navegador.

Cobertura de la suite nueva:

- Miembro activo, revocado, rol desconocido, identidad inconsistente, metadatos adulterados, error de DB y revocación entre invocaciones.
- Las 13 acciones frente a falta de sesión, falta de membresía y error al consultar permisos.
- Operaciones administrativas frente a buyer; flujo permitido de admin guardando en simulación y buyer registrando revisión.
- Modos no habilitados, ID inválido y cuenta ausente/no verificable al guardar perfil.
- Destinos externos, protocolo relativo, barras invertidas, controles y rutas locales con query/hash.
- Middleware sin bucle para sesión revocada y sin rutas públicas accidentales por prefijo.
- Login con fallo de permisos/contraseña preservando destino y sin contraseñas/errores internos en la URL.
- Excepción del ejecutor comunicada sin éxito falso.
- Identidad de Auth recibida junto con error: acceso denegado.

### Aislamiento del arnés

[vitest.config.ts](../apps/web/vitest.config.ts) y [setup.ts](../apps/web/tests/setup.ts) limitan el entorno nuevo a Node con dobles explícitos. Se bloquean `fetch`, HTTP/HTTPS y conexiones TCP, incluso antes de importar módulos de prueba. Se usan dominios `.invalid`, IDs ficticios y valores que no son credenciales.

DB, administración Auth y agentes están sustituidos en las pruebas de acciones. No se simulan transacciones ni RLS con esos dobles. La sustitución de `server-only` existe solo en la configuración de Vitest; Next conserva la protección en producción.

El bloqueo no es un sandbox del sistema operativo para procesos externos. No se debe añadir un subprocess de collector/CLI esperando que estas intercepciones impidan su red; esos procesos requieren aislamiento adicional.

### Reproducción

Con pnpm disponible, desde la raíz:

```powershell
pnpm --filter @agentes-meta/web test
pnpm --filter @agentes-meta/core test
pnpm -r typecheck
pnpm --filter @agentes-meta/web build
```

En este entorno `pnpm` no estaba en PATH. Se usaron los binarios Node ya instalados, sin instalar dependencias ni cambiar el lockfile. Desde la raíz, los equivalentes para las suites y el build son:

```powershell
node node_modules/vitest/vitest.mjs run --root apps/web
node node_modules/vitest/vitest.mjs run --root packages/core
node apps/web/node_modules/next/dist/bin/next build apps/web
```

Para verificar tipos se ejecutó el compilador local con `--noEmit --incremental false -p <tsconfig del paquete>` en los cinco paquetes. No ejecutar comandos de collector, migración o análisis como sustitutos de estas pruebas.

## 6. Próximo tramo y decisiones pendientes

1. Preparar IM-06: runner/DB de ensayo, contratos versionados y diagnóstico de datos heredados; ninguna migración en producción todavía.
2. Completar IM-03/04: permisos por cuenta acordados, validación de entidad/whitelist, rangos numéricos, perfiles transaccionales y concurrencia.
3. Incorporar las regresiones de agentes R01–R20 con transporte falso y PostgreSQL aislado; priorizar política/freno, aprobación antigua y exclusión.
4. Empezar IM-22 con tokens/componentes y fixtures; IM-23/21 después, sin mezclar rediseño con habilitación de escrituras.
5. Validar en navegador y en un despliegue de ensayo cuando estén disponibles. No marcar G1/G2/G3 por haber pasado únicamente el build y los tests con dobles.

Pendiente de decisión antes de cerrar aislamiento: si los buyers siguen compartiendo todas las cuentas o reciben asignaciones individuales, y quién administra esas asignaciones. El esquema actual y esta primera entrega conservan el modelo global existente; no se incorporó un modelo multiempresa implícito.

**Condición de seguridad vigente:** los P0 del ejecutor siguen abiertos. Este avance no certifica dinero real ni solicita desactivar `dry_run`.
