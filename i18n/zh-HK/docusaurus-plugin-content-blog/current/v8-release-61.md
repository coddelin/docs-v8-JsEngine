---
title: &apos;V8 發佈版本 v6.1&apos;
author: &apos;V8 團隊&apos;
date: 2017-08-03 13:33:37
tags:
  - 發佈
description: &apos;V8 v6.1 附帶減少的二進制大小並包括性能改進。此外，asm.js 現已經過驗證並編譯為 WebAssembly。&apos;
---
每六週，我們會根據 [發佈流程](/docs/release-process) 創建一個新的 V8 分支。每個版本都從 V8 的 Git 主分支中選擇，恰好在 Chrome Beta 里程碑之前。今天我們很高興宣布我們的最新分支 [V8 版本 6.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.1)，該版本將會處於 Beta 階段，直到幾週後與 Chrome 61 的穩定版協同發佈。V8 v6.1 為開發人員帶來了各種好處，接下來我們將提前預覽一些亮點。

<!--truncate-->
## 性能改進

遍歷 Maps 和 Sets 的所有元素——無論是通過 [迭代](http://exploringjs.com/es6/ch_iteration.html) 或 [`Map.prototype.forEach`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach) / [`Set.prototype.forEach`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/forEach) 方法——速度顯著加快，原始性能提升最高達到 11 倍（從 V8 版本 6.0 開始）。請查閱 [專門的博客文章](https://benediktmeurer.de/2017/07/14/faster-collection-iterators/) 獲取更多信息。

![](/_img/v8-release-61/iterating-collections.svg)

此外，其他語言功能的性能改進工作也在繼續。例如，[`Object.prototype.isPrototypeOf`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isPrototypeOf) 方法，對於使用大多數對象字面量且不使用構造器函數的無構造器代碼非常重要，並使用 `Object.create` 替代類和構造函數的情況下，現在總是與使用 [`instanceof` 操作符](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof) 一樣快，並且通常更快。

![](/_img/v8-release-61/checking-prototype.svg)

具有可變參數的函數調用和構造器調用的速度也顯著提高。使用 [`Reflect.apply`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/apply) 和 [`Reflect.construct`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/construct) 的調用在最新版本中獲得了最多達 17 倍的性能提升。

![](/_img/v8-release-61/call-construct.svg)

`Array.prototype.forEach` 現在在 TurboFan 中做了內聯並針對所有主要的非空洞 [元素類型](/blog/elements-kinds) 進行了優化。

## 二進制大小減少

V8 團隊完全移除了已棄用的 Crankshaft 編譯器，從而顯著降低了二進制大小。除了移除內置生成器，這使得 V8 的已部署二進制大小減少了超過 700 KB（具體大小取決於平台）。

## asm.js 現在已經過驗證並編譯為 WebAssembly

如果 V8 遇到 asm.js 代碼，現在會嘗試對其進行驗證。有效的 asm.js 代碼將被轉譯為 WebAssembly。根據 V8 的性能評估，這通常可以提升吞吐性能。由於增加了驗證步驟，可能會出現孤立的啟動性能回歸。

請注意，該功能僅在 Chromium 端默認開啟。如果您是嵌入者並希望使用 asm.js 驗證器，請啟用標誌 `--validate-asm`。

## WebAssembly

在調試 WebAssembly 時，現在可以在 DevTools 中顯示局部變量，當在 WebAssembly 代碼中設置斷點時會觸發。

## V8 API

請查看我們的 [API 更改摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。該文檔通常會在每次重大版本發佈後幾週內定期更新。

擁有 [主動 V8 選取檢出](/docs/source-code#using-git) 的開發人員可以使用 `git checkout -b 6.1 -t branch-heads/6.1` 來嘗試 V8 v6.1 的新功能。另外，您也可以[訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，在不久的將來自行嘗試新功能。
