---
title: "`String.prototype.matchAll`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-02-02
tags: 
  - ECMAScript
  - ES2020
  - io19
description: "String.prototype.matchAll facilita iterar por todos los objetos de coincidencia que produce una expresión regular dada."
---
Es común aplicar repetidamente la misma expresión regular en una cadena para obtener todas las coincidencias. Hasta cierto punto, esto ya es posible hoy en día utilizando el método `String#match`.

En este ejemplo, encontramos todas las palabras que consisten únicamente en dígitos hexadecimales y luego registramos cada coincidencia:

```js
const string = 'Números hex mágicos: DEADBEEF CAFE';
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
for (const match of string.match(regex)) {
  console.log(match);
}

// Salida:
//
// 'DEADBEEF'
// 'CAFE'
```

Sin embargo, esto solo te da las _subcadenas_ que coinciden. Normalmente, no solo quieres las subcadenas, también deseas información adicional como el índice de cada subcadena o los grupos de captura dentro de cada coincidencia.

Ya es posible lograr esto escribiendo tu propio bucle y haciendo un seguimiento de los objetos de coincidencia tú mismo, pero es un poco tedioso y no muy conveniente:

```js
const string = 'Números hex mágicos: DEADBEEF CAFE';
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
let match;
while (match = regex.exec(string)) {
  console.log(match);
}

// Salida:
//
// [ 'DEADBEEF', índice: 19, entrada: 'Números hex mágicos: DEADBEEF CAFE' ]
// [ 'CAFE',     índice: 28, entrada: 'Números hex mágicos: DEADBEEF CAFE' ]
```

La nueva API `String#matchAll` lo hace más fácil que nunca: ahora puedes escribir un simple bucle `for`-`of` para obtener todos los objetos de coincidencia.

```js
const string = 'Números hex mágicos: DEADBEEF CAFE';
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
for (const match of string.matchAll(regex)) {
  console.log(match);
}

// Salida:
//
// [ 'DEADBEEF', índice: 19, entrada: 'Números hex mágicos: DEADBEEF CAFE' ]
// [ 'CAFE',     índice: 28, entrada: 'Números hex mágicos: DEADBEEF CAFE' ]
```

`String#matchAll` es especialmente útil para expresiones regulares con grupos de captura. Te proporciona toda la información de cada coincidencia individual, incluidos los grupos de captura.

```js
const string = 'Repositorios favoritos de GitHub: tc39/ecma262 v8/v8.dev';
const regex = /\b(?<owner>[a-z0-9]+)\/(?<repo>[a-z0-9\.]+)\b/g;
for (const match of string.matchAll(regex)) {
  console.log(`${match[0]} en ${match.index} con '${match.input}'`);
  console.log(`→ owner: ${match.groups.owner}`);
  console.log(`→ repo: ${match.groups.repo}`);
}

<!--truncate-->
// Salida:
//
// tc39/ecma262 en 23 con 'Repositorios favoritos de GitHub: tc39/ecma262 v8/v8.dev'
// → owner: tc39
// → repo: ecma262
// v8/v8.dev en 36 con 'Repositorios favoritos de GitHub: tc39/ecma262 v8/v8.dev'
// → owner: v8
// → repo: v8.dev
```

La idea general es que simplemente escribes un bucle `for`-`of` sencillo, y `String#matchAll` se encarga del resto por ti.

:::note
**Nota:** Como su nombre lo indica, `String#matchAll` está destinado a iterar por _todos_ los objetos de coincidencia. Por lo tanto, debería usarse con expresiones regulares globales, es decir, aquellas con el indicador `g` establecido, ya que cualquier expresión regular no global solo produciría una única coincidencia (como máximo). Llamar a `matchAll` con un `RegExp` no global resulta en una excepción `TypeError`.
:::

## Soporte para `String.prototype.matchAll`

<feature-support chrome="73 /blog/v8-release-73#string.prototype.matchall"
                 firefox="67"
                 safari="13"
                 nodejs="12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
