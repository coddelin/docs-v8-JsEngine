---
title: "V8 發行版本 v6.3"
author: "V8 團隊"
date: "2017-10-25 13:33:37"
tags: 
  - release
description: "V8 v6.3 包含性能改進、降低內存消耗以及支持新的 JavaScript 語言功能。"
tweet: "923168001108643840"
---
每六週，我們根據 [發行過程](/docs/release-process) 創建一個新的 V8 分支。每個版本都基於 V8 的 Git 主線分支，並在 Chrome Beta 里程碑之前完成分支操作。今天，我們很高興宣布最新的分支 [V8 版本 6.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.3)，該分支目前處於 Beta 測試階段，預計將在接下來幾週與 Chrome 63 穩定版協同發佈。V8 v6.3 為開發者提供了許多新功能。本文將預覽此次版本的一些亮點。

<!--truncate-->
## 性能

[Jank Busters](/blog/jank-busters) III 隨 [Orinoco](/blog/orinoco) 項目推出。並發標記 ([70-80%](https://chromeperf.appspot.com/report?sid=612eec65c6f5c17528f9533349bad7b6f0020dba595d553b1ea6d7e7dcce9984) 的標記在非阻塞線程上完成) 已啟用。

解析器現在不再需要 [第二次預解析函數](https://docs.google.com/document/d/1TqpdGeLmURL2gc18s6PwNeyZOvayQJtJ16TCn0BEt48/edit#heading=h.un2pnqwbiw11)。這帶來了 [解析時間中位值的 14% 改進](https://docs.google.com/document/d/1TqpdGeLmURL2gc18s6PwNeyZOvayQJtJ16TCn0BEt48/edit#heading=h.dvuo4tqnsmml)，基於我們的內部啟動 Top25 基準。

`string.js` 已完全移植到 CodeStubAssembler。非常感謝 [@peterwmwong](https://twitter.com/peterwmwong) [傑出的貢獻](https://chromium-review.googlesource.com/q/peter.wm.wong)！對於開發者來說，這意味著從 V8 v6.3 開始，內建的字符串函數如 `String#trim` 的速度將更快。

`Object.is()` 的性能現在大致與替代方案相當。總的來說，V8 v6.3 繼續改進 ES2015+ 的性能。除此之外，我們提升了 [多態訪問符號的速度](https://bugs.chromium.org/p/v8/issues/detail?id=6367)、[構造函數調用的多態內聯](https://bugs.chromium.org/p/v8/issues/detail?id=6885) 和 [(標記的) 模板字符串](https://pasteboard.co/GLYc4gt.png)。

![V8 在過去六個版本中的性能](/_img/v8-release-63/ares6.svg)

弱優化函數列表已移除。更多信息可以在 [專門的博客文章](/blog/lazy-unlinking) 中找到。

上述事項只是性能改進的一部分。還有許多其他與性能相關的工作。

## 內存消耗

[寫屏障已切換為使用 CodeStubAssembler](https://chromium.googlesource.com/v8/v8/+/dbfdd4f9e9741df0a541afdd7516a34304102ee8)。這每個隔離器可節省大約 100 KB 的內存。

## JavaScript 語言功能

V8 現在支持以下第 3 階段功能：[通過 `import()` 的動態模塊導入](/features/dynamic-import)、[`Promise.prototype.finally()`](/features/promise-finally) 和 [異步迭代器/生成器](https://github.com/tc39/proposal-async-iteration)。

使用 [動態模塊導入](/features/dynamic-import) 可以根據運行時條件非常簡便地導入模塊。當應用程序需要延遲加載某些代碼模塊時，這非常有用。

[`Promise.prototype.finally`](/features/promise-finally) 引入了一種可以在 Promise 解決後簡單清理的方法。

隨著 [異步迭代器/生成器](https://github.com/tc39/proposal-async-iteration) 的引入，使用異步函數進行迭代更加簡便。

在 `Intl` 方面，[`Intl.PluralRules`](/features/intl-pluralrules) 現已支持。此 API 提供高性能的國際化複數化功能。

## 調試工具/偵錯

在 Chrome 63 中，[區塊覆蓋率](https://docs.google.com/presentation/d/1IFqqlQwJ0of3NuMvcOk-x4P_fpi1vJjnjGrhQCaJkH4/edit#slide=id.g271d6301ff_0_44) 也得到了 DevTools UI 的支持。請注意，檢查器協議從 V8 v6.2 就已支持區塊覆蓋率。

## V8 API

請查看我們的 [API 更改摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。此文檔通常會在每次主要版本發佈幾周後進行更新。

擁有 [活動的 V8 源代碼檢出](/docs/source-code#using-git) 的開發者可以使用 `git checkout -b 6.3 -t branch-heads/6.3` 來試驗 V8 v6.3 中的新功能。或者，您也可以 [訂閱 Chrome 的 Beta 渠道](https://www.google.com/chrome/browser/beta.html)，並嘗試新功能。
