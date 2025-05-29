---
title: "程式碼緩存"
author: "Yang Guo ([@hashseed](https://twitter.com/hashseed)), 軟體工程師"
avatars:
  - "yang-guo"
date: 2015-07-27 13:33:37
tags:
  - internals
description: "V8 現在支援（位元組）程式碼緩存，即緩存 JavaScript 解析和編譯的結果。"
---
V8 使用 [即時編譯](https://en.wikipedia.org/wiki/Just-in-time_compilation)（JIT）來執行 JavaScript 程式碼。這表示在執行腳本之前，必須先對其進行解析和編譯，這可能會導致相當大的額外開銷。正如我們[最近公告](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html)提到的，程式碼緩存是一種減少這種開銷的技術。當腳本第一次被編譯時，會生成緩存數據並將其儲存。下一次 V8 需要編譯相同的腳本時，即使在不同的 V8 實例中，也可以使用緩存數據來重建編譯結果，而不是從頭編譯。因此，腳本能夠更快地執行。

<!--truncate-->
自從 V8 版本 4.2 起，程式碼緩存功能已經可用，並且不限於 Chrome。它通過 V8 的 API 暴露，因此所有的 V8 嵌入器都能利用這個功能。[測試案例](https://chromium.googlesource.com/v8/v8.git/+/4.5.56/test/cctest/test-api.cc#21090)用來驗證這個功能，並作為使用該 API 的範例。

當一個腳本被 V8 編譯時，可以通過傳遞 `v8::ScriptCompiler::kProduceCodeCache` 作為選項來生成緩存數據，以加速後續的編譯過程。如果編譯成功，緩存數據會附加到源對象上，可以通過 `v8::ScriptCompiler::Source::GetCachedData` 獲取。然後可以將其持久化，例如寫入磁碟。

在後續的編譯過程中，可以將之前生成的緩存數據附加到源對象上，並傳遞 `v8::ScriptCompiler::kConsumeCodeCache` 作為選項。這次，程式碼將生成得更快，因為 V8 會繞過編譯過程，改為從提供的緩存數據中反序列化。

生成緩存數據會消耗一定的計算資源和記憶體。因此，Chrome 僅在相同的腳本在幾天內至少被看到兩次才會生成緩存數據。通過這種方式，Chrome 能夠將腳本文件轉換為可執行程式碼的時間平均加快一倍，為用戶節省每次頁面載入的寶貴時間。
