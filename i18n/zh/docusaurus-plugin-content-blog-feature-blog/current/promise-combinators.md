---
title: "Promise 组合器"
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
description: "JavaScript 中有四种 Promise 组合器：Promise.all、Promise.race、Promise.allSettled 和 Promise.any."
tweet: "1138819493956710400"
---
自从 ES2015 引入 Promise 后，JavaScript 支持的 Promise 组合器只有两个：静态方法 `Promise.all` 和 `Promise.race`。

目前有两个新提案正在进行标准化过程：`Promise.allSettled` 和 `Promise.any`。随着这些新增内容，JavaScript 中将总共有四种 Promise 组合器，每种都支持不同的使用场景。

<!--truncate-->
以下是这四种组合器的概述：


| 名称                                       | 描述                                           | 状态                                                           |
| ------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------- |
| [`Promise.allSettled`](#promise.allsettled) | 不会短路                                       | [已添加于 ES2020 ✅](https://github.com/tc39/proposal-promise-allSettled) |
| [`Promise.all`](#promise.all)               | 当输入值被拒绝时短路                          | 已添加于 ES2015 ✅                                              |
| [`Promise.race`](#promise.race)             | 当输入值解决时短路                             | 已添加于 ES2015 ✅                                              |
| [`Promise.any`](#promise.any)               | 当输入值被履行时短路                           | [已添加于 ES2021 ✅](https://github.com/tc39/proposal-promise-any)        |


让我们来看看每种组合器的一个示例使用场景。

## `Promise.all`

<feature-support chrome="32"
                 firefox="29"
                 safari="8"
                 nodejs="0.12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.all` 可让你知道所有输入的 Promise 都已被履行，或者其中一个被拒绝时的情况。

假设用户点击了按钮，你想加载一些样式表以便呈现一个全新的 UI。这个程序并行启动了每个样式表的 HTTP 请求：

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

你只希望在所有请求都成功后开始渲染新的 UI。如果出现问题，你还希望尽快显示错误信息，而无需等待其他工作完成。

在这种情况下，你可以使用 `Promise.all`：你希望知道所有 Promise 是否被履行，_或者_其中一个是否被拒绝。

## `Promise.race`

<feature-support chrome="32"
                 firefox="29"
                 safari="8"
                 nodejs="0.12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.race` 很有用，当你希望运行多个 Promise，并且…

1. 对于第一个成功的结果采取某些行动（当其中一个 Promise 被履行时），_或者_
2. 当其中一个 Promise 被拒绝时就采取行动。

也就是说，如果其中一个 Promise 被拒绝，你希望保留该拒绝以单独处理错误情况。以下示例正是这种情况：

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

我们启动了一个可能耗时较长的计算任务，但将它与一个 2 秒后被拒绝的 Promise 竞争。根据第一个 Promise 的履行或拒绝，我们可以在两条单独的代码路径中分别渲染计算结果或错误信息。

## `Promise.allSettled`

<feature-support chrome="76"
                 firefox="71 https://bugzilla.mozilla.org/show_bug.cgi?id=1549176"
                 safari="13"
                 nodejs="12.9.0 https://nodejs.org/en/blog/release/v12.9.0/"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.allSettled` 可在所有输入的 Promise 均已解决（即被履行或被拒绝）时发出信号。在不关心 Promise 状态的情况下，这非常有用，你只希望知道工作已经完成，而不管是否成功。

例如，你可以启动一系列独立的 API 调用，并使用 `Promise.allSettled` 来确保它们全部完成后再执行其他操作，比如移除加载指示器：

```js
const promises = [
  fetch('/api-call-1'),
  fetch('/api-call-2'),
  fetch('/api-call-3'),
];
// 假设其中一些请求失败，另一些成功。

await Promise.allSettled(promises);
// 所有 API 调用都已完成（无论失败还是成功）。
removeLoadingIndicator();
```

## `Promise.any`

<feature-support chrome="85 https://bugs.chromium.org/p/v8/issues/detail?id=9808"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1568903"
                 safari="14 https://bugs.webkit.org/show_bug.cgi?id=202566"
                 nodejs="16"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.any` 可以在其中一个 promise 完成时立即给予信号。这类似于 `Promise.race`，但 `any` 不会在某个 promise 拒绝时提前失败。

```js
const promises = [
  fetch('/endpoint-a').then(() => 'a'),
  fetch('/endpoint-b').then(() => 'b'),
  fetch('/endpoint-c').then(() => 'c'),
];
try {
  const first = await Promise.any(promises);
  // 任意一个 promise 被 fulfilled。
  console.log(first);
  // → 例如 'b'
} catch (error) {
  // 所有的 promise 都被拒绝。
  console.assert(error instanceof AggregateError);
  // 记录拒绝的值：
  console.log(error.errors);
  // → [
  //     <TypeError: Failed to fetch /endpoint-a>,
  //     <TypeError: Failed to fetch /endpoint-b>,
  //     <TypeError: Failed to fetch /endpoint-c>
  //   ]
}
```

此代码示例检查哪个端点响应最快，并打印日志。只有当 _所有_ 请求都失败时，我们才会进入 `catch` 块，在那里可以处理错误。

`Promise.any` 的拒绝可能同时代表多个错误。为了在语言层面支持这一点，引入了一种称为 `AggregateError` 的新错误类型。除了在上述示例中的基本使用，`AggregateError` 对象还可以像其他错误类型那样以编程方式构造：

```js
const aggregateError = new AggregateError([errorA, errorB, errorC], '发生了一些错误！');
```
