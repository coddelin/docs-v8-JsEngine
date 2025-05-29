---
title: "V8 發佈 v7.4"
author: "Georg Neis"
date: 2019-03-22 16:30:42
tags:
  - 發佈
description: "V8 v7.4 特性包括 WebAssembly 執行緒/原子操作、私有類欄位、性能和記憶體改進等等！"
tweet: "1109094755936489472"
---
每六週，我們會按照[發佈流程](/docs/release-process)建立一個新的 V8 分支。每個版本都從 V8 的 Git 主分支在 Chrome Beta 里程碑之前立即分支出來。今天，我們很高興宣布我們最新的分支 [V8 版本 7.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.4)，它目前處於測試階段，並將在數週內與 Chrome 74 穩定版一同發佈。V8 v7.4 充滿了各種面向開發者的精彩功能。這篇文章為即將到來的釋出提供了一些亮點預覽。

<!--truncate-->
## 無 JIT 的 V8

V8 現在支持在不分配執行記憶體的情況下執行 *JavaScript*。關於此功能的詳細資訊可以參考[專門的部落格文章](/blog/jitless)。

## WebAssembly 執行緒/原子操作已上線

WebAssembly 執行緒/原子操作現在可以在非 Android 作業系統上啟用。這完成了我們在 [V8 v7.0 中啟用的試用版/預覽版](/blog/v8-release-70#a-preview-of-webassembly-threads)。一篇 Web Fundamentals 文章解釋了[如何使用 WebAssembly Atomics 結合 Emscripten](https://developers.google.com/web/updates/2018/10/wasm-threads)。

這解鎖了通過 WebAssembly 利用使用者機器上的多核，從而在網頁上啟用新的高計算需求的應用場景。

## 性能

### 處理參數不匹配的更快調用

在 JavaScript 中，用過少或過多的參數來調用函數是完全有效的（即傳遞少於或多於聲明形式參數）。前者稱為 _under-application_，後者稱為 _over-application_。在 under-application 的情況下，剩餘的形式參數會被賦值為 `undefined`，而在 over-application 的情況下，多餘的參數將被忽略。

然而，JavaScript 函數仍然可以通過 [`arguments` 物件](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments)，使用[剩餘參數](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters)，或者甚至通過非常規的 [`Function.prototype.arguments` 屬性](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/arguments)（在鬆散模式下）訪問實際參數。因此，JavaScript 引擎必須提供訪問實際參數的方式。在 V8 中，這是通過一種稱為 _arguments adaption_ 的技術實現的，該技術在 under- 或 over-application 的情況下提供實際參數。不幸的是，arguments adaption 是有性能成本的，並且在現代前端和中間件框架（如許多具有可選參數或可變參數列表的 API）中經常被需要。

然而，在某些場景下，引擎知道 arguments adaption 是不必要的，因為實際參數無法被觀察到，也就是當被調用者是一個嚴格模式的函數，並且既不使用 `arguments` 也不使用剩餘參數。在這些情況下，V8 現在完全跳過了 arguments adaption，將調用開銷降低了**高達 60%**。

![跳過 arguments adaption 的性能影響，如通過[微基準測試](https://gist.github.com/bmeurer/4916fc2b983acc9ee1d33f5ee1ada1d3#file-bench-call-overhead-js)測量。](/_img/v8-release-74/argument-mismatch-performance.svg)

圖表顯示，即使在參數不匹配的情況下，仍然沒有額外的開銷（假設被調用者無法觀察到實際參數）。詳細資訊請參閱[設計文檔](https://bit.ly/v8-faster-calls-with-arguments-mismatch)。

### 改進的本地存取器性能

Angular 團隊[發現](https://mhevery.github.io/perf-tests/DOM-megamorphic.html)，直接通過其各自的 `get` 函數調用本地存取器（即 DOM 屬性存取器）在 Chrome 中顯著比[單態](https://en.wikipedia.org/wiki/Inline_caching#Monomorphic_inline_caching)甚至[多態](https://en.wikipedia.org/wiki/Inline_caching#Megamorphic_inline_caching)屬性存取慢。這是因為通過 [`Function#call()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call) 調用 DOM 存取器時採用了 V8 中慢速路徑，而不是已經存在的用於屬性存取的快速路徑。

![](/_img/v8-release-74/native-accessor-performance.svg)

我們成功改善了調用原生存取器的性能，使其顯著快於多形態屬性訪問。更多背景資訊可查看 [V8 issue #8820](https://bugs.chromium.org/p/v8/issues/detail?id=8820)。

### Parser 的性能

在 Chrome 中，足夠大的腳本會在工作執行緒上“串流式”解析，解析期間會進行下載。在此版本中，我們識別並修復了一個自定義 UTF-8 解碼引入的性能問題（該解碼用於資源串流），使平均串流解析速度提高了 8%。

我們在 V8 的預解析器中發現了另一個問題，該問題通常在工作執行緒上執行：屬性名稱被不必要地去重。移除此去重操作使串流解析器的性能又提高了 10.5%。這也改善了非串流腳本（如小型腳本和內嵌腳本）的主執行緒解析時間。

![以上圖表中的每一次下降代表串流解析器性能的其中一次改進。](/_img/v8-release-74/parser-performance.jpg)

## 記憶體

### 字節碼清除

從 JavaScript 源代碼編譯的字節碼佔用了 V8 堆空間的很大一部分，通常約 15%，包括相關的元數據。有許多僅在初始化期間執行的函數，或者編譯後很少使用的函數。

為了減少 V8 的記憶體負擔，我們實現了在垃圾回收期間清除最近未執行過的函數字節碼的支持。為了實現這一點，我們跟蹤函數字節碼的“年齡”，在垃圾回收期間遞增年齡，當函數被執行時將其重置為零。任何超過“年齡閾值”的字節碼都可以由下一次垃圾回收清除，並且函數在未來再次執行時會懶惰地重新編譯其字節碼。

我們的字節碼清除實驗顯示，它為 Chrome 的使用者提供了顯著的記憶體節省，減少了 V8 堆中的記憶體佔用 5 至 15%，同時不會降低性能或明顯增加編譯 JavaScript 代碼所花費的 CPU 時間。

![](/_img/v8-release-74/bytecode-flushing.svg)

### 字節碼中死基本塊的消除

Ignition 字節碼編譯器儘量避免生成已知為死代碼的代碼，例如 `return` 或 `break` 語句之後的代碼：

```js
return;
deadCall(); // 被跳過
```

然而，之前這僅限於語句列表中的終止語句，並未考慮其他優化，比如已知為真條件的短路：

```js
if (2.2) return;
deadCall(); // 未被跳過
```

我們在 V8 v7.3 嘗試解決這個問題，但仍然是以語句為單位，當控制流變得更複雜時就不起作用，例如：

```js
do {
  if (2.2) return;
  break;
} while (true);
deadCall(); // 未被跳過
```

上述代碼中的 `deadCall()` 會位於新基本塊的開始，對於循環中的 `break` 語句來說以語句為單位的處理使其仍然可到達。

在 V8 v7.4 中，我們允許整個基本塊變為死代碼，如果沒有 `Jump` 字節碼（Ignition 的主要控制流原語）引用它們。在上述例子中，由於 `break` 不會被生成，因此此循環中不會有 `break` 語句。因此，以 `deadCall()` 開頭的基本塊沒有引用跳轉語句，因此仍然被視為死代碼。雖然我們預計這對使用者代碼的影響不大，但這在簡化各種語法糖處理（如生成器、`for-of` 和 `try-catch` ）方面非常有用，並特別消除了基本塊中途“復活”復雜語句的一類錯誤。

## JavaScript 語言功能

### 私有類字段

V8 v7.2 增加了對公共類字段語法的支持。類字段通過避免僅用於定義實例屬性的構造函數，使類語法更加簡潔。從 V8 v7.4 開始，您可以通過在字段前加上 `#` 前綴來將其標記為私有字段。

```js
class IncreasingCounter {
  #count = 0;
  get value() {
    console.log('獲取當前值！');
    return this.#count;
  }
  increment() {
    this.#count++;
  }
}
```

與公共字段不同，私有字段不可在類體外部訪問：

```js
const counter = new IncreasingCounter();
counter.#count;
// → SyntaxError
counter.#count = 42;
// → SyntaxError
```

更多信息，可閱讀我們關於公共類字段和私有類字段的 [解釋文檔](/features/class-fields)。

### `Intl.Locale`

JavaScript 應用通常使用類似 `'en-US'` 或 `'de-CH'` 的字串來識別本地化設定。`Intl.Locale` 提供了一種更強大的機制來處理本地化設置，並能輕鬆提取語言、日曆、數字系統、時間周期等特定於本地化的偏好設置。

```js
const locale = new Intl.Locale('es-419-u-hc-h12', {
  calendar: 'gregory'
});
locale.language;
// → 'es'
locale.calendar;
// → 'gregory'
locale.hourCycle;
// → 'h12'
locale.region;
// → '419'
locale.toString();
// → 'es-419-u-ca-gregory-hc-h12'
```

### Hashbang 語法

JavaScript 程式現在可以以 `#!` 開頭，被稱作 [hashbang](https://github.com/tc39/proposal-hashbang)。緊接在 hashbang 後的行內容會被視為單行註解。這與命令列 JavaScript 執行環境（例如 Node.js）中的事實標準相匹配。以下是一個現在語法上有效的 JavaScript 程式：

```js
#!/usr/bin/env node
console.log(42);
```

## V8 API

請使用 `git log branch-heads/7.3..branch-heads/7.4 include/v8.h` 來獲取 API 更改的列表。

擁有 [有效 V8 檢出版本](/docs/source-code#using-git) 的開發者可以使用 `git checkout -b 7.4 -t branch-heads/7.4` 來嘗試 V8 v7.4 中的新功能。或者，你也可以 [訂閱 Chrome beta 頻道](https://www.google.com/chrome/browser/beta.html)，並很快親自嘗試這些新功能。
