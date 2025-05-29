---
title: "`at` 方法用於相對索引"
author: "郭书宇 ([`@_shu`](https://twitter.com/_shu))"
avatars:
  - "shu-yu-guo"
date: 2021-07-13
tags:
  - ECMAScript
description: "JavaScript 現在擁有一個用於 Arrays、TypedArrays 和 Strings 的相對索引方法。"
---

新的 `at` 方法在 `Array.prototype`、各種 TypedArray 原型和 `String.prototype` 上，可以更輕鬆且簡潔地訪問集合末尾附近的元素。

從集合的末尾訪問第 N 個元素是一個常見操作。然而，通常的方法可能會比較冗長，例如 `my_array[my_array.length - N]`，或者表現可能不夠高效，例如 `my_array.slice(-N)[0]`。新的 `at` 方法通過解讀負數索引代表“從末尾”來使此操作更具可讀性。之前的例子可以表達為 `my_array.at(-N)`。

<!--truncate-->
為了統一性，也支持正數索引，其與普通屬性訪問等效。

這個新方法足夠小，其完整語意可以從以下符合標準的 polyfill 實現中理解：

```js
function at(n) {
  // 將參數轉換為一個整數
  n = Math.trunc(n) || 0;
  // 允許從末尾進行負數索引
  if (n < 0) n += this.length;
  // 超出範圍的訪問返回 undefined
  if (n < 0 || n >= this.length) return undefined;
  // 否則，這僅僅是普通屬性訪問
  return this[n];
}
```

## 關於 Strings 的一點說明

由於 `at` 最終執行普通索引操作，因此在 String 值上調用 `at` 會返回代碼單元，就像普通索引一樣。但與 Strings 上的普通索引一樣，代碼單元可能不是您對 Unicode 字符串想要的結果！請考慮 [`String.prototype.codePointAt()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/codePointAt) 是否更適合您的使用情景。

## `at` 方法支持

<feature-support chrome="92"
                 firefox="90"
                 safari="no"
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#relative-indexing-method"></feature-support>
