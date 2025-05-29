---
title: '加速擴展元素'
author: 'Hai Dang & Georg Neis'
date: 2018-12-04 16:57:21
tags:
  - ECMAScript
  - 基準測試
description: 'V8 v7.2 / 顯著加速了 Array.from(array) 以及 [...spread] 對於數組、字串、集合和映射的性能。'
tweet: '1070344545685118976'
---
在他於 V8 團隊的三個月實習期間，Hai Dang 專注於提升 `[...array]`、`[...string]`、`[...set]`、`[...map.keys()]` 和 `[...map.values()]` 的性能（當擴展元素位於數組字面量的開頭時）。他甚至還大幅提升了 `Array.from(iterable)` 的性能。本文解釋了他改進的部分詳細內容，這些更改從 V8 v7.2 開始被引入。

<!--truncate-->
## 擴展元素

擴展元素是數組字面量的組成部分，其形式為 `...iterable`。它們在 ES2015 中被引入，作為從可迭代對象創建數組的一種方式。例如，數組字面量 `[1, ...arr, 4, ...b]` 則創建了一個數組，其第一個元素是 `1`，隨後是數組 `arr` 的元素，然後是 `4`，最後是數組 `b` 的元素：

```js
const a = [2, 3];
const b = [5, 6, 7];
const result = [1, ...a, 4, ...b];
// → [1, 2, 3, 4, 5, 6, 7]
```

另一個例子是，任何字串都可以被展開成其字符（Unicode 代碼點）組成的數組：

```js
const str = 'こんにちは';
const result = [...str];
// → ['こ', 'ん', 'に', 'ち', 'は']
```

同樣，任何集合也可以被展開成其元素組成的數組，按插入順序排序：

```js
const s = new Set();
s.add('V8');
s.add('TurboFan');
const result = [...s];
// → ['V8', 'TurboFan']
```

一般來說，數組字面量中的擴展語法 `...x` 假設 `x` 提供了一個迭代器（通過 `x[Symbol.iterator]()` 獲取）。然後將使用該迭代器來獲取需要插入到結果數組中的元素。

一個簡單的用例是將數組 `arr` 展開到一個新數組中，而不在前面或後面添加任何其他元素，即 `[...arr]`，這被認為是 ES2015 中一種簡潔、慣用的淺拷貝 `arr` 的方法。不幸的是，在 V8 中，這一慣用法的性能遠遠落後於其 ES5 版本。Hai 的實習目標就是改變這一現狀！

## 為什麼擴展元素慢（或曾經慢）？

有許多方法可以對數組 `arr` 進行淺拷貝。例如，可以使用 `arr.slice()`、`arr.concat()` 或 `[...arr]`。或者，可以編寫自己的 `clone` 函數，該函數使用標準的 `for` 循環來實現：

```js
function clone(arr) {
  // 預先分配正確數量的元素，以避免
  // 不斷增長數組。
  const result = new Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    result[i] = arr[i];
  }
  return result;
}
```

理想情況下，所有這些選項的性能特徵應相似。不幸的是，如果在 V8 中選擇 `[...arr]`，它（或者說_曾經_）可能比 `clone` 慢！其原因在於 V8 實際上將 `[...arr]` 轉換為如下迭代操作：

```js
function(arr) {
  const result = [];
  const iterator = arr[Symbol.iterator]();
  const next = iterator.next;
  for ( ; ; ) {
    const iteratorResult = next.call(iterator);
    if (iteratorResult.done) break;
    result.push(iteratorResult.value);
  }
  return result;
}
```

由於以下幾個原因，該代碼通常比 `clone` 慢：

1. 它需要在開始時通過載入和評估 `Symbol.iterator` 屬性來創建 `iterator`。
1. 它需要在每一步都創建和查詢 `iteratorResult` 對象。
1. 它在迭代的每一步通過調用 `push` 增長 `result` 數組，這樣不斷地重新分配後端存儲。

採用這樣的實現方式的原因是，正如前面提到的，展開操作不僅可以針對數組，實際上也可以針對任意_可迭代對象_，並且需要遵循[迭代協議](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols)。儘管如此，V8 應該足夠智能，辨識出被展開的對象是否為數組，這樣其元素提取可以在更低層次進行，從而：

1. 避免創建 iterator 對象，
1. 避免創建迭代結果對象，
1. 避免不斷增長和重新分配結果數組（我們提前知道元素的數量）。

我們對_快速_數組使用了 [CSA](/blog/csa) 實現這個簡單的想法，即擁有六種最常見[元素類型](/blog/elements-kinds)之一的數組。此優化適用於[常見的真實場景](/blog/real-world-performance)，即展開操作發生在數組字面量的開頭，例如 `[...foo]`。如下圖所示，該新快速路徑對於展開長度為 100,000 的數組的性能大約提升了 3 倍，比手寫的 `clone` 循環大約快 25%。

![展開快速數組的性能提升](/_img/spread-elements/spread-fast-array.png)

:::note
**注意：** 儘管未在此處展示，但快速路徑同樣適用於展開元素後面還有其他組件的情況（例如 `[...arr, 1, 2, 3]`），但不適用於展開元素前面有其他組件的情況（例如 `[1, 2, 3, ...arr]`）。
:::

## 謹慎使用快速路徑

這顯然是一個令人印象深刻的加速，但我們必須非常謹慎地確保何時可以正確地使用這條快速路徑：JavaScript 允許開發者以各種方式修改對象（即使是數組）的迭代行為。由於展開元素被指定使用迭代協議，因此我們需要確保此類修改能被正確考慮。我們在原始迭代機制被改變時完全避開快速路徑。例如，包括以下情況。

### 自有的 `Symbol.iterator` 屬性

通常，一個數組 `arr` 並不擁有它自己的 [`Symbol.iterator`](https://tc39.es/ecma262/#sec-symbol.iterator) 屬性，因此在查找該符號時，將在數組的原型上找到。在下面的例子中，通過直接在 `arr` 本身上定義 `Symbol.iterator` 屬性，原型被繞過了。經過這一修改後，在 `arr` 上查找 `Symbol.iterator` 會返回一個空的迭代器，因此展開 `arr` 不會產生任何元素，數組字面值將評估為一個空數組。

```js
const arr = [1, 2, 3];
arr[Symbol.iterator] = function() {
  return { next: function() { return { done: true }; } };
};
const result = [...arr];
// → []
```

### 修改的 `%ArrayIteratorPrototype%`

`next` 方法也可以直接在 [`%ArrayIteratorPrototype%`](https://tc39.es/ecma262/#sec-%arrayiteratorprototype%-object) 上進行修改，這是數組迭代器的原型（影響所有數組）。

```js
Object.getPrototypeOf([][Symbol.iterator]()).next = function() {
  return { done: true };
}
const arr = [1, 2, 3];
const result = [...arr];
// → []
```

## 處理 _holey_ 數組

在拷貝具有空洞的數組時（例如 `['a', , 'c']`，缺失了一些元素），也需要特別注意。通過遵循迭代協議展開此類數組，不會保留空洞，而是用數組原型中相應索引處的值填充它們。默認情況下，數組原型中沒有任何元素，這意味著任何空洞都會被 `undefined` 填充。例如，`[...['a', , 'c']]` 評估為新數組 `['a', undefined, 'c']`。

我們的快速路徑足夠智能，可以在這種默認情況下處理空洞。它並不是盲目地拷貝輸入數組的底層存儲，而是檢測空洞並負責將它們轉換為 `undefined` 值。下圖顯示的是輸入數組長度為 100,000，包含（標記的）600 個整數——其餘的是空洞的測量結果。該圖表明，展開此類有空洞的數組現在比使用 `clone` 函數快 4 倍以上。（它們以前的性能大致相當，但圖中未展示）。

需要注意的是，儘管此圖中包含了 `slice`，但與其的比較是不公平的，因為針對有空洞數組，`slice` 有不同的語義：它保留所有空洞，因此需要執行的工作要少得多。

![展開一個整數有空洞數組的性能提升（[`HOLEY_SMI_ELEMENTS`](/blog/elements-kinds))](/_img/spread-elements/spread-holey-smi-array.png)

我們的快速路徑需要執行的用 `undefined` 填充空洞操作並不像聽起來那麼簡單：它可能需要將整個數組轉換為一種類型不同的元素類型。下圖測量了這樣的情況。設置與上面相同，不過這一次數組的 600 個元素是未打包的雙精度數字，並且數組元素類型是 `HOLEY_DOUBLE_ELEMENTS`。由於此元素類型無法容納標記值（如 `undefined`），展開涉及一個代價高昂的元素類型轉換，因此 `[...a]` 的得分比前一圖低得多。不過，它仍然比 `clone(a)` 快得多。

![展開一個雙精度數字有空洞數組的性能提升（[`HOLEY_DOUBLE_ELEMENTS`](/blog/elements-kinds)](/_img/spread-elements/spread-holey-double-array.png)

## 展開字串、集合和映射

跳過迭代器物件並避免增長結果數組的思路同樣適用於展開其他標準數據類型。事實上，我們為原始字符串、集合和映射實現了類似的快速路徑，每次都注意在迭代行為被修改的情況下繞過它們。

關於集合，快速路徑不僅支持直接展開集合（`[...set]`），還支持展開其鍵迭代器（`[...set.keys()]`）和其值迭代器（`[...set.values()]`）。在我們的微基準測試中，這些操作現在比之前快大約 18 倍。

快速路徑對於映射（maps）是類似的，但不支持直接展開映射（`[...map]`），因為我們認為這是一個不常見的操作。同樣的原因，快速路徑也不支持 `entries()` 迭代器。根據我們的微基準測試，這些操作現在比以前快了大約 14 倍。

對於展開字符串（`[...string]`），我們測得大約有 5 倍的改善，就像下圖中紫色和綠色線條所示。請注意，這甚至比 TurboFan 優化的 for-of 循環更快（TurboFan 理解字符串迭代並能為其生成優化代碼），如藍色和粉色線條所表示。每種情況有兩個圖形的原因是微基準測試基於兩種不同的字符串表示（一字節字符串和雙字節字符串）。

![展開字符串的性能改進](/_img/spread-elements/spread-string.png)

![展開包含 100,000 個整數的集合的性能改進（品紅色，大約 18 倍），與 `for`-`of` 循環（紅色）相比](/_img/spread-elements/spread-set.png)

## 提高 `Array.from` 的性能

值得慶幸的是，我們為展開元素（spread elements）設計的快速路徑可重用於 `Array.from`，當 `Array.from` 被調用並傳入一個可迭代對象且沒有映射函數時，例如 `Array.from([1, 2, 3])`。這等同於展開操作，因此行為完全相同。這結果帶來了巨大的性能改進，下圖顯示了一個包含 100 個 double 類型數字的數組的性能改進。

![改進 `Array.from(array)` 性能，其中 `array` 包含 100 個 double 類型數字](/_img/spread-elements/array-from-array-of-doubles.png)

## 總結

V8 v7.2 / Chrome 72 大幅提高了展開元素的性能，特別是在它們位於數組字面值的前端時，例如 `[...x]` 或 `[...x, 1, 2]`。該改進適用於展開數組、原始字符串、集合（sets）、映射鍵（maps keys）、映射值（maps values），以及 `Array.from(x)` 的間接應用。
