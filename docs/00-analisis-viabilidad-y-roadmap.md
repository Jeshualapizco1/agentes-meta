# Agentes Meta — Análisis de viabilidad, áreas de oportunidad y roadmap

Fecha: 2026-09-03 · Autor: análisis previo a codear · Estado: borrador para decisión

## 1. Veredicto en una página

| Pieza | Viabilidad | Riesgo | Nota clave |
|---|---|---|---|
| Agente 1 · Bitácora diaria (00:00 CDMX) | Alta | Bajo | Verificado hoy contra la API: hay hora, responsable, acción y valor antes/después. |
| Agente 2 · Análisis semanal "qué ayudó y qué no" | Media-alta | Medio | Viable como análisis antes/después con contexto y nivel de confianza. NO viable como atribución causal estricta. |
| Agente 3 · Highlights, escalar/recortar, dayparting | Media-alta | Medio | Viable como detector y recomendador. La ejecución de dayparting choca con una regla de Meta (ver 3.6). |
| App visual | Alta | Bajo | Sin obstáculos técnicos; el reto es diseño de información, no ingeniería. |
| Sistema completo v1 | Alta | Medio | ~8 semanas. La bitácora es usable en 2. |

Conclusión: sí es viable y vale la pena. El valor real no está en "leer el log" (eso ya lo hace Ads Manager) sino en tres cosas que Meta no da: (a) cruzar cada cambio con lo que pasó después en los números, (b) conservar historia más allá de la retención de Meta con contexto humano ("por qué lo hice"), y (c) convertir eso en recomendaciones accionables con evidencia.

## 2. Lo que verifiqué hoy (evidencia, no suposición)

### 2.1 Cuentas accesibles
Encontré 9 cuentas publicitarias con tu usuario. El sistema debe ser multi-cuenta desde el día uno.

| Cuenta | ID | Business | Estado | Consultable |
|---|---|---|---|---|
| Aromante 1 Principal | 1703313583465547 | Aromante · Fragancias para Hombres | Activa | Sí |
| Aromante 2 | 868659071242640 | Aromante | Activa | Sí |
| Aromante 3 | 699409435248329 | Aromante | Activa | Sí |
| Aromante 4 | 860693565436963 | Aromante | Cerrada | No |
| Venta Por Menor - Aromante | 500403708677075 | Somos Vita Plus | Activa | Sí |
| Pestañas Sarahí | 6601953113162872 | Somos Vita Plus | Activa | Sí (MCP aún no habilitado) |
| Car Studio | 1202862477170274 | CAR STUDIO | Activa | Sí |
| SomosVitaPlus - Drop | 1358758457951590 | VitaPlus | Deshabilitada (actividad inusual) | No |
| Jeshua Acosta (personal) | 1028157971401107 | — | Sin liquidar | No |

Implicación: las cuentas Aromante viven en dos Business Managers distintos. Se necesita un System User (token permanente) por cada BM.

### 2.2 El log de cambios existe y trae lo que pides
Muestra real de Aromante 1 Principal, últimos 7 días, 60 eventos:

- Campos por evento: tipo de evento, actor (id y nombre), objeto (id y nombre), aplicación, fecha/hora, y `extra_data` con valor anterior y nuevo.
- Tipos encontrados: "Ad set status updated" (28), "Ad set targeting updated" (14), "Ad delivered" (12), "Custom audience updated" (3), "Custom audience created" (2), "Ad status updated" (1).
- Responsables: Eduardo Torres (46 eventos) y Meta (14, eventos de sistema).
- Un cambio de segmentación trae el diff completo: audiencias excluidas, ubicación, edad, placements.
- Un cambio de estado trae `last_learning_exit`, es decir, cuándo salió el ad set de la fase de aprendizaje. Esto es oro para el agente 2.

### 2.3 Los datos por hora existen (base del dayparting)
Consulté gasto e impresiones con desglose `hourly_stats_aggregated_by_advertiser_time_zone` por campaña. Llegan 24 filas por campaña por día, en la zona horaria de la cuenta. Ejemplo: campaña "CBO | SCALE", 00:00-00:59, $36.07 MXN, 723 impresiones.

Advertencia importante: el ROAS por hora regresó nulo en la muestra de un día. Las compras por hora son pocas y ruidosas; el dayparting solo es confiable agregando varias semanas (ver 3.6).

### 2.4 Hallazgo técnico decisivo: no usar el conector MCP para producción
El conector de Meta Ads que usas en este chat devuelve la fecha como texto ("9/3/2026 at 9:35 AM") sin zona horaria y sin formato estable. Para el agente hay que ir directo a la Graph API (`/act_<id>/activities` e `/insights`), que devuelve `event_time` en ISO 8601 con offset. El MCP sirvió para validar viabilidad; el producto usa su propio token.

## 3. Riesgos y realidades duras (sin guardarme nada)

### 3.1 El log crudo es ruidoso y hay que "compilarlo"
Cada edición humana genera un par "Active → Pending Process → Active" que Meta produce por sistema, más eventos "Ad delivered". Sin procesamiento, la bitácora sería ilegible: 60 líneas donde el humano hizo 15 cosas. Solución: agrupar eventos en "sesiones de edición" (mismo actor, mismo objeto, ventana de 2-3 minutos), descartar pares de sistema redundantes y reconstruir un diff legible ("Presupuesto diario $800 → $1,200 (+50%)").

### 3.2 Retención del historial en Meta
El conector asume 3 meses hacia atrás por defecto. No confío en que Meta guarde más. Por eso el agente 1 es el cimiento: copiamos todo a nuestra base de datos cada noche y hacemos un backfill de 90 días el primer día. Después de eso la retención es nuestra.

### 3.3 La atribución causal es el punto más débil y hay que ser honestos con el equipo
"Este cambio le hizo bien a la cuenta" es una afirmación causal. Lo que realmente podremos decir es "después de este cambio, en una ventana de N días, la métrica X se movió Y% respecto a la línea base, mientras que los ad sets no tocados se movieron Z%". Los factores de confusión son enormes:
- Meta redistribuye presupuesto sola dentro de CBO/Advantage+ y eso no aparece en el log.
- Estacionalidad mexicana: quincenas, Buen Fin, Navidad, Día del Padre (crítico para fragancias masculinas), lunes vs. viernes.
- Creativos nuevos, fatiga, competencia en subasta, stock, caídas del sitio, promociones.
- Fase de aprendizaje: cambios "significativos" (presupuesto >20%, segmentación, creativo, puja) reinician el aprendizaje y deprimen resultados 3-7 días por sí mismos.
- Volumen: con pocas compras por ad set, cualquier comparación de 3 días es ruido.

Cómo lo manejamos: (1) cada veredicto lleva nivel de confianza (alta/media/baja) calculado por volumen de conversiones y estabilidad de la línea base; (2) usamos como control los ad sets/campañas no tocadas en la misma ventana; (3) el lenguaje del reporte dice "coincidió con", nunca "causó", salvo en pruebas A/B formales; (4) marcamos explícitamente los cambios que reiniciaron aprendizaje; (5) las anotaciones humanas (3.9) convierten cambios en hipótesis evaluables.

### 3.4 Los números de Meta se mueven después de reportados
Las conversiones se siguen acreditando hasta 7 días (ventana de clic de 7 días) y Meta reexpresa cifras. Un análisis el domingo de un cambio hecho el viernes es prematuro. Solución: guardar snapshots de insights con `fetched_at`, y que el agente 2 reevalúe cada cambio a 7 y 14 días de madurez, actualizando el veredicto ("preliminar" → "maduro").

### 3.5 Zonas horarias
CDMX es UTC-6 fijo (sin horario de verano desde 2022), lo que simplifica. Pero: el log viene en UTC, los insights vienen en la zona horaria de la cuenta. Hay que verificar en el spike que `timezone_name` de cada cuenta sea America/Mexico_City; si alguna cuenta quedó en otra zona, el dayparting saldría desplazado. La corrida de las 00:00 CDMX equivale a 06:00 UTC; el corte semanal del domingo 23:59 CDMX es lunes 05:59 UTC.

### 3.6 Dayparting: una restricción de Meta que cambia el diseño
La programación de anuncios por horas nativa de Meta (`adset_schedule`) solo funciona con presupuesto total (lifetime), no con presupuesto diario. Si la cuenta opera con presupuesto diario (lo habitual), las opciones son:
1. Migrar campañas seleccionadas a presupuesto total con calendario (limpio, pero cambia la mecánica de pacing).
2. Reglas automatizadas o cambios de presupuesto por hora vía API (sucio: cada cambio >20% reinicia aprendizaje y el pacing de Meta ya concentra gasto en horas buenas).
3. Solo recomendar, y que el media buyer decida.

Además, los datos por hora atribuyen la conversión a la hora de la impresión, y las compras por celda hora×día son diminutas. Diseño propuesto: matriz día de la semana × 4 bloques horarios, mínimo 4 semanas de datos, umbral mínimo de conversiones por celda, y una recomendación solo cuando la diferencia entre bloques supere un margen configurable. Recomiendo la opción 3 en v1 y la 1 como fase posterior con aprobación humana.

### 3.7 Multi-cuenta y accesos
Dos Business Managers, seis cuentas útiles. Se requiere un System User por BM con permisos `ads_read` (y `ads_management` solo si en el futuro se ejecutan cambios). Los tokens de System User no expiran. La Graph API cambia de versión cada ~2 años: fijar versión y planear upgrade.

### 3.8 Riesgo de alucinación del LLM
Si el modelo calcula números, mentirá tarde o temprano. Regla de arquitectura: todo número lo calcula código determinista (SQL/TypeScript) y produce un "paquete de evidencia" estructurado; el LLM solo redacta e interpreta a partir de ese paquete, y cada afirmación del reporte enlaza a las filas que la sustentan.

### 3.9 El log dice QUÉ pero no POR QUÉ
La mayor oportunidad del proyecto: un campo de "razón" de una línea por cambio (capturado en la app o por un mensaje diario "ayer hiciste 6 cambios, ¿por qué?"). Con razón + hipótesis, el agente 2 evalúa "¿se cumplió lo que esperabas?" en vez de adivinar.

### 3.10 Riesgo de sobre-automatizar demasiado pronto
Tentación: que el agente 3 ejecute escalados solo. Recomiendo v1 en modo "recomienda → humano aprueba con un clic → se ejecuta y queda en la bitácora con actor 'Agente'". Automatización sin aprobación solo cuando el historial de recomendaciones demuestre tasa de acierto.

### 3.11 Costo estimado
Infraestructura (Supabase + hosting): 25-50 USD/mes. API de Claude para narrativas: 10-40 USD/mes según cuentas. Meta API: sin costo. Lo caro es el tiempo de construcción y calibración, no la operación.

## 4. Áreas de oportunidad (más allá de lo que pediste)

1. Anotaciones y hipótesis por cambio (3.9). Convierte la bitácora en un registro de experimentos.
2. Detector de reinicio de fase de aprendizaje con alerta inmediata: "este cambio de presupuesto (+45%) reinició el aprendizaje del ad set X".
3. Alertas en tiempo real, no solo a medianoche: pausas, cambios de presupuesto >X%, gasto anómalo, cuenta deshabilitada (ya tienes una cuenta con esa bandera).
4. Snapshot diario de configuración (estado completo de campañas/ad sets/ads), además del log. Permite responder "¿cómo estaba la cuenta el 14 de agosto?" y detectar cambios que el log no captura.
5. Verdad de negocio con Shopify: cruzar ingresos reales con el ROAS reportado por Meta para calcular MER y detectar sobre/sub-atribución. Tienes Shopify conectado; es una integración natural.
6. Fatiga creativa: frecuencia, decaimiento de CTR y CPM por anuncio, con sugerencia de rotación.
7. Calendario de contexto: quincenas, Buen Fin, fechas clave de fragancias, promociones internas. El agente 2 los usa para no culpar a un cambio de lo que hizo el calendario.
8. Playbook codificado: las reglas de escalado que hoy usa el media buyer se escriben como reglas verificables; el agente reporta cumplimiento y desviaciones.
9. Vista multi-cuenta consolidada con comparación entre cuentas Aromante.
10. Entrega por WhatsApp/Slack/email además de la app, y export a PDF del reporte semanal.
11. Auditoría de responsables: quién cambia qué y con qué resultado, por persona, para equipos con varios media buyers.
12. Cierre del loop: registrar si cada recomendación se siguió y qué pasó, para calibrar los umbrales con datos propios.

## 5. Arquitectura propuesta

- Monorepo TypeScript: `apps/web` (Next.js, Tailwind, gráficas con Recharts/visx), `packages/meta` (cliente Graph API con reintentos y versión fijada), `packages/db` (Postgres en Supabase, Drizzle ORM, migraciones), `packages/agents` (collector, analyst, strategist), `packages/core` (agrupación de eventos, diffs, cálculo de evidencia).
- Base de datos: `accounts`, `entities` (snapshots de campaign/adset/ad), `change_events` (crudo), `change_groups` (sesiones legibles), `insights_daily`, `insights_hourly`, `annotations`, `analyses` (reportes semanales versionados), `recommendations`, `agent_runs` (auditoría de cada corrida).
- Scheduling: pg_cron en Supabase o cron del hosting, en UTC. Corridas idempotentes y reejecutables por rango de fechas. Botón "forzar análisis" en la app para el agente 2.
- Agentes = código determinista + LLM para narrativa (Claude), con paquete de evidencia como contrato entre ambos.
- Notificaciones: n8n o llamadas directas a WhatsApp/Slack.
- Alternativas descartadas: usar el conector MCP en producción (fechas sin zona), Windsor.ai como ingesta (no expone el log de cambios, costo extra).

## 6. Roadmap

| Fase | Duración | Entregable | Criterio de éxito |
|---|---|---|---|
| 0 · Spike y accesos | 2-3 días | System User por BM, verificación de retención del log y zona horaria de cuentas, proyecto Supabase, repo, script de backfill 90 días | Las 6 cuentas descargan su historial a la BD sin errores |
| 1 · Bitácora | Semanas 1-2 | Collector diario 00:00 CDMX, agrupación en sesiones, diffs legibles, timeline visual con filtros (cuenta, responsable, tipo, objeto, fecha), export CSV | Todo cambio del Ads Manager aparece al día siguiente con hora CDMX, responsable y valor antes/después |
| 2 · Métricas y contexto | Semanas 3-4 | Ingesta de insights diarios y por hora con snapshots, ingresos Shopify, gráficas con los cambios marcados sobre la curva de ROAS/CPA/gasto, anotaciones de razón | Ver cualquier cambio y su "después" en una sola pantalla |
| 3 · Agente semanal | Semanas 5-6 | Paquete de evidencia antes/después con control, nivel de confianza, narrativa LLM, disparo manual, reevaluación a 7 y 14 días, envío del reporte | Reporte del domingo aceptado por el media buyer como justo y útil dos semanas seguidas |
| 4 · Agente estratega | Semanas 7-8 | Reglas de escalar/recortar con umbrales configurables, matriz de dayparting con significancia mínima, alertas de fase de aprendizaje, highlights diarios y semanales | Al menos una recomendación por semana que el equipo decida ejecutar |
| 4b · Ejecución asistida | Después | Botón "aplicar" con aprobación humana; el agente escribe en Meta y queda en la bitácora | Cero cambios sin aprobación |
| 5 · Calibración | Continuo | Registro de recomendaciones seguidas y resultado; ajuste de umbrales | Tasa de acierto medida y creciente |

Total v1 (fases 0-4): unas 8 semanas. La bitácora sola es usable en 2.

## 7. Decisiones que necesito de ti (supuestos mientras tanto)

1. Cuentas a incluir. Supuesto: las 6 activas (3 Aromante, Venta Por Menor, Pestañas Sarahí, Car Studio).
2. Métrica norte por cuenta. Supuesto: ROAS de compra y CPA, con MER de Shopify como verdad de negocio.
3. ¿Los agentes solo recomiendan o también ejecutan? Supuesto: solo recomiendan en v1.
4. Canal de entrega además de la app. Supuesto: la app primero; WhatsApp/Slack en fase 3.
5. Stack. Supuesto: Supabase + Next.js + Claude API, porque ya tienes Supabase conectado.
6. Quién anota razones de cambio. Supuesto: cada media buyer, desde la app, al día siguiente.
