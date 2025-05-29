---
title: &apos;Lanzamiento de V8 v6.7&apos;
author: &apos;el equipo de V8&apos;
date: 2018-05-04 13:33:37
tags:
  - lanzamiento
tweet: &apos;992506342391742465&apos;
description: &apos;V8 v6.7 añade más mitigaciones para código no confiable y soporta BigInt.&apos;
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se deriva del repositorio Git principal de V8 inmediatamente antes de un hito Beta de Chrome. Hoy nos complace anunciar nuestra nueva rama, [V8 versión 6.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.7), que está en beta hasta su lanzamiento en coordinación con Chrome 67 Estable en varias semanas. V8 v6.7 está lleno de todo tipo de funcionalidades dirigidas a desarrolladores. Este artículo ofrece un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## Características del lenguaje JavaScript

V8 v6.7 viene con soporte para BigInt habilitado por defecto. Los BigInts son un nuevo tipo primitivo numérico en JavaScript que puede representar enteros con precisión arbitraria. Lee [nuestra explicación de la característica BigInt](/features/bigint) para más información sobre cómo se pueden usar en JavaScript, y revisa [nuestro artículo con más detalles sobre la implementación en V8](/blog/bigint).

## Mitigaciones para código no confiable

En V8 v6.7 hemos implementado [más mitigaciones para vulnerabilidades de canal lateral](/docs/untrusted-code-mitigations) para prevenir filtraciones de información a código JavaScript y WebAssembly no confiables.

## API de V8

Por favor usa `git log branch-heads/6.6..branch-heads/6.7 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 6.7 -t branch-heads/6.7` para experimentar con las nuevas funcionalidades de V8 v6.7. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar tú mismo las nuevas funcionalidades pronto.
