---
title: "后台编译"
author: "[Ross McIlroy](https://twitter.com/rossmcilroy)，主线程维护者"
avatars: 
  - "ross-mcilroy"
date: "2018-03-26 13:33:37"
tags: 
  - 内部构造
description: "从Chrome 66开始，V8在后台线程上编译JavaScript源代码，减少主线程上编译时间5%到20%，适用于典型网站."
tweet: "978319362837958657"
---
简要说明: 从Chrome 66开始，V8在后台线程上编译JavaScript源代码，减少主线程上编译时间5%到20%，适用于典型网站。

## 背景

从版本41开始，Chrome通过V8的[`StreamedSource`](https://cs.chromium.org/chromium/src/v8/include/v8.h?q=StreamedSource&sq=package:chromium&l=1389)API支持在后台线程解析JavaScript源文件（[参考](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html)）。这使得V8能够在Chrome从网络下载文件的第一部分时就开始解析JavaScript源代码，同时在Chrome通过网络流式传输文件时继续解析。由于V8在文件下载完成时几乎能够完成JavaScript解析，这提供了显著的加载时间改进。

<!--truncate-->
然而，由于V8原始基线编译器的限制，V8仍然需要返回主线程以完成解析并将脚本编译为可以执行脚本代码的JIT机器码。随着切换到新的[Ignition + TurboFan流水线](/blog/launching-ignition-and-turbofan)，我们现在能够将字节码编译移到后台线程，从而解放Chrome的主线程以提供更顺畅、更响应迅速的网页浏览体验。

## 构建后台线程字节码编译器

V8的Ignition字节码编译器以解析器生成的[抽象语法树 (AST)](https://en.wikipedia.org/wiki/Abstract_syntax_tree)为输入，生成字节码流 (`BytecodeArray`)以及相关的元数据，使Ignition解释器能够执行JavaScript源代码。

![](/_img/background-compilation/bytecode.svg)

Ignition的字节码编译器是为多线程构建的，但为了实现后台编译，需要对整个编译管道进行一些更改。主要更改之一是防止编译管道在后台线程运行时访问V8的JavaScript堆中的对象。由于JavaScript是单线程的，V8的堆对象不是线程安全的，并可能在后台编译期间被主线程或V8的垃圾回收器修改。

编译管道中有两个主要阶段会访问V8堆中的对象：AST内部化和字节码最终化。AST内部化是指在AST中标识的字面对象（字符串、数字、对象字面语法模板等）被分配到V8堆中，以便这些对象可以在脚本执行时直接被生成的字节码使用。此过程传统上是在解析器构建AST后立即发生的。因此，编译管道后续阶段依赖于这些字面对象已被分配。为了实现后台编译，我们将AST内部化移到编译管道后期，也就是字节码编译完成之后。这要求对管道后期阶段进行修改，使其访问嵌入在AST中的原始字面值，而不是堆内的内部化值。

字节码最终化涉及构建用于执行函数的最终`BytecodeArray`对象以及相关的元数据，例如存储字节码引用的常量池数组 (`ConstantPoolArray`)和将JavaScript源代码行和列号映射到字节码偏移量的`SourcePositionTable`。由于JavaScript是一种动态语言，这些对象都需要存储在JavaScript堆中，以便在与字节码关联的JavaScript函数被回收时可以进行垃圾回收。以前有些元数据对象会在字节码编译期间分配和修改，这涉及访问JavaScript堆。为了实现后台编译，Ignition的字节码生成器被重构，以便跟踪这些元数据的详细信息，并将它们分配到JavaScript堆中直到编译最后阶段。

通过这些更改，几乎所有脚本的编译都可以移到后台线程，只有短暂的AST内部化和字节码最终化步骤发生在主线程上，并且是在脚本执行之前。

![](/_img/background-compilation/threads.svg)

目前，仅顶层脚本代码和立即调用的函数表达式（IIFEs）会在后台线程上编译 - 内部函数仍然会在主线程上懒编译（首次执行时）。我们希望未来能将后台编译扩展到更多场景。然而，即使有这些限制，后台编译仍能让主线程腾出更多时间进行其他工作，例如响应用户交互、渲染动画或提供更流畅、更灵敏的体验。

## 结果

我们使用 [真实世界性能测试框架](/blog/real-world-performance) 在一组热门网页上评估了后台编译的性能。

![](/_img/background-compilation/desktop.svg)

![](/_img/background-compilation/mobile.svg)

能在后台线程上进行的编译比例取决于顶层流式脚本编译期间的字节码编译比例与作为内部函数调用时的懒编译比例（必须仍在主线程上发生）。因此，主线程节省的时间比例会有所不同，大多数页面的主线程编译时间减少了5%到20%。

## 下一步

比在后台线程上编译脚本更好的是什么？完全不需要编译脚本！除了后台编译，我们还致力于改进 V8 的 [代码缓存系统](/blog/code-caching)，以扩大 V8 缓存的代码量，从而加快您常访问网站的页面加载速度。我们希望能尽快带来这方面的更新，请持续关注！
