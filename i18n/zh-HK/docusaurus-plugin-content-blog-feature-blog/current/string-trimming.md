---
title: "`String.prototype.trimStart` 和 `String.prototype.trimEnd`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2018-03-26
tags:
  - ECMAScript
  - ES2019
description: "ES2019 引入了 String.prototype.trimStart() 和 String.prototype.trimEnd()."
---
ES2019 引入了 [`String.prototype.trimStart()` 和 `String.prototype.trimEnd()`](https://github.com/tc39/proposal-string-left-right-trim):

```js
const string = '  hello world  ';
string.trimStart();
// → 'hello world  '
string.trimEnd();
// → '  hello world'
string.trim(); // ES5
// → 'hello world'
```

此功能之前可以通過非標準的 `trimLeft()` 和 `trimRight()` 方法實現，這些方法仍然作為新方法的別名保留，從而保證向後兼容性。

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
## `String.prototype.trim{Start,End}` 支援

<feature-support chrome="66 /blog/v8-release-66#string-trimming"
                 firefox="61"
                 safari="12"
                 nodejs="8"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
