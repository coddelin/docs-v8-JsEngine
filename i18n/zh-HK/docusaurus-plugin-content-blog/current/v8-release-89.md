---
title: 'V8 版本 v8.9'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), 等待通話中'
avatars:
 - 'ingvar-stepanyan'
date: 2021-02-04
tags:
 - 發佈
description: 'V8 版本 v8.9 為參數數量不匹配的函數調用帶來了性能提升。'
tweet: '1357358418902802434'
---
每六週，我們會根據 [發佈流程](https://v8.dev/docs/release-process) 創建一個新的 V8 分支。每一個版本都是在 Chrome Beta 里程碑前從 V8 的 Git 主分支創建的。今天我們很高興地宣布我們最新的分支 [V8 版本 8.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.9)，它將在幾週內隨 Chrome 89 穩定版本一起發佈，目前處於 Beta 階段。V8 v8.9 包含了各種開發者關注的有趣內容。這篇文章將預覽一些亮點，以期待正式發佈。

<!--truncate-->
## JavaScript

### 頂層 `await`

[頂層 `await`](https://v8.dev/features/top-level-await) 已在 V8 主要嵌入者 [Blink 渲染引擎](https://www.chromium.org/blink) 89 中可用。

在獨立的 V8 中，頂層 `await` 仍需通過 `--harmony-top-level-await` 標誌啟用。

請參閱 [我們的解釋](https://v8.dev/features/top-level-await) 獲取更多詳情。

## 性能

### 改進參數數量不匹配的函數調用速度

JavaScript 允許以與函數參數數量不同的方式調用函數，這意味著可以傳遞比定義的形式參數數量更少或更多的參數。前者稱為欠應用，後者稱為過應用。

在欠應用的情況下，剩餘的參數會被分配給 `undefined` 值。在過應用的情況下，剩餘的參數可以通過使用剩餘參數和 `Function.prototype.arguments` 屬性來訪問，或者它們僅僅是多餘的會被忽略。當前許多 Web 和 Node.js 框架使用這個 JS 特性來接受可選參數並創建更靈活的 API。

直到最近，V8 通過參數適配器框架處理參數數量不匹配的情況。不幸的是，參數適配會有性能開銷，而這在現代前端和中間件框架中經常需要。我們發現，通過巧妙的設計（例如反轉堆棧中參數的順序），我們可以消除這個額外的框架，簡化 V8 的代碼庫，並幾乎完全消除性能開銷。

![移除參數適配器框架後的性能影響，通過微基準測試測量。](/_img/v8-release-89/perf.svg)

該圖顯示，在 [無 JIT 模式](https://v8.dev/blog/jitless)（Ignition）下運行時，已經沒有額外開銷，性能提升達到 11.2%。使用 TurboFan 時，速度提升可達到 40%。與無數量不匹配情況相比的開銷是由於 [函數尾部](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/backend/x64/code-generator-x64.cc;l=4905;drc=5056f555010448570f7722708aafa4e55e1ad052) 的一個小優化所致。詳情請參閱 [設計文檔](https://docs.google.com/document/d/15SQV4xOhD3K0omGJKM-Nn8QEaskH7Ir1VYJb9_5SjuM/edit)。

如果您想了解這些改進背後的更多細節，請查看 [專門的博客文章](https://v8.dev/blog/adaptor-frame)。

## V8 API

請使用 `git log branch-heads/8.8..branch-heads/8.9 include/v8.h` 獲取 API 變更的列表。

擁有 V8 活躍檢出版本的開發者可以使用 `git checkout -b 8.9 -t branch-heads/8.9` 嘗試 V8 v8.9 新功能。或者可以 [訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，並很快親自嘗試這些新功能。
