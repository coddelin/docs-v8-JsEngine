---
title: 'Lanzamiento de V8 v5.6'
author: 'el equipo de V8'
date: 2016-12-02 13:33:37
tags:
  - lanzamiento
description: 'V8 v5.6 viene con una nueva canalización de compiladores, mejoras en el rendimiento y mayor soporte para las características del lenguaje ECMAScript.'
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se deriva del maestro Git de V8 inmediatamente antes de un hito de Chrome Beta. Hoy nos complace anunciar nuestra rama más reciente, [V8 versión 5.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.6), que estará en beta hasta que se lance en coordinación con Chrome 56 Stable en varias semanas. V8 5.6 está lleno de todo tipo de mejoras para desarrolladores, así que queremos darles un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## Canalización de Ignition y TurboFan para ES.next (y más) implementada

A partir de la versión 5.6, V8 puede optimizar la totalidad del lenguaje JavaScript. Además, muchas características del lenguaje pasan por una nueva canalización de optimización en V8. Esta canalización utiliza el [intérprete Ignition de V8](/blog/ignition-interpreter) como base y optimiza los métodos que se ejecutan frecuentemente con el más potente [compilador optimizador TurboFan de V8](/docs/turbofan). La nueva canalización se activa para nuevas características del lenguaje (por ejemplo, muchas de las nuevas características de las especificaciones ES2015 y ES2016) o siempre que Crankshaft ([el compilador optimizador “clásico” de V8](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html)) no pueda optimizar un método (por ejemplo, try-catch, with).

¿Por qué estamos dirigiendo solo algunas características del lenguaje JavaScript a través de la nueva canalización? La nueva canalización está mejor adaptada para optimizar todo el espectro del lenguaje JS (pasado y presente). Es una base de código más saludable y moderna, y ha sido diseñada específicamente para casos de uso reales, incluyendo la ejecución de V8 en dispositivos con poca memoria.

Hemos comenzado a usar Ignition/TurboFan con las características más recientes de ES.next que hemos agregado a V8 (ES.next = características de JavaScript especificadas en ES2015 y posteriores) y dirigiremos más características a través de ella a medida que sigamos mejorando su rendimiento. En el mediano plazo, el equipo de V8 tiene como objetivo cambiar toda la ejecución de JavaScript en V8 a la nueva canalización. Sin embargo, mientras sigan existiendo casos de uso reales donde Crankshaft ejecute JavaScript más rápido que la nueva canalización Ignition/TurboFan, en el corto plazo admitiremos ambas canalizaciones para garantizar que el código JavaScript que se ejecuta en V8 sea lo más rápido posible en todas las situaciones.

Entonces, ¿por qué la nueva canalización utiliza tanto el nuevo intérprete Ignition como el nuevo compilador optimizador TurboFan? Ejecutar JavaScript de manera rápida y eficiente requiere tener múltiples mecanismos, o niveles, bajo el capó en una máquina virtual de JavaScript para realizar el trabajo pesado de ejecución. Por ejemplo, es útil tener un primer nivel que comience a ejecutar el código rápidamente y luego un segundo nivel optimizador que dedique más tiempo a compilar funciones importantes para maximizar el rendimiento de código que se ejecuta durante más tiempo.

Ignition y TurboFan son los dos nuevos niveles de ejecución de V8 que son más efectivos cuando se utilizan juntos. Debido a consideraciones de eficiencia, simplicidad y tamaño, TurboFan está diseñado para optimizar los métodos de JavaScript a partir de los [bytecodes](https://en.wikipedia.org/wiki/Bytecode) producidos por el intérprete Ignition de V8. Al diseñar ambos componentes para trabajar estrechamente juntos, se pueden realizar optimizaciones en ambos debido a la presencia del otro. Como resultado, a partir de la versión 5.6, todas las funciones que serán optimizadas por TurboFan primero pasan por el intérprete Ignition. Usar esta canalización unificada Ignition/TurboFan permite la optimización de características que en el pasado no eran optimizables, ya que ahora pueden aprovechar las pasadas de optimización de TurboFan. Por ejemplo, al dirigir los [Generadores](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) tanto a través de Ignition como de TurboFan, el rendimiento en tiempo de ejecución de los Generadores casi se ha triplicado.

Para obtener más información sobre el camino de V8 hacia la adopción de Ignition y TurboFan, eche un vistazo a [la publicación dedicada de blog de Benedikt](https://benediktmeurer.de/2016/11/25/v8-behind-the-scenes-november-edition/).

## Mejoras de rendimiento

V8 v5.6 ofrece una serie de mejoras clave en memoria y rendimiento.

### Reducción del jank inducido por memoria

Se introdujo el [filtrado concurrente del conjunto recordado](https://bugs.chromium.org/p/chromium/issues/detail?id=648568): Un paso más hacia [Orinoco](/blog/orinoco).

### Rendimiento enormemente mejorado para ES2015

Los desarrolladores suelen comenzar a usar nuevas características del lenguaje con la ayuda de transpiladores debido a dos desafíos: compatibilidad hacia atrás y preocupaciones de rendimiento.

El objetivo de V8 es reducir la brecha de rendimiento entre los transpiladores y el rendimiento "nativo" de ES.next de V8 para eliminar este desafío. Hemos logrado un gran progreso en llevar el rendimiento de las nuevas características del lenguaje al nivel de sus equivalentes transpilados de ES5. En esta versión encontrarás que el rendimiento de las características de ES2015 es significativamente más rápido que en versiones anteriores de V8, y en algunos casos el rendimiento de las características de ES2015 se está acercando al de los equivalentes transpilados de ES5.

Particularmente, el operador [spread](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Operators/Spread_operator) debería estar listo para ser usado de manera nativa. En lugar de escribir…

```js
// Como Math.max, pero devuelve 0 en lugar de -∞ si no hay argumentos.
function specialMax(...args) {
  if (args.length === 0) return 0;
  return Math.max.apply(Math, args);
}
```

…ahora puedes escribir…

```js
function specialMax(...args) {
  if (args.length === 0) return 0;
  return Math.max(...args);
}
```

…y obtener resultados de rendimiento similares. En particular, V8 v5.6 incluye mejoras en velocidad para los siguientes microbenchmarks:

- [destructuring](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring)
- [destructuring-array](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring-array)
- [destructuring-string](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring-string)
- [for-of-array](https://github.com/fhinkel/six-speed/tree/master/tests/for-of-array)
- [generator](https://github.com/fhinkel/six-speed/tree/master/tests/generator)
- [spread](https://github.com/fhinkel/six-speed/tree/master/tests/spread)
- [spread-generator](https://github.com/fhinkel/six-speed/tree/master/tests/spread-generator)
- [spread-literal](https://github.com/fhinkel/six-speed/tree/master/tests/spread-literal)

Consulta el gráfico a continuación para una comparación entre V8 v5.4 y v5.6.

![Comparando el rendimiento de las características de ES2015 entre V8 v5.4 y v5.6 con [SixSpeed](https://fhinkel.github.io/six-speed/)](/_img/v8-release-56/perf.png)

Esto es solo el comienzo; ¡hay mucho más por venir en las próximas versiones!

## Características del lenguaje

### `String.prototype.padStart` / `String.prototype.padEnd`

[`String.prototype.padStart`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart) y [`String.prototype.padEnd`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd) son las últimas adiciones de nivel 4 a ECMAScript. Estas funciones de biblioteca se lanzan oficialmente en v5.6.

:::note
**Nota:** Lanzadas nuevamente.
:::

## Vista previa de navegador de WebAssembly

Chromium 56 (que incluye V8 v5.6) va a lanzar la vista previa del navegador de WebAssembly. Por favor, consulta [la publicación de blog dedicada](/blog/webassembly-browser-preview) para más información.

## API de V8

Consulta nuestro [resumen de cambios en la API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento se actualiza regularmente unas semanas después de cada lanzamiento importante.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 5.6 -t branch-heads/5.6` para experimentar con las nuevas características de V8 v5.6. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características pronto tú mismo.
