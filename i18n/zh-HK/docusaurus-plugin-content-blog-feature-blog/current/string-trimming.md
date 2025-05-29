---
title: &apos;`String.prototype.trimStart` 和 `String.prototype.trimEnd`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-03-26
tags:
  - ECMAScript
  - ES2019
description: &apos;ES2019 引入了 String.prototype.trimStart() 和 String.prototype.trimEnd().&apos;
---
ES2019 引入了 [`String.prototype.trimStart()` 和 `String.prototype.trimEnd()`](https://github.com/tc39/proposal-string-left-right-trim):

```js
const string = &apos;  hello world  &apos;;
string.trimStart();
// → &apos;hello world  &apos;
string.trimEnd();
// → &apos;  hello world&apos;
string.trim(); // ES5
// → &apos;hello world&apos;
```

此功能之前可以通過非標準的 `trimLeft()` 和 `trimRight()` 方法實現，這些方法仍然作為新方法的別名保留，從而保證向後兼容性。

```js
const string = &apos;  hello world  &apos;;
string.trimStart();
// → &apos;hello world  &apos;
string.trimLeft();
// → &apos;hello world  &apos;
string.trimEnd();
// → &apos;  hello world&apos;
string.trimRight();
// → &apos;  hello world&apos;
string.trim(); // ES5
// → &apos;hello world&apos;
```

<!--truncate-->
## `String.prototype.trim{Start,End}` 支援

<feature-support chrome="66 /blog/v8-release-66#string-trimming"
                 firefox="61"
                 safari="12"
                 nodejs="8"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
