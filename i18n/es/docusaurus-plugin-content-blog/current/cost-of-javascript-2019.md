---
title: &apos;El costo de JavaScript en 2019&apos;
author: &apos;Addy Osmani ([@addyosmani](https://twitter.com/addyosmani)), Encargado de JavaScript, y Mathias Bynens ([@mathias](https://twitter.com/mathias)), Liberador del Hilo Principal&apos;
avatars:
  - &apos;addy-osmani&apos;
  - &apos;mathias-bynens&apos;
date: 2019-06-25
tags:
  - internals
  - parsing
description: &apos;Los costos dominantes de procesar JavaScript son el tiempo de descarga y ejecución en la CPU.&apos;
tweet: &apos;1143531042361487360&apos;
---
:::note
**Nota:** Si prefieres ver una presentación en lugar de leer artículos, disfruta el video a continuación. Si no, omite el video y sigue leyendo.
:::

<figure>
  <div class="video video-16:9">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/X9eRLElSW1c" allow="picture-in-picture" allowfullscreen loading="lazy"></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=X9eRLElSW1c">“El costo de JavaScript”</a> presentado por Addy Osmani en la Conferencia #PerfMatters 2019.</figcaption>
</figure>

<!--truncate-->
Un cambio significativo en [el costo de JavaScript](https://medium.com/@addyosmani/the-cost-of-javascript-in-2018-7d8950fbb5d4) en los últimos años ha sido una mejora en la velocidad con la que los navegadores pueden analizar y compilar scripts. **En 2019, los costos dominantes de procesar scripts ahora son el tiempo de descarga y ejecución en la CPU.**

La interacción del usuario puede retrasarse si el hilo principal del navegador está ocupado ejecutando JavaScript, por lo que la optimización de cuellos de botella en el tiempo de ejecución del script y la red puede ser impactante.

## Orientación práctica a alto nivel

¿Qué significa esto para los desarrolladores web? Los costos de análisis y compilación **ya no son tan lentos** como pensábamos antes. Las tres cosas en las que enfocarse para los paquetes de JavaScript son:

- **Mejorar el tiempo de descarga**
    - Mantén tus paquetes de JavaScript pequeños, especialmente para dispositivos móviles. Los paquetes pequeños mejoran la velocidad de descarga, reducen el uso de memoria y disminuyen los costos de la CPU.
    - Evita tener solo un paquete grande; si un paquete supera ~50–100 kB, divídelo en paquetes más pequeños separados. (Con la multiplexación de HTTP/2, múltiples mensajes de solicitud y respuesta pueden estar en vuelo al mismo tiempo, reduciendo el costo de solicitudes adicionales.)
    - En dispositivos móviles querrás enviar mucho menos especialmente por las velocidades de red, pero también para mantener bajo el uso de memoria.
- **Mejorar el tiempo de ejecución**
    - Evita [Tareas Largas](https://w3c.github.io/longtasks/) que pueden mantener ocupado el hilo principal y retrasar el tiempo en que las páginas son interactivas. Después de la descarga, el tiempo de ejecución del script ahora es un costo dominante.
- **Evitar scripts grandes en línea** (ya que todavía son analizados y compilados en el hilo principal). Una buena regla general es: si el script supera 1 kB, evita incluirlo directamente (también porque 1 kB es el umbral cuando [el caché de código](/blog/code-caching-for-devs) se activa para scripts externos).

## ¿Por qué importan el tiempo de descarga y ejecución?

¿Por qué es importante optimizar los tiempos de descarga y ejecución? Los tiempos de descarga son críticos para redes de bajo rendimiento. A pesar del crecimiento de 4G (e incluso 5G) alrededor del mundo, nuestros [tipos de conexión efectivos](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/effectiveType) continúan siendo inconsistentes con muchos de nosotros experimentando velocidades que se sienten como 3G (o peor) cuando estamos fuera de casa.

El tiempo de ejecución de JavaScript es importante para teléfonos con CPUs lentas. Debido a diferencias en CPU, GPU y limitación térmica, existen enormes disparidades entre el rendimiento de teléfonos de gama alta y baja. Esto es relevante para el rendimiento de JavaScript, ya que la ejecución depende de la CPU.

De hecho, del tiempo total que una página pasa cargando en un navegador como Chrome, hasta un 30% de ese tiempo puede dedicarse a la ejecución de JavaScript. A continuación se muestra la carga de una página de un sitio con una carga de trabajo bastante típica (Reddit.com) en una máquina de escritorio de alto rendimiento:

![El procesamiento de JavaScript representa del 10 al 30% del tiempo dedicado en V8 durante la carga de la página.](/_img/cost-of-javascript-2019/reddit-js-processing.svg)

En dispositivos móviles, se tarda de 3 a 4× más tiempo en un teléfono promedio (Moto G4) para ejecutar el JavaScript de Reddit en comparación con un dispositivo de gama alta (Pixel 3) y más de 6× en un dispositivo de gama baja (el Alcatel 1X de menos de 100 dólares):

![El costo del JavaScript de Reddit en varias clases de dispositivos (gama baja, media y alta)](/_img/cost-of-javascript-2019/reddit-js-processing-devices.svg)

:::note
**Nota:** Reddit tiene experiencias diferentes para web en escritorio y móvil, por lo que los resultados de MacBook Pro no se pueden comparar con los otros resultados.
:::

Cuando intentas optimizar el tiempo de ejecución de JavaScript, presta atención a las [Tareas Largas](https://web.dev/long-tasks-devtools/) que podrían estar monopolizando el subproceso de la interfaz de usuario durante largos períodos de tiempo. Estas pueden bloquear tareas críticas incluso si la página parece visualmente lista. Divide estas tareas en tareas más pequeñas. Al dividir tu código y priorizar el orden en que se carga, puedes hacer que las páginas sean interactivas más rápido y, con suerte, tener una menor latencia de entrada.

![Las tareas largas monopolizan el hilo principal. Debes dividirlas.](/_img/cost-of-javascript-2019/long-tasks.png)

## ¿Qué ha hecho V8 para mejorar el análisis/compilación?

La velocidad de análisis de JavaScript en bruto en V8 ha aumentado 2× desde Chrome 60. Al mismo tiempo, el costo bruto de análisis (y compilación) se ha vuelto menos visible/importante debido a otros trabajos de optimización en Chrome que lo paralelizan.

V8 ha reducido la cantidad de trabajo de análisis y compilación en el hilo principal en un promedio del 40% (por ejemplo, 46% en Facebook, 62% en Pinterest) con la mayor mejora siendo del 81% (YouTube), al analizar y compilar en un hilo trabajador. Esto se suma al análisis/compilación de transmisión fuera del hilo principal existente.

![Tiempos de análisis de V8 en diferentes versiones](/_img/cost-of-javascript-2019/chrome-js-parse-times.svg)

También podemos visualizar el impacto en el tiempo de CPU de estos cambios en diferentes versiones de V8 a través de los lanzamientos de Chrome. En el mismo tiempo que le tomó a Chrome 61 analizar el JS de Facebook, Chrome 75 ahora puede analizar tanto el JS de Facebook como 6 veces el JS de Twitter.

![En el tiempo que le tomó a Chrome 61 analizar el JS de Facebook, Chrome 75 ahora puede analizar tanto el JS de Facebook como 6 veces el JS de Twitter.](/_img/cost-of-javascript-2019/js-parse-times-websites.svg)

Entremos en cómo se desbloquearon estos cambios. En resumen, los recursos de script pueden ser analizados y compilados en transmisión en un hilo trabajador, lo que significa:

- V8 puede analizar+compilar JavaScript sin bloquear el hilo principal.
- La transmisión comienza una vez que el analizador HTML completo encuentra una etiqueta `<script>`. Para los scripts que bloquean el analizador, el analizador HTML cede, mientras que para los scripts asíncronos continúa.
- Para la mayoría de las velocidades reales de conexión, V8 analiza más rápido que la descarga, por lo que V8 termina de analizar+compilar unos pocos milisegundos después de que se descargan los últimos bytes del script.

La explicación no tan corta es… Las versiones mucho más antiguas de Chrome descargaban un script por completo antes de comenzar a analizarlo, lo cual es un enfoque directo pero no utiliza completamente la CPU. Entre las versiones 41 y 68, Chrome comenzó a analizar scripts asíncronos y diferidos en un hilo por separado tan pronto como comienza la descarga.

![Los scripts llegan en múltiples fragmentos. V8 comienza la transmisión una vez que ha visto al menos 30 kB.](/_img/cost-of-javascript-2019/script-streaming-1.svg)

En Chrome 71, nos trasladamos a una configuración basada en tareas donde el programador podía analizar múltiples scripts asíncronos/diferidos a la vez. El impacto de este cambio fue una reducción de ~20% en el tiempo de análisis del hilo principal, dando lugar a una mejora general de ~2% en TTI/FID según lo medido en sitios web del mundo real.

![Chrome 71 cambió a una configuración basada en tareas donde el programador podía analizar múltiples scripts asíncronos/diferidos a la vez.](/_img/cost-of-javascript-2019/script-streaming-2.svg)

En Chrome 72, cambiamos a usar la transmisión como la forma principal de análisis: ahora también los scripts sincrónicos regulares se analizan de esa manera (aunque no los scripts en línea). También dejamos de cancelar el análisis basado en tareas si el hilo principal lo necesita, ya que eso solo duplicaba innecesariamente cualquier trabajo ya realizado.

[Versiones anteriores de Chrome](/blog/v8-release-75#script-streaming-directly-from-network) admitían el análisis y la compilación en transmisión donde los datos fuente del script que llegaban desde la red debían pasar a través del hilo principal de Chrome antes de ser enviados al streamer.

Esto a menudo resultaba en que el analizador en transmisión esperaba datos que ya habían llegado de la red, pero que aún no habían sido enviados a la tarea de transmisión ya que estaban bloqueados por otros trabajos en el hilo principal (como análisis HTML, diseño o ejecución de JavaScript).

Ahora estamos experimentando con iniciar el análisis en precarga, y el rebote del hilo principal era un obstáculo para esto anteriormente.

La presentación de Leszek Swirski en BlinkOn ofrece más detalles:

<figure>
  <div class="video video-16:9">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/D1UJgiG4_NI" allow="picture-in-picture" allowfullscreen loading="lazy"></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=D1UJgiG4_NI">“Analizando JavaScript en tiempo cero*”</a> presentado por Leszek Swirski en BlinkOn 10.</figcaption>
</figure>

## ¿Cómo se reflejan estos cambios en lo que ves en DevTools?

Además de lo anterior, hubo [un problema en DevTools](https://bugs.chromium.org/p/chromium/issues/detail?id=939275) que renderizaba toda la tarea del analizador de una manera que sugería que estaba usando la CPU (bloqueo completo). Sin embargo, el analizador se bloquea cada vez que está esperando datos (que necesitan pasar por el hilo principal). Desde que pasamos de un hilo de transmisión único a tareas de transmisión, esto se hizo realmente evidente. Aquí está lo que solías ver en Chrome 69:

![El problema de DevTools que renderizaba toda la tarea del analizador de una manera que sugería que estaba usando la CPU (bloqueo completo)](/_img/cost-of-javascript-2019/devtools-69.png)

La tarea "parse script" se muestra que toma 1.08 segundos. Sin embargo, ¡analizar JavaScript no es realmente tan lento! La mayor parte de ese tiempo se pasa sin hacer nada excepto esperando que los datos pasen al hilo principal.

Chrome 76 pinta una imagen diferente:

![En Chrome 76, el análisis se divide en múltiples tareas de transmisión más pequeñas.](/_img/cost-of-javascript-2019/devtools-76.png)

En general, el panel de rendimiento de DevTools es excelente para obtener una visión general de alto nivel de lo que está sucediendo en tu página. Para métricas específicas de V8, como los tiempos de análisis y compilación de JavaScript, recomendamos [usar Chrome Tracing con Runtime Call Stats (RCS)](/docs/rcs). En los resultados de RCS, `Parse-Background` y `Compile-Background` te dicen cuánto tiempo se pasó analizando y compilando JavaScript fuera del hilo principal, mientras que `Parse` y `Compile` capturan las métricas del hilo principal.

![](/_img/cost-of-javascript-2019/rcs.png)

## ¿Cuál es el impacto en el mundo real de estos cambios?

Veamos algunos ejemplos de sitios en el mundo real y cómo se aplica la transmisión de scripts.

![Tiempo del hilo principal frente al hilo trabajador dedicado al análisis y compilación del JS de Reddit en un MacBook Pro](/_img/cost-of-javascript-2019/reddit-main-thread.svg)

Reddit.com tiene varios paquetes de más de 100 kB que están envueltos en funciones externas causando mucha [compilación perezosa](/blog/preparser) en el hilo principal. En el gráfico anterior, el tiempo del hilo principal es todo lo que realmente importa porque mantener el hilo principal ocupado puede retrasar la interactividad. Reddit pasa la mayor parte del tiempo en el hilo principal con un uso mínimo del hilo trabajador/de fondo.

Sería beneficioso para ellos dividir algunos de sus paquetes más grandes en más pequeños (por ejemplo, 50 kB cada uno) sin los envoltorios para maximizar la paralelización, de modo que cada paquete pueda analizarse y compilarse en transmisión por separado y reducir el tiempo de análisis/compilación en el hilo principal durante el inicio.

![Tiempo del hilo principal frente al hilo trabajador dedicado al análisis y compilación del JS de Facebook en un MacBook Pro](/_img/cost-of-javascript-2019/facebook-main-thread.svg)

También podemos observar un sitio como Facebook.com. Facebook carga ~6 MB de JS comprimido a través de ~292 solicitudes, algunas de ellas asíncronas, algunas precargadas y otras recuperadas con menor prioridad. Muchos de sus scripts son muy pequeños y granulares, esto puede ayudar con la paralelización general en el hilo de fondo/trabajador, ya que estos scripts más pequeños pueden analizarse y compilarse en transmisión al mismo tiempo.

Vale la pena señalar que probablemente no seas Facebook y probablemente no tengas una aplicación de larga duración como Facebook o Gmail donde esta cantidad de scripts pueda justificarse en escritorio. Sin embargo, en general, mantén tus paquetes gruesos y carga solo lo necesario.

Aunque la mayor parte del trabajo de análisis y compilación de JavaScript puede realizarse de forma continua en un hilo de fondo, algo de trabajo aún debe realizarse en el hilo principal. Cuando el hilo principal está ocupado, la página no puede responder a la entrada del usuario. Mantén un ojo en el impacto que tanto la descarga como la ejecución de código tienen en tu experiencia de usuario.

:::note
**Nota:** Actualmente, no todos los motores de JavaScript y navegadores implementan la transmisión de scripts como una optimización de carga. Aun así, creemos que la orientación general aquí permite buenas experiencias para el usuario en general.
:::

## El costo de analizar JSON

Debido a que la gramática de JSON es mucho más simple que la de JavaScript, JSON puede analizarse de manera más eficiente que JavaScript. Este conocimiento se puede aplicar para mejorar el rendimiento de inicio de las aplicaciones web que envían grandes literales de objetos de configuración similares a JSON (como las tiendas Redux en línea). En lugar de incluir los datos como un literal de objeto JavaScript, como:

```js
const data = { foo: 42, bar: 1337 }; // 🐌
```

…puede representarse en forma de cadena JSON y luego analizarse en tiempo de ejecución:

```js
const data = JSON.parse(&apos;{"foo":42,"bar":1337}&apos;); // 🚀
```

Siempre que la cadena JSON solo se evalúe una vez, el enfoque de `JSON.parse` es [mucho más rápido](https://github.com/GoogleChromeLabs/json-parse-benchmark) en comparación con el literal de objeto JavaScript, especialmente para cargas iniciales. Una buena regla general es aplicar esta técnica para objetos de 10 kB o más, pero como siempre sucede con los consejos de rendimiento, mide el impacto real antes de realizar cambios.

![`JSON.parse(&apos;…&apos;)` es [mucho más rápido](https://github.com/GoogleChromeLabs/json-parse-benchmark) de analizar, compilar y ejecutar en comparación con un literal equivalente de JavaScript — no solo en V8 (1.7× más rápido), sino en todos los motores principales de JavaScript.](/_img/cost-of-javascript-2019/json.svg)

El siguiente video detalla más de dónde proviene la diferencia de rendimiento, comenzando en el minuto 02:10.

<figure>
  <div class="video video-16:9">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/ff4fgQxPaO0?start=130" allow="picture-in-picture" allowfullscreen loading="lazy"></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=ff4fgQxPaO0">“Aplicaciones más rápidas con <code>JSON.parse</code>”</a> como presentado por Mathias Bynens en #ChromeDevSummit 2019.</figcaption>
</figure>

Consulta [nuestro _JSON ⊂ ECMAScript_ explicador de características](/features/subsume-json#embedding-json-parse) para ver una implementación de ejemplo que, dado un objeto arbitrario, genera un programa válido de JavaScript que lo `JSON.parse`.

Existe un riesgo adicional al usar literales de objetos simples para grandes cantidades de datos: ¡podrían ser analizados _dos veces_!

1. El primer paso ocurre cuando el literal se preanaliza.
2. El segundo paso ocurre cuando el literal se analiza de forma diferida.

El primer paso no se puede evitar. Afortunadamente, el segundo paso se puede evitar colocando el literal del objeto en el nivel superior o dentro de un [PIFE](/blog/preparser#pife).

## ¿Qué pasa con el análisis/compilación en visitas repetidas?

La optimización de V8 para el almacenamiento en caché del (byte)código puede ayudar. Cuando se solicita un script por primera vez, Chrome lo descarga y se lo da a V8 para compilar. También almacena el archivo en la caché en disco del navegador. Cuando se solicita el archivo JS una segunda vez, Chrome toma el archivo de la caché del navegador y nuevamente se lo da a V8 para compilar. Esta vez, sin embargo, el código compilado se serializa y se adjunta al archivo de script en caché como metadatos.

![Visualización de cómo funciona el almacenamiento en caché del código en V8](/_img/cost-of-javascript-2019/code-caching.png)

La tercera vez, Chrome toma tanto el archivo como los metadatos del archivo desde la caché y entrega ambos a V8. V8 deserializa los metadatos y puede omitir la compilación. El almacenamiento en caché del código funciona si las dos primeras visitas ocurren dentro de 72 horas. Chrome también tiene un almacenamiento en caché de código anticipado si un service worker se usa para almacenar scripts en caché. Puedes leer más sobre el almacenamiento en caché del código en [almacenamiento en caché de código para desarrolladores web](/blog/code-caching-for-devs).

## Conclusiones

El tiempo de descarga y ejecución son los principales cuellos de botella para cargar scripts en 2019. Apunta a un paquete pequeño de scripts sincronizados (en línea) para el contenido visible en la parte superior de la página con uno o más scripts diferidos para el resto de la página. Divide tus grandes paquetes para enfocarte únicamente en enviar el código que el usuario necesita cuando lo necesita. Esto maximiza la paralelización en V8.

En dispositivos móviles, querrás enviar mucho menos script debido a la red, el consumo de memoria y el tiempo de ejecución para CPUs más lentos. Equilibra la latencia con la capacidad de almacenamiento en caché para maximizar la cantidad de trabajo de análisis y compilación que puede ocurrir fuera del hilo principal.

## Lecturas adicionales

- [Análisis increíblemente rápido, parte 1: optimizando el escáner](/blog/scanner)
- [Análisis increíblemente rápido, parte 2: análisis diferido](/blog/preparser)
