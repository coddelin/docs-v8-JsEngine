---
title: "在 V8 中實現排序"
author: "Simon Zünd ([@nimODota](https://twitter.com/nimODota)), 一致的比較器"
avatars: 
  - simon-zuend
date: "2018-09-28 11:20:37"
tags: 
  - ECMAScript
  - 內部運作
description: "從 V8 v7.0 / Chrome 70 開始，Array.prototype.sort 是穩定的。"
tweet: "1045656758700650502"
---
`Array.prototype.sort` 是 V8 中以自託管 JavaScript 實現的最後一個內建函數之一。重構它使我們有機會嘗試不同的算法和實現策略，並最終在 V8 v7.0 / Chrome 70 中[使其穩定](https://mathiasbynens.be/demo/sort-stability)。

<!--truncate-->
## 背景

在 JavaScript 中排序是一項困難的任務。本篇博客探討了排序算法與 JavaScript 語言之間交互的一些怪癖，並敘述了我們將 V8 遷移到穩定算法並使性能更加可預測的旅程。

比較不同排序算法時，我們會查看其最差和平均性能，這是基於內存操作或比較次數的漸近增長（即“大O”符號）的界限。需要注意的是，在動態語言，如 JavaScript 中，比較操作通常比內存訪問代價更高。這是因為在排序過程中比較兩個值通常涉及調用用戶代碼。

讓我們來看一個簡單的例子，根據用戶提供的比較函數將一些數字按升序排序。一個 _一致的_ 比較函數在提供的兩個值分別較小、相等或較大時返回 `-1`（或其他負值）、`0` 或 `1`（或其他正值）。不遵循此模式的比較函數是不一致的，可能具有任意副作用，例如修改其旨在排序的數組。

```js
const array = [4, 2, 5, 3, 1];

function compare(a, b) {
  // 可插入任意代碼，例如 `array.push(1);`。
  return a - b;
}

// “典型”的排序調用。
array.sort(compare);
```

即使在下一個例子中，也可能調用用戶代碼。默認的比較函數會調用 `toString`，並對字符串表示進行字典順序比較。

```js
const array = [4, 2, 5, 3, 1];

array.push({
  toString() {
    // 可插入任意代碼，例如 `array.push(1);`。
    return '42';
  }
});

// 不使用比較函數的排序。
array.sort();
```

### 涉及存取器和原型鍊交互的更多有趣情況

這是我們離開規範並進入“實現定義行為”領域的部分。規範列出了一整套條件，滿足這些條件時，允許引擎按其看到的合適方式對對象/數組進行排序——或者完全不排序。引擎仍然需要遵循一些基本規則，但其他一切基本上是隨意的。一方面，這給了引擎開發者嘗試不同實現的自由；另一方面，儘管規範不要求一定有合理行為，用戶仍然期望有些合理的行為。這更難以處理，因為“合理行為”並不總是容易確定的。

本節顯示了 `Array#sort` 的某些方面，其中引擎行為差異很大。這些是棘手的邊緣案例，如上所述，並不總是很清楚應該怎麼做。我們 _非常_ 不建議編寫類似的代碼；引擎不會針對它進行優化。

第一個例子展示了一個帶有一些存取器（即 getter 和 setter）的數組以及在不同 JavaScript 引擎中的“調用日誌”。存取器是結果排序順序由實現定義的第一種情況：

```js
const array = [0, 1, 2];

Object.defineProperty(array, '0', {
  get() { console.log('get 0'); return 0; },
  set(v) { console.log('set 0'); }
});

Object.defineProperty(array, '1', {
  get() { console.log('get 1'); return 1; },
  set(v) { console.log('set 1'); }
});

array.sort();
```

以下是該代碼片段在各種引擎中的輸出。注意這裡沒有“正確”或“錯誤”的答案——規範將此留給了具體實現！

```
// Chakra
get 0
get 1
set 0
set 1

// JavaScriptCore
get 0
get 1
get 0
get 0
get 1
get 1
set 0
set 1

// V8
get 0
get 0
get 1
get 1
get 1
get 0

#### SpiderMonkey
get 0
get 1
set 0
set 1
```

下一個例子顯示了與原型鍊的交互。出於簡潔，我們未展示調用日誌。

```js
const object = {
 1: 'd1',
 2: 'c1',
 3: 'b1',
 4: undefined,
 __proto__: {
   length: 10000,
   1: 'e2',
   10: 'a2',
   100: 'b2',
   1000: 'c2',
   2000: undefined,
   8000: 'd2',
   12000: 'XX',
   __proto__: {
     0: 'e3',
     1: 'd3',
     2: 'c3',
     3: 'b3',
     4: 'f3',
     5: 'a3',
     6: undefined,
   },
 },
};
Array.prototype.sort.call(object);
```

輸出顯示了排序後的`object`。同樣，這裡沒有正確答案。此範例僅展示了索引屬性和原型鏈之間的交互可能多麼奇怪：

```js
// Chakra
['a2', 'a3', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e3', undefined, undefined, undefined]

// JavaScriptCore
['a2', 'a2', 'a3', 'b1', 'b2', 'b2', 'c1', 'c2', 'd1', 'd2', 'e3', undefined]

// V8
['a2', 'a3', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e3', undefined, undefined, undefined]

// SpiderMonkey
['a2', 'a3', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e3', undefined, undefined, undefined]
```

### V8 排序前後執行的操作

:::note
**注意：** 本節於2019年6月更新，以反映V8 v7.7中`Array#sort`的排序前後處理方式。
:::

在實際排序之前，V8有一個預處理步驟，在排序完成後也有一個後處理步驟。基本思想是將所有非`undefined`的值收集到一個臨時列表中，對臨時列表進行排序，然後將排序後的值寫回到實際的陣列或物件中。這樣可以使V8在排序期間不必處理存取器或原型鏈的交互。

規範要求`Array#sort`生成的排序結果可以概念性地分為三個部分：

  1. 所有根據比較函數排序的非`undefined`值。
  2. 所有`undefined`值。
  3. 所有空洞，即不存在的屬性。

實際的排序演算法僅需要應用於第一部分。為了達到此目的，V8的預處理步驟大致如下：

  1. 設定`length`為排序的陣列或物件的`”length”`屬性的值。
  1. 設定`numberOfUndefineds`為0。
  1. 對於範圍中的每個`value` `[0, length)`：
    a. 如果`value`是空洞：不執行任何操作。
    b. 如果`value`是`undefined`：將`numberOfUndefineds`加1。
    c. 否則，將`value`添加到臨時列表`elements`。

執行這些步驟後，所有非`undefined`值都包含在臨時列表`elements`中。`undefined`值僅被計數，並未添加到`elements`中。如上所述，規範要求`undefined`值必須排到末尾。但是，`undefined`值並未真正傳遞到使用者提供的比較函數，因此我們僅需計算出現的`undefined`值數量。

下一步是對`elements`進行實際排序。請參見[關於 TimSort 的詳細描述](/blog/array-sort#timsort)。

排序完成後，排序的值必須寫回到原始陣列或物件中。後處理步驟包含三個階段，負責概念上的部分：

  1. 將`elements`中的所有值按範圍`[0, elements.length)`寫回到原始物件中。
  2. 將範圍`[elements.length, elements.length + numberOfUndefineds)`中的所有值設定為`undefined`。
  3. 刪除範圍`[elements.length + numberOfUndefineds, length)`中的所有值。

第3步是必要的，因為原始物件在排序範圍內可能包含空洞。在範圍`[elements.length + numberOfUndefineds, length)`內的值已移至前端，如果未執行第3步，則會導致重複值。

## 歷史

`Array.prototype.sort` 和 `TypedArray.prototype.sort` 都依賴於用 JavaScript 編寫的同一個 Quicksort 實現。排序演算法本身相當簡單：基礎為 Quicksort，對於較短的陣列（長度 < 10）則使用 Insertion Sort 回退。當 Quicksort 遞迴達到子陣列長度為 10 時，插入排序回退也會被使用。插入排序對於較小的陣列效率更高。這是因為 Quicksort 在分割後會遞迴調用兩次，每次遞迴調用都有創建（以及丟棄）堆棧框架的開銷。

在 Quicksort 中選擇合適的樞軸元素對演算法效率影響很大。V8採用了以下兩種策略：

- 樞軸選擇為子陣列中第一個、最後一個和第三個元素的中值。對於較小的陣列，第 三個元素簡單地選擇中間元素。
- 對於較大的陣列，取一個樣本，將樣本排序，並將排序後樣本的中值作為上述計算中的第三個元素。

Quicksort 的優勢之一是它能進行原地排序。記憶體開銷來自於在排序大陣列時分配小型陣列作樣本，以及 log(n) 堆棧空間。不足之處是它並非穩定演算法，並且有可能遇到最壞情況，即 Quicksort 降級為 𝒪(n²)。

### 引入 V8 Torque

作為 V8 部落格的忠實讀者，您可能聽說過 [`CodeStubAssembler`](/blog/csa) 或簡稱 CSA。CSA 是 V8 的一個組件，允許我們直接用 C++ 編寫低層 TurboFan IR，該 IR 之後會通過 TurboFan 的後端翻譯成為適合相應架構的機器碼。

CSA 被廣泛用於編寫 JavaScript 內建函数的所謂“快速路徑”。內建函数的快速路徑版本通常會檢查某些不變性是否成立（例如：原型鏈上沒有元素，沒有訪問器等），然後使用更快、更專用的操作來實現內建函数功能。這可能會使執行時間比更通用的版本快一個數量級。

CSA 的缺點是它確實可以被認為是一種低級語言。控制流使用顯式的 `labels` 和 `gotos` 來建模，這使得在 CSA 中實現更複雜的算法難以閱讀且容易出錯。

接下來是 [V8 Torque](/docs/torque)。Torque 是一種具有類 TypeScript 語法的領域專用語言，目前使用 CSA 作為其唯一的編譯目標。Torque 提供了幾乎與 CSA 同等的控制水平，同時還提供了更高級的結構，例如 `while` 和 `for` 循環。此外，它是強類型的，將來會包含諸如自動越界檢查之類的安全檢查，為 V8 工程師提供更強的保證。

首批用 V8 Torque 重寫的主要內建函数是 [`TypedArray#sort`](/blog/v8-release-68) 和 [`Dataview` operations](/blog/dataview)。它們還提供了向 Torque 開發者反饋哪些語言功能是必要的，以及應該使用哪些慣用方式來高效編寫內建函数。在撰寫本文時，幾個 `JSArray` 內建函数已將其自託管 JavaScript 備用實現移至 Torque（例如：`Array#unshift`），而其他一些則完全重寫（例如：`Array#splice` 和 `Array#reverse`）。

### 移動 `Array#sort` 到 Torque

初始的 `Array#sort` Torque 版本或多或少是 JavaScript 實現的直接移植。唯一的區別是，對於較大的數組，在樞軸計算中所用的第三個元素不是通過採樣方法選擇，而是隨機選擇。

這運行得相當不錯，但由於它仍然使用快速排序，`Array#sort` 仍然是不穩定的。[穩定的 `Array#sort` 的請求](https://bugs.chromium.org/p/v8/issues/detail?id=90) 是 V8 錯誤跟蹤器中最早的工單之一。下一步實驗用 Timsort 為我們提供了多項優點。首先，我們喜歡它是穩定的並提供一些不錯的算法保證（見下一節）。其次，Torque 仍然是一個進行中的工作，使用 Timsort 實現一個更複雜的內建函数（如 `Array#sort`）提供了大量影響 Torque 作為語言的可操作反饋。

## Timsort

Timsort 最初由 Tim Peters 在 2002 年為 Python 開發，可以最好地描述為一種自適應穩定的 Mergesort 變體。雖然細節相當複雜，最好的描述來自 [Peters 本人](https://github.com/python/cpython/blob/master/Objects/listsort.txt) 或 [維基百科頁面](https://en.wikipedia.org/wiki/Timsort)，但是基本內容很容易理解。Mergesort 通常以遞歸方式工作，而 Timsort 則以迭代方式工作。它從左到右處理數組並尋找所謂的 _runs_。run 就是已經排序的序列。這包括按“錯誤方向”排序的序列，因為這些序列可以簡單地反轉以形成 run。在排序過程開始時會根據輸入長度確定 run 的最小長度。如果 Timsort 無法找到滿足這一最小長度的自然 runs，則使用插入排序“人工提升”一個 run。

通過這種方式找到的 runs 會被追蹤到一個棧中，此棧記錄了每個 run 的起始索引和長度。不時地，棧中的 runs 會合併在一起，直到只剩下一個排序的 run。Timsort 在決定合併哪些 runs 時試圖保持平衡。一方面，你希望盡早合併，因為這些 runs 的數據很可能已經在緩存中；另一方面，你希望盡可能晚地合併，以利用數據中可能出現的模式。為實現此目的，Timsort 維持兩個不變性。假設 `A`、`B` 和 `C` 是最頂部的三個 runs：

- `|C| > |B| + |A|`
- `|B| > |A|`

![合併 `A` 和 `B` 前後的 runs 棧圖示](/_img/array-sort/runs-stack.svg)

圖像顯示了 `|A| > |B|` 的情況，因此 `B` 與兩個 run 中更小的一個合併。

請注意，Timsort 只合併連續的 runs，這是保持穩定性的必要條件，否則相等的元素可能會在 runs 之間轉移。此外，第一個不變性確保 run 的長度至少以斐波納契數列的速度增長，當我們知道最大數組長度時，對 run 棧的大小給出了一個上限。

現在可以看到，對於已排序的序列，排序時間是 𝒪(n)，因為這樣的數組將形成一個不需要合併的單一 run。最壞情況是 𝒪(n log n)。這些算法屬性以及 Timsort 的穩定性是我們最終選擇 Timsort 而非快速排序的原因之一。

### 在 Torque 中實現 Timsort

內建函式通常有不同的程式碼路徑，這些路徑根據各種變數在執行時選擇。最通用的版本能處理任何類型的物件，不論是 `JSProxy`、有攔截器，還是需要在取得或設定屬性時進行原型鏈查找。
通用路徑在大多數情況下是相對較慢的，因為需要考慮所有可能性。但如果我們事先知道要排序的物件是簡單的、僅包含 Smis 的 `JSArray`，所有這些昂貴的 `[[Get]]` 和 `[[Set]]` 操作就可以被簡單的對 `FixedArray` 的存取操作替代。主要的區分因素是 [`ElementsKind`](/blog/elements-kinds)。

現在的問題變成如何實現快速路徑。核心算法對所有情況保持一致，但我們存取元素的方式會根據 `ElementsKind` 而改變。一種實現方式是，在每次呼叫位置分派到正確的“存取器”。想像在每次“讀取”/“存儲”操作時根據選擇的快速路徑選擇不同的分支。

另一個解決方案（也是首次嘗試的方式）是僅為每個快速路徑複製整個內建函式，並內聯正確的讀取/存儲存取方法。這種方法對於 Timsort 而言不可行，因為它是一個大型內建函式，為每條快速路徑複製一次導致總大小達到 106 KB，對單個內建函式而言實在過於龐大。

最終解決方案略有不同。每條快速路徑的每個讀取/存儲操作都放入其自己的“小型內建函式”中。請參考下方的程式碼範例，它展示了針對 `FixedDoubleArray` 的“讀取”操作。

```torque
Load<FastDoubleElements>(
    context: Context, sortState: FixedArray, elements: HeapObject,
    index: Smi): Object {
  try {
    const elems: FixedDoubleArray = UnsafeCast<FixedDoubleArray>(elements);
    const value: float64 =
        LoadDoubleWithHoleCheck(elems, index) otherwise Bailout;
    return AllocateHeapNumberWithValue(value);
  }
  label Bailout {
    // 預處理步驟通過將所有元素壓縮到陣列的開頭移除了所有空洞。
    // 發現空洞意味著 cmp 函式或 ToString 修改了陣列。
    return Failure(sortState);
  }
}
```

相比之下，最通用的“讀取”操作只是單純地呼叫 `GetProperty`。但上述版本生成了有效且快速的機器碼來讀取並轉換一個 `Number`，而 `GetProperty` 是呼叫另一個可能涉及原型鏈查找或調用存取器函式的內建函式。

```js
builtin Load<ElementsAccessor : type>(
    context: Context, sortState: FixedArray, elements: HeapObject,
    index: Smi): Object {
  return GetProperty(context, elements, index);
}
```

一條快速路徑就簡單地成為一組函式指針。這意味著我們只需要核心算法的一個拷貝，同時一次設定所有相關的函式指針即可。雖然這大大減少了所需的程式碼空間（降至 20k），但也帶來了代價，每個存取位置都需要一次間接分支。由於最近改為使用 [嵌入式內建函式](/blog/embedded-builtins)，這個代價甚至更加顯著。

### 排序狀態

![](/_img/array-sort/sort-state.svg)

上圖展示了“排序狀態”。它是一個 `FixedArray`，用於在排序過程中記錄所需的一切。每次呼叫 `Array#sort` 時，這樣的排序狀態會被分配。第 4 至 7 位置是上述提到的構成快速路徑的一組函式指針。

每次從使用者 JavaScript 程式碼返回時，都需要使用“檢查”內建函式，來檢查是否可以繼續當前的快速路徑。它使用“初始接收者映射”和“初始接收者長度”來達到這個目的。如果使用者程式碼修改了當前物件，我們只需放棄排序運行，將所有指針重置到最通用版本並重新開始排序過程。第 8 位置的“退回狀態”用於指示這種重置。

“比較”項目可以指向兩個不同的內建函式。一個呼叫使用者提供的比較函式，另一個則實現預設比較，該比較會呼叫 `toString` 來處理兩個參數，然後進行字典序比較。

其餘的欄位（除了快速路徑 ID）都是 Timsort 特有的。運行堆疊（上文描述）初始化大小為 85，能夠排序長度達 2<sup>64</sup> 的陣列。暫存陣列用於合併運行。其大小會根據需要增長，但從不超過輸入長度的 `n/2`。

### 性能權衡

將排序功能從自託管的 JavaScript 移至 Torque 帶來了一些性能上的權衡。由於 `Array#sort` 是用 Torque 編寫的，這意味著它現在是一段靜態編譯的代碼，這讓我們仍然能為某些 [`ElementsKind`s](/blog/elements-kinds) 建立快速通道，但它永遠不會像一個高度優化的 TurboFan 版本那樣快，因為後者可以利用類型反饋。另一方面，當代碼不夠熱以至於不值得進行即時編譯（JIT）或調用點是多態式（megaphoric）時，我們就只能使用解釋器或慢速/通用版本。此外，對自託管 JavaScript 版本進行解析、編譯和可能的優化也是 Torque 實現版本所不需要的額外負擔。

雖然 Torque 方法無法達到排序的相同峰值性能，但它確實避免了性能的懸崖效應。結果是排序性能比以前更加可預測。請記住，Torque 還處於變化中，除了以 CSA 為目標，它未來還可能以 TurboFan 為目標，允許對用 Torque 編寫的代碼進行即時編譯（JIT）。

### 微基準測試

在我們開始實現 `Array#sort` 之前，我們添加了許多不同的微基準測試，以更好地了解重新實現可能會產生的影響。第一張圖顯示了使用者提供比較函數來排序各種 ElementsKind 的“常規”用例。

請記住，在這些情況下，即時編譯器（JIT）可以做很多工作，因為排序幾乎是我們做的全部操作。這也允許優化編譯器在 JavaScript 版本中內聯比較函數，而在使用 Torque 的情況下，我們則有從內建到 JavaScript 的調用開銷。然而，我們在幾乎所有情況下的表現仍然更好。

![](/_img/array-sort/micro-bench-basic.svg)

接下來的圖表顯示了當處理已經完全排序的數組，或者有已經按照某種方式排序的子序列時，Timsort 所帶來的影響。該圖將快速排序（Quicksort）作為基線，顯示了 Timsort 的加速效果（在“DownDown”案例中，其加速高達 17 倍，該數組由兩個反向排序的序列組成）。如圖所示，除了隨機數據的案例外，Timsort 在所有其他場合的表現均更優，即使我們正在排序 `PACKED_SMI_ELEMENTS`，其在上面的微基準測試中快速排序曾超過 Timsort。

![](/_img/array-sort/micro-bench-presorted.svg)

### 網頁工具基準測試

[Web Tooling Benchmark](https://github.com/v8/web-tooling-benchmark) 是一組通常由 Web 開發人員使用的工具（如 Babel 和 TypeScript）的工作負載集合。該圖表將 JavaScript 快速排序作為基線，並比較 Timsort 與之的加速效果。在幾乎所有的基準測試中，我們保留了相同的性能，只有 chai 例外。

![](/_img/array-sort/web-tooling-benchmark.svg)

chai 基準測試在單個比較函數（字符串距離計算）內花費了 *三分之一* 的時間。該基準測試是 chai 自身的測試套件。由於數據的關係，Timsort 在這種情況下需要更多比較，這對總運行時有更大影響，因為這麼大一部分時間都花在該特定比較函數中。

### 記憶體影響

我們在瀏覽約 50 個網站（包括移動端和桌面端）時分析了 V8 的堆快照，發現沒有任何記憶體性能的回退或改進。一方面，這讓人感到驚訝：從快速排序切換到 Timsort 引入了合併運行所需的臨時數組，其大小可能遠大於用於採樣的臨時數組。另一方面，這些臨時數組的壽命非常短（僅在 `sort` 調用期間），並且可以在 V8 的新空間中快速分配和釋放。

## 結論

總而言之，我們對用 Torque 實現的 Timsort 算法屬性和可預測的性能行為感到更加滿意。Timsort 從 V8 v7.0 和 Chrome 70 開始可用。祝您排序愉快！
