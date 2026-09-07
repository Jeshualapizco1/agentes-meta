# Séptimo avance: decisiones con evidencia y propuestas en simulación

6 de septiembre de 2026, CDMX (migraciones registradas el 7 de septiembre UTC). Se recuperó y completó el trabajo de la sesión interrumpida sobre la mesa de decisiones.

## Recorrido disponible

1. Entrar en `/decisiones`, desde el menú o desde **Decidir con el agente** en Hoy. La ruta valida sesión y membresía antes de consultar datos.
2. Revisar las campañas priorizadas con siete días cerrados, gasto, compras, ROAS, CPA y la referencia al objetivo configurado. **Examinar anuncios** conserva campaña y periodo, también al cambiar de página.
3. Registrar **Investigar** o **No intervenir**, con motivo y evidencia de la ventana. Queda en `recommendations` como `decision_review`; no altera campañas.
4. Definir una regla estructurada, evaluarla con datos reales y guardar un borrador o habilitarla para simulación. Guardar exige administrador y activar exige confirmación. Los umbrales, muestra y porcentaje los decide el operador.
5. Generar propuestas y revisarlas en Hoy. Se puede aprobar una simulación, corregir el presupuesto con razón o rechazar con razón. La evidencia, versión de regla, estado, límites y autorización se vuelven a validar al confirmar.

El generador dejó de devolver siempre una lista vacía. Admite subir/reducir presupuesto diario y pausar anuncios a partir de ROAS, CPA o gasto sin compras. Exige ventana completa de 1–14 días cerrados, muestra explícita y lecturas verificables en 30 horas; los conjuntos bajo presupuesto CBO se excluyen. La pasada del collector puede generar propuestas con reglas `review_only` en cuentas `semi` y `dry_run=true` cuando se publique esta versión del agente.

Las simulaciones y su orden se guardan juntas mediante `review_proposal_simulation_v1`: bloqueo por cuenta/propuesta, idempotencia concurrente, rechazo de decisiones vencidas y validación de freno, lista blanca, congelamientos, experimentos, espera, límite diario, acumulado, piso y techo. No se envía una orden a Meta ni se cuenta una simulación como autorización para modo automático. La ruta heredada de aprobación quedó deshabilitada.

## Comprobación con la base existente

El diagnóstico ejecutó el mismo adaptador que `/decisiones`, exclusivamente con lecturas:

- Aromante 1: 3,737 entidades y 1,186 filas de métricas para los catorce días anteriores al día de cuenta. Cuatro señales con ventana completa del 30 de agosto al 5 de septiembre: PROSPECCIÓN y TESTING bajo el equilibrio configurado; PROMO ESCALONADA y SCALE por encima del CPA objetivo.
- Aromante 2 y 3: sin métricas para esa ventana. Se muestran sin oportunidades.
- Cero reglas estructuradas activas y cero candidatos. No se crearon criterios ni decisiones en nombre del usuario.

Repetir el diagnóstico, sin escribir datos:

```powershell
corepack pnpm --filter @agentes-meta/web decisions:check
```

## Migraciones y recuperación

Se instalaron **únicamente 0020 y 0021** en el proyecto Supabase existente, después de probarlas en PostgreSQL 17 temporal. No se repitieron migraciones históricas.

Antes de aplicar 0020 se guardaron los tres perfiles, sus tres filas de historial y los triggers existentes en `data/backups/2026-09-07-decision-preflight.json` (ignorado por Git). Tras ambas migraciones se comprobó igualdad exacta de todos los campos existentes y del historial. Solo se añadieron metadatos de versionado y funciones; las tres cuentas mantienen `dry_run=true`.

Las funciones nuevas usan `SECURITY INVOKER`, fijan `search_path` y permiten ejecución exclusivamente a `service_role`; `anon` y `authenticated` no pueden invocarlas. Los avisos del asesor no aumentaron: permanecen los avisos históricos de `rules_history`, `rules_bump_version` y protección de contraseñas filtradas. Los avisos informativos de RLS sin políticas reflejan el acceso existente exclusivamente por backend. Referencias: [search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Recuperación: las ampliaciones son compatibles con el código anterior; si hay una regresión de la aplicación, volver a la versión anterior sin borrar las columnas ni las decisiones registradas. La copia local permite comparar/restaurar valores previos de perfiles si hiciera falta; no es un respaldo completo de Supabase. El historial remoto se registró con el gestor de migraciones de Supabase. El runner local propio no adopta ese historial automáticamente y sigue bloqueando una base preexistente sin recibos propios.

## Verificación y límites

- 367 pruebas web, incluidas 23 de las nuevas acciones y 3 de envío del formulario con React; 108 pruebas core aprobadas y una omitida preexistente; 8 del plan de migraciones; 82 de integración PostgreSQL.
- Tipos y build Next aprobados; `/decisiones` aparece como ruta dinámica protegida. Laboratorio visual compilado y sus 49 regresiones Chromium aprobadas (fixtures de componentes, shell y Hoy; no prueban una sesión real de Decisiones).
- Navegador conectado: `/decisiones` devuelve al login con retorno a la ruta solicitada. La revisión visual autenticada requiere que el usuario entre con su cuenta; no se fabricaron sesiones ni se usaron sus credenciales del navegador.
- La nueva mesa usa datos reales y puede persistir decisiones, pero no se han habilitado reglas financieras, enviado notificaciones ni ejecutado cambios en Meta durante este trabajo.
- Corregido un detalle de React 19: `formAction` en el botón sobrescribía `name="intent"`. Un único action en el formulario conserva las tres intenciones (evaluar, borrador, activar), comprobadas con envíos reales en React/jsdom.
- El avance recuperado se publicó en `08060a7`; [CI completo aprobado](https://github.com/Jeshualapizco1/agentes-meta/actions/runs/34085662474). La corrección final del formulario se registra en el commit siguiente.
- No equivale a completar los 40 bloques del roadmap. Continúan pendientes aislamiento granular por cuenta, contrato completo de cobertura, reconciliación, recuperación del ejecutor, evaluación posterior de resultados y habilitación de dinero real.

La aplicación se inicia con `corepack pnpm --filter @agentes-meta/web dev` y queda disponible en `http://127.0.0.1:3000/decisiones`. Una publicación de código no demuestra por sí sola que Netlify esté desplegado ni que el collector haya ejecutado una regla nueva.
