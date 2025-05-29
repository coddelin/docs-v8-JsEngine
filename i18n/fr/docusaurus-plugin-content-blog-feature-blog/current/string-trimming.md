---
title: '`String.prototype.trimStart` et `String.prototype.trimEnd`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2018-03-26
tags:
  - ECMAScript
  - ES2019
description: 'ES2019 introduit String.prototype.trimStart() et String.prototype.trimEnd().'
---
ES2019 introduit [`String.prototype.trimStart()` et `String.prototype.trimEnd()`](https://github.com/tc39/proposal-string-left-right-trim) :

```js
const string = '  bonjour le monde  ';
string.trimStart();
// → 'bonjour le monde  '
string.trimEnd();
// → '  bonjour le monde'
string.trim(); // ES5
// → 'bonjour le monde'
```

Cette fonctionnalité était auparavant disponible via les méthodes non standard `trimLeft()` et `trimRight()`, qui restent comme alias des nouvelles méthodes pour la compatibilité ascendante.

```js
const string = '  bonjour le monde  ';
string.trimStart();
// → 'bonjour le monde  '
string.trimLeft();
// → 'bonjour le monde  '
string.trimEnd();
// → '  bonjour le monde'
string.trimRight();
// → '  bonjour le monde'
string.trim(); // ES5
// → 'bonjour le monde'
```

<!--truncate-->
## Prise en charge de `String.prototype.trim{Start,End}`

<feature-support chrome="66 /blog/v8-release-66#string-trimming"
                 firefox="61"
                 safari="12"
                 nodejs="8"
                 babel="oui https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
