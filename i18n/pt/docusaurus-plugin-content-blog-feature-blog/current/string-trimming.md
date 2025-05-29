---
title: "`String.prototype.trimStart` e `String.prototype.trimEnd`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2018-03-26
tags: 
  - ECMAScript
  - ES2019
description: "ES2019 introduz String.prototype.trimStart() e String.prototype.trimEnd()."
---
ES2019 introduz [`String.prototype.trimStart()` e `String.prototype.trimEnd()`](https://github.com/tc39/proposal-string-left-right-trim):

```js
const string = '  olá mundo  ';
string.trimStart();
// → 'olá mundo  '
string.trimEnd();
// → '  olá mundo'
string.trim(); // ES5
// → 'olá mundo'
```

Essa funcionalidade estava anteriormente disponível através dos métodos não padronizados `trimLeft()` e `trimRight()`, que permanecem como aliases dos novos métodos para compatibilidade retroativa.

```js
const string = '  olá mundo  ';
string.trimStart();
// → 'olá mundo  '
string.trimLeft();
// → 'olá mundo  '
string.trimEnd();
// → '  olá mundo'
string.trimRight();
// → '  olá mundo'
string.trim(); // ES5
// → 'olá mundo'
```

<!--truncate-->
## Suporte para `String.prototype.trim{Start,End}`

<feature-support chrome="66 /blog/v8-release-66#string-trimming"
                 firefox="61"
                 safari="12"
                 nodejs="8"
                 babel="sim https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
