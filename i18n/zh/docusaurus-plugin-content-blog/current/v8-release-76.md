---
title: 'V8 发布版本 v7.6'
author: 'Adam Klein'
avatars:
  - 'adam-klein'
date: 2019-06-19 16:45:00
tags:
  - release
description: 'V8 v7.6 的功能包括 Promise.allSettled、更快的 JSON.parse、本地化的 BigInts、更快的冻结/密封数组等等！'
tweet: '1141356209179516930'
---
每六周，我们会根据 [发布流程](/docs/release-process) 创建一个 V8 的新分支。每个版本都会在 Chrome Beta 里程碑之前从 V8 的 Git 主分支分出。今天，我们很高兴地宣布我们的最新分支 [V8 版本 7.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.6)，该版本将处于 Beta 阶段，直到几周后与 Chrome 76 Stable 协同发布。V8 v7.6 充满了各种面向开发者的精彩功能。本文旨在为即将发布的版本提供一些亮点预览。

<!--truncate-->
## 性能（大小和速度）

### `JSON.parse` 的改进

在现代 JavaScript 应用程序中，JSON 通常用作传递结构化数据的格式。通过加速 JSON 解析，我们可以减少这种通信的延迟。在 V8 v7.6 中，我们对 JSON 解析器进行了全面改造，使其在扫描和解析 JSON 时快得多。这使得从流行网页提供的数据的解析速度提升了多达 2.7 倍。

![图表展示了在不同网站上改进的 `JSON.parse` 性能](/_img/v8-release-76/json-parsing.svg)

在 V8 v7.5 及之前版本中，JSON 解析器是一个递归解析器，它会使用与接收到的 JSON 数据嵌套深度对应的原生堆栈空间。这意味着对于非常深度嵌套的 JSON 数据，我们可能会耗尽堆栈空间。V8 v7.6 切换到一个管理其自身堆栈的迭代解析器，其限制仅为可用内存。

新的 JSON 解析器在内存使用上也更加高效。在我们创建最终对象之前先缓冲属性，现在我们可以以优化的方式分配结果。对于具有命名属性的对象，我们根据输入 JSON 数据的命名属性（最多 128 个命名属性）精确分配所需的空间。如果 JSON 对象包含索引属性名称，我们分配一个使用最小空间的存储支持；这可以是一个平坦数组或一个字典。JSON 数组现在解析为一个与输入数据中的元素数量完全匹配的数组。

### 冻结/密封数组的改进

对冻结或密封数组（以及类数组对象）上的调用性能进行了诸多改进。V8 v7.6 提高了以下 JavaScript 编码模式的性能，其中 `frozen` 是一个冻结或密封的数组或类数组对象：

- `frozen.indexOf(v)`
- `frozen.includes(v)`
- 如 `fn(...frozen)` 的扩展调用
- 如 `fn(...[...frozen])` 的嵌套扩展数组调用
- 如 `fn.apply(this, [...frozen])` 的使用数组扩展的 apply 调用

下图展示了性能提升。

![图表展示了各种数组操作的性能提升](/_img/v8-release-76/frozen-sealed-elements.svg)

[查看“V8 中的快速冻结和密封元素”设计文档](https://bit.ly/fast-frozen-sealed-elements-in-v8)以了解更多详细信息。

### Unicode 字符串处理

当 [将字符串转换为 Unicode](https://chromium.googlesource.com/v8/v8/+/734c1456d942a03d79aab4b3b0e57afbc803ceea) 时的一项优化使诸如 `String#localeCompare`、`String#normalize` 和一些 `Intl` API 的调用显著加快。例如，此更改使得一字节字符串的 `String#localeCompare` 原始吞吐量提高了约 2 倍。

## JavaScript 语言特性

### `Promise.allSettled`

[`Promise.allSettled(promises)`](/features/promise-combinators#promise.allsettled) 提供了一种信号，当所有输入的 promise 都 _settled_ 时触发，这意味着它们要么 _fulfilled_ 要么 _rejected_。在不关心 promise 状态，只想知道工作完成的情况下（无论是否成功），这很有用。[我们关于 promise 组合器的介绍](/features/promise-combinators) 提供了更多详细信息并包含一个示例。

### 改进的 `BigInt` 支持

[`BigInt`](/features/bigint) 在语言中的 API 支持已得到改进。现在可以使用 `toLocaleString` 方法以区域感知的方式格式化 `BigInt`，其工作方式与普通数字相同：

```js
12345678901234567890n.toLocaleString('en'); // 🐌
// → '12,345,678,901,234,567,890'
12345678901234567890n.toLocaleString('de'); // 🐌
// → '12.345.678.901.234.567.890'
```

如果您计划使用相同区域设置格式化多个数字或 `BigInt`，使用支持 `BigInt` 的 `Intl.NumberFormat` API 更加高效。通过此方法，您可以创建一个可重复使用的格式化实例。

```js
const nf = new Intl.NumberFormat('fr');
nf.format(12345678901234567890n); // 🚀
// → &apos;12 345 678 901 234 567 890&apos;
nf.formatToParts(123456n); // 🚀
// → [
// →   { type: &apos;integer&apos;, value: &apos;123&apos; },
// →   { type: &apos;group&apos;, value: &apos; &apos; },
// →   { type: &apos;integer&apos;, value: &apos;456&apos; }
// → ]
```

### `Intl.DateTimeFormat` 改进

应用程序通常显示日期间隔或日期范围，以显示事件的持续时间，例如酒店预订、服务的账单周期或音乐节的时间范围。现在，`Intl.DateTimeFormat` API 支持 `formatRange` 和 `formatRangeToParts` 方法，可以方便地以特定语言环境格式化日期范围。

```js
const start = new Date(&apos;2019-05-07T09:20:00&apos;);
// → &apos;2019年5月7日&apos;
const end = new Date(&apos;2019-05-09T16:00:00&apos;);
// → &apos;2019年5月9日&apos;
const fmt = new Intl.DateTimeFormat(&apos;en&apos;, {
  year: &apos;numeric&apos;,
  month: &apos;long&apos;,
  day: &apos;numeric&apos;,
});
const output = fmt.formatRange(start, end);
// → &apos;2019年5月7日 – 9日&apos;
const parts = fmt.formatRangeToParts(start, end);
// → [
// →   { &apos;type&apos;: &apos;month&apos;,   &apos;value&apos;: &apos;5月&apos;,  &apos;source&apos;: &apos;shared&apos; },
// →   { &apos;type&apos;: &apos;literal&apos;, &apos;value&apos;: &apos; &apos;,    &apos;source&apos;: &apos;shared&apos; },
// →   { &apos;type&apos;: &apos;day&apos;,     &apos;value&apos;: &apos;7&apos;,    &apos;source&apos;: &apos;startRange&apos; },
// →   { &apos;type&apos;: &apos;literal&apos;, &apos;value&apos;: &apos; – &apos;,  &apos;source&apos;: &apos;shared&apos; },
// →   { &apos;type&apos;: &apos;day&apos;,     &apos;value&apos;: &apos;9&apos;,    &apos;source&apos;: &apos;endRange&apos; },
// →   { &apos;type&apos;: &apos;literal&apos;, &apos;value&apos;: &apos;, &apos;,   &apos;source&apos;: &apos;shared&apos; },
// →   { &apos;type&apos;: &apos;year&apos;,    &apos;value&apos;: &apos;2019&apos;, &apos;source&apos;: &apos;shared&apos; },
// → ]
```

此外，`format`、`formatToParts` 和 `formatRangeToParts` 方法现在支持新的 `timeStyle` 和 `dateStyle` 选项：

```js
const dtf = new Intl.DateTimeFormat(&apos;de&apos;, {
  timeStyle: &apos;medium&apos;,
  dateStyle: &apos;short&apos;
});
dtf.format(Date.now());
// → &apos;19.06.19, 13:33:37&apos;
```

## 原生堆栈遍历

虽然 V8 可以遍历其自身的调用堆栈（例如在 DevTools 中调试或分析时），但 Windows 操作系统无法遍历在 x64 架构上运行时 TurboFan 生成的代码包含的调用堆栈。这可能会导致在使用原生调试器或 ETW 采样分析使用 V8 的进程时出现 _堆栈损坏_。最近的更改使得 V8 能够[注册必要的元数据](https://chromium.googlesource.com/v8/v8/+/3cda21de77d098a612eadf44d504b188a599c5f0)，使得 Windows 能够在 x64 上遍历这些堆栈，并且在 v7.6 中默认启用。

## V8 API

请使用 `git log branch-heads/7.5..branch-heads/7.6 include/v8.h` 获取 API 更改列表。

拥有[活动 V8 检出](/docs/source-code#using-git)的开发者可以使用 `git checkout -b 7.6 -t branch-heads/7.6` 来试验 V8 v7.6 的新功能。或者，您可以[订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，并很快尝试这些新功能。
