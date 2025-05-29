---
title: "V8 发布 v8.6"
author: "Ingvar Stepanyan（[@RReverser](https://twitter.com/RReverser)），一位键盘模糊测试者"
avatars:
 - "ingvar-stepanyan"
date: 2020-09-21
tags:
 - 发布
description: "V8 发布 v8.6 带来了更尊重的代码、性能改进和规范更改。"
tweet: "1308062287731789825"
---
每六周，我们会根据我们的[发布流程](https://v8.dev/docs/release-process)创建一个新的 V8 分支。每个版本在 Chrome Beta 里程碑之前都会从 V8 的 Git 主分支中分支而出。今天，我们很高兴宣布我们最新的分支，[V8 版本 8.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.6)，此版本目前处于测试阶段，几周后将与 Chrome 86 Stable 一起发布。V8 v8.6 包含了各种对开发者有益的功能。这篇文章为您提供了一些亮点的预览以期待发布。

<!--truncate-->
## 尊重代码

v8.6 版本使 V8 代码库变得[更加尊重](https://v8.dev/docs/respectful-code)。团队加入了 Chromium 范围内的努力，以遵循 Google 在种族平等方面的承诺，通过替换项目中一些不敏感的术语。这仍然是一个持续的工作，欢迎任何外部贡献者加入！您可以在[这里](https://docs.google.com/document/d/1rK7NQK64c53-qbEG-N5xz7uY_QUVI45sUxinbyikCYM/edit)查看仍然可用的任务列表。

## JavaScript

### 开源的 JS-Fuzzer

JS-Fuzzer 是一个基于变异的 JavaScript 模糊测试工具，由 Oliver Chang 原创开发。它一直是 V8 [稳定性](https://bugs.chromium.org/p/chromium/issues/list?q=ochang_js_fuzzer%20label%3AStability-Crash%20label%3AClusterfuzz%20-status%3AWontFix%20-status%3ADuplicate&can=1)和[安全性](https://bugs.chromium.org/p/chromium/issues/list?q=ochang_js_fuzzer%20label%3ASecurity%20label%3AClusterfuzz%20-status%3AWontFix%20-status%3ADuplicate&can=1)的重要基石，现在已[开源](https://chromium-review.googlesource.com/c/v8/v8/+/2320330)。

该模糊测试工具使用 [Babel](https://babeljs.io/) 的 AST 转换，通过可扩展的[变异器类](https://chromium.googlesource.com/v8/v8/+/320d98709f/tools/clusterfuzz/js_fuzzer/mutators/)对现有的跨引擎测试用例进行变异。最近我们还开始以差异测试模式运行模糊测试工具，用于检测 JavaScript 的[正确性问题](https://bugs.chromium.org/p/chromium/issues/list?q=blocking%3A1050674%20-status%3ADuplicate&can=1)。欢迎贡献！请参阅[自述文件](https://chromium.googlesource.com/v8/v8/+/master/tools/clusterfuzz/js_fuzzer/README.md)了解更多。

### `Number.prototype.toString` 的提速

将 JavaScript 数字转换为字符串在一般情况下可能是一项复杂的操作；我们必须考虑到浮点精度、科学记数法、NaN、无穷大、舍入等因素。甚至在计算之前，我们都无法知道生成的字符串会有多大大小。因此，我们的 `Number.prototype.toString` 的实现会调用 C++ 运行时函数。

但是，大多数情况下，您只是想打印一个简单的小整数（“Smi”）。这是一个更简单的操作，而调用 C++ 运行时函数的开销已不再值得。因此，我们与微软合作，为小整数添加了一个简单的快路径，这段代码用 Torque 编写，以减少这一常见情况下的开销。这项改进使数字打印的微基准测试提升了约 75%。

### 移除了 `Atomics.wake`

`Atomics.wake` 被重命名为 `Atomics.notify`，以符合 [v7.3 的规范更改](https://v8.dev/blog/v8-release-73#atomics.notify)。现在已移除了被弃用的 `Atomics.wake` 别名。

### 小的规范更改

- 匿名类现在有一个 `.name` 属性，其值为空字符串 `''`。[规范更改](https://github.com/tc39/ecma262/pull/1490)。
- 在[宽松模式](https://developer.mozilla.org/en-US/docs/Glossary/Sloppy_mode)下的模板字符串字面量中，以及在[严格模式](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode)下的所有字符串字面量中，`\8` 和 `\9` 转义序列现在是非法的。[规范更改](https://github.com/tc39/ecma262/pull/2054)。
- 内置的 `Reflect` 对象现在有一个 `Symbol.toStringTag` 属性，其值为 `'Reflect'`。[规范更改](https://github.com/tc39/ecma262/pull/2057)。

## WebAssembly

### Liftoff 上的 SIMD

Liftoff 是 WebAssembly 的基础编译器，并且从 V8 v8.5 开始已在所有平台上推出。[SIMD 提案](https://v8.dev/features/simd) 使得 WebAssembly 能够利用常见的硬件向量指令来加速计算密集型工作负载。它目前处于[来源试用阶段](https://v8.dev/blog/v8-release-84#simd-origin-trial)，这允许开发者在标准化之前尝试该功能。

直到现在，SIMD 仅在 TurboFan 中实现，它是 V8 的高级编译器。这在充分利用 SIMD 指令的性能方面是必要的。使用 SIMD 指令的 WebAssembly 模块启动速度更快，并且通常比使用 TurboFan 编译的标量等效模块运行性能更高。例如，给定一个接收浮点数组并将其值限制为零的函数（为了清晰，以下用 JavaScript 编写）：

```js
function clampZero(f32array) {
  for (let i = 0; i < f32array.length; ++i) {
    if (f32array[i] < 0) {
      f32array[i] = 0;
    }
  }
}
```

让我们比较这个函数的两种不同实现方式，分别使用 Liftoff 和 TurboFan：

1. 一个标量实现，循环展开了 4 次。
2. 一个 SIMD 实现，使用 `i32x4.max_s` 指令。

以 Liftoff 的标量实现为基准，我们看到以下结果：

![一张图表显示 Liftoff SIMD 比 Liftoff 标量快约 2.8 倍，而 TurboFan SIMD 快约 7.5 倍](/_img/v8-release-86/simd.svg)

### 更快的 Wasm 到 JS 调用

如果 WebAssembly 调用了一个导入的 JavaScript 函数，我们通过所谓的“Wasm 到 JS 包装器”（或“导入包装器”）来进行调用。这个包装器[将参数转换](https://webassembly.github.io/spec/js-api/index.html#tojsvalue)为 JavaScript 可以理解的对象，并且在对 JavaScript 的调用返回时，[将返回值转换回 WebAssembly](https://webassembly.github.io/spec/js-api/index.html#towebassemblyvalue)。

为了确保 JavaScript 的 `arguments` 对象确切地反映从 WebAssembly 传递的参数数量，如果参数数量不匹配，我们会通过一个所谓的“参数适配跳板”来调用。

但在很多情况下，这是不需要的，因为被调用的函数不使用 `arguments` 对象。在 v8.6 中，微软贡献者提交了一个[修订补丁](https://crrev.com/c/2317061)，避免了在这些情况下通过参数适配跳板调用，使相关调用显著加快。

## V8 API

### 使用 `Isolate::HasPendingBackgroundTasks` 检测待处理的后台任务

新的 API 函数 `Isolate::HasPendingBackgroundTasks` 允许嵌入者检查是否存在待处理的后台工作，这些工作最终将发布新的前台任务，例如 WebAssembly 编译。

这个 API 应该解决嵌入者关闭 V8 时仍有待处理的 WebAssembly 编译最终会触发进一步脚本执行的问题。通过 `Isolate::HasPendingBackgroundTasks`，嵌入者可以等待新的前台任务，而不是关闭 V8。

请使用 `git log branch-heads/8.5..branch-heads/8.6 include/v8.h` 获取 API 更改列表。

拥有 V8 活动检出的开发人员可以使用 `git checkout -b 8.6 -t branch-heads/8.6` 来体验 V8 v8.6 中的新增功能。或者，您可以[订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，并尽快尝试这些新功能。
