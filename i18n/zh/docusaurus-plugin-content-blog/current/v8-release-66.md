---
title: "V8 发布 v6.6"
author: "V8 团队"
date: 2018-03-27 13:33:37
tags:
  - 发布
description: "V8 v6.6 包括可选的catch绑定、扩展的字符串修剪、多项解析/编译/运行时性能改进等等！"
tweet: "978534399938584576"
---
每六周，我们根据自己的[发布流程](/docs/release-process)创建一个新的 V8 分支。每个版本都基于 V8 的 Git 主分支，并与 Chrome Beta 里程碑同时分支。今天我们很高兴地宣布我们最新的分支，[V8 版本 6.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.6)，它将在几周后与 Chrome 66 稳定版一起发布并结束测试阶段。V8 v6.6 包含了各种面向开发者的有趣功能。本文提前介绍了一些亮点，敬请期待正式发布。

<!--truncate-->
## JavaScript 语言特性

### `Function.prototype.toString` 修订  #function-tostring

[`Function.prototype.toString()`](/features/function-tostring) 现在会返回源码文本的精确切片，包括空白和注释。以下是旧行为与新行为的对比示例：

```js
// 注意 `function` 关键字和函数名称之间的注释
// 以及函数名称之后的空格。
function /* 一个注释 */ foo () {}

// 之前：
foo.toString();
// → 'function foo() {}'
//             ^ 没有注释
//                ^ 没有空格

// 现在：
foo.toString();
// → 'function /* 注释 */ foo () {}'
```

### JSON ⊂ ECMAScript

行分隔符 (U+2028) 和段落分隔符 (U+2029) 符号现在在字符串字面量中是允许的，[与 JSON 匹配](/features/subsume-json)。以前，这些符号在字符串字面量中被视为行终止符，因此使用它们会导致 `SyntaxError` 异常。

### 可选的 `catch` 绑定

`try` 语句的 `catch` 子句现在可以[不带参数使用](/features/optional-catch-binding)。如果在处理异常的代码中不需要 `exception` 对象，此功能会很有用。

```js
try {
  doSomethingThatMightThrow();
} catch { // → 看妈妈，没有绑定！
  handleException();
}
```

### 单向字符串修剪

除了 `String.prototype.trim()` 之外，V8 现在实现了[`String.prototype.trimStart()` 和 `String.prototype.trimEnd()`](/features/string-trimming)。此功能之前通过非标准的 `trimLeft()` 和 `trimRight()` 方法可用，这些方法仍作为新方法的别名以保持向后兼容性。

```js
const string = '  hello world  ';
string.trimStart();
// → 'hello world  '
string.trimEnd();
// → '  hello world'
string.trim();
// → 'hello world'
```

### `Array.prototype.values`

[`Array.prototype.values()` 方法](https://tc39.es/ecma262/#sec-array.prototype.values) 使数组拥有与 ES2015 的 `Map` 和 `Set` 集合相同的迭代接口：现在都可以通过调用相同命名的方法 `keys`、`values` 或 `entries` 来进行迭代。此更改可能会与现有的 JavaScript 代码不兼容。如果您发现网站上有奇怪或不起作用的行为，请尝试通过 `chrome://flags/#enable-array-prototype-values` 禁用此功能并[提交问题](https://bugs.chromium.org/p/v8/issues/entry?template=Defect+report+from+user)。

## 执行后代码缓存

对于关注加载性能的人来说，术语 _冷加载_ 和 _热加载_ 可能已经很熟悉了。在 V8 中，还存在一个 _热负载_ 的概念。以下以 Chrome 嵌入 V8 为例解释不同的级别：

- **冷加载：** Chrome 第一次看到访问的网页，完全没有任何数据缓存。
- **热加载：** Chrome 记得已经访问过该网页，可以从缓存中检索某些资产（例如图像和脚本源文件）。V8 识别此页面已经提供了相同的脚本文件，并因此将编译后的代码与脚本文件一起缓存到磁盘缓存中。
- **热负载：** Chrome 第三次访问该网页时，在从磁盘缓存提供脚本文件时，还会向 V8 提供之前加载期间缓存的代码。V8 可以使用此缓存的代码来避免重新解析和编译脚本。

在 V8 v6.6 之前，我们在顶层编译后会立即缓存生成的代码。V8 仅编译在顶层编译时已知会立即执行的函数，并将其他函数标记为惰性编译。这意味着缓存的代码只包括顶层代码，而所有其他函数都需要在每次页面加载时从头开始惰性编译。从版本 6.6 开始，V8 开始缓存脚本顶层执行后生成的代码。随着脚本的执行，更多函数被惰性编译并可以被包含在缓存中。这样，这些函数在未来页面加载时不需要再次编译，从而减少了热点加载场景中的编译和解析时间的 20-60%。用户可见的变化是主线程负载减少，从而体验更流畅更快的加载。

请留意即将发布的关于此主题的详细博客文章。

## 背景编译

一段时间以来，V8 已能够[在后台线程解析 JavaScript 代码](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html)。随着去年发布的 V8 的新 [Ignition 字节码解释器](/blog/launching-ignition-and-turbofan)，我们能够扩展支持以启用在后台线程上的 JavaScript 源代码到字节码的编译。这使嵌入程序能够在主线程之外完成更多工作，从而释放主线程来执行更多 JavaScript 并减少卡顿。我们在 Chrome 66 中启用了此功能，我们发现典型网站上的主线程编译时间减少了 5% 到 20%。欲了解更多详细信息，请查阅[最近关于此功能的博客文章](/blog/background-compilation)。

## AST 编号的移除

在去年的 [Ignition 和 TurboFan 发布](/blog/launching-ignition-and-turbofan)之后，我们继续从简化编译管道中获益。我们的旧管道需要一个称为“AST 编号”的解析后阶段，其中为生成的抽象语法树中的节点编号，以使使用它的各种编译器有一个共同的参考点。

随着时间的推移，这个后处理过程已膨胀到包含其他功能：为生成器和异步函数编号挂起点，收集内部函数以进行快速编译，初始化文字或检测不可优化的代码模式。

使用新的管道，Ignition 字节码成为共同的参考点，编号本身已不再需要——但剩余的功能仍然是必要的，因此 AST 编号过程仍然存在。

在 V8 v6.6 中，我们最终设法[将这些剩余功能迁移或弃用](https://bugs.chromium.org/p/v8/issues/detail?id=7178)到其他处理过程中，从而使我们能够移除此树的遍历。这带来了一定的真实世界编译时间 3-5% 的性能提升。

## 异步性能改进

我们设法为 promise 和异步函数实现了一些性能改进，尤其是缩小了异步函数与取消语法化的 promise 链之间的差距。

![Promise 性能改进](/_img/v8-release-66/promise.svg)

此外，异步生成器和异步迭代的性能也显著提高，使它们成为即将发布的 Node 10 LTS（包括 V8 v6.6）中的一个可行选项。例如，以下是斐波那契数列的实现：

```js
async function* fibonacciSequence() {
  for (let a = 0, b = 1;;) {
    yield a;
    const c = a + b;
    a = b;
    b = c;
  }
}

async function fibonacci(id, n) {
  for await (const value of fibonacciSequence()) {
    if (n-- === 0) return value;
  }
}
```

我们已测量了此模式在 Babel 转译之前和之后的以下改进：

![异步生成器性能改进](/_img/v8-release-66/async-generator.svg)

最后，针对生成器、异步函数和模块等“可暂停函数”的[字节码改进](https://chromium-review.googlesource.com/c/v8/v8/+/866734)提高了这些函数在解释器中运行的性能，并减少了它们的编译大小。我们计划在即将发布的版本中进一步提高异步函数和异步生成器的性能，请密切关注。

## 数组性能改进

`Array#reduce` 对稀疏双数组的吞吐性能提升了 10 倍以上（[有关稀疏和紧凑数组的解释，请参阅我们的博客文章](/blog/elements-kinds)）。这使得在对稀疏和紧凑双数组应用 `Array#reduce` 时的快速路径更加宽阔。

![`Array.prototype.reduce` 性能改进](/_img/v8-release-66/array-reduce.svg)

## 不可信代码的缓解措施

在 V8 v6.6 中，我们已完成[更多侧信道漏洞的缓解措施](/docs/untrusted-code-mitigations)，以防止信息泄漏给不可信的 JavaScript 和 WebAssembly 代码。

## 移除 GYP

这是第一个正式发布没有 GYP 文件的 V8 版本。如果您的产品需要已删除的 GYP 文件，您需要将它们复制到自己的源代码仓库中。

## 内存分析

Chrome 的开发者工具现在可以追踪和快照 C++ DOM 对象，并显示从 JavaScript 中可到达的所有 DOM 对象及其引用。这项功能是 V8 垃圾收集器新 C++ 追踪机制的优势之一。更多信息请查阅[专门的博客文章](/blog/tracing-js-dom)。

## V8 API

请使用 `git log branch-heads/6.5..branch-heads/6.6 include/v8.h` 获取 API 更改的列表。
