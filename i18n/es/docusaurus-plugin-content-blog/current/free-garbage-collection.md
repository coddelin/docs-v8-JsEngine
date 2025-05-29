---
title: &apos;Obteniendo recolección de basura gratis&apos;
author: &apos;Hannes Payer y Ross McIlroy, Recolectores de Basura Inactivos&apos;
avatars:
  - &apos;hannes-payer&apos;
  - &apos;ross-mcilroy&apos;
date: 2015-08-07 13:33:37
tags:
  - internals
  - memory
description: &apos;Chrome 41 oculta operaciones costosas de gestión de memoria dentro de pequeños fragmentos de tiempo inactivo y no utilizados, reduciendo los bloqueos.&apos;
---
El rendimiento de JavaScript sigue siendo uno de los aspectos clave de los valores de Chrome, especialmente cuando se trata de ofrecer una experiencia fluida. A partir de Chrome 41, V8 aprovecha una nueva técnica para aumentar la capacidad de respuesta de las aplicaciones web ocultando operaciones costosas de gestión de memoria dentro de pequeños fragmentos de tiempo inactivo y no utilizados. Como resultado, los desarrolladores web deberían esperar un desplazamiento más suave y animaciones fluidas con una reducción significativa de los bloqueos debido a la recolección de basura.

<!--truncate-->
Muchos motores de lenguaje modernos, como el motor de JavaScript V8 de Chrome, gestionan dinámicamente la memoria para las aplicaciones en ejecución para que los desarrolladores no tengan que preocuparse por ello. El motor pasa periódicamente por la memoria asignada a la aplicación, determina qué datos ya no son necesarios y los elimina para liberar espacio. Este proceso se conoce como [recolección de basura](https://es.wikipedia.org/wiki/Recolecci%C3%B3n_de_basura_(inform%C3%A1tica)).

En Chrome, nos esforzamos por ofrecer una experiencia visual fluida de 60 fotogramas por segundo (FPS). Aunque V8 ya intenta realizar recolección de basura en pequeños fragmentos, operaciones más grandes de recolección de basura pueden y ocurren en momentos impredecibles —a veces en medio de una animación— pausando la ejecución y evitando que Chrome alcance esa meta de 60 FPS.

Chrome 41 incluyó un [programador de tareas para el motor de renderizado Blink](https://blog.chromium.org/2015/04/scheduling-tasks-intelligently-for_30.html) que permite la priorización de tareas sensibles a la latencia para garantizar que Chrome se mantenga receptivo y ágil. Además de poder priorizar el trabajo, este programador de tareas tiene conocimiento centralizado sobre qué tan ocupado está el sistema, qué tareas necesitan realizarse y qué tan urgentes son cada una de estas tareas. Por lo tanto, puede estimar cuándo Chrome probablemente esté inactivo y aproximadamente cuánto tiempo espera seguir estando inactivo.

Un ejemplo de esto ocurre cuando Chrome muestra una animación en una página web. La animación actualizará la pantalla a 60 FPS, dando a Chrome unos 16.6 ms de tiempo para realizar la actualización. Como tal, Chrome comenzará a trabajar en el fotograma actual tan pronto como se haya mostrado el fotograma anterior, realizando tareas de entrada, animación y renderizado de fotogramas para este nuevo fotograma. Si Chrome completa todo este trabajo en menos de 16.6 ms, entonces no tiene nada más que hacer durante el tiempo restante hasta que necesite comenzar a renderizar el siguiente fotograma. El programador de Chrome permite que V8 aproveche este _periodo de tiempo inactivo_ programando tareas especiales _inactivas_ cuando Chrome de otro modo estaría inactivo.

![Figura 1: Renderización de fotogramas con tareas inactivas](/_img/free-garbage-collection/frame-rendering.png)

Las tareas inactivas son tareas especiales de baja prioridad que se ejecutan cuando el programador determina que está en un período inactivo. Las tareas inactivas tienen un plazo que es la estimación del programador de cuánto tiempo espera seguir estando inactivo. En el ejemplo de la animación de la Figura 1, esto sería el tiempo en que debería comenzar a dibujarse el siguiente fotograma. En otras situaciones (por ejemplo, cuando no hay actividad en pantalla) este podría ser el momento en que la siguiente tarea pendiente está programada para ejecutarse, con un límite superior de 50 ms para garantizar que Chrome siga siendo receptivo a entradas inesperadas del usuario. El plazo se utiliza por la tarea inactiva para estimar cuánto trabajo puede realizar sin causar bloqueos o demoras en la respuesta de entrada.

La recolección de basura realizada en las tareas inactivas está oculta a las operaciones críticas sensibles a la latencia. Esto significa que estas tareas de recolección de basura se realizan de manera “gratuita”. Para entender cómo V8 hace esto, vale la pena revisar la estrategia actual de recolección de basura de V8.

## Análisis profundo del motor de recolección de basura de V8

V8 utiliza un [recolector de basura generacional](http://www.memorymanagement.org/glossary/g.html#term-generational-garbage-collection) con el montón de JavaScript dividido en una pequeña generación joven para objetos recientemente asignados y una gran generación pasada para objetos de larga duración. [Dado que la mayoría de los objetos mueren jóvenes](http://www.memorymanagement.org/glossary/g.html#term-generational-hypothesis), esta estrategia generacional permite al recolector de basura realizar recolecciones de basura regulares y cortas en la generación joven más pequeña (conocidas como escaneo), sin tener que trazar objetos en la generación pasada.

La generación joven utiliza una estrategia de asignación de [semi-espacio](http://www.memorymanagement.org/glossary/s.html#semi.space), donde los nuevos objetos son inicialmente asignados en el semi-espacio activo de la generación joven. Una vez que ese semi-espacio se llena, una operación de recolección de basura (scavenge) mueve los objetos vivos al otro semi-espacio. Los objetos que ya han sido movidos una vez se promueven a la generación antigua y se consideran de larga duración. Una vez que los objetos vivos han sido movidos, el nuevo semi-espacio se convierte en activo y los objetos muertos restantes en el viejo semi-espacio se descartan.

Por lo tanto, la duración de una recolección en la generación joven depende del tamaño de los objetos vivos en dicha generación. Una recolección será rápida (&lt;1 ms) cuando la mayoría de los objetos se vuelvan inalcanzables en la generación joven. Sin embargo, si la mayoría de los objetos sobreviven a una recolección, la duración puede prolongarse significativamente.

Una recolección mayor de todo el heap se realiza cuando el tamaño de los objetos vivos en la generación antigua supera un límite derivado heurísticamente. La generación antigua utiliza un colector de [marcado y barrido](http://www.memorymanagement.org/glossary/m.html#term-mark-sweep) con varias optimizaciones para mejorar la latencia y el consumo de memoria. La latencia del marcado depende del número de objetos vivos que deben marcarse, y el marcado de todo el heap podría tomar más de 100 ms para aplicaciones web grandes. Para evitar pausar el hilo principal por períodos prolongados, V8 ha tenido durante mucho tiempo la capacidad de [marcar objetos vivos incrementalmente en muchos pequeños pasos](https://blog.chromium.org/2011/11/game-changer-for-interactive.html), con el objetivo de mantener cada paso de marcado por debajo de los 5 ms de duración.

Después del marcado, la memoria libre se pone nuevamente a disposición de la aplicación barriendo toda la memoria de la generación antigua. Esta tarea es realizada simultáneamente por hilos dedicados de barrido. Finalmente, se realiza una compactación de memoria para reducir la fragmentación en la generación antigua. Esta tarea puede ser muy intensiva en tiempo y solo se realiza si la fragmentación de memoria es un problema.

En resumen, hay cuatro tareas principales de recolección de basura:

1. Recolecciones de la generación joven, que usualmente son rápidas
2. Pasos de marcado realizados por el marcador incremental, que pueden ser arbitrariamente largos dependiendo del tamaño del paso
3. Recolecciones completas de basura, que pueden tomar mucho tiempo
4. Recolecciones completas de basura con compactación de memoria agresiva, que pueden tomar mucho tiempo, pero limpian la memoria fragmentada

Para realizar estas operaciones en los periodos de inactividad, V8 publica tareas de recolección de basura en el programador de tareas. Cuando estas se ejecutan, se les asigna un plazo límite para completarlas. El manejador de tiempo de inactividad de recolección de basura de V8 evalúa qué tareas de recolección deben realizarse para reducir el consumo de memoria, respetando el plazo para evitar interrupciones futuras en el renderizado de cuadros o la latencia de entrada.

El recolector de basura realizará una recolección de la generación joven durante un periodo de inactividad si la tasa de asignación de la aplicación medida muestra que la generación joven podría llenarse antes del próximo periodo de inactividad esperado. Además, calcula el tiempo promedio tomado por tareas recientes de recolección para predecir la duración de futuras recolecciones y asegurarse de que no viola los plazos de las tareas de inactividad.

Cuando el tamaño de los objetos vivos en la generación antigua está cerca del límite del heap, se inicia el marcado incremental. Los pasos de marcado incremental pueden escalarse linealmente por el número de bytes que deben marcarse. Basándose en la velocidad promedio de marcado medida, el manejador de tiempo de inactividad de recolección de basura intenta incluir la mayor cantidad posible de trabajo de marcado en una tarea de inactividad dada.

Se programa una recolección completa de basura durante una tarea de inactividad si la generación antigua está casi llena y si se estima que el plazo dado para la tarea es lo suficientemente largo para completar la recolección. El tiempo de pausa de la recolección se predice basándose en la velocidad de marcado multiplicada por la cantidad de objetos asignados. Las recolecciones completas de basura con compactación adicional solo se realizan si la página web ha estado inactiva durante un tiempo significativo.

## Evaluación del rendimiento

Para evaluar el impacto de realizar la recolección de basura durante los periodos de inactividad, utilizamos el [marco de referencia de rendimiento Telemetry de Chrome](https://www.chromium.org/developers/telemetry) para evaluar qué tan suavemente se desplazan sitios web populares mientras se cargan. Realizamos pruebas de rendimiento en los [25 principales sitios](https://code.google.com/p/chromium/codesearch#chromium/src/tools/perf/benchmarks/smoothness.py&l=15) en una estación de trabajo con Linux, así como en [sitios móviles típicos](https://code.google.com/p/chromium/codesearch#chromium/src/tools/perf/benchmarks/smoothness.py&l=104) en un smartphone Android Nexus 6, ambos abriendo páginas web populares (incluyendo aplicaciones web complejas como Gmail, Google Docs y YouTube) y desplazando su contenido durante unos segundos. Chrome apunta a mantener un desplazamiento a 60 FPS para una experiencia de usuario fluida.

La Figura 2 muestra el porcentaje de recolección de basura que se programó durante los períodos de inactividad. El hardware más rápido de la estación de trabajo resulta en más tiempo de inactividad general en comparación con el Nexus 6, lo que permite programar un mayor porcentaje de recolección de basura durante este tiempo de inactividad (43% en comparación con 31% en el Nexus 6), lo que resulta en una mejora de aproximadamente el 7% en nuestra [métrica de lag](https://www.chromium.org/developers/design-documents/rendering-benchmarks).

![Figura 2: El porcentaje de recolección de basura que ocurre durante el tiempo inactivo](/_img/free-garbage-collection/idle-time-gc.png)

Además de mejorar la fluidez de la renderización de la página, estos períodos de inactividad también ofrecen una oportunidad para realizar una recolección de basura más agresiva cuando la página queda completamente inactiva. Las mejoras recientes en Chrome 45 aprovechan esto para reducir drásticamente la cantidad de memoria consumida por las pestañas en primer plano inactivas. La Figura 3 muestra un adelanto de cómo el uso de memoria del montículo de JavaScript de Gmail puede reducirse aproximadamente un 45% cuando queda inactivo, en comparación con la misma página en Chrome 43.

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/ij-AFUfqFdI" width="640" height="360" loading="lazy"></iframe>
  </div>
  <figcaption>Figura 3: Uso de memoria de Gmail en la última versión de Chrome 45 (izquierda) vs. Chrome 43</figcaption>
</figure>

Estas mejoras demuestran que es posible ocultar las pausas de recolección de basura siendo más inteligentes sobre cuándo se realizan operaciones costosas de recolección de basura. Los desarrolladores web ya no tienen que temer las pausas de recolección de basura, incluso cuando están dirigidos a animaciones ultra suaves de 60 FPS. Manténganse atentos para más mejoras mientras seguimos ampliando los límites de la programación de la recolección de basura.
