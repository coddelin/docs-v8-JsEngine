---
title: 'Liftoff: 一個全新的基線編譯器，用於 V8 中的 WebAssembly'
author: 'Clemens Backes，WebAssembly 編譯大師'
avatars:
  - 'clemens-backes'
date: 2018-08-20 15:45:12
tags:
  - WebAssembly
  - 深入探討
description: 'Liftoff 是一個全新的 WebAssembly 基線編譯器，已集成於 V8 v6.9。'
tweet: '1031538167617413120'
---
V8 [v6.9](/blog/v8-release-69) 包含了一個名為 Liftoff 的全新基線編譯器，用於 WebAssembly。Liftoff 現已在桌面系統上預設啟用。本文詳細介紹了新增另一編譯層的動機，並描述了 Liftoff 的實現方式及其性能表現。

<!--truncate-->
<figure>
  <img src="/_img/v8-liftoff.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Liftoff 的標誌，V8 的 WebAssembly 基線編譯器</figcaption>
</figure>

自 WebAssembly [推出](/blog/v8-release-57) 已超過一年以來，其在網頁上的採用率逐步上升。大型針對 WebAssembly 的應用程序已開始出現。例如，Epic 的 [ZenGarden 基準測試](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html) 包含了一個 39.5 MB 的 WebAssembly 二進制文件，而 [AutoDesk](https://web.autocad.com/) 則提供了一個 36.8 MB 的二進制文件。由於編譯時間本質上與二進制文件大小呈線性關係，這些應用程序啟動所需的時間相當長。在許多機器上，啟動超過 30 秒，這無法提供良好的用戶體驗。

那麼，如果類似的 JS 應用程序啟動速度更快，為什麼 WebAssembly 應用程序啟動時間這麼長呢？原因在於 WebAssembly 承諾提供 *可預測的性能*，一旦應用程序運行，你可以確保穩定地達到性能目標（例如呈現 60fps 的畫面、無音頻延遲或瑕疵等）。為了實現這一點，WebAssembly 代碼在 V8 中被 *提前編譯*（ahead-of-time compilation），以避免僅在運行期間進行編譯（just-in-time compilation）所引入的暫停，從而可能導致應用程序明顯卡頓。

## 現有的編譯流水線（TurboFan）

V8 對 WebAssembly 的編譯方式依賴於 *TurboFan*，這是我們專門為 JavaScript 和 asm.js 設計的優化編譯器。TurboFan 是一個功能強大的編譯器，使用基於圖的 *中間表示（IR）*，適合進行高級優化，例如強度減少、內聯、代碼移動、指令合併以及複雜的寄存器分配。TurboFan 的設計支持在流水線的末端進入，接近機器代碼，這繞過了支持 JavaScript 編譯所需的許多階段。設計上，將 WebAssembly 代碼轉換成 TurboFan 的 IR（包括 [_SSA 建構_](https://en.wikipedia.org/wiki/Static_single_assignment_form)）可以通過簡單的單次遍歷高效完成，部分原因是由於 WebAssembly 的結構化控制流。然而，編譯過程的後端仍然消耗了相當多的時間和內存。

## 全新的編譯流水線（Liftoff）

Liftoff 的目標是通過盡可能快地生成代碼來減少基於 WebAssembly 的應用程序的啟動時間。代碼質量是次要的，因為熱代碼最終仍然會使用 TurboFan 重新編譯。Liftoff 避免了構建 IR 所需的時間和內存開銷，通過一次性遍歷 WebAssembly 函數的字節碼直接生成機器代碼。

![Liftoff 的編譯流水線比起 TurboFan 的編譯流水線簡單很多。](/_img/liftoff/pipeline.svg)

從上圖中可以明顯看出，Liftoff 應該能夠比 TurboFan 更快地生成代碼，因為流水線僅由兩個階段組成。事實上，*函數體解碼器* 會遍歷原始 WebAssembly 字節的單次遍歷，並通過回調與後續階段互動，因此 *代碼生成* 是在解碼和驗證函數體時同時進行的。結合 WebAssembly 的 *[流式 API](/blog/v8-release-65)*，這使得 V8 能在通過網絡下載代碼的同時編譯 WebAssembly 至機器代碼。

### Liftoff 的代碼生成

Liftoff 是一個簡單的程式碼生成器，而且快速。它只對函數的操作碼進行一次遍歷，並且逐個操作碼生成相應的代碼。對於像算術運算這樣簡單的操作碼，通常只需生成一條機器指令，但對其他如調用（calls）類的操作碼可能需要生成更多指令。Liftoff 維護了一個關於操作數堆疊的元數據，用以記錄每個操作的輸入目前存儲的位置。這個 *虛擬堆疊* 僅在編譯期間存在。WebAssembly 的結構化控制流和驗證規則保證了這些輸入的位置可以靜態確定。因此，不需要一個實際的運行時堆疊來推入和彈出操作數。在執行期間，虛擬堆疊上的每個值要麼存儲在寄存器中，要麼溢出到該函數的物理堆棧框架中。對於小的整數常量（由 `i32.const` 生成），Liftoff 僅在虛擬堆疊中記錄該常量的值，且不生成任何代碼。只有當常量被後續操作使用時，才會被發送或與操作合併，比如直接在 x64 上發送一個 `addl <reg>, <const>` 指令。這樣可以避免將該常量加載到寄存器中，從而生成更好的代碼。

讓我們通過一個非常簡單的函數來看看 Liftoff 如何為其生成代碼。

![](/_img/liftoff/example-1.svg)

此示例函數接收兩個參數並返回它們的和。當 Liftoff 解碼此函數的字節時，它首先根據 WebAssembly 函數的調用約定為局部變量初始化內部狀態。對於 x64，V8 的調用約定是在寄存器 *rax* 和 *rdx* 中傳遞這兩個參數。

對於 `get_local` 指令，Liftoff 不會生成任何代碼，而是僅更新其內部狀態以反映這些寄存器值現在已推入到虛擬堆疊中。接下來，`i32.add` 指令將彈出這兩個寄存器並為結果值選擇一個寄存器。我們不能用任何輸入寄存器來存儲結果，因為這兩個寄存器仍然需要在堆疊中存儲局部變量。覆蓋它們會更改稍後由 `get_local` 指令返回的值。因此，Liftoff 選擇了一個空閒寄存器，在這個例子中是 *rcx*，並將 *rax* 和 *rdx* 的和生成到該寄存器中。*rcx* 然後被推入到虛擬堆疊。

在執行完 `i32.add` 指令後，函數體結束，因此 Liftoff 必須組裝函數的返回。由於我們的示例函數有一個返回值，驗證要求在函數體的結尾虛擬堆棧上必須正好有一個值。因此 Liftoff 生成代碼，將存儲在 *rcx* 中的返回值移動到正確的返回寄存器 *rax*，然後從函數返回。

為了簡化，我們上面的例子不包含任何塊（`if`、`loop` 等）或分支。WebAssembly 中的塊引入控制合併，因為程式碼可以分支到任何父塊，並且 if 塊可以被跳過。這些合併點可能是從不同的堆栈狀態到達的。然而，後續的代碼必須假設一個特定的堆疊狀態來生成代碼。因此，Liftoff 將虛擬堆疊的當前狀態快照為後續新塊程式碼將假設的狀態（即返回到我們目前所在的 *控制層* 時）。新的塊將會繼續以當前的活動狀態運行，潛在地改變堆疊值或局部變量的存儲位置：一些可能被溢出到堆棧中，或存儲在其他寄存器中。當分支到另一個塊或者結束一個塊（這等同於分支到父塊）時，Liftoff 必須生成代碼，將當前狀態適配為該點的預期狀態，以便我們分支的目標輸出其期望的值。驗證保證當前虛擬堆棧的高度與預期狀態的高度匹配，因此 Liftoff 只需要生成代碼來在寄存器和/或物理堆棧框架之間調整值，就像下面顯示的一樣。

讓我們看一個案例。

![](/_img/liftoff/example-2.svg)

上面的例子假設一個包含兩個操作數堆疊值的虛擬堆疊。在開始新塊之前，虛擬堆疊頂部的值作為 `if` 指令的參數被彈出。而剩餘的堆疊值需要放入另一個寄存器，因為現在它被用作第一個參數的影響，但在返回到這個狀態時我們可能需要為堆疊值和參數持有兩個不同的值。在這個例子中，Liftoff 選擇將它去重到 *rcx* 寄存器。該狀態隨後被快照，並在塊內修改為有效狀態。在塊的末尾，我們隱式地返回到父塊，因此通過將寄存器 *rbx* 移動到 *rcx* 並從堆棧框架重新加載寄存器 *rdx*，我們將當前狀態與快照合併。

### 從 Liftoff 到 TurboFan 的分層提升

有了 Liftoff 和 TurboFan，V8 現在擁有了 WebAssembly 的兩個編譯層：Liftoff 作為快速啟動的基線編譯器，TurboFan 作為追求最大性能的優化編譯器。這就引出了如何結合這兩種編譯器以提供最佳用戶體驗的問題。

對於 JavaScript，V8 使用 Ignition 解釋器和 TurboFan 編譯器，並採用動態分層策略。每個函數首先在 Ignition 中執行，如果該函數變得熱點化，TurboFan 會將其編譯為高度優化的機器代碼。類似的方法也可以用於 Liftoff，但其中的權衡稍有不同：

1. WebAssembly 不需要類型反饋來生成快速代碼。而 JavaScript 通過收集類型反饋能極大地受益，WebAssembly 是靜態類型的，因此引擎可以立即生成優化後的代碼。
1. WebAssembly 程式碼應該執行得*可預測且快速*，無需冗長的暖機階段。應用程式選擇目標 WebAssembly 的原因之一是能夠在網頁上執行，並提供*可預測的高效能*。因此，我們既不能容忍長時間執行次優化的程式碼，也不接受執行期間的編譯中斷。
1. JavaScript 的 Ignition 解譯器一個重要的設計目標是通過完全不編譯函數來減少記憶體使用。但我們發現 WebAssembly 的解譯器太慢了，無法實現可預測快速性能的目標。我們確實構建了這樣的解譯器，但其執行速度比編譯後的程式碼慢 20 倍或以上，無論它省下多少記憶體，都只能用於調試。基於這點，引擎仍然必須存儲編譯後的程式碼；最終其應只存儲最緊湊及高效的程式碼，也就是 TurboFan 優化的程式碼。

基於這些限制，我們認為動態分層升級（dynamic tier-up）對目前 V8 的 WebAssembly 實現來說並不是一個合適的取捨，因為它會增加程式碼大小並在不可定義的時間範圍內降低效能。相反，我們選擇了*急切分層升級*策略。在 Liftoff 編譯模組完成後，WebAssembly 引擎立即啟動背景執行緒以生成模組的優化程式碼。這使得 V8 能夠快速開始執行程式碼（當 Liftoff 完成後），但仍能儘早提供最具效能的 TurboFan 程式碼。

下圖顯示了編譯和執行 [EpicZenGarden 基準測試](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html) 的追蹤。它顯示了在 Liftoff 編譯完成後，我們可以實例化 WebAssembly 模組並開始執行它。TurboFan 編譯仍需幾秒鐘以上，因此在分層升級期間，觀察到的執行效能逐漸提高，因為個別的 TurboFan 函數會在完成時立即使用。

![](/_img/liftoff/tierup-liftoff-turbofan.png)

## 效能

有兩個指標對新 Liftoff 編譯器的效能評估很有趣。首先，我們希望將編譯速度（即生成程式碼的時間）與 TurboFan 進行比較。第二，我們希望測量生成程式碼的效能（即執行速度）。在這裡，前者更為重要，因為 Liftoff 的目標是通過快速生成程式碼來減少啟動時間。另一方面，生成程式碼的效能仍需相當不錯，因為在低端硬體上，這些程式碼可能會執行幾秒甚至幾分鐘。

### 程式碼生成效能

為了測量*編譯器效能*本身，我們運行了一些基準測試並使用追蹤測量了原始編譯時間（參見上圖）。我們在 HP Z840 機器（2 x Intel Xeon E5-2690 @2.6GHz, 24 核心, 48 線程）和 Macbook Pro（Intel Core i7-4980HQ @2.8GHz, 4 核心, 8 線程）上執行基準測試。請注意，Chrome 目前僅使用不超過 10 個背景執行緒，因此 Z840 機器的大多數核心都處於未使用狀態。

我們執行了三個基準測試：

1. [**EpicZenGarden**](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html)：Epic 框架上的 ZenGarden 演示
1. [**Tanks!**](https://webassembly.org/demo/)：Unity 引擎的一個演示
1. [**AutoDesk**](https://web.autocad.com/)
1. [**PSPDFKit**](https://pspdfkit.com/webassembly-benchmark/)

對於每個基準測試，我們使用上面顯示的追蹤輸出測量原始編譯時間。這個數字比基準測試本身報告的任何時間更穩定，因為它不依賴於任務在主執行緒上的調度，也不包含創建實際 WebAssembly 實例等不相關的工作。

下圖顯示了這些基準測試的結果。每個基準測試均執行三次，我們報告平均編譯時間。

![Liftoff 與 TurboFan 在 MacBook 上的程式碼生成效能](/_img/liftoff/performance-unity-macbook.svg)

![Liftoff 與 TurboFan 在 Z840 上的程式碼生成效能](/_img/liftoff/performance-unity-z840.svg)

不出所料，Liftoff 編譯器在高端桌面工作站以及 MacBook 上生成程式碼都要快得多。對於效能較差的 MacBook 硬體，Liftoff 比 TurboFan 的速度提升更加顯著。

### 生成程式碼的效能

儘管生成程式碼的效能並不是主要目標，但我們希望保持用戶在啟動階段的高效能體驗，因為 Liftoff 程式碼在 TurboFan 程式碼完成之前可能會執行幾秒鐘。

為了測量 Liftoff 程式碼效能，我們關閉了分層升級，以測量純粹的 Liftoff 執行。基於此設定，我們執行了兩個基準測試：

1. **Unity 無頭基準測試**

    這是一系列在 Unity 框架中運行的基準測試。它們是無頭的，因此可以直接在 d8 shell 中執行。每個基準測試報告一個分數，這分數不一定與執行效能成正比，但足以比較效能。

1. [**PSPDFKit**](https://pspdfkit.com/webassembly-benchmark/)

   此基準測試報告了在 PDF 文件上執行不同操作所需的時間，以及實例化 WebAssembly 模組（包括編譯）所需的時間。

和之前一樣，我們每次基準測試都執行三次，並使用三次執行的平均值作為結果。由於在每個基準測試中記錄的數字範圍顯著不同，我們報告*Liftoff 與 TurboFan 的相對性能*。*+30%* 的值表示 Liftoff 的代碼運行速度比 TurboFan 慢 30%。負值表示 Liftoff 執行得更快。以下是結果：

![Unity 上的 Liftoff 性能](/_img/liftoff/performance-unity-compile.svg)

在 Unity 上，Liftoff 代碼平均來說比 TurboFan 代碼在桌面機器上慢 50%，在 MacBook 上慢 70%。有趣的是，在某些情況下（例如 Mandelbrot Script），Liftoff 的代碼比 TurboFan 的代碼表現更好。這可能是一個極端例子，例如 TurboFan 的寄存器分配器在一個熱循環中表現不佳。我們正在調查是否可以改進 TurboFan 來更好地處理這種情況。

![PSPDFKit 上的 Liftoff 性能](/_img/liftoff/performance-pspdfkit-compile.svg)

在 PSPDFKit 基準測試中，Liftoff 的代碼執行速度比經過優化的代碼慢 18-54%，而初始化顯著改善，這是預期的結果。這些數據顯示，對於與瀏覽器通過 JavaScript 調用進行交互的實際代碼，未優化代碼的性能損失通常低於更多計算密集型的基準測試。

此外，需要注意的是，為了獲得這些數據，我們完全關閉了層級提升，因此我們只執行了 Liftoff 代碼。在生產配置中，Liftoff 的代碼將逐漸被 TurboFan 的代碼取代，這樣 Liftoff 的較低性能只會持續短時間。

## 未來工作

在 Liftoff 初次發布後，我們正在努力進一步改善啟動時間，減少記憶體使用，並將 Liftoff 的優勢帶給更多用戶。特別是，我們正在改進以下內容：

1. **將 Liftoff 移植到 arm 和 arm64 以在移動設備上使用。** 目前，Liftoff 僅針對 Intel 平台（32 和 64 位）實現，主要處理桌面使用情況。為了覆蓋移動用戶，我們將把 Liftoff 移植到更多架構。
1. **為移動設備實現動態層級提升。** 由於移動設備的可用記憶體比桌面系統少得多，我們需要針對這些裝置調整分層策略。僅僅使用 TurboFan 重新編譯所有函數，至少暫時會使持有所有代碼的記憶體需求翻倍（直到 Liftoff 代碼被丟棄）。我們正在嘗試結合使用 Liftoff 的惰性編譯和 TurboFan 中熱函數的動態層級提升。
1. **提高 Liftoff 代碼生成的性能。** 初始實現的第一版通常不是最佳的。我們還有很多可以優化的地方，可以進一步提升 Liftoff 的編譯速度。這些改進會隨著接下來的版本逐步實現。
1. **提升 Liftoff 代碼的性能。** 除了編譯器本身，生成代碼的大小和速度也可以改進。這些改進也會隨著接下來的版本逐步完成。

## 結論

V8 現在包含 Liftoff，一個為 WebAssembly 設計的新型基線編譯器。Liftoff 使用簡單而快速的代碼生成器大幅減少 WebAssembly 應用程序的啟動時間。在桌面系統上，V8 仍然通過在後台使用 TurboFan 重新編譯所有代碼來實現最大峰值性能。Liftoff 在 V8 v6.9（Chrome 69）中默認啟用，可以通過 `--liftoff`/`--no-liftoff` 和 `chrome://flags/#enable-webassembly-baseline` 標誌分別進行顯式控制。
