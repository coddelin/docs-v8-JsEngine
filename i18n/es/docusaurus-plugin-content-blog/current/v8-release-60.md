---
title: &apos;V8 lanzamiento v6.0&apos;
author: &apos;el equipo de V8&apos;
date: 2017-06-09 13:33:37
tags:
  - lanzamiento
description: &apos;V8 v6.0 viene con varias mejoras de rendimiento e introduce soporte para `SharedArrayBuffer`s y propiedades de reposo/dispersión de objetos.&apos;
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se ramifica desde el maestro de Git de V8 inmediatamente antes de un hito de Chrome Beta. Hoy nos complace anunciar nuestra rama más reciente, [V8 versión 6.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.0), que estará en beta hasta que sea lanzada en coordinación con Chrome 60 Stable en varias semanas. V8 6.0 está lleno de todo tipo de beneficios para desarrolladores. Nos gustaría darles un adelanto de algunos de los aspectos más destacados en anticipación al lanzamiento.

<!--truncate-->
## `SharedArrayBuffer`s

V8 v6.0 introduce soporte para [`SharedArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer), un mecanismo de bajo nivel para compartir memoria entre trabajadores de JavaScript y sincronizar el flujo de control entre trabajadores. SharedArrayBuffers brindan acceso de JavaScript a memoria compartida, atómicos y futexes. SharedArrayBuffers también desbloquean la capacidad de portar aplicaciones con hilos al web mediante asm.js o WebAssembly.

Para un breve tutorial de bajo nivel, consulte la página de tutorial de la especificación [aquí](https://github.com/tc39/ecmascript_sharedmem/blob/master/TUTORIAL.md) o consulte la [documentación de Emscripten](https://kripken.github.io/emscripten-site/docs/porting/pthreads.html) para portar pthreads.

## Propiedades de reposo/dispersión de objetos

Este lanzamiento introduce propiedades de reposo para la asignación de desestructuración de objetos y propiedades de dispersión para literales de objetos. Las propiedades de reposo/dispersión de objetos son características de ES.next en la Etapa 3.

Las propiedades de dispersión también ofrecen una alternativa concisa a `Object.assign()` en muchas situaciones.

```js
// Propiedades de reposo para la asignación de desestructuración de objetos:
const person = {
  firstName: &apos;Sebastian&apos;,
  lastName: &apos;Markbåge&apos;,
  country: &apos;EE.UU.&apos;,
  state: &apos;CA&apos;,
};
const { firstName, lastName, ...rest } = person;
console.log(firstName); // Sebastian
console.log(lastName); // Markbåge
console.log(rest); // { country: &apos;EE.UU.&apos;, state: &apos;CA&apos; }

// Propiedades de dispersión para literales de objetos:
const personCopy = { firstName, lastName, ...rest };
console.log(personCopy);
// { firstName: &apos;Sebastian&apos;, lastName: &apos;Markbåge&apos;, country: &apos;EE.UU.&apos;, state: &apos;CA&apos; }
```

Para más información, consulte [nuestra explicación sobre las propiedades de reposo y dispersión de objetos](/features/object-rest-spread).

## Rendimiento de ES2015

V8 v6.0 continúa mejorando el rendimiento de las características de ES2015. Este lanzamiento contiene optimizaciones para las implementaciones de las características del lenguaje que en general resultan en una mejora de aproximadamente un 10% en la puntuación de V8 en [ARES-6](http://browserbench.org/ARES-6/).

## API de V8

Por favor, consulte nuestro [resumen de cambios de API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento se actualiza regularmente unas semanas después de cada lanzamiento importante.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 6.0 -t branch-heads/6.0` para experimentar con las nuevas características de V8 6.0. Alternativamente, pueden [suscribirse al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características pronto ustedes mismos.
