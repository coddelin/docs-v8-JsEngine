---
title: "V8 發行版本 v6.8"
author: "V8 團隊"
date: "2018-06-21 13:33:37"
tags: 
  - 發佈
description: "V8 v6.8 提供了降低記憶體消耗以及多項性能改進的功能。"
tweet: "1009753739060826112"
---
每六周，我們會根據 [發行流程](/docs/release-process) 創建 V8 的新分支。每個版本都是從 V8 的 Git 主分支在 Chrome Beta 哨站開啟之前分支出來的。今天我們很高興宣布我們最新的分支，[V8 版本 6.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.8)，這個版本目前處於 Beta 階段，並將在幾周內配合 Chrome 68 穩定版的發佈一起正式推出。V8 v6.8 包含各種面向開發者的好功能。本文將為大家提前介紹一些亮點。

<!--truncate-->
## 記憶體

JavaScript 函數會不必要地保留外部函數及其元資料（稱為 `SharedFunctionInfo` 或 `SFI`）。特別是在依賴短暫生命期 IIFEs 的函數密集代碼中，這可能導致不必要的記憶體洩漏。在此改動之前，活動的 `Context`（即函數啟動在堆上的表示）會保持創建該上下文的函數的 `SFI` 存活狀態：

![](/_img/v8-release-68/context-jsfunction-before.svg)

通過讓 `Context` 指向包含必要調試信息的精簡版 `ScopeInfo` 對象，我們可以消除對 `SFI` 的依賴。

![](/_img/v8-release-68/context-jsfunction-after.svg)

我們已經觀察到，在移動設備上的前 10 名網站集上，V8 記憶體改進了 3%。

同時，我們也減少了 `SFI` 本身的記憶體消耗，移除了不必要的字段或在可能的情況下進行壓縮，使其大小減少了約 25%，未來版本中還將進一步減少。我們觀察到即使從上下文中分離之後，`SFI` 仍佔了典型網站 V8 記憶體的 2–6%，因此您應該能在擁有大量函數的代碼中看到記憶體改進。

## 性能

### 陣列解構改進

優化編譯器未生成理想的陣列解構代碼。例如，使用 `[a, b] = [b, a]` 的變數交換比 `const tmp = a; a = b; b = tmp` 慢一倍。通過解除封鎖逃逸分析以消除所有臨時分配，使用臨時陣列的陣列解構現在與一系列賦值一樣快。

### `Object.assign` 改進

到目前為止，`Object.assign` 的快速路徑是用 C++ 編寫的。這意味著每次 `Object.assign` 調用都需要跨越 JavaScript 到 C++ 的邊界。一種顯而易見的性能提升方法是在 JavaScript 層面實現其快速路徑。我們有兩個選擇：要麼將其實現為本地 JS 內建（在此情況下會帶來一些不必要的開銷），或者使用 [CodeStubAssembler 技術](/blog/csa)（提供更多靈活性）實現。我們選擇了後者。新實現的 `Object.assign` 將 [Speedometer2/React-Redux 的分數提升約 15%，總 Speedometer 2 分數提高 1.5%](https://chromeperf.appspot.com/report?sid=d9ea9a2ae7cd141263fde07ea90da835cf28f5c87f17b53ba801d4ac30979558&start_rev=550155&end_rev=552590)。

### `TypedArray.prototype.sort` 改進

`TypedArray.prototype.sort` 有兩條路徑：在用戶未提供比較函數時使用的快速路徑，以及其他情況下使用的慢速路徑。直到現在為止，慢速路徑一直復用 `Array.prototype.sort` 的實現，而該實現做了比排序 `TypedArray` 所需的更多事情。V8 v6.8 替換掉了慢速路徑，改由 [CodeStubAssembler](/blog/csa) 中的實現。（不直接使用 CodeStubAssembler，而是基於它的特定語域的語言）。

在沒有比較函數的情況下排序 `TypedArray` 的性能保持不變，而在使用比較函數時排序速度提升了最多 2.5 倍。

![](/_img/v8-release-68/typedarray-sort.svg)

## WebAssembly

在 V8 v6.8 中，您可以開始在 Linux x64 平台上使用 [基於陷阱的邊界檢查](https://docs.google.com/document/d/17y4kxuHFrVxAiuCP_FFtFA2HP5sNPsCD10KEx17Hz6M/edit)。此記憶體管理優化大幅提升了 WebAssembly 的執行速度。它已經在 Chrome 68 中被使用，未來將逐步支持更多平台。

## V8 API

請使用 `git log branch-heads/6.7..branch-heads/6.8 include/v8.h` 獲取 API 列表的更改。

擁有 [活躍 V8 源代碼結帳](/docs/source-code#using-git) 的開發者可以使用 `git checkout -b 6.8 -t branch-heads/6.8` 運行 V8 v6.8 的新功能進行試驗。或者您也可以 [訂閱 Chrome 的 Beta 渠道](https://www.google.com/chrome/browser/beta.html)，並很快自己試用這些新功能。
