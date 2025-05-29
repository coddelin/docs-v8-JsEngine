---
title: '更快的 JavaScript 調用'
author: '[Victor Gomes](https://twitter.com/VictorBFG)，框架撕裂者'
avatars:
  - 'victor-gomes'
date: 2021-02-15
tags:
  - internals
description: '通過移除參數適配框架來實現更快的 JavaScript 調用'
tweet: '1361337569057865735'
---

JavaScript 允許以與期望的參數數量不同的參數數量調用函數，即可以傳遞比聲明的正式參數數量更少或更多的參數。前者稱為低於應用，後者稱為超量應用。

<!--truncate-->
在低於應用的情況下，其餘參數會被賦予 undefined 值。在超量應用的情況下，其餘參數可以通過使用剩餘參數和 `arguments` 屬性來訪問，或者它們只是多餘的，可以被忽略。許多 Web/Node.js 框架如今使用這個 JavaScript 特性來接受可選參數並創建更靈活的 API。

直到最近，V8 還有一個特殊的機制來處理參數數量不匹配：參數適配框架。不幸的是，參數適配會帶來性能成本，但在現代前端和中間件框架中經常需要使用。不過，通過一個巧妙的技巧，我們可以移除這個額外的框架，簡化 V8 的代碼庫並幾乎消除所有的開銷。

我們可以通過一個微基準測試計算移除參數適配框架的性能影響。

```js
console.time();
function f(x, y, z) {}
for (let i = 0; i <  N; i++) {
  f(1, 2, 3, 4, 5);
}
console.timeEnd();
```

![通過微基準測試測量移除參數適配框架的性能影響。](/_img/v8-release-89/perf.svg)

圖表顯示，在 [無 JIT 模式](https://v8.dev/blog/jitless)（Ignition）下執行時，已經沒有開銷並且性能提高了 11.2%。使用 [TurboFan](https://v8.dev/docs/turbofan) 時，性能提升高達 40%。

這個微基準測試的設計本質上是為了最大化參數適配框架的影響。然而，我們在許多基準測試中看到了顯著改善，例如在 [我們的內部 JSTests/Array 基準測試](https://chromium.googlesource.com/v8/v8/+/b7aa85fe00c521a704ca83cc8789354e86482a60/test/js-perf-test/JSTests.json)（7%）和 [Octane2](https://github.com/chromium/octane)（在 Richards 中提升 4.6%，在 EarleyBoyer 中提升 6.1%）。

## 總結：反轉參數

這個項目的全部目的是移除參數適配框架，該框架在訪問堆棧中的參數時提供了統一的接口。為了實現這一點，我們需要反轉堆棧中的參數，並在被調用的框架中添加一個新槽以包含實際參數數量。下圖顯示了一個典型框架在變更前後的情況。

![移除參數適配框架前後典型的 JavaScript 堆棧框架。](/_img/adaptor-frame/frame-diff.svg)

## 讓 JavaScript 調用更快

為了了解我們如何使調用更快，讓我們來看看 V8 是如何執行調用的，以及參數適配框架是如何工作的。

當我們在 JavaScript 中調用函數時，V8 的內部發生了什麼？假設有以下 JavaScript 腳本：

```js
function add42(x) {
  return x + 42;
}
add42(3);
```

![在函數調用期間 V8 的執行流程。](/_img/adaptor-frame/flow.svg)

## Ignition

V8 是一個多層虛擬機器。它的第一層被稱為 [Ignition](https://v8.dev/docs/ignition)，它是一個帶有累加器寄存器的字節碼堆棧機器。V8 首先將代碼編譯為 [Ignition 字節碼](https://medium.com/dailyjs/understanding-v8s-bytecode-317d46c94775)。上述調用被編譯為以下內容：

```
0d              LdaUndefined              ;; 將 undefined 加載到累加器
26 f9           Star r2                   ;; 將其存儲在寄存器 r2 中
13 01 00        LdaGlobal [1]             ;; 加載由常數 1 指向的全局（add42）
26 fa           Star r1                   ;; 將其存儲在寄存器 r1 中
0c 03           LdaSmi [3]                ;; 將小整數 3 加載到累加器
26 f8           Star r3                   ;; 將其存儲在寄存器 r3 中
5f fa f9 02     CallNoFeedback r1, r2-r3  ;; 調用
```

調用的第一個參數通常稱為接收者。接收者是 JS 函數內的 `this` 對象，每個 JS 函數調用都必須有一個。`CallNoFeedback` 的字節碼處理器需要調用對象 `r1`，並使用寄存器列表 `r2-r3` 中的參數。

在我們深入探討位元碼處理程序之前，請注意寄存器在位元碼中的編碼方式。它們是負的單字節整數：`r1` 編碼為 `fa`，`r2` 編碼為 `f9`，`r3` 編碼為 `f8`。我們實際上可以將任何寄存器 ri 表示為 `fb - i`，但是正確的編碼應該是 `- 2 - kFixedFrameHeaderSize - i`。寄存器列表使用第一個寄存器和列表的大小進行編碼，例如 `r2-r3` 是 `f9 02`。

Ignition 中有許多位元碼呼叫處理程序。你可以在[此處](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/interpreter/bytecodes.h;drc=3965dcd5cb1141c90f32706ac7c965dc5c1c55b3;l=184)查看它們的列表。這些處理程序之間稍有不同。有針對具有 `undefined` 接收者的呼叫、屬性呼叫、固定參數數量的呼叫或一般呼叫的位元碼。這裡我們分析 `CallNoFeedback`，它是一種不從執行中累積回饋的一般呼叫。

這個位元碼的處理程序非常簡單。它是用[`CodeStubAssembler`](https://v8.dev/docs/csa-builtins)編寫的，你可以在[此處](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/interpreter/interpreter-generator.cc;drc=6cdb24a4ce9d4151035c1f133833137d2e2881d1;l=1467)查看。基本上，它會尾調到依賴架構的內建函數 [`InterpreterPushArgsThenCall`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=1277)。

這個內建函數主要是將返回地址彈出到臨時寄存器中，將所有參數（包括接收者）推入堆疊，然後再推回返回地址。在此刻，我們尚不知道被呼叫者是否為可呼叫物件，也不知道被呼叫者期望的參數數量，即其形式參數數量。

![執行 `InterpreterPushArgsThenCall` 內建函數後的堆疊狀態。](/_img/adaptor-frame/normal-push.svg)

最終執行會尾調到內建函數 [`Call`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=2256)。在這裡，它會檢查目標是否為合適的函數、構造函數或任何可呼叫物件。它還會讀取 `shared function info` 結構以獲取它的形式參數數量。

如果被呼叫者是函數物件，它會尾調到內建函數 [`CallFunction`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=2038)，此處會進行許多檢查，包括檢查接收者是否為 `undefined` 物件。如果接收者是 `undefined` 或 `null` 物件，根據[ECMA 規範](https://262.ecma-international.org/11.0/#sec-ordinarycallbindthis)，我們應該將其修補為參考全局代理物件。

然後執行會尾調到內建函數 [`InvokeFunctionCode`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/codegen/x64/macro-assembler-x64.cc;drc=a723767935dec385818d1134ea729a4c3a3ddcfb;l=2781)，這會在參數沒有不匹配的情況下呼叫被呼叫物件中的 `Code` 字段指向的任何內容。這可能是優化過的函數，也可能是內建函數 [`InterpreterEntryTrampoline`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=1037)。

如果假設我們呼叫尚未優化的函數，Ignition 跳板會設置一個 `IntepreterFrame`。你可以在[此處](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/execution/frame-constants.h;drc=574ac5d62686c3de8d782dc798337ce1355dc066;l=14)看到 V8 中幀類型的簡要摘要。

不用深入探討接下來發生的細節，我們可以看到在被呼叫者的執行期間解釋器幀的快照。

![呼叫 `add42(3)` 的 `InterpreterFrame`。](/_img/adaptor-frame/normal-frame.svg)

我們看到堆疊中有固定數量的插槽：返回地址、上一幀指標、上下文、我們正在執行的當前函數物件、該函數的位元碼數組以及我們正在執行的當前位元碼的偏移量。最後，我們有一個專門為此函數分配的寄存器列表（你可以將它們想像為函數局部變數）。`add42` 函數實際上沒有任何寄存器，但調用者有一個類似幀，包含 3 個寄存器。

如預期所見，`add42` 是一個簡單的函數：

```
25 02             Ldar a0          ;; 將第一個參數載入累加器
40 2a 00          AddSmi [42]      ;; 將其加上 42
ab                Return           ;; 返回累加器
```

注意我們在 `Ldar` （載入累加器寄存器）位元碼中對參數的編碼方式：參數 `1` (`a0`) 編碼為數字 `02`。事實上，任何參數的編碼都是 `[ai] = 2 + parameter_count - i - 1`，接收者 `[this] = 2 + parameter_count`，在此例中 `[this] = 3`。這裡的參數數量不包括接收者。

現在我們能夠理解為什麼我們用這種方式編碼暫存器和參數了。它們僅僅是表示相對於框架指針的偏移量。我們可以用相同的方式對參數/暫存器進行載入和存儲操作。相對於框架指針的最後一個參數偏移量是 `2` （前一個框架指針和返回地址）。這就解釋了編碼中的 `2`。解釋器框架的固定部分是 `6` 個插槽（來自框架指針的 `4` 個插槽），因此暫存器零位於偏移量 `-5`，即 `fb`，暫存器 `1` 位於 `fa`。是不是很巧妙？

但是請注意，為了能夠訪問參數，函數必須知道堆疊中有多少個參數！索引 `2` 指向最後一個參數，與參數個數無關！

`Return` 的字節碼處理程序將通過調用內建函數 `LeaveInterpreterFrame` 結束。這個內建函數基本上是從框架中讀取函數對象以獲取參數個數，彈出當前框架，恢復框架指針，將返回地址保存在暫存暫存器中，根據參數個數彈出參數並跳轉到暫存暫存器中的地址。

所有這些流程都很精彩！但是如果在調用函數時，提供的參數比它的參數個數少或多會發生什麼呢？巧妙的參數/暫存器訪問將失敗，那麼我們該如何在調用結束時清理參數呢？

## 參數調節框架

現在我們用少於或多於參數個數的情況來調用 `add42`：

```js
add42();
add42(1, 2, 3);
```

我們之間的 JS 開發者們會知道，在第一個情況下，`x` 將被賦值為 `undefined`，函數將返回 `undefined + 42 = NaN`。在第二個情況下，`x` 被賦值為 `1`，函數將返回 `43`，其餘的參數將被忽略。請注意，調用方並不知道這會發生。即使調用方檢查參數個數，被調用方仍然可以使用剩餘參數或 arguments 對象來訪問所有其他參數。事實上，在鬆散模式下，arguments 對象甚至可以在 `add42` 外部被訪問。

如果我們跟隨之前的相同步驟，我們會首先調用內建函數 `InterpreterPushArgsThenCall`。它會把參數推入堆疊，如下：

![執行內建函數 `InterpreterPushArgsThenCall` 後的框架狀態。](/_img/adaptor-frame/adaptor-push.svg)

繼續之前的相同程序，我們檢查被調用方是否為函數對象，獲取其參數個數並將接收器補丁設置為全局代理。最終，我們到達 `InvokeFunctionCode`。

此時，我們不跳到被調用對象中的 `Code`。我們檢查參數大小和參數個數之間的差異並跳轉到 `ArgumentsAdaptorTrampoline`。

在這個內建函數中，我們構建了一個額外的框架，就是聞名遐邇的參數調節框架。在此我不會解釋內建函數中的具體操作，而是直接展示在內建函數調用被調用方的 `Code` 之前框架的狀態。請注意，這是一個合適的 `x64 call`（而不是 `jmp`），並且在被調用方執行完後，我們會返回到 `ArgumentsAdaptorTrampoline`。這與 `InvokeFunctionCode` 的尾遞歸調用形成了對比。

![帶有參數調整的堆棧框架。](/_img/adaptor-frame/adaptor-frames.svg)

你可以看到我們創建了另一個框架，復制了所有必要的參數，以便在被調用方框架之上精確地放置符合參數個數的參數。它為被調用函數創建了一個界面，使後者不需要知道參數的數量。被調用方能夠用與之前相同的計算公式訪問其參數，即：`[ai] = 2 + parameter_count - i - 1`。

V8 有一些特殊的內建函數，理解參數調節框架，無論是在需要通過剩餘參數或 arguments 對象訪問剩餘參數時。它們始終需要檢查位於被調用方框架之上的調節框架類型，然後採取相應的操作。

如你所見，我們解決了參數/暫存器訪問問題，但我們也增加了很多複雜性。每個需要訪問所有參數的內建函數都需要理解並檢查調節框架的存在。不僅如此，我們還需要謹慎避免訪問過期和舊的數據。例如考慮以下對 `add42` 的修改：

```js
function add42(x) {
  x += 42;
  return x;
}
```

字節碼數組現在是：

```
25 02             Ldar a0       ;; 將第一個參數載入累加器
40 2a 00          AddSmi [42]   ;; 加上42
26 02             Star a0       ;; 將累加器存入第一個參數槽
ab                Return        ;; 返回累加器
```

如你所見，我們現在修改了 `a0`。所以，在調用 `add42(1, 2, 3)` 的情況下，參數調節框架中的槽將被修改，但調用方框架仍然包含數字 `1`。我們需要謹慎確保 arguments 對象正在訪問修改後的值，而不是過期的值。

從函數返回非常簡單，但速度較慢。記得 `LeaveInterpreterFrame` 做了什麼嗎？它基本上彈出了被調用方框架以及參數直到參數個數。所以當我們返回到參數調節存根時，堆疊如下所示：

![執行被調用函數 `add42` 後的框架狀態。](/_img/adaptor-frame/adaptor-frames-cleanup.svg)

我們只需要彈出參數的數量，彈出適配器框架，根據實際參數數量彈出所有參數，然後返回到調用者的執行上下文。

概括來說：參數適配器機制不僅複雜，而且成本高昂。

## 移除參數適配器框架

我們能更好地實現嗎？我們能移除適配器框架嗎？事實證明，我們確實可以。

讓我們再次審視需求：

1. 我們需要能像以前一樣平滑地訪問參數和寄存器。訪問時不能進行檢查，因為這樣會過於昂貴。
2. 我們需要能從堆疊中構建剩餘參數和 arguments 對象。
3. 我們需要在從調用返回時，能輕鬆清除未知數量的參數。
4. 當然，我們希望做到這一點而不需要額外的框架！

如果我們想要消除額外的框架，那麼我們需要決定參數的存放位置：要麼在被調用者框架，要麼在調用者框架。

### 將參數存放在被調用者框架內

假設我們將參數存放在被調用者框架內。這看起來確實是一個不錯的主意，因為每當我們彈出框架時，我們也一次性彈出所有參數！

參數需要位於保存的框架指針和框架的末尾之間的某個位置。這意味著框架的大小將無法靜態確定。訪問參數依然很簡單，只需在框架指針上計算一個偏移量即可。但是，訪問寄存器現在變得更加複雜，因為它取決於參數的數量。

堆疊指針總是指向最後一個寄存器，因此我們可以用它來訪問寄存器，而不需要知道參數數量。這種方法可能確實可行，但存在一個主要缺陷。這將導致需要為所有可以訪問寄存器和參數的字節碼製作副本。例如，我們需要一個 `LdaArgument` 和一個 `LdaRegister`，而不是僅僅使用 `Ldar`。當然，我們也可以檢查我們訪問的是參數還是寄存器（正偏移量或負偏移量），但這要求在每次參數和寄存器訪問時進行檢查。顯然過於昂貴！

### 將參數存放在調用者框架內

好吧……如果我們將參數放在調用者框架內呢？

記住如何計算框架中的參數 `i` 的偏移量：`[ai] = 2 + parameter_count - i - 1`。如果我們擁有所有參數（不僅僅是形式參數），偏移量將是 `[ai] = 2 + argument_count - i - 1`。也就是說，對於每次參數訪問，我們需要載入實際參數數量。

但是如果我們將參數反轉呢？現在偏移量可以簡單地計算為 `[ai] = 2 + i`。我們不需要知道堆疊中有多少參數，但如果我們能保證堆疊中總是至少有形式參數數量的參數，那麼我們總是可以使用這種方案來計算偏移量。

換句話說，推入堆疊中的參數數量將始終是參數數量與形式參數數量之間的最大值，如果需要，會用未定義對象填充。

這還有另一個好處！對於任何 JS 函數，接收者總是位於固定的偏移量處，就在返回地址的上方：`[this] = 2`。

這是一種滿足需求 `1` 和需求 `4` 的簡潔解決方案。那麼其他兩個需求呢？怎麼構建剩餘參數和 arguments 對象？以及在返回到調用者時如何清理堆疊中的參數？為此我們只需知道參數的數量。我們需要將其存儲在某個位置。這裡的選擇有點隨意，只要能輕鬆訪問該信息即可。有兩個基本選擇：將其推入調用者框架中的接收者之後，或者將其作為被調用者框架固定標頭部分的一部分。我們實現了後者，因為它將解釋器框架和優化框架的固定標頭部分結合在了一起。

如果我們在 V8 v8.9 中運行我們的示例，我們將在 `InterpreterArgsThenPush` 之後看到如下的堆疊狀態（注意參數現在是反轉的）：

![執行 `InterpreterPushArgsThenCall` 內建函數後的框架狀態。](/_img/adaptor-frame/no-adaptor-push.svg)

所有執行都遵循類似的路徑，直到我們到達 InvokeFunctionCode。在此我們優化參數處理，在參數不足時推送所需的未定義對象。注意，在參數過多的情況下我們不會改變任何東西。最後，我們將參數數量通過寄存器傳遞給被調用者的 `Code`。對於 `x64`，我們使用寄存器 `rax`。

如果被調用者尚未被優化，我們會到達 `InterpreterEntryTrampoline`，它會構建如下的堆疊框架。

![沒有參數適配器的堆疊框架。](/_img/adaptor-frame/no-adaptor-frames.svg)

被調用者框架有一個額外的槽位，用於存儲參數數量，可用於構建剩餘參數或 arguments 對象，以及在返回給調用者之前清理堆疊中的參數。

返回時，我們修改`LeaveInterpreterFrame`讀取堆疊中的參數數量，並彈出參數數量與形式參數數量之間的最大值。

## TurboFan

那麼優化後的代碼呢？讓我們稍微修改初始腳本，強制 V8 使用 TurboFan 編譯它：

```js
function add42(x) { return x + 42; }
function callAdd42() { add42(3); }
%PrepareFunctionForOptimization(callAdd42);
callAdd42();
%OptimizeFunctionOnNextCall(callAdd42);
callAdd42();
```

在這裡我們使用 V8 本地方法強制 V8 優化調用，否則 V8 只有在我們的小函數變得熱 (被頻繁使用) 時才會優化。我們在優化之前調用一次，以收集可以用於引導編譯的類型資訊。請在[這裡](https://v8.dev/docs/turbofan)閱讀更多有關 TurboFan 的資訊。

在這裡我僅向您展示生成代碼中與我們相關的部分。

```nasm
movq rdi,0x1a8e082126ad    ;; 加載函數對象 <JSFunction add42>
push 0x6                   ;; 推入參數 SMI 3
movq rcx,0x1a8e082030d1    ;; <JSGlobal Object>
push rcx                   ;; 推入接收者 (全局代理對象)
movl rax,0x1               ;; 在 rax 中保存參數數量
movl rcx,[rdi+0x17]        ;; 在 rcx 中加載函數對象 {Code} 字段
call rcx                   ;; 最後，調用代碼對象！
```

雖然用匯編語言編寫，但如果您按照我的註解，這段代碼片段應該不難閱讀。本質上，在編譯調用時，TF 需要執行在 `InterpreterPushArgsThenCall`、`Call`、`CallFunction` 和 `InvokeFunctionCall` 中完成的所有工作。希望它具有更多靜態信息以完成這些操作並生成更少的計算機指令。

### 帶參數適配框架的 TurboFan

現在，讓我們來看看參數數量與形式參數數量不匹配的情況。考慮調用 `add42(1, 2, 3)`。這會被編譯為：

```nasm
movq rdi,0x4250820fff1    ;; 加載函數對象 <JSFunction add42>
;; 推入接收者和參數 SMIs 1, 2 和 3
movq rcx,0x42508080dd5    ;; <JSGlobal Object>
push rcx
push 0x2
push 0x4
push 0x6
movl rax,0x3              ;; 在 rax 中保存參數數量
movl rbx,0x1              ;; 在 rbx 中保存形式參數數量
movq r10,0x564ed7fdf840   ;; <ArgumentsAdaptorTrampoline>
call r10                  ;; 調用參數適配跳板
```

如您所見，為 TF 添加對參數和形式參數數量不匹配的支持並不困難。只需調用參數適配跳板即可！

然而，這樣做的代價很高。對於每個優化調用，我們現在需要進入參數適配跳板並像非優化代碼一樣調整框架。這解釋了為什麼移除優化代碼中的適配框架的性能提升比在 Ignition 中大得多。

然而生成的代碼非常簡單。而從中返回也是非常簡單（尾聲）：

```nasm
movq rsp,rbp   ;; 清除被調用者框架
pop rbp
ret 0x8        ;; 彈出一個參數 (接收者)
```

我們彈出框架，並根據參數數量生成返回指令。如果參數數量與形式參數數量不匹配，適配框架跳板將處理它。

### 不帶參數適配框架的 TurboFan

生成的代碼本質上與調用中參數數量匹配的情況相同。考慮調用 `add42(1, 2, 3)`。這會生成：

```nasm
movq rdi,0x35ac082126ad    ;; 加載函數對象 <JSFunction add42>
;; 推入接收者和參數 1, 2 和 3 (順序相反)
push 0x6
push 0x4
push 0x2
movq rcx,0x35ac082030d1    ;; <JSGlobal Object>
push rcx
movl rax,0x3               ;; 在 rax 中保存參數數量
movl rcx,[rdi+0x17]        ;; 在 rcx 中加載函數對象 {Code} 字段
call rcx                   ;; 最後，調用代碼對象！
```

那麼函數的結尾呢？我們不再返回到參數適配跳板，因此結尾比以前稍微複雜一些。

```nasm
movq rcx,[rbp-0x18]        ;; 加載參數數量 (從被調用者框架中) 到 rcx
movq rsp,rbp               ;; 彈出被調用者框架
pop rbp
cmpq rcx,0x0               ;; 比較參數數量與形式參數數量
jg 0x35ac000840c6  <+0x86>
;; 如果參數數量小於 (或等於) 形式參數數量：
ret 0x8                    ;; 像往常一樣返回 (形式參數數量是靜態已知的)
;; 如果堆疊中的參數多於形式參數：
pop r10                    ;; 保存返回地址
leaq rsp,[rsp+rcx*8+0x8]   ;; 根據 rcx 彈出所有參數
push r10                   ;; 恢復返回地址
retl
```

# 結論
