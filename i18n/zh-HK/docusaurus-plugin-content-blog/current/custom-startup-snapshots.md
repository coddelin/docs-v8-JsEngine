---
title: '自訂啟動快照'
author: 'Yang Guo ([@hashseed](https://twitter.com/hashseed)), 軟體工程師和引擎預熱供應商'
avatars:
  - 'yang-guo'
date: 2015-09-25 13:33:37
tags:
  - internals
description: 'V8 嵌入者可以利用快照以跳過 JavaScript 程式初始化所需的啟動時間。'
---
JavaScript 規範包括許多內建功能，從[數學函數](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Math)到一個[功能完善的正則表達式引擎](https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions)。每個新創建的 V8 context 從一開始就可以使用這些功能。為了達到這一點，必須在 context 被創建時，將全域物件（例如，在瀏覽器中的 window 物件）和所有內建功能設置並初始化到 V8 的 heap 中。從零開始完成這些操作需要相當多的時間。

<!--truncate-->
幸運的是，V8 使用了一種快捷方式來加速這一過程：就像解凍冷凍披薩以快速享用晚餐一樣，我們將預先準備好的快照反序列化到 heap 中以獲得初始化的 context。在一般的桌面電腦上，這可以將創建 context 的時間從 40 毫秒減少到不到 2 毫秒。在普通的手機上，這可能意味著從 270 毫秒減少到 10 毫秒的差異。

嵌入 V8 的非 Chrome 應用程式可能需要超越普通的 JavaScript 設置。許多應用程式在“真正的”應用程式運行之前的啟動時加載額外的庫腳本。例如，基於 V8 的簡單 TypeScript VM 必需在啟動時加載 TypeScript 編譯器以便即時將 TypeScript 原始碼翻譯為 JavaScript。

從兩個月前的 V8 v4.3 版本開始，嵌入者可以利用快照功能來跳過此類初始化所需的啟動時間。[測試案例](https://chromium.googlesource.com/v8/v8.git/+/4.5.103.9/test/cctest/test-serialize.cc#661)展示了這個 API 的工作原理。

要創建快照，我們可以使用以 C 字串（以空字元結尾）嵌入的腳本調用 `v8::V8::CreateSnapshotDataBlob`。在創建新 context 之後，這段腳本會被編譯並執行。在我們的例子中，我們創建了兩個自訂啟動快照，每個快照都定義了一些基於已有 JavaScript 內建功能的函數。

然後，我們可以使用 `v8::Isolate::CreateParams` 配置一個新創建的 isolate，使其從自訂的啟動快照初始化 contexts。在該 isolate 中創建的 contexts 是從我們取快照的 context 的精確複製品。快照中定義的函數可以直接使用，而無需再次定義。

這裡有一個重要的限制：快照只能捕獲 V8 的 heap。在創建快照時，V8 與外部的任何互動都是禁止的。這些互動包括：

- 定義和調用 API 回調函數（即通過 `v8::FunctionTemplate` 創建的函數）
- 創建型別陣列，因為底層存儲可能是在 V8 外分配的

當然，來自 `Math.random` 或 `Date.now` 等來源的值在快照被捕捉後會被固定。它們不再真正隨機或反映當前時間。

儘管有以上限制，啟動快照仍然是節省初始化時間的一個好方法。按我們的示例，上述 TypeScript 編譯器的加載可以節省 100 毫秒的啟動時間（在一般桌面電腦上）。我們期待看到您如何利用自訂快照！
