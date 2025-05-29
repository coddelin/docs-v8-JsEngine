---
title: "V8 發佈 v5.8"
author: "V8 團隊"
date: 2017-03-20 13:33:37
tags:
  - 發佈
description: "V8 v5.8 支援使用任意堆積大小並提升啟動效能。"
---
每六週，我們會從 V8 的 Git主分支建立一個新分支，作為我們[發佈過程](/docs/release-process)的一部分。每個版本在 Chrome Beta 里程碑之前立即從 V8 的 Git master 分支分支出來。今天我們很高興地宣布我們的最新分支，[V8 版本 5.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.8)，它將進入 Beta 測試，直到幾週後與 Chrome 58 Stable 一起正式釋出。V8 5.8 充滿了各種面向開發者的亮點。我們希望在正式發佈前向您預覽一些重點功能。

<!--truncate-->
## 任意堆積大小

過去，V8 的堆積大小限制方便地設置在帶有一些邊距的有符號 32 位整數範圍內。隨著時間的推移，這種方便性導致了 V8 中混合不同位寬類型的不良代碼，實際上破壞了增加限制的能力。在 V8 v5.8 中，我們啟用了使用任意堆積大小的能力。查看[專門的部落格文章](/blog/heap-size-limit)了解更多資訊。

## 啟動效能

在 V8 v5.8 中，我們繼續努力逐步減少 V8 在啟動期間花費的時間。從編譯和解析代碼花費的時間到 IC 系統中的優化，均帶來了約 5% 的提升，改善了我們的[實際啟動工作負載](/blog/real-world-performance)。

## V8 API

請檢查我們的[API 變更摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。這份文檔在每次主要版本發佈後幾週內會定期更新。

擁有[活躍 V8 檢出](/docs/source-code#using-git)的開發者可以使用 `git checkout -b 5.8 -t branch-heads/5.8` 來試驗 V8 5.8 的新功能。或者，您可以[訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)並不久後自己試用新功能。
