---
title: "驯服 V8 架构复杂性——CodeStubAssembler"
author: "[Daniel Clifford](https://twitter.com/expatdanno)，CodeStubAssembler 组装器"
date: 2017-11-16 13:33:37
tags:
  - 内部细节
description: "V8 在汇编代码之上有自己的抽象层：CodeStubAssembler。CSA 允许 V8 在低层次上快速且可靠地优化 JavaScript 功能，同时支持多平台。"
tweet: "931184976481177600"
---
在这篇文章中，我们想介绍 CodeStubAssembler（CSA），这是 V8 中的一个组件，它在最近几个 V8 版本的 [大幅度](/blog/optimizing-proxies) [性能](https://twitter.com/v8js/status/918119002437750784) [提升](https://twitter.com/_gsathya/status/900188695721984000) 中发挥了重要作用。CSA 还显著提高了 V8 团队在低层快速优化 JavaScript 功能的能力，同时保持高度可靠性，从而提升了团队的开发效率。

<!--truncate-->
## V8 中内建函数和手写汇编的简史

为了理解 CSA 在 V8 中的作用，有必要了解一些促成其发展的上下文和历史背景。

V8 使用多种技术从 JavaScript 中榨取性能收益。对于运行时间较长的 JavaScript 代码，V8 的 [TurboFan](/docs/turbofan) 优化编译器在提升 ES2015+ 功能的峰值性能方面表现出色。然而，V8 还需要高效地执行短时间运行的 JavaScript，以确保良好的基础性能。尤其是所谓的 **内建函数**，它们是预定义对象上的函数，所有 JavaScript 程序都可以使用，正如 [ECMAScript 规范](https://tc39.es/ecma262/) 中所定义。

在历史上，许多这些内建函数是 [自托管](https://en.wikipedia.org/wiki/Self-hosting) 的，也就是说，它们是由 V8 开发人员用 JavaScript 编写的——尽管是 V8 的一种特殊内部方言。为了实现良好的性能，这些自托管的内建函数依赖于 V8 用于优化用户提供 JavaScript 的机制。与用户提供的代码一样，自托管的内建函数需要经历一个收集类型反馈的预热阶段，并需要优化编译器进行编译。

尽管这种技术在某些情况下提供了良好的内建性能，但仍有更好的选择。《规范》中 [详尽描述了](https://tc39.es/ecma262/#sec-properties-of-the-array-prototype-object) `Array.prototype` 上预定义函数的精准语义。对于重要且常见的特殊情况，V8 的实现者通过理解规范，提前知道这些内建函数应该如何工作，并利用这一知识小心翼翼地预先打造了经过手动调优的版本。这些优化的内建函数无需预热或调用优化编译器即可处理常见情况，因为从设计上来说，其基础性能在第一次调用时已经是最佳。

为了从手写的 JavaScript 内建函数（以及其他被称为内建函数的快速路径 V8 代码）中榨取最佳性能，V8 开发人员传统上用汇编语言编写优化的内建函数。通过使用汇编，这些手写的内建函数尤其快速，因为它们避免了通过跳板调用 V8 C++ 代码的高开销调用，并利用了 V8 内部调用 JavaScript 函数时使用的自定义基于寄存器的 [ABI](https://en.wikipedia.org/wiki/Application_binary_interface)。

由于手写汇编的优势，V8 多年来在每个平台都累计了成千上万行的手写汇编代码用于内建函数…… _每个平台一套_。所有这些手写的汇编内建代码在提高性能方面表现优异，但新的语言特性总在不断被标准化，维护和扩展这些手写的汇编是一项繁重且容易出错的任务。

## 引入 CodeStubAssembler

多年来，V8 开发者一直在解决一个难题：是否有可能创建既具备手写汇编优势又不会显得脆弱和难以维护的内建函数？

随着TurboFan的出现，这个问题的答案终于是“是”。TurboFan的后端使用跨平台的[中间表示](https://en.wikipedia.org/wiki/Intermediate_representation) (IR)来实现底层机器操作。这个底层机器IR被输入到指令选择器、寄存器分配器、指令调度程序和代码生成器中，从而在所有平台上生成非常优秀的代码。后端还了解许多在V8手写汇编内建函数中使用的技巧，例如如何使用并调用基于寄存器的自定义ABI，如何支持机器级尾调用，以及如何在叶函数中省略构造堆栈帧。这种知识使TurboFan后端特别适合生成高速代码并完美地与V8的其他部分集成。

这种功能的结合首次使得一种强大的、可维护的替代手写汇编内建函数的方法变得可行。团队构建了一个新的V8组件——命名为CodeStubAssembler或CSA，它定义了一种基于TurboFan后端的可移植汇编语言。CSA添加了一个API，可以直接生成TurboFan的机器级IR，而无需编写和解析JavaScript或应用TurboFan的JavaScript特定优化。尽管这种快速代码生成路径仅供V8开发人员内部加速V8引擎使用，但是这种跨平台生成优化汇编代码的高效路径，通过CSA构建的内建函数直接惠及所有开发人员的JavaScript代码，包括V8解释器[Ignition](/docs/ignition)的性能关键字节码处理器。

![CSA和JavaScript编译过程](/_img/csa/csa.svg)

CSA界面包含非常底层的操作，对任何曾经编写过汇编代码的人来说都很熟悉。例如，它包括诸如“从指定地址加载这个对象指针”和“将这两个32位数字相乘”等功能。CSA在IR级别进行类型验证，可以在编译时而非运行时捕获许多正确性错误。例如，它可以确保V8开发人员不会意外地将从内存加载的对象指针作为32位乘法的输入。这种类型验证在手写汇编代码存根中是根本不可能实现的。

## CSA试用

为了更好地了解CSA的功能，让我们通过一个快速示例来了解它。我们将为V8添加一个新的内部内建函数，该函数从一个对象返回字符串长度（如果它是一个字符串）。如果输入对象不是字符串，该内建函数将返回`undefined`。

首先，我们在V8的[`builtin-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h)文件中的`BUILTIN_LIST_BASE`宏中添加一行代码，声明名为`GetStringLength`的新内建函数。并指定它有一个输入参数，该参数用常量`kInputObject`标识：

```cpp
TFS(GetStringLength, kInputObject)
```

`TFS`宏将内建函数声明为使用标准CodeStub链接的**T**urbo**F**an内建函数，这意味着它使用CSA生成其代码，并期望参数通过寄存器传递。

然后，我们可以在[`builtins-string-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-string-gen.cc)文件中定义内建函数的内容：

```cpp
TF_BUILTIN(GetStringLength, CodeStubAssembler) {
  Label not_string(this);

  // 使用我们为第一个参数定义的常量获取传入的对象。
  Node* const maybe_string = Parameter(Descriptor::kInputObject);

  // 检查输入是否是Smi（一种小数字的特殊表示）。这需要在下面的IsString检查之前完成，因为IsString假定其参数是对象指针而不是Smi。如果参数确实是Smi，跳转到标签|not_string|。
  GotoIf(TaggedIsSmi(maybe_string), &not_string);

  // 检查输入对象是否是字符串。如果不是，跳转到标签|not_string|。
  GotoIfNot(IsString(maybe_string), &not_string);

  // 加载字符串的长度（通过上面验证它是字符串后进入此代码路径）并通过CSA "宏" LoadStringLength返回它。
  Return(LoadStringLength(maybe_string));

  // 定义标签的位置，这是上面IsString检查失败的目标。
  BIND(&not_string);

  // 输入对象不是字符串。返回JavaScript的undefined常量。
  Return(UndefinedConstant());
}
```

注意，在上面的示例中使用了两类指令。有_原始_的CSA指令，这些指令直接翻译成一到两条汇编指令，比如`GotoIf`和`Return`。CSA原始指令的集合是固定的，它大致与V8支持的芯片架构中最常用的汇编指令对应。示例中的其他指令是_宏_指令，比如`LoadStringLength`、`TaggedIsSmi`和`IsString`，它们是便利功能，用于内联输出一个或多个原始或宏指令。宏指令用于封装常用的V8实现习惯，以便于重复使用。它们可以是任意长的，V8开发人员可以随时轻松定义新的宏指令。

在使用上述更改编译V8后，我们可以运行`mksnapshot`工具，该工具通过`--print-code`命令行选项编译内置函数以为V8的快照做准备。该选项会打印每个内置函数生成的汇编代码。如果我们在输出中用`grep`搜索`GetStringLength`，会在x64架构上得到以下结果（代码输出稍作整理以提高易读性）：

```asm
  test al,0x1
  jz not_string
  movq rbx,[rax-0x1]
  cmpb [rbx+0xb],0x80
  jnc not_string
  movq rax,[rax+0xf]
  retl
not_string:
  movq rax,[r13-0x60]
  retl
```

在32位ARM平台上，`mksnapshot`生成以下代码：

```asm
  tst r0, #1
  beq +28 -> not_string
  ldr r1, [r0, #-1]
  ldrb r1, [r1, #+7]
  cmp r1, #128
  bge +12 -> not_string
  ldr r0, [r0, #+7]
  bx lr
not_string:
  ldr r0, [r10, #+16]
  bx lr
```

即使我们的新内置函数使用非标准（至少是非C++）的调用约定，也可以为其编写测试用例。以下代码可以添加到[`test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc)中，以在所有平台上测试此内置函数：

```cpp
TEST(GetStringLength) {
  HandleAndZoneScope scope;
  Isolate* isolate = scope.main_isolate();
  Heap* heap = isolate->heap();
  Zone* zone = scope.main_zone();

  // 测试输入为字符串的情况
  StubTester tester(isolate, zone, Builtins::kGetStringLength);
  Handle<String> input_string(
      isolate->factory()->
        NewStringFromAsciiChecked("Oktoberfest"));
  Handle<Object> result1 = tester.Call(input_string);
  CHECK_EQ(11, Handle<Smi>::cast(result1)->value());

  // 测试输入不是字符串的情况（例如：undefined）
  Handle<Object> result2 =
      tester.Call(factory->undefined_value());
  CHECK(result2->IsUndefined(isolate));
}
```

要了解有关使用CSA开发不同类型的内置函数的更多详细信息及进一步的示例，请参阅[此wiki页面](/docs/csa-builtins)。

## V8开发效率的倍增器

CSA不仅仅是一个支持多平台的通用汇编语言。相比过去为每个平台手写代码，它在实现新功能时能够显著加快开发速度。它通过提供手写汇编代码的所有优点，同时保护开发人员避免其最棘手的问题，做到了以下几点：

- 使用CSA，开发人员可以使用一组跨平台的低级原语编写内置函数代码，这些原语直接转换为汇编指令。CSA的指令选择器确保这些代码在V8所支持的所有平台上都是最优的，而无需V8开发人员精通这些平台的汇编语言。
- CSA的接口有可选的类型来确保低级生成的汇编操作的值类型符合代码作者的预期。
- 指令之间的寄存器分配由CSA自动完成，而不是手动指定，包括构建栈帧和在寄存器不够用或者调用函数时将值溢出到栈上。这消除了一个困扰手写汇编内置函数的微妙且难以发现的bug类别。通过减少生成代码的脆弱性，CSA大幅降低了编写正确低级内置函数所需的时间。
- CSA理解ABI调用约定——包括标准的C++和V8内部基于寄存器的调用约定——可以轻松地在CSA生成的代码与V8的其他部分之间进行互操作。
- 由于CSA代码是C++，所以可以很容易地用宏封装通用的代码生成模式，并且可以在许多内置函数中轻松重用。
- 因为V8使用CSA生成Ignition的字节码处理器，所以可以非常容易地将基于CSA的内置函数功能直接内联到处理器中以提高解释器性能。
- V8的测试框架支持从C++测试CSA功能和CSA生成的内置函数，而无需编写汇编适配器。

总的来说，CSA已经成为V8开发的游戏规则改变者。它显著提高了团队优化V8的能力。这意味着我们能够更快地为V8的嵌入者优化更多的JavaScript语言功能。
