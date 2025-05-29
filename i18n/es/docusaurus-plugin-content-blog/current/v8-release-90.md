---
title: &apos;Lanzamiento de V8 v9.0&apos;
author: &apos;Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), en línea&apos;
avatars:
 - &apos;ingvar-stepanyan&apos;
date: 2021-03-17
tags:
 - lanzamiento
description: &apos;El lanzamiento de V8 v9.0 trae soporte para índices de coincidencia en expresiones regulares y varias mejoras de rendimiento.&apos;
tweet: &apos;1372227274712494084&apos;
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](https://v8.dev/docs/release-process). Cada versión se ramifica desde el maestro de Git de V8 justo antes de un hito Beta de Chrome. Hoy nos complace anunciar nuestra rama más reciente, [V8 versión 9.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.0), que está en beta hasta su lanzamiento en coordinación con Chrome 90 Stable en varias semanas. V8 v9.0 está lleno de todo tipo de novedades para los desarrolladores. Este artículo proporciona un avance de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## JavaScript

### Índices de coincidencia en RegExp

A partir de v9.0, los desarrolladores pueden optar por obtener un arreglo con las posiciones de inicio y fin de los grupos capturados en coincidencias de expresiones regulares. Este arreglo está disponible a través de la propiedad `.indices` en los objetos de coincidencia cuando la expresión regular tiene la bandera `/d`.

```javascript
const re = /(a)(b)/d;      // Nota la bandera /d.
const m = re.exec(&apos;ab&apos;);
console.log(m.indices[0]); // Índice 0 es toda la coincidencia.
// → [0, 2]
console.log(m.indices[1]); // Índice 1 es el 1er grupo capturado.
// → [0, 1]
console.log(m.indices[2]); // Índice 2 es el 2do grupo capturado.
// → [1, 2]
```

Por favor, consulta [nuestra explicación](https://v8.dev/features/regexp-match-indices) para una inmersión más profunda.

### Acceso más rápido a propiedades `super`

El acceso a propiedades `super` (por ejemplo, `super.x`) ha sido optimizado utilizando el sistema de caché en línea de V8 y la generación de código optimizada en TurboFan. Con estos cambios, el acceso a propiedades `super` ahora está más cerca de estar a la par con el acceso regular, como se puede observar en los gráficos a continuación.

![Comparar acceso a propiedades super con acceso regular, optimizado](/_img/fast-super/super-opt.svg)

Por favor consulta [la publicación del blog dedicada](https://v8.dev/blog/fast-super) para más detalles.

### `for ( async of` no permitido

Se descubrió recientemente una [ambigüedad en la gramática](https://github.com/tc39/ecma262/issues/2034) que fue [corregida](https://chromium-review.googlesource.com/c/v8/v8/+/2683221) en V8 v9.0.

La secuencia de tokens `for ( async of` ya no se analiza.

## WebAssembly

### Llamadas más rápidas de JS a Wasm

V8 utiliza diferentes representaciones para los parámetros de funciones de WebAssembly y JavaScript. Por esta razón, cuando JavaScript llama a una función exportada de WebAssembly, la llamada pasa por un *wrapper de JS a Wasm*, responsable de adaptar parámetros del mundo de JavaScript al mundo de WebAssembly, así como de adaptar resultados en la dirección opuesta.

Desafortunadamente, esto implica un costo de rendimiento, lo que significa que las llamadas de JavaScript a WebAssembly no eran tan rápidas como las llamadas de JavaScript a JavaScript. Para minimizar este gasto adicional, ahora el wrapper de JS a Wasm puede ser integrado en línea en el sitio de la llamada, simplificando el código y eliminando este marco extra.

Supongamos que tenemos una función de WebAssembly para sumar dos números de punto flotante doble, como esta:

```cpp
double addNumbers(double x, double y) {
  return x + y;
}
```

y supongamos que llamamos eso desde JavaScript para sumar algunos vectores (representados como arreglos tipados):

```javascript
const addNumbers = instance.exports.addNumbers;

function vectorSum(len, v1, v2) {
  const result = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    result[i] = addNumbers(v1[i], v2[i]);
  }
  return result;
}

const N = 100_000_000;
const v1 = new Float64Array(N);
const v2 = new Float64Array(N);
for (let i = 0; i < N; i++) {
  v1[i] = Math.random();
  v2[i] = Math.random();
}

// Calentamiento.
for (let i = 0; i < 5; i++) {
  vectorSum(N, v1, v2);
}

// Medir.
console.time();
const result = vectorSum(N, v1, v2);
console.timeEnd();
```

En este microbenchmark simplificado, vemos las siguientes mejoras:

![Comparación de microbenchmarks](/_img/v8-release-90/js-to-wasm.svg)

La función aún es experimental y puede habilitarse con la bandera `--turbo-inline-js-wasm-calls`.

Para más detalles, consulta el [documento de diseño](https://docs.google.com/document/d/1mXxYnYN77tK-R1JOVo6tFG3jNpMzfueQN1Zp5h3r9aM/edit).

## API de V8

Por favor utiliza `git log branch-heads/8.9..branch-heads/9.0 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con un checkout activo de V8 pueden usar `git checkout -b 9.0 -t branch-heads/9.0` para experimentar con las nuevas características en V8 v9.0. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar pronto las nuevas características tú mismo.
