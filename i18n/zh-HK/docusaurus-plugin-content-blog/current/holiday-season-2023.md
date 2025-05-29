---
title: 'V8 比以往更快、更安全！'
author: '[Victor Gomes](https://twitter.com/VictorBFG)，Glühwein 專家'
avatars:
  - victor-gomes
date: 2023-12-14
tags:
  - JavaScript
  - WebAssembly
  - 安全性
  - 基準測試
description: "V8 在 2023 年的令人印象深刻的成就"
tweet: ''
---

歡迎來到令人興奮的 V8 世界，在這裡速度不僅僅是一項功能，而是一種生活方式。當我們向 2023 年告別時，是時候慶祝 V8 今年取得的令人印象深刻的成就了。

通過創新的性能優化，V8 繼續在不斷演變的 Web 領域推進可能性的邊界。我們引入了一個新的中層編譯器，並對頂層編譯器基礎設施、運行時和垃圾回收器進行了多項改進，這些改進帶來了全方位的顯著速度提升。

<!--truncate-->
除了性能改進之外，我們還為 JavaScript 和 WebAssembly 引入了令人振奮的新功能。我們還通過 [WebAssembly Garbage Collection (WasmGC)](https://v8.dev/blog/wasm-gc-porting) 實現了一種高效地將垃圾回收編程語言引入 Web 的新方法。

但我們對卓越的承諾並未止步於此——我們還優先考慮安全性。我們改進了沙箱基礎設施，並為 V8 引入了 [控制流完整性（CFI）](https://en.wikipedia.org/wiki/Control-flow_integrity)，為用戶提供了更安全的環境。

以下是我們今年的一些重要亮點。

# Maglev：新的中層優化編譯器

我們引入了一個名為 [Maglev](https://v8.dev/blog/maglev) 的新優化編譯器，戰略性地定位於我們現有的 [Sparkplug](https://v8.dev/blog/sparkplug) 和 [TurboFan](https://v8.dev/docs/turbofan) 編譯器之間。它作為一個高速優化編譯器，在令人印象深刻的速度下高效生成優化代碼。它生成代碼的速度比我們的基線非優化編譯器 Sparkplug 慢約 20 倍，但比頂層 TurboFan 快 10 到 100 倍。我們觀察到 Maglev 帶來了顯著的性能改進，[JetStream](https://browserbench.org/JetStream2.1/) 提高了 8.2%，而 [Speedometer](https://browserbench.org/Speedometer2.1/) 則提高了 6%。Maglev 更快的編譯速度和對 TurboFan 的依賴減少使 V8 在 Speedometer 運行中的總能耗降低了 10%。[雖然尚未完全完成](https://en.m.wikipedia.org/wiki/Full-employment_theorem)，Maglev 的當前狀態足以支持它在 Chrome 117 中的推出。更多詳情請參閱我們的[博文](https://v8.dev/blog/maglev)。

# Turboshaft：頂層優化編譯器的新架構

Maglev 不是我們唯一對改進編譯技術的投資。我們還引入了 Turboshaft，這是我們頂層優化編譯器 Turbofan 的新內部架構，使其更容易擴展新的優化並更快地編譯。自 Chrome 120 起，CPU 無關的後端階段全部使用 Turboshaft 而非 Turbofan，編譯速度比以前快約兩倍。這節省了能源，並為明年及未來更令人興奮的性能提升鋪平了道路。敬請期待更新！

# 更快的 HTML 解析器

我們觀察到基準測試的大量時間消耗在 HTML 解析上。雖然這不是 V8 的直接增強，我們主動採取行動，運用我們在性能優化方面的專業知識，在 Blink 中添加了一個更快的 HTML 解析器。這些更改導致 Speedometer 分數顯著提高了 3.4%。對 Chrome 的影響如此積極，以至於 WebKit 項目迅速將這些更改整合到 [他們的存儲庫](https://github.com/WebKit/WebKit/pull/9926) 中。我們以促進實現更快的 Web 目標而感到自豪！

# 更快的 DOM 分配

我們還積極投資於 DOM 側。對 [Oilpan](https://chromium.googlesource.com/v8/v8/+/main/include/cppgc/README.md)——DOM 對象的分配器進行了顯著的內存分配策略優化。它獲得了一個頁面池，可以顯著降低到內核往返的成本。Oilpan 現在支持壓縮和未壓縮指針，我們避免壓縮 Blink 中的高流量字段。鑑於解壓的頻率，它對性能具有廣泛影響。此外，考慮到分配器的速度，我們對高頻分配類進行了 Oilpan 化，使分配工作負載的速度提高了 3 倍，並在 DOM 密集型基準測試中（如 Speedometer）顯示出顯著改進。

# 新的 JavaScript 功能

JavaScript 繼續隨著新標準化功能而進化，今年也不例外。我們推出了[可調整大小的 ArrayBuffers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer#resizing_arraybuffers) 和 [ArrayBuffer 轉移](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/transfer)、字串 [`isWellFormed`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/isWellFormed) 和 [`toWellFormed`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toWellFormed)、[RegExp `v` 標誌](https://v8.dev/features/regexp-v-flag)（又名 Unicode 集合記號）、[`JSON.parse` with source](https://github.com/tc39/proposal-json-parse-with-source)、[Array 分組](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy)、[`Promise.withResolvers`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers) 和 [`Array.fromAsync`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fromAsync)。不幸的是，我們在發現一個 Web 不相容後不得不取消[迭代器輔助工具](https://github.com/tc39/proposal-iterator-helpers)，但我們已與 TC39 合作修正該問題並很快會重新推出。最後，我們也透過[省略一些多餘的時間死區檢查](https://docs.google.com/document/d/1klT7-tQpxtYbwhssRDKfUMEgm-NS3iUeMuApuRgZnAw/edit?usp=sharing)來讓 `let` 和 `const` 綁定的 ES6+ JS 代碼更快。

# WebAssembly 更新

今年很多新的功能和效能改進都來到了 Wasm。我們啟用了對 [multi-memory](https://github.com/WebAssembly/multi-memory)、[尾呼叫](https://github.com/WebAssembly/tail-call)（詳情見我們的[部落格文章](https://v8.dev/blog/wasm-tail-call)）和 [relaxed SIMD](https://github.com/WebAssembly/relaxed-simd) 的支援，以釋放下一級的性能。我們完成了對 [memory64](https://github.com/WebAssembly/memory64) 的實現，以滿足需要更多記憶體的應用程式的需求，並等待提案達到[第四階段](https://github.com/WebAssembly/memory64/issues/43)後就可以發布！我們確保採用了 [exception-handling 提案](https://github.com/WebAssembly/exception-handling) 的最新更新，同時仍支援之前的格式。我們還一直在投資於 [JSPI](https://v8.dev/blog/jspi)，以[在 Web 上啟用另一類大型應用](https://docs.google.com/document/d/16Us-pyte2-9DECJDfGm5tnUpfngJJOc8jbj54HMqE9Y/edit#bookmark=id.razn6wo5j2m)。敬請期待明年！

# WebAssembly 垃圾回收

說到為 Web 帶來新的應用類別，我們終於在經過數年對[提案](https://github.com/WebAssembly/gc/blob/main/proposals/gc/MVP.md)'s 標準化和[實現](https://bugs.chromium.org/p/v8/issues/detail?id=7748)的努力後，推出了 WebAssembly 垃圾回收（WasmGC）。Wasm 現在有了一種內建的分配物件和陣列的方法，這些物件和陣列由 V8 現有的垃圾回收器管理。這使得用 Java、Kotlin、Dart 和類似垃圾回收語言編寫的應用程式可以編譯到 Wasm——在這些應用程式中，它們的運行速度通常是編譯到 JavaScript 時的兩倍。更多詳情請參閱[我們的部落格文章](https://v8.dev/blog/wasm-gc-porting)。

# 安全性

在安全方面，今年我們的三個主要議題是沙盒化、模糊測試和 CFI。在[沙盒化](https://docs.google.com/document/d/1FM4fQmIhEqPG8uGp5o9A-mnPB5BOeScZYpkHjo0KKA8/edit?usp=sharing)方面，我們專注於建設必需的基礎設施，例如代碼和可信指標表。在模糊測試方面，我們從模糊測試基礎設施到特殊用途模糊測試和更好的語言覆蓋範圍都進行了投資。我們的一些工作在[這次演講](https://www.youtube.com/watch?v=Yd9m7e9-pG0)中有所提及。最後，在 CFI 方面，我們為[CFI 架構](https://v8.dev/blog/control-flow-integrity)奠定了基礎，使其能夠在盡可能多的平台上實現。除了這些，一些較小但值得注意的努力還包括[緩解一種流行的漏洞利用技術](https://crbug.com/1445008)的工作（與`the_hole`相關）以及以 [V8CTF](https://github.com/google/security-research/blob/master/v8ctf/rules.md)形式推出新的漏洞賞金計劃。

# 總結

全年，我們致力於許多漸進的性能增強。這些小型項目與部落格文章中詳細介紹的項目所帶來的結合影響是巨大的！以下是基準測試分數，顯示 2023 年 V8 的性能改進，其中 JetStream 整體增長了 `14%`，而 Speedometer 則令人印象深刻地增長了 `34%`。

![在一台 13” M1 MacBook Pro 上測量的 Web 性能基準測試。](/_img/holiday-season-2023/scores.svg)

這些結果顯示，V8 比以往更快、更安全。準備好吧，各位開發者，因為隨著 V8，Web 的快速與狂暴旅程才剛剛開始！我們致力於讓 V8 成為地球上最好的 JavaScript 和 WebAssembly 引擎！

我們全體 V8 團隊成員祝您節日快樂，願您在瀏覽 Web 時擁有快速、安全且精彩的體驗！
