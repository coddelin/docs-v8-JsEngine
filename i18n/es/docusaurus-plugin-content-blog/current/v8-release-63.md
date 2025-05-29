---
title: "Lanzamiento de V8 v6.3"
author: "el equipo de V8"
date: 2017-10-25 13:33:37
tags:
  - lanzamiento
description: "V8 v6.3 incluye mejoras de rendimiento, reducción en el consumo de memoria y soporte para nuevas características del lenguaje JavaScript."
tweet: "923168001108643840"
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se deriva del Git master de V8 inmediatamente antes de un hito de Chrome Beta. Hoy nos complace anunciar nuestra rama más reciente, [versión 6.3 de V8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.3), que está en beta hasta su lanzamiento en coordinación con Chrome 63 Stable en varias semanas. V8 v6.3 está repleta de todo tipo de novedades para desarrolladores. Este post proporciona un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## Velocidad

[Jank Busters](/blog/jank-busters) III llegó como parte del proyecto [Orinoco](/blog/orinoco). El marcado concurrente ([70-80%](https://chromeperf.appspot.com/report?sid=612eec65c6f5c17528f9533349bad7b6f0020dba595d553b1ea6d7e7dcce9984) del marcado se realiza en un hilo no bloqueante) está incluido.

El analizador ahora no [necesita preanalizar una función por segunda vez](https://docs.google.com/document/d/1TqpdGeLmURL2gc18s6PwNeyZOvayQJtJ16TCn0BEt48/edit#heading=h.un2pnqwbiw11). Esto se traduce en una [mejora mediana del 14% en el tiempo de análisis](https://docs.google.com/document/d/1TqpdGeLmURL2gc18s6PwNeyZOvayQJtJ16TCn0BEt48/edit#heading=h.dvuo4tqnsmml) en nuestro benchmark interno de inicio Top25.

`string.js` ha sido completamente migrado a CodeStubAssembler. Muchas gracias a [@peterwmwong](https://twitter.com/peterwmwong) por [sus increíbles contribuciones](https://chromium-review.googlesource.com/q/peter.wm.wong)! Para los desarrolladores, esto significa que las funciones incorporadas de cadenas como `String#trim` son mucho más rápidas a partir de V8 v6.3.

El rendimiento de `Object.is()` ahora está más o menos a la par con las alternativas. En general, V8 v6.3 sigue mejorando el rendimiento de ES2015+. Entre otros elementos, incrementamos la [velocidad de acceso polimórfico a símbolos](https://bugs.chromium.org/p/v8/issues/detail?id=6367), la [inclusión polimórfica de llamadas a constructores](https://bugs.chromium.org/p/v8/issues/detail?id=6885) y [literales de plantilla (etiquetados)](https://pasteboard.co/GLYc4gt.png).

![Rendimiento de V8 durante las últimas seis versiones](/_img/v8-release-63/ares6.svg)

La lista de funciones optimizadas débiles ha sido eliminada. Más información se puede encontrar en [el post dedicado](/blog/lazy-unlinking).

Los elementos mencionados son una lista no exhaustiva de las mejoras de velocidad. Se han realizado muchos otros trabajos relacionados con el rendimiento.

## Consumo de memoria

[Las barreras de escritura ahora utilizan CodeStubAssembler](https://chromium.googlesource.com/v8/v8/+/dbfdd4f9e9741df0a541afdd7516a34304102ee8). Esto ahorra alrededor de 100 KB de memoria por aislado.

## Características del lenguaje JavaScript

V8 ahora soporta las siguientes características de etapa 3: [importación dinámica de módulos vía `import()`](/features/dynamic-import), [`Promise.prototype.finally()`](/features/promise-finally) y [iteradores/generadores asíncronos](https://github.com/tc39/proposal-async-iteration).

Con [importación dinámica de módulos](/features/dynamic-import) es muy sencillo importar módulos basados en condiciones de tiempo de ejecución. Esto es útil cuando una aplicación debe cargar ciertos módulos de código de forma diferida.

[`Promise.prototype.finally`](/features/promise-finally) introduce una forma fácil de realizar limpieza después de que una promesa se resuelve.

La iteración con funciones asíncronas se ha vuelto más ergonómica con la introducción de [iteradores/generadores asíncronos](https://github.com/tc39/proposal-async-iteration).

En el lado de `Intl`, [`Intl.PluralRules`](/features/intl-pluralrules) ahora es compatible. Esta API permite pluralizaciones internacionalizadas eficientes.

## Inspector/Depuración

En Chrome 63, la [cobertura de bloques](https://docs.google.com/presentation/d/1IFqqlQwJ0of3NuMvcOk-x4P_fpi1vJjnjGrhQCaJkH4/edit#slide=id.g271d6301ff_0_44) también es compatible en la interfaz de DevTools. Por favor, tenga en cuenta que el protocolo del inspector ya soporta cobertura de bloques desde V8 v6.2.

## API de V8

Por favor, revise nuestro [resumen de cambios en la API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Este documento se actualiza regularmente unas semanas después de cada lanzamiento importante.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 6.3 -t branch-heads/6.3` para experimentar con las nuevas características en V8 v6.3. Alternativamente, puede [suscribirse al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características pronto usted mismo.
