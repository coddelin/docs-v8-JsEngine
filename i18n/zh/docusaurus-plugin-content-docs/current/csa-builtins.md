---
title: &apos;CodeStubAssembler 内建函数&apos;
description: &apos;本文档旨在为编写 CodeStubAssembler 内建函数提供入门指导，目标读者为 V8 开发者。&apos;
---
本文档旨在为编写 CodeStubAssembler 内建函数提供入门指导，目标读者为 V8 开发者。

:::note
**注意：** [Torque](/docs/torque) 已取代 CodeStubAssembler，成为实现新内建函数的推荐方式。请参阅 [Torque 内建函数](/docs/torque-builtins)了解本指南的 Torque 版本。
:::

## 内建函数

在 V8 中，内建函数可以看作是运行时虚拟机可执行的代码块。一个常见的用例是实现内置对象（如 RegExp 或 Promise）的功能，但内建函数也可用于提供其他内部功能（例如作为 IC 系统的一部分）。

V8 的内建函数可以通过多种不同的方法实现（每种方法有不同的权衡）：

- **平台相关的汇编语言**：可以非常高效，但需要手动移植到所有平台且难以维护。
- **C++**：在风格上非常类似于运行时函数，可以访问 V8 的强大运行时功能，但通常不适合性能敏感区域。
- **JavaScript**：代码简洁且可读性强，可访问快速内建函数，但频繁使用较慢的运行时调用，容易因类型污染导致性能不可预测，还存在与（复杂且难以察觉的）JS 语义相关的微妙问题。
- **CodeStubAssembler**：提供非常接近汇编语言但仍保持平台独立性和可读性的高效低级功能。

本文档的其余部分将重点介绍最后一种方法，并为开发一个暴露给 JavaScript 的简单 CodeStubAssembler (CSA) 内建函数提供简要的教程。

## CodeStubAssembler

V8 的 CodeStubAssembler 是一个定制的、与平台无关的汇编器，它提供基于汇编的低级原语，同时还提供广泛的高级功能库。

```cpp
// 低级操作：
// 将 addr 中指针大小的数据加载到 value 中。
Node* addr = /* ... */;
Node* value = Load(MachineType::IntPtr(), addr);

// 高级操作：
// 执行 JS 操作 ToString(object)。
// ToString 语义详见 https://tc39.es/ecma262/#sec-tostring。
Node* object = /* ... */;
Node* string = ToString(context, object);
```

CSA 内建函数会通过部分 TurboFan 编译流水线（包括块调度和寄存器分配，但特别不包括优化阶段），随后生成最终的可执行代码。

## 编写一个 CodeStubAssembler 内建函数

在本部分中，我们将编写一个简单的 CSA 内建函数，该函数接收一个参数，返回其是否表示数字 `42`。通过将其安装到 `Math` 对象上（因为我们可以这样做）使其暴露给 JS。

本示例展示了以下内容：

- 创建具有 JavaScript 链接的 CSA 内建函数，可像 JS 函数一样调用。
- 使用 CSA 实现简单逻辑：处理 Smi 和堆数字、条件语句，以及调用 TFS 内建函数。
- 使用 CSA 变量。
- 将 CSA 内建函数安装到 `Math` 对象上。

如果您想在本地跟随练习，以下代码基于修订版本 [7a8d20a7](https://chromium.googlesource.com/v8/v8/+/7a8d20a79f9d5ce6fe589477b09327f3e90bf0e0)。

## 声明 `MathIs42`

内建函数在 [`src/builtins/builtins-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h?q=builtins-definitions.h+package:%5Echromium$&l=1) 文件中的 `BUILTIN_LIST_BASE` 宏中声明。要创建一个带有 JS 链接和一个名为 `X` 参数的新 CSA 内建函数：

```cpp
#define BUILTIN_LIST_BASE(CPP, API, TFJ, TFC, TFS, TFH, ASM, DBG)              \
  // […省略…]
  TFJ(MathIs42, 1, kX)                                                         \
  // […省略…]
```

请注意，`BUILTIN_LIST_BASE` 接受几个不同的宏，以表示不同类型的内建函数（详见内联文档）。专门用于 CSA 的内建函数分为以下几类：

- **TFJ**：JavaScript 链接。
- **TFS**：存根链接。
- **TFC**：需要自定义接口描述符的存根链接内建函数（例如，如果参数是非标记的或需要被传递到特定的寄存器中）。
- **TFH**：用于 IC 处理器的特殊存根链接内建函数。

## 定义 `MathIs42`

内建函数定义位于 `src/builtins/builtins-*-gen.cc` 文件中，大致按主题组织。由于我们将编写一个 `Math` 内建函数，因此我们会将定义放入 [`src/builtins/builtins-math-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-math-gen.cc?q=builtins-math-gen.cc+package:%5Echromium$&l=1)。

```cpp
// TF_BUILTIN 是一个方便的宏，用于在后台为给定的汇编器创建一个新子类。
TF_BUILTIN(MathIs42, MathBuiltinsAssembler) {
  // 加载当前函数上下文（每个存根都会隐式传递一个参数）
  // 和 X 参数。注意我们可以通过内置声明中定义的参数名称来引用参数。
  //
  Node* const context = Parameter(Descriptor::kContext);
  Node* const x = Parameter(Descriptor::kX);

  // 此时，x 可以是任何东西——如 Smi、HeapNumber、undefined 或任意其他的 JS 对象。
  // 让我们调用 ToNumber 的内置函数以将 x 转换为一个可用的数字。
  // CallBuiltin 可用于方便地调用任何 CSA 内置。
  Node* const number = CallBuiltin(Builtins::kToNumber, context, x);

  // 创建一个 CSA 变量来存储结果值。该变量的类型是 kTagged ，
  // 因为我们只会存储标记指针。
  VARIABLE(var_result, MachineRepresentation::kTagged);

  // 我们需要定义一些标签来作为跳转目标。
  Label if_issmi(this), if_isheapnumber(this), out(this);

  // ToNumber 总是返回一个数字。我们需要区分 Smi 和堆数字——
  // 在这里，我们检查 number 是否是一个 Smi 并有条件地跳转到相应的标签。
  Branch(TaggedIsSmi(number), &if_issmi, &if_isheapnumber);

  // 绑定标签开始生成代码。
  BIND(&if_issmi);
  {
    // SelectBooleanConstant 返回 JS 的 true/false 值，
    // 具体取决于传递的条件是真还是假。结果绑定到我们的
    // var_result 变量中，然后我们无条件跳转到 out 标签。
    var_result.Bind(SelectBooleanConstant(SmiEqual(number, SmiConstant(42))));
    Goto(&out);
  }

  BIND(&if_isheapnumber);
  {
    // ToNumber 只能返回 Smi 或堆数字。为了确认这一点，
    // 我们在这里添加了一个断言，验证 number 确实是堆数字。
    CSA_ASSERT(this, IsHeapNumber(number));
    // 堆数字包含浮点值。我们需要显式提取该值，进行浮点比较，
    // 并根据结果再次绑定 var_result。
    Node* const value = LoadHeapNumberValue(number);
    Node* const is_42 = Float64Equal(value, Float64Constant(42));
    var_result.Bind(SelectBooleanConstant(is_42));
    Goto(&out);
  }

  BIND(&out);
  {
    Node* const result = var_result.value();
    CSA_ASSERT(this, IsBoolean(result));
    Return(result);
  }
}
```

## 将 `Math.Is42` 绑定到对象

像 `Math` 这样的内置对象大部分是在 [`src/bootstrapper.cc`](https://cs.chromium.org/chromium/src/v8/src/bootstrapper.cc?q=src/bootstrapper.cc+package:%5Echromium$&l=1) 中设置的（部分设置在 `.js` 文件中完成）。绑定我们新的内置函数非常简单：

```cpp
// 用于设置 Math 的现有代码，这里用于说明。
Handle<JSObject> math = factory->NewJSObject(cons, TENURED);
JSObject::AddProperty(global, name, math, DONT_ENUM);
// […省略…]
SimpleInstallFunction(math, "is42", Builtins::kMathIs42, 1, true);
```

现在 `Is42` 已经绑定到对象，可以在 JS 中调用它了：

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

## 用存根链接定义和调用内置函数

CSA 内置函数也可以通过存根链接创建（而不是我们在 `MathIs42` 中使用的 JS 链接）。
这样的内置函数可用于将常用代码提取到单独的代码对象中，多个调用者可以使用同一个代码，这样代码只需生成一次。
让我们提取处理堆数字的代码到一个名为 `MathIsHeapNumber42` 的独立内置函数中，并从 `MathIs42` 中调用它。

定义和使用 TFS 存根很简单；声明同样放在 [`src/builtins/builtins-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h?q=builtins-definitions.h+package:%5Echromium$&l=1)：

```cpp
#define BUILTIN_LIST_BASE(CPP, API, TFJ, TFC, TFS, TFH, ASM, DBG)              \
  // […省略…]
  TFS(MathIsHeapNumber42, kX)                                                  \
  TFJ(MathIs42, 1, kX)                                                         \
  // […省略…]
```

注意，目前，在 `BUILTIN_LIST_BASE` 中的顺序确实很重要。由于 `MathIs42` 调用了 `MathIsHeapNumber42`，前者需要列在后者后面（此限制应该会在某些时候解除）。

定义也非常简单。在 [`src/builtins/builtins-math-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-math-gen.cc?q=builtins-math-gen.cc+package:%5Echromium$&l=1)：

```cpp
// 定义 TFS 内置函数与定义 TFJ 内置函数完全相同。
TF_BUILTIN(MathIsHeapNumber42, MathBuiltinsAssembler) {
  Node* const x = Parameter(Descriptor::kX);
  CSA_ASSERT(this, IsHeapNumber(x));
  Node* const value = LoadHeapNumberValue(x);
  Node* const is_42 = Float64Equal(value, Float64Constant(42));
  Return(SelectBooleanConstant(is_42));
}
```

最后，让我们从 `MathIs42` 中调用新的内置函数：

```cpp
TF_BUILTIN(MathIs42, MathBuiltinsAssembler) {
  // […省略…]
  BIND(&if_isheapnumber);
  {
    // 现在我们调用新的 TFS stub，而不是内联处理堆数字。
    var_result.Bind(CallBuiltin(Builtins::kMathIsHeapNumber42, context, number));
    Goto(&out);
  }
  // […省略…]
}
```

为什么你应该关心 TFS 内建函数？为什么不将代码内联（或提取成一个辅助方法以提高可读性）？

一个重要原因是代码空间：内建函数在编译时生成并包含在 V8 快照中，因此在每个创建的 isolate 中无条件地占用（显著）空间。从常用代码中提取出大块的内容至 TFS 内建函数可以迅速节省 10 到 100 KB 的空间。

## 测试 Stub-Linkage 内建函数

尽管我们新的内建函数使用非标准（至少非 C++）调用约定，但仍然可以为其编写测试用例。以下代码可以添加到 [`test/cctest/compiler/test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc?l=1&rcl=4cab16db27808cf66ab883e7904f1891f9fd0717) 中，以在所有平台上测试该内建函数：

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
