---
title: "`String.prototype.matchAll`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-02-02
tags: 
  - ECMAScript
  - ES2020
  - io19
description: "String.prototype.matchAll 让遍历给定正则表达式生成的所有匹配对象变得更容易。"
---
通常会在字符串上重复应用相同的正则表达式以获取所有匹配项。在一定程度上，现在可以通过使用 `String#match` 方法来实现这一点。

在这个例子中，我们找到所有仅包含十六进制数字的单词，并记录每个匹配项：

```js
const string = '魔术十六进制数字：DEADBEEF CAFE';
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
for (const match of string.match(regex)) {
  console.log(match);
}

// 输出:
//
// 'DEADBEEF'
// 'CAFE'
```

然而，这只会给你匹配的子字符串。通常，你不仅仅想要子字符串，还需要其他信息，比如每个子字符串的索引或者每个匹配中的捕获组。

通过编写你自己的循环，并自己记录匹配对象也可以实现这一点，但这有点麻烦而且不太方便：

```js
const string = '魔术十六进制数字：DEADBEEF CAFE';
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
let match;
while (match = regex.exec(string)) {
  console.log(match);
}

// 输出:
//
// [ 'DEADBEEF', index: 19, input: '魔术十六进制数字：DEADBEEF CAFE' ]
// [ 'CAFE',     index: 28, input: '魔术十六进制数字：DEADBEEF CAFE' ]
```

新的 `String#matchAll` API 使得这一过程比以往更加简单：你现在可以编写一个简单的 `for`-`of` 循环来获取所有的匹配对象。

```js
const string = '魔术十六进制数字：DEADBEEF CAFE';
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
for (const match of string.matchAll(regex)) {
  console.log(match);
}

// 输出:
//
// [ 'DEADBEEF', index: 19, input: '魔术十六进制数字：DEADBEEF CAFE' ]
// [ 'CAFE',     index: 28, input: '魔术十六进制数字：DEADBEEF CAFE' ]
```

`String#matchAll` 对于带有捕获组的正则表达式特别有用。它为每个匹配提供完整的信息，包括捕获组。

```js
const string = '喜欢的 GitHub 仓库：tc39/ecma262 v8/v8.dev';
const regex = /\b(?<owner>[a-z0-9]+)\/(?<repo>[a-z0-9\.]+)\b/g;
for (const match of string.matchAll(regex)) {
  console.log(`${match[0]} 在 ${match.index} 上，输入为 '${match.input}'`);
  console.log(`→ 所有者: ${match.groups.owner}`);
  console.log(`→ 仓库: ${match.groups.repo}`);
}

<!--truncate-->
// 输出:
//
// tc39/ecma262 在 23 上，输入为 '喜欢的 GitHub 仓库：tc39/ecma262 v8/v8.dev'
// → 所有者: tc39
// → 仓库: ecma262
// v8/v8.dev 在 36 上，输入为 '喜欢的 GitHub 仓库：tc39/ecma262 v8/v8.dev'
// → 所有者: v8
// → 仓库: v8.dev
```

总体来说，你只需编写一个简单的 `for`-`of` 循环，剩下的工作交给 `String#matchAll` 来完成。

:::note
**注意:** 顾名思义，`String#matchAll` 旨在遍历所有匹配对象。因此，它应该与全局正则表达式一起使用，即那些设置了 `g` 标志的正则表达式，因为任何非全局正则表达式最多只会产生一个匹配项。使用非全局正则表达式调用 `matchAll` 会导致 `TypeError` 异常。
:::

## `String.prototype.matchAll` 支持情况

<feature-support chrome="73 /blog/v8-release-73#string.prototype.matchall"
                 firefox="67"
                 safari="13"
                 nodejs="12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
