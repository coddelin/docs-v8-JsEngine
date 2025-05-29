---
title: 'Lanzamiento de V8 v7.1'
author: 'Stephan Herhut ([@herhut](https://twitter.com/herhut)), clonador clonado de clones'
avatars:
  - stephan-herhut
date: 2018-10-31 15:44:37
tags:
  - lanzamiento
description: 'V8 v7.1 incorpora manejadores de bytecode embebidos, análisis de escape mejorado en TurboFan, postMessage(wasmModule), Intl.RelativeTimeFormat y globalThis!'
tweet: '1057645773465235458'
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se deriva del maestro de Git de V8 justo antes de un hito de Chrome Beta. Hoy estamos encantados de anunciar nuestra última rama, [V8 versión 7.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.1), que está en beta hasta su lanzamiento en coordinación con Chrome 71 Stable en varias semanas. V8 v7.1 está lleno de todo tipo de novedades para los desarrolladores. Este artículo ofrece un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## Memoria

Siguiendo el trabajo de v6.9/v7.0 para [embeber funciones directamente en el binario](/blog/embedded-builtins), los manejadores de bytecode para el intérprete ahora también están [embebidos en el binario](https://bugs.chromium.org/p/v8/issues/detail?id=8068). Esto ahorra alrededor de 200 KB en promedio por aislamiento.

## Rendimiento

El análisis de escape en TurboFan, que realiza sustituciones escalares para objetos que son locales a una unidad de optimización, se mejoró para también [manejar contextos de funciones locales para funciones de orden superior](https://bit.ly/v8-turbofan-context-sensitive-js-operators) cuando las variables del contexto circundante se escapan a un cierre local. Considera el siguiente ejemplo:

```js
function mapAdd(a, x) {
  return a.map(y => y + x);
}
```

Nota que `x` es una variable libre del cierre local `y => y + x`. V8 v7.1 ahora puede eliminar completamente la asignación del contexto de `x`, obteniendo una mejora de hasta **40%** en algunos casos.

![Mejora de rendimiento con el nuevo análisis de escape (menor es mejor)](/_img/v8-release-71/improved-escape-analysis.svg)

El análisis de escape ahora también puede eliminar algunos casos de acceso por índice a matrices locales. Aquí hay un ejemplo:

```js
function sum(...args) {
  let total = 0;
  for (let i = 0; i < args.length; ++i)
    total += args[i];
  return total;
}

function sum2(x, y) {
  return sum(x, y);
}
```

Nota que los `args` son locales de `sum2` (asumiendo que `sum` se integra en `sum2`). En V8 v7.1, TurboFan ahora puede eliminar completamente la asignación de `args` y reemplazar el acceso por índice de variables `args[i]` con una operación ternaria de la forma `i === 0 ? x : y`. Esto aporta una mejora de ~2% en el benchmark JetStream/EarleyBoyer. Podríamos extender esta optimización para matrices con más de dos elementos en el futuro.

## Clonación estructurada de módulos Wasm

Finalmente, se ha añadido soporte para [`postMessage` en módulos Wasm](https://github.com/WebAssembly/design/pull/1074). Los objetos `WebAssembly.Module` ahora pueden ser enviados con `postMessage` a los web workers. Para aclarar, esto está limitado solo a web workers (mismo proceso, diferente hilo), y no se extiende a escenarios entre procesos (como `postMessage` entre orígenes o web workers compartidos).

## Características del lenguaje JavaScript

[La API `Intl.RelativeTimeFormat`](/features/intl-relativetimeformat) permite la formateo localizado de tiempos relativos (por ejemplo, “ayer”, “hace 42 segundos” o “en 3 meses”) sin sacrificar el rendimiento. Aquí hay un ejemplo:

```js
// Crea un formateador de tiempo relativo para el idioma inglés que
// no siempre tiene que usar valores numéricos en la salida.
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → 'yesterday'

rtf.format(0, 'day');
// → 'today'

rtf.format(1, 'day');
// → 'tomorrow'

rtf.format(-1, 'week');
// → 'last week'

rtf.format(0, 'week');
// → 'this week'

rtf.format(1, 'week');
// → 'next week'
```

Lee [nuestro artículo explicativo sobre `Intl.RelativeTimeFormat`](/features/intl-relativetimeformat) para obtener más información.

V8 v7.1 también añade soporte para [la propuesta `globalThis`](/features/globalthis), que habilita un mecanismo universal para acceder al objeto global incluso en funciones estrictas o módulos independientemente de la plataforma.

## API de V8

Por favor usa `git log branch-heads/7.0..branch-heads/7.1 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 7.1 -t branch-heads/7.1` para experimentar con las nuevas características de V8 v7.1. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características pronto.
