---
title: "V8 发布 v7.8"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))，懒惰的源代码术士"
avatars: 
  - "ingvar-stepanyan"
date: 2019-09-27
tags: 
  - 发布
description: "V8 v7.8 的功能包括在预加载时的流式编译、WebAssembly C API、更快的对象解构和正则表达式匹配，以及改进的启动时间。"
tweet: "1177600702861971459"
---
每六周，我们会根据我们的[发布流程](/docs/release-process)创建一个新的 V8 分支。每个版本都是在 Chrome Beta 里程碑之前，从 V8 的 Git 主分支直接分离而来的。今天，我们很高兴宣布最新的分支[V8 版本 7.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.8)，该版本将处于 Beta 阶段，直到几周后与 Chrome 78 Stable 协同发布。V8 v7.8 包含各种面向开发者的改进。本文将预览一些亮点，以期待该版本发布。

<!--truncate-->
## JavaScript 性能（尺寸和速度）

### 在预加载时的脚本流式编译

您可能还记得[我们之前在 V8 v7.5 的脚本流式处理工作](/blog/v8-release-75#script-streaming-directly-from-network)，当时我们改进了背景编译以直接从网络读取数据。在 Chrome 78 中，我们将启用预加载期间的脚本流式处理。

之前，脚本流式处理是在 HTML 解析过程中遇到 `<script>` 标签时开始的，解析会因编译完成而暂停（对于普通脚本），或者脚本会在编译完成后开始执行（对于异步脚本）。这意味着对于这样的普通同步脚本：

```html
<!DOCTYPE html>
<html>
<head>
  <script src="main.js"></script>
</head>
...
```

…处理流程以前大致是这样的：

<figure>
  <img src="/_img/v8-release-78/script-streaming-0.svg" width="458" height="130" alt="" loading="lazy"/>
</figure>

由于同步脚本可以使用 `document.write()`，我们必须在看到 `<script>` 标签时暂停 HTML 的解析。因为编译是在遇到 `<script>` 标签时开始的，所以在解析 HTML 和实际运行脚本之间有一个很大的时间间隙，在此期间页面无法继续加载。

然而，我们在一个更早的阶段（扫描 HTML 时）就会遇到 `<script>` 标记，找到需要预加载的资源，所以实际流程更像是这样的：

<figure>
  <img src="/_img/v8-release-78/script-streaming-1.svg" width="600" height="130" alt="" loading="lazy"/>
</figure>

如果我们预加载一个 JavaScript 文件，我们最终会执行它，这是一个相对安全的假设。所以，自从 Chrome 76 开始，我们就一直在尝试预加载流处理，其中加载脚本也会开始编译它。

<figure>
  <img src="/_img/v8-release-78/script-streaming-2.svg" width="495" height="130" alt="" loading="lazy"/>
</figure>

更好的是，由于我们可以在脚本尚未加载完时开始编译，带有预加载流处理的处理流程实际上看起来更像是这样的：

<figure>
  <img src="/_img/v8-release-78/script-streaming-3.svg" width="480" height="217" alt="" loading="lazy"/>
</figure>

这意味着在某些情况下，我们可以将可感知的编译时间（从看到 `<script>` 标签到脚本开始执行的时间间隔）减少到零。在我们的实验中，这种可感知的编译时间平均下降了 5-20%。

最好的消息是，由于我们的试验基础设施，我们不仅能够在 Chrome 78 中默认启用这一功能，还可以在 Chrome 76 及以后的版本中为用户启用这一功能。

### 更快的对象解构

对象解构的形式是这样的…

```js
const {x, y} = object;
```

…几乎等同于解糖后的形式…

```js
const x = object.x;
const y = object.y;
```

…除了它还需要在 `object` 为 `undefined` 或 `null` 时抛出特殊错误…

```
$ v8 -e 'const object = undefined; const {x, y} = object;'
unnamed:1: TypeError: Cannot destructure property `x` of 'undefined' or 'null'.
const object = undefined; const {x, y} = object;
                                 ^
```

…而不是尝试引用 undefined 时会得到的普通错误：

```
$ v8 -e 'const object = undefined; object.x'
unnamed:1: TypeError: Cannot read property 'x' of undefined
const object = undefined; object.x
                                 ^
```

这个额外的检查使得解构比简单的变量赋值慢，如[通过 Twitter 向我们报告](https://twitter.com/mkubilayk/status/1166360933087752197)。

从 V8 v7.8 开始，对象解构的速度与等效的解糖后的变量赋值一样快（事实上，我们为两者生成了相同的字节码）。现在，与显式 `undefined`/`null` 检查不同，我们依赖在加载 `object.x` 时抛出的异常，并在解构时拦截该异常。

### 懒惰的源码位置

在从JavaScript编译字节码时，会生成源码位置表，将字节码序列与源代码中的字符位置联系起来。然而，这些信息仅在符号化异常或进行调试与性能分析等开发者任务时使用，因此大部分情况下是浪费的内存。

为避免这种情况，我们现在在编译字节码时不再收集源码位置（假设没有附加调试器或性能分析器）。只有在实际生成堆栈跟踪时（例如调用`Error.stack`或将异常的堆栈跟踪打印到控制台时），才会收集源码位置。这确实会产生一些开销，因为生成源码位置需要对函数重新解析和编译，但大多数网站在生产环境中不会符号化堆栈跟踪，因此不会看到任何显著的性能影响。在我们的实验室测试中，V8的内存使用量减少了1-2.5%。

![在AndroidGo设备上，延迟加载源码位置带来的内存节省](/_img/v8-release-78/memory-savings.svg)

### 更快的正则表达式匹配失败

通常，正则表达式通过在输入字符串中向前迭代并从每个位置检查是否匹配来尝试找到匹配。一旦当前位置接近字符串末尾且不可能有匹配时，V8现在（在大多数情况下）会停止尝试寻找新的匹配起点，而是快速返回匹配失败的结果。此优化适用于已编译和解释的正则表达式，并在匹配失败常见且任何成功匹配的最小长度相对于平均输入字符串长度较大的工作负载中提升了速度。

在JetStream 2中的UniPoker测试中（该工作受到其启发），V8 v7.8使所有迭代的平均得分提高了20%。

## WebAssembly

### WebAssembly C/C++ API

从v7.8开始，V8对[Wasm C/C++ API](https://github.com/WebAssembly/wasm-c-api)的实现从实验阶段升级为正式支持。它允许您在C/C++应用程序中使用V8的特殊构建作为WebAssembly执行引擎，而无需涉及JavaScript！有关更多详细信息和说明，请参阅[文档](https://docs.google.com/document/d/1oFPHyNb_eXg6NzrE6xJDNPdJrHMZvx0LqsD6wpbd9vY/edit)。

### 改善启动时间

从WebAssembly调用JavaScript函数或从JavaScript调用WebAssembly函数涉及执行一些包装代码，这些代码负责将函数的参数从一种表示形式转换为另一种。生成这些包装代码可能相当耗时：在[Epic ZenGarden演示](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html)中，生成包装代码占模块启动时间（编译 + 实例化）的约20%（在一台18核的Xeon机器上）。

在此次发布中，我们通过在多核机器上更好地利用后台线程来改善了这种情况。我们利用了最近在[缩放函数编译](/blog/v8-release-77#wasm-compilation)方面的努力，并将包装代码的编译集成到这一新的异步管道中。现在，包装代码的编译仅占Epic ZenGarden演示启动时间约8%（同样的机器上）。

## V8 API

请使用`git log branch-heads/7.7..branch-heads/7.8 include/v8.h`获取API更改的列表。

拥有[有效V8检出](/docs/source-code#using-git)的开发人员可以使用`git checkout -b 7.8 -t branch-heads/7.8`来尝试V8 v7.8中的新功能。或者，您可以[订阅Chrome的Beta频道](https://www.google.com/chrome/browser/beta.html)，并很快亲自尝试新功能。
