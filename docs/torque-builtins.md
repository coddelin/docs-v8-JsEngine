---
title: "V8 Torque 内置函数"
description: "本文档旨在介绍如何编写 Torque 内置函数，目标读者为 V8 开发者。"
---
本文档旨在介绍如何编写 Torque 内置函数，目标读者为 V8 开发者。Torque 取代了 CodeStubAssembler，成为实现新内置函数的推荐方法。参见 [CodeStubAssembler 内置函数](/docs/csa-builtins) 以获取此指南的 CSA 版本。

## 内置函数

在 V8 中，内置函数可以看作是在运行时被 VM 执行的代码块。常见的用例是实现内置对象（如 `RegExp` 或 `Promise`）的功能，但内置函数也可以被用作提供其他内部功能（例如作为 IC 系统的一部分）。

V8 的内置函数可以使用多种不同的方法实现（每种方法都有权衡）：

- **与平台相关的汇编语言**：可能非常高效，但需要手动移植到所有平台，且难以维护。
- **C++**：风格与运行时函数非常相似，可以访问 V8 功能强大的运行时功能，但通常不适合性能敏感的领域。
- **JavaScript**：代码简洁且易读，可访问快速的内置功能，但会频繁使用慢速运行时调用，受类型污染和 JavaScript 语义（复杂且不明显）的微妙问题影响，性能难以预测。JavaScript 内置函数已被弃用，不应再新增。
- **CodeStubAssembler**：提供接近汇编语言的高效低级功能，同时保持与平台无关，并且可读性更强。
- **[V8 Torque](/docs/torque)**：一种 V8 专属的领域专用语言，被翻译为 CodeStubAssembler。因此，它在 CodeStubAssembler 的基础上扩展了静态类型支持，具备更可读和可表达的语法。

本文档后续内容聚焦于上述最后一种，并为开发简单的 Torque 内置函数（可暴露给 JavaScript）提供简要教程。有关 Torque 的更完整信息，请参见 [V8 Torque 用户手册](/docs/torque)。

## 编写一个 Torque 内置函数

在本节中，我们将编写一个简单的 CSA 内置函数，它接受单个参数，并返回该参数是否表示数字 `42`。通过将该内置函数安装在 `Math` 对象上（因为我们可以这么做），将其暴露给 JS。

此示例演示：

- 创建一个具有 JavaScript 链接的 Torque 内置函数，它可以像 JS 函数一样调用。
- 使用 Torque 来实现简单逻辑：类型区分、Smi 和堆数字处理、条件语句。
- 在 `Math` 对象上安装 CSA 内置函数。

如果您希望本地尝试，可以参考以下代码，该代码基于修订版本 [589af9f2](https://chromium.googlesource.com/v8/v8/+/589af9f257166f66774b4fb3008cd09f192c2614)。

## 定义 `MathIs42`

Torque 代码位于 `src/builtins/*.tq` 文件中，根据主题大致分类。由于我们将编写一个 `Math` 内置函数，所以我们会将定义放入 `src/builtins/math.tq` 中。因为这个文件尚不存在，我们需要在 [`BUILD.gn`](https://cs.chromium.org/chromium/src/v8/BUILD.gn) 的 [`torque_files`](https://cs.chromium.org/chromium/src/v8/BUILD.gn?l=914&rcl=589af9f257166f66774b4fb3008cd09f192c2614) 中添加该文件。

```torque
namespace math {
  javascript builtin MathIs42(
      context: Context, receiver: Object, x: Object): Boolean {
    // 在这里，x 可以是基本上的任何东西 - 一个 Smi，一个 HeapNumber，
    // undefined，或者其他任意 JS 对象。ToNumber_Inline 定义于
    // CodeStubAssembler 中。它内联了快速路径（如果参数已经是数字），
    // 否则调用 ToNumber 内置函数。
    const number: Number = ToNumber_Inline(x);
    // 类型切换允许我们根据值的动态类型进行切换。类型系统知道
    // 一个 Number 只能是 Smi 或 HeapNumber，因此这个切换是穷尽的。
    typeswitch (number) {
      case (smi: Smi): {
        // smi == 42 的结果不是一个 JavaScript 布尔值，因此我们使用
        // 条件语句创建一个 JavaScript 布尔值。
        return smi == 42 ? True : False;
      }
      case (heapNumber: HeapNumber): {
        return Convert<float64>(heapNumber) == 42 ? True : False;
      }
    }
  }
}
```

我们将定义放在 Torque 命名空间 `math` 中。由于此命名空间之前不存在，我们需要将其添加到 [`BUILD.gn`](https://cs.chromium.org/chromium/src/v8/BUILD.gn) 的 [`torque_namespaces`](https://cs.chromium.org/chromium/src/v8/BUILD.gn?l=933&rcl=589af9f257166f66774b4fb3008cd09f192c2614) 中。

## 附加 `Math.is42`

内置对象（例如 `Math`）主要在 [`src/bootstrapper.cc`](https://cs.chromium.org/chromium/src/v8/src/bootstrapper.cc?q=src/bootstrapper.cc+package:%5Echromium$&l=1) 中设置（部分设置发生在 `.js` 文件中）。添加我们新的内置对象非常简单：

```cpp
// 设置 Math 的现有代码，这里包含这些代码是为了更清晰。
Handle<JSObject> math = factory->NewJSObject(cons, TENURED);
JSObject::AddProperty(global, name, math, DONT_ENUM);
// […省略…]
SimpleInstallFunction(isolate_, math, "is42", Builtins::kMathIs42, 1, true);
```

现在 `is42` 已经附加，可以通过 JS 调用：

```bash
$ out/debug/d8
d8> Math.is42(42);
true
d8> Math.is42('42.0');
true
d8> Math.is42(true);
false
d8> Math.is42({ valueOf: () => 42 });
true
```

## 使用存根链接定义和调用内置对象

内置对象还可以使用存根链接创建（而不是我们在 `MathIs42` 中使用的 JS 链接）。这种内置对象可以用于提取常用代码到一个独立的代码对象中，以便多个调用者可以使用，而代码只需生成一次。让我们将处理堆数字的代码提取到一个名为 `HeapNumberIs42` 的新内置对象中，然后从 `MathIs42` 中调用它。

定义也很简单。与具有 Javascript 链接的内置对象的唯一不同是我们省略了关键字 `javascript`，并且没有接收者参数。

```torque
namespace math {
  builtin HeapNumberIs42(implicit context: Context)(heapNumber: HeapNumber):
      Boolean {
    return Convert<float64>(heapNumber) == 42 ? True : False;
  }

  javascript builtin MathIs42(implicit context: Context)(
      receiver: Object, x: Object): Boolean {
    const number: Number = ToNumber_Inline(x);
    typeswitch (number) {
      case (smi: Smi): {
        return smi == 42 ? True : False;
      }
      case (heapNumber: HeapNumber): {
        // 现在，我们调用新的内置对象，而不是内联处理堆数字。
        return HeapNumberIs42(heapNumber);
      }
    }
  }
}
````

为什么你需要关心内置对象？为什么不将代码保持内联（或为了提高可读性提取到宏中）？

一个重要原因是代码空间：内置对象在编译时生成，并包含在 V8 快照或嵌入到二进制文件中。将常用的大块代码提取到独立的内置对象可以迅速在几十到几百 KB 范围内节省空间。

## 测试存根链接内置对象

尽管我们新的内置对象使用的是非标准（至少不是 C++）调用约定，但仍然可以为其编写测试用例。以下代码可以添加到 [`test/cctest/compiler/test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc) 中，以在所有平台上测试内置对象：

```cpp
TEST(MathIsHeapNumber42) {
  HandleAndZoneScope scope;
  Isolate* isolate = scope.main_isolate();
  Heap* heap = isolate->heap();
  Zone* zone = scope.main_zone();

  StubTester tester(isolate, zone, Builtins::kMathIs42);
  Handle<Object> result1 = tester.Call(Handle<Smi>(Smi::FromInt(0), isolate));
  CHECK(result1->BooleanValue());
}
```
