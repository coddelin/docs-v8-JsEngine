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
description: "String.prototype.matchAll 讓迴圈處理一個正則表達式在字串中的所有匹配物件變得更加容易。"
---
在字串中重複套用同一個正則表達式以獲取所有匹配的情況並不罕見。某種程度上，這已經可以通過使用 `String#match` 方法實現。

在這個例子中，我們找到所有僅由十六進位數字組成的字，然後記錄每個匹配項：

```js
const string = 'Magic hex numbers: DEADBEEF CAFE';
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
for (const match of string.match(regex)) {
  console.log(match);
}

// 輸出:
//
// 'DEADBEEF'
// 'CAFE'
```

然而，這只會給你匹配的 _子字串_。通常，你不僅想要子字串，還希望獲取附加資訊，如每個子字串的索引，或者每次匹配時的捕捉群組。

這可以通過撰寫自己的迴圈並手動跟蹤匹配物件來實現，但這有點麻煩且不太方便：

```js
const string = 'Magic hex numbers: DEADBEEF CAFE';
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
let match;
while (match = regex.exec(string)) {
  console.log(match);
}

// 輸出:
//
// [ 'DEADBEEF', index: 19, input: 'Magic hex numbers: DEADBEEF CAFE' ]
// [ 'CAFE',     index: 28, input: 'Magic hex numbers: DEADBEEF CAFE' ]
```

新的 `String#matchAll` API 使這變得前所未有的簡單：現在你可以撰寫一個簡單的 `for`-`of` 迴圈以獲取所有匹配物件。

```js
const string = 'Magic hex numbers: DEADBEEF CAFE';
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
for (const match of string.matchAll(regex)) {
  console.log(match);
}

// 輸出:
//
// [ 'DEADBEEF', index: 19, input: 'Magic hex numbers: DEADBEEF CAFE' ]
// [ 'CAFE',     index: 28, input: 'Magic hex numbers: DEADBEEF CAFE' ]
```

`String#matchAll` 對於具有捕捉群組的正則表達式特別有用。它會提供每個匹配的完整資訊，包括捕捉群組。

```js
const string = 'Favorite GitHub repos: tc39/ecma262 v8/v8.dev';
const regex = /\b(?<owner>[a-z0-9]+)\/(?<repo>[a-z0-9\.]+)\b/g;
for (const match of string.matchAll(regex)) {
  console.log(`${match[0]} at ${match.index} with '${match.input}'`);
  console.log(`→ owner: ${match.groups.owner}`);
  console.log(`→ repo: ${match.groups.repo}`);
}

<!--truncate-->
// 輸出:
//
// tc39/ecma262 at 23 with 'Favorite GitHub repos: tc39/ecma262 v8/v8.dev'
// → owner: tc39
// → repo: ecma262
// v8/v8.dev at 36 with 'Favorite GitHub repos: tc39/ecma262 v8/v8.dev'
// → owner: v8
// → repo: v8.dev
```

一般的觀念是，你只需要撰寫一個簡單的 `for`-`of` 迴圈，而 `String#matchAll` 將替你處理其餘的事情。

:::note
**注意：** 顧名思義，`String#matchAll` 是用來遍歷 _所有_ 匹配物件的。因此，它應搭配具有 `g` 標誌的全域正則表達式使用，因為任何非全域正則表達式最多隻會產生一個匹配項。對非全域的正則表達式調用 `matchAll` 將會導致 `TypeError` 異常。
:::

## `String.prototype.matchAll` 支援

<feature-support chrome="73 /blog/v8-release-73#string.prototype.matchall"
                 firefox="67"
                 safari="13"
                 nodejs="12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
