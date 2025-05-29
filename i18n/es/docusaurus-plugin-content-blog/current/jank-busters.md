---
title: &apos;Caza Jank Parte Uno&apos;
author: &apos;los cazadores de jank: Jochen Eisinger, Michael Lippautz, y Hannes Payer&apos;
avatars:
  - &apos;michael-lippautz&apos;
  - &apos;hannes-payer&apos;
date: 2015-10-30 13:33:37
tags:
  - memoria
description: &apos;Este artículo trata sobre optimizaciones implementadas entre Chrome 41 y Chrome 46 que reducen significativamente las pausas de la recolección de basura, resultando en una mejor experiencia para el usuario.&apos;
---
El jank, o en otras palabras los tartamudeos visibles, puede notarse cuando Chrome no logra renderizar un cuadro dentro de 16.66 ms (interrumpiendo el movimiento de 60 cuadros por segundo). Hasta hoy, la mayoría del trabajo de recolección de basura de V8 se realiza en el hilo principal de renderización, véase la Figura 1, a menudo resultando en jank cuando hay demasiados objetos que necesitan ser mantenidos. Eliminar el jank siempre ha sido una alta prioridad para el equipo de V8 ([1](https://blog.chromium.org/2011/11/game-changer-for-interactive.html), [2](https://www.youtube.com/watch?v=3vPOlGRH6zk), [3](/blog/free-garbage-collection)). Este artículo discute algunas optimizaciones que se implementaron entre Chrome 41 y Chrome 46 que reducen significativamente las pausas de recolección de basura, resultando en una mejor experiencia de usuario.

<!--truncate-->
![Figura 1: Recolección de basura realizada en el hilo principal](/_img/jank-busters/gc-main-thread.png)

Una fuente importante de jank durante la recolección de basura es el procesamiento de varias estructuras de datos de contabilidad. Muchas de estas estructuras de datos habilitan optimizaciones que no están relacionadas con la recolección de basura. Dos ejemplos son la lista de todos los ArrayBuffers, y la lista de vistas de cada ArrayBuffer. Estas listas permiten una implementación eficiente de la operación DetachArrayBuffer sin imponer un impacto en el rendimiento al acceder a una vista de ArrayBuffer. Sin embargo, en situaciones donde una página web crea millones de ArrayBuffers (por ejemplo, en juegos basados en WebGL), actualizar esas listas durante la recolección de basura causa jank significativo. En Chrome 46, eliminamos estas listas y en su lugar detectamos buffers desconectados insertando comprobaciones antes de cada carga y almacenamiento en ArrayBuffers. Esto amortigua el costo de recorrer la gran lista de contabilidad durante la GC al distribuirlo a lo largo de la ejecución del programa, resultando en menos jank. Aunque las comprobaciones por acceso pueden teóricamente ralentizar el rendimiento de programas que usan intensamente los ArrayBuffers, en la práctica, el compilador optimizador de V8 puede a menudo eliminar comprobaciones redundantes y sacar comprobaciones restantes fuera de los ciclos, resultando en un perfil de ejecución mucho más fluido con poca o ninguna penalización de rendimiento general.

Otra fuente de jank es la contabilidad asociada con el seguimiento de los tiempos de vida de los objetos compartidos entre Chrome y V8. Aunque los montones de memoria de Chrome y V8 son distintos, deben sincronizarse para ciertos objetos, como los nodos DOM, que están implementados en el código C++ de Chrome pero son accesibles desde JavaScript. V8 crea un tipo de dato opaco llamado handle que permite a Chrome manipular un objeto del montón de V8 sin conocer ningún detalle de su implementación. La vida útil del objeto está ligada al handle: mientras Chrome mantenga el handle, el recolector de basura de V8 no desechará el objeto. V8 crea una estructura de datos interna llamada referencia global para cada handle que devuelve a Chrome a través de la API de V8, y estas referencias globales son las que indican al recolector de basura de V8 que el objeto sigue vivo. Para los juegos de WebGL, Chrome puede crear millones de esos handles, y V8, a su vez, necesita crear las referencias globales correspondientes para gestionar su ciclo de vida. Procesar estas enormes cantidades de referencias globales en la pausa principal de recolección de basura es observable como jank. Afortunadamente, los objetos comunicados a WebGL a menudo simplemente se pasan sin modificarse realmente, permitiendo un análisis estático simple de [escape](https://es.wikipedia.org/wiki/An%C3%A1lisis_de_escape). En esencia, para funciones de WebGL que se sabe que usualmente toman matrices pequeñas como parámetros, los datos subyacentes se copian en la pila, haciendo obsoleta una referencia global. El resultado de tal enfoque mixto es una reducción del tiempo de pausa de hasta un 50% para juegos de WebGL intensos en renderización.

La mayor parte de la recolección de basura de V8 se realiza en el hilo principal de renderización. Mover las operaciones de recolección de basura a hilos concurrentes reduce el tiempo de espera para el recolector de basura y reduce aún más el jank. Esta es una tarea intrínsecamente complicada, ya que la aplicación principal de JavaScript y el recolector de basura pueden observar y modificar simultáneamente los mismos objetos. Hasta ahora, la concurrencia estaba limitada al barrido de la generación vieja del montón regular de objetos JS. Recientemente, también implementamos un barrido concurrente del espacio de código y mapas del montón de V8. Además, implementamos el desmapeo concurrente de páginas no utilizadas para reducir el trabajo que debe realizarse en el hilo principal, véase la Figura 2.

![Figura 2: Algunas operaciones de recolección de basura realizadas en los hilos de recolección de basura concurrentes.](/_img/jank-busters/gc-concurrent-threads.png)

El impacto de las optimizaciones discutidas es claramente visible en los juegos basados en WebGL, por ejemplo, [la demostración Oort Online de Turbolenz](http://oortonline.gl/). El siguiente video compara Chrome 41 con Chrome 46:

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/PgrCJpbTs9I" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

Actualmente estamos en el proceso de hacer que más componentes de recolección de basura sean incrementales, concurrentes y paralelos, para reducir aún más los tiempos de pausa de la recolección de basura en el hilo principal. Manténganse al tanto, ya que tenemos algunos parches interesantes en preparación.
