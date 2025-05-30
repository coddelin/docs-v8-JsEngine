---
title: "Методы `String.prototype.trimStart` и `String.prototype.trimEnd`"
author: "Матиас Байненс ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2018-03-26
tags: 
  - ECMAScript
  - ES2019
description: "ES2019 представляет методы String.prototype.trimStart() и String.prototype.trimEnd()."
---
ES2019 представляет [`String.prototype.trimStart()` и `String.prototype.trimEnd()`](https://github.com/tc39/proposal-string-left-right-trim):

```js
const string = '  hello world  ';
string.trimStart();
// → 'hello world  '
string.trimEnd();
// → '  hello world'
string.trim(); // ES5
// → 'hello world'
```

Эта функциональность ранее была доступна через нестандартные методы `trimLeft()` и `trimRight()`, которые остаются алиасами для новых методов для обратной совместимости.

```js
const string = '  hello world  ';
string.trimStart();
// → 'hello world  '
string.trimLeft();
// → 'hello world  '
string.trimEnd();
// → '  hello world'
string.trimRight();
// → '  hello world'
string.trim(); // ES5
// → 'hello world'
```

<!--truncate-->
## Поддержка `String.prototype.trim{Start,End}`

<feature-support chrome="66 /blog/v8-release-66#string-trimming"
                 firefox="61"
                 safari="12"
                 nodejs="8"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
