# Sexto avance: Hoy conectado a datos reales

6 de septiembre de 2026. El dashboard visual de [IM-21](12-hoy-piloto-codex.md) ahora también es la presentación de la ruta protegida de Next `/hoy` y lee las tablas existentes en Supabase.

## Resultado

- Cuenta, moneda y zona horaria salen de `accounts`; ya no se usa un ID fijo cuando la URL no especifica cuenta.
- Los cuatro KPI y la gráfica agregan las filas reales de campaña de `insights_daily` para los catorce días calendario anteriores al día actual de la cuenta. La lectura está paginada.
- Modo y simulación salen de `account_profiles`; freno, recolección y revisión salen de `emergency_brakes` y `agent_runs`.
- Propuestas, decisiones, alertas y cambios humanos salen respectivamente de `proposals`, `alerts` y `change_sessions`. Cada sección conserva su propio estado de error; un fallo no se convierte en una lista vacía ni en “todo bien”.
- Las propuestas reales pueden inspeccionarse en el panel de evidencia. Aprobar, rechazar, corregir y cambiar el freno están desconectados en esta integración; las acciones heredadas no se importan en la pantalla nueva.
- La pantalla muestra **Fuente real** para distinguirla del laboratorio Vite. El laboratorio con fixtures continúa separado en el puerto 4173.

No se consultó Meta directamente ni se modificaron filas remotas. Las validaciones contra Supabase fueron exclusivamente lecturas.

## Datos comprobados

La conexión configurada en el `.env` raíz respondió correctamente: tres cuentas habilitadas, 2,738 filas de métricas, 95 corridas y perfiles en `dry_run=true`. La ventana 30 de agosto–5 de septiembre de 2026 de Aromante 1 contiene siete días cerrados; Aromante 2 y 3 no tienen filas de campaña en esa ventana y la interfaz debe mostrarlas vacías, no como gasto cero confirmado.

Al momento de la comprobación no había propuestas almacenadas en ninguna cuenta. Por ello el panel de revisión aparecerá cuando exista una propuesta real; no se inyecta una ficticia en la aplicación protegida.

## Desarrollo local

Next no cargaba el `.env` raíz porque la app se ejecuta desde `apps/web`. El script `dev` ahora lo incorpora explícitamente con `node --env-file-if-exists=../../.env`; no copia ni expone secretos.

```powershell
corepack pnpm --filter @agentes-meta/web dev
```

Abrir **http://127.0.0.1:3000/hoy** e iniciar sesión con un usuario existente de Supabase y `app_users`. La ruta devuelve al login con `next=/hoy` cuando no hay sesión.

## Límites que permanecen

- El modelo vigente de membresía permite a un miembro activo consultar las cuentas habilitadas; todavía no existe asignación granular usuario–cuenta. La integración no presenta esto como aislamiento por tenant.
- Una corrida `ok` y siete fechas disponibles no demuestran cobertura completa de todas las campañas. La pantalla lo dice expresamente y el contrato de cobertura/frescura de IM-13/31 sigue pendiente.
- `ejecutada` se presenta como **Ejecución registrada**, no como confirmación nueva de Meta. La reconciliación del ejecutor sigue pendiente en IM-08–12/16.
- La app admite `off`, `semi` y `auto` como estados almacenados, pero esta pantalla no concede capacidad de operación por mostrarlos.
- El navegador conectado no estuvo disponible para usar una sesión existente. Se verificó el servidor protegido hasta el login y el esquema remoto con lecturas directas; la comprobación visual autenticada la realiza el usuario al entrar en la URL local.

## Verificación de este corte

- Web: 341 pruebas aprobadas en 22 archivos, incluidas 9 del adaptador real.
- Build de Next y validación de tipos aprobados.
- Consultas de compatibilidad ejecutadas contra las nueve fuentes que consume Hoy: métricas, perfil, propuestas, decisiones, alertas, actividad, freno, collector y strategist.
- Sin escrituras a Supabase/Meta, sin migraciones, sin deploy, commit ni push.
