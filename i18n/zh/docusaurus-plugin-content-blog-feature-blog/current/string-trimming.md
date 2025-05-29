---
title: "`String.prototype.trimStart` 和 `String.prototype.trimEnd`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2018-03-26
tags:
  - ECMAScript
  - ES2019
description: "ES2019 引入了 String.prototype.trimStart() 和 String.prototype.trimEnd。"
---
ES2019 引入了 [`String.prototype.trimStart()` 和 `String.prototype.trimEnd()`](https://github.com/tc39/proposal-string-left-right-trim)：

```js
const string = '  hello world  ';
string.trimStart();
// → 'hello world  '
string.trimEnd();
// → '  hello world'
string.trim(); // ES5
// → 'hello world'
```

此功能之前通过非标准的 `trimLeft()` 和 `trimRight()` 方法可以使用，这些方法作为新方法的别名保留，以确保向后兼容。

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
## `String.prototype.trim{Start,End}` 浏览器支持

<feature-support chrome="66 /blog/v8-release-66#string-trimming"
                 firefox="61"
                 safari="12"
                 nodejs="8"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
