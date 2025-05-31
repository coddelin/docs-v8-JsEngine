---
title: "慶祝 V8 十週年"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)), V8 歷史學家"
avatars: 
  - "mathias-bynens"
date: "2018-09-11 19:00:00"
tags: 
  - benchmarks
description: "V8 專案過去十年以及更早尚未公開時期的重要里程碑回顧概述。"
tweet: "1039559389324238850"
---
本月是 Google Chrome 和 V8 專案發布的十週年。本文章提供 V8 專案在過去十年以及更早尚未公開時期的重要里程碑概述。

<!--truncate-->
<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/G0vnrPTuxZA" width="640" height="360" loading="lazy"></iframe>
  </div>
  <figcaption>透過<a href="http://gource.io/"><code>gource</code></a>工具創建的 V8 程式碼庫演變可視化。</figcaption>
</figure>

## 在 V8 發布前: 初期年代

Google 於 **2006** 年秋天聘請 [Lars Bak](https://en.wikipedia.org/wiki/Lars_Bak_%28computer_programmer%29) 建立 Chrome 網頁瀏覽器的新一代 JavaScript 引擎，當時 Chrome 是 Google 內部的一個秘密專案。Lars 剛從硅谷搬回丹麥的奧爾胡斯。由於當地並沒有 Google 辦公室，而 Lars 想留在丹麥，於是 Lars 和幾位專案初期工程師開始在他農場的一座外建物中進行開發工作。新的 JavaScript 運行時被命名為「V8」，這是一個俏皮的指涉，意指您可以在傳統馬力車中找到的強大引擎。後來，隨著 V8 團隊的成長，開發者們從簡陋的工作場所搬到了奧爾胡斯的一座現代化辦公大樓，但團隊依舊保持著全力以赴的專注目標——打造全球速度最快的 JavaScript 運行時。

## 啟動與發展 V8

V8 在 [Chrome 發布](https://blog.chromium.org/2008/09/welcome-to-chromium_02.html)的同一天正式開源：即 **2008** 年 9 月 2 日。[首次提交](https://chromium.googlesource.com/v8/v8/+/43d26ecc3563a46f62a0224030667c8f8f3f6ceb)可追溯到 2008 年 6 月 30 日。在此日期之前，V8 的開發工作是在一個私有的 CVS 儲存庫中進行的。最初，V8 僅支持 ia32 和 ARM 指令集並使用 [SCons](https://scons.org/) 作為其建構系統。

**2009** 年引入了一個全新的正則運算式引擎 [Irregexp](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html)，為實際的正則運算式提升了性能。隨著 x64 埠的引入，支援的指令集種類從兩種增加到了三種。2009 年也標誌著 [Node.js 專案的首次發布](https://github.com/nodejs/node-v0.x-archive/releases/tag/v0.0.1)，它嵌入了 V8。非瀏覽器專案嵌入 V8 的可能性在原始 Chrome 漫畫中曾被 [明確提及](https://www.google.com/googlebooks/chrome/big_16.html)。而在 Node.js 中這成真了！Node.js 成為最受歡迎的 JavaScript 生態系統之一。

**2010** 年見證了運行時性能的巨大提升，V8 引入了一個全新的優化 JIT 編譯器。[Crankshaft](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html) 生成的機器碼速度加倍且大小比之前的（尚未命名的）V8 編譯器小 30%。同年，V8 增加了第四個指令集：32 位的 MIPS。

**2011** 年到來，垃圾回收大幅改進。[新的增量垃圾回收](https://blog.chromium.org/2011/11/game-changer-for-interactive.html)劇減了暫停時間，同時保持了高峰性能和低記憶體使用量。V8 引入了隔離的概念，允許嵌入者在一個進程中啟動多個 V8 運行時實例，為 Chrome 中的輕量化 Web Workers 鋪平了道路。第一次建構系統遷移發生在從 SCons 過渡到 [GYP](https://gyp.gsrc.io/) 時。我們實現了 ES5 嚴格模式的支援。與此同時，開發搬遷到了慕尼黑（德國），在新的領導下並充滿了與奧爾胡斯的原始團隊的深入交流。

**2012** 年對 V8 專案來說是一個具有里程碑意義的年份。團隊進行了性能優化衝刺，通過 [SunSpider](https://webkit.org/perf/sunspider/sunspider.html) 和 [Kraken](https://krakenbenchmark.mozilla.org/) 基準測試套件來提升 V8 的性能表現。隨後，我們開發了一個名為 [Octane](https://chromium.github.io/octane/) 的新基準測試套件 (以 [V8 Bench](http://www.netchain.com/Tools/v8/) 為核心)，將性能競賽的重點推向前沿，並促進了主要 JavaScript 引擎的運行時和即時編譯技術的巨大改進。這些努力的結果之一是從隨機採樣切換到基於計數的確定性技術，用於檢測 V8 運行時探查器中的“熱門”函數。這大大降低了某些頁面加載（或基準測試運行）速度隨機比其他速度慢得多的可能性。

**2013** 年出現了 JavaScript 的一個低級子集，名為 [asm.js](http://asmjs.org/)。由於 asm.js 僅限於靜態類型的算術、函數調用和使用原始類型的堆訪問，因此經過驗證的 asm.js 代碼可以以可預測的性能運行。我們發佈了新版本的 Octane， [Octane 2.0](https://blog.chromium.org/2013/11/announcing-octane-20.html)，更新了現有的基準測試，並新增了一些針對 asm.js 等使用案例的測試。Octane 促進了新的編譯器優化技術的發展，例如 [分配摺疊](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/42478.pdf) 和 [基於分配位置的類型過渡和預分配的優化](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/43823.pdf)，這些技術大幅提升了性能峰值。作為我們內部稱為“Handlepocalypse”的改造努力的一部分，V8 Handle API 被完全重寫，以使其更易於正確和安全地使用。同樣在 2013 年，Chrome 的 JavaScript `TypedArray` 實現從 Blink 移至 V8。[相關資訊](https://codereview.chromium.org/13064003)。

在 **2014** 年，V8 將部分即時編譯工作移出主線程，實現了[並行編譯](https://blog.chromium.org/2014/02/compiling-in-background-for-smoother.html)，大幅降低了卡頓並顯著提高了性能。同年晚些時候，我們 [上線](https://github.com/v8/v8/commit/a1383e2250dc5b56b777f2057f1600537f02023e) 了一個名為 TurboFan 的新優化編譯器的初始版本。與此同時，我們的合作夥伴幫助將 V8 移植到三種新的指令集架構：PPC、MIPS64 和 ARM64。隨著 Chromium 的腳步，V8 過渡到了另一個構建系統 [GN](https://gn.googlesource.com/gn/#gn)。V8 測試基礎設施得到了顯著改進，現在提供了 _Tryserver_，可在各種構建機器上測試每個補丁後再提交。版本控制方面，V8 從 SVN 遷移到了 Git。

**2015** 年對於 V8 來說是多方面工作非常忙碌的一年。我們實現了[代碼快取和腳本流](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html)，顯著加快了網頁加載時間。我們運行時系統中使用分配備註的工作被發表在 [ISMM 2015](https://ai.google/research/pubs/pub43823)。同年晚些時候，我們[啟動了](https://github.com/v8/v8/commit/7877c4e0c77b5c2b97678406eab7e9ad6eba4a4d)一個名為 Ignition 的新解釋器的開發。我們嘗試了使用 [強模式](https://docs.google.com/document/d/1Qk0qC4s_XNCLemj42FqfsRLp49nDQMZ1y7fwf5YjaI4/view) 子集化 JavaScript 的想法，以實現更強的保證和更可預測的性能。我們在一個標誌後面實現了強模式，但後來發現它的好處並不值得成本。新增的[提交隊列](https://dev.chromium.org/developers/testing/commit-queue) 將生產力和穩定性大大提升。V8 的垃圾回收器也開始與 Blink 等嵌入器合作，以便在空閑時間安排垃圾回收工作。[空閒時間垃圾回收](/blog/free-garbage-collection) 显著減少了可見的垃圾回收卡頓並降低了內存消耗。12 月，[第一個 WebAssembly 原型](https://github.com/titzer/v8-native-prototype) 在 V8 中上線。

在**2016**年，我們完成了 ES2015（以前稱為“ES6”）功能集的最後幾個部分（包括 promises、class 語法、詞法作用域、解構賦值等）以及一些 ES2016 功能。我們還開始推廣新的 Ignition 和 TurboFan 管線，利用它來[編譯並優化 ES2015 和 ES2016 功能](/blog/v8-release-56)，並將 Ignition 默認用於[低端 Android 設備](/blog/ignition-interpreter)。我們在空閒時間垃圾回收方面的成功工作被展示在[PLDI 2016](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/45361.pdf)。我們啟動了[Orinoco 專案](/blog/orinoco)，這是一個新的主要並行和並發垃圾回收器，旨在減少主線程的垃圾回收時間。在重大調整中，我們將性能優化的重點從合成的微基準測試轉向嚴肅衡量和優化[真實世界性能](/blog/real-world-performance)。為了調試，V8 檢查器從 Chromium [遷移到](/blog/v8-release-55) V8，允許任何嵌入 V8 的程序（而不僅僅是 Chromium）使用 Chrome DevTools 調試在 V8 中運行的 JavaScript。WebAssembly 原型從原型階段進化到實驗支持，並與其他瀏覽器廠商協同推出[WebAssembly 的實驗支持](/blog/webassembly-experimental)。V8 獲得了[ACM SIGPLAN 編程語言軟體獎](http://www.sigplan.org/Awards/Software/)。並且添加了一個新的移植版本：S390。

在**2017**年，我們終於完成了對引擎長達多年的全面改造，並默認啟用了新的[Ignition 和 TurboFan](/blog/launching-ignition-and-turbofan)管線。這使得我們可以隨後從代碼庫中刪除 Crankshaft（[130,380 行被刪除的代碼](https://chromium-review.googlesource.com/c/v8/v8/+/547717)）和[Full-codegen](https://chromium-review.googlesource.com/c/v8/v8/+/584773)。我們推出了 Orinoco v1.0，包括[並行標記](/blog/concurrent-marking)、並行清理、平行回收和並行壓縮。我們正式認可 Node.js 成為與 Chromium 並列的 V8 一級嵌入程序。從那時起，如果任何 V8 修補程式破壞了 Node.js 測試套件，那麼該修補程式無法上線。我們的基礎設施增加了對正確性模糊測試的支持，確保任何代碼無論在哪種配置下運行都能生成一致的結果。

在一個業界協調的發佈中，V8[默認啟用了 WebAssembly](/blog/v8-release-57)。我們實現了對[JavaScript 模塊](/features/modules)的支持，以及完整的 ES2017 和 ES2018 功能集（包括 async 函數、共享記憶體、async 迭代、rest/spread 屬性和正則表達式功能）。我們推出了[JavaScript 原生代碼覆蓋支持](/blog/javascript-code-coverage)，並推出了[Web Tooling Benchmark](/blog/web-tooling-benchmark)，幫助我們測量 V8 的優化對開發者實際工具及其產生的 JavaScript 的性能影響。[包裝器追蹤技術](/blog/tracing-js-dom)實現了從 JavaScript 對象到 C++ DOM 對象以及回程的轉換，解決了 Chrome 長期的內存洩漏問題，並有效處理了在 JavaScript 和 Blink 堆上的對象的傳遞閉包。我們隨後使用這一基礎設施來增強堆內存快照開發工具的能力。

**2018**年，一次全行業範圍內的安全事件推翻了我們對 CPU 信息安全的理解，即[幽靈/Spectre 和熔斷/Meltdown 漏洞](https://googleprojectzero.blogspot.com/2018/01/reading-privileged-memory-with-side.html)的公開披露。V8 工程師進行了廣泛的進攻性研究，以幫助了解對受管語言的威脅並開發緩解措施。V8 推出了針對幽靈和類似的側信道攻擊的[緩解措施](/docs/untrusted-code-mitigations)，以供運行不受信任代碼的嵌入程序使用。

最近，我們為 WebAssembly 推出了一個名為[Liftoff](/blog/liftoff)的基線編譯器，顯著減少了 WebAssembly 應用的啟動畫面時間，同時仍能實現可預測的性能。我們推出了[`BigInt`](/blog/bigint)，一個新的 JavaScript 原語，支持[任意精度整數](/features/bigint)。我們實現了[嵌入的內建函數](/blog/embedded-builtins)，並使其可以[懶加載反序列化](/blog/lazy-deserialization)，顯著減少了多個隔離環境（Isolates）的 V8 佔用空間。我們使得能夠在[後台線程上編譯腳本字節碼](/blog/background-compilation)。我們啟動了[統一的 V8-Blink 堆專案](https://docs.google.com/presentation/d/12ZkJ0BZ35fKXtpM342PmKM5ZSxPt03_wsRgbsJYl3Pc)，旨在同步進行跨組件的 V8 和 Blink 垃圾回收。而這一年還沒有結束…

## 性能的起伏

Chrome 的 V8 Bench 分數在過去幾年中顯示了 V8 變更對性能的影響。（我們使用 V8 Bench，因為它是少數可以在原始版本 Chrome beta 中執行的基準之一。）

![2008 到 2018 年間 Chrome 的 [V8 Bench](http://www.netchain.com/Tools/v8/) 分數](/_img/10-years/v8-bench.svg)

在過去十年間，我們在此基準測試中的分數提高了 **4 倍**！

然而，您可能注意到多年來有兩次性能下降。這兩次都很有趣，因為它們對應著 V8 歷史上的重要事件。2015 年的性能下降發生在 V8 啟動 ES2015 功能的基線版本時。這些功能在 V8 代碼庫中交叉影響，我們因此將初始發佈的重點放在正確性上，而不是性能上。我們接受了這些輕微的速度回退，以便盡快將功能交給開發者使用。在 2018 年初，幽靈漏洞被披露，V8 推出了緩解措施以保護用戶免受潛在漏洞的影響，導致性能再次回退。幸運的是，現在 Chrome 已經推出[網站隔離](https://developers.google.com/web/updates/2018/07/site-isolation)，我們可以再次停用緩解措施，讓性能回到相應水平。

另一個從此圖表中學到的點是，它在 2013 年左右開始趨於平緩。這是否意味著 V8 放棄了並停止了性能投資？恰恰相反！圖表平緩的部分代表了 V8 團隊從合成微型基準測試（例如 V8 Bench 和 Octane）轉向優化 [真實世界性能](/blog/real-world-performance)。V8 Bench 是一個舊的基準測試，既未使用任何現代 JavaScript 特性，也未近似於實際的真實世界生產代碼。與較新的 Speedometer 基準套件形成對比：

![Chrome 的 [Speedometer 1](https://browserbench.org/Speedometer/) 成績從 2013 年到 2018 年](/_img/10-years/speedometer-1.svg)

儘管 V8 Bench 從 2013 年到 2018 年的改進很小，但我們的 Speedometer 1 成績在同一時期內增長了（又）**4 倍**。（我們使用 Speedometer 1，因為 Speedometer 2 使用了 2013 年尚未支持的現代 JavaScript 特性。）

如今，我們擁有 [更好的](/blog/speedometer-2) [基準測試](/blog/web-tooling-benchmark)，能更準確地反映現代 JavaScript 應用程序。此外，我們還 [主動測量並優化現有的 Web 應用](https://www.youtube.com/watch?v=xCx4uC7mn6Y)。

## 摘要

雖然 V8 最初是為 Google Chrome 建立的，但它一直都是一個獨立的項目，擁有單獨的代碼庫和嵌入式 API，使任何程序都可以使用其 JavaScript 執行服務。在過去的十年中，項目的開放性性質使其成為不僅僅是 Web 平台的一個關鍵技術，也適用於像 Node.js 這樣的其他場景。在此過程中，項目發展壯大並在面對許多變化和劇烈增長中仍然保持其相關性。

起初，V8 只支持兩個指令集。在過去的十年中，支持的平台列表達到了八個：ia32、x64、ARM、ARM64、32 位和 64 位 MIPS、64 位 PPC 以及 S390。V8 的構建系統從 SCons 遷移到 GYP，再到 GN。項目從丹麥搬到德國，現在擁有遍佈全球的工程師，包括倫敦、山景城和舊金山，並且有來自 Google 以外更多地方的貢獻者。我們將整個 JavaScript 編譯管道從未命名的組件轉變為 Full-codegen（一個基線編譯器）和 Crankshaft（基於反饋的優化編譯器），再到 Ignition（一個解釋器）和 TurboFan（更好的基於反饋的優化編譯器）。V8 從“僅僅”是一個 JavaScript 引擎發展到也支持 WebAssembly。JavaScript 語言本身從 ECMAScript 3 發展到 ES2018；最新的 V8 甚至實現了後 ES2018 的特性。

Web 的故事弧線是一個漫長而持久的過程。慶祝 Chrome 和 V8 十週年是一個很好的機會來反思，儘管這是一個重要的里程碑，但 Web 平台的敘述已持續了超過 25 年。我們毫無疑問 Web 的故事未來至少還會持續那麼久。我們承諾確保 V8、JavaScript 和 WebAssembly 繼續成為這些敘述中的有趣角色。我們期待看到未來十年會帶來什麼。請期待！
