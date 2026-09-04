# Criterio de operación · cuestionario para Eduardo

> **Eduardo: contesta en lenguaje natural, como lo dirías por WhatsApp** ("pauso un anuncio cuando lleva dos días arriba
> de 250 de CPA y ya gastó 500 sin vender", "subo 15 % si lleva tres días arriba de 6 de ROAS"). No hace falta tocar este
> archivo ni escribir en formato: el equipo técnico transcribe cada respuesta a una regla y te la regresa para que la
> confirmes. Si una pregunta no aplica o no la manejas así, dilo y ya.

**Para qué es esto.** El estratega de la Fase 4 (propuestas de escalar, recortar, pausar y mover presupuesto) se construye
**leyendo este documento como reglas**, no inventándolas. Cada respuesta se convierte en una fila versionada de `rules`
con sus umbrales y candados; lo que aquí quede en blanco, el agente no lo hace. Si más adelante una regla falla, se
corrige aquí y en `rules` en el mismo cambio ("cada error vuelve como regla", Fase 5).

**Cómo contestar.** Con números, no con adjetivos. Donde ya hay un valor en Configuración (perfil de Aromante 1 al
2026-09-04) aparece entre corchetes como referencia; confírmalo o cámbialo. Si una pregunta no aplica, escribe "no aplica"
y por qué. Las respuestas se leen junto con `docs/05-analista.md` (qué significa "mejora", "compras suficientes",
"confianza") para que el criterio use las mismas definiciones que el reporte.

Datos reales para calibrar (Aromante 1, corrida del 2026-09-04): techo configurado $15,000/día; presupuesto diario activo
$28,200 en 7 campañas (188 % del techo); gasto real del 2026-09-03 $13,585 (91 % del techo). Es decir: los presupuestos
suman casi el doble del techo y Meta entrega alrededor de la mitad.

---

## A. Pausar un anuncio

| # | Pregunta | Respuesta |
|---|---|---|
| A1 | ¿A partir de qué CPA se pausa un anuncio? [CPA objetivo: $170] ¿Es el mismo umbral para todas las campañas o cambia por fase (Test / Escala / Promo)? | |
| A2 | ¿Cuántas compras mínimas debe tener el anuncio en la ventana para que el CPA cuente? (con menos, el CPA es ruido; el analista usa 10 como mínimo de evidencia) | |
| A3 | ¿Cuánto gasto sin ninguna compra justifica pausar? (p. ej. "gastó 2 × CPA objetivo y cero compras") | |
| A4 | ¿Sobre cuántos días cerrados se mide? (3, 7, 14) | |
| A5 | ¿Frecuencia máxima por anuncio (impresiones por persona en 7 días) a partir de la cual se pausa o se avisa? | |
| A6 | ¿Hay anuncios que nunca se pausan solos (marca, promo vigente, top histórico)? Nómbralos o da la regla para reconocerlos por nombre. | |

## B. Subir presupuesto

| # | Pregunta | Respuesta |
|---|---|---|
| B1 | ¿Cuántos días seguidos con ROAS por arriba del objetivo [6.0] hacen que una campaña merezca más presupuesto? | |
| B2 | ¿Cuántas compras mínimas en esos días? | |
| B3 | ¿Qué porcentaje se sube por movimiento? [cambio máximo por movimiento: 17 %] | |
| B4 | ¿Cuánto se puede subir acumulado en una ventana de días sobre la misma campaña? [tope acumulado: 35 % en 7 días, valor por defecto que hay que confirmar] Esto frena el goteo de +17 % cada 3 días. | |
| B5 | ¿Subir presupuesto solo si el gasto real del día previo estuvo por debajo del techo, o también si el presupuesto activo ya rebasa el techo aunque no se gaste? (hoy: presupuestos 188 % del techo, gasto 91 %) | |
| B6 | ¿Se sube en campañas CBO, en ad sets ABO, o en ambas? ¿Alguna nunca? | |

## C. Bajar presupuesto y pausar campañas

| # | Pregunta | Respuesta |
|---|---|---|
| C1 | ¿Cuántos días seguidos con ROAS por debajo del equilibrio [2.5] antes de bajar presupuesto? | |
| C2 | ¿Qué porcentaje se baja por movimiento? ¿Mismo tope de 17 %? | |
| C3 | ¿Cuándo se pausa una campaña completa en lugar de bajarla? (p. ej. "ROAS < 60 % del equilibrio por N días con M compras") | |
| C4 | ¿Se respeta el piso de gasto diario de la cuenta [$9,000] al recortar? Si un recorte lo rompería, ¿se propone igual con aviso o no se propone? | |

## D. Mover presupuesto entre campañas

| # | Pregunta | Respuesta |
|---|---|---|
| D1 | ¿Cuándo se mueve presupuesto de una campaña a otra en vez de subir una y dejar la otra? | |
| D2 | ¿Cuánto por movimiento (porcentaje del origen o monto fijo)? | |
| D3 | ¿Entre qué campañas está permitido (misma fase, Test → Escala, nunca hacia Promo…)? | |
| D4 | Los movimientos son transacciones atadas: si la orden de destino falla, se revierte el origen; y ambas quedan congeladas 72 h. ¿Confirmas ese congelamiento o prefieres otro? | |

## E. Tiempos de espera

| # | Pregunta | Respuesta |
|---|---|---|
| E1 | ¿Cuánto se espera después de cualquier cambio antes de volver a tocar la misma campaña? [espera: 72 h] | |
| E2 | ¿Cuánto después de un reinicio de aprendizaje (cambio de segmentación, puja, objetivo o creativo)? | |
| E3 | ¿Qué días o periodos no se opera (fines de semana, promos, Buen Fin, lanzamientos)? | |
| E4 | ¿Cuántas acciones por día como máximo en toda la cuenta? [tope: 5] | |

## F. Lista blanca y noes duros

| # | Pregunta | Respuesta |
|---|---|---|
| F1 | ¿Qué campañas entran a la lista blanca (las únicas que el agente puede tocar)? Da la regla por nombre si existe (p. ej. "todas las `CBO | SCALE`") o la lista. | |
| F2 | ¿Cuáles nunca se tocan, aunque cumplan las reglas? | |
| F3 | Noes duros en una línea cada uno (se guardan en Configuración → Noes duros y se aplican antes que cualquier regla). | |

## G. Techo y piso de gasto

| # | Pregunta | Respuesta |
|---|---|---|
| G1 | ¿El techo [$15,000] se mide contra el gasto real del último día cerrado (lo que hace hoy el collector en cada pasada) o contra la suma de presupuestos activos? ¿O contra ambos con distinta severidad? | **Contestada por Jeshua (2026-09-04): contra ambos, en dos capas.** El techo de $15,000 es real. (1) Gasto real del último día cerrado por encima del techo → alerta `warning` y el estratega no propone ninguna subida ese día. (2) Suma de presupuestos diarios activos por encima de techo × **factor de presupuesto comprometido** (`max_committed_budget_factor`, 1.3 por defecto, editable en Configuración) → alerta `info` "presupuesto comprometido X % del techo" y tampoco se proponen subidas. Ambas capas se calculan en cada pasada del collector (`ceilingCheck`, `agent_runs.stats.ceiling.blocks_scaling`). |
| G2 | ¿Qué pasa cuando el gasto real rebasa el techo: solo alerta, o además se bloquean las subidas hasta que un día cierre por debajo? | **Contestada:** alerta y bloqueo de subidas mientras la capa siga cerrada (se reevalúa en cada pasada con el último día cerrado). Los recortes y las pausas no se bloquean. |
| G3 | ¿El techo cambia por temporada o promo? ¿Quién lo cambia y con cuánta anticipación? | |

## H. Horarios

| # | Pregunta | Respuesta |
|---|---|---|
| H1 | ¿Hay bloques horarios donde nunca se debe operar ni proponer (madrugada, horario de la promo)? | |
| H2 | Dayparting: con presupuesto diario Meta no lo aplica; ¿se propone como texto o se cambia a presupuesto total en campañas concretas? | |

---

## Cómo se convierte una respuesta de Eduardo en una fila de `rules`

Eduardo contesta por WhatsApp; el equipo técnico transcribe. Cada respuesta se vuelve **una fila** en `rules` (versionada:
cada cambio deja historial en `rule_changes` con autor, por trigger) con estos campos:

| Campo | Qué va | Ejemplo |
|---|---|---|
| `name` | identificador corto y estable | `techo_gasto_real` |
| `description` | la respuesta de Eduardo, en sus palabras, sin editar | "subo 15 % si lleva tres días arriba de 6 de ROAS" |
| `definition` | de dónde salió (pregunta del cuestionario, fecha, quién) | `{"pregunta":"B1-B3","fecha":"2026-09-10","fuente":"WhatsApp Eduardo"}` |
| `condition` | la condición en JSON: métrica, operador, referencia y ventana | `{"metric":"roas","op":">=","ref":"target_roas","consecutive_closed_days":3}` |
| `action` | una de `pausar_anuncio`, `subir_presupuesto`, `bajar_presupuesto`, `mover_presupuesto`, `bloquear_subidas` | `subir_presupuesto` |
| `params` | parámetros de la acción | `{"pct":15}` |
| `status` / `mode` | `activa` o `inactiva`; `semi` (aprueba una persona) o `auto` (Fase 4b, se gana con `approved_streak ≥ promote_after`) | `activa` / `semi` |
| `valid_from` / `valid_to` | vigencia, por si una regla es de temporada | — |
| `updated_by` | quién transcribió | `admin@aromante.mx` |

Los candados **no** se transcriben como reglas: viven en el perfil de la cuenta (Configuración) y se evalúan en fila antes
de cualquier propuesta (`evaluateLocks` en core, con prueba por candado). Una regla de acción solo dice *cuándo* y *qué*;
los candados dicen *si puede salir*.

**Ejemplo 1, ya en la base (regla de candado, de la respuesta G1):**

> "El techo de $15,000 es real. Gasto real del último día cerrado por encima del techo: alerta warning y el estratega no
> propone ninguna subida ese día."

```
name:        techo_gasto_real
description: Gasto real del último día cerrado por encima del techo: alerta warning y ninguna propuesta de subida ese día.
definition:  {"fuente":"docs/06 G1/G2, decisión de Jeshua 2026-09-04"}
condition:   {"metric":"spend_last_closed","op":">","ref":"daily_spend_ceiling"}
action:      bloquear_subidas
params:      {"alert":"spend_over_ceiling","severity":"warning"}
status/mode: activa / semi
```

Cómo se aplica: el collector calcula `spend_last_closed` en cada pasada; si rebasa el techo, el candado
`techo_gasto_real` se cierra para cualquier `subir_presupuesto` o `mover_presupuesto` y la propuesta se registra como
descartada con la razón "gasto real 104 % del techo: sin subidas hoy".

**Ejemplo 2, ya en la base (regla de candado, de la respuesta G1, segunda capa):**

> "Suma de presupuestos diarios activos por encima de techo × 1.3: el estratega no propone ninguna subida y avisa con
> alerta info 'presupuesto comprometido X % del techo'."

```
name:        techo_presupuesto_comprometido
description: Suma de presupuestos diarios activos por encima de techo × factor: alerta info y ninguna propuesta de subida.
definition:  {"fuente":"docs/06 G1/G2, decisión de Jeshua 2026-09-04"}
condition:   {"metric":"budget_active","op":">","ref":"daily_spend_ceiling","factor_ref":"max_committed_budget_factor"}
action:      bloquear_subidas
params:      {"alert":"budget_committed","severity":"info"}
status/mode: activa / semi
```

El factor no va en la regla sino en el perfil (`max_committed_budget_factor`, editable en Configuración), para que
cambiarlo no requiera una versión nueva de la regla.

**Ejemplo 3, cómo se vería una regla de acción (todavía sin respuesta de Eduardo; ilustrativo):**

> "Subo 15 % si lleva tres días cerrados arriba de 6 de ROAS y al menos 30 compras en esos días."

```
name:        subir_por_roas_sostenido
description: Subo 15 % si lleva tres días cerrados arriba de 6 de ROAS y al menos 30 compras en esos días.
definition:  {"pregunta":"B1-B3","fecha":"(pendiente)","fuente":"WhatsApp Eduardo"}
condition:   {"metric":"roas","op":">=","ref":"target_roas","consecutive_closed_days":3,"min_purchases":30}
action:      subir_presupuesto
params:      {"pct":15}
status/mode: activa / semi
```

Al activarla, `generateCandidates` (core) produce un candidato por campaña de la lista blanca que cumpla la condición, con
la evidencia etiquetada ([W1] ROAS de los 3 días, [W2] compras, [O] objetivo del perfil); los candados deciden si sale
como pendiente o descartada; en Hoy se aprueba o rechaza con razón. Cada aprobación sin corrección suma a
`approved_streak`; un rechazo la regresa a cero.

## Cómo se convierte esto en reglas (resumen)

1. Cada fila contestada se transcribe a `rules` (cuenta, tipo, umbrales, candados, versión 1, modo `semi`) y se anota aquí
   el identificador de la regla junto a la pregunta.
2. Los candados generales viven en el perfil de la cuenta (Configuración): cambio máximo por movimiento, **cambio
   acumulado máximo y su ventana de días**, espera, tope de acciones por día, techo y piso, lista blanca, noes duros.
   El collector calcula en cada pasada el techo contra el gasto real de todas las campañas activas y contra el presupuesto
   activo (`agent_runs.stats.ceiling`; alertas `spend_over_ceiling` y `budget_over_ceiling`).
3. Una propuesta solo nace si pasa **todos** los candados; si uno falla, se registra como bloqueada con el candado que la
   detuvo, para que se vea qué habría hecho el agente.
4. Cambiar una regla es cambiar este documento y `rules` en el mismo commit; la versión anterior queda en el historial.
