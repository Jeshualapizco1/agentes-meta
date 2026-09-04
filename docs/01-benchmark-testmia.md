# Benchmark: Testmia vs. agentes Meta — qué adaptar al roadmap

Fecha: 2026-09-03 · Fuente: testmia.com (home, /agente-meta-ads, /dashboard, /anuncios, /identidad, /valores, /social-listening, /proximamente)

## 1. Qué es Testmia en una línea
Servicio gestionado para ecommerce (mínimo 10,000 USD/mes en ads) donde un agente de Meta Ads revisa la cuenta 4 veces al día, pausa anuncios y mueve presupuesto entre campañas dentro de límites codificados, con humanos supervisando. Todo lo demás (CRO, copy, contenido, social listening, identidad) orbita alrededor de eso.

Posicionamiento (actualizado 2026-09-04, alineado con `CLAUDE.md`): **sí ejecutamos**, igual que Testmia, con su mismo conjunto de acciones y su misma lista de "nunca". La diferencia es el camino y el orden: primero un agente que analiza toda la operación (incluidos los cambios humanos, que Testmia registra pero no evalúa) y dice qué funciona; luego testeo con hipótesis y criterio de éxito declarados antes; y por último la operación de la cuenta en modos **off → semi → auto**, donde cada regla se gana el modo auto con N propuestas aprobadas sin corrección. Lo que copiamos de Testmia es su ingeniería de seguridad, su forma de evaluar decisiones y su honestidad con los datos; lo que añadimos es el análisis retrospectivo y el dayparting por hora. Ver §6.

## 2. Diecinueve ideas de Testmia y qué hacemos con cada una

| # | Idea de Testmia (cita) | Adoptar | Dónde cae en nuestro roadmap |
|---|---|---|---|
| 1 | "Primero se escribe la decisión, luego sale la orden a Meta" (write-ahead log) | Sí | Fase 4b. Ninguna acción del agente sale sin registro previo en la bitácora |
| 2 | Un solo timeline para cambios de persona, agente y Meta: "ocho de cada diez cambios los hizo el agente; el resto se registra igual" | Sí | Fase 1. Tipo de actor: persona / agente / Meta, misma tabla, misma vista |
| 3 | Cada decisión "abre una ventana que empieza en ese momento y se mide a 72 horas" contra el resto de la cuenta en el mismo periodo | Sí, ampliado | Fase 3. Ventanas por cambio a 72h, 7d y 14d. 72h solo para señales rápidas (gasto, CPM, CTR); ROAS y CPA a 7 y 14 días |
| 4 | Nunca juzga el día en curso: "está a medias". Evalúa los últimos 14 días cerrados | Sí | Fase 2 y 3. Regla de día cerrado en todo veredicto; "hoy" se muestra pero etiquetado "en curso" |
| 5 | "Si una cifra está incompleta, la pantalla lo dice: nunca se rellena con una estimación" | Sí | Fase 2. Insignias de madurez (preliminar / maduro) y cobertura de datos en cada métrica |
| 6 | ROAS real = ventas netas de la tienda / gasto. MER. "El ROAS puede subir mientras el MER baja" | ~~Sí~~ **Descartado el 2026-09-03** | Se construyó y se eliminó: la verdad es Meta (wetracked.io conectado, atribución server-side) y el proyecto es 100 % paid media. No se integra la tienda |
| 7 | Modos por cuenta: Off (default), Semi-automático (propone, humano aprueba), Automático (ejecuta dentro de candados) | Sí, y por regla | Fase 4 con Off y Semi por cuenta y por regla; Fase 4b: una regla pasa a Auto cuando acumula N propuestas aprobadas sin corrección, y regresa a Semi ante cualquier rechazo, corrección o rollback |
| 8 | Candados codificados: máximo movimiento por cambio, espera obligatoria tras acción, tope diario de acciones, lista blanca de campañas, techo de gasto calculado del gasto real. "Basta que uno quede cerrado para que la orden no salga" | Sí, incluso para recomendar | Fase 4. Las recomendaciones respetan los mismos candados: el agente no sugiere +80% si la regla dice máximo +20% |
| 9 | Freno de emergencia: gasto disparado, exceso de acciones, fallo de log, problema de pago, datos incompletos. "Se libera a mano, nunca solo", con explicación documentada | Sí | Fase 1 (versión collector: alertas por fallo de log, cuenta deshabilitada, pago) y Fase 4 (kill switch por cuenta) |
| 10 | Movimientos atados: mover presupuesto entre dos campañas es una transacción; si una orden falla, la otra se revierte; 72h de congelamiento en ambas | Sí | Fase 4b |
| 11 | Lo que nunca hace: borrar, tocar creativo, targeting, puja u objetivo; activar anuncios nuevos (nacen pausados); reactivar lo que pausó un humano | Sí, literal | Fase 4b. Matriz de acciones permitidas escrita en código; la lista de "nunca" completa está en §6 y en `CLAUDE.md` |
| 12 | Presupuesto de exploración separado: "una hipótesis a la vez y el criterio de éxito declarado antes de lanzar". Ganadores se gradúan al presupuesto principal | Sí, es la mejor idea | Fase 3. Entidad "experimento": hipótesis, criterio de éxito, presupuesto, fecha de evaluación, veredicto. Mata la racionalización a posteriori |
| 13 | 4 pasadas al día en la zona horaria de la cuenta. Gráfica de tiempo de detección persona vs. agente | Parcial | Fase 1. Collector cada 6 horas para alertas; la corrida de 00:00 CDMX consolida el día como pediste. Una pasada diaria detecta un gasto disparado hasta 24 h tarde |
| 14 | Pantalla principal: gasto de ayer vs. techo, acciones de la última pasada, propuestas pendientes, cambios de la semana, zona horaria de la cuenta | Sí | Fase 2 y 4. Panel "Hoy" con esos cinco bloques |
| 15 | "Cada error vuelve como una regla nueva". Reporta también los días sin cambios | Sí | Fase 5. Tabla de reglas versionada; cada recomendación fallida genera una lección. La bitácora reporta "hoy no hubo cambios" explícitamente |
| 16 | Orden: "no es estética, es la condición para que un sistema entienda". Nomenclatura consistente | Sí | Fase 1. Tus nombres ya tienen estructura ("TC / Fase 1 / ABO / Abierta H / ... / 25/07/26"). Parser que extrae fase, ABO/CBO, audiencia y fecha, más chequeo de cumplimiento de nomenclatura |
| 17 | Live Ads: gasto y CPA por anuncio con vista previa del creativo; "1,417 anuncios que nadie estaba viendo"; ganadores alimentan nuevas variantes | Parcial | Fase 2. Vista por anuncio con miniatura y contador de "anuncios sin revisar". Generar variantes queda fuera de alcance |
| 18 | Identidad: "sin márgenes y límites no sabe cuánto puede pagar por una venta" | Sí, hueco en nuestro plan | Fase 0. Perfil por cuenta: margen, ROAS de equilibrio, CPA objetivo, techo y piso de gasto diario, lista blanca, "noes duros". Sin esto "escalar" no significa nada |
| 19 | El humano acepta o rechaza cada propuesta y eso alimenta al agente | Sí | Fase 4 y 5. Cada propuesta guarda veredicto humano y razón; alimenta la calibración |

## 3. Lo que NO adoptamos y por qué
- Modelo de servicio gestionado con aplicación y onboarding manual: construimos una herramienta interna.
- Ejecución automática desde el inicio: el destino es el mismo (auto con candados), pero se llega por etapas: off → semi (propuesta → aprobación en un clic → ejecución con write-ahead log y rollback) → auto por regla cuando esa regla lleva N propuestas aprobadas sin corrección.
- CRO, copy, contenido, mailing, social listening: fuera del propósito (bitácora + decisiones de cuenta). Social listening de comentarios en anuncios es la única pieza con valor futuro para nosotros, como fase 6 opcional.
- Ventana única de 72h: demasiado corta para el volumen de compras de una cuenta mediana. La usamos como primer checkpoint, no como veredicto.
- Umbral de 10,000 USD/mes: no aplica, pero su lógica sí: con poco volumen el agente 2 dirá "baja confianza" con frecuencia. Es honesto, no un defecto.

## 6. Posicionamiento cerrado (2026-09-04)

**Sí ejecutamos.** Camino off → semi → auto, por cuenta y por regla (`ROADMAP.md`, Fases 4 y 4b).

**Conjunto de acciones** (el de Testmia): subir o bajar presupuesto diario de campaña o ad set dentro de los candados; mover presupuesto entre dos campañas como transacción atada; pausar un anuncio, ad set o campaña; cambiar programación. Nada más.

**Lo que nunca hace el agente, literal, en cualquier modo:**
1. Nunca borrar nada (campañas, ad sets, anuncios, audiencias, creativos).
2. Nunca tocar creativo, segmentación, puja ni objetivo de optimización.
3. Nada nuevo se enciende solo: lo que el agente cree (si algún día crea) nace pausado y lo activa una persona.
4. Nunca reactivar lo que pausó una persona.
5. No operar si el día no cerró: los veredictos y las propuestas se calculan solo con días completos; el día en curso se muestra, no se juzga ni se opera sobre él.
6. Ninguna orden sale sin candados verificados (máximo por cambio, acumulado en la ventana, espera, tope diario de acciones, techo contra gasto real, lista blanca, noes duros) ni sin fila previa en el write-ahead log.

Cualquier acción fuera de esta lista requiere cambiar este documento, `CLAUDE.md` y el código de la matriz de acciones en el mismo commit.

## 4. Lo que Testmia no tiene y nosotros sí
- Análisis retrospectivo de los cambios humanos (qué hizo el media buyer y qué pasó después). Testmia registra cambios humanos pero no los evalúa.
- Dayparting con matriz día × bloque horario.
- Anotaciones de "por qué" por cambio, capturadas del humano.
- Multi-cuenta consolidado entre negocios distintos.
- Reevaluación a 7 y 14 días con veredicto que madura.

## 5. Roadmap actualizado (solo los deltas)

Fase 0 · Spike (2-3 días)
+ Perfil por cuenta: margen, ROAS de equilibrio, CPA objetivo, techo y piso de gasto diario, lista blanca de campañas, noes duros.
+ Especificación del parser de nomenclatura a partir de los nombres reales de la cuenta.

Fase 1 · Bitácora (semanas 1-2)
+ Collector cada 6 h para alertas; consolidación diaria a las 00:00 CDMX.
+ Actor tipado: persona / agente / Meta en un solo timeline.
+ Circuit breakers del collector: fallo de log, cuenta deshabilitada, problema de pago, datos incompletos, con alerta.
+ Reporte explícito de días sin cambios.
+ Chequeo de cumplimiento de nomenclatura.

Fase 2 · Métricas (semanas 3-4)
+ Ventas netas de Shopify, MER, clientes nuevos, CAC, AOV, recompra y top productos como núcleo, no opcional.
+ Regla de día cerrado e insignias de madurez y cobertura en cada métrica.
+ Vista por anuncio con miniatura del creativo y contador de "anuncios sin revisar".
+ Panel "Hoy": gasto de ayer vs. techo, últimos cambios, propuestas pendientes, cambios de la semana, zona horaria.

Fase 3 · Agente semanal (semanas 5-6)
+ Ventanas de evaluación por cambio a 72 h, 7 d y 14 d contra el resto de la cuenta en el mismo periodo.
+ Entidad "experimento" con hipótesis y criterio de éxito declarados antes; el agente evalúa contra lo declarado.
+ Veredicto preliminar → maduro.

Fase 4 · Estratega (semanas 7-8)
+ Candados codificados aplicados a las recomendaciones (máximo por cambio, espera tras acción, tope diario, lista blanca).
+ Cola de propuestas pendientes con aprobar / rechazar y razón.
+ Modos Off / Semi-automático por cuenta; Automático bloqueado hasta 4b.
+ Freno de emergencia manual por cuenta.

Fase 4b · Ejecución asistida
+ Write-ahead log: primero se registra, luego sale la orden.
+ Movimientos atados con rollback y congelamiento de 72 h.
+ Matriz de acciones permitidas: nunca borrar, nunca tocar creativo, targeting, puja u objetivo; anuncios nuevos nacen pausados; nunca reactivar lo pausado por humano.

Fase 5 · Calibración
+ Cada error vuelve como regla versionada.
+ Veredicto humano por propuesta alimenta los umbrales.

Impacto en tiempo: fases 0 a 2 crecen unos 3-4 días en total por el perfil de cuenta, el collector cada 6 h y las métricas de Shopify. Fases 3 y 4 no cambian de duración: las ideas de Testmia sustituyen decisiones de diseño que igual había que tomar. Estimación v1: 8 a 9 semanas.
