---
title: &apos;V8 發佈版本 v6.6&apos;
author: &apos;V8 團隊&apos;
date: 2018-03-27 13:33:37
tags:
  - 發佈
description: &apos;V8 v6.6 包括可選的 catch 綁定、擴展的字串修剪、多項解析/編譯/運行時性能改進，以及更多內容！&apos;
tweet: &apos;978534399938584576&apos;
---
每六週，我們會按照[發佈流程](/docs/release-process)創建 V8 新分支。每個版本是在 Chrome Beta 里程碑之前直接從 V8 的 Git 主分支分支出來的。今天，我們很高興地宣佈我們的最新分支，[V8 版本 6.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.6)，該版本目前是 Beta 版，幾週後將與 Chrome 66 穩定版一同發佈。V8 v6.6 包含了各種針對開發者的豐富功能。這篇文章提供了一些亮點的預覽，敬請期待發佈。

<!--truncate-->
## JavaScript 語言功能

### `Function.prototype.toString` 修訂  #function-tostring

[`Function.prototype.toString()`](/features/function-tostring) 現在返回準確的源代碼文本切片，包括空格和註釋。以下是舊行為和新行為的比較範例：

```js
// 注意註釋在 `function` 關鍵字和函數名之間
// 以及函數名後面的空格。
function /* 一個註釋 */ foo () {}

// 以前:
foo.toString();
// → &apos;function foo() {}&apos;
//             ^ 沒有註釋
//                ^ 沒有空格

// 現在:
foo.toString();
// → &apos;function /* 註釋 */ foo () {}&apos;
```

### JSON ⊂ ECMAScript

現在允許在字串字面量中使用行分隔符 (U+2028) 和段落分隔符 (U+2029) 符號，[與 JSON 匹配](/features/subsume-json)。以前，這些符號在字串字面量中被視為行尾符，因此使用它們會導致 `SyntaxError` 異常。

### 可選的 `catch` 綁定

`try` 語句的 `catch` 子句現在可以[在沒有參數的情況下使用](/features/optional-catch-binding)。如果您在處理異常的代碼中不需要 `exception` 物件，這會非常有用。

```js
try {
  doSomethingThatMightThrow();
} catch { // → 看，媽，我不用參數啦！
  handleException();
}
```

### 單邊的字串修剪

除了 `String.prototype.trim()`，V8 現在實現了 [`String.prototype.trimStart()` 和 `String.prototype.trimEnd()`](/features/string-trimming)。此前，這些功能可以通過非標準的 `trimLeft()` 和 `trimRight()` 方法實現，這些方法仍作為新方法的別名以保持向後相容。

```js
const string = &apos;  hello world  &apos;;
string.trimStart();
// → &apos;hello world  &apos;
string.trimEnd();
// → &apos;  hello world&apos;
string.trim();
// → &apos;hello world&apos;
```

### `Array.prototype.values`

[`Array.prototype.values()` 方法](https://tc39.es/ecma262/#sec-array.prototype.values) 為陣列提供了與 ES2015 `Map` 和 `Set` 集合相同的迭代界面：現在所有這些都可以通過調用相同名稱的 `keys`、`values` 或 `entries` 方法進行迭代。此更改可能會與現有的 JavaScript 代碼不相容。如果您發現網站上的行為異常或損壞，請嘗試通過 `chrome://flags/#enable-array-prototype-values` 禁用此功能，並[提交問題](https://bugs.chromium.org/p/v8/issues/entry?template=Defect+report+from+user)。

## 執行後的代碼快取

對於關心加載性能的人來說，_冷加載_ 和 _暖加載_ 這些術語可能已經很熟悉。對於 V8 來說，還有 _熱加載_ 的概念。以下使用嵌入 V8 的 Chrome 為例來解釋不同級別：

- **冷加載:** Chrome 首次看到訪問的網頁，完全沒有任何數據快取。
- **暖加載:** Chrome 記得該網頁已經被訪問過，並且可以從快取中檢索某些資產（例如圖像和腳本源文件）。V8 會識別該頁面是否已經發佈過相同的腳本文件，並因此將編譯的代碼與腳本文件一起緩存在磁碟快取中。
- **熱加載:** 當 Chrome 第三次訪問該網頁時，從磁碟快取中提供腳本文件的同時，還向 V8 提供先前加載過程中快取的代碼。V8 可以使用這些快取的代碼來避免從頭解析和編譯腳本。

在 V8 v6.6 之前，我們在頂層編譯完成後立即快取生成的程式碼。V8 僅編譯在頂層編譯期間已知會立即執行的函數，並將其他函數標記為延遲編譯。這意味著快取的程式碼僅包含頂層程式碼，而所有其他函數都必須在每次頁面加載時從頭開始延遲編譯。從 6.6 版本開始，V8 快取在腳本頂層執行後生成的程式碼。當我們執行腳本時，更多函數被延遲編譯並可包含在快取中。結果是這些函數在未來的頁面加載中無需重新編譯，從而在熱門加載場景中減少 20–60% 的編譯和解析時間。明顯的使用者改變是主線程的擁塞減少，因此加載體驗更流暢且更快。

請密切注意即將發佈的詳細部落格文章。

## 後台編譯

V8 已經能夠在一段時間內[在後台線程解析 JavaScript 程式碼](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html)。憑藉 V8 去年推出的新[Ignition 字節碼解釋器](/blog/launching-ignition-and-turbofan)，我們能夠擴展此支持，讓 JavaScript 原始碼到字節碼的編譯也能在後台線程中進行。這使嵌入者能在主線程之外完成更多工作，釋放主線程來執行更多 JavaScript 並減少卡頓。我們在 Chrome 66 中啟用了此功能，看到典型網站主線程編譯時間減少 5% 到 20%。詳情請參閱[最近關於該功能的部落格文章](/blog/background-compilation)。

## 移除 AST 編號

在去年[Ignition 和 TurboFan 上線後](/blog/launching-ignition-and-turbofan)，我們繼續從簡化編譯管線中獲益。我們之前的管線需要一個後解析階段，稱為 "AST 編號"，其中為生成的抽象語法樹中的節點編號，以便使用它的各種編譯器有一個共同的參考點。

隨著時間推移，這一後處理遍歷已經膨脹到包括其他功能：編號生成器和異步函數的掛起點，收集內部函數以便於積極編譯，初始化字面量或檢測無法優化的代碼模式。

使用新的管線，Ignition 字節碼成為了共同的參考點，而編號本身不再需要——但剩餘的功能仍然需要，AST 編號遍歷因此仍然存在。

在 V8 v6.6 中，我們最終成功地[移除或棄用剩餘的功能](https://bugs.chromium.org/p/v8/issues/detail?id=7178)，改由其他遍歷完成，允許我們移除這種樹狀遍歷。這導致實際編譯時間改善 3-5%。

## 异步性能改進

我們成功擠出了一些針對 Promise 和異步函數的不錯性能改進，尤其成功縮小了異步函數與未封裝 Promise 鏈之間的差距。

![Promise 性能改進](/_img/v8-release-66/promise.svg)

此外，異步生成器和異步迭代的性能也顯著提高，使其成為即將推出的 Node 10 LTS 的可行選擇，該版本計劃包含 V8 v6.6。例如，以下是 Fibonacci 序列的實現：

```js
async function* fibonacciSequence() {
  for (let a = 0, b = 1;;) {
    yield a;
    const c = a + b;
    a = b;
    b = c;
  }
}

async function fibonacci(id, n) {
  for await (const value of fibonacciSequence()) {
    if (n-- === 0) return value;
  }
}
```

我們測量了該模式在 Babel 轉譯前後的以下改進：

![異步生成器性能改進](/_img/v8-release-66/async-generator.svg)

最後，[字節碼改進](https://chromium-review.googlesource.com/c/v8/v8/+/866734)到「可掛起函數」(例如生成器、異步函數和模塊）提高了這些函數在解釋器中運行時的性能，並減少了它們的編譯大小。我們計劃在即將發佈的版本中進一步提高異步函數和異步生成器的性能，敬請期待。

## 陣列性能改進

`Array#reduce` 的吞吐性能在空洞雙精度陣列上提高了超過 10 倍（[請參閱我們的部落格文章，了解空洞及打包陣列的解釋](/blog/elements-kinds)）。這擴大了在空洞和打包雙精度陣列的情況下應用 `Array#reduce` 的快路徑。

![`Array.prototype.reduce` 性能改進](/_img/v8-release-66/array-reduce.svg)

## 不可信代碼防護

在 V8 v6.6 中，我們提交了更多[針對側信道漏洞的防護措施](/docs/untrusted-code-mitigations)，旨在防止信息洩漏給不可信的 JavaScript 和 WebAssembly 代碼。

## 移除 GYP

這是第一個正式不再包含 GYP 文檔的 V8 版本。如果您的產品需要被刪除的 GYP 文檔，您需要將它們複製到自己的原始碼庫中。

## 記憶體分析

Chrome 的開發者工具現在可以追蹤和快照 C++ DOM 對象，並顯示所有從 JavaScript 可達的 DOM 對象及其引用。這項功能是 V8 垃圾收集器的新 C++ 追蹤機制的其中一個優勢。更多信息請參閱[專門的部落格文章](/blog/tracing-js-dom)。

## V8 API

請使用 `git log branch-heads/6.5..branch-heads/6.6 include/v8.h` 來獲取 API 變更的列表。
