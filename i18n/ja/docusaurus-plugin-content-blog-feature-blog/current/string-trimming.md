---
title: "`String.prototype.trimStart`と`String.prototype.trimEnd`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2018-03-26
tags:
  - ECMAScript
  - ES2019
description: "ES2019はString.prototype.trimStart()とString.prototype.trimEnd()を導入します。"
---
ES2019は[`String.prototype.trimStart()`と`String.prototype.trimEnd()`](https://github.com/tc39/proposal-string-left-right-trim)を導入しました。

```js
const string = '  hello world  ';
string.trimStart();
// → 'hello world  '
string.trimEnd();
// → '  hello world'
string.trim(); // ES5
// → 'hello world'
```

この機能は以前は標準ではない`trimLeft()`と`trimRight()`メソッドを通じて利用可能でしたが、互換性のために新しいメソッドのエイリアスとして残っています。

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
## `String.prototype.trim{Start,End}`のサポート状況

<feature-support chrome="66 /blog/v8-release-66#string-trimming"
                 firefox="61"
                 safari="12"
                 nodejs="8"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
