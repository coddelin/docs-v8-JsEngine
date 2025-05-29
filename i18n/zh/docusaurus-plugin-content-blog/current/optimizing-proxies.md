---
title: '优化 V8 中的 ES2015 代理'
author: 'Maya Armyanova（[@Zmayski](https://twitter.com/Zmayski)），代理优化师'
avatars:
  - 'maya-armyanova'
date: 2017-10-05 13:33:37
tags:
  - ECMAScript
  - 基准测试
  - 内部机制
description: '本文解释了 V8 如何提升 JavaScript 代理的性能。'
tweet: '915846050447003648'
---
代理自 ES2015 起便成为 JavaScript 的重要组成部分。它们允许拦截对象的基本操作并自定义其行为。代理是 [jsdom](https://github.com/tmpvar/jsdom) 和 [Comlink RPC 库](https://github.com/GoogleChrome/comlink) 等项目的核心部分。最近，我们在提升 V8 中代理的性能方面投入了不少精力。本文将介绍 V8 的总体性能改进模式，并特别说明针对代理的改进。

<!--truncate-->
代理是“用于定义基本操作（如属性查找、赋值、枚举、函数调用等）的自定义行为的对象”（[MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy) 的定义）。更多信息可参考[完整规范](https://tc39.es/ecma262/#sec-proxy-objects)。例如，以下代码段为对象的每次属性访问添加了日志记录：

```js
const target = {};
const callTracer = new Proxy(target, {
  get: (target, name, receiver) => {
    console.log(`get 被调用: ${name}`);
    return target[name];
  }
});

callTracer.property = 'value';
console.log(callTracer.property);
// get 被调用: property
// value
```

## 构建代理

我们关注的第一个特性是代理的 **构建**。我们最初的 C++ 实现严格遵循 ECMAScript 规范，导致在 C++ 和 JS 运行时之间至少需要 4 次切换，如下图所示。我们想将此实现移植到与平台无关的 [CodeStubAssembler](/docs/csa-builtins)（CSA）中，它在 JS 运行时执行，而不是 C++ 运行时。这样可以最大限度地减少语言运行时之间的切换次数。`CEntryStub` 和 `JSEntryStub` 表示下图中的运行时。虚线表示 JS 和 C++ 运行时之间的边界。幸运的是，汇编器中已经实现了许多 [辅助谓词](https://github.com/v8/v8/blob/4e5db9a6c859df7af95a92e7cf4e530faa49a765/src/code-stub-assembler.h)，这使得[初始版本](https://github.com/v8/v8/commit/f2af839b1938b55b4d32a2a1eb6704c49c8d877d#diff-ed49371933a938a7c9896878fd4e4919R97) 简洁且可读。

下图显示了为任意代理陷阱（例如 `apply`，当代理作为函数使用时触发）调用代理的执行流程，以下示例代码生成：

```js
function foo(…) { … }
const g = new Proxy({ … }, {
  apply: foo,
});
g(1, 2);
```

![](/_img/optimizing-proxies/0.png)

将陷阱执行移植到 CSA 后，所有执行都发生在 JS 运行时中，从而将语言之间的切换次数从 4 次减少到 0 次。

此更改带来了以下性能改进：

![](/_img/optimizing-proxies/1.png)

我们的 JS 性能评分显示了 **49% 至 74%** 的提升。该评分大致衡量了在 1000ms 内给定微基准测试可以执行的次数。对于某些测试代码，会运行多次以获得足够准确的计时结果。以下所有基准测试的代码可在 [我们的 js-perf-test 目录](https://github.com/v8/v8/blob/5a5783e3bff9e5c1c773833fa502f14d9ddec7da/test/js-perf-test/Proxies/proxies.js) 中找到。

## 调用和构造陷阱

下一部分展示了优化调用和构造陷阱（又名 [`"apply"`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/apply) 和 [`"construct"`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/construct)）后的结果。

![](/_img/optimizing-proxies/2.png)

在调用代理时，性能改进显著 —— 提高了最多 **500%**！然而，对于代理构造的性能改进相对较小，特别是在未定义实际陷阱（trap）的情况下，仅约 **25%** 的提升。我们通过以下命令和 [`d8` shell](/docs/build) 进行了调查：

```bash
$ out/x64.release/d8 --runtime-call-stats test.js
> 运行时间: 120.104000

                      运行时函数/C++ 内建       时间            次数
========================================================================================
                                         NewObject     59.16ms  48.47%    100000  24.94%
                                      JS_执行     23.83毫秒  19.53%         1   0.00%
                              同步重新编译     11.68毫秒   9.57%        20   0.00%
                        访问器名称获取回调函数     10.86毫秒   8.90%    100000  24.94%
      访问器名称获取回调函数_FunctionPrototype      5.79毫秒   4.74%    100000  24.94%
                                  映射_SetPrototype      4.46毫秒   3.65%    100203  25.00%
… 段落省略 …
```

`test.js` 的源代码如下：

```js
function MyClass() {}
MyClass.prototype = {};
const P = new Proxy(MyClass, {});
function run() {
  return new P();
}
const N = 1e5;
console.time('run');
for (let i = 0; i < N; ++i) {
  run();
}
console.timeEnd('run');
```

结果表明，大部分时间花费在调用 `新建对象` 以及其调用的函数中，因此我们开始计划在未来的版本中优化这一部分。

## 获取陷阱

下一部分描述了我们如何优化使用代理对象获取和设置属性的常见操作。事实证明，对[`get`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/get) 跟踪器的优化比之前的情况更复杂，因为 V8 的内联缓存具有特定的行为。关于内联缓存的详细解释，可以观看 [此演讲](https://www.youtube.com/watch?v=u7zRSm8jzvA)。

最终，我们成功将这部分移植到 CSA 中，取得了以下结果：

![](/_img/optimizing-proxies/3.png)

在修改发布后，我们注意到 Chrome 的 Android `.apk` 文件大小增加了 **~160KB**，这比一个大约 20 行的辅助函数预期的增长还多，但幸好我们跟踪了这样的统计数据。问题在于这个函数被另一个函数调用了两次，而这个函数又被另一个调用了 3 次，最后被另一个调用了 4 次。问题的根源在于激进的内联优化。最终我们通过将内联函数转换为单独的代码存根来解决问题，从而节省了宝贵的 KB——最终版本中 `.apk` 文件大小仅增加了 **~19KB**。

## 检查陷阱

下一部分展示了优化 [`has`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/has) 陷阱的结果。起初，我们以为这会更容易（并复用大部分 `get` 陷阱的代码），但事实证明它有自己的特点。一个特别难以追踪的问题是使用 `in` 操作符时导致的原型链查找。优化的结果提高了 **71% 到 428%**，并且陷阱存在时增益更明显。

![](/_img/optimizing-proxies/4.png)

## 设置陷阱

接下来的部分讨论将 [`set`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/set) 陷阱移植的过程。这次我们需要区分[命名](https://v8.dev/blog/fast-properties)和索引属性（[元素](https://v8.dev/blog/elements-kinds)）。这两种主要类型不是 JS 语言的部分，但对 V8 高效的属性存储至关重要。初始实现仍然在处理元素时回到运行时，这导致再次跨越语言边界。尽管如此，对于设置了陷阱的情况，性能提高了 **27% 到 438%**，但代价是未设置陷阱的情况下性能下降了最多 **23%**。这种性能回归是因为新增的区分索引和命名属性的额外检查所带来的开销。对于索引属性，目前还没有改进。以下是完整的结果：

![](/_img/optimizing-proxies/5.png)

## 真实场景中的使用

### [jsdom-proxy-benchmark](https://github.com/domenic/jsdom-proxy-benchmark) 的结果

jsdom-proxy-benchmark 项目使用 [Ecmarkup](https://github.com/bterlson/ecmarkup) 工具编译[ECMAScript 规范](https://github.com/tc39/ecma262)。从 [v11.2.0](https://github.com/tmpvar/jsdom/blob/master/Changelog.md#1120) 开始，jsdom 项目（Ecmarkup 的底层）使用代理实现了常见的数据结构 `NodeList` 和 `HTMLCollection`。我们使用这个基准测试来全面了解比合成微基准更为实际的使用场景，并取得了以下结果（100 次运行的平均值）：

- Node v8.4.0（无 Proxy 优化）：**14277 ± 159 毫秒**
- [Node v9.0.0-v8-canary-20170924](https://nodejs.org/download/v8-canary/v9.0.0-v8-canary20170924898da64843/node-v9.0.0-v8-canary20170924898da64843-linux-x64.tar.gz)（仅实现了一半的陷阱端口移植）：**11789 ± 308 毫秒**
- 加速约 2.4 秒，相当于**~17% 的改进**

![](/_img/optimizing-proxies/6.png)

- [将 `NamedNodeMap` 转换为使用 `Proxy`](https://github.com/domenic/jsdom-proxy-benchmark/issues/1#issuecomment-329047990) 增加的处理时间：
    - **1.9 秒**（V8 6.0，Node v8.4.0）
    - **0.5 秒**（V8 6.3，Node v9.0.0-v8-canary-20170910）

![](/_img/optimizing-proxies/7.png)

:::note
**注意:** 这些结果由 [Timothy Gu](https://github.com/TimothyGu) 提供。感谢！
:::

### 来自 [Chai.js](https://chaijs.com/) 的结果

Chai.js 是一个流行的断言库，广泛使用了代理。我们通过运行其测试并使用不同版本的 V8 创建了一种真实场景基准测试，平均运行 100 次，改进了大约 **4 秒中的 1 秒**:

- Node v8.4.0 (没有代理优化): **4.2863 ± 0.14 秒**
- [Node v9.0.0-v8-canary-20170924](https://nodejs.org/download/v8-canary/v9.0.0-v8-canary20170924898da64843/node-v9.0.0-v8-canary20170924898da64843-linux-x64.tar.gz) (仅移植了部分捕获): **3.1809 ± 0.17 秒**

![](/_img/optimizing-proxies/8.png)

## 优化方案

我们通常通过一种通用优化方案来解决性能问题。我们对此特定工作的主要方法包括以下步骤:

- 为特定子功能实现性能测试
- 添加更多符合规范的测试 (或从头开始编写)
- 调查原始的 C++ 实现
- 将子功能移植到与平台无关的 CodeStubAssembler
- 通过手工优化实现 [TurboFan](/docs/turbofan) 方案进一步优化代码
- 衡量性能提升。

此方法可以应用于您可能面临的任何通用优化任务。
