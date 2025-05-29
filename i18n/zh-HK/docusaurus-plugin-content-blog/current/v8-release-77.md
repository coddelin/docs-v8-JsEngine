---
title: &apos;V8 發佈 v7.7&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias)), 發佈說明的懶惰撰寫者&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-08-13 16:45:00
tags:
  - release
description: &apos;V8 v7.7 提供懶惰式回饋分配、更快速的 WebAssembly 背景編譯、堆疊追蹤改進以及新的 Intl.NumberFormat 功能。&apos;
tweet: &apos;1161287541611323397&apos;
---
每六週，我們按照[發布流程](/docs/release-process)建立 V8 的新分支。每個版本都在 Chrome Beta 里程碑之前，直接從 V8 的 Git 主分支分支而來。今天我們很高興宣布最新的分支 [V8 版本 7.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.7)，該分支處於測試版階段，幾週後會配合穩定版 Chrome 77 的釋出而正式發布。V8 v7.7 充滿了各種面向開發者的亮點。本文章為即將推出的版本提供一些預覽。

<!--truncate-->
## 性能 (體積與速度)

### 懶惰式回饋分配

為了優化 JavaScript，V8 收集了各種操作（比如 `+` 或 `o.foo`）傳遞的操作數類型的回饋。這些回饋被用於針對這些特定類型最佳化操作。這些信息存儲在“回饋向量”中，這些信息對於更快的執行時間非常重要，但我們也需要付出必要的記憶體使用成本來分配這些回饋向量。

為了減少 V8 的記憶體使用，我們現在僅在函式執行了一定量的字節碼後懶惰地分配回饋向量。這避免了為短期存在的函式分配回饋向量，因為這些函式不需要收集的回饋。我們的實驗室結果顯示，懶惰地分配回饋向量可以節省大約 2–8% 的 V8 堆大小。

![](/_img/v8-release-77/lazy-feedback-allocation.svg)

我們的實地實驗顯示，這可以減少 Chrome 用戶的 V8 堆大小 1–2% 在桌面平台和 5–6% 在移動平台。桌面平台沒有性能回歸，而在記憶體有限的低端手機上，我們實際上看到了性能的提升。請期待更多詳盡的記憶體節省工作博文。

### 可擴展的 WebAssembly 背景編譯

在過去的版本中，我們為 WebAssembly 背景編譯的可擴展性進行了工作。您的電腦核心越多，您就能從此工作中獲益更多。以下圖表是在一台 24 核 Xeon 機器上創建的，編譯 [Epic ZenGarden demonstration](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html)。根據所用線程數量，編譯時間比 V8 v7.4 還要短，少於一半。

![](/_img/v8-release-77/liftoff-compilation-speedup.svg)

![](/_img/v8-release-77/turbofan-compilation-speedup.svg)

### 堆疊追蹤改進

幾乎所有由 V8 拋出的錯誤在創建時都捕獲了一個堆疊追蹤。此堆疊追蹤可以通過 JavaScript 的非標準 `error.stack` 屬性訪問。第一次通過 `error.stack` 獲得堆疊追踪時，V8 將基礎的結構化堆疊追踪序列化為字符串。此序列化的堆疊追踪會被保存以加速未來的 `error.stack` 訪問。

在最近的一些版本中，我們完成了一些[堆疊追踪邏輯的內部重新整理](https://docs.google.com/document/d/1WIpwLgkIyeHqZBc9D3zDtWr7PL-m_cH6mfjvmoC6kSs/edit)（[追蹤 bug](https://bugs.chromium.org/p/v8/issues/detail?id=8742)），簡化了代碼並將堆疊追踪序列化性能提升了最多 30%。

## JavaScript 語言功能

[`Intl.NumberFormat` API](/features/intl-numberformat) 用於本地化的數字格式化，在此版本中獲得了新功能！現在支持簡略表示、科學表示、工程表示、符號展示以及測量單位。

```js
const formatter = new Intl.NumberFormat(&apos;en&apos;, {
  style: &apos;unit&apos;,
  unit: &apos;meter-per-second&apos;,
});
formatter.format(299792458);
// → &apos;299,792,458 m/s&apos;
```

詳情請參閱[我們的功能解釋](/features/intl-numberformat)。

## V8 API

請使用 `git log branch-heads/7.6..branch-heads/7.7 include/v8.h` 獲取 API 更改的列表。

擁有[活動的 V8 檢出] (/docs/source-code#using-git) 的開發者可以使用 `git checkout -b 7.7 -t branch-heads/7.7` 試驗 V8 v7.7 的新功能。或可以[訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，並自己嘗試這些新功能。
