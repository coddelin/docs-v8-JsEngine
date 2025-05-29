---
title: &apos;Lanzamiento de V8 v4.7&apos;
author: &apos;el equipo de V8&apos;
date: 2015-10-14 13:33:37
tags:
  - lanzamiento
description: &apos;V8 v4.7 viene con un menor consumo de memoria y soporte para nuevas características de lenguaje ES2015.&apos;
---
Aproximadamente cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](https://v8.dev/docs/release-process). Cada versión se ramifica desde el master de Git de V8 inmediatamente antes de que Chrome se ramifique para un hito de Chrome Beta. Hoy estamos encantados de anunciar nuestra rama más reciente, [V8 versión 4.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.7), que estará en beta hasta que se lance en coordinación con Chrome 47 Stable. V8 v4.7 está lleno de todo tipo de novedades para los desarrolladores, así que nos gustaría darles un adelanto de algunos de los aspectos más destacados en anticipación al lanzamiento en varias semanas.

<!--truncate-->
## Mejor soporte de ECMAScript 2015 (ES6)

### Operador rest

El [operador rest](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Functions/rest_parameters) permite al desarrollador pasar un número indefinido de argumentos a una función. Es similar al objeto `arguments`.

```js
// Sin operador rest
function concat() {
  var args = Array.prototype.slice.call(arguments, 1);
  return args.join(&apos;&apos;);
}

// Con operador rest
function concatWithRest(...strings) {
  return strings.join(&apos;&apos;);
}
```

## Soporte para futuras características de ES

### `Array.prototype.includes`

[`Array.prototype.includes`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes) es una nueva función que actualmente es una propuesta en etapa 3 para su inclusión en ES2016. Proporciona una sintaxis breve para determinar si un elemento está o no en un array dado al devolver un valor booleano.

```js
[1, 2, 3].includes(3); // true
[&apos;manzana&apos;, &apos;plátano&apos;, &apos;cereza&apos;].includes(&apos;manzana&apos;); // true
[&apos;manzana&apos;, &apos;plátano&apos;, &apos;cereza&apos;].includes(&apos;melocotón&apos;); // false
```

## Reducir la presión en la memoria durante el análisis

[Cambios recientes en el analizador de V8](https://code.google.com/p/v8/issues/detail?id=4392) reducen en gran medida la memoria consumida al analizar archivos con funciones anidadas grandes. En particular, esto permite que V8 ejecute módulos asm.js más grandes que los posibles anteriormente.

## API de V8

Por favor, consulta nuestro [resumen de cambios en la API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento se actualiza regularmente unas semanas después de cada lanzamiento importante. Los desarrolladores con un [checkout activo de V8](https://v8.dev/docs/source-code#using-git) pueden usar `git checkout -b 4.7 -t branch-heads/4.7` para experimentar con las nuevas características de V8 v4.7. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas funciones tú mismo pronto.
