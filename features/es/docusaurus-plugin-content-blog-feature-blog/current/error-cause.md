---
title: &apos;Causas de errores&apos;
author: &apos;Victor Gomes ([@VictorBFG](https://twitter.com/VictorBFG))&apos;
avatars:
  - &apos;victor-gomes&apos;
date: 2021-07-07
tags:
  - ECMAScript
description: &apos;JavaScript ahora admite causas de errores.&apos;
tweet: &apos;1412774651558862850&apos;
---

Imagina que tienes una función que llama a dos cargas de trabajo separadas `doSomeWork` y `doMoreWork`. Ambas funciones pueden lanzar el mismo tipo de errores, pero necesitas manejarlos de diferentes maneras.

Atrapar el error y lanzarlo con información adicional contextual es un enfoque común para este problema, por ejemplo:

```js
function doWork() {
  try {
    doSomeWork();
  } catch (err) {
    throw new CustomError(&apos;Fallo en el trabajo&apos;, err);
  }
  doMoreWork();
}

try {
  doWork();
} catch (err) {
  // ¿Proviene |err| de |doSomeWork| o de |doMoreWork|?
}
```

Desafortunadamente, la solución anterior es laboriosa, ya que uno necesita crear su propio `CustomError`. Y, aún peor, ninguna herramienta de desarrollo es capaz de proporcionar mensajes de diagnóstico útiles para excepciones inesperadas, ya que no hay consenso sobre cómo representar correctamente estos errores.

<!--truncate-->
Lo que ha faltado hasta ahora es una forma estándar de encadenar errores. JavaScript ahora admite causas de errores. Se puede agregar un parámetro adicional de opciones al constructor `Error` con una propiedad `cause`, cuyo valor se asignará a las instancias de error. Los errores se pueden encadenar fácilmente después de esto.

```js
function doWork() {
  try {
    doSomeWork();
  } catch (err) {
    throw new Error(&apos;Fallo en el trabajo&apos;, { cause: err });
  }
  try {
    doMoreWork();
  } catch (err) {
    throw new Error(&apos;Fallo en más trabajo&apos;, { cause: err });
  }
}

try {
  doWork();
} catch (err) {
  switch(err.message) {
    case &apos;Fallo en el trabajo&apos;:
      handleSomeWorkFailure(err.cause);
      break;
    case &apos;Fallo en más trabajo&apos;:
      handleMoreWorkFailure(err.cause);
      break;
  }
}
```

Esta función está disponible en V8 v9.3.

## Soporte para causas de errores

<feature-support chrome="93 https://chromium-review.googlesource.com/c/v8/v8/+/2784681"
                 firefox="91 https://bugzilla.mozilla.org/show_bug.cgi?id=1679653"
                 safari="15 https://bugs.webkit.org/show_bug.cgi?id=223302"
                 nodejs="no"
                 babel="no"></feature-support>
