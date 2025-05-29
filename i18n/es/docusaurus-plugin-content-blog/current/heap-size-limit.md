---
title: &apos;Un pequeño paso para Chrome, un gran salto para V8&apos;
author: &apos;guardianes del heap Ulan Degenbaev, Hannes Payer, Michael Lippautz, y el guerrero de DevTools Alexey Kozyatinskiy&apos;
avatars:
  - &apos;ulan-degenbaev&apos;
  - &apos;michael-lippautz&apos;
  - &apos;hannes-payer&apos;
date: 2017-02-09 13:33:37
tags:
  - memoria
description: &apos;V8 ha aumentado recientemente su límite máximo de tamaño de heap.&apos;
---
V8 tiene un límite máximo en el tamaño de su heap. Esto actúa como una salvaguarda contra aplicaciones con fugas de memoria. Cuando una aplicación alcanza este límite máximo, V8 realiza una serie de recolecciones de basura como último recurso. Si estas recolecciones no ayudan a liberar memoria, V8 detiene la ejecución y reporta un error de falta de memoria. Sin este límite, una aplicación con fugas de memoria podría consumir toda la memoria del sistema, afectando el rendimiento de otras aplicaciones.

<!--truncate-->
Irónicamente, este mecanismo de salvaguarda dificulta la investigación de fugas de memoria para los desarrolladores de JavaScript. La aplicación puede quedarse sin memoria antes de que el desarrollador logre inspeccionar el heap en DevTools. Además, el propio proceso de DevTools puede quedarse sin memoria porque utiliza una instancia ordinaria de V8. Por ejemplo, tomar una instantánea del heap de [esta demostración](https://ulan.github.io/misc/heap-snapshot-demo.html) aborta la ejecución debido a falta de memoria en la versión estable actual de Chrome.

Históricamente, el límite de heap de V8 se estableció convenientemente para ajustarse al rango de enteros de 32 bits con signo, con cierto margen. Con el tiempo, esta conveniencia llevó a un código descuidado en V8 que mezclaba tipos de diferentes anchos de bit, rompiendo efectivamente la capacidad de aumentar el límite. Recientemente, limpiamos el código del recolector de basura, habilitando el uso de tamaños de heap más grandes. DevTools ya hace uso de esta función, y tomar una instantánea del heap en la demostración mencionada anteriormente funciona como se espera en el último Chrome Canary.

También agregamos una función en DevTools para pausar la aplicación cuando está cerca de quedarse sin memoria. Esta función es útil para investigar errores que causan que la aplicación asigne mucha memoria en un corto período de tiempo. Al ejecutar [esta demostración](https://ulan.github.io/misc/oom.html) con el último Chrome Canary, DevTools pausa la aplicación antes del fallo por falta de memoria y aumenta el límite de heap, dando al usuario la oportunidad de inspeccionar el heap, evaluar expresiones en la consola para liberar memoria, y luego reanudar la ejecución para seguir depurando.

![](/_img/heap-size-limit/debugger.png)

Los integradores de V8 pueden aumentar el límite de heap utilizando la función [`set_max_old_generation_size_in_bytes`](https://codesearch.chromium.org/chromium/src/v8/include/v8-isolate.h?q=set_max_old_generation_size_in_bytes) de la API `ResourceConstraints`. Pero tenga cuidado, algunas fases del recolector de basura tienen una dependencia lineal del tamaño del heap. Las pausas de recolección de basura pueden aumentar con heaps más grandes.
