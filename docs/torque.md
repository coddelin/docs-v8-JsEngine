---
title: "V8 Torque 用户手册"
description: "本文档解释了 V8 Torque 语言在 V8 代码库中的使用方式。"
---
V8 Torque 是一种语言，它允许为 V8 项目做贡献的开发人员通过专注于对虚拟机更改的 _意图_ 来表达这些更改，而不是被不相关的实现细节分开注意力。该语言设计得足够简单，可以轻松将 [ECMAScript 规范](https://tc39.es/ecma262/) 直接转换为 V8 中的实现，同时又足够强大，可以以强大的方式表达低级别 V8 的优化技巧，比如基于特定对象形状的测试创建快速路径。

Torque 对 V8 工程师和 JavaScript 开发人员来说应该很熟悉，它结合了类似 TypeScript 的语法，使得编写和理解 V8 代码变得更容易，同时使用反映 [`CodeStubAssembler`](/blog/csa) 中常见概念的语法和类型。通过强大的类型系统和结构化的控制流，Torque 通过结构确保正确性。Torque 的表达能力足以表达 [目前在 V8 中发现的内置函数功能](/docs/builtin-functions)。它还与用 C++ 编写的 `CodeStubAssembler` 内置函数和 `macro` 非常兼容，允许 Torque 代码使用手写的 CSA 功能，反之亦然。

Torque 提供了语言结构，用于表示 V8 实现中高级语义丰富的片段，Torque 编译器使用 `CodeStubAssembler` 将这些片段转换为高效的汇编代码。Torque 的语言结构和 Torque 编译器的错误检查以过去直接使用 `CodeStubAssembler` 时费力且容易出错的方式确保了正确性。传统上，使用 `CodeStubAssembler` 编写优化代码需要 V8 工程师携带大量专门知识，而这些知识通常未以任何书面文档形式正式记录下来，以避免实现中的隐性陷阱。没有这些知识，编写高效内置函数的学习曲线就很陡峭。即使具备必要知识，不明显且未受约束的陷阱常常导致正确性问题或 [安全](https://bugs.chromium.org/p/chromium/issues/detail?id=775888) [漏洞](https://bugs.chromium.org/p/chromium/issues/detail?id=785804)。使用 Torque，许多这些陷阱可以通过 Torque 编译器自动识别和避免。

## 入门教程

大多数 Torque 编写的源码被提交到 V8 仓库 [位于 `src/builtins` 目录](https://github.com/v8/v8/tree/master/src/builtins)，文件扩展名为 `.tq`。V8 的堆分配类的 Torque 定义与其 C++ 定义一起存在于 `.tq` 文件中，这些文件的名称与 `src/objects` 中的相应 C++ 文件的名称相同。实际的 Torque 编译器可以在 [`src/torque`](https://github.com/v8/v8/tree/master/src/torque) 下找到。Torque 功能的测试存储于 [`test/torque`](https://github.com/v8/v8/tree/master/test/torque)、[`test/cctest/torque`](https://github.com/v8/v8/tree/master/test/cctest/torque) 和 [`test/unittests/torque`](https://github.com/v8/v8/tree/master/test/unittests/torque)。

为了让您体验一下这种语言，我们将编写一个 V8 内置函数来打印“Hello World！”。为此，我们将在测试案例中添加一个 Torque `macro` 并从 `cctest` 测试框架中调用它。

首先打开 `test/torque/test-torque.tq` 文件，并在末尾添加以下代码（但位于最后一个闭合 `}` 之前）：

```torque
@export
macro PrintHelloWorld(): void {
  Print('Hello world!');
}
```

接下来，打开 `test/cctest/torque/test-torque.cc` 文件，并添加以下测试案例，用新 Torque 代码构建一个代码 stub：

```cpp
TEST(HelloWorld) {
  Isolate* isolate(CcTest::InitIsolateOnce());
  CodeAssemblerTester asm_tester(isolate, JSParameterCount(0));
  TestTorqueAssembler m(asm_tester.state());
  {
    m.PrintHelloWorld();
    m.Return(m.UndefinedConstant());
  }
  FunctionTester ft(asm_tester.GenerateCode(), 0);
  ft.Call();
}
```

然后 [构建 `cctest` 可执行文件](/docs/test)，最后运行 `cctest` 测试以打印 ‘Hello world’：

```bash
$ out/x64.debug/cctest test-torque/HelloWorld
Hello world!
```

## Torque 如何生成代码

Torque 编译器不会直接创建机器代码，而是生成调用 V8 的现有 `CodeStubAssembler` 接口的 C++ 代码。`CodeStubAssembler` 使用 [TurboFan 编译器](https://v8.dev/docs/turbofan) 的后端生成高效的代码。因此，Torque 编译需要多个步骤：

1. `gn` 构建首先运行 Torque 编译器。它处理所有 `*.tq` 文件。每个 Torque 文件 `path/to/file.tq` 会生成以下文件：
    - `path/to/file-tq-csa.cc` 和 `path/to/file-tq-csa.h` 包含生成的 CSA 宏。
    - `path/to/file-tq.inc` 被包含在对应的头文件 `path/to/file.h` 中，内容为类定义。
    - `path/to/file-tq-inl.inc` 被包含在对应的内联头文件 `path/to/file-inl.h` 中，内容为类定义的 C++ 访问器。
    - `path/to/file-tq.cc` 包含生成的堆验证器、打印器等。

    Torque 编译器还会生成其他各种已知的 `.h` 文件，供 V8 构建使用。
1. `gn` 构建然后将步骤 1 中生成的 `-csa.cc` 文件编译为 `mksnapshot` 可执行文件。
1. 当运行 `mksnapshot` 时，所有 V8 的内建函数都会生成并打包到快照文件中，包括在 Torque 中定义的内建函数以及使用 Torque 定义功能的其他内建函数。
1. 接着构建 V8 的其余部分。所有由 Torque 编写的内建函数都通过链接到 V8 的快照文件变得可用。它们可以像其他内建函数一样调用。此外，`d8` 或 `chrome` 可执行文件也直接包括与类定义相关的生成编译单元。

从图形上看，构建过程如下：

<figure>
  <img src="/_img/docs/torque/build-process.svg" width="800" height="480" alt="" loading="lazy"/>
</figure>

## Torque 工具

Torque 提供了基础的工具和开发环境支持。

- 有一个 [Visual Studio Code 插件](https://github.com/v8/vscode-torque) 用于 Torque，它使用自定义的语言服务器提供跳转到定义等功能。
- 还有一个格式化工具应该在更改 `.tq` 文件后使用：`tools/torque/format-torque.py -i <filename>`

## 有关 Torque 的构建问题排查

为什么需要了解这些？了解 Torque 文件如何转换为机器代码很重要，因为在将 Torque 转换为嵌入快照的二进制数据的过程中，不同阶段可能会出现不同的问题（和错误）：

- 如果 Torque 代码（即 `.tq` 文件）中存在语法或语义错误，Torque 编译器会失败。V8 构建会在此阶段中止，您将不会看到由构建后期暴露的其他错误。
- 一旦您的 Torque 代码在语法上正确并通过了 Torque 编译器（多多少少严格）的语义检查，`mksnapshot` 的构建仍然可能失败。这通常发生在 `.tq` 文件提供的外部定义不一致的情况下。在 Torque 代码中使用 `extern` 关键字标记的定义告诉 Torque 编译器，所需功能的定义在 C++ 中。目前，`.tq` 文件中 `extern` 定义与其引用的 C++ 代码之间的关联是松散的，并且在 Torque 编译时没有对此关联的验证。当 `extern` 定义与它们在 `code-stub-assembler.h` 头文件或其他 V8 头文件中访问的功能不匹配（或在更微妙的情况下掩盖了这些功能）时，`mksnapshot` 的 C++ 构建会失败。
- 即使 `mksnapshot` 成功构建，在运行时仍可能失败。例如，这可能是因为 Turbofan 无法编译生成的 CSA 代码，原因可能是 Torque 的 `static_assert` 无法通过 Turbofan 验证。此外，在创建快照期间运行的 Torque 提供的内建函数可能存在错误。例如，`Array.prototype.splice`（一个由 Torque 编写的内建函数）在 JavaScript 快照初始化进程中被调用以设置默认的 JavaScript 环境。如果实现中存在错误，`mksnapshot` 在执行过程中会崩溃。当 `mksnapshot` 崩溃时，有时调用 `mksnapshot` 并传递 `--gdb-jit-full` 标志很有用，它会生成额外的调试信息，提供有用的上下文，例如在 `gdb` 堆栈追踪中显示 Torque 生成的内建函数的名称。
- 当然，即使 Torque 编写的代码通过了 `mksnapshot`，它仍然可能存在错误或崩溃。向 `torque-test.tq` 和 `torque-test.cc` 添加测试用例是确保您的 Torque 代码实际符合预期的好方法。如果您的 Torque 代码最终在 `d8` 或 `chrome` 中崩溃，`--gdb-jit-full` 标志同样非常有用。

## `constexpr`：编译时与运行时

了解 Torque 的构建过程还有助于理解 Torque 语言中的一个核心特性：`constexpr`。

Torque 允许在运行时（即当 V8 内建函数作为 JavaScript 执行的一部分执行时）在 Torque 代码中计算表达式。然而，它也允许在编译时（即作为 Torque 构建过程的一部分，并且在 V8 库和 `d8` 可执行文件被创建之前）计算表达式。

Torque使用`constexpr`关键字来表示一个表达式必须在构建时进行求值。其用法与[C++的`constexpr`](https://en.cppreference.com/w/cpp/language/constexpr)有些类似：除了从C++借用了`constexpr`关键字及其部分语法外，Torque也用`constexpr`来区分编译时求值和运行时求值。

然而，Torque中的`constexpr`语义和C++的`constexpr`之间也有一些微妙的差别。在C++中，`constexpr`表达式可以完全由C++编译器求值。而在Torque中，`constexpr`表达式不能完全由Torque编译器求值，而是映射到C++类型、变量和表达式，这些可以（并且必须）在运行`mksnapshot`时完全求值。从Torque的开发者角度来看，`constexpr`表达式不会生成在运行时执行的代码，因此从这个意义上说是编译时的，即使它们技术上是由Torque外部的C++代码（`mksnapshot`运行时）求值的。因此，在Torque中，`constexpr`本质上表示“`mksnapshot`时”，而不是“编译时”。

结合泛型，`constexpr`是Torque中的一个强大工具，可以用来自动生成多个非常高效的专用内置函数，这些函数在V8开发人员事先可以预见的少量特定细节上有所不同。

## 文件

Torque代码封装在各个独立的源文件中。每个源文件由一系列声明组成，这些声明本身可以选择性地包含在一个命名空间声明中，以分离声明的命名空间。下面对语法的描述可能已经过时。可信的来源是[Torque编译器中的语法定义](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/torque/torque-parser.cc?q=TorqueGrammar::TorqueGrammar)，该定义使用上下文无关语法规则编写。

一个Torque文件是声明的序列。可能的声明列在[`torque-parser.cc`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/torque/torque-parser.cc?q=TorqueGrammar::declaration)中。

## 命名空间

Torque命名空间允许在独立命名空间中声明。它们类似于C++的命名空间。它们允许创建在其他命名空间中不自动可见的声明。它们可以嵌套，嵌套命名空间中的声明可以不带限定符地访问包含它们的命名空间中的声明。未明确在命名空间声明中的声明放置在对所有命名空间都可见的共享全局默认命名空间中。命名空间可以重新打开，允许它们跨多个文件定义。

例如：

```torque
macro IsJSObject(o: Object): bool { … }  // 在默认命名空间中

namespace array {
  macro IsJSArray(o: Object): bool { … }  // 在array命名空间中
};

namespace string {
  // …
  macro TestVisibility() {
    IsJsObject(o); // OK，默认命名空间在这里可见
    IsJSArray(o);  // 错误，不在此命名空间中可见
    array::IsJSArray(o);  // OK，显式命名空间限定
  }
  // …
};

namespace array {
  // OK，命名空间已重新打开。
  macro EnsureWriteableFastElements(array: JSArray){ … }
};
```

## 声明

### 类型

Torque是强类型的。其类型系统是其提供的许多安全性和正确性保障的基础。

对于许多基本类型，Torque实际上并不了解很多关于它们的内容。相反，许多类型只是通过显式类型映射与`CodeStubAssembler`和C++类型松散耦合，并依赖C++编译器来强制执行该映射的严密性。这些类型以抽象类型实现。

#### 抽象类型

Torque的抽象类型直接映射到C++编译时和`CodeStubAssembler`运行时值。它们的声明指定名称以及与C++类型的关系：

```grammar
AbstractTypeDeclaration :
  type IdentifierName ExtendsDeclaration opt GeneratesDeclaration opt ConstexprDeclaration opt

ExtendsDeclaration :
  extends IdentifierName ;

GeneratesDeclaration :
  generates StringLiteral ;

ConstexprDeclaration :
  constexpr StringLiteral ;
```

`IdentifierName`指定了抽象类型的名称，`ExtendsDeclaration`可选地指定声明类型派生自的类型。`GeneratesDeclaration`可选地指定一个字面字符串，对应于`CodeStubAssembler`代码中用来包含其类型运行时值的C++ `TNode`类型。`ConstexprDeclaration`是一个字面字符串，指定与Torque类型在构建时（`mksnapshot`时）求值对应的C++类型。

以下是`base.tq`中Torque的31位和32位有符号整数类型的一个示例：

```torque
type int32 generates 'TNode<Int32T>' constexpr 'int32_t';
type int31 extends int32 generates 'TNode<Int32T>' constexpr 'int31_t';
```

#### 联合类型

联合类型表示一个值属于多个可能的类型之一。我们仅允许对标记值使用联合类型，因为它们可以通过映射指针在运行时区分。例如，JavaScript中的数字值要么是Smi值，要么是分配的`HeapNumber`对象。

```torque
type Number = Smi | HeapNumber;
```

联合类型满足以下等式：

- `A | B = B | A`
- `A | (B | C) = (A | B) | C`
- `A | B = A` 如果 `B` 是 `A` 的子类型

仅允许从带标签的类型构成联合类型，因为无法在运行时区分无标签类型。

在将联合类型映射到CSA时，选择联合类型中所有类型的最具体共同超类型，`Number` 和 `Numeric` 除外，它们映射到相应的CSA联合类型。

#### 类类型

类类型使得可以从Torque代码中在V8 GC堆上定义、分配和操作结构化对象。每个Torque类类型必须对应C++代码中的HeapObject的子类。为了尽可能减少在V8的C++和Torque实现之间维护样板对象访问代码的开销，Torque类定义会生成所需的C++对象访问代码（尽可能且适当），以减少手动同步C++和Torque的麻烦。

```grammar
ClassDeclaration :
  ClassAnnotation* extern opt transient opt class IdentifierName ExtendsDeclaration opt GeneratesDeclaration opt {
    ClassMethodDeclaration*
    ClassFieldDeclaration*
  }

ClassAnnotation :
  @doNotGenerateCppClass
  @generateBodyDescriptor
  @generatePrint
  @abstract
  @export
  @noVerifier
  @hasSameInstanceTypeAsParent
  @highestInstanceTypeWithinParentClassRange
  @lowestInstanceTypeWithinParentClassRange
  @reserveBitsInInstanceType ( NumericLiteral )
  @apiExposedInstanceTypeValue ( NumericLiteral )

ClassMethodDeclaration :
  transitioning opt IdentifierName ImplicitParameters opt ExplicitParameters ReturnType opt LabelsDeclaration opt StatementBlock

ClassFieldDeclaration :
  ClassFieldAnnotation* weak opt const opt FieldDeclaration;

ClassFieldAnnotation :
  @noVerifier
  @if ( Identifier )
  @ifnot ( Identifier )

FieldDeclaration :
  Identifier ArraySpecifier opt : Type ;

ArraySpecifier :
  [ Expression ]
```

一个类的示例：

```torque
extern class JSProxy extends JSReceiver {
  target: JSReceiver|Null;
  handler: JSReceiver|Null;
}
```

`extern` 表示该类在C++中定义，而不是仅在Torque中定义。

类中的字段声明会隐式生成可以从CodeStubAssembler中使用的字段getter和setter，例如：

```cpp
// 在 TorqueGeneratedExportedMacrosAssembler:
TNode<HeapObject> LoadJSProxyTarget(TNode<JSProxy> p_o);
void StoreJSProxyTarget(TNode<JSProxy> p_o, TNode<HeapObject> p_v);
```

如上所述，Torque类中定义的字段会生成C++代码，减少重复的样板访问器和堆访问代码的需求。JSProxy的手写定义必须继承自生成的类模板，例如：

```cpp
// 在 js-proxy.h:
class JSProxy : public TorqueGeneratedJSProxy<JSProxy, JSReceiver> {

  // 类需要的内容超出Torque生成部分可以放在这里...

  // 最后，因为它会影响公有/私有:
  TQ_OBJECT_CONSTRUCTORS(JSProxy)
}

// 在 js-proxy-inl.h:
TQ_OBJECT_CONSTRUCTORS_IMPL(JSProxy)
```

生成的类提供强制转换函数、字段访问器函数和字段偏移常量（例如在此情况下的`kTargetOffset`和`kHandlerOffset`），表示字段从类起始位置的字节偏移量。

##### 类类型注释

某些类不能使用上述示例中的继承模式。在这些情况下，该类可以指定`@doNotGenerateCppClass`，直接从其超类类型继承，并包含用于字段偏移常量的Torque生成宏。此类必须实现其自己的访问器和强制转换函数。使用该宏的示例如下：

```cpp
class JSProxy : public JSReceiver {
 public:
  DEFINE_FIELD_OFFSET_CONSTANTS(
      JSReceiver::kHeaderSize, TORQUE_GENERATED_JS_PROXY_FIELDS)
  // 类的其他内容已省略...
}
```

`@generateBodyDescriptor` 使Torque在生成的类中输出一个类 `BodyDescriptor`，该描述符表示垃圾回收器应如何访问对象。否则C++代码必须自己定义对象访问或者使用已有模式（例如，继承自`Struct`并将类包含在`STRUCT_LIST`中，表示该类预期仅包含带标签的值）。

如果添加了 `@generatePrint` 注释，则生成器将实现一个C++函数，按照Torque布局打印字段值。使用JSProxy示例，其签名将是 `void TorqueGeneratedJSProxy<JSProxy, JSReceiver>::JSProxyPrint(std::ostream& os)`，可以由 `JSProxy`继承。

Torque 编译器还会为所有 `extern` 类生成验证代码，除非该类使用 `@noVerifier` 注解选择退出。例如，上述 JSProxy 类的定义将生成一个 C++ 方法 `void TorqueGeneratedClassVerifiers::JSProxyVerify(JSProxy o, Isolate* isolate)`，该方法根据 Torque 类型定义验证其字段是否有效。它还将在生成的类上生成一个对应的方法 `TorqueGeneratedJSProxy<JSProxy, JSReceiver>::JSProxyVerify`，该方法调用来自 `TorqueGeneratedClassVerifiers` 的静态函数。如果想为某个类添加额外验证（例如对数字的可接受值范围的约束，或者要求字段 `foo` 为 true 时字段 `bar` 非空，等等），则需要在 C++ 类中添加 `DECL_VERIFIER(JSProxy)`（隐藏继承的 `JSProxyVerify`）并在 `src/objects-debug.cc` 中实现它。任何此类自定义验证器的第一步都应该调用生成的验证器，例如 `TorqueGeneratedClassVerifiers::JSProxyVerify(*this, isolate);`。（要在每次垃圾收集前后运行这些验证器，可以在构建时开启 `v8_enable_verify_heap = true` 并使用 `--verify-heap` 运行。）

`@abstract` 表示该类本身不实例化，也没有自己的实例类型：逻辑上属于该类的实例类型是派生类的实例类型。

`@export` 注解使 Torque 编译器生成一个具体的 C++ 类（例如上述示例中的 `JSProxy`）。显然，这仅在不希望添加任何超出 Torque 生成代码所提供功能的 C++ 功能的情况下才有用。不能与 `extern` 一起使用。对于仅在 Torque 内部定义和使用的类，最适合既不使用 `extern` 也不使用 `@export`。

`@hasSameInstanceTypeAsParent` 表示类与其父类具有相同的实例类型，但重命名了一些字段，或者可能具有不同的映射。在这种情况下，父类不是抽象的。

`@highestInstanceTypeWithinParentClassRange`、`@lowestInstanceTypeWithinParentClassRange`、`@reserveBitsInInstanceType` 和 `@apiExposedInstanceTypeValue` 这些注解都会影响实例类型的生成。一般来说，您可以忽略这些设置而不会有问题。Torque 负责为列举在 `v8::internal::InstanceType` 中的每个类分配唯一的值，以便 V8 在运行时可以确定 JS 堆中任何对象的类型。Torque 的实例类型分配在绝大多数情况下都足够了，但在某些情况下，我们希望某个特定类的实例类型在不同的构建间保持稳定，或者位于为其超类分配的实例类型范围的起始或末尾，或是用于可以在 Torque 之外定义的一组保留值。

##### 类字段

除了如上述示例中的普通值外，类字段也可以包含索引数据。以下是一个示例：

```torque
extern class CoverageInfo extends HeapObject {
  const slot_count: int32;
  slots[slot_count]: CoverageInfoSlot;
}
```

这意味着 `CoverageInfo` 的实例的大小根据 `slot_count` 中的数据而变化。

与 C++ 不同，Torque 不会在字段之间隐式添加填充；如果字段未正确对齐，它将失败并发出错误。Torque 还要求强引用字段、弱引用字段和标量字段在字段顺序中与同类别的其他字段放在一起。

`const` 意味着某个字段不能在运行时修改（或者至少不易修改；如果尝试设置该字段，Torque 将导致编译失败）。对于长度字段来说这是一个好主意，因为它们只应在极为谨慎的情况下重置，重置需要释放任何已释放的空间，且可能导致与标记线程之间的数据竞争。
实际上，Torque 要求用于索引数据的长度字段必须是 `const`。

`weak` 声明字段时意味着该字段是自定义弱引用，与弱字段的 `MaybeObject` 标记机制相对。此外，`weak` 还会影响常量生成，例如 `kEndOfStrongFieldsOffset` 和 `kStartOfWeakFieldsOffset`，这是用于一些自定义 `BodyDescriptor` 的遗留功能，目前仍然需要将标记为 `weak` 的字段分组在一起。一旦 Torque 完全能够生成所有的 `BodyDescriptor`, 我们希望移除此关键词。

如果字段中存储的对象可能是 `MaybeObject` 风格的弱引用（第二位被设置），则应在类型中使用 `Weak<T>`，而不应使用 `weak` 关键词。该规则仍有一些例外，如 `Map` 的此字段，包含一些强引用和弱引用类型，同时也为了包含在弱引用段而被标记为 `weak`：

```torque
  weak transitions_or_prototype_info: Map|Weak<Map>|TransitionArray|
      PrototypeInfo|Smi;
```

`@if` 和 `@ifnot` 标记只有在某些构建配置中应包含的字段。它们接受来自 `src/torque/torque-parser.cc` 中 `BuildFlags` 列表的值。

##### 完全在 Torque 外部定义的类

有些类并未在 Torque 中定义，但 Torque 必须知道每个类，因为它负责分配实例类型。在这种情况下，可以声明类而不提供具体内容，Torque 除了实例类型外将不会为其生成任何其他内容。例如：

```torque
extern class OrderedHashMap extends HashTable;
```

#### 形状

定义 `shape` 看起来与定义 `class` 很相似，只是它使用 `shape` 作为关键词。`shape` 是 `JSObject` 的子类型，表示一个时间点上的对象属性排列方式（在规范术语中，这些是所谓的 "数据属性" 而非 "内部槽"）。`shape` 没有自己的实例类型。具有特定形状的对象可能随时变化并失去该形状，因为该对象可能进入字典模式，并将所有的属性移到一个独立的存储区。

#### 结构体

`struct` 是一组数据的集合，可以方便地一起传递。（与名为 `Struct` 的类完全没有关系。）与类类似，它们可以包含对数据进行操作的宏。与类不同的是，它们还支持泛型。语法看起来类似于类：

```torque
@export
struct PromiseResolvingFunctions {
  resolve: JSFunction;
  reject: JSFunction;
}

struct ConstantIterator<T: type> {
  macro Empty(): bool {
    return false;
  }
  macro Next(): T labels _NoMore {
    return this.value;
  }

  value: T;
}
```

##### Struct 注解

任何标记为 `@export` 的 struct 都将在生成的文件 `gen/torque-generated/csa-types.h` 中以可预测的名字包含。名称前会加上 `TorqueStruct`，因此 `PromiseResolvingFunctions` 会变成 `TorqueStructPromiseResolvingFunctions`。

Struct 字段可以标记为 `const`，这意味着它们不应该被写入。整个 struct 仍然可以被覆盖。

##### Struct 作为类字段

Struct 可以用作类字段的类型。在这种情况下，它在类中表示紧凑、有序的数据（否则 struct 没有对齐要求）。对于类中的索引字段，这尤其有用。例如，`DescriptorArray` 包含一个三值 struct 的数组：

```torque
struct DescriptorEntry {
  key: Name|Undefined;
  details: Smi|Undefined;
  value: JSAny|Weak<Map>|AccessorInfo|AccessorPair|ClassPositions;
}

extern class DescriptorArray extends HeapObject {
  const number_of_all_descriptors: uint16;
  number_of_descriptors: uint16;
  raw_number_of_marked_descriptors: uint16;
  filler16_bits: uint16;
  enum_cache: EnumCache;
  descriptors[number_of_all_descriptors]: DescriptorEntry;
}
```

##### 引用和切片

`Reference<T>` 和 `Slice<T>` 是表示指向堆对象数据的特殊 struct。它们都包含一个对象和一个偏移量；`Slice<T>` 还包含一个长度。与直接构造这些 struct 不同，你可以使用特殊语法：`&o.x` 将创建一个对象 `o` 内字段 `x` 的 `Reference`，如果 `x` 是索引字段，则会创建一个数据的 `Slice`。对于引用和切片有常量和可变版本。对于引用，这些类型分别写为 `&T` 和 `const &T`，对应可变和常量引用。可变性指的是它们指向的数据，可以不是全局的，即可以对可变数据创建常量引用。对于切片，它们没有特殊语法，两个版本分别写为 `ConstSlice<T>` 和 `MutableSlice<T>`。引用可以通过 `*` 或 `->` 解引用，与 C++ 一致。

未标记的数据的引用和切片也可以指向堆外数据。

#### 位字段结构

`bitfield struct` 表示一个包含数值数据的集合，这些数据被打包到单个数值中。它的语法看起来类似于普通 `struct`，但每个字段都要求添加位数。

```torque
bitfield struct DebuggerHints extends uint31 {
  side_effect_state: int32: 2 bit;
  debug_is_blackboxed: bool: 1 bit;
  computed_debug_is_blackboxed: bool: 1 bit;
  debugging_id: int32: 20 bit;
}
```

如果位字段结构（或任何其他数值数据）存储在 Smi 中，则可以使用 `SmiTagged<T>` 类型表示。

#### 函数指针类型

函数指针只能指向 Torque 中定义的内建函数，因为这可以保证默认的 ABI。它们尤其有助于减少二进制代码大小。

虽然函数指针类型是匿名的（类似于 C），但它们可以绑定到类型别名（类似于 C 中的 `typedef`）。

```torque
type CompareBuiltinFn = builtin(implicit context: Context)(Object, Object, Object) => Number;
```

#### 特殊类型

有两个特殊类型，由关键字 `void` 和 `never` 表示。`void` 用作不返回值的可调用项的返回类型，而 `never` 用作实际上永远不会返回的可调用项的返回类型（即仅通过异常路径退出）。

#### 瞬态类型

在 V8 中，堆对象可以在运行时更改布局。为了在类型系统中表达可能会更改的对象布局或其他临时假设，Torque 支持“瞬态类型”的概念。在声明抽象类型时，添加关键字 `transient` 将其标记为瞬态类型。

```torque
// 一个具有 JSArray 映射的 HeapObject，当全局 NoElementsProtector 未失效时，包含快速打包元素或快速空洞元素。
transient type FastJSArray extends JSArray
    generates 'TNode<JSArray>';
```

例如，对于 `FastJSArray`，如果数组更改为字典元素或全局 `NoElementsProtector` 失效，瞬态类型将被失效。为了在 Torque 中表达这一点，请将所有可能导致此问题的可调用项注释为 `transitioning`。例如，调用 JavaScript 函数可以执行任意的 JavaScript，因此它是 `transitioning`。

```torque
extern transitioning macro Call(implicit context: Context)
                               (Callable, Object): Object;
```

在类型系统中对其进行管理的方式是，跨越转变操作访问一个瞬态类型的值是不合法的。

```torque
const fastArray : FastJSArray = Cast<FastJSArray>(array) otherwise Bailout;
Call(f, Undefined);
return fastArray; // 类型错误：fastArray在这里无效。
```

#### 枚举

枚举提供了一种定义常量集合并将它们归类于一个名称的方式，类似于C++中的枚举类。
使用`enum`关键字引入声明，并遵循以下语法结构：

```grammar
EnumDeclaration :
  extern enum IdentifierName ExtendsDeclaration opt ConstexprDeclaration opt { IdentifierName list+ (, ...) opt }
```

一个基本的例子如下：

```torque
extern enum LanguageMode extends Smi {
  kStrict,
  kSloppy
}
```

这个声明定义了一个新类型`LanguageMode`，其中`extends`子句指定了底层类型，即用于表示枚举值的运行时类型。在本例中，这是`TNode<Smi>`，
因为这是类型`Smi`生成的内容。一个`constexpr LanguageMode`在生成的CSA文件中转换为`LanguageMode`，
因为枚举上没有指定`constexpr`子句来替代默认名称。
如果省略了`extends`子句，Torque将仅生成该类型的`constexpr`版本。`extern`关键字表明Torque中有此枚举的C++定义。目前，仅支持`extern`枚举。

Torque为每个枚举的条目生成一个独特的类型和常量。这些都定义在与枚举的名称匹配的命名空间中。
必要的`FromConstexpr<>`的特化会生成相应的转换，从条目的`constexpr`类型转换为枚举类型。
在C++文件中为条目生成的值是`<enum-constexpr>::<entry-name>`，其中`<enum-constexpr>`是为枚举生成的`constexpr`名称。
在上面的例子中，它们是`LanguageMode::kStrict`和`LanguageMode::kSloppy`。

Torque的枚举与`typeswitch`结构很好地结合在一起，因为
值是使用独特类型定义的：

```torque
typeswitch(language_mode) {
  case (LanguageMode::kStrict): {
    // ...
  }
  case (LanguageMode::kSloppy): {
    // ...
  }
}
```

如果枚举的C++定义包含比`.tq`文件中使用的更多的值，Torque需要知道这一点。可以通过在最后一个条目后面添加`...`来将枚举声明为“开放”的。
例如，考虑`ExtractFixedArrayFlag`，其中只有一些选项可以从Torque中使用：

```torque
enum ExtractFixedArrayFlag constexpr 'CodeStubAssembler::ExtractFixedArrayFlag' {
  kFixedDoubleArrays,
  kAllFixedArrays,
  kFixedArrays,
  ...
}
```

### 可调用实体

可调用实体在概念上类似于JavaScript或C++中的函数，但它们具有一些附加语义，允许它们以有用的方式与CSA代码和V8运行时交互。Torque提供了几种不同类型的可调用实体：`macro`、`builtin`、`runtime`和`intrinsic`。

```grammar
CallableDeclaration :
  MacroDeclaration
  BuiltinDeclaration
  RuntimeDeclaration
  IntrinsicDeclaration
```

#### `macro` 可调用实体

宏是与生成的CSA生成C++代码块对应的可调用实体。`macro`可以完全在Torque中定义，
在这种情况下，CSA代码由Torque生成；或者标记为`extern`，在这种情况下，必须以手写CSA代码的形式在CodeStubAssembler类中提供实现。从概念上讲，
将`macro`视为可内联的CSA代码块，并在调用点内联，是有助于理解的。

Torque中的`macro`声明采用以下形式：

```grammar
MacroDeclaration :
   transitioning opt macro IdentifierName ImplicitParameters opt ExplicitParameters ReturnType opt LabelsDeclaration opt StatementBlock
  extern transitioning opt macro IdentifierName ImplicitParameters opt ExplicitTypes ReturnType opt LabelsDeclaration opt ;
```

每个非`extern`的Torque `macro`使用`macro`的`StatementBlock`主体在其命名空间的生成的`Assembler`类中创建一个CSA生成函数。
这段代码看起来类似于您可能在`code-stub-assembler.cc`中找到的其他代码，尽管由于是机器生成的，它可能显得不那么可读。标记为`extern`的`macro`在Torque中没有编写主体，它们只是为手写C++ CSA代码提供接口，以便可以从Torque中使用它们。

标签是`macro`中的一种用于异常退出的机制。它们与CSA标签一一对应，并被作为类型为`CodeStubAssemblerLabels*`的参数添加到为`macro`生成的C++方法中。虽然它们的具体语义将在下文讨论，但在声明`macro`时，可通过`labels`关键字提供用逗号分隔的`macro`标签列表，并将其置于`macro`参数列表和返回类型之后。

以下是来自`base.tq`的一个关于外部和Torque定义的`macro`的示例：

```torque
extern macro BranchIfFastJSArrayForCopy(Object, Context): never
    labels Taken, NotTaken;
macro BranchIfNotFastJSArrayForCopy(implicit context: Context)(o: Object):
    never
    labels Taken, NotTaken {
  BranchIfFastJSArrayForCopy(o, context) otherwise NotTaken, Taken;
}
```

#### `builtin` 可调用单位

`builtin`与`macro`类似，可以完全在 Torque 中定义，也可以标记为`extern`。在基于 Torque 的 builtin 情况下，builtin 的主体用于生成一个 V8 builtin，可以像其他任何 V8 builtin 一样被调用，包括自动在`builtin-definitions.h`中添加相关信息。与`macro`类似，标记为`extern`的 Torque `builtin`没有基于 Torque 的主体，而是简单地为现有的 V8 `builtin`提供一个接口，以便它们可以从 Torque 代码中使用。

Torque 中的`builtin`声明形式如下：

```grammar
MacroDeclaration :
  transitioning opt javascript opt builtin IdentifierName ImplicitParameters opt ExplicitParametersOrVarArgs ReturnType opt StatementBlock
  extern transitioning opt javascript opt builtin IdentifierName ImplicitParameters opt ExplicitTypesOrVarArgs ReturnType opt ;
```

Torque builtin 的代码只有一个副本，即在生成的 builtin 代码对象中。与`macro`不同，当从 Torque 代码中调用`builtin`时，CSA 代码不会被内联到调用点，而是生成对 builtin 的调用。

`builtin`不能有标签。

如果你正在编写一个`builtin`的实现，并且该调用是`builtin`中的最终调用，那么可以为 builtin 或运行时函数设计一个[尾调用](https://en.wikipedia.org/wiki/Tail_call)。编译器在这种情况下可能会避免创建新的栈帧。只需在调用前添加`tail`，例如`tail MyBuiltin(foo, bar);`。

#### `runtime` 可调用单位

`runtime`与`builtin`类似，可以为 Torque 提供对外部功能的接口。然而，`runtime` 提供的功能不是在 CSA 中实现的，而是必须始终作为标准运行时回调在 V8 中实现。

Torque 中的`runtime`声明形式如下：

```grammar
MacroDeclaration :
  extern transitioning opt runtime IdentifierName ImplicitParameters opt ExplicitTypesOrVarArgs ReturnType opt ;
```

指定为`extern runtime`且名称为<i>IdentifierName</i>的函数对应于由<code>Runtime::k<i>IdentifierName</i></code>指定的运行时函数。

与`builtin`类似，`runtime`不能有标签。

在适当情况下，也可以将`runtime`函数作为尾调用。只需在调用前包含`tail`关键字。

运行时函数声明通常位于名为`runtime`的命名空间中。这可以将它们与同名的 builtin 区分开来，并使我们可以更清楚地看到调用点是在调用运行时函数。我们应考虑将其设为强制要求。

#### `intrinsic` 可调用单位

`intrinsic`是内置的 Torque 可调用单位，用于提供无法通过其他方式在 Torque 中实现的内部功能。它们在 Torque 中声明但未定义，因为其实现是由 Torque 编译器提供的。`intrinsic`声明使用以下语法：

```grammar
IntrinsicDeclaration :
  intrinsic % IdentifierName ImplicitParameters opt ExplicitParameters ReturnType opt ;
```

大多数情况下，“用户” Torque 代码很少需要直接使用`intrinsic`。
以下是一些支持的`intrinsic`示例：

```torque
// %RawObjectCast 从 Object 向下转换为 Object 的子类型，但
// 不会严格测试该对象是否实际上是目标类型。
// RawObjectCasts 应该*永远不要*（或者几乎永远不要）在 Torque
// 代码中的任意位置使用，除非在一个适当的类型断言之后的 Torque
// 基于不安全转换操作符中。
intrinsic %RawObjectCast<A: type>(o: Object): A;

// %RawPointerCast 从 RawPtr 向下转换为 RawPtr 的子类型，但
// 不会严格测试该对象是否实际上是目标类型。
intrinsic %RawPointerCast<A: type>(p: RawPtr): A;

// %RawConstexprCast 将一个编译时常量值转换为另一个值。
// 源类型和目标类型都应该是'constexpr'。
// %RawConstexprCast 在生成的 C++ 代码中转换为静态转换。
intrinsic %RawConstexprCast<To: type, From: type>(f: From): To;

// %FromConstexpr 将一个 constexpr 值转换为非 constexpr 值。
// 当前，仅支持以下非 constexpr 类型的转换：Smi、Number、String、uintptr、intptr 和 int32。
intrinsic %FromConstexpr<To: type, From: type>(b: From): To;

// %Allocate 从 V8 的 GC 堆中分配一个未初始化的大小为'size'的对象，并“重新解释强制转换”为
// 指定的 Torque 类，允许构造函数随后使用
// 标准字段访问操作符来初始化对象。
// 此内置函数不应从 Torque 代码中调用。它被用作
// 在消除“new”操作符语法糖时的内部使用。
intrinsic %Allocate<Class: type>(size: intptr): Class;
```

与 `builtin` 和 `runtime` 类似，`intrinsic` 不能有标签。

### 显式参数

由 Torque 定义的 Callable（例如 Torque 的 `macro` 和 `builtin`）的声明有显式参数列表。它们是标识符和类型对的列表，使用语法类似于 TypeScript 的函数参数列表，不同的是 Torque 不支持可选参数或默认参数。此外，Torque 实现的 `builtin` 可以选择支持可变参数（如果 builtin 使用 V8 的内部 JavaScript 调用约定，例如使用了 `javascript` 关键字标记）。

```grammar
ExplicitParameters :
  ( ( IdentifierName : TypeIdentifierName ) list* )
  ( ( IdentifierName : TypeIdentifierName ) list+ (, ... IdentifierName ) opt )
```

例如：

```torque
javascript builtin ArraySlice(
    (implicit context: Context)(receiver: Object, ...arguments): Object {
  // …
}
```

### 隐式参数

Torque 的 Callable 可以使用类似于 [Scala 的隐式参数](https://docs.scala-lang.org/tour/implicit-parameters.html) 的方式指定隐式参数：

```grammar
ImplicitParameters :
  ( implicit ( IdentifierName : TypeIdentifierName ) list* )
```

具体来讲，一个 `macro` 除了显式参数外，还可以声明隐式参数：

```torque
macro Foo(implicit context: Context)(x: Smi, y: Smi)
```

在映射到 CSA 时，隐式参数和显式参数被视为相同并组成一个联合参数列表。

隐式参数不会在调用处提及，而是被隐式传递：`Foo(4, 5)`。要使其生效，`Foo(4, 5)` 必须在提供名为 `context` 的值的上下文中调用。例如：

```torque
macro Bar(implicit context: Context)() {
  Foo(4, 5);
}
```

与 Scala 相比，如果隐式参数的名称不一致，我们是不允许的。

由于重载解析可能会导致混乱的行为，我们确保隐式参数完全不会影响重载解析。即：在比较重载集合中的候选项时，我们不考虑调用点可用的隐式绑定。仅在找到单个最佳重载之后，我们才检查是否可以为隐式参数提供隐式绑定。

将隐式参数置于显式参数之前不同于 Scala，但更契合 CSA 中优先使用 `context` 参数的既定约定。

#### `js-implicit`

对于在 Torque 中定义的 JavaScript 链接的 builtin，你应该使用关键字 `js-implicit` 而不是 `implicit`。参数限制为以下调用约定的四个组件：

- context: `NativeContext`
- receiver: `JSAny`（JavaScript 中的 `this`）
- target: `JSFunction`（JavaScript 中的 `arguments.callee`）
- newTarget: `JSAny`（JavaScript 中的 `new.target`）

不需要全部声明，只声明你要使用的即可。例如，以下是我们的 `Array.prototype.shift` 的代码：

```torque
  // https://tc39.es/ecma262/#sec-array.prototype.shift
  transitioning javascript builtin ArrayPrototypeShift(
      js-implicit context: NativeContext, receiver: JSAny)(...arguments): JSAny {
  ...
```

注意参数 `context` 是一个 `NativeContext`。这是因为 V8 中的 builtin 总是将原生上下文嵌入到闭包中。在 js-implicit 约定中编码这一点使程序员能够消除从函数上下文加载本地上下文的操作。

### 重载解析

Torque 的 `macro` 和操作符（只是 `macro` 的别名）允许按参数类型进行重载。重载规则受 C++ 的规则启发：如果某个重载严格优于所有备选项，则该重载会被选中。这意味着它在至少一个参数上必须严格更优，并且在所有其他参数上同样或更优。

当比较两个重载的一对对应参数时……

- …它们被认为是同样好的如果：
    - 它们是相等的；
    - 两者都需要某种隐式转换。
- …一个被认为更优如果：
    - 它是另一个的严格子类型；
    - 它不需要隐式转换，而另一个需要。

如果没有一个重载严格优于所有备选项，则会导致编译错误。

### 延迟块

可以选择性地将语句块标记为 `deferred`，这向编译器传递一个信号，表明它的进入频率较低。编译器可能会选择将这些块放置在函数末尾，从而改善非延迟代码区域的缓存局部性。例如，在 `Array.prototype.forEach` 实现中的这段代码，我们预期会保持在“快速”路径上，而只有很少情况下会发生回退：

```torque
  let k: Number = 0;
  try {
    return FastArrayForEach(o, len, callbackfn, thisArg)
        otherwise Bailout;
  }
  label Bailout(kValue: Smi) deferred {
    k = kValue;
  }
```

下面是另一个例子，其中的字典元素情况被标记为延迟，以改进更可能出现的情况的代码生成（来自 `Array.prototype.join` 的实现）：

```torque
  if (IsElementsKindLessThanOrEqual(kind, HOLEY_ELEMENTS)) {
    loadFn = LoadJoinElement<FastSmiOrObjectElements>;
  } else if (IsElementsKindLessThanOrEqual(kind, HOLEY_DOUBLE_ELEMENTS)) {
    loadFn = LoadJoinElement<FastDoubleElements>;
  } else if (kind == DICTIONARY_ELEMENTS)
    deferred {
      const dict: NumberDictionary =
          UnsafeCast<NumberDictionary>(array.elements);
      const nofElements: Smi = GetNumberDictionaryNumberOfElements(dict);
      // <etc>...
```

## 将 CSA 代码移植到 Torque

[移植 `Array.of` 的补丁](https://chromium-review.googlesource.com/c/v8/v8/+/1296464) 是一个将 CSA 代码移植到 Torque 的简单示例。
