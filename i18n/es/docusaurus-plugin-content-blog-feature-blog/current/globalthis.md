---
title: "`globalThis`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2019-07-16
tags:
  - ECMAScript
  - ES2020
  - Node.js 12
  - io19
description: "globalThis introduce un mecanismo unificado para acceder al this global en cualquier entorno JavaScript, independientemente del propósito del script."
tweet: "1151140681374547969"
---
Si has escrito JavaScript para usar en un navegador web antes, es posible que hayas usado `window` para acceder al `this` global. En Node.js, quizás hayas usado `global`. Si has escrito código que debe funcionar en cualquiera de estos entornos, quizás detectaste cuál de estos está disponible y luego lo usaste, pero la lista de identificadores a verificar crece con el número de entornos y casos de uso que deseas admitir. Esto se sale de control rápidamente:

<!--truncate-->
```js
// Un intento ingenuo de obtener el `this` global. ¡No uses esto!
const getGlobalThis = () => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  // Nota: ¡Esto aún podría devolver un resultado incorrecto!
  if (typeof this !== 'undefined') return this;
  throw new Error('No se puede localizar el `this` global');
};
const theGlobalThis = getGlobalThis();
```

Para más detalles sobre por qué el enfoque anterior es insuficiente (así como una técnica aún más complicada), lee [_un horripilante polyfill de `globalThis` en JavaScript universal_](https://mathiasbynens.be/notes/globalthis).

[La propuesta de `globalThis`](https://github.com/tc39/proposal-global) introduce un mecanismo *unificado* para acceder al `this` global en cualquier entorno JavaScript (¿navegador, Node.js u otro?), independientemente del propósito del script (¿script clásico o módulo?).

```js
const theGlobalThis = globalThis;
```

Ten en cuenta que es posible que el código moderno no necesite acceso al `this` global en absoluto. Con los módulos de JavaScript, puedes `importar` y `exportar` funcionalidad de manera declarativa en lugar de lidiar con el estado global. `globalThis` sigue siendo útil para polyfills y otras bibliotecas que necesitan acceso global.

## Soporte para `globalThis`

<feature-support chrome="71 /blog/v8-release-71#javascript-language-features"
                 firefox="65"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-globalthis"></feature-support>
