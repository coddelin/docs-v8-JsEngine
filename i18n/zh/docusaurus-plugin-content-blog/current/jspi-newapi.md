---
title: "WebAssembly JSPI 有一个新的 API"
description: "本文详细介绍了 JavaScript Promise 集成 (JSPI) API 即将发生的一些变化。"
author: "Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl"
date: 2024-06-04
tags: 
  - WebAssembly
---
WebAssembly 的 JavaScript Promise 集成 (JSPI) API 有一个新 API，可在 Chrome M126 版本中使用。我们讨论了变化的内容、如何配合 Emscripten 使用以及 JSPI 的路线图。

JSPI 是一个允许使用 *顺序* API 的 WebAssembly 应用程序访问 *异步* Web API 的接口。许多 Web API 是通过 JavaScript `Promise` 对象设计的：它们不会立即执行请求的操作，而是返回一个 `Promise` 来完成这些操作。而另一方面，许多编译为 WebAssembly 的应用程序源自 C/C++ 领域，那里主要由阻塞调用者直到任务完成的 API 主导。

<!--truncate-->
JSPI 钩入 Web 架构，允许在返回 `Promise` 时暂停 WebAssembly 应用程序，并在 `Promise` 被解决时恢复。

您可以在[这篇博客文章](https://v8.dev/blog/jspi)和[规范](https://github.com/WebAssembly/js-promise-integration)中了解有关 JSPI 和如何使用它的更多信息。

## 有哪些新的变化？

### `Suspender` 对象的终结

2024 年 1 月，Wasm CG 的 Stacks 子组[投票](https://github.com/WebAssembly/meetings/blob/297ac8b5ac00e6be1fe33b1f4a146cc7481b631d/stack/2024/stack-2024-01-29.md)修改 JSPI API 的设计。具体来说，将不再使用显式的 `Suspender` 对象，而是使用 JavaScript/WebAssembly 边界作为确定暂停计算的分隔符。

改变虽然很小但可能意义重大：当计算需要暂停时，最近一次对一个封装的 WebAssembly 导出的调用将决定暂停的“切入点”。

这意味着使用 JSPI 的开发者对切入点的控制稍微减少了。而另一方面，不需要显式管理 `Suspender` 对象使整个 API 的使用显著变得更加简单。

### 不再需要 `WebAssembly.Function`

另一个变化是 API 的风格。API 不再通过 `WebAssembly.Function` 构造器描述 JSPI 的封装，而是提供特定的函数和构造器。

这有以下几个好处：

- 它去除了对[*类型反射*提议](https://github.com/WebAssembly/js-types)的依赖。
- 它简化了 JSPI 的工具：新的 API 函数不需要显式引用函数的 WebAssembly 类型。

这一变化的实现得益于不再使用显式引用的 `Suspender` 对象。

### 不暂停直接返回

第三个变化涉及暂停调用的行为。现在调用 JavaScript 函数的暂停导入时，只在 JavaScript 函数实际返回一个 `Promise` 时暂停。

这一变化虽然表面上似乎违反了[W3C TAG 的建议](https://www.w3.org/2001/tag/doc/promises-guide#accepting-promises)，但对于 JSPI 用户来说是安全的优化。它之所以安全，是因为 JSPI 实际上担任了调用返回 `Promise` 函数的*调用方*角色。

这一变化对大多数应用程序影响甚微，但对于某些应用程序，通过避免不必要的浏览器事件循环，可以显著受益。

### 新 API

此 API 非常简单：有一个函数可以接收从 WebAssembly 模块导出的函数，并将其转换为返回 `Promise` 的函数：

```js
Function Webassembly.promising(Function wsFun)
```

注意即使参数类型定义为 JavaScript `Function`，它实际上仅限于 WebAssembly 函数。

在暂停功能方面，有一个新的类 `WebAssembly.Suspending`，以及一个可以接收 JavaScript 函数作为参数的构造器。在 WebIDL 中，这写作如下：

```js
interface Suspending{
  constructor (Function fun);
}
```

注意这个 API 带有一种不对称的感觉：有一个函数接收 WebAssembly 函数并返回一个新的 promising（有承诺的）函数；而标记暂停函数时则需要将其封装在一个 `Suspending` 对象中。这反映了底层发生的更深层次的现实。

导入的暂停行为本质上是对导入调用的一部分操作：即，实例化模块中的一些函数调用导入并因此暂停。

另一方面，`promising` 函数接收一个普通的 WebAssembly 函数并返回一个可以响应暂停并返回 `Promise` 的新函数。

### 使用新 API

如果您是 Emscripten 用户，使用新 API 通常不需要对代码进行更改。您必须使用至少 3.1.61 版本的 Emscripten，并且必须使用至少版本为 126.0.6478.17（Chrome M126）的 Chrome。

如果您在自行集成，您的代码应该会显著简化。特别是，不再需要编写存储传入的 `Suspender` 对象（并在调用导入时检索它）的代码。您可以在 WebAssembly 模块中简单使用常规的顺序代码。

### 旧 API

旧 API 至少会继续运作到 2024 年 10 月 29 日（Chrome M128）。在此之后，我们计划移除旧 API。

请注意，从 3.1.61 版本开始，Emscripten 本身将不再支持旧 API。

### 检测您的浏览器中启用了哪个 API

更改 API 从来不是轻率的行为。在这种情况下我们之所以可以这么做，是因为 JSPI 本身仍处于临时状态。有一个简单的方法可以测试您的浏览器中启用了哪个 API：

```js
function oldAPI(){
  return WebAssembly.Suspender!=undefined
}

function newAPI(){
  return WebAssembly.Suspending!=undefined
}
```

`oldAPI` 函数在您的浏览器中启用了旧 JSPI API 时返回 true，而 `newAPI` 函数在启用了新 JSPI API 时返回 true。

## JSPI 正在发生什么？

### 实现方面

我们正在进行的对 JSPI 的最大改动对大多数程序员来说实际上是不可见的：即所谓的可增长栈。

当前 JSPI 的实现基于分配固定大小的栈。实际上，分配的栈相当大。这是因为我们必须能够容纳可能需要深栈来正确处理递归的任意 WebAssembly 计算。

然而，这并不是一种可持续的策略：我们希望支持具有数百万挂起协程的应用程序；如果每个栈的大小为 1MB，这是不可能的。

可增长栈是指允许 WebAssembly 栈根据需要增长的栈分配策略。这样，对于仅需要小栈空间的应用程序，我们可以从非常小的栈开始，而在应用程序空间不足时（即所谓的栈溢出）增长栈。

实现可增长栈有几种潜在技术。其中一种我们正在研究的方法是分段栈。分段栈由一系列栈区域组成，每个栈区域固定大小，但不同的段可能大小不同。

请注意，尽管我们可能会解决协程的栈溢出问题，但我们并不计划使主栈或中央栈可增长。因此，如果您的应用程序用尽了栈空间，除非您使用 JSPI，否则可增长栈不会解决您的问题。

### 标准化进程

截至发布，有一个针对 JSPI 的活跃[试验性功能](https://v8.dev/blog/jspi-ot)。新 API 将在试验性功能的剩余期间可用 &mdash; 在 Chrome M126 提供。

以前的 API 也将在试验性功能期间可用；然而，计划在 Chrome M128 之后不久被淘汰。

在此之后，JSPI 的主要工作集中在标准化过程中。截至发布，JSPI 当前处于 W3C Wasm CG 进程的第 3 阶段。下一步，即进入第 4 阶段，标志着 JSPI 被正式采纳为 JavaScript 和 WebAssembly 生态系统的标准 API。

我们希望了解您对 JSPI 改变的看法！请加入 [W3C WebAssembly Community Group 仓库](https://github.com/WebAssembly/js-promise-integration) 的讨论。
