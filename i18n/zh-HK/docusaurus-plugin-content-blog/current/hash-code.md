---
title: "優化哈希表：隱藏哈希碼"
author: "[Sathya Gunasekaran](https://twitter.com/_gsathya)，哈希碼的守護者"
avatars:
  - "sathya-gunasekaran"
date: 2018-01-29 13:33:37
tags:
  - internals
tweet: "958046113390411776"
description: "多種 JavaScript 資料結構如 Map、Set、WeakSet 和 WeakMap 在底層使用了哈希表。本文闡述了 V8 v6.3 如何改進哈希表性能。"
---
ECMAScript 2015 引入了多種新的資料結構如 Map、Set、WeakSet 和 WeakMap，所有這些在底層都使用了哈希表。本文章詳細介紹了 [最近的改進](https://bugs.chromium.org/p/v8/issues/detail?id=6404)，即 [V8 v6.3+](/blog/v8-release-63) 如何在哈希表中存儲鍵。

<!--truncate-->
## 哈希碼

一個 [_哈希函數_](https://en.wikipedia.org/wiki/Hash_function) 用於將給定的鍵映射到哈希表中的位置。_哈希碼_ 是在給定鍵上運行此哈希函數的結果。

在 V8 中，哈希碼只是一個隨機數，與物件值無關。因此，我們無法重新計算它，這意味著我們必須存儲它。

對於作為鍵使用的 JavaScript 物件，以前哈希碼存儲為物件上的私有符號。V8 中的私有符號類似於 [`Symbol`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol)，除了它不可枚舉且不會洩漏到使用者空間 JavaScript。

```js
function GetObjectHash(key) {
  let hash = key[hashCodeSymbol];
  if (IS_UNDEFINED(hash)) {
    hash = (MathRandom() * 0x40000000) | 0;
    if (hash === 0) hash = 1;
    key[hashCodeSymbol] = hash;
  }
  return hash;
}
```

這個方法非常有效，因為直到物件添加到哈希表時，我們才需要為哈希碼字段保留記憶體，此時一個新的私有符號被存儲在物件上。

V8 還可以通過 IC 系統像優化其他屬性查找一樣，優化哈希碼符號查找，提供非常快速的哈希碼查找。這對於 [單態 IC 查找](https://en.wikipedia.org/wiki/Inline_caching#Monomorphic_inline_caching) 很有效，當鍵具有相同的 [隱藏類](/) 時。然而，大多數真實世界的代碼並不遵循這種模式，鍵通常具有不同的隱藏類，導致慢速的 [多態 IC 查找](https://en.wikipedia.org/wiki/Inline_caching#Megamorphic_inline_caching)。

使用私有符號方法的另一個問題是它會在存儲哈希碼時觸發鍵上的 [隱藏類過渡](/#fast-property-access)。這不僅導致哈希碼查找的多態代碼性能差，還導致鍵上的其他屬性查找性能差，以及從優化代碼的 [去優化](https://floitsch.blogspot.com/2012/03/optimizing-for-v8-inlining.html)。

## JavaScript 物件的後備存儲

V8 中的 JavaScript 物件 (`JSObject`) 使用兩個字（除了它的表頭）：一個字用來存儲指向元素後備存儲的指針，另一個字用來存儲指向屬性後備存儲的指針。

元素的後備存儲用于存儲看起來像 [數組索引](https://tc39.es/ecma262/#sec-array-index) 的屬性，而屬性的後備存儲用于存儲鍵是字串或符號的屬性。請參閱 Camillo Bruni 的這篇 [V8 博客文章](/blog/fast-properties) 了解有關這些後備存儲的更多信息。

```js
const x = {};
x[1] = 'bar';      // ← 存在於元素後備存儲
x['foo'] = 'bar';  // ← 存在於屬性後備存儲
```

## 隱藏哈希碼

儲存哈希碼的最簡單解決方式是將 JavaScript 物件的大小擴展一個字，直接在物件上存儲哈希碼。然而，這會浪費那些未添加到哈希表中的物件的記憶體。相反，我們可以嘗試將哈希碼存儲在元素存儲或屬性存儲中。

元素的後備存儲是一個包含其長度和所有元素的數組。在這里做更多工作意義不大，因為在保留槽（例如第 0 索引）中存儲哈希碼仍然會浪費未用作哈希表鍵的物件的記憶體。

讓我們來看看屬性的後備存儲。屬性的後備存儲有兩種類型的資料結構：數組和字典。

與元素後備存儲中使用的無上限數組不同，屬性後備存儲中使用的數組有 1022 個值的上限。出於性能原因，V8 在超過此上限後過渡到使用字典。（我稍微簡化了一下 — V8 在其他情況下也可以使用字典，但存儲在數組中的值數量有固定上限。）

因此，屬性後備存儲有三種可能狀態：

1. 空（沒有屬性）
2. 數組（最多可存儲 1022 個值)
3. 字典

讓我們逐一探討這些內容。

### 屬性備援存儲是空的

對於空的情況，我們可以直接在 `JSObject` 的這個偏移量中存儲哈希碼。

![](/_img/hash-code/properties-backing-store-empty.png)

### 屬性備援存儲是一個陣列

V8 表示小於 2<sup>31</sup>（在 32 位系統上）的整數是未封裝的，以 [Smi](https://wingolog.org/archives/2011/05/18/value-representation-in-javascript-implementations) 的形式表示。在 Smi 中，最低有效位是一個用於將其與指標區分的標籤，而剩下的 31 位存儲實際的整數值。

通常，陣列以 Smi 的形式存儲其長度。由於我們知道此陣列的最大容量僅為 1022，我們只需要 10 位來存儲長度。我們可以利用剩餘的 21 位來存儲哈希碼！

![](/_img/hash-code/properties-backing-store-array.png)

### 屬性備援存儲是一個字典

對於字典的情況，我們將字典大小增加 1 個字來在字典的開頭增加一個專用插槽，用於存儲哈希碼。在這種情況下，我們可以接受可能浪費一個字的記憶體，因為大小的比例增加並不像陣列情況那麼大。

![](/_img/hash-code/properties-backing-store-dictionary.png)

通過這些更改，哈希碼查詢不再需要通過複雜的 JavaScript 屬性查詢機制。

## 性能改進

[SixSpeed](https://github.com/kpdecker/six-speed) 基準測試跟踪 Map 和 Set 的性能，這些更改導致大約提高了 500%。

![](/_img/hash-code/sixspeed.png)

此更改還使 [ARES6](https://webkit.org/blog/7536/jsc-loves-es6/) 的 Basic 基準測試提高了 5%。

![](/_img/hash-code/ares-6.png)

此外，在測試 Ember.js 的 [Emberperf](http://emberperf.eviltrout.com/) 基準套件的一項基準測試中也提高了 18%。

![](/_img/hash-code/emberperf.jpg)
