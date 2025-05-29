---
title: "提升 V8 中 `DataView` 性能"
author: 'Théotime Grohens, <i lang="fr">低数据视图专家</i>，以及 Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer))，专业性能伙伴'
avatars:
  - "benedikt-meurer"
date: 2018-09-18 11:20:37
tags:
  - ECMAScript
  - 基准测试
description: "V8 v6.9 缩小了 `DataView` 和等效 TypedArray 代码之间的性能差距，有效使 `DataView` 在性能关键的真实应用中变得可用。"
tweet: "1041981091727466496"
---
[`DataView`s](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView) 是 JavaScript 中低级内存访问的两种可能方式之一，另一种是 [`TypedArray`s](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray)。到目前为止，V8 中的 `DataView`s 比 `TypedArray`s 的优化程度低得多，导致在诸如图形密集工作负载或解码/编码二进制数据的任务中性能较差。这些情况的原因主要是历史选择，例如 [asm.js](http://asmjs.org/) 选择了 `TypedArray`s 而不是 `DataView`s，从而导致引擎更专注于 `TypedArray`s 的性能。

<!--truncate-->
由于性能惩罚，JavaScript 开发者，例如 Google Maps 团队，选择避免使用 `DataView`s，转而依赖 `TypedArray`s，虽然如此增加了代码复杂性。本文解释了我们如何使 `DataView` 性能达到并超过等效的 `TypedArray` 代码，在 [V8 v6.9](/blog/v8-release-69) 中有效地使 `DataView` 在性能关键的真实应用中变得可用。

## 背景

自 ES2015 引入以来，JavaScript 支持以原始二进制缓冲区形式读取和写入数据，这些缓冲区被称为 [`ArrayBuffer`s](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer)。`ArrayBuffer`s 不能被直接访问；相反，程序必须使用一个所谓的*数组缓冲视图*对象，该对象可以是 `DataView` 或 `TypedArray`。

`TypedArray`s 允许程序以统一类型值的数组形式访问缓冲区，例如 `Int16Array` 或 `Float32Array`。

```js
const buffer = new ArrayBuffer(32);
const array = new Int16Array(buffer);

for (let i = 0; i < array.length; i++) {
  array[i] = i * i;
}

console.log(array);
// → [0, 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225]
```

另一方面，`DataView`s 允许更精细的 数据访问。它们通过为每种数字类型提供专门的 getter 和 setter，让程序员选择从缓冲区读取和写入的值类型，使其在序列化数据结构中非常有用。

```js
const buffer = new ArrayBuffer(32);
const view = new DataView(buffer);

const person = { age: 42, height: 1.76 };

view.setUint8(0, person.age);
view.setFloat64(1, person.height);

console.log(view.getUint8(0)); // 预期输出: 42
console.log(view.getFloat64(1)); // 预期输出: 1.76
```

此外，`DataView`s 也允许选择数据存储的字节序，这在从外部来源接收数据（如网络、文件或 GPU）时可能很有用。

```js
const buffer = new ArrayBuffer(32);
const view = new DataView(buffer);

view.setInt32(0, 0x8BADF00D, true); // 小端字节序写入。
console.log(view.getInt32(0, false)); // 大端字节序读取。
// 预期输出: 0x0DF0AD8B (233876875)
```

高效的 `DataView` 实现一直是一个长期以来的功能请求（参见 [此 bug 报告](https://bugs.chromium.org/p/chromium/issues/detail?id=225811)，距今超过 5 年），我们很高兴地宣布现在 `DataView` 性能已与之匹敌！

## 传统运行时实现

直到最近，`DataView` 方法在 V8 中还是以 C++ 内置运行时函数的形式实现。这非常昂贵，因为每次调用都需要从 JavaScript 到 C++（然后返回）的耗时转换。

为了研究这个实现带来的实际性能开销，我们设置了一个性能基准，比较了本地 `DataView` getter 实现与一个模拟 `DataView` 行为的 JavaScript 包装器。此包装器使用 `Uint8Array` 从底层缓冲区按字节读取数据，然后从这些字节中计算返回值。例如，以下是读取小端序 32 位无符号整数值的函数：

```js
function LittleEndian(buffer) { // 模拟小端字节序 `DataView` 读取。
  this.uint8View_ = new Uint8Array(buffer);
}

LittleEndian.prototype.getUint32 = function(byteOffset) {
  return this.uint8View_[byteOffset] |
    (this.uint8View_[byteOffset + 1] << 8) |
    (this.uint8View_[byteOffset + 2] << 16) |
    (this.uint8View_[byteOffset + 3] << 24);
};
```

`TypedArray` 已经在 V8 中被深度优化，所以它们代表了我们希望达到的性能目标。

![原始 `DataView` 性能](/_img/dataview/dataview-original.svg)

我们的基准测试显示，原生 `DataView` 的 getter 性能比基于 `Uint8Array` 的包装器慢了 **4 倍**，无论是大端还是小端读取。

## 提高基础性能

我们提高 `DataView` 对象性能的第一步是将其实现从 C++ 运行时迁移到 [`CodeStubAssembler（简称 CSA）`](/blog/csa)。CSA 是一种可移植的汇编语言，可以让我们直接在 TurboFan 的机器级中间表示（IR）中编写代码，并用于实现 V8 JavaScript 标准库的优化部分。使用 CSA 重写代码完全绕过了对 C++ 的调用，并且利用 TurboFan 的后端生成了高效的机器代码。

然而，用手动编写 CSA 代码很繁琐。CSA 中的控制流表达类似汇编，使用显式标签和 `goto`，使得代码难以一目了然地阅读和理解。

为了让开发者更容易为 V8 的优化 JavaScript 标准库做贡献，同时提升代码的可读性与可维护性，我们开始设计一种新语言，称为 V8 *Torque*，它可以编译为 CSA。*Torque* 的目标是抽象掉使 CSA 代码难以编写和维护的低级细节，同时保持相同的性能表现。

重写 `DataView` 的代码是一个开始使用 Torque 编写新代码的绝佳机会，同时为 Torque 的开发者提供了大量关于语言的反馈。以下是使用 Torque 编写的 `DataView` 的 `getUint32()` 方法的代码示例：

```torque
macro LoadDataViewUint32(buffer: JSArrayBuffer, offset: intptr,
                    requested_little_endian: bool,
                    signed: constexpr bool): Number {
  let data_pointer: RawPtr = buffer.backing_store;

  let b0: uint32 = LoadUint8(data_pointer, offset);
  let b1: uint32 = LoadUint8(data_pointer, offset + 1);
  let b2: uint32 = LoadUint8(data_pointer, offset + 2);
  let b3: uint32 = LoadUint8(data_pointer, offset + 3);
  let result: uint32;

  if (requested_little_endian) {
    result = (b3 << 24) | (b2 << 16) | (b1 << 8) | b0;
  } else {
    result = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
  }

  return convert<Number>(result);
}
```

将 `DataView` 方法迁移到 Torque 已经显示出性能提升了 **3 倍**，但仍未完全达到基于 `Uint8Array` 的包装器的性能水平。

![Torque `DataView` 性能](/_img/dataview/dataview-torque.svg)

## 针对 TurboFan 优化

当 JavaScript 代码变得热（频繁执行）时，我们使用 TurboFan 优化编译器将其编译，以生成比解释字节码更高效的机器代码。

TurboFan 通过将输入的 JavaScript 代码转换为内部图表示（更准确地说是 [“节点海洋”](https://darksi.de/d.sea-of-nodes/)）而工作。它从与 JavaScript 操作和语义匹配的高级节点开始，并逐步细化为更低层次的节点，最终生成机器代码。

特别是，函数调用（例如调用 `DataView` 的某个方法）在内部表示为一个 `JSCall` 节点，最终在生成的机器代码中转换为一个实际的函数调用。

但是，TurboFan 允许我们检查 `JSCall` 节点是否实际上是对已知函数的调用，例如某些内置函数，并将该节点内联到 IR 中。这意味着复杂的 `JSCall` 会在编译时被替换为表示该函数的子图。这使 TurboFan 能够在后续的编译阶段优化该函数内部代码作为更大上下文的一部分，而不是单独进行优化，最重要的是消除了昂贵的函数调用。

![TurboFan 初始 `DataView` 性能](/_img/dataview/dataview-turbofan-initial.svg)

实现 TurboFan 的内联终于使我们达到了甚至超过了 `Uint8Array` 包装器的性能，比之前的 C++ 实现快了 **8 倍**。

## 进一步的 TurboFan 优化

观察 TurboFan 在内联了 `DataView` 方法后生成的机器代码时，仍有一些改进空间。这些方法的初始实现尝试非常紧密地遵循标准，并在规范指示时抛出错误（例如，尝试读取或写入超出底层 `ArrayBuffer` 边界的情况）。

然而，我们在 TurboFan 中编写的代码是为了针对常见的热点情况进行最大化优化——它不需要支持每一种可能的边缘情况。通过移除对这些错误的复杂处理，并在需要抛出异常时仅降级回基础的 Torque 实现，我们能够将生成代码的大小减少约 35%，从而显著提升速度，同时使 TurboFan 代码变得相当简单。

继续沿着在 TurboFan 中尽可能专用化的思路，我们还移除了 TurboFan 优化代码中支持过大的索引或偏移量（超出 Smi 范围）的功能。这使我们能够摆脱对 32 位值宿不下的偏移量所需的 float64 算术的处理，并避免在堆上存储大整数。

与最初的 TurboFan 实现相比，这使得 `DataView` 基准测试得分提升了一倍多。`DataView` 现在的速度最高可达 `Uint8Array` 包装器的三倍，并且比我们原始的 `DataView` 实现快了**16倍**！

![最终 TurboFan `DataView` 性能](/_img/dataview/dataview-turbofan-final.svg)

## 影响

除了我们自己的基准测试，我们还评估了新实现对一些真实案例的性能影响。

`DataView` 经常被用于从 JavaScript 解码以二进制格式编码的数据。其中一种这样的二进制格式是 [FBX](https://en.wikipedia.org/wiki/FBX)，一种用于交换 3D 动画的格式。我们对流行的 [three.js](https://threejs.org/) JavaScript 3D 库的 FBX 加载器进行了分析，并测量其执行时间减少了 10%（约 80 毫秒）。

我们比较了 `DataView` 与 `TypedArray` 的整体性能。我们发现，在访问以本机字节序（Intel 处理器上的小端）对齐的数据时，新的 `DataView` 实现提供了几乎与 `TypedArray` 相同的性能，弥合了大部分性能差距，使得在 V8 中使用 `DataView` 成为一种实用的选择。

![`DataView` vs. `TypedArray` 峰值性能](/_img/dataview/dataview-vs-typedarray.svg)

我们希望您现在可以开始在合适的场景中使用 `DataView`，而不是依赖 `TypedArray` 的 shim。请告诉我们您对 `DataView` 的使用反馈！您可以通过 [我们的错误跟踪器](https://crbug.com/v8/new)、发送邮件到 v8-users@googlegroups.com，或者通过 [Twitter 上的 @v8js](https://twitter.com/v8js) 联系我们。
