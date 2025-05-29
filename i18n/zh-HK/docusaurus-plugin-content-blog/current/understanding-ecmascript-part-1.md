---
title: "理解 ECMAScript 規範，第一部分"
author: "[Marja Hölttä](https://twitter.com/marjakh)，推測性規範觀察者"
avatars:
  - marja-holtta
date: 2020-02-03 13:33:37
tags:
  - ECMAScript
  - 理解 ECMAScript
description: "閱讀 ECMAScript 規範的教程"
tweet: "1224363301146189824"
---

[全部集數](/blog/tags/understanding-ecmascript)

在本文中，我們採用規範中的一個簡單函數，並嘗試理解其標記法。讓我們開始吧！

## 前言

即使您了解 JavaScript，也可能會覺得閱讀其語言規範，[ECMAScript 語言規範，或簡稱 ECMAScript 規範](https://tc39.es/ecma262/)，相當令人生畏。至少這是我第一次閱讀時的感受。

<!--truncate-->
讓我們從一個具體的例子開始，並逐步了解規範。以下代碼演示了 `Object.prototype.hasOwnProperty` 的使用：

```js
const o = { foo: 1 };
o.hasOwnProperty('foo'); // true
o.hasOwnProperty('bar'); // false
```

在這個例子中，`o` 沒有一個名為 `hasOwnProperty` 的屬性，所以我們沿著原型鏈查找。我們在 `o` 的原型中找到了它，這就是 `Object.prototype`。

為了描述 `Object.prototype.hasOwnProperty` 的工作原理，規範使用類似偽代碼的描述：

:::ecmascript-algorithm
> **[`Object.prototype.hasOwnProperty(V)`](https://tc39.es/ecma262#sec-object.prototype.hasownproperty)**
>
> 當 `hasOwnProperty` 方法使用參數 `V` 調用時，按以下步驟執行：
>
> 1. 設置 `P` 為 `? ToPropertyKey(V)`。
> 2. 設置 `O` 為 `? ToObject(this value)`。
> 3. 返回 `? HasOwnProperty(O, P)`。
:::

…和…

:::ecmascript-algorithm
> **[`HasOwnProperty(O, P)`](https://tc39.es/ecma262#sec-hasownproperty)**
>
> 抽象操作 `HasOwnProperty` 用於確定某個對象是否具有指定屬性鍵的自身屬性。返回一個布林值。該操作使用參數 `O` 和 `P` 調用，其中 `O` 是對象，`P` 是屬性鍵。該抽象操作執行以下步驟：
>
> 1. 斷言：`Type(O)` 是 `Object`。
> 2. 斷言：`IsPropertyKey(P)` 是 `true`。
> 3. 設置 `desc` 為 `? O.[[GetOwnProperty]](P)`。
> 4. 如果 `desc` 是 `undefined`，返回 `false`。
> 5. 返回 `true`。
:::

但什麼是 “抽象操作”？ `[[ ]]` 裡面的東西是什麼？為什麼函數前面有一個 `?`？斷言意味著什麼？

讓我們來探討一下！

## 語言類型與規範類型

讓我們從看起來熟悉的東西開始。規範使用像 `undefined`、`true` 和 `false` 這樣的值，那些值我們已經從 JavaScript 中了解。它們都是 [**語言值**](https://tc39.es/ecma262/#sec-ecmascript-language-types)，是規範也定義的 **語言類型** 的值。

規範在內部也使用語言值，例如，內部數據類型可能包含一個值字段，其可能值為 `true` 和 `false`。相比之下，JavaScript 引擎通常不在內部使用語言值。例如，如果 JavaScript 引擎是用 C++ 編寫的，它通常會使用 C++ 的 `true` 和 `false`（而不是其 JavaScript 的 `true` 和 `false` 的內部表示）。

除了語言類型之外，規範還使用 [**規範類型**](https://tc39.es/ecma262/#sec-ecmascript-specification-types)，這些類型僅出現在規範中，而不出現在 JavaScript 語言中。JavaScript 引擎不需要（但可以選擇）實現它們。在這篇博客文章中，我們會認識到規範類型 Record（及其子類型 Completion Record）。

## 抽象操作

[**抽象操作**](https://tc39.es/ecma262/#sec-abstract-operations) 是在 ECMAScript 規範中定義的函數；它們的目的是為了簡潔地撰寫規範。JavaScript 引擎不需要將它們實現為引擎內部的單獨函數，它們無法直接從 JavaScript 調用。

## 內部槽與內部方法

[**內部槽** 和 **內部方法**](https://tc39.es/ecma262/#sec-object-internal-methods-and-internal-slots) 使用以 `[[ ]]` 包圍的名稱。

內部槽是 JavaScript 對象或規範類型的數據成員，用於存儲對象的狀態。內部方法是 JavaScript 對象的成員函數。

例如，每個 JavaScript 對象都有一個內部槽 `[[Prototype]]` 和一個內部方法 `[[GetOwnProperty]]`。

內部槽和方法無法從 JavaScript 中訪問。例如，您不能訪問 `o.[[Prototype]]` 或調用 `o.[[GetOwnProperty]]()`。JavaScript 引擎可以自行實現它們，但並非必須這麼做。

有時內部方法會委託給類似名稱的抽象操作，例如普通對象的 `[[GetOwnProperty]]`：

:::ecmascript-algorithm
> **[`[[GetOwnProperty]](P)`](https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-getownproperty-p)**
>
> 當 `O` 的 `[[GetOwnProperty]]` 內部方法以屬性鍵 `P` 被呼叫時，將按照以下步驟執行：
>
> 1. 返回 `! OrdinaryGetOwnProperty(O, P)`。
:::

（我們會在下一章節瞭解驚嘆號的含義。）

`OrdinaryGetOwnProperty` 不是一種內部方法，因為它並不與任何物件相關聯；相反，運作時的物件作為一個參數傳遞。

`OrdinaryGetOwnProperty` 被稱為“普通”，因為它針對普通物件操作。ECMAScript 中的物件可以是 **普通的** 或 **特殊的**。普通物件必須具有一組方法的預設行為，這些方法稱為 **基本內部方法**。如果物件偏離了預設行為，那它就是特殊的。

最知名的特殊物件是 `Array`，因為其長度特性以非預設的方式運作：設置 `length` 特性可能會移除 `Array` 中的元素。

基本內部方法的列表列於 [這裡](https://tc39.es/ecma262/#table-5)。

## 完成記錄

那麼，問題標誌和驚嘆號呢？為了瞭解它們，我們需要研究 [**完成記錄**](https://tc39.es/ecma262/#sec-completion-record-specification-type)！

完成記錄是一種規範類型（僅為規範目的所定義）。JavaScript 引擎不必擁有對應的內部數據類型。

完成記錄是一種“記錄”——具有一組固定命名欄位的數據類型。完成記錄有三個欄位：

:::table-wrapper
| 名稱         | 描述                                                                                                                                    |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `[[Type]]`   | 其中之一：`normal`、`break`、`continue`、`return` 或 `throw`。除 `normal` 外，其他類型都是 **突然完成**。                               |
| `[[Value]]`  | 完成時產生的值，例如函數的返回值或拋出的異常。                                                                                         |
| `[[Target]]` | 用於定向控制傳遞（與本文無關）。                                                                                                         |
:::

每個抽象操作會隱式返回一個完成記錄。即使看起來像是抽象操作會返回一種簡單類型（例如布林值），它實際上隱式包裝在一個類型為 `normal` 的完成記錄中（見 [隱式完成值](https://tc39.es/ecma262/#sec-implicit-completion-values)）。

注意 1：規範在這方面並不完全一致；某些輔助函數返回純值，其返回值被直接使用而不從完成記錄中提取出來。這通常從上下文中可以清楚看出。

注意 2：規範的編輯者正在研究如何使完成記錄的處理更加明確。

如果算法拋出異常，這意味著返回一個完成記錄，其中 `[[Type]]` 為 `throw`，其 `[[Value]]` 為異常對象。我們暫時忽略 `break`、`continue` 和 `return` 類型。

[`ReturnIfAbrupt(argument)`](https://tc39.es/ecma262/#sec-returnifabrupt) 的含義是執行以下步驟：

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. 如果 `argument` 是突然完成，則返回 `argument`。
> 2. 將 `argument` 設置為 `argument.[[Value]]`。
<!-- markdownlint-enable blanks-around-lists -->
:::

也就是說，我們檢查一個完成記錄；如果它是突然完成，立即返回。否則，我們從完成記錄中提取值。

`ReturnIfAbrupt` 可能看起來像一個函數調用，但它不是。它使得包含 `ReturnIfAbrupt()` 的函數返回，而不是返回 `ReturnIfAbrupt` 函數本身。它更像是 C 語言類似語言中的宏。

`ReturnIfAbrupt` 可以像這樣使用：

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. 讓 `obj` 為 `Foo()`。（`obj` 是一個完成記錄。）
> 2. `ReturnIfAbrupt(obj)`。
> 3. `Bar(obj)`。（如果我們仍然在這裡，`obj` 是從完成記錄中提取的值。）
<!-- markdownlint-enable blanks-around-lists -->
:::

現在，[問題標誌](https://tc39.es/ecma262/#sec-returnifabrupt-shorthands) 發揮作用：`? Foo()` 等同於 `ReturnIfAbrupt(Foo())`。使用速記是實用的：我們不需要每次顯式地編寫錯誤處理代碼。

類似地，`Let val be ! Foo()` 等同於：

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. 讓 `val` 為 `Foo()`。
> 2. 斷言：`val` 不是突然完成。
> 3. 將 `val` 設置為 `val.[[Value]]`。
<!-- markdownlint-enable blanks-around-lists -->
:::

利用這些知識，我們可以如下重寫 `Object.prototype.hasOwnProperty`：

:::ecmascript-algorithm
> **`Object.prototype.hasOwnProperty(V)`**
>
> 1. 令 `P` 為 `ToPropertyKey(V)`。
> 2. 如果 `P` 是異常完成，返回 `P`
> 3. 將 `P` 設為 `P.[[Value]]`
> 4. 令 `O` 為 `ToObject(this value)`。
> 5. 如果 `O` 是異常完成，返回 `O`
> 6. 將 `O` 設為 `O.[[Value]]`
> 7. 令 `temp` 為 `HasOwnProperty(O, P)`。
> 8. 如果 `temp` 是異常完成，返回 `temp`
> 9. 將 `temp` 設為 `temp.[[Value]]`
> 10. 返回 `NormalCompletion(temp)`
:::

…然後我們可以這樣重寫 `HasOwnProperty`：

:::ecmascript-algorithm
> **`HasOwnProperty(O, P)`**
>
> 1. 斷言：`Type(O)` 是 `Object`。
> 2. 斷言：`IsPropertyKey(P)` 為 `true`。
> 3. 令 `desc` 為 `O.[[GetOwnProperty]](P)`。
> 4. 如果 `desc` 是異常完成，返回 `desc`
> 5. 將 `desc` 設為 `desc.[[Value]]`
> 6. 如果 `desc` 為 `undefined`，返回 `NormalCompletion(false)`。
> 7. 返回 `NormalCompletion(true)`。
:::

我們也能在不使用驚嘆號的情況下重寫 `[[GetOwnProperty]]` 內部方法：

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> **`O.[[GetOwnProperty]]`**
>
> 1. 令 `temp` 為 `OrdinaryGetOwnProperty(O, P)`。
> 2. 斷言：`temp` 不是異常完成。
> 3. 將 `temp` 設為 `temp.[[Value]]`。
> 4. 返回 `NormalCompletion(temp)`。
<!-- markdownlint-enable blanks-around-lists -->
:::

這裡假設 `temp` 是一個全新的臨時變量，並且不會與任何其他變量衝突。

我們還運用了這個知識：當返回語句返回的不是完成記錄時，會被隱式包裝在 `NormalCompletion` 中。

### 小補充：`Return ? Foo()`

規範使用了記法 `Return ? Foo()` — 為什麼加問號？

`Return ? Foo()` 展開為：

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. 令 `temp` 為 `Foo()`。
> 2. 如果 `temp` 是異常完成，返回 `temp`。
> 3. 將 `temp` 設為 `temp.[[Value]]`。
> 4. 返回 `NormalCompletion(temp)`。
<!-- markdownlint-enable blanks-around-lists -->
:::

這與 `Return Foo()` 是相同的；對於異常和正常完成均以相同方式運行。

`Return ? Foo()` 僅用於編輯的原因，以便更明確地表達 `Foo` 返回的是一個完成記錄。

## 斷言

規範中的斷言用於斷言算法的不變條件。它們是為了增加清晰度，但對於實現並不增加任何要求 —— 實現不需要檢查它們。

## 前進

抽象操作委派給其他抽象操作（請參見下圖），但基於這篇博客，我們應當能弄清楚它們的作用。我們將遇到屬性描述符，它是另一種規範類型。

![從 `Object.prototype.hasOwnProperty` 開始的函數調用圖](/_img/understanding-ecmascript-part-1/call-graph.svg)

## 總結

我們讀了一個簡單的函數 —— `Object.prototype.hasOwnProperty` —— 以及它所調用的 **抽象操作**。我們熟悉了 `?` 和 `!` 的簡寫，它們與錯誤處理相關。我們還遇到了 **語言類型**，**規範類型**，**內部插槽** 和 **內部方法**。

## 有用的鏈接

[如何閱讀 ECMAScript 規範](https://timothygu.me/es-howto/)：一個教程，涵蓋了這篇文章中的大量內容，並且視角略有不同。
