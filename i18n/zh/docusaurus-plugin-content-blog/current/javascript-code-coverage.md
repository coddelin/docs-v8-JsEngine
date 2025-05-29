---
title: "‘JavaScript代码覆盖率’"
author: "‘Jakob Gruber ([@schuay](https://twitter.com/schuay))’"
avatars: 
  - ‘jakob-gruber’
date: "2017-12-13 13:33:37"
tags: 
  - 内部机制
description: "‘V8现在原生支持JavaScript代码覆盖率。工具可以在不插桩代码的情况下访问V8的覆盖信息！’"
tweet: "‘940879905079873536’"
---
代码覆盖率提供了应用程序的某些部分是否已被执行的信息，甚至可以选择提供这些部分被执行的频率信息。它通常用于确定测试套件对特定代码库的覆盖程度。

## 为什么它有用？

作为JavaScript开发人员，您可能经常会遇到代码覆盖率能够派上用场的场景。例如：

- 对您的测试套件质量感兴趣吗？在重构一个大型遗留项目？代码覆盖率可以确切地显示代码库中哪些部分被覆盖。
- 想快速知道代码库的特定部分是否被触及？替代使用`console.log`进行`printf`-风格的调试或手动逐步执行代码，代码覆盖率可以即时显示应用程序中哪些部分已被执行。
- 或者您正在优化性能并希望知道应集中在哪些区域？执行次数可以指出热点函数和循环。

<!--truncate-->
## V8中的JavaScript代码覆盖率

今年早些时候，我们为V8添加了对JavaScript代码覆盖率的原生支持。在版本5.9的初始版本中提供了函数粒度的覆盖率（显示哪些函数已被执行），随后在版本6.2中扩展为支持块粒度的覆盖率（同样适用于单独的表达式）。

![函数粒度（左）和块粒度（右）](/_img/javascript-code-coverage/function-vs-block.png)

### 针对JavaScript开发人员

目前访问覆盖信息主要有两种方式。对于JavaScript开发人员，Chrome DevTools的[Coverage选项卡](https://developers.google.com/web/updates/2017/04/devtools-release-notes#coverage)披露JS（及CSS）覆盖率，并在Sources面板中高亮标注未被使用的代码。

![DevTools Coverage面板中的块覆盖率。覆盖的行以绿色高亮，未覆盖的以红色高亮。](/_img/javascript-code-coverage/block-coverage.png)

感谢[Benjamin Coe](https://twitter.com/BenjaminCoe)，现在也有关于将V8的代码覆盖信息集成到流行的[Istanbul.js](https://istanbul.js.org/)代码覆盖工具中的[进行中](https://github.com/bcoe/c8)工作。

![基于V8覆盖数据的Istanbul.js报告。](/_img/javascript-code-coverage/istanbul.png)

### 针对嵌入者

嵌入者和框架作者可以直接挂接到Inspector API以获得更大的灵活性。V8提供了两种不同的覆盖模式：

1. _尽力覆盖_以最小的运行时性能影响收集覆盖信息，但可能丢失垃圾回收（GC）函数的数据。

2. _精确覆盖_确保没有数据因GC丢失，用户可以选择接收执行次数而非二进制覆盖信息；但性能可能由于开销增加而受到影响（详见下一部分）。精确覆盖可以以函数或块粒度收集。

用于精确覆盖的Inspector API如下：

- [`Profiler.startPreciseCoverage(callCount, detailed)`](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#method-startPreciseCoverage) 启用覆盖收集，可选择启用调用次数（vs.二进制覆盖）和块粒度（vs.函数粒度）；

- [`Profiler.takePreciseCoverage()`](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#method-takePreciseCoverage) 返回收集的覆盖信息，作为源范围列表以及相关的执行次数；

- [`Profiler.stopPreciseCoverage()`](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#method-stopPreciseCoverage) 禁用收集并释放相关数据结构。

通过Inspector协议的对话可能是这样的：

```json
// 嵌入者指示V8开始收集精确覆盖率。
{ "id": 26, "method": "Profiler.startPreciseCoverage",
            "params": { "callCount": false, "detailed": true }}
// 嵌入者请求覆盖数据（自上次请求后的差异）。
{ "id": 32, "method":"Profiler.takePreciseCoverage" }
// 回复包含嵌套的源范围集合。
{ "id": 32, "result": { "result": [{
  "functions": [
    {
      "functionName": "fib",
      "isBlockCoverage": true,    // 块粒度。
      "ranges": [ // 一组嵌套范围数组。
        {
          "startOffset": 50,  // 字节偏移量，包含。
          "endOffset": 224,   // 字节偏移量，不包含。
          "count": 1
        }, {
          "startOffset": 97,
          "endOffset": 107,
          "计数": 0
        }, {
          "起始偏移": 134,
          "结束偏移": 144,
          "计数": 0
        }, {
          "起始偏移": 192,
          "结束偏移": 223,
          "计数": 0
        },
      ]},
      "脚本ID": "199",
      "URL": "file:///coverage-fib.html"
    }
  ]
}}

// 最后，嵌入器指示V8结束收集并释放相关数据结构。
//
{"id":37,"method":"Profiler.stopPreciseCoverage"}
```

类似地，可以使用[`Profiler.getBestEffortCoverage()`](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#method-getBestEffortCoverage)获取最佳努力覆盖率。

## 背后的工作原理

如前一节所述，V8支持两种主要的代码覆盖模式：最佳努力覆盖和精确覆盖。继续阅读以概述其实现。

### 最佳努力覆盖

最佳努力和精确覆盖模式都大幅度重用V8的其他机制，首先是称为_调用计数器_的机制。每次通过V8的[Ignition](/blog/ignition-interpreter)解释器调用函数时，我们会[增加函数的调用计数器](https://cs.chromium.org/chromium/src/v8/src/builtins/x64/builtins-x64.cc?l=917&rcl=fc33dfbebfb1cb800d490af97bf1019e9d66be33)（在其[反馈向量](http://slides.com/ripsawridge/deck)上）。因为函数在变热并在优化编译器中提升时，这个计数器用于指导内联决策，决定哪些函数要内联；现在，我们还依赖它来报告代码覆盖。

第二个重用机制确定函数的源代码范围。报告代码覆盖时，调用计数需要与源文件中的相关范围关联。例如，在下面的示例中，我们不仅需要报告函数`f`被准确调用过一次，还需要报告`f`的源代码范围从第1行开始到第3行结束。

```js
function f() {
  console.log('Hello World');
}

f();
```

再次幸运的是，我们能够重用V8中的现有信息。由于[`Function.prototype.toString`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/toString)，函数已经知道其源代码中的起始位置和结束位置，因为它需要知道函数在源文件中的位置从而提取合适的子字符串。

收集最佳努力覆盖时，这两个机制简单地结合在一起：我们首先通过遍历整个堆找到所有活动函数。对于每个看到的函数，我们报告其调用计数（存储在反馈向量中，通过函数可以访问）和源代码范围（方便地存储在函数自身）。

需要注意的是，由于调用计数无论是否启用覆盖率都会维护，因此最佳努力覆盖不会引入任何运行时开销。它也不使用专用的数据结构，因此既不需要显式启用也不需要显式禁用。

那么为什么这种模式被称为最佳努力模式呢，它有哪些限制？超出作用域的函数可能被垃圾收集器释放。这意味着相关的调用计数会丢失，实际上我们完全忘记这些函数曾经存在。因此‘最佳努力’：即使我们努力做到最好，收集的覆盖信息可能仍然不完整。

### 精确覆盖（函数粒度）

与最佳努力模式相比，精确覆盖确保提供的覆盖信息是完整的。为了实现这一点，一旦启用精确覆盖，我们将所有反馈向量添加到V8的引用根集合，防止它们被垃圾收集器收集。这虽然确保了信息不丢失，但通过人工保留对象增加了内存消耗。

精确覆盖模式还可以提供执行计数。这为精确覆盖的实现增加了另一层皱折。回想一下，每次通过V8的解释器调用函数时，调用计数器都会增加，并且函数在变热后可以提升并被优化。但是优化后的函数不再增加其调用计数器，因此必须禁用优化编译器才能保证它们的报告执行计数保持准确。

### 精确覆盖（块粒度）

块粒度覆盖必须报告到表达式级别的正确覆盖。例如，在以下代码段中，块覆盖可以检测到条件表达式的`else`分支从未被执行，而函数粒度覆盖仅知道整个函数`f`是被覆盖的。

```js
function f(a) {
  return a ? b : c;
}

f(true);
```

您可能还记得在前面的部分中，我们已经在V8中拥有了函数调用计数和源代码范围的功能。不幸的是，这对于代码块覆盖率并不适用，因此我们不得不实施新的机制来收集执行计数以及它们对应的源代码范围。

第一个方面是源代码范围：假设我们有一个特定代码块的执行计数，如何将其映射到源代码的一部分？为此，我们需要在解析源代码文件时收集相关位置。在代码块覆盖率之前，V8已经在某种程度上这样做了。例如，由于上文描述的 `Function.prototype.toString`，V8会收集函数范围。另一个例子是源代码位置被用来构建 `Error` 对象的回溯。但这两种情况都不足以支持代码块覆盖率；前者仅适用于函数，而后者仅存储位置（例如 `if`\-`else` 语句中 `if` 标记的位置），而不存储源代码范围。

因此，我们不得不扩展解析器以收集源代码范围。举个例子，考虑以下 `if`-`else` 语句：

```js
if (cond) {
  /* Then 分支。 */
} else {
  /* Else 分支。 */
}
```

当开启代码块覆盖率时，我们会[收集](https://cs.chromium.org/chromium/src/v8/src/parsing/parser-base.h?l=5199&rcl=cd23cae9edc134ecfe16a4868266dcf5ec432cbf) `then` 和 `else` 分支的源代码范围，并将它们与解析后的 `IfStatement` AST 节点关联。对其他相关的语言结构也采取了类似操作。

在解析过程中收集源代码范围后，第二个重点是在运行时跟踪执行计数。这是通过在生成的字节码数组中的战略位置[插入](https://cs.chromium.org/chromium/src/v8/src/interpreter/control-flow-builders.cc?l=207&rcl=cd23cae9edc134ecfe16a4868266dcf5ec432cbf)一个新的专用 `IncBlockCounter` 字节码完成的。在运行时，`IncBlockCounter` 字节码处理器会简单地[递增](https://cs.chromium.org/chromium/src/v8/src/runtime/runtime-debug.cc?l=2012&rcl=cd23cae9edc134ecfe16a4868266dcf5ec432cbf)适当的计数器（通过函数对象可访问）。

在上述 `if`-`else` 语句的例子中，这种字节码会插入在三个位置：`then` 分支的主体之前，`else` 分支的主体之前，以及 `if`-`else` 语句之后（由于分支可能存在非局部控制的情况，因此需要这样的继续计数器）。

最后，代码块粒度的覆盖率报告方式类似于函数粒度的报告。但除了调用次数（来自反馈向量），我们现在还报告一组 _有趣的_ 源代码范围及其代码块计数（存储在一个辅助数据结构中，并挂载在函数对象上）。

如果您想了解更多关于 V8 中代码覆盖率的技术细节，请参阅 [覆盖率](https://goo.gl/WibgXw) 和 [代码块覆盖率](https://goo.gl/hSJhXn) 设计文档。

## 结论

我们希望您喜欢这个关于 V8 原生代码覆盖率支持的简短介绍。请尝试使用它，并不要犹豫告诉我们它对您有效的地方以及无效的地方。在 Twitter 上打个招呼（[@schuay](https://twitter.com/schuay) 和 [@hashseed](https://twitter.com/hashseed)），或者在 [crbug.com/v8/new](https://crbug.com/v8/new) 提交一个问题。

在 V8 中实现覆盖率支持是一项团队合作，并感谢所有为此做出贡献的人：Benjamin Coe, Jakob Gruber, Yang Guo, Marja Hölttä, Andrey Kosyakov, Alexey Kozyatinksiy, Ross McIlroy, Ali Sheikh, Michael Starzinger。谢谢！
