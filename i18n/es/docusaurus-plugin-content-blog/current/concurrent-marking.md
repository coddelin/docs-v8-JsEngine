---
title: 'Marcado concurrente en V8'
author: 'Ulan Degenbaev, Michael Lippautz y Hannes Payer — liberadores del hilo principal'
avatars:
  - 'ulan-degenbaev'
  - 'michael-lippautz'
  - 'hannes-payer'
date: 2018-06-11 13:33:37
tags:
  - internals
  - memory
description: 'Este artículo describe la técnica de recolección de basura llamada marcado concurrente.'
tweet: '1006187194808233985'
---
Este artículo describe la técnica de recolección de basura llamada _marcado concurrente_. La optimización permite que una aplicación de JavaScript continúe ejecutándose mientras el recolector de basura escanea el montón para encontrar y marcar objetos vivos. Nuestros benchmarks muestran que el marcado concurrente reduce el tiempo dedicado al marcado en el hilo principal en un 60%–70%. El marcado concurrente es la última pieza del proyecto [Orinoco](/blog/orinoco) — el proyecto para reemplazar incrementalmente el antiguo recolector de basura con el nuevo recolector de basura mayormente concurrente y paralelo. El marcado concurrente está habilitado por defecto en Chrome 64 y Node.js v10.

<!--truncate-->
## Antecedentes

El marcado es una fase del recolector de basura [Mark-Compact](https://en.wikipedia.org/wiki/Tracing_garbage_collection) de V8. Durante esta fase, el recolector descubre y marca todos los objetos vivos. El marcado comienza desde el conjunto de objetos vivos conocidos como el objeto global y las funciones actualmente activas, los llamados _roots_. El recolector marca los _roots_ como vivos y sigue los punteros en ellos para descubrir más objetos vivos. El recolector continúa marcando los objetos recién descubiertos y siguiendo punteros hasta que no haya más objetos por marcar. Al final del marcado, todos los objetos no marcados en el montón son inalcanzables desde la aplicación y pueden ser recuperados de manera segura.

Podemos pensar en el marcado como un [recorrido de grafo](https://en.wikipedia.org/wiki/Graph_traversal). Los objetos en el montón son nodos del grafo. Los punteros de un objeto a otro son los bordes del grafo. Dado un nodo en el grafo, podemos encontrar todos los bordes salientes de ese nodo utilizando la [clase oculta](/blog/fast-properties) del objeto.

![Figura 1. Grafo de objetos](/_img/concurrent-marking/00.svg)

V8 implementa el marcado utilizando dos bits de marca por objeto y una lista de trabajo de marcado. Los dos bits de marca codifican tres colores: blanco (`00`), gris (`10`) y negro (`11`). Inicialmente, todos los objetos son blancos, lo que significa que el recolector aún no los ha descubierto. Un objeto blanco se convierte en gris cuando el recolector lo descubre y lo empuja a la lista de trabajo de marcado. Un objeto gris se convierte en negro cuando el recolector lo saca de la lista de trabajo de marcado y visita todos sus campos. Este esquema se llama marcado de tres colores. El marcado termina cuando no hay más objetos grises. Todos los objetos blancos restantes son inalcanzables y pueden ser recuperados de manera segura.

![Figura 2. El marcado comienza desde los _roots_](/_img/concurrent-marking/01.svg)

![Figura 3. El recolector convierte un objeto gris en negro procesando sus punteros](/_img/concurrent-marking/02.svg)

![Figura 4. El estado final después de que el marcado ha terminado](/_img/concurrent-marking/03.svg)

Cabe mencionar que el algoritmo de marcado descrito anteriormente funciona únicamente si la aplicación está pausada mientras el marcado está en progreso. Si permitimos que la aplicación se ejecute durante el marcado, entonces la aplicación puede cambiar el grafo y eventualmente engañar al recolector para que libere objetos vivos.

## Reduciendo las pausas de marcado

El marcado realizado de una sola vez puede tomar varios cientos de milisegundos en montones grandes.

![](/_img/concurrent-marking/04.svg)

Pausas tan largas pueden hacer que las aplicaciones no respondan y resulten en una mala experiencia de usuario. En 2011, V8 cambió del marcado de parada total al marcado incremental. Durante el marcado incremental, el recolector de basura divide el trabajo de marcado en fragmentos más pequeños y permite que la aplicación se ejecute entre los fragmentos:

![](/_img/concurrent-marking/05.svg)

El recolector de basura elige cuánto trabajo de marcado incremental realizar en cada fragmento para igualar la tasa de asignaciones de la aplicación. En casos comunes, esto mejora significativamente la capacidad de respuesta de la aplicación. En montones grandes bajo presión de memoria, todavía pueden ocurrir pausas largas mientras el recolector intenta mantenerse al día con las asignaciones.

El marcado incremental no es gratuito. La aplicación tiene que notificar al recolector de basura sobre todas las operaciones que cambian el grafo de objetos. V8 implementa la notificación utilizando una barrera de escritura al estilo Dijkstra. Después de cada operación de escritura de la forma `object.field = value` en JavaScript, V8 inserta el código de la barrera de escritura:

```cpp
// Llamado después de `object.field = value`.
write_barrier(object, field_offset, value) {
  if (color(object) == black && color(value) == white) {
    set_color(value, grey);
    marking_worklist.push(value);
  }
}
```

La barrera de escritura garantiza el invariante de que ningún objeto negro apunta a un objeto blanco. Esto también se conoce como el invariante fuerte de tres colores y asegura que la aplicación no pueda ocultar un objeto vivo del recolector de basura, de modo que todos los objetos blancos al final del marcado estén verdaderamente fuera de alcance para la aplicación y puedan ser liberados de manera segura.

El marcado incremental se integra perfectamente con la programación de recolección de basura en tiempos de inactividad, como se describe en una [entrada de blog anterior](/blog/free-garbage-collection). El programador de tareas de Blink de Chrome puede programar pequeños pasos de marcado incremental durante el tiempo de inactividad en el hilo principal sin causar interrupciones. Esta optimización funciona muy bien si hay tiempo de inactividad disponible.

Debido al costo de la barrera de escritura, el marcado incremental puede reducir el rendimiento de la aplicación. Es posible mejorar tanto el rendimiento como los tiempos de pausa al aprovechar hilos de trabajo adicionales. Hay dos maneras de realizar el marcado en hilos de trabajo: marcado paralelo y marcado concurrente.

El marcado **paralelo** ocurre en el hilo principal y en los hilos de trabajo. La aplicación está pausada durante toda la fase de marcado paralelo. Es la versión multihilo del marcado de parada global.

![](/_img/concurrent-marking/06.svg)

El marcado **concurrente** ocurre principalmente en los hilos de trabajo. La aplicación puede continuar ejecutándose mientras el marcado concurrente está en progreso.

![](/_img/concurrent-marking/07.svg)

Las dos secciones siguientes describen cómo añadimos soporte para el marcado paralelo y concurrente en V8.

## Marcado paralelo

Durante el marcado paralelo podemos asumir que la aplicación no se está ejecutando concurrentemente. Esto simplifica sustancialmente la implementación porque podemos asumir que el grafo de objetos es estático y no cambia. Para marcar el grafo de objetos en paralelo, necesitamos hacer las estructuras de datos del recolector de basura seguras para hilos y encontrar una manera de compartir eficientemente el trabajo de marcado entre hilos. El siguiente diagrama muestra las estructuras de datos involucradas en el marcado paralelo. Las flechas indican la dirección del flujo de datos. Para simplificar, el diagrama omite las estructuras de datos necesarias para la desfragmentación del montón.

![Figura 5. Estructuras de datos para el marcado paralelo](/_img/concurrent-marking/08.svg)

Tenga en cuenta que los hilos solo leen del grafo de objetos y nunca lo cambian. Los bits de marca de los objetos y la lista de trabajo de marcado deben soportar accesos de lectura y escritura.

## Lista de trabajo de marcado y robo de trabajo

La implementación de la lista de trabajo de marcado es crítica para el rendimiento y equilibra un rendimiento rápido en hilo local con la cantidad de trabajo que se puede distribuir a otros hilos en caso de que se queden sin trabajo por hacer.

Los extremos en ese espacio de compromisos son (a) usar una estructura de datos completamente concurrente para mejor compartición ya que todos los objetos pueden potencialmente ser compartidos y (b) usar una estructura de datos completamente local al hilo donde no se puedan compartir objetos, optimizando para el rendimiento en hilo local. La Figura 6 muestra cómo V8 equilibra estas necesidades utilizando una lista de trabajo de marcado basada en segmentos para inserción y eliminación en hilo local. Una vez que un segmento se llena, se publica en un grupo global compartido donde está disponible para ser robado. De esta manera, V8 permite que los hilos de marcado operen localmente sin ninguna sincronización mientras sea posible y aún maneja los casos donde un único hilo alcanza un nuevo subgrafo de objetos mientras otro hilo se queda sin trabajo al vaciar completamente sus segmentos locales.

![Figura 6. Lista de trabajo de marcado](/_img/concurrent-marking/09.svg)

## Marcado concurrente

El marcado concurrente permite que JavaScript se ejecute en el hilo principal mientras los hilos de trabajo visitan objetos en el montón. Esto abre la puerta a muchas posibles condiciones de carrera. Por ejemplo, JavaScript puede estar escribiendo en un campo de un objeto al mismo tiempo que un hilo de trabajo está leyendo el campo. Las condiciones de carrera pueden confundir al recolector de basura para liberar un objeto vivo o mezclar valores primitivos con punteros.

Cada operación en el hilo principal que cambia el grafo de objetos es una fuente potencial de una condición de carrera. Dado que V8 es un motor de alto rendimiento con muchas optimizaciones de diseño de objetos, la lista de posibles fuentes de condiciones de carrera es bastante extensa. Aquí hay un desglose de alto nivel:

- Asignación de objetos.
- Escritura en un campo de un objeto.
- Cambios en el diseño de objetos.
- Deserialización desde el snapshot.
- Materialización durante la desoptimización de una función.
- Evacuación durante la recolección de basura de la generación joven.
- Parcheo de código.

El hilo principal necesita sincronizarse con los hilos de trabajo en estas operaciones. El costo y la complejidad de la sincronización dependen de la operación. La mayoría de las operaciones permiten una sincronización ligera con accesos atómicos a la memoria, pero unas pocas operaciones requieren acceso exclusivo al objeto. En las siguientes subsecciones destacamos algunos de los casos interesantes.

### Barrera de escritura

La condición de carrera causada por una escritura en un campo de un objeto se resuelve convirtiendo la operación de escritura en una [escritura atómica relajada](https://en.cppreference.com/w/cpp/atomic/memory_order#Relaxed_ordering) y ajustando la barrera de escritura:

```cpp
// Llamado después de atomic_relaxed_write(&object.field, value);
write_barrier(object, field_offset, value) {
  if (color(value) == white && atomic_color_transition(value, white, grey)) {
    marking_worklist.push(value);
  }
}
```

Compáralo con la barrera de escritura utilizada anteriormente:

```cpp
// Llamado después de `object.field = value`.
write_barrier(object, field_offset, value) {
  if (color(object) == black && color(value) == white) {
    set_color(value, grey);
    marking_worklist.push(value);
  }
}
```

Hay dos cambios:

1. La verificación de color del objeto fuente (`color(object) == black`) ha desaparecido.
2. La transición de color del `value` de blanco a gris ocurre de manera atómica.

Sin la verificación de color del objeto fuente, la barrera de escritura se vuelve más conservadora, es decir, puede marcar los objetos como vivos incluso si esos objetos no son realmente alcanzables. Eliminamos la verificación para evitar una barrera de memoria costosa que sería necesaria entre la operación de escritura y la barrera de escritura:

```cpp
atomic_relaxed_write(&object.field, value);
memory_fence();
write_barrier(object, field_offset, value);
```

Sin la barrera de memoria, la operación de carga de color del objeto puede reordenarse antes de la operación de escritura. Si no evitamos el reordenamiento, entonces la barrera de escritura puede observar que el objeto es gris y detenerse, mientras que un hilo de trabajo marca el objeto sin ver el nuevo valor. La barrera de escritura original propuesta por Dijkstra y otros tampoco verifica el color del objeto. Lo hicieron por simplicidad, pero nosotros lo necesitamos por corrección.

### Lista de trabajo de desalojo

Algunas operaciones, por ejemplo parcheo de código, requieren acceso exclusivo al objeto. Desde temprano, decidimos evitar los bloqueos por objeto porque pueden llevar al problema de inversión de prioridad, donde el hilo principal tiene que esperar a un hilo de trabajo que se desprograma mientras mantiene bloqueado un objeto. En lugar de bloquear un objeto, permitimos que el hilo de trabajo abandone la visita al objeto. El hilo de trabajo hace eso al poner el objeto en la lista de trabajo de desalojo, la cual es procesada únicamente por el hilo principal:

![Figura 7. La lista de trabajo de desalojo](/_img/concurrent-marking/10.svg)

Los hilos de trabajo abandonan los objetos de código optimizado, las clases ocultas y las colecciones débiles porque visitarlos requeriría bloqueo o un protocolo de sincronización costoso.

En retrospectiva, la lista de trabajo de desalojo resultó ser excelente para un desarrollo incremental. Comenzamos la implementación con los hilos de trabajo abandonando todos los tipos de objetos y añadimos concurrencia uno por uno.

### Cambios en el diseño de objetos

Un campo de un objeto puede almacenar tres tipos de valores: un puntero etiquetado, un entero pequeño etiquetado (también conocido como Smi), o un valor no etiquetado como un número de punto flotante no empaquetado. [El etiquetado de punteros](https://en.wikipedia.org/wiki/Tagged_pointer) es una técnica reconocida que permite una representación eficiente de enteros no empaquetados. En V8, el bit menos significativo de un valor etiquetado indica si es un puntero o un entero. Esto se basa en el hecho de que los punteros están alineados por palabra. La información sobre si un campo está etiquetado o no se almacena en la clase oculta del objeto.

Algunas operaciones en V8 cambian un campo del objeto de etiquetado a no etiquetado (o viceversa) al hacer que el objeto pase a otra clase oculta. Tal cambio en el diseño del objeto no es seguro para el marcado concurrente. Si el cambio sucede mientras un hilo de trabajo está visitando el objeto concurrentemente usando la vieja clase oculta, entonces dos tipos de errores son posibles. Primero, el hilo puede perder un puntero pensando que es un valor no etiquetado. La barrera de escritura protege contra este tipo de error. Segundo, el hilo puede tratar un valor no etiquetado como un puntero y desreferenciarlo, lo cual resultaría en un acceso a memoria inválido, típicamente seguido por un bloqueo del programa. Para manejar este caso, utilizamos un protocolo de toma de instantáneas que sincroniza con el indicador de marcado del objeto. El protocolo involucra dos partes: el hilo principal cambiando un campo del objeto de etiquetado a no etiquetado y el hilo de trabajo visitando el objeto. Antes de cambiar el campo, el hilo principal asegura que el objeto está marcado como negro y lo pone en la lista de trabajo de desalojo para visitarlo más tarde:

```cpp
atomic_color_transition(object, white, grey);
if (atomic_color_transition(object, grey, black)) {
  // El objeto será revisitado en el hilo principal durante el vaciado
  // de la lista de trabajo de desalojo.
  bailout_worklist.push(object);
}
unsafe_object_layout_change(object);
```

Como se muestra en el fragmento de código a continuación, el hilo de trabajo primero carga la clase oculta del objeto y toma instantáneas de todos los campos de puntero del objeto especificados por la clase oculta usando [operaciones de carga relajadas atómicas](https://en.cppreference.com/w/cpp/atomic/memory_order#Relaxed_ordering). Luego intenta marcar el objeto como negro usando una operación de comparar y intercambiar atómica. Si el marcado tuvo éxito, esto significa que la instantánea debe ser consistente con la clase oculta porque el hilo principal marca el objeto como negro antes de cambiar su diseño.

```cpp
snapshot = [];
hidden_class = carga_relajada_atómica(&object.hidden_class);
para (field_offset en pointer_field_offsets(hidden_class)) {
  pointer = carga_relajada_atómica(object + field_offset);
  snapshot.add(field_offset, pointer);
}
si (transición_de_color_atómica(object, gris, negro)) {
  visitar_punteros(snapshot);
}
```

Nota que un objeto blanco que experimenta un cambio de diseño inseguro debe ser marcado en el hilo principal. Los cambios de diseño inseguros son relativamente raros, por lo que esto no tiene un gran impacto en el rendimiento de aplicaciones del mundo real.

## Juntándolo todo

Integramos el marcado concurrente en la infraestructura de marcado incremental existente. El hilo principal inicia el marcado escaneando las raíces y llenando la lista de tareas de marcado. Después de eso, asigna tareas de marcado concurrentes a los hilos de trabajo. Los hilos de trabajo ayudan al hilo principal a avanzar más rápido en el marcado al vaciar cooperativamente la lista de tareas de marcado. De vez en cuando, el hilo principal participa en el marcado procesando la lista de tareas de escape y la lista de tareas de marcado. Una vez que las listas de tareas de marcado se vacían, el hilo principal finaliza la recolección de basura. Durante la finalización, el hilo principal vuelve a escanear las raíces y puede descubrir más objetos blancos. Esos objetos se marcan en paralelo con la ayuda de los hilos de trabajo.

![](/_img/concurrent-marking/11.svg)

## Resultados

Nuestro [marco de prueba de rendimiento del mundo real](/blog/real-world-performance) muestra una reducción de aproximadamente el 65% y el 70% en el tiempo de marcado del hilo principal por ciclo de recolección de basura en dispositivos móviles y de escritorio, respectivamente.

![Tiempo empleado en marcar en el hilo principal (menor es mejor)](/_img/concurrent-marking/12.svg)

El marcado concurrente también reduce el impacto en Node.js. Esto es particularmente importante ya que Node.js nunca implementó la programación de recolección de basura en tiempos de inactividad y, por lo tanto, nunca pudo ocultar el tiempo de marcado en fases no críticas para el impacto. El marcado concurrente fue incluido en Node.js v10.
