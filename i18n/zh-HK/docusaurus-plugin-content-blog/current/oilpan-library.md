---
title: "Oilpan 圖書館"
author: "Anton Bikineev, Omer Katz ([@omerktz](https://twitter.com/omerktz)), 和 Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz)), 高效能與有效的檔案搬運者"
avatars:
  - anton-bikineev
  - omer-katz
  - michael-lippautz
date: 2021-11-10
tags:
  - internals
  - memory
  - cppgc
description: "V8 附帶經由 Oilpan 的垃圾回收圖書館來管理 C++ 記憶體。"
tweet: "1458406645181165574"
---

雖然這篇文章的標題可能暗示我們要深入探討關於油底殼的書籍集合——考慮到油底殼的建造規範，這是一個有著驚人文獻的話題——但實際上我們會更深入探討 Oilpan，一個由 V8 作為圖書館自 V8 v9.4 起托管的 C++ 垃圾回收器。

<!--truncate-->
Oilpan 是 [基於追蹤的垃圾回收器](https://en.wikipedia.org/wiki/Tracing_garbage_collection)，這意味著它透過在標記階段遍歷物件圖來決定活物件。在掃描階段則回收死亡物件，我們曾在 [過去的博客文章](https://v8.dev/blog/high-performance-cpp-gc) 中探討過。這兩個階段可以交替進行或與實際的 C++ 應用程式程式碼並行運行。堆物件的引用處理是精確的，而原生堆疊則是保守的。這意味著 Oilpan 知道堆疊上的引用位置，但在掃描記憶體中的隨機位元序列時必須假設它們代表指標。當垃圾回收在沒有原生堆疊的情況下運行時，Oilpan 也支持某些物件的壓縮（碎片整理）。

那麼，通過 V8 提供它作為一個圖書館是怎麼回事呢？

Blink，作為從 WebKit 分叉的專案，原本使用引用計數，[一個眾所周知的 C++ 程式編寫范例](https://en.cppreference.com/w/cpp/memory/shared_ptr)，來管理其堆內存。引用計數本應可以解決記憶體管理問題，但由於循環問題已知容易造成記憶體洩漏。除此之外，Blink 還遇到了 [使用後釋放問題](https://en.wikipedia.org/wiki/Dangling_pointer)，因為有時為了性能會省略引用計數。Oilpan 初期的開發來源於 Blink，以簡化程式編寫模型，並解決內存洩漏與使用後釋放問題。我們相信 Oilpan 成功簡化了模型，也使程式碼更加安全。

另一個可能不太明顯的在 Blink 引入 Oilpan 的原因是幫助整合進其他垃圾回收系統，例如 V8。最終 Materialized 是實現了 [統一 JavaScript 和 C++ 堆](https://v8.dev/blog/tracing-js-dom)，其中 Oilpan 處理了 C++ 物件[^1]。隨著越來越多的物件層次結構被管理以及跟 V8 整合得更好，Oilpan 隨時間變得越來越複雜，團隊意識到他們正在重新設計 V8 垃圾回收器中的相同概念並解決同樣的問題。Blink 的整合需要建立大約 30k 目標來實際進行統一堆的垃圾回收測試中的 Hello World。

2020 年初，我們開始踏上將 Blink 中的 Oilpan 獨立並封裝成圖書館的旅程。我們決定將程式碼托管於 V8，盡可能重用抽象並對垃圾回收介面進行一些徹底清理。除了修復之前提到的所有問題，[一個圖書館](https://docs.google.com/document/d/1ylZ25WF82emOwmi_Pg-uU6BI1A-mIbX_MG9V87OFRD8/)也可以使其他專案能使用垃圾回收的 C++。我們在 V8 v9.4 中推出了該圖書館，並在 Chromium M94 中啟用了 Blink。

## 包裝箱裡有什麼？

類似於 V8 的其他部分，Oilpan 現在提供了 [穩定的 API](https://chromium.googlesource.com/v8/v8.git/+/HEAD/include/cppgc/)，嵌入者可以依靠常規的 [V8 惯例](https://v8.dev/docs/api)。例如，這意味著 API 是適當地被記錄的（請參考 [GarbageCollected](https://chromium.googlesource.com/v8/v8.git/+/main/include/cppgc/garbage-collected.h#17)），並且在它們要被移除或者修改的情況下會經歷退役期。

Oilpan 的核心功能可以作為獨立的 C++ 垃圾回收器，在 `cppgc` 命名空間中使用。該設置還允許重用現有的 V8 平臺來創建受管理的 C++ 對象的堆。垃圾回收可以配置為自動運行，與任務基礎設施集成，或者可以顯式觸發並考慮本地堆棧。目的是允許嵌入者僅管理 C++ 對象，無需完全處理 V8，參見此 [hello world 程式](https://chromium.googlesource.com/v8/v8.git/+/main/samples/cppgc/hello-world.cc) 作為範例。這種配置的嵌入者是 PDFium，其使用 Oilpan 的獨立版本來[保護 XFA](https://groups.google.com/a/chromium.org/g/chromium-dev/c/RAqBXZWsADo/m/9NH0uGqCAAAJ?utm_medium=email&utm_source=footer)，允許更動態的 PDF 內容。

方便的是，Oilpan 核心的測試使用這個設置，這意味著構建和運行特定的垃圾回收測試僅需幾秒鐘。截至今天，存在 [>400 個此類單元測試](https://source.chromium.org/chromium/chromium/src/+/main:v8/test/unittests/heap/cppgc/) 用於 Oilpan 核心。該設置還用作實驗和試驗新事物的遊樂場，也可用於驗證原始性能假設。

Oilpan 庫還負責處理 C++ 對象，當通過 V8 使用統一堆運行時，它允許完全交織 C++ 和 JavaScript 對象圖形。該配置用於 Blink 中管理 DOM 的 C++ 記憶體及更多。Oilpan 還公開了一種特性系統，允許使用具有特定需求以確定存活性的類型擴展垃圾回收器核心。藉此方式，Blink 可以提供自己的收集庫，甚至可以在 C++ 中構建類似 JavaScript 的短暫映射 ([`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap))。我們不建議每個人都使用此功能，但它顯示了該系統在需要自訂時的能力。

## 我們的目標是甚麼？

Oilpan 庫為我們提供了一個可以用來提升性能的堅實基礎。在過去，我們需要在 V8 的公共 API 上專門指出垃圾回收特定功能以與 Oilpan 互動，而現在我們可以直接實現所需功能。這允許快速迭代，也可以在可能的情況下採取捷徑並提升性能。

我們還看到直接通過 Oilpan 提供某些基本容器的潛力，以避免重新發明輪子。這將使其他嵌入者受益於先前專門為 Blink 創建的數據結構。

看到 Oilpan 的光明未來，我們想提到現有的 [`EmbedderHeapTracer`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-embedder-heap.h;l=75) API 不會進一步改進，並可能在某些時候被棄用。假設嵌入者使用這些 API 已經實現了自己的追踪系統，遷移到 Oilpan 幾乎只需在新創建的 [Oilpan 堆](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-cppgc.h;l=91) 上分配 C++ 對象，然後將其附加到 V8 隔離體。用於建模引用的現有基礎設施，例如 [`TracedReference`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-traced-handle.h;l=334)（指向 V8 的引用）和[內部字段](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-object.h;l=502)（從 V8 外出的引用），都受到 Oilpan 的支持。

敬請期待未來更多垃圾回收改進！

遇到問題或有建議？請告訴我們：

- [oilpan-dev@chromium.org](mailto:oilpan-dev@chromium.org)
- Monorail: [Blink>GarbageCollection](https://bugs.chromium.org/p/chromium/issues/entry?template=Defect+report+from+user&components=Blink%3EGarbageCollection) (Chromium), [Oilpan](https://bugs.chromium.org/p/v8/issues/entry?template=Defect+report+from+user&components=Oilpan) (V8)

[^1]: 在 [研究文章](https://research.google/pubs/pub48052/) 中找到有關跨組件垃圾回收的更多信息。
