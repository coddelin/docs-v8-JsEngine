---
title: "Lanzamiento de V8 v5.7"
author: "el equipo de V8"
date: 2017-02-06 13:33:37
tags:
  - lanzamiento
description: "V8 v5.7 habilita WebAssembly por defecto e incluye mejoras de rendimiento y mayor soporte para características del lenguaje ECMAScript."
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se ramifica desde el repositorio maestro de Git de V8 inmediatamente antes de un hito Beta de Chrome. Hoy nos complace anunciar nuestra nueva rama, [V8 versión 5.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.7), que estará en beta hasta que sea lanzada en coordinación con Chrome 57 Estable en varias semanas. V8 5.7 está llena de todo tipo de beneficios visibles para los desarrolladores. Nos gustaría ofrecerte un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## Mejoras de rendimiento

### Funciones async nativas tan rápidas como las promesas

Las funciones async ahora son aproximadamente tan rápidas como el mismo código escrito con promesas. El rendimiento de ejecución de las funciones async se cuadruplicó según nuestros [microbenchmarks](https://codereview.chromium.org/2577393002). Durante el mismo período, el rendimiento general de las promesas también se duplicó.

![Mejoras de rendimiento de Async en V8 sobre Linux x64](/_img/v8-release-57/async.png)

### Continuas mejoras en ES2015

V8 sigue haciendo que las características del lenguaje ES2015 sean más rápidas para que los desarrolladores las utilicen sin incurrir en costos de rendimiento. El operador de propagación, la desestructuración y los generadores ahora son [aproximadamente tan rápidos como sus equivalentes ingenuos en ES5](https://fhinkel.github.io/six-speed/).

### RegExp un 15% más rápido

La migración de las funciones RegExp de una implementación en JavaScript autoalojada a una que se conecta con la arquitectura de generación de código de TurboFan ha generado un ~15% más de rendimiento general en RegExp. Más detalles pueden encontrarse en [la publicación de blog dedicada](/blog/speeding-up-regular-expressions).

## Características del lenguaje JavaScript

En esta versión se incluyen varios añadidos recientes a la biblioteca estándar de ECMAScript. Dos métodos de String, [`padStart`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart) y [`padEnd`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd), brindan características útiles de formateo de cadenas, mientras que [`Intl.DateTimeFormat.prototype.formatToParts`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat/formatToParts) permite a los autores personalizar el formato de fechas/horas de manera sensible a la configuración regional.

## WebAssembly habilitado

Chrome 57 (que incluye V8 v5.7) será la primera versión en habilitar WebAssembly por defecto. Para más detalles, consulta los documentos de inicio en [webassembly.org](http://webassembly.org/) y la documentación de la API en [MDN](https://developer.mozilla.org/en-US/docs/WebAssembly/API).

## Adiciones a la API de V8

Por favor, consulta nuestro [resumen de cambios en la API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento se actualiza regularmente unas semanas después de cada lanzamiento importante. Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 5.7 -t branch-heads/5.7` para experimentar con las nuevas características en V8 v5.7. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características tú mismo pronto.

### `PromiseHook`

Esta API en C++ permite a los usuarios implementar código de perfilado que rastrea el ciclo de vida de las promesas. Esto habilita la próxima [API AsyncHook de Node](https://github.com/nodejs/node-eps/pull/18) que permite construir [propagación de contexto async](https://docs.google.com/document/d/1tlQ0R6wQFGqCS5KeIw0ddoLbaSYx6aU7vyXOkv-wvlM/edit#).

La API `PromiseHook` proporciona cuatro ganchos de ciclo de vida: init, resolve, before y after. El gancho init se ejecuta cuando se crea una nueva promesa; el gancho resolve se ejecuta cuando una promesa se resuelve; los ganchos pre y post se ejecutan justo antes y después de un [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob). Para más información, consulta el [issue de seguimiento](https://bugs.chromium.org/p/v8/issues/detail?id=4643) y el [documento de diseño](https://docs.google.com/document/d/1rda3yKGHimKIhg5YeoAmCOtyURgsbTH_qaYR79FELlk/edit).
