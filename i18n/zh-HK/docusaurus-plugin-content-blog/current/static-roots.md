---
title: "Static Roots: Objects with Compile-Time Constant Addresses"
author: "Olivier Flückiger"
avatars:
  - olivier-flueckiger
date: 2024-02-05
tags:
  - JavaScript
description: "Static Roots 使得某些 JS 物件的位址成為編譯時的常數。"
tweet: ""
---

你是否曾經好奇像 `undefined`、`true` 等核心 JavaScript 物件是從哪裡來的？這些物件是任何使用者定義物件的基本單位，必須先存在。V8 將它們稱為不可移動且不可變的根物件，並將它們存放於自己的堆區——唯讀堆。由於這些物件被頻繁使用，因此快速存取至關重要。而什麼能比在編譯時正確推測它們的記憶體位址更快呢？

<!--truncate-->
例如，考慮極為常用的 `IsUndefined` [API 函數](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-value.h?q=symbol:%5Cbv8::Value::IsUndefined%5Cb%20case:yes)。與其必須查找用於引用的 `undefined` 物件位址，我們是否可以直接檢查某個物件的指標是否以 `0x61` 結尾來判斷該物件是否為 undefined？這正是 V8 的 *static roots* 功能所實現的。本文探討了為實現這一功能所需要克服的難題。該功能已在 Chrome 111 中推出，並為整個 VM 帶來了性能提升，其中特別加速了 C++ 代碼和內建函數。

## 啟動唯讀堆

創建唯讀物件需要一些時間，因此 V8 在編譯時便創建它們。為了編譯 V8，首先會編譯一個最小化的原型 V8 二進制檔案，稱為 `mksnapshot`。這個檔案會創建所有共享的唯讀物件以及內建函數的原生代碼，並將它們寫入快照中。接著會編譯真正的 V8 二進制檔案，並將快照捆綁在一起。為了啟動 V8，快照被加載到記憶體中，我們可以立即開始使用其內容。以下圖表展示了簡化版的獨立 `d8` 二進制檔案的構建過程。

![](/_img/static-roots/static-roots1.svg)

一旦 `d8` 被啟動，所有唯讀物件便在記憶體中有了固定的位置，並且永遠不會移動。當我們 JIT 編譯代碼時，例如，可以直接通過其位址引用 `undefined`。然而，在生成快照和編譯 libv8 的 C++ 時，這些位址尚未被確定，因為它們取決於兩個在構建時未知的因素。其一是唯讀堆的二進制佈局，其二是該唯讀堆在記憶體空間中的位置。

## 如何預測位址？

V8 使用 [指標壓縮](https://v8.dev/blog/pointer-compression)。與完整的 64 位位址相比，我們通過 32 位偏移量來引用位於 4GB 記憶體區域的物件。對於許多操作，例如屬性加載或比較，這個偏移量就足以唯一識別物件。因此，我們的第二個問題——不確定唯讀堆在記憶體空間中的位置——實際上並不是真正的問題。我們只是將唯讀堆放置於每個指標壓縮籠子的起始處，從而賦予它一個已知位置。例如，在 V8 堆中的所有物件中，`undefined` 的壓縮地址始終是最小的，從 0x61 該字節開始。因此我們知道，如果任何 JS 物件的完整地址的低 32 位是 0x61，那麼它一定是 `undefined`。

這已經很有用，但是我們希望在快照和 libv8 中使用這個位址——這似乎是一個循環問題。然而，如果我們確保 `mksnapshot` 決定性地創建一個位相同的唯讀堆，那麼我們就可以在多次構建中重用這些位址。為了在 libv8 本身中使用它們，我們基本上構建兩次 V8：

![](/_img/static-roots/static-roots2.svg)

第一次調用 `mksnapshot` 時，唯一產出的工件是一個檔案，該檔案包含了唯讀堆中每個物件相對於籠子基址的[位址](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/roots/static-roots.h)。在構建的第二階段，我們再次編譯 libv8，並通過標記確保每當我們引用 `undefined` 時，我們實際上使用 `cage_base + StaticRoot::kUndefined`；而 `undefined` 的靜態偏移則定義在 static-roots.h 文件中。在很多情況下，這會讓創建 libv8 的 C++ 編譯器以及 `mksnapshot` 中的內建編譯器創建更高效的代碼，因為替代方法是從根物件的全局陣列中加載位址。最終我們得到了一個 `d8` 二進制檔案，其 `undefined` 的壓縮位址已被硬編碼為 0x61。

從概念上講，這基本上是所有工作的方式，但在實際中我們只構建 V8 一次——沒人有時間重複這個過程。生成的 static-roots.h 文件緩存在源代碼倉庫中，只有在我們更改唯讀堆佈局時才需要重新生成。

## 進一步應用

說到實用性，靜態根使得實現更多的優化成為可能。例如，我們已經將一些常用的物件分組在一起，使得我們能夠將某些操作實現為基於它們地址的範圍檢查。例如，所有字符串映射（即描述不同字符串類型佈局的[隱藏類](https://v8.dev/docs/hidden-classes)元物件）都在彼此相鄰的位置，因此，如果一個物件的映射具有介於 `0xdd` 和 `0x49d` 之間的壓縮地址，那麼該物件就是字符串。或者，truthy 物件的地址必須至少為 `0xc1`。

並非一切都與 V8 中 JIT 代碼的性能有關。正如這個項目所展示的，對 C++ 代碼進行相對較小的更改也可以帶來顯著的影響。例如 Speedometer 2, 一個測試 V8 API 和 V8 與其嵌入程序交互的基準測試，在 M1 CPU 上得益於靜態根，分數提高了約 1%。
