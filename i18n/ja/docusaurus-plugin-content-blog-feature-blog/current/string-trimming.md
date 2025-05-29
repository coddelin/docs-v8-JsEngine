---
title: &apos;`String.prototype.trimStart`と`String.prototype.trimEnd`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-03-26
tags:
  - ECMAScript
  - ES2019
description: &apos;ES2019はString.prototype.trimStart()とString.prototype.trimEnd()を導入します。&apos;
---
ES2019は[`String.prototype.trimStart()`と`String.prototype.trimEnd()`](https://github.com/tc39/proposal-string-left-right-trim)を導入しました。

```js
const string = &apos;  hello world  &apos;;
string.trimStart();
// → &apos;hello world  &apos;
string.trimEnd();
// → &apos;  hello world&apos;
string.trim(); // ES5
// → &apos;hello world&apos;
```

この機能は以前は標準ではない`trimLeft()`と`trimRight()`メソッドを通じて利用可能でしたが、互換性のために新しいメソッドのエイリアスとして残っています。

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
## `String.prototype.trim{Start,End}`のサポート状況

<feature-support chrome="66 /blog/v8-release-66#string-trimming"
                 firefox="61"
                 safari="12"
                 nodejs="8"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
