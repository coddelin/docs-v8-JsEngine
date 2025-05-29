---
title: 'V8 發佈 v4.6'
author: 'V8 團隊'
date: 2015-08-28 13:33:37
tags:
  - 發佈
description: 'V8 v4.6 提供減少停頓並支援新的 ES2015 語言特性。'
---
大約每六週，我們會基於我們的[發佈過程](https://v8.dev/docs/release-process)創建一個新的 V8 分支。每個版本都是從 V8 的 Git 主分支分出，緊接著 Chrome 分出一個 Chrome Beta 的里程碑分支。今天，我們很高興地宣佈我們最新的分支[V8 版本 4.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.6)，該版本將進入 Beta 階段，直到與 Chrome 46 Stable 一同發佈為止。V8 4.6 包含各種為開發者準備的好東西，因此我們希望在幾週後正式發佈前給大家預覽一些亮點。

<!--truncate-->
## 改進的 ECMAScript 2015 (ES6) 支援

V8 v4.6 增加了對多個[ECMAScript 2015 (ES6)](https://www.ecma-international.org/ecma-262/6.0/)特性的支援。

### 展開運算符

[展開運算符](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator)使得操作陣列更加方便。例如，當想簡單地合併陣列時，可以不用寫命令式的代碼。

```js
// 合併陣列
// 沒有展開運算符的代碼
const inner = [3, 4];
const merged = [0, 1, 2].concat(inner, [5]);

// 有展開運算符的代碼
const inner = [3, 4];
const merged = [0, 1, 2, ...inner, 5];
```

展開運算符的另一個好用之處是取代 `apply`:

```js
// 用陣列存儲函數參數
// 沒有展開運算符的代碼
function myFunction(a, b, c) {
  console.log(a);
  console.log(b);
  console.log(c);
}
const argsInArray = ['Hi ', 'Spread ', 'operator!'];
myFunction.apply(null, argsInArray);

// 有展開運算符的代碼
function myFunction (a,b,c) {
  console.log(a);
  console.log(b);
  console.log(c);
}

const argsInArray = ['Hi ', 'Spread ', 'operator!'];
myFunction(...argsInArray);
```

### `new.target`

[`new.target`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new.target) 是 ES6 的一個設計用於改進類工作的特性。它實際上是每個函數的隱式參數。如果函數使用關鍵字 new 調用，該參數會持有對被調用函數的引用。如果不使用 new，參數則為 undefined。

實際上，這意味著你可以使用 new.target 判斷函數是正常調用還是用 new 關鍵字建構式調用。

```js
function myFunction() {
  if (new.target === undefined) {
    throw '請嘗試使用 new 進行調用。';
  }
  console.log('工作正常!');
}

// 失敗:
myFunction();

// 成功:
const a = new myFunction();
```

當使用 ES6 類和繼承時，new.target 在超類的構造函數中綁定到用 new 調用的派生構造函數。尤其是，這使得超類在構造時能夠訪問派生類的原型。

## 減少停頓

[停頓](https://en.wiktionary.org/wiki/jank#Noun) 可能很惱人，尤其是在玩遊戲的時候。通常，當遊戲具有多玩家特性時，情況甚至更糟。[oortonline.gl](http://oortonline.gl/) 是一個 WebGL 基準測試，它通過渲染複雜的 3D 場景、粒子效果以及現代著色器渲染來測試當前瀏覽器的極限。V8 團隊展開了一場提升 Chrome 在這些環境下性能的探索。我們還未完成，但努力的成果已經開始顯現。Chrome 46 在 oortonline.gl 性能上的巨大進步可以在下方自行查看。

一些優化包括:

- [TypedArray 性能改進](https://code.google.com/p/v8/issues/detail?id=3996)
    - TypedArray 被大量用於渲染引擎，例如 Turbulenz（oortonline.gl 背後的引擎）。例如，引擎通常在 JavaScript 中創建類型化陣列（如 Float32Array），並在應用變換後將它們傳遞給 WebGL。
    - 關鍵點是優化嵌入器（Blink）和 V8 之間的互動。
- [從 V8 傳遞 TypedArray 和其他記憶體到 Blink 時的性能改進](https://code.google.com/p/chromium/issues/detail?id=515795)
    - 在作為單向通信的一部分傳遞給 WebGL 時，不需要為類型化的陣列創建額外的句柄（它們同樣由 V8 跟蹤）。
    - 當達到外部（Blink）分配的記憶體限制時，我們現在啟動增量垃圾回收，而非全面的垃圾回收。
- [空閒垃圾回收調度](/blog/free-garbage-collection)
    - 垃圾回收操作被安排在主線程的空閒時間進行，從而解鎖合成器並實現更流暢的渲染。
- [啟用垃圾回收堆的整個舊世代並行清理](https://code.google.com/p/chromium/issues/detail?id=507211)
    - 未使用內存塊的釋放是在額外的線程上並行於主線程進行的，這顯著減少了主要垃圾回收的暫停時間。

好消息是，所有與 oortonline.gl 相關的更改都是通用改進，潛在地影響到所有密集使用 WebGL 的應用程式使用者。

## V8 API

請查看我們的 [API 變更摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。此文件通常在每次主要版本發佈後幾週內定期更新。

擁有 [活躍 V8 源碼檢出](https://v8.dev/docs/source-code#using-git) 的開發人員可以使用 `git checkout -b 4.6 -t branch-heads/4.6` 來試驗 V8 v4.6 的新功能。或者，你可以 [訂閱 Chrome 的 Beta 渠道](https://www.google.com/chrome/browser/beta.html)，並很快親自嘗試新功能。
