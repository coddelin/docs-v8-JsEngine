---
title: "V8 发布 v7.1"
author: "Stephan Herhut ([@herhut](https://twitter.com/herhut))，克隆克隆者的克隆者"
avatars: 
  - stephan-herhut
date: "2018-10-31 15:44:37"
tags: 
  - release
description: "V8 v7.1 包含嵌入式字节码处理程序、改进的 TurboFan 逃逸分析、postMessage(wasmModule)、Intl.RelativeTimeFormat，以及 globalThis!"
tweet: "1057645773465235458"
---
每六周我们会创建一个新的 V8 分支，这是我们[发布流程](/docs/release-process)的一部分。每个版本都会在 Chrome Beta 里程碑之前从 V8 的 Git 主分支分离出来。今天，我们很高兴宣布最新的分支：[V8 版本 7.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.1)，目前已进入 Beta 阶段，几周后将在与 Chrome 71 稳定版的协调发布中正式发布。V8 v7.1 包含各种面向开发者的好功能。本篇文章将提前预览一些亮点。

<!--truncate-->
## 内存

继 v6.9/v7.0 中关于[直接将内置模块嵌入二进制文件](/blog/embedded-builtins)的工作之后，解释器的字节码处理程序现在也[嵌入到二进制文件中](https://bugs.chromium.org/p/v8/issues/detail?id=8068)。平均每个 Isolate（隔离环境）节省约 200 KB。

## 性能

TurboFan 的逃逸分析进行了改进，能够对优化单元本地对象进行标量替换，还能[处理高阶函数的局部函数上下文](https://bit.ly/v8-turbofan-context-sensitive-js-operators)，当来自周围上下文变量逃逸到局部闭包时，例如如下示例：

```js
function mapAdd(a, x) {
  return a.map(y => y + x);
}
```

注意，`x` 是局部闭包 `y => y + x` 的自由变量。V8 v7.1 现在可以完全删除分配给 `x` 的上下文，在某些情况下可实现高达 **40%** 的性能提升。

![通过新逃逸分析提升性能（值越低越好）](/_img/v8-release-71/improved-escape-analysis.svg)

逃逸分析现在还能够消除某些局部数组的变量索引访问情况。以下是一个示例：

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

注意，假设 `sum` 内联到 `sum2` 中后，`args` 是 `sum2` 的局部临时变量。在 V8 v7.1 中，TurboFan 现在可以完全消除对 `args` 的分配，并将变量索引访问 `args[i]` 替换为如下所示的条件操作：`i === 0 ? x : y`。这将在 JetStream/EarleyBoyer 基准测试中提升约 ~2% 的性能。未来我们可能会将此优化扩展到超过两个元素的数组。

## Wasm 模块的结构化克隆

最终，[`postMessage` 现已支持 Wasm 模块](https://github.com/WebAssembly/design/pull/1074)。`WebAssembly.Module` 对象现在可以通过 `postMessage` 发送到 Web workers。需要说明的是，这仅限于 Web workers（同一进程内的不同线程），而不适用于跨进程场景（比如跨域的 `postMessage` 或共享 Web workers）。

## JavaScript 语言特性

[`Intl.RelativeTimeFormat` API](/features/intl-relativetimeformat)提供了相对时间的本地化格式化（例如“昨天”、“42 秒前”或“三个月后”），同时保持性能。以下是一个示例：

```js
// 为英语创建一个相对时间格式化器，
// 不必总是使用数值输出。
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → '昨天'

rtf.format(0, 'day');
// → '今天'

rtf.format(1, 'day');
// → '明天'

rtf.format(-1, 'week');
// → '上周'

rtf.format(0, 'week');
// → '本周'

rtf.format(1, 'week');
// → '下周'
```

阅读我们的 [`Intl.RelativeTimeFormat` 说明文档](/features/intl-relativetimeformat)以了解更多信息。

V8 v7.1 还新增了对[`globalThis` 提案](/features/globalthis)的支持，允许在严格函数或模块中，无论平台如何都能通用性访问全局对象。

## V8 API

请使用 `git log branch-heads/7.0..branch-heads/7.1 include/v8.h` 获取 API 更改列表。

拥有[活跃的 V8 checkout](/docs/source-code#using-git)的开发者可以使用 `git checkout -b 7.1 -t branch-heads/7.1` 来试验 V8 v7.1 中的新功能。或者，您也可以[订阅 Chrome Beta 频道](https://www.google.com/chrome/browser/beta.html)，并尽快自行试用新功能。
