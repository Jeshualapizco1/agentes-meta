# Manual de operación · para el equipo

Este manual es para quien opera la cuenta y recibe los avisos, no para quien programa. Explica qué hacer en cada
situación. La app vive en https://bitacora-aromante.netlify.app (usuario y contraseña; los administradores dan de alta a
la gente en la sección Usuarios).

## 1. Cada mañana: qué mirar en Estado del sistema

Abre **Estado del sistema** (menú de la izquierda, abajo). Tres cosas, en este orden:

1. **Cuentas.** La fila de Aromante 1 debe decir "activa" y la última corrida debe ser de hace menos de 7 horas (el
   sistema corre a las 00:17, 06:17, 12:17 y 18:17, hora de la Ciudad de México). Si la última corrida es de ayer o
   antes, algo se detuvo: avisa a Jeshua.
2. **Alertas sin atender.** Cada alerta trae qué pasó y, cuando aplica, un "Qué hacer". Las rojas son urgentes
   (también llegan por Telegram); las ámbar pueden esperar al día. Cuando algo ya se atendió, se marca como atendido.
3. **Corridas recientes.** Las filas deben decir "ok". Una "failed" aislada no es grave si la siguiente ya dice "ok";
   dos seguidas del mismo agente sí lo son.

Después abre **Hoy**: gasto de ayer contra el techo, propuestas pendientes (si las hay) y el estado del freno.

## 2. Avisos por Telegram: qué hacer con cada uno

Por Telegram solo llegan las cosas que requieren a alguien. Lo demás se queda en Estado del sistema.

| Aviso | Qué significa | Qué hacer |
|---|---|---|
| 🔴 **Freno de emergencia activado** | El sistema detuvo toda propuesta y ejecución porque vio gasto disparado, demasiadas propuestas en una pasada, un fallo al registrar, o un problema de pago en la cuenta. | Revisar la causa en Meta o en Estado del sistema. Corregirla. Solo un administrador lo libera, desde Hoy, escribiendo la razón. No se libera "para ver qué pasa". |
| 🔴 **Collector caído** | El sistema no pudo bajar los cambios de Meta. La bitácora deja de actualizarse. | Si el mensaje habla de una anotación sin sesión, seguir el "Qué hacer" de la alerta en Estado del sistema (abrir la sesión indicada y copiar o quitar la anotación). Cualquier otra causa: avisar a Jeshua. |
| 🔴 **Token de Meta por vencer / inválido** | El acceso a Meta caduca en menos de 10 días o ya caducó. | Rotar el token (sección 6). Si ya caducó, la bitácora no se actualiza hasta rotarlo. |
| 🔴 **Gasto real sobre el techo** | Ayer se gastó más que el techo diario configurado. | Revisar presupuestos en Meta. Mientras siga así, el sistema no propondrá subidas. Si el techo cambió de verdad, actualizarlo en Configuración y anotar por qué. |
| 🟡 **Propuesta pendiente** | El estratega propone un cambio y espera aprobación. | Abrir Hoy y decidir (sección 3). Si nadie decide antes de la siguiente pasada, expira sola. |
| ⚪ **Propuesta expirada** | Nadie decidió a tiempo. | Nada que hacer: si sigue aplicando, se vuelve a proponer. Si esto pasa seguido, acordar quién revisa Hoy cada mañana. |
| 📋 **Resumen diario** | Llega después de la pasada que decide (una vez al día): cuántas entidades revisó, cuántas propuso, si hay freno, cuántas ventanas maduraron y qué experimentos están por vencer. | Leerlo. Si dice "freno: SÍ" o hay propuestas, entrar a Hoy. |
| 🗓 **Primera semana en solitario** | Se manda una sola vez, cuando el sistema lleva 7 días corriendo solo. | Es el punto de revisión con Jeshua para decidir si se activan las primeras reglas. |

## 3. Propuestas: aprobar, rechazar, corregir

Las propuestas aparecen en **Hoy**, en el bloque "Propuestas pendientes". Cada una dice qué haría (por ejemplo, subir el
presupuesto de una campaña de $1,000 a $1,150), por qué (evidencia con sus números) y qué candados revisó.

- **Aprobar:** clic en Aprobar. La razón es opcional. Hoy el sistema está en modo simulado: aprobar no cambia nada en
  Meta; registra lo que habría hecho y la propuesta queda como "simulada". Así se prueba el flujo sin riesgo.
- **Rechazar:** clic en Rechazar. La razón es obligatoria, en una línea ("ya lo subí a mano", "esa campaña es de
  promo", "no confío en el dato"). Esa razón se usa para ajustar las reglas.
- **Corregir el monto:** si estás de acuerdo con la idea pero no con la cantidad, cambia el número en la casilla antes
  de aprobar y escribe la razón. Cuenta como corrección: la propuesta queda aprobada con tu número y la regla vuelve a
  empezar su racha (una regla solo pasa a automático cuando acumula aprobaciones seguidas sin corrección).

Regla práctica: si no sabes qué decidir, rechaza con la razón "necesito revisar". Rechazar nunca mueve nada.

## 4. El freno de emergencia

Está en Hoy, abajo del bloque de propuestas.

- **Cualquiera puede frenar** la cuenta con el botón "Frenar cuenta" (razón opcional). Úsalo si ves algo raro: gasto
  disparado, cambios que nadie hizo, una campaña que no debía estar activa. Frenar no toca Meta: solo impide que el
  sistema proponga o ejecute algo.
- **Se activa solo** si el gasto del día va por encima de techo × 1.5, si en una pasada salen más propuestas de las
  permitidas, si falla el registro de una propuesta, o si Meta reporta problema de pago.
- **Solo un administrador lo libera**, con razón obligatoria, después de corregir la causa. Queda registrado quién lo
  puso, quién lo quitó y por qué.

## 5. Experimentos

Un experimento es una prueba con hipótesis, criterio de éxito y presupuesto declarados **antes** de hacer el cambio.

**Crear uno**
1. Desde la Bitácora, abre la sesión del cambio que quieres probar y pulsa "Convertir en experimento". Se precargan las
   campañas tocadas y la fecha. (También se puede crear desde cero en Experimentos.)
2. Escribe la hipótesis en una línea ("el video UGC baja el CPA"), elige la métrica (ROAS o CPA), el umbral (ROAS ≥ 4,
   o CPA ≤ $180), las compras mínimas para que cuente (10 es un buen mínimo), la ventana en días cerrados (7 es lo
   normal) y el presupuesto diario que le asignas.
3. "Activar". Si falta algo, la app dice qué. Si no cabe en el presupuesto de exploración (un porcentaje del techo
   reservado a pruebas, en Configuración), dice cuánto queda.

**Mientras corre:** aparece en Experimentos como activo, con la fecha en que cierra su ventana. Si lo quieres detener,
"Cancelar" con razón.

**Cerrarlo:** cuando la ventana cierra, el sistema lo evalúa contra el criterio que declaraste y propone un veredicto
(graduar, descartar, sin evidencia, o revisar si las dos lecturas se contradicen). Llega un aviso. Entra a
Experimentos, lee el veredicto propuesto y confirma **Graduar** o **Descartar** con tu razón. El sistema nunca cierra un
experimento solo.

## 6. Rotar cada token

Los tokens son llaves de acceso. Nunca se pegan en el chat, en un documento ni en el código: solo en el archivo `.env`
de la computadora de Jeshua y en los secretos del repositorio (GitHub → Settings → Secrets). Después de cambiar uno,
la siguiente corrida ya lo usa.

| Token | Cuándo rotarlo | Cómo |
|---|---|---|
| **Meta** (acceso a la cuenta publicitaria) | Vence cada 60 días; el sistema avisa 10 días antes. El actual vence el 2 de noviembre de 2026. | Generar un token nuevo en Meta for Developers (herramienta de tokens, usuario del Business Manager, permisos de lectura de anuncios; el de escritura solo cuando se apague el modo simulado). Guardarlo como `META_TOKEN_AROMANTE` en `.env` y en GitHub. Ideal: pedir a Jeshua un "System User" que no caduca. |
| **Supabase** (base de datos) | Si se filtró o cada 6 meses. | En el panel de Supabase, proyecto agentes-meta → Settings → API: regenerar la llave de servicio. Guardarla como `SUPABASE_SERVICE_ROLE_KEY` en `.env`, en GitHub y en Netlify (variables de entorno de la app). La app y las corridas dejan de funcionar hasta actualizar los tres lugares. |
| **Telegram** (bot de avisos) | Si alguien ajeno entró al grupo o el token se filtró. | En Telegram, con @BotFather: `/revoke` y generar uno nuevo. Guardarlo como `TELEGRAM_BOT_TOKEN` en `.env` y en GitHub. El chat id no cambia. |
| **Claude** (redacción del reporte semanal) | Si se filtró. | En la consola de Anthropic crear una llave nueva y borrar la anterior. Guardarla como `ANTHROPIC_API_KEY` en `.env` y en GitHub. Sin ella, el reporte semanal sale sin redacción pero con todos los números. |

## 7. Apagar el modo simulado de una cuenta

Hoy, aprobar una propuesta no cambia nada en Meta: el sistema hace todo el recorrido (registra, arma la orden, verifica
el permiso del token) y la deja como "simulada". Apagar el modo simulado significa que las aprobaciones sí se ejecutan
en Meta. **Es una decisión de Jeshua, no del equipo.** Antes de apagarlo hay que revisar:

1. Que hayan pasado al menos dos semanas de propuestas simuladas, revisadas una por una, y que las simulaciones digan
   "token con permiso: sí".
2. Que el token de Meta sea un System User con permiso de escritura (`ads_management`) y que exista uno aparte de solo
   lectura para la bitácora.
3. Que el techo, el piso, la lista blanca y los noes duros estén capturados en Configuración y sean los de verdad.
4. Que el freno funcione: probarlo (frenar y liberar) antes.
5. Que alguien vaya a revisar Hoy cada mañana durante las primeras dos semanas de ejecución real.

Se apaga en Configuración, quitando la casilla "Modo simulado". La primera ejecución real se vigila en Meta al momento.
Si algo sale mal: frenar la cuenta, revertir a mano en Meta y avisar a Jeshua.

## 8. Qué no hace el sistema, nunca

Aunque se apague el modo simulado, el sistema nunca borra nada, nunca toca creativos, segmentación, puja u objetivo,
nunca enciende algo nuevo por su cuenta, nunca reactiva lo que pausó una persona, y no opera sobre el día en curso.
Lo único que puede hacer, y solo con aprobación, es pausar un anuncio, cambiar el presupuesto diario de una campaña o
ad set, y mover presupuesto entre dos campañas.
