---
title: 'V8发布版本v7.4'
author: 'Georg Neis'
date: 2019-03-22 16:30:42
tags:
  - 发布
description: 'V8 v7.4支持WebAssembly线程/原子操作、类的私有字段、性能与内存改进，以及更多功能！'
tweet: '1109094755936489472'
---
每六周我们会创建一个新的V8分支，作为我们[发布流程](/docs/release-process)的一部分。每个版本都会在Chrome测试版的一个里程碑前，从V8的Git主分支中分支出来。今天，我们很高兴地宣布我们的最新分支，[V8版本7.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.4)，它将处于测试阶段，直到几周后与Chrome 74稳定版同步发布。V8 v7.4充满了各种面向开发者的亮点功能。本文将概述一些即将发布的亮点功能。

<!--truncate-->
## 无JIT模式的V8

V8现在支持在运行时不分配可执行内存的情况下执行*JavaScript*。关于此功能的详细信息，可以参考[专门的博客文章](/blog/jitless)。

## WebAssembly线程/原子操作已推出

WebAssembly线程/原子操作现在已在非Android操作系统上启用。这标志着我们在V8 v7.0中开始的[试用阶段/预览](/blog/v8-release-70#a-preview-of-webassembly-threads)的结束。一篇Web Fundamentals文章解释了[如何使用带有Emscripten的WebAssembly原子操作](https://developers.google.com/web/updates/2018/10/wasm-threads)。

这解锁了通过WebAssembly在用户机器上的多核使用，从而在网页上启用新的计算密集型用例。

## 性能

### 参数数量不一致的调用速度更快

在JavaScript中，用参数太少或太多的方式调用函数（即，传递的参数少于或多于声明的形式参数）是完全合法的。前者称为_参数不足_，后者称为_参数过多_。在参数不足情况下，剩余的形式参数会被分配为`undefined`，而在参数过多情况下，多余的参数会被忽略。

然而，JavaScript函数仍可以通过[`arguments`对象](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments)、使用[剩余参数](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters)，甚至通过非标准的[`Function.prototype.arguments`属性](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/arguments)在[宽松模式](https://developer.mozilla.org/en-US/docs/Glossary/Sloppy_mode)中访问实际参数。因此，JavaScript引擎必须提供一种获取实际参数的方法。在V8中，这通过一种称为_参数适配_的技术来实现，它会在参数不足或过多的情况下提供实际参数。不幸的是，参数适配会带来性能损失，而且在现代前端和中间件框架中经常需要（例如，有许多带有可选参数或可变参数列表的API）。

在某些场景下，引擎知道不需要参数适配，因为实际参数无法被观察到，比如当被调用函数是严格模式函数，且不使用`arguments`或剩余参数。在这些情况下，V8现在完全跳过参数适配，将调用开销减少了**60%**。

![跳过参数适配的性能影响，通过[一个微基准测试](https://gist.github.com/bmeurer/4916fc2b983acc9ee1d33f5ee1ada1d3#file-bench-call-overhead-js)测量。](/_img/v8-release-74/argument-mismatch-performance.svg)

图表显示，即使在参数不匹配的情况下，只要被调用者无法观察到实际参数，也没有任何额外开销。详细信息参见[设计文档](https://bit.ly/v8-faster-calls-with-arguments-mismatch)。

### 改进的原生访问器性能

Angular团队[发现](https://mhevery.github.io/perf-tests/DOM-megamorphic.html)，通过调用原生访问器（即DOM属性访问器）的`get`函数访问DOM属性，在Chrome中显著慢于[单态](https://en.wikipedia.org/wiki/Inline_caching#Monomorphic_inline_caching)或[多态](https://en.wikipedia.org/wiki/Inline_caching#Megamorphic_inline_caching)属性访问。这是因为在通过[`Function#call()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call)调用DOM访问器时，V8采用了慢路径，而在直接属性访问时已存在快路径。

![](/_img/v8-release-74/native-accessor-performance.svg)

我们成功改善了调用本地访问器的性能，使之比多态属性访问速度显著提升。更多背景信息请参阅[V8问题 #8820](https://bugs.chromium.org/p/v8/issues/detail?id=8820)。

### 解析器性能

在Chrome中，足够大的脚本会在下载时由工作线程进行“流式”解析。在此版本中，我们识别并修复了自定义UTF-8解码在源码流中引发的性能问题，从而使流式解析平均提升了8%的速度。

我们在V8的预解析器中发现了另一个问题，该解析器通常运行在工作线程上：属性名称被不必要地去重。去除这种去重优化使流式解析器的性能又提高了10.5%。这也改善了非流式脚本（如小型脚本和内联脚本）在主线程上的解析时间。

![上图中的每一次下降表示流解析器性能的一次改进。](/_img/v8-release-74/parser-performance.jpg)

## 内存

### 字节码刷新

从JavaScript源代码编译的字节码占据了V8堆空间的相当大一部分，通常约占15%，包括相关的元数据。有许多函数仅在初始化期间执行，或者在编译后很少使用。

为了减少V8的内存开销，我们实现了一种机制，在垃圾回收期间刷新未最近执行的函数的已编译字节码。为此，我们记录每个函数字节码的年龄，在垃圾回收期间递增年龄，并在函数执行时将其重置为零。任何超过一定年龄阈值的字节码将在下一次垃圾回收期间被收集，并且函数在将来再次执行时会重新延迟编译其字节码。

我们的字节码刷新实验表明，对于Chrome用户来说，此机制显著节省了内存，使V8堆中的内存减少了5–15%之间，同时不会影响性能或显著增加编译JavaScript代码所需的CPU时间。

![](/_img/v8-release-74/bytecode-flushing.svg)

### 字节码无效基本块消除

Ignition字节码编译器会尽量避免生成已知无效的代码，例如在`return`或`break`语句之后的代码：

```js
return;
deadCall(); // 跳过
```

然而，以前这一操作仅在语句列表的终止语句中进行，无法考虑其他优化，例如已知条件为真的短路优化：

```js
if (2.2) return;
deadCall(); // 未跳过
```

我们尝试在V8 v7.3中解决这一问题，但仍基于每个语句的层级，这在控制流更复杂时不起作用，例如：

```js
do {
  if (2.2) return;
  break;
} while (true);
deadCall(); // 未跳过
```

上述代码中的`deadCall()`位于一个新基本块的开始处，在语句层级上作为循环中`break`语句的目标是可达的。

在V8 v7.4中，如果没有字节码跳转（Ignition的主要控制流原语）指向基本块，我们允许整个基本块变为无效。在上述示例中，`break`不会被发出，这意味着循环中没有`break`语句。因此，以`deadCall()`开始的基本块没有引用跳转，因此也被视为无效。尽管我们预计这对用户代码的影响不大，但对于简化各种反糖化（如生成器、`for-of`和`try-catch`）很有帮助，并特别消除了某些基本块可能“复活”到实现过程中的复杂语句的错误类别。

## JavaScript语言特性

### 私有类字段

V8 v7.2增加了对公共类字段语法的支持。类字段通过避免仅为定义实例属性而编写构造函数来简化类语法。从V8 v7.4开始，您可以通过在字段前添加`#`前缀标记它为私有。

```js
class IncreasingCounter {
  #count = 0;
  get value() {
    console.log('获取当前值!');
    return this.#count;
  }
  increment() {
    this.#count++;
  }
}
```

与公共字段不同，私有字段不能在类体外部访问：

```js
const counter = new IncreasingCounter();
counter.#count;
// → 语法错误 (SyntaxError)
counter.#count = 42;
// → 语法错误 (SyntaxError)
```

有关更多信息，请阅读我们的[公共和私有类字段介绍](/features/class-fields)。

### `Intl.Locale`

JavaScript应用程序通常使用诸如`'en-US'`或`'de-CH'`的字符串来标识区域设置。`Intl.Locale`提供了一种更加强大的机制来处理区域设置，并能轻松提取区域设置的特定偏好，如语言、日历、数字系统、小时制等。

```js
const locale = new Intl.Locale('es-419-u-hc-h12', {
  calendar: 'gregory'
});
locale.language;
// → 'es'
locale.calendar;
// → 'gregory'
locale.hourCycle;
// → 'h12'
locale.region;
// → '419'
locale.toString();
// → &apos;es-419-u-ca-gregory-hc-h12&apos;
```

### Hashbang 语法

JavaScript 现在可以以 `#!` 开头，这是一种所谓的 [hashbang](https://github.com/tc39/proposal-hashbang)。后续的整行内容会被视为单行注释。这与命令行 JavaScript 主机的实际用法一致，例如 Node.js。以下示例现在是语法上有效的 JavaScript 程序：

```js
#!/usr/bin/env node
console.log(42);
```

## V8 API

请使用 `git log branch-heads/7.3..branch-heads/7.4 include/v8.h` 查看 API 更改列表。

开发者可以通过一个 [有效的 V8 检出目录](/docs/source-code#using-git) 使用 `git checkout -b 7.4 -t branch-heads/7.4` 来试验 V8 v7.4 的新功能。或者，您可以 [订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，并尽快亲自体验这些新功能。
