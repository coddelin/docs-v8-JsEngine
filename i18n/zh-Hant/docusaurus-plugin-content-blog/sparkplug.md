---
title: "Sparkplug — 一種非最佳化 JavaScript 編譯器"
author: "[Leszek Swirski](https://twitter.com/leszekswirski) — 也許不是最閃耀的火花，但至少是最快的那些"
avatars: 
  - leszek-swirski
date: 2021-05-27
tags: 
  - JavaScript
extra_links: 
  - href: "https://fonts.googleapis.com/css?family=Gloria+Hallelujah&display=swap"
    rel: "stylesheet"
description: "在 V8 v9.1 中，我們透過 Sparkplug：新型非最佳化的 JavaScript 編譯器，將 V8 性能提升 5–15%。"
tweet: "1397945205198835719"
---

<!-- markdownlint-capture -->
<!-- markdownlint-disable no-inline-html -->
<style>
  svg \{
    --other-frame-bg: rgb(200 200 200 / 20%);
    --machine-frame-bg: rgb(200 200 200 / 50%);
    --js-frame-bg: rgb(212 205 100 / 60%);
    --interpreter-frame-bg: rgb(215 137 218 / 50%);
    --sparkplug-frame-bg: rgb(235 163 104 / 50%);
  \}
  svg text \{
    font-family: Gloria Hallelujah, cursive;
  \}
  .flipped .frame \{
    transform: scale(1, -1);
  \}
  .flipped .frame text \{
    transform: scale(1, -1);
  \}
</style>
<!-- markdownlint-restore -->

<!--truncate-->
撰寫高效能的 JavaScript 引擎不僅僅需要一個高度最佳化的編譯器，比如 TurboFan。尤其是對於短暫的執行像載入網站或者命令列工具，還有很多工作在最佳化編譯器甚至開始最佳化之前就需要完成，更不用說生成最佳化程式碼的時間了。

這就是為什麼自 2016 年起，我們從追蹤合成基準測試（比如 Octane）轉向測量[真實世界的效能](/blog/real-world-performance)，並且為什麼自那時起我們一直致力於改善 JavaScript 在最佳化編譯器之外的效能。這包括解析器的改進、串流處理、物件模型、垃圾回收器的併發性以及已編譯程式碼的快取等工作……總之，我們從來沒有無事可做。

然而，當我們努力改善初始 JavaScript 執行的實際性能時，我們在最佳化解釋器的過程中開始遇到一些限制。V8 的解釋器已高度最佳化並非常快速，但解釋器本身具有一些我們無法避免的固有開銷，比如 bytecode 解碼以及作為解釋器功能固有一部分的指令開銷。

使用我們目前的雙編譯器模型，我們無法更快地提升至最佳化程式碼；我們可以（且正在努力）使最佳化更快，但到某個程度，你只能通過移除最佳化流程來提高速度，而這會降低高峰性能。更糟的是，我們無法真正更早地開始最佳化，因為此時還無法獲得穩定的物件形狀回饋。

引入 Sparkplug：我們的新的非最佳化 JavaScript 編譯器，在 V8 v9.1 中推出，它位於 Ignition 解釋器和 TurboFan 最佳化編譯器之間。

![新的編譯器管線](/_svg/sparkplug/pipeline.svg)

## 一個快速的編譯器

Sparkplug 旨在快速編譯。非常快速。如此快速，我們幾乎可以在任何需要的時候進行編譯，讓我們能夠比 TurboFan 更積極地升級至 Sparkplug 程式碼。

使 Sparkplug 編譯器快速的有幾個小技巧。首先，它作弊；它編譯的函式已經編譯成了 bytecode，並且 bytecode 編譯器已經完成了大部分像變數解析、確定括號是否實際上是箭頭函式、解構語句等的繁重工作。Sparkplug 從 bytecode 而非 JavaScript 源程式進行編譯，因此不需要擔心這些問題。

其次，Sparkplug 不像大多數編譯器那樣生成任何中間表示（IR）。相反，它直接從 bytecode 編譯到機器碼，以單一線性通過的方式瀏覽 bytecode，生成符合該 bytecode 執行的程式碼。實際上，整個編譯器是一個 [`switch` 陳述式](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/baseline/baseline-compiler.cc;l=465;drc=55cbb2ce3be503d9096688b72d5af0e40a9e598b) 位於一個 [`for` 迴圈](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/baseline/baseline-compiler.cc;l=290;drc=9013bf7765d7febaa58224542782307fa952ac14) 中，負責調度固定的每 bytecode 機器碼生成函式。

```cpp
// Sparkplug 編譯器（簡化版）。
for (; !iterator.done(); iterator.Advance()) {
  VisitSingleBytecode();
}
```

由於缺少中間表示（IR），編譯器的最佳化機會有限，除了非常局部的窺孔最佳化之外。這也意味著我們必須為每一种架構單獨移植整個實現，因為沒有架構無關的中間階段。但事實證明，這些都不是問題：快速的編譯器是一個簡單的編譯器，所以代碼移植非常容易；而且 Sparkplug 不需要進行大量的最佳化，因為我們在流程的稍後階段有一個非常出色的最佳化編譯器。

:::note
從技術上講，我們目前對字節碼執行了兩次遍歷——一次是發現迴圈，另一個是生成實際代碼。不過，我們計劃最終去掉第一個遍歷。
:::

## 與解釋器兼容的堆疊幀

在現有的成熟 JavaScript 虛擬機上添加一個新的編譯器是一項艱鉅的任務。除了標準執行之外，還有許多其他功能需要支持；例如 V8 有一個調試器、堆疊遍歷 CPU 分析器、例外的堆疊跟蹤、與分層升級的集成、熱迴圈的堆上替換至最佳化代碼……這是一大堆工作。

Sparkplug 做了一個非常巧妙的嘗試，簡化了大部分問題，那就是它維持了“與解釋器兼容的堆疊幀”。

讓我們稍微倒回一下。堆疊幀是代碼執行存儲函數狀態的方式；每次調用新函數時，它會為該函數的局部變量創建一個新的堆疊幀。堆疊幀由一個幀指針（標記其開始）和一個堆疊指針（標記其結束）定義：

![一個堆疊幀，具有堆疊指針和幀指針](/_svg/sparkplug/basic-frame.svg)

:::note
<!-- markdownlint-capture -->
<!-- markdownlint-disable no-inline-html -->
此時，你們中的大約一半人會尖叫著說“這個圖表沒有意義，堆疊顯然是朝相反的方向增長的！”別擔心，我為你們設計了一個按鈕：<button id="flipStacksButton">我認為堆疊是向上增長的</button>
<script src="/js/sparkplug.js">
</script>
<!-- markdownlint-restore -->
:::

當函數被調用時，返回地址被推入堆疊；當函數返回時，這地址會被彈出，以確定返回的位置。接著，當該函數創建新的幀時，它會將舊的幀指針保存到堆疊，並將新的幀指針設置為其自身堆疊幀的開始。因此，堆疊有一個幀指針鏈，每個指針標記幀的開始並指向前一個幀：

![多次調用的堆疊幀](/_svg/sparkplug/machine-frame.svg)

:::note
嚴格來說，這只是生成代碼遵循的一種慣例，而非必要要求。不過基本上是普遍的；只有在完全省略堆疊幀或調試側表可以用於遍歷堆疊幀時，才會真正突破這個慣例。
:::

這是所有類型函數的一般堆疊布局；然後會有一些關於參數如何傳遞以及函數如何在其幀中存儲值的慣例。在 V8 中，我們對 JavaScript 幀的約定是，在函數被調用之前，參數（包括接收者）會[以相反順序](/blog/adaptor-frame)推入堆疊，堆疊的前幾個槽是：當前被調用的函數；調用該函數的上下文；以及傳遞的參數數量。這就是我們的“標準”JavaScript幀布局：

![V8 JavaScript 堆疊幀](/_svg/sparkplug/js-frame.svg)

這種 JS 調用約定在最佳化幀和解釋幀之間是共享的，這使我們能夠，例如在調試器的性能面板中剖析代碼時，以最小的開銷遍歷堆疊。

在 Ignition 解釋器的情況下，這個約定更加明確。Ignition 是基於暫存器的解釋器，這意味著存在一些虛擬暫存器（不要與機器暫存器混淆！）用於存儲解釋器的當前狀態——這包括 JavaScript 函數的局部（var/let/const 聲明）和臨時值。這些暫存器存儲在解釋器的堆疊幀上，與一個指向字節碼數組的指針以及該數組中當前字節碼的偏移量一起存儲：

![V8 解釋器堆疊幀](/_svg/sparkplug/interpreter-frame.svg)

Sparkplug 有意創建並維護一種與解釋器幀匹配的幀布局；每當解釋器存儲一個暫存器值時，Sparkplug 也會存儲一個。它這麼做有幾個原因：

1. 它簡化了 Sparkplug 的編譯；Sparkplug 可以直接鏡像解釋器的行為，而無需保持某種暫存器與 Sparkplug 狀態之間的映射。
1. 它也加快了編譯速度，因為字節碼編譯器已完成了暫存器分配的艱難工作。
1. 它使與系統其餘部分的集成幾乎變得微不足道；調試器、分析器、例外堆棧解除、堆疊追踪列印，所有這些操作都通過堆疊遍歷來發現當前正在執行的函數堆疊，而所有這些操作在 Sparkplug 中幾乎不變，因為就它們而言，所有它們有的仍然是解釋器幀。
1. 它使得棧上替換 (OSR) 變得微不足道。OSR 是指當前執行的函數在執行過程中被替換；目前這發生在解釋執行的函數處於熱迴圈時（此時升級為該迴圈的優化代碼），以及優化代碼退化時（降級並繼續在解釋器中執行）。當 Sparkplug 的棧幀與解釋器的棧幀鏡像對應時，適用於解釋器的任何 OSR 邏輯也適用於 Sparkplug；更棒的是，我們可以幾乎無需棧幀轉換的額外開銷在解釋器和 Sparkplug 代碼之間切換。

我們對解釋器棧幀做了一個小改變，即在 Sparkplug 代碼執行期間，我們不會保持字節碼偏移的更新狀態。取而代之的是，我們存儲從 Sparkplug 代碼地址範圍到對應字節碼偏移的雙向映射；這是一個相對簡單的映射，因為 Sparkplug 代碼直接從對字節碼的線性遍歷中產生。每當棧幀存取需要知道 Sparkplug 棧幀的“字節碼偏移”時，我們查找當前正在執行的指令在此映射中的對應值，並返回對應的字節碼偏移。同樣地，每當我們希望從解釋器 OSR 到 Sparkplug 時，我們可以在映射中查找當前的字節碼偏移，然後跳到對應的 Sparkplug 指令。

你可能注意到現在棧幀中有一個未使用的槽位，即原本字節碼偏移所在的位置；由於我們希望保持棧的其餘部分不變，因此無法刪除此槽位。我們將此棧位重新利用，來緩存當前執行函數的“反饋向量”；這是存儲對象形狀數據的向量，大多數操作需要加載此數據。我們需要在 OSR 周圍稍加小心，確保在此槽位中交換正確的字節碼偏移或正確的反饋向量。

因此 Sparkplug 的棧幀是：

![A V8 Sparkplug stack frame](/_svg/sparkplug/sparkplug-frame.svg)

## 委派給內建函數

Sparkplug 實際上生成的自主代碼非常少。JavaScript 語義複雜，即使是執行最簡單的操作也需要大量代碼。如果強迫 Sparkplug 在每次編譯時內聯重生成此代碼，會因多種原因導致不良影響：

  1. 需要生成的大量代碼會明顯增加編譯時間，
  2. 會增加 Sparkplug 代碼的內存消耗，並且
  3. 我們不得不為 Sparkplug 重新實現一堆 JavaScript 功能的代碼生成，這可能導致更多漏洞以及更大的安全風險。

所以，我們沒有採取這種方式，而是讓大多數 Sparkplug 代碼調用“內建函數”（嵌入到二進制中的小段機器代碼）來執行實際的工作。這些內建函數要麼與解釋器使用的相同，要麼與解釋器的字節碼處理程序共享大部分代碼。

事實上，Sparkplug 代碼基本上只是內建函數調用和控制流：

你可能會想，“那麼，這一切的意義何在？Sparkplug 不就是在做解釋器的相同工作嗎？”——你不完全錯。在許多方面，Sparkplug 僅僅是將解釋器執行序列化，調用相同的內建函數並維持相同的棧幀。不過，即使僅僅這樣也是值得的，因為它移除了那些無法避免的解釋器開銷（或者更準確地說，預先編譯了這些開銷），例如操作數解碼和下一個字節碼的分發。

事實證明，解釋器引入了大量 CPU 優化障礙：解釋器從內存中動態讀取靜態操作數，迫使 CPU 要麼停滯，要麼推測可能的值；分發到下一個字節碼需要成功的分支預測才能保持性能，即使推測和預測正確，你仍然需要執行所有的解碼和分發代碼，並且佔用了緩存和緩衝區中的寶貴空間。CPU 實際上本身就是一個解釋器，只不過解釋的是機器代碼；從這個角度看，Sparkplug 是將 Ignition 字節碼“轉譯”為 CPU 字節碼的“編譯器”，從而將函數從運行在“模擬器”上轉為運行在“原生”上。

## 性能

那麼，Sparkplug 在現實中效果如何？我們在幾個性能測試機器上，使用帶 Sparkplug 和不帶 Sparkplug 的 Chrome 91，以及一些基準測試來測量它的影響。

劇透：我們對結果非常滿意。

:::note
以下基準測試列出了運行不同操作系統的各種測試機器。儘管操作系統在機器名稱中很突出，我們認為實際上對結果影響不大；主要差異來自於不同機器的 CPU 和內存配置，這才是導致差異的主要因素。
:::

# Speedometer

[Speedometer](https://browserbench.org/Speedometer2.0/) 是一個試圖模擬現實世界網站框架使用情況的基準測試，用幾個流行框架構建一個待辦事項跟蹤應用，並在添加和刪除待辦事項時壓測應用性能。我們發現它很好地反映了實際加載和交互行為，並且多次證明 Speedometer 的改進會反映在我們的真實世界指標中。

啟用 Sparkplug 后，Speedometer 分數提高了 5-10%，具體取決於我們觀察的是哪台測試機器。

![使用Sparkplug在多個性能機器上，Speedometer分數的中值改進。誤差範圍表示四分位範圍。](/_img/sparkplug/benchmark-speedometer.svg)

# 瀏覽基準

Speedometer是一個很好的基準，但它只呈現了一部分情況。我們另外還有一組“瀏覽基準”，其包含一些真實網站的錄製，可以回放、編寫部分交互腳本，並更真實地觀察我們各種指標在真實世界中的表現。

在這些基準上，我們選擇查看我們的“V8主線程時間”指標，該指標衡量在主線程上V8所花費的總時間（包括編譯和執行），不包括流式解析或後台優化編譯。這是我們最佳的方式來查看Sparkplug是否物有所值，並排除其他基準噪音的影響。

結果因機器和網站有所不同，但整體來看非常好：我們看到約5–15%的改進。

::: figure 使用10次重複測試，在瀏覽基準上的V8主線程時間中值改進。誤差範圍表示四分位範圍。
![Linux性能機器的測試結果](/_img/sparkplug/benchmark-browsing-linux-perf.svg) ![Win-10性能機器的測試結果](/_img/sparkplug/benchmark-browsing-win-10-perf.svg) ![Mac-10_13高端筆記本性能機器的測試結果](/_img/sparkplug/benchmark-browsing-mac-10_13_laptop_high_end-perf.svg) ![Mac-10_12低端筆記本性能機器的測試結果](/_img/sparkplug/benchmark-browsing-mac-10_12_laptop_low_end-perf.svg) ![Mac-M1迷你2020性能機器的測試結果](/_img/sparkplug/benchmark-browsing-mac-m1_mini_2020-perf.svg)
:::

總結：V8擁有一個新的超快非優化編譯器，其在真實世界基準上的性能提升了5–15%。它已可在V8 v9.1版本中通過 `--sparkplug` 標誌使用，並將在Chrome 91中推出。
