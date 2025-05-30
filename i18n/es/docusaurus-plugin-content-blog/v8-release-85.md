---
title: "Lanzamiento de V8 v8.5"
author: "Zeynep Cankara, siguiendo algunos Mapas"
avatars: 
 - "zeynep-cankara"
date: 2020-07-21
tags: 
 - lanzamiento
description: "El lanzamiento de V8 v8.5 incluye Promise.any, String#replaceAll, operadores de asignación lógica, soporte para WebAssembly multi-value y BigInt, y mejoras de rendimiento."
tweet: 
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](https://v8.dev/docs/release-process). Cada versión se deriva del maestro de Git de V8 inmediatamente antes de un hito de Chrome Beta. Hoy nos complace anunciar nuestra nueva rama, [V8 versión 8.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.5), que está en beta hasta su lanzamiento en coordinación con Chrome 85 Estable en varias semanas. V8 v8.5 está lleno de todo tipo de novedades orientadas a los desarrolladores. Este post ofrece un adelanto de algunos de los aspectos más destacados en anticipación al lanzamiento.

<!--truncate-->
## JavaScript

### `Promise.any` y `AggregateError`

`Promise.any` es un combinador de promesas que resuelve la promesa resultante tan pronto como una de las promesas de entrada se cumple.

```js
const promises = [
  fetch('/endpoint-a').then(() => 'a'),
  fetch('/endpoint-b').then(() => 'b'),
  fetch('/endpoint-c').then(() => 'c'),
];
try {
  const first = await Promise.any(promises);
  // Alguna de las promesas fue cumplida.
  console.log(first);
  // → p. ej. 'b'
} catch (error) {
  // Todas las promesas fueron rechazadas.
  console.assert(error instanceof AggregateError);
  // Registrar los valores rechazados:
  console.log(error.errors);
}
```

Si todas las promesas de entrada son rechazadas, la promesa resultante se rechaza con un objeto `AggregateError` que contiene una propiedad `errors` que guarda una matriz de valores de rechazo.

Consulta [nuestra explicación](https://v8.dev/features/promise-combinators#promise.any) para más información.

### `String.prototype.replaceAll`

`String.prototype.replaceAll` proporciona una forma fácil de reemplazar todas las ocurrencias de una subcadena sin crear un `RegExp` global.

```js
const queryString = 'q=query+string+parameters';

// Funciona, pero requiere escapar dentro de expresiones regulares.
queryString.replace(/\+/g, ' ');
// → 'q=query string parameters'

// ¡Más simple!
queryString.replaceAll('+', ' ');
// → 'q=query string parameters'
```

Consulta [nuestra explicación](https://v8.dev/features/string-replaceall) para más información.

### Operadores de asignación lógica

Los operadores de asignación lógica son nuevos operadores de asignación compuesta que combinan las operaciones lógicas `&&`, `||` o `??` con la asignación.

```js
x &&= y;
// Aproximadamente equivalente a x && (x = y)
x ||= y;
// Aproximadamente equivalente a x || (x = y)
x ??= y;
// Aproximadamente equivalente a x ?? (x = y)
```

Nota que, a diferencia de los operadores de asignación compuesta matemáticos y bit a bit, los operadores de asignación lógica solo realizan la asignación condicionalmente.

Consulta [nuestra explicación](https://v8.dev/features/logical-assignment) para una explicación más detallada.

## WebAssembly

### Liftoff implementado en todas las plataformas

Desde la versión V8 v6.9, [Liftoff](https://v8.dev/blog/liftoff) se ha usado como el compilador base para WebAssembly en plataformas Intel (y Chrome 69 lo habilitó en sistemas de escritorio). Debido a preocupaciones sobre un aumento de memoria (por la mayor cantidad de código generado por el compilador base), lo habíamos retrasado para sistemas móviles hasta ahora. Después de realizar experimentos en los últimos meses, estamos seguros de que el aumento de memoria es insignificante para la mayoría de los casos, por lo que finalmente habilitamos Liftoff por defecto en todas las arquitecturas, aumentando la velocidad de compilación, especialmente en dispositivos ARM (32 y 64 bits). Chrome 85 sigue esta línea y también implementa Liftoff.

### Soporte para valores múltiples implementado

El soporte de WebAssembly para [bloques de código y retornos de función con múltiples valores](https://github.com/WebAssembly/multi-value) ahora está disponible para su uso general. Esto refleja la reciente incorporación de la propuesta al estándar oficial de WebAssembly y es compatible con todos los niveles de compilación.

Por ejemplo, esta es ahora una función válida en WebAssembly:

```wasm
(func $swap (param i32 i32) (result i32 i32)
  (local.get 1) (local.get 0)
)
```

Si la función es exportada, también puede llamarse desde JavaScript y retornará un arreglo:

```js
instance.exports.swap(1, 2);
// → [2, 1]
```

De manera similar, si una función de JavaScript devuelve un arreglo (o cualquier iterador), puede ser importada y llamada como una función de retorno múltiple dentro del módulo de WebAssembly:

```js
new WebAssembly.Instance(module, {
  imports: {
    swap: (x, y) => [y, x],
  },
});
```

```wasm
(func $main (result i32 i32)
  i32.const 0
  i32.const 1
  call $swap
)
```

Más importante aún, las herramientas ahora pueden usar esta funcionalidad para generar código más compacto y rápido dentro de un módulo de WebAssembly.

### Soporte para JS BigInts

Se ha implementado el soporte de WebAssembly para [convertir valores WebAssembly I64 desde y hacia BigInts de JavaScript](https://github.com/WebAssembly/JS-BigInt-integration) y está disponible para uso general según el último cambio en el estándar oficial.

Por lo tanto, las funciones de WebAssembly con parámetros i64 y valores de retorno pueden ser llamadas desde JavaScript sin pérdida de precisión:

```wasm
(module
  (func $add (param $x i64) (param $y i64) (result i64)
    local.get $x
    local.get $y
    i64.add)
  (export "add" (func $add)))
```

Desde JavaScript, solo los BigInts pueden pasarse como parámetro I64:

```js
WebAssembly.instantiateStreaming(fetch('i64.wasm'))
  .then(({ module, instance }) => {
    instance.exports.add(12n, 30n);
    // → 42n
    instance.exports.add(12, 30);
    // → TypeError: los parámetros no son del tipo BigInt
  });
```

## API de V8

Por favor, utiliza `git log branch-heads/8.4..branch-heads/8.5 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con una copia activa de V8 pueden usar `git checkout -b 8.5 -t branch-heads/8.5` para experimentar con las nuevas funcionalidades en V8 v8.5. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características pronto.
