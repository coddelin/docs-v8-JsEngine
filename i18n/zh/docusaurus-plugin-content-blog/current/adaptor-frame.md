---
title: "更快的JavaScript调用"
author: "[Victor Gomes](https://twitter.com/VictorBFG)，框架破碎者"
avatars: 
  - "victor-gomes"
date: 2021-02-15
tags: 
  - 内部结构
description: "通过移除参数适配帧实现更快的JavaScript调用"
tweet: "1361337569057865735"
---

JavaScript允许以与预期参数数量不同的参数数量调用函数，也就是说，可以传递比声明的形式参数少或多的参数。前者称为“少应用（under-application）”，后者称为“多应用（over-application）”。

<!--truncate-->
在少应用的情况下，剩余的参数会被赋予 undefined 值。在多应用的情况下，可以使用剩余参数(rest parameter)和 `arguments` 属性访问剩余的参数，或者它们仅仅是多余的，可以被忽略。如今，许多Web/Node.js框架使用这种JS特性来接受可选参数并创建更灵活的API。

直到最近，V8有一个特殊的机制来处理参数大小不匹配：参数适配帧。不幸的是，参数适配会带来性能成本，但现代前端和中间件框架中却经常需要使用它。实际上，通过一个巧妙的技巧，我们可以移除这个额外的帧，简化V8代码库，并消除几乎所有的开销。

我们可以通过微基准测试来计算移除参数适配帧的性能影响。

```js
console.time();
function f(x, y, z) {}
for (let i = 0; i <  N; i++) {
  f(1, 2, 3, 4, 5);
}
console.timeEnd();
```

![通过微基准测试测量移除参数适配帧的性能影响。](/_img/v8-release-89/perf.svg)

图表显示，在[JIT-less 模式](https://v8.dev/blog/jitless)（Ignition）下运行时，性能提升11.2%，不再有额外的开销。当使用[TurboFan](https://v8.dev/docs/turbofan)时，性能提升可达40%。

这个微基准测试的设计自然是为了最大化参数适配帧的影响。然而，我们在许多基准测试中都看到了显著的改进，例如在[我们内部的 JSTests/Array 基准测试](https://chromium.googlesource.com/v8/v8/+/b7aa85fe00c521a704ca83cc8789354e86482a60/test/js-perf-test/JSTests.json)中（提升7%）以及在[Octane2](https://github.com/chromium/octane)中（Richards提升4.6%，EarleyBoyer提升6.1%）。

## TL;DR：反转参数

这个项目的全部目标是移除参数适配帧，这为被调用者在访问堆栈中的参数时提供了一致的接口。为了做到这一点，我们需要反转堆栈中的参数，并在被调用者的帧中添加一个新槽，用于存储实际的参数数量。下图显示了更改前后典型帧的例子。

![移除参数适配帧前后，典型JavaScript堆栈帧的对比。](/_img/adaptor-frame/frame-diff.svg)

## 让JavaScript调用变得更快

为了更好理解我们为了加快调用速度所做的工作，让我们看看V8如何执行调用以及参数适配帧的工作原理。

当我们在JS中调用一个函数时，V8内部会发生什么？假设下面的JS脚本：

```js
function add42(x) {
  return x + 42;
}
add42(3);
```

![V8在函数调用中的执行流程。](/_img/adaptor-frame/flow.svg)

## Ignition

V8是一个多层虚拟机。其第一层被称为[Ignition](https://v8.dev/docs/ignition)，这是一种带有累加器寄存器的字节码栈机。V8首先将代码编译成[Ignition字节码](https://medium.com/dailyjs/understanding-v8s-bytecode-317d46c94775)。上述调用被编译成以下内容：

```
0d              LdaUndefined              ;; 将 undefined 加载到累加器中
26 f9           Star r2                   ;; 将其存储在寄存器 r2 中
13 01 00        LdaGlobal [1]             ;; 加载由常量1（add42）指向的全局对象
26 fa           Star r1                   ;; 将其存储在寄存器 r1 中
0c 03           LdaSmi [3]                ;; 将小整数3加载到累加器中
26 f8           Star r3                   ;; 将其存储在寄存器 r3 中
5f fa f9 02     CallNoFeedback r1, r2-r3  ;; 调用函数
```

调用的第一个参数通常称为接收者(receiver)。接收者是JSFunction中的 `this` 对象，每次JS函数调用都必须有一个接收者。`CallNoFeedback` 的字节码处理程序需要调用对象 `r1` 并使用寄存器列表 `r2-r3` 中的参数。

在我们深入探讨字节码处理程序之前，请注意寄存器如何在字节码中编码。它们是负值的单字节整数：`r1` 编码为 `fa`，`r2` 编码为 `f9`，`r3` 编码为 `f8`。实际上，我们可以将任何寄存器 `ri` 视为 `fb - i`，实际上，如我们将看到的那样，正确的编码是 `- 2 - kFixedFrameHeaderSize - i`。寄存器列表使用第一个寄存器和列表的大小进行编码，因此 `r2-r3` 是 `f9 02`。

在 Ignition 中有许多字节码调用处理程序。你可以在[这里](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/interpreter/bytecodes.h;drc=3965dcd5cb1141c90f32706ac7c965dc5c1c55b3;l=184)看到它们的列表。它们彼此稍有不同。有些字节码针对具有 `undefined` 接收器的调用进行了优化，有些针对属性调用，有些针对参数数量固定的调用，而有些针对通用调用优化。在这里我们分析 `CallNoFeedback`，它是在执行过程中不积累反馈的通用调用。

这个字节码的处理器非常简单。它是用 [`CodeStubAssembler`](https://v8.dev/docs/csa-builtins) 编写的，你可以在[这里](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/interpreter/interpreter-generator.cc;drc=6cdb24a4ce9d4151035c1f133833137d2e2881d1;l=1467)查看。实际上，它尾调用到与架构相关的内置函数 [`InterpreterPushArgsThenCall`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=1277)。

这个内置函数的主要功能是将返回地址弹到一个临时寄存器，将所有参数（包括接收器）推入，然后将返回地址推回。在此阶段，我们还不知道被调用者是否是可调用对象，也不知道被调用者期望的参数数量，即形式参数计数。

![`InterpreterPushArgsThenCall` 内置函数执行之后的帧状态。](/_img/adaptor-frame/normal-push.svg)

最终，执行尾调用到内置函数 [`Call`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=2256)。在这里，它检查目标是否是一个正确的函数、构造函数或其他任何可调用对象。它还读取 `shared function info` 结构以获取其形式参数计数。

如果被调用者是一个函数对象，它会尾调用到内置函数 [`CallFunction`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=2038)，在那里会进行一系列检查，包括是否我们的接收器是 `undefined` 对象。如果接收器是 `undefined` 或 `null` 对象，根据 [ECMA](https://262.ecma-international.org/11.0/#sec-ordinarycallbindthis) 规范，我们应该将其修补为指向全局代理对象。

执行然后尾调用到内置函数 [`InvokeFunctionCode`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/codegen/x64/macro-assembler-x64.cc;drc=a723767935dec385818d1134ea729a4c3a3ddcfb;l=2781)，在没有参数不匹配的情况下，它会调用被调用对象中的 `Code` 字段所指向的任何内容。这可能是一个优化后的函数或内置函数 [`InterpreterEntryTrampoline`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/builtins/x64/builtins-x64.cc;drc=8665f09771c6b8220d6020fe9b1ad60a4b0b6591;l=1037)。

如果我们假设调用的是尚未优化的函数，Ignition 跳板将设置一个 `IntepreterFrame`。你可以在[这里](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/execution/frame-constants.h;drc=574ac5d62686c3de8d782dc798337ce1355dc066;l=14)看到 V8 中帧类型的简要总结。

在不深入探讨接下来发生的事情的情况下，我们可以看到在被调用者执行期间解释器帧的快照。

![`add42(3)` 调用的 `InterpreterFrame`。](/_img/adaptor-frame/normal-frame.svg)

我们可以看到帧中有固定数量的插槽：返回地址、前一个帧指针、上下文、当前执行的函数对象、此函数的字节码数组以及当前正在执行的字节码的偏移量。最后，我们有一个专用于此函数的寄存器列表（你可以将其视为函数本地变量）。`add42` 函数实际上没有任何寄存器，但调用者具有一个类似的帧，其中包含3个寄存器。

如预期，`add42` 是一个简单的函数：

```
25 02             Ldar a0          ;; 将第一个参数加载到累加器
40 2a 00          AddSmi [42]      ;; 加上42
ab                Return           ;; 返回累加器
```

注意我们如何在 `Ldar` _(Load Accumulator Register)_ 字节码中编码参数：参数 `1` (`a0`) 的编码为数字 `02`。实际上，任何参数的编码公式是 `[ai] = 2 + parameter_count - i - 1`，接收器 `[this] = 2 + parameter_count`，或者在此示例中 `[this] = 3`。此处的参数计数不包括接收器。

我们现在能够理解为什么以这种方式编码寄存器和参数。它们只是表示相对于帧指针的偏移量。我们可以以相同的方式处理参数/寄存器加载和存储。从帧指针到最后一个参数的偏移量是`2`（前一个帧指针和返回地址）。这解释了编码中的`2`。解释器帧的固定部分是`6`个槽位（相对于帧指针为`4`），因此寄存器零位于偏移量`-5`，即`fb`，寄存器`1`位于`fa`。聪明吧？

然而请注意，为了能够访问参数，函数必须知道堆栈中的参数数量！索引`2`指向最后一个参数，无论有多少参数！

`Return`的字节码处理器最终将调用内置的`LeaveInterpreterFrame`。这个内置方法本质上是读取函数对象以从帧中获取参数数量，弹出当前帧，恢复帧指针，在临时寄存器中保存返回地址，根据参数数量弹出参数，并跳转到临时寄存器中的地址。

这一切流程非常棒！但是当我们调用一个函数时使用的参数数量少于或多于其参数数量时会发生什么？聪明的参数/寄存器访问会失败，那么我们如何在调用结束时清理参数呢？

## 参数适配器帧

现在我们用更少或更多的参数调用`add42`：

```js
add42();
add42(1, 2, 3);
```

我们中的 JavaScript 开发者会知道，在第一种情况下，`x`将被赋值为`undefined`，函数将返回`undefined + 42 = NaN`。在第二种情况下，`x`将被赋值为`1`，函数将返回`43`，其余参数将被忽略。注意调用者并不知道会发生这些事情。即使调用者检查了参数数量，被调用者也可能使用剩余参数或`arguments`对象访问所有其他参数。实际上，在非严格模式下，`arguments`对象甚至可以在`add42`之外被访问。

如果我们按照之前的步骤，首先会调用内置的`InterpreterPushArgsThenCall`。它会将参数推送到堆栈中，如下所示：

![执行`InterpreterPushArgsThenCall`内置方法后帧的状态。](/_img/adaptor-frame/adaptor-push.svg)

与之前相同的过程，我们检查被调用者是否是一个函数对象，获取其参数数量，并将接收者替换为全局代理。最终我们到达`InvokeFunctionCode`。

在这里，我们不是跳转到被调用对象中的`Code`，而是检测到参数大小和参数数量之间的不匹配并跳转到`ArgumentsAdaptorTrampoline`。

在这个内置方法中，我们构建了额外的帧，即臭名昭著的参数适配器帧。为了说明内置方法内部发生的事情，我仅向您展示内置方法调用被调用者`Code`之前的帧状态。注意这是一个真正的`x64 call`（而不是`jmp`），并且在执行被调用者后我们将返回到`ArgumentsAdaptorTrampoline`。与`InvokeFunctionCode`执行尾调用形成对比。

![具有参数适配的堆栈帧。](/_img/adaptor-frame/adaptor-frames.svg)

您可以看到，我们创建了另一个帧，将所有必要的参数复制到被调用者帧顶部，以便拥有准确数量的参数。它为被调用函数创建了一个接口，使得后者无需知道参数的数量。被调用者将始终能够按照之前的计算方式访问其参数，即`[ai] = 2 + parameter_count - i - 1`。

V8 有特殊的内置方法，当需要通过剩余参数或`arguments`对象访问其余参数时会理解适配器帧。它们始终需要检查被调用者帧顶部的适配器帧类型，然后采取相应行动。

正如您所看到的，我们解决了参数/寄存器访问问题，但也带来了许多复杂性。每个需要访问所有参数的内置方法都需要理解并检查适配器帧的存在。不仅如此，我们还需要小心不要访问过期的旧数据。考虑对`add42`的以下更改：

```js
function add42(x) {
  x += 42;
  return x;
}
```

字节码数组现在是：

```
25 02             Ldar a0       ;; 将第一个参数加载到累加器
40 2a 00          AddSmi [42]   ;; 将42加到累加器
26 02             Star a0       ;; 将累加器存储在第一个参数槽位
ab                Return        ;; 返回累加器
```

如您所见，我们现在修改了`a0`。所以在调用`add42(1, 2, 3)`的情况下，适配器帧中的槽位将被修改，但调用者帧仍然包含数字`1`。我们需要注意让`arguments`对象访问的是修改后的值而不是过期的旧值。

从函数返回很简单，但比较慢。还记得`LeaveInterpreterFrame`做了什么吗？它基本上弹出被调用者帧以及与参数数量对应的参数。因此，当我们返回到参数适配器存根时，堆栈看起来如下：

![执行被调用者`add42`后帧的状态。](/_img/adaptor-frame/adaptor-frames-cleanup.svg)

我们只需要弹出参数的数量，弹出适配器帧，根据实际参数数量弹出所有参数，然后返回到调用者的执行。

简而言之：参数适配器机制不仅复杂，而且成本很高。

## 移除参数适配器帧

我们能做得更好吗？我们能移除适配器帧吗？事实证明我们确实可以。

让我们回顾一下我们的需求：

1. 我们需要能够像以前一样无缝访问参数和寄存器。在访问它们时不能有任何检查。这会太昂贵。
2. 我们需要能够从堆栈中构造剩余参数和 arguments 对象。
3. 我们需要能够在从调用返回时轻松清理未知数量的参数。
4. 当然，我们希望做到这一点而不需要额外的帧！

如果我们想消除额外的帧，那么我们需要决定将参数放在哪里：是放在被调用方帧中还是调用方帧中。

### 将参数放在被调用方帧中

假设我们将参数放在被调用方帧中。实际上这是个好主意，因为每当我们弹出帧时，也会同时弹出所有参数！

参数需要定位在保存的帧指针和帧末尾之间的某个地方。这意味着帧的大小将不是静态已知的。访问参数仍然很容易，它是帧指针的简单偏移。但访问寄存器现在变得复杂得多，因为它根据参数的数量而变化。

堆栈指针总是指向最后一个寄存器，我们可以用它来访问寄存器，而无需知道参数的数量。这种方法实际上可能有效，但它有一个主要缺点。这将需要复制所有可以访问寄存器和参数的字节码。我们需要一个 `LdaArgument` 和一个 `LdaRegister`，而不是简单地使用 `Ldar`。当然，我们也可以检查我们是否正在访问参数或寄存器（正偏移或负偏移），但这会在每次参数和寄存器访问时都需要检查。显然成本太高！

### 将参数放在调用方帧中

好吧……如果我们坚持将参数放在调用方帧中会怎么样？

记住如何计算帧中参数 `i` 的偏移量：`[ai] = 2 + parameter_count - i - 1`。如果我们有所有参数（不只是形式参数），偏移量将是 `[ai] = 2 + argument_count - i - 1`。也就是说，对于每次参数访问，我们都需要加载实际的参数数量。

但是如果我们反转参数顺序会发生什么呢？现在，偏移量可以简单地计算为 `[ai] = 2 + i`。我们不需要知道堆栈中有多少参数，但如果我们能保证堆栈中始终至少有形式参数的数量，那么我们就可以始终使用这种方案来计算偏移量。

换句话说，堆栈中推入的参数数量将始终是参数数量和形式参数数量的较大值，如果需要，将用未定义的对象填充。

这还有另一个好处！对于任何 JS 函数，接收者总是位于返回地址之上的相同偏移量：`[this] = 2`。

这是我们需求 `1` 和 `4` 的一个干净解决方案。那么其他两个需求呢？我们如何构造剩余参数和 arguments 对象？以及如何在返回调用方时清理堆栈中的参数？为此我们仅缺少参数计数。我们需要将其保存到某处。这里的选择有点随意，只要访问这些信息很方便即可。两个基本选择是：将它推入调用方帧中接收者之后的位置，或者作为被调用方帧固定头部的一部分。我们实现了后者，因为它将解释器和优化帧的固定头部部分合并了。

如果我们在 V8 v8.9 中运行我们的示例，我们将在 `InterpreterArgsThenPush` 之后看到如下堆栈（注意参数现在是反向的）：

![执行 `InterpreterPushArgsThenCall` 内建函数后帧的状态。](/_img/adaptor-frame/no-adaptor-push.svg)

所有执行流程类似，直到我们到达 InvokeFunctionCode。在这里，我们在参数不足的情况下对参数进行处理，根据需要推入尽可能多的未定义对象。注意，当参数过多时，我们不会改变任何内容。最后，我们通过寄存器将参数数量传递给被调用方的 `Code`。对于 `x64`，我们使用寄存器 `rax`。

如果被调用方尚未优化，我们会到达 `InterpreterEntryTrampoline`，它构建如下的堆栈帧。

![没有参数适配器的堆栈帧。](/_img/adaptor-frame/no-adaptor-frames.svg)

被调用方帧具有一个额外的槽，用于保存参数数量，可以用来构造剩余参数或 arguments 对象，并在返回调用方之前清理堆栈中的参数。

为了返回，我们修改`LeaveInterpreterFrame`来读取堆栈中的参数计数，并弹出参数计数和形式参数计数之间的最大值。

## TurboFan

优化代码呢？让我们稍微修改一下我们的初始脚本以强制V8使用TurboFan进行编译：

```js
function add42(x) { return x + 42; }
function callAdd42() { add42(3); }
%PrepareFunctionForOptimization(callAdd42);
callAdd42();
%OptimizeFunctionOnNextCall(callAdd42);
callAdd42();
```

这里我们使用V8内置方法强制V8优化调用，否则只有当我们的函数变热（被频繁使用）时V8才会优化它。我们在优化之前调用一次，以收集一些类型信息用于指导编译。阅读更多关于TurboFan的信息[这里](https://v8.dev/docs/turbofan)。

我会在这里只展示与我们相关的生成代码部分。

```nasm
movq rdi,0x1a8e082126ad    ;; 加载函数对象<JSFunction add42>
push 0x6                   ;; 将SMI 3作为参数压入
movq rcx,0x1a8e082030d1    ;; <JSGlobal Object>
push rcx                   ;; 压入接收者（全局代理对象）
movl rax,0x1               ;; 将参数计数保存到rax
movl rcx,[rdi+0x17]        ;; 加载函数对象{Code}字段到rcx
call rcx                   ;; 最后，调用代码对象！
```

虽然这是汇编代码，但如果您遵循我的注释，它应该不难阅读。从本质上讲，在编译调用时，TF需要完成在`InterpreterPushArgsThenCall`、`Call`、`CallFunction`和`InvokeFunctionCall`内置函数中完成的所有工作。希望它有更多的静态信息来完成这些工作并发出较少的计算机指令。

### TurboFan和参数适配器帧

现在，让我们看看参数数量和形式参数计数不匹配的情况。考虑调用`add42(1, 2, 3)`。这将被编译为：

```nasm
movq rdi,0x4250820fff1    ;; 加载函数对象<JSFunction add42>
;; 压入接收者和参数SMI 1、2和3
movq rcx,0x42508080dd5    ;; <JSGlobal Object>
push rcx
push 0x2
push 0x4
push 0x6
movl rax,0x3              ;; 将参数计数保存到rax
movl rbx,0x1              ;; 将形式参数计数保存到rbx
movq r10,0x564ed7fdf840   ;; <ArgumentsAdaptorTrampoline>
call r10                  ;; 调用ArgumentsAdaptorTrampoline
```

如您所见，为TF支持参数和形式参数计数不匹配并不困难。只需调用参数适配器跳转程序即可！

然而，这非常昂贵。对于每个优化的调用，我们现在需要进入参数适配器跳转程序并像在非优化代码中一样处理帧。这解释了为什么在优化代码中移除适配器帧的性能提升比在Ignition上更大。

生成的代码却非常简单。而且从中返回也非常容易（尾声）：

```nasm
movq rsp,rbp   ;; 清理被调用者帧
pop rbp
ret 0x8        ;; 弹出单个参数（接收者）
```

我们弹出帧并按形式参数计数发出返回指令。如果参数数量和形式参数计数不匹配，适配器帧跳转程序将处理它。

### TurboFan不使用参数适配器帧

生成的代码本质上与参数数量匹配的调用中的代码相同。考虑调用`add42(1, 2, 3)`。这将生成：

```nasm
movq rdi,0x35ac082126ad    ;; 加载函数对象<JSFunction add42>
;; 压入接收者和参数1、2、3（反序）
push 0x6
push 0x4
push 0x2
movq rcx,0x35ac082030d1    ;; <JSGlobal Object>
push rcx
movl rax,0x3               ;; 将参数计数保存到rax
movl rcx,[rdi+0x17]        ;; 加载函数对象{Code}字段到rcx
call rcx                   ;; 最后，调用代码对象！
```

函数的尾声是什么样子？我们不再返回参数适配器跳转程序，因此尾声确实比之前稍复杂一些。

```nasm
movq rcx,[rbp-0x18]        ;; 将参数计数（从被调用者帧）加载到rcx
movq rsp,rbp               ;; 弹出被调用者帧
pop rbp
cmpq rcx,0x0               ;; 将参数计数与形式参数计数比较
jg 0x35ac000840c6  <+0x86>
;; 如果参数计数小于（或等于）形式参数计数：
ret 0x8                    ;; 像平常一样返回（形式参数计数是静态已知的）
;; 如果堆栈中参数数量比形式参数多：
pop r10                    ;; 保存返回地址
leaq rsp,[rsp+rcx*8+0x8]   ;; 根据rcx弹出所有参数
push r10                   ;; 恢复返回地址
retl
```

# 结论
