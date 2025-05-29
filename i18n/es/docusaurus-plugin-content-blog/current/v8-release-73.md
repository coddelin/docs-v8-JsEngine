---
title: "Lanzamiento de V8 v7.3"
author: "Clemens Backes, encargado del compilador"
avatars: 
  - clemens-backes
date: "2019-02-07 11:30:42"
tags: 
  - lanzamiento
description: "¡V8 v7.3 incluye mejoras en el rendimiento de WebAssembly y async, rastros de stacks async, Object.fromEntries, String#matchAll, y mucho más!"
tweet: "1093457099441561611"
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se ramifica desde el maestro de Git de V8 inmediatamente antes de un hito de Chrome Beta. Hoy nos complace anunciar nuestra rama más reciente, [V8 versión 7.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.3), que está en beta hasta su lanzamiento en coordinación con Chrome 73 Stable en varias semanas. V8 v7.3 está llena de toda clase de novedades orientadas a desarrolladores. Esta publicación proporciona una vista previa de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## Rastros de stack async

Hemos activado [el flag `--async-stack-traces`](/blog/fast-async#improved-developer-experience) de forma predeterminada. Los [rastros de stack async sin costo](https://bit.ly/v8-zero-cost-async-stack-traces) facilitan el diagnóstico de problemas en producción con código altamente asíncrono, ya que la propiedad `error.stack` que generalmente se envía a archivos de registro/servicios ahora proporciona más información sobre lo que causó el problema.

## `await` más rápido

Relacionado con el flag `--async-stack-traces` mencionado anteriormente, también estamos habilitando el flag `--harmony-await-optimization` de forma predeterminada, que es un prerequisito para los `--async-stack-traces`. Consulta [funciones y promesas async más rápidas](/blog/fast-async#await-under-the-hood) para obtener más detalles.

## Inicio más rápido de Wasm

A través de optimizaciones en los internals de Liftoff, hemos mejorado significativamente la velocidad de compilación de WebAssembly sin afectar la calidad del código generado. Para la mayoría de las cargas de trabajo, el tiempo de compilación se redujo entre un 15 y un 25%.

![Tiempo de compilación de Liftoff en [el demo de Epic ZenGarden](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html)](/_img/v8-release-73/liftoff-epic.svg)

## Características del lenguaje JavaScript

V8 v7.3 viene con varias nuevas características del lenguaje JavaScript.

### `Object.fromEntries`

La API `Object.entries` no es nada nueva:

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]
```

Desafortunadamente, no había una forma sencilla de volver del resultado `entries` a un objeto equivalente… ¡hasta ahora! V8 v7.3 soporta [`Object.fromEntries()`](/features/object-fromentries), una nueva API integrada que realiza la operación inversa de `Object.entries`:

```js
const result = Object.fromEntries(entries);
// → { x: 42, y: 50 }
```

Para más información y casos de uso de ejemplo, consulta [nuestra explicación de la característica `Object.fromEntries`](/features/object-fromentries).

### `String.prototype.matchAll`

Un caso de uso común de las expresiones regulares globales (`g`) o con adherencia (`y`) es aplicarlas a una cadena e iterar a través de todas las coincidencias. La nueva API `String.prototype.matchAll` hace esto más fácil que nunca, especialmente para expresiones regulares con grupos de captura:

```js
const string = 'Repositorios favoritos de GitHub: tc39/ecma262 v8/v8.dev';
const regex = /\b(?<owner>[a-z0-9]+)\/(?<repo>[a-z0-9\.]+)\b/g;

for (const match of string.matchAll(regex)) {
  console.log(`${match[0]} en ${match.index} con '${match.input}'`);
  console.log(`→ propietario: ${match.groups.owner}`);
  console.log(`→ repositorio: ${match.groups.repo}`);
}

// Salida:
//
// tc39/ecma262 en 23 con 'Repositorios favoritos de GitHub: tc39/ecma262 v8/v8.dev'
// → propietario: tc39
// → repositorio: ecma262
// v8/v8.dev en 36 con 'Repositorios favoritos de GitHub: tc39/ecma262 v8/v8.dev'
// → propietario: v8
// → repositorio: v8.dev
```

Para más detalles, lee [nuestra explicación de la característica `String.prototype.matchAll`](/features/string-matchall).

### `Atomics.notify`

`Atomics.wake` ha sido renombrado a `Atomics.notify`, en conformidad con [un cambio reciente en la especificación](https://github.com/tc39/ecma262/pull/1220).

## API de V8

Usa `git log branch-heads/7.2..branch-heads/7.3 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 7.3 -t branch-heads/7.3` para experimentar con las nuevas características en V8 v7.3. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características pronto.
