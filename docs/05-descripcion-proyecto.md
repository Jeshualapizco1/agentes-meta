# agentes Meta · qué es y para qué existe

## En una frase
Es una bitácora inteligente de Meta Ads para Aromante (fragancias para hombres, México): registra automáticamente qué cambió en las campañas, quién lo cambió, cuándo y qué pasó después con los resultados, y a partir de eso dice qué ayudó, qué no, y qué conviene hacer.

## El problema que resuelve
Aromante invierte a diario en Meta Ads y varias personas (media buyers internos y externos) tocan la cuenta: suben o bajan presupuestos, pausan anuncios, cambian audiencias, reinician campañas. Meta guarda ese historial solo 90 días, lo muestra de forma cruda y no lo cruza con resultados. En la práctica nadie puede responder con certeza preguntas como: "¿por qué bajó el ROAS el martes?", "¿quién movió el presupuesto de esa campaña y qué pasó después?", "¿ese cambio ayudó o coincidió con algo más?", "¿a qué horas conviene gastar?". Las decisiones se toman de memoria y sin evidencia, y los errores se repiten.

## Qué hace la aplicación
Tres agentes que trabajan sobre una misma base de datos, y una app web muy visual para consultar todo:

1. **Collector (ya funciona).** Cada 6 horas, con consolidación a medianoche CDMX, baja de Meta todas las actividades de la cuenta (cambios de presupuesto, estado, segmentación, creativos, pujas, programación), las normaliza y las agrupa en "sesiones de cambios" legibles: una persona, una ventana de minutos, un resumen en español ("Eduardo subió el presupuesto de la campaña X de $800 a $1,200, +50%"). Marca los cambios que reinician la fase de aprendizaje. También baja las métricas diarias y por hora (gasto, compras, ROAS, CPA) por campaña, ad set y anuncio, guardando cada reexpresión que Meta hace de días anteriores. Los números de Meta son la verdad del proyecto: la cuenta tiene conectado wetracked.io, así que la atribución es confiable.

2. **Analista semanal (Fase 3, por construir).** Cada domingo por la noche, o a petición, evalúa cada cambio relevante en ventanas de 72 horas, 7 y 14 días contra el resto de la cuenta y produce un reporte: qué cambios coincidieron con mejoras, cuáles con caídas, con qué nivel de confianza. Los números los calcula código determinista; Claude solo redacta la narrativa a partir de ese paquete de evidencia.

3. **Estratega (Fase 4, por construir).** A partir de las reglas configuradas por cuenta (margen, ROAS de equilibrio y objetivo, CPA objetivo, techo y piso de gasto diario, lista blanca de campañas, "noes duros") propone cuándo escalar, recortar o hacer dayparting, con candados (cambio máximo por movimiento, tiempo de espera, tope de acciones por día). Solo recomienda; nunca ejecuta sin aprobación humana. La ejecución asistida con registro previo y reversión queda para una fase posterior.

**La app web** (Next.js, desplegada en Netlify, acceso con usuario y contraseña) tiene: Bitácora (línea de tiempo por día con filtros y detalle de cada sesión, donde el responsable anota la razón, la hipótesis y el criterio de éxito), Cuenta (gasto, ROAS y CPA diarios con cada cambio marcado sobre la curva), Horarios (mapa día × hora del rendimiento en CDMX con regla de evidencia mínima), Configuración (perfil y candados por cuenta con historial de quién cambió qué), Usuarios y Estado del sistema (corridas, alertas, salud de las cuentas).

## Para qué
- Que cada cambio en Meta quede registrado con responsable, hora y antes/después, sin depender de la memoria de nadie ni de los 90 días de retención de Meta.
- Que los cambios se puedan juzgar con datos: ver el "después" de cada movimiento en una sola pantalla.
- Que el equipo aprenda: cada error vuelve como regla; cada decisión queda con su razón e hipótesis.
- A mediano plazo, que la operación de la cuenta sea más disciplinada y rentable, con recomendaciones semanales que el equipo decide ejecutar o no.

## Principios que no se negocian
- Los números los calcula código determinista con pruebas; el modelo de lenguaje solo redacta a partir de evidencia.
- Nunca se juzga el día en curso; los veredictos usan solo días cerrados. Si un dato está incompleto, la interfaz lo dice en vez de estimarlo.
- Se dice "coincidió con", nunca "causó", salvo en un experimento A/B formal.
- Los agentes no escriben en Meta hasta que exista aprobación humana y un registro previo de cada orden.
- Todo se muestra en hora de la Ciudad de México aunque las cuentas de Meta y la tienda operen en otra zona.
- Todo en español: interfaz, código comentado, documentación y commits.

## Cómo está construido
Monorepo en pnpm con TypeScript: `packages/core` (normalización, agrupación en sesiones, parser de nomenclatura, zonas horarias, IDs estables; con pruebas), `packages/meta` (cliente de Graph API), `packages/db` (Supabase/Postgres con RLS), `packages/agents` (collector) y `apps/web` (Next.js 15 con Tailwind 4). El collector corre en GitHub Actions; la app en Netlify; la base en Supabase. Se operan tres cuentas de Meta de Aromante (una activa, dos dormidas).

## Estado (2026-09-03)
Fase 0 (accesos y esquema), Fase 1 (bitácora) y Fase 2 (métricas de Meta diarias y por hora, gráficas con cambios marcados, horarios, configuración, panel Hoy) están construidas. Siguen la vista por anuncio, la vista de nomenclatura y después el analista semanal.
