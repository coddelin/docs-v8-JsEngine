---
title: "迭代器輔助工具"
author: "Rezvan Mahdavi Hezaveh"
avatars:
  - "rezvan-mahdavi-hezaveh"
date: 2024-03-27
tags:
  - ECMAScript
description: "幫助一般使用和消耗迭代器的介面。"
tweet: ""
---

*迭代器輔助工具* 是在 Iterator 原型上新增的一組方法，用於幫助迭代器的一般使用。由於這些輔助方法在迭代器原型上，因此任何在其原型鏈上具有 `Iterator.prototype` 的對象（例如陣列迭代器）都可以使用這些方法。在以下子部分中，我們解釋了迭代器輔助工具。所有提供的範例都是在一個包含博客文章列表的博客歸檔頁面上運作，展示如何使用迭代器輔助工具來尋找和操作文章。你可在 [V8 博客頁面](https://v8.dev/blog) 上嘗試它們！

<!--truncate-->

## .map(mapperFn)

`map` 接受一個映射函數作為參數。此輔助工具返回一個迭代器，其值為原始迭代器值應用映射函數後的結果。

```javascript
// 從博客歸檔頁面選擇文章列表。
const posts = document.querySelectorAll('li:not(header li)');

// 獲取文章列表，返回其文字內容（標題）並輸出它們。
for (const post of posts.values().map((x) => x.textContent)) {
  console.log(post);
}
```

## .filter(filtererFn)

`filter` 接受一個篩選函數作為參數。此輔助工具返回一個迭代器，其值為篩選函數針對原始迭代器返回真值的結果。

```javascript
// 從博客歸檔頁面選擇文章列表。
const posts = document.querySelectorAll('li:not(header li)');

// 篩選包含 `V8` 的文章並輸出它們。
for (const post of posts.values().filter((x) => x.textContent.includes('V8'))) {
  console.log(post);
} 
```

## .take(limit)

`take` 接受一個整數作為參數。此輔助工具返回一個迭代器，其值為原始迭代器最多 `limit` 個值。

```javascript
// 從博客歸檔頁面選擇文章列表。
const posts = document.querySelectorAll('li:not(header li)');

// 選擇最近的10篇文章並輸出它們。
for (const post of posts.values().take(10)) {
  console.log(post);
}
```

## .drop(limit)

`drop` 接受一個整數作為參數。此輔助工具返回一個迭代器，其值從跳過 `limit` 值之後開始。

```javascript
// 從博客歸檔頁面選擇文章列表。
const posts = document.querySelectorAll('li:not(header li)');

// 跳過最近的10篇文章並輸出剩下的文章。
for (const post of posts.values().drop(10)) {
  console.log(post);
}
```

## .flatMap(mapperFn)

`flatMap` 接受一個映射函數作為參數。此輔助工具返回一個迭代器，包含應用映射函數後生成的迭代器的值。映射函數返回的迭代器被扁平化到此工具返回的迭代器中。

```javascript
// 從博客歸檔頁面選擇文章列表。
const posts = document.querySelectorAll('li:not(header li)');

// 獲取所有文章的標籤列表並輸出它們。每篇文章可以有多個標籤。
for (const tag of posts.values().flatMap((x) => x.querySelectorAll('.tag').values())) {
    console.log(tag.textContent);
}
```

## .reduce(reducer [, initialValue ])

`reduce` 接受一個 reducer 函數和一個可選的初始值。此輔助工具返回一個值，該值是將 reducer 函數應用於迭代器的每個值並跟蹤先前結果後的結果。初始值作為開始點，用於在該工具處理迭代器的第一個值時使用。

```javascript
// 從博客歸檔頁面選擇文章列表。
const posts = document.querySelectorAll('li:not(header li)');

// 獲取所有文章的標籤列表。
const tagLists = posts.values().flatMap((x) => x.querySelectorAll('.tag').values());

// 獲取標籤列表中每個標籤的文字內容。
const tags = tagLists.map((x) => x.textContent);

// 計算帶有“安全”標籤的文章數量。
const count = tags.reduce((sum , value) => sum + (value === 'security' ? 1 : 0), 0);
console.log(count);
```

## .toArray()

`toArray` 從迭代器值返回一個數組。

```javascript
// 從博客歸檔頁面選擇文章列表。
const posts = document.querySelectorAll('li:not(header li)');

// 從最近的10篇文章列表創建一個數組。
const arr = posts.values().take(10).toArray();
```

## .forEach(fn)

`forEach` 接受一個函數作為參數並應用於迭代器的每個元素。該輔助工具因其副作用而被調用，返回 `undefined`。

```javascript
// 從博客歸檔頁面選擇文章列表。
const posts = document.querySelectorAll('li:not(header li)');

// 獲取至少有一篇博客文章發佈的日期並記錄它們。
const dates = new Set();
const forEach = posts.values().forEach((x) => dates.add(x.querySelector('time')));
console.log(dates);
```

## .some(fn)

`some` 接受一個斷言函數作為參數。此工具在應用函數於迭代器的任意元素並返回 true 時返回 `true`。在調用 `some` 之後，迭代器將被消耗。

```javascript
// 從博客歸檔頁面選擇博客文章列表。
const posts = document.querySelectorAll('li:not(header li)');

// 檢查任意博客文章的文本內容（標題）是否包含 `Iterators` 關鍵字。
posts.values().some((x) => x.textContent.includes('Iterators'));
```

## .every(fn)

`every` 接受一個斷言函數作為參數。此工具在應用函數於迭代器的所有元素並返回 true 時返回 `true`。在調用 `every` 之後，迭代器將被消耗。

```javascript
// 從博客歸檔頁面選擇博客文章列表。
const posts = document.querySelectorAll('li:not(header li)');

// 確定所有博客文章的文本內容（標題）是否包含 `V8` 關鍵字。
posts.values().every((x) => x.textContent.includes('V8'));
```

## .find(fn)

`find` 接受一個斷言函數作為參數。此工具返回第一個使函數返回真值的迭代器值，如果迭代器中沒有符合條件的值，則返回 `undefined`。

```javascript
// 從博客歸檔頁面選擇博客文章列表。
const posts = document.querySelectorAll('li:not(header li)');

// 記錄最近一篇包含 `V8` 關鍵字的博客文章的文本內容（標題）。
console.log(posts.values().find((x) => x.textContent.includes('V8')).textContent);
```

## Iterator.from(object)

`from` 是一個靜態方法，接受一個對象作為參數。如果 `object` 已經是 Iterator 的實例，該工具直接返回。如果 `object` 擁有 `Symbol.iterator`，這表明它是可迭代的，其 `Symbol.iterator` 方法將被調用以獲得迭代器並被返回。否則，一個新的 `Iterator` 對象（從 `Iterator.prototype` 繼承並具有 `next()` 和 `return()` 方法）將被創建並由該工具返回。

```javascript
// 從博客歸檔頁面選擇博客文章列表。
const posts = document.querySelectorAll('li:not(header li)');

// 首先從帖子中創建一個迭代器。然後，記錄最近一篇包含 `V8` 關鍵字的
// 博客文章的文本內容（標題）。
console.log(Iterator.from(posts).find((x) => x.textContent.includes('V8')).textContent);
```

## 可用性

迭代器助手已在 V8 v12.2 中發布。

## 迭代器助手支持

<feature-support chrome="122 https://chromestatus.com/feature/5102502917177344"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1568906"
                 safari="no https://bugs.webkit.org/show_bug.cgi?id=248650" 
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#iterator-helpers"></feature-support>
