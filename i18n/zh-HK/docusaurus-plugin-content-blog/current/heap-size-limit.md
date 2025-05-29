---
title: 'Chrome 的一小步，V8 的一大堆'
author: '堆守護者 Ulan Degenbaev、Hannes Payer、Michael Lippautz，和 DevTools 戰士 Alexey Kozyatinskiy'
avatars:
  - 'ulan-degenbaev'
  - 'michael-lippautz'
  - 'hannes-payer'
date: 2017-02-09 13:33:37
tags:
  - memory
description: 'V8 最近增加了堆大小的硬性限制。'
---
V8 對其堆大小有硬性限制。這充當了防止有記憶體洩漏的應用程序的保險機制。當應用程序達到此硬性限制時，V8 會執行一系列最後的垃圾回收。如果垃圾回收無法釋放記憶體，V8 停止執行並報告記憶體不足錯誤。沒有硬性限制的話，有記憶體洩漏的應用程序可能耗盡所有系統記憶體，損害其他應用程序的效能。

<!--truncate-->
諷刺的是，這套保險機制使 JavaScript 開發者更難調查記憶體洩漏問題。在開發者來得及在 DevTools 中檢查堆之前，應用程序可能已耗盡記憶體。此外，由於 DevTools 進程本身使用普通的 V8 實例，它也可能耗盡記憶體。例如，[此範例](https://ulan.github.io/misc/heap-snapshot-demo.html) 的堆快照操作在當前穩定版 Chrome 中會因記憶體不足而中止執行。

從歷史上看，V8 的堆限制被方便地設置為適合有些餘裕的 32 位整數範圍。隨著時間的推移，此便利性導致了 V8 中混合不同位寬型別的代碼，實際上破壞了增加限制的能力。最近，我們清理了垃圾回收器代碼，使得能夠使用更大的堆大小。DevTools 已經在使用此功能，並且在上述範例中進行堆快照的操作已如預期般在最新的 Chrome Canary 中工作。

我們還在 DevTools 中添加了一項功能，用於在應用程序接近耗盡記憶體時暫停程序。此功能對調查導致應用程序在短時間內分配大量記憶體的錯誤非常有用。在使用最新的 Chrome Canary 運行[此範例](https://ulan.github.io/misc/oom.html)時，DevTools 在記憶體不足錯誤前暫停應用程序並增加堆限制，給使用者檢查堆的機會，在控制台中執行釋放記憶體的表達式，然後恢復執行以便進一步調試。

![](/_img/heap-size-limit/debugger.png)

V8 嵌入者可以使用 `ResourceConstraints` API 的 [`set_max_old_generation_size_in_bytes`](https://codesearch.chromium.org/chromium/src/v8/include/v8-isolate.h?q=set_max_old_generation_size_in_bytes) 函數增加堆限制。但需注意的是，垃圾回收器的某些階段與堆大小存在線性依賴關係。隨著堆大小增加，垃圾回收的暫停可能會增加。
