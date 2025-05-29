---
title: '自定义启动快照'
author: '杨国（[@hashseed](https://twitter.com/hashseed)），软件工程师和引擎预热供应商'
avatars:
  - 'yang-guo'
date: 2015-09-25 13:33:37
tags:
  - 内部结构
description: 'V8 嵌入者可以利用快照来跳过初始化 JavaScript 程序带来的启动时间。'
---
JavaScript 规范中包含了许多内置功能，从[数学函数](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Math)到一个[功能齐全的正则表达式引擎](https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions)。每个新创建的 V8 上下文从一开始就可以使用这些功能。为了实现这一点，全局对象（例如浏览器中的 window 对象）和所有内置功能必须在创建上下文时设置并初始化到 V8 的堆中。从头开始执行这些操作需要相当多的时间。

<!--truncate-->
幸运的是，V8 使用了一种加速的捷径：就像为快速晚餐解冻冷冻披萨一样，我们将之前准备好的快照反序列化直接到堆中，从而获得一个已初始化的上下文。在普通桌面计算机上，这可以将创建上下文的时间从 40 毫秒缩短到不到 2 毫秒。在普通手机上，这可能意味着从 270 毫秒减少到 10 毫秒的区别。

除了 Chrome 之外，其他嵌入 V8 的应用程序可能需要比标准 JavaScript 更多的功能。许多应用程序在启动时会加载额外的库脚本，然后再运行“实际”的应用程序。例如，一个简单的基于 V8 的 TypeScript 虚拟机需要在启动时加载 TypeScript 编译器，以便即时将 TypeScript 源代码翻译为 JavaScript。

自两个月前发布的 V8 v4.3 起，嵌入者可以利用快照技术跳过此类初始化花费的启动时间。这个[测试用例](https://chromium.googlesource.com/v8/v8.git/+/4.5.103.9/test/cctest/test-serialize.cc#661)展示了该 API 的工作原理。

要创建快照，我们可以调用 `v8::V8::CreateSnapshotDataBlob`，其中嵌入的脚本以 null 结尾的 C 字符串形式提供。在创建新上下文后，该脚本会被编译并执行。在我们的示例中，我们创建了两个自定义启动快照，每个快照都在 JavaScript 已经内置的功能之上定义了一些函数。

然后我们可以使用 `v8::Isolate::CreateParams` 来配置新创建的隔离环境，使其从自定义启动快照中初始化上下文。在该隔离环境中创建的上下文是我们生成快照时的上下文的精确副本。快照中定义的函数无需再次定义即可使用。

对此，有一个重要限制：快照只能捕获 V8 的堆。在创建快照时，V8 与外部的任何交互都是禁止的。这些交互包括：

- 定义和调用 API 回调（即通过 `v8::FunctionTemplate` 创建的函数）
- 创建类型化数组，因为其底层存储可能分配在 V8 之外

当然，像 `Math.random` 或 `Date.now` 这样的值在捕获快照后是固定的。它们不再是真正的随机值或反映当前时间。

尽管有这些限制，启动快照仍然是节省初始化时间的有效方法。在上述示例中，我们可以减少加载 TypeScript 编译器时花费的 100 毫秒启动时间（在普通桌面计算机上）。我们期待看到您如何利用自定义快照！
