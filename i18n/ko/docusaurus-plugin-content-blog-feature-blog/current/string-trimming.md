---
title: '`String.prototype.trimStart` 및 `String.prototype.trimEnd`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2018-03-26
tags:
  - ECMAScript
  - ES2019
description: 'ES2019에서는 String.prototype.trimStart()와 String.prototype.trimEnd()를 소개합니다.'
---
ES2019에서는 [`String.prototype.trimStart()` 및 `String.prototype.trimEnd()`](https://github.com/tc39/proposal-string-left-right-trim)을 소개합니다:

```js
const string = '  hello world  ';
string.trimStart();
// → 'hello world  '
string.trimEnd();
// → '  hello world'
string.trim(); // ES5
// → 'hello world'
```

이 기능은 이전에 비표준 메서드인 `trimLeft()`와 `trimRight()`를 통해 제공되었습니다. 이러한 메서드는 새로운 메서드와의 호환성을 위해 여전히 별칭으로 남아 있습니다.

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
## `String.prototype.trim{Start,End}` 지원

<feature-support chrome="66 /blog/v8-release-66#string-trimming"
                 firefox="61"
                 safari="12"
                 nodejs="8"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
