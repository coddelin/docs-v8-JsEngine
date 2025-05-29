---
title: 'Compatibilidad de características'
permalink: /features/support/
layout: layouts/base.njk
description: 'Este documento explica los listados de compatibilidad de características del lenguaje JavaScript y WebAssembly como se utilizan en el sitio web de V8.'
---
# Compatibilidad de características de JavaScript/Wasm

[Nuestros explicadores de características del lenguaje JavaScript y WebAssembly](/features) a menudo incluyen listados de compatibilidad de características como el siguiente:

<feature-support chrome="71"
                 firefox="65"
                 safari="12"
                 nodejs="12"
                 babel="yes"></feature-support>

Una característica sin soporte se vería así:

<feature-support chrome="no"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

Para características de vanguardia, es común ver soporte mixto entre entornos:

<feature-support chrome="partial"
                 firefox="yes"
                 safari="yes"
                 nodejs="no"
                 babel="yes"></feature-support>

El objetivo es proporcionar una visión rápida de la madurez de una característica no solo en V8 y Chrome, sino en todo el ecosistema más amplio de JavaScript. Cabe destacar que esto no se limita a implementaciones nativas en máquinas virtuales de JavaScript en desarrollo activo como V8, sino que también incluye soporte de herramientas, representado aquí utilizando el ícono de [Babel](https://babeljs.io/).

<!--truncate-->
La entrada de Babel cubre varios significados:

- Para características sintácticas del lenguaje como [campos de clase](/features/class-fields), se refiere al soporte de transpilación.
- Para características del lenguaje que son nuevas APIs como [`Promise.allSettled`](/features/promise-combinators#promise.allsettled), se refiere al soporte de polyfill. (Babel ofrece polyfills a través del [proyecto core-js](https://github.com/zloirock/core-js).)

El logo de Chrome representa V8, Chromium y cualquier navegador basado en Chromium.
