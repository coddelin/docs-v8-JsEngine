---
title: "Lanzamiento de V8 v6.9"
author: "El equipo de V8"
date: 2018-08-07 13:33:37
tags:
  - lanzamiento
description: "¡V8 v6.9 incluye menor uso de memoria gracias a funciones incorporadas incrustadas, un inicio más rápido de WebAssembly con Liftoff, mejor rendimiento de DataView y WeakMap, y mucho más!"
tweet: "1026825606003150848"
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se ramifica desde el Git maestro de V8 inmediatamente antes de un hito de Chrome Beta. Hoy nos complace anunciar nuestra nueva rama, [versión 6.9 de V8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.9), que estará en beta hasta su lanzamiento en coordinación con Chrome 69 Stable en varias semanas. V8 v6.9 está llena de todo tipo de novedades para desarrolladores. Esta publicación ofrece un avance de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## Ahorro de memoria gracias a funciones incorporadas incrustadas

V8 se entrega con una extensa biblioteca de funciones incorporadas. Ejemplos son métodos en objetos incorporados como `Array.prototype.sort` y `RegExp.prototype.exec`, pero también una amplia gama de funcionalidades internas. Debido a que su generación lleva mucho tiempo, las funciones incorporadas se compilan en tiempo de construcción y se serializan en una [instantánea](/blog/custom-startup-snapshots), que luego se deserializa en tiempo de ejecución para crear el estado inicial del montón de JavaScript.

Las funciones incorporadas actualmente consumen 700 KB en cada Isolate (un Isolate corresponde aproximadamente a una pestaña de navegador en Chrome). Esto es bastante derrochador, y el año pasado comenzamos a trabajar para reducir este overhead. En V8 v6.4, lanzamos [deserialización diferida](/blog/lazy-deserialization), asegurando que cada Isolate solo pagara por las funciones incorporadas que realmente necesita (pero cada Isolate aún tenía su propia copia).

[Funciones incorporadas incrustadas](/blog/embedded-builtins) van un paso más allá. Una función incorporada incrustada es compartida por todos los Isolates y está incrustada en el propio binario en lugar de copiarse en el montón de JavaScript. Esto significa que las funciones incorporadas existen en la memoria solo una vez sin importar cuántos Isolates estén ejecutándose, una propiedad especialmente útil ahora que [Site Isolation](https://developers.google.com/web/updates/2018/07/site-isolation) se ha activado por defecto. Con funciones incorporadas incrustadas, hemos visto una _reducción mediana del 9% en el tamaño del montón de V8_ en los principales 10k sitios web en x64. En estos sitios, el 50% ahorra al menos 1.2 MB, el 30% ahorra al menos 2.1 MB y el 10% ahorra 3.7 MB o más.

V8 v6.9 se entrega con soporte para funciones incrustadas incorporadas en plataformas x64. Otras plataformas seguirán pronto en futuros lanzamientos. Para más detalles, consulta nuestra [publicación dedicada en el blog](/blog/embedded-builtins).

## Rendimiento

### Liftoff, el nuevo compilador de primer nivel de WebAssembly

WebAssembly obtuvo un nuevo compilador basal para un inicio mucho más rápido de sitios web complejos con grandes módulos de WebAssembly (como Google Earth y AutoCAD). Dependiendo del hardware, estamos viendo aceleraciones de más de 10×. Para más detalles, consulta [la publicación detallada del blog sobre Liftoff](/blog/liftoff).

<figure>
  <img src="/_img/v8-liftoff.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Logotipo de Liftoff, el compilador basal de V8 para WebAssembly</figcaption>
</figure>

### Operaciones más rápidas de `DataView`

[`DataView`](https://tc39.es/ecma262/#sec-dataview-objects) métodos han sido reimplementados en V8 Torque, lo que ahorra una costosa llamada a C++ en comparación con la anterior implementación en tiempo de ejecución. Además, ahora optimizamos las llamadas a métodos de `DataView` al compilar código JavaScript en TurboFan, lo que da como resultado un mejor rendimiento máximo para código caliente. Usar `DataView` ahora es tan eficiente como usar `TypedArray`, finalmente haciendo de `DataView` una opción viable en situaciones críticas para el rendimiento. Cubriremos esto en más detalle en una próxima publicación de blog sobre `DataView`, ¡así que mantente atento!

### Procesamiento más rápido de `WeakMap` durante la recolección de basura

V8 v6.9 reduce los tiempos de pausa de la recolección de basura Mark-Compact mejorando el procesamiento de `WeakMap`. La marcación concurrente e incremental ahora puede procesar `WeakMap`, mientras que anteriormente todo este trabajo se realizaba en la pausa atómica final de Mark-Compact GC. Dado que no todo el trabajo se puede mover fuera de la pausa, el GC ahora también hace más trabajo en paralelo para reducir aún más los tiempos de pausa. Estas optimizaciones esencialmente redujeron a la mitad el tiempo promedio de pausa para las recolecciones de basura Mark-Compact en [el Benchmark de Herramientas Web](https://github.com/v8/web-tooling-benchmark).

`WeakMap` utiliza un algoritmo de iteración de punto fijo que puede degradarse a un comportamiento de tiempo de ejecución cuadrático en ciertos casos. Con la nueva versión, V8 ahora puede cambiar a otro algoritmo que garantiza finalizar en tiempo lineal si el GC no termina dentro de un cierto número de iteraciones. Anteriormente, se podían construir ejemplos de peor caso que llevaban al GC unos segundos en finalizar incluso con un montón relativamente pequeño, mientras que el algoritmo lineal finaliza en unos pocos milisegundos.

## Características del lenguaje JavaScript

V8 v6.9 es compatible con [`Array.prototype.flat` y `Array.prototype.flatMap`](/features/array-flat-flatmap).

`Array.prototype.flat` aplana un array dado de forma recursiva hasta la `profundidad` especificada, que por defecto es `1`:

```js
// Aplana un nivel:
const array = [1, [2, [3]]];
array.flat();
// → [1, 2, [3]]

// Aplana recursivamente hasta que el array no contenga más arrays anidados:
array.flat(Infinity);
// → [1, 2, 3]
```

`Array.prototype.flatMap` es como `Array.prototype.map`, excepto que aplana el resultado en un nuevo array.

```js
[2, 3, 4].flatMap((x) => [x, x * 2]);
// → [2, 4, 3, 6, 4, 8]
```

Para más detalles, consulta [nuestra explicación de `Array.prototype.{flat,flatMap}`](/features/array-flat-flatmap).

## API de V8

Por favor utiliza `git log branch-heads/6.8..branch-heads/6.9 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 6.9 -t branch-heads/6.9` para experimentar con las nuevas características en V8 v6.9. Alternativamente puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas funcionalidades pronto tú mismo.
