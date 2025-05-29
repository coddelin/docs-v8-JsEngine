---
title: "深入研究TurboFan JIT"
author: "Ben L. Titzer，軟體工程師兼TurboFan維修技術人員"
avatars: 
  - "ben-titzer"
date: "2015-07-13 13:33:37"
tags: 
  - internals
description: "深入探討V8的新TurboFan優化編譯器的設計。"
---
[上週我們宣布](https://blog.chromium.org/2015/07/revving-up-javascript-performance-with.html)我們已經為某些類型的JavaScript啟用了TurboFan。在這篇文章中，我們希望深入探討TurboFan的設計。

<!--truncate-->
性能一直是V8策略的核心。TurboFan結合了前沿的中間表示以及多層的翻譯和優化管道，生成比以前用CrankShaft JIT所能實現的更高品質的機器碼。TurboFan中的優化更為多樣、更複雜且應用得更徹底，使得流暢的代碼運動、控制流優化以及精確的數值範圍分析都變得可實現，而這些在過去難以達成。

## 分層架構

隨著支持的新語言功能增多、添加的新優化以及針對的新計算機架構，編譯器會隨時間變得更複雜。使用TurboFan，我們從許多編譯器中汲取了經驗，開發了一種分層架構，讓編譯器能隨著時間應對這些需求。在源級語言（JavaScript）、VM的能力（V8）以及架構的複雜性（從x86到ARM到MIPS）之間有一個更明確的區分，允許更清晰、更健壯的代碼。分層構造讓編譯器研發人員在實現優化和功能時能進行局部思考，並撰寫更有效的單元測試，也節省了代碼。每個由TurboFan支持的7個目標架構僅需不到3,000行平台特定代碼，而CrankShaft則需要13,000-16,000行。這使得ARM、Intel、MIPS和IBM的工程師能更有效地為TurboFan做出貢獻。TurboFan能更容易支持ES6的所有功能，因為其靈活的設計將JavaScript前端與架構依賴的後端分離開來。

## 更複雜的優化

TurboFan JIT通過一系列先進技術實現了比CrankShaft更具侵略性的優化。未經優化的JavaScript進入編譯器管道，隨後被翻譯並逐步優化為較低層次的形式，直到生成機器碼。設計的核心是一種更鬆散的節點海（sea-of-nodes）內部表示（IR）代碼，允許更高效的重新排序和優化。

![TurboFan圖表示例](/_img/turbofan-jit/example-graph.png)

數值範圍分析幫助TurboFan更好地理解數值運算代碼。基於圖的內部表示允許將大多數優化表述為簡單的局部減少，更易於獨立編寫和測試。一個優化引擎以系統化和徹底的方式應用這些局部規則。擺脫圖形表示的過程涉及一種創新的調度算法，利用重排序的自由選項將代碼從循環中移動並進入較不頻繁執行的路徑。最終，像複雜指令選擇的架構特定優化利用每個目標平台的特性以生成最佳質量的代碼。

## 提供新的性能水準

我們[已經看到了一些很不錯的加速](https://blog.chromium.org/2015/07/revving-up-javascript-performance-with.html)，但仍有大量工作要做。請繼續關注，當我們啟用更多優化並將TurboFan應用於更多類型的代碼時！
