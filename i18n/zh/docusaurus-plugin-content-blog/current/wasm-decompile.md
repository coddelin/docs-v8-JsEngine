---
title: "那个 `.wasm` 文件里有什么？介绍：`wasm-decompile`"
author: "Wouter van Oortmerssen ([@wvo](https://twitter.com/wvo))"
avatars:
  - "wouter-van-oortmerssen"
date: 2020-04-27
tags:
  - WebAssembly
  - 工具
description: "WABT 增加了一种新的反编译工具，可以更容易地阅读 Wasm 模块的内容。"
tweet: "1254829913561014272"
---
我们拥有越来越多的编译器和其他工具来生成或操作 `.wasm` 文件，有时候您可能会想看看里面的内容。也许您是该类工具的开发者，或者更直接地说，您是针对 Wasm 的程序员，想知道生成的代码是什么样子，出于性能或其他原因。

<!--truncate-->
问题是，Wasm 是相当低级的，非常像实际的汇编代码。特别是，与例如 JVM 不同的是，所有的数据结构都已编译成了加载/存储操作，而不是方便命名的类和字段。像 LLVM 这样的编译器可以进行大量令人印象深刻的转换，使生成的代码看起来完全不像输入的代码。

## 反汇编还是...反编译？

您可以使用像 `wasm2wat` 这样的工具（属于 [WABT](https://github.com/WebAssembly/wabt) 工具包的一部分）将 `.wasm` 转换为 Wasm 的标准文本格式 `.wat`，这是一种非常忠实但并不特别容易阅读的表示。

例如，一个简单的 C 函数，比如点积：

```c
typedef struct { float x, y, z; } vec3;

float dot(const vec3 *a, const vec3 *b) {
    return a->x * b->x +
           a->y * b->y +
           a->z * b->z;
}
```

我们使用 `clang dot.c -c -target wasm32 -O2` 然后用 `wasm2wat -f dot.o` 将其转换为以下 `.wat`：

```wasm
(func $dot (type 0) (param i32 i32) (result f32)
  (f32.add
    (f32.add
      (f32.mul
        (f32.load
          (local.get 0))
        (f32.load
          (local.get 1)))
      (f32.mul
        (f32.load offset=4
          (local.get 0))
        (f32.load offset=4
          (local.get 1))))
    (f32.mul
      (f32.load offset=8
        (local.get 0))
      (f32.load offset=8
        (local.get 1))))))
```

这是一段非常短的代码，但由于许多原因已经不太容易阅读。除了缺乏基于表达式的语法和总体上的冗长，必须将数据结构理解为内存加载并不容易。现在想象一下查看一个大型程序的输出，很快就会变得难以理解。

而不是使用 `wasm2wat`，运行 `wasm-decompile dot.o`，您会得到：

```c
function dot(a:{ a:float, b:float, c:float },
             b:{ a:float, b:float, c:float }):float {
  return a.a * b.a + a.b * b.b + a.c * b.c
}
```

这看起来更加熟悉了。除了基于表达式的语法模仿您可能熟悉的编程语言，反编译器会查看函数中的所有加载和存储，并尝试推断它们的结构。然后为所有作为指针使用的变量添加一个“内联”结构声明。它不会创建命名结构声明，因为它不一定知道三个浮点数的使用是否表示相同的概念。

## 反编译成什么？

`wasm-decompile` 生成的输出试图看起来像一个“非常普通的编程语言”，同时仍然接近它所表现的 Wasm。

其首要目标是可读性：帮助引导读者以尽可能容易理解的代码来了解 `.wasm` 的内容。其次的目标是仍尽可能一对一地表示 Wasm，以保持其作为反汇编的实用性。显然，这两个目标并不总是可以统一的。

这种输出并不是实际的编程语言，目前没有办法将其编译回 Wasm。

### 加载和存储

如上所示，`wasm-decompile` 会查看特定指针上的所有加载和存储。如果它们构成连续的访问集，它将输出其中一个“内联”结构声明。

如果并未访问所有“字段”，它无法确定这是一个结构还是其他形式的无关内存访问。在这种情况下，它会退回到更简单的类型，例如 `float_ptr`（如果类型相同），或在最坏的情况下输出一个数组访问，如 `o[2]:int`，意思是：`o` 指向 `int` 值，我们正在访问第三个值。

这种情况比你想象的发生得多，因为 Wasm 的局部变量更像寄存器而不是变量，因此优化代码可能会为无关对象共享同一指针。

反编译器试图聪明地处理索引，检测诸如 `(base + (index << 2))[0]:int` 的模式，这些模式源自常规的 C 数组索引操作，例如 `base[index]`，其中 `base` 指向一个 4 字节类型。这些模式在代码中非常常见，因为 Wasm 在加载和存储时只有常量偏移。`wasm-decompile` 的输出会将它们转回 `base[index]:int`。

此外，它知道绝对地址什么时候引用数据段。

### 控制流程

最常见的是Wasm的条件语句构造，它翻译成一个熟悉的`if (cond) { A } else { B }`语法，并且在Wasm中，它实际上可以返回一个值，因此它也可以表示某些语言中可用的三元操作符语法`cond ? A : B`。

Wasm的其他控制流程基于`block`和`loop`块，以及`br`、`br_if`和`br_table`跳转。反编译器通常靠近这些构造，而不是试图推断它们可能来自的while/for/switch构造，因为这与优化后的输出效果更好。例如，一个典型的循环在`wasm-decompile`输出中可能看起来如下：

```c
loop A {
  // 循环的具体内容。
  if (cond) continue A;
}
```

这里，`A`是一个标签，允许多个这样的标签嵌套。通过`if`和`continue`控制循环可能相比于while循环看起来有些陌生，但它完全对应于Wasm的`br_if`。

块类似，但不是向后跳转，而是向前跳转：

```c
block {
  if (cond) break;
  // 代码内容在这里。
}
```

这实际上是实现了一个条件语句。未来版本的反编译器可能会在可能的情况下将其翻译为实际的if-then语句。

Wasm最令人惊讶的控制构造是`br_table`，它实现了一些类似于`switch`的功能，但使用嵌套的`block`，往往很难读懂。反编译器通过展平这些使它们稍微更易于理解，例如：

```c
br_table[A, B, C, ..D](a);
label A:
return 0;
label B:
return 1;
label C:
return 2;
label D:
```

这类似于对`a`使用`switch`，其中`D`是默认情况。

### 其他有趣的特性

反编译器：

- 可以从调试或链接信息中提取名称，或自行生成名称。使用现有名称时，它具有特殊代码简化C++名称符号的处理。
- 已经支持多值提案，这使得将内容转化为表达式或语句稍微复杂一些。当返回多个值时，会使用额外的变量。
- 它甚至可以从数据段的_内容_中生成名称。
- 为所有Wasm段类型输出优雅的声明，而不仅仅是代码。例如，当可能时，它试图通过将数据段作为文本输出使其可读。
- 支持操作符优先级（常见于大多数C风格语言），以减少常见表达式中的`()`。

### 局限性

反编译Wasm从根本上讲比反编译JVM字节码更难。

后者是未经优化的，因此相对忠实于原始代码的结构，尽管名称可能丢失，它引用的是唯一的类，而不仅仅是内存位置。

相比之下，大多数`.wasm`输出已经经过LLVM的强力优化，因此往往失去了原始结构。输出代码非常不像程序员编写的代码。这使得Wasm的反编译器更难成为有用的工具，但这并不意味着我们不应该尝试！

## 更多内容

看到更多内容的最佳方式当然是反编译您自己的Wasm项目！

另外，有一份关于`wasm-decompile`的更深入指南见[这里](https://github.com/WebAssembly/wabt/blob/master/docs/decompiler.md)。它的实现可以在[这里](https://github.com/WebAssembly/wabt/tree/master/src)中的以`decompiler`开头的源文件中找到（欢迎提交PR使其更好！）。一些测试用例展示了`.wat`与反编译器之间差异的更多示例见[这里](https://github.com/WebAssembly/wabt/tree/master/test/decompile)。

