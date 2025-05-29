---
title: 'V8 發佈 v5.9'
author: 'V8 團隊'
date: 2017-04-27 13:33:37
tags:
  - release
description: 'V8 v5.9 包含新的 Ignition + TurboFan 管道，並在所有平台上新增了 WebAssembly TrapIf 支援。'
---
每六週，我們會根據 [發佈流程](/docs/release-process) 為 V8 建立一個新的分支。每個版本都從 V8 的 Git 主分支在 Chrome Beta 里程碑之前立即分出。今天我們很高興地宣布我們最新的分支，[V8 版本 5.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.9)，它將處於 Beta 阶段，直到數週後與 Chrome 59 Stable 一起發佈。V8 5.9 有各種面向開發者的好功能。我們願意在發佈之前為您提供一些亮點預覽。

<!--truncate-->
## Ignition+TurboFan 上線

V8 v5.9 將是第一個默認啟用 Ignition+TurboFan 的版本。總體來說，這次改變應該會導致網絡應用程式的更低內存消耗和更快啟動，我們預計不會出現穩定性或性能問題，因為新的管道已經進行了大量測試。不過，[與我們聯絡](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline)，如果您的代碼突然開始表現出顯著的性能回退。

欲了解更多資訊，請參閱[我們專門的博客文章](/blog/launching-ignition-and-turbofan)。

## WebAssembly `TrapIf` 在所有平台上支援

[WebAssembly `TrapIf` 支援](https://chromium.googlesource.com/v8/v8/+/98fa962e5f342878109c26fd7190573082ac3abe)顯著降低了編譯代碼的時間（約 30%）。

![](/_img/v8-release-59/angrybots.png)

## V8 API

請查看我們的 [API 改變摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。這個文件會在每次主要版本發佈後的幾週定期更新。

擁有 [活躍 V8 檢出](/docs/source-code#using-git) 的開發者可以使用 `git checkout -b 5.9 -t branch-heads/5.9` 來嘗試 V8 5.9 的新功能。或者，您也可以[訂閱 Chrome 的 Beta 渠道](https://www.google.com/chrome/browser/beta.html)，並即將自己嘗試新的功能。
