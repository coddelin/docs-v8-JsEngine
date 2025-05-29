---
title: "增强版 V8，支持可变堆数字"
author: "[Victor Gomes](https://twitter.com/VictorBFG)，位移大师"
avatars:
  - victor-gomes
date: 2025-02-25
tags:
  - JavaScript
  - 基准测试
  - 内部机制
description: "向脚本上下文添加可变堆数字"
tweet: ""
---

在 V8 中，我们始终致力于提升 JavaScript 性能。作为此项工作的一个部分，我们最近重新审视了 [JetStream2](https://browserbench.org/JetStream2.1/) 基准测试套件，以消除性能瓶颈。本篇文章详细介绍了我们进行的一项优化，该优化使 `async-fs` 基准测试的性能提升了显著的 `2.5 倍`，并对整体得分产生了显著影响。这项优化源于基准测试，但类似的模式确实存在于 [真实代码](https://github.com/WebAssembly/binaryen/blob/3339c1f38da5b68ce8bf410773fe4b5eee451ab8/scripts/fuzz_shell.js#L248)中。

<!--truncate-->
# 目标 `async-fs` 和一种特殊的 `Math.random`

`async-fs` 基准测试，如其名字所示，是一个 JavaScript 文件系统实现，专注于异步操作。然而，存在一个令人惊讶的性能瓶颈：`Math.random` 的实现。它使用了一个自定义的确定性 `Math.random` 实现，以确保每次运行结果一致。其实现如下：

```js
let seed;
Math.random = (function() {
  return function () {
    seed = ((seed + 0x7ed55d16) + (seed << 12))  & 0xffffffff;
    seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
    seed = ((seed + 0x165667b1) + (seed << 5))   & 0xffffffff;
    seed = ((seed + 0xd3a2646c) ^ (seed << 9))   & 0xffffffff;
    seed = ((seed + 0xfd7046c5) + (seed << 3))   & 0xffffffff;
    seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;
    return (seed & 0xfffffff) / 0x10000000;
  };
})();
```

这里的关键变量是 `seed`。它在每次调用 `Math.random` 时都会更新，从而生成伪随机序列。重要的是，`seed` 保存在 `ScriptContext` 中。

`ScriptContext` 是一个存储位置，用于保存特定脚本中可访问的值。在内部，这个上下文被表示为一个包含 V8 的带标签值的数组。对于 64 位系统的默认 V8 配置，每个带标签值占据 32 位，其中每个值的最低有效位用作标签。`0` 表示 31 位 _小整数_ (`SMI`)，实际整数值直接存储并左移一位。`1` 表示指向堆对象的 [压缩指针](https://v8.dev/blog/pointer-compression)，其中压缩指针值加一。

![`ScriptContext` 布局：蓝色槽指向上下文元数据和全局对象（`NativeContext`）。黄色槽表示未带标签的双精度浮点值。](/_img/mutable-heap-number/script-context.svg)

这种标签区分了数字存储方式。`SMI` 直接保存在 `ScriptContext` 中。更大的数字或带有小数部分的数字则间接存储为不可变的堆数字 (`HeapNumber`) 对象（以 64 位双精度表示），`ScriptContext` 中保存指向它们的压缩指针。这种方法有效地处理了各种数字类型，同时为常见的 `SMI` 情况进行了优化。

# 性能瓶颈

对 `Math.random` 的分析揭示了两个主要性能问题：

- **`HeapNumber` 分配：** 脚本上下文中 `seed` 变量所在的槽位指向标准的、不可变的 `HeapNumber`。每次 `Math.random` 函数更新 `seed` 时，都需要在堆上分配一个新的 `HeapNumber` 对象，导致显著的分配和垃圾回收压力。

- **浮点运算：** 尽管 `Math.random` 中的计算本质上是整数操作（使用位移和加法），编译器却无法充分利用这一特点。由于 `seed` 作为通用的 `HeapNumber` 存储，生成的代码使用了较慢的浮点指令。编译器无法证明 `seed` 始终是可以用整数表示的值。即使编译器可能推测为 32 位整数范围，仍然需要进行可能昂贵的从 64 位浮点到 32 位整数的转换，以及无损检查。

# 解决方案

为了解决这些问题，我们实施了两部分优化：

- **插槽类型跟踪 / 可变堆数字插槽：** 我们扩展了[脚本上下文常量值跟踪](https://issues.chromium.org/u/2/issues/42203515)（已初始化但从未修改的let变量）以包含类型信息。我们追踪该插槽值是否是常量、`SMI`、`HeapNumber`或是通用的标记值。我们还在脚本上下文中引入了类似于为`JSObjects`设置的[可变堆数字字段](https://v8.dev/blog/react-cliff#smi-heapnumber-mutableheapnumber)的可变堆数字插槽概念。脚本上下文插槽不再指向不可变的`HeapNumber`，而是拥有`HeapNumber`，并且不应该泄漏其地址。这消除了优化代码在每次更新时分配新的`HeapNumber`的需要。这种情况下，被拥有的`HeapNumber`本身会就地修改。

- **可变堆`Int32`:** 我们增强了脚本上下文插槽类型以追踪数值是否在`Int32`范围内。如果是，表示可变的`HeapNumber`存储值作为原始`Int32`。如果需要转换为`double`，它具有无需重新分配`HeapNumber`的额外好处。在`Math.random`的情况下，编译器现在可以观察到`seed`变量始终通过整数操作更新，并将插槽标记为含有可变`Int32`。

![插槽类型状态机。绿色箭头表示存储`SMI`值触发的转换。蓝色箭头表示存储`Int32`值的转换，红色箭头表示存储双精度浮点值的转换。`Other`状态充当吸收状态，防止进一步转换。](/_img/mutable-heap-number/transitions.svg)

需要注意的是，这些优化会引入代码对存储在上下文插槽中的值类型的依赖关系。JIT编译器生成的优化代码依赖于插槽包含特定类型（此处为`Int32`）。如果有任何代码将改变其类型的值写入`seed`插槽（例如，写入浮点数或字符串），优化代码需要进行去优化。这是为了确保正确性。因此，插槽中存储的类型稳定性对于维持最佳性能至关重要。在`Math.random`的情况下，算法中的位掩码操作确保seed变量始终持有`Int32`值。

# 结果

这些变化显著加速了特殊的`Math.random`函数：

- **无分配 / 快速就地更新：** `seed`值直接在其脚本上下文中的可变插槽内更新。在`Math.random`执行期间没有分配新的对象。

- **整数操作：** 编译器借助插槽包含`Int32`的信息，可以生成高度优化的整数指令（移位、加法等）。这避免了浮点运算的开销。

![`async-fs`基准测试结果，运行于Mac M1。分数越高越好。](/_img/mutable-heap-number/result.png)

这些优化的综合效果使得`async-fs`基准测试达到了惊人的`~2.5x`加速。这又进一步推动了整体JetStream2评分的`~1.6%`提升。这表明看似简单的代码可能会造成意外的性能瓶颈，而针对性的微调优化能够在不只是基准测试方面产生巨大影响。

