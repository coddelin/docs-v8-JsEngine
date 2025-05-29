---
title: '`globalThis`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2019-07-16
tags:
  - ECMAScript
  - ES2020
  - Node.js 12
  - io19
description: 'globalThis führt einen einheitlichen Mechanismus ein, um das globale this in jeder JavaScript-Umgebung unabhängig vom Ziel des Scripts zuzugreifen.'
tweet: '1151140681374547969'
---
Wenn Sie schon einmal JavaScript für die Verwendung in einem Webbrowser geschrieben haben, haben Sie möglicherweise `window` verwendet, um auf das globale `this` zuzugreifen. In Node.js haben Sie möglicherweise `global` verwendet. Wenn Sie Code geschrieben haben, der in beiden Umgebungen funktionieren muss, haben Sie möglicherweise festgestellt, welche von diesen verfügbar ist, und diese dann verwendet – aber die Liste der zu überprüfenden Bezeichner wächst mit der Anzahl der Umgebungen und Anwendungsfälle, die Sie unterstützen möchten. Das gerät schnell außer Kontrolle:

<!--truncate-->
```js
// Ein naiver Versuch, das globale `this` zu erhalten. Verwenden Sie dies nicht!
const getGlobalThis = () => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  // Hinweis: Dies könnte immer noch das falsche Ergebnis zurückgeben!
  if (typeof this !== 'undefined') return this;
  throw new Error('Unable to locate global `this`');
};
const theGlobalThis = getGlobalThis();
```

Weitere Einzelheiten dazu, warum der obige Ansatz unzureichend ist (sowie eine noch kompliziertere Technik), finden Sie unter [_a horrifying `globalThis` polyfill in universal JavaScript_](https://mathiasbynens.be/notes/globalthis).

[Der `globalThis` Vorschlag](https://github.com/tc39/proposal-global) führt einen *einheitlichen* Mechanismus ein, um das globale `this` in jeder JavaScript-Umgebung (Browser, Node.js oder etwas anderes?) unabhängig vom Ziel des Scripts (klassisches Script oder Modul?) zuzugreifen.

```js
const theGlobalThis = globalThis;
```

Beachten Sie, dass moderner Code möglicherweise überhaupt keinen Zugriff auf das globale `this` benötigt. Mit JavaScript-Modulen können Sie Funktionen deklarativ mit `import` und `export` verwenden, anstatt mit globalem Zustand zu arbeiten. `globalThis` ist jedoch weiterhin nützlich für Polyfills und andere Bibliotheken, die globalen Zugriff benötigen.

## `globalThis` Unterstützung

<feature-support chrome="71 /blog/v8-release-71#javascript-language-features"
                 firefox="65"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-globalthis"></feature-support>
