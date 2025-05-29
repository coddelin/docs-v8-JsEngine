---
title: &apos;`String.prototype.trimStart` und `String.prototype.trimEnd`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-03-26
tags:
  - ECMAScript
  - ES2019
description: &apos;ES2019 führt String.prototype.trimStart() und String.prototype.trimEnd() ein.&apos;
---
ES2019 führt [`String.prototype.trimStart()` und `String.prototype.trimEnd()`](https://github.com/tc39/proposal-string-left-right-trim) ein:

```js
const string = &apos;  hallo welt  &apos;;
string.trimStart();
// → &apos;hallo welt  &apos;
string.trimEnd();
// → &apos;  hallo welt&apos;
string.trim(); // ES5
// → &apos;hallo welt&apos;
```

Diese Funktionalität war zuvor über die nicht standardisierten Methoden `trimLeft()` und `trimRight()` verfügbar, welche aus Gründen der Abwärtskompatibilität weiterhin als Aliase für die neuen Methoden bestehen bleiben.

```js
const string = &apos;  hallo welt  &apos;;
string.trimStart();
// → &apos;hallo welt  &apos;
string.trimLeft();
// → &apos;hallo welt  &apos;
string.trimEnd();
// → &apos;  hallo welt&apos;
string.trimRight();
// → &apos;  hallo welt&apos;
string.trim(); // ES5
// → &apos;hallo welt&apos;
```

<!--truncate-->
## Unterstützung für `String.prototype.trim{Start,End}`

<feature-support chrome="66 /blog/v8-release-66#string-trimming"
                 firefox="61"
                 safari="12"
                 nodejs="8"
                 babel="ja https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
