---
title: "Recolección de basura de alto rendimiento para C++"
author: "Anton Bikineev, Omer Katz ([@omerktz](https://twitter.com/omerktz)), y Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz)), expertos en memoria de C++"
avatars:
  - "anton-bikineev"
  - "omer-katz"
  - "michael-lippautz"
date: 2020-05-26
tags:
  - internos
  - memoria
  - cppgc
description: "Esta publicación describe el recolector de basura Oilpan para C++, su uso en Blink y cómo optimiza el barrido, es decir, la recuperación de memoria inaccesible."
tweet: "1265304883638480899"
---

En el pasado ya hemos [escrito](https://v8.dev/blog/trash-talk) [bastante](https://v8.dev/blog/concurrent-marking) [sobre](https://v8.dev/blog/tracing-js-dom) la recolección de basura para JavaScript, el modelo de objetos del documento (DOM) y cómo todo esto está implementado y optimizado en V8. Sin embargo, no todo en Chromium es JavaScript, ya que la mayor parte del navegador y su motor de renderizado Blink, donde V8 está integrado, están escritos en C++. JavaScript puede usarse para interactuar con el DOM, que luego es procesado por la tubería de renderizado.

<!--truncate-->
Debido a que el grafó de objetos C++ alrededor del DOM está fuertemente entrelazado con los objetos de JavaScript, el equipo de Chromium cambió hace algunos años a un recolector de basura llamado [Oilpan](https://www.youtube.com/watch?v=_uxmEyd6uxo) para gestionar este tipo de memoria. Oilpan es un recolector de basura escrito en C++ para gestionar memoria de C++ que puede conectarse a V8 mediante [trazabilidad entre componentes](https://research.google/pubs/pub47359/) que trata el grafó de objetos entrelazado C++/JavaScript como un solo montón.

Esta publicación es la primera de una serie de artículos sobre Oilpan que proporcionará un resumen de los principios básicos de Oilpan y sus APIs de C++. En esta publicación cubriremos algunas de las características compatibles, explicaremos cómo interactúan con varios subsistemas del recolector de basura y profundizaremos en la recuperación concurrente de objetos en el barrido.

Lo más emocionante es que Oilpan está actualmente implementado en Blink pero se trasladará a V8 en forma de una [biblioteca de recolección de basura](https://chromium.googlesource.com/v8/v8.git/+/HEAD/include/cppgc/). El objetivo es hacer que la recolección de basura en C++ esté fácilmente disponible para todos los integradores de V8 y más desarrolladores de C++ en general.

## Antecedentes

Oilpan implementa un recolector de basura de tipo [Mark-Sweep](https://en.wikipedia.org/wiki/Tracing_garbage_collection) donde la recolección de basura se divide en dos fases: *marcado*, durante el cual el montón gestionado es examinado en busca de objetos vivos, y *barrido*, durante el cual los objetos muertos en el montón gestionado son recuperados.

Ya hemos cubierto los fundamentos del marcado cuando presentamos el [marcado concurrente en V8](https://v8.dev/blog/concurrent-marking). Para resumir, examinar todos los objetos para identificar los vivos puede considerarse como un recorrido de grafó donde los objetos son nodos y los punteros entre objetos son aristas. El recorrido comienza en las raíces que son registros, la pila de ejecución nativa (que llamaremos pila de ahora en adelante) y otros globales, como se describe [aquí](https://v8.dev/blog/concurrent-marking#background).

C++ no es diferente a JavaScript en ese aspecto. Sin embargo, a diferencia de JavaScript, los objetos C++ son de tipos estáticos y, por lo tanto, no pueden cambiar su representación en tiempo de ejecución. Los objetos C++ gestionados mediante Oilpan aprovechan este hecho y proporcionan una descripción de los punteros a otros objetos (aristas en el grafó) mediante el patrón visitante. El patrón básico para describir objetos de Oilpan es el siguiente:

```cpp
class LinkedNode final : public GarbageCollected<LinkedNode> {
 public:
  LinkedNode(LinkedNode* next, int value) : next_(next), value_(value) {}
  void Trace(Visitor* visitor) const {
    visitor->Trace(next_);
  }
 private:
  Member<LinkedNode> next_;
  int value_;
};

LinkedNode* CreateNodes() {
  LinkedNode* first_node = MakeGarbageCollected<LinkedNode>(nullptr, 1);
  LinkedNode* second_node = MakeGarbageCollected<LinkedNode>(first_node, 2);
  return second_node;
}
```

En el ejemplo anterior, `LinkedNode` es gestionado por Oilpan, como se indica al heredar de `GarbageCollected<LinkedNode>`. Cuando el recolector de basura procesa un objeto, descubre punteros salientes invocando el método `Trace` del objeto. El tipo `Member` es un puntero inteligente que es sintácticamente similar a, por ejemplo, `std::shared_ptr`, que es proporcionado por Oilpan y se utiliza para mantener un estado consistente mientras se recorre el grafó durante el marcado. Todo esto permite que Oilpan sepa con precisión dónde residen los punteros en sus objetos gestionados.

Probablemente los lectores ávidos notaron ~~y pueden estar asustados~~ que `first_node` y `second_node` se mantienen como punteros crudos de C++ en la pila en el ejemplo anterior. Oilpan no agrega abstracciones para trabajar con la pila, confiando únicamente en el escaneo conservador de la pila para encontrar punteros en su montón gestionado al procesar las raíces. Esto funciona al iterar la pila palabra por palabra e interpretar esas palabras como punteros en el montón gestionado. Esto significa que Oilpan no impone una penalización de rendimiento por acceder a objetos asignados en la pila. En cambio, mueve el costo al tiempo de recolección de basura donde escanea la pila de manera conservadora. Oilpan, integrado en el renderizador, intenta retrasar la recolección de basura hasta que alcance un estado en el que se garantice que no tiene una pila interesante. Dado que la web se basa en eventos y la ejecución se impulsa procesando tareas en bucles de eventos, tales oportunidades son abundantes.

Oilpan se utiliza en Blink, que es una gran base de código de C++ con mucho código maduro y, por lo tanto, también admite:

- Herencia múltiple a través de mixins y referencias a tales mixins (punteros interiores).
- Activar la recolección de basura durante la ejecución de constructores.
- Mantener vivos los objetos desde memoria no gestionada a través de punteros inteligentes `Persistent`, que se tratan como raíces.
- Colecciones que abarcan contenedores secuenciales (por ejemplo, vector) y asociativos (por ejemplo, set y map) con compactación de respaldos de colección.
- Referencias débiles, callbacks débiles y [efímeros](https://es.wikipedia.org/wiki/Ef%C3%ADmero).
- Callbacks de finalización que se ejecutan antes de recuperar objetos individuales.

## Barrido para C++

Estén atentos para un artículo separado sobre cómo funciona el marcado en Oilpan en detalle. Para este artículo asumimos que el marcado está completo y Oilpan ha descubierto todos los objetos alcanzables con la ayuda de sus métodos `Trace`. Después de marcar, todos los objetos alcanzables tienen su bit de marca establecido.

El barrido es ahora la fase donde los objetos muertos (aquellos inalcanzables durante el marcado) son recuperados y su memoria subyacente es devuelta al sistema operativo o se pone disponible para asignaciones posteriores. A continuación, mostramos cómo funciona el barrido de Oilpan, tanto desde una perspectiva de uso y restricciones, como también cómo logra un alto rendimiento en la recuperación.

El barrido encuentra objetos muertos iterando la memoria del montón y verificando los bits de marca. Para preservar la semántica de C++, el barrido debe invocar el destructor de cada objeto muerto antes de liberar su memoria. Los destructores no triviales se implementan como finalizadores.

Desde la perspectiva del programador, no existe un orden definido en el que se ejecutan los destructores, ya que la iteración utilizada por el barrido no considera el orden de construcción. Esto impone una restricción de que los finalizadores no pueden tocar otros objetos en el montón. Este es un desafío común para escribir código de usuario que requiere un orden de finalización, ya que los lenguajes gestionados generalmente no admiten un orden en sus semánticas de finalización (por ejemplo, Java). Oilpan utiliza un complemento de Clang que verifica estáticamente, entre muchas otras cosas, que no se acceda a objetos del montón durante la destrucción de un objeto:

```cpp
class GCed : public GarbageCollected<GCed> {
 public:
  void DoSomething();
  void Trace(Visitor* visitor) {
    visitor->Trace(other_);
  }
  ~GCed() {
    other_->DoSomething();  // error: Finalizador '~GCed' accede
                            // al campo potencialmente finalizado 'other_'.
  }
 private:
  Member<GCed> other_;
};
```

Para los curiosos: Oilpan proporciona callbacks de pre-finalización para casos de uso complejos que requieren acceso al montón antes de que los objetos sean destruidos. Tales callbacks imponen más sobrecarga que los destructores en cada ciclo de recolección de basura, aunque se usan con moderación en Blink.

## Barrido incremental y concurrente

Ahora que hemos cubierto las restricciones de los destructores en un entorno de C++ gestionado, es momento de analizar cómo Oilpan implementa y optimiza la fase de barrido en mayor detalle.

Antes de entrar en detalles, es importante recordar cómo los programas en general se ejecutan en la web. Cualquier ejecución, por ejemplo programas JavaScript pero también recolección de basura, es impulsada desde el hilo principal mediante el despacho de tareas en un [bucle de eventos](https://es.wikipedia.org/wiki/Bucle_de_eventos). El renderizador, al igual que otros entornos de aplicaciones, admite tareas en segundo plano que se ejecutan concurrentemente con el hilo principal para ayudar a procesar cualquier trabajo del hilo principal.

Empezando de forma simple, Oilpan originalmente implementó barrido en stop-the-world que se ejecutaba como parte de la pausa de finalización de recolección de basura, interrumpiendo la ejecución de la aplicación en el hilo principal:

![Barrido stop-the-world](/_img/high-performance-cpp-gc/stop-the-world-sweeping.svg)

Para aplicaciones con restricciones de tiempo real suaves, el factor determinante al lidiar con la recolección de basura es la latencia. El barrido stop-the-world puede inducir un tiempo de pausa significativo, lo que resulta en una latencia de aplicación visible para el usuario. Como el siguiente paso para reducir la latencia, el barrido se hizo incremental:

![Barrido incremental](/_img/high-performance-cpp-gc/incremental-sweeping.svg)

Con el enfoque incremental, la limpieza se divide y se delega en tareas adicionales del hilo principal. En el mejor de los casos, estas tareas se ejecutan completamente en [tiempo de inactividad](https://research.google/pubs/pub45361/), evitando interferencias con cualquier ejecución normal de la aplicación. Internamente, el limpiador divide el trabajo en unidades más pequeñas basadas en una noción de páginas. Las páginas pueden estar en dos estados interesantes: páginas *por limpiar* que el limpiador aún debe procesar, y páginas *ya limpiadas* que el limpiador ya procesó. La asignación solo considera páginas ya limpiadas y llenará los búferes de asignación locales (LABs) desde listas libres que mantienen una lista de fragmentos de memoria disponibles. Para obtener memoria de una lista libre, la aplicación primero intentará encontrar memoria en páginas ya limpiadas, luego intentará ayudar a procesar páginas por limpiar incorporando el algoritmo de limpieza en la asignación, y solo solicitará nueva memoria al sistema operativo en caso de que no haya ninguna disponible.

Oilpan ha usado limpieza incremental durante años, pero a medida que las aplicaciones y los gráficos de objetos resultantes crecieron cada vez más, la limpieza comenzó a impactar en el rendimiento de la aplicación. Para mejorar la limpieza incremental, comenzamos a aprovechar las tareas en segundo plano para la recuperación concurrente de memoria. Se utilizan dos invariantes básicos para descartar cualquier condición de carrera entre las tareas en segundo plano que ejecutan el limpiador y la aplicación que asigna nuevos objetos:

- El limpiador solo procesa memoria muerta que, por definición, no es accesible por la aplicación.
- La aplicación solo asigna en páginas ya limpiadas que, por definición, no están siendo procesadas por el limpiador.

Ambos invariantes aseguran que no debería haber ningún contendiente por el objeto y su memoria. Desafortunadamente, C++ depende en gran medida de los destructores que se implementan como finalizadores. Oilpan obliga a que los finalizadores se ejecuten en el hilo principal para ayudar a los desarrolladores y descartar condiciones de carrera dentro del propio código de la aplicación. Para resolver este problema, Oilpan difiere la finalización de objetos al hilo principal. Más concretamente, cada vez que el limpiador concurrente encuentra un objeto que tiene un finalizador (destructor), lo envía a una cola de finalización que será procesada en una fase de finalización separada, que siempre se ejecuta en el hilo principal que también ejecuta la aplicación. El flujo de trabajo general con limpieza concurrente se ve así:

![Limpieza concurrente usando tareas en segundo plano](/_img/high-performance-cpp-gc/concurrent-sweeping.svg)

Dado que los finalizadores pueden requerir acceso a toda la carga útil del objeto, agregar la memoria correspondiente a la lista libre se retrasa hasta después de ejecutar el finalizador. Si no se ejecutan finalizadores, el limpiador que se ejecuta en el hilo de fondo agrega inmediatamente la memoria recuperada a la lista libre.

# Resultados

La limpieza en segundo plano se lanzó en Chrome M78. Nuestro [marco de evaluación de rendimiento del mundo real](https://v8.dev/blog/real-world-performance) muestra una reducción del tiempo de limpieza del hilo principal entre un 25% y 50% (42% en promedio). A continuación, se muestra un conjunto seleccionado de elementos de línea.

![Tiempo de limpieza del hilo principal en milisegundos](/_img/high-performance-cpp-gc/results.svg)

El resto del tiempo que se pasa en el hilo principal se destina a la ejecución de finalizadores. Hay un trabajo continuo para reducir los finalizadores para tipos de objetos que se instancian en gran medida en Blink. La parte emocionante aquí es que todas estas optimizaciones se realizan en el código de la aplicación, ya que la limpieza se ajustará automáticamente en ausencia de finalizadores.

Estén atentos a más publicaciones sobre la recolección de basura en C++ en general y las actualizaciones de la biblioteca Oilpan en particular, a medida que nos acercamos al lanzamiento que pueda ser utilizado por todos los usuarios de V8.
