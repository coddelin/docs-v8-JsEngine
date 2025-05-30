---
title: "高性能的 C++ 垃圾回收"
author: "Anton Bikineev、Omer Katz（[@omerktz](https://twitter.com/omerktz)）及 Michael Lippautz（[@mlippautz](https://twitter.com/mlippautz)），C++ 記憶體專家"
avatars: 
  - "anton-bikineev"
  - "omer-katz"
  - "michael-lippautz"
date: 2020-05-26
tags: 
  - internals
  - memory
  - cppgc
description: "本文介紹了 Oilpan C++ 垃圾回收器，它在 Blink 中的使用，以及如何優化垃圾回收（即回收不可達記憶體）。"
tweet: "1265304883638480899"
---

我們之前已多次撰文討論過[JavaScript 的垃圾回收](https://v8.dev/blog/trash-talk)、[文件物件模型 (DOM)](https://v8.dev/blog/concurrent-marking) 及[其在 V8 中的實現及優化](https://v8.dev/blog/tracing-js-dom)。然而，Chromium 中並不全是 JavaScript，瀏覽器本身及 V8 所嵌套的 Blink 渲染引擎大多數使用 C++ 編寫。JavaScript 可用於操作 DOM，而後者由渲染管線進行處理。

<!--truncate-->
由於圍繞 DOM 的 C++ 物件圖與 JavaScript 對象高度纏結，Chromium 團隊幾年前切換到了名為 [Oilpan](https://www.youtube.com/watch?v=_uxmEyd6uxo) 的垃圾回收器來管理此類記憶體。Oilpan 是用 C++ 編寫的垃圾回收器，用於管理 C++ 記憶體，並可以通過 [跨組件追踪](https://research.google/pubs/pub47359/) 與 V8 連接，將纏結的 C++/JavaScript 物件圖作為一個堆處理。

本文是 Oilpan 系列部落格的第一篇，將概述 Oilpan 的 核心原理及其 C++ API。本篇主要介紹 Oilpan 支援的一些特性，說明它們如何與垃圾回收器的各子系統交互，並深入探討如何在掃描階段同時回收對象。

更令人興奮的是，Oilpan 目前已在 Blink 中實現，但正以[垃圾回收庫](https://chromium.googlesource.com/v8/v8.git/+/HEAD/include/cppgc/) 的形式遷移到 V8 中。目標是讓 C++ 的垃圾回收對所有 V8 嵌入者及更多 C++ 開發者更易使用。

## 背景

Oilpan 實現了一種 [標記-清掃](https://en.wikipedia.org/wiki/Tracing_garbage_collection) 的垃圾回收器，其中垃圾回收分為兩個階段：*標記* 階段掃描管理堆的活動對象，*清掃* 階段回收管理堆的死對象。

我們已在介紹 [V8 中的並行標記](https://v8.dev/blog/concurrent-marking) 時介紹了標記的基本概念。簡單地說，掃描所有對象以找到活動對象可以看作是一種圖形遍歷，其中對象是節點，對象間的指標是邊。遍歷從根開始，根包括暫存器、本地執行棧（以下簡稱棧）及其他全域變數，具體如[此處所描述](https://v8.dev/blog/concurrent-marking#background)。

在這一點上，C++ 並不比 JavaScript 有什麼不同。不過，相較於 JavaScript，C++ 對象是靜態類型的，因此無法在運行時改變其表示形式。透過 Oilpan 管理的 C++ 對象利用了這一事實，並通過訪問者模式提供對其他對象（圖中的邊）的指標描述。用於描述 Oilpan 對象的基本模式如下：

```cpp
class LinkedNode final : public GarbageCollected<LinkedNode> {
 public:
  LinkedNode(LinkedNode* next, int value) : next_(next), value_(value) {}
  void Trace(Visitor* visitor) const {
    visitor->Trace(next_);
  }
 private:
  Member<LinkedNode> next_;
  int value_;
};

LinkedNode* CreateNodes() {
  LinkedNode* first_node = MakeGarbageCollected<LinkedNode>(nullptr, 1);
  LinkedNode* second_node = MakeGarbageCollected<LinkedNode>(first_node, 2);
  return second_node;
}
```

在上面的例子中，`LinkedNode` 由 Oilpan 管理，這表現在繼承了 `GarbageCollected<LinkedNode>`。當垃圾回收器處理一個對象時，通過調用該對象的 `Trace` 方法來發現導出指標。Oilpan 提供了一個名為 `Member` 的智慧指標，其語法與如 `std::shared_ptr` 相似，用於在標記過程中維護圖的連續狀態。這一切使 Oilpan 能夠精確知道其管理的對象中哪裡有指標。

資深讀者可能注意到~~並可能會感到害怕~~，在上述範例中 `first_node` 和 `second_node` 被以原生 C++ 指標的形式存放在堆疊中。Oilpan 在處理根時，僅依賴保守堆疊掃描來尋找指向其託管堆的指標，而不在操作堆疊上新增抽象層。這是通過逐字掃描堆疊並將這些字解釋為指向託管堆的指標來實現的。這意味著 Oilpan 不會對存取堆疊分配的物件施加性能損耗，而是將成本移至垃圾回收時，保守地掃描堆疊。集成至渲染器中的 Oilpan 會嘗試延遲垃圾回收，直到進入無有趣堆疊的狀態為止。由於網頁是基於事件的，執行由事件循環中的任務處理驅動，因此這樣的機會很豐富。

Oilpan 使用於 Blink，這是一個擁有大量成熟代碼的大型 C++ 代碼庫，因此它還支援以下功能：

- 透過混合和指向這些混合的引用實現多重繼承（內部指標）。
- 在執行建構函數期間觸發垃圾回收。
- 通過被視為根的 `Persistent` 智能指標從非託管記憶體中保持物件存活。
- 包括順序（例如向量）和關聯（例如集合和映射）容器的集合，並壓縮集合後援。
- 弱引用、弱回調和[Ephemeron](https://en.wikipedia.org/wiki/Ephemeron)。
- 在回收個別物件之前執行的最終回調。

## C++ 的掃除

敬請期待另一篇介紹 Oilpan 標記工作詳細機制的部落格文章。在本篇文章中，我們假設標記已經完成，並且 Oilpan 通過 `Trace` 方法發現了所有可訪問的物件。在標記階段結束後，所有可訪問物件的標記位元都已設置。

掃除階段是回收已死物件（標記過程中無法訪問的物件）的階段，其底層記憶體要麼返回操作系統，要麼可供後續分配使用。在以下內容中，我們將展示 Oilpan 的掃除器如何運作，既從使用和限制的角度，也從如何實現高回收吞吐量的角度。

掃除器通過遍歷堆記憶體並檢查標記位元來尋找已死物件。為了維護 C++ 語義，掃除器在釋放物件記憶體之前，必須調用每個已死物件的析構函數。非平凡的析構函數實現為最終化器（finalizer）。

從程序員的角度來看，析構函數的執行順序是未定義的，因為掃除器使用的遍歷不考慮構造順序。這對最終化器施加了限制，即它們不得訪問其他堆內物件。對於需要最終化順序的用戶代碼來說，這是一個常見的挑戰，因為托管語言通常不支援其最終化語義中的順序（例如 Java）。Oilpan 使用一個 Clang 插件，靜態驗證（以及其他許多檢查）在一個物件銷毀期間沒有訪問任何堆內物件：

```cpp
class GCed : public GarbageCollected<GCed> {
 public:
  void DoSomething();
  void Trace(Visitor* visitor) {
    visitor->Trace(other_);
  }
  ~GCed() {
    other_->DoSomething();  // 錯誤：最終化器 '~GCed' 訪問了
                            // 可能已被最終化的欄位 'other_'。
  }
 private:
  Member<GCed> other_;
};
```

對於感興趣的讀者：Oilpan 提供預先最終化回調，用於在物件銷毀之前需要訪問堆的複雜用例。然而，這些回調比每次垃圾回收週期中的析構函數增加了更多的開銷，因此在 Blink 中僅偶爾使用。

## 增量和並行掃除

現在我們已經討論了托管 C++ 環境中析構函數的限制，接下來是深入了解 Oilpan 如何實現和優化掃除階段。

在深入細節之前，重要的是回顧一下網頁程序的執行方式。任何執行，例如 JavaScript 程序甚至垃圾回收，都是由主線程在[事件循環](https://en.wikipedia.org/wiki/Event_loop)中調度任務驅動的。渲染器與其他應用環境類似，支援背景任務以協助處理主線程的工作。

最初，為了簡化實現，Oilpan 實現了全停掃除（stop-the-world sweeping），這在垃圾回收最終化暫停期間執行，會中斷主線程上的應用執行：

![停止世界掃除](/_img/high-performance-cpp-gc/stop-the-world-sweeping.svg)

對於具有軟實時約束的應用，垃圾回收中的決定性因素是延遲。全停掃除可能帶來顯著的暫停時間，從而導致使用者可見的應用延遲。為了下一步減少延遲，掃除被實現為增量式：

![增量掃除](/_img/high-performance-cpp-gc/incremental-sweeping.svg)

使用增量方式，清除作業會被拆分並分配給額外的主執行緒任務。在最佳情況下，此類任務會在[閒置時間](https://research.google/pubs/pub45361/)中完全執行，避免干擾任何常規應用程式執行。在內部，清理器根據頁面的概念將工作劃分為較小的單位。頁面可以有兩種重要狀態：*待清理*頁面（清理器尚需處理）以及*已清理*頁面（清理器已處理完畢）。記憶體分配僅考慮已清理頁面，並且將從維護可用記憶體塊清單的自由清單中補充本地分配緩衝區（LAB）。在從自由清單獲取記憶體時，應用程式首先會嘗試在已清理頁面中尋找記憶體，然後透過將清理算法內嵌到分配程式中來幫助處理待清理頁面，只有在完全沒有可用的情況下才向作業系統請求新記憶體。

Oilpan多年前已經使用了增量清理技術，但隨著應用程式及其生成的物件圖越來越大，清理開始影響應用程式效能。為了改善增量清理，我們開始利用背景任務來並發回收記憶體。以下是用來避免並發清理和應用程式分配新物件之間資料競爭的兩個基本不變性：

- 清理器僅處理無效記憶體，根據定義，這些記憶體無法被應用程式訪問。
- 應用程式僅在已清理頁面上進行分配，根據定義，這些頁面不再被清理器處理。

這兩個不變性確保物件及其記憶體不會有競爭。不幸的是，C++嚴重依賴作為終結器實現的析構函數。Oilpan要求終結器在主執行緒上執行，以幫助開發人員並消除應用程式程式碼本身的資料競爭。為了解決這個問題，Oilpan將對象的終結延遲到主執行緒上進行。更具體地說，每當並發清理器遇到具有終結器（析構函數）的物件時，它會將其推送到一個終結佇列中，該佇列將在一個單獨的終結階段中處理，這個階段始終在同時運行應用程式的主執行緒上執行。使用並發清理的整體工作流程如下：

![使用背景任務進行並發清理](/_img/high-performance-cpp-gc/concurrent-sweeping.svg)

由於終結器可能需要訪問物件的全部有效負載，將相應的記憶體添加到自由清單的操作會延遲到執行終結器之後。如果不執行任何終結器，運行在背景執行緒上的清理器會立即將回收到的記憶體添加到自由清單。

# 結果

背景清理已在Chrome M78中推出。我們的[實際環境基準框架](https://v8.dev/blog/real-world-performance)顯示，主執行緒清理時間減少了25%-50%（平均42%）。請參見以下選定的項目：

![主執行緒清理時間（單位毫秒）](/_img/high-performance-cpp-gc/results.svg)

主執行緒剩下的時間主要用於執行終結器。目前正在針對Blink中大量實例化的物件類型來減少終結器的工作。令人興奮的部分在於，所有這些優化都是在應用程式程式碼中完成的，因為清理會在沒有終結器的情況下自動調整。

請關注有關C++垃圾回收（Garbage Collection）的更多文章，以及Oilpan庫更新的特別報導，隨著時間推進，我們將逐漸推出可供所有V8用戶使用的版本。
