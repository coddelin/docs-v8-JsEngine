---
title: "`at` Methode für relative Indizierung"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu))"
avatars:
  - "shu-yu-guo"
date: 2021-07-13
tags:
  - ECMAScript
description: "JavaScript hat jetzt eine Methode zur relativen Indizierung für Arrays, TypedArrays und Strings."
---

Die neue `at`-Methode auf `Array.prototype`, den verschiedenen TypedArray-Prototypen und `String.prototype` macht das Zugreifen auf ein Element näher am Ende der Sammlung einfacher und prägnanter.

Der Zugriff auf das N-te Element vom Ende einer Sammlung ist eine häufige Operation. Jedoch sind die üblichen Wege dafür umständlich, wie `my_array[my_array.length - N]`, oder möglicherweise nicht performant, wie `my_array.slice(-N)[0]`. Die neue `at`-Methode macht diese Operation ergonomischer, indem negative Indizes interpretiert werden, um "vom Ende" zu bedeuten. Die vorherigen Beispiele können als `my_array.at(-N)` ausgedrückt werden.

<!--truncate-->
Zur Einheitlichkeit werden auch positive Indizes unterstützt, die äquivalent zum gewöhnlichen Eigenschaftszugriff sind.

Diese neue Methode ist klein genug, dass ihre vollständige Semantik durch diese konforme Polyfill-Implementierung unten verstanden werden kann:

```js
function at(n) {
  // Das Argument in eine Ganzzahl umwandeln
  n = Math.trunc(n) || 0;
  // Negatives Indizieren vom Ende erlauben
  if (n < 0) n += this.length;
  // Zugriff außerhalb der Grenzen gibt undefined zurück
  if (n < 0 || n >= this.length) return undefined;
  // Andernfalls ist dies nur ein normaler Eigenschaftszugriff
  return this[n];
}
```

## Ein Wort über Strings

Da `at` letztendlich gewöhnliches Indizieren durchführt, gibt der Aufruf von `at` auf String-Werten Code-Einheiten zurück, genau wie gewöhnliches Indizieren. Und wie beim gewöhnlichen Indizieren von Strings sind Code-Einheiten möglicherweise nicht das, was Sie für Unicode-Strings wollen! Bitte überlegen Sie, ob [`String.prototype.codePointAt()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/codePointAt) für Ihren Anwendungsfall besser geeignet ist.

## Unterstützung der `at`-Methode

<feature-support chrome="92"
                 firefox="90"
                 safari="no"
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#relative-indexing-method"></feature-support>
