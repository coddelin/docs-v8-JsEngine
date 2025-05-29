---
title: 'Symbol.prototype.description'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2019-06-25
tags:
  - ECMAScript
  - ES2019
description: 'Symbol.prototype.description은 Symbol의 설명을 접근하는 데 있어 편리한 방법을 제공합니다.'
tweet: '1143432835665211394'
---
JavaScript `Symbol`은 생성 시 설명을 제공할 수 있습니다:

```js
const symbol = Symbol('foo');
//                    ^^^^^
```

이전에는 이를 프로그래밍적으로 접근하는 유일한 방법은 `Symbol.prototype.toString()`을 간접적으로 사용하는 것이었습니다:

```js
const symbol = Symbol('foo');
//                    ^^^^^
symbol.toString();
// → 'Symbol(foo)'
//           ^^^
symbol.toString().slice(7, -1); // 🤔
// → 'foo'
```

하지만 위 코드의 형태는 약간 마법 같아 보이고, 매우 직관적이지 않으며 “의도를 표현하되, 구현을 표현하지 않는다”라는 원칙을 위반합니다. 위 기법은 또한 설명이 없는 Symbol(`Symbol()`)과 빈 문자열을 설명으로 가진 Symbol(`Symbol('')`)을 구분할 수 없게 합니다.

<!--truncate-->
[새로운 `Symbol.prototype.description` getter](https://tc39.es/ecma262/#sec-symbol.prototype.description)은 `Symbol`의 설명을 접근하는 데 있어서 더 편리한 방법을 제공합니다:

```js
const symbol = Symbol('foo');
//                    ^^^^^
symbol.description;
// → 'foo'
```

`Symbol`에 설명이 없는 경우 getter는 `undefined`를 반환합니다:

```js
const symbol = Symbol();
symbol.description;
// → undefined
```

## `Symbol.prototype.description` 지원

<feature-support chrome="70 /blog/v8-release-70#javascript-language-features"
                 firefox="63"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-symbol"></feature-support>
