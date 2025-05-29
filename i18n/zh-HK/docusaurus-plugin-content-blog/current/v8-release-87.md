---
title: 'V8 發佈 v8.7'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), 一位 V8 旗手'
avatars:
 - 'ingvar-stepanyan'
date: 2020-10-23
tags:
 - release
description: 'V8 發佈 v8.7，帶來了新的原生調用 API、Atomics.waitAsync、錯誤修復和性能改進。'
tweet: '1319654229863182338'
---
每隔六週，我們會根據[發行流程](https://v8.dev/docs/release-process)創建一個新的 V8 分支。每個版本都會在 Chrome Beta 里程碑之前立即從 V8 的 Git master 分支出來。而今天我們很高興地宣布我們的最新分支 [V8 版本 8.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.7)，它將在 Beta 測試階段，直至幾週後與 Chrome 87 Stable 同步發布。V8 v8.7 滿載了各種面向開發者的精彩內容。本篇文章將提前預覽一些亮點，為發佈做好準備。

<!--truncate-->
## JavaScript

### 不安全的快速 JS 調用

V8 v8.7 帶來了增強的 API，用於從 JavaScript 執行原生調用。

此功能仍處於實驗階段，可以通過 V8 中的 `--turbo-fast-api-calls` 標誌或 Chrome 中的對應標誌 `--enable-unsafe-fast-js-calls` 啟用。它旨在提高某些原生圖形 API 在 Chrome 中的性能，但其他嵌入器也可以使用它。它為開發人員創建 `v8::FunctionTemplate` 實例提供了新手段，這在這個[頭文件](https://source.chromium.org/chromium/chromium/src/+/master:v8/include/v8-fast-api-calls.h)中有詳細說明。使用原始 API 創建的函數將不受影響。

有關更多信息以及可用功能列表，請參閱[這個說明文檔](https://docs.google.com/document/d/1nK6oW11arlRb7AA76lJqrBIygqjgdc92aXUPYecc9dU/edit?usp=sharing)。

### `Atomics.waitAsync`

[`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md) 現已在 V8 v8.7 中可用。

[`Atomics.wait`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/wait) 和 [`Atomics.notify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/notify) 是用於實現互斥鎖及其他同步手段的低級同步原語。然而，由於 `Atomics.wait` 是阻塞式的，因此無法在主線程上調用（嘗試這樣做會引發 TypeError）。非阻塞版本 [`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md) 也可以在主線程上使用。

查看[我們關於 `Atomics` API 的說明文檔](https://v8.dev/features/atomics)以了解更多詳情。

## V8 API

請使用 `git log branch-heads/8.6..branch-heads/8.7 include/v8.h` 查看 API 更改的列表。

擁有活躍 V8 檢出版本的開發者可以使用 `git checkout -b 8.7 -t branch-heads/8.7` 來嘗試 V8 v8.7 的新功能。或者，您可以[訂閱 Chrome 的 Beta 渠道](https://www.google.com/chrome/browser/beta.html)，並很快親自嘗試這些新功能。
