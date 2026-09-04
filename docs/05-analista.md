# Analista semanal · definiciones por escrito

Este documento fija cómo calcula el Agente 2 cada número que aparece en `/analisis` y en el reporte semanal. Todo lo que
está aquí lo hace código determinista (`packages/core/src/evaluation.ts`, con pruebas en `evaluation.test.ts`). El modelo
de lenguaje **no calcula nada**: recibe el paquete de evidencia ya hecho y redacta. Si este documento y el código se
contradicen, gana el código y hay que corregir el documento en el mismo commit.

## 1. Qué se evalúa

- **Unidad:** cada *sesión de cambios* mayor hecha por una persona (`change_sessions` con `significance = major` y
  `actor_kind = person`) en los últimos 30 días. Las sesiones de Meta (sistema) no se evalúan.
- **Tratamiento:** las campañas tocadas en la sesión (`campaign_ids`). Un cambio en un ad set o anuncio se atribuye a su
  campaña; la unidad de comparación siempre es la campaña.
- **Control:** el resto de las campañas de la cuenta con gasto en la ventana. Si la sesión no identificó campañas (por
  ejemplo, cambios a nivel cuenta), se evalúa toda la cuenta y **no hay control**; el veredicto lo dice.
- **Datos:** `insights_daily` a nivel campaña con `is_closed_day = true` (gasto, compras y valor de compras atribuidos por
  Meta). El día en curso nunca entra.

## 2. Ventanas: fórmula exacta

Sea **D** la fecha del cambio en la zona horaria de la cuenta (`started_at` de la sesión convertido con `toZoned`), y
**N** el horizonte: 3 días (etiqueta "72 h"), 7 días o 14 días. "72 h" son tres días completos, no 72 horas literales.

| Ventana | Días que entran | Notas |
|---|---|---|
| Antes | `D−N` … `D−1` | N días completos previos al cambio |
| Después | `D+1` … `min(D+N, último día cerrado)` | N días completos posteriores; se recorta a lo que ya cerró |
| Día del cambio | ninguno | `D` se excluye siempre: mezcla horas antes y después |

**Último día cerrado** = hoy − 1 en la zona de la cuenta (en el reporte semanal, hoy = día siguiente al cierre del periodo).
Cualquier fila con fecha posterior se descarta antes de calcular.

**Estado de la ventana** según los días cerrados que ya existen después del cambio:

| Días cerrados después | Estado |
|---|---|
| 0 | `pending` (pendiente) |
| entre 1 y N−1 | `preliminary` (preliminar) |
| N | `mature` (maduro) |

Las ventanas se recalculan en cada corrida del collector (cada 6 h): una pendiente se vuelve preliminar y luego madura
sola. El veredicto no se congela hasta que madura.

## 3. Métricas por ventana

Para cada ventana (antes y después) y cada lado (tratamiento y control) se suman las filas diarias:

- `spend` = Σ gasto · `purchases` = Σ compras · `value` = Σ valor de compras · `days` = fechas distintas con filas
- **ROAS** = `value / spend` (nulo si el gasto es 0)
- **CPA** = `spend / purchases` (nulo si no hay compras)

## 4. Deltas y qué son los "10 puntos"

Variación relativa, siempre después contra antes, en porcentaje:

- `roas_pct` = (ROAS_después − ROAS_antes) / ROAS_antes × 100 (nulo si ROAS_antes es nulo o 0). Igual para `cpa_pct` y
  `spend_pct` del tratamiento y para `control_roas_pct`, `control_cpa_pct`, `control_spend_pct` del control.
- El control cuenta solo si gastó más de 0 en las dos ventanas; si no, la ventana se evalúa sin control.
- **`diff_roas_pts` = `roas_pct` − `control_roas_pct`.** Son **puntos porcentuales de diferencia entre la variación de ROAS
  de lo tocado y la variación de ROAS del resto de la cuenta**. No son "puntos de ROAS" (un ROAS de 3.0 que pasa a 4.0
  no son 10 puntos: es +33 % de variación).

Ejemplos:

| Tocado (antes → después) | Resto (antes → después) | `roas_pct` | `control_roas_pct` | `diff_roas_pts` | Veredicto |
|---|---|---|---|---|---|
| 3.0 → 4.5 | 3.0 → 3.0 | +50 % | 0 % | +50 | coincidió con una mejora |
| 3.0 → 3.36 | 3.0 → 3.15 | +12 % | +5 % | +7 | sin cambio claro |
| 3.0 → 4.5 | 3.0 → 4.5 | +50 % | +50 % | 0 | sin cambio claro (subió toda la cuenta) |
| 3.0 → 2.4 | 3.0 → 3.0 | −20 % | 0 % | −20 | coincidió con un deterioro |

**Umbral (`THRESHOLD_PTS = 10`):** una lectura es "mejora" si su valor es `≥ +10`, "deterioro" si es `≤ −10` y "plana"
entre ambos. El umbral es una convención operativa, no una prueba de significancia estadística (ver §7).

### 4b. Segunda referencia: la campaña contra sí misma

En Aromante 1 el resto de la cuenta **no es un control independiente**: hay una campaña dominante en CBO y mover su
presupuesto mueve el gasto de las demás (en la primera corrida real, 70 de 144 ventanas llevaban la salvedad de
presupuesto compartido o control inestable; eso no es ruido, es la cuenta). Por eso cada ventana guarda **dos lecturas**:

| Lectura | Fórmula | Campo |
|---|---|---|
| Frente al resto de la cuenta | `roas_pct − control_roas_pct` | `delta.diff_roas_pts` (puntos) |
| Frente a sí misma | `(ROAS_después − ROAS_base) / ROAS_base × 100`, donde **base** = las campañas tocadas en los **7 días cerrados previos** al cambio (`D−7` … `D−1`), sea cual sea el horizonte | `delta.self_roas_pct` (%), métricas en `baseline` |

La base de 7 días es fija: para la ventana de 7 días coincide con el "antes"; para la de 72 h y la de 14 días es una
referencia distinta (una semana completa, que cubre los siete días de la semana).

Cada lectura se clasifica con el umbral de ±10 en **mejora / plana / deterioro**, y el veredicto sale del cruce
(`agreement`):

| Resto de la cuenta | Sí misma | `agreement` | Veredicto | Confianza |
|---|---|---|---|---|
| mejora | mejora | `agree` | "Coincidió con una mejora…" (`reading = up`) | la calculada en §5 |
| deterioro | deterioro | `agree` | "Coincidió con un deterioro…" (`reading = down`) | la calculada |
| plana | plana | `agree` | "Sin cambio claro…" | la calculada |
| clara | plana (o al revés) | `partial` | "Indicio de mejora/deterioro frente a X, pero sin cambio claro frente a Y" | **media como máximo** |
| mejora | deterioro (o al revés) | `mixed` | "Mixto: … Las dos lecturas se contradicen; no se concluye." | **baja como máximo** |
| solo una disponible | | `single` | la lectura disponible, diciendo que falta la otra ("sin control: se tocó toda la cuenta" o "sin semana previa comparable") | la calculada |
| ninguna | | `none` | "Sin ROAS comparable" | insuficiente |

La confianza **solo se queda alta cuando las dos lecturas coinciden**. En `/analisis` solo se pinta verde o rojo cuando
`reading` es `up` o `down`; indicio y mixto van en ámbar.

**Ejemplo real de la corrida del 2026-09-04** (sesión de Eduardo Torres del 2026-08-26 10:29 CDMX: presupuesto diario
$4,600 → $5,200, +13 %, en «CBO | PROMO ESCALONADA»; ventana de 72 h, madura):

| | Antes (3 días) | Después (3 días) | Base propia (7 días) |
|---|---|---|---|
| Tocado: ROAS | 4.50 | 4.55 | **6.50** |
| Tocado: compras | 43 | 50 | 132 |
| Resto: ROAS | 3.44 | 3.01 | |

- Frente al resto: tocado +1 %, resto −12 % → **+14 pts: mejora**.
- Frente a sí misma: 4.55 contra 6.50 → **−30 %: deterioro**. La campaña ya venía cayendo desde la semana previa; la
  ventana de 3 días "antes" empezó cuando ya estaba en 4.50 y no lo veía.
- Resultado: `agreement = mixed`, confianza **baja**, veredicto "Mixto: frente al resto de la cuenta una mejora (+1 % en lo
  tocado frente a −12 % en el resto, +14 pts), pero frente a su propia semana previa un deterioro (−30 %). Las dos lecturas
  se contradicen; no se concluye.", con la salvedad "Presupuesto compartido … (gasto del control −4 %)".

Con una sola lectura este cambio habría salido como "mejora"; con las dos, queda en revisión.

### 4c. Cuando falta una referencia: la causa se guarda

Cada ventana guarda en `missing_refs` por qué falta cada lectura (`rest` = resto de la cuenta, `self` = semana previa
propia; `null` = la lectura existe). Una referencia con menos de `MIN_REF_PURCHASES = 10` compras no cuenta como lectura.
Con una sola lectura (`single`) la confianza no pasa de media: solo dos lecturas que coinciden sostienen confianza alta.

| Código | Qué significa | ¿Se resuelve sola? |
|---|---|---|
| `pendiente` | todavía no hay días cerrados después del cambio | **sí**, con el tiempo |
| `sin_gasto_despues` | lo tocado no gastó después del cambio (pausado o sin entrega) | no: estructural |
| `sin_campana_identificada` | la sesión no tocó una campaña identificable (cambio a nivel cuenta o entidad no mapeada) | no: estructural (mejorar el mapeo de entidades) |
| `resto_sin_gasto` | el resto de la cuenta no gastó en la ventana | no: estructural |
| `resto_compras_insuficientes` | el resto tuvo menos de 10 compras en la ventana | no: **volumen** |
| `menos_de_7_dias_previos` | la campaña no existía 7 días antes del cambio (campaña nueva) | no: estructural |
| `sin_gasto_previo` | la campaña existía pero no entregó los 7 días previos (pausada) | no: estructural |
| `propia_compras_insuficientes` | la campaña tuvo menos de 10 compras en sus 7 días previos | no: **volumen** |

**Distribución real (Aromante 1, corrida del 2026-09-04, 144 ventanas de 48 sesiones):**

| Situación | Ventanas |
|---|---|
| Dos lecturas: coinciden (`agree`) | 45 (18 maduras, 27 preliminares) |
| Dos lecturas: una plana (`partial`) | 19 |
| Dos lecturas: se contradicen (`mixed`) | 2 |
| Una lectura: falta el resto por `sin_campana_identificada` | 42 |
| Una lectura: falta la propia por `menos_de_7_dias_previos` | 6 |
| Ninguna: `pendiente` | 9 |
| Ninguna: `menos_de_7_dias_previos` (9) o combinada con `sin_campana_identificada` (6) | 15 |
| Ninguna: `sin_gasto_despues` | 6 |

Lectura: de las 78 ventanas sin doble lectura, **9 se resuelven solas** (pendientes), **0 son de volumen** (ninguna
referencia se perdió por pocas compras: la cuenta tiene compras de sobra) y **69 son estructurales**: 48 por sesiones
que no tocaron una campaña identificable (la mejora que más ventanas recupera es mapear mejor esas sesiones a su campaña),
21 por campañas nuevas sin semana previa y 6 por campañas que dejaron de entregar después del cambio. Se muestra en
`/analisis` bajo cada ventana como "sin lectura frente a …: causa".

## 5. Compras suficientes y confianza

La confianza sale de las **compras del tratamiento sumando antes y después** (`MIN_PURCHASES`):

| Compras (antes + después) | Confianza |
|---|---|
| ≥ 60 | `high` (alta) |
| 30 – 59 | `medium` (media) |
| 10 – 29 | `low` (baja) |
| < 10 | `insufficient` (insuficiente): no hay veredicto, solo "sin evidencia suficiente" |

Reglas adicionales:
- Ventana `pending`, o gasto 0 en el antes o en el después → `insufficient`.
- Ventana `preliminary` con confianza alta → se rebaja a media (todavía faltan días).
- Lecturas en `partial` → media como máximo; en `mixed` → baja como máximo (§4b).
- **Control pequeño:** si el resto de la cuenta suma menos de `MIN_CONTROL_PURCHASES = 10` compras (antes + después), la
  confianza se queda en **baja como máximo** aunque el tratamiento tenga muchas compras, y la ventana lleva la salvedad
  "Control pequeño: … la comparación vale poco". Un control con pocas compras tiene un ROAS muy ruidoso, y la diferencia en
  puntos hereda ese ruido.

Un ROAS con 10 compras se mueve mucho por una sola compra grande: por eso "baja" es baja de verdad. En el reporte, lo bajo
se presenta como indicio, nunca como conclusión.

## 6. Salvedades (`caveats`)

Cada ventana guarda una lista de salvedades deterministas que el reporte debe decir junto al veredicto:

1. **Presupuesto compartido (limitación explícita).** En una cuenta donde varias campañas compiten por el mismo gasto
   (CBO o simplemente presupuesto de cuenta acotado), **subir el presupuesto de una campaña reduce el gasto del resto**, y
   bajarlo lo aumenta. Por eso, cuando la sesión es un cambio de presupuesto (`kind = budget`), el control **no es
   independiente**: parte de lo que se ve en el "resto de la cuenta" es consecuencia del mismo cambio. La ventana lleva
   la salvedad "Presupuesto compartido: … el control no es independiente" con el `control_spend_pct` observado, y la
   narrativa tiene que decirla cuando aplique. Un `diff_roas_pts` alto en un cambio de presupuesto es un indicio más débil
   que el mismo número en un cambio de creativo.
2. **Control inestable.** Si el gasto del control se movió ≥ 20 % (`CONTROL_SPEND_SHIFT_PCT`) entre antes y después en una
   sesión que no fue de presupuesto, se avisa: algo más cambió en la cuenta (otra sesión, un recorte de Meta, un día sin
   entrega) y el control no fue estable.
3. **Control pequeño.** Descrito en §5.

Las salvedades no cambian el veredicto (salvo el tope de confianza del control pequeño): lo acompañan. Se muestran en
`/analisis` en ámbar bajo cada ventana.

## 7. Lo que el analista no hace todavía

- No hay prueba de significancia estadística ni intervalo de confianza: el umbral de 10 puntos y los mínimos de compras
  son convenciones para operar. Con la entidad *experimento* (siguiente paso de la Fase 3) el criterio de éxito se
  declara antes y el veredicto se compara contra ese criterio, no contra el umbral genérico.
- No corrige estacionalidad ni día de la semana: la ventana de 3 días puede comparar fin de semana contra entre semana.
  Las de 7 y 14 días la cubren; por eso el veredicto de 72 h se lee como preliminar aunque esté maduro.
- No separa el efecto de dos sesiones cercanas sobre las mismas campañas: las dos ventanas se traslapan y ambas ven lo
  mismo. La bitácora muestra qué más pasó en la ventana.
- Solo mira la campaña como unidad: un cambio de anuncio se juzga por su campaña completa.

## 8. Reporte semanal

- **Periodo:** lunes a domingo; `period_end` es el domingo (cierre) y `period_start = period_end − 6`. La semana previa es
  `period_end − 13` … `period_end − 7`. Se genera los lunes a las 00:17 CDMX en la corrida del collector, o con "Forzar
  análisis"; nunca se duplica para el mismo periodo.
- **Totales** (`totals.week`, `totals.previous`): gasto, compras, valor, ROAS y CPA de toda la cuenta con las mismas
  fórmulas de §3, y su variación relativa (`roas_pct`, `cpa_pct`, `spend_pct`).
- **Sesiones** del periodo con sus tres ventanas (estado, confianza, veredicto, deltas y salvedades) y el conteo de
  reinicios de aprendizaje.
- **Campañas:** ranking por ROAS de la semana entre las que gastaron más de 0 y tuvieron **≥ 10 compras**; `best` son las
  3 mejores y `worst` las 3 peores del resto (sin traslape entre listas).
- **Objetivos** del perfil de la cuenta (ROAS objetivo y de equilibrio, CPA objetivo, techo de gasto) para contextualizar.

## 9. Narrativa: cada número con su fila de evidencia

Cada fila del paquete lleva una referencia para citarla: `[T]` totales de la semana, `[T-1]` semana previa, `[O]`
objetivos del perfil, `[S1]`, `[S2]`… sesiones en orden cronológico, `[C1]`, `[C2]`… campañas del ranking. Reglas que
recibe el modelo (`packages/agents/src/narrative.ts`):

- **Toda oración con una cifra termina con la referencia de la fila de donde sale.** Una cifra sin referencia no se
  escribe. El modelo no suma, resta, promedia ni redondea: si el número no está en el paquete, no existe.
- Se habla de correlación ("coincidió con"), nunca de causa.
- Se respeta el estado y la confianza de cada ventana; lo preliminar se presenta como preliminar; las salvedades se
  dicen junto al veredicto. Un `agreement = mixed` nunca se presenta como mejora ni deterioro.
- Sin `ANTHROPIC_API_KEY`, el analista guarda la evidencia y los veredictos y deja `narrative` en nulo; la siguiente corrida
  con llave completa hasta tres reportes pendientes.

Para revisar un reporte basta seguir cada referencia hasta su fila en `analyses.evidence`: si un número no aparece ahí
tal cual, el reporte está mal y se corrige el prompt, no la evidencia.

## 10. Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| Ventanas, deltas, confianza, salvedades, umbrales | `packages/core/src/evaluation.ts` (`evaluateChange`, constantes exportadas) |
| Paquete de evidencia semanal y referencias | `packages/core/src/evaluation.ts` (`buildWeeklyEvidence`) |
| Carga de datos, guardado y corrida | `packages/agents/src/analyst.ts` |
| Narrativa con Claude | `packages/agents/src/narrative.ts` |
| Tablas | `evaluation_windows` (una fila por sesión y horizonte; migraciones 0009, 0010 salvedades, 0011 `baseline`, `agreement`, `reading`), `analyses` (una por cuenta y periodo) |
| Pantalla | `apps/web/app/analisis/page.tsx` |
