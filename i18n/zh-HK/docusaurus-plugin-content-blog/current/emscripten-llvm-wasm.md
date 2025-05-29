---
title: 'Emscripten 和 LLVM WebAssembly 後端'
author: 'Alon Zakai'
avatars:
  - 'alon-zakai'
date: 2019-07-01 16:45:00
tags:
  - WebAssembly
  - 工具
description: 'Emscripten 正在切換至 LLVM WebAssembly 後端，這將帶來更快的鏈接時間以及其他許多好處。'
tweet: '1145704863377981445'
---
WebAssembly 通常是從源代碼語言編譯而來，這意味著開發人員需要 *工具* 才能使用它。因此，V8 團隊致力於相關的開源項目，例如 [LLVM](http://llvm.org/)、[Emscripten](https://emscripten.org/)、[Binaryen](https://github.com/WebAssembly/binaryen/)、和 [WABT](https://github.com/WebAssembly/wabt)。本文描述了我們在 Emscripten 和 LLVM 上的部分工作，這項工作將很快使 Emscripten 默认切換到 [LLVM WebAssembly 後端](https://github.com/llvm/llvm-project/tree/main/llvm/lib/Target/WebAssembly)——請測試並回報任何問題！

<!--truncate-->
LLVM WebAssembly 後端在 Emscripten 中已可作為選項使用，因為我們一直在與其他開源 WebAssembly 工具社區合作的同時，並行開發后端並將其整合進 Emscripten。如今，WebAssembly 後端不論從大多數指標來看都已超越舊的 “[fastcomp](https://github.com/emscripten-core/emscripten-fastcomp/)” 後端，因此我們希望將默認設置切換到它。在此之前進行此公告是為了首先進行盡可能多的測試。

這是一項重要的升級，原因令人振奮：

- **鏈接速度更快**：與 [`wasm-ld`](https://lld.llvm.org/WebAssembly.html) 一起使用的 LLVM WebAssembly 後端完全支持使用 WebAssembly 對象文件進行增量編譯。Fastcomp 使用的是 LLVM IR 位碼文件，這意味著在鏈接時所有 IR 都需要被 LLVM 編譯。這是導致鏈接時間慢的主要原因。而使用 WebAssembly 對象文件，`.o` 文件已經包含編譯好的 WebAssembly（以可重定位的形式可以進行鏈接，類似於本地鏈接）。其結果是鏈接步驟比 fastcomp 快得多——下面我們將看到一個真實世界的測量，鏈接速度提高了 7 倍！
- **更快、更小的代碼**：我們在 LLVM WebAssembly 後端以及 Emscripten運行的 Binaryen 優化器上投入了大量精力。其結果是，LLVM WebAssembly 後端路徑現在在速度和大小方面均超越了 fastcomp，這在我們跟踪的多數基準測試中均得到了證明。
- **支持所有 LLVM IR**：Fastcomp 能處理由 `clang` 生成的 LLVM IR，但由於其架構，處理其他來源時經常失敗，特別是在 “合法化” 成 fastcomp 能處理的類型上。而 LLVM WebAssembly 後端使用通用的 LLVM 後端基礎設施，因此可以處理所有情況。
- **新的 WebAssembly 功能**：Fastcomp 在執行 `asm2wasm` 前會將編譯結果轉換為 asm.js，這使得處理新的 WebAssembly 功能（例如尾調用、異常處理、SIMD 等）變得困難。WebAssembly 後端是研究這些功能的自然場所，事實上我們正致力於所有這些功能的開發！
- **來自上游的更快更新**：與上一點相關，由於使用了上游的 WebAssembly 後端，我們可以隨時使用最新的 LLVM 上游版本，這意味著我們可以在第一時間獲得 `clang` 中的新的 C++ 語言功能、LLVM IR 優化等等。

## 測試

要測試 WebAssembly 後端，只需使用 [最新的 `emsdk`](https://github.com/emscripten-core/emsdk) 並執行

```
emsdk install latest-upstream
emsdk activate latest-upstream
```

這裡的 “Upstream” 是指 LLVM WebAssembly 後端位於上游 LLVM，而非 fastcomp。事實上，由於位於上游，你不需要使用 `emsdk`，只需自己構建普通的 LLVM+`clang` 即可！（要在 Emscripten 中使用此構建，只需在你的 `.emscripten` 文件中添加相關路徑即可。）

目前使用 `emsdk [install|activate] latest` 仍使用 fastcomp，也有 “latest-fastcomp”，效果相同。當我們切換默認後端時，將使 “latest” 執行與 “latest-upstream” 相同的操作，而屆時 “latest-fastcomp” 將是獲取 fastcomp 的唯一方法。只要 fastcomp 仍有用，我們就會將其保留為選項；詳見文末的其他說明。

## 歷史

這將是 Emscripten 的 **第三** 個後端，也是 **第二** 次遷移。第一個後端是用 JavaScript 編寫的，並以文本形式解析 LLVM IR。這在 2010 年進行試驗時很有用，但存在明顯的缺點，包括 LLVM 的文本格式會發生變化，編譯速度也不像我們期望的那麼快。在 2013 年，一個新後端在 LLVM 的分支中被編寫，被稱為“fastcomp”。它的設計目的是生成 [asm.js](https://en.wikipedia.org/wiki/Asm.js)，此前的 JS 後端被修改成可以做到這一點（但效果不佳）。因此，這帶來了代碼質量和編譯時間的大幅改善。

這也是 Emscripten 中的一個相對較小的變更。雖然 Emscripten 是一個編譯器，但最初的後端和 fastcomp 一直是該項目中相當小的一部分——更多的代碼用於系統庫、工具鏈集成、編程語言綁定等。因此，儘管切換編譯器後端是一個戲劇性的變化，但它僅影響整個項目的一部分。

## 基準測試

### 代碼大小

![代碼大小測量結果（越小越好）](/_img/emscripten-llvm-wasm/size.svg)

（這裡的所有大小都已經標準化至 fastcomp。）可以看到，WebAssembly 後端的大小幾乎總是更小！這種差異在左側的小型微基準測試中更為明顯（名稱以小寫字母表示），因為系統庫中的新改進更重要。但即使在右側的大型宏基準測試中（名稱以大寫字母表示），這些基準測試是實際的代碼庫，仍然存在代碼大小的縮減。唯一的退步是 LZMA，其中更新的 LLVM 做出了一個不利的內聯決策。

整體來說，宏基準測試的大小平均縮減了 **3.7%**。對於一次編譯器升級來說，這已經很不錯了！我們在測試套件之外的實際代碼庫上看到了類似的情況，比如 [BananaBread](https://github.com/kripken/BananaBread/)，一個 [Cube 2 遊戲引擎](http://cubeengine.com/) 的 Web 移植版本，大小縮減超過了 **6%**，[毀滅戰士 3](http://www.continuation-labs.com/projects/d3wasm/) 的大小縮減則達到了 **15%**！

這些大小改進（以及稍後討論的速度改進）是由多種因素促成的：

- LLVM 的後端代碼生成非常智能，可以完成像 [GVN](https://en.wikipedia.org/wiki/Value_numbering) 這樣的工作，而像 fastcomp 這樣的簡單後端則無法做到。
- 更新的 LLVM 擁有更好的 IR 優化。
- 我們致力於調整 Binaryen 優化器，以適應 WebAssembly 後端的輸出，如前所述。

### 速度

![速度測量結果（越小越好）](/_img/emscripten-llvm-wasm/speed.svg)

（測量在 V8 上進行。）在微基準測試中，速度表現是混合的——這並不令人驚訝，因為它們中的大多數基準測試都由單個函數甚至循環主導，因此 Emscripten 生成的代碼的任何變更都可能導致虛擬機的優化選擇好或不好。總體而言，約有相等數量的微基準測試保持不變、改進或退步。觀察更現實的宏基準測試，LZMA 再次是異常情況，這是因為如前所述的不利的內聯決策，但除此之外，每個宏基準測試都得到了改進！

宏基準測試的平均變化是 **3.2%** 的加速。

### 構建時間

![在 BananaBread 上的編譯和鏈接時間測量結果（越小越好）](/_img/emscripten-llvm-wasm/build.svg)

構建時間變化會因項目而異，但以下是一些來自 BananaBread 的示例數據，這是一個完整但緊湊的遊戲引擎，由 112 個文件和 95,287 行代碼組成。在左側，我們有編譯步驟的構建時間，即將源文件編譯為目標文件，使用該項目的默認 `-O3`（所有時間都標準化至 fastcomp）。如您所見，使用 WebAssembly 後端時，編譯步驟稍微花費更多時間，這是合理的，因為我們在這一步做了更多的工作——而不是像 fastcomp 那樣僅僅將源文件編譯為位代碼，我們還將位代碼編譯為 WebAssembly。

觀察右側，我們有鏈接步驟的數據（也已標準化至 fastcomp），即生成最終的可執行文件，這裡使用 `-O0`，適合增量構建（對於完全優化的構建，您可能也會使用 `-O3`，如下面所示）。事實證明，編譯步驟的輕微增加是值得的，因為鏈接步驟 **快了 7 倍以上**！這就是增量編譯的真正優勢：鏈接步驟中的大部分僅僅是目標文件的一次快速拼接。而且如果您僅更改了一個源文件並重新構建，那麼幾乎所有需要的就是快速的鏈接步驟，因此您可以在真實世界開發中一直看到這種加速。

如上所述，建構時間的變化會因專案而異。在比 BananaBread 更小的專案中，連結時間的加速可能較小，而在較大的專案中則可能更大。另一個因素是最佳化：如上所述，測試時使用 `-O0` 進行連結，但對於發佈版本的建構，您可能會希望選擇 `-O3`，此時 Emscripten 會對最終的 WebAssembly 呼叫 Binaryen 優化器，執行 [meta-dce](https://hacks.mozilla.org/2018/01/shrinking-webassembly-and-javascript-code-sizes-in-emscripten/)，以及其他對程式碼體積和速度有幫助的操作。這當然需要額外的時間，但對於發佈版本建構來說是值得的——在 BananaBread 上，它將 WebAssembly 的大小從 2.65 MB 縮小到 1.84 MB，提升超過 **30%**。但如果是快速的增量建構，您可以使用 `-O0` 跳過這個步驟。

## 已知問題

儘管 LLVM 的 WebAssembly 後端通常在程式碼大小和速度上都佔優勢，但我們仍觀察到一些例外情況：

- [Fasta](https://github.com/emscripten-core/emscripten/blob/incoming/tests/fasta.cpp) 在沒有 [非截斷的浮點到整數轉換](https://github.com/WebAssembly/nontrapping-float-to-int-conversions) 的情況下性能倒退，這是一項新的 WebAssembly 功能，但未包含於 WebAssembly MVP 中。本質問題是，在 MVP 中，若浮點到整數轉換超出有效整數範圍，將會觸發中斷。理由是，無論如何，這在 C 中是未定義行為，並且易於虛擬機實現。然而，這被證明不適合 LLVM 對浮點到整數轉換的編譯方式，導致需要額外的保護措施，增加了程式碼大小和開銷。新版本中的非截斷操作避免了這個問題，但可能尚未在所有瀏覽器中可用。您可以通過使用 `-mnontrapping-fptoint` 編譯源文件來使用它們。
- LLVM 的 WebAssembly 後端不僅和 fastcomp 使用了不同的後端，而且使用了更新的 LLVM。較新的 LLVM 可能會進行不同的內聯決策，而這些決策（在缺少基於配置導向的最佳化的情況下）是基於啟發式方法的，可能幫助也可能損害。前面提到的 LZMA 基準測試是一個具體的例子，其中更新的 LLVM 將某個函數內聯了五次，結果卻適得其反。如果在您的專案裡遇到這種情況，可以選擇有針對性地以 `-Os` 編譯某些源文件來專注於程式碼大小，或者使用 `__attribute__((noinline))`，等等。

也許還有其他我們尚未察覺但需要優化的問題——如果您發現任何問題，請告訴我們！

## 其他變化

有少數 Emscripten 特性與 fastcomp 和/或 asm.js 綁定，這意味著它們無法與 WebAssembly 後端直接配合使用，因此我們正在開發替代方案。

### JavaScript 輸出

在某些情況下，非 WebAssembly 輸出仍然很重要——儘管所有主流瀏覽器早就支援了 WebAssembly，但仍然有長尾的舊機器、舊手機等不支援 WebAssembly。此外，隨著 WebAssembly 增加新功能，某種形式的這個問題將持續相關。編譯成 JS 是一種保證能覆蓋所有客戶端的方法，即使生成的程式碼不如 WebAssembly 小或快。使用 fastcomp 時，我們直接使用 asm.js 的輸出，但對於 WebAssembly 後端顯然需要其他方案。我們正在使用 Binaryen 的 [`wasm2js`](https://github.com/WebAssembly/binaryen#wasm2js)，顧名思義，它將 WebAssembly 編譯為 JS。

這大概值得單獨寫一篇完整博客，但簡言之，主要的設計決策是：支持 asm.js 已無意義。asm.js 的執行速度遠快於通用 JS，但事實證明，幾乎所有支持 asm.js AOT 優化的瀏覽器都已支援 WebAssembly（實際上，Chrome 通過將 asm.js 轉換為 WebAssembly 來優化它！）。因此，當我們談及一種 JS 後備選項時，大可以不使用 asm.js；事實上，這樣的方案更簡單，允許我們支持更多 WebAssembly 特性，並且生成的 JS 明顯更小！因此，`wasm2js` 並未針對 asm.js。

然而，這一設計的副作用是，如果您在 fastcomp 中測試 asm.js 建構與 WebAssembly 後端的 JS 建構，則在啟用 asm.js AOT 優化的現代瀏覽器中 asm.js 可能會更快。這很可能是您自己的瀏覽器的情況，但不是那些真正需要非 WebAssembly 選項的瀏覽器！為了正確比較，您應使用未啟用 asm.js 優化的瀏覽器。如果 `wasm2js` 輸出仍然較慢，請告訴我們！

`wasm2js` 缺少一些使用較少的功能，例如動態鏈接和執行緒（pthreads），但大多數程式碼應該都能正常工作，並且它已經被仔細測試過。要測試 JS 輸出，只需使用 `-s WASM=0` 建置以禁用 WebAssembly。`emcc` 將為您執行 `wasm2js`，如果這是一個優化的建置，它還將運行多種有用的優化。

### 您可能注意到的其他變化

- [Asyncify](https://github.com/emscripten-core/emscripten/wiki/Asyncify) 和 [Emterpreter](https://github.com/emscripten-core/emscripten/wiki/Emterpreter) 選項僅在 fastcomp 中有效。一個替代方案[正在](https://github.com/WebAssembly/binaryen/pull/2172)[開發](https://github.com/WebAssembly/binaryen/pull/2173)[過程](https://github.com/emscripten-core/emscripten/pull/8808)[中](https://github.com/emscripten-core/emscripten/issues/8561)。我們期望它最終能改進之前的選項。
- 必須重建預先編譯的函式庫：如果您有一些使用 fastcomp 編譯的 `library.bc`，那麼您需要使用新版 Emscripten 從源碼重新編譯。當 fastcomp 升級 LLVM 並更改位代碼格式時，這一直是必要的。如今更改為 WebAssembly 物件檔案而非位代碼，也會產生相同的影響。

## 結論

我們目前的主要目標是修復與此次變更相關的任何錯誤。請進行測試並提交問題！

在一切穩定之後，我們將把預設編譯器後端切換為上游 WebAssembly 後端。如前所述，Fastcomp 仍將作為一種選項。

我們最終希望完全移除 Fastcomp。這樣做可以減少大量維護負擔，使我們能更專注於 WebAssembly 後端的新功能，促進 Emscripten 的普遍改進，並帶來其他好處。請告訴我們您的代碼庫測試情況，讓我們能開始規劃移除 Fastcomp 的時間表。

### 感謝

感謝所有參與 LLVM WebAssembly 後端、`wasm-ld`、Binaryen、Emscripten 及本文中提到的其它事物的開發者！以下是一部分傑出人員的名單：aardappel, aheejin, alexcrichton, dschuff, jfbastien, jgravelle, nwilson, sbc100, sunfish, tlively, yurydelendik。
