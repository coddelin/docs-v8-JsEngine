---
title: "JavaScript 程式碼覆蓋率"
author: "Jakob Gruber ([@schuay](https://twitter.com/schuay))"
avatars:
  - "jakob-gruber"
date: 2017-12-13 13:33:37
tags:
  - internals
description: "V8 現在具備原生支援 JavaScript 程式碼覆蓋率。工具現在可以訪問 V8 的覆蓋率資訊而無需對程式碼進行插入處理！"
tweet: "940879905079873536"
---
程式碼覆蓋率提供有關應用程式中某些部分是否以及執行次數的資訊。它通常用來確定測試套件在多大程度上檢驗特定程式碼基礎。

## 為何有用？

作為一名 JavaScript 開發者，您可能經常會遇到可以使用程式碼覆蓋率的情境。例如：

- 關心您的測試套件品質？正在重構一個大型舊專案？程式碼覆蓋率能準確告知程式碼基礎中的哪些部分被覆蓋。
- 想快速知道程式碼基礎中特定部分是否被執行？與其使用 `console.log` 進行 `printf`\-風格的除錯或手動逐步執行程式碼，程式碼覆蓋率可以顯示應用程式中哪些部分已被執行的即時資訊。
- 或者您正在針對速度進行優化，並希望知道應該集中在哪些位置？執行計次可以指出熱點函式和迴圈。

<!--truncate-->
## V8 中的 JavaScript 程式碼覆蓋率

今年早些時候，我們在 V8 中添加了對 JavaScript 程式碼覆蓋率的原生支援。版本 5.9 中的初次發布提供了函式粒度的覆蓋率（顯示哪些函式已被執行），後來在 v6.2 中擴展為支援區塊粒度的覆蓋率（同樣的，但針對獨立表達式）。

![函式粒度（左）與區塊粒度（右）](/_img/javascript-code-coverage/function-vs-block.png)

### 對 JavaScript 開發者

目前有兩種主要方式可以訪問覆蓋率資訊。對 JavaScript 開發者來說，Chrome DevTools 的 [Coverage 標籤](https://developers.google.com/web/updates/2017/04/devtools-release-notes#coverage) 經由 Sources 面板展示 JS（及 CSS）覆蓋率的比例並突出顯示失效程式碼。

![在 DevTools 的 Coverage 面板中的區塊覆蓋率。覆蓋的行以綠色標示，未覆蓋的行以紅色標示。](/_img/javascript-code-coverage/block-coverage.png)

由於 [Benjamin Coe](https://twitter.com/BenjaminCoe) 的貢獻，還有 [持續進行的](https://github.com/bcoe/c8) 專案致力於將 V8 的程式碼覆蓋率資訊整合到流行的 [Istanbul.js](https://istanbul.js.org/) 程式碼覆蓋率工具中。

![基於 V8 覆蓋率資料的 Istanbul.js 報告。](/_img/javascript-code-coverage/istanbul.png)

### 對嵌入者

嵌入者和框架作者可以直接通過 Inspector API 進行掛鉤以便獲得更多的靈活性。V8 提供了兩種不同的覆蓋率模式：

1. _盡力覆蓋率_ 以最小的運行時效能影響收集覆蓋率資訊，但可能遺失垃圾回收（GC）函式上的資料。

2. _精準覆蓋率_ 確保不會有資料因 GC 而流失，且用戶可以選擇接收執行計次而不是二進位覆蓋率資訊；但效能可能受到增加的負擔影響（詳情請參閱下一節）。精準覆蓋率可以以函式或區塊粒度收集。

精準覆蓋率的 Inspector API 如下：

- [`Profiler.startPreciseCoverage(callCount, detailed)`](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#method-startPreciseCoverage) 啟用覆蓋率收集，可選擇啟用呼叫計次（與二進位覆蓋率相比）以及區塊粒度（與函式粒度相比）；

- [`Profiler.takePreciseCoverage()`](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#method-takePreciseCoverage) 返回已收集的覆蓋率資訊及執行次數的來源範圍列表；以及

- [`Profiler.stopPreciseCoverage()`](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#method-stopPreciseCoverage) 禁用收集並釋放相關資料結構。

通過 Inspector 協議進行的對話可能如下：

```json
// 嵌入者指示 V8 開始收集精準覆蓋率。
{ "id": 26, "method": "Profiler.startPreciseCoverage",
            "params": { "callCount": false, "detailed": true }}
// 嵌入者請求覆蓋率資料（自上次請求後的增量）。
{ "id": 32, "method":"Profiler.takePreciseCoverage" }
// 回覆中包含嵌套來源範圍的集合。
{ "id": 32, "result": { "result": [{
  "functions": [
    {
      "functionName": "fib",
      "isBlockCoverage": true,    // 區塊粒度。
      "ranges": [ // 一個嵌套範圍的數組。
        {
          "startOffset": 50,  // 位元組偏移量，包含。
          "endOffset": 224,   // 位元組偏移量，不包含。
          "count": 1
        }, {
          "startOffset": 97,
          "endOffset": 107,
          "count": 0
        }, {
          "startOffset": 134,
          "endOffset": 144,
          "count": 0
        }, {
          "startOffset": 192,
          "endOffset": 223,
          "count": 0
        },
      ]},
      "scriptId": "199",
      "url": "file:///coverage-fib.html"
    }
  ]
}}

// 最後，嵌入方指示 V8 結束收集並釋放相關的數據結構。
{"id":37,"method":"Profiler.stopPreciseCoverage"}
```

同樣，可以使用 [`Profiler.getBestEffortCoverage()`](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#method-getBestEffortCoverage) 獲取最佳努力覆蓋範圍。

## 背後的原理

如前一部分所述，V8 支援兩種主要的代碼覆蓋模式：最佳努力和精確覆蓋。以下是其實現概覽。

### 最佳努力覆蓋

最佳努力和精確覆蓋模式均大量重用 V8 的其他機制，第一個機制稱為_調用計數器_。每次通過 V8 的 [Ignition](/blog/ignition-interpreter) 解釋器調用一個函數時，我們會在函數的 [反饋向量](http://slides.com/ripsawridge/deck) 上[增量調用計數器](https://cs.chromium.org/chromium/src/v8/src/builtins/x64/builtins-x64.cc?l=917&rcl=fc33dfbebfb1cb800d490af97bf1019e9d66be33)。當函數變得熱，並通過優化編譯器升級時，此計數器用於幫助指導內聯決策，即哪些函數需要內聯；現在，我們也依賴它來報告代碼覆蓋。

第二個重用機制確定函數的源範圍。報告代碼覆蓋時，調用計數需要與源文件中的相關範圍相關聯。例如，在下面的例子中，我們不僅需要報告函數 `f` 已執行恰好一次，還需要報告 `f` 的源範圍起始於第 1 行並在第 3 行結束。

```js
function f() {
  console.log('Hello World');
}

f();
```

我們再次很幸運，能夠重用 V8 中的現有信息。函數已經知道其在源代碼中的起始和結束位置，這是由於 [`Function.prototype.toString`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/toString)，它需要知道函數在源文件中的位置以提取合適的子字符串。

在收集最佳努力覆蓋時，這兩種機制只是簡單地綁定在一起：首先通過遍歷整個堆找到所有活動的函數。對於每個看到的函數，我們報告調用計數（存儲在反饋向量上，可以從函數訪問到）和源範圍（便捷地存儲在函數本身上）。

請注意，由於調用計數無論是否啟用了覆蓋都會被維護，因此最佳努力覆蓋不會引入任何運行時開銷。它也不使用專用的數據結構，因此既不需要顯式啟用也不需要顯式禁用。

那麼，為什麼這種模式被稱為最佳努力？它的限制是什麼？超出作用域的函數可能會被垃圾收集器釋放，這意味著相關的調用計數將丟失，事實上我們完全忘記了這些函數曾經存在。因此是“最佳努力”：即使我們盡力收集，也可能不完整。

### 精確覆蓋（函數粒度）

與最佳努力模式相比，精確覆蓋保證提供的覆蓋信息是完整的。為實現這一點，我們在啟用精確覆蓋後將所有反饋向量添加到 V8 的根引用集，防止它們被垃圾收集器回收。雖然這確保信息不會丟失，但通過人工保持對象存活會增加內存消耗。

精確覆蓋模式還可以提供執行計數。這為精確覆蓋的實現增加了一個皺褶。回想一下，每次函數通過 V8 的解釋器調用時，調用計數器會增加，並且函數可以升級和在變得熱時優化。但優化的函數不再增加其調用計數器，因此，為了使報告的執行次數保持準確，必須禁用它們的優化編譯器。

### 精確覆蓋（塊粒度）

塊粒度覆蓋需要報告下至單個表達式級別的正確覆蓋。例如，在以下代碼中，塊覆蓋能夠檢測到條件表達式 `: c` 的 `else` 分支從未執行，而函數粒度覆蓋僅知道函數 `f`（其全部）被覆蓋。

```js
function f(a) {
  return a ? b : c;
}

f(true);
```

您可能記得在之前的部分中，我們已經在V8中提供了函數調用計次和源範圍。不幸的是，區塊覆蓋並不是如此，我們需要實現新的機制來收集執行計次及其所對應的源範圍。

第一個方面是源範圍：假設我們對某個區塊有執行計次，我們如何將其映射到源代碼的一部分？為此，我們需要在解析源文件時收集相關的位置。在區塊覆蓋之前，V8已經在一定程度上做到這一點。一個例子是由於`Function.prototype.toString`導致的函數範圍收集，如上所述。另外一個例子是源位置用於構建錯誤對象的回溯。但這兩者都不足以支持區塊覆蓋；前者僅適用於函數，後者只存儲位置（例如`if`\-`else`語句中`if`標記的位置），而不是源範圍。

因此，我們必須擴展解析器以收集源範圍。舉例說明，考慮一個`if`-`else`語句：

```js
if (cond) {
  /* Then branch. */
} else {
  /* Else branch. */
}
```

當啟用區塊覆蓋時，我們[收集](https://cs.chromium.org/chromium/src/v8/src/parsing/parser-base.h?l=5199&rcl=cd23cae9edc134ecfe16a4868266dcf5ec432cbf)`then`和`else`分支的源範圍，並將它們與解析的`IfStatement`AST節點相關聯。對其他相關的語言構造也採用相同的方法。

在解析期間收集源範圍之後，第二個方面是在運行時跟蹤執行計次。這是通過在生成的字節碼陣列中的戰略位置[插入](https://cs.chromium.org/chromium/src/v8/src/interpreter/control-flow-builders.cc?l=207&rcl=cd23cae9edc134ecfe16a4868266dcf5ec432cbf)新的專用`IncBlockCounter`字節碼來完成的。在運行時，`IncBlockCounter`字節碼處理程序只需[增加](https://cs.chromium.org/chromium/src/v8/src/runtime/runtime-debug.cc?l=2012&rcl=cd23cae9edc134ecfe16a4868266dcf5ec432cbf)相應的計數器（通過函數對象可達）。

以上述的`if`-`else`語句為例，這些字節碼將插入三個位置：緊接著`then`分支正文之前，`else`分支正文之前，以及`if`-`else`語句之後（由於分支中可能存在非本地控制，因此需要這種持續計次）。

最後，報告區塊粒度的覆蓋率與函數粒度的報告方式類似。但除了調用計次（來自反饋向量）之外，我們現在還報告_有趣的_源範圍的集合及其區塊計次（存儲在掛載於函數上的輔助數據結構中）。

如果您想了解更多有關V8中代碼覆蓋技術細節的內容，請查看[覆蓋](https://goo.gl/WibgXw)和[區塊覆蓋](https://goo.gl/hSJhXn)設計文檔。

## 結論

希望您喜歡這篇對V8原生代碼覆蓋支持的簡短介紹。請試用，並隨時告訴我們哪些對您有用，哪些不行。在Twitter上打聲招呼（[@schuay](https://twitter.com/schuay)和[@hashseed](https://twitter.com/hashseed)）或在[crbug.com/v8/new](https://crbug.com/v8/new)提交問題。

V8中的覆蓋支持是一個團隊的努力，感謝所有做出貢獻的人：Benjamin Coe、Jakob Gruber、Yang Guo、Marja Hölttä、Andrey Kosyakov、Alexey Kozyatinksiy、Ross McIlroy、Ali Sheikh、Michael Starzinger。謝謝！
