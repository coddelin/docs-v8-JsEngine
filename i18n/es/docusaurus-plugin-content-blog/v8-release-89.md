---
title: "Lanzamiento de V8 v8.9"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), esperando una llamada"
avatars: 
 - "ingvar-stepanyan"
date: 2021-02-04
tags: 
 - lanzamiento
description: "El lanzamiento de V8 v8.9 trae mejoras de rendimiento para llamadas con desajuste en el tamaño de los argumentos."
tweet: "1357358418902802434"
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](https://v8.dev/docs/release-process). Cada versión se ramifica desde el maestro de Git de V8 justo antes de un hito Beta de Chrome. Hoy nos complace anunciar nuestra rama más reciente, [V8 versión 8.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.9), que está en beta hasta su lanzamiento en coordinación con Chrome 89 Stable en varias semanas. V8 v8.9 está lleno de todo tipo de mejoras para los desarrolladores. Este artículo ofrece un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## JavaScript

### `await` en el nivel superior

[`await` en el nivel superior](https://v8.dev/features/top-level-await) está disponible en el [motor de renderizado Blink](https://www.chromium.org/blink) 89, un incorporador principal de V8.

En V8 independiente, `await` en el nivel superior sigue detrás del indicador `--harmony-top-level-await`.

Por favor consulta [nuestro explicador](https://v8.dev/features/top-level-await) para más detalles.

## Rendimiento

### Llamadas más rápidas con desajuste en el tamaño de los argumentos

JavaScript permite llamar a una función con un número diferente de argumentos del número esperado de parámetros, es decir, se pueden pasar menos o más argumentos que los parámetros formales declarados. El primer caso se llama subaplicación y el segundo sobreaplicación.

En el caso de la subaplicación, los parámetros restantes se asignan al valor `undefined`. En el caso de la sobreaplicación, los argumentos restantes pueden ser accedidos utilizando el parámetro rest y la propiedad `Function.prototype.arguments`, o simplemente son superfluos e ignorados. Muchos frameworks web y Node.js actuales usan esta característica de JavaScript para aceptar parámetros opcionales y crear una API más flexible.

Hasta hace poco, V8 tenía un mecanismo especial para tratar el desajuste de tamaño de los argumentos: el marco adaptador de argumentos. Desafortunadamente, la adaptación de argumentos tiene un costo en rendimiento y es comúnmente necesario en los frameworks modernos de front-end y middleware. Resulta que, con un diseño inteligente (como invertir el orden de los argumentos en la pila), podemos eliminar este marco adicional, simplificar la base de código de V8 y deshacernos del costo adicional casi por completo.

![Impacto en el rendimiento de eliminar el marco adaptador de argumentos, medido a través de una microprueba.](/_img/v8-release-89/perf.svg)

El gráfico muestra que ya no hay costo adicional cuando se ejecuta en [modo sin JIT](https://v8.dev/blog/jitless) (Ignition) con una mejora de rendimiento del 11.2%. Al usar TurboFan, obtenemos hasta un 40% de aceleración. El costo comparado con el caso sin desajuste se debe a una pequeña optimización en el [epílogo de la función](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/backend/x64/code-generator-x64.cc;l=4905;drc=5056f555010448570f7722708aafa4e55e1ad052). Para más detalles, consulta [el documento de diseño](https://docs.google.com/document/d/15SQV4xOhD3K0omGJKM-Nn8QEaskH7Ir1VYJb9_5SjuM/edit).

Si deseas saber más sobre los detalles detrás de estas mejoras, consulta el [artículo de blog dedicado](https://v8.dev/blog/adaptor-frame).

## API de V8

Por favor usa `git log branch-heads/8.8..branch-heads/8.9 include/v8.h` para obtener una lista de los cambios de la API.

Los desarrolladores con una copia activa de V8 pueden usar `git checkout -b 8.9 -t branch-heads/8.9` para experimentar con las nuevas características en V8 v8.9. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características pronto.
