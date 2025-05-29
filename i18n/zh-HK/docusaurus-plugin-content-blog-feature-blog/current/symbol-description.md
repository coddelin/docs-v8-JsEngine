---
title: "`Symbol.prototype.description`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-06-25
tags: 
  - ECMAScript
  - ES2019
description: "Symbol.prototype.description 提供了一種符合人體工學的方式來存取 Symbol 的描述。"
tweet: "1143432835665211394"
---
JavaScript `Symbol` 在建立時可以給予一個描述：

```js
const symbol = Symbol('foo');
//                    ^^^^^
```

以前，要以程式方式存取這個描述的唯一方法是透過 `Symbol.prototype.toString()` 間接取得：

```js
const symbol = Symbol('foo');
//                    ^^^^^
symbol.toString();
// → 'Symbol(foo)'
//           ^^^
symbol.toString().slice(7, -1); // 🤔
// → 'foo'
```

然而，這段程式碼看起來有點神秘，不太容易理解，並且違反了“表達意圖，而不是實作”的原則。上述技術也無法區分沒有描述的 Symbol （即 `Symbol()`）和描述為空字串的 Symbol（即 `Symbol('')`）。

<!--truncate-->
[新的 `Symbol.prototype.description` getter](https://tc39.es/ecma262/#sec-symbol.prototype.description) 提供了一種更符合人體工學的方式來存取 `Symbol` 的描述：

```js
const symbol = Symbol('foo');
//                    ^^^^^
symbol.description;
// → 'foo'
```

對於沒有描述的 `Symbol`，getter 返回 `undefined`：

```js
const symbol = Symbol();
symbol.description;
// → undefined
```

## `Symbol.prototype.description` 支援情況

<feature-support chrome="70 /blog/v8-release-70#javascript-language-features"
                 firefox="63"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-symbol"></feature-support>
