---
title: "為 V8 加速：使用可變堆數字"
author: "[Victor Gomes](https://twitter.com/VictorBFG)，位移者"
avatars:
  - victor-gomes
date: 2025-02-25
tags:
  - JavaScript
  - 基準測試
  - 內部機制
description: "向腳本上下文添加可變堆數字"
tweet: ""
---

在 V8，我們不斷努力提升 JavaScript 的性能。作為這一努力的一部分，我們最近重新審視了 [JetStream2](https://browserbench.org/JetStream2.1/) 基準測試套件，以消除性能瓶頸。本篇文章詳細介紹了一項具體的優化，它使 `async-fs` 基準測試達到了顯著的 `2.5倍` 性能提升，並對整體得分帶來了可觀的增益。該優化受基準測試的啟發，但類似模式也出現在[真實世界代碼](https://github.com/WebAssembly/binaryen/blob/3339c1f38da5b68ce8bf410773fe4b5eee451ab8/scripts/fuzz_shell.js#L248)中。

<!--truncate-->
# 目標 `async-fs` 和一個特殊的 `Math.random`

`async-fs` 基準測試，顧名思義，是一個 JavaScript 文件系統實現，專注於異步操作。然而，存在一個令人驚訝的性能瓶頸：`Math.random` 的實現。它使用了一種定制的、確定性的 `Math.random` 實現，以在多次運行中獲得一致的結果。實現如下：

```js
let seed;
Math.random = (function() {
  return function () {
    seed = ((seed + 0x7ed55d16) + (seed << 12))  & 0xffffffff;
    seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
    seed = ((seed + 0x165667b1) + (seed << 5))   & 0xffffffff;
    seed = ((seed + 0xd3a2646c) ^ (seed << 9))   & 0xffffffff;
    seed = ((seed + 0xfd7046c5) + (seed << 3))   & 0xffffffff;
    seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;
    return (seed & 0xfffffff) / 0x10000000;
  };
})();
```

這裡的關鍵變數是 `seed`。它在每次調用 `Math.random` 時都會更新，生成偽隨機序列。值得注意的是，這裡的 `seed` 存儲在一個 `ScriptContext` 中。

`ScriptContext` 充當某個腳本內可訪問值的存儲位置。在內部，這個上下文被表示為一個由 V8 的標記值組成的數組。在默認的 V8 配置（針對 64 位系統）下，每個標記值佔 32 位。每個值的最低有效位用作標籤。`0` 表示 31 位的小整數 (`SMI`)。實際的整數值以位左移一位的方式直接存儲。`1` 表示指向堆對象的[壓縮指針](https://v8.dev/blog/pointer-compression)，壓縮指針值加上 1。

![`ScriptContext` 布局：藍色插槽是指向上下文元數據和全局對象 (`NativeContext`) 的指針。黃色插槽表示未標記的雙精度浮點值。](/_img/mutable-heap-number/script-context.svg)

這種標記區分了數字的存儲方式。`SMI` 直接存儲在 `ScriptContext` 中。較大的數字或帶有小數部分的數字則作為不可變的 `HeapNumber` 對象間接存儲在堆上（64 位雙精度數字），而 `ScriptContext` 則保存它們的壓縮指針。此方法有效地處理了各種數值類型，同時對常見的 `SMI` 情況進行了優化。

# 性能瓶頸

對 `Math.random` 進行剖析顯示了兩個主要的性能問題：

- **`HeapNumber` 分配**：腳本上下文中用於 `seed` 變量的插槽指向標準的不可變 `HeapNumber`。每次 `Math.random` 函數更新 `seed` 時，都需要在堆上分配一個新的 `HeapNumber` 對象，這導致顯著的分配壓力以及垃圾回收壓力。

- **浮點運算**：儘管 `Math.random` 中的計算基本上是整數操作（使用位運算和加法），但編譯器無法充分利用這一點。由於 `seed` 被存儲為通用的 `HeapNumber`，生成的代碼使用較慢的浮點指令。編譯器無法證明 `seed` 始終保存的是一個可表示為整數的值。儘管編譯器可能會對 32 位整數範圍進行推測，但 V8 主要關注 `SMI`。即使是 32 位整數推測，從 64 位浮點到 32 位整數的潛在代價高昂的轉換，以及無損檢查，仍然是必須的。

# 解決方案

為了解決這些問題，我們實施了兩部分的優化：

- **欄位型別追蹤 / 可變動堆數值欄位:** 我們擴展了 [腳本上下文的常數值追蹤](https://issues.chromium.org/u/2/issues/42203515)（已初始化但從未修改的 let 變數）以包含型別資訊。我們追蹤該欄位的值是否為常數、一個 `SMI`、一個 `HeapNumber` 或一般的標記值。我們還在腳本上下文內引入了可變動堆數值欄位的概念，類似於 `JSObjects` 的 [可變動堆數值字段](https://v8.dev/blog/react-cliff#smi-heapnumber-mutableheapnumber)。欄位並不是指向不可變的 `HeapNumber`，而是腳本上下文擁有 `HeapNumber`，並且不能洩漏其地址。這消除了在優化代碼中每次更新都要分配新的 `HeapNumber` 的需求。擁有的 `HeapNumber` 本身會進行就地修改。

- **可變動堆的 `Int32`:** 我們增強了腳本上下文欄位型別以追蹤數值是否落在 `Int32` 範圍內。如果是，那麼可變的 `HeapNumber` 將以原始的 `Int32` 型式存儲值。如果需要過渡到 `double`，那麼額外的優勢是不用重新分配 `HeapNumber`。例如在 `Math.random` 的情況下，編譯器現在可以觀察到 `seed` 一直通過整數操作進行更新並將欄位標記為包含可變的 `Int32`。

![欄位型別狀態機器。綠色箭頭表示通過存儲 `SMI` 值觸發的轉換。藍色箭頭表示通過存儲 `Int32` 值的轉換，紅色箭頭表示存儲雙精度浮點值的轉換。`Other` 狀態充當終點狀態，阻止進一步的轉換。](/_img/mutable-heap-number/transitions.svg)

需要注意的是，這些優化引入了上下文欄位存儲值型別的代碼依賴性。JIT 編譯器生成的優化代碼依賴於欄位包含特定型別（這裡是 `Int32`）。如果任何代碼寫入一個改變型別的值到 `seed` 欄位（例如寫入一個浮點數或字符串），優化代碼將需要反優化。這種反優化是為了確保正確性。因此，欄位中存儲型別的穩定性對於保持最佳性能至關重要。在 `Math.random` 的情況下，演算法中的位操作確保 seed 變數始終保持 `Int32` 值。

# 結果

這些改進顯著加速了特殊的 `Math.random` 函數：

- **無分配 / 快速就地更新:** `seed` 值是直接在其腳本上下文中的可變欄位內更新的。`Math.random` 執行期間不分配新的物件。

- **整數操作:** 編譯器掌握欄位包含 `Int32` 的資訊，可以生成高效的整數指令（移位、加法等）。這避免了浮點運算的開銷。

![`async-fs` 基準測試結果於 Mac M1 上。分數越高越好。](/_img/mutable-heap-number/result.png)

這些優化的綜合效果是在 `async-fs` 基準測試上一個顯著的 `~2.5x` 加速。反過來，這也促進了整體 JetStream2 分數的 `~1.6%` 提升。這展示了看似簡單的代碼如何創造出意想不到的性能瓶頸，以及小型的、針對特定的優化如何對不僅僅是基準測試產生巨大影響。

