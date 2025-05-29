---
title: &apos;Biblioteca Oilpan&apos;
author: &apos;Anton Bikineev, Omer Katz ([@omerktz](https://twitter.com/omerktz)), y Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz)), movedores de archivos eficientes y efectivos&apos;
avatars:
  - anton-bikineev
  - omer-katz
  - michael-lippautz
date: 2021-11-10
tags:
  - internals
  - memory
  - cppgc
description: &apos;V8 incluye Oilpan, una biblioteca de recolección de basura para alojar memoria administrada de C++.&apos;
tweet: &apos;1458406645181165574&apos;
---

Aunque el título de esta publicación puede sugerir una inmersión profunda en una colección de libros sobre cárter de aceite – lo cual, considerando las normas de construcción para cárteres, es un tema sorprendentemente literario –, en su lugar vamos a mirar un poco más de cerca a Oilpan, un recolector de basura de C++ que se aloja a través de V8 como biblioteca desde la versión V8 v9.4.

<!--truncate-->
Oilpan es un [recolector de basura basado en rastreo](https://es.wikipedia.org/wiki/Recolecci%C3%B3n_de_basura_por_trazado), lo que significa que determina los objetos vivos recorriendo un gráfico de objetos en una fase de marcado. Los objetos muertos son recuperados después en una fase de barrido, de la cual hemos [escrito en el pasado](https://v8.dev/blog/high-performance-cpp-gc). Ambos fases pueden ejecutarse intercaladas o paralelas al código de aplicación C++ actual. El manejo de referencias para objetos en el montón es preciso y conservador en la pila nativa. Esto significa que Oilpan sabe dónde están las referencias en el montón pero tiene que escanear la memoria suponiendo que las secuencias aleatorias de bits representan punteros para la pila. Oilpan también admite compactación (desfragmentación del montón) para ciertos objetos cuando se ejecuta la recolección de basura sin una pila nativa.

Entonces, ¿cuál es el objetivo de proporcionarlo como una biblioteca a través de V8?

Blink, habiendo sido bifurcado de WebKit, originalmente utilizaba conteo de referencias, un [paradigma bien conocido para el código C++](https://en.cppreference.com/w/cpp/memory/shared_ptr), para manejar su memoria en el montón. Se supone que el conteo de referencias soluciona problemas de manejo de memoria, pero es conocido por ser propenso a fugas de memoria debido a ciclos. Además de este problema inherente, Blink también sufría de problemas de [uso después de liberación](https://es.wikipedia.org/wiki/Puntero_colgante), ya que a veces el conteo de referencias era omitido por razones de rendimiento. Oilpan fue desarrollado inicialmente específicamente para Blink con el propósito de simplificar el modelo de programación y eliminar los problemas de fugas de memoria y de uso después de liberación. Creemos que Oilpan tuvo éxito en simplificar el modelo y también en hacer el código más seguro.

Otra razón quizá menos pronunciada para introducir Oilpan en Blink fue para ayudar a la integración con otros sistemas de recolección de basura como V8, lo cual finalmente se materializó en la implementación del [montón unificado para JavaScript y C++](https://v8.dev/blog/tracing-js-dom), donde Oilpan se encarga de procesar objetos de C++[^1]. Con más y más jerarquías de objetos administradas y una mejor integración con V8, Oilpan se volvió más complejo con el tiempo y el equipo se dio cuenta de que estaban reinventando los mismos conceptos que el recolector de basura de V8 y solucionando los mismos problemas. La integración en Blink requería construir alrededor de 30k objetivos para ejecutar un simple prueba de recolección de basura de hola mundo para el montón unificado.

A principios de 2020, empezamos un viaje para extraer Oilpan de Blink y encapsularlo en una biblioteca. Decidimos alojar el código en V8, reutilizar abstracciones donde fuera posible y hacer una limpieza primaveral en la interfaz de recolección de basura. Además de solucionar todos los problemas mencionados anteriormente, [una biblioteca](https://docs.google.com/document/d/1ylZ25WF82emOwmi_Pg-uU6BI1A-mIbX_MG9V87OFRD8/) también permitiría que otros proyectos usaran C++ con recolección de basura. Lanzamos la biblioteca en V8 v9.4 y lo habilitamos en Blink comenzando en Chromium M94.

## ¿Qué hay en la caja?

Similar al resto de V8, Oilpan ahora ofrece una [API estable](https://chromium.googlesource.com/v8/v8.git/+/HEAD/include/cppgc/) y los embebidos pueden confiar en las [convenciones regulares de V8](https://v8.dev/docs/api). Por ejemplo, esto significa que las APIs están debidamente documentadas (ver [GarbageCollected](https://chromium.googlesource.com/v8/v8.git/+/main/include/cppgc/garbage-collected.h#17)) y pasarán por un período de desuso en caso de que estén sujetas a ser eliminadas o modificadas.

El núcleo de Oilpan está disponible como un recolector de basura independiente de C++ en el espacio de nombres `cppgc`. La configuración también permite reutilizar una plataforma existente de V8 para crear un heap para objetos administrados de C++. Las colectas de basura pueden configurarse para ejecutarse automáticamente, integrándose en la infraestructura de tareas, o pueden activarse explícitamente, considerando también la pila nativa. La idea es permitir que los embebedores que solo quieren objetos administrados en C++ puedan evitar tratar con V8 en su totalidad; consulte este [programa hola mundo](https://chromium.googlesource.com/v8/v8.git/+/main/samples/cppgc/hello-world.cc) como ejemplo. Un embebedor con esta configuración es PDFium, que utiliza la versión independiente de Oilpan para [asegurar XFA](https://groups.google.com/a/chromium.org/g/chromium-dev/c/RAqBXZWsADo/m/9NH0uGqCAAAJ?utm_medium=email&utm_source=footer), lo que permite contenido PDF más dinámico.

Convenientemente, las pruebas para el núcleo de Oilpan usan esta configuración, lo que significa que toma solo unos segundos ejecutar y construir una prueba específica de colecta de basura. Hasta el momento, existen [>400 pruebas unitarias](https://source.chromium.org/chromium/chromium/src/+/main:v8/test/unittests/heap/cppgc/) de este tipo para el núcleo de Oilpan. La configuración también sirve como un laboratorio para experimentar y probar cosas nuevas, y puede usarse para validar suposiciones sobre el rendimiento bruto.

La biblioteca Oilpan también se encarga de procesar objetos C++ cuando se ejecuta con el heap unificado a través de V8, lo que permite una total interconexión de los gráficos de objetos C++ y JavaScript. Esta configuración se utiliza en Blink para gestionar la memoria C++ del DOM y más. Oilpan también expone un sistema de características que permite extender el núcleo del recolector de basura con tipos que tienen necesidades específicas para determinar la vivacidad. De esta manera, es posible que Blink proporcione sus propias bibliotecas de colección que incluso permiten construir mapas de efímeros al estilo JavaScript ([`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)) en C++. No recomendamos esto a todos, pero demuestra de qué es capaz este sistema en caso de que surja la necesidad de personalización.

## ¿Hacia dónde nos dirigimos?

La biblioteca Oilpan nos proporciona una base sólida que ahora podemos aprovechar para mejorar el rendimiento. Donde antes necesitábamos especificar funcionalidades específicas de colecta de basura en la API pública de V8 para interactuar con Oilpan, ahora podemos implementar directamente lo que necesitamos. Esto permite iteraciones rápidas y también tomar atajos y mejorar el rendimiento cuando sea posible.

También vemos potencial en proporcionar ciertos contenedores básicos directamente a través de Oilpan para evitar reinventar la rueda. Esto permitiría a otros embebedores beneficiarse de estructuras de datos que previamente fueron creadas específicamente para Blink.

Visualizando un futuro brillante para Oilpan, nos gustaría mencionar que las APIs existentes de [`EmbedderHeapTracer`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-embedder-heap.h;l=75) no serán mejoradas más y podrían quedar obsoletas en algún momento. Asumiendo que los embebedores que utilizan estas APIs ya implementaron su propio sistema de rastreo, migrar a Oilpan debería ser tan simple como simplemente asignar los objetos C++ en un [heap Oilpan recién creado](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-cppgc.h;l=91) que luego se adjunta a un Isolate de V8. La infraestructura existente para modelar referencias, como [`TracedReference`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-traced-handle.h;l=334) (para referencias hacia V8) y [campos internos](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-object.h;l=502) (para referencias salientes desde V8), es compatible con Oilpan.

¡Manténgase atento a más mejoras en la recolección de basura en el futuro!

¿Encontró problemas o tiene sugerencias? Háganoslo saber:

- [oilpan-dev@chromium.org](mailto:oilpan-dev@chromium.org)
- Monorail: [Blink>GarbageCollection](https://bugs.chromium.org/p/chromium/issues/entry?template=Defect+report+from+user&components=Blink%3EGarbageCollection) (Chromium), [Oilpan](https://bugs.chromium.org/p/v8/issues/entry?template=Defect+report+from+user&components=Oilpan) (V8)

[^1]: Encuentre más información sobre la recolección de basura entre componentes en el [artículo de investigación](https://research.google/pubs/pub48052/).
