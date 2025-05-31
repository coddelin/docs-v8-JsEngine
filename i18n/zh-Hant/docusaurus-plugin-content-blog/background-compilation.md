---
title: "背景編譯"
author: "[Ross McIlroy](https://twitter.com/rossmcilroy)，主執行緒捍衛者"
avatars: 
  - "ross-mcilroy"
date: "2018-03-26 13:33:37"
tags: 
  - internals
description: "自 Chrome 66 起，V8 在背景執行緒上編譯 JavaScript 原始碼，減少主執行緒上的編譯時間，對於典型網站來說降低了 5% 到 20%。"
tweet: "978319362837958657"
---
TL;DR: 自 Chrome 66 起，V8 在背景執行緒上編譯 JavaScript 原始碼，減少主執行緒上的編譯時間，對於典型網站來說降低了 5% 到 20%。

## 背景

自版本 41 起，Chrome 支援透過 V8 的 [`StreamedSource`](https://cs.chromium.org/chromium/src/v8/include/v8.h?q=StreamedSource&sq=package:chromium&l=1389) API 在背景執行緒上解析 JavaScript 原始檔案（[新技術介紹](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html)）。這使得 V8 能夠在 Chrome 從網路下載檔案的第一部分後立即開始解析 JavaScript 原始碼，並在 Chrome 通過網路串流檔案時並行進行解析。透過此方式，V8 幾乎可以在檔案下載完成時完成 JavaScript 的解析，從而顯著提升加載速度。

<!--truncate-->
然而，由於 V8 原有的基線編譯器的限制，V8 仍需要返回主執行緒以完成解析並將腳本編譯成執行腳本代碼的 JIT 機器碼。透過切換到我們新的 [Ignition + TurboFan 編譯管線](/blog/launching-ignition-and-turbofan)，我們現在可以將字節碼編譯轉移到背景執行緒，從而釋放 Chrome 的主執行緒，使網頁瀏覽體驗更加流暢且響應更迅速。

## 建立背景執行緒字節碼編譯器

V8 的 Ignition 字節碼編譯器將解析器生成的 [抽象語法樹（AST）](https://en.wikipedia.org/wiki/Abstract_syntax_tree) 作為輸入，並生成字節碼流（`BytecodeArray`）及相關的元數據，這使得 Ignition 解釋器能夠執行 JavaScript 原始碼。

![](/_img/background-compilation/bytecode.svg)

Ignition 的字節碼編譯器是以多執行緒為目標而設計的，但為了實現背景編譯，需要對整個編譯管線進行一些改動。其中一個主要改動是防止編譯管線在背景執行緒上運行時訪問 V8 JavaScript 堆中的物件。由於 JavaScript 是單執行緒的，V8 堆中的物件不是執行緒安全的，在背景編譯期間可能會被主執行緒或 V8 的垃圾收集器修改。

在編譯管線中有兩個主要階段會訪問 V8 堆中的物件： AST 內部化以及字節碼完成。AST 內部化是一個過程，在解析器生成 AST 後，將識別出的字面物件（字串、數字、物件字面樣板等）分配到 V8 堆，以便在執行腳本時直接由生成的字節碼使用。傳統上，此過程發生於解析器生成 AST 後緊接著進行。因此，編譯管線後續的一些步驟依賴於這些字面物件已被分配。為了啟用背景編譯，我們將 AST 內部化移到編譯管線的後段，字節碼編譯完成之後。這需要對管線後段進行修改，使其訪問嵌入 AST 的 _原始_ 字面值，而非內部化的堆內部值。

字節碼完成涉及構建用於執行函數的最終 `BytecodeArray` 物件以及相關的元數據，例如存儲字節碼引用常量的 `ConstantPoolArray` 和將 JavaScript 源碼行列號映射到字節碼偏移的 `SourcePositionTable`。由於 JavaScript 是一種動態語言，這些物件需要存在於 JavaScript 堆中，以便在相關的 JavaScript 函數被垃圾回收時它們也能被回收。此前，在字節碼編譯過程中分配並修改這些元數據物件會涉及訪問 JavaScript 堆。為了實現背景編譯，Ignition 的字節碼生成器被重新設計，以追踪這些元數據的詳細信息，並將它們的分配延遲到字節碼編譯的最後階段。

通過這些改變，幾乎所有腳本的編譯都可以轉移到背景執行緒，只有短暫的 AST 內部化和字節碼完成步驟在腳本執行之前於主執行緒上進行。

![](/_img/background-compilation/threads.svg)

目前，只有頂層的腳本代碼和立即執行的函式表達式（IIFE）會在背景執行緒中編譯——內部函式仍然會在主執行緒上以懶編譯方式進行（在首次執行時編譯）。我們希望未來能將背景編譯擴展到更多的情境。然而，即使有這些限制，背景編譯仍能讓主執行緒獲得更多的空閒時間，用於執行其他工作，例如響應用戶互動、渲染動畫或提供更流暢、更具回應性的體驗。

## 結果

我們使用[真實世界的基準測試框架](/blog/real-world-performance)評估了背景編譯在一組熱門網頁上的效能表現。

![](/_img/background-compilation/desktop.svg)

![](/_img/background-compilation/mobile.svg)

可以在背景執行緒上進行的編譯比例取決於在頂層流式腳本編譯過程中編譯的位元碼比例與內部函式被調用時懶編譯的比例（懶編譯仍然必須在主執行緒上進行）。因此，在主執行緒上節省的時間比例也會有所不同，大多數網頁可以看到主執行緒編譯時間減少了 5% 到 20%。

## 下一步

在背景執行緒編譯腳本有什麼比這更好嗎？完全不需要編譯腳本！除了背景編譯，我們還致力於改進 V8 的[程式碼快取系統](/blog/code-caching)，以擴大 V8 快取的程式碼量，從而加快您常訪網頁的加載速度。我們希望很快為您帶來這方面的更新，敬請期待！
