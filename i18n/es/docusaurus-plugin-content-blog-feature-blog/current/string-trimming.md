---
title: &apos;`String.prototype.trimStart` y `String.prototype.trimEnd`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-03-26
tags:
  - ECMAScript
  - ES2019
description: &apos;ES2019 introduce String.prototype.trimStart() y String.prototype.trimEnd().&apos;
---
ES2019 introduce [`String.prototype.trimStart()` y `String.prototype.trimEnd()`](https://github.com/tc39/proposal-string-left-right-trim):

```js
const string = &apos;  hola mundo  &apos;;
string.trimStart();
// → &apos;hola mundo  &apos;
string.trimEnd();
// → &apos;  hola mundo&apos;
string.trim(); // ES5
// → &apos;hola mundo&apos;
```

Esta funcionalidad estaba previamente disponible a través de los métodos no estándares `trimLeft()` y `trimRight()`, que permanecen como alias de los nuevos métodos por compatibilidad hacia atrás.

```js
const string = &apos;  hola mundo  &apos;;
string.trimStart();
// → &apos;hola mundo  &apos;
string.trimLeft();
// → &apos;hola mundo  &apos;
string.trimEnd();
// → &apos;  hola mundo&apos;
string.trimRight();
// → &apos;  hola mundo&apos;
string.trim(); // ES5
// → &apos;hola mundo&apos;
```

<!--truncate-->
## Soporte para `String.prototype.trim{Start,End}`

<feature-support chrome="66 /blog/v8-release-66#string-trimming"
                 firefox="61"
                 safari="12"
                 nodejs="8"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
