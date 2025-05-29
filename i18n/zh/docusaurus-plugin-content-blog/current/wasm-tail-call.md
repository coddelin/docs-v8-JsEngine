---
title: "WebAssembly尾调用"
author: "Thibaud Michaud, Thomas Lively"
date: 2023-04-06
tags:
  - WebAssembly
description: "本文详细介绍了WebAssembly尾调用提案，并通过一些示例进行演示。"
tweet: "1644077795059044353"
---
我们在V8 v11.2中推出了WebAssembly尾调用！在本文中，我们将简要介绍该提案，展示一个关于使用Emscripten的C++协程的有趣用例，并说明V8如何在内部处理尾调用。

## 什么是尾调用优化？

如果一个调用是当前函数在返回之前执行的最后一个指令，就称其处于尾部位置。编译器可以通过丢弃调用帧并将调用替换为跳转来优化此类调用。

这对递归函数尤其有用。例如，考虑以下用C语言编写的函数，该函数对链表中的元素求和：

```c
int sum(List* list, int acc) {
  if (list == nullptr) return acc;
  return sum(list->next, acc + list->val);
}
```

使用常规调用，这会消耗𝒪(n)的堆栈空间：链表中的每个元素都会在调用堆栈中添加一个新的框架。如果列表足够长，这很快会导致堆栈溢出。通过将调用替换为跳转，尾调用优化实际上将此递归函数转化为一个使用𝒪(1)堆栈空间的循环：

<!--truncate-->
```c
int sum(List* list, int acc) {
  while (list != nullptr) {
    acc = acc + list->val;
    list = list->next;
  }
  return acc;
}
```

这种优化对函数式语言尤为重要。这些语言严重依赖递归函数，而像Haskell这样的纯函数式语言甚至不提供循环控制结构。任何自定义迭代通常都会以某种方式依赖递归。没有尾调用优化，任何非简单的程序很快都会遇到堆栈溢出。

### WebAssembly尾调用提案

在Wasm MVP中调用函数有两种方式：`call`和`call_indirect`。WebAssembly尾调用提案为它们添加了尾调用对应项：`return_call`和`return_call_indirect`。这意味着工具链实际执行尾调用优化并发出适当的调用类型，从而更好地控制性能和堆栈空间的使用。

让我们看看一个递归的Fibonacci函数。此处以文本格式包含Wasm字节码以完整展示，但您可以在下一节中找到C++的实现：

```wasm/4
(func $fib_rec (param $n i32) (param $a i32) (param $b i32) (result i32)
  (if (i32.eqz (local.get $n))
    (then (return (local.get $a)))
    (else
      (return_call $fib_rec
        (i32.sub (local.get $n) (i32.const 1))
        (local.get $b)
        (i32.add (local.get $a) (local.get $b))
      )
    )
  )
)

(func $fib (param $n i32) (result i32)
  (call $fib_rec (local.get $n) (i32.const 0) (i32.const 1))
)
```

任何时候都只有一个`fib_rec`帧，它在执行下一次递归调用前会释放自身。当达到基准情况时，`fib_rec`会直接将结果`a`返回给`fib`。

尾调用的一个可观察到的结果是（除了降低堆栈溢出风险）尾调用者不会出现在堆栈跟踪中。它们既不会出现在捕获的异常的堆栈属性中，也不会出现在DevTools的堆栈跟踪中。当异常被抛出或执行暂停时，尾调用者帧已经消失，V8没有办法恢复它们。

## 在Emscripten中使用尾调用

函数式语言经常依赖尾调用，但C或C++程序员也可以使用尾调用。Emscripten（以及Emscripten使用的Clang）支持musttail属性，该属性告诉编译器调用必须被编译为尾调用。例如，以下递归实现的Fibonacci函数计算第`n`个Fibonacci数模2^32（因为大`n`时整数会溢出）：

```c
#include <stdio.h>

unsigned fib_rec(unsigned n, unsigned a, unsigned b) {
  if (n == 0) {
    return a;
  }
  return fib_rec(n - 1, b, a + b);
}

unsigned fib(unsigned n) {
  return fib_rec(n, 0, 1);
}

int main() {
  for (unsigned i = 0; i < 10; i++) {
    printf("fib(%d): %d\n", i, fib(i));
  }

  printf("fib(1000000): %d\n", fib(1000000));
}
```

使用`emcc test.c -o test.js`编译后，在Node.js中运行该程序会出现堆栈溢出错误。通过在`fib_rec`的返回值中添加`__attribute__((__musttail__))`并在编译参数中添加`-mtail-call`可以修复此问题。现在生成的Wasm模块包含新尾调用指令，因此我们需要向Node.js传递`--experimental-wasm-return_call`，但堆栈不会再溢出。

以下是一个互相递归的示例：

```c
#include <stdio.h>
#include <stdbool.h>

bool is_odd(unsigned n);
bool is_even(unsigned n);

bool is_odd(unsigned n) {
  if (n == 0) {
    返回 false;
  }
  __attribute__((__musttail__))
  返回 is_even(n - 1);
}

bool is_even(unsigned n) {
  如果 (n == 0) {
    返回 true;
  }
  __attribute__((__musttail__))
  返回 is_odd(n - 1);
}

int main() {
  printf("is_even(1000000): %d\n", is_even(1000000));
}
```

需要注意的是，这两个示例都非常简单，以至于如果我们使用 `-O2` 编译，即使没有尾调用，编译器也可以预先计算答案并避免耗尽堆栈，但对于更复杂的代码则不会如此。在实际代码中，musttail 属性对于编写高性能解释器循环非常有用，正如 Josh Haberman 在 [这篇博文](https://blog.reverberate.org/2021/04/21/musttail-efficient-interpreters.html) 中所描述的。

除了 `musttail` 属性外，C++还依赖尾调用实现另一个功能：C++20 协程。有关尾调用和 C++20 协程之间关系的详细分析可以参见 Lewis Baker 的 [这篇博文](https://lewissbaker.github.io/2020/05/11/understanding_symmetric_transfer)，但简而言之，可以使用一种模式调用协程，这种模式可能会微妙地导致堆栈溢出，即使代码看起来不会有问题。为了修复该问题，C++委员会要求编译器实现“对称传输”以避免堆栈溢出，而实际上这意味着在底层使用尾调用。

当启用 WebAssembly 的尾调用时，Clang 按照该博文中描述的方式实现了对称传输，但当尾调用未启用时，Clang 会默默地编译代码，而不实现对称传输，这可能导致堆栈溢出，并且技术上也不是正确的 C++20 实现！

为了查看实际效果，请使用 Emscripten 编译上面博文中的最后一个示例，并观察只有启用尾调用时才可以避免堆栈溢出。请注意，由于最近修复的漏洞，这种功能仅在 Emscripten 3.1.35 或更高版本中正确运行。

## V8 中的尾调用

正如我们之前所看到的，判定调用是否位于尾部位置不是引擎的责任。这应该由工具链在上游完成。因此，TurboFan（V8 的优化编译器）唯一需要做的事情就是根据调用类型和目标函数签名发出适当的指令序列。对于前面提到的斐波那契示例，堆栈将如下所示：

![TurboFan 中的简单尾调用](/_img/wasm-tail-calls/tail-calls.svg)

左侧是我们在 `fib_rec`（绿色）内部，由 `fib`（蓝色）调用并即将递归尾调用 `fib_rec`。首先，通过重置帧指针和堆栈指针来展开当前帧。帧指针通过从“调用者 FP”槽中读取其先前值恢复。堆栈指针移动到父帧顶部，加上调用者的任何可能的堆栈参数空间及堆栈返回值空间（在此示例中为 0，一切都通过寄存器传递）。参数根据 `fib_rec` 的链接被移动到预期寄存器中（未在图中显示）。最后，我们开始运行 `fib_rec`，其首先创建新帧。

`fib_rec` 像这样不断展开和重新展开，直到 `n == 0`，此时它通过寄存器将 `a` 返回给 `fib`。

这是一个简单的案例，所有参数和返回值都适合寄存器，并且调用者的签名与被调用者的签名相同。在一般情况下，我们可能需要进行复杂的堆栈操作：

- 从旧帧读取传出的参数
- 将参数移动到新帧
- 通过上移或下移返回地址来调整帧大小，这取决于被调用者中的堆栈参数数量

所有这些读写操作可能会互相冲突，因为我们重复使用相同的堆栈空间。这是与非尾调用的关键区别，后者只是将所有堆栈参数和返回地址推入堆栈顶部。

![TurboFan 中的复杂尾调用](/_img/wasm-tail-calls/tail-calls-complex.svg)

TurboFan 通过“间隙解析器”组件来处理这些堆栈和寄存器操作，该组件接收一组应该语义上并行执行的移动操作，并生成适当的操作序列以解决移动源和目标之间可能的冲突。如果冲突是非循环的，这只是重新排列移动操作以确保所有源在被覆盖之前已被读取的问题。对于循环冲突（例如交换两个堆栈参数），这可能需要将其中一个源移动到临时寄存器或临时堆栈槽中，以打破循环。

尾调用也支持在Liftoff中使用，这是我们的基线编译器。实际上，它们必须得到支持，否则基线代码可能会耗尽堆栈空间。然而，这一层中没有进行优化：Liftoff将参数、返回地址和帧指针推入以完成帧，就像这是一种常规调用一样，然后向下移动所有内容以丢弃调用者帧：

![Liftoff中的尾调用](/_img/wasm-tail-calls/tail-calls-liftoff.svg)

在跳转到目标函数之前，我们还会将调用者的FP弹入FP寄存器，以恢复其先前值，并使目标函数可以在序言中再次推入。

这种策略不需要我们分析和解决移动冲突，从而加快了编译速度。生成的代码较慢，但如果函数足够热，最终会[升级](/blog/wasm-dynamic-tiering)到TurboFan。
