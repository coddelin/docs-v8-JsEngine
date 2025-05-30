---
title: "V8 中的指針壓縮"
author: "Igor Sheludko 和 Santiago Aboy Solanes, *指針壓縮者"
avatars: 
  - "igor-sheludko"
  - "santiago-aboy-solanes"
date: 2020-03-30
tags: 
  - internals
  - memory
description: "V8 將其堆大小減少至最多 43%！了解詳細資訊，見“V8 中的指針壓縮”！"
tweet: "1244653541379182596"
---
記憶體和效能之間總是一場持續的鬥爭。作為使用者，我們希望事情既快速又盡可能少地消耗記憶體。不幸的是，通常提升效能會以增加記憶體消耗為代價（反之亦然）。

<!--truncate-->
早在 2014 年，Chrome 便從 32 位元進程切換為 64 位元進程。這給予了 Chrome 更好的[安全性、穩定性和效能](https://blog.chromium.org/2014/08/64-bits-of-awesome-64-bit-windows_26.html)，但卻增加了記憶體成本，因為每個指針的大小從 4 個位元組增至了 8 個。我們接受了挑戰，努力減少 V8 中的記憶體開銷，希望能回收所有浪費的 4 個位元組。

在深入實施之前，我們需要瞭解自己的立場，才能正確評估情況。為了測量記憶體和效能的使用，我們使用了一組[網頁](https://v8.dev/blog/optimizing-v8-memory)，這些網頁反映了流行的真實網站。數據顯示，V8 佔桌面版 Chrome 的[渲染進程](https://www.chromium.org/developers/design-documents/multi-process-architecture)記憶體消耗比例最高可達 60%，平均為 40%。

![V8 在 Chrome 的渲染記憶體中的記憶體消耗百分比](/_img/pointer-compression/memory-chrome.svg)

指針壓縮是 V8 中減少記憶體消耗的幾項持續努力之一。其理念非常簡單：與其存儲 64 位指針，我們可以存儲距某個“基址”的 32 位偏移量。基於這樣一個簡單的理念，我們在 V8 中能從此壓縮中獲得多少收益？

V8 堆包含各種各樣的項目，例如浮點值、字串字符、解釋器位元碼和標記值（詳細內容請見下一部分）。檢查堆後，我們發現，對於真實的網站，這些標記值大約佔 V8 堆大小的 70%！

讓我們仔細看看什麼是標記值。

## V8 中的值標記

V8 中的 JavaScript 值表示為對象並分配於 V8 堆上，無論是對象、數組、數字還是字串。這使我們能將任何值表示為指向對象的指針。

許多 JavaScript 程式針對整數值進行計算，例如在一個循環中遞增索引。為了避免每次遞增整數時都需要分配一個新的數字對象，V8 使用了知名的[指針標記](https://en.wikipedia.org/wiki/Tagged_pointer)技術，以便在 V8 堆指針中存儲額外或替代數據。

標記位擔負了雙重作用：它們既用於指示位於 V8 堆中的強/弱指針，也用於表示小整數。因此，整數值可以直接存儲在標記值中，而無需為其分配額外的存儲。

V8 總是在字對齊地址分配堆中的對象，因此可以使用最低的 2（或 3，取決於機器字大小）個有效位來進行標記。在 32 位架構中，V8 使用最低有效位區分 Smis 和堆物件指針。對於堆指針，使用次低有效位區分強引用和弱引用：

<pre>
                        |----- 32 bits -----|
Pointer:                |_____address_____<b>w1</b>|
Smi:                    |___int31_value____<b>0</b>|
</pre>

其中 *w* 是一個用於區分強指針和弱指針的位。

注意，Smi 值只能攜帶 31 位的有效負載，包括符號位。對於指針，我們有 30 位可以用作堆物件地址負載。由於字對齊，分配粒度為 4 個位元組，這給我們提供了 4 GB 的可尋址空間。

在 64 位架構中，V8 值如下所示：

<pre>
            |----- 32 bits -----|----- 32 bits -----|
Pointer:    |________________address______________<b>w1</b>|
Smi:        |____int32_value____|000000000000000000<b>0</b>|
</pre>

您可能會注意到，與 32 位架構不同，在 64 位架構中，V8 可以為 Smi 值負載使用 32 位元。這對 32 位 Smis 的指針壓縮影響在後續部分中進行了討論。

## 壓縮標記值和新的堆佈局

使用指針壓縮技術，我們的目標是讓兩種類型的標記值在 64 位架構的情況下都能以 32 位元方式適配。我們可以通過以下方式在 32 位中適配指針：

- 確保所有 V8 對象都分配在 4 GB 記憶體範圍內
- 將指針表示為此範圍內的偏移量

有這樣的硬性限制是很遺憾的，但即使在 64 位元架構上，Chrome 中的 V8 已經對 V8 堆的大小設定了 2 GB 或 4 GB 的限制（取決於底層設備的性能有多強大）。其他 V8 嵌入者，例如 Node.js，可能需要更大的堆。如果我們強制設置 4 GB 的最大限制，那麼這些嵌入者將無法使用指標壓縮。

現在的問題是如何更新堆布局以確保 32 位元指標能唯一識別 V8 對象。

### 簡單堆布局

簡單壓縮方案可能是在地址空間的前 4 GB 中分配對象。

![簡單堆布局](/_img/pointer-compression/heap-layout-0.svg)

不幸的是，對於 V8 來說這並不是一個選項，因為 Chrome 的渲染器進程可能需要在同一渲染器進程中創建多個 V8 實例，例如用於 Web/Service Workers。否則，使用此方案所有這些 V8 實例將競爭相同的 4 GB 地址空間，因此對所有 V8 實例總共將設置一個 4 GB 的內存限制。

### 堆布局，版本1

如果我們把 V8 的堆安排在地址空間中的某個其他地方的連續 4 GB 區域，那麼從起始地址到基址的 32 位元偏移值能唯一標識指標。

<figure>
  <img src="/_img/pointer-compression/heap-layout-1.svg" width="827" height="323" alt="" loading="lazy"/>
  <figcaption>堆布局，基址對齊起始位置</figcaption>
</figure>

如果我們還確保基址是 4 GB 對齊的，那麼所有指標的上 32 位元是相同的：

```
            |----- 32 bits -----|----- 32 bits -----|
指標：       |________基址_______|_______偏移量______w1|
```

我們也可以通過限制 Smi 貨載為 31 位並將其放置在下 32 位，使 Smi 壓縮基本可行。基本來說，這使它們類似於 32 位架構上的 Smi。

```
         |----- 32 bits -----|----- 32 bits -----|
Smi：     |sssssssssssssssssss|___int31_value___0|
```

其中 *s* 是 Smi 貨載的符號值。如果我們有符號擴展表示，我們可以通過對 64 位字的一位位數算術移位壓縮和解壓 Smi。

現在我們可以看到，指標和 Smi 的上下半字是由下半字完全定義的。然後，我們可以在內存中只存儲下半部分，從而將存儲標籤值所需的內存減少一半：

```
                    |----- 32 bits -----|----- 32 bits -----|
壓縮指標：                             |_______偏移量______w1|
壓縮 Smi：                              |___int31_value___0|
```

鑑於基址是 4 GB 對齊的，壓縮只是截斷：

```cpp
uint64_t uncompressed_tagged;
uint32_t compressed_tagged = uint32_t(uncompressed_tagged);
```

然而，解壓代碼有點複雜。我們需要區分 Smi 的符號擴展和指標的零擴展，以及是否要加上基址。

```cpp
uint32_t compressed_tagged;

uint64_t uncompressed_tagged;
if (compressed_tagged & 1) {
  // 指標情況
  uncompressed_tagged = base + uint64_t(compressed_tagged);
} else {
  // Smi 情況
  uncompressed_tagged = int64_t(compressed_tagged);
}
```

讓我們嘗試改變壓縮方案來簡化解壓代碼。

### 堆布局，版本2

如果我們不是將基址放在 4 GB 的起始位置，而是放在 _中間_，那麼我們可以將壓縮值看作是基址的一個 **有符號** 32 位元偏移。請注意，整個保留區不再是 4 GB 對齊，但基址是。

![堆布局，基址對齊中間位置](/_img/pointer-compression/heap-layout-2.svg)

在這種新的布局中，壓縮代碼保持不變。

然而，解壓代碼變得更容易了。現在，符號擴展對於 Smi 和指標情況是通用的，唯一的分支是在指標情況下是否添加基址。

```cpp
int32_t compressed_tagged;

// 指標和 Smi 情況的通用代碼
int64_t uncompressed_tagged = int64_t(compressed_tagged);
if (uncompressed_tagged & 1) {
  // 指標情況
  uncompressed_tagged += base;
}
```

程式碼中的分支性能取決於 CPU 中的分支預測單元。我們認為如果能以無分支方式實現解壓，我們可以獲得更好的性能。通過少量位元操作魔法，我們可以寫出上面程式碼的無分支版本：

```cpp
int32_t compressed_tagged;

// 指標和 Smi 情況的相同代碼
int64_t sign_extended_tagged = int64_t(compressed_tagged);
int64_t selector_mask = -(sign_extended_tagged & 1);
// 在 Smi 情況下掩碼為 0，指標情況下全為 1
int64_t uncompressed_tagged =
    sign_extended_tagged + (base & selector_mask);
```

然後，我們決定從無分支實現開始。

## 性能演變

### 初始性能

我們在 [Octane](https://v8.dev/blog/retiring-octane#the-genesis-of-octane) 上測量了性能 — 我們過去使用的一個峰值性能基準測試。雖然我們日常工作已經不再專注於改善峰值性能，但我們也不想退步於峰值性能，特別是像 _所有指標_ 這樣對性能非常敏感的事情。Octane 仍然是這項任務的良好基準測試。

此圖展示了在我們優化和完善指標壓縮實現時，Octane 在 x64 架構上的得分。在圖表中，分數越高越好。紅線代表現有的全尺寸指標 x64 構建版本，而綠線是指標壓縮版本。

![Octane 改善的第一輪結果](/_img/pointer-compression/perf-octane-1.svg)

第一個可運行的實現版本，我們觀察到了約 35% 的回歸缺口。

#### 提升 (1), +7%

首先，我們驗證了“無條件分枝更快”的假設，將無條件分枝解壓與有條件分枝版本進行比較。結果證明我們的假設是錯誤的，有條件分枝版本在 x64 上快了 7%。這是一個相當明顯的差異！

讓我們來看看 x64 的組合語言。

:::table-wrapper
<!-- markdownlint-disable no-space-in-code -->
| 解壓           | 無條件分枝              | 有條件分枝                    |
|---------------|-------------------------|------------------------------|
| 程式碼          | ```asm                  | ```asm                       \
|               | movsxlq r11,[…]         | movsxlq r11,[…]              \
|               | movl r10,r11            | testb r11,0x1                \
|               | andl r10,0x1            | jz done                      \
|               | negq r10                | addq r11,r13                 \
|               | andq r10,r13            | done:                        \
|               | addq r11,r10            |                              | \
|               | ```                     | ```                          |
| 總結           | 20 字節                | 13 字節                     |
| ^^            | 執行 6 條指令           | 執行 3 或 4 條指令           |
| ^^            | 無分枝                  | 1 個分枝                     |
| ^^            | 額外使用 1 個暫存器     |                              |
<!-- markdownlint-enable no-space-in-code -->
:::

這裡的 **r13** 是用於基底值的專用暫存器。注意無條件分枝的程式碼不僅更大，而且需要更多的暫存器。

在 Arm64 架構下，我們觀察到了相同的結果——有條件分枝版本明顯在高性能 CPU 上更快（儘管兩種情況的程式碼大小相同）。

:::table-wrapper
<!-- markdownlint-disable no-space-in-code -->
| 解壓           | 無條件分枝              | 有條件分枝                    |
|---------------|-------------------------|------------------------------|
| 程式碼          | ```asm                  | ```asm                       \
|               | ldur w6, […]            | ldur w6, […]                 \
|               | sbfx x16, x6, #0, #1    | sxtw x6, w6                  \
|               | and x16, x16, x26       | tbz w6, #0, #done            \
|               | add x6, x16, w6, sxtw   | add x6, x26, x6              \
|               |                         | done:                        \
|               | ```                     | ```                          |
| 總結           | 16 字節                | 16 字節                     |
| ^^            | 執行 4 條指令           | 執行 3 或 4 條指令           |
| ^^            | 無分枝                  | 1 個分枝                     |
| ^^            | 額外使用 1 個暫存器     |                              |
<!-- markdownlint-enable no-space-in-code -->
:::

在低端 Arm64 裝置中，我們觀察到幾乎沒有性能差異。

我們的心得是：現代 CPU 的分枝預測非常出色，而程式碼大小（特別是執行路徑的長度）對性能的影響更大。

#### 提升 (2), +2%

[TurboFan](https://v8.dev/docs/turbofan) 是 V8 的優化編譯器，基於“節點海洋”這一概念。簡而言之，每個操作都在圖表中表示為一個節點（請查看更詳細的版本 [在這篇部落格文章中](https://v8.dev/blog/turbofan-jit)）。這些節點具有各種依賴，包括數據流和控制流。

指標壓縮的兩個關鍵操作是載入和存儲，因為它們將 V8 堆與管道的其餘部分連接起來。如果我們在每次從堆中載入壓縮值時解壓，並在存儲之前壓縮，整個管道就可以像在全指標模式下那樣運行。因此，我們在節點圖中新增了明確的值操作——解壓和壓縮。

有一些情況解壓實際上是不必要的。例如，壓縮的值從某處載入後僅被存儲到新位置。

為了優化不必要的操作，我們在 TurboFan 中新增了一個新的“解壓消除”階段。其任務是在圖表中直接消除緊接著壓縮的解壓操作。由於這些節點可能不直接相鄰，它還嘗試通過圖表傳播解壓，希望沿途遇到壓縮並一併消除它們。這給了我們 Octane 分數的 2% 提升。

#### 提升 (3), +2%

當我們查看生成的程式碼時，我們注意到解壓剛載入的值所產生的程式碼有些過於冗長：

```asm
movl rax, <mem>   // 載入
movlsxlq rax, rax // 符號擴展
```

修正後直接從記憶體符號擴展載入的值：

```asm
movlsxlq rax, <mem>
```

因此又提升了2%的效能。

#### 增加 (4), +11%

TurboFan 的最佳化階段透過圖形上的模式匹配運作：一旦子圖匹配到某個模式，便會以語意等效（但更佳）的子圖或指令替換。

未成功的匹配嘗試並非明確失敗。圖形中出現顯式的解壓/壓縮操作會導致原本成功的模式匹配無法再生效，導致最佳化默默失敗。

“失效”最佳化的一個例子是[分配超老化](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/43823.pdf)。更新模式匹配以能理解新的壓縮/解壓節點後，我們又提升了11%的效能。

### 進一步提升

![第二輪 Octane 的提升](/_img/pointer-compression/perf-octane-2.svg)

#### 增加 (5), +0.5%

在 TurboFan 中執行解壓消除的過程中，我們學到了很多。顯式的解壓/壓縮節點方法具有以下特性：

優點：

- 此類操作的顯示性使我們能通過子圖的標準模式匹配來最佳化不必要的解壓。

然而，隨著實施的繼續，發現了以下缺點：

- 由於內部值表示法的新增加，可能的轉換操作產生了組合爆炸，難以管理。我們現在可能擁有壓縮的指針、壓縮的 Smi，及壓縮的任意值（壓縮值可能是指針或 Smi），加上現存的表示法集合（標記的 Smi、標記的指針、標記的任意值、word8、word16、word32、word64、float32、float64、simd128）。
- 基於圖形模式匹配的一些現有最佳化默默未觸發，因而導致了某些退化。雖然我們發現並修復了部分問題，但 TurboFan 的複雜性依然不斷增加。
- 寄存器分配器對圖形中節點數量的增多越來越不滿，導致了生成差勁代碼的情況。
- 大型節點圖減慢了 TurboFan 的最佳化階段速度，並在編譯中增加了記憶體消耗。

我們決定退一步思考一種更簡單的支持 TurboFan 中指針壓縮的方法。新的方法是丟棄壓縮的指針/Smi/任意值表示，並讓所有顯式壓縮/解壓節點在存儲和載入中隱含，以始終假設載入前解壓，存儲前壓縮。

我們還在 TurboFan 中新增了一個階段，替代了“解壓消除”階段。此新階段可識別何時實際上不需要壓縮或解壓，並相應更新載入和存儲操作。此方法極大減少了 TurboFan 中指針壓縮支持的複雜性，並提升了生成代碼的質量。

新的實現與初版效力相當，再次提升了0.5%的效能。

#### 增加 (6), +2.5%

我們已接近效能平衡，但仍存有差距，我們需要提出更新的想法。其一是：是否可能確保所有與 Smi 值相關的代碼永遠不“查看”高位的32位元？

讓我們回憶解壓執行過程：

```cpp
// 舊的解壓執行
int64_t uncompressed_tagged = int64_t(compressed_tagged);
if (uncompressed_tagged & 1) {
  // 指針案例
  uncompressed_tagged += base;
}
```

如果忽略了 Smi 的高位32位元，可假設它們未定義。那麼，解壓時甚至對於 Smi 也可無條件地加上基址，無需指針與 Smi 關係特殊處理！我們稱這一方法為“Smi 破壞”。

```cpp
// 新的解壓執行
int64_t uncompressed_tagged = base + int64_t(compressed_tagged);
```

而且，由於我們不再需要對 Smi 進行符號擴展，此更改允許返回堆範圍佈局 v1。這是基址指向 4GB 保留起始的佈局。

<figure>
  <img src="/_img/pointer-compression/heap-layout-1.svg" width="827" height="323" alt="" loading="lazy"/>
  <figcaption>堆內存佈局，基址對齊到起始位置</figcaption>
</figure>

就解壓代碼來說，這將符號擴展操作改為零擴展，成本是相同的。然而，這簡化了運行時（C++）端的操作。例如，地址空間區域保留代碼（請參閱 [一些實施細節](#some-implementation-details) 部分）。

以下是對比的組合代碼：

:::table-wrapper
<!-- markdownlint-disable no-space-in-code -->
| 解壓縮 | 分支豐富                    | Smi 損壞                      |
|-------|----------------------------|----------------------------|
| 程式碼     | ```asm                     | ```asm                     \
|           | movsxlq r11,[…]            | movl r11,[rax+0x13]        \
|           | testb r11,0x1              | addq r11,r13               \
|           | jz done                    |                            | \
|           | addq r11,r13               |                            | \
|           | done:                      |                            | \
|           | ```                        | ```                        |
| 摘要       | 13 位元組                  | 7 位元組                    |
| ^^        | 執行了 3 或 4 條指令       | 執行了 2 條指令             |
| ^^        | 1 個分支                   | 無分支                     |
<!-- markdownlint-enable no-space-in-code -->
:::

因此，我們將 V8 中所有使用 Smi 的程式碼改編為新的壓縮方案，從而額外提供了 2.5% 的改進。

### 剩余差距

剩余的性能差距可歸因於由於與指標壓縮根本不相容而不得不禁用的兩項針對 64 位構建的優化。

![Octane 的最終改進輪次](/_img/pointer-compression/perf-octane-3.svg)

#### 32 位 Smi 優化 (7), -1%

讓我們回憶一下在 64 位架構上，完整指標模式下的 Smi 外觀。

```
        |----- 32 位 -----|----- 32 位 -----|
Smi:    |____int32_value____|0000000000000000000|
```

32 位 Smi 具有以下優勢：

- 無需將整數裝箱到數字物件中，便能表示更大的整數範圍；以及
- 直接讀取/寫入 32 位值。

指標壓縮無法進行此優化，因為壓縮的 32 位指標中沒有空間來區分指標和 Smi 的位元。如果我們在完整指標 64 位版本中禁用 32 位 Smi，我們會看到 Octane 分數的 1% 回退。

#### 雙字段去封裝 (8), -3%

此優化嘗試在某些假設下直接將浮點值儲存在物件的字段中。目的是進一步減少數字物件的分配次數，超越僅由 Smi 減少的效果。

假設以下 JavaScript 程式碼：

```js
function Point(x, y) {
  this.x = x;
  this.y = y;
}
const p = new Point(3.1, 5.3);
```

一般來說，如果我們查看記憶體中的物件 p，會看到如下內容：

![記憶體中的物件 `p`](/_img/pointer-compression/heap-point-1.svg)

您可以在[這篇文章](https://v8.dev/blog/fast-properties)中瞭解有關隱藏類和屬性及元素支持存儲的更多資訊。

在 64 位架構中，雙運算值的大小與指標相同。因此，如果我們假設 Point 的字段始終包含數值，我們可以直接將它們儲存在物件字段中。

![](/_img/pointer-compression/heap-point-2.svg)

如果某些字段的假設被破壞，例如執行此行程式碼後：

```js
const q = new Point(2, 'ab');
```

則屬性 y 的數值必須以裝箱形式存儲。此外，任何依賴此假設的推測性優化程式碼都必須丟棄（解除優化）。這種“字段類型”概括的原因是為了最小化由同一構造函數創建的物件形狀數量，這反過來需要更穩定的性能。

![記憶體中的物件 `p` 和 `q`](/_img/pointer-compression/heap-point-3.svg)

如果應用，雙字段去封裝將具有以下優勢：

- 通過物件指標直接訪問浮點數據，避免通過數字物件的額外解引用；以及
- 為執行大量雙字段訪問的緊湊迴圈（例如在數值運算應用中）生成更小且更快的優化程式碼。

啟用指標壓縮後，雙運算值已無法適應壓縮字段。然而，將來我們可能會調整此優化以支持指標壓縮。

請注意，即使沒有此雙字段去封裝優化（以支援指標壓縮的方式），需要高通量的數值運算程式碼也可以以可優化的方式重新編寫，例如將數據儲存在 Float64 類型的數組中，甚至使用 [Wasm](https://webassembly.github.io/spec/core/)。

#### 更多的改進 (9), 1%

最後，對 TurboFan 中的解壓縮消除優化進行了一些微調，又獲得了 1% 的性能提升。

## 一些實現細節

為了簡化指標壓縮的整合到現有代碼中，我們決定在每次讀取時解壓縮值，並在每次存儲時壓縮值。因此僅更改標記值的存儲格式，同時保持執行格式不變。

### 原生代碼部分

為了能夠在需要解壓縮時生成高效代碼，基準值必須始終可用。幸運的是，V8 已經有一個專用寄存器始終指向“根表”，其中包含必須始終可用的 JavaScript 和 V8 內部對象的引用（例如 undefined、null、true、false 等）。這個寄存器被稱為“根寄存器”，它用於生成更小且[可共享的內建代碼](https://v8.dev/blog/embedded-builtins)。

因此，我們將根表放入 V8 堆保留區域中，根寄存器因此變得可用於兩個目的——作為根指針以及解壓縮的基準值。

### C++ 部分

V8 執行期通過 C++ 類訪問 V8 堆中的對象，以便對存儲在堆中的數據提供方便的檢視。請注意，V8 對象更像是[POD](https://en.wikipedia.org/wiki/Passive_data_structure)樣的結構，而非 C++ 對象。輔助“檢視”類僅包含一個 uintptr_t 字段，內有相應的標記值。由於檢視類是字大小，我們可以以零開銷通過值將它們傳遞（非常感謝現代的 C++ 編譯器）。

以下是一個輔助類的伪示例：

```cpp
// 隱藏類
class Map {
 public:
  …
  inline DescriptorArray instance_descriptors() const;
  …
  // 在 Map 檢視對象中存儲的實際標記指針值。
  const uintptr_t ptr_;
};

DescriptorArray Map::instance_descriptors() const {
  uintptr_t field_address =
      FieldAddress(ptr_, kInstanceDescriptorsOffset);

  uintptr_t da = *reinterpret_cast<uintptr_t*>(field_address);
  return DescriptorArray(da);
}
```

為了減少所需的更改次數以運行指標壓縮版本，我們將解壓縮所需基準值的計算集成到getter中。

```cpp
inline uintptr_t GetBaseForPointerCompression(uintptr_t address) {
  // 將地址向下舍入到 4 GB
  const uintptr_t kBaseAlignment = 1 << 32;
  return address & -kBaseAlignment;
}

DescriptorArray Map::instance_descriptors() const {
  uintptr_t field_address =
      FieldAddress(ptr_, kInstanceDescriptorsOffset);

  uint32_t compressed_da = *reinterpret_cast<uint32_t*>(field_address);

  uintptr_t base = GetBaseForPointerCompression(ptr_);
  uintptr_t da = base + compressed_da;
  return DescriptorArray(da);
}
```

性能測量結果證實了每次讀取時基準值的計算會影響性能。原因是 C++ 編譯器不知道 GetBaseForPointerCompression() 的結果對於任何來自 V8 堆的地址都是相同的，因此編譯器無法合併基準值的計算。考慮到代碼由幾條指令和一個 64 位常量組成，這會導致代碼膨脹。

為了解決這個問題，我們重新利用 V8 實例指針作為解壓縮的基準（記住堆佈局中的 V8 實例數據）。這個指針通常在運行時函數中可用，因此我們通過需要 V8 實例指針簡化了getter代碼並恢復了回歸：

```cpp
DescriptorArray Map::instance_descriptors(const Isolate* isolate) const {
  uintptr_t field_address =
      FieldAddress(ptr_, kInstanceDescriptorsOffset);

  uint32_t compressed_da = *reinterpret_cast<uint32_t*>(field_address);

  // 不需要舍入，因為 Isolate 指針已經是基準。
  uintptr_t base = reinterpret_cast<uintptr_t>(isolate);
  uintptr_t da = DecompressTagged(base, compressed_value);
  return DescriptorArray(da);
}
```

## 結果

讓我們來看看指標壓縮的最終數據！對於這些結果，我們使用了與這篇博客開頭介紹的相同瀏覽測試。作為提醒，它們是我們認為能代表真實網站使用情景的瀏覽用戶案例。

在這些測試中，我們觀察到指標壓縮將 **V8 堆大小減少至最多 43%**！反過來，這使得 **Chrome 的渲染進程記憶體最多減少 20%** 在桌面上。

![在 Windows 10 瀏覽時的記憶體節省](/_img/pointer-compression/v8-heap-memory.svg)

另一個重要的注意事項是並非每個網站都改善相同的量。例如，以前 V8 堆記憶體在 Facebook 上大於在紐約時報，但使用指標壓縮後情況正好相反。這種差異可以用某些網站擁有更多標記值來解釋。

除了這些記憶體改善，我們還觀察到真實網站的性能改善。在真實網站上，我們使用更少的 CPU 和垃圾收集器時間！

![CPU 和垃圾收集時間的改善](/_img/pointer-compression/performance-improvements.svg)

## 結論

這段旅程並非一帆風順，但我們的努力是值得的。[300+次提交](https://github.com/v8/v8/search?o=desc&q=repo%3Av8%2Fv8+%22%5Bptr-compr%5D%22&s=committer-date&type=Commits)之後，V8 的指針壓縮功能使所需記憶體量等同於運行 32 位元應用程式，而性能則可達到 64 位元的水平。

我們始終期待著改進，已經將以下相關任務列入計劃中：

- 提高生成匯編代碼的品質。我們知道有些情況下可以生成更少的代碼，從而提升性能。
- 處理相關性能回歸問題，包括一種允許再次以指針壓縮友好方式解包雙字段的機制。
- 探索支持更大堆的可能性，範圍在 8 到 16 GB 之間。
