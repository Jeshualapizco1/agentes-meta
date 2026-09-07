# Auditoría integral del frontend y roadmap visual

Fecha: 5 de septiembre de 2026. Base revisada: `3ccb9f4` (`main`).

Complementa [mejorasCodex.md](mejorasCodex.md). Este documento propone cambios; **no implica que el rediseño ya esté implementado**.

El orden integrado con seguridad, datos, agentes y operación está en [roadmapImplementacionCodex.md](roadmapImplementacionCodex.md).

Seguimiento del 2026-09-06: [cuarto corte, shell/navegación/fechas](docs/11-shell-navegacion-codex.md). Los hallazgos conservan su fecha de auditoría; los enlaces a páginas se actualizaron a su ubicación en `(private)`, sin cambiar las URLs públicas.

## 1. Dictamen

El proyecto ya tiene una base útil: modo oscuro, tarjetas bento, tipografía consistente, indicadores de objetivos, bitácora y visualizaciones relacionadas con decisiones reales. No hace falta cambiar de framework ni reconstruir todo para conseguir el aspecto que buscas.

La distancia con un producto premium está, principalmente, en la **jerarquía de información**. Hoy conviven datos, instrucciones de uso, detalles de implementación, formularios, advertencias y acciones importantes con pesos visuales demasiado parecidos. Se ve más como una consola construida durante el desarrollo que como una herramienta terminada para operar una cuenta.

Mi dirección propuesta: **centro de operaciones publicitarias en carbón, naranja y violeta**, con una pregunta por bloque, decisiones visibles y evidencia desplegable. “Tecnológica y poderosa” debe sentirse en la calidad de la información y del control, no en llenar todo de efectos.

Cinco decisiones que tomaría:

1. Mantener el bento, pero dar protagonismo a lo que necesita atención, no a un ROAS gigante.
2. Sustituir el ambiente azul y el brillo generalizado por superficies carbón, profundidad discreta y acentos selectivos.
3. Separar operación, análisis y administración; conservar cuenta y periodo durante la navegación.
4. Sacar formularios, mensajes de desarrollo y explicaciones repetidas de las vistas de lectura.
5. Hacer inequívoca la diferencia entre sugerir, aprobar, simular, ejecutar y confirmar un cambio en Meta.

“Fácil de entender” significa prevenir errores y explicar las consecuencias. No significa ocultar importes, incertidumbre, permisos o límites de seguridad.

## 2. Alcance, evidencia y límites

Se revisaron las **12 pantallas de contenido**, la ruta inicial, el layout, los **9 componentes compartidos** del frontend, estilos, formateadores, rangos, navegación y las acciones de servidor que determinan el comportamiento visible. También se contrastaron las cinco capturas existentes con el código y con tu imagen de referencia.

| Superficie | Fuentes principales | Evidencia visual adicional |
| --- | --- | --- |
| Shell, navegación y entrada | [layout](apps/web/app/layout.tsx), [Nav](apps/web/components/Nav.tsx), [estilos](apps/web/app/globals.css), [ruta inicial](apps/web/app/page.tsx) | Las cinco capturas |
| Hoy | [pantalla](apps/web/app/%28private%29/hoy/page.tsx), [acciones](apps/web/app/hoy/actions.ts) | [hoy.png](docs/capturas/hoy.png) |
| Cuenta | [pantalla](apps/web/app/%28private%29/cuenta/page.tsx) | [cuenta.png](docs/capturas/cuenta.png) |
| Anuncios | [pantalla](apps/web/app/%28private%29/anuncios/page.tsx), [acciones](apps/web/app/anuncios/actions.ts) | [anuncios.png](docs/capturas/anuncios.png) |
| Análisis | [pantalla](apps/web/app/%28private%29/analisis/page.tsx), [acciones](apps/web/app/analisis/actions.ts) | [analisis.png](docs/capturas/analisis.png) |
| Horarios | [pantalla](apps/web/app/%28private%29/horarios/page.tsx) | [horarios.png](docs/capturas/horarios.png) |
| Bitácora | [pantalla](apps/web/app/%28private%29/bitacora/page.tsx), [fila](apps/web/components/SessionRow.tsx), [filtros](apps/web/components/Filters.tsx) | Código; sin captura actual validada |
| Sesión | [pantalla](apps/web/app/%28private%29/sesion/%5Bid%5D/page.tsx), [acciones](apps/web/app/sesion/%5Bid%5D/actions.ts) | Código |
| Experimentos | [pantalla](apps/web/app/%28private%29/experimentos/page.tsx), [acciones](apps/web/app/experimentos/actions.ts) | Código |
| Configuración | [pantalla](apps/web/app/%28private%29/configuracion/page.tsx), [acciones](apps/web/app/configuracion/actions.ts) | Código |
| Usuarios | [pantalla](apps/web/app/%28private%29/usuarios/page.tsx), [acciones](apps/web/app/usuarios/actions.ts) | Código |
| Login | [pantalla](apps/web/app/login/page.tsx), [acciones](apps/web/app/login/actions.ts), [salida](apps/web/app/auth/signout/route.ts) | Código |
| Estado del sistema | [pantalla](apps/web/app/%28private%29/estado/page.tsx) | Código |
| Componentes restantes | [Card](apps/web/components/Card.tsx), [Kpi](apps/web/components/Kpi.tsx), [Chip](apps/web/components/Chip.tsx), [TimeSeries](apps/web/components/TimeSeries.tsx), [Sparkline](apps/web/components/Sparkline.tsx), [DateRange](apps/web/components/DateRange.tsx) | Capturas y código |
| Contratos transversales | [format](apps/web/lib/format.ts), [range](apps/web/lib/range.ts), [db](apps/web/lib/db.ts), [auth](apps/web/lib/auth.ts), [admin](apps/web/lib/admin.ts), [middleware](apps/web/middleware.ts), [dependencias](apps/web/package.json) | Revisión estática |

Limitaciones importantes:

- La habilidad de navegador no encontró un navegador conectado: el inventario disponible estaba vacío. Por ello **no hubo recorrido interactivo de la versión actual**, pruebas táctiles ni medición real del layout en distintos dispositivos.
- Las capturas son históricas. Por ejemplo, `cuenta.png` incluye un aviso de Shopify que ya no aparece en el código revisado. También hay diferencias en la navegación. No se contabilizan esos elementos antiguos como errores actuales.
- La repetición de campañas en mejores/peores de una captura de Análisis no se da por vigente: el cálculo se corrigió. Sí se encontró un riesgo similar todavía presente en **Horarios**, explicado más adelante.
- Las observaciones sobre jerarquía y estética son criterio de diseño apoyado en código y capturas, no resultados de un estudio con usuarios. Los riesgos de desbordamiento, foco y tiempos de uso deben validarse en navegador.
- No se midieron Core Web Vitals ni se certificó accesibilidad. Los contrastes que se incluyen son cálculos sobre colores sólidos propuestos, no sobre todos los píxeles de la aplicación.
- Este trabajo no implementó funcionalidades ni ejecutó operaciones contra Meta. La revisión visual no reemplaza los bloqueos de seguridad de la auditoría general.

### Cómo leer las prioridades

- **P0:** una presentación incorrecta puede inducir una decisión financiera insegura o afirmar un resultado no confirmado. Bloquea la liberación de esos flujos, no impide trabajar en estilos.
- **P1:** afecta comprensión, navegación o una tarea frecuente. Entra en el primer ciclo del rediseño.
- **P2:** mejora calidad, consistencia o profundidad; después del recorrido principal, salvo que sea muy barata de resolver junto con otro cambio.

Los identificadores `V-...` pertenecen únicamente a esta auditoría. Hay **75 hallazgos: 5 P0, 59 P1 y 11 P2**, entre aspectos globales, interacción, visualización y pantallas. Algunas soluciones son compartidas; no son 75 proyectos independientes.

## 3. Qué tomar de tu referencia, y qué no

| Elemento de la imagen | Traducción a Agentes Meta |
| --- | --- |
| Superficies casi negras, diferenciadas por niveles | Fondo carbón, sidebar ligeramente distinto, tarjetas sólidas y paneles elevados. Evitar que todo tenga un tinte azul |
| Bento compacto | Cuatro indicadores breves, un bloque principal y módulos secundarios con tamaños según importancia |
| Naranja y violeta | Naranja para la acción principal; violeta para identidad del agente y series identificadas. El significado debe ser estable |
| Gráfica dominante | Una gráfica útil con periodo, unidades, referencias y acceso a la evidencia, no una ilustración con números |
| Separadores y bordes tenues | Profundidad discreta; contraste más fuerte donde sea necesario reconocer un control |
| Sidebar silenciosa | Secciones agrupadas, estado activo sobrio, administración separada |
| Degradados localizados | Un acento muy sutil en una tarjeta destacada o en un detalle de marca; no todas las tarjetas iluminadas |

No copiaría el texto minúsculo del mockup, la promoción en la sidebar, un buscador global sin alcance definido, gráficas 3D ni barras positivas dibujadas hacia abajo que puedan parecer valores negativos. Tampoco agregaría “ganancia mensual” porque el proyecto dispone de ingresos atribuidos y gasto, no necesariamente de utilidad neta verificable.

La referencia inspira el lenguaje visual, no define el modelo de negocio. Tener apariencia de SaaS premium no exige agregar facturación, planes, chat, notificaciones vacías o una landing dentro de la herramienta. La intención inicial tipo Testmia sirve como contexto de producto; este documento no afirma una comparación funcional actual con ese servicio.

## 4. Hallazgos transversales

### 4.1 Jerarquía, materiales y navegación

Fuentes: `globals.css`, `layout.tsx`, `Nav.tsx`, `Card.tsx`, `Kpi.tsx`, `Chip.tsx` y los encabezados de las pantallas.

| ID | Prioridad | Hallazgo y cambio recomendado |
| --- | --- | --- |
| V-G01 | P1 | **La paleta actual no es carbón.** `#0b1220`, `#0e1729`, `#141f36` y el degradado `#2563eb → #7c3aed` construyen una identidad azul. Cambiar tokens de superficie y acento, y revisar también colores literales en SVG y avatares. Cambiar solo `--color-accent` no alcanza |
| V-G02 | P1 | **Hay demasiado tratamiento de “hero”.** Fondo radial, blur de tarjetas, glow de líneas y tarjetas destacadas compiten con el contenido. Reservar profundidad especial para una superficie focal; tarjetas ordinarias sólidas, sin halo |
| V-G03 | P1 | **La escala tipográfica concentra atención en cifras y la quita a su significado.** Abundan ayudas de 11 px, mayúsculas y monoespaciada; algunas etiquetas SVG bajan a 9–10 px. Elevar etiquetas importantes y cuerpo; reservar mono para códigos y datos técnicos opcionales |
| V-G04 | P1 | **Los títulos son largos y repiten la cuenta.** Frases como “qué ayudó y qué no” o “cuándo rinde la cuenta, por día y hora”, sumadas a párrafos introductorios, retrasan la lectura del contenido. Usar títulos cortos y un contexto de cuenta compartido |
| V-G05 | P1 | **Diez destinos tienen casi el mismo peso.** `NAV` mezcla trabajo diario, análisis y administración. Agrupar por tarea y mostrar accesos administrativos según capacidades; ocultar un enlace no sustituye autorización del servidor |
| V-G06 | P1 | **La navegación pierde contexto.** Los enlaces de `Nav` apuntan a rutas sin `account` ni periodo. Centralizar el contexto y preservar parámetros compatibles; no propagar filtros específicos a pantallas que no los entienden |
| V-G07 | P1 | **El móvil recibe una tira horizontal con todas las secciones.** El layout añade además marca, usuario, zona y salida. Proponer encabezado compacto y menú accesible; no depender de descubrir enlaces fuera de pantalla |
| V-G08 | P1 | **El sistema de componentes está incompleto.** Hay tarjetas, chips y KPI, pero botones, campos, avisos, encabezados y tablas se componen de nuevo en cada ruta. Crear contratos compartidos antes de retocar doce pantallas por separado |
| V-G09 | P1 | **La interfaz cuenta demasiado del proceso de desarrollo.** “Fase 4b”, llaves de GitHub, nombres de reglas, corridas y referencias a personas del proyecto ocupan espacios de operación. Llevar diagnóstico a Estado y ayuda técnica; conservar en primer nivel únicamente consecuencias y bloqueos pertinentes |
| V-G10 | P1 | **El color mezcla identidad, importancia y resultado.** Un cambio `major` o un rol administrador puede verse verde sin significar éxito. Separar estados de operación, rendimiento y autoría; acompañar color con texto/icono |
| V-G11 | P2 | **Faltan reglas de densidad y dimensiones por función.** `span`, `rows`, padding y rejillas se usan caso por caso. Definir tamaños de KPI, tabla, panel de decisión y formulario; un bento no obliga a convertir todo en tarjetas del mismo estilo |
| V-G12 | P2 | **Falta una política de acabado global.** Tipos cargados mediante CSS externo, transiciones dispersas, indicadores de expansión retirados y ausencia de regla de movimiento reducido. Mantener la tipografía actual si funciona, estudiar entrega local de fuentes y definir foco, expansión, animación y carga como parte del sistema |

### 4.2 Interacción y estados

Fuentes: `DateRange.tsx`, `range.ts`, formularios y acciones de las rutas; inventario de archivos de `app`.

| ID | Prioridad | Hallazgo y cambio recomendado |
| --- | --- | --- |
| V-I01 | P1 | **El selector de atajos de fecha no actualiza el valor controlado.** El `select` usa `value={custom ? 'custom' : String(days)}`, pero `onChange` solo cambia `custom`. Elegir otro atajo no almacena el nuevo número de días. Sin una actualización del padre, la selección vuelve a `days`. Resolver estado del periodo y comprobar URL, etiqueta y consulta conjuntamente |
| V-I02 | P1 | **El calendario tiene efectos inesperados.** Al elegir inicio mueve el foco e intenta abrir el calendario final; el límite “hoy” procede de UTC del navegador y no del contexto de cuenta. Evitar salto de foco automático, validar rangos de forma explícita y definir una sola zona para cada consulta |
| V-I03 | P1 | **Enviar una acción tiene poca retroalimentación.** Formularios de revisión, configuración, experimentos y análisis no ofrecen un patrón compartido de pendiente, éxito y error. Mostrar estado local, impedir doble envío en el cliente y conservar datos; la idempotencia real sigue siendo responsabilidad del servidor |
| V-I04 | P0 | **Los estados visibles no son suficientemente fiables.** En varias rutas `data ?? []` convierte errores en pantallas aparentemente vacías. Un query param también puede disparar un aviso de éxito sin demostrar la operación. Distinguir carga fallida, ausencia real, resultado pendiente y éxito confirmado por servidor |
| V-I05 | P1 | **Falta un patrón para formularios y riesgo.** Hay placeholders como única etiqueta, acciones destructivas junto a edición ordinaria y entradas persistentes en listados. Usar etiquetas, errores asociados, resumen de cambios y confirmación proporcional; no llenar la app de modales para acciones inocuas |
| V-I06 | P1 | **Las transiciones entre rutas no están diseñadas integralmente.** No hay `loading.tsx`, `error.tsx` ni `not-found.tsx` propios en el inventario revisado; la metadata es genérica. Añadir recuperación, títulos por pantalla, gestión de foco y protección de borradores según el flujo. Las páginas por defecto del framework no equivalen a una experiencia terminada |

### 4.3 Visualización de datos

Fuentes: `TimeSeries.tsx`, `Sparkline.tsx`, `Kpi.tsx`, `cuenta/page.tsx`, `hoy/page.tsx` y `horarios/page.tsx`.

| ID | Prioridad | Hallazgo y cambio recomendado |
| --- | --- | --- |
| V-D01 | P1 | **El detalle de las series depende del ratón.** Se usa `onMouseMove` y la instrucción “pasa el cursor”; las celdas horarias dependen de `title`. Diseñar inspección por toque/teclado y alternativa tabular o resumen equivalente. `role='img'` con un título no expone los valores |
| V-D02 | P1 | **Se pierde precisión visual al reducir el SVG.** `TimeSeries` usa un `viewBox` fijo de 920 y texto de 11 unidades; en móvil se escala todo. `Sparkline` estira con `preserveAspectRatio='none'`. Ajustar ticks, altura y etiquetas al espacio real, sin simplemente encoger un dashboard de escritorio |
| V-D03 | P1 | **La cronología depende de que los datos ya estén densificados.** Ambas series distribuyen puntos por índice, no por distancia entre fechas. Rompen la línea ante `null`, lo cual es bueno, pero un día totalmente ausente no crea por sí mismo ese hueco. Entregar calendario completo o usar escala temporal; no conectar periodos sin cobertura como continuidad demostrada |
| V-D04 | P1 | **Los marcadores prometen más contexto del que entregan.** `TimeSeries.Marker` incluye `href`, `actor` y `summary`, pero la gráfica no permite abrir esos cambios; el tooltip solo cuenta. Agrupar eventos del día y ofrecer un listado accesible enlazado a la sesión; diferenciar un evento de un dato diario |
| V-D05 | P1 | **Se mezclan ventanas, cierres y zonas.** En Hoy, KPI de siete días cerrados y sparkline de catorce conviven; algunos marcadores se ubican en CDMX sobre métricas de la cuenta. Mostrar alcance explícito y alinear calendario, zona, marcadores y sombreado del día parcial. Dependencia de calidad de datos, no solo de etiquetas |
| V-D06 | P2 | **Los objetivos se explican mejor de lo que se visualizan.** Anillos y chips consumen espacio, mientras las series no muestran líneas de objetivo/equilibrio. Priorizar valor, referencia y distancia al objetivo. Evitar presentar ROAS/CPA como un “porcentaje completado” inequívoco |
| V-D07 | P1 | **Las unidades y colores necesitan un contrato.** Hay MXN, ROAS con distinta precisión, porcentajes, gasto en cientos dentro del heatmap y color verde incluso para magnitud de gasto. Usar formatos comunes, leyendas explícitas y color neutral para gasto: gastar menos no significa automáticamente mejorar |
| V-D08 | P2 | **Faltan casos límite gráficos formalizados.** Un único punto puede no dibujar una línea visible; todos los valores nulos, valores extremos, marcadores superpuestos y tooltips en bordes necesitan diseños específicos. En `TimeSeries`, el cálculo del cursor toma el rectángulo de un `<g>` y lo escala al ancho total del SVG: validar alineación real antes de reutilizarlo como base del rediseño |

## 5. Auditoría por pantalla

Las evidencias de cada apartado corresponden a los archivos enlazados en el inventario. Los cambios siguientes son propuestas; las dependencias de servidor se señalan para no confundir un arreglo visual con una corrección funcional.

### 5.1 Hoy: convertir el resumen en un centro de decisiones

| ID | Prioridad | Hallazgo y mejora |
| --- | --- | --- |
| V-H01 | P1 | El ROAS ocupa ocho columnas y dos filas, mientras la cola de propuestas aparece al final en una tarjeta de cuatro columnas. Redistribuir: indicadores compactos arriba, una zona principal de decisiones y tendencia, y actividad secundaria debajo |
| V-H02 | P0 | El aviso tras decidir dice que en modo semi nadie escribe en Meta hasta una fase futura; además se pinta verde por existir `p.decidido`, incluso si el resultado es fallido. Mostrar el estado real devuelto por el servidor. Exponer el modo efectivo de ejecución: la consulta actual del perfil ni siquiera trae `dry_run` |
| V-H03 | P0 | Una propuesta muestra `before_value → after_value` mediante `String`, nivel y regla técnicos, con monto editable, aprobación y rechazo en la misma fila. Separar resumen de revisión: entidad, importe actual, nuevo importe, diferencia, alcance, vigencia y efecto real del botón. No habilitar ejecución sin las validaciones P0 de la auditoría general |
| V-H04 | P1 | El freno está dentro de la tarjeta de propuestas, debajo de otros elementos. Darle ubicación persistente y explicar qué detiene: al agente, no necesariamente la entrega de anuncios de Meta. Mantener activación rápida; liberación restringida y con motivo |
| V-H05 | P1 | Las alertas exponen `kind`, y “ninguna alerta” puede parecer prueba de salud general. Priorizar por impacto y recuperación; distinguir ausencia de alertas de sincronización reciente y completa. No usar “todo en orden” si falló una consulta o faltan datos |
| V-H06 | P2 | Fechas recortadas con `fmtDay(...).split(',')[0]` pueden quedarse solo en día de la semana; también hay instrucciones sobre reglas futuras y el cuestionario de una persona. Fechas cortas inequívocas, estado vacío accionable y lenguaje de producto |

**Primera vista:** cuenta, modo, actualización/cobertura, cuatro indicadores, necesidades de atención y tendencia. **Al abrir una propuesta:** evidencia, límites, revisión del importe y confirmación. **Fuera del primer nivel:** reglas internas, JSON de estadísticas y fases del proyecto.

Aceptación: una persona identifica cuenta, periodo y modo sin desplazarse en escritorio; llega a una propuesta sin recorrer todas las tarjetas; distingue simulación de ejecución sin interpretar colores. Cero aviso de éxito para un resultado fallido o desconocido.

### 5.2 Cuenta: rendimiento antes que exposición técnica

| ID | Prioridad | Hallazgo y mejora |
| --- | --- | --- |
| V-C01 | P1 | “Cuenta” parece administración, pero la pantalla es rendimiento. Renombrar el acceso como **Rendimiento**, conservando `/cuenta` y los enlaces existentes |
| V-C02 | P1 | El periodo del gráfico y los KPI no obedecen la misma expectativa: los KPI usan la lógica de últimos siete días dentro de los datos disponibles. Alinear al periodo seleccionado y comparar con uno equivalente, o declarar inequívocamente la ventana fija. Preferencia: resumen del periodo visible |
| V-C03 | P1 | Tres gráficas completas, chips de objetivos y explicación larga generan una página de lectura extensa. Una métrica principal seleccionable —ROAS, gasto o CPA— con comparación anterior y referencias; ofrecer pequeñas gráficas complementarias solo si contestan una pregunta distinta |
| V-C04 | P1 | Marcadores, día parcial y aprendizaje requieren demasiada leyenda. Mostrar hechos y referencias junto al dato. Si el reinicio de aprendizaje se infiere por heurística, no presentarlo como confirmación de Meta; conservar esa distinción en tooltip y detalle |

**Primera vista:** cuatro métricas del rango, evolución principal, objetivos pertinentes y estado de datos. **Detalle:** cambios del periodo, otras métricas y metodología. No reproducir la cola completa de Hoy.

Aceptación: cambiar 7 → 30 días actualiza etiqueta, URL, consulta y métricas correspondientes; elegir una métrica no pierde la cuenta; el dato parcial no se presenta como comparación cerrada.

### 5.3 Anuncios: leer primero, revisar después

| ID | Prioridad | Hallazgo y mejora |
| --- | --- | --- |
| V-A01 | P1 | Diez columnas mezclan rendimiento, estado, revisión y acciones. La tabla sí tiene `overflow-x-auto`; el problema confirmado es su dependencia del desplazamiento horizontal, no un desbordamiento del documento probado. Dejar seis columnas iniciales y mover métricas secundarias al detalle |
| V-A02 | P1 | Cada fila expone entrada de nota y botón. Con 25/50 filas aumenta ruido y recorrido de teclado. Sustituir por “Revisar anuncio”, con panel de creativo, métricas, historial y nota opcional; mantener la acción rápida con resultado claro |
| V-A03 | P1 | Faltan búsqueda contextual y selección más directa de campaña; ordenar por no revisados no equivale a filtrar únicamente no revisados. Añadir búsqueda por nombre/campaña y un filtro real de pendientes, con conteo y estado sin resultados |
| V-A04 | P2 | Miniaturas de 48 px, recorte y nombres truncados dificultan reconocer creativos. Añadir vista ampliada, fallback de imagen rota, dimensiones reservadas y carga diferida donde convenga. Si es botón, darle nombre accesible; no convertir una miniatura decorativa en ruido para lectores de pantalla |
| V-A05 | P1 | KPI, ayudas y filtros empujan la tabla; la paginación visual tampoco resuelve la carga previa de todos los datos. Compactar cabecera y resumen, preservar orden/filtros al revisar y planificar paginación/ordenamiento en servidor cuando el volumen lo requiera |

**Columnas propuestas:** Anuncio —incluye miniatura, campaña y estado—, Gasto, Compras, ROAS, CPA, Revisión. Valor atribuido, CTR, jerarquía completa e historial van al panel. No ocultar métricas necesarias para aprobar una decisión financiera dentro de este panel genérico.

Aceptación: encontrar un anuncio por nombre; revisar y volver a la misma página/filtros; cero formulario de nota visible en filas no seleccionadas; nombre e importe legibles sin tooltip obligatorio.

### 5.4 Análisis: conclusiones rastreables, no una pared de reportes

| ID | Prioridad | Hallazgo y mejora |
| --- | --- | --- |
| V-N01 | P1 | “Qué ayudó y qué no” sugiere causalidad, aunque el texto explica correlación. Usar **Aprendizajes** como acceso y distinguir señal, hipótesis y conclusión. Una mejora observada no demuestra que un cambio la causó |
| V-N02 | P1 | Cada sesión despliega tres ventanas con veredictos y salvedades. Crear resumen de hallazgos prioritarios, filtros por madurez/evidencia y filas expandibles; las contradicciones importantes deben aparecer en el resumen, no quedar ocultas |
| V-N03 | P1 | `tone(w)` decide verde/rojo por `reading` después de comprobar solo pendiente/evidencia insuficiente; no verifica `agreement`, pese al comentario sobre dos lecturas coincidentes. Definir un estado visual derivado de todas las condiciones y cubrirlo con pruebas. No usar color concluyente para un indicio ambiguo |
| V-N04 | P1 | Se cuentan varios reportes pero no hay selector de historial; se expone configuración de la llave y se muestra narrativa como texto con clases que no la convierten en Markdown estructurado. Ofrecer historial, estado de generación y evidencia disponible; renderizar estructura de forma segura si el contrato es Markdown, o producir bloques estructurados. “Actualizar análisis” debe informar progreso real |

**Primera vista:** periodo del reporte, fecha de evidencia, hasta tres hallazgos relevantes realmente disponibles y evaluaciones listas para leer. **Detalle:** ventanas de 72 h/7 d/14 d, referencias, salvedades, narrativa extensa y metodología. **Administración:** llave, modelo y diagnóstico.

Aceptación: todo hallazgo abre su evidencia; “preliminar”, “mixto” y “sin datos” nunca parecen un éxito concluyente; los reportes anteriores son accesibles; regenerar evidencia no presenta una narrativa vieja como recién calculada.

### 5.5 Horarios: ayudar a interpretar, no solo colorear 168 celdas

| ID | Prioridad | Hallazgo y mejora |
| --- | --- | --- |
| V-R01 | P1 | La rejilla de 7 × 24 domina incluso cuando hay pocas celdas útiles. Mostrar primero cobertura y bloques de madrugada/mañana/tarde/noche; conservar la rejilla horaria como vista detallada. “Ampliar periodo” debe ser una acción, no solo una instrucción |
| V-R02 | P1 | Celdas vacías agrupan ausencia de datos, falta de gasto y muestra insuficiente; ROAS/CPA indefinidos pueden convertirse en cero en cálculos de presentación. Diseñar estados distintos con texto/leyenda y evitar inferir rentabilidad a partir de ausencia |
| V-R03 | P1 | `best` y `worst` toman independientemente hasta tres bloques del mismo conjunto: con menos de seis candidatos pueden repetirse. Excluir coincidencias o mostrar un ranking único con evidencia. Diez compras no garantizan por sí solas representatividad temporal |
| V-R04 | P2 | La gráfica secundaria combina altura=gasto, color=ROAS y número=ROAS con texto muy pequeño; el heatmap cambia unidades a cientos de MXN. Simplificar la codificación y adaptar a móvil con bloques o un día seleccionado. Zona convertida y cobertura por bloque deben acompañar cualquier recomendación |

**Primera vista:** “hay/no hay evidencia suficiente para comparar horarios”, cobertura, bloques comparables y métrica seleccionada. **Detalle:** 168 celdas, gasto por hora y tabla completa. No recomendar modificar horarios automáticamente solo porque una zona del mapa se ve brillante.

Aceptación: un mismo bloque no aparece simultáneamente como mejor y peor; se distingue cero de sin dato; los usuarios pueden consultar valores sin ratón y entender en qué zona horaria están leyendo.

### 5.6 Bitácora: una historia de cambios, no una pila de días vacíos

| ID | Prioridad | Hallazgo y mejora |
| --- | --- | --- |
| V-B01 | P1 | Cada día sin sesiones puede ocupar una tarjeta a lo largo del periodo. Agrupar intervalos vacíos y priorizar días con actividad; “sin cambios” solo cuando la cobertura demuestra ausencia, no cuando faltó recolección |
| V-B02 | P1 | El valor inicial del filtro de actor en `Filters` puede no coincidir con el filtro efectivo si falta el parámetro; “limpiar” tampoco restablece necesariamente todos los filtros. Usar un único estado resuelto por el servidor y mostrar filtros activos de forma explícita |
| V-B03 | P2 | Varias cifras resumen, avatares multicolor y etiquetas compiten con el cambio. Promover entidad, antes/después y motivo; autor y hora como contexto. “Mayor” significa relevancia, no rendimiento positivo |
| V-B04 | P1 | El conteo de anotaciones y el límite de sesiones pueden producir una impresión falsa de completitud. Resolver carga de anotaciones, paginación y aviso de cobertura/límite antes de prometer “todo el historial” o “sin motivo” |

**Primera vista:** búsqueda/filtros, cronología de cambios relevantes y motivo disponible. **Detalle:** eventos menores y técnicos, recuentos y días sin actividad. No suprimir el historial necesario para auditar.

Aceptación: el filtro que se ve es el que se aplica; abrir sesión y volver restaura contexto; un intervalo sin cobertura no se etiqueta como inactividad confirmada.

### 5.7 Sesión: explicar qué cambió antes de pedir una nota

| ID | Prioridad | Hallazgo y mejora |
| --- | --- | --- |
| V-S01 | P1 | El encabezado y el formulario de anotación preceden a la evidencia detallada. Mostrar primero resumen, autor, fecha, entidades y diferencias; después motivo, impacto observado y anotaciones |
| V-S02 | P1 | Eventos, propiedades de segmentación y valores crudos exigen conocimiento del sistema. Introducir diccionario de campos y comparador antes/después con unidades. Conservar representación original en “Detalle técnico”, no reemplazar el dato auditado |
| V-S03 | P1 | Razón, hipótesis y éxito esperado compiten en el formulario, y el salto a experimento mezcla documentación retrospectiva con planificación. Una nota principal y campos opcionales pertinentes; etiquetar explícitamente experimentos creados a partir de un cambio ya realizado |
| V-S04 | P2 | Se eliminan indicadores nativos de expansión sin sustitución consistente; anotaciones y envío carecen de un patrón completo de fecha, guardado y recuperación. Añadir chevron, etiquetas claras, estado guardando/guardado y protección contra perder texto al navegar |

Aceptación: se entiende el cambio sin abrir datos crudos; una nota conserva texto al fallar; cada anotación muestra autor y fecha; convertir a experimento no afirma que el test fue predefinido.

### 5.8 Experimentos: priorizar los activos y guiar la creación

| ID | Prioridad | Hallazgo y mejora |
| --- | --- | --- |
| V-E01 | P1 | El formulario completo de creación ocupa la cabecera antes del trabajo activo. Mostrar experimentos activos/listos para evaluar; “Nuevo experimento” abre un flujo dedicado de tres pasos |
| V-E02 | P1 | Muchos campos y rejillas anidadas dificultan entender unidades y relación entre presupuesto, duración y criterios. Agrupar hipótesis/alcance, límites/criterios y revisión; etiquetas persistentes con ejemplos fuera del placeholder |
| V-E03 | P1 | La hipótesis es `required` también al enviar “Guardar borrador”; sin una estrategia distinta de validación, el navegador impide ciertos borradores incompletos. Permitir guardado parcial conscientemente y validar lo obligatorio al iniciar |
| V-E04 | P1 | Los borradores no tienen una experiencia clara de edición/reanudación. Ofrecer continuar, editar y descartar borrador con consecuencias explícitas. Conservar estado y errores por campo al volver de una acción |
| V-E05 | P0 | “Graduar”, “descartar” y estados de éxito pueden confundirse con acciones sobre Meta. Mostrar exactamente si se cambia el registro, se solicita una acción o se modifica una campaña. Progreso como días/compras frente a criterios, nunca como probabilidad de éxito inventada |

**Primera vista:** activos, listos para evaluar y borradores, con filtros breves. **Detalle:** hipótesis, métricas, presupuesto, fechas, criterios, decisiones y evidencia. El resumen de una acción con efecto económico siempre incluye el importe y alcance.

Aceptación: guardar y reabrir un borrador incompleto; iniciar solo con criterios válidos; distinguir “terminar experimento” de cerrar un panel; no afirmar cambios en Meta si solo se modificó el registro local.

### 5.9 Configuración: que la seguridad sea entendible

| ID | Prioridad | Hallazgo y mejora |
| --- | --- | --- |
| V-F01 | P1 | Economía y múltiples candados se presentan en rejillas densas con ayudas largas. Separar Economía, Límites, Campañas autorizadas y Modo de operación; no usar bento de métricas para formularios complejos |
| V-F02 | P0 | `dry_run`, modos deshabilitados y textos sobre fases no constituyen una explicación segura del modo efectivo. Añadir resumen persistente de consecuencias y un flujo específico para habilitar ejecución real. Las notas de “noes duros” no deben presentarse como restricciones automáticas si no se aplican |
| V-F03 | P1 | Listar únicamente campañas activas puede ocultar autorizaciones existentes y perderlas al guardar otros campos. Mostrar seleccionadas inactivas por separado y advertir el cambio de alcance; depende de corregir la persistencia, no de maquillar checkboxes |
| V-F04 | P1 | No hay experiencia completa de cambios sin guardar, diferencias, error por campo y conflicto con otra edición. Añadir resumen antes de guardar y barra de acciones; proteger cambios al cambiar cuenta. No prometer que un porcentaje específico siempre evita aprendizaje o gasto extra |

Aceptación: se entiende moneda/unidad de cada límite; cambios ordinarios no alteran campañas ocultas; no se habilita ejecución real desde un control ambiguo; se ve exactamente qué valores se guardarán.

### 5.10 Usuarios: administración precisa y separada

| ID | Prioridad | Hallazgo y mejora |
| --- | --- | --- |
| V-U01 | P1 | Crear, actualizar acceso/contraseña y rol comparten un formulario poco diferenciado. Separar alta, cambio de rol y restablecimiento, con nombres de acción que indiquen el efecto. No mostrar contraseñas en texto plano por defecto |
| V-U02 | P1 | Eliminación en línea y roles coloreados como éxito no comunican alcance ni riesgo. Presentar permisos comprensibles y confirmar acciones destructivas con identidad del usuario. Si se quiere “desactivar acceso”, implementar esa semántica; no renombrar una eliminación real |
| V-U03 | P2 | La rejilla de cinco campos desde `sm` puede resultar estrecha; errores al cargar usuarios pueden parecer lista vacía. Formulario de una/dos columnas, lista con estados y recuperación explícita; validar tamaños en navegador |

Aceptación: no se confunde crear con restablecer contraseña; acciones administrativas no aparecen para quien no tiene capacidad; siguen bloqueadas en servidor aunque se intente abrir la URL directamente.

### 5.11 Login: una puerta de entrada, no un dashboard bloqueado

| ID | Prioridad | Hallazgo y mejora |
| --- | --- | --- |
| V-L01 | P1 | El layout global envuelve también el login y muestra navegación del producto antes de entrar. Separar shell de autenticación y shell privado conservando URLs; una tarjeta sobria con marca, campos y ayuda pertinente |
| V-L02 | P1 | Los campos dependen de placeholders para explicar su función. Añadir etiquetas visibles, error asociado, mostrar/ocultar contraseña accesible y estado de envío. Conservar autocomplete ya útil; no inventar un enlace de recuperación que no tenga flujo real |
| V-L03 | P1 | Tras un error puede perderse el destino `next` y el contexto de ingreso. Preservar destino interno validado y correo cuando proceda; no conservar la contraseña. Diseñar sesión expirada, sin acceso y salida sin exponer errores internos |

Aceptación: acceder por un enlace profundo lleva a ese destino tras autenticación; fallo recuperable sin perder correo; navegación privada ausente antes de iniciar sesión.

### 5.12 Estado del sistema: impacto primero, logs después

| ID | Prioridad | Hallazgo y mejora |
| --- | --- | --- |
| V-T01 | P1 | Nombres de procesos, disparadores y estadísticas crudas no contestan si los datos sirven para decidir. Resumir recolección, análisis y ejecución por cuenta con última finalización válida, atraso e impacto; cada proceso necesita estadísticas pertinentes, no un “bajados” genérico |
| V-T02 | P1 | Las últimas 30 ejecuciones globales no prueban que una cuenta sin filas nunca se haya ejecutado; zona distinta de CDMX tampoco es necesariamente una incidencia. Consultar estado por componente/cuenta y separar información, advertencia y fallo |
| V-T03 | P2 | Tablas extensas sin el mismo contenedor adaptable que otras pantallas pueden desbordar en móvil. Usar resumen operativo y detalle expandible de logs; validar scroll, etiquetas y permisos. El diagnóstico técnico no debe dominar la navegación cotidiana |

Aceptación: una persona sabe qué parte está fallando, desde cuándo y qué acción sí puede tomar; no aparece “nunca” por quedar fuera de un límite de consulta; se mantiene el acceso al error técnico para diagnóstico.

## 6. Arquitectura de información propuesta

La navegación principal pasaría de diez enlaces planos a seis destinos cotidianos, organizados por tarea. Administración conserva sus pantallas, pero no compite con operar una cuenta.

```text
Agentes Meta

OPERACIÓN
  Hoy
  Anuncios
  Experimentos

ANÁLISIS
  Rendimiento
    Resumen / Horarios     ← pestañas dentro de esta familia
  Aprendizajes
  Bitácora

ADMINISTRACIÓN             ← según capacidades; grupo separado
  Configuración
  Equipo
  Estado del sistema

Usuario / sesión
```

Reglas de implementación:

- Conservar `/cuenta`, `/analisis`, `/horarios` y `/usuarios`; cambiar etiquetas no requiere romper rutas. `/sesion/[id]` sigue perteneciendo a Bitácora.
- Al entrar a Horarios, Rendimiento queda identificado como sección padre y Horarios como subvista. No renderizar dos enlaces activos ambiguos.
- La cuenta se elige en un contexto común del shell. Las páginas ya no repiten un selector de cuenta con botón “Ver” en lugares distintos.
- El periodo se mantiene entre pantallas analíticas compatibles. En Hoy puede seguir siendo un resumen fijo de siete días cerrados: en ese caso se muestra como **alcance de lectura, no como selector que aparenta filtrar todo**.
- Horarios puede tener un periodo inicial distinto por necesidad de muestra; al cambiar de contexto debe decir cuál se está usando. Una selección explícita del usuario tiene prioridad si la pantalla la soporta.
- Cambiar cuenta no conserva una entidad o campaña que pertenece a otra. Cambiar filtros no borra silenciosamente un borrador.
- La URL sigue siendo compartible y respeta Atrás/Adelante. Usar un estado global exclusivamente en memoria no resuelve esta necesidad.
- No añadir un buscador global en la primera iteración. Búsqueda contextual en Anuncios y Bitácora sí tiene una tarea clara.

## 7. Sistema visual objetivo

### 7.1 Paleta: carbón real y acentos con función

Propuesta inicial de tokens; sus nombres son orientativos, no un archivo CSS ya implementado.

| Token | Valor | Uso |
| --- | --- | --- |
| `canvas` | `#0B0C10` | Fondo general |
| `sidebar` | `#101115` | Navegación |
| `surface` | `#17181D` | Tarjetas principales sólidas |
| `surface-hover` | `#202127` | Hover/selección sutil |
| `surface-raised` | `#22232B` | Paneles, menús y diálogos |
| `border-subtle` | `#30313B` | Separación decorativa |
| `border-control` | `#707486` | Contorno cuando es necesario reconocer un control; ajustar por estado |
| `text-primary` | `#F5F5F7` | Lectura principal |
| `text-secondary` | `#A5A6B0` | Etiquetas y contexto legibles |
| `action-primary` | `#FF743D` | Acción principal y acento naranja |
| `on-action-primary` | `#1A100B` | Texto/icono sobre botón naranja |
| `agent` / `data-roas` | `#A78BFA` | Identidad del agente o serie ROAS, siempre con etiqueta |
| `success` | `#34D399` | Resultado satisfactorio confirmado, no identidad |
| `warning` | `#FBBF24` | Atención o condición pendiente, con icono y texto |
| `danger` | `#FB7185` | Fallo, riesgo o acción destructiva |

La mayoría de la pantalla debe ser neutral. Como guía de composición, aproximadamente 85–90% del área sin acentos saturados; no es una regla a medir píxel por píxel. Una tarjeta naranja completa solo tiene sentido si realmente merece toda esa atención.

**Precaución concreta:** el proyecto usa `text-white` en botones. Sustituir el azul por naranja sin cambiar ese texto produciría un contraste insuficiente para texto normal.

| Par sólido propuesto | Contraste calculado |
| --- | --- |
| `#F5F5F7` sobre `#17181D` | 16.28:1 |
| `#A5A6B0` sobre `#17181D` | 7.33:1 |
| `#A5A6B0` sobre `#22232B` | 6.46:1 |
| `#1A100B` sobre `#FF743D` | 6.96:1 |
| Blanco `#FFFFFF` sobre `#FF743D` | **2.69:1; no usar para texto normal** |
| `#A78BFA` sobre `#17181D` | 6.51:1 |
| `#707486` sobre `#22232B` | 3.37:1 |

Cálculos propios con luminancia relativa sRGB, redondeados solo para presentación. El criterio AA de texto normal exige al menos 4.5:1; para texto grande, 3:1. Los umbrales no deben aprobarse redondeando hacia arriba un resultado insuficiente. Degradados, transparencias y estados requieren comprobación adicional en su fondo real. [W3C: contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum).

No dar por aprobados los pares de warning/success/danger ni los controles completos únicamente porque los pares anteriores pasen. El borde decorativo tenue tampoco sirve automáticamente como única señal de un input.

### 7.2 Tipografía, espaciado y geometría

| Elemento | Dirección propuesta |
| --- | --- |
| Familia | Conservar Plus Jakarta Sans inicialmente; no hace falta cambiar de fuente para mejorar calidad |
| Cuerpo y controles | 14–16 px, peso 400/500, interlineado cómodo; formularios móviles preferentemente 16 px |
| Ayuda y metadatos | 12–13 px; evitar texto esencial de 9–11 px |
| Título de página | 26–30 px, 600/700; breve, sin degradado por defecto |
| Título de tarjeta | 15–17 px, 600 |
| KPI | 28–36 px, números tabulares; no 56 px para todos los indicadores |
| Monoespaciada | IDs, fragmentos técnicos y datos donde realmente mejore alineación; no párrafos de ayuda |
| Espaciado | Escala 4, 8, 12, 16, 24, 32; gap de bento 16 y padding de tarjeta 20–24 en escritorio |
| Radios | Tarjetas 16, paneles 20, botones/campos 10–12; chips redondeados sin convertir cada elemento en una pastilla |
| Iconos | Un solo lenguaje de trazo, 18–20 px en navegación, con texto visible en destinos importantes |
| Bordes/sombras | Borde fino discreto; sombra mayor en elementos elevados. El blur no debe ser el material de todas las tarjetas |
| Movimiento | Transiciones breves y funcionales; nada de cifras contando desde cero, pulsos perpetuos o gráficos reanimándose al filtrar |

Los tamaños son objetivos de diseño, no requisitos universales de accesibilidad. Hay que comprobar contenido real, zoom y traducciones antes de fijar alturas. No truncar un importe para mantener una tarjeta bonita.

### 7.3 Uso del naranja, violeta y degradados

- Naranja sólido: acción principal contextual, por ejemplo “Revisar propuestas” o “Crear experimento”. Una sola acción dominante por región de trabajo.
- Violeta: marca del agente, serie ROAS y detalles analíticos identificados. No significa “la IA tiene razón” ni “confianza alta”.
- Activo de navegación: fondo carbón elevado, icono/texto destacado y un indicador fino. Evitar el bloque completo azul/violeta actual.
- Degradado: halo local muy tenue, por ejemplo violeta transparente en la esquina de una tarjeta focal; no detrás de párrafos ni de todas las cifras.
- Gráficas: colores por serie estables. ROAS violeta; gasto naranja cuando se muestre como serie, con leyenda. Positivo/negativo se comunica por resultado y texto, no por el color nominal de la serie.
- Avisos: warning ámbar y peligro rosado/rojo se diferencian por icono, título y lenguaje. No usar naranja decorativo como fondo permanente de advertencias.
- Acciones secundarias: neutrales; acciones destructivas: tratamiento de peligro, separadas de navegación ordinaria.

### 7.4 Componentes necesarios y reutilización

| Componente/contrato propuesto | Responsabilidad | Base actual |
| --- | --- | --- |
| `AppShell` + `AuthShell` | Navegación privada, cuenta, menú móvil y acceso | `layout`, `Nav` |
| `PageHeader` + `ContextBar` | Título corto, periodo, cuenta, frescura y acción pertinente | Encabezados repetidos |
| `Button` + `IconButton` | Jerarquía, tamaños, disabled/pending/foco | Clases repetidas y `btn-accent` |
| `Field` + `FormSection` | Etiqueta, unidad, ayuda, error y agrupación | Inputs de cada pantalla |
| `MetricCard` | Valor, periodo, referencia, estado del dato | `Card` + `Kpi` |
| `StatusBadge` | Etiqueta y tono coherentes por estado de dominio | `Chip` |
| `DataState` | Vacío, error, desactualizado, parcial, sin permisos | Avisos dispersos |
| `DataTable` + `TableToolbar` | Orden, filtros, paginación, estados y detalle | Anuncios, Bitácora y Estado |
| `ChartFrame` + `ChartLegend` | Título, unidad, rango, alternativa de datos y estados | `TimeSeries`, `Sparkline` |
| `DecisionCard` + `DecisionReview` | Resumen y revisión de una propuesta, efecto real y evidencia | Tarjeta final de Hoy |
| `DetailPanel` | Creativo, sesión o evidencia sin perder contexto | Nuevo patrón compartido |
| `ConfirmAction` | Confirmación proporcionada para operaciones de riesgo | Formularios en línea |
| `SaveBar` | Cambios pendientes, guardar/cancelar y resultado | Configuración y edición |

No hace falta adoptar todas estas piezas como una librería interna compleja. Empezar con las que usan dos o más pantallas o fijan un contrato crítico. Separar presentación de consultas permite probar estados sin credenciales reales.

Mantendría Server Components para lectura donde ya encajan, e introduciría interacción cliente en filtros, paneles y formularios específicos. Un cambio visual no justifica convertir toda la app en cliente ni agregar una librería de gráficas pesada sin demostrar una necesidad. Los SVG existentes pueden conservarse si se resuelven interacción, escalas y accesibilidad.

## 8. Layout de referencia para Hoy

Esto es una distribución funcional, no una maqueta aprobada ni una captura de una implementación.

```text
┌───────────────┬────────────────────────────────────────────────────────────┐
│ Agentes Meta  │ Hoy        Cuenta ▾     Últimos 7 días cerrados             │
│               │ Actualización y cobertura · Modo efectivo · Control agente │
│ Operación     ├────────────────────────────────────────────────────────────┤
│  Hoy          │ Incidencia prioritaria, solo cuando exista                 │
│  Anuncios     ├──────────────┬──────────────┬──────────────┬─────────────────┤
│  Experimentos │ ROAS         │ CPA          │ Gasto        │ Valor atribuido │
│               │ vs. anterior │ vs. objetivo │ vs. anterior │ Compras: N      │
│ Análisis      ├─────────────────────────┬──────────────────────────────────┤
│  Rendimiento  │ Necesita atención       │ Evolución del rendimiento        │
│  Aprendizajes │ Propuesta resumida      │ ROAS / Gasto / CPA               │
│  Bitácora     │ Importe y efecto        │ Gráfica + objetivo + cambios     │
│               │ [Revisar propuesta]     │ Periodo y cobertura explícitos   │
│ Administración├─────────────────────────┴──────────────────────────────────┤
│               │ Anuncios por revisar / decisiones recientes               │
│ Usuario       │ Resumen breve, con enlaces a sus pantallas                │
└───────────────┴────────────────────────────────────────────────────────────┘
```

La columna de atención ocupa aproximadamente cinco de doce columnas; la gráfica, siete. Es una desviación deliberada de la referencia: esta herramienta debe ayudar a decidir, no solo observar ventas. Si no hay propuestas, el bloque puede mostrar una tarea pertinente —o un estado vacío compacto—, nunca recomendaciones inventadas para llenar espacio.

En móvil, conservar este orden lógico: encabezado/contexto, incidencia si existe, indicadores compactos, atención, tendencia y actividad. Rejilla de indicadores de dos columnas mientras los importes quepan; una columna cuando el contenido o zoom lo requiera. No invertir visualmente el orden del foco para lograr la composición.

La sidebar se transforma en un menú con nombre accesible y cierre claro. No convertirla en diez pestañas desplazables ni añadir una barra inferior adicional sin una necesidad probada.

### Revisión de una propuesta

El resumen no contiene todos los inputs. “Revisar propuesta” abre un panel dedicado con:

1. Cuenta, entidad, campaña y acción en lenguaje humano.
2. Actual → propuesto, moneda/unidad, diferencia absoluta y relativa cuando aplique.
3. Motivo resumido y evidencia con fecha/cobertura.
4. Límites comprobados, bloqueos y vigencia.
5. Modo efectivo y consecuencia exacta del botón final.
6. Edición opcional; al editar, se recalcula y revalida la propuesta en servidor.
7. Resultado persistente: simulada, ejecutada, rechazada, fallida o resultado por confirmar.

Una confirmación no resuelve un problema de permisos, concurrencia o dato obsoleto. Tampoco “deshacer” es válido como promesa genérica cuando revertir requiere otra escritura financiera.

## 9. Qué mostrar, qué relegar y qué eliminar

| Siempre visible cuando afecta la tarea | A un clic o en la pantalla especializada | Retirar de la interfaz cotidiana |
| --- | --- | --- |
| Cuenta y periodo efectivo | Metodología de evaluación | “Fase 4”, “Fase 4b” y próximos hitos internos |
| Moneda y significado del valor | Glosario ROAS/CPA con ayuda contextual | Menciones al cuestionario de una persona del proyecto |
| Modo real de operación | Reglas internas e IDs | Nombres de llaves y pasos de GitHub fuera de administración |
| Frescura y cobertura relevante | Historial completo de sincronización | Instrucciones repetidas en cada gráfica |
| Importe/alcance de una acción | JSON y eventos originales | Formularios de nota permanentemente abiertos por fila |
| Bloqueo, fallo o incertidumbre crítica | Parámetros avanzados y criterios detallados | Grandes tarjetas de contadores sin una decisión asociada |
| Resultado confirmado de una acción | Reporte narrativo completo | Brillo constante y degradados en títulos rutinarios |
| Siguiente paso disponible | Métricas secundarias y tabla exportable si se necesita | Promociones, buscador o controles decorativos sin función |

“Relegar” no significa borrar ni dificultar una auditoría. La evidencia debe seguir vinculada y accesible. Cuando una salvedad invalida una conclusión, pertenece al primer nivel junto a ella.

### Microcopy propuesto

| Texto/idea actual | Dirección nueva |
| --- | --- |
| Cuenta | Rendimiento |
| Análisis / qué ayudó y qué no | Aprendizajes / cambios y resultados observados |
| Usuarios | Equipo, si el alcance realmente es un equipo interno |
| Forzar análisis | Actualizar análisis |
| última corrida / pasada | Última actualización, indicando si terminó correctamente |
| maduro | Listo para evaluar |
| sin ventanas calculadas | Evaluación todavía no disponible; indicar siguiente actualización si se conoce |
| candados | Límites de seguridad |
| antes/después como valores sin unidad | Presupuesto diario: $800 → $900 MXN (+$100; +12.5%), cuando esa sea la acción real |
| Aprobar | Confirmar simulación / Aprobar cambio en Meta, según el contrato efectivo |
| Propuesta simulada | Simulación completada. No se modificó Meta |
| éxito por aceptar una orden | Solicitud aceptada. Resultado pendiente de confirmación, si ese es el estado |
| todo en orden | Sin alertas abiertas; estado de datos por separado |
| sin narrativa todavía + llave de API | Resumen narrativo no disponible. Puedes consultar la evidencia |
| graduar | Marcar como ganador, explicando si solo cambia el registro del experimento |
| freno de emergencia | Detener agente; ayuda visible que aclare qué ocurre con los anuncios |
| sin datos | Distinguir “sin actividad”, “periodo sin cobertura” y “no pudimos cargar los datos” |

Los nuevos textos deben depender del estado real. No se deben aplicar como un reemplazo masivo de cadenas que esconda diferencias de comportamiento.

## 10. Contrato de estados y confianza

### Datos

| Estado | Presentación | Acción adecuada |
| --- | --- | --- |
| Cargando | Skeleton con geometría estable y etiqueta de carga | Esperar o navegar; no mostrar ceros provisionales |
| Sin actividad, con cobertura | Cero cuando sea matemáticamente válido; explicación breve | Cambiar periodo o explorar otra entidad |
| Sin cobertura | “Sin datos suficientes” con intervalo afectado | Revisar sincronización o ampliar periodo |
| Día parcial | Marca “En curso”, separada del cierre comparable | Consultar sin juzgar como día completo |
| Desactualizado | Último cierre/actualización válida y antigüedad | Revisar Estado; bloquear acciones si su contrato lo exige |
| Error | Mensaje recuperable y referencia de diagnóstico no sensible | Reintentar; no aparentar lista vacía |
| Sin permisos | Explicación breve, sin filtrar datos de otras cuentas | Volver o contactar administrador por un canal real |

Un sello “actualizado hace…” debe provenir del trabajo completado pertinente, no de la hora de render ni únicamente de `started_at`. Distinguir sincronización de datos, cálculo del análisis y generación de narrativa. No usar “En vivo” para un proceso periódico sin actualización en tiempo real.

### Propuestas y acciones

| Estado de negocio | Tratamiento sugerido |
| --- | --- |
| Pendiente de revisión | Neutral con contador; naranja en el botón principal |
| Bloqueada | Aviso con motivo y requisitos; no CTA de ejecución aparente |
| Aprobada, todavía no ejecutada | “Aprobada · pendiente”, no éxito de Meta |
| Simulada | Violeta/neutral y frase “Sin cambios en Meta” |
| Ejecutada y confirmada | Éxito con fecha, entidad y resultado verificable |
| Resultado desconocido | Atención: “Por confirmar”; evitar reintento ciego |
| Fallida | Error concreto y siguiente paso seguro |
| Rechazada | Neutral, decisión humana registrada; rechazar no es necesariamente un fallo |
| Caducada | No accionable; explicar vigencia y pedir actualización |

Cualquier estado nuevo requiere contrato persistido y transición de servidor. La tabla define la experiencia deseada, no asegura que el esquema actual soporte todos los casos.

## 11. Visualización: reglas de diseño y exactitud

Cada gráfica debe contestar una pregunta específica:

| Pregunta | Visual preferida |
| --- | --- |
| ¿Cómo evolucionó ROAS o CPA? | Línea temporal, objetivo y periodo comparable |
| ¿Cuánto gastamos por día? | Barras o línea con MXN explícito y referencia de límite pertinente |
| ¿Qué ocurrió cuando cambiamos algo? | Serie temporal con marcadores enlazados a cambios; no atribuir causalidad visualmente |
| ¿Qué anuncios requieren revisión? | Tabla priorizada; una gráfica no sustituye nombres y acciones |
| ¿Hay patrones horarios comparables? | Bloques con cobertura; heatmap detallado opcional |
| ¿El experimento está listo para evaluarse? | Días/compras observados frente a criterios; no un velocímetro de “confianza” inventada |

Reglas comunes:

- No agregar series financieras de distinta unidad en un mismo eje. Si se comparan, usar paneles separados o interacción explícita; no una doble escala que sugiera una relación inexistente.
- No interpolar visualmente días sin datos ni dibujar un cero donde un cociente es indefinido.
- Comparar intervalos equivalentes y señalar cambios en atribución o cobertura. No promediar ROAS diarios sin ponderación si el resumen pretende ser ingreso/gasto del periodo.
- Una variación de gasto es descriptiva. Un CPA más bajo solo se juzga favorable con contexto suficiente; menos gasto por falta de entrega no es automáticamente éxito.
- Las barras de gasto frente a límite deben informar sobrepaso numéricamente; recortar el dibujo al 100% no debe ocultar que se llegó, por ejemplo, a 125%.
- Leyendas, tooltip y tabla deben compartir exactamente formateador, unidad y estado del dato. Abreviar en un eje está bien si el valor exacto está disponible.
- Línea sólida para datos cerrados; tramo parcial diferenciado y explicado. No depender únicamente de un fondo ámbar casi transparente.
- Marcar fechas con el calendario de la métrica y explicar cualquier conversión. Las marcas de personas y agente se identifican por icono/etiqueta, no por seis colores de avatar.
- Usar el gradiente como relleno decorativo discreto, no como una tercera variable no explicada.
- La comparación con el periodo previo debe poder distinguirse también sin color: trazo diferente y etiqueta.
- Probar cero, un punto, todos nulos, huecos, importes grandes, valores extremos y varios cambios el mismo día.

## 12. Accesibilidad, móvil y acabado operativo

Estas son condiciones de aceptación propuestas, no una certificación de la versión actual.

### Interacción

- Recorrido completo por teclado: navegación, filtros, detalles, formularios, tablas y confirmaciones. Foco visible que no dependa de hover.
- Enlaces y botones con nombres específicos; el enlace “→” a una sesión necesita un nombre accesible que indique destino.
- Etiquetas persistentes y unidades para campos. Errores vinculados al campo y resumen cuando haya varios; no depender solo de rojo.
- Estados de guardado anunciables sin saturar al lector de pantalla. Conservar el texto introducido si falla una petición.
- Añadir acceso para saltar al contenido, títulos jerárquicos y metadata por ruta. Mantener `lang='es'`, ya presente.
- Evitar miles de paradas de Tab para datos no interactivos. Una alternativa tabular no exige convertir cada celda en botón.

Como objetivo del producto, usar áreas de interacción de unos 44 × 44 CSS px para controles táctiles principales e iconos. Esto es deliberadamente más cómodo que el mínimo AA de 24 × 24 CSS px, que admite excepciones y condiciones de espaciado; no se debe confundir ambos umbrales. [W3C: tamaño mínimo del objetivo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Si un panel funciona como modal, debe manejar foco inicial, contener el recorrido de Tab, permitir cierre con Escape y devolver el foco al control que lo abrió —o a un destino lógico si desapareció—. Debe tener nombre accesible y fondo realmente inerte. Un panel no modal no debe fingir `aria-modal`. [W3C: patrón de diálogo modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

### Adaptación

| Tamaño/condición de prueba | Comportamiento a comprobar |
| --- | --- |
| 360 y 390 px | Una columna general, KPI adaptables, menú claro, formularios sin compresión y acciones alcanzables |
| 768 px | Dos columnas cuando sirvan; tablas con detalle y controles sin amontonarse |
| 1024 px | Revisar ancho útil con sidebar; las rejillas no deben activarse solo porque el viewport supera un breakpoint |
| 1280 y 1440 px | Bento completo, tabla útil y espacio equilibrado; sin huecos forzados para igualar tarjetas |
| Zoom 200% y texto ampliado | Reflujo y acceso a acciones; alturas no recortan texto |
| Teclado, tacto y lector de pantalla | Misma información y tareas, no necesariamente el mismo gesto |
| Movimiento reducido | Sin animaciones superfluas; la información final aparece de inmediato |

No debe haber scroll horizontal del documento. Una tabla o rejilla genuinamente ancha puede tener desplazamiento propio, identificado y usable; no se arregla reduciendo todas las letras. Evitar scrolls anidados en tarjetas ordinarias. Las barras pegadas de guardado deben respetar teclado móvil y no tapar contenido.

### Carga y rendimiento percibido

- Skeletons parecidos al layout final; no cambiar de una pantalla vacía a una rejilla de altura impredecible.
- Reservar dimensiones de imágenes, gráficos y paneles. Validar imagen rota, URL expirada y ausencia de creativo.
- Cargar detalle e historial cuando se necesitan sin bloquear la lectura principal; no traer todas las filas para mostrar veinte si el volumen lo vuelve costoso.
- Medir navegación, tamaño de JavaScript, estabilidad y respuesta de filtros antes y después. Registrar resultados reales; no fijar un “dashboard rápido” únicamente por el tiempo del build.
- No instalar varias librerías de iconos, animación o gráficas para conseguir un estilo. Evaluar coste y accesibilidad de cada incorporación.
- Mantener datos ficticios de diseño aislados de producción. Nunca rellenar con demo una cuenta real que no tiene datos.

## 13. Roadmap visual implementable

### Orden general

**V0 → V1 → V2 → V3 → V4/V5 → V6/V7 → V8.**

Primero se valida el lenguaje en Hoy; después se extiende a las otras familias. Las comprobaciones de accesibilidad y estados acompañan cada fase: V8 es verificación transversal, no el primer momento de probarlas.

Tamaño relativo: **S** = localizado, **M** = varios componentes/una familia, **L** = flujo transversal con dependencias. No equivale a una promesa de días o semanas. Para estimar calendario hacen falta capacidad disponible y validación de los contratos de datos.

| Fase | Entrega verificable | Tamaño | Dependencias | Criterio de salida |
| --- | --- | --- | --- | --- |
| V0 · Base de evaluación | Inventario visual actual, fixtures y matriz de estados/tareas | M | Navegador disponible para nuevas capturas; se puede avanzar en contratos sin él | Las 12 rutas tienen casos representativos y límites documentados; ninguna captura histórica se usa como verdad actual |
| V1 · Fundamentos | Tokens carbón/naranja/violeta y componentes básicos | M | V0; no depende de habilitar ejecución Meta | Botones, campos, badges y tarjetas cubren estados; contraste revisado; ninguna clase `text-white` queda accidentalmente sobre naranja insuficiente |
| V2 · Shell y contexto | Navegación agrupada, cuenta compartida, móvil y login separado | L | V1; contrato de permisos y parámetros | Cuenta/periodo se preservan correctamente; rutas profundas funcionan; acceso y shell privado separados |
| V3 · Hoy piloto | Bento de decisiones, KPI compactos, revisión y estado del agente | L | V1/V2; P0 de modo/resultado para liberar acciones reales | Se aprueban composición, claridad y todos los estados críticos antes de replicar el diseño |
| V4 · Trabajo con registros | Anuncios, Bitácora y Sesión con tablas/paneles y filtros coherentes | L | V1/V2; contratos de historial/revisión | Revisar un anuncio y documentar un cambio no pierde contexto ni notas; listas sin formularios abiertos por defecto |
| V5 · Lectura analítica | Rendimiento, Aprendizajes y Horarios | L | V1/V2; rangos, cobertura, unidades y evaluación fiables | Periodos consistentes, gráficos accesibles, estados de evidencia diferenciados y rankings sin contradicción |
| V6 · Experimentos | Lista operativa, borradores y creación guiada | L | V1/V2; transiciones de experimento y validación | Un usuario crea, guarda, reanuda y evalúa sin confundir registro con ejecución en Meta |
| V7 · Administración | Configuración, Equipo y Estado | L | V1/V2; autorización y persistencia corregidas | Modo/límites comprensibles; acciones destructivas inequívocas; diagnóstico accionable |
| V8 · Consolidación | Regresión visual/funcional, pruebas de uso y entrega | M | Todas las familias; no exige activar dinero real | Matriz cubierta, defectos críticos cerrados y aprobación visual explícita; cambios financieros siguen su propio gate |

### V0 — Preparar una base que no engañe

Entregables:

- Capturas nuevas de cada ruta, con tamaños y estado de datos anotados. Usar cuentas de prueba o datos anonimizados; no publicar correos, IDs o presupuestos reales en snapshots compartidos.
- Fixtures deterministas: cuenta sin datos, cuenta parcial, saludable, error, mucho volumen, nombres largos, propuesta simulada, resultado desconocido y usuario sin permiso.
- Diccionario de métricas/unidades, periodo efectivo y estados del agente; unificar con los contratos de la auditoría general.
- Lista de tareas reales por perfil: dueño/administrador, operador y lector si ese rol existe. No inventar roles solo para llenar el diseño.

Archivos/áreas: `app`, `components`, `lib/range.ts`, `lib/format.ts`, contratos de lectura y entorno de prueba. Salida propuesta: baseline visual y casos de prueba en documentación/tests, no capturas de producción con datos expuestos.

### V1 — Cambiar el lenguaje, no maquillar cada página

Orden de trabajo:

1. Tokens semánticos y paleta; eliminar dependencias accidentales de azul hardcodeado.
2. Tipografía, radios, bordes, espacios, foco y movimiento reducido.
3. `Button`, `Field`, `StatusBadge`, `Card`, `MetricCard` y `DataState`.
4. Muestra de componentes en estados normal, hover, foco, disabled, pendiente, error y vacío.

Archivos: `app/globals.css`, componentes compartidos y clases de consumo. No crear una página pública de componentes con datos reales. Revisar consumo de `text-white`, SVG y estilos inline, no solo el archivo de tokens.

### V2 — Resolver navegación y contexto antes de multiplicar pantallas

- Separar shells conservando rutas y autenticación existente.
- Implementar el árbol propuesto y permisos de presentación basados en capacidades reales.
- Crear `PageHeader`/`ContextBar`; arreglar `DateRange` y acordar alcance fijo de Hoy frente a rango analítico.
- Menú móvil accesible; conservar cuenta, periodo y retorno de detalle.
- Incorporar estados de error/carga/no encontrado y títulos por ruta.

Archivos: `app/layout.tsx`, `components/Nav.tsx`, `components/DateRange.tsx`, `components/Filters.tsx`, `lib/range.ts`, `app/login/*` y layouts/estados nuevos cuando se implementen.

### V3 — Diseñar Hoy como pantalla piloto

- Aprobar una composición con datos reales anonimizados o fixtures creíbles; no solo cuatro tarjetas con números perfectos.
- Crear bloque de atención, indicador de modo y control de agente.
- Reducir ROAS hero, reutilizar cuatro KPI y gráfica contextual.
- Introducir revisión de propuesta con importe, unidad, alcance, cobertura y efecto.
- Verificar los estados sin propuestas, bloqueada, simulada, ejecutada, fallida, caducada y por confirmar.

Archivos: `app/hoy/page.tsx`, contrato de `app/hoy/actions.ts`, `Kpi`, `Sparkline` y componentes de decisión. **Separar PR de presentación y corrección de ejecución** cuando la segunda implique lógica financiera. Validar en simulación; el rediseño no autoriza operar Meta.

Esta fase es el punto de aprobación visual. Si la dirección carbón/naranja/violeta no convence aquí, corregirla antes de extenderla a once pantallas.

### V4 — Unificar la lectura y revisión de registros

- Primero tabla/toolbar/panel compartidos; después Anuncios.
- Convertir Bitácora en cronología con filtros veraces y vacíos agrupados.
- Reordenar Sesión con evidencia antes de anotación; mejorar comparador de cambios.
- Añadir validación, pendiente, error y retorno de contexto.

Archivos: `app/anuncios/*`, `app/bitacora/page.tsx`, `app/sesion/[id]/*`, `SessionRow`, `Filters` y componentes de tabla/panel. Paginación y conteos precisos se coordinan con consultas de servidor; no simular una funcionalidad que no existe.

### V5 — Rediseñar análisis con exactitud visual

- `ChartFrame`: escalas, objetivos, leyendas, tooltip y alternativa accesible.
- Cuenta/Rendimiento: periodo consistente, una métrica principal y referencias claras.
- Análisis/Aprendizajes: hallazgos con evidencia, ventanas por madurez e historial de reportes.
- Horarios: cobertura primero, bloques comparables, detalle horario después.
- Unificar nulidad, días faltantes, precisión, zona y colores semánticos.

Archivos: `TimeSeries`, `Sparkline`, `Kpi`, `app/cuenta/page.tsx`, `app/analisis/*`, `app/horarios/page.tsx`, formateadores y contratos de datos. Las correcciones de cálculo deben tener tests separados de snapshots visuales.

### V6 — Convertir experimentos en un flujo guiado

- Lista por estado y acción “Nuevo experimento”.
- Tres pasos: hipótesis/alcance → criterios/límites → revisión.
- Guardado parcial, edición y reanudación de borradores.
- Diferenciar resultado observado, criterio cumplido y decisión humana.
- Confirmar explícitamente acciones con consecuencias; no asumir que “ganador” implica escalar presupuesto.

Archivos: `app/experimentos/*`, componentes de formularios, paneles y estados. No reutilizar confirmaciones financieras sin comprobar que la acción realmente las necesita.

### V7 — Terminar administración y operación degradada

- Configuración por secciones, diff antes de guardar y campañas seleccionadas inactivas visibles.
- Modo efectivo explicado; habilitación de ejecución real separada y condicionada a seguridad.
- Usuarios/Equipo: alta, rol y contraseña como acciones diferenciadas.
- Estado: resumen de salud por cuenta/componente y logs a un clic.
- Completar login, sesión expirada, falta de acceso y errores de infraestructura.

Archivos: `app/configuracion/*`, `app/usuarios/*`, `app/estado/page.tsx`, `app/login/*` y contratos de autorización/persistencia. No resolver una política de acceso cambiando solo la visibilidad de un botón.

### V8 — Cerrar con pruebas, no con una captura bonita

- Regresión de las 12 rutas en los tamaños definidos, con errores y estados vacíos además del caso ideal.
- Pruebas de teclado, touch y lector de pantalla en tareas clave; inspección de contraste sobre superficies finales.
- Comparación de rendimiento antes/después y revisión de librerías añadidas.
- Pruebas de uso con participantes que no conozcan los detalles internos del proyecto.
- Revisión final de microcopy, truncamientos, unidades, permisos y consistencia.
- Liberación por PRs pequeños y recuperables. Revertir una versión visual no debe pretender revertir acciones financieras ni cambios de datos.

## 14. Dependencias con la auditoría general

| Trabajo visual | Dependencia funcional en [mejorasCodex.md](mejorasCodex.md) | Qué puede avanzar sin ella |
| --- | --- | --- |
| Revisión y ejecución de propuestas | S01–S09 y autorización: candados, freno, contexto, concurrencia, resultado desconocido y límites | Composición y estados sobre fixtures; no habilitar ejecución real |
| Modo y configuración seguros | Autorización, persistencia de perfil, whitelist y semántica de restricciones | Diseño de secciones, etiquetas y resumen de diferencias |
| Cuenta/periodo compartidos | U01, U02, U05, U06 y U14: rangos, navegación y zonas | Shell y contrato de parámetros; corregir controles conjuntamente |
| Gráficas y estado de datos | D01/D02 y evaluación: cobertura, nulos y ventanas comparables | Paleta, escalas, estados de error y componentes con datos de prueba |
| Aprendizajes fiables | E01, E06 y E07: confianza, evidencia histórica y narrativa obsoleta | Layout e historial; no inventar certeza ni vincular texto viejo a evidencia nueva |
| Anuncios y Bitácora | U03, U08, U10 y U13: paginación, historial, anotaciones y revisiones | Tabla, panel, microcopy y estados; conectar a consultas corregidas después |
| Seguridad de accesos | Hallazgos A y verificación por cuenta/rol en servidor | Navegación por capacidades y estados de falta de acceso |

Los identificadores de esta tabla son referencias al documento general, no una reasignación de prioridad. Si cambia el código durante la implementación, revalidar el hallazgo antes de intervenir.

## 15. Cómo comprobar que de verdad se volvió fácil

Propuesta de prueba: cinco participantes, combinando alguien que administra, operadores y personas nuevas en la herramienta. Es una ronda cualitativa para detectar fricción, no una validación estadística de mercado.

| Tarea | Objetivo de validación, todavía no medido |
| --- | --- |
| Identificar cuenta, periodo y actualidad del dato | Sin ayuda; objetivo orientativo de 10 segundos en primera vista |
| Encontrar qué necesita atención | Localizar tarea prioritaria sin recorrer todas las secciones; objetivo orientativo de 30 segundos |
| Revisar una propuesta de presupuesto | Explicar importe final y si habrá cambio real en Meta antes de confirmar; cero errores sobre esta consecuencia |
| Cambiar periodo 7 → 30 y volver desde otra pantalla | Etiqueta, métricas y URL coherentes; contexto preservado |
| Encontrar un anuncio y registrarlo como revisado | Sin editar accidentalmente otra fila ni perder filtros |
| Entender un cambio y documentar el motivo | Evidencia identificable y nota recuperable si hay error |
| Guardar y retomar un experimento incompleto | Borrador válido como borrador, sin forzar inicio |
| Distinguir vacío, falta de cobertura y fallo | Ninguna confusión que convierta falta de datos en “todo bien” |

Registrar tiempo, errores, dudas y recorrido. Si una persona necesita que le expliquemos “cómo lo pensó el desarrollador”, falta trabajo de diseño o de lenguaje. Reducir clics no es la única métrica: una confirmación comprensible puede justificar un paso adicional.

## 16. Checklist de entrega visual

- [ ] Las doce pantallas usan el mismo sistema de superficies, tipografía, botones, campos y estados.
- [ ] La paleta es carbón/naranja/violeta; no quedan azules literales accidentales en gráficas o avatares.
- [ ] No hay texto esencial minúsculo, mayúsculas extensas ni un halo en cada tarjeta.
- [ ] Cuenta y periodo efectivo son visibles y persisten donde corresponde.
- [ ] Login está separado del shell privado; navegación y acciones respetan capacidades reales.
- [ ] Hoy pone atención y decisiones antes que detalles secundarios.
- [ ] Una propuesta muestra importe, unidad, alcance, evidencia y efecto real antes de confirmarse.
- [ ] Aprobada, simulada, ejecutada, fallida y por confirmar no se confunden.
- [ ] Los gráficos permiten comprender valores sin depender del ratón ni solo del color.
- [ ] El día parcial y la falta de cobertura no se convierten en resultados cerrados o ceros engañosos.
- [ ] Anuncios no abre un formulario por fila; el panel mantiene contexto y nota.
- [ ] Bitácora distingue días sin cambios de días sin cobertura.
- [ ] Análisis conserva incertidumbre, trazabilidad y reporte histórico.
- [ ] Horarios no repite el mismo bloque como mejor y peor ni inventa confianza por pocas compras.
- [ ] Experimentos permite guardar, editar y reanudar borradores.
- [ ] Configuración no pierde selecciones ocultas y explica modo/límites sin promesas falsas.
- [ ] Acciones tienen pendiente, error y resultado persistente; doble clic no produce una segunda intención.
- [ ] Menús y paneles gestionan foco, teclado, cierre y retorno correctamente.
- [ ] Móvil y zoom no ocultan botones ni importes; tablas anchas tienen contenedor accesible.
- [ ] Capturas y tests de diseño usan datos sintéticos o anonimizados.
- [ ] El rendimiento se midió; no se añadieron dependencias decorativas sin justificación.
- [ ] La dirección visual se aprobó primero en Hoy y luego se extendió.
- [ ] La liberación visual no levantó por sí sola ningún bloqueo de seguridad ni habilitó operaciones reales.

## 17. Recomendación final

El cambio de mayor impacto sería pasar de **“mostrar todo lo que el sistema sabe” a “mostrar lo necesario para entender y decidir, con el resto accesible”**.

Empezaría por los tokens y componentes compartidos, resolvería navegación/fechas y diseñaría Hoy como piloto. Ahí deben quedar claras la identidad carbón/naranja/violeta y la jerarquía atención → decisión → evidencia. Después extendería los patrones a tablas, análisis y formularios.

No empezaría añadiendo más widgets, animaciones, degradados ni una librería nueva. La sensación high-end llegará de una composición contenida, cifras confiables, interacciones precisas y ausencia de ambigüedad en lo que hace cada botón.
