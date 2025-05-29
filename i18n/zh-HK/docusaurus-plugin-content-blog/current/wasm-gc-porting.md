---
title: &apos;一種將支援垃圾回收的程式語言高效引入到 WebAssembly 的新方式&apos;
author: &apos;Alon Zakai&apos;
avatars:
  - &apos;alon-zakai&apos;
date: 2023-11-01
tags:
  - WebAssembly
tweet: &apos;1720161507324076395&apos;
---

最近的一篇關於 [WebAssembly 垃圾回收 (WasmGC)](https://developer.chrome.com/blog/wasmgc) 的文章從高層次解釋了 [垃圾回收 (GC) 提案](https://github.com/WebAssembly/gc) 如何更好地支持 Wasm 中的垃圾回收語言，這在考慮到它們的普及性時，非常重要。在本文中，我們將探討技術細節，了解像 Java、Kotlin、Dart、Python 和 C# 這樣的垃圾回收語言如何被移植到 Wasm。事實上有兩種主要的方法：

<!--truncate-->
- **“傳統”** 移植方法，這種方法將語言的現有實現編譯為 WasmMVP，即 2017 年推出的 WebAssembly Minimum Viable Product。
- **WasmGC** 移植方法，這種方法將語言直接編譯為 Wasm 中垃圾回收提案定義的 GC 結構。

我們將解釋這兩種方法是什麼，並探討它們之間的技術權衡，特別是在大小和速度方面。在此過程中，我們將看到 WasmGC 有幾個重要優勢，但它也需要在工具鏈和虛擬機（VMs）中進行新的工作。本文後面部分將解釋 V8 團隊在這些領域所做的工作，包括基準測試數據。如果您對 Wasm、GC 或兩者感興趣，我們希望您會感覺有趣，並務必查看文末的演示和入門鏈接！

## “傳統”移植方法

通常語言是如何移植到新架構的呢？假設 Python 希望能在 [ARM 架構](https://en.wikipedia.org/wiki/ARM_architecture_family) 上運行，或者 Dart 希望能在 [MIPS 架構](https://en.wikipedia.org/wiki/MIPS_architecture) 上運行。一般的思路是將虛擬機重新編譯為適配該架構的版本。如果虛擬機有架構相關的代碼，比如即時編譯（JIT）或提前編譯（AOT），則還需要為新架構實現 JIT/AOT 的後端。這種方法意義重大，因為通常代碼基礎的主要部分只需要為您移植到的新架構重新編譯：


![移植後的虛擬機結構](/_img/wasm-gc-porting/ported-vm.svg "左側是主運行時代碼，包括解析器、垃圾回收器、優化器、庫支持等；右側是單獨的 x64、ARM 等平臺的後端代碼。")

在此圖中，解析器、庫支持、垃圾回收器、優化器等在主運行時中是所有架構共享的。移植到新架構只需要為其添加一個新後端，這通常只是少量的代碼。

Wasm 是一個低級編譯目標，因此傳統的移植方法可以使用也就不足為奇了。自 Wasm 啟動以來，我們已經在許多情況下看到過此方法非常有效，例如 [Pyodide for Python](https://pyodide.org/en/stable/) 和 [Blazor for C#](https://dotnet.microsoft.com/en-us/apps/aspnet/web-apps/blazor)（請注意，Blazor 支持 [AOT](https://learn.microsoft.com/en-us/aspnet/core/blazor/host-and-deploy/webassembly?view=aspnetcore-7.0#ahead-of-time-aot-compilation) 和 [JIT](https://github.com/dotnet/runtime/blob/main/docs/design/mono/jiterpreter.md) 編譯，因此是一個涵蓋以上所有的較好範例）。在所有這些情況下，語言的運行時被編譯為 WasmMVP，就像任何其他編譯為 Wasm 的程式一樣，結果使用了 WasmMVP 的線性內存、表格、函數等。

如前所述，這是語言通常移植到新架構的方式，這非常合理，因為可以重用幾乎所有現有的虛擬機代碼，包括語言的實現和優化。然而，事實證明，對於這種方法來說，有些 Wasm 特定的劣勢，而這正是 WasmGC 可以幫助解決的地方。

## WasmGC 移植方法

簡而言之，WebAssembly 的 GC 提案（“WasmGC”）允許您定義結構和數組類型，並執行創建它們的實例、讀取和寫入字段、類型間轉換等操作（有關更多細節，請參閱 [提案概覽](https://github.com/WebAssembly/gc/blob/main/proposals/gc/Overview.md)）。這些對象由 Wasm 虛擬機的自己 GC 實現管理，這是此方法與傳統移植方法最大的不同之處。

可以這樣想： _如果傳統的移植方法是將一種語言移植到一個**架構**，那麼WasmGC方法非常類似於將一種語言移植到一個**虛擬機**_。例如，如果您想將Java移植到JavaScript，則可以使用像 [J2CL](https://j2cl.io) 這樣的編譯器，將Java對象表示為JavaScript對象，而這些JavaScript對象將由JavaScript虛擬機與所有其他對象一樣進行管理。將語言移植到現有的虛擬機是一個非常有用的技術，這可從所有可以編譯為 [JavaScript](https://gist.github.com/matthiasak/c3c9c40d0f98ca91def1)、[JVM](https://en.wikipedia.org/wiki/List_of_JVM_languages) 和 [CLR](https://en.wikipedia.org/wiki/List_of_CLI_languages) 的語言中看出。

這種架構與虛擬機的比喻並不是完全精確的，特別是因為WasmGC的目的是比我們在上一段中提到的其他虛擬機更底層。不過，WasmGC定義了虛擬機管理的結構體和數組以及描述它們形狀和關係的類型系統，而將語言移植到WasmGC的過程就是用這些原語表示您的語言的構造；這確實比傳統方式移植到WasmMVP（將所有內容降低為線性內存中的無類型字節）的更高級。因此，WasmGC與將語言移植到虛擬機非常相似，並且共享這種移植的優勢，特別是與目標虛擬機的良好集成以及重複使用其優化。

## 比較兩種方法

現在我們對GC語言的兩種移植方法有了一個概念性的了解，讓我們來看看它們如何進行比較。

### 發佈內存管理代碼

在實際操作中，許多Wasm代碼是在已經有垃圾回收器的虛擬機內運行的，在Web上就是這種情況，以及在 [Node.js](https://nodejs.org/)、[workerd](https://github.com/cloudflare/workerd)、[Deno](https://deno.com/) 和 [Bun](https://bun.sh/) 等運行時也是如此。在這些地方，發佈一個GC實現會給Wasm二進制文件增加不必要的大小。事實上，這並不僅僅是使用WasmMVP的GC語言的問題，對於使用線性內存的語言如C、C++和Rust而言也是這樣，因為這些語言中的任何有趣的分配代碼最終都需要捆綁 `malloc/free` 來管理線性內存，這需要幾千字節的代碼。例如，`dlmalloc` 需要6K，即使是一種為了節省空間而犧牲速度的malloc，比如 [`emmalloc`](https://groups.google.com/g/emscripten-discuss/c/SCZMkfk8hyk/m/yDdZ8Db3AwAJ)，也需要超過1K。而使用WasmGC，虛擬機自動為我們管理內存，因此我們完全不需要在Wasm中包含內存管理代碼——既不需要GC，也不需要 `malloc/free`。在[之前提到的關於WasmGC的文章](https://developer.chrome.com/blog/wasmgc)中，測量了`fannkuch`基準，發現WasmGC的大小比C或Rust小得多——**2.3** K對比 **6.1-9.6** K——正是基於這個原因。

### 循環回收

在瀏覽器中，Wasm經常與JavaScript（以及通過JavaScript與Web API）互動，但在WasmMVP（甚至包括[引用類型](https://github.com/WebAssembly/reference-types/blob/master/proposals/reference-types/Overview.md)方案）中，沒有辦法讓Wasm和JS之間的雙向鏈接能夠以細粒度的方式回收循環。對JS對象的鏈接只能放置在Wasm表中，而回到Wasm的鏈接只能引用作為一個大型對象的整個Wasm實例，如下所示：


![JS與整個Wasm模塊之間的循環](/_img/wasm-gc-porting/cycle2.svg "各個JS對象引用單個Wasm實例，而不是內部的各個對象。")

這不足以高效地回收一些剛好在編譯後的虛擬機和JavaScript中的對象的特定循環。而使用WasmGC時，我們定義讓虛擬機知曉的Wasm對象，因此可以有從Wasm到JavaScript以及返回的正確引用：

![JS與WasmGC對象之間的循環](/_img/wasm-gc-porting/cycle3.svg "具有相互鏈接的JS和Wasm對象。")

### 堆棧上的GC引用

GC語言必須考慮到堆棧上的引用，即，在調用作用域中的局部變量，因為這些引用可能是保持某對象存活的唯一因素。在GC語言的傳統移植方式中，這是一個問題，因為Wasm的沙箱機制阻止程序檢查自己的堆棧。對於傳統移植，有解決方案，比如使用影子堆棧（[可以自動完成](https://github.com/WebAssembly/binaryen/blob/main/src/passes/SpillPointers.cpp)），或者僅當堆棧上沒有任何內容時才進行垃圾回收（例如在JavaScript事件循環的兩次執行之間）。一個可能對傳統移植有幫助的未來增加功能可能是Wasm的[堆棧掃描支持](https://github.com/WebAssembly/design/issues/1459)。但目前，只有WasmGC能夠在沒有額外開銷的情況下處理堆棧引用，並且是完全自動完成的，因為Wasm虛擬機負責GC。

### GC效率

一個相關的問題是執行垃圾回收（GC）的效率。這裡兩種移植方法都有潛在的優勢。傳統的移植可以重用現有虛擬機中的優化措施，這些措施可能針對某種特定語言，諸如大力優化內部指針或短生命週期對象。而運行於網頁上的WasmGC移植，則具有能重用使JavaScript垃圾回收快速的所有工作之優勢，包括例如[世代垃圾回收](https://en.wikipedia.org/wiki/Tracing_garbage_collection#Generational_GC_(ephemeral_GC))、[增量收集](https://en.wikipedia.org/wiki/Tracing_garbage_collection#Stop-the-world_vs._incremental_vs._concurrent)等技術。此外，WasmGC將垃圾回收留給虛擬機處理，這使得例如高效寫屏障等事情變得容易。

WasmGC的另一個優勢是垃圾回收可以感知內存壓力等情況，並相應地調整堆大小和收集頻率，這一點在網頁上的JavaScript虛擬機中已經做到了。

### 記憶體碎片

隨著時間的推移，特別是在長時間運行的程式中，對WasmMVP線性記憶體執行`malloc/free`操作會引起*碎片化*。假設我們有總計2MB的記憶體，在記憶體的正中間只分配了幾個字節的小塊。在像C、C++和Rust這樣的語言中，在運行期間無法移動任意分配。因此，在這個分配的左側有將近1MB，右側也有將近1MB。儘管我們實際上擁有這麼多未分配的總記憶體，但如果試圖分配1.5MB則會失敗，因為這些是兩個分離的碎片。


![](/_img/wasm-gc-porting/fragment1.svg "線性記憶體中有中間一塊擾人的小分配，將自由空間分成兩半。")

這種碎片化可能迫使Wasm模組更頻繁地擴展其記憶體，這[增加了額外開銷並可能導致記憶體不足錯誤](https://github.com/WebAssembly/design/issues/1397)；目前[一些改進](https://github.com/WebAssembly/design/issues/1439)正在設計中，但這是一個棘手的問題。這在所有WasmMVP程式中都是問題，包括垃圾回收語言的傳統移植方式（注意垃圾回收對象本身可能是可移動的，但運行時的部分則不是）。然而，WasmGC則避免了這個問題，因為記憶體完全由虛擬機管理，可以在垃圾回收堆中移動對象以實現緊湊且避免碎片化。

### 開發工具集成

在傳統移植到WasmMVP中，對象放置在線性記憶體中，這讓開發工具很難提供有用的資訊，因為這些工具只能看到沒有高級類型信息的字節。而在WasmGC中，虛擬機管理垃圾回收對象，因此可以實現更好的集成。例如，在Chrome中可以使用堆分析器測量WasmGC程式的記憶體使用情況：


![WasmGC程式在Chrome堆分析器中運行的畫面](/_img/wasm-gc-porting/devtools.png)

上圖顯示了在Chrome開發工具中的記憶體選項卡，我們可以看到一個頁面的堆快照，其中運行了生成1001個小對象的WasmGC程式（在[鏈表](https://gist.github.com/kripken/5cd3e18b6de41c559d590e44252eafff)中）。您可以看到對象類型的名字`$Node`，以及指向列表中下一個對象的欄位`$next`。所有常見的堆快照資訊都在這裡，例如對象數量、淺表大小、保留大小等，方便我們輕鬆看到WasmGC物件實際使用了多少記憶體。其他Chrome開發工具的功能，如調試器，也可以對WasmGC對象正常工作。

### 語言語義

當使用傳統移植方式重新編譯虛擬機時，您將獲得預期的精確語言，因為您正在運行熟悉的實現該語言的程式碼。這是一個主要的優勢！相比之下，在WasmGC移植中，您可能需要考慮在語義和效率之間做出妥協。這是因為在WasmGC中，我們定義了新的垃圾回收類型——結構體和陣列——並將其編譯為它們。因此，我們無法簡單地將用C、C++、Rust或類似語言編寫的虛擬機編譯成這種形式，因為這些語言僅能編譯到線性記憶體。因此，WasmGC對絕大多數現有的虛擬機代碼庫並無助益。在WasmGC移植中，您通常需要編寫新代碼，將您的語言結構轉換為WasmGC的基本元件。而這種轉換有多種方式，每種都有不同的取捨。

是否需要妥協取決於特定語言的結構如何能在WasmGC中實現。例如，WasmGC結構體字段具有固定的索引和類型，因此希望以更加動態方式訪問字段的語言[可能會有挑戰](https://github.com/WebAssembly/gc/issues/397)；有各種方法可以解決這個問題，在這些解決方案中，有些選擇可能更簡單或更快，但無法支援該語言的完整原始語義。（WasmGC還有其他當前限制，例如缺少[內部指標](https://go.dev/blog/ismmkeynote)；隨著時間推進，這些限制預計會[改進](https://github.com/WebAssembly/gc/blob/main/proposals/gc/Post-MVP.md)）。

如我們所提及，編譯到 WasmGC 就像編譯到一個現存的 VM，且在這類移植中存在許多合理的妥協。例如，[dart2js (Dart 編譯到 JavaScript) 的數字行為與 Dart VM 不同](https://dart.dev/guides/language/numbers)，而 [IronPython (Python 編譯到 .NET) 的字串行為則像 C# 的字串](https://nedbatchelder.com/blog/201703/ironpython_is_weird.html)。因此，並非所有語言的程式都能在此類移植中執行，但這些選擇是有充分理由的：將 dart2js 的數字實作為 JavaScript 數字讓 VM 優化它們變得更好，而在 IronPython 中使用 .NET 字串意味着可以毫無開銷地將那些字串傳遞給其他 .NET 程式碼。

雖然在 WasmGC 移植中可能需要妥協，但相比於特定的 JavaScript，WasmGC 作為編譯目標具有一些優勢。例如，雖然 dart2js 存在我們剛提到的數字限制，[dart2wasm](https://flutter.dev/wasm) (Dart 編譯到 WasmGC) 的行為完全符合預期，無需妥協（這是可能的，因為 Wasm 為 Dart 所需的數字類型提供了高效的表示方式）。

為什麼這對傳統移植不是問題？原因簡單，因為它們將現有的 VM 重新編譯到線性記憶體中，其中物件存儲為無類型的位元組，這是一種比 WasmGC 更低層次的方式。在僅有無類型位元組時，可以更靈活地執行各種底層（並可能不安全）的技術，而通過重新編譯現有 VM，可以利用那個 VM 本身所有的技術。

### 工具鏈工作量

如我們在上一節中提到的，WasmGC 移植不能僅僅重新編譯現有的 VM。你可能能重用某些程式碼（比如解析程式邏輯和 AOT 優化，因為那些在執行時與 GC 無關），但總的來說，WasmGC 移植需要大量新程式碼。

相比之下，傳統的 WasmMVP 移植可能更簡單且更快：例如，你可以在幾分鐘內將 Lua VM（使用 C 編寫）編譯到 Wasm。而 Lua 的 WasmGC 移植則需要更多的努力，因為你需要編寫程式碼將 Lua 的結構降至 WasmGC 的結構和數組，並且需要在 WasmGC 的類型系統的特定限制範圍內決定如何實現此操作。

因此，更多的工具鏈工作量是 WasmGC 移植的一項顯著缺點。然而，鑒於我們前面提到的所有優勢，我們仍然認為 WasmGC 非常有吸引力！理想的情況是 WasmGC 的類型系統可以高效地支援所有語言，並且所有語言都投入工作來實現 WasmGC 移植。第一部分的實現將受到 [WasmGC 類型系統未來擴展](https://github.com/WebAssembly/gc/blob/main/proposals/gc/Post-MVP.md) 的幫助；而對於第二部分，我們可以通過儘可能地在工具鏈方面共用工作來減少 WasmGC 移植的工作量。值得慶幸的是，事實證明，WasmGC 使共用工具鏈工作變得非常實用，我們將在下一節中看到。

## 優化 WasmGC

我們已經提到過，WasmGC 移植具有潛在的速度優勢，例如使用更少的記憶體以及重用宿主 GC 中的優化。在本節中，我們將展示 WasmGC 相較於 WasmMVP 的其他有趣的優化優勢，這可能大大影響 WasmGC 移植的設計以及最終結果的速度。

關鍵問題在於 *WasmGC 比 WasmMVP 更高層次*。要理解這一點，請記住我們已經提到過，傳統的 WasmMVP 移植就像移植到新架構，而 WasmGC 移植就像移植到新的 VM，而 VM 當然是架構的高層次抽象——而高層次的表示通常更可優化。我們或許可以通過以下虛擬程式碼的具體範例更清楚地看到這一點：

```csharp
func foo() {
  let x = allocate<T>(); // 分配一個 GC 物件。
  x.val = 10;            // 將欄位設置為 10。
  let y = allocate<T>(); // 分配另一個物件。
  y.val = x.val;         // 這一定是 10。
  return y.val;          // 這也一定是 10。
}
```

如評論所示，`x.val` 將包含 `10`，`y.val` 也將包含 `10`，因此最終的返回值也是 `10`，並且優化器甚至可以移除這些分配，變成如下：

```csharp
func foo() {
  return 10;
}
```

太棒了！然而，不幸的是，這在 WasmMVP 中是不可能的，因為每次分配都會轉化為對 `malloc` 的調用，這是一個在 Wasm 中具有線性記憶體副作用的大型複雜函數。由於這些副作用，優化器必須假設第二次分配（`y` 的分配）可能改變 `x.val` 的值，而這也位於線性記憶體中。記憶體管理非常複雜，當我們在 Wasm 的低層次內部實現它時，我們的優化選項就受到了限制。

相比之下，在 WasmGC 中，我們在更高層次運作：每次分配執行 `struct.new` 指令，這是一個我們實際可以推理的 VM 操作，並且優化器也能追蹤參考以得出 `x.val` 僅用值 `10` 寫入一次的結論。因此，我們可以如預期地將這個函數優化為簡單的返回 `10`！

除了分配之外，WasmGC 添加的其他元素還包括顯式函數指標（`ref.func`）及其調用（`call_ref`）、結構和數組欄位上的類型（與無類型的線性記憶體不同）等等。因此，WasmGC 是比 WasmMVP 更高層次的中間表示（IR），並且更加可優化。

如果 WasmMVP 的優化能力有限，為什麼它仍然如此快速？畢竟，Wasm 可以運行得接近原生速度。這是因為 WasmMVP 通常是像 LLVM 這樣的強大優化編譯器的輸出結果。LLVM IR 與 WasmGC 類似，而非 WasmMVP，有專門的分配屬性表示等功能，因此 LLVM 可以優化我們討論的內容。WasmMVP 的設計理念是大多數優化在進入 Wasm 之前於工具鏈層完成，Wasm 虛擬機僅負責完成“最後一哩”的優化（例如寄存器分配）。

WasmGC 能否採用與 WasmMVP 相似的工具鏈模型，特別是使用 LLVM？不幸的是，不能，因為 LLVM 不支持 WasmGC（一些支持[已經被探討](https://github.com/Igalia/ref-cpp)，但很難看到全面支持如何運作）。此外，許多 GC 語言並未使用 LLVM——在此領域有多種編譯工具鏈。因此我們需要為 WasmGC 找到其他解決方案。

幸運的是，如我們已經提及，WasmGC 非常可被優化，這開啟了一些新的選擇。如下是一種看待方式：

![WasmMVP 和 WasmGC 工具鏈工作流](/_img/wasm-gc-porting/workflows1.svg)

WasmMVP 和 WasmGC 的工作流都從左側的相同兩個方框開始：我們從源代碼開始進行處理並以語言特定的方式進行優化（而每種語言最熟悉自己）。然後出現不同之處：對於 WasmMVP，我們必須先執行通用優化而後降低至 Wasm；而對於 WasmGC，我們有一個選擇：先降低至 Wasm 而後再進行優化。這很重要，因為降低後進行優化的優勢非常明顯：此時我們可以在所有編譯至 WasmGC 的語言之間共享工具鏈代碼以進行通用優化。下一個圖顯示了該過程的樣貌：


![多個 WasmGC 工具鏈由 Binaryen 優化器優化](/_img/wasm-gc-porting/workflows2.svg "左側的幾種語言編譯為中間的 WasmGC，並一同進入 Binaryen 優化器（wasm-opt）。")

由於我們可以在編譯至 WasmGC 之後進行通用優化，Wasm 到 Wasm 的優化器可以幫助所有 WasmGC 編譯工具鏈。基於這一原因，V8 團隊在 [Binaryen](https://github.com/WebAssembly/binaryen/) 中對 WasmGC 進行了投資，所有工具鏈都可以作為 `wasm-opt` 命令行工具使用。我們接下來會專注於此。

### 工具鏈優化

[Binaryen](https://github.com/WebAssembly/binaryen/)，WebAssembly 工具鏈優化項目，已經提供了一系列[豐富的優化](https://www.youtube.com/watch?v=_lLqZR4ufSI)功能，涵蓋 WasmMVP 的內容，例如內聯、常量傳播、死代碼刪除等，幾乎所有這些都適用於 WasmGC。然而，如前所述，WasmGC 讓我們能做比 WasmMVP 多得多的優化，因此我們也相應地編寫了很多新的優化功能：

- [逃逸分析](https://github.com/WebAssembly/binaryen/blob/main/src/passes/Heap2Local.cpp)：將堆分配移動至局部變量。
- [去虛擬化](https://github.com/WebAssembly/binaryen/blob/main/src/passes/ConstantFieldPropagation.cpp)：將間接調用轉換為直接調用（這可能進一步內聯）。
- [更強大的全局死代碼刪除](https://github.com/WebAssembly/binaryen/pull/4621)。
- [基於全程類型感知的內容流分析（GUFA）](https://github.com/WebAssembly/binaryen/pull/4598)。
- [強制類型轉換優化](https://github.com/WebAssembly/binaryen/blob/main/src/passes/OptimizeCasts.cpp)：例如移除冗餘類型轉換並將其移動到更早的位置。
- [類型精剪](https://github.com/WebAssembly/binaryen/blob/main/src/passes/GlobalTypeOptimization.cpp)。
- [類型合併](https://github.com/WebAssembly/binaryen/blob/main/src/passes/TypeMerging.cpp)。
- 類型精化（針對[局部變量](https://github.com/WebAssembly/binaryen/blob/main/src/passes/LocalSubtyping.cpp)、[全域變量](https://github.com/WebAssembly/binaryen/blob/main/src/passes/GlobalRefining.cpp)、[字段](https://github.com/WebAssembly/binaryen/blob/main/src/passes/TypeRefining.cpp) 和 [函數簽名](https://github.com/WebAssembly/binaryen/blob/main/src/passes/SignatureRefining.cpp)）。

這只是我們所做工作的快速列表。有關 Binaryen 的新 GC 優化以及如何使用它們的更多信息，可參閱 [Binaryen 文檔](https://github.com/WebAssembly/binaryen/wiki/GC-Optimization-Guidebook)。

為了衡量 Binaryen 中這些優化的效果，我們來看使用 J2Wasm 編譯器（將 Java 編譯為 WasmGC）的 Java 性能表現，有和無 `wasm-opt` 的差別：

![Java 性能表現有與無 wasm-opt](/_img/wasm-gc-porting/benchmark1.svg "Box2D、DeltaBlue、RayTrace 和 Richards 基準測試，都顯示使用 wasm-opt 後性能提升。")

此處“無 wasm-opt”意味著我們未執行 Binaryen 的優化，但仍在虛擬機和 J2Wasm 編譯器中進行了優化。如圖所示，`wasm-opt` 在這些基準測試中帶來顯著加速，平均使它們**快了1.9倍**。

總結來說，`wasm-opt` 可以被任何編譯到 WasmGC 的工具鏈使用，這避免了在每個工具鏈中重新實現通用優化的需求。而且，隨著我們持續改進 Binaryen 的優化功能，這將惠及所有使用 `wasm-opt` 的工具鏈，就如同對 LLVM 的改進會幫助所有使用 LLVM 編譯到 WasmMVP 的語言一樣。

工具鏈優化只是其中的一部分。接下來我們將看到，Wasm VM 中的優化同樣至關重要。

### V8 優化

如我們所提到的，WasmGC 比 WasmMVP 更具優化潛力，不僅工具鏈從中受益，虛擬機也一樣。而這對於 GC 語言尤為重要，因為 GC 語言與編譯到 WasmMVP 的語言有所不同。以內聯（inlining）為例，這是最重要的優化之一：像 C、C++ 和 Rust 這類語言在編譯時進行內聯，而像 Java 和 Dart 這類 GC 語言通常運行於虛擬機中，內聯和優化發生在運行時。這種性能模型影響了語言設計及人們如何撰寫 GC 語言的代碼。

例如，在像 Java 這樣的語言中，所有的調用最初都是間接的（子類可以覆蓋父類函數，即使以父類型的引用調用子類）。當工具鏈能夠將間接調用轉變為直接調用時，我們會受益，但實際上，真實世界中的 Java 程式碼模式經常有實際使用大量間接調用的情況，或者至少無法靜態推斷為直接調用。為了更好地處理這些情況，我們在 V8 中實現了 **推測性內聯（speculative inlining）**，也就是說，在運行時記錄間接調用的情況，如果發現某個調用點行為相當簡單（只有少量目標），我們會在此處內聯並進行適當的檢查防護，這與 Java 通常的優化方式更為接近，而不是完全將此類事務留給工具鏈處理。

實際數據證實了這種方法的有效性。我們測量了 Google 表格計算引擎的性能，該引擎是一個使用 Java 編寫的代碼庫，用於計算電子表格公式，至今仍通過 [J2CL](https://j2cl.io) 編譯成 JavaScript。V8 團隊一直與表格和 J2CL 團隊合作，將該代碼移植到 WasmGC，這不僅是因為對表格預期的性能提升，還因為這能為 WasmGC 規範過程提供有用的真實反饋。從性能結果來看，推測性內聯是我們在 V8 中為 WasmGC 實現的最重要的單項優化，如下圖所示：


![Java 性能在不同 V8 優化下的表現](/_img/wasm-gc-porting/benchmark2.svg "WasmGC 延遲：無優化，其他優化，推測性內聯，以及推測性內聯 + 其他優化情況。最大幅度的提升來自於添加推測性內聯。")

“其他優化”指的是除了推測性內聯外的其他優化，我們為了測試而禁用了這部分功能，這包括：加載消除、基於類型的優化、分支消除、常量折疊、逃逸分析以及公共子表達式消除。“無優化”則表示我們禁用了所有這些以及推測性內聯（但 V8 中存在其他我們無法輕易禁用的優化；因此這裡的數據只是估算值）。相比於所有其他優化措施的總合，推測性內聯帶來了約 **30%** 的速度提升（！），充分顯示了內聯對 Java 編譯效果的重要性。

除了推測性內聯之外，WasmGC 基於 V8 中已有的 Wasm 支援，因此可受益於相同的優化管線、寄存器分配、分層執行等。此外，WasmGC 的某些特定方面還可以通過額外的優化來受益，最顯而易見的是優化 WasmGC 提供的新指令，例如高效實現類型轉換。另一項重要的工作是我們在優化器中使用了 WasmGC 的類型資訊。例如，`ref.test` 在運行時檢查引用是否屬於特定類型，在這樣的檢查成功後，我們知道 `ref.cast`（對該類型的強制轉換）也必然成功。這有助於優化像這樣的 Java 模式：

```java
if (ref instanceof Type) {
  foo((Type) ref); // 該向下轉型操作可以被消除。
}
```

這些優化在推測性內聯之後尤其有用，因為此時我們能看到比工具鏈生成 Wasm 時更多的資訊。

總體來說，在 WasmMVP 中，工具鏈與 VM 的優化之間有著相當明確的分界線：我們在工具鏈中完成了盡可能多的優化，僅為 VM 留下必要的部分，這樣設計的合理性在於保持 VM 的簡潔。而在 WasmGC 中，這種平衡可能會有所改變，因為如我們所見，對於 GC 語言，需要在運行時進行更多的優化，而且 WasmGC 本身更具優化潛力，使得工具鏈與 VM 優化之間的重疊增加。觀察這一生態如何在此發展將會很有趣。

## 演示及進展

您可以立即開始使用 WasmGC！在 W3C 達到 [第 4 階段](https://github.com/WebAssembly/meetings/blob/main/process/phases.md#4-standardize-the-feature-working-group)後，WasmGC 現已成為完整且最終標準，並已經在 Chrome 119 中推出支援。有了此瀏覽器（或者任何其他支援 WasmGC 的瀏覽器，例如，Firefox 120 預計在本月稍晚推送 WasmGC 支援），您可以運行這個 [Flutter 範例](https://flutterweb-wasm.web.app/)，在該範例中，Dart 編譯為 WasmGC 來驅動應用程式的邏輯，包括其元件、佈局和動畫。

![Flutter 範例在 Chrome 119 中運行。](/_img/wasm-gc-porting/flutter-wasm-demo.png "Material 3 由 Flutter WasmGC 渲染。")

## 開始使用

如果您有興趣使用 WasmGC，以下連結可能會對您有所幫助：

- 各種工具鏈今日都支援 WasmGC，包括 [Dart](https://flutter.dev/wasm)、[Java (J2Wasm)](https://github.com/google/j2cl/blob/master/docs/getting-started-j2wasm.md)、[Kotlin](https://kotl.in/wasmgc)、[OCaml (wasm_of_ocaml)](https://github.com/ocaml-wasm/wasm_of_ocaml) 和 [Scheme (Hoot)]( https://gitlab.com/spritely/guile-hoot)。
- 我們在開發工具部分展示的小程式輸出的 [原始碼](https://gist.github.com/kripken/5cd3e18b6de41c559d590e44252eafff) 是一個手動編寫「hello world」的 WasmGC 程式範例。（特別是您可以看到 `$Node` 類型被定義並使用 `struct.new` 創建。）
- Binaryen 的 wiki 提供 [文檔](https://github.com/WebAssembly/binaryen/wiki/GC-Implementation---Lowering-Tips)，說明編譯器如何生成優化良好的 WasmGC 程式碼。之前提到的各種針對 WasmGC 的工具鏈連結也提供了有價值的學習內容，例如，您可以查看 [Java](https://github.com/google/j2cl/blob/8609e47907cfabb7c038101685153d3ebf31b05b/build_defs/internal_do_not_use/j2wasm_application.bzl#L382-L415)、[Dart](https://github.com/dart-lang/sdk/blob/f36c1094710bd51f643fb4bc84d5de4bfc5d11f3/sdk/bin/dart2wasm#L135) 和 [Kotlin](https://github.com/JetBrains/kotlin/blob/f6b2c642c2fff2db7f9e13cd754835b4c23e90cf/libraries/tools/kotlin-gradle-plugin/src/common/kotlin/org/jetbrains/kotlin/gradle/targets/js/binaryen/BinaryenExec.kt#L36-L67) 所使用的 Binaryen 過程和標誌。

## 摘要

WasmGC 是一種實現 WebAssembly 中 GC 語言的新穎且極具潛力的方式。在某些情況下，將 VM 重新編譯至 Wasm 的傳統移植方式仍然是最合理的，但我們希望 WasmGC 移植技術因其優勢而變得流行：WasmGC 移植技術能比傳統方式生成的程式更小——甚至比使用 C、C++ 或 Rust 編寫的 WasmMVP 程式更小——並在循環集合、記憶體使用、開發工具支持等與網頁相關的問題上集成得更好。WasmGC 也提供了更易於優化的表達形式，這不僅能提供顯著的速度增益，還能使不同語言之間的工具鏈工作共享變得更加方便。

