# Análisis de producto · 7 de septiembre de 2026

Meta del dueño, en sus palabras: tomar decisiones rápidas con solo ver la app, revisar cada acción hecha en la cuenta y el resultado que obtuvo, probar absolutamente todo con registro de las pruebas, y escalar. Además: que la interfaz no muestre nada técnico del backend.

Base revisada: `main` en `54068af`, las 12 pantallas de `apps/web`, el core de evaluación y decisiones, y los datos reales de Supabase al mediodía del 7 de septiembre.

## 1. Estado real de los datos (lo que la app tiene que mostrar)

| Qué | Cuántos |
|---|---|
| Cambios importantes hechos por personas (sesiones `major`) | 134 |
| Ventanas de evaluación calculadas (72 h / 7 d / 14 d) | 159 (97 maduras: 29 con evidencia sólida, 41 media, 11 débil, 16 insuficiente) |
| Anotaciones de "por qué se hizo" | 0 |
| Pruebas registradas | 0 |
| Propuestas del agente | 0 (las únicas reglas activas son los dos candados de techo) |
| Reportes semanales | 4, ninguno con resumen en texto |
| Sincronizaciones programadas correctas | 40 seguidas; una carga inicial falló el 3 de septiembre |

Aromante 1 gasta entre 13,600 y 15,700 pesos al día con ROAS entre 2.3 y 4.6 en los últimos 14 días cerrados; la meta configurada es 6 y el equilibrio 3.3. Ayer el gasto rebasó el techo de 15,000.

Lectura: la plataforma ya recoge todo lo que hace falta para "acción → resultado" (134 acciones, 159 resultados), pero nadie ha registrado ni una prueba ni una razón. El problema no es de datos; es de cómo se muestran y cuánto cuesta registrar.

## 2. Lo que está bien y se conserva

1. **La cadena de evidencia es correcta.** Los números los calcula código determinista; cada cambio tiene dos lecturas (contra el resto de la cuenta y contra su propia semana previa) y el veredicto solo se pinta de verde o rojo cuando coinciden. Eso es exactamente lo que hace falta para confiar en un resultado.
2. **La disciplina de seguridad.** Modo simulado por cuenta, candados en fila, freno de emergencia, ninguna orden sin propuesta, evidencia y aprobación. No se toca.
3. **La bitácora agrupa bien.** Sesiones legibles por persona y hora en lugar de miles de eventos crudos de Meta.
4. **Base visual y componentes.** Estados de datos honestos (parcial, desactualizado, error) que no rellenan con ceros; tarjetas, chips, métricas y diálogos reutilizables.
5. **El asistente de pruebas** obliga a declarar criterio de éxito antes del cambio, con presupuesto de exploración como tope.

## 3. Lo que está mal frente a la meta

1. **Acción y resultado viven en pantallas distintas.** Bitácora dice qué cambió; Aprendizajes dice qué pasó, en letra de 12 px, con vocabulario interno ("maduro", "confianza", "sin lectura frente al resto"). Para revisar una acción hay que cruzar dos vistas. Es la carencia número uno.
2. **Registrar cuesta demasiado.** Convertir un cambio en prueba exige tres pasos, umbral, presupuesto y confirmación. Resultado: 134 cambios, 0 pruebas, 0 razones anotadas. Si registrar no es de un clic, no se registra.
3. **Hoy no permite decidir de un vistazo.** Muestra cuatro KPI de cuenta y una tendencia, pero no las campañas: cuál gasta, cuál rinde por encima de la meta, cuál está por debajo del equilibrio, cuál cambió de tendencia. Eso está calculado en el core (`decisionOpportunities`) y solo se ve en Decisiones.
4. **Mucho espacio dedicado a maquinaria vacía.** "Necesita tu atención" con propuestas del agente (nunca ha habido una), "Actividad del agente", control del freno. Son correctos, pero hoy ocupan el centro de la pantalla sin aportar una decisión.
5. **La interfaz habla del backend.** "Falló el collector: fetch failed" estuvo cuatro días abierto en Hoy y Estado aunque las 40 sincronizaciones siguientes fueron correctas. Además: `collector`, `analyst`, `strategist`, `schedule`, `ok/failed`, `status 2`, `ANTHROPIC_API_KEY`, `docs/05-analista.md`, "Fase 4", "dry run", "piloto", JSON de configuración, eventos crudos de Meta en el detalle de sesión, ISO 8601 sin formato. Nada de esto ayuda a decidir.
6. **Las alertas no se cierran solas.** No hay botón ni regla; una condición que ya pasó sigue "abierta".

## 4. Qué se construye hoy (en orden)

| Bloque | Qué resuelve | Estado |
|---|---|---|
| A · Front sin lenguaje técnico | Capa de alertas humanizada por tipo, pantalla "Estado de los datos" con detalle técnico plegado para administradores, todas las pantallas revisadas, prueba automática (`copy-lint`) que impide que vuelva a aparecer texto técnico | Worker GPT-5.6 Sol |
| D · Alertas que se cierran solas | Cada agente cierra sus alertas cuando la condición desaparece (sincronización recuperada, techo respetado, token renovado). Nada se borra | Worker GPT-5.6 Sol |
| B · Acción → resultado en un solo lugar | Chip de resultado en cada fila de Bitácora; bloque "Resultado del cambio" al inicio del detalle de sesión; "Registrar como prueba" en un clic con criterio tomado del perfil; tabla de campañas activas en Hoy con ROAS contra meta y tendencia; "Últimos cambios y su resultado" en Hoy; resultado también en cada prueba | Worker GPT-6 Astra, después de A |

Regla nueva que introduce B: una prueba registrada a partir de un cambio ya hecho no pasa por el presupuesto de exploración, porque no es gasto nuevo: documenta lo que ya está vivo en Meta. El presupuesto de exploración sigue aplicando a pruebas nuevas.

## 5. Qué sigue después (no se construye hoy)

- Anotar la razón desde la propia fila de Bitácora (sin abrir el detalle) para que las 134 sesiones sin razón dejen de serlo.
- Reporte semanal con resumen en texto (requiere la llave de Claude en los secretos; sigue en "Del lado de Jeshua").
- Reglas de acción del agente: siguen bloqueadas hasta las respuestas de Eduardo (`docs/06`).
- Hoy en móvil real y capturas del rediseño.
