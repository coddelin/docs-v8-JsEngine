---
title: 'V8 版本 v7.1'
author: 'Stephan Herhut ([@herhut](https://twitter.com/herhut)), 複製者中的複製者'
avatars:
  - stephan-herhut
date: 2018-10-31 15:44:37
tags:
  - 發佈
description: 'V8 v7.1 提供嵌入式位元碼處理器、改進的 TurboFan 逃逸分析、postMessage(wasmModule)、Intl.RelativeTimeFormat 和 globalThis！'
tweet: '1057645773465235458'
---
每六週，我們會按照 [釋出流程](/docs/release-process) 創建一個新的 V8 分支。每個版本均從 V8 的 Git 主分支在 Chrome Beta 里程碑前直接分支出來。今天我們很高興地宣布我們最新的分支 [V8 版本 7.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.1)，目前處於 Beta 階段，幾週後將與 Chrome 71 穩定版協同釋出。V8 v7.1 為開發者帶來了各種令人期待的功能。本篇文章提前預覽了一些重要亮點，敬請期待正式釋出。

<!--truncate-->
## 記憶體

緊接著 v6.9/v7.0 的工作進展 [將內建方法直接嵌入二進制檔案中](/blog/embedded-builtins)，現在也將解釋器的位元碼處理器 [嵌入二進制檔案中了](https://bugs.chromium.org/p/v8/issues/detail?id=8068)。這平均可為每個 Isolate 節省大約 200 KB。

## 效能

TurboFan 中的逃逸分析進行了改進，對於局限於優化單元的物件進行標量替換，現在也可以在變數從環境上下文逃逸到本地閉包時 [處理高階函數的本地函數環境](https://bit.ly/v8-turbofan-context-sensitive-js-operators)。以下是一個例子：

```js
function mapAdd(a, x) {
  return a.map(y => y + x);
}
```

請注意 `x` 是本地閉包 `y => y + x` 的自由變數。V8 v7.1 現在可以完全省略 `x` 的上下文分配，在某些情況下改進高達 **40%**。

![利用新的逃逸分析的性能改進（越低越好）](/_img/v8-release-71/improved-escape-analysis.svg)

現在逃逸分析也可以消除某些對本地陣列變數索引存取的情況。以下是一個示例：

```js
function sum(...args) {
  let total = 0;
  for (let i = 0; i < args.length; ++i)
    total += args[i];
  return total;
}

function sum2(x, y) {
  return sum(x, y);
}
```

請注意 `args` 局限於 `sum2`（假設 `sum` 被內聯到 `sum2` 中）。在 V8 v7.1 中，TurboFan 現在可以完全消除 `args` 的分配，並將變數索引存取 `args[i]` 替換為形式為 `i === 0 ? x : y` 的三元運算式。在 JetStream/EarleyBoyer 基準測試中性能提升 ~2%。未來我們或許會將此優化擴展至具有多於兩個元素的陣列。

## Wasm 模組的結構化複製

最後，[`postMessage` 支援 Wasm 模組了](https://github.com/WebAssembly/design/pull/1074)。`WebAssembly.Module` 物件現在可以使用 `postMessage` 傳遞給網頁工作者。需要澄清的是，這僅限於網頁工作者（同一進程，不同執行緒），不適用於跨進程情境（例如跨來源的 `postMessage` 或共用的網頁工作者）。

## JavaScript 語言功能

[`Intl.RelativeTimeFormat` API](/features/intl-relativetimeformat) 支援相對時間的本地化格式化（例如“昨天”、“42 秒前”或“3 個月後”），而不犧牲性能。以下是一個範例：

```js
// 創建一個英文的相對時間格式化器，
// 輸出中不一定總是使用數字值。
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → '昨天'

rtf.format(0, 'day');
// → '今天'

rtf.format(1, 'day');
// → '明天'

rtf.format(-1, 'week');
// → '上週'

rtf.format(0, 'week');
// → '本週'

rtf.format(1, 'week');
// → '下週'
```

閱讀 [我們的 `Intl.RelativeTimeFormat` 說明文檔](/features/intl-relativetimeformat) 獲取更多資訊。

V8 v7.1 還新增了對 [`globalThis` 提案](/features/globalthis) 的支援，使得無論是在嚴格函數還是模組中，都可以通過統一的機制存取全域物件，且無需考量平台的不同。

## V8 API

請使用 `git log branch-heads/7.0..branch-heads/7.1 include/v8.h` 獲取 API 更改的列表。

擁有 [有效的 V8 檢出版本](/docs/source-code#using-git) 的開發者可以執行 `git checkout -b 7.1 -t branch-heads/7.1` 試驗 V8 v7.1 中的新功能。或者你可以 [訂閱 Chrome 的 Beta 頻道](https://www.google.com/chrome/browser/beta.html)，並很快親自試用這些新功能。
