---
title: 'Lanzamiento de V8 v4.5'
author: 'el equipo de V8'
date: 2015-07-17 13:33:37
tags:
  - lanzamiento
description: 'V8 v4.5 llega con mejoras de rendimiento y añade soporte para varias características de ES2015.'
---
Aproximadamente cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](https://v8.dev/docs/release-process). Cada versión se deriva del maestro de Git de V8 inmediatamente antes de que Chrome derive para un hito de Chrome Beta. Hoy nos complace anunciar nuestra rama más nueva, [V8 versión 4.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.5), que estará en beta hasta que sea lanzada en coordinación con Chrome 45 Stable. V8 v4.5 está llena de todo tipo de novedades para desarrolladores, por lo que nos gustaría darles un adelanto de algunos aspectos destacados en anticipación al lanzamiento en unas semanas.

<!--truncate-->
## Mejora del soporte de ECMAScript 2015 (ES6)

V8 v4.5 añade soporte para varias características de [ECMAScript 2015 (ES6)](https://www.ecma-international.org/ecma-262/6.0/).

### Funciones Flecha

Con la ayuda de las [Funciones Flecha](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Functions/Arrow_functions) es posible escribir código más simplificado.

```js
const data = [0, 1, 3];
// Código sin Funciones Flecha
const convertedData = data.map(function(value) { return value * 2; });
console.log(convertedData);
// Código con Funciones Flecha
const convertedData = data.map(value => value * 2);
console.log(convertedData);
```

La vinculación léxica de 'this' es otro gran beneficio de las funciones flecha. Como resultado, usar callbacks en métodos es mucho más fácil.

```js
class MyClass {
  constructor() { this.a = 'Hola, '; }
  hello() { setInterval(() => console.log(this.a + 'Mundo!'), 1000); }
}
const myInstance = new MyClass();
myInstance.hello();
```

### Funciones de Array/TypedArray

Todos los nuevos métodos en [Arrays y TypedArrays](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Array#Methods) que están especificados en ES2015 ahora están soportados en V8 v4.5. Hacen que trabajar con Arrays y TypedArrays sea más conveniente. Entre los métodos añadidos están `Array.from` y `Array.of`. También se añadieron métodos que reflejan la mayoría de los métodos de `Array` en cada tipo de TypedArray.

### `Object.assign`

[`Object.assign`](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) permite a los desarrolladores fusionar y clonar objetos rápidamente.

```js
const target = { a: 'Hola, ' };
const source = { b: 'mundo!' };
// Fusiona los objetos.
Object.assign(target, source);
console.log(target.a + target.b);
```

Esta característica también puede usarse para combinar funcionalidades.

## Más características del lenguaje JavaScript son “optimizables”

Durante muchos años, el compilador optimizador tradicional de V8, [Crankshaft](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html), ha hecho un gran trabajo optimizando muchos patrones comunes de JavaScript. Sin embargo, nunca tuvo la capacidad de soportar todo el lenguaje JavaScript, y usar ciertas características del lenguaje en una función — como `try`/`catch` y `with` — impedía que fuera optimizada. V8 tenía que recurrir a su compilador base más lento para esa función.

Uno de los objetivos de diseño del nuevo compilador optimizador de V8, [TurboFan](/blog/turbofan-jit), es poder eventualmente optimizar todo JavaScript, incluidas las características de ECMAScript 2015. En V8 v4.5, hemos comenzado a usar TurboFan para optimizar algunas características del lenguaje que no son compatibles con Crankshaft: `for`-`of`, `class`, `with` y nombres de propiedades calculadas.

Aquí hay un ejemplo de código que usa 'for-of', que ahora puede ser compilado por TurboFan:

```js
const sequence = ['Primero', 'Segundo', 'Tercero'];
for (const value of sequence) {
  // Este bloque ahora es optimizable.
  const object = {a: 'Hola, ', b: 'mundo!', c: value};
  console.log(object.a + object.b + object.c);
}
```

Aunque inicialmente las funciones que usan estas características del lenguaje no alcanzarán el mismo rendimiento máximo que otro código compilado por Crankshaft, TurboFan ahora puede acelerarlas mucho más allá de nuestro compilador base actual. Aún mejor, el rendimiento continuará mejorando rápidamente a medida que desarrollemos más optimizaciones para TurboFan.

## API de V8

Por favor, consulta nuestro [resumen de cambios en la API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento se actualiza regularmente unas semanas después de cada lanzamiento importante.

Los desarrolladores con un [checkout activo de V8](https://v8.dev/docs/source-code#using-git) pueden usar `git checkout -b 4.5 -t branch-heads/4.5` para experimentar con las nuevas características en V8 v4.5. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características por ti mismo pronto.
