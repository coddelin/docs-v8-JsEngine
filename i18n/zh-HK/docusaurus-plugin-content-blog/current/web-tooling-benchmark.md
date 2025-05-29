---
title: "宣佈 Web 工具基準測試"
author: "Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)), JavaScript 性能專家"
avatars:
  - "benedikt-meurer"
date: 2017-11-06 13:33:37
tags:
  - 基準測試
  - Node.js
description: "全新 Web 工具基準測試幫助識別並解決 Babel、TypeScript 和其他實際項目中的 V8 性能瓶頸問題。"
tweet: "927572065598824448"
---
JavaScript 性能一直是 V8 團隊關注的焦點，在本文中，我們想討論一個最近用於識別並解決 V8 中一些性能瓶頸問題的新 JavaScript [Web 工具基準測試](https://v8.github.io/web-tooling-benchmark)。您可能已經知道 V8 對 [Node.js 的重大承諾](/blog/v8-nodejs)，這個基準測試通過專門針對基於 Node.js 的常用開發工具進行性能測試來延續這一承諾。Web 工具基準測試中的工具是開發者和設計師今天用來構建現代網站和基於雲的應用程序的同一工具。為了繼續我們專注於 [實際性能](/blog/real-world-performance/) 而非人工基準測試的持續努力，我們使用開發人員每天運行的實際代碼創建了這個基準測試。

<!--truncate-->
Web 工具基準測試套件從一開始的設計就涵蓋了 [Node.js 的重要開發工具用例](https://github.com/nodejs/benchmarking/blob/master/docs/use_cases.md#web-developer-tooling)。由於 V8 團隊專注於核心 JavaScript 性能，我們建構了這個基準測試，將焦點放在 JavaScript 工作負載上，並排除對 Node.js 特定的 I/O 或外部互動的測量。這使得能夠在 Node.js、所有瀏覽器以及所有主要的 JavaScript 引擎殼層中運行基準測試，包括 `ch` (ChakraCore)、`d8` (V8)、`jsc` (JavaScriptCore) 和 `jsshell` (SpiderMonkey)。雖然基準測試並不限於 Node.js，但我們很高興 [Node.js 基準測試工作組](https://github.com/nodejs/benchmarking) 正考慮將該工具基準測試作為 Node 性能的標準 ([nodejs/benchmarking#138](https://github.com/nodejs/benchmarking/issues/138))。

基準測試中的各項測試涵蓋了開發人員常用於構建基於 JavaScript 的應用程序的各種工具，例如：

- 使用 `es2015` 預設的 [Babel](https://github.com/babel/babel) 編譯器。
- Babel 使用的解析器——名為 [Babylon](https://github.com/babel/babylon)——在多個常用輸入（包括 [lodash](https://lodash.com/) 和 [Preact](https://github.com/developit/preact) 的捆綁包）上運行。
- [webpack](http://webpack.js.org/) 使用的 [acorn](https://github.com/ternjs/acorn) 解析器。
- 使用 [TodoMVC](https://github.com/tastejs/todomvc) 項目中的 [typescript-angular](https://github.com/tastejs/todomvc/tree/master/examples/typescript-angular) 示例項目運行的 [TypeScript](http://www.typescriptlang.org/) 編譯器。

請參見 [深入分析](https://github.com/v8/web-tooling-benchmark/blob/master/docs/in-depth.md)，了解所有測試的詳細信息。

基於以往在其他基準測試（如 [Speedometer](http://browserbench.org/Speedometer)）中的經驗，隨著框架的新版本不斷推出，測試很快會變得過時，我們確保能夠直接更新基準測試中的每個工具到更新版本。基於 npm 基礎設施構建基準測試套件，我們可以輕鬆更新它，以確保其始終測試 JavaScript 開發工具的最新發展。更新測試用例僅需更新 `package.json` 清單中的版本。

我們建立了一個 [跟踪問題](http://crbug.com/v8/6936) 和一個 [電子表格](https://docs.google.com/spreadsheets/d/14XseWDyiJyxY8_wXkQpc7QCKRgMrUbD65sMaNvAdwXw)，記錄到目前為止我們收集的關於 V8 在新基準測試上性能表現的所有相關信息。我們的調查已經產生了一些有趣的結果。例如，我們發現 V8 經常在 `instanceof` 上進入慢路徑 ([v8:6971](http://crbug.com/v8/6971))，導致 3–4 倍的性能降低。我們還發現並修復了某些情況下的性能瓶頸，這些情況涉及屬性賦值，形式為 `obj[name] = val`，其中 `obj` 是通過 `Object.create(null)` 創建的。在這些情況下，儘管可以利用 `obj` 有一個 `null` 的原型，V8 還是會從快速路徑上脫離 ([v8:6985](http://crbug.com/v8/6985))。這些以及其他通過此基準測試發現的改進不僅提高了 V8 在 Node.js 中的性能，也增強了 Chrome 瀏覽器的性能。

我們不僅著眼於讓 V8 更快，還在測試工具和程式庫中發現性能漏洞時進行修復並上游合併。例如，我們在 [Babel](https://github.com/babel/babel) 中發現了一些性能漏洞，其中代碼模式如

```js
value = items[items.length - 1];
```

會導致訪問屬性 `"-1"`，因為代碼在此之前未檢查 `items` 是否為空。這種代碼模式由於 `"-1"` 查詢而導致 V8 通過慢速路徑，儘管稍作修改的等效 JavaScript 版本要快得多。我們在 Babel 中幫助修復了這些問題（[babel/babel#6582](https://github.com/babel/babel/pull/6582)、[babel/babel#6581](https://github.com/babel/babel/pull/6581) 和 [babel/babel#6580](https://github.com/babel/babel/pull/6580)）。我們還發現並修復了一個漏洞，即 Babel 會超出字串的長度進行訪問（[babel/babel#6589](https://github.com/babel/babel/pull/6589)），這觸發了 V8 中的另一個慢速路徑。此外，我們在 V8 中[優化了數組和字串的越界讀取](https://twitter.com/bmeurer/status/926357262318305280)。我們期待著繼續與[社群合作](https://twitter.com/rauchg/status/924349334346276864)，以改善此重要使用場景的性能，不僅是在 V8 上運行時，也是在其他 JavaScript 引擎（例如 ChakraCore）上運行時。

我們對實際性能（尤其是改進流行的 Node.js 工作負載）的強烈關注，體現在 V8 在基準測試中的得分在最近幾個版本中的持續改進：

![](/_img/web-tooling-benchmark/chart.svg)

自從 V8 v5.8 以來（這是 [切換到 Ignition+TurboFan 架構](/blog/launching-ignition-and-turbofan)前的最後一個 V8 發行版），V8 在工具基準測試中的得分提高了大約 **60%**。

在過去幾年中，V8 團隊已經意識到，沒有一個 JavaScript 基準測試——即使是一個具有良好意圖、精心設計的基準測試——應該作為 JavaScript 引擎整體性能的唯一代理。然而，我們確實認為新的 **Web Tooling Benchmark** 突出了值得關注的 JavaScript 性能領域。儘管名稱和初始動機如此，我們發現 Web Tooling Benchmark 測試套件不僅代表工具工作負載，還代表大量更複雜的 JavaScript 應用，這些應用並未在像 Speedometer 這種前端為主的基準測試中得到很好測試。這並不是取代 Speedometer，而是補充的一組測試。

最好的消息是，由於 Web Tooling Benchmark 基於真實的工作負載構建，我們預計最近基準得分的改進將直接轉化為開發者在[等待構建完成](https://xkcd.com/303/)時所需時間的減少。許多這些改進已經在 Node.js 中可用：在撰寫本文時，Node 8 LTS 使用的是 V8 v6.1，而 Node 9 使用的是 V8 v6.2。

最新版本的基準測試托管在 [https://v8.github.io/web-tooling-benchmark/](https://v8.github.io/web-tooling-benchmark/)。
