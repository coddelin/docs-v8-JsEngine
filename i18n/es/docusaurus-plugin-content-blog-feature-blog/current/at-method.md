---
title: "Método `at` para indexación relativa"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu))"
avatars: 
  - "shu-yu-guo"
date: 2021-07-13
tags: 
  - ECMAScript
description: "JavaScript ahora tiene un método de indexación relativa para Arrays, TypedArrays y Strings."
---

El nuevo método `at` en `Array.prototype`, los distintos prototipos de TypedArray y `String.prototype` facilita el acceso a un elemento más cercano al final de la colección y lo hace más conciso.

Acceder al elemento N desde el final de una colección es una operación común. Sin embargo, las formas habituales de hacerlo son verbosas, como `my_array[my_array.length - N]`, o podrían no ser eficientes, como `my_array.slice(-N)[0]`. El nuevo método `at` hace que esta operación sea más ergonómica al interpretar índices negativos como "desde el final". Los ejemplos anteriores pueden expresarse como `my_array.at(-N)`.

<!--truncate-->
Por uniformidad, también se admiten índices positivos, que son equivalentes al acceso ordinario a propiedades.

Este nuevo método es lo suficientemente pequeño como para que su semántica completa pueda entenderse mediante la implementación de este polyfill compatible a continuación:

```js
function at(n) {
  // Convierte el argumento en un entero
  n = Math.trunc(n) || 0;
  // Permitir la indexación negativa desde el final
  if (n < 0) n += this.length;
  // Acceso fuera de los límites devuelve undefined
  if (n < 0 || n >= this.length) return undefined;
  // De lo contrario, esto es solo un acceso de propiedad normal
  return this[n];
}
```

## Una palabra sobre Strings

Dado que `at` finalmente realiza una indexación ordinaria, llamar a `at` en valores de tipo String devuelve unidades de código, al igual que lo haría la indexación ordinaria. ¡Y como con la indexación ordinaria en Strings, las unidades de código podrían no ser lo que deseas para cadenas Unicode! Por favor considera si [`String.prototype.codePointAt()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/codePointAt) es más apropiado para tu caso de uso.

## Soporte para el método `at`

<feature-support chrome="92"
                 firefox="90"
                 safari="no"
                 nodejs="no"
                 babel="sí https://github.com/zloirock/core-js#relative-indexing-method"></feature-support>
