---
title: &apos;`String.prototype.trimStart` et `String.prototype.trimEnd`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-03-26
tags:
  - ECMAScript
  - ES2019
description: &apos;ES2019 introduit String.prototype.trimStart() et String.prototype.trimEnd().&apos;
---
ES2019 introduit [`String.prototype.trimStart()` et `String.prototype.trimEnd()`](https://github.com/tc39/proposal-string-left-right-trim) :

```js
const string = &apos;  bonjour le monde  &apos;;
string.trimStart();
// → &apos;bonjour le monde  &apos;
string.trimEnd();
// → &apos;  bonjour le monde&apos;
string.trim(); // ES5
// → &apos;bonjour le monde&apos;
```

Cette fonctionnalité était auparavant disponible via les méthodes non standard `trimLeft()` et `trimRight()`, qui restent comme alias des nouvelles méthodes pour la compatibilité ascendante.

```js
const string = &apos;  bonjour le monde  &apos;;
string.trimStart();
// → &apos;bonjour le monde  &apos;
string.trimLeft();
// → &apos;bonjour le monde  &apos;
string.trimEnd();
// → &apos;  bonjour le monde&apos;
string.trimRight();
// → &apos;  bonjour le monde&apos;
string.trim(); // ES5
// → &apos;bonjour le monde&apos;
```

<!--truncate-->
## Prise en charge de `String.prototype.trim{Start,End}`

<feature-support chrome="66 /blog/v8-release-66#string-trimming"
                 firefox="61"
                 safari="12"
                 nodejs="8"
                 babel="oui https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
