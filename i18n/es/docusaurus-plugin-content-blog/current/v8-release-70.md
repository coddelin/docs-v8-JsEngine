---
title: 'Lanzamiento de V8 versión v7.0'
author: 'Michael Hablich'
avatars:
  - michael-hablich
date: 2018-10-15 17:17:00
tags:
  - lanzamiento
description: '¡V8 v7.0 incluye hilos de WebAssembly, Symbol.prototype.description y funciones integradas embebidas en más plataformas!'
tweet: '1051857446279532544'
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se deriva del maestro de Git de V8 inmediatamente antes de un hito de Chrome Beta. Hoy nos complace anunciar nuestra rama más reciente, [V8 versión 7.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.0), que está en beta hasta su lanzamiento en coordinación con Chrome 70 Stable en varias semanas. V8 v7.0 está lleno de todo tipo de novedades para los desarrolladores. Esta publicación ofrece un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## Funciones integradas embebidas

[Las funciones integradas embebidas](/blog/embedded-builtins) ahorran memoria compartiendo el código generado entre múltiples aislados de V8. A partir de V8 v6.9, habilitamos las funciones integradas embebidas en x64. V8 v7.0 lleva estos ahorros de memoria a todas las plataformas restantes excepto ia32.

## Una vista previa de los hilos de WebAssembly

WebAssembly (Wasm) permite compilar código escrito en C++ y otros lenguajes para ejecutarse en la web. Una característica muy útil de las aplicaciones nativas es la capacidad de usar hilos, un mecanismo para la computación paralela. La mayoría de los desarrolladores de C y C++ estarán familiarizados con pthreads, que es una API estandarizada para la gestión de hilos de aplicaciones.

El [Grupo Comunitario de WebAssembly](https://www.w3.org/community/webassembly/) ha estado trabajando en llevar los hilos a la web para habilitar aplicaciones realmente multi-hilo. Como parte de este esfuerzo, V8 ha implementado el soporte necesario para hilos en el motor de WebAssembly. Para usar esta función en Chrome, puedes habilitarla a través de `chrome://flags/#enable-webassembly-threads`, o tu sitio puede inscribirse en una [Prueba de Origen](https://github.com/GoogleChrome/OriginTrials). Las Pruebas de Origen permiten a los desarrolladores experimentar con nuevas funciones de la web antes de que estén completamente estandarizadas, lo que nos ayuda a recopilar comentarios del mundo real que son fundamentales para validar y mejorar nuevas funciones.

## Características del lenguaje JavaScript

[Una propiedad `description`](https://tc39.es/proposal-Symbol-description/) se está agregando a `Symbol.prototype`. Esto proporciona una forma más ergonómica de acceder a la descripción de un `Symbol`. Anteriormente, la descripción solo podía accederse indirectamente a través de `Symbol.prototype.toString()`. ¡Gracias a Igalia por contribuir con esta implementación!

`Array.prototype.sort` ahora es estable en V8 v7.0. Anteriormente, V8 usaba QuickSort inestable para arreglos con más de 10 elementos. Ahora, utilizamos el algoritmo estable TimSort. Consulta [nuestra publicación en el blog](/blog/array-sort) para más detalles.

## API de V8

Por favor, usa `git log branch-heads/6.9..branch-heads/7.0 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 7.0 -t branch-heads/7.0` para experimentar con las nuevas funciones en V8 v7.0. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas funciones pronto tú mismo.
