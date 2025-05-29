---
title: 'V8-Version v9.7'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))'
avatars:
 - 'ingvar-stepanyan'
date: 2021-11-05
tags:
 - release
description: 'Die V8-Version v9.7 bringt neue JavaScript-Methoden für die rückwärtsgerichtete Suche in Arrays.'
tweet: ''
---
Alle vier Wochen erstellen wir einen neuen Entwicklungszweig von V8 im Rahmen unseres [Release-Prozesses](https://v8.dev/docs/release-process). Jede Version wird direkt vor einer Chrome-Beta-Meilenstein aus dem Hauptzweig von V8s Git abgezweigt. Heute freuen wir uns, unsere neueste Branch, [V8-Version 9.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.7), anzukündigen, die bis zu ihrer Veröffentlichung in Abstimmung mit Chrome 97 Stable in wenigen Wochen in der Beta ist. V8 v9.7 ist voller Entwickler-Features. Dieser Beitrag bietet einen Überblick über einige Highlights im Vorfeld der Veröffentlichung.

<!--truncate-->
## JavaScript

### `findLast` und `findLastIndex` Array-Methoden

Die Methoden `findLast` und `findLastIndex` für `Array`- und `TypedArray`-Objekte finden Elemente, die mit einem Prädikat übereinstimmen, vom Ende des Arrays aus.

Zum Beispiel:

```js
[1,2,3,4].findLast((el) => el % 2 === 0)
// → 4 (letztes gerades Element)
```

Diese Methoden sind ab v9.7 ohne Flag verfügbar.

Weitere Einzelheiten finden Sie in unserer [Feature-Erklärung](https://v8.dev/features/finding-in-arrays#finding-elements-from-the-end).

## V8-API

Verwenden Sie `git log branch-heads/9.6..branch-heads/9.7 include/v8\*.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem aktiven V8-Checkout können `git checkout -b 9.7 -t branch-heads/9.7` verwenden, um die neuen Funktionen in V8 v9.7 zu testen. Alternativ können Sie [den Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
