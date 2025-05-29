---
title: &apos;卡頓克星第一部分&apos;
author: &apos;卡頓克星: Jochen Eisinger、Michael Lippautz 和 Hannes Payer&apos;
avatars:
  - &apos;michael-lippautz&apos;
  - &apos;hannes-payer&apos;
date: 2015-10-30 13:33:37
tags:
  - memory
description: &apos;這篇文章討論了在 Chrome 41 和 Chrome 46 之間實現的一些優化，這些優化顯著減少了垃圾回收滯後，從而提高了用戶體驗。&apos;
---
卡頓，或者說明顯的卡頓，可以在 Chrome 沒有在 16.66 毫秒內渲染一帧（打斷 60 幀每秒的流暢運動）時被注意到。目前，大多數的 V8 垃圾回收工作都在主渲染執行緒上執行，見圖1，當需要維護過多對象時，往往會導致卡頓。消除卡頓一直是 V8 團隊的首要任務（[1](https://blog.chromium.org/2011/11/game-changer-for-interactive.html)、[2](https://www.youtube.com/watch?v=3vPOlGRH6zk)、[3](/blog/free-garbage-collection)）。這篇文章討論了在 Chrome 41 和 Chrome 46 之間實現的一些優化，這些優化顯著減少了垃圾回收滯後，從而提高了用戶體驗。

<!--truncate-->
![圖1: 在主執行緒上執行垃圾回收](/_img/jank-busters/gc-main-thread.png)

垃圾回收期間造成卡頓的一個主要來源是處理各種簿記數據結構。許多這些數據結構支持的優化與垃圾回收無關。兩個例子是所有 ArrayBuffer 的列表以及每個 ArrayBuffer 的視圖列表。這些列表允許高效實現 DetachArrayBuffer 操作而不對 ArrayBuffer 視圖的訪問性能造成任何損失。然而，在某些情況下，如果一個網頁創建了數百萬個 ArrayBuffer（比如基於 WebGL 的遊戲），在垃圾回收期間更新這些列表會造成顯著的卡頓。在 Chrome 46 中，我們移除了這些列表，而是通過在每次加載和存儲到 ArrayBuffer 時插入檢查來檢測分離的緩衝區。這將遍漏在垃圾回收期間遍歷大簿記列表的成本分攤到程式執行過程中，從而減少了卡頓。儘管每次訪問的檢查理論上可能會減慢大量使用 ArrayBuffer 的程式的吞吐量，但在實踐中，V8&apos;s 優化編譯器通常可以消除冗餘檢查並將剩餘的檢查提升到循環之外，從而實現更流暢的執行輪廓，幾乎不會帶來整體性能損失。

另一個卡頓來源是跟蹤 Chrome 和 V8 之間共享對象生命周期所涉及的簿記工作。雖然 Chrome 和 V8 的記憶體堆是分開的，但它們必須針對某些對象（如 DOM 節點）進行同步，這些對象在 Chrome 的 C++ 代碼中實現，但可以從 JavaScript 訪問。V8 創建了一個稱為句柄的不透明數據類型，允許 Chrome 操作 V8 堆對象而無需了解其實現細節。對象的生命周期與句柄綁定: 只要 Chrome 保留該句柄，V8 的垃圾回收器就不會丟棄該對象。V8 為它返回給 Chrome 的每個句柄創建一個稱為“全局引用”的內部數據結構，而這些全局引用是告訴 V8 的垃圾回收器該對象仍然存活的依據。對於 WebGL 遊戲，Chrome 可能會創建數百萬個這樣的句柄，V8 反過來需要創建相應的全局引用來管理它們的生命周期。在主垃圾回收暫停期間處理如此大量的全局引用會導致可察覺的卡頓。幸運的是，傳遞到 WebGL 的對象通常只是傳遞而實際上從未被修改，這使得簡單的靜態[逃逸分析](https://en.wikipedia.org/wiki/Escape_analysis)成為可能。實質上，對於通常只需小陣列作為參數的 WebGL 函數，基礎數據被複製到堆棧上，使全局引用變得多餘。這種混合方法的結果是，渲染密集型 WebGL 遊戲的暫停時間減少了最多 50%。

V8 的大多數垃圾回收是在主渲染執行緒上執行的。將垃圾回收操作移至並發執行緒減少了垃圾回收器的等待時間，進一步減少了卡頓。由於主 JavaScript 應用和垃圾回收器可能同時觀察和修改相同的對象，這是一項本質上複雜的任務。到目前為止，並發性僅限於清掃普通對象 JS 堆的老生代。最近，我們還實現了對 V8 堆的代碼和地圖空間的並發清掃。此外，我們實現了未使用頁面的並發解除映射，以減少主執行緒必須執行的工作，見圖2。

![圖 2：在並行垃圾回收線程上執行的一些垃圾回收操作。](/_img/jank-busters/gc-concurrent-threads.png)

上述優化的影響在基於 WebGL 的遊戲中清晰可見，例如 [Turbolenz 的 Oort Online 演示](http://oortonline.gl/)。以下視頻比較了 Chrome 41 和 Chrome 46:

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/PgrCJpbTs9I" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

我們目前正在將更多的垃圾回收組件製作成增量式、並行和並發，以進一步縮短主線程上的垃圾回收暫停時間。敬請期待，我們還有一些有趣的修補正在進行中。
