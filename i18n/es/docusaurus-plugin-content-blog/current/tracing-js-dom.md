---
title: &apos;Trazando desde JS al DOM y de vuelta&apos;
author: &apos;Ulan Degenbaev, Alexei Filippov, Michael Lippautz y Hannes Payer — la hermandad del DOM&apos;
avatars:
  - &apos;ulan-degenbaev&apos;
  - &apos;michael-lippautz&apos;
  - &apos;hannes-payer&apos;
date: 2018-03-01 13:33:37
tags:
  - internals
  - memory
description: &apos;Las DevTools de Chrome ahora pueden trazar y capturar objetos DOM en C++ y mostrar todos los objetos DOM accesibles desde JavaScript junto con sus referencias.&apos;
tweet: &apos;969184997545562112&apos;
---
Depurar fugas de memoria en Chrome 66 se ha vuelto mucho más fácil. Las DevTools de Chrome ahora pueden trazar y capturar objetos DOM en C++ y mostrar todos los objetos DOM accesibles desde JavaScript junto con sus referencias. Esta funcionalidad es uno de los beneficios del nuevo mecanismo de trazado en C++ del recolector de basura de V8.

<!--truncate-->
## Antecedentes

Una fuga de memoria en un sistema de recolección de basura ocurre cuando un objeto no utilizado no se libera debido a referencias involuntarias de otros objetos. Las fugas de memoria en páginas web suelen involucrar interacción entre objetos de JavaScript y elementos del DOM.

El siguiente [ejemplo de juguete](https://ulan.github.io/misc/leak.html) muestra una fuga de memoria que ocurre cuando un programador olvida desregistrar un listener de eventos. Ninguno de los objetos referenciados por el listener de eventos puede ser recolectado por el sistema de basura. En particular, la ventana del iframe se fuga junto con el listener de eventos.

```js
// Ventana principal:
const iframe = document.createElement(&apos;iframe&apos;);
iframe.src = &apos;iframe.html&apos;;
document.body.appendChild(iframe);
iframe.addEventListener(&apos;load&apos;, function() {
  const localVariable = iframe.contentWindow;
  function leakingListener() {
    // Hacer algo con `localVariable`.
    if (localVariable) {}
  }
  document.body.addEventListener(&apos;my-debug-event&apos;, leakingListener);
  document.body.removeChild(iframe);
  // BUG: se olvidó desregistrar `leakingListener`.
});
```

La ventana del iframe fugada también mantiene vivos todos sus objetos de JavaScript.

```js
// iframe.html:
class Leak {};
window.globalVariable = new Leak();
```

Es importante entender el concepto de rutas de retención para encontrar la causa raíz de una fuga de memoria. Una ruta de retención es una cadena de objetos que impide la recolección de basura del objeto fugado. La cadena comienza en un objeto raíz como el objeto global de la ventana principal. La cadena termina en el objeto fugado. Cada objeto intermedio en la cadena tiene una referencia directa al siguiente objeto en la cadena. Por ejemplo, la ruta de retención del objeto `Leak` en el iframe se ve de la siguiente manera:

![Figura 1: Ruta de retención de un objeto fugado a través de `iframe` y listener de eventos](/_img/tracing-js-dom/retaining-path.svg)

Cabe destacar que la ruta de retención cruza dos veces el límite entre JavaScript y DOM (resaltado en verde/rojo, respectivamente). Los objetos de JavaScript viven en el heap de V8, mientras que los objetos del DOM son objetos C++ en Chrome.

## Captura del heap en DevTools

Podemos inspeccionar la ruta de retención de cualquier objeto tomando una captura del heap en DevTools. La captura del heap recoge con precisión todos los objetos en el heap de V8. Hasta hace poco, solo tenía información aproximada sobre los objetos DOM en C++. Por ejemplo, Chrome 65 muestra una ruta de retención incompleta para el objeto `Leak` del ejemplo de juguete:

![Figura 2: Ruta de retención en Chrome 65](/_img/tracing-js-dom/chrome-65.png)

Solo la primera fila es precisa: el objeto `Leak` de hecho se almacena en el `global_variable` del objeto ventana del iframe. Las filas siguientes aproximan la ruta de retención real y dificultan la depuración de la fuga de memoria.

A partir de Chrome 66, DevTools traza a través de objetos DOM en C++ y captura con precisión los objetos y las referencias entre ellos. Esto se basa en el potente mecanismo de trazado de objetos C++ que se introdujo anteriormente para la recolección de basura entre componentes. Como resultado, [la ruta de retención en DevTools](https://www.youtube.com/watch?v=ixadA7DFCx8) ahora es realmente correcta:

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/ixadA7DFCx8" width="640" height="360" loading="lazy"></iframe>
  </div>
  <figcaption>Figura 3: Ruta de retención en Chrome 66</figcaption>
</figure>

## Bajo el capó: trazado entre componentes

Los objetos DOM son gestionados por Blink — el motor de renderizado de Chrome, que es responsable de traducir el DOM en texto e imágenes reales en la pantalla. Blink y su representación del DOM están escritos en C++, lo que significa que el DOM no puede exponerse directamente a JavaScript. En cambio, los objetos en el DOM vienen en dos mitades: un objeto wrapper de V8 disponible para JavaScript y un objeto en C++ que representa el nodo en el DOM. Estos objetos tienen referencias directas entre sí. Determinar la vivacidad y propiedad de objetos a través de múltiples componentes, como Blink y V8, es difícil porque todas las partes involucradas deben acordar qué objetos siguen vivos y cuáles pueden ser reclamados.

En Chrome 56 y versiones anteriores (es decir, hasta marzo de 2017), Chrome utilizaba un mecanismo llamado _agrupación de objetos_ para determinar la vitalidad. Los objetos se asignaban a grupos según su contención en documentos. Un grupo con todos los objetos que contenía se mantenía activo siempre que un solo objeto permaneciera activo a través de algún otro camino de retención. Esto tenía sentido en el contexto de los nodos del DOM que siempre se refieren a su documento contenedor, formando los llamados árboles DOM. Sin embargo, esta abstracción eliminaba todos los caminos de retención reales, lo que hacía que su uso para depurar fuera complicado, como se muestra en la Figura 2. En el caso de objetos que no encajaban en este escenario, por ejemplo, cierres de JavaScript usados como oyentes de eventos, este enfoque también se volvía engorroso y provocaba varios errores en los que los objetos contenedores de JavaScript se recolectaban prematuramente, lo que resultaba en que fueran reemplazados por envoltorios JS vacíos que perdían todas sus propiedades.

A partir de Chrome 57, este enfoque fue reemplazado por la trazabilidad entre componentes, que es un mecanismo que determina la vitalidad al rastrear desde JavaScript hasta la implementación en C++ del DOM y viceversa. Implementamos trazabilidad incremental en el lado de C++ con barreras de escritura para evitar cualquier pausa de rastreo completa que hemos discutido en [publicaciones anteriores del blog](/blog/orinoco-parallel-scavenger). La trazabilidad entre componentes no solo proporciona mejor latencia, sino que también aproxima mejor la vitalidad de los objetos a través de los límites de los componentes y corrige varios [escenarios](https://bugs.chromium.org/p/chromium/issues/detail?id=501866) que solían causar fugas. Además, permite que las DevTools ofrezcan una instantánea que realmente representa el DOM, como se muestra en la Figura 3.

¡Pruébalo! Estamos encantados de recibir tus comentarios.
