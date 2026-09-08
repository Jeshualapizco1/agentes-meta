# Preguntas al dueño · cómo se hacen las cosas y con qué reglas operan los agentes

> Jeshua: este documento existe porque tú fijas el **cómo**. Hasta hoy mucho criterio se dedujo del código, de
> valores por defecto o quedó esperando a Eduardo. Aquí está, en un solo lugar, todo lo que necesito que decidas tú
> para trabajar con precisión y sin suponer. Contesta en lenguaje natural, en el orden que quieras; lo que quede en
> blanco se queda como está hoy (el valor vigente va entre corchetes) y no se construye nada que dependa de ello.

**Cómo se usan las respuestas.** Cada respuesta va a un solo lugar y queda versionada:
- Reglas de trabajo → `CLAUDE.md` (lo que yo y cualquier worker de Codex debemos obedecer).
- Números y candados de la cuenta → Configuración (`account_profiles`), con historial.
- Criterio de acción del agente → filas en `rules` (versionadas) y anotado en `docs/06`.
- Prioridades de producto → `PENDIENTES.md` y `ROADMAP.md`.

Datos vigentes que uso como referencia (Supabase, 2026-09-07): Aromante 1 con margen bruto 27 %, ROAS de equilibrio 3.3,
ROAS meta 6, CPA objetivo $170, techo $15,000, piso $9,000, cambio máximo por movimiento 17 %, acumulado máximo 35 % en
7 días, espera 72 h, tope 10 acciones/día, factor de presupuesto comprometido 1.3, presupuesto de exploración 10 %,
simulado (`dry_run`) encendido, modo semi, lista blanca vacía, noes duros vacíos. Solo dos reglas activas, ambas de
techo. Campañas activas: «CBO | PROMO ESCALONADA» ($7,000/día), «CBO | PROSPECCIÓN» ($3,000/día), «CBO | SCALE»
($1,600/día). Últimos 14 días cerrados: gasto entre $13,600 y $15,700 diarios, ROAS entre 2.3 y 4.6.

---

## 1. Quién decide qué

| # | Pregunta | Por qué importa |
|---|---|---|
| 1.1 | ¿Quién es la autoridad final sobre las reglas del agente: tú, Eduardo, o tú con Eduardo como consulta? `docs/06` se escribió para Eduardo y lleva tres semanas sin respuesta. Si el criterio lo fijas tú, contesto `docs/06` contigo y Eduardo solo confirma. | Desbloquea la Fase 4 completa (reglas de acción). Hoy el estratega no tiene qué proponer. |
| 1.2 | ¿Quién puede **aprobar** una propuesta del agente en Hoy? [hoy: cualquier usuario de la app]. ¿Quién puede **cambiar reglas y candados**? [hoy: solo administradores]. ¿Quién puede **liberar el freno**? [hoy: solo administradores]. | Define roles en la app y a quién van las alertas de "propuesta pendiente". |
| 1.3 | Eduardo, Tavo, Josué y tú aparecen como actores en Meta. ¿Quién de ellos tendrá usuario en la app y con qué rol? [hoy: jeshualapizco@gmail.com, jeshua@aromante.mx (admin), ernesto@aromante.mx, josue@aromante.mx]. | Alta de usuarios y a quién se le pide "razón del cambio". |
| 1.4 | ¿Quién apaga el modo simulado en Aromante 1 y qué tiene que haber pasado antes? [propuesta actual en docs/07: System User con escritura + dos semanas de simulaciones revisadas + tu decisión explícita]. | Es la puerta a dinero real. Necesito el criterio escrito, no una fecha. |

## 2. Cómo trabajamos tú y yo (y los workers de Codex)

| # | Pregunta | Por qué importa |
|---|---|---|
| 2.1 | ¿Cuánta autonomía quieres por sesión? Opciones: (a) te presento plan y espero tu ok antes de tocar código; (b) construyo lo acordado en `PENDIENTES` sin preguntar y te reporto al final; (c) construyo y además decido el siguiente bloque yo. [hoy: mezcla de a y b]. | Evita que pregunte de más o de menos. |
| 2.2 | Codex: ¿lo uso por defecto para construir y yo audito, o solo cuando tú lo pidas? Si por defecto: ¿qué tamaño de tarea justifica un worker? ¿Qué modelo? [hoy: gpt-6-astra configurado; se usaron GPT-5.6 Sol y GPT-6 Astra]. ¿Cuántos workers en paralelo como máximo? | Costo y velocidad. Los sandboxes de Codex no corren vitest ni escriben en `docs/`; la validación la corro yo. |
| 2.3 | ¿Qué significa "hecho"? Propuesta: pruebas de core, agents y web en verde + typecheck + build + **desplegado en Netlify** + `PENDIENTES.md` actualizado. ¿Confirmas que sin despliegue no está hecho? [hoy: se desplegó a mano al final de la sesión]. | Define cuándo puedo decir "terminé". |
| 2.4 | ¿Despliego a Netlify en cada commit que toque `apps/web`, al final de cada sesión, o solo cuando tú lo pidas? | Riesgo de exponer trabajo a medias vs. tener producción al día. |
| 2.5 | ¿Cuándo prefieres que me detenga a preguntar y cuándo que asuma y te lo diga después? Propuesta: pregunto solo si la decisión mueve dinero, borra datos o cambia una regla de negocio; el resto lo asumo y lo anoto. | Es la regla que más cambia mi comportamiento. |
| 2.6 | ¿Cómo quieres el reporte al final de cada sesión: solo `PENDIENTES.md`, además un mensaje corto en el chat, además un aviso por Telegram? | Dónde miras tú. |
| 2.7 | ¿Cada cambio de comportamiento debe llevar su doc en el mismo commit (como ya se hace con `docs/05`)? ¿Vale para todo o solo para el analista y el estratega? | Disciplina de docs. |
| 2.8 | ¿Tienes una regla de horario? Por ejemplo: no desplegar ni correr el collector a mano entre X y Y, o nunca en lunes antes del reporte semanal. | Evita chocar con corridas programadas. |
| 2.9 | ¿Qué hago con lo que encuentro roto pero fuera del tema de la sesión: lo arreglo, lo anoto en `PENDIENTES`, o te aviso primero? | Alcance. |

## 3. Objetivo del negocio (los números que gobiernan todo)

| # | Pregunta | Por qué importa |
|---|---|---|
| 3.1 | ROAS de equilibrio: Configuración dice **3.3** y `docs/06` dice **2.5**. Con margen bruto 27 %, el punto de equilibrio aritmético es 1/0.27 = 3.7. ¿Cuál es el correcto y de dónde sale (incluye envío, comisiones, devoluciones)? | Todo veredicto "por debajo del equilibrio" depende de esta cifra. |
| 3.2 | Meta de ROAS **6** con la cuenta hoy entre 2.3 y 4.6. ¿Es meta a una fecha, aspiración, o el umbral para subir presupuesto? Si es meta: ¿para cuándo, y con qué gasto diario? | Sin fecha ni línea base no puedo medir "vamos bien". |
| 3.3 | Cuando ROAS y volumen chocan, ¿qué gana? Ejemplo: ¿prefieres $15,000/día a ROAS 3.5 o $9,000/día a ROAS 5? Da la regla, no el ejemplo. | Es la regla de escalar. Sin ella el agente no sabe qué optimizar. |
| 3.4 | ¿Qué es "escalar" para ti en números: gasto diario objetivo a 30, 60 y 90 días, manteniendo qué ROAS mínimo? | Define el techo futuro y la velocidad de subida. |
| 3.5 | CPA objetivo $170. ¿Es el mismo para prospección, promo y escala, o cambia por fase? ¿Cuál es el CPA máximo tolerable antes de pausar? | Reglas A1 y C3 de `docs/06`. |
| 3.6 | ¿Hay estacionalidad que deba saber (quincenas, Buen Fin, Navidad, Día del Padre, San Valentín) con techos distintos por periodo? | Techo por temporada (G3) y ventanas de "no operar". |
| 3.7 | Aromante 2 y 3 están dormidas. ¿Las ignoro por completo, las vigilo, o hay plan de despertarlas? | Alcance de collector y alertas. |

## 4. Reglas de acción del agente

Las preguntas de umbral concretas están en `docs/06` (secciones A–H). Lo que necesito aquí es el marco que `docs/06` no
cubre.

| # | Pregunta | Por qué importa |
|---|---|---|
| 4.1 | ¿Contestas tú `docs/06` en esta ronda? Si sí, empezamos por las que más valor dan con menos riesgo: **B (subir presupuesto)** y **C (bajar)**, después A (pausar anuncio), después D (mover). ¿De acuerdo con ese orden o prefieres otro? | Orden de construcción de reglas. |
| 4.2 | ¿Qué acción quieres que el agente proponga **primero** en producción, en modo semi? Recomendación: solo recortes y pausas (no mueven el techo, y el freno los cubre), y subidas solo cuando ninguna capa del techo esté cerrada. Última pasada (2026-09-07): presupuesto comprometido 77 % del techo ($11,600 activos en 3 campañas), pero gasto de ayer 101 % ($15,209), así que la capa 1 bloquea subidas hoy. Confirma si el techo sigue en $15,000. | Primer contacto con propuestas reales. |
| 4.3 | Paso a modo auto: hoy una regla se gana el auto tras **10** aprobaciones seguidas sin corrección [`promote_after` = 10]. ¿Confirmas 10? ¿Debe ser distinto por tipo de acción (más para subir que para pausar)? ¿Quieres que el paso a auto requiera además tu clic, o es automático? | Define cuándo el agente deja de pedir permiso. |
| 4.4 | Una propuesta no decidida expira en la siguiente pasada del estratega (24 h). ¿Correcto, o prefieres 48 h / hasta que alguien decida? | Cola de Hoy y alertas de expiradas. |
| 4.5 | Freno automático: hoy se activa si el gasto del día supera techo × **1.5**, exceso de propuestas, fallo de registro o problema de pago. ¿Confirmas 1.5? ¿Qué más debe frenar la cuenta (token vencido, cuenta deshabilitada por Meta, ROAS del día < X con gasto > Y)? | Lista de disparadores del freno. |
| 4.6 | Cuando el freno se activa, ¿el agente solo deja de proponer o además propone recortes para volver al techo? | Comportamiento bajo freno. |
| 4.7 | Tope de acciones por día está en **10** (docs/06 decía 5). ¿Cuál vale? | Candado. |
| 4.8 | Lista blanca vacía significa hoy que el agente no puede tocar nada. ¿Entran las tres campañas activas? ¿Regla por nombre (por ejemplo, todas las `CBO |`) o lista fija? | Sin esto no hay ninguna propuesta. |
| 4.9 | Noes duros, uno por línea. Sugerencias para que confirmes o tachea: nunca tocar una campaña de promo vigente; nunca bajar el presupuesto total de la cuenta por debajo del piso; nunca subir más de una campaña el mismo día; nunca proponer el día que una persona ya tocó la campaña. | Se aplican antes que cualquier regla. |
| 4.10 | Cuando un candado descarta una propuesta, ¿quieres verla en Hoy como "lo que habría hecho el agente" o solo en el detalle técnico? | Ruido en la pantalla principal. |

## 5. Pruebas (experimentos)

| # | Pregunta | Por qué importa |
|---|---|---|
| 5.1 | ¿Qué cuenta como prueba? Propuesta: cualquier cambio hecho por una persona con hipótesis y criterio de éxito declarados antes, o registrado después desde la Bitácora ("Registrar como prueba"). ¿Un cambio sin hipótesis es una prueba? | Define qué se mide y qué no. |
| 5.2 | Criterio de éxito por defecto al registrar en un clic: hoy toma ROAS meta del perfil y mínimo de compras del analista (10). ¿Prefieres "mejora contra la semana previa" como criterio por defecto en vez de la meta absoluta? | Hoy casi nada pasaría la meta 6; los veredictos saldrían todos rojos. |
| 5.3 | Duración por defecto de una prueba: ¿7 días cerrados? ¿14? ¿Depende del tipo de cambio? | Fecha de lectura y cuándo se pide el veredicto. |
| 5.4 | Presupuesto de exploración: 10 % del techo ($1,500/día) para pruebas nuevas. ¿Confirmas? ¿Cuántas pruebas simultáneas como máximo? | Tope de planeación (no es un tope aplicado en Meta). |
| 5.5 | ¿Quién confirma el veredicto de una prueba: quien la registró, cualquiera, o solo tú? ¿Puede el agente cerrarla solo cuando el criterio es claro? | Flujo evaluando → confirmado. |
| 5.6 | ¿Quieres que la app **exija** hipótesis antes de que un cambio cuente como prueba, o que sugiera una a partir del cambio (por ejemplo, "subiste 20 %: ¿esperas mantener ROAS ≥ 3.3?") y tú solo confirmes? | Fricción vs. rigor. Hoy hay 0 pruebas y 134 cambios. |

## 6. Bitácora y razones

| # | Pregunta | Por qué importa |
|---|---|---|
| 6.1 | 134 cambios sin razón. ¿Quieres que la app **pida** la razón a quien hizo el cambio (aviso por Telegram al día siguiente con enlace directo), que la sugiera, o que solo la permita? | Siguiente bloque de construcción según el análisis del 7 de septiembre. |
| 6.2 | ¿Quién debe escribir la razón: quien hizo el cambio en Meta, o tú por todos? | A quién se le manda el recordatorio. |
| 6.3 | Nomenclatura de campañas/ad sets/anuncios: ¿hay convención oficial? Si sí, escríbela (prefijos, separadores, qué significa cada parte). Hoy el parser marca `issues`, pero no hay regla escrita. | Vista de nomenclatura y reglas por nombre (lista blanca "todas las `CBO |`"). |
| 6.4 | ¿Qué nivel de detalle quieres ver de una sesión: solo el resumen legible, o también el evento crudo de Meta plegado para administradores? [hoy: crudo plegado]. | UI. |

## 7. Interfaz

| # | Pregunta | Por qué importa |
|---|---|---|
| 7.1 | Hoy es la pantalla de decisión. ¿Qué tres cosas quieres ver arriba, en este orden? Propuesta: campañas activas con ROAS contra equilibrio y meta, últimos cambios con resultado, propuestas pendientes. | Prioridad visual. |
| 7.2 | ¿Quién usa la app en móvil y quién en escritorio? ¿Qué pantallas deben funcionar bien en teléfono? | Dónde invertir en responsive. |
| 7.3 | De las 12 pantallas, ¿cuáles sobran o se fusionan? (Hoy, Bitácora, Cuenta, Anuncios, Horarios, Análisis, Pruebas, Decisiones, Estado, Configuración, Usuarios, Nomenclatura.) | Menos pantallas, menos mantenimiento. |
| 7.4 | Vocabulario: ¿"prueba" o "experimento"? ¿"propuesta" o "sugerencia"? ¿"agente" o "asistente"? Una palabra por concepto y se aplica en toda la app y en `copy-lint`. | Consistencia. |
| 7.5 | ¿Quieres que la app te muestre "qué haría el agente" aunque no haya reglas activas (modo sombra con reglas sugeridas), para calibrar antes de activarlas? | Calibración sin riesgo. |

## 8. Alertas y Telegram

| # | Pregunta | Por qué importa |
|---|---|---|
| 8.1 | Telegram sigue sin bot ni chat id. ¿Lo creas tú esta semana o prefieres otro canal (WhatsApp vía proveedor, correo)? | Sin canal no hay avisos; están en espera. |
| 8.2 | ¿Qué es **crítico** (aviso al momento)? Propuesta: collector caído dos pasadas seguidas, freno activado, cuenta deshabilitada por Meta, token a menos de 10 días, gasto del día > techo × 1.5. | Lista cerrada de críticos. |
| 8.3 | ¿A qué hora quieres el resumen diario y en qué horario no se manda nada salvo crítico? | Horario silencioso. |
| 8.4 | ¿A quién le llega cada tipo de aviso (grupo del equipo, solo tú, quien hizo el cambio)? | Destinatarios. |

## 9. Infraestructura y seguridad

| # | Pregunta | Por qué importa |
|---|---|---|
| 9.1 | System User de Meta: ¿lo creas tú en el Business Manager o te guío paso a paso? Necesitamos dos tokens: lectura para la bitácora, `ads_management` para ejecutar. El token actual vence **2026-11-02**. | Sin esto no hay ejecución real y la lectura caduca. |
| 9.2 | ¿La web de Netlify lleva token de Meta? [recomendación: no; las aprobaciones desde la web las ejecuta el collector en su siguiente pasada, con hasta 6 h de retraso]. Si quieres ejecución inmediata desde la web, hay que meter el token de escritura en Netlify. | Latencia vs. superficie de riesgo. |
| 9.3 | ¿Guardo las llaves de Claude (`ANTHROPIC_API_KEY`) y Telegram en los secretos de GitHub yo, con las que pongas en `.env`? | Reporte semanal con texto y avisos. |
| 9.4 | Token personal de Supabase y contraseña admin se pegaron en el chat el 2026-09-03. ¿Ya se rotaron? | Seguridad. |
| 9.5 | Supabase está en plan Free. ¿Aceptas el riesgo de pausa por inactividad y límites, o subimos a Pro cuando el agente ejecute dinero real? | Disponibilidad. |
| 9.6 | Copias de seguridad: ¿quieres un respaldo diario de la base fuera de Supabase (la bitácora es la fuente de verdad después de los 90 días de Meta)? | Pérdida de historial. |

## 10. Lo que hoy está fijado y quiero que confirmes o cambies

Cada línea es una decisión previa. Marca ✓ o escribe el cambio.

- [ ] Todo en español: código comentado, UI, docs, commits.
- [ ] Un commit por cambio y push inmediato a `origin main`; sin ramas.
- [ ] Los números los calcula código determinista; el LLM solo redacta y cita evidencia.
- [ ] Nunca juzgar el día en curso.
- [ ] "Coincidió con", nunca "causó".
- [ ] Nada se escribe en Meta sin propuesta, aprobación (o regla en auto ganada), candados, write-ahead log y rollback a un clic.
- [ ] El agente nunca borra, ni toca creativo, segmentación, puja u objetivo, ni enciende algo nuevo, ni reactiva lo que pausó una persona.
- [ ] No hay integración con Shopify ni métricas de tienda: la verdad es Meta.
- [ ] Techo en dos capas (gasto real y presupuesto comprometido × 1.3), ambas bloquean subidas.
- [ ] Cualquier rechazo, corrección o rollback regresa la regla a modo semi.
- [ ] La interfaz no muestra lenguaje técnico; `copy-lint` lo impide.
- [ ] Simulado encendido en Aromante 1 hasta decisión explícita tuya.

---

## Qué pasa después de que contestes

1. Transcribo cada respuesta al lugar que le toca (CLAUDE.md, Configuración, `rules`, `docs/06`, `PENDIENTES`) en un commit por bloque y te regreso el diff para que confirmes.
2. Con 1.1, 4.1 y 4.8 contestadas, construyo la primera regla de acción con su generador y su prueba, en modo semi y simulado.
3. Con 2.1 a 2.5 contestadas, fijo en `CLAUDE.md` cómo trabajo cada sesión, y a partir de ahí no vuelvo a preguntar sobre proceso.
