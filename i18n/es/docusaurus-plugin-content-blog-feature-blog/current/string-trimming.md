---
title: '`String.prototype.trimStart` y `String.prototype.trimEnd`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2018-03-26
tags:
  - ECMAScript
  - ES2019
description: 'ES2019 introduce String.prototype.trimStart() y String.prototype.trimEnd().'
---
ES2019 introduce [`String.prototype.trimStart()` y `String.prototype.trimEnd()`](https://github.com/tc39/proposal-string-left-right-trim):

```js
const string = '  hola mundo  ';
string.trimStart();
// → 'hola mundo  '
string.trimEnd();
// → '  hola mundo'
string.trim(); // ES5
// → 'hola mundo'
```

Esta funcionalidad estaba previamente disponible a través de los métodos no estándares `trimLeft()` y `trimRight()`, que permanecen como alias de los nuevos métodos por compatibilidad hacia atrás.

```js
const string = '  hola mundo  ';
string.trimStart();
// → 'hola mundo  '
string.trimLeft();
// → 'hola mundo  '
string.trimEnd();
// → '  hola mundo'
string.trimRight();
// → '  hola mundo'
string.trim(); // ES5
// → 'hola mundo'
```

<!--truncate-->
## Soporte para `String.prototype.trim{Start,End}`

<feature-support chrome="66 /blog/v8-release-66#string-trimming"
                 firefox="61"
                 safari="12"
                 nodejs="8"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
