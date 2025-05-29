---
title: &apos;`String.prototype.trimStart` e `String.prototype.trimEnd`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-03-26
tags:
  - ECMAScript
  - ES2019
description: &apos;ES2019 introduz String.prototype.trimStart() e String.prototype.trimEnd().&apos;
---
ES2019 introduz [`String.prototype.trimStart()` e `String.prototype.trimEnd()`](https://github.com/tc39/proposal-string-left-right-trim):

```js
const string = &apos;  olá mundo  &apos;;
string.trimStart();
// → &apos;olá mundo  &apos;
string.trimEnd();
// → &apos;  olá mundo&apos;
string.trim(); // ES5
// → &apos;olá mundo&apos;
```

Essa funcionalidade estava anteriormente disponível através dos métodos não padronizados `trimLeft()` e `trimRight()`, que permanecem como aliases dos novos métodos para compatibilidade retroativa.

```js
const string = &apos;  olá mundo  &apos;;
string.trimStart();
// → &apos;olá mundo  &apos;
string.trimLeft();
// → &apos;olá mundo  &apos;
string.trimEnd();
// → &apos;  olá mundo&apos;
string.trimRight();
// → &apos;  olá mundo&apos;
string.trim(); // ES5
// → &apos;olá mundo&apos;
```

<!--truncate-->
## Suporte para `String.prototype.trim{Start,End}`

<feature-support chrome="66 /blog/v8-release-66#string-trimming"
                 firefox="61"
                 safari="12"
                 nodejs="8"
                 babel="sim https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
