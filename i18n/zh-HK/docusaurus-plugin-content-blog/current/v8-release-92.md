---
title: 'V8 發行版本 v9.2'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))'
avatars:
 - 'ingvar-stepanyan'
date: 2021-07-16
tags:
 - release
description: 'V8 發行版本 v9.2 帶來了用于相對索引的 `at` 方法以及指針壓縮的改進。'
tweet: ''
---
每六週，我們會根據我們的[發行流程](https://v8.dev/docs/release-process)創建 V8 的新分支。每個版本都直接從 V8 的 Git 主分支建立，恰好在 Chrome Beta 里程碑之前。今天，我們很高興宣布最新的分支，[V8 版本 9.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.2)，該版本目前處於 beta 階段，並將與 Chrome 92 穩定版在幾週內一起發行。V8 v9.2 涵蓋了各種面向開發者的功能。這篇文章提供了即將發行的一些亮點預覽。

<!--truncate-->
## JavaScript

### `at` 方法

新的 `at` 方法現在可以用于 Arrays、TypedArrays 和 Strings。當接收到負值時，它會從可索引的末尾開始進行相對索引。當接收到正值時，它的行為與屬性訪問完全相同。例如，`[1,2,3].at(-1)` 的值是 `3`。更多信息請參見[我們的說明文檔](https://v8.dev/features/at-method)。

## 共享指針壓縮籠子

V8 支援[指針壓縮](https://v8.dev/blog/pointer-compression)，包括 x64 和 arm64 在內的 64 位平台。這是通過將一個 64 位指針拆分為兩半來實現的。上層的 32 位可以視為基址，而下層的 32 位可以視為這個基址的索引。

```
            |----- 32 bits -----|----- 32 bits -----|
Pointer:    |________base_______|_______index_______|
```

目前，Isolate 在 GC 堆內進行的所有分配都位於 4GB 虛擬記憶體“籠子”內，這確保所有指針都具有相同的上層 32 位基址。在基址保持不變的情況下，可以僅使用 32 位索引傳遞 64 位指針，因為完整指針可以被重建。

在 v9.2 中，默認設置已更改為同一個進程中的所有 Isolate 共用 4GB 虛擬記憶體籠子。這是為了嘗試在 JS 中原型化實驗性的共享記憶體功能。由於每個工作線程都有自己的 Isolate 並且因此擁有自己的 4GB 虛擬記憶體籠子，指針無法在具有單獨籠子的 Isolate 之間傳遞，因為它們不共享相同的基址。此更改還具有減少啟動工作線程時虛擬記憶體壓力的額外好處。

此更改的權衡是，跨進程中所有線程的總 V8 堆大小限制為最大 4GB。此限制可能對每個進程生成多個線程的服務器工作負載不利，因為這樣會比以前更快地耗盡虛擬記憶體。嵌入者可以使用 GN 參數 `v8_enable_pointer_compression_shared_cage = false` 關閉指針壓縮籠子的共享。

## V8 API

請使用 `git log branch-heads/9.1..branch-heads/9.2 include/v8.h` 獲取 API 更改的清單。

擁有有效 V8 檢出副本的開發者可以使用 `git checkout -b 9.2 -t branch-heads/9.2` 試用 V8 v9.2 的新功能。或者，你可以[訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，並即將自行嘗試這些新功能。
