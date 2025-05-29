---
title: &apos;V8 發佈 v5.7&apos;
author: &apos;V8 團隊&apos;
date: 2017-02-06 13:33:37
tags:
  - 發佈
description: &apos;V8 v5.7 預設啟用 WebAssembly，並包含性能改進以及增加對 ECMAScript 語言功能的支持。&apos;
---
每隔六周，我們會根據[發佈流程](/docs/release-process)創建 V8 的新分支。每個版本都從 V8 的 Git 主分支立即分支，恰逢 Chrome Beta 的里程碑。今天，我們很高興宣布最新的分支，[V8 版本 5.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.7)，這個版本將進行 Beta 測試，直到幾周後與 Chrome 57 穩定版同步發佈為止。V8 5.7 包含各種面向開發者的精彩功能。我們希望提前為您預覽一些亮點。

<!--truncate-->
## 性能改進

### 原生 async 函數與 promises 一樣快

Async 函數的性能現在與使用 promises 寫成的代碼相當。我們的[微基準測試](https://codereview.chromium.org/2577393002)顯示，async 函數的執行性能提高了四倍。同一時期，promise 的整體性能也提高了一倍。

![V8 在 Linux x64 上的 async 性能改進](/_img/v8-release-57/async.png)

### 持續改進 ES2015

V8 繼續提高 ES2015 語言功能的速度，讓開發者可以使用新功能而不需承受性能成本。展開運算符、解構賦值和生成器現在的性能[幾乎與其簡單的 ES5 等效物相同](https://fhinkel.github.io/six-speed/)。

### RegExp 快速提升 15%

將 RegExp 函數從自託管的 JavaScript 實現遷移到集成 TurboFan 的代碼生成架構中，使整體 RegExp 性能提高了約 15%。詳細信息可以查看[專門的博客文章](/blog/speeding-up-regular-expressions)。

## JavaScript 語言功能

這個版本包含 ECMAScript 標準庫的幾個最近新增項目。兩個 String 方法，[`padStart`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart) 和 [`padEnd`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd)，提供了有用的字符串格式功能，而 [`Intl.DateTimeFormat.prototype.formatToParts`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat/formatToParts) 則讓開發者能以地區化的方式自定義日期/時間格式。

## 啟用 WebAssembly

Chrome 57（包含 V8 v5.7）將是首次預設啟用 WebAssembly 的版本。更多細節請參閱 [webassembly.org](http://webassembly.org/) 的入門文檔以及 [MDN](https://developer.mozilla.org/en-US/docs/WebAssembly/API) 上的 API 文檔。

## V8 API 增強

請查看我們的[API 變更總結](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。此文檔會在每次主要發佈後幾周內定期更新。有[活動 V8 檢出](/docs/source-code#using-git)的開發者可以使用 `git checkout -b 5.7 -t branch-heads/5.7` 來試用 V8 v5.7 的新功能，或者您可以[訂閱 Chrome的 Beta 測試版頻道](https://www.google.com/chrome/browser/beta.html)，很快自己試用這些新功能。

### `PromiseHook`

此 C++ API 允許用戶實現追踪 promises 整個生命周期的概述代碼。這啟用了 Node 即將推出的 [AsyncHook API](https://github.com/nodejs/node-eps/pull/18)，它讓您能構建[異步上下文傳播](https://docs.google.com/document/d/1tlQ0R6wQFGqCS5KeIw0ddoLbaSYx6aU7vyXOkv-wvlM/edit#)。

`PromiseHook` API 提供四個生命周期鉤子：初始化（init）、解析（resolve）、前置（before）和後置（after）。初始化鉤子在創建新 promise 時運行；解析鉤子在 promise 被解析時運行；前置和後置鉤子則分別在 [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob) 執行之前和之後運行。更多信息請查閱[追踪問題](https://bugs.chromium.org/p/v8/issues/detail?id=4643)和[設計文檔](https://docs.google.com/document/d/1rda3yKGHimKIhg5YeoAmCOtyURgsbTH_qaYR79FELlk/edit)。
