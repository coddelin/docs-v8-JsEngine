---
title: 'Integración de WebAssembly con JavaScript BigInt'
author: 'Alon Zakai'
avatars:
  - 'alon-zakai'
date: 2020-11-12
tags:
  - WebAssembly
  - ECMAScript
description: 'BigInts facilitan el paso de enteros de 64 bits entre JavaScript y WebAssembly. Esta publicación explica qué significa eso y por qué es útil, lo que incluye simplificar las cosas para los desarrolladores, permitir que el código se ejecute más rápidamente y también acelerar los tiempos de compilación.'
tweet: '1331966281571037186'
---
La característica [JS-BigInt-Integration](https://github.com/WebAssembly/JS-BigInt-integration) facilita el paso de enteros de 64 bits entre JavaScript y WebAssembly. Esta publicación explica qué significa eso y por qué es útil, lo que incluye simplificar las cosas para los desarrolladores, permitir que el código se ejecute más rápidamente y también acelerar los tiempos de compilación.

<!--truncate-->
## Enteros de 64 bits

Los números en JavaScript son de tipo double, es decir, valores de punto flotante de 64 bits. Tal valor puede contener cualquier entero de 32 bits con plena precisión, pero no todos los de 64 bits. WebAssembly, por otro lado, tiene soporte completo para enteros de 64 bits, el tipo `i64`. Ocurre un problema cuando se conecta a los dos: Si una función Wasm devuelve un i64, por ejemplo, la VM lanza una excepción si se llama desde JavaScript, algo como esto:

```
TypeError: Wasm function signature contains illegal type
```

Como dice el error, `i64` no es un tipo válido para JavaScript.

Históricamente, la mejor solución para esto era la “legalización” del Wasm. La legalización significa convertir las importaciones y exportaciones de Wasm para usar tipos válidos para JavaScript. En la práctica, eso hacía dos cosas:

1. Reemplazar un parámetro de entero de 64 bits con dos de 32 bits, representando respectivamente los bits bajos y altos.
2. Reemplazar un valor de retorno entero de 64 bits con uno de 32 bits que representa los bits bajos, y usar un valor de 32 bits adicional en paralelo para los bits altos.

Por ejemplo, considera este módulo de Wasm:

```wasm
(module
  (func $send_i64 (param $x i64)
    ..))
```

La legalización lo convertiría en esto:

```wasm
(module
  (func $send_i64 (param $x_low i32) (param $x_high i32)
    (local $x i64) ;; el valor real que utilizará el resto del código
    ;; código para combinar $x_low y $x_high en $x
    ..))
```

La legalización se realiza en el lado de las herramientas, antes de que llegue a la VM que lo ejecuta. Por ejemplo, la biblioteca de la cadena de herramientas [Binaryen](https://github.com/WebAssembly/binaryen) tiene un paso llamado [LegalizeJSInterface](https://github.com/WebAssembly/binaryen/blob/fd7e53fe0ae99bd27179cb35d537e4ce5ec1fe11/src/passes/LegalizeJSInterface.cpp) que realiza esa transformación, que se ejecuta automáticamente en [Emscripten](https://emscripten.org/) cuando es necesario.

## Desventajas de la legalización

La legalización funciona suficientemente bien para muchas cosas, pero tiene desventajas, como el trabajo extra para combinar o dividir piezas de 32 bits en valores de 64 bits. Si bien es raro que esto ocurra en una ruta crítica, cuando lo hace la ralentización puede ser notable - veremos algunos números más tarde.

Otra molestia es que la legalización es visible para los usuarios, ya que cambia la interfaz entre JavaScript y Wasm. Aquí hay un ejemplo:

```c
// example.c

#include <stdint.h>

extern void send_i64_to_js(int64_t);

int main() {
  send_i64_to_js(0xABCD12345678ULL);
}
```

```javascript
// example.js

mergeInto(LibraryManager.library, {
  send_i64_to_js: function(value) {
    console.log("JS recibió: 0x" + value.toString(16));
  }
});
```

Este es un pequeño programa en C que llama a una [biblioteca de JavaScript](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html#implement-c-in-javascript) (es decir, definimos una función extern en C, y la implementamos en JavaScript como una forma simple y de bajo nivel para llamar entre Wasm y JavaScript). Todo lo que hace este programa es enviar un `i64` a JavaScript, donde intentamos imprimirlo.

Podemos compilarlo con

```
emcc example.c --js-library example.js -o out.js
```

Cuando lo ejecutamos, no obtenemos lo que esperábamos:

```
node out.js
JS recibió: 0x12345678
```

Enviamos `0xABCD12345678` pero solo recibimos `0x12345678` 😔. Lo que ocurre aquí es que la legalización convierte ese `i64` en dos `i32`, y nuestro código recibe solo los 32 bits bajos, ignorando otro parámetro que fue enviado. Para manejar las cosas correctamente, necesitaríamos hacer algo como esto:

```javascript
  // El i64 se divide en dos parámetros de 32 bits, “low” y “high”.
  send_i64_to_js: function(low, high) {
    console.log("JS recibió: 0x" + high.toString(16) + low.toString(16));
  }
```

Al ejecutar esto ahora, obtenemos

```
JS recibió: 0xabcd12345678
```

Como puedes ver, es posible vivir con la legalización. ¡Pero puede ser algo molesto!

## La solución: BigInts en JavaScript

¡JavaScript ahora tiene valores [BigInt](/features/bigint), que representan enteros de tamaño arbitrario, por lo que pueden representar correctamente enteros de 64 bits. Es natural querer usar esos valores para representar `i64`s de Wasm. ¡Eso es exactamente lo que hace la función JS-BigInt-Integration!

Emscripten tiene soporte para la integración Wasm BigInt, que podemos usar para compilar el ejemplo original (sin ningún truco para la legalización), simplemente agregando `-s WASM_BIGINT`:

```
emcc example.c --js-library example.js -o out.js -s WASM_BIGINT
```

Luego podemos ejecutarlo (ten en cuenta que actualmente necesitamos pasar a Node.js una bandera para habilitar la integración BigInt):

```
node --experimental-wasm-bigint a.out.js
JS recibió: 0xabcd12345678
```

¡Perfecto, exactamente lo que queríamos!

Y no solo es más simple, sino también más rápido. Como mencionamos anteriormente, en la práctica es raro que las conversiones de `i64` ocurran en un camino crítico, pero cuando lo hacen, la desaceleración puede ser notable. Si convertimos el ejemplo anterior en una prueba de rendimiento ejecutando muchas llamadas de `send_i64_to_js`, la versión con BigInt es un 18% más rápida.

Otro beneficio de la integración BigInt es que la cadena de herramientas puede evitar la legalización. Si Emscripten no necesita legalizar, entonces podría no tener trabajo que hacer con el Wasm que emite LLVM, lo que acelera los tiempos de compilación. Puedes obtener esa aceleración si compilas con `-s WASM_BIGINT` y no proporcionas otras banderas que requieran cambios. Por ejemplo, `-O0 -s WASM_BIGINT` funciona (pero las compilaciones optimizadas [ejecutan el optimizador de Binaryen](https://emscripten.org/docs/optimizing/Optimizing-Code.html#link-times) que es importante para el tamaño).

## Conclusión

La integración WebAssembly BigInt ha sido implementada en [múltiples navegadores](https://webassembly.org/roadmap/), incluidos Chrome 85 (lanzado el 2020-08-25), ¡así que puedes probarlo hoy!
