---
title: &apos;Oilpan 中的指標壓縮&apos;
author: &apos;Anton Bikineev，以及 Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz))，行走的反編譯器&apos;
avatars:
  - anton-bikineev
  - michael-lippautz
date: 2022-11-28
tags:
  - internals
  - memory
  - cppgc
description: &apos;Oilpan 中的指標壓縮可以壓縮 C++ 指標，並最多減少 33% 的堆大小。&apos;
tweet: &apos;1597274125780893697&apos;
---

> 當我編譯一個使用不到 4GB RAM 的程式時，使用 64 位元指標是完全荒謬的。在結構體中出現這些指標值時，它們不僅浪費了一半的記憶體，還有效地丟掉了一半的快取。
>
> – [Donald Knuth (2008)](https://cs.stanford.edu/~knuth/news08.html)

<!--truncate-->

幾乎沒有比這更真實的言論了。我們還看到 CPU 廠商實際上並未提供 [64 位元 CPU](https://en.wikipedia.org/wiki/64-bit_computing#Limits_of_processors)，而 Android OEM 為了加速 Kernel 的頁表讀取，[選擇僅提供 39 位元的地址空間](https://www.kernel.org/doc/Documentation/arm64/memory.txt)。在 Chrome 中運行 V8 還 [將站點隔離到單獨的進程中](https://www.chromium.org/Home/chromium-security/site-isolation/)，這進一步減少了單一標籤所需的實際地址空間需求。這些現象並非全新，因此我們在 2020 年為 V8 推出了 [指標壓縮](https://v8.dev/blog/pointer-compression)，並在整個網頁上看到了記憶體的大幅改進。有了 [Oilpan 圖書館](https://v8.dev/blog/oilpan-library)，我們可以控制網頁的另一塊基石。[Oilpan](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/cppgc/README.md) 是一款基於追蹤的 C++ 垃圾回收器，除了其他用途，也被用來在 Blink 中托管文檔對象模型，因此成為了優化記憶體的有趣目標。

## 背景

指標壓縮是一種在 64 位元平台上縮小指標大小的機制。在 Oilpan 中，指標被封裝在一個名為 [`Member`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/cppgc/member.h) 的智能指標中。在未壓縮的堆佈局中，`Member` 引用直接指向堆對象，即每個引用使用 8 字節的記憶體。在這種情況下，堆可能分布於整個地址空間，因為每個指標都包含所有指向對象所需的信息。

![未壓縮的堆佈局](/_img/oilpan-pointer-compression/uncompressed-layout.svg)

在壓縮的堆佈局中，`Member` 引用僅是堆籠中的偏移量，而堆籠是一個連續的記憶體區域。基指標（base）指向堆籠的起始處，與 Member 結合形成完整指標，這與 [分段地址](https://en.wikipedia.org/wiki/Memory_segmentation#Segmentation_without_paging) 的工作方式非常相似。堆籠的大小受偏移量可用位數的限制。例如，4GB 的堆籠需要 32 位偏移量。

![壓縮的堆佈局](/_img/oilpan-pointer-compression/compressed-layout.svg)

便利的是，Oilpan 堆已經包含在這樣一個 64 位平台上的 4GB 堆籠中，以允許通過將任何有效堆指標對齊到最近的 4GB 邊界來引用垃圾回收元數據。

Oilpan 還支持在同一進程中使用多個堆，例如支持在 Blink 中具有自己 C++ 堆的網頁工作者。這種設置引出的問題是如何映射多個堆到可能的許多堆籠。由於堆與 Blink 中的原生線程綁定，這裡的解決方案是通過線程本地基指標引用堆籠。根據 V8 和其嵌入者的編譯方式，可以限制線程本地存儲 (TLS) 模型以加快從記憶體加載基指標的速度。然而，為支持 Android，最通用的 TLS 模式是必需的，因為在此平台上，渲染器（以及 V8）是通過 `dlopen` 加載的。這種限制使 TLS 在性能上不可行[^1]。為了提供最佳性能，Oilpan 與 V8 相似，在使用指標壓縮時將所有堆分配到一個堆籠中。雖然這限制了可用的總記憶體，我們認為這是可接受的，因為指標壓縮本身旨在減少記憶體。如果單個 4GB 堆籠證明限制過大，目前的壓縮方案允許將堆籠大小擴展至 16GB 而不犧牲性能。

## 在 Oilpan 中的實現

### 要求

到目前為止，我們討論了一個簡單的編碼方案，其中完整的指標是通過將存儲在 Member 指標中的偏移量添加到基址形成。然而，實際實施的方案不幸沒有那麼簡單，因為 Oilpan 需要 Member 可分配以下之一：

1. 指向物件的有效堆指標；
2. C++ 的 `nullptr`（或類似）；
3. 必須在編譯時已知的哨兵值。該哨兵值可例如用於在支持 `nullptr` 作為條目的哈希表中表示刪除的值。

`nullptr` 和哨兵值的問題部分在於缺少明確的類型以便在呼叫方識別這些值：

```cpp
void* ptr = member.get();
if (ptr == nullptr) { /* ... * }
```

由於沒有明確的類型來存儲可能壓縮的 `nullptr` 值，因此需要進行實際的解壓縮以與常量進行比較。

考慮到這種使用，我們尋找了一種能夠透明處理情況 1.-3. 的方案。由於壓縮和解壓縮序列在使用 Member 的任何地方都會被內聯，需要滿足以下屬性：

- 快速且緊湊的指令序列，以最大限度地減少 icache 丟失。
- 無分支指令序列，以避免耗盡分支預測器。

由於預期讀取次數遠遠超過寫入次數，我們允許使用一種非對稱方案，其中更快的解壓縮受到優先考慮。

### 壓縮與解壓縮

為簡潔起見，本描述僅涵蓋使用的最終壓縮方案。有關我們如何達到該方案和考慮的替代方案的更多信息，請參閱我們的[設計文檔](https://docs.google.com/document/d/1neGN8Jq-1JLrWK3cvwRIfrSjLgE0Srjv-uq7Ze38Iao)。

截至今天實現的方案的主要思想是依靠堆籠的對齊，將普通的堆指標與 `nullptr` 和哨兵值分開。基本上，堆籠以對齊方式分配，使得上半字的最低有效位始終設置。 我們分別將上半部分和下半部分（各 32 位）表示為 U<sub>31</sub>...U<sub>0</sub> 和 L<sub>31</sub>...L<sub>0</sub>。

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | 上半部分                                   | 下半部分                                   |
| ------------ | ---------------------------------------: | -----------------------------------------: |
| 堆指標       | <tt>U<sub>31</sub>...U<sub>1</sub>1</tt> | <tt>L<sub>31</sub>...L<sub>3</sub>000</tt> |
| `nullptr`    | <tt>0...0</tt>                           | <tt>0...000</tt>                           |
| 哨兵值       | <tt>0...0</tt>                           | <tt>0...010</tt>                           |
<!-- markdownlint-enable no-inline-html -->
:::

壓縮僅通過右移一位並截斷值的上半部分生成壓縮值。通過這種方式，對齊位（現在成為壓縮值的最高有效位）表示有效的堆指標。

:::table-wrapper
| C++                                             | x64 彙編語法  |
| :---------------------------------------------- | :------------ |
| ```cpp                                          | ```asm        \
| uint32_t Compress(void* ptr) \{                  | mov rax, rdi  \
|   return ((uintptr_t)ptr) >> 1;                 | shr rax       \
| \}                                               | ```           \
| ```                                             |               |
:::

因此，壓縮值的編碼如下：

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | 壓縮值                                   |
| ------------ | -----------------------------------------: |
| 堆指標       | <tt>1L<sub>31</sub>...L<sub>2</sub>00</tt> |
| `nullptr`    | <tt>0...00</tt>                            |
| 哨兵值       | <tt>0...01</tt>                            |
<!-- markdownlint-enable no-inline-html -->
:::

請注意，這使得能夠判斷壓縮值是否表示堆指標、`nullptr` 或哨兵值，這對於在用戶代碼中避免不必要的解壓縮非常重要（參見下方）。

解壓縮的想法是依賴於一個專門製作的基址指標，其最低有效的 32 位設置為 1。

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | 上半部分                               | 下半部分         |
| ------------ | ---------------------------------------: | -------------: |
| 基址         | <tt>U<sub>31</sub>...U<sub>1</sub>1</tt> | <tt>1...1</tt> |
<!-- markdownlint-enable no-inline-html -->
:::


解壓縮操作首先對壓縮值進行符號擴展，然後左移以撤銷符號位的壓縮操作。所得的中間值的編碼如下：

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | 上半部分         | 下半部分                                 |
| ------------ | -------------: | -----------------------------------------: |
| 堆指標       | <tt>1...1</tt> | <tt>L<sub>31</sub>...L<sub>3</sub>000</tt> |
| `nullptr`    | <tt>0...0</tt> | <tt>0...000</tt>                           |
| sentinel     | <tt>0...0</tt> | <tt>0...010</tt>                           |
<!-- markdownlint-enable no-inline-html -->
:::

最後，解壓縮指針只是通過此中間值與基指針之間的按位與操作得到的結果。

:::table-wrapper
| C++                                                    | x64 assembly       |
| :----------------------------------------------------- | :----------------- |
| ```cpp                                                 | ```asm             \
| void* Decompress(uint32_t compressed) \{                | movsxd rax, edi    \
|   uintptr_t intermediate =                             | add rax, rax       \
|       (uintptr_t)((int32_t)compressed)  &lt;&lt;1;           | and rax, qword ptr \
|   return (void*)(intermediate & base);                 |     [rip + base]   \
| \}                                                      | ```                \
| ```                                                    |                    |
:::

生成的方案通過一個無分支的不對稱方案透明地處理案例1.-3.。壓縮使用3字節，不計算初始寄存器移動，因為調用肯定是內聯的。解壓縮使用13字節，包括初始符號擴展寄存器移動。

## 選定細節

上一節解釋了所使用的壓縮方案。一個緊湊的壓縮方案是實現高性能所必需的。上面的壓縮方案仍導致Speedometer中的可觀回歸。以下段落解釋了一些提高Oilpan性能的必要細節。

### 優化籠基載入

技術上，在C++術語中，全局基指針不能是常數，因為它是在`main()`後的運行時初始化，嵌入者初始化Oilpan時。將此全局變數設為可變會阻礙重要的const傳播優化，例如，編譯器無法證明隨機調用不會修改基指針，必須加載兩次：

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
| C++                        | x64 assembly                    |
| :------------------------- | :------------------------------ |
| ```cpp                     | ```asm                          \
| void foo(GCed*);           | baz(Member&lt;GCed>):              \
| void bar(GCed*);           |   movsxd rbx, edi               \
|                            |   add rbx, rbx                  \
| void baz(Member&lt;GCed> m) \{ |   mov rdi, qword ptr            \
|   foo(m.get());            |       [rip + base]              \
|   bar(m.get());            |   and rdi, rbx                  \
| }                          |   call foo(GCed*)               \
| ```                        |   and rbx, qword ptr            \
|                            |       [rip + base] # 額外載入   \
|                            |   mov rdi, rbx                  \
|                            |   jmp bar(GCed*)                \
|                            | ```                             |
<!-- markdownlint-enable no-inline-html -->
:::

透過一些額外的屬性，我們教會了clang將全局基指針視為常數，從而在上下文中進行了一次載入。

### 完全避免解壓縮

最快的指令序列是一個nop！考慮到這一點，對於許多指針操作，冗余的壓縮和解壓縮可以輕鬆避免。顯而易見，我們不需要解壓縮成員來檢查是否為nullptr。我們不需要在從另一個成員構造或賦值一個成員時解壓縮和壓縮。壓縮保存了指針比較，因此我們也可以避免轉換。成員抽象在這裡很好地充當了瓶頸。

哈希可以用壓縮指針加速。哈希計算過程中的解壓縮是冗余的，因為固定的基指針不增加哈希熵。相反，可以使用更簡單的32位整數哈希函數。Blink有很多使用成員作為鍵的哈希表；32位哈希導致更快的集合！

### 幫助clang在其無法優化的地方

查看生成的代碼時，我們發現了一個有趣的位置，編譯器沒有進行足夠的優化：

:::table-wrapper
| C++                               | x64 assembly               |
| :-------------------------------- | :------------------------- |
| ```cpp                            | ```asm                     \
| extern const uint64_t base;       | Assign(unsigned int):      \
| extern std::atomic_bool enabled;  |   mov dword ptr [rdi], esi \
|                                   |   mov rdi, qword ptr       \
| void Assign(uint32_t ptr) \{       |       [rip + base]         \
|   ptr_ = ptr                      |   mov al, byte ptr         \
|   WriteBarrier(Decompress(ptr));  |       [rip + enabled]      \
| }                                 |   test al, 1               \
|                                   |   jne .LBB4_2 # 非常少見   \
| void WriteBarrier(void* ptr) \{    |   ret                      \
|   if (LIKELY(                     | .LBB4_2:                   \
|       !enabled.load(relaxed)))    |   movsxd rax, esi          \
|     return;                       |   add rax, rax             \
|   SlowPath(ptr);                  |   and rdi, rax             \
| }                                 |   jmp SlowPath(void*)      \
| ```                               | ```                        |
:::

生成的代碼即使變數未使用且可以輕鬆下沉到其下方的基本塊中，仍在熱門基本塊中執行基礎加載。此處調用了 `SlowPath()`，實際上使用了解壓縮的指針。編譯器保守地決定不重新排序非原子加載與原子鬆散語義加載，即使按照語言規則這完全是合法的。我們手動將解壓縮移動到原子讀取之後，以使指令與寫屏障的分配盡可能高效。


### 改善 Blink 中結構壓縮

很難估算將 Oilpan 的指針大小縮小一半的效果。本質上，這應該會改善對“打包”數據結構（例如此類指針的容器）的記憶體利用率。本地測量顯示 Oilpan 記憶體提高了約 16%。然而，調查顯示對於某些類型，我們沒有減少其實際大小，而只是增加了字段之間的內部填充。

為了盡量減少這種填充，我們編寫了一個 clang 插件，該插件可以自動識別這些垃圾回收類，並通過重新排列字段從而減少整體類大小。由於 Blink 代碼庫中存在許多這種情況，我們應用此重排到最常用的類型中，參見[設計文檔](https://docs.google.com/document/d/1bE5gZOCg7ipDUOCylsz4_shz1YMYG5-Ycm0911kBKFA)。

### 失敗的嘗試：限制堆籠大小

並非每個優化嘗試都能成功。為了進一步優化壓縮，我們將堆籠限制為 2GB。我們確保籠基址的下半字的最高有效位為 1，這使我們完全集免掉移位。壓縮只需簡單截斷，解壓縮只需簡單加載和按位與。

鑑於 Blink 渲染器中的 Oilpan 記憶體平均耗用不到 10MB，我們認為可以安全地採用更快的方案並限制籠大小。不幸的是，部署此優化後，我們開始接收到一些罕見工作負載上的記憶體不足錯誤。我們決定回退此項優化。

## 結果與未來

Pointer compression 在 Oilpan 中默認啟用於 **Chrome 106**。我們在各方面看到了顯著的記憶體改進：


<!-- markdownlint-disable no-inline-html -->
| Blink 記憶體 | P50                                                 | P99                                               |
| -----------: | :-------------------------------------------------: | :-----------------------------------------------: |
| Windows      | **<span style={{color:&apos;green&apos;}}>-21% (-1.37MB)</span>** | **<span style={{color:&apos;green&apos;}}>-33% (-59MB)</span>** |
| Android      | **<span style={{color:&apos;green&apos;}}>-6% (-0.1MB)</span>**   | **<span style={{color:&apos;green&apos;}}>-8% (-3.9MB)</span>** |
<!-- markdownlint-enable no-inline-html -->


所報告的數據代表了使用 Oilpan 分配 Blink 記憶體的第 50 和 99 百分位數。所報告數據顯示了 Chrome 105 和 106 穩定版本之間的差異。以 MB 為單位的絕對數字給出了一個用戶可以期望看到的下限指標。由於對 Chrome 整體記憶體消耗的間接影響，實際改進通常略高。更大的相對改善表明此類情況下數據打包更好，這是使用集合（如向量）記憶體更多的指標，這些集合打包效果良好。改進結構填充的變更已經在 Chrome 108 中上線，並平均又帶來了 Blink 記憶體約 4% 的提升。

由於 Oilpan 在 Blink 中無所不在，因此可以在 [Speedometer2](https://browserbench.org/Speedometer2.1/) 中估算性能成本。[初步原型](https://chromium-review.googlesource.com/c/v8/v8/+/2739979) 基於一個執行緒局部版本顯示 15% 的回歸。綜合前述所有優化後，我們未觀察到顯著的回歸。

### 保守性棧掃描

在 Oilpan 中，堆疊會以保守的方式掃描以找到指向堆的指標。對於壓縮指標，這意味著我們必須將每個半字單元視為潛在的指標。而且，壓縮期間編譯器可能會決定將中間值溢出到堆疊中，這意味著掃描器必須考慮所有可能的中間值（在我們的壓縮方案中，唯一可能的中間值是被截短但尚未移位的值）。掃描中間值增加了誤報的數量（即，看起來像壓縮指標的半字單元），這使得記憶體的改進大約減少了 3%（否則估計的記憶體改進約為 24%）。

### 其他壓縮

過去，我們通過對 V8 JavaScript 和 Oilpan 應用壓縮看到了極大的改進。我們認為該範式可以應用於 Chrome 中其他智能指標（例如，`base::scoped_refptr`），這些指標已經指向其他堆籠。初步實驗[顯示](https://docs.google.com/document/d/1Rlr7FT3kulR8O-YadgiZkdmAgiSq0OaB8dOFNqf4cD8/edit)了有希望的結果。

調查還顯示，大量內存實際上是通過 vtables 持有的。因此，本著同樣的精神，我們[在 Android64 啟用了](https://docs.google.com/document/d/1rt6IOEBevCkiVjiARUy8Ib1c5EAxDtW0wdFoTiijy1U/edit?usp=sharing)相對 vtable ABI，此功能壓縮了虛表，讓我們能夠節省更多的內存，同時改善啟動速度。

[^1]: 有興趣的讀者可以參考 Blink 的[`ThreadStorage::Current()`](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/platform/heap/thread_state_storage.cc;drc=603337a74bf04efd536b251a7f2b4eb44fe153a9;l=19) 來查看以不同模式編譯下的 TLS 存取結果。
[^2]: 數據是通過 Chrome 的使用者計量分析框架收集的。
