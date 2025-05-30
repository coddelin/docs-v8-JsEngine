---
title: "`String.prototype.trimStart` und `String.prototype.trimEnd`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2018-03-26
tags: 
  - ECMAScript
  - ES2019
description: "ES2019 führt String.prototype.trimStart() und String.prototype.trimEnd() ein."
---
ES2019 führt [`String.prototype.trimStart()` und `String.prototype.trimEnd()`](https://github.com/tc39/proposal-string-left-right-trim) ein:

```js
const string = '  hallo welt  ';
string.trimStart();
// → 'hallo welt  '
string.trimEnd();
// → '  hallo welt'
string.trim(); // ES5
// → 'hallo welt'
```

Diese Funktionalität war zuvor über die nicht standardisierten Methoden `trimLeft()` und `trimRight()` verfügbar, welche aus Gründen der Abwärtskompatibilität weiterhin als Aliase für die neuen Methoden bestehen bleiben.

```js
const string = '  hallo welt  ';
string.trimStart();
// → 'hallo welt  '
string.trimLeft();
// → 'hallo welt  '
string.trimEnd();
// → '  hallo welt'
string.trimRight();
// → '  hallo welt'
string.trim(); // ES5
// → 'hallo welt'
```

<!--truncate-->
## Unterstützung für `String.prototype.trim{Start,End}`

<feature-support chrome="66 /blog/v8-release-66#string-trimming"
                 firefox="61"
                 safari="12"
                 nodejs="8"
                 babel="ja https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
