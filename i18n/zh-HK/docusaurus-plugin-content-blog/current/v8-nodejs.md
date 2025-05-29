---
title: 'V8 ❤️ Node.js'
author: 'Franziska Hinkelmann, Node Monkey Patcher'
date: 2016-12-15 13:33:37
tags:
  - Node.js
description: '本篇部落格文章突顯了近期為了讓 Node.js 在 V8 和 Chrome DevTools 中得到更好支持而付出的努力。'
---
Node.js 的受歡迎程度在過去幾年中穩步增長，我們一直致力於讓 Node.js 表現得更好。本篇文章突顯了在 V8 和 DevTools 中的一些近期努力。

## 在 DevTools 中調試 Node.js

您現在可以[使用 Chrome 開發者工具調試 Node 應用程式](https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27#.knjnbsp6t)。Chrome DevTools 團隊將實現調試協議的源代碼從 Chromium 移至 V8，從而使 Node Core 更容易保持調試器的源代码和依賴項的最新狀態。其他瀏覽器供應商和 IDE 也使用 Chrome 調試協議，共同改善開發者在使用 Node 時的體驗。

<!--truncate-->
## ES2015 性能提升

我們正在努力使 V8 比以前更快。[我們最近的性能工作主要集中在 ES6 的功能](/blog/v8-release-56)，包括 promises、生成器、析構函數以及剩餘/展開運算符。由於 Node 6.2 及其之後的版本中 V8 完全支持 ES6，Node 開發者可以直接使用新語言功能，而無需使用 polyfill。因此，Node 開發者往往是第一批從 ES6 性能改進中受益的人。同樣地，他們也是最早發現性能回歸的人。得益於一個細心的 Node 社群，我們找到了並修復了一些回歸問題，包括 [`instanceof`](https://github.com/nodejs/node/issues/9634)、[`buffer.length`](https://github.com/nodejs/node/issues/9006)、[長參數列表](https://github.com/nodejs/node/pull/9643)和[`let`/`const`](https://github.com/nodejs/node/issues/9729) 的性能問題。

## 即將針對 Node.js `vm` 模組和 REPL 修復

[`vm` 模組](https://nodejs.org/dist/latest-v7.x/docs/api/vm.html)一直以來存在[一些長期問題](https://github.com/nodejs/node/issues/6283)。為了妥善解決這些問題，我們擴展了 V8 API 以實現更直觀的行為。我們很高興地宣布，vm 模組改進是我們作為導師在[Node 基金會的 Outreachy 專案](https://nodejs.org/en/foundation/outreachy/)中支持的項目之一。我們期待在不久的將來在這個專案及其他專案上看到更多進展。

## `async`/`await`

使用同步函數，您可以通過依次等待 promises 來根本簡化非同步程式碼的編寫程式。`async`/`await` 將與[下一次 V8 更新](https://github.com/nodejs/node/pull/9618)一起登陸 Node。我們最近在改進 promises 和生成器性能方面的工作幫助同步函數變得更快。在相關工作中，我們也正在提供[promise hooks](https://bugs.chromium.org/p/v8/issues/detail?id=4643)，這是一組需要用於[Node 非同步 Hook API](https://github.com/nodejs/node-eps/pull/18)的內省 API。

## 想嘗試最新的 Node.js 嗎？

如果您急於嘗試 Node 中最新的 V8 功能，並且不介意使用最新但不穩定的軟體，您可以嘗試我們的整合分支[這裡](https://github.com/v8/node/tree/vee-eight-lkgr)。[V8 被持續整合到 Node](https://ci.chromium.org/p/v8/builders/luci.v8.ci/V8%20Linux64%20-%20node.js%20integration)，在 V8 敲定進入 Node.js 之前，我們便可以提早發現問題。打個招呼，這比 Node.js 的頂部分支還要更具實驗性。
