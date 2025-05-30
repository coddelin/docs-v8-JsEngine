---
title: "顶层 `await`"
author: "Myles Borins ([@MylesBorins](https://twitter.com/MylesBorins))"
avatars: 
  - "myles-borins"
date: 2019-10-08
tags: 
  - ECMAScript
  - Node.js 14
description: "顶层 `await` 即将引入 JavaScript 模块！您将能够在不需要处于异步函数中的情况下使用 `await`。"
tweet: "1181581262399643650"
---
[顶层 `await`](https://github.com/tc39/proposal-top-level-await) 使开发者能够在异步函数之外使用 `await` 关键字。它像一个大的异步函数，使其他 `import` 它的模块在开始执行其主体之前会等待。

<!--truncate-->
## 旧行为

当 `async`/`await` 首次引入时，尝试在异步函数外部使用 `await` 会导致 `SyntaxError` 错误。许多开发者使用立即调用的异步函数表达式来访问该功能。

```js
await Promise.resolve(console.log('🎉'));
// → SyntaxError: await 仅在异步函数中有效

(async function() {
  await Promise.resolve(console.log('🎉'));
  // → 🎉
}());
```

## 新行为

通过顶层 `await`，上面的代码在 [模块](/features/modules) 中以您预期的方式工作：

```js
await Promise.resolve(console.log('🎉'));
// → 🎉
```

:::note
**注意:** 顶层 `await` _仅_ 在模块的顶层中工作。不支持经典脚本或非异步函数。
:::

## 使用场景

这些使用场景来自 [规范提案仓库](https://github.com/tc39/proposal-top-level-await#use-cases)。

### 动态依赖路径

```js
const strings = await import(`/i18n/${navigator.language}`);
```

这允许模块使用运行时值来确定依赖项。这对于开发/生产切换，国际化，环境切换等功能非常有用。

### 资源初始化

```js
const connection = await dbConnector();
```

这允许模块表示资源，也可以在模块无法使用的情况下产生错误。

### 依赖回退

以下示例尝试从 CDN A 加载一个 JavaScript 库，如果失败则回退到 CDN B：

```js
let jQuery;
try {
  jQuery = await import('https://cdn-a.example.com/jQuery');
} catch {
  jQuery = await import('https://cdn-b.example.com/jQuery');
}
```

## 模块执行顺序

顶层 `await` 为 JavaScript 引入的最大变化之一是模块图中模块的执行顺序。JavaScript 引擎以 [后序遍历](https://en.wikibooks.org/wiki/A-level_Computing/AQA/Paper_1/Fundamentals_of_algorithms/Tree_traversal#Post-order) 的方式执行模块：从模块图的最左子树开始，模块被评估，其绑定被导出，然后执行其兄弟模块，最后执行其父模块。此算法递归运行，直到执行到模块图的根。

在顶层 `await` 之前，这种顺序始终是同步且可预测的：对于您的代码的多次运行，您的模块图会保证以相同顺序执行。一旦顶层 `await` 引入，同样的保证仍然存在，但前提是您没有使用顶层 `await`。

以下是您在模块中使用顶层 `await` 时发生的情况：

1. 当前模块的执行被推迟，直到等待的 promise 被解析。
2. 父模块的执行被推迟，直到调用 `await` 的子模块及其所有兄弟模块导出了绑定。
3. 兄弟模块及父模块的兄弟模块可以继续以同步顺序执行 — 前提是图中没有循环或其他等待的 promise。
4. 调用 `await` 的模块在所等待的 promise 被解析后恢复其执行。
5. 父模块及后续树继续以同步顺序执行，前提是没有其他等待的 promise。

## 这在开发工具中已经可以使用了吗？

确实可以！[Chrome 开发工具](https://developers.google.com/web/updates/2017/08/devtools-release-notes#await)、[Node.js](https://github.com/nodejs/node/issues/13209) 和 Safari Web Inspector 的 REPL 已经支持顶层 `await` 有一段时间了。然而，这种功能是非标准的，仅限于 REPL！它与顶层 `await` 提案是有区别的，后者是语言规范的一部分，仅适用于模块。为了测试完全符合规范提案语义的顶层 `await` 的生产代码，请确保在实际的应用程序中测试，而不仅仅是在开发工具或 Node.js REPL 中测试！

## 顶层 `await` 不会是一个坑吗？

也许你已经看过 [臭名昭著的 gist](https://gist.github.com/Rich-Harris/0b6f317657f5167663b493c722647221) 由 [Rich Harris](https://twitter.com/Rich_Harris) 编写，该文最初概述了一些关于顶层 `await` 的担忧，并敦促 JavaScript 不要实现该功能。一些具体的担忧包括：

- 顶层 `await` 可能会阻塞执行。
- 顶层 `await` 可能会阻塞资源的获取。
- 对于 CommonJS 模块不会有明确的互操作方案。

该提案的第 3 阶段版本直接解决了这些问题：

- 由于兄弟模块可以执行，不存在明确的阻塞。
- 顶层 `await` 发生在模块图的执行阶段。在此阶段，所有资源都已被获取并链接，因此不存在阻塞资源获取的风险。
- 顶层 `await` 仅限于模块。明确不支持脚本或 CommonJS 模块。

与任何新的语言功能一样，总是存在意外行为的风险。例如，使用顶层 `await` 时，循环模块依赖可能会引入死锁。

没有顶层 `await` 时，JavaScript 开发者通常使用异步立即调用函数表达式来获取对 `await` 的访问。不幸的是，这种模式导致了图执行的不确定性和应用程序的静态可分析性较低。基于这些原因，缺乏顶层 `await` 被认为比该功能引入的风险更高。

## 对顶层 `await` 的支持

<feature-support chrome="89 https://bugs.chromium.org/p/v8/issues/detail?id=9344"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1519100"
                 safari="15 https://bugs.webkit.org/show_bug.cgi?id=202484"
                 nodejs="14"
                 babel="no https://github.com/babel/proposals/issues/44"></feature-support>
