---
title: 'Versión de V8 v9.6'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))'
avatars:
 - 'ingvar-stepanyan'
date: 2021-10-13
tags:
 - versión
description: 'La versión de V8 v9.6 trae soporte para Tipos de Referencia a WebAssembly.'
tweet: '1448262079476076548'
---
Cada cuatro semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](https://v8.dev/docs/release-process). Cada versión se deriva del maestro de Git de V8 inmediatamente antes de un hito de Chrome Beta. Hoy nos complace anunciar nuestra rama más reciente, [V8 versión 9.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.6), que está en beta hasta su lanzamiento en coordinación con Chrome 96 Stable en varias semanas. V8 v9.6 está llena de todo tipo de mejoras para los desarrolladores. Esta publicación ofrece un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## WebAssembly

### Tipos de Referencia

La [propuesta de Tipos de Referencia](https://github.com/WebAssembly/reference-types/blob/master/proposals/reference-types/Overview.md), lanzada en V8 v9.6, permite utilizar referencias externas de JavaScript de manera opaca en módulos de WebAssembly. El tipo de dato `externref` (anteriormente conocido como `anyref`) proporciona una forma segura de mantener una referencia a un objeto de JavaScript y está completamente integrado con el recolector de basura de V8.

Algunos conjuntos de herramientas que ya tienen soporte opcional para tipos de referencia son [wasm-bindgen para Rust](https://rustwasm.github.io/wasm-bindgen/reference/reference-types.html) y [AssemblyScript](https://www.assemblyscript.org/compiler.html#command-line-options).

## API de V8

Por favor, utilice `git log branch-heads/9.5..branch-heads/9.6 include/v8\*.h` para obtener una lista de los cambios en la API.

Los desarrolladores con una copia activa de V8 pueden usar `git checkout -b 9.6 -t branch-heads/9.6` para experimentar con las nuevas características en V8 v9.6. Alternativamente, puede [suscribirse al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características pronto.
