# Segundo avance: configuración transaccional y migraciones

Actualizado: 6 de septiembre de 2026. Continuación del [primer corte](08-base-implementacion-codex.md) y del [roadmap maestro](../roadmapImplementacionCodex.md).

> Evidencia histórica del segundo corte. La base visual y el recuento posterior de pruebas se registran en [el tercer avance](10-sistema-visual-codex.md).

**Avance local de IM-02/04/06, no cierre de los bloques completos. Sin commit/push, despliegue, migración de producción ni llamadas a Meta.** La migración nueva se aplicó y probó exclusivamente en PostgreSQL efímero de Docker.

## Resultado implementado

- Configuración guarda el perfil y su historial en una única llamada SQL transaccional. Si falla el historial, también se revierten perfil y versión.
- Cada perfil tiene una versión. Un formulario antiguo recibe un conflicto, no sobrescribe silenciosamente. Se serializa también la creación del primer perfil.
- El historial nuevo incluye versión anterior/nueva, snapshots antes/después y un diff de los campos realmente modificados. Los registros históricos se conservan sin inventarles versiones.
- La RPC verifica otra vez el rol admin y la cuenta habilitada dentro de la transacción. Mantiene los bloqueos hasta terminar, incluidas carreras con la revocación del rol.
- Las campañas deben existir, pertenecer a la cuenta y ser de nivel campaña. Pausadas seleccionadas se conservan. Una selección ausente del catálogo queda visible y requiere resolverla o retirarla explícitamente.
- Números, enteros, porcentajes, relación piso/techo, modo, simulación, IDs y notas se validan en servidor y en SQL. Un campo obligatorio vacío o inválido no se sustituye silenciosamente por un valor por defecto.
- El formulario bloquea el envío mientras guarda, presenta errores esperados y conserva texto/selecciones si hay conflicto o fallo. Un error de transporte indica resultado no confirmado; no se reintenta automáticamente.
- La pantalla no ofrece edición con perfil, campañas o historial incompletos. Campañas usa lectura paginada y orden estable por nombre/ID. Un parámetro de URL no basta para anunciar éxito: se consulta el historial persistido.

Los importes conservan la unidad de Configuración, MXN; no se convierten a centavos de Meta. No se cambiaron umbrales, modo o simulación de cuentas reales. Cero sigue permitido para límites que pueden detener acciones; margen/objetivos/factor/ventana requieren un valor positivo cuando se capturan. Porcentajes de margen/exploración no exceden 100. Los límites superiores de enteros y números son de representación (PostgreSQL/JavaScript), no recomendaciones de gasto. Notas se limitan a 10 000 caracteres.

## Contrato y alcance de seguridad

Implementación: [0020_atomic_account_profiles.sql](../packages/db/migrations/0020_atomic_account_profiles.sql), [acción del servidor](../apps/web/app/configuracion/actions.ts), [validación](../apps/web/lib/profile-input.ts) y [formulario](../apps/web/app/configuracion/ProfileForm.tsx).

`save_account_profile_v1(account_id, expected_version, changed_by, profile)` reemplaza los 17 campos editables del contrato v1. Versión 0 significa perfil aún inexistente; la primera versión persistida es 1. La respuesta es la versión confirmada. Timestamp y versión proceden de PostgreSQL, no del navegador.

La función es `SECURITY INVOKER`, tiene un `search_path` explícito y no concede ejecución a `PUBLIC`, `anon` ni `authenticated`. Solo `service_role` recibe permiso de ejecución; la acción obtiene `changed_by` de la identidad verificada, nunca del formulario. **La RPC confía en ese backend privilegiado para identificar al actor: no convierte una llave service_role comprometida en un cliente seguro.**

El trigger incrementa la versión también ante una escritura administrativa directa. Eso invalida formularios abiertos, pero dichas escrituras privilegiadas no quedan automáticamente auditadas por esta RPC. La garantía perfil/historial atómicos corresponde al flujo nuevo; no se afirma que la base sea inalterable por un administrador SQL.

Los registros originales se expanden sin endurecer retroactivamente todos sus valores: un perfil heredado inválido deberá corregirse al guardar. No se ejecutó diagnóstico de datos vivos. `mode=auto` sigue rechazado en este flujo; no se habilitó autonomía.

## Runner de migraciones

[migrations.ts](../packages/db/src/migrations.ts) y [migrate.ts](../packages/db/src/migrate.ts) implementan el alias `db:migrate` que antes no tenía script en el paquete DB:

- Descubrimiento ordenado de archivos numerados y SHA-256 normalizado para LF/CRLF.
- Plan/estado sin DDL ni creación implícita del historial.
- Historial separado en `agentes_meta_migrations.history`.
- Bloqueo entre migradores con una conexión dedicada.
- Una transacción por archivo: SQL y recibo juntos. Si falla una migración, las anteriores confirmadas se conservan; no hay rollback global automático.
- Rechazo de checksums/nombres/orden divergentes y de bases existentes sin historial verificable.
- Aplicación solo con `--apply --expect-database NOMBRE` y conexión explícita `MIGRATION_DATABASE_URL`. No lee `.env` ni reutiliza `DATABASE_URL` o las variables de Supabase.

Sin `MIGRATION_DATABASE_URL`, `--plan` solo enumera archivos locales y lo identifica como `databaseChecked: false`. Si se proporciona, consulta esa base en modo lectura. `--status` exige conexión. Ninguno aplica SQL de migraciones. El comando por defecto es plan.

El nombre de la base es un control contra equivocaciones, **no una identificación única del entorno**: varios proyectos Supabase pueden llamarla `postgres`. Antes de aplicar se debe verificar además host/proyecto y autorización. Se requiere conexión directa o pooler de sesión; no usar pooler de transacciones con el bloqueo de sesión de este runner. Los SQL son código confiable revisado: no deben incluir control externo de transacciones ni operaciones incompatibles con una transacción. Este ejecutor no es un sandbox para SQL arbitrario.

**Base existente sin recibos:** no hay comando de adopción automática en este corte. Que las tablas se parezcan al esquema actual no demuestra qué SQL fue aplicado. Está pendiente el diagnóstico/adopción revisada del historial y su ensayo sobre una copia. En particular, las migraciones históricas incluyen eliminación de Shopify: no volver a ejecutar 0001–0019 sobre una base existente.

La instalación de ensayo reproduce las 20 migraciones. La prueba de actualización parte de 0001–0019 con recibos y aplica únicamente 0020. Esto no equivale a certificar el estado de Supabase de producción. El esquema espera los roles de Supabase; el arnés PostgreSQL los crea localmente para ensayar privilegios, sin emular Auth/PostgREST completo.

## Pruebas y reproducción

| Suite | Resultado |
| --- | --- |
| Web: acciones, validadores, lecturas y formulario React | 160 aprobadas, 12 archivos |
| Core existente | 76 aprobadas, 1 omitida preexistente, 10 archivos |
| DB: plan de migraciones | 8 aprobadas, 1 archivo |
| PostgreSQL: migraciones, CLI y perfil | 49 aprobadas, 3 archivos |
| Total | **293 aprobadas, 1 omitida preexistente** |

Typecheck aprobado en los cinco paquetes. Se amplió el de DB para incluir scripts, tests y configuraciones. Build de producción de Next aprobado. CI incorpora la integración SQL; la versión local del workflow no se ha ejecutado remotamente.

Las pruebas SQL verifican instalación vacía, actualización 0019→0020 sin modificar políticas/historial, repetición sin pendientes, checksum divergente, SQL fallido, exclusión entre migradores y CLI con nombre de base incorrecto. Las del perfil ejercitan `anon/authenticated/service_role`, admin/buyer/revocado, cuenta deshabilitada, entidades cruzadas, tipos inválidos, fallo del historial, primera creación simultánea y edición simultánea. En edición y revocación se observa que la segunda conexión llegó a esperar un lock antes de liberar la primera: no es una simulación de concurrencia en memoria.

La prueba de React detectó que el reset automático borraba inputs al devolver un error. El formulario conserva el borrador mediante el evento nativo de reset; se probó con React y jsdom, incluyendo una selección desmarcada y el estado pendiente. Esto **no sustituye** una prueba E2E de Next/PostgREST ni una revisión visual en navegador.

Desde la raíz, en este entorno se encontró pnpm mediante Corepack:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm -r test
corepack pnpm --filter @agentes-meta/db test:integration
corepack pnpm -r typecheck
corepack pnpm --filter @agentes-meta/web build
```

El [arnés SQL](../packages/db/scripts/test-database.ts) exige Docker, lanza `postgres:17` con contraseña aleatoria, puerto aleatorio en `127.0.0.1` y almacenamiento temporal sin montar carpetas del usuario. No hereda secretos de negocio al proceso de tests. El [fixture](../packages/db/tests/database-fixture.ts) rechaza conexiones fuera del contrato efímero. Las operaciones bajo prueba usan IDs y actores ficticios; las migraciones históricas conservan sus semillas originales del repositorio. No se importan datos de una base real.

Al terminar cada ejecución, se verifica la etiqueta de propiedad y se elimina exclusivamente su contenedor/base de ensayo. Se confirmó que no quedaron contenedores de estas pruebas activos. Un corte forzado del proceso podría impedir el `finally`: el nombre/etiqueta permiten identificar el recurso temporal para limpieza, no autorizan limpiar otros contenedores. La imagen Docker descargada/cacheada se conserva. Fijar también su digest corresponde al endurecimiento reproducible de IM-07.

Se añadieron `pg`, sus tipos y `jsdom` (solo desarrollo), junto al lockfile. Versiones resueltas: pg 8.23.0, @types/pg 8.23.1 y jsdom 26.1.0. La instalación avisó de `whatwg-encoding@3.1.1` obsoleto como dependencia de pruebas; no se presenta esto como auditoría de dependencias terminada.

## Orden de despliegue pendiente

1. Diagnosticar el esquema real, revisar respaldo/recuperación y acordar la adopción del historial existente. **No rellenar recibos sin revisión ni ejecutar toda la historia a ciegas.**
2. Ensayar ese procedimiento en una copia aislada y comprobar permisos efectivos y RPC mediante PostgREST.
3. Con autorización de despliegue, aplicar 0020 antes de publicar la web que exige ese contrato. Sin la migración, la pantalla bloquea edición y la acción devuelve un error seguro; no recurre al guardado no atómico anterior.
4. Validar formularios, sesión, red perdida, concurrencia y lectura de la revisión persistida en ensayo. No basta la compilación para certificar el entorno.

No se proporciona un comando listo para pegar contra producción: falta esa revisión. No hay rollback destructivo preparado que elimine snapshots/versiones ya usados. La expansión conserva compatibilidad de lectura con agentes actuales; una versión antigua de la web aún puede escribir sin historial atómico, por lo que no debe mantenerse como camino alternativo de edición.

## Lo que sigue abierto

- IM-02: restantes regresiones R01–R20, pruebas del ejecutor y E2E del despliegue.
- IM-03: decisión/asignaciones de acceso por cuenta y validación de las demás acciones. Se conserva el modelo global de miembros.
- IM-04: confirmar capacidad efectiva de escritura por proceso/cuenta, confirmación reforzada para dinero real y acabado visual del formulario/historial.
- IM-06: adopción de bases heredadas, diagnóstico de datos, tipos generados e invariantes/RPC del resto de dominios.
- IM-08–16: los P0 del ejecutor siguen abiertos. Este corte no autoriza apagar `dry_run` ni certifica seguridad de gasto.
- IM-22/23/21: iniciar tokens/componentes carbón/naranja/violeta y la experiencia de Hoy con fixtures, sin mezclar apariencia premium con habilitación de escrituras reales.

Referencias técnicas consultadas: la transacción debe conservar la misma conexión ([node-postgres](https://node-postgres.com/features/transactions)); los bloqueos de sesión exigen esa afinidad ([PostgreSQL: locking](https://www.postgresql.org/docs/17/explicit-locking.html)); permisos y contexto de ejecución de funciones ([PostgreSQL: CREATE FUNCTION](https://www.postgresql.org/docs/17/sql-createfunction.html)). El reset de formularios tras una acción se describe en [React](https://react.dev/reference/react-dom/components/form).
