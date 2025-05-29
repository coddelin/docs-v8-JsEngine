---
title: 'Lanzamiento de V8 versión v6.4'
author: 'el equipo de V8'
date: 2017-12-19 13:33:37
tags:
  - lanzamiento
description: 'V8 v6.4 incluye mejoras de rendimiento, nuevas características del lenguaje JavaScript y más.'
tweet: '943057597481082880'
---
Cada seis semanas, creamos una nueva rama de V8 como parte de nuestro [proceso de lanzamiento](/docs/release-process). Cada versión se ramifica desde el maestro de Git de V8 inmediatamente antes de un hito Beta de Chrome. Hoy nos complace anunciar nuestra nueva rama, [V8 versión 6.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.4), que está en beta hasta su lanzamiento junto con Chrome 64 Estable en unas semanas. V8 v6.4 está lleno de todo tipo de novedades para los desarrolladores. Este artículo ofrece un adelanto de algunos de los aspectos destacados en anticipación al lanzamiento.

<!--truncate-->
## Velocidad

V8 v6.4 [mejora](https://bugs.chromium.org/p/v8/issues/detail?id=6971) el rendimiento del operador `instanceof` en un 3.6×. Como resultado directo, [uglify-js](http://lisperator.net/uglifyjs/) ahora es un 15–20% más rápido según el [Web Tooling Benchmark de V8](https://github.com/v8/web-tooling-benchmark).

Esta versión también aborda algunos problemas de rendimiento en `Function.prototype.bind`. Por ejemplo, TurboFan ahora [emite inline consistentemente](https://bugs.chromium.org/p/v8/issues/detail?id=6946) todas las llamadas monomórficas a `bind`. Además, TurboFan también admite el _patrón de callback vinculado_, lo que significa que en lugar de lo siguiente:

```js
doSomething(callback, someObj);
```

Ahora puedes usar:

```js
doSomething(callback.bind(someObj));
```

De esta manera, el código es más legible y aún obtienes el mismo rendimiento.

Gracias a las últimas contribuciones de [Peter Wong](https://twitter.com/peterwmwong), [`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap) y [`WeakSet`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet) ahora están implementados utilizando el [CodeStubAssembler](/blog/csa), resultando en mejoras de rendimiento de hasta 5× en general.

![](/_img/v8-release-64/weak-collection.svg)

Como parte del [esfuerzo continuo](https://bugs.chromium.org/p/v8/issues/detail?id=1956) de V8 para mejorar el rendimiento de las funciones incorporadas de arrays, mejoramos el rendimiento de `Array.prototype.slice` en ~4× al reimplementarlo utilizando el CodeStubAssembler. Además, las llamadas a `Array.prototype.map` y `Array.prototype.filter` ahora están optimizadas en muchos casos, otorgándoles un perfil de rendimiento competitivo con las versiones hechas a mano.

Trabajamos para que las cargas fuera de los límites en arrays, typed arrays y strings [ya no sufran un impacto de rendimiento de ~10×](https://bugs.chromium.org/p/v8/issues/detail?id=7027) después de notar [este patrón de codificación](/blog/elements-kinds#avoid-reading-beyond-length) utilizado comúnmente.

## Memoria

Los objetos de código integrados y los manejadores de bytecode en V8 ahora se deserializan de manera perezosa desde el snapshot, lo que puede reducir significativamente la memoria consumida por cada Isolate. Los benchmarks en Chrome muestran un ahorro de varios cientos de KB por pestaña al navegar por sitios comunes.

![](/_img/v8-release-64/codespace-consumption.svg)

Esté atento a un artículo dedicado sobre este tema a principios del próximo año.

## Características del lenguaje ECMAScript

Esta versión de V8 incluye soporte para dos nuevas y emocionantes características de expresiones regulares.

En expresiones regulares con la bandera `/u`, [los escapes de propiedades Unicode](https://mathiasbynens.be/notes/es-unicode-property-escapes) ahora están habilitados de manera predeterminada.

```js
const regexGreekSymbol = /\p{Script_Extensions=Greek}/u;
regexGreekSymbol.test('π');
// → verdadero
```

El soporte para [grupos de captura nombrados](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features#named_captures) en expresiones regulares ahora está habilitado de forma predeterminada.

```js
const pattern = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/u;
const result = pattern.exec('2017-12-15');
// result.groups.year === '2017'
// result.groups.month === '12'
// result.groups.day === '15'
```

Más detalles sobre estas características están disponibles en nuestro artículo titulado [Próximas características de expresiones regulares](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features).

Gracias a [Groupon](https://twitter.com/GrouponEng), V8 ahora implementa [`import.meta`](https://github.com/tc39/proposal-import-meta), lo que permite a los embebedores exponer metadatos específicos del host sobre el módulo actual. Por ejemplo, Chrome 64 expone la URL del módulo a través de `import.meta.url`, y Chrome planea agregar más propiedades a `import.meta` en el futuro.

Para facilitar el formato sensible al local de las cadenas producidas por los formateadores de internacionalización, los desarrolladores ahora pueden usar [`Intl.NumberFormat.prototype.formatToParts()`](https://github.com/tc39/proposal-intl-formatToParts) para formatear un número en una lista de tokens y su tipo. ¡Gracias a [Igalia](https://twitter.com/igalia) por implementar esto en V8!

## API de V8

Por favor, utiliza `git log branch-heads/6.3..branch-heads/6.4 include/v8.h` para obtener una lista de los cambios en la API.

Los desarrolladores con un [checkout activo de V8](/docs/source-code#using-git) pueden usar `git checkout -b 6.4 -t branch-heads/6.4` para experimentar con las nuevas características en V8 v6.4. Alternativamente, puedes [suscribirte al canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) y probar las nuevas características por ti mismo pronto.
