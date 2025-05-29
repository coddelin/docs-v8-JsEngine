---
title: "Lanzamiento de V8 v5.0"
author: "el equipo de V8"
date: 2016-03-15 13:33:37
tags:
  - lanzamiento
description: "V8 v5.0 viene con mejoras de rendimiento y agrega soporte para varias características nuevas del lenguaje ES2015."
---
El primer paso en el [proceso de lanzamiento](/docs/release-process) de V8 es una nueva rama desde el Git master justo antes de que Chromium divida una rama para un hito Beta de Chrome (aproximadamente cada seis semanas). Nuestra última rama de lanzamiento es [V8 v5.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.0), la cual permanecerá en beta hasta que lancemos una versión estable junto con Chrome 50 Stable. Aquí hay un resumen de las nuevas características dirigidas a los desarrolladores en esta versión de V8.

<!--truncate-->
:::note
**Nota:** El número de versión 5.0 no tiene un significado semántico ni marca un lanzamiento importante (en oposición a un lanzamiento menor).
:::

## Mejor soporte para ECMAScript 2015 (ES6)

V8 v5.0 contiene varias características de ES2015 relacionadas con el emparejamiento de expresiones regulares (regex).

### Bandera Unicode de RegExp

La [bandera Unicode de RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Parameters), `u`, activa un nuevo modo Unicode para el emparejamiento de expresiones regulares. La bandera Unicode trata patrones y cadenas regex como una serie de puntos de código Unicode. También expone nueva sintaxis para escapes de puntos de código Unicode.

```js
/😊{2}/.test('😊😊');
// false

/😊{2}/u.test('😊😊');
// true

/\u{76}\u{38}/u.test('v8');
// true

/\u{1F60A}/u.test('😊');
// true
```

La bandera `u` también hace que el átomo `.` (también conocido como el emparejador de caracteres único) empareje cualquier símbolo Unicode en lugar de solo los caracteres en el Plano Multilingüe Básico (BMP).

```js
const string = 'el 🅛 tren';

/el\s.\stren/.test(string);
// false

/el\s.\stren/u.test(string);
// true
```

### Ganchos de personalización de RegExp

ES2015 incluye ganchos para las subclases de RegExp para cambiar la semántica del emparejamiento. Las subclases pueden sobrescribir métodos llamados `Symbol.match`, `Symbol.replace`, `Symbol.search`, y `Symbol.split` para cambiar cómo las subclases de RegExp se comportan en relación con `String.prototype.match` y métodos similares.

## Mejoras de rendimiento en características de ES2015 y ES5

La versión 5.0 también trae algunas mejoras destacadas de rendimiento en características de ES2015 y ES5 ya implementadas.

La implementación de parámetros rest es 8-10 veces más rápida que la de la versión anterior, haciéndola más eficiente para reunir un gran número de argumentos en un único array después de una llamada de función. `Object.keys`, útil para iterar sobre las propiedades enumerables de un objeto en el mismo orden que devuelve `for`-`in`, ahora es aproximadamente 2 veces más rápida.

## API de V8

Por favor, revisa nuestro [resumen de cambios de la API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento se actualiza regularmente unas semanas después de cada lanzamiento importante.

Los desarrolladores con un [checkout activo de V8](https://v8.dev/docs/source-code#using-git) pueden usar `git checkout -b 5.0 -t branch-heads/5.0` para experimentar con las nuevas características en V8 5.0. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características por ti mismo pronto.
