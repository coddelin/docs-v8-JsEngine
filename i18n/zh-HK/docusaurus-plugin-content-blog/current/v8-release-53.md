---
title: "V8 發佈 v5.3"
author: "V8 團隊"
date: "2016-07-18 13:33:37"
tags: 
  - 發佈
description: "V8 v5.3 帶來性能提升和內存消耗減少。"
---
大約每六週，我們會根據我們的[發佈流程](/docs/release-process)創建一個新的 V8 分支。每個版本都是在 Chrome Beta 里程碑進行分支之前，從 V8 的 Git 主分支進行分支。今天我們很高興宣佈我們最新的分支，[V8 版本 5.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.3)，該版本將處於 Beta 版本直到與 Chrome 53 正式穩定版一起發佈為止。V8 v5.3 包含眾多面向開發者的寶藏，為了迎接幾週後的正式發佈，我們希望為您預覽一些亮點。

<!--truncate-->
## 記憶體

### 新的 Ignition 解釋器

Ignition 是 V8 的新解釋器，功能已經完整，並將於 Chrome 53 中對低內存的 Android 設備啟用。該解釋器為 JIT 編譯代碼帶來直接的內存節省，並將使 V8 能夠進行未來的優化以加快代碼執行期間的啟動速度。Ignition 與 V8 現有的優化編譯器（TurboFan 和 Crankshaft）配合使用，確保“熱門”代碼仍然為最佳性能進行優化。我們正在繼續改進解釋器性能，希望能很快在所有平台上啟用 Ignition，包括移動和桌面平台。更多有關 Ignition 的設計、架構及性能提升的信息，請關注即將發布的博客文章。嵌入式版本的 V8 可以通過標誌 `--ignition` 啟用 Ignition 解釋器。

### 減少卡頓

V8 v5.3 包括各種更改以減少應用程序卡頓和垃圾回收時間。這些更改包括：

- 優化弱全局句柄以減少處理外部內存的時間
- 統一堆內存以進行完整垃圾回收以降低遷移卡頓
- 優化 V8 的[黑色分配](/blog/orinoco)來提升垃圾收集標記階段

這些改進共同將完整垃圾收集暫停時間減少了大約 25%，測量是在瀏覽一組流行網頁時進行的。更多關於最近垃圾收集優化以減少卡頓的細節，請參見“Jank Busters”系列博客文章 [第一部分](/blog/jank-busters) 和 [第二部分](/blog/orinoco)。

## 性能

### 改善頁面啟動時間

V8 團隊最近開始根據一組包含 25 個真實網站頁面加載（包括 Facebook、Reddit、維基百科和 Instagram 等流行網站）的性能改進進行跟踪。從 V8 v5.1（在 4 月份的 Chrome 51 中測得）到 V8 v5.3（在最近的 Chrome Canary 53 中測得），這些網站的啟動時間總體提高了大約 7%。這些加載真實網站的改進與 Speedometer 基準測試中的類似增益相一致，該測試在 V8 v5.3 中執行快了 14%。更多有關我們的新測試工具、運行時改進以及 V8 在頁面加載期間耗時分析的詳細信息，請關注我們即將發布的關於啟動性能的博客文章。

### ES2015 `Promise` 性能

V8 在 [Bluebird ES2015 `Promise` 基准套件](https://github.com/petkaantonov/bluebird/tree/master/benchmark)上的性能在 V8 v5.3 中提高了 20–40%，具體取決於架構和基准測試。

![V8 的 Promise 性能隨時間的變化（在 Nexus 5x 上）](/_img/v8-release-53/promise.png)

## V8 API

請查閱我們的 [API 更改摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。該文檔會在每次主要版本發佈後的幾週內定期更新。

擁有[活躍 V8 源碼檢出](https://v8.dev/docs/source-code#using-git)的開發人員可以使用 `git checkout -b 5.3 -t branch-heads/5.3` 試驗 V8 5.3 中的新功能。或者，您可以[訂閱 Chrome 的 Beta 渠道](https://www.google.com/chrome/browser/beta.html)，並很快親自嘗試新功能。
