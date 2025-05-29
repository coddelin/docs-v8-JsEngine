---
title: "`Symbol.prototype.description`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2019-06-25
tags:
  - ECMAScript
  - ES2019
description: "Symbol.prototype.description предоставляет удобный способ доступа к описанию символа Symbol."
tweet: "1143432835665211394"
---
В JavaScript для `Symbol` можно задать описание при создании:

```js
const symbol = Symbol('foo');
//                    ^^^^^
```

Ранее единственным способом программно получить это описание был непрямой вызов `Symbol.prototype.toString()`:

```js
const symbol = Symbol('foo');
//                    ^^^^^
symbol.toString();
// → 'Symbol(foo)'
//           ^^^
symbol.toString().slice(7, -1); // 🤔
// → 'foo'
```

Однако этот код выглядит немного магически, не очень очевиден и нарушает принцип «выражать намерение, а не реализацию». Кроме того, данный метод не позволяет отличить символ без описания (например, `Symbol()`) от символа с пустой строкой в качестве описания (например, `Symbol('')`).

<!--truncate-->
[Новый геттер `Symbol.prototype.description`](https://tc39.es/ecma262/#sec-symbol.prototype.description) предоставляет более эргономичный способ доступа к описанию `Symbol`:

```js
const symbol = Symbol('foo');
//                    ^^^^^
symbol.description;
// → 'foo'
```

Для `Symbol` без описания геттер возвращает `undefined`:

```js
const symbol = Symbol();
symbol.description;
// → undefined
```

## Поддержка `Symbol.prototype.description`

<feature-support chrome="70 /blog/v8-release-70#javascript-language-features"
                 firefox="63"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-symbol"></feature-support>
