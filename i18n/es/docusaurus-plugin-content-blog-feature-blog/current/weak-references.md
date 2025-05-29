---
title: 'Referencias débiles y finalizadores'
author: 'Sathya Gunasekaran ([@_gsathya](https://twitter.com/_gsathya)), Mathias Bynens ([@mathias](https://twitter.com/mathias)), Shu-yu Guo ([@_shu](https://twitter.com/_shu)), y Leszek Swirski ([@leszekswirski](https://twitter.com/leszekswirski))'
avatars:
- 'sathya-gunasekaran'
- 'mathias-bynens'
- 'shu-yu-guo'
- 'leszek-swirski'
date: 2019-07-09
updated: 2020-06-19
tags:
  - ECMAScript
  - ES2021
  - io19
  - Node.js 14
description: '¡Referencias débiles y finalizadores están llegando a JavaScript! Este artículo explica la nueva funcionalidad.'
tweet: '1148603966848151553'
---
Generalmente, las referencias a los objetos se mantienen _fuertemente_ en JavaScript, lo que significa que mientras tengas una referencia al objeto, no será recolectado por el recolector de basura.

```js
const ref = { x: 42, y: 51 };
// Mientras tengas acceso a `ref` (o cualquier otra referencia al
// mismo objeto), el objeto no será recolectado por el recolector de basura.
```

Actualmente, `WeakMap`s y `WeakSet`s son la única forma de referenciar de manera virtualmente débil un objeto en JavaScript: agregar un objeto como una clave a un `WeakMap` o `WeakSet` no impide que sea recolectado por el recolector de basura.

```js
const wm = new WeakMap();
{
  const ref = {};
  const metaData = 'foo';
  wm.set(ref, metaData);
  wm.get(ref);
  // → metaData
}
// Ya no tenemos una referencia a `ref` en este alcance de bloque, así que
// puede ser recolectado por el recolector de basura ahora, incluso aunque sea una clave en `wm` a
// la cual todavía tenemos acceso.

<!--truncate-->
const ws = new WeakSet();
{
  const ref = {};
  ws.add(ref);
  ws.has(ref);
  // → true
}
// Ya no tenemos una referencia a `ref` en este alcance de bloque, así que
// puede ser recolectado por el recolector de basura ahora, incluso aunque sea una clave en `ws` a
// la cual todavía tenemos acceso.
```

:::note
**Nota:** Puedes pensar en `WeakMap.prototype.set(ref, metaData)` como la adición de una propiedad con el valor `metaData` al objeto `ref`: mientras tengas una referencia al objeto, puedes obtener los metadatos. Una vez que ya no tengas una referencia al objeto, este puede ser recolectado por el recolector de basura, incluso aunque todavía tengas una referencia a `WeakMap` al que fue añadido. De manera similar, puedes pensar en un `WeakSet` como un caso especial de `WeakMap` donde todos los valores son booleanos.

Un `WeakMap` en JavaScript no es realmente _débil_: en realidad refiere _fuertemente_ a sus contenidos mientras la clave esté viva. El `WeakMap` solo refiere débilmente a sus contenidos una vez que la clave es recolectada por el recolector de basura. Un nombre más preciso para este tipo de relación es [_efémero_](https://en.wikipedia.org/wiki/Ephemeron).
:::

`WeakRef` es una API más avanzada que proporciona _referencias realmente débiles_, habilitando una ventana hacia la vida útil de un objeto. Veamos un ejemplo juntos.

Para el ejemplo, supongamos que estamos trabajando en una aplicación web de chat que usa websockets para comunicarse con un servidor. Imagina una clase `MovingAvg` que, para propósitos de diagnóstico de rendimiento, mantiene un conjunto de eventos de un websocket para calcular un promedio móvil simple de la latencia.

```js
class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.socket = socket;
    this.listener = (ev) => { this.events.push(ev); };
    socket.addEventListener('message', this.listener);
  }

  compute(n) {
    // Calcula el promedio móvil simple de los últimos n eventos.
    // …
  }
}
```

Es utilizada por una clase `MovingAvgComponent` que te permite controlar cuándo comenzar y detener el monitoreo del promedio móvil simple de la latencia.

```js
class MovingAvgComponent {
  constructor(socket) {
    this.socket = socket;
  }

  start() {
    this.movingAvg = new MovingAvg(this.socket);
  }

  stop() {
    // Permitir al recolector de basura recuperar memoria.
    this.movingAvg = null;
  }

  render() {
    // Realizar renderización.
    // …
  }
}
```

Sabemos que mantener todos los mensajes del servidor dentro de una instancia `MovingAvg` usa mucha memoria, así que nos aseguramos de asignar null a `this.movingAvg` cuando se detiene el monitoreo para permitir al recolector de basura recuperar memoria.

Sin embargo, después de verificar en el panel de memoria en DevTools, descubrimos que la memoria no estaba siendo recuperada en absoluto. El desarrollador web experimentado puede haber detectado ya el error: los listeners de eventos son referencias fuertes y deben ser eliminados explícitamente.

Hagamos esto explícito con diagramas de alcance. Después de llamar a `start()`, nuestro gráfico de objetos se ve como lo siguiente, donde una flecha sólida significa una referencia fuerte. Todo lo alcanzable mediante flechas sólidas desde la instancia `MovingAvgComponent` no es recuperable por el recolector de basura.

![](/_img/weakrefs/after-start.svg)

Después de llamar a `stop()`, hemos eliminado la referencia fuerte de la instancia `MovingAvgComponent` a la instancia `MovingAvg`, pero no a través del listener del socket.

![](/_img/weakrefs/after-stop.svg)

Así, el listener en las instancias `MovingAvg`, al referenciar `this`, mantiene viva toda la instancia mientras el listener de eventos no sea eliminado.

Hasta ahora, la solución es desregistrar manualmente el listener de eventos mediante un método `dispose`.

```js
class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.socket = socket;
    this.listener = (ev) => { this.events.push(ev); };
    socket.addEventListener('message', this.listener);
  }

  dispose() {
    this.socket.removeEventListener('message', this.listener);
  }

  // …
}
```

El inconveniente de este enfoque es que requiere una gestión manual de memoria. `MovingAvgComponent`, y todos los demás usuarios de la clase `MovingAvg`, deben recordar llamar a `dispose` o sufrir fugas de memoria. Lo que es peor, la gestión manual de memoria es en cascada: los usuarios de `MovingAvgComponent` deben recordar llamar a `stop` o sufrir fugas de memoria, y así sucesivamente. El comportamiento de la aplicación no depende del listener de eventos de esta clase de diagnóstico, y el listener consume mucha memoria pero no muchos recursos computacionales. Lo que realmente queremos es que el ciclo de vida del listener esté vinculado lógicamente a la instancia de `MovingAvg`, de modo que `MovingAvg` pueda usarse como cualquier otro objeto de JavaScript cuyo uso de memoria sea recuperado automáticamente por el recolector de basura.

Los `WeakRef` hacen posible resolver este dilema creando una _referencia débil_ al listener de eventos real y luego envolviendo ese `WeakRef` en un listener de eventos externo. De esta manera, el recolector de basura puede limpiar el listener de eventos real y la memoria que mantiene viva, como la instancia de `MovingAvg` y su array `events`.

```js
function addWeakListener(socket, listener) {
  const weakRef = new WeakRef(listener);
  const wrapper = (ev) => { weakRef.deref()?.(ev); };
  socket.addEventListener('message', wrapper);
}

class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.listener = (ev) => { this.events.push(ev); };
    addWeakListener(socket, this.listener);
  }
}
```

:::note
**Nota:** Los `WeakRef` aplicados a funciones deben tratarse con precaución. Las funciones en JavaScript son [cierres](https://en.wikipedia.org/wiki/Closure_(computer_programming)) (closures) y hacen referencia de forma fuerte a los entornos externos que contienen los valores de las variables libres referenciadas dentro de las funciones. Estos entornos externos pueden contener variables que _otros_ cierres también referencian. Es decir, cuando se trabaja con cierres, su memoria a menudo es referenciada de manera fuerte por otros cierres de forma sutil. Esta es la razón por la que `addWeakListener` es una función separada y `wrapper` no es local al constructor de `MovingAvg`. En V8, si `wrapper` estuviera dentro del constructor de `MovingAvg` y compartiera el ámbito léxico con el listener que está envuelto en el `WeakRef`, la instancia de `MovingAvg` y todas sus propiedades serían accesibles a través del entorno compartido desde el listener wrapper, haciendo que la instancia no sea recolectable. Ten esto en mente al escribir código.
:::

Primero, creamos el listener de eventos y lo asignamos a `this.listener`, de modo que sea referenciado de forma fuerte por la instancia de `MovingAvg`. En otras palabras, mientras la instancia de `MovingAvg` esté viva, también lo estará el listener de eventos.

Luego, en `addWeakListener`, creamos un `WeakRef` cuyo _objetivo_ es el listener de eventos real. Dentro de `wrapper`, hacemos `deref`. Dado que los `WeakRef` no evitan que sus objetivos sean recolectados por el recolector de basura si no tienen otras referencias fuertes, debemos desreferenciarlos manualmente para obtener el objetivo. Si el objetivo ha sido recolectado por el recolector de basura mientras tanto, `deref` devolverá `undefined`. De lo contrario, se devuelve el objetivo original, que es la función `listener` que luego llamamos utilizando la [encadenamiento opcional](/features/optional-chaining).

Dado que el listener de eventos está envuelto en un `WeakRef`, la _única_ referencia fuerte a él es la propiedad `listener` en la instancia de `MovingAvg`. Es decir, hemos vinculado correctamente el ciclo de vida del listener de eventos al ciclo de vida de la instancia de `MovingAvg`.

Volviendo a los diagramas de alcanzabilidad, nuestro gráfico de objetos se ve como sigue después de llamar a `start()` con la implementación de `WeakRef`, donde una flecha punteada significa una referencia débil.

![](/_img/weakrefs/weak-after-start.svg)

Después de llamar a `stop()`, hemos eliminado la única referencia fuerte al listener:

![](/_img/weakrefs/weak-after-stop.svg)

Finalmente, después de que ocurre una recolección de basura, la instancia de `MovingAvg` y el listener serán recolectados:

![](/_img/weakrefs/weak-after-gc.svg)

Pero todavía hay un problema aquí: hemos añadido un nivel de indirección a `listener` al envolverlo en un `WeakRef`, pero el wrapper en `addWeakListener` sigue teniendo fugas por la misma razón que `listener` estaba teniendo fugas originalmente. Aunque, ciertamente, esta es una fuga más pequeña ya que solo el wrapper está teniendo fugas en lugar de toda la instancia de `MovingAvg`, pero sigue siendo una fuga. La solución a esto es la característica complementaria de `WeakRef`, `FinalizationRegistry`. Con la nueva API `FinalizationRegistry`, podemos registrar un callback para que se ejecute cuando el recolector de basura elimine un objeto registrado. Dichos callbacks se conocen como _finalizadores_.

:::nota
**Nota:** La devolución de llamada de finalización no se ejecuta inmediatamente después de que el recolector de basura elimina el listener de eventos, por lo que no lo uses para lógica o métricas importantes. El momento de la recolección de basura y de las devoluciones de llamada de finalización es indefinido. De hecho, un motor que nunca recolecta basura sería completamente compatible. Sin embargo, es seguro asumir que los motores _sí_ recolectarán basura, y las devoluciones de llamada de finalización se ejecutarán en algún momento posterior, a menos que se descarte el entorno (como cuando se cierra la pestaña o finaliza el worker). Ten en cuenta esta incertidumbre al escribir código.
:::

Podemos registrar una devolución de llamada con un `FinalizationRegistry` para eliminar el `wrapper` del socket cuando el listener de eventos interno sea recolectado como basura. Nuestra implementación final se ve así:

```js
const gListenersRegistry = new FinalizationRegistry(({ socket, wrapper }) => {
  socket.removeEventListener('message', wrapper); // 6
});

function addWeakListener(socket, listener) {
  const weakRef = new WeakRef(listener); // 2
  const wrapper = (ev) => { weakRef.deref()?.(ev); }; // 3
  gListenersRegistry.register(listener, { socket, wrapper }); // 4
  socket.addEventListener('message', wrapper); // 5
}

class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.listener = (ev) => { this.events.push(ev); }; // 1
    addWeakListener(socket, this.listener);
  }
}
```

:::nota
**Nota:** `gListenersRegistry` es una variable global para asegurar que los finalizadores se ejecuten. Un `FinalizationRegistry` no se mantiene vivo por los objetos registrados en él. Si un registro es recolectado como basura, su finalizador puede no ejecutarse.
:::

Creamos un listener de eventos y lo asignamos a `this.listener` para que sea referenciado de forma fuerte por la instancia de `MovingAvg` (1). Luego, envolvemos el listener de eventos que realiza el trabajo en un `WeakRef` para que pueda ser recolectado como basura y no filtre su referencia a la instancia de `MovingAvg` a través de `this` (2). Creamos un contenedor que utiliza `deref` del `WeakRef` para verificar si aún está vivo y luego lo llama si es así (3). Registramos el listener interno en el `FinalizationRegistry`, pasando un _valor de retención_ `{ socket, wrapper }` al registro (4). Luego añadimos el contenedor retornado como un listener de eventos en `socket` (5). Algún tiempo después de que la instancia de `MovingAvg` y el listener interno sean recolectados como basura, el finalizador podría ejecutarse, con el valor de retención pasado a él. Dentro del finalizador, eliminamos también el contenedor, haciendo que toda la memoria asociada con el uso de una instancia de `MovingAvg` pueda ser recolectada como basura (6).

Con todo esto, nuestra implementación original de `MovingAvgComponent` no filtra memoria ni requiere eliminación manual.

## No te excedas

Después de conocer estas nuevas capacidades, podría ser tentador usar `WeakRef` en Todas Las Cosas™. Sin embargo, probablemente no sea una buena idea. Algunas cosas _no_ son casos de uso adecuados para `WeakRef`s y finalizadores.

En general, evita escribir código que dependa de que el recolector de basura limpie un `WeakRef` o llame a un finalizador en un momento predecible — [¡no se puede hacer](https://github.com/tc39/proposal-weakrefs#a-note-of-caution)! Además, si un objeto es recolectable como basura o no puede depender de detalles de implementación, como la representación de cierres, que son tanto sutiles como pueden diferir entre los motores de JavaScript e incluso entre diferentes versiones del mismo motor. Específicamente, las devoluciones de llamada de finalización:

- Podrían no ocurrir inmediatamente después de la recolección de basura.
- Podrían no ocurrir en el mismo orden que la recolección de basura real.
- Podrían no ocurrir en absoluto, por ejemplo, si se cierra la ventana del navegador.

Por lo tanto, no pongas lógica importante en la ruta de código de un finalizador. Son útiles para realizar limpieza en respuesta a la recolección de basura, pero no puedes usarlos de manera confiable para, por ejemplo, registrar métricas significativas sobre el uso de memoria. Para ese caso de uso, consulta [`performance.measureUserAgentSpecificMemory`](https://web.dev/monitor-total-page-memory-usage/).

`WeakRef`s y finalizadores pueden ayudarte a ahorrar memoria y funcionan mejor cuando se usan con moderación como un medio de mejora progresiva. Dado que son características para usuarios avanzados, esperamos que la mayor parte del uso ocurra dentro de frameworks o bibliotecas.

## Compatibilidad con `WeakRef`

<feature-support chrome="74 https://v8.dev/blog/v8-release-84#weak-references-and-finalizers"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1561074"
                 safari="no"
                 nodejs="14.6.0"
                 babel="no"></feature-support>
