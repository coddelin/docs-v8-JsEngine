---
title: "Symbol.prototype.description"
author: "Mathias Bynens（[@mathias](https://twitter.com/mathias)）"
avatars:
  - "mathias-bynens"
date: 2019-06-25
tags:
  - ECMAScript
  - ES2019
description: "Symbol.prototype.description 提供了一种访问 Symbol 描述的便捷方法。"
tweet: "1143432835665211394"
---
JavaScript 的 `Symbol` 可以在创建时赋予一个描述：

```js
const symbol = Symbol('foo');
//                    ^^^^^
```

以前，唯一可以通过编程方式访问这个描述的方法是通过 `Symbol.prototype.toString()` 间接实现：

```js
const symbol = Symbol('foo');
//                    ^^^^^
symbol.toString();
// → 'Symbol(foo)'
//           ^^^
symbol.toString().slice(7, -1); // 🤔
// → 'foo'
```

然而，这段代码看起来有些魔幻，不是非常自解释，并且违反了“表达意图，而非实现”的原则。此外，上面的技巧也无法区分没有描述的 symbol（即 `Symbol()`）和描述为空字符串的 symbol（即 `Symbol('')`）。

<!--truncate-->
[新的 `Symbol.prototype.description` getter](https://tc39.es/ecma262/#sec-symbol.prototype.description) 提供了一种更便捷的方法来访问 `Symbol` 的描述：

```js
const symbol = Symbol('foo');
//                    ^^^^^
symbol.description;
// → 'foo'
```

对于没有描述的 `Symbol`，getter 返回 `undefined`：

```js
const symbol = Symbol();
symbol.description;
// → undefined
```

## `Symbol.prototype.description` 支持

<feature-support chrome="70 /blog/v8-release-70#javascript-language-features"
                 firefox="63"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-symbol"></feature-support>
