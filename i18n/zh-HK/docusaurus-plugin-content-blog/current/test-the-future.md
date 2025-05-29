---
title: &apos;協助我們測試 V8 的未來!&apos;
author: &apos;Daniel Clifford ([@expatdanno](https://twitter.com/expatdanno)), 原始慕尼黑 V8 啤酒釀造師&apos;
date: 2017-02-14 13:33:37
tags:
  - 內部結構
description: &apos;今日即能在 Chrome Canary 中預覽使用 Ignition 與 TurboFan 的 V8 新編譯器管線!&apos;
---
V8 團隊目前正在開發新的預設編譯器管線，此舉將幫助我們為[實際情況下的 JavaScript](/blog/real-world-performance)帶來未來的加速性能。您今天即可在 Chrome Canary 中預覽新的管線，幫助我們確保在向所有 Chrome 頻道發布新配置時不會有意外發生。

<!--truncate-->
新的編譯器管線使用 [Ignition 解釋器](/blog/ignition-interpreter) 和 [TurboFan 編譯器](/docs/turbofan) 執行所有 JavaScript（取代包含 Full-codegen 與 Crankshaft 編譯器的經典管線）。隨機選擇的一部分 Chrome Canary 和 Chrome Developer 頻道用戶已經在測試該新配置。不過任何人都可以通過在 about:flags 中切換選項來選擇加入新的管線（或恢復到舊的管線）。

您可以協助測試新的管線，方法是選擇加入並在您的常用網站上使用它。如果您是網頁開發人員，請使用新的編譯器管線測試您的網頁應用程式。如果您發現穩定性、正確性或性能上的回歸，請[向 V8 的錯誤跟蹤器報告問題](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline)。

## 如何啟用新管線

### 在 Chrome 58 中

1. 安裝最新的 [Beta](https://www.google.com/chrome/browser/beta.html)
2. 在 Chrome 中打開網址 `about:flags`
3. 搜尋 "**Experimental JavaScript Compilation Pipeline**" 並將其設置為 "**Enabled**"

![](/_img/test-the-future/58.png)

### 在 Chrome 59.0.3056 及更高版本中

1. 安裝最新的 [Canary](https://www.google.com/chrome/browser/canary.html) 或 [Dev](https://www.google.com/chrome/browser/desktop/index.html?extra=devchannel)
2. 在 Chrome 中打開網址 `about:flags`
3. 搜尋 "**Classic JavaScript Compilation Pipeline**" 並將其設置為 "**Disabled**"

![](/_img/test-the-future/59.png)

標準值為 "**Default**"，這意味著新的**或**經典管線將根據 A/B 測試配置啟用。

## 如何回報問題

如果您發現使用新管線與默認管線的瀏覽體驗有顯著變化，請讓我們知道。如果您是網頁開發者，請測試您（移動）網頁應用程式在新管線上的性能，看看有何影響。如果您發現您的網頁應用程式表現異常（或測試失敗），請讓我們知道：

1. 確保您已按照上一部分中所述正確啟用了新管線。
2. [在 V8 的錯誤跟蹤器上創建錯誤報告](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline)。
3. 附上我們可以用來重現問題的示例代碼。
