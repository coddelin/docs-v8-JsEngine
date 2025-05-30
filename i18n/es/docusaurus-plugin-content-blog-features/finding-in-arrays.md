---
title: "Encontrar elementos en `Array`s y TypedArrays"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu))"
avatars: 
  - "shu-yu-guo"
date: 2021-10-27
tags: 
  - ECMAScript
description: "Métodos de JavaScript para encontrar elementos en Arrays y TypedArrays"
tweet: "1453354998063149066"
---
## Encontrar elementos desde el principio

Encontrar un elemento que cumpla alguna condición en un `Array` es una tarea común y se realiza con los métodos `find` y `findIndex` en `Array.prototype` y los diversos prototipos de TypedArray. `Array.prototype.find` toma un predicado y devuelve el primer elemento en el array para el cual ese predicado devuelve `true`. Si el predicado no devuelve `true` para ningún elemento, el método retorna `undefined`.

<!--truncate-->
```js
const inputArray = [{v:1}, {v:2}, {v:3}, {v:4}, {v:5}];
inputArray.find((element) => element.v % 2 === 0);
// → {v:2}
inputArray.find((element) => element.v % 7 === 0);
// → undefined
```

`Array.prototype.findIndex` funciona de manera similar, excepto que devuelve el índice cuando se encuentra, y `-1` cuando no se encuentra. Las versiones de TypedArray de `find` y `findIndex` funcionan exactamente igual, con la única diferencia de que operan sobre instancias de TypedArray en lugar de instancias de Array.

```js
inputArray.findIndex((element) => element.v % 2 === 0);
// → 1
inputArray.findIndex((element) => element.v % 7 === 0);
// → -1
```

## Encontrar elementos desde el final

¿Qué pasa si quieres encontrar el último elemento en el `Array`? Este caso de uso a menudo surge de forma natural, como al decidir desduplicar múltiples coincidencias en favor del último elemento, o al saber de antemano que el elemento probablemente esté cerca del final del `Array`. Con el método `find`, una solución es invertir primero la entrada, de esta manera:

```js
inputArray.reverse().find(predicate)
```

Sin embargo, eso invierte el `inputArray` original en su lugar, lo cual a veces no es deseable.

Con los métodos `findLast` y `findLastIndex`, este caso de uso puede resolverse directamente y de forma ergonómica. Se comportan exactamente como sus contrapartes `find` y `findIndex`, excepto que comienzan su búsqueda desde el final del `Array` o TypedArray.

```js
const inputArray = [{v:1}, {v:2}, {v:3}, {v:4}, {v:5}];
inputArray.findLast((element) => element.v % 2 === 0);
// → {v:4}
inputArray.findLast((element) => element.v % 7 === 0);
// → undefined
inputArray.findLastIndex((element) => element.v % 2 === 0);
// → 3
inputArray.findLastIndex((element) => element.v % 7 === 0);
// → -1
```

## Compatibilidad de `findLast` y `findLastIndex`

<feature-support chrome="97"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1704385"
                 safari="partial https://bugs.webkit.org/show_bug.cgi?id=227939"
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#array-find-from-last"></feature-support>
