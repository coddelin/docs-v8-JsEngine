---
title: &apos;Lanzamiento de V8 v8.7&apos;
author: &apos;Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), portador de bandera de V8&apos;
avatars:
 - &apos;ingvar-stepanyan&apos;
date: 2020-10-23
tags:
 - lanzamiento
description: &apos;El lanzamiento de V8 v8.7 trae nueva API para llamadas nativas, Atomics.waitAsync, corrección de errores y mejoras de rendimiento.&apos;
tweet: &apos;1319654229863182338&apos;
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](https://v8.dev/docs/release-process). Cada versión se deriva del maestro de Git de V8 inmediatamente antes de un hito de Chrome Beta. Hoy nos complace anunciar nuestra nueva rama, [V8 versión 8.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.7), que está en fase beta hasta su lanzamiento en coordinación con Chrome 87 Stable en varias semanas. V8 v8.7 está lleno de todo tipo de novedades orientadas a los desarrolladores. Esta publicación ofrece un adelanto de algunos de los aspectos más destacados en anticipación al lanzamiento.

<!--truncate-->
## JavaScript

### Llamadas rápidas inseguras de JS

V8 v8.7 viene con una API mejorada para realizar llamadas nativas desde JavaScript.

La función aún es experimental y se puede habilitar mediante la bandera `--turbo-fast-api-calls` en V8 o la bandera correspondiente `--enable-unsafe-fast-js-calls` en Chrome. Está diseñada para mejorar el rendimiento de algunas API gráficas nativas en Chrome, pero también puede ser utilizada por otros incrustadores. Proporciona nuevos medios para que los desarrolladores creen instancias de `v8::FunctionTemplate`, como se documenta en este [archivo de encabezado](https://source.chromium.org/chromium/chromium/src/+/master:v8/include/v8-fast-api-calls.h). Las funciones creadas usando la API original permanecerán sin cambios.

Para más información y una lista de las funciones disponibles, por favor consulta [este explicador](https://docs.google.com/document/d/1nK6oW11arlRb7AA76lJqrBIygqjgdc92aXUPYecc9dU/edit?usp=sharing).

### `Atomics.waitAsync`

[`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md) ahora está disponible en V8 v8.7.

[`Atomics.wait`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/wait) y [`Atomics.notify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/notify) son primitivas de sincronización de bajo nivel útiles para implementar mutexes y otros medios de sincronización. Sin embargo, dado que `Atomics.wait` es bloqueante, no es posible llamarlo en el hilo principal (intentar hacerlo lanzará un TypeError). La versión no bloqueante, [`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md), también puede ser utilizada en el hilo principal.

Consulta [nuestro explicador sobre las API de `Atomics`](https://v8.dev/features/atomics) para más detalles.

## API de V8

Por favor utiliza `git log branch-heads/8.6..branch-heads/8.7 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con una versión activa de V8 pueden usar `git checkout -b 8.7 -t branch-heads/8.7` para experimentar con las nuevas funciones en V8 v8.7. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas funciones tú mismo pronto.
