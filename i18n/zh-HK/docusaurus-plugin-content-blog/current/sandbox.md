---
title: 'The V8 Sandbox'
description: 'V8 提供了一個輕量級、進程內的沙箱，用於限制記憶體損壞漏洞的影響'
author: 'Samuel Groß'
avatars:
  - samuel-gross
date: 2024-04-04
tags:
 - security
---

距離[最初的設計文檔](https://docs.google.com/document/d/1FM4fQmIhEqPG8uGp5o9A-mnPB5BOeScZYpkHjo0KKA8/edit?usp=sharing)發佈已過去了將近三年，在這期間進行了[數百次代碼更改](https://github.com/search?q=repo%3Av8%2Fv8+%5Bsandbox%5D&type=commits&s=committer-date&o=desc)，V8 沙箱——一個用於 V8 的輕量級、進程內沙箱——現已發展到不再被視為實驗性安全功能的地步。從今天開始，[V8 沙箱被納入 Chrome 的脆弱性獎勵計劃](https://g.co/chrome/vrp/#v8-sandbox-bypass-rewards) (VRP)。雖然仍有一些問題需要解決，才能成為強有力的安全邊界，但納入 VRP 是向該方向邁出的重要一步。因此，Chrome 123 可被視為沙箱的某種「Beta」版本。這篇博客利用這個機會討論了沙箱背後的動機，展示了它如何防止 V8 的記憶體損壞在宿主進程中蔓延，並最終解釋了為什麼這是邁向記憶體安全的必要步驟。

<!--truncate-->

# 動機

記憶體安全仍然是一個相關的問題：過去三年中[在野被捕獲的 Chrome 漏洞](https://docs.google.com/spreadsheets/d/1lkNJ0uQwbeC1ZTRrxdtuPLCIl7mlUreoKfSIgajnSyY/edit?usp=sharing) (2021 – 2023) 全都從 Chrome 渲染器進程中的記憶體損壞漏洞開始，該漏洞被用於遠程代碼執行 (RCE)。其中，60% 是 V8 中的漏洞。然而，這裡有個陷阱：V8 漏洞很少是「典型的」記憶體損壞缺陷（例如，使用未初始化的記憶體、越界訪問等），而是微妙的邏輯問題，這些問題可以進一步被利用來損壞記憶體。因此，現有的記憶體安全解決方案大多不適用於 V8。特別是，[轉向一種內存安全的語言](https://www.cisa.gov/resources-tools/resources/case-memory-safe-roadmaps)（如 Rust），或使用當前或未來的硬體記憶體安全功能（如 [記憶體標籤](https://newsroom.arm.com/memory-safety-arm-memory-tagging-extension)），都無法解決 V8 今天面臨的安全挑戰。

為了理解原因，請考慮一個高度簡化的、假設的 JavaScript 引擎漏洞：`JSArray::fizzbuzz()` 的實現。該方法用於將數組中能被 3 整除的值替換為 "fizz"，能被 5 整除的替換為 "buzz"，能同時被 3 和 5 整除的替換為 "fizzbuzz"。以下是該函數在 C++ 中的實現。可以將 `JSArray::buffer_` 理解為一個 `JSValue*`，即指向 JavaScript 值數組的指針，而 `JSArray::length_` 則包含該緩衝區的當前大小。

```cpp
 1. for (int index = 0; index < length_; index++) {
 2.     JSValue js_value = buffer_[index];
 3.     int value = ToNumber(js_value).int_value();
 4.     if (value % 15 == 0)
 5.         buffer_[index] = JSString("fizzbuzz");
 6.     else if (value % 5 == 0)
 7.         buffer_[index] = JSString("buzz");
 8.     else if (value % 3 == 0)
 9.         buffer_[index] = JSString("fizz");
10. }
```

看起來很簡單嗎？但這裡有一個相當微妙的漏洞：第 3 行的 `ToNumber` 轉換可以產生副作用，因為它可能調用用戶定義的 JavaScript 回調。這樣的回調可能會縮小數組，從而導致隨後的越界寫入。以下的 JavaScript 代碼可能會導致記憶體損壞：

```js
let array = new Array(100);
let evil = { [Symbol.toPrimitive]() { array.length = 1; return 15; } };
array.push(evil);
// 在索引 100 處，|evil| 的 @@toPrimitive 回調會在
// 上述第 3 行被調用，從而將數組長度縮小為 1，並重新分配其
// 支持的緩衝區。隨後的寫入（第 5 行）發生越界。
array.fizzbuzz();
```

需要注意的是，這種漏洞可能出現在手工編寫的運行時代碼中（如上述示例），或由優化的即時編譯器 (JIT) 在運行時生成的機器代碼中（如果函數是以 JavaScript 實現的）。在前一種情況下，編程者可能會認為不需要對存儲操作進行顯式的邊界檢查，因為該索引剛剛已被訪問。在後一種情況下，編譯器可能會在其某個優化過程中得出相同的錯誤結論（例如[冗餘消除](https://en.wikipedia.org/wiki/Partial-redundancy_elimination)或[邊界檢查消除](https://en.wikipedia.org/wiki/Bounds-checking_elimination)），因為它未正確建模 `ToNumber()` 的副作用。

儘管這是一個人工簡單的漏洞（由於模糊測試工具的改進、開發者的意識提升以及研究員的關注，這種特定的漏洞模式現在已經幾乎滅絕），但理解為什麼在現代 JavaScript 引擎中很難用通用的方式來緩解漏洞仍然很有價值。考慮使用如 Rust 這樣的內存安全語言的方法，在這種情況下，編譯器會負責保證內存安全。在上述範例中，內存安全語言可能會防止發生在解釋器用手寫運行時代碼中的這個漏洞。然而，它卻*無法*防止發生在即時編譯器中的漏洞，因為那裡的問題是邏輯錯誤，而不是一個「經典的」內存損壞漏洞。只有編譯器生成的代碼才會實際導致內存損壞。從根本上說，問題在於*如果編譯器直接成為攻擊面的一部分，則編譯器無法保證內存安全*。

同樣，禁用即時編譯器（JIT）也只是一個部分解決方案：從歷史上看，V8 中發現和利用的漏洞中，大約有一半影響到它的某個編譯器，而其餘漏洞則存在於其他組件中，比如運行時函數、解釋器、垃圾收集器或解析器。將這些組件使用內存安全語言並移除即時編譯器可能會起作用，但這會顯著降低引擎的性能（根據工作負載類型不同，計算密集型任務可能會降低 1.5–10 倍或更多）。

現在考慮流行的硬件安全機制，尤其是[內存標記](https://googleprojectzero.blogspot.com/2023/08/mte-as-implemented-part-1.html)。有許多原因表明內存標記同樣無法成為有效解決方案。例如，可從 JavaScript 中[輕鬆利用的 CPU 側信道](https://security.googleblog.com/2021/03/a-spectre-proof-of-concept-for-spectre.html)可以被用來洩露標記值，從而使攻擊者繞過緩解措施。此外，由於[指針壓縮](https://v8.dev/blog/pointer-compression)的存在，V8 中的指針目前沒有空間存放標記位。因此，整個堆區域必須使用相同的標記，這使得檢測跨對象損壞成為不可能。因此，雖然內存標記[在某些攻擊面非常有效](https://googleprojectzero.blogspot.com/2023/08/mte-as-implemented-part-2-mitigation.html)，但在 JavaScript 引擎的情況下，它不太可能對攻擊者構成太大障礙。

總結來說，現代 JavaScript 引擎往往包含複雜的二次邏輯漏洞，這些漏洞提供了強大的利用原語。而典型的內存損壞漏洞防護技術並不足以有效保護它們。然而，今天在 V8 中發現和利用的幾乎所有漏洞有一個共同點：最終的內存損壞必然發生在 V8 堆中，因為編譯器和運行時幾乎只操作 V8 的 `HeapObject` 實例。這就是沙箱起作用的地方。


# V8（堆）沙箱

沙箱背後的基本想法是隔離 V8 的（堆）內存，以至於無論那裡發生什麼內存損壞，都無法「擴散」到進程內存的其他部分。

作為對沙箱設計的一個動機示例，考慮現代操作系統中的[用戶空間和內核空間分離](https://en.wikipedia.org/wiki/User_space_and_kernel_space)。從歷史上看，所有應用程序和操作系統的內核共享相同的（物理）內存地址空間。因此，用戶應用程序中的任何內存錯誤可能會通過，例如損壞內核內存，導致整個系統崩潰。而在現代操作系統中，每個用戶態應用程序都有自己的專用（虛擬）地址空間。因此，任何內存錯誤僅限於應用程序本身，其餘系統受到保護。換句話說，一個有缺陷的應用程序可以使自己崩潰，但不會影響系統的其餘部分。同樣，V8 沙箱試圖隔離由 V8 執行的不受信任的 JavaScript/WebAssembly 代碼，以至於 V8 中的 bug 不會影響主機進程的其餘部分。

原則上，[可以利用硬件支持實現沙箱](https://docs.google.com/document/d/12MsaG6BYRB-jQWNkZiuM3bY8X2B2cAsCMLLdgErvK4c/edit?usp=sharing)：類似於用戶態和內核態分離，V8 在進入或離開沙箱代碼時會執行某些模式切換指令，這將使 CPU 無法訪問沙箱外的內存。但實際上，目前沒有可用的合適硬件功能，因此當前的沙箱完全通過軟件實現。

[基於軟件的沙箱](https://docs.google.com/document/d/1FM4fQmIhEqPG8uGp5o9A-mnPB5BOeScZYpkHjo0KKA8/edit?usp=sharing)的基本想法是用「與沙箱兼容」的替代方案替換所有可以訪問沙箱外部內存的數據類型。尤其是，所有指針（無論是指向 V8 堆上的對象還是內存中的其他地方）和 64 位大小都必須被移除，因為攻擊者可能會損壞它們以隨後訪問進程中的其他內存。這暗示了像堆棧這樣的內存區域無法位於沙箱內，因為它們必須由於硬件和操作系統的限制包含指針（例如返回地址）。因此，使用基於軟件的沙箱時，僅有 V8 堆位於沙箱內，整體結構因此與[WebAssembly 使用的沙箱模型](https://webassembly.org/docs/security/)頗為類似。

要理解這在實踐中的運作，查看攻擊在破壞記憶體後需要執行的步驟是很有幫助的。遠端代碼執行（RCE）攻擊通常的目標是執行提權攻擊，例如執行shellcode或進行返回導向編程（ROP）的風格攻擊。對於任一種情況，攻擊者首先需要讀取和寫入進程中的任意記憶體，例如隨後破壞函數指針或在記憶體中的某處放置ROP有效負載並轉向它。假設一個漏洞導致V8堆上的記憶體被破壞，攻擊者因此會尋找諸如以下的對象：

```cpp
class JSArrayBuffer: public JSObject {
  private:
    byte* buffer_;
    size_t size_;
};
```

基於此，攻擊者可能破壞緩衝指針或大小值以構建任意讀寫操作。這是沙盒旨在防止的步驟。尤其是，啟用沙盒後，並假定引用的緩衝位於沙盒內，上述對象將成為：

```cpp
class JSArrayBuffer: public JSObject {
  private:
    sandbox_ptr_t buffer_;
    sandbox_size_t size_;
};
```

其中`sandbox_ptr_t`是沙盒基礎的40位偏移值（對於1TB沙盒的情況）。同樣，`sandbox_size_t`是一個「沙盒兼容」大小，[目前限制為32GB](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-internal.h;l=231;drc=5bdda7d5edcac16b698026b78c0eec6d179d3573)。
或者，如果引用的緩衝位於沙盒外，則對象將變為：

```cpp
class JSArrayBuffer: public JSObject {
  private:
    external_ptr_t buffer_;
};
```

這裡，`external_ptr_t`通過指針表間接引用緩衝（及其大小）（類似於[Unix內核的文件描述符表](https://en.wikipedia.org/wiki/File_descriptor)或[WebAssembly.Table](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Table)），以提供記憶體安全保證。

在這兩種情況下，攻擊者將無法「伸出」沙盒範圍到地址空間的其他部分。相反，他們首先需要另一個漏洞：V8沙盒繞過。以下圖片總結了高層的設計，有興趣的讀者可以在[`src/sandbox/README.md`](https://chromium.googlesource.com/v8/v8.git/+/refs/heads/main/src/sandbox/README.md)中找到有關沙盒的設計文檔中的更多技術細節。

![沙盒設計的高層示意圖](/_img/sandbox/sandbox.svg)

僅僅將指針和大小轉換為不同的表示方式，對於像V8這樣複雜的應用來說並不足夠，還有一些[其他問題](https://issues.chromium.org/hotlists/4802478)需要解決。例如，隨著沙盒的引入，類似以下的代碼突然變得有問題：

```cpp
std::vector<std::string> JSObject::GetPropertyNames() {
    int num_properties = TotalNumberOfProperties();
    std::vector<std::string> properties(num_properties);

    for (int i = 0; i < NumberOfInObjectProperties(); i++) {
        properties[i] = GetNameOfInObjectProperty(i);
    }

    // 處理其他類型的屬性
    // ...
```

此代碼合理地假設直接存儲在JSObject中的屬性數量必須小於該對象的屬性總數。然而，假設這些數字只是以整數的形式存儲在JSObject中的某個地方，攻擊者可以破壞其中一個來打破這種不變性。隨後，訪問（沙盒外的）`std::vector`將超出界限。添加顯式的邊界檢查，例如使用[`SBXCHECK`](https://chromium.googlesource.com/v8/v8.git/+/0deeaf5f593b98d6a6a2bb64e3f71d39314c727c)，可以解決此問題。

令人欣慰的是，目前發現的幾乎所有「沙盒違規」都是這樣的：簡單的（第一階）記憶體損壞漏洞，例如因缺乏邊界檢查導致的使用後釋放或越界訪問。與V8中典型的第二階漏洞相反，這些沙盒漏洞實際上可以通過前面討論的方式被預防或減輕事態。事實上，上述具體的漏洞今天已因[Chrome的libc++加固](http://issues.chromium.org/issues/40228527)而得到了緩解。因此，希望從長遠來看，沙盒成為一個比V8本身**更具防禦性安全界限**。雖然目前可用的沙盒漏洞數據集非常有限，但今天開始的VRP整合有望幫助產生有關沙盒攻擊面上發現的漏洞類型的更清晰圖景。

## 性能

這種方法的一個主要優勢是它本質上很便宜：沙盒帶來的開銷主要來自於外部對象的指針表間接（大約需要額外的一次記憶體加載），以及在某種程度上偏移代替原始指針的使用（主要只需一次移位+加法操作，非常便宜）。因此，沙盒目前的開銷在典型工作負載下僅為1%或更少（使用[Speedometer](https://browserbench.org/Speedometer3.0/)和[JetStream](https://browserbench.org/JetStream/)基準套件測量）。這使得V8沙盒能夠在兼容平臺上默認啟用。

## 測試

任何安全邊界的一個重要特性是測試能力：能夠手動和自動測試承諾的安全保障是否在實踐中確實成立。這需要一個清晰的攻擊者模型、一種“模擬”攻擊者的方法，以及理想情況下，一種自動判斷安全邊界是否失效的方法。V8 沙盒滿足了所有這些要求：

1. **清晰的攻擊者模型：** 假設攻擊者可以在 V8 沙盒內隨意讀取和寫入。目標是防止沙盒外部的記憶體損壞。
2. **模擬攻擊者的方法：** 當使用 `v8_enable_memory_corruption_api = true` 標誌編譯時，V8 提供了“記憶體損壞 API”。這模擬了典型的 V8 漏洞所獲得的原語，尤其是提供了沙盒內的完全讀寫訪問。
3. **檢測“沙盒違規”的方法：** V8 提供了一種“沙盒測試”模式（通過 `--sandbox-testing` 或 `--sandbox-fuzzing` 啟用），該模式安裝了一個[信號處理器](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/sandbox/testing.cc;l=425;drc=97b7d0066254778f766214d247b65d01f8a81ebb)，用於判斷像 `SIGSEGV` 這樣的信號是否代表沙盒安全保障的違規。

最終，這使得沙盒能夠集成到 Chrome 的 VRP 計劃中，並由專用的模糊測試工具進行測試。

## 使用方式

V8 沙盒必須在編譯時通過 `v8_enable_sandbox` 編譯標誌啟用或禁用。由於技術上的原因，無法在運行時啟用或禁用沙盒。V8 沙盒需要一個 64 位系統，因為它需要保留大量的虛擬地址空間，目前要求保留一個太字節。

在過去大約兩年中，V8 沙盒已經在 Android、ChromeOS、Linux、macOS 和 Windows 上的 64 位 (特指 x64 和 arm64) 版本的 Chrome 中默認啟用。儘管沙盒並未 (並且目前仍未) 完全功能完善，這主要是為了確保它不會引起穩定性問題並收集實際性能統計數據。因此，最近的 V8 漏洞已經不得不繞過沙盒，這為其安全性提供了有用的早期反饋。


# 結論

V8 沙盒是一種新型的安全機制，旨在防止 V8 中的記憶體損壞影響進程中的其他記憶體。沙盒的動機來源於當前的記憶體安全技術在優化 JavaScript 引擎中基本無法應用。雖然這些技術不能防止 V8 本身的記憶體損壞，但它們確實可以保護 V8 沙盒的攻擊表面。因此，沙盒是通向記憶體安全的一個必要步驟。
