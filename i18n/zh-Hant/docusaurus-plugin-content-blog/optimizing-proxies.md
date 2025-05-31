---
title: "優化 V8 中的 ES2015 代理"
author: "Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski)), 代理優化專家"
avatars: 
  - "maya-armyanova"
date: "2017-10-05 13:33:37"
tags: 
  - ECMAScript
  - 基準測試
  - 內部結構
description: "本文解釋了 V8 如何提升 JavaScript 代理的性能。"
tweet: "915846050447003648"
---
代理自 ES2015 起便成為 JavaScript 的重要部分。它們允許攔截物件上的基本操作並自訂其行為。代理是像 [jsdom](https://github.com/tmpvar/jsdom) 和 [Comlink RPC 函式庫](https://github.com/GoogleChrome/comlink) 等項目的核心部分。最近，我們在提升 V8 中代理的性能方面投入了大量精力。本文著重於 V8 中的一般性能改進模式以及代理的特定改進。

<!--truncate-->
代理是「用於定義基本操作（例如屬性查詢、賦值、枚舉、函式調用等）的自訂行為的物件」（依據 [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) 的定義）。更多資訊可以參考 [完整規範](https://tc39.es/ecma262/#sec-proxy-objects)。例如，以下程式碼片段向對物件的每次屬性訪問添加記錄：

```js
const target = {};
const callTracer = new Proxy(target, {
  get: (target, name, receiver) => {
    console.log(`get 被呼叫: ${name}`);
    return target[name];
  }
});

callTracer.property = 'value';
console.log(callTracer.property);
// get 被呼叫: property
// value
```

## 構造代理

我們要關注的第一個特性是代理的**構造**。我們原始的 C++ 實現遵循 ECMAScript 規範逐步操作，導致如圖所示最少需要在 C++ 和 JS 運行時之間進行 4 次跳轉。我們希望將此實現移植到與平台無關的 [CodeStubAssembler](/docs/csa-builtins)（CSA），該編譯器在 JS 運行時執行而非 C++ 運行時。此移植能將語言運行時之間的跳轉數量降至最低。下圖中，`CEntryStub` 和 `JSEntryStub` 分別表示圖中的 C++ 和 JS 運行時。虛線表示該行穿越了 JS 和 C++ 運行時之間的邊界。幸運的是，許多 [輔助判定](https://github.com/v8/v8/blob/4e5db9a6c859df7af95a92e7cf4e530faa49a765/src/code-stub-assembler.h) 已在該編譯器中實現，這使得 [初始版本](https://github.com/v8/v8/commit/f2af839b1938b55b4d32a2a1eb6704c49c8d877d#diff-ed49371933a938a7c9896878fd4e4919R97)簡明易懂。

下圖顯示了使用代理與任何代理陷阱（例如 `apply`，在代理被用作函式時會被呼叫）時的執行流程。以下範例程式碼生成該數據：

```js
function foo(…) { … }
const g = new Proxy({ … }, {
  apply: foo,
});
g(1, 2);
```

![](/_img/optimizing-proxies/0.png)

將陷阱執行移植到 CSA 之後，所有執行過程都發生在 JS 運行時，語言之間的跳轉數縮減至 4 次至 0 次。

此修改導致了如下性能提升：

![](/_img/optimizing-proxies/1.png)

我們的 JS 性能分數顯示了改進介於 **49% 到 74%**。該分數粗略地衡量了在 1000ms 內能執行的指定微基準的次數。某些測試程式多次運行以便在計時精度有限的情況下進行準確測量。以下所有基準測試的程式碼可在 [我們的 js-perf-test 目錄中](https://github.com/v8/v8/blob/5a5783e3bff9e5c1c773833fa502f14d9ddec7da/test/js-perf-test/Proxies/proxies.js) 找到。

## 呼叫和構造陷阱

下一節顯示了優化呼叫和構造陷阱的結果（即 [`"apply"`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/apply) 和 [`"construct"`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/construct)）。

![](/_img/optimizing-proxies/2.png)

代理被_呼叫_時的性能提升顯著——提升至 **500%** 的速度！然而，代理構造的提升則相對溫和，特別是在沒有實際定義陷阱的情況下——僅約 **25%** 的增益。我們透過使用 [`d8` shell](/docs/build) 運行以下命令進行調查：

```bash
$ out/x64.release/d8 --runtime-call-stats test.js
> 運行: 120.104000

                      運行時函式/C++ 內建        時間             次數
========================================================================================
                                         NewObject     59.16ms  48.47%    100000  24.94%
                                      JS_Execution     23.83ms  19.53%         1   0.00%
                              RecompileSynchronous     11.68ms   9.57%        20   0.00%
                        AccessorNameGetterCallback     10.86ms   8.90%    100000  24.94%
      AccessorNameGetterCallback_FunctionPrototype      5.79ms   4.74%    100000  24.94%
                                  Map_SetPrototype      4.46ms   3.65%    100203  25.00%
… SNIPPET …
```

以下是 `test.js` 的原始碼：

```js
function MyClass() {}
MyClass.prototype = {};
const P = new Proxy(MyClass, {});
function run() {
  return new P();
}
const N = 1e5;
console.time('run');
for (let i = 0; i < N; ++i) {
  run();
}
console.timeEnd('run');
```

結果顯示大部分時間花在 `NewObject` 與其調用的函數上，因此我們開始計劃如何在未來版本中加速這個部分。

## Get 陷阱

接下來的部分描述了我們如何優化使用代理時最常見的操作 —— 通過代理獲取和設置屬性。事實證明，由於 V8 的內聯緩存特定行為 [`get`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/get) 陷阱比之前的情況更為複雜。內聯緩存的詳細說明可觀看[這個影片](https://www.youtube.com/watch?v=u7zRSm8jzvA)。

最終，我們成功移植到 CSA，結果如下：

![](/_img/optimizing-proxies/3.png)

更改上線後，我們注意到 Android 的 `.apk` 文件大小增加了 **~160KB**，遠超我們對於僅有約 20 行助手函數所預期的增長，但幸運的是，我們追蹤了這類統計數據。結果發現，這個函數從另一個函數被調用了兩次，而該函數又被另一個函數調用了三次，再接著又被調用了四次。問題的原因發現是過度內聯。一旦我們將內聯函數轉換為單獨的代碼存根，成功節省了寶貴的 KB——最終版本 `.apk` 文件大小僅增加約 **19KB**。

## Has 陷阱

接下來的部分顯示 [`has`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/has) 陷阱的優化結果。儘管最初我們認為這會更容易（並能重用大部分 `get` 陷阱的代碼），事實證明它具有自己的特殊性。尤為難以跟蹤的一個問題是當調用 `in` 運算符時的原型鏈遍歷。改進結果的增益範圍介於 **71% 到 428%** 之間。同樣，當陷阱存在時，增益更為顯著。

![](/_img/optimizing-proxies/4.png)

## Set 陷阱

下一部分討論移植 [`set`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/set) 陷阱。這次我們必須區分[命名屬性](/blog/fast-properties)與索引屬性（[元素](/blog/elements-kinds)）。這兩種屬性類型不是 JavaScript 語言的一部分，但對於 V8 的高效屬性存儲至關重要。然而，初始實現對於元素仍然退回到運行時，這導致了再次跨越語言邊界。不過，我們在有設置陷阱時實現了 **27% 至 438%** 的提升，而當沒有設置陷阱時則導致了最多 **23%** 的下降。這樣的性能回歸是因為多了一次區分索引屬性與命名屬性的額外檢查。對於索引屬性，目前尚未有提升。以下是完整結果：

![](/_img/optimizing-proxies/5.png)

## 真實世界中的使用

### [jsdom-proxy-benchmark](https://github.com/domenic/jsdom-proxy-benchmark) 的測試結果

jsdom-proxy-benchmark 專案通過 [Ecmarkup](https://github.com/bterlson/ecmarkup) 工具編譯 [ECMAScript 規範](https://github.com/tc39/ecma262)。自 [v11.2.0](https://github.com/tmpvar/jsdom/blob/master/Changelog.md#1120) 起，jsdom 專案（正是 Ecmarkup 背後的實現）使用代理來實現常見的數據結構 `NodeList` 和 `HTMLCollection`。我們使用此基準測試來概括一些比合成的小型基準測試更真實的使用情況，並得到了以下結果，100 次執行的平均值：

- Node v8.4.0（無代理優化）：**14277 ± 159 ms**
- [Node v9.0.0-v8-canary-20170924](https://nodejs.org/download/v8-canary/v9.0.0-v8-canary20170924898da64843/node-v9.0.0-v8-canary20170924898da64843-linux-x64.tar.gz)（僅移植了一半的陷阱）：**11789 ± 308 ms**
- 提速約 2.4 秒，相當於 **~17% 的提升**

![](/_img/optimizing-proxies/6.png)

- [將 `NamedNodeMap` 轉為使用 `Proxy`](https://github.com/domenic/jsdom-proxy-benchmark/issues/1#issuecomment-329047990) 增加了處理時間：
    - 在 V8 6.0（Node v8.4.0）增加了 **1.9 秒**
    - 在 V8 6.3（Node v9.0.0-v8-canary-20170910）增加了 **0.5 秒**

![](/_img/optimizing-proxies/7.png)

:::note
**注意:** 這些結果由 [Timothy Gu](https://github.com/TimothyGu) 提供，感謝!
:::

### 來自 [Chai.js](https://chaijs.com/) 的結果

Chai.js 是一個流行的斷言庫，廣泛使用代理。我們通過在不同版本的 V8 上運行其測試，創建了一種真實世界的基準測試結果，實現了約 **4 秒中改善了 1 秒**，100 次運行的平均值:

- Node v8.4.0 (未使用 Proxy 優化): **4.2863 ± 0.14 秒**
- [Node v9.0.0-v8-canary-20170924](https://nodejs.org/download/v8-canary/v9.0.0-v8-canary20170924898da64843/node-v9.0.0-v8-canary20170924898da64843-linux-x64.tar.gz) (僅移植了一半的 traps): **3.1809 ± 0.17 秒**

![](/_img/optimizing-proxies/8.png)

## 優化方法

我們通常使用通用的優化方案來處理性能問題。針對此特定工作的主要方法包括以下步驟:

- 為特定的子功能實現性能測試
- 添加更多規範一致性測試 (或從頭開始編寫它們)
- 調查原始的 C++ 實現
- 將子功能移植到與平台無關的 CodeStubAssembler 上
- 通過手動編寫 [TurboFan](/docs/turbofan) 實現進一步優化代碼
- 測量性能改進。

該方法適用於您可能面臨的任何一般優化任務。
