---
title: "功能支援"
permalink: /features/support/
layout: layouts/base.njk
description: "此文件說明在 V8 網站上使用的 JavaScript 和 WebAssembly 語言功能支援列表。"
---
# JavaScript/Wasm 功能支援

[我們的 JavaScript 和 WebAssembly 語言功能解釋器](/features)經常包括如下的功能支援列表：

<feature-support chrome="71"
                 firefox="65"
                 safari="12"
                 nodejs="12"
                 babel="yes"></feature-support>

未支援的功能會像這樣顯示：

<feature-support chrome="no"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

對於最新的功能，通常會出現不同環境下的混合支援情況：

<feature-support chrome="partial"
                 firefox="yes"
                 safari="yes"
                 nodejs="no"
                 babel="yes"></feature-support>

目標是提供關於功能成熟度的快速概覽，不僅限於 V8 和 Chrome，也包括更廣泛的 JavaScript 生態系統。請注意，這不限於在 V8 等積極開發的 JavaScript VM 中的原生實現，還包括工具支援，這裡透過 [Babel](https://babeljs.io/) 圖標表示。

<!--truncate-->
Babel 的條目涵蓋了多種意義：

- 對於語法語言功能，例如 [class fields](/features/class-fields)，它指的是轉譯支援。
- 對於新的 API 語言功能，例如 [`Promise.allSettled`](/features/promise-combinators#promise.allsettled)，它指的是 polyfill 支援。（Babel 通過 [the core-js project](https://github.com/zloirock/core-js) 提供 polyfills。）

Chrome 標誌代表 V8、Chromium，以及任何基於 Chromium 的瀏覽器。
