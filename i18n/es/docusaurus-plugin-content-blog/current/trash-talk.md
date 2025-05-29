---
title: 'Hablar basura: el recolector de basura Orinoco'
author: 'Peter ‘el basurero’ Marshall ([@hooraybuffer](https://twitter.com/hooraybuffer))'
avatars:
  - 'peter-marshall'
date: 2019-01-03 17:45:34
tags:
  - internals
  - memoria
  - presentaciones
description: 'Orinoco, el recolector de basura de V8, evolucionó de una implementación secuencial que detenía completamente el mundo a un recolector mayormente paralelo y concurrente con retroceso incremental.'
tweet: '1080867305532416000'
---
En los últimos años, el recolector de basura (GC) de V8 ha cambiado mucho. El proyecto Orinoco ha transformado un recolector de basura secuencial que detenía completamente la ejecución en un recolector mayormente paralelo y concurrente con retroceso incremental.

<!--truncate-->
:::note
**Nota:** Si prefieres ver una presentación en lugar de leer artículos, ¡entonces disfruta del video a continuación! Si no, omite el video y sigue leyendo.
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/Scxz6jVS4Ls" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

Cualquier recolector de basura tiene algunas tareas esenciales que debe realizar periódicamente:

1. Identificar objetos vivos/muertos
1. Reciclar/reutilizar la memoria ocupada por objetos muertos
1. Compactar/desfragmentar memoria (opcional)

Estas tareas se pueden realizar en secuencia o entrelazarse arbitrariamente. Un enfoque directo es pausar la ejecución de JavaScript y realizar cada una de estas tareas en secuencia en el hilo principal. Esto puede causar problemas de latencia y saltos en el hilo principal, de los que hemos hablado en [publicaciones anteriores](/blog/jank-busters) [del blog](/blog/orinoco), así como una menor productividad del programa.

## Recolección de basura principal (Marcado y compactación completos)

El recolector de basura principal recoge basura de todo el montón.

![La recolección de basura principal ocurre en tres fases: marcado, barrido y compactación.](/_img/trash-talk/01.svg)

### Marcado

Determinar qué objetos se pueden recolectar es una parte esencial de la recolección de basura. Los recolectores de basura hacen esto utilizando la alcanzabilidad como un proxy para la 'vivacidad'. Esto significa que cualquier objeto actualmente alcanzable dentro del tiempo de ejecución debe mantenerse, y cualquier objeto inalcanzable puede recolectarse.

El marcado es el proceso mediante el cual se encuentran los objetos alcanzables. El GC comienza con un conjunto de punteros de objetos conocidos, llamado conjunto raíz. Esto incluye la pila de ejecución y el objeto global. Luego sigue cada puntero a un objeto de JavaScript y marca ese objeto como alcanzable. El GC sigue cada puntero en ese objeto y continúa este proceso de manera recursiva, hasta que se hayan encontrado y marcado todos los objetos alcanzables en el tiempo de ejecución.

### Barrido

El barrido es un proceso donde los huecos en la memoria dejados por los objetos muertos se agregan a una estructura de datos llamada lista libre. Una vez completado el marcado, el GC encuentra huecos contiguos dejados por objetos inalcanzables y los agrega a la lista libre correspondiente. Las listas libres están separadas por el tamaño del fragmento de memoria para una búsqueda rápida. En el futuro, cuando queramos asignar memoria, solo miramos la lista libre y encontramos un fragmento de memoria de tamaño apropiado.

### Compactación

El recolector de basura principal también decide evacuar/compactar algunas páginas, basado en una heurística de fragmentación. Puedes pensar en la compactación como una desfragmentación del disco duro en una vieja PC. Copiamos los objetos sobrevivientes a otras páginas que no están siendo compactadas actualmente (usando la lista libre para esa página). De esta manera, podemos utilizar los pequeños huecos dispersos dentro de la memoria que dejaron los objetos muertos.

Una posible debilidad de un recolector de basura que copia los objetos sobrevivientes es que cuando asignamos muchos objetos de larga vida, pagamos un alto costo para copiar estos objetos. Es por eso que decidimos compactar solo algunas páginas altamente fragmentadas y simplemente realizar el barrido en otras, lo que no copia los objetos sobrevivientes.

## Diseño generacional

El montón en V8 está dividido en diferentes regiones llamadas [generaciones](/blog/orinoco-parallel-scavenger). Hay una generación joven (dividida aún más en subgeneraciones ‘guardería’ e ‘intermedia’), y una generación vieja. Los objetos se asignan primero en la guardería. Si sobreviven al siguiente GC, permanecen en la generación joven pero se consideran ‘intermedios’. Si sobreviven a otro GC, se mueven a la generación vieja.

![El montón de V8 está dividido en generaciones. Los objetos se mueven a través de generaciones cuando sobreviven a un GC.](/_img/trash-talk/02.svg)

En la recolección de basura hay un término importante: “La Hipótesis Generacional”. Básicamente afirma que la mayoría de los objetos mueren jóvenes. En otras palabras, la mayoría de los objetos se asignan y luego casi de inmediato se vuelven inalcanzables, desde la perspectiva del GC. Esto no solo aplica a V8 o JavaScript, sino a la mayoría de lenguajes dinámicos.

El diseño de la disposición de montículo generacional de V8 está diseñado para aprovechar este hecho sobre la vida útil de los objetos. El GC es un GC compacto/móvil, lo que significa que copia objetos que sobreviven a la recolección de basura. Esto parece contraproducente: copiar objetos es costoso en el momento de la GC. Pero sabemos que solo un porcentaje muy pequeño de los objetos realmente sobrevive a una recolección de basura, según la hipótesis generacional. Al mover solo los objetos que sobreviven, cada otra asignación se convierte en basura ‘implícita’. Esto significa que solo pagamos un costo (por copiar) proporcional a la cantidad de objetos que sobreviven, no a la cantidad de asignaciones.

## GC Menor (Scavenger)

En V8 hay dos recolectores de basura. El [**GC Mayor (Mark-Compact)**](#major-gc) recoge basura de todo el montículo. El **GC Menor (Scavenger)** recoge basura en la generación joven. El GC mayor es efectivo recibiendo basura de todo el montículo, pero la hipótesis generacional nos dice que los objetos recién asignados tienen muchas probabilidades de necesitar recolección de basura.

En el Scavenger, que solo recoge dentro de la generación joven, los objetos que sobreviven siempre son evacuados a una nueva página. V8 utiliza un diseño de ‘semi-espacio’ para la generación joven. Esto significa que la mitad del espacio total siempre está vacío, para permitir este paso de evacuación. Durante un scavenge, esta área inicialmente vacía se llama ‘To-Space’. El área de la que copiamos se llama ‘From-Space’. En el peor de los casos, cada objeto podría sobrevivir al scavenge y necesitaríamos copiar cada objeto.

Para el proceso de scavenge, tenemos un conjunto adicional de raíces que son las referencias de viejo a nuevo. Estas son punteros en el espacio antiguo que se refieren a objetos en la generación joven. En lugar de trazar todo el gráfico del montículo para cada scavenge, usamos [write barriers](https://www.memorymanagement.org/glossary/w.html#term-write-barrier) para mantener una lista de referencias de viejo a nuevo. Junto con la pila y los globales, conocemos cada referencia a la generación joven, sin necesidad de rastrear la generación antigua completa.

El paso de evacuación mueve todos los objetos sobrevivientes a un fragmento contiguo de memoria (dentro de una página). Esto tiene la ventaja de eliminar completamente la fragmentación: los huecos dejados por objetos muertos. Luego intercambiamos los dos espacios, es decir, To-Space se convierte en From-Space y viceversa. Una vez finalizada la GC, las nuevas asignaciones ocurren en la próxima dirección libre de From-Space.

![El scavenger evacua objetos vivos a una página nueva.](/_img/trash-talk/03.svg)

Con esta estrategia únicamente, rápidamente nos quedamos sin espacio en la generación joven. Los objetos que sobreviven a una segunda GC se evacúan a la generación antigua, en lugar de To-Space.

El paso final del scavenge es actualizar los punteros que referencian los objetos originales, que se han movido. Cada objeto copiado deja una dirección de reenvío que se utiliza para actualizar el puntero original y apuntar a la nueva ubicación.

![El scavenger evacua objetos ‘intermedios’ a la generación antigua, y objetos ‘nursery’ a una página nueva.](/_img/trash-talk/04.svg)

En el scavenge, en realidad hacemos estos tres pasos—marcar, evacuar y actualizar punteros—todos intercalados, en lugar de en fases distintas.

## Orinoco

La mayoría de estos algoritmos y optimizaciones son comunes en la literatura sobre recolección de basura y se pueden encontrar en muchos lenguajes que recolectan basura. Pero la recolección de basura de última generación ha avanzado mucho. Una medida importante para medir el tiempo dedicado a la recolección de basura es la cantidad de tiempo que el hilo principal permanece pausado mientras se realiza la GC. Para los recolectores de basura tradicionales de ‘parar el mundo’, este tiempo puede acumularse realmente, y este tiempo dedicado a la GC afecta directamente la experiencia del usuario en forma de páginas interrumpidas y mala renderización y latencia.

<figure>
  <img src="/_img/v8-orinoco.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Logo de Orinoco, el recolector de basura de V8</figcaption>
</figure>

Orinoco es el nombre en clave del proyecto de GC para utilizar las últimas y mejores técnicas paralelas, incrementales y concurrentes de recolección de basura, con el fin de liberar el hilo principal. Hay algunos términos aquí que tienen un significado específico en el contexto de la GC, y vale la pena definirlos en detalle.

### Paralelo

Paralelo es donde el hilo principal y los hilos auxiliares hacen una cantidad de trabajo aproximadamente igual al mismo tiempo. Esto sigue siendo un enfoque de ‘parar el mundo’, pero el tiempo total de pausa ahora se divide entre el número de hilos participantes (más algo de sobrecarga para la sincronización). Esta es la más fácil de las tres técnicas. El montículo de JavaScript está pausado ya que no se está ejecutando JavaScript, por lo que cada hilo auxiliar solo necesita asegurarse de sincronizar el acceso a cualquier objeto que otro auxiliar también pueda querer acceder.

![El hilo principal y los hilos auxiliares trabajan en la misma tarea al mismo tiempo.](/_img/trash-talk/05.svg)

### Incremental

Incremental es donde el hilo principal realiza una pequeña cantidad de trabajo de manera intermitente. No hacemos un GC completo en una pausa incremental, solo una pequeña parte del trabajo total requerido para el GC. Esto es más difícil porque JavaScript se ejecuta entre cada segmento de trabajo incremental, lo que significa que el estado del montón ha cambiado, lo que podría invalidar el trabajo previo realizado de manera incremental. Como puedes ver en el diagrama, esto no reduce la cantidad de tiempo que se pasa en el hilo principal (de hecho, usualmente lo incrementa levemente), solo lo distribuye a lo largo del tiempo. Esta sigue siendo una buena técnica para resolver uno de nuestros problemas originales: la latencia del hilo principal. Al permitir que JavaScript se ejecute de manera intermitente, pero también continúe con las tareas de recolección de basura, la aplicación puede responder a la entrada del usuario y avanzar en la animación.

![Pequeños fragmentos de la tarea GC se intercalan en la ejecución del hilo principal.](/_img/trash-talk/06.svg)

### Concurrente

Concurrente es cuando el hilo principal ejecuta JavaScript constantemente y los hilos auxiliares realizan el trabajo de GC completamente en segundo plano. Esta es la más difícil de las tres técnicas: cualquier cosa en el montón de JavaScript puede cambiar en cualquier momento, invalidando el trabajo realizado previamente. Además de eso, ahora hay carreras de lectura/escritura que preocuparnos porque los hilos auxiliares y el hilo principal leen o modifican simultáneamente los mismos objetos. La ventaja aquí es que el hilo principal está totalmente libre para ejecutar JavaScript, aunque hay una ligera sobrecarga debido a cierta sincronización con los hilos auxiliares.

![Las tareas de GC ocurren completamente en segundo plano. El hilo principal está libre para ejecutar JavaScript.](/_img/trash-talk/07.svg)

## Estado del GC en V8

### Recolección

Hoy en día, V8 utiliza recolección paralela para distribuir el trabajo entre los hilos auxiliares durante el GC de la generación joven. Cada hilo recibe una cantidad de punteros que sigue, evacuando de manera eficiente cualquier objeto vivo en el Espacio-To. Las tareas de recolección tienen que sincronizarse mediante operaciones atómicas de lectura/escritura/comparación-e-intercambio al intentar evacuar un objeto; otra tarea de recolección podría haber encontrado el mismo objeto a través de un camino diferente y también tratar de moverlo. El ayudante que mueve el objeto con éxito va luego y actualiza el puntero. Deja un puntero de redirección para que otros trabajadores que alcanzan el objeto puedan actualizar otros punteros a medida que los encuentran. Para una asignación rápida sin sincronización de objetos sobrevivientes, las tareas de recolección usan buffers de asignación locales para cada hilo.

![La recolección paralela distribuye el trabajo de recolección entre múltiples hilos auxiliares y el hilo principal.](/_img/trash-talk/08.svg)

### GC Mayor

El GC Mayor en V8 comienza con el marcado concurrente. A medida que el montón se acerca a un límite dinámico calculado, se inician tareas de marcado concurrente. A cada ayudante se le asigna una cantidad de punteros para seguir, y marcan cada objeto que encuentran a medida que siguen todas las referencias de los objetos descubiertos. El marcado concurrente ocurre completamente en segundo plano mientras JavaScript se ejecuta en el hilo principal. Se utilizan barreras de escritura para realizar un seguimiento de las nuevas referencias entre objetos que JavaScript crea mientras los ayudantes están marcando de manera concurrente.

![El GC mayor utiliza marcado y barrido concurrentes, además de compactación y actualización de punteros paralelas.](/_img/trash-talk/09.svg)

Cuando el marcado concurrente finaliza o alcanzamos el límite de asignación dinámica, el hilo principal realiza un rápido paso de finalización de marcado. La pausa del hilo principal comienza durante esta fase. Esto representa el tiempo total de pausa del GC mayor. El hilo principal escanea las raíces una vez más para asegurarse de que todos los objetos vivos estén marcados y luego, junto con varios ayudantes, comienza la compactación paralela y la actualización de punteros. No todas las páginas en el espacio viejo son elegibles para la compactación — las que no lo sean serán barridas utilizando las listas libres mencionadas anteriormente. El hilo principal inicia tareas de barrido concurrentes durante la pausa. Estas se ejecutan de manera concurrente con las tareas de compactación paralela y con el propio hilo principal; pueden continuar incluso cuando JavaScript se está ejecutando en el hilo principal.

## GC en tiempo de inactividad

Los usuarios de JavaScript no tienen acceso directo al recolector de basura; está completamente definido por la implementación. Sin embargo, V8 proporciona un mecanismo para que el incorporador active la recolección de basura, aunque el propio programa JavaScript no pueda hacerlo. El GC puede publicar ‘Tareas de inactividad’, que son trabajos opcionales que eventualmente se desencadenarían de todos modos. Incorporadores como Chrome pueden tener alguna noción de tiempo libre o inactividad. Por ejemplo, en Chrome, a 60 cuadros por segundo, el navegador tiene aproximadamente 16,6 ms para renderizar cada cuadro de una animación. Si el trabajo de animación se completa temprano, Chrome puede elegir ejecutar algunas de estas tareas de inactividad que el GC ha creado en el tiempo libre antes del siguiente cuadro.

![El GC en tiempo de inactividad aprovecha el tiempo libre en el hilo principal para realizar proactivamente trabajos de GC.](/_img/trash-talk/10.svg)

Para más detalles, consulta [nuestra publicación detallada sobre el GC en tiempo de inactividad](https://queue.acm.org/detail.cfm?id=2977741).

## Conclusiones

El recolector de basura en V8 ha recorrido un largo camino desde su inicio. Añadir técnicas paralelas, incrementales y concurrentes al GC existente fue un esfuerzo de varios años, pero ha dado sus frutos, trasladando una gran parte del trabajo a tareas en segundo plano. Ha mejorado drásticamente los tiempos de pausa, la latencia y la carga de páginas, haciendo que la animación, el desplazamiento y la interacción del usuario sean mucho más fluidos. El [Scavenger paralelo](/blog/orinoco-parallel-scavenger) ha reducido el tiempo total de recolección de basura de la generación joven en el hilo principal en aproximadamente un 20%-50%, dependiendo de la carga de trabajo. [GC en tiempo de inactividad](/blog/free-garbage-collection) puede reducir la memoria del heap de JavaScript de Gmail en un 45% cuando está inactivo. El [marcado y barrido concurrentes](/blog/jank-busters) ha reducido los tiempos de pausa en juegos pesados de WebGL hasta en un 50%.

Pero el trabajo aquí no está terminado. Reducir los tiempos de pausa de recolección de basura sigue siendo importante para ofrecer la mejor experiencia a los usuarios en la web, y estamos explorando técnicas aún más avanzadas. Además, Blink (el motor de renderizado en Chrome) también tiene un recolector de basura (llamado Oilpan) y estamos trabajando para mejorar la [cooperación](https://dl.acm.org/citation.cfm?doid=3288538.3276521) entre los dos recolectores y para portar algunas de las nuevas técnicas de Orinoco a Oilpan.

La mayoría de los desarrolladores no necesitan pensar en el GC al desarrollar programas en JavaScript, pero entender algunos de los detalles internos puede ayudarte a reflexionar sobre el uso de la memoria y patrones de programación útiles. Por ejemplo, con la estructura generacional del heap de V8, los objetos de vida corta son en realidad muy económicos desde la perspectiva del recolector de basura, ya que solo pagamos por los objetos que sobreviven a la recolección. Este tipo de patrones funcionan bien para muchos lenguajes que utilizan recolección de basura, no solo JavaScript.
