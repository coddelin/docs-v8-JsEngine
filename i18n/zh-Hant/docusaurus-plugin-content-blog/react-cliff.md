---
title: "在 React 中 V8 性能崖的故事"
author: "Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)) 和 Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "benedikt-meurer"
  - "mathias-bynens"
date: "2019-08-28 16:45:00"
tags: 
  - internals
  - presentations
description: "本文敘述 V8 如何為各種 JavaScript 值選擇最佳的內存表示方式，以及這如何影響形狀機制——這有助於解釋最近在 React 核心中出現的 V8 性能崖。"
tweet: "1166723359696130049"
---
[之前](https://mathiasbynens.be/notes/shapes-ics)，我們討論了 JavaScript 引擎如何通過使用形狀和內線快取來優化物件和數組訪問，並探索了[引擎如何加速原型屬性訪問](https://mathiasbynens.be/notes/prototypes)。本文敘述 V8 如何為各種 JavaScript 值選擇最佳的內存表示方式，以及這如何影響形狀機制——這有助於解釋[React 核心中最近的 V8 性能崖](https://github.com/facebook/react/issues/14365)。

<!--truncate-->
:::note
**注意:** 如果您更喜歡觀看展示而非閱讀文章，請欣賞下面的視頻！如果不感興趣，則跳過視頻繼續閱讀。
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/0I0d8LkDqyc" width="640" height="360" loading="lazy" allowfullscreen></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=0I0d8LkDqyc">“JavaScript 引擎的基本原理：好的、壞的和醜的”</a>，由 Mathias Bynens 和 Benedikt Meurer 在 AgentConf 2019 上展示。</figcaption>
</figure>

## JavaScript 類型

每個 JavaScript 值都有且僅有一個（目前為止）八種類型之一：`Number`，`String`，`Symbol`，`BigInt`，`Boolean`，`Undefined`，`Null` 和 `Object`。

![](/_img/react-cliff/01-javascript-types.svg)

除了明顯的例外，這些類型可以通過 JavaScript 中的 `typeof` 運算符觀察到：

```js
typeof 42;
// → 'number'
typeof 'foo';
// → 'string'
typeof Symbol('bar');
// → 'symbol'
typeof 42n;
// → 'bigint'
typeof true;
// → 'boolean'
typeof undefined;
// → 'undefined'
typeof null;
// → 'object' 🤔
typeof { x: 42 };
// → 'object'
```

`typeof null` 返回 `'object'`，而不是 `'null'`，儘管 `Null` 是它自己的類型。要理解原因，請考慮所有 JavaScript 類型的集合分為兩組：

- _objects_（即 `Object` 類型）
- _primitives_（即任何非物件的值）

因此，`null` 表示“沒有物件值”，而 `undefined` 表示“沒有值”。

![](/_img/react-cliff/02-primitives-objects.svg)

循著這種思想，Brendan Eich 設計了 JavaScript 使得 `typeof` 返回 `'object'` 給右側的所有值，即所有物件和 `null` 值，以符合 Java 的精神。這就是為什麼 `typeof null === 'object'`，儘管規範中有一個獨立的 `Null` 類型。

![](/_img/react-cliff/03-primitives-objects-typeof.svg)

## 值的表示

JavaScript 引擎必須能夠在內存中表示任意的 JavaScript 值。然而，重要的一點是，值的 JavaScript 類型與 JavaScript 引擎如何在內存中表示該值是分開的。

例如，值 `42` 在 JavaScript 中的類型為 `number`。

```js
typeof 42;
// → 'number'
```

有幾種方法可以在內存中表示整數值 `42`：

:::table-wrapper
| 表示方式                           | 位元                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------- |
| 二的補碼 8 位元                  | `0010 1010`                                                                       |
| 二的補碼 32 位元                 | `0000 0000 0000 0000 0000 0000 0010 1010`                                         |
| 封包二進制編碼的十進制 (BCD)      | `0100 0010`                                                                       |
| 32 位元 IEEE-754 浮點數          | `0100 0010 0010 1000 0000 0000 0000 0000`                                         |
| 64 位元 IEEE-754 浮點數          | `0100 0000 0100 0101 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000` |
:::

ECMAScript 將數字標準化為 64 位元浮點數，也稱為_雙精度浮點數_或_Float64_。然而，這並不意味著 JavaScript 引擎總是以 Float64 表示數字——這樣做會非常低效！引擎可以選擇其他內部表示方式，只要行為上與 Float64 精確匹配即可。

大多數在真實世界的 JavaScript 應用中使用的數字，通常是[有效的 ECMAScript 陣列索引](https://tc39.es/ecma262/#array-index)，即介於 0 到 2³²−2 範圍內的整數值。

```js
array[0]; // 最小可能的陣列索引。
array[42];
array[2**32-2]; // 最大可能的陣列索引。
```

JavaScript 引擎可以為此類型的數字選擇最佳的內存表示方式，以優化透過索引存取陣列元素的程式碼。對於處理器執行內存存取操作，陣列索引必須以[二補數](https://en.wikipedia.org/wiki/Two%27s_complement)表示。若是改用 Float64 表示陣列索引將會非常浪費，因為引擎每次存取陣列元素時，必須在 Float64 與二補數之間來回轉換。

32 位二補數表示法不僅僅對陣列操作有用。一般來說，**處理器執行整數操作的速度遠快於浮點操作**。這就是為什麼在以下範例中，第一個迴圈明顯比第二個迴圈快上至少一倍。

```js
for (let i = 0; i < 1000; ++i) {
  // 快 🚀
}

for (let i = 0.1; i < 1000.1; ++i) {
  // 慢 🐌
}
```

同樣的情況適用於操作。以下程式碼中，取模運算符的效能取決於所操作的整數是否為整數。

```js
const remainder = value % divisor;
// 對於 `value` 和 `divisor` 表示為整數，速度快 🚀，
// 否則速度慢 🐌。
```

如果兩個操作元被表示為整數，CPU 就能高效地計算結果。V8 在 `divisor` 是二的冪時，還有額外的快速處理途徑。若數值表示為浮點數，計算則會更加複雜且耗時得多。

由於整數操作通常比浮點操作執行得更快，似乎引擎可以始終使用二補數來表示所有整數及所有整數操作的結果。不幸的是，這將違反 ECMAScript 規範！ECMAScript 標準化為 Float64，因此**某些整數操作實際上會產生浮點數**。在這些情況下，引擎必須產出正確的結果。

```js
// Float64 的安全整數範圍是 53 位元。超出該範圍後，
// 你必須失去精度。
2**53 === 2**53+1;
// → true

// Float64 支援負零，因此 -1 * 0 必須是 -0，
// 但二補數中無法表示負零。
-1*0 === -0;
// → true

// Float64 有無窮大，可以通過除以零來產生。
1/0 === Infinity;
// → true
-1/0 === -Infinity;
// → true

// Float64 也有 NaNs。
0/0 === NaN;
```

即使左側的值是整數，所有右側的值都是浮點數。這就是為什麼上述操作無法使用 32 位元二補數正確執行。JavaScript 引擎必須特別注意讓整數操作適當回退以產生 Float64 的進階結果。

對於 31 位元有符號整數範圍內的小整數，V8 使用一種特殊表示方式，稱為 `Smi`。任何不屬於 `Smi` 的都表示為 `HeapObject`，即內存中某些實體的地址。對於數字，我們使用一種特殊的 `HeapObject`，稱為 `HeapNumber`，來表示不在 `Smi` 範圍內的數字。

```js
 -Infinity // HeapNumber
-(2**30)-1 // HeapNumber
  -(2**30) // Smi
       -42 // Smi
        -0 // HeapNumber
         0 // Smi
       4.2 // HeapNumber
        42 // Smi
   2**30-1 // Smi
     2**30 // HeapNumber
  Infinity // HeapNumber
       NaN // HeapNumber
```

如上例所示，有些 JavaScript 的數字被表示為 `Smi`，而有些則被表示為 `HeapNumber`。V8 專門對 `Smi` 進行優化，因為小整數在真實世界的 JavaScript 程式中非常常見。`Smi` 不需要分配為內存中的專用實體，且總體上支持快速整數操作。

這裡的重要學到的是，**即使具有相同 JavaScript 類型的值，在背後可能完全以不同的方式表示**，作為一種優化。

### `Smi` vs. `HeapNumber` vs. `MutableHeapNumber`

以下是它如何在底層運作的。我們假設有以下對象：

```js
const o = {
  x: 42,  // Smi
  y: 4.2, // HeapNumber
};
```

屬性 `x` 的值 `42` 可以編碼為 `Smi`，因此可以直接儲存在對象內部。而屬性 `y` 的值 `4.2` 則需要一個單獨的實體來保存該值，並且該對象指向該實體。

![](/_img/react-cliff/04-smi-vs-heapnumber.svg)

然後假設運行以下 JavaScript 程式碼片段：

```js
o.x += 10;
// → o.x 現在是 52
o.y += 1;
// → o.y 現在是 5.2
```

在此情況下，`x` 的值可以直接在內部更新，因為新值 `52` 同樣符合 `Smi` 範圍。

![](/_img/react-cliff/05-update-smi.svg)

然而，新的值 `y=5.2` 無法適配於 `Smi`，並且也與之前的值 `4.2` 不同，因此 V8 需要為 `y` 的賦值分配一個新的 `HeapNumber` 實體。

![](/_img/react-cliff/06-update-heapnumber.svg)

`HeapNumber` 是不可變的，這使得某些優化成為可能。例如，如果我們將 `y` 的值賦給 `x`：

```js
o.x = o.y;
// → o.x 現在是 5.2
```

……我們現在只需鏈接到相同的 `HeapNumber` 而不是為相同的值分配一個新的。

![](/_img/react-cliff/07-heapnumbers.svg)

`HeapNumber` 是不可變的，這有一個缺點，即如果值超出 `Smi` 範圍經常被更新時，速度會很慢，例如以下情況：

```js
// 創建一個 `HeapNumber` 實例。
const o = { x: 0.1 };

for (let i = 0; i < 5; ++i) {
  // 創建一個額外的 `HeapNumber` 實例。
  o.x += 1;
}
```

第一行將創建一個初始值為 `0.1` 的 `HeapNumber` 實例。循環體將該值更改為 `1.1`、`2.1`、`3.1`、`4.1`，最終為 `5.1`，在此過程中一共創建了六個 `HeapNumber` 實例，其中五個在循環結束後成為垃圾。

![](/_img/react-cliff/08-garbage-heapnumbers.svg)

為避免此問題，V8 提供了一種方式，以作為優化來原地更新非 `Smi` 數字字段。當數值字段的值超出 `Smi` 範圍時，V8 會在結構中將該字段標記為 `Double` 字段，並分配一個稱為 `MutableHeapNumber` 的對象，用於存放以 Float64 編碼的實際值。

![](/_img/react-cliff/09-mutableheapnumber.svg)

當字段的值發生更改時，V8 不再需要分配新的 `HeapNumber`，而是可以直接更新原地的 `MutableHeapNumber`。

![](/_img/react-cliff/10-update-mutableheapnumber.svg)

不過，這種方法也有一個問題。由於 `MutableHeapNumber` 的值可以更改，因此這些對象不能隨意傳遞。

![](/_img/react-cliff/11-mutableheapnumber-to-heapnumber.svg)

例如，如果您將 `o.x` 賦值給變量 `y`，那麼您不希望下次 `o.x` 更改時，`y` 的值也改變——這會違反 JavaScript 規範！因此，在訪問 `o.x` 時，數字必須在賦值給 `y` 前重新 *封裝* 為常規的 `HeapNumber`。

對於浮點數，V8 在幕後完成上述所有的“封裝”操作。但是對於小整數來說，採用 `MutableHeapNumber` 方法會很浪費，因為 `Smi` 是更高效的表示方式。

```js
const object = { x: 1 };
// → 對於對象中的 `x` 無需“封裝”

object.x += 1;
// → 更新對象中 `x` 的值
```

為了避免低效，我們只需將結構中的字段標記為 `Smi` 表示，並且只要數值適配小整數範圍，就直接原地更新該數值。

![](/_img/react-cliff/12-smi-no-boxing.svg)

## 結構的廢棄與遷移

那麼如果字段最初容納的是 `Smi`，但稍後包含了超出小整數範圍的數值呢？例如，在這種情況下，兩個對象最初使用相同的結構，其中 `x` 最初被表示為 `Smi`：

```js
const a = { x: 1 };
const b = { x: 2 };
// → 對象的 `x` 現在是 `Smi` 字段

b.x = 0.2;
// → `b.x` 現在被表示為 `Double`

y = a.x;
```

這從兩個指向相同結構的對象開始，其中 `x` 被標記為 `Smi` 表示：

![](/_img/react-cliff/13-shape.svg)

當 `b.x` 更改為 `Double` 表示時，V8 分配一個新的結構，其中 `x` 被分配為 `Double` 表示，並且該結構指向初始的空結構。V8 同時分配一個 `MutableHeapNumber` 用於存放 `x` 屬性的值 `0.2`。然後我們更新對象 `b` 指向該新結構，並將對象中的槽位更新為指向剛分配的 `MutableHeapNumber` 偏移 0 的位置。最後，我們標記舊結構為廢棄並將其從遷移樹中解除鏈接。這是通過對空結構中的 `'x'` 添加到新創建的結構的轉換來完成的。

![](/_img/react-cliff/14-shape-transition.svg)

此時我們無法完全移除舊結構，因為它仍然被 `a` 使用，並且主動遍歷內存以查找所有指向舊結構的對象並更新它們成本太高。相反，V8 採用延遲處理的方式：對 `a` 的任何屬性訪問或分配操作都會首先將其遷移到新結構。理論上，最終舊結構將變得不可達，並由垃圾收集器移除。

![](/_img/react-cliff/15-shape-deprecation.svg)

當更改表示的字段不是鏈中的最後一個時，情況會更加棘手：

```js
const o = {
  x: 1,
  y: 2,
  z: 3,
};

o.y = 0.1;
```

在這種情況下，V8 需要找到所謂的 _拆分結構_，即鏈中最後一個未引入相關屬性的結構。在我們的例子中，我們改變的是 `y`，因此我們需要找到最後一個沒有 `y` 的結構，這就是引入了 `x` 的結構。

![](/_img/react-cliff/16-split-shape.svg)

從分裂形狀開始，我們為 `y` 創建了一個新的過渡鏈，重播所有之前的過渡，但將 `'y'` 標記為 `Double` 表示。我們使用這個新的過渡鏈作為 `y` 的過渡，並將舊子樹標記為已棄用。在最後一步中，我們將實例 `o` 遷移到新形狀，現在使用 `MutableHeapNumber` 存儲 `y` 的值。這樣，新的對象就不會再走舊的路徑，並且一旦所有指向舊形狀的引用都消失，樹中已棄用的形狀部分就會消失。

## 可擴展性與完整性級別的過渡

`Object.preventExtensions()` 阻止對象添加新屬性。如果嘗試添加，它會拋出一個異常。（如果不是在嚴格模式下，它不會拋出異常，而是默默地什麼也不做。）

```js
const object = { x: 1 };
Object.preventExtensions(object);
object.y = 2;
// TypeError: 無法添加屬性 y;
//            object 不可擴展
```

`Object.seal` 的作用與 `Object.preventExtensions` 相同，但它還將所有屬性標記為不可配置，這意味著你無法刪除它們，也不能更改它們的可枚舉性、可配置性或可寫性。

```js
const object = { x: 1 };
Object.seal(object);
object.y = 2;
// TypeError: 無法添加屬性 y;
//            object 不可擴展
delete object.x;
// TypeError: 無法刪除屬性 x
```

`Object.freeze` 的作用與 `Object.seal` 相同，但它還防止現有屬性的值被更改，通過將它們標記為不可寫。

```js
const object = { x: 1 };
Object.freeze(object);
object.y = 2;
// TypeError: 無法添加屬性 y;
//            object 不可擴展
delete object.x;
// TypeError: 無法刪除屬性 x
object.x = 3;
// TypeError: 無法賦值給只讀屬性 x
```

讓我們看看這個具體的示例，有兩個對象都只有一個屬性 `x`，然後我們阻止第二個對象進一步擴展。

```js
const a = { x: 1 };
const b = { x: 2 };

Object.preventExtensions(b);
```

一開始就像我們已知的一樣，從空形狀過渡到包含屬性 `'x'` 的新形狀(表示為 `Smi`)。當我們阻止對 `b` 的擴展時，我們執行了一個特別過渡到標記為不可擴展的新形狀。這種特殊過渡並未引入任何新屬性——它真的只是個標記。

![](/_img/react-cliff/17-shape-nonextensible.svg)

注意，我們不能就地更新包含 `x` 的形狀，因為另一個對象 `a` 仍然是可擴展的，而且需要該形狀。

## React 性能問題

讓我們將所有學到的結合起來，了解[最近的 React 問題 #14365](https://github.com/facebook/react/issues/14365)。當 React 團隊對一個真實的應用程序進行剖析時，他們發現了一個奇怪的 V8 性能瓶頸，影響到了 React 的核心。以下是該問題的簡化重現示例：

```js
const o = { x: 1, y: 2 };
Object.preventExtensions(o);
o.y = 0.2;
```

我們有一個對象，包含兩個字段，這些字段具有 `Smi` 表示。我們阻止該對象的進一步擴展，最終將第二個字段強制為 `Double` 表示。

正如我們之前所學，這大致創建了以下設置：

![](/_img/react-cliff/18-repro-shape-setup.svg)

兩個屬性都標記為 `Smi` 表示，最後的過渡是可擴展性的過渡，以將形狀標記為不可擴展。

現在我們需要將 `y` 更改為 `Double` 表示，這意味著我們需要再次從分裂形狀開始。在這種情況下，引入 `x` 的是分裂形狀。但現在 V8 遇到了困惑，因為分裂形狀是可擴展的，而當前形狀被標記為不可擴展。V8 確實不知道如何正確重播這些過渡。因此，V8 基本上只是放棄了理解，並創建了一個與現有形狀樹無關且未與任何其他對象共享的單獨形狀。可以將其視為一個孤立形狀：

![](/_img/react-cliff/19-orphaned-shape.svg)

你可以想像，如果這種情況發生在很多對象上，那麼整個形狀系統就會變得毫無用處。

在 React 的情況下，發生了以下情況：每個 `FiberNode` 都有幾個字段，當開啟剖析功能時，這些字段應該存儲時間戳。

```js
class FiberNode {
  constructor() {
    this.actualStartTime = 0;
    Object.preventExtensions(this);
  }
}

const node1 = new FiberNode();
const node2 = new FiberNode();
```

這些字段（如 `actualStartTime`）初始化為 `0` 或 `-1`，因此開始時具有 `Smi` 表示。但後來，來自 [`performance.now()`](https://w3c.github.io/hr-time/#dom-performance-now) 的實際浮點時間戳存儲在這些字段中，因為它們無法適應 `Smi`，這使得它們變為 `Double` 表示。除此之外，React 還阻止對 `FiberNode` 實例的擴展。

最初，上述簡化的示例看起來像這樣：

![](/_img/react-cliff/20-fibernode-shape.svg)

有兩個實例共享一個形狀樹，一切都按預期工作。但隨後，當你存儲真實的時間戳時，V8 在找到分裂形狀時遇到了困惑：

![](/_img/react-cliff/21-orphan-islands.svg)

V8 為 `node1` 分配了一個新的孤立形狀，稍後 `node2` 發生相同情況，導致出現兩個 _孤立島嶼_，每個都有自己獨立的形狀。許多實際應用中的 React 應用不僅只有兩個，而是有數萬個這樣的 `FiberNode`。如您所想，這種情況對於 V8 的性能表現並不是特別友好。

幸運的是，[我們已解決了這個性能瓶頸](https://chromium-review.googlesource.com/c/v8/v8/+/1442640/) 在 [V8 v7.4](/blog/v8-release-74)，我們正 [努力降低字段表示更改的成本](https://bit.ly/v8-in-place-field-representation-changes)，以消除剩餘的性能瓶頸。修復之後，V8 現在做了正確的事情：

![](/_img/react-cliff/22-fix.svg)

兩個 `FiberNode` 實例指向一個不可擴展的形狀，其中 `'actualStartTime'` 是一個 `Smi` 字段。當首次對 `node1.actualStartTime` 賦值時，創建了一條新的過渡鏈，並且先前的鏈被標記為已棄用：

![](/_img/react-cliff/23-fix-fibernode-shape-1.svg)

注意，現在延展性過渡正確地被重放到新鏈中。

![](/_img/react-cliff/24-fix-fibernode-shape-2.svg)

在對 `node2.actualStartTime` 賦值後，兩個節點都指向新的形狀，而垃圾回收器可以清理過渡樹中的棄用部分。

:::note
**注意:** 您可能會認為所有這些形狀棄用和遷移很複雜，確實如此。事實上，我們猜測在實際網站上它帶來的問題（性能、記憶體使用和複雜性）比它解決的問題更多，特別是隨著 [指針壓縮](https://bugs.chromium.org/p/v8/issues/detail?id=7703) 的出現，我們無法再使用它在物件內聯存儲雙精度值。因此，我們希望 [完全移除 V8 的形狀棄用機制](https://bugs.chromium.org/p/v8/issues/detail?id=9606)。您可以說它是 _\*戴上太陽鏡\*_ 被棄用了。 _耶…_
:::

React 團隊 [在其端緩解了這個問題](https://github.com/facebook/react/pull/14383)，確保所有 `FiberNode` 的時間和持續時間字段從一開始就使用 `Double` 表示：

```js
class FiberNode {
  constructor() {
    // 從一開始強制使用 `Double` 表示。
    this.actualStartTime = Number.NaN;
    // 稍後，您仍然可以初始化為您想要的值：
    this.actualStartTime = 0;
    Object.preventExtensions(this);
  }
}

const node1 = new FiberNode();
const node2 = new FiberNode();
```

替代 `Number.NaN`，任何不符合 `Smi` 范圍的浮點值均可使用。例如：`0.000001`、`Number.MIN_VALUE`、`-0` 和 `Infinity`。

值得指出的是，具體的 React 錯誤是 V8 特有的，總體而言，開發者不應該針對特定版本的 JavaScript 引擎進行優化。不過，在事情出問題時擁有可以處理的方式還是很好的。

請記住，JavaScript 引擎在底層進行了一些魔法操作，您可以通過盡量避免混合類型來幫助它。例如，請不要使用 `null` 初始化您的數值字段，因為這會禁用字段表示追蹤的所有好處，而且令您的代碼更具可讀性：

```js
// 不要這樣做!
class Point {
  x = null;
  y = null;
}

const p = new Point();
p.x = 0.1;
p.y = 402;
```

換句話說，**編寫可讀的代碼，性能就會跟隨！**

## 總結

我們在本次深入探討中介紹了以下內容：

- JavaScript 區分“原始值”和“物件”，而 `typeof` 是說謊的。
- 即使具有相同 JavaScript 類型的值，在後端也可能有不同的表示形式。
- V8 試圖為您的 JavaScript 程序中的每個屬性找到最佳表示方式。
- 我們討論了 V8 如何處理形狀棄用和遷移，包括延展性過渡。

基於這些知識，我們確定了一些實用的 JavaScript 編碼技巧，有助於提高性能：

- 始終以一致的方式初始化您的物件，以使形狀能夠有效運作。
- 為您的字段選擇合理的初始值，以幫助 JavaScript 引擎進行表示選擇。
