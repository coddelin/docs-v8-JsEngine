---
title: "V8 發佈 v9.1"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), 測試我的私人品牌"
avatars:
 - "ingvar-stepanyan"
date: 2021-05-04
tags:
 - 發佈
description: "V8 發佈 v9.1 帶來了對私人品牌檢查的支持，預設啟用頂層 await，以及效能改進。"
tweet: "1389613320953532417"
---
每隔六周，我們會按照 [發佈流程](https://v8.dev/docs/release-process) 建立 V8 新的分支。每個版本都是在 Chrome Beta 的里程碑之前，直接從 V8 的 Git 主分支出分支。今天，我們很高興宣佈最新的分支 [V8 版本 9.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.1)，該版本將進入 Beta 階段，直到幾周後與 Chrome 91 穩定版協調發佈。V8 v9.1 包含了各種針對開發者的功能。本篇文章提供了一些亮點的預覽以期待發佈。

<!--truncate-->
## JavaScript

### `FastTemplateCache` 改進

V8 API 向嵌入者暴露了 `Template` 介面，可用於創建新的實例。

創建和配置新物件實例需要幾個步驟，這就是為什麼克隆現有物件通常更快。V8 使用兩級快取策略（小型快速陣列快取和大型緩慢字典快取）根據範本查找新建物件並直接克隆它們。

以前，範本的快取索引是在範本創建時分配，而不是插入快取時分配。這導致快速陣列快取被保留給那些通常根本從未實例化的範本。修復此問題後，在 Speedometer2-FlightJS 基準測試中改善了 4.5%。

### 頂層 `await`

[頂層 `await`](https://v8.dev/features/top-level-await) 在 v9.1 開始已預設啟用，不再需要 `--harmony-top-level-await`。

請注意，對於 [Blink 渲染引擎](https://www.chromium.org/blink)，頂層 `await` 已在版本 89 [預設啟用](https://v8.dev/blog/v8-release-89#top-level-await)。

嵌入者應注意，啟用此功能後，`v8::Module::Evaluate` 將始終返回 `v8::Promise` 物件而不是完成值。如果模組評估成功，`Promise` 將以完成值解決；如果模組評估失敗，則會被拒絕。如果評估的模組不是非同步的（即不包含頂層 `await`）且沒有任何非同步的依賴項，返回的 `Promise` 將要麼被履行，要麼被拒絕。否則返回的 `Promise` 將保持 pending 狀態。

請查看 [我們的解釋](https://v8.dev/features/top-level-await) 以了解更多細節。

### 私人品牌檢查（`#foo in obj`）

私人品牌檢查語法在 v9.1 中已預設啟用，不需要 `--harmony-private-brand-checks`。此功能擴展了 [`in` 運算符](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in)，使其也可以用於私人字段的 `#` 名稱，例如以下範例。

```javascript
class A {
  static test(obj) {
    console.log(#foo in obj);
  }

  #foo = 0;
}

A.test(new A()); // true
A.test({}); // false
```

如果想了解更多細節，請確保查看 [我們的解釋](https://v8.dev/features/private-brand-checks)。

### 短內建函數調用

在此版本中，我們暫時在 64 位桌面機上關閉嵌入內建函數（撤銷 [嵌入內建函數](https://v8.dev/blog/embedded-builtins)）。在這些機器上解除嵌入內建函數帶來的效能提升超過了內存成本。這是由於架構以及微架構的細節。

我們很快會發佈一篇獨立的博客，提供更多細節。

## V8 API

請使用 `git log branch-heads/9.0..branch-heads/9.1 include/v8.h` 來查看 API 變更的清單。

擁有 V8 活動檢出版本的開發者可以使用 `git checkout -b 9.1 -t branch-heads/9.1` 來試驗 V8 v9.1 中的新功能。或是您也可以 [訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，並自己嘗試這些新功能。
