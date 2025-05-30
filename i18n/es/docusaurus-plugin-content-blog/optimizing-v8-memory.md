---
title: "Optimizando el consumo de memoria de V8"
author: "los Ingenieros de Saneamiento de Memoria de V8: Ulan Degenbaev, Michael Lippautz, Hannes Payer y Toon Verwaest"
avatars: 
  - "ulan-degenbaev"
  - "michael-lippautz"
  - "hannes-payer"
date: "2016-10-07 13:33:37"
tags: 
  - memoria
  - benchmarks
description: "El equipo de V8 analizó y redujo significativamente el consumo de memoria de varios sitios web que fueron identificados como representativos de los patrones modernos de desarrollo web."
---
El consumo de memoria es una dimensión importante en el espacio de compensación de rendimiento de las máquinas virtuales de JavaScript. En los últimos meses, el equipo de V8 analizó y redujo significativamente el consumo de memoria de varios sitios web identificados como representativos de los patrones modernos de desarrollo web. En esta publicación de blog presentamos las cargas de trabajo y las herramientas que utilizamos en nuestro análisis, describimos las optimizaciones de memoria en el recolector de basura y mostramos cómo reducimos la memoria consumida por el analizador y los compiladores de V8.

<!--truncate-->
## Benchmarks

Para perfilar V8 y descubrir optimizaciones que impacten a la mayor cantidad de usuarios, es crucial definir cargas de trabajo que sean reproducibles, significativas y que simulen escenarios comunes de uso del JavaScript en el mundo real. Una gran herramienta para esta tarea es [Telemetry](https://catapult.gsrc.io/telemetry), un marco de pruebas de rendimiento que ejecuta interacciones con sitios web guionadas en Chrome y registra todas las respuestas del servidor para permitir la reproducción predecible de estas interacciones en nuestro entorno de prueba. Seleccionamos un conjunto de sitios populares de noticias, redes sociales y medios de comunicación y definimos las siguientes interacciones comunes de usuario para ellos:

Una carga de trabajo para navegar sitios web de noticias y redes sociales:

1. Abrir un sitio web popular de noticias o redes sociales, por ejemplo, Hacker News.
1. Hacer clic en el primer enlace.
1. Esperar hasta que el nuevo sitio se cargue.
1. Desplazarse hacia abajo por algunas páginas.
1. Hacer clic en el botón de retroceso.
1. Hacer clic en el siguiente enlace en el sitio original y repetir los pasos 3-6 varias veces.

Una carga de trabajo para navegar en sitios de medios:

1. Abrir un elemento en un sitio web popular de medios, por ejemplo un video en YouTube.
1. Consumir ese elemento esperando unos segundos.
1. Hacer clic en el siguiente elemento y repetir los pasos 2–3 varias veces.

Una vez que se captura un flujo de trabajo, se puede reproducir tantas veces como sea necesario contra una versión de desarrollo de Chrome, por ejemplo, cada vez que haya una nueva versión de V8. Durante la reproducción, el uso de memoria de V8 se registra en intervalos de tiempo fijos para obtener un promedio significativo. Los benchmarks pueden encontrarse [aquí](https://cs.chromium.org/chromium/src/tools/perf/page_sets/system_health/browsing_stories.py?q=browsing+news&sq=package:chromium&dr=CS&l=11).

## Visualización de memoria

Uno de los principales desafíos al optimizar el rendimiento en general es obtener una imagen clara del estado interno de la VM para rastrear el progreso o sopesar posibles compensaciones. En términos de optimización del consumo de memoria, esto implica un seguimiento preciso del consumo de memoria de V8 durante la ejecución. Hay dos categorías de memoria que deben ser monitoreadas: memoria asignada al heap administrado de V8 y memoria asignada en el heap C++. La función **Estadísticas de Heap de V8** es un mecanismo utilizado por los desarrolladores que trabajan en los aspectos internos de V8 para obtener información detallada sobre ambos. Cuando se especifica la bandera `--trace-gc-object-stats` al ejecutar Chrome (54 o más reciente) o el comando `d8` en la línea de comandos, V8 vuelca estadísticas relacionadas con la memoria a la consola. Construimos una herramienta personalizada, [el visualizador de heap de V8](https://mlippautz.github.io/v8-heap-stats/), para visualizar esta salida. La herramienta muestra una vista basada en línea de tiempo tanto del heap administrado como del heap C++. También proporciona un desglose detallado del uso de memoria de ciertos tipos de datos internos y histogramas basados en tamaño para cada uno de esos tipos.

Un flujo de trabajo común durante nuestros esfuerzos de optimización implica seleccionar un tipo de instancia que ocupa una gran parte del heap en la vista de línea de tiempo, como se muestra en la Figura 1. Una vez que se selecciona un tipo de instancia, la herramienta muestra entonces una distribución de usos de este tipo. En este ejemplo seleccionamos la estructura interna de datos FixedArray de V8, que es un contenedor similar a un vector no tipado utilizado ampliamente en todo tipo de lugares dentro de la VM. La Figura 2 muestra una distribución típica de FixedArray, donde podemos ver que la mayoría de la memoria puede atribuirse a un escenario específico de uso de FixedArray. En este caso, FixedArrays se utilizan como el almacenamiento de respaldo para arreglos dispersos de JavaScript (lo que llamamos DICTIONARY\_ELEMENTS). Con esta información es posible volver al código real y verificar si esta distribución es efectivamente el comportamiento esperado o si existe una oportunidad de optimización. Usamos la herramienta para identificar ineficiencias en varios tipos internos.

![Figura 1: Vista de línea de tiempo del heap administrado y memoria fuera del heap](/_img/optimizing-v8-memory/timeline-view.png)

![Figura 2: Distribución del tipo de instancia](/_img/optimizing-v8-memory/distribution.png)

La Figura 3 muestra el consumo de memoria del heap de C++, que consiste principalmente en memoria de zona (regiones de memoria temporales utilizadas por V8 durante un breve período de tiempo; discutidas en más detalle a continuación). Dado que la memoria de zona se utiliza más extensivamente por el analizador y los compiladores de V8, los picos corresponden a eventos de análisis y compilación. Una ejecución bien comportada consiste solo en picos, lo que indica que la memoria se libera tan pronto como ya no se necesita. En contraste, los mesetas (es decir, períodos de tiempo más largos con mayor consumo de memoria) indican que hay margen para optimización.

![Figura 3: Memoria de zona](/_img/optimizing-v8-memory/zone-memory.png)

Los primeros adoptantes también pueden probar la integración con la [infraestructura de trazado de Chrome](https://www.chromium.org/developers/how-tos/trace-event-profiling-tool). Para ello, necesitas ejecutar la última versión de Chrome Canary con `--track-gc-object-stats` y [capturar un trazado](https://www.chromium.org/developers/how-tos/trace-event-profiling-tool/recording-tracing-runs#TOC-Capture-a-trace-on-Chrome-desktop) incluyendo la categoría `v8.gc_stats`. Los datos aparecerán bajo el evento `V8.GC_Object_Stats`.

## Reducción del tamaño del heap de JavaScript

Existe una compensación inherente entre el rendimiento de la recolección de basura, la latencia y el consumo de memoria. Por ejemplo, la latencia de la recolección de basura (que causa retardos visibles para el usuario) se puede reducir utilizando más memoria para evitar invocaciones frecuentes de recolección de basura. Para dispositivos móviles con poca memoria, es decir, dispositivos con menos de 512 MB de RAM, priorizar la latencia y el rendimiento sobre el consumo de memoria puede dar lugar a fallos por falta de memoria y pestañas suspendidas en Android.

Para equilibrar mejor las compensaciones adecuadas para estos dispositivos móviles de baja memoria, introdujimos un modo especial de reducción de memoria que ajusta varias heurísticas de recolección de basura para disminuir el uso de memoria del heap de JavaScript recolectado por la basura.

1. Al final de una recolección de basura completa, la estrategia de crecimiento del heap de V8 determina cuándo ocurrirá la siguiente recolección de basura basándose en la cantidad de objetos activos con cierto margen adicional. En el modo de reducción de memoria, V8 utiliza menos margen, lo que resulta en un menor uso de memoria debido a recolecciones de basura más frecuentes.
1. Además, esta estimación se trata como un límite estricto, forzando al trabajo de marcado incremental incompleto a finalizar durante la pausa principal de la recolección de basura. Normalmente, cuando no se está en modo de reducción de memoria, el trabajo de marcado incremental incompleto puede exceder arbitrariamente este límite y solo desencadenar la pausa principal de la recolección de basura cuando el marcado esté terminado.
1. La fragmentación de memoria se reduce aún más realizando una compactación de memoria más agresiva.

La Figura 4 muestra algunas de las mejoras en dispositivos de baja memoria desde Chrome 53. Más notablemente, el consumo promedio de memoria del heap de V8 en el benchmark móvil de New York Times se redujo en aproximadamente un 66%. En general, observamos una reducción del 50% del tamaño promedio del heap de V8 en este conjunto de benchmarks.

![Figura 4: Reducción de memoria del heap de V8 desde Chrome 53 en dispositivos de baja memoria](/_img/optimizing-v8-memory/heap-memory-reduction.png)

Otra optimización introducida recientemente no solo reduce la memoria en dispositivos de baja memoria, sino también en equipos móviles y de escritorio más potentes. Reducir el tamaño de la página del heap de V8 de 1 MB a 512 kB resulta en una huella de memoria más pequeña cuando no hay muchos objetos vivos presentes y menor fragmentación de memoria general hasta 2×. También permite que V8 realice más trabajo de compactación, ya que los bloques de trabajo más pequeños permiten realizar más trabajo en paralelo por los hilos de compactación de memoria.

## Reducción de memoria de zona

Además del heap de JavaScript, V8 utiliza memoria fuera del heap para operaciones internas de la máquina virtual (VM). La mayor parte de la memoria se asigna a través de áreas de memoria llamadas _zonas_. Las zonas son un tipo de asignador de memoria basado en regiones que permite asignaciones rápidas y desasignaciones masivas donde toda la memoria asignada a la zona se libera de una vez cuando la zona se destruye. Las zonas se utilizan en todo el analizador y los compiladores de V8.

Una de las principales mejoras en Chrome 55 proviene de reducir el consumo de memoria durante el análisis en segundo plano. El análisis en segundo plano permite a V8 analizar scripts mientras se carga una página. La herramienta de visualización de memoria nos ayudó a descubrir que el analizador en segundo plano mantendría toda una zona viva mucho después de que el código ya estuviera compilado. Al liberar inmediatamente la zona después de la compilación, redujimos significativamente la duración de las zonas, lo que resultó en un menor uso promedio y máximo de memoria.

Otra mejora resulta de un mejor empaquetado de campos en los nodos del _árbol de sintaxis abstracta_ generados por el analizador. Anteriormente confiábamos en el compilador de C++ para empaquetar campos juntos donde fuera posible. Por ejemplo, dos booleanos solo requieren dos bits y deberían estar ubicados dentro de una palabra o dentro de la fracción no utilizada de la palabra anterior. El compilador de C++ no siempre encuentra el empaquetado más comprimido, por lo que en su lugar empaquetamos bits manualmente. Esto no solo da como resultado un uso reducido de memoria pico, sino también un mejor rendimiento del analizador y el compilador.

La Figura 5 muestra las mejoras en la memoria pico de zona desde Chrome 54, que se redujeron en aproximadamente un 40% en promedio en los sitios web medidos.

![Figura 5: Reducción de memoria pico de zona de V8 desde Chrome 54 en escritorio](/_img/optimizing-v8-memory/peak-zone-memory-reduction.png)

En los próximos meses continuaremos trabajando en la reducción del uso de memoria de V8. Tenemos más optimizaciones de memoria de zona planeadas para el analizador y planeamos enfocarnos en dispositivos que van desde 512 MB a 1 GB de memoria.

**Actualización:** Todas las mejoras discutidas anteriormente reducen el consumo total de memoria de Chrome 55 en hasta un 35% en _dispositivos de baja memoria_ en comparación con Chrome 53. Otros segmentos de dispositivos solo se benefician de las mejoras de memoria de zona.
