---
title: "V8 發布 v8.4"
author: "Camillo Bruni，享受一些新鮮的布林值"
avatars: 
 - "camillo-bruni"
date: 2020-06-30
tags: 
 - 發布
description: "V8 v8.4 支援弱引用以及改良 WebAssembly 性能。"
tweet: "1277983235641761795"
---
每六週，我們會按照 [發布流程](https://v8.dev/docs/release-process) 為 V8 創建一個新分支。每個版本都是在 Chrome Beta 里程碑之前直接從 V8 的 Git 主線分出。今天，我們很高興地宣布我們最新的分支，[V8 版本 8.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.4)，該分支將處於 Beta 階段，直到與 Chrome 84 穩定版協同發布的幾週後完成。V8 v8.4 滿載著各種針對開發者的好功能。這篇文章提供了一些亮點的預覽，以期盼此次發布。

<!--truncate-->
## WebAssembly

### 改良的啟動速度

WebAssembly 的基礎編譯器 ([Liftoff](https://v8.dev/blog/liftoff)) 現在支援 [原子指令](https://github.com/WebAssembly/threads) 和 [大塊內存操作](https://github.com/WebAssembly/bulk-memory-operations)。這意味著即使您使用了這些最近的規範新增功能，您仍然可以獲得極快的啟動速度。

### 更好的調試

在持續改善 WebAssembly 調試經驗的努力下，我們現在能夠檢查任何在執行中暫停或到達斷點時仍然存活的 WebAssembly 幀。
這通過重利用 [Liftoff](https://v8.dev/blog/liftoff) 來進行調試實現。在過去，所有打上斷點或者進行步進調試的代碼都需要在 WebAssembly 解釋器中執行，這大幅減慢了執行速度（通常降低約 100 倍）。使用 Liftoff，您僅僅損失約三分之一的性能，同時您可以隨時步進所有代碼並進行檢查。

### SIMD 原型試用

SIMD 提案使 WebAssembly 能夠利用常見硬件向量指令來加速計算密集型工作負載。V8 已經 [支援](https://v8.dev/features/simd) [WebAssembly SIMD 提案](https://github.com/WebAssembly/simd)。要在 Chrome 中啟用此功能，可以使用標誌 `chrome://flags/#enable-webassembly-simd` 或註冊 [原型試用](https://developers.chrome.com/origintrials/#/view_trial/-4708513410415853567)。[原型試用](https://github.com/GoogleChrome/OriginTrials/blob/gh-pages/developer-guide.md) 可以讓開發者在標準化之前試用一項功能，並提供寶貴的反饋。一旦某個原型試用被選擇進行試用，使用者将在試用期內不需要更新 Chrome 標誌即可啟用此功能。

## JavaScript

### 弱引用與終結器

:::note
**警告！** 弱引用和終結器屬於高級功能！它們依賴於垃圾回收行為。垃圾回收是非確定性的，並且可能根本不發生。
:::

JavaScript 是一種自動垃圾回收的語言，這意味著當垃圾回收器運行時，程序中不再可訪問的對象佔用的記憶體可能會被自動回收。除 `WeakMap` 和 `WeakSet` 中的引用外，JavaScript 的所有引用都是強引用，並且防止被引用的對象進行垃圾回收。例如：

```js
const globalRef = {
  callback() { console.log('foo'); }
};
// 只要 globalRef 通過全局作用域可以訪問，
// 它本身及其 callback 屬性的函數都不會被回收。
```

JavaScript 程序員現在可以通過 `WeakRef` 功能弱引用對象。由弱引用所引用的對象如果不被強引用也不會阻止垃圾回收。

```js
const globalWeakRef = new WeakRef({
  callback() { console.log('foo'); }
});

(async function() {
  globalWeakRef.deref().callback();
  // 在剛創建後的事件循環中的第一個回合中，globalWeakRef 保證是活的。

  await new Promise((resolve, reject) => {
    setTimeout(() => { resolve('foo'); }, 42);
  });
  // 等待事件循環的回合。

  globalWeakRef.deref()?.callback();
  // globalWeakRef 中的對象可能在第一個回合後被垃圾回收，因為它不再被其他方式訪問。
})();
```

與 `WeakRef` 相伴的功能是 `FinalizationRegistry`，它允許程序員註冊回調以便對象被垃圾回收後被調用。例如，下面的程序可能在 IIFE 中不可訪問的對象被回收后輸出 `42` 到控制台。

```js
const registry = new FinalizationRegistry((heldValue) => {
  console.log(heldValue);
});

(function () {
  const garbage = {};
  registry.register(garbage, 42);
  // 第二個參數是 “保留” 的值，它在第一個參數被垃圾回收后會被傳遞給終結器。
})();
```
})();
```

終結器會被排程在事件循環上執行，並且永遠不會中斷同步 JavaScript 執行。

這些是進階且強大的功能，若幸運的話，您的程式可能不需要使用它們。請參閱我們的[解釋文](https://v8.dev/features/weak-references)來瞭解更多資訊！

### 私有方法和存取器

私有欄位於 v7.4 中已經推出，現在加入了對私有方法和存取器的支援。語法上，私有方法和存取器的名稱像私有欄位一樣，都是以 `#` 開頭。以下是語法的一個簡短示例。

```js
class Component {
  #privateMethod() {
    console.log("我只能在 Component 裡被呼叫！");
  }
  get #privateAccessor() { return 42; }
  set #privateAccessor(x) { }
}
```

私有方法和存取器具有與私有欄位相同的作用域規則和語義。請參閱我們的[解釋文](https://v8.dev/features/class-fields)來瞭解更多。

感謝 [Igalia](https://twitter.com/igalia) 貢獻了實作！

## V8 API

請使用 `git log branch-heads/8.3..branch-heads/8.4 include/v8.h` 來取得 API 變更的列表。

擁有活躍的 V8 檢出版本的開發者可以使用 `git checkout -b 8.4 -t branch-heads/8.4` 來試驗 V8 v8.4 中的新功能。或者，您可以[訂閱 Chrome 的 Beta頻道](https://www.google.com/chrome/browser/beta.html)並很快自己測試這些新功能。
