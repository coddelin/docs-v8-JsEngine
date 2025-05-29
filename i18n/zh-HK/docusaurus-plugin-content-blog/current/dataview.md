---
title: '提升 V8 中 `DataView` 性能'
author: 'Théotime Grohens, <i lang="fr">Data-Vue 的學者</i>, 以及 Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)), 專業性能伙伴'
avatars:
  - 'benedikt-meurer'
date: 2018-09-18 11:20:37
tags:
  - ECMAScript
  - 基準測試
description: 'V8 v6.9 縮小了 `DataView` 與相應 `TypedArray` 代碼之間的性能差距，從而使 `DataView` 成為性能要求高的實際應用程式中的可用選擇。'
tweet: '1041981091727466496'
---
[`DataView`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView) 是 JavaScript 中進行低層記憶體訪問的兩種途徑之一，另一種是 [`TypedArray`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray)。直到現在，`DataView` 在 V8 中的優化程度遠低於 `TypedArray`，導致在圖形密集型工作負載或編解碼二進制數據等任務中性能偏低。這些原因主要是歷史選擇，例如 [asm.js](http://asmjs.org/) 選擇了 `TypedArray` 而非 `DataView`，因此引擎專注於提升 `TypedArray` 的性能。

<!--truncate-->
由於性能損失，像 Google Maps 團隊的 JavaScript 開發者決定避免使用 `DataView`，而轉而使用 `TypedArray`，儘管這會增加代碼複雜性。本文介紹了我們如何在 [V8 v6.9](/blog/v8-release-69) 中提升 `DataView` 性能以匹配甚至超越相應的 `TypedArray` 代碼，從而使 `DataView` 成為性能要求高的實際應用程式中的可用選擇。

## 背景

自 ES2015 引入以來，JavaScript 支援在稱為 [`ArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer) 的原始二進制緩衝區中讀取和寫入數據。`ArrayBuffer` 無法直接訪問；程序需要使用稱為 *array buffer view* 的物件，該物件可以是 `DataView` 或 `TypedArray`。

`TypedArray` 允許程序將緩衝區作為統一類型的值陣列進行訪問，例如 `Int16Array` 或 `Float32Array`。

```js
const buffer = new ArrayBuffer(32);
const array = new Int16Array(buffer);

for (let i = 0; i < array.length; i++) {
  array[i] = i * i;
}

console.log(array);
// → [0, 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225]
```

另一方面，`DataView` 提供了更精細的數據訪問方式。它使程式員能夠通過為每個數字類型提供專門的 getter 和 setter 方法來選擇從緩衝區讀取和寫入的值類型，從而對序列化數據結構非常有用。

```js
const buffer = new ArrayBuffer(32);
const view = new DataView(buffer);

const person = { age: 42, height: 1.76 };

view.setUint8(0, person.age);
view.setFloat64(1, person.height);

console.log(view.getUint8(0)); // 預期輸出：42
console.log(view.getFloat64(1)); // 預期輸出：1.76
```

此外，`DataView` 還允許選擇數據存儲的字節序，這在從外部來源（如網絡、文件或 GPU）接收數據時非常有用。

```js
const buffer = new ArrayBuffer(32);
const view = new DataView(buffer);

view.setInt32(0, 0x8BADF00D, true); // 小端寫入。
console.log(view.getInt32(0, false)); // 大端讀取。
// 預期輸出：0x0DF0AD8B (233876875)
```

高效的 `DataView` 實現一直是長期的功能需求（請參見 [此 bug 報告](https://bugs.chromium.org/p/chromium/issues/detail?id=225811)，已有超過五年的時間），我們很高興地宣布現在 `DataView` 性能已達到相等水準！

## 舊版運行時實現

直到最近，`DataView` 方法在 V8 中一直實現為內建 C++ 運行時函數。這是非常昂貴的，因為每次調用都需要從 JavaScript 到 C++（然後返回）的高成本轉換。

為了研究此實現帶來的實際性能成本，我們設置了一個性能基準測試，用於比較原生 `DataView` getter 實現與模擬 `DataView` 行為的 JavaScript 包裝器。這個包裝器使用 `Uint8Array` 從底層緩衝區逐字節讀取數據，然後從這些字節計算返回值。以下是用於讀取小端 32 位無符號整數值的函數範例：

```js
function LittleEndian(buffer) { // 模擬小端 DataView 讀取。
  this.uint8View_ = new Uint8Array(buffer);
}

LittleEndian.prototype.getUint32 = function(byteOffset) {
  return this.uint8View_[byteOffset] |
    (this.uint8View_[byteOffset + 1] << 8) |
    (this.uint8View_[byteOffset + 2] << 16) |
    (this.uint8View_[byteOffset + 3] << 24);
};
```

`TypedArray`s 在 V8 中已經被廣泛地優化，因此它們代表了我們希望達到的性能目標。

![原始 `DataView` 性能](/_img/dataview/dataview-original.svg)

我們的基準測試顯示，原生的 `DataView` 讀取性能比基於 `Uint8Array` 的封裝器慢了最多 **4 倍**，無論是大端序還是小端序的讀取。

## 改善基準性能

我們改進 `DataView` 物件性能的第一步，是將實現從 C++ 執行階段移至 [`CodeStubAssembler` (簡稱 CSA)](/blog/csa)。CSA 是一種可移植的組合語言，允許我們直接在 TurboFan 的機器級中間表示 (IR) 中撰寫程式碼，我們使用它來實現 V8 的 JavaScript 標準庫中的經過優化部分。用 CSA 重寫程式碼完全繞過了對 C++ 的調用，同時通過利用 TurboFan 的後端生成高效的機器代碼。

然而，手動撰寫 CSA 程式碼相當繁瑣。CSA 中的控制流表達方式類似於組合語言，使用顯式標籤和 `goto` 指令，使程式碼更難一目了然地閱讀和理解。

為了讓開發者更容易為 V8 的優化 JavaScript 標準庫做出貢獻，以及提高程式碼的可讀性和可維護性，我們開始設計一種名為 V8 *Torque* 的新語言，其會編譯為 CSA。*Torque* 的目標是抽象掉那些使 CSA 程式碼難以撰寫和維護的低層細節，同時保持相同的性能表現。

重寫 `DataView` 程式碼為使用 *Torque*的新程式碼提供了絕佳的機會，並幫助 *Torque* 開發者為語言提供許多反饋。以下是用 *Torque* 撰寫的 `DataView` 的 `getUint32()` 方法程式碼：

```torque
macro LoadDataViewUint32(buffer: JSArrayBuffer, offset: intptr,
                    requested_little_endian: bool,
                    signed: constexpr bool): Number {
  let data_pointer: RawPtr = buffer.backing_store;

  let b0: uint32 = LoadUint8(data_pointer, offset);
  let b1: uint32 = LoadUint8(data_pointer, offset + 1);
  let b2: uint32 = LoadUint8(data_pointer, offset + 2);
  let b3: uint32 = LoadUint8(data_pointer, offset + 3);
  let result: uint32;

  if (requested_little_endian) {
    result = (b3 << 24) | (b2 << 16) | (b1 << 8) | b0;
  } else {
    result = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
  }

  return convert<Number>(result);
}
```

將 `DataView` 方法移至 *Torque* 已經顯示出 **3 倍** 的性能提升，但尚未完全達到基於 `Uint8Array` 的封裝器性能。

![Torque `DataView` 性能](/_img/dataview/dataview-torque.svg)

## 為 TurboFan 優化

當 JavaScript 程式碼變得熱烈使用時，我們使用 TurboFan 優化編譯器來編譯它，以生成比解釋字節碼更高效的機器代碼。

TurboFan 通過將傳入的 JavaScript 程式碼轉換為內部圖形表示 (更精確地說，[一個 “節點之海”](https://darksi.de/d.sea-of-nodes/)) 來工作。它從與 JavaScript 操作和語意相匹配的高階節點開始，並逐步將其細化為越來越低階的節點，直到最終生成機器代碼。

特別是，函數調用，例如調用某個 `DataView` 方法，在內部被表示為一個 `JSCall` 節點，最終在生成的機器代碼中實際執行函數調用。

但是，TurboFan 允許我們檢查 `JSCall` 節點是否實際調用已知函數，例如內建函數，並在 IR 中內嵌此節點。這意味著在編譯時複雜的 `JSCall` 被替換為表示該函數的子圖。這使得 TurboFan 能在後續通過更廣泛的上下文中優化函數內部內容，而不是單獨進行優化，最重要的是能消除昂貴的函數調用。

![初始 TurboFan `DataView` 性能](/_img/dataview/dataview-turbofan-initial.svg)

實現 TurboFan 嵌入最終使我們達到了，甚至超越了基於 `Uint8Array` 的封裝器性能，並比之前的 C++ 實現快 **8 倍**。

## 更進一步的 TurboFan 優化

查看 TurboFan 在內嵌 `DataView` 方法後生成的機器代碼，仍然存在一些改進空間。這些方法的初始實現試圖非常嚴格地遵循標準，並在規範指示出錯時拋出錯誤 (例如，嘗試讀取或寫入超出底層 `ArrayBuffer` 邊界)。

然而，我們在 TurboFan 中撰寫的程式碼旨在針對常見的熱門案例進行最佳化，使速度達到最快，不需要支援每個可能的邊際案例。透過移除所有錯誤的複雜處理，並在需要拋出錯誤時僅僅退回到基線 Torque 實作，我們成功將生成的程式碼大小減少了約 35%，不僅顯著加快了速度，還使 TurboFan 程式碼更加簡單。

基於在 TurboFan 中儘可能專注化的想法，我們還移除了對過大索引或偏移量（超出 Smi 範圍）的支援。這使我們得以移除對不適合 32 位值的偏移量所需的 float64 算術運算的處理，並避免在堆中儲存大型整數。

與初始 TurboFan 實作相比，這使 `DataView` 基準測試分數提高了超過一倍。`DataView` 現在比 `Uint8Array` 包裝器快達 3 倍，比我們原始的 `DataView` 實作快約 **16 倍**！

![最終 TurboFan `DataView` 效能](/_img/dataview/dataview-turbofan-final.svg)

## 影響

在我們自己的基準測試之上，我們也在一些真實使用案例中評估了新實作的效能影響。

`DataView` 通常被用於從 JavaScript 解碼以二進制格式編碼的數據。其中一種二進制格式是 [FBX](https://en.wikipedia.org/wiki/FBX)，一種用於交換 3D 動畫的格式。我們分析了受歡迎的 [three.js](https://threejs.org/) JavaScript 3D 庫的 FBX 讀取器，並測得執行時間減少了 10%（約 80 毫秒）。

我們比較了 `DataView` 與 `TypedArray` 的總體效能。我們發現，新的 `DataView` 實作在以本機端序（Intel 處理器上的小端序）存取對齊數據時，效能幾乎與 `TypedArray` 相同，彌合了大部分效能差距，使 `DataView` 成為 V8 中實際的選擇。

![`DataView` 與 `TypedArray` 高峰效能比較](/_img/dataview/dataview-vs-typedarray.svg)

我們希望您現在能在合適的場景開始使用 `DataView`，而不是依賴 `TypedArray` 模擬器。請將您對 `DataView` 的使用回饋給我們！您可以透過 [我們的錯誤追蹤工具](https://crbug.com/v8/new)、發送郵件至 v8-users@googlegroups.com，或透過 [Twitter 上的 @v8js](https://twitter.com/v8js) 與我們聯繫。
