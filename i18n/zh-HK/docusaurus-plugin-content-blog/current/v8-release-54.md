---
title: "V8 發佈 v5.4"
author: "V8 團隊"
date: 2016-09-09 13:33:37
tags:
  - 發佈
description: "V8 v5.4 帶來性能改善及降低記憶體使用量。"
---
每隔六週，我們會根據 [發佈流程](/docs/release-process) 的一部分創建新的 V8 分支。每次新版本都從 V8 的 Git 主版分支中分支出，時間在 Chrome Beta 的里程碑前夕。今天我們很高興宣佈最新的分支 [V8 version 5.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.4)，此版本將進入 beta 測試階段，直到幾週後與 Chrome 54 Stable 一同發佈。V8 v5.4 包含各種面向開發者的功能亮點，以下是一些主要改進的預覽。

<!--truncate-->
## 性能改進

V8 v5.4 在記憶體佔用及啟動速度方面帶來了眾多關鍵性改進。這些主要用於加速初始腳本執行並減少 Chrome 的頁面加載時間。

### 記憶體

在測量 V8 的記憶體使用情況時，有兩個重要指標需要監控並了解：_峰值記憶體_使用量以及_平均記憶體_使用量。通常，降低峰值使用量與降低平均使用量同樣重要，因為正在執行的腳本即使只是短暫耗盡可用記憶體，也可能導致_記憶體不足_崩潰，即使其平均記憶體使用量並不高。為了進行優化，我們將 V8 的記憶體劃分為兩類：_堆內記憶體_包含實際的 JavaScript 對象，以及_堆外記憶體_包含其他部分，例如由編譯器、解析器和垃圾回收器分配的內部數據結構。

在 v5.4 中，我們針對具有 512 MB 記憶體或以下的低記憶體設備對 V8 的垃圾回收器進行了調整。根據顯示的網站不同，_堆內記憶體_的_峰值記憶體_使用量可減少最多 **40%**。

V8 JavaScript 解析器內部的記憶體管理已簡化，避免了不必要的分配，降低了_堆外峰值記憶體_使用量最多 **20%**。這些記憶體節省對於減少大型腳本文件（包括 asm.js 應用）的記憶體佔用特別有幫助。

### 啟動及速度

我們的 V8 解析器簡化工作不僅減少了記憶體佔用，還提高了解析器的運行性能。這些簡化，加上對 JavaScript 內建方法的其他優化以及 JavaScript 對象屬性訪問使用全局 [內聯緩存](https://en.wikipedia.org/wiki/Inline_caching) 的方式，使啟動性能獲得了顯著提升。

在我們的[內部啟動測試套件](https://www.youtube.com/watch?v=xCx4uC7mn6Y)中，測試了實際 JavaScript 性能，並獲得了中位數 **5%** 的性能提升。[Speedometer](http://browserbench.org/Speedometer/) 基準測試也受益於這些優化，相較於 v5.2 [提升約 **10% 至 13%**](https://chromeperf.appspot.com/report?sid=f5414b72e864ffaa4fd4291fa74bf3fd7708118ba534187d36113d8af5772c86&start_rev=393766&end_rev=416239)。

![](/_img/v8-release-54/speedometer.png)

## V8 API

請查看我們的 [API 變更摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。此文檔在每次重要版本發佈後的幾週內會定期更新。

擁有[有效 V8 檢出](/docs/source-code#using-git)的開發者可以使用 `git checkout -b 5.4 -t branch-heads/5.4` 來試驗 V8 v5.4 的新功能。或者您可以[訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，並即將親身嘗試這些新功能。
