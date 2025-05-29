---
title: "V8 发布 v5.6"
author: "V8 团队"
date: "2016-12-02 13:33:37"
tags: 
  - 发布
description: "V8 v5.6 带来了新的编译器管道、性能改进以及对 ECMAScript 语言特性的更广泛支持。"
---
每六周，我们会根据我们的 [发布流程](/docs/release-process) 创建 V8 的一个新分支。每个版本是在一个 Chrome Beta 里程碑达到之前直接从 V8 的 Git 主分支分出来的。今天我们很高兴地宣布我们的最新分支，[V8 版本 5.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.6)，它将在随后的几周内与 Chrome 56 稳定版协调发布之前处于测试阶段。V8 5.6 包含各种开发者友好的新功能，因此我们希望在即将发布之际给大家带来一些亮点的预览。

<!--truncate-->
## 为 ES.next（以及更多）推出的 Ignition 和 TurboFan 管道

从 5.6 版本开始，V8 可以优化整个 JavaScript 语言。此外，许多语言特性通过 V8 的新优化管道处理。这个管道使用 V8 的 [Ignition 解释器](/blog/ignition-interpreter) 作为基础，并通过 V8 功能更强大的 [TurboFan 优化编译器](/docs/turbofan) 优化频繁执行的方法。新管道为新语言特性（例如许多 ES2015 和 ES2016 规范中的新增特性）或 Crankshaft ([V8 的“传统”优化编译器](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html)) 无法优化的方法（例如 try-catch，with）启动。

为什么我们只将某些 JavaScript 语言特性通过新管道？新管道更适合优化 JavaScript 语言的整个范围（包括过去和现在）。它是一个更健康、更现代的代码库，并且专门为包括低内存设备的真实使用场景而设计。

我们已经开始使用 Ignition/TurboFan 与我们为 V8 添加的最新 ES.next 特性（ES.next = ES2015 及以后的 JavaScript 特性），并且随着我们不断改进性能，将通过新管道处理更多特性。在中期，V8 团队的目标是将 V8 中的所有 JavaScript 执行切换到新管道。 但是，只要存在 Crankshaft 在某些真实场景中比新的 Ignition/TurboFan 管道运行更快的情况，在短期内我们将支持两种管道，以确保在所有情况下运行在 V8 上的 JavaScript 代码尽可能快。

那么，为什么新管道同时使用新的 Ignition 解释器和新的 TurboFan 优化编译器？快速高效地运行 JavaScript 需要 JavaScript 虚拟机具有多个机制或级别来处理执行的低级工作。例如，拥有一个可以快速开始执行代码的第一级以及一个花费更长时间编译热点函数以最大化性能的第二个优化级是非常有用的。

Ignition 和 TurboFan 是 V8 的两个新执行级别，一起使用时最为有效。出于效率、简化和体积考虑，TurboFan 被设计为从 V8 的 Ignition 解释器生成的 [字节码](https://en.wikipedia.org/wiki/Bytecode) 开始优化 JavaScript 方法。通过将两种组件设计为紧密协作，可以因为彼此的存在对两者进行优化。因此，从 5.6 开始，所有将由 TurboFan 优化的函数都首先通过 Ignition 解释器运行。使用这种统一的 Ignition/TurboFan 管道，可以优化过去无法优化的特性，因为它们现在可以利用 TurboFan 的优化过程。例如，通过将 [生成器](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) 通过 Ignition 和 TurboFan 路由，生成器的运行时性能几乎提高了三倍。

有关 V8 采用 Ignition 和 TurboFan 的历程的更多信息，请参阅 [Benedikt 的专门博客文章](https://benediktmeurer.de/2016/11/25/v8-behind-the-scenes-november-edition/)。

## 性能改进

V8 v5.6 在内存和性能占用方面带来了诸多关键改进。

### 由于内存引发的卡顿

[并发记忆集过滤](https://bugs.chromium.org/p/chromium/issues/detail?id=648568) 已引入：这是迈向 [Orinoco](/blog/orinoco) 的一步。

### 显著提高的 ES2015 性能

开发者通常借助转译器开始使用新的语言特性，这主要是因为两个挑战：向后兼容性和性能问题。

V8的目标是缩小转译器和V8“原生”ES.next性能之间的差距，以解决后者的挑战。我们在使新语言特性的性能与其转译的ES5等效项相当方面取得了重大进展。在此版本中，您会发现ES2015特性的性能显著快于之前的V8版本，在某些情况下，ES2015特性的性能接近其转译的ES5等效项。

特别是[展开](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Operators/Spread_operator)运算符现在应该可以直接使用了。您可以这样写……

```js
// 类似Math.max，但对于没有参数的情况返回0而不是-∞。
function specialMax(...args) {
  if (args.length === 0) return 0;
  return Math.max.apply(Math, args);
}
```

……现在您可以这样写……

```js
function specialMax(...args) {
  if (args.length === 0) return 0;
  return Math.max(...args);
}
```

……并获得类似的性能结果。特别是，V8 v5.6包含以下微基准测试的性能提升：

- [解构](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring)
- [解构数组](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring-array)
- [解构字符串](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring-string)
- [for-of数组](https://github.com/fhinkel/six-speed/tree/master/tests/for-of-array)
- [生成器](https://github.com/fhinkel/six-speed/tree/master/tests/generator)
- [展开](https://github.com/fhinkel/six-speed/tree/master/tests/spread)
- [展开生成器](https://github.com/fhinkel/six-speed/tree/master/tests/spread-generator)
- [展开字面量](https://github.com/fhinkel/six-speed/tree/master/tests/spread-literal)

请参阅下图，以比较V8 v5.4和v5.6的性能。

![使用[SixSpeed](https://fhinkel.github.io/six-speed/)比较V8 v5.4和v5.6的ES2015特性性能](/_img/v8-release-56/perf.png)

这只是个开始；在即将到来的版本中还有更多的提升内容！

## 语言特性

### `String.prototype.padStart` / `String.prototype.padEnd`

[`String.prototype.padStart`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart)和[`String.prototype.padEnd`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd)是ECMAScript最新的第4阶段新增特性。这些库函数已在v5.6中正式发布。

:::note
**注意：** 尚未发布。
:::

## WebAssembly浏览器预览

Chromium 56（包含V8 v5.6）将发布WebAssembly浏览器预览。有关更多信息，请参考[专门的博客文章](/blog/webassembly-browser-preview)。

## V8 API

请查看我们的[API更改摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。此文档会在每次主要版本发布后几周定期更新。

拥有[活跃V8检出](https://v8.dev/docs/source-code#using-git)的开发者可以使用 `git checkout -b 5.6 -t branch-heads/5.6` 来试验V8 v5.6中的新特性。或者您也可以[订阅Chrome的测试版频道](https://www.google.com/chrome/browser/beta.html)，并尽快亲自尝试这些新特性。
