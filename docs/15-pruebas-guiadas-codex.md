# Plataforma orientada a pruebas · 2026-09-07

## Cambio entregado

El recorrido principal es Hoy → oportunidad → prueba → resultado. Anuncios ya no utiliza el check manual ni el contador de revisiones de siete días: esa tarea solo dejaba constancia de que alguien había visto el anuncio. Se conserva la tabla histórica y la acción antigua por compatibilidad, pero la nueva UI no la llama.

Hoy muestra la meta existente del perfil y la distancia en puntos de ROAS únicamente con una lectura completa y reciente. No fija una meta automáticamente. La cuenta principal tiene meta 6; no se afirma que esa cifra sea el doble del ROAS actual.

Decisiones conserva la evidencia y permite preparar una prueba de la campaña o comparar sus anuncios. Las reglas del agente están en un desplegable avanzado. Anuncios conserva cuenta y campaña en la navegación y lleva el anuncio de origen al formulario; la medición del experimento es de campañas, no de un anuncio aislado.

El formulario presenta tres pasos: cambio y campañas, criterio y presupuesto, confirmación. El usuario declara ROAS mínimo o CPA máximo, compras mínimas, días completos y fecha del cambio. El día del cambio queda excluido del cálculo, igual que en el analista existente. La fecha estimada de lectura incluye el cierre del último día medido.

Las pruebas muestran resultado, meta y compras; la evidencia extensa está desplegable. Un borrador se puede reabrir y editar. Los errores esperables de guardado no redirigen ni borran lo escrito. Confirmar un aprendizaje no escala una campaña.

## Persistencia y controles

Se reutiliza experiments; sin migraciones ni cambios en perfiles, reglas o Meta. Se valida membresía, cuenta habilitada, campañas y sesión de la misma cuenta. El servidor valida números finitos, enteros de compras/duración y fecha real. Guardar un borrador nuevo exige un plan completo; los borradores antiguos incompletos se pueden completar.

Editar aplica filtros de cuenta y estado borrador. Activar solo parte de borrador; decidir solo parte de evaluando; cancelar no modifica pruebas cerradas. Las actualizaciones verifican que se haya modificado una fila antes de confirmar éxito. La guía requiere confirmación visible para iniciar seguimiento.

El presupuesto disponible se lee paginado y los fallos de lectura bloquean el inicio. Este límite es de planificación: no impide el gasto real en Meta y la lectura más inserción aún no es una reserva transaccional frente a dos altas simultáneas. No presentar estos cambios como cierre del roadmap de ejecución.

## Verificación

- 382 pruebas web, incluidas 15 nuevas de acciones.
- 115 core aprobadas y una omitida histórica; siete casos nuevos de entrada inválida.
- Ocho pruebas DB unitarias aprobadas; no se modificó SQL.
- 53 pruebas Playwright de laboratorio, incluidas cuatro nuevas del asistente.
- Compilación Next, tipos y build de laboratorio.
- Navegador: inspección del formulario y sus tres pasos con datos ficticios; sin guardar en producción.
- Consulta de solo lectura a Supabase: meta, techo, porcentaje y cantidad de experimentos en las cuentas habilitadas. Cero experimentos reales en el corte.

Se consultaron las guías de Supabase para filtros de actualización y su changelog, y la guía del navegador para validar la interfaz. La validación autenticada real requiere la sesión del operador; no se fabricaron sesiones ni resultados.

## Pendiente para el objetivo de 2×

Fijar línea base durable y fecha objetivo, medir el avance agregado y completar una primera prueba real. Las comparaciones observacionales y el criterio declarado ayudan a decidir; no prueban causalidad ni garantizan duplicar el retorno. La meta global y el éxito de una prueba son conceptos distintos.

La versión se entrega en código y servidor local. Netlify requiere un despliegue y validación separados.
