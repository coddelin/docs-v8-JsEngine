---
title: "暫時停用逃逸分析"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)), 沙盒逃逸分析師"
avatars: 
  - "mathias-bynens"
date: "2017-09-22 13:33:37"
tags: 
  - 安全性
description: "我們已停用 Chrome 61 中的 V8 逃逸分析功能，以保護使用者免受安全漏洞的威脅。"
tweet: "911339802884284416"
---
在 JavaScript 中，如果分配的物件從外部可存取當前函式，那麼該物件即被認定為_逃逸_。通常，V8 將新物件分配到 JavaScript 堆中，但通過_逃逸分析_，優化編譯器可以判斷物件的生命週期是否確實束縛於函式的啟用。當對新分配物件的引用未逃逸創建它的函式時，JavaScript 引擎不需要顯式地將該物件分配到堆中。它們可以有效地將物件的值視為函式的局部變數。這反過來又可以實現各種優化，例如將這些值存儲在堆疊或寄存器中，或者在某些情況下，完全優化掉這些值。而逃逸的物件（更準確地說，無法證明它們不會逃逸的物件）必須在堆上分配。

<!--truncate-->
例如，逃逸分析使 V8 能有效地重寫以下程式碼：

```js
function foo(a, b) {
  const object = { a, b };
  return object.a + object.b;
  // 注意：`object` 並未逃逸。
}
```

…變成如下程式碼，這使一些底層優化成為可能：

```js
function foo(a, b) {
  const object_a = a;
  const object_b = b;
  return object_a + object_b;
}
```

V8 v6.1 及更早版本使用了一個複雜的逃逸分析實現，自引入以來產生了許多問題。該實現現在已被移除，全新的逃逸分析程式碼在 [V8 v6.2](/blog/v8-release-62) 中可用。

然而，已經發現並負責任地向我們披露了一個涉及 V8 v6.1 舊逃逸分析實現的 [Chrome 安全漏洞](https://chromereleases.googleblog.com/2017/09/stable-channel-update-for-desktop_21.html)。為了保護我們的使用者，我們已在 Chrome 61 中關閉了逃逸分析功能。Node.js 不應受到影響，因為該漏洞依賴於執行不受信任的 JavaScript。

停用逃逸分析會對效能產生負面影響，因為上述的優化無法作用。特別是，以下 ES2015 的功能可能會出現暫時性的性能下降：

- 解構賦值
- `for`-`of` 迭代
- 陣列展開運算符
- 剩餘參數

請注意，停用逃逸分析只是一項臨時措施。隨著 Chrome 62 的發布，我們將引入見於 V8 v6.2 的全新實現——更重要的是它將被啟用。
