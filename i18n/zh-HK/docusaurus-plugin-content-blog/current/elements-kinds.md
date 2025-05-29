---
title: &apos;V8 中的元素類型&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2017-09-12 13:33:37
tags:
  - internals
  - presentations
description: &apos;這篇技術性深入解析文章，詳細說明了 V8 背後如何優化對陣列的操作，並向 JavaScript 開發者解釋其意義。&apos;
tweet: &apos;907608362191376384&apos;
---
:::note
**注意:** 如果您更喜歡觀看演示，而不是閱讀文章，請欣賞以下視頻！
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/m9cTaYI95Zc" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

JavaScript 對象可以具有任何與之關聯的任意屬性。對象屬性的名稱可以包含任意字符。JavaScript 引擎可以選擇優化的有趣案例之一就是屬性名稱是純數字的情況，特別是 [陣列索引](https://tc39.es/ecma262/#array-index)。

<!--truncate-->
在 V8 中，具有整數名稱的屬性——最常見的形式是通過 `Array` 構造函數生成的對象——被特殊處理。雖然在許多情況下，這些數字索引屬性表現得與其他屬性一樣，但 V8 選擇將它們與非數字屬性分開存儲，以進行優化。在內部，V8 甚至給這些屬性起了特殊的名字：_elements_。對象具有映射到值的 [屬性](/blog/fast-properties)，而陣列具有映射到元素的索引。

雖然這些內部結構永遠不會直接暴露給 JavaScript 開發者，但它們解釋了為什麼某些代碼模式比其他模式更快。

## 常見的元素類型

在執行 JavaScript 代碼時，V8 會跟踪每個陣列包含的元素類型。此信息使得 V8 能夠針對該元素類型專門優化對陣列的操作。例如，當您在陣列上調用 `reduce`、`map` 或 `forEach` 時，V8 可以根據陣列包含的元素類型對這些操作進行優化。

比如這個陣列：

```js
const array = [1, 2, 3];
```

它包含的是什麼類型的元素？如果您詢問 `typeof` 操作符，它會告訴您該陣列包含的是 `number`。在語言層面，這就是所有可得信息：JavaScript 不區分整數、浮點數和雙精度數字——它們都只是數字。然而，在引擎層面，我們可以做出更精確的區分。此陣列的元素類型是 `PACKED_SMI_ELEMENTS`。在 V8 中，Smi 指的是用於存儲小整數的特定格式。（我們稍後會討論 `PACKED` 部分。）

稍後添加一個浮點數到同一個陣列，會將其轉換為更通用的元素類型：

```js
const array = [1, 2, 3];
// 元素類型：PACKED_SMI_ELEMENTS
array.push(4.56);
// 元素類型：PACKED_DOUBLE_ELEMENTS
```

將一個字串字面值添加到陣列中，再次改變其元素類型。

```js
const array = [1, 2, 3];
// 元素類型：PACKED_SMI_ELEMENTS
array.push(4.56);
// 元素類型：PACKED_DOUBLE_ELEMENTS
array.push(&apos;x&apos;);
// 元素類型：PACKED_ELEMENTS
```

到目前為止，我們已看到三種不同的元素類型，其基本類型如下：

- <b>S</b>mall <b>I</b>ntegers，也就是 Smi。
- Doubles，用於浮點數和不能表示為 Smi 的整數。
- 普通元素，用於無法表示為 Smi 或 Doubles 的值。

請注意，Doubles 是 Smi 的更一般化變體，而普通元素是基於 Doubles 的又一個泛化。可以表示為 Smi 的數字集合是可以表示為 Double 的數字集合的子集。

此處重要的是，元素類型的轉變方向只有一個：從特定（例如 `PACKED_SMI_ELEMENTS`）到更一般（例如 `PACKED_ELEMENTS`）。一旦陣列被標記為 `PACKED_ELEMENTS`，它就不能返回到 `PACKED_DOUBLE_ELEMENTS`。

到目前為止，我們已學到以下內容：

- V8 為每個陣列分配一個元素類型。
- 陣列的元素類型不是固定的——它可以在運行時改變。在之前的示例中，我們從 `PACKED_SMI_ELEMENTS` 過渡到 `PACKED_ELEMENTS`。
- 元素類型的轉變只能從更特定的類型到更一般的類型。

## `PACKED` 與 `HOLEY` 類型

到目前為止，我們只處理了密集或緊湊的陣列。對陣列騰空（即使陣列變得稀疏）會降級其元素類型到“帶空洞（holed）”的變體：

```js
const array = [1, 2, 3, 4.56, &apos;x&apos;];
// 元素類型：PACKED_ELEMENTS
array.length; // 5
array[9] = 1; // array[5] 到 array[8] 現在是空洞
// 元素類型：HOLEY_ELEMENTS
```

V8 做出這種區分是因為對於打包的陣列進行操作可以比對有空洞的陣列更積極地進行優化。對於打包的陣列，大多數操作可以高效地執行。相較之下，對有空洞的陣列進行操作需要額外的檢查和對原型鏈進行昂貴的查找。

到目前為止，我們所看到的每一個基本元素類型（例如 Smis、浮點數和一般元素）都有兩種形式：打包版和有空洞版。不僅能夠從例如 `PACKED_SMI_ELEMENTS` 過渡到 `PACKED_DOUBLE_ELEMENTS`，我們還能夠從任何 `PACKED` 類型過渡到其 `HOLEY` 對應版本。

總結一下：

- 最常見的元素類型有 `PACKED` 和 `HOLEY` 兩種形式。
- 對打包的陣列進行操作比對有空洞的陣列進行操作更高效。
- 元素類型可以從 `PACKED` 過渡到 `HOLEY` 形式。

## 元素類型的格子結構

V8 將這種標籤過渡系統實現為一種[格子結構](https://en.wikipedia.org/wiki/Lattice_%28order%29)。以下是僅包含最常用元素類型的簡化可視化圖：

![](/_img/elements-kinds/lattice.svg)

只能沿著格子結構向下過渡。一旦將一個單一浮點數添加到一個 Smis 陣列，該陣列將被標記為 DOUBLE，即使你稍後用 Smi 覆蓋該浮點數。同樣，一旦在一個陣列中創建了一個空洞，它將永遠被標記為有空洞，即使你後來填充它。

:::note
**更新 @ 2025-02-28:** 現在針對 [特定的 `Array.prototype.fill` 例外情況](https://chromium-review.googlesource.com/c/v8/v8/+/6285929)。
:::

V8 目前區分了 [21 種不同元素類型](https://cs.chromium.org/chromium/src/v8/src/elements-kind.h?l=14&rcl=ec37390b2ba2b4051f46f153a8cc179ed4656f5d)，每一種都有其特定可能的優化方式。

一般來說，越具體的元素類型可以啟用更精細的優化。在格子結構中，元素類型越靠下，對該對象的操作可能越慢。為了獲得最佳性能，避免不必要地過渡到較不具體的類型——請堅持使用最具體的類型以適合你的解決方案。

## 性能提示

在大多數情況下，元素類型的追踪在底層隱式工作，你無需擔心。但以下是一些您可以採取的措施，以最大程度地從該系統中獲益。

### 避免讀取超出陣列長度的範圍

稍微出乎意料的是（鑑於本文的標題），我們的第一個性能提示並不直接與元素類型追踪相關（儘管在底層會發生類似的情況）。讀取超出陣列長度的範圍可能會對性能產生意外影響，例如在 `array.length === 5` 時讀取 `array[42]`。在此情況下，陣列索引 `42` 超出邊界，該屬性在陣列本身中不存在，因此 JavaScript 引擎不得不執行昂貴的原型鏈查找。一旦執行了這種加載，V8 記住該加載需要處理特殊情況，它的執行速度就再也不會像讀取有效範圍時那麼快。

不要像這樣編寫你的循環：

```js
// 不要這樣做！
for (let i = 0, item; (item = items[i]) != null; i++) {
  doSomething(item);
}
```

這段代碼讀取了陣列中的所有元素，然後再讀取一個。它僅在找到 `undefined` 或 `null` 元素時才結束。（jQuery 在某些地方使用了這種模式。）

相反，用傳統方法編寫你的循環，並且只在達到最後一個元素後停止迭代。

```js
for (let index = 0; index < items.length; index++) {
  const item = items[index];
  doSomething(item);
}
```

當你要迭代的集合是可迭代的（例如陣列或 `NodeList`），這種方法更好：直接使用 `for-of`。

```js
for (const item of items) {
  doSomething(item);
}
```

針對陣列的特定情況，你可以使用內建的 `forEach`：

```js
items.forEach((item) => {
  doSomething(item);
});
```

如今，`for-of` 和 `forEach` 的性能與傳統的 `for` 循環相當。

避免讀取超出陣列長度範圍！在此情況下，V8 的邊界檢查失敗，檢查屬性是否存在失敗，然後V8需要查找原型鏈。當你意外使用該值進行計算時，情況更糟，例如：

```js
function Maximum(array) {
  let max = 0;
  for (let i = 0; i <= array.length; i++) { // 錯誤的比較！
    if (array[i] > max) max = array[i];
  }
  return max;
}
```

此處，最後一次迭代讀取了超出陣列長度的範圍，返回 `undefined`，不僅污染了加載操作，還影響了比較：它現在不僅比較數字，還需要處理特殊情況。將終止條件修正為正確的 `i < array.length` 可使此示例性能提升 **6 倍**（在包含 10,000 個元素的陣列上測量，所以迭代次數僅下降 0.01%）。

### 避免元素類型過渡

一般來說，如果你需要對陣列進行大量操作，嘗試保持元素種類越具體越好，這樣 V8 可以盡可能地優化這些操作。

這比看起來更難。例如，只需要向一個小整數的陣列中新增 `-0` 就足以使其轉換為 `PACKED_DOUBLE_ELEMENTS`。

```js
const array = [3, 2, 1, +0];
// PACKED_SMI_ELEMENTS
array.push(-0);
// PACKED_DOUBLE_ELEMENTS
```

因此，對該陣列的任何未來操作都會以與 Smis 完全不同的方式進行優化。

除非你明確需要區分 `-0` 和 `+0`，否則避免使用 `-0`。（你可能不需要。）

同樣的道理適用於 `NaN` 和 `Infinity`。它們以 double 表示，因此向一個 `SMI_ELEMENTS` 的陣列中新增一個 `NaN` 或 `Infinity` 會使其轉換為 `DOUBLE_ELEMENTS`。

```js
const array = [3, 2, 1];
// PACKED_SMI_ELEMENTS
array.push(NaN, Infinity);
// PACKED_DOUBLE_ELEMENTS
```

如果你計劃對一個整數陣列進行大量操作，考慮在初始化值時對 `-0` 進行標準化並阻止 `NaN` 和 `Infinity`。通過這種方式，該陣列將保持 `PACKED_SMI_ELEMENTS` 的種類。這次性標準化成本可能值得後續的優化。

事實上，如果你對數字陣列進行數學運算，考慮使用 TypedArray。我們也為這些陣列提供了專門的元素種類。

### 優先使用陣列而不是類陣列物件

JavaScript 中的一些物件（特別是在 DOM 中）看起來像陣列，儘管它們並不是正規的陣列。你也可以自己創建類陣列物件：

```js
const arrayLike = {};
arrayLike[0] = &apos;a&apos;;
arrayLike[1] = &apos;b&apos;;
arrayLike[2] = &apos;c&apos;;
arrayLike.length = 3;
```

此物件具有 `length` 並支持索引元素訪問（就像陣列一樣！）但其原型缺少像 `forEach` 這樣的陣列方法。不過，仍然可以對其調用陣列泛型方法：

```js
Array.prototype.forEach.call(arrayLike, (value, index) => {
  console.log(`${ index }: ${ value }`);
});
// 這會輸出 &apos;0: a&apos;，然後 &apos;1: b&apos;，最後 &apos;2: c&apos;。
```

此程式碼對類陣列物件調用了內建的 `Array.prototype.forEach`，並且運作如預期。然而，這比對正規陣列調用 `forEach` 要慢，而正規陣列的內建方法在 V8 中得到了高度優化。如果你計劃多次對該物件使用陣列內建方法，考慮在此之前將其轉換為實際陣列：

```js
const actualArray = Array.prototype.slice.call(arrayLike, 0);
actualArray.forEach((value, index) => {
  console.log(`${ index }: ${ value }`);
});
// 這會輸出 &apos;0: a&apos;，然後 &apos;1: b&apos;，最後 &apos;2: c&apos;。
```

這次性轉換成本可能值得後續的優化，特別是在你計劃對該陣列進行大量操作時。

例如，`arguments` 物件是一個類陣列物件。可以對其調用陣列內建方法，但這些操作無法像正規陣列那樣完全優化。

```js
const logArgs = function() {
  Array.prototype.forEach.call(arguments, (value, index) => {
    console.log(`${ index }: ${ value }`);
  });
};
logArgs(&apos;a&apos;, &apos;b&apos;, &apos;c&apos;);
// 這會輸出 &apos;0: a&apos;，然後 &apos;1: b&apos;，最後 &apos;2: c&apos;。
```

ES2015 的剩餘參數可以幫助解決這個問題。它們會生成正規的陣列，可以以更優雅的方式替代類陣列 `arguments` 物件。

```js
const logArgs = (...args) => {
  args.forEach((value, index) => {
    console.log(`${ index }: ${ value }`);
  });
};
logArgs(&apos;a&apos;, &apos;b&apos;, &apos;c&apos;);
// 這會輸出 &apos;0: a&apos;，然後 &apos;1: b&apos;，最後 &apos;2: c&apos;。
```

如今，已沒有充分的理由直接使用 `arguments` 物件。

一般來說，儘可能避免使用類陣列物件，轉而使用正規陣列。

### 避免多態性

如果你的程式碼同時處理多種類型元素的陣列，可能導致多態操作，其執行速度比僅操作單一元素種類的程式碼慢。

考慮以下範例，其中一個庫函數接受了不同種類的元素類型。（請注意，這不是內建的 `Array.prototype.forEach`，內建方法在此文討論的基於元素種類的優化之上有自己的優化集。）

```js
const each = (array, callback) => {
  for (let index = 0; index < array.length; ++index) {
    const item = array[index];
    callback(item);
  }
};
const doSomething = (item) => console.log(item);

each([], () => {});

each([&apos;a&apos;, &apos;b&apos;, &apos;c&apos;], doSomething);
// `each` 被以 `PACKED_ELEMENTS` 調用。V8 使用內聯快取
// （或稱“IC”）記住了 `each` 被以該特定元素種類調用。
// V8 樂觀地假設 `array.length` 和 `array[index]` 在 `each` 中的訪問是單態的（即只接收單一種類的元素）
// 直到證明相反為止。對於 `each` 的每次未來呼叫，V8 都會檢查元素種類是否為 `PACKED_ELEMENTS`。
// 如果是，V8 可以重用先前生成的代碼。如果不是，則需要更多操作。

each([1.1, 2.2, 3.3], doSomething);
// `each` 被呼叫時使用了 `PACKED_DOUBLE_ELEMENTS`。由於 V8 現在看到在其 IC 中不同的元素種類被傳遞給 `each`，
// `each` 函數內的 `array.length` 和 `array[index]` 訪問被標記為多態性。V8 現在每次呼叫 `each` 都需要額外檢查：
// 一個針對 `PACKED_ELEMENTS` 的檢查(如之前)，另一個針對 `PACKED_DOUBLE_ELEMENTS` 的新檢查，以及一個針對其他元素種類的檢查(如之前)。
// 這會帶來性能損失。

each([1, 2, 3], doSomething);
// `each` 被呼叫時使用了 `PACKED_SMI_ELEMENTS`。這會觸發另一種程度的多態性。現在在 `each` 的 IC 中有三種不同的元素種類。
// 從現在起的每次 `each` 呼叫，都需要進行另一個元素種類檢查以重用為 `PACKED_SMI_ELEMENTS` 生成的代碼。
// 這會帶來性能成本。
```
內建方法(如 `Array.prototype.forEach`)可以更有效地處理此類多態性，因此在性能敏感的情況下，請考慮使用它們代替用戶自定義函數庫函數。
另一個關於 V8 中單型與多態的例子涉及到物件形狀，也被稱為物件的隱藏類型。想了解該情況，請查看 [Vyacheslav 的文章](https://mrale.ph/blog/2015/01/11/whats-up-with-monomorphism.html)。
### 避免創建空洞
在現實世界的編程模式中，訪問疏鬆或緊密陣列之間的性能差異通常小到無關痛癢甚至不可測量。
如果(強調那是很大的“如果”)您的性能測量表明在優化過的代碼中節省每一條指令值得，那麼您可以嘗試讓您的陣列保持緊密元素模式。
假設我們嘗試創建一個陣列，例如：

```js
const array = new Array(3);
// 此時該陣列是稀疏的，因此它被標記為 `HOLEY_SMI_ELEMENTS`，
// 即給定當前資訊的最具體可能。
array[0] = &apos;a&apos;;
// 等等，那是一個字符串而不是小整數... 所以種類轉換為 `HOLEY_ELEMENTS`。
array[1] = &apos;b&apos;;
array[2] = &apos;c&apos;;
// 此時，陣列中的三個位置都被填充了，因此陣列是緊密的(即不再稀疏)。
// 然而，我們無法轉換到更具體的種類，例如 `PACKED_ELEMENTS`。
// 元素種類仍保持為 `HOLEY_ELEMENTS`。
```
陣列一旦被標記為稀疏，就會永遠保持稀疏——即使以後所有元素都存在！
創建陣列的更好方式是使用字面值形式：
```js
const array = [&apos;a&apos;, &apos;b&apos;, &apos;c&apos;];
// 元素種類：PACKED_ELEMENTS
```
如果您事先不知道所有值，可以先創建一個空陣列，然後稍後用 `push` 添加值。
```js
const array = [];
// …
array.push(someValue);
// …
array.push(someOtherValue);
```
此方法確保陣列永遠不會轉換為稀疏元素種類。
結果是，針對此陣列的一些操作，V8 可能生成稍稍更快的優化代碼。
## 偵錯元素種類
若要弄清楚某個物件的“元素種類”，請獲取 `d8` 的 debug build (可以通過以 debug 模式 [從源碼構建](/docs/build) 或通過使用 [`jsvu`](https://github.com/GoogleChromeLabs/jsvu) 獲得編譯好的二進制文件)，並運行：
```bash
out/x64.debug/d8 --allow-natives-syntax
```
這會打開一個 `d8` REPL，其中 [特殊函數](https://cs.chromium.org/chromium/src/v8/src/runtime/runtime.h?l=20&rcl=05720af2b09a18be5c41bbf224a58f3f0618f6be) (如 `%DebugPrint(object)` ) 可用。
其輸出中的“elements”字段顯示您傳遞給它的任何物件的“元素種類”。
```js
d8> const array = [1, 2, 3]; %DebugPrint(array);
DebugPrint: 0x1fbbad30fd71: [JSArray]
 - map = 0x10a6f8a038b1 [FastProperties]
 - prototype = 0x1212bb687ec1
 - elements = 0x1fbbad30fd19 <FixedArray[3]> [PACKED_SMI_ELEMENTS (COW)]
 - length = 3
 - properties = 0x219eb0702241 <FixedArray[0]> {
    #length: 0x219eb0764ac9 <AccessorInfo> (const accessor descriptor)
 }
 - elements= 0x1fbbad30fd19 <FixedArray[3]> {
           0: 1
           1: 2
           2: 3
 }
[…]
```
請注意，“COW”代表 [寫時複製](https://en.wikipedia.org/wiki/Copy-on-write)，這是另一種內部優化。
現在不需要擔心它——那是另一篇部落格文章的主題！
在 debug build 中還有一個有用的標誌 `--trace-elements-transitions`。
啟用它可以讓 V8 在發生任何元素種類轉換時通知您。
```bash
$ cat my-script.js
const array = [1, 2, 3];
array[3] = 4.56;

$ out/x64.debug/d8 --trace-elements-transitions my-script.js
elements transition [PACKED_SMI_ELEMENTS -> PACKED_DOUBLE_ELEMENTS] in ~+34 at x.js:2 for 0x1df87228c911 <JSArray[3]> from 0x1df87228c889 <FixedArray[3]> to 0x1df87228c941 <FixedDoubleArray[22]>
```
