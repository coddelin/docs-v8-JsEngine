---
title: "Promise 組合子"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2019-06-12
tags:
  - ECMAScript
  - ES2020
  - ES2021
  - io19
  - Node.js 16
description: "在 JavaScript 中有四種 Promise 組合子：Promise.all、Promise.race、Promise.allSettled 和 Promise.any。"
tweet: "1138819493956710400"
---
自從在 ES2015 引入 Promise 以來，JavaScript 就支持了兩種 Promise 組合子：靜態方法 `Promise.all` 和 `Promise.race`。

目前有兩個新的提案正在標準化過程中：`Promise.allSettled` 和 `Promise.any`。隨著這些新增內容，JavaScript 共有四種 Promise 組合子，每一種都支持不同的使用場景。

<!--truncate-->
以下是四種組合子的概述：


| 名稱                                       | 描述                                          | 狀態                                                          |
| ------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------ |
| [`Promise.allSettled`](#promise.allsettled) | 不會短路評估                                  | [加入於 ES2020 ✅](https://github.com/tc39/proposal-promise-allSettled)  |
| [`Promise.all`](#promise.all)              | 當輸入值被拒絕時短路評估                      | 加入於 ES2015 ✅                                              |
| [`Promise.race`](#promise.race)            | 當輸入值完成時短路評估                        | 加入於 ES2015 ✅                                              |
| [`Promise.any`](#promise.any)              | 當輸入值被履行時短路評估                      | [加入於 ES2021 ✅](https://github.com/tc39/proposal-promise-any)        |


讓我們來看看每個組合子的範例使用場景。

## `Promise.all`

<feature-support chrome="32"
                 firefox="29"
                 safari="8"
                 nodejs="0.12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.all` 告訴你何時所有輸入的 Promise 都被履行，或者其中之一遭到拒絕。

假設用戶點擊了一個按鈕，你需要加載一些樣式表，以渲染一個全新的 UI。以下程式碼為每個樣式表同時發起一個 HTTP 請求：

```js
const promises = [
  fetch('/component-a.css'),
  fetch('/component-b.css'),
  fetch('/component-c.css'),
];
try {
  const styleResponses = await Promise.all(promises);
  enableStyles(styleResponses);
  renderNewUi();
} catch (reason) {
  displayError(reason);
}
```

你只希望在所有請求成功後才開始渲染新的 UI。如果出現問題，你希望立即顯示錯誤訊息，而不用等待其他操作完成。

在這種情況下，你可以使用 `Promise.all`：你希望知道所有 Promise 是否被履行，_或者_ 當其中之一被拒絕時立即得知。

## `Promise.race`

<feature-support chrome="32"
                 firefox="29"
                 safari="8"
                 nodejs="0.12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.race` 非常有用，當你想執行多個 Promise，但要麼…

1. 處理第一個成功的結果（在其中一個 Promise 被履行的情況下），_或者_
1. 當其中一個 Promise 被拒絕時立即採取行動。

也就是說，如果其中一個 Promise 被拒絕，你希望保留該拒絕並單獨處理錯誤情況。以下是一個示例：

```js
try {
  const result = await Promise.race([
    performHeavyComputation(),
    rejectAfterTimeout(2000),
  ]);
  renderResult(result);
} catch (error) {
  renderError(error);
}
```

我們啟動了一個計算繁重的任務，可能需要較長時間，但我們讓它與一個 2 秒後拒絕的 Promise 競速。根據最早完成或拒絕的 Promise，我們要麼渲染計算結果，要麼以不同的程式路徑顯示錯誤訊息。

## `Promise.allSettled`

<feature-support chrome="76"
                 firefox="71 https://bugzilla.mozilla.org/show_bug.cgi?id=1549176"
                 safari="13"
                 nodejs="12.9.0 https://nodejs.org/en/blog/release/v12.9.0/"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.allSettled` 會在所有輸入的 Promise 被設定狀態時（即被履行或被拒絕）給出信號。當你不關心 Promise 的狀態，只是想知道工作是否完成，無論是否成功，這是非常有用的。

例如，您可以啟動一系列獨立的 API 呼叫，並使用 `Promise.allSettled` 來確保它們全部完成後再執行其他操作，例如移除載入指示器：

```js
const promises = [
  fetch('/api-call-1'),
  fetch('/api-call-2'),
  fetch('/api-call-3'),
];
// 假設這些請求有些失敗，有些成功。

await Promise.allSettled(promises);
// 所有的 API 呼叫已完成（無論是失敗還是成功）。
removeLoadingIndicator();
```

## `Promise.any`

<feature-support chrome="85 https://bugs.chromium.org/p/v8/issues/detail?id=9808"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1568903"
                 safari="14 https://bugs.webkit.org/show_bug.cgi?id=202566"
                 nodejs="16"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.any` 提供一個信號，當其中一個 Promise 成功時就通知您。這與 `Promise.race` 類似，但 `any` 不會因為其中一個 Promise 失敗而提前拒絕。

```js
const promises = [
  fetch('/endpoint-a').then(() => 'a'),
  fetch('/endpoint-b').then(() => 'b'),
  fetch('/endpoint-c').then(() => 'c'),
];
try {
  const first = await Promise.any(promises);
  // 任一 Promise 成功。
  console.log(first);
  // → 例如 'b'
} catch (error) {
  // 所有的 Promise 都被拒絕。
  console.assert(error instanceof AggregateError);
  // 記錄拒絕的值：
  console.log(error.errors);
  // → [
  //     <TypeError: Failed to fetch /endpoint-a>,
  //     <TypeError: Failed to fetch /endpoint-b>,
  //     <TypeError: Failed to fetch /endpoint-c>
  //   ]
}
```

這個程式碼範例檢查哪個端點回應最快，然後將其記錄下來。只有當_所有_的請求失敗時，我們才會進入 `catch` 區塊，然後處理這些錯誤。

`Promise.any` 的拒絕可以同時代表多個錯誤。為支持這一點，語言層面引入了一種類型的新錯誤，名為 `AggregateError`。除了在上述範例中的基本使用，`AggregateError` 物件還可以像其他錯誤類型一樣以程式方式構建：

```js
const aggregateError = new AggregateError([errorA, errorB, errorC], '發生了一些錯誤！');
```
