---
title: &apos;Combinadores de Promesas&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-06-12
tags:
  - ECMAScript
  - ES2020
  - ES2021
  - io19
  - Node.js 16
description: &apos;JavaScript tiene cuatro combinadores de promesas: Promise.all, Promise.race, Promise.allSettled y Promise.any.&apos;
tweet: &apos;1138819493956710400&apos;
---
Desde la introducción de las promesas en ES2015, JavaScript ha soportado exactamente dos combinadores de promesas: los métodos estáticos `Promise.all` y `Promise.race`.

Actualmente, dos nuevas propuestas están atravesando el proceso de estandarización: `Promise.allSettled`, y `Promise.any`. Con estas adiciones, habrá un total de cuatro combinadores de promesas en JavaScript, cada uno permitiendo diferentes casos de uso.

<!--truncate-->
Aquí tienes una visión general de los cuatro combinadores:


| nombre                                     | descripción                                        | estado                                                          |
| ------------------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------- |
| [`Promise.allSettled`](#promise.allsettled) | no se detiene en el primer fallo                  | [añadido en ES2020 ✅](https://github.com/tc39/proposal-promise-allSettled) |
| [`Promise.all`](#promise.all)               | se detiene cuando un valor de entrada es rechazado | añadido en ES2015 ✅                                              |
| [`Promise.race`](#promise.race)             | se detiene cuando un valor de entrada se resuelve  | añadido en ES2015 ✅                                              |
| [`Promise.any`](#promise.any)               | se detiene cuando un valor de entrada se cumple    | [añadido en ES2021 ✅](https://github.com/tc39/proposal-promise-any)        |


Vamos a ver un caso de uso para cada combinador.

## `Promise.all`

<feature-support chrome="32"
                 firefox="29"
                 safari="8"
                 nodejs="0.12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.all` te permite saber cuándo todas las promesas de entrada han sido cumplidas o cuándo una de ellas ha sido rechazada.

Imagina que un usuario hace clic en un botón y quieres cargar algunos estilos para poder renderizar una interfaz de usuario completamente nueva. Este programa inicia una solicitud HTTP para cada hoja de estilo en paralelo:

```js
const promises = [
  fetch(&apos;/component-a.css&apos;),
  fetch(&apos;/component-b.css&apos;),
  fetch(&apos;/component-c.css&apos;),
];
try {
  const styleResponses = await Promise.all(promises);
  enableStyles(styleResponses);
  renderNewUi();
} catch (reason) {
  displayError(reason);
}
```

Solo quieres empezar a renderizar la nueva interfaz de usuario una vez que _todas_ las solicitudes hayan tenido éxito. Si algo sale mal, prefieres mostrar un mensaje de error lo antes posible, sin esperar a que termine el resto del trabajo.

En tal caso, podrías usar `Promise.all`: quieres saber cuándo todas las promesas han sido cumplidas, _o_ tan pronto como una de ellas sea rechazada.

## `Promise.race`

<feature-support chrome="32"
                 firefox="29"
                 safari="8"
                 nodejs="0.12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.race` es útil si quieres ejecutar múltiples promesas, y ya sea…

1. hacer algo con el primer resultado exitoso que llegue (en caso de que se cumpla alguna de las promesas), _o_
1. hacer algo tan pronto como una de las promesas sea rechazada.

Es decir, si una de las promesas es rechazada, quieres preservar ese rechazo para tratar el caso de error por separado. El siguiente ejemplo hace exactamente eso:

```js
try {
  const result = await Promise.race([
    performHeavyComputation(),
    rejectAfterTimeout(2000),
  ]);
  renderResult(result);
} catch (error) {
  renderError(error);
}
```

Iniciamos una tarea computacionalmente costosa que podría tomar mucho tiempo, pero la comparamos con una promesa que rechaza después de 2 segundos. Dependiendo de cuál promesa se cumpla o rechace primero, renderizamos el resultado calculado o el mensaje de error en dos rutas de código separadas.

## `Promise.allSettled`

<feature-support chrome="76"
                 firefox="71 https://bugzilla.mozilla.org/show_bug.cgi?id=1549176"
                 safari="13"
                 nodejs="12.9.0 https://nodejs.org/en/blog/release/v12.9.0/"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.allSettled` te da una señal cuando todas las promesas de entrada están _resueltas_, lo que significa que están _cumplidas_ o _rechazadas_. Esto es útil en casos donde no te importa el estado de la promesa, solo quieres saber cuándo el trabajo está terminado, sin importar el éxito o el fallo.

Por ejemplo, puedes iniciar una serie de llamadas API independientes y usar `Promise.allSettled` para asegurarte de que todas se completen antes de hacer algo más, como eliminar un indicador de carga:

```js
const promises = [
  fetch(&apos;/api-call-1&apos;),
  fetch(&apos;/api-call-2&apos;),
  fetch(&apos;/api-call-3&apos;),
];
// Imagina que algunas de estas solicitudes fallan y otras tienen éxito.

await Promise.allSettled(promises);
// Todas las llamadas API han terminado (ya sea que hayan fallado o tenido éxito).
removeLoadingIndicator();
```

## `Promise.any`

<feature-support chrome="85 https://bugs.chromium.org/p/v8/issues/detail?id=9808"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1568903"
                 safari="14 https://bugs.webkit.org/show_bug.cgi?id=202566"
                 nodejs="16"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.any` te proporciona una señal tan pronto como una de las promesas se cumple. Esto es similar a `Promise.race`, excepto que `any` no rechaza anticipadamente cuando una de las promesas falla.

```js
const promises = [
  fetch(&apos;/endpoint-a&apos;).then(() => &apos;a&apos;),
  fetch(&apos;/endpoint-b&apos;).then(() => &apos;b&apos;),
  fetch(&apos;/endpoint-c&apos;).then(() => &apos;c&apos;),
];
try {
  const first = await Promise.any(promises);
  // Alguna de las promesas fue cumplida.
  console.log(first);
  // → por ejemplo, &apos;b&apos;
} catch (error) {
  // Todas las promesas fueron rechazadas.
  console.assert(error instanceof AggregateError);
  // Registrar los valores de rechazo:
  console.log(error.errors);
  // → [
  //     <TypeError: Failed to fetch /endpoint-a>,
  //     <TypeError: Failed to fetch /endpoint-b>,
  //     <TypeError: Failed to fetch /endpoint-c>
  //   ]
}
```

Este ejemplo de código verifica qué endpoint responde más rápido y luego lo registra. Solo si _todas_ las solicitudes fallan terminamos en el bloque `catch`, donde podemos manejar los errores.

Los rechazos de `Promise.any` pueden representar múltiples errores a la vez. Para admitir esto a nivel de lenguaje, se introduce un nuevo tipo de error llamado `AggregateError`. Además de su uso básico en el ejemplo anterior, los objetos `AggregateError` también pueden ser construidos programáticamente, al igual que otros tipos de errores:

```js
const aggregateError = new AggregateError([errorA, errorB, errorC], &apos;¡Algo salió mal!&apos;);
```
