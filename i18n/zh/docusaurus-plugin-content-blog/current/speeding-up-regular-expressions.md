---
title: '加快 V8 正则表达式速度'
author: 'Jakob Gruber，常规软件工程师'
avatars:
  - 'jakob-gruber'
date: 2017-01-10 13:33:37
tags:
  - 内部结构
  - 正则表达式
description: 'V8 最近将正则表达式的内置函数从自托管的 JavaScript 实现过渡为直接连接到我们基于 TurboFan 的新代码生成架构的实现。'
---
这篇博文讲述了 V8 最近将正则表达式的内置函数从自托管的 JavaScript 实现过渡为直接连接到我们基于 [TurboFan](/blog/v8-release-56) 的新代码生成架构的实现。

<!--truncate-->
V8 的正则表达式实现基于 [Irregexp](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html)，这通常被认为是最快的正则表达式引擎之一。虽然该引擎本身封装了用于对字符串执行模式匹配的低级逻辑，但正则表达式原型上的函数（例如 [`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec)）完成了将其功能暴露给用户所需的额外工作。

从历史上看，V8 的许多组件都是用 JavaScript 实现的。直到最近，`regexp.js` 还是其中之一，承载着正则表达式构造函数的实现、所有属性以及其原型属性。

不幸的是，这种方法有缺点，包括不可预测的性能和向 C++ 运行时的昂贵转换以执行低级功能。ES6 最近引入了内置子类化（允许 JavaScript 开发者提供自己的定制正则表达式实现），即使在正则表达式内置未被子类化的情况下，仍然导致了进一步的正则表达式性能损失。这些性能退化在自托管的 JavaScript 实现中无法完全解决。

因此，我们决定将正则表达式的实现从 JavaScript 中迁移出去。然而，保持性能比预期更难。一种初步迁移到完整的 C++ 实现的方案明显更慢，仅达到原实现性能的约 70%。经过一些调查，我们发现了几个原因：

- [`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec) 包含几个对性能极为敏感的区域，尤其是正则表达式引擎的切换点，以及伴随子字符串调用构造正则表达式结果的过程。对于这些区域，JavaScript 实现依赖从原生汇编语言或直接挂钩到优化编译器管线编写的高效代码（称为“stub”）。无法从 C++ 访问这些 stub，它们的运行时等价物显著更慢。
- 对正则表达式属性（例如 `lastIndex`）的访问可能很昂贵，可能需要按名字查找和遍历原型链。V8 的优化编译器通常可以自动将这些访问替换为更高效的操作，而这些情况在 C++ 中需要显式处理。
- 在 C++ 中，对 JavaScript 对象的引用必须用所谓的 `Handle` 包装，以与垃圾回收协作。相比于简单的 JavaScript 实现，Handle 管理会产生额外的开销。

我们为正则表达式迁移设计的新方案基于 [CodeStubAssembler](/blog/csa)，这是一种允许 V8 开发者编写平台无关代码的机制，这些代码后来将通过与新优化编译器 TurboFan 使用相同的后端翻译为快速的特定平台代码。使用 CodeStubAssembler 使我们可以解决初始 C++ 实现的所有缺点。可以轻松从 CodeStubAssembler 调用 stub（例如正则表达式引擎的入口点）。尽管快速属性访问仍然需要显式地通过所谓的快速路径实现，但在 CodeStubAssembler 中这样的访问非常高效。Handle 在 C++ 之外根本不存在。而且由于实现现在在非常低的层级操作，我们可以采取进一步的捷径，例如在不需要时跳过昂贵的结果构造。

结果非常积极。我们在[一个重要的正则表达式工作负载](https://github.com/chromium/octane/blob/master/regexp.js)上的得分提高了15%，不仅弥补了我们最近与子类相关的性能损失，还实现了更多的提升。微基准测试（图1）显示性能全面提高，从 [`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec) 提高7%，到 [`RegExp.prototype[@@split]`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/@@split) 提高102%。

![图1：按功能划分的正则表达式加速](/_img/speeding-up-regular-expressions/perf.png)

那么作为JavaScript开发者，你如何确保正则表达式的运行速度很快呢？如果你不打算深入正则表达式的内部，请确保既没有修改正则表达式实例，也没有修改其原型，以获得最佳性能:

```js
const re = /./g;
re.exec(&apos;&apos;);  // 快速路径。
re.new_property = &apos;慢&apos;;
RegExp.prototype.new_property = &apos;也很慢&apos;;
re.exec(&apos;&apos;);  // 慢速路径。
```

尽管有时候子类化正则表达式可能非常有用，但请注意，子类化的正则表达式实例需要更通用的处理，因此会走慢速路径:

```js
class SlowRegExp extends RegExp {}
new SlowRegExp(".", "g").exec(&apos;&apos;);  // 慢速路径。
```

完整的正则表达式迁移将会在V8 v5.7中可用。
