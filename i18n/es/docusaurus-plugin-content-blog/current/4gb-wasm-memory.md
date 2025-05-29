---
title: &apos;Hasta 4GB de memoria en WebAssembly&apos;
author: &apos;Andreas Haas, Jakob Kummerow y Alon Zakai&apos;
avatars:
  - &apos;andreas-haas&apos;
  - &apos;jakob-kummerow&apos;
  - &apos;alon-zakai&apos;
date: 2020-05-14
tags:
  - WebAssembly
  - JavaScript
  - herramientas
tweet: &apos;1260944314441633793&apos;
---

## Introducción

Gracias a trabajos recientes en Chrome y Emscripten, ahora puedes usar hasta 4GB de memoria en aplicaciones de WebAssembly. Esto supera el límite anterior de 2GB. Podría parecer extraño que alguna vez haya existido un límite: después de todo, ¡no se necesitaba trabajo adicional para usar 512MB o 1GB de memoria! Pero resulta que hay algunas particularidades en el salto de 2GB a 4GB, tanto en el navegador como en la cadena de herramientas, que describiremos en esta publicación.

<!--truncate-->
## 32 bits

Un poco de contexto antes de entrar en más detalles: el nuevo límite de 4GB es la mayor cantidad de memoria posible con punteros de 32 bits, que es lo que WebAssembly actualmente admite, conocido como “wasm32” en LLVM y otros lugares. Hay trabajos en curso hacia un “wasm64” ([“memory64”](https://github.com/WebAssembly/memory64/blob/master/proposals/memory64/Overview.md) en la especificación de wasm) en el que los punteros pueden ser de 64 bits y podríamos usar más de 16 millones de terabytes de memoria (!), pero hasta entonces, 4GB es lo máximo que podemos esperar acceder.

Parece que siempre deberíamos haber podido acceder a 4GB, ya que es lo que los punteros de 32 bits permiten. ¿Por qué entonces nos hemos limitado a la mitad de eso, solo 2GB? Hay múltiples razones, tanto del lado del navegador como de la cadena de herramientas. Comencemos con el navegador.

## Trabajo en Chrome/V8

En principio, los cambios en V8 suenan simples: simplemente asegurarse de que todo el código generado para funciones de WebAssembly, así como todo el código de administración de memoria, utilice enteros sin signo de 32 bits para índices y tamaños de memoria, y deberíamos estar listos. Sin embargo, en la práctica, ¡hay más que eso! Como la memoria de WebAssembly puede exportarse a JavaScript como un ArrayBuffer, también tuvimos que cambiar la implementación de ArrayBuffers de JavaScript, TypedArrays y todas las APIs web que usan ArrayBuffers y TypedArrays, como Web Audio, WebGPU y WebUSB.

El primer problema que tuvimos que resolver fue que V8 utilizaba [Smis](https://v8.dev/blog/pointer-compression#value-tagging-in-v8) (es decir, enteros firmados de 31 bits) para índices y tamaños de TypedArray, por lo que el tamaño máximo era en realidad 2<sup>30</sup>-1, o aproximadamente 1GB. Además, resulta que cambiar todo a enteros de 32 bits no sería suficiente, porque el tamaño de una memoria de 4GB en realidad no cabe en un entero de 32 bits. Para ilustrar: en decimal, hay 100 números con dos dígitos (de 0 a 99), pero "100" en sí mismo es un número de tres dígitos. De manera análoga, los 4GB pueden ser direccionados con direcciones de 32 bits, pero los 4GB en sí mismos son un número de 33 bits. Podríamos habernos conformado con un límite ligeramente más bajo, pero como tuvimos que tocar todo el código de TypedArray de todos modos, queríamos prepararlo para límites aún mayores en el futuro mientras estábamos en ello. Así que cambiamos todo el código que se ocupa de los índices o tamaños de TypedArray para usar tipos de enteros de 64 bits de ancho, o Números de JavaScript donde se requiere la interconexión con JavaScript. Como beneficio adicional, esto significa que admitir memorias aún más grandes para wasm64 debería ser relativamente sencillo ahora.

El segundo desafío fue lidiar con el caso especial de JavaScript para los elementos de Array, en comparación con las propiedades nominales regulares, lo cual se refleja en nuestra implementación de objetos. (Este es un tema bastante técnico relacionado con la especificación de JavaScript, así que no te preocupes si no sigues todos los detalles). Considera este ejemplo:

```js
console.log(array[5_000_000_000]);
```

Si `array` es un objeto de JavaScript común o un Array, entonces `array[5_000_000_000]` se manejaría como una búsqueda de propiedad basada en cadenas. El tiempo de ejecución buscaría una propiedad con nombre de cadena “5000000000”. Si no se puede encontrar tal propiedad, recorrería la cadena de prototipos y buscaría esa propiedad, o eventualmente devolvería `undefined` al final de la cadena. Sin embargo, si `array` en sí mismo, o un objeto en su cadena de prototipos, es un TypedArray, entonces el tiempo de ejecución debe buscar un elemento indexado en el índice 5,000,000,000, o devolver inmediatamente `undefined` si este índice está fuera de límites.

En otras palabras, las reglas para TypedArrays son bastante diferentes de las Arrays normales, y la diferencia se manifiesta principalmente para índices enormes. Así que mientras solo permitimos TypedArrays más pequeños, nuestra implementación podría ser relativamente simple; en particular, mirar la clave de la propiedad una sola vez era suficiente para decidir si se debía tomar la ruta de búsqueda "indexada" o "nombrada". Para permitir TypedArrays más grandes, ahora tenemos que hacer esta distinción repetidamente mientras recorremos la cadena de prototipos, lo cual requiere caché cuidadoso para evitar ralentizar el código JavaScript existente debido al trabajo repetido y la sobrecarga.

## Trabajo en la cadena de herramientas

En el lado de la toolchain, también tuvimos que trabajar, la mayor parte en el código de soporte de JavaScript, no en el código compilado en WebAssembly. El problema principal era que Emscripten siempre escribía los accesos a la memoria en esta forma:

```js
HEAP32[(ptr + offset) >> 2]
```

Esto lee 32 bits (4 bytes) como un entero con signo de la dirección `ptr + offset`. Esto funciona porque `HEAP32` es un Int32Array, lo que significa que cada índice en el array tiene 4 bytes. Entonces, necesitamos dividir la dirección en bytes (`ptr + offset`) entre 4 para obtener el índice, que es lo que hace el `>> 2`.

El problema es que `>>` es una operación *con signo*! Si la dirección está en la marca de 2GB o más, esto desbordará la entrada en un número negativo:

```js
// Justo debajo de los 2GB está bien, esto imprime 536870911
console.log((2 * 1024 * 1024 * 1024 - 4) >> 2);
// 2GB desborda y obtenemos -536870912 :(
console.log((2 * 1024 * 1024 * 1024) >> 2);
```

La solución es hacer un desplazamiento *sin signo*, `>>>`:

```js
// ¡Esto nos da 536870912, como queremos!
console.log((2 * 1024 * 1024 * 1024) >>> 2);
```

Emscripten sabe en tiempo de compilación si puedes usar 2GB o más de memoria (dependiendo de las banderas que uses; ver más adelante para más detalles). Si tus banderas hacen posibles las direcciones de 2GB+, entonces el compilador automáticamente reescribirá todos los accesos a la memoria para usar `>>>` en lugar de `>>`, lo que incluye no solo accesos a `HEAP32`, etc. como en los ejemplos anteriores, sino también operaciones como `.subarray()` y `.copyWithin()`. En otras palabras, el compilador cambiará para usar punteros sin signo en lugar de con signo.

Esta transformación incrementa ligeramente el tamaño del código: un carácter extra en cada desplazamiento, por lo que no lo hacemos si no estás usando direcciones de 2GB+. Mientras que la diferencia es típicamente menos del 1%, es innecesaria y fácil de evitar - ¡y muchas pequeñas optimizaciones suman!

Otros problemas raros pueden surgir en el código de soporte de JavaScript. Aunque los accesos normales a la memoria se manejan automáticamente como se describió anteriormente, hacer algo como comparar manualmente un puntero con signo con uno sin signo (en direcciones de 2GB o más) retornará falso. Para encontrar tales problemas, hemos auditado el JavaScript de Emscripten y también ejecutado la suite de pruebas en un modo especial donde todo se coloca en direcciones de 2GB o más. (Ten en cuenta que si escribes tu propio código de soporte en JavaScript, también podrías tener cosas que corregir ahí si haces manipulación manual con punteros además de los accesos normales a la memoria).

## Probarlo

Para probar esto, [obtén la última versión de Emscripten](https://emscripten.org/docs/getting_started/downloads.html), o al menos la versión 1.39.15. Luego, compila con banderas como estas:

```
emcc -s ALLOW_MEMORY_GROWTH -s MAXIMUM_MEMORY=4GB
```

Estas permiten el crecimiento de memoria y permiten al programa asignar hasta 4GB de memoria. Ten en cuenta que, de manera predeterminada, solo podrás asignar hasta 2GB: debes optar explícitamente por usar 2-4GB (esto nos permite generar un código más compacto de otro modo, emitiendo `>>` en lugar de `>>>` como se mencionó anteriormente).

Asegúrate de probar en Chrome M83 (actualmente en Beta) o versiones posteriores. ¡Por favor, reporta problemas si encuentras algo incorrecto!

## Conclusión

El soporte para hasta 4GB de memoria es otro paso en hacer que la web sea tan capaz como las plataformas nativas, permitiendo que los programas de 32 bits puedan usar tanta memoria como normalmente lo harían. Por sí solo, esto no habilita una clase completamente nueva de aplicaciones, pero sí permite experiencias de gama alta, como un nivel muy grande en un juego o manipular contenido grande en un editor gráfico.

Como se mencionó anteriormente, también se planea el soporte para memoria de 64 bits, lo que permitirá acceder a más de 4GB. Sin embargo, wasm64 tendrá la misma desventaja que tienen los 64 bits en las plataformas nativas: los punteros ocupan el doble de memoria. Por eso, el soporte de 4GB en wasm32 es tan importante: ¡Podemos acceder al doble de memoria que antes mientras el tamaño del código permanece tan compacto como siempre ha sido wasm!

Como siempre, prueba tu código en múltiples navegadores, y también recuerda que 2-4GB es mucha memoria. Si necesitas tanto, úsala, pero no lo hagas innecesariamente, ya que no habrá suficiente memoria libre en muchas máquinas de los usuarios. Recomendamos que comiences con una memoria inicial lo más pequeña posible y la hagas crecer si es necesario; y si permites el crecimiento, maneja con gracia el caso de una falla de `malloc()`.
