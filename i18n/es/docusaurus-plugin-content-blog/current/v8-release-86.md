---
title: 'Lanzamiento de V8 v8.6'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), un fuzzer de teclado'
avatars:
 - 'ingvar-stepanyan'
date: 2020-09-21
tags:
 - lanzamiento
description: 'El lanzamiento de V8 v8.6 trae código respetuoso, mejoras de rendimiento y cambios normativos.'
tweet: '1308062287731789825'
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](https://v8.dev/docs/release-process). Cada versión se deriva del maestro de Git de V8 inmediatamente antes de un hito Beta de Chrome. Hoy nos complace anunciar nuestra nueva rama, [V8 versión 8.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.6), que está en beta hasta su lanzamiento en coordinación con Chrome 86 Stable en varias semanas. V8 v8.6 está lleno de todo tipo de novedades para los desarrolladores. Esta publicación proporciona un adelanto de algunos de los aspectos destacados con anticipación al lanzamiento.

<!--truncate-->
## Código respetuoso

La versión v8.6 hace que la base de código de V8 sea [más respetuosa](https://v8.dev/docs/respectful-code). El equipo se unió a un esfuerzo en todo Chromium para cumplir con los compromisos de Google con la equidad racial al reemplazar algunos términos insensibles en el proyecto. Este es todavía un esfuerzo en curso y cualquier colaborador externo es bienvenido a ayudar! Puedes ver la lista de tareas disponibles [aquí](https://docs.google.com/document/d/1rK7NQK64c53-qbEG-N5xz7uY_QUVI45sUxinbyikCYM/edit).

## JavaScript

### JS-Fuzzer de código abierto

JS-Fuzzer es un fuzzer de JavaScript basado en mutaciones originalmente creado por Oliver Chang. Ha sido una piedra angular de la [estabilidad](https://bugs.chromium.org/p/chromium/issues/list?q=ochang_js_fuzzer%20label%3AStability-Crash%20label%3AClusterfuzz%20-status%3AWontFix%20-status%3ADuplicate&can=1) y la [seguridad](https://bugs.chromium.org/p/chromium/issues/list?q=ochang_js_fuzzer%20label%3ASecurity%20label%3AClusterfuzz%20-status%3AWontFix%20-status%3ADuplicate&can=1) de V8 en el pasado y ahora es [de código abierto](https://chromium-review.googlesource.com/c/v8/v8/+/2320330).

El fuzzer muta casos de prueba entre motores existentes utilizando transformaciones AST de [Babel](https://babeljs.io/) configuradas por clases de [mutadores extensibles](https://chromium.googlesource.com/v8/v8/+/320d98709f/tools/clusterfuzz/js_fuzzer/mutators/). Recientemente también comenzamos a ejecutar una instancia del fuzzer en modo de prueba diferencial para detectar [problemas de corrección](https://bugs.chromium.org/p/chromium/issues/list?q=blocking%3A1050674%20-status%3ADuplicate&can=1) de JavaScript. ¡Las contribuciones son bienvenidas! Consulta el [README](https://chromium.googlesource.com/v8/v8/+/master/tools/clusterfuzz/js_fuzzer/README.md) para más información.

### Aceleraciones en `Number.prototype.toString`

Convertir un número de JavaScript a una cadena puede ser una operación sorprendentemente compleja en el caso general; debemos tener en cuenta la precisión de coma flotante, la notación científica, NaNs, infinitos, redondeo, y más. Ni siquiera sabemos qué tan grande será la cadena resultante antes de calcularla. Debido a esto, nuestra implementación de `Number.prototype.toString` delegaba a una función de tiempo de ejecución en C++.

Pero, muchas veces, solo quieres imprimir un entero pequeño y simple (un “Smi”). Esta es una operación mucho más sencilla, y los costos de llamar a una función de tiempo de ejecución en C++ ya no valen la pena. Así que hemos trabajado con nuestros amigos de Microsoft para añadir un camino rápido simple para enteros pequeños a `Number.prototype.toString`, escrito en Torque, para reducir estos costos generales en este caso común. Esto mejoró las micropruebas de impresión de números en ~75%.

### `Atomics.wake` eliminado

`Atomics.wake` fue renombrado a `Atomics.notify` para coincidir con un cambio en la especificación [en v7.3](https://v8.dev/blog/v8-release-73#atomics.notify). Ahora se eliminó el alias `Atomics.wake` que estaba en desuso.

### Pequeños cambios normativos

- Las clases anónimas ahora tienen una propiedad `.name` cuyo valor es la cadena vacía `''`. [Cambio en la especificación](https://github.com/tc39/ecma262/pull/1490).
- Las secuencias de escape `\8` y `\9` ahora son ilegales en literales de cadenas de plantilla en [modo permisivo](https://developer.mozilla.org/en-US/docs/Glossary/Sloppy_mode) y en todos los literales de cadenas en [modo estricto](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode). [Cambio en la especificación](https://github.com/tc39/ecma262/pull/2054).
- El objeto incorporado `Reflect` ahora tiene una propiedad `Symbol.toStringTag` cuyo valor es `'Reflect'`. [Cambio en la especificación](https://github.com/tc39/ecma262/pull/2057).

## WebAssembly

### SIMD en Liftoff

Liftoff es el compilador base para WebAssembly, y a partir de V8 v8.5 se envía en todas las plataformas. La propuesta de [SIMD](https://v8.dev/features/simd) permite que WebAssembly aproveche las instrucciones de vector de hardware comúnmente disponibles para acelerar cargas de trabajo intensivas en cálculos. Actualmente se encuentra en una [prueba de origen](https://v8.dev/blog/v8-release-84#simd-origin-trial), lo que permite a los desarrolladores experimentar con una característica antes de que se estandarice.

Hasta ahora, SIMD solo se implementaba en TurboFan, el compilador de nivel superior de V8. Esto es necesario para obtener el máximo rendimiento de las instrucciones SIMD. Los módulos de WebAssembly que usan instrucciones SIMD tendrán un inicio más rápido y, a menudo, un rendimiento en tiempo de ejecución más rápido que sus equivalentes escalares compilados con TurboFan. Por ejemplo, dada una función que toma un arreglo de flotantes y ajusta sus valores a cero (escrita aquí en JavaScript para claridad):

```js
function clampZero(f32array) {
  for (let i = 0; i < f32array.length; ++i) {
    if (f32array[i] < 0) {
      f32array[i] = 0;
    }
  }
}
```

Comparemos dos implementaciones diferentes de esta función, usando Liftoff y TurboFan:

1. Una implementación escalar, con el bucle desglosado 4 veces.
2. Una implementación SIMD, usando la instrucción `i32x4.max_s`.

Usando la implementación escalar de Liftoff como base, vemos los siguientes resultados:

![Un gráfico que muestra que Liftoff SIMD es ~2.8× más rápido que Liftoff escalar frente a TurboFan SIMD que es ~7.5× más rápido](/_img/v8-release-86/simd.svg)

### Llamadas más rápidas de Wasm a JS

Si WebAssembly llama a una función JavaScript importada, lo hace a través de un denominado "wrapper Wasm-to-JS" (o "import wrapper"). Este wrapper [traduce los argumentos](https://webassembly.github.io/spec/js-api/index.html#tojsvalue) en objetos que JavaScript entiende, y cuando la llamada a JavaScript regresa, traduce nuevamente los valores de retorno [a WebAssembly](https://webassembly.github.io/spec/js-api/index.html#towebassemblyvalue).

Para garantizar que el objeto `arguments` de JavaScript refleje exactamente los argumentos que se pasaron desde WebAssembly, se utiliza un "trampolín adaptador de argumentos" si se detecta una discrepancia en el número de argumentos.

En muchos casos, sin embargo, esto no es necesario, porque la función llamada no utiliza el objeto `arguments`. En v8.6, aplicamos un [parche](https://crrev.com/c/2317061) de nuestros colaboradores de Microsoft que evita la llamada a través del adaptador de argumentos en esos casos, lo que hace que las llamadas afectadas sean significativamente más rápidas.

## API de V8

### Detectar tareas pendientes en segundo plano con `Isolate::HasPendingBackgroundTasks`

La nueva función de API `Isolate::HasPendingBackgroundTasks` permite a los integradores verificar si hay trabajo pendiente en segundo plano que eventualmente publicará nuevas tareas en primer plano, como la compilación de WebAssembly.

Esta API debería resolver el problema en el que un integrador apaga V8 aunque todavía exista compilación pendiente de WebAssembly que eventualmente iniciará más ejecuciones de script. Con `Isolate::HasPendingBackgroundTasks`, el integrador puede esperar nuevas tareas en primer plano en lugar de apagar V8.

Por favor, use `git log branch-heads/8.5..branch-heads/8.6 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con un checkout activo de V8 pueden usar `git checkout -b 8.6 -t branch-heads/8.6` para experimentar con las nuevas características de V8 v8.6. Alternativamente, pueden [suscribirse al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar pronto las nuevas características ustedes mismos.
