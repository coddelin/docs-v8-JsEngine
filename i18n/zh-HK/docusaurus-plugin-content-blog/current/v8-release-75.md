---
title: 'V8 發行 v7.5'
author: 'Dan Elphick，過時功能的剋星'
avatars:
  - 'dan-elphick'
date: 2019-05-16 15:00:00
tags:
  - release
description: 'V8 v7.5 提供了 WebAssembly 編譯工件的隱式緩存、大量內存操作、JavaScript 的數字分隔符等眾多新功能！'
tweet: '1129073370623086593'
---
每隔六周，我們會根據 [發行過程](/docs/release-process) 創建 V8 的新分支。每個版本都是在 Chrome Beta 里程碑之前，直接從 V8 的 Git 主分支分支出來。今天我們很高興地宣布我們最新的分支，[V8 版本 7.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.5)，該版本將在 Chrome 75 穩定版發行前的幾周內進入 beta 階段。V8 v7.5 包含了各種面向開發者的好功能。本篇文章提前向大家展示一些亮點內容。

<!--truncate-->
## WebAssembly

### 隱式緩存

我們計劃在 Chrome 75 中推出 WebAssembly 編譯工件的隱式緩存功能。這意味著用戶在第二次訪問同一頁面時，無需重新編譯已經看到的 WebAssembly 模塊，而是直接從緩存中加載。它的工作原理類似於 [Chromium 的 JavaScript 代碼緩存](/blog/code-caching-for-devs)。

如果您希望在自己的 V8 嵌入環境中使用類似功能，可以參考 Chromium 的實現。

### 大量內存操作

[大量內存提案](https://github.com/webassembly/bulk-memory-operations) 為 WebAssembly 增加了一些新的指令，用於更新大範圍的內存或表。

`memory.copy` 將數據從一個區域複制到另一個區域，即使這些區域重疊（類似於 C 的 `memmove`）。`memory.fill` 用給定的字節填充一個區域（類似於 C 的 `memset`）。與 `memory.copy` 類似，`table.copy` 則是將表的一個區域複制到另一個區域，即使這些區域重疊。

```wasm
;; 從源地址 1000 複制 500 字節到目標地址 0。
(memory.copy (i32.const 0) (i32.const 1000) (i32.const 500))

;; 從地址 100 開始用值 `123` 填充 1000 字節。
(memory.fill (i32.const 100) (i32.const 123) (i32.const 1000))

;; 從源地址 5 複制 10 個表元素到目標地址 15。
(table.copy (i32.const 15) (i32.const 5) (i32.const 10))
```

該提案還提供了一種方法，可以將固定區域複制到線性內存或表中。為此，我們首先需要定義一個“被動”段。與“主動”段不同，這些段不會在模塊實例化期間初始化，而是可以通過 `memory.init` 和 `table.init` 指令複制到內存或表區域。

```wasm
;; 定義一個被動數據段。
(data $hello passive "Hello WebAssembly")

;; 將 "Hello" 複制到內存地址 10。
(memory.init (i32.const 10) (i32.const 0) (i32.const 5))

;; 將 "WebAssembly" 複制到內存地址 1000。
(memory.init (i32.const 1000) (i32.const 6) (i32.const 11))
```

## JavaScript 中的數字分隔符

較大的數字文字對人眼來說很難快速解析，尤其是在出現大量重複數字時更是如此：

```js
1000000000000
   1019436871.42
```

為了提高可讀性，[一項新的 JavaScript 語言功能](/features/numeric-separators) 允許在數字文字中使用下劃線作為分隔符。因此，上述內容現在可以改寫為按千位分組的形式，例如：

```js
1_000_000_000_000
    1_019_436_871.42
```

現在可以更清楚地看出，第一個數字是萬億，第二個數字大約是 10 億。

更多示例以及關於數字分隔符的額外信息，請參閱 [我們的說明文檔](/features/numeric-separators)。

## 性能優化

### 從網絡直接流式加載腳本

從 Chrome 75 開始，V8 可以直接從網絡流式加載腳本到流式解析器，而無需等待 Chrome 主線程。

雖然之前的 Chrome 版本已經具有流式解析和編譯功能，但由於歷史原因，網絡中的腳本源數據總是需要先通過 Chrome 主線程，再轉發給流式解析任務。這意味著，在腳本源數據已經從網絡抵達的情況下，流式解析器常常需要等待，因為主線程可能正忙於處理其他事情（例如 HTML 解析、佈局或其他 JavaScript 的執行），導致數據尚未被轉發。

![在 Chrome 74 或更早版本中，背景解析任務因主線程活動而停滯。](/_img/v8-release-75/before.jpg)

在 Chrome 75 中，我們將網絡“數據管道”直接連接到 V8，使我們能在流式解析期間直接讀取網絡數據，跳過對主線程的依賴。

![在 Chrome 75+ 中，背景解析任務不再因主線程活動阻塞。](/_img/v8-release-75/after.jpg)

這使我們能夠更早完成串流編譯，改善使用串流編譯的頁面的加載時間，同時減少並行（但停滯）的串流解析任務的數量，從而減少記憶體消耗。

## V8 API

請使用 `git log branch-heads/7.4..branch-heads/7.5 include/v8.h` 獲取 API 更改的清單。

擁有[活躍 V8 檢出](/docs/source-code#using-git)的開發者可以使用 `git checkout -b 7.5 -t branch-heads/7.5` 試驗 V8 v7.5 的新功能。或者，您可以[訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，儘快體驗新的功能。
