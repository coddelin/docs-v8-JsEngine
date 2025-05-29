---
title: "内置调用短化"
author: "[Toon Verwaest](https://twitter.com/tverwaes), 《大空头》"
avatars: 
  - toon-verwaest
date: 2021-05-06
tags: 
  - JavaScript
description: "在 V8 v9.1 中，我们暂时在桌面端取消了嵌入式内置，以避免由远间接调用引起的性能问题。"
tweet: "1394267917013897216"
---

在 V8 v9.1 中，我们暂时在桌面端禁用了[嵌入式内置](https://v8.dev/blog/embedded-builtins)。虽然嵌入内置显著改善了内存使用，但我们意识到嵌入内置与 JIT 编译代码之间的函数调用可能会带来可观的性能损失。这种成本取决于 CPU 的微架构。在这篇文章中，我们将解释为什么会发生这种情况、性能的表现如何以及我们计划从长期角度解决这个问题的方法。

<!--truncate-->
## 代码分配

V8 的即时编译器（JIT）生成的机器代码会动态分配到虚拟机拥有的内存页上。V8 会在一个连续地址空间区域内分配内存页，而这些区域本身要么随机分布在内存中（出于[地址空间布局随机化](https://en.wikipedia.org/wiki/Address_space_layout_randomization)的考虑），要么位于我们为[指针压缩](https://v8.dev/blog/pointer-compression)分配的 4 GiB 虚拟内存笼中。

V8 JIT 代码通常调用内置。这些内置本质上是作为虚拟机一部分提供的机器代码片段。有实现完整 JavaScript 标准库功能的内置，例如 [`Function.prototype.bind`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_objects/Function/bind)，但还有许多内置是填补 JS 高级语义与 CPU 低级能力之间空缺的辅助机器代码片段。例如，如果一个 JavaScript 函数要调用另一个 JavaScript 函数，函数实现通常会调用一个 `CallFunction` 的内置，它用来确定目标 JavaScript 函数应如何调用；例如，它是代理还是普通函数，它期望多少参数等等。由于这些代码片段在我们构建虚拟机时是已知的，它们被“嵌入”到 Chrome 二进制文件中，因此位于 Chrome 二进制代码区域内。

## 直接调用与间接调用

在 64 位架构上，包括这些内置的 Chrome 二进制文件与 JIT 代码之间的距离是任意的。在 [x86-64](https://en.wikipedia.org/wiki/X86-64) 指令集中，这意味着我们无法使用直接调用：它们使用一个 32 位带符号立即数作为调用地址的偏移量，目标可能距离超过 2 GiB。因此，我们需要依赖通过寄存器或内存操作数的间接调用。这种调用更依赖于预测，因为从调用指令本身无法立即看出调用的目标是什么。在 [ARM64](https://en.wikipedia.org/wiki/AArch64) 中，我们根本无法使用直接调用，因为范围限制为 128 MiB。这意味着在这两种情况下，我们都依赖于 CPU 的间接分支预测器的准确性。

## 间接分支预测限制

在针对 x86-64 时，依赖直接调用会很理想。它应该可以减轻间接分支预测器的压力，因为目标在解码指令后是已知的，同时也不需要将目标从常量或内存加载到寄存器中。但这不仅仅是机器代码中可见的显而易见的差异。

由于 [Spectre v2](https://googleprojectzero.blogspot.com/2018/01/reading-privileged-memory-with-side.html)，各种设备/操作系统组合已关闭间接分支预测。这意味着在这些配置中，依赖于 `CallFunction` 内置的 JIT 代码函数调用会产生非常高昂的停顿。

更重要的是，尽管 64 位指令集架构（CPU 的“高级语言”）支持对远地址的间接调用，但微架构可以自由实施具有任意局限性的优化。间接分支预测器似乎通常假定调用距离不超过某个距离（例如 4 GiB），以减少每次预测的内存需求。例如，[Intel 优化手册](https://www.intel.com/content/dam/www/public/us/en/documents/manuals/64-ia-32-architectures-optimization-manual.pdf) 明确指出：

> 对于 64 位应用程序，当分支目标距离分支超过 4 GB 时，分支预测性能可能会受到负面影响。

虽然在ARM64架构上直接调用的范围限制为128 MiB，但事实证明，[苹果的M1芯片](https://en.wikipedia.org/wiki/Apple_M1)在间接调用预测中也存在相同的微架构4 GiB范围限制。距离调用目标超过4 GiB的间接调用似乎总是被错误预测。由于M1特别大的[重排序缓冲区](https://en.wikipedia.org/wiki/Re-order_buffer)——CPU的一个组件，允许未来预测指令以推测方式乱序执行，频繁的错误预测会导致异常大的性能损失。

## 临时解决方案：复制内置函数

为了避免频繁错误预测的开销，并尽可能避免在x86-64架构上不必要地依赖分支预测，我们决定暂时将内置函数复制到V8的指针压缩空间中，适用于内存充足的桌面设备。这使得复制的内置代码靠近动态生成的代码。性能结果在很大程度上取决于设备配置，但以下是我们性能测试机器人的一些结果：

![从实时页面记录的浏览基准测试](/_img/short-builtin-calls/v8-browsing.svg)

![基准评分改善](/_img/short-builtin-calls/benchmarks.svg)

取消嵌入内置函数确实会使受影响设备的内存使用每个V8实例增加1.2到1.4 MiB。作为一种更好的长期解决方案，我们正在研究将JIT代码分配靠近Chrome二进制文件的方法。这样我们可以重新嵌入内置函数以恢复内存优势，同时额外改进从V8生成代码到C++代码的调用性能。
