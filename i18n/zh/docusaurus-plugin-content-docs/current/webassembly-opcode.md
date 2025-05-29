---
title: 'WebAssembly - 新增一个操作码'
description: '本教程解释了如何在V8中实现一个新的WebAssembly指令。'
---
[WebAssembly](https://webassembly.org/) (Wasm) 是一种基于堆栈的虚拟机的二进制指令格式。本教程将指导读者如何在V8中实现一个新的WebAssembly指令。

WebAssembly在V8中的实现分为三个部分：

- 解释器
- 基础编译器 (Liftoff)
- 优化编译器 (TurboFan)

本文其余部分将重点讲解TurboFan管道，逐步说明如何添加一个新的Wasm指令并在TurboFan中实现它。

从高层次来看，Wasm指令被编译为TurboFan图形，我们依赖TurboFan管道来将图形最终编译为机器代码。有关TurboFan的更多信息，请参阅 [V8文档](/docs/turbofan)。

## 操作码/指令

让我们定义一个新的指令，它将对堆栈顶部的[`int32`](https://webassembly.github.io/spec/core/syntax/types.html#syntax-valtype)加`1`。

:::note
**注意:** 支持所有Wasm实现的指令列表可以在[规范](https://webassembly.github.io/spec/core/appendix/index-instructions.html)中找到。
:::

所有的Wasm指令都定义在[`src/wasm/wasm-opcodes.h`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-opcodes.h)中。这些指令大致根据它们的功能进行分组，例如控制、内存、SIMD、原子等。

让我们将新的指令 `I32Add1` 添加到 `FOREACH_SIMPLE_OPCODE` 部分：

```diff
diff --git a/src/wasm/wasm-opcodes.h b/src/wasm/wasm-opcodes.h
index 6970c667e7..867cbf451a 100644
--- a/src/wasm/wasm-opcodes.h
+++ b/src/wasm/wasm-opcodes.h
@@ -96,6 +96,7 @@ bool IsJSCompatibleSignature(const FunctionSig* sig, bool hasBigIntFeature);

 // 具有签名的表达式。
 #define FOREACH_SIMPLE_OPCODE(V)  \
+  V(I32Add1, 0xee, i_i)           \
   V(I32Eqz, 0x45, i_i)            \
   V(I32Eq, 0x46, i_ii)            \
   V(I32Ne, 0x47, i_ii)            \
```

WebAssembly是一种二进制格式，因此`0xee`指定了此指令的编码。在本教程中，我们选择`0xee`作为尚未使用的编码。

:::note
**注意:** 将实际指令添加到规范中涉及超出本文范围的工作。
:::

我们可以运行一个简单的单元测试来测试操作码：

```
$ tools/dev/gm.py x64.debug unittests/WasmOpcodesTest*
...
[==========] 正在运行 1 个测试，来自 1 个测试套件。
[----------] 设置全局测试环境。
[----------] 来自 WasmOpcodesTest 的 1 个测试。
[ RUN      ] WasmOpcodesTest.EveryOpcodeHasAName
../../test/unittests/wasm/wasm-opcodes-unittest.cc:27: 失败
Value of: false
  实际值: false
预期值: true
WasmOpcodes::OpcodeName(kExprI32Add1) == "unknown"; 请在 src/wasm/wasm-opcodes.cc 提供帮助
[  FAILED  ] WasmOpcodesTest.EveryOpcodeHasAName
```

此错误表明我们没有为新的指令提供名称。在 [`src/wasm/wasm-opcodes.cc`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-opcodes.cc) 中可以为新的操作码添加名称：

```diff
diff --git a/src/wasm/wasm-opcodes.cc b/src/wasm/wasm-opcodes.cc
index 5ed664441d..2d4e9554fe 100644
--- a/src/wasm/wasm-opcodes.cc
+++ b/src/wasm/wasm-opcodes.cc
@@ -75,6 +75,7 @@ const char* WasmOpcodes::OpcodeName(WasmOpcode opcode) {
     // clang格式化关闭

     // 标准操作码
+    CASE_I32_OP(Add1, "add1")
     CASE_INT_OP(Eqz, "eqz")
     CASE_ALL_OP(Eq, "eq")
     CASE_I64x2_OP(Eq, "eq")
```

通过在 `FOREACH_SIMPLE_OPCODE` 中添加我们的新指令，我们跳过了一些在 [`src/wasm/function-body-decoder-impl.h`](https://cs.chromium.org/chromium/src/v8/src/wasm/function-body-decoder-impl.h?l=1751-1756&rcl=686b68edf9f42c201c2b25bca9f4bef72ff41c0b) 中完成工作的复杂部分，该部分负责解码Wasm操作码并调用TurboFan图生成器。因此，根据您的操作码的功能，可能需要更多工作。为了简洁，我们在此处跳过这些内容。

## 为新操作码编写测试

Wasm测试位于 [`test/cctest/wasm/`](https://cs.chromium.org/chromium/src/v8/test/cctest/wasm/) 中。让我们看看[`test/cctest/wasm/test-run-wasm.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/wasm/test-run-wasm.cc)，其中测试了许多“简单”的操作码。

此文件中有许多示例可供我们参考。一般的设置包括：

- 创建一个 `WasmRunner`
- 设置全局变量以保存结果（可选）
- 设置局部变量作为指令参数（可选）
- 构建Wasm模块
- 运行并与预期输出进行比较

以下是一个针对新操作码的简单测试：

```diff
diff --git a/test/cctest/wasm/test-run-wasm.cc b/test/cctest/wasm/test-run-wasm.cc
index 26df61ceb8..b1ee6edd71 100644
--- a/test/cctest/wasm/test-run-wasm.cc
+++ b/test/cctest/wasm/test-run-wasm.cc
@@ -28,6 +28,15 @@ namespace test_run_wasm {
 #define RET(x) x, kExprReturn
 #define RET_I8(x) WASM_I32V_2(x), kExprReturn

+#define WASM_I32_ADD1(x) x, kExprI32Add1
+
+WASM_EXEC_TEST(Int32Add1) {
+  WasmRunner<int32_t> r(execution_tier);
+  // 10 + 1
+  BUILD(r, WASM_I32_ADD1(WASM_I32V_1(10)));
+  CHECK_EQ(11, r.Call());
+}
+
 WASM_EXEC_TEST(Int32Const) {
   WasmRunner<int32_t> r(execution_tier);
   const int32_t kExpectedValue = 0x11223344;
```

运行测试：

```
$ tools/dev/gm.py x64.debug &apos;cctest/test-run-wasm-simd/RunWasmTurbofan_I32Add1&apos;
...
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# 在 ../../src/compiler/wasm-compiler.cc, 第988行发生致命错误
# 不支持的操作码 0xee:i32.add1
```

:::note
**提示：** 找到测试名称可能很难，因为测试定义在宏后面。使用[代码搜索](https://cs.chromium.org/)进行点击以发现宏定义。
:::

此错误表明编译器不识别我们的新指令。下一节将解决这一问题。

## 将Wasm编译为TurboFan

在介绍中我们提到，Wasm指令会被编译为TurboFan图。`wasm-compiler.cc`是执行这一操作的地方。我们来看一个示例操作码，[`I32Eqz`](https://cs.chromium.org/chromium/src/v8/src/compiler/wasm-compiler.cc?l=716&rcl=686b68edf9f42c201c2b25bca9f4bef72ff41c0b)：

```cpp
  switch (opcode) {
    case wasm::kExprI32Eqz:
      op = m->Word32Equal();
      return graph()->NewNode(op, input, mcgraph()->Int32Constant(0));
```

这个代码通过Wasm操作码`wasm::kExprI32Eqz`进行切换，构建了一个TurboFan图，该图由操作`Word32Equal`以及输入`input`（即Wasm指令的参数）和一个常量`0`组成。

`Word32Equal`操作符由底层的V8抽象机器提供，它与体系结构无关。在后续阶段，这个抽象操作符将被转换为与体系结构相关的汇编代码。

对于我们新的操作码`I32Add1`，我们需要一个图来将输入加1，因此我们可以重用现有的机器操作符`Int32Add`，将输入和常量1传给它：

```diff
diff --git a/src/compiler/wasm-compiler.cc b/src/compiler/wasm-compiler.cc
index f666bbb7c1..399293c03b 100644
--- a/src/compiler/wasm-compiler.cc
+++ b/src/compiler/wasm-compiler.cc
@@ -713,6 +713,8 @@ Node* WasmGraphBuilder::Unop(wasm::WasmOpcode opcode, Node* input,
   const Operator* op;
   MachineOperatorBuilder* m = mcgraph()->machine();
   switch (opcode) {
+    case wasm::kExprI32Add1:
+      return graph()->NewNode(m->Int32Add(), input, mcgraph()->Int32Constant(1));
     case wasm::kExprI32Eqz:
       op = m->Word32Equal();
       return graph()->NewNode(op, input, mcgraph()->Int32Constant(0));
```

这足以让测试通过。然而，并非所有指令都有现成的TurboFan机器操作符。在这种情况下，我们需要向机器添加该新操作符。接下来尝试操作。

## TurboFan机器操作符

我们需要将`Int32Add1`知识添加到TurboFan机器中。首先假定它存在并加以使用：

```diff
diff --git a/src/compiler/wasm-compiler.cc b/src/compiler/wasm-compiler.cc
index f666bbb7c1..1d93601584 100644
--- a/src/compiler/wasm-compiler.cc
+++ b/src/compiler/wasm-compiler.cc
@@ -713,6 +713,8 @@ Node* WasmGraphBuilder::Unop(wasm::WasmOpcode opcode, Node* input,
   const Operator* op;
   MachineOperatorBuilder* m = mcgraph()->machine();
   switch (opcode) {
+    case wasm::kExprI32Add1:
+      return graph()->NewNode(m->Int32Add1(), input);
     case wasm::kExprI32Eqz:
       op = m->Word32Equal();
       return graph()->NewNode(op, input, mcgraph()->Int32Constant(0));
```

尝试运行相同测试导致编译失败，并提示需要修改的位置：

```
../../src/compiler/wasm-compiler.cc:717:34: 错误: ‘MachineOperatorBuilder’中没有名为‘Int32Add1’的成员；是否是指‘Int32Add’？
      return graph()->NewNode(m->Int32Add1(), input);
                                 ^~~~~~~~~
                                 Int32Add
```

有几个地方需要修改以添加操作符：

1. [`src/compiler/machine-operator.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/machine-operator.cc)
1. 头文件[`src/compiler/machine-operator.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/machine-operator.h)
1. 机器可理解的操作码列表[`src/compiler/opcodes.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/opcodes.h)
1. 验证器[`src/compiler/verifier.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/verifier.cc)

```diff
diff --git a/src/compiler/machine-operator.cc b/src/compiler/machine-operator.cc
index 16e838c2aa..fdd6d951f0 100644
--- a/src/compiler/machine-operator.cc
+++ b/src/compiler/machine-operator.cc
@@ -136,6 +136,7 @@ MachineType AtomicOpType(Operator const* op) {
 #define MACHINE_PURE_OP_LIST(V)                                               \
   PURE_BINARY_OP_LIST_32(V)                                                   \
   PURE_BINARY_OP_LIST_64(V)                                                   \
+  V(Int32Add1, Operator::kNoProperties, 1, 0, 1)                              \
   V(Word32Clz, Operator::kNoProperties, 1, 0, 1)                              \
   V(Word64Clz, Operator::kNoProperties, 1, 0, 1)                              \
   V(Word32ReverseBytes, Operator::kNoProperties, 1, 0, 1)                     \
```

```差异
差异 --git a/src/compiler/machine-operator.h b/src/compiler/machine-operator.h
索引 a2b9fce0ee..f95e75a445 100644
--- a/src/compiler/machine-operator.h
+++ b/src/compiler/machine-operator.h
@@ -265,6 +265,8 @@ class V8_EXPORT_PRIVATE MachineOperatorBuilder final
   const Operator* Word32PairShr();
   const Operator* Word32PairSar();

+  const Operator* Int32Add1();
+
   const Operator* Int32Add();
   const Operator* Int32AddWithOverflow();
   const Operator* Int32Sub();
```

```差异
差异 --git a/src/compiler/opcodes.h b/src/compiler/opcodes.h
索引 ce24a0bd3f..2c8c5ebaca 100644
--- a/src/compiler/opcodes.h
+++ b/src/compiler/opcodes.h
@@ -506,6 +506,7 @@
   V(Float64LessThanOrEqual)

 #定义 MACHINE_UNOP_32_LIST(V) \
+  V(Int32Add1)                  \
   V(Word32Clz)                  \
   V(Word32Ctz)                  \
   V(Int32AbsWithOverflow)       \
```

```差异
差异 --git a/src/compiler/verifier.cc b/src/compiler/verifier.cc
索引 461aef0023..95251934ce 100644
--- a/src/compiler/verifier.cc
+++ b/src/compiler/verifier.cc
@@ -1861,6 +1861,7 @@ void Verifier::Visitor::Check(Node* node, const AllNodes& all) {
     case IrOpcode::kSignExtendWord16ToInt64:
     case IrOpcode::kSignExtendWord32ToInt64:
     case IrOpcode::kStaticAssert:
+    case IrOpcode::kInt32Add1:

 #定义 SIMD_MACHINE_OP_CASE(名字) case IrOpcode::k##名字:
       MACHINE_SIMD_OP_LIST(SIMD_MACHINE_OP_CASE)
```

再次运行测试，现在给出了不同的失败信息：

```
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# 在 ../../src/compiler/backend/instruction-selector.cc 文件中，第 2072 行发生致命错误
# 意外的操作符 #289:Int32Add1 @ 节点 #7
```

## 指令选择

到目前为止，我们一直在 TurboFan 层级工作，处理 TurboFan 图中的（海量的）节点。然而，在汇编层，我们有指令和操作数。指令选择是将此图转换为指令和操作数的过程。

最后的测试错误表明我们需要在[`src/compiler/backend/instruction-selector.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/instruction-selector.cc)中添加一些内容。这是一个大文件，其中包含所有机器操作码的巨大 switch 语句。 它使用访问者模式为每种类型的节点发出指令，调用架构特定的指令选择。

由于我们添加了一个新的 TurboFan 机器操作码，因此我们也需要在这里添加它：

```差异
差异 --git a/src/compiler/backend/instruction-selector.cc b/src/compiler/backend/instruction-selector.cc
索引 3152b2d41e..7375085649 100644
--- a/src/compiler/backend/instruction-selector.cc
+++ b/src/compiler/backend/instruction-selector.cc
@@ -2067,6 +2067,8 @@ void InstructionSelector::VisitNode(Node* node) {
       return MarkAsWord32(node), VisitS1x16AnyTrue(node);
     case IrOpcode::kS1x16AllTrue:
       return MarkAsWord32(node), VisitS1x16AllTrue(node);
+    case IrOpcode::kInt32Add1:
+      return MarkAsWord32(node), VisitInt32Add1(node);
     default:
       FATAL("意外的操作符 #%d:%s @ 节点 #%d", node->opcode(),
             node->op()->mnemonic(), node->id());
```

指令选择是与架构相关的，因此我们也必须将其添加到架构特定的指令选择文件中。对于本教程，我们仅关注 x64 架构，所以需要修改 [`src/compiler/backend/x64/instruction-selector-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-selector-x64.cc)：

```差异
差异 --git a/src/compiler/backend/x64/instruction-selector-x64.cc b/src/compiler/backend/x64/instruction-selector-x64.cc
索引 2324e119a6..4b55671243 100644
--- a/src/compiler/backend/x64/instruction-selector-x64.cc
+++ b/src/compiler/backend/x64/instruction-selector-x64.cc
@@ -841,6 +841,11 @@ void InstructionSelector::VisitWord32ReverseBytes(Node* node) {
   Emit(kX64Bswap32, g.DefineSameAsFirst(node), g.UseRegister(node->InputAt(0)));
 }

+void InstructionSelector::VisitInt32Add1(Node* node) {
+  X64OperandGenerator g(this);
+  Emit(kX64Int32Add1, g.DefineSameAsFirst(node), g.UseRegister(node->InputAt(0)));
+}
+
```

我们还需要将此新的 x64 特定操作码 `kX64Int32Add1` 添加到 [`src/compiler/backend/x64/instruction-codes-x64.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-codes-x64.h) 中：

```差异
差异 --git a/src/compiler/backend/x64/instruction-codes-x64.h b/src/compiler/backend/x64/instruction-codes-x64.h
索引 9b8be0e0b5..7f5faeb87b 100644
--- a/src/compiler/backend/x64/instruction-codes-x64.h
+++ b/src/compiler/backend/x64/instruction-codes-x64.h
@@ -12,6 +12,7 @@ namespace compiler {
 // X64特定的操作码，指定要发出哪种汇编序列。
 // 大多数操作码指定单条指令。
 #define TARGET_ARCH_OPCODE_LIST(V)        \
+  V(X64Int32Add1)                         \
   V(X64Add)                               \
   V(X64Add32)                             \
   V(X64And)                               \
```

## 指令调度和代码生成

运行我们的测试，我们看到新的编译错误：

```
../../src/compiler/backend/x64/instruction-scheduler-x64.cc:15:11: 错误：枚举值&apos;kX64Int32Add1&apos;未在switch中处理 [-Werror,-Wswitch]
  switch (instr->arch_opcode()) {
          ^
1 个错误已生成。
...
../../src/compiler/backend/x64/code-generator-x64.cc:733:11: 错误：枚举值&apos;kX64Int32Add1&apos;未在switch中处理 [-Werror,-Wswitch]
  switch (arch_opcode) {
          ^
1 个错误已生成。
```

[指令调度](https://en.wikipedia.org/wiki/Instruction_scheduling)负责处理指令之间可能存在的依赖关系，以便进行更多优化（例如指令重排序）。我们的新操作码没有数据依赖，所以我们可以简单地将其添加到：[src/compiler/backend/x64/instruction-scheduler-x64.cc](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-scheduler-x64.cc)：

```diff
diff --git a/src/compiler/backend/x64/instruction-scheduler-x64.cc b/src/compiler/backend/x64/instruction-scheduler-x64.cc
索引 79eda7e78d..3667a84577 100644
--- a/src/compiler/backend/x64/instruction-scheduler-x64.cc
+++ b/src/compiler/backend/x64/instruction-scheduler-x64.cc
@@ -13,6 +13,7 @@ bool InstructionScheduler::SchedulerSupported() { return true; }
 int InstructionScheduler::GetTargetInstructionFlags(
     const Instruction* instr) const {
   switch (instr->arch_opcode()) {
+    case kX64Int32Add1:
     case kX64Add:
     case kX64Add32:
     case kX64And:
```

代码生成是我们将架构特定操作码转换为汇编的地方。让我们为它添加一项条款：[src/compiler/backend/x64/code-generator-x64.cc](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/code-generator-x64.cc)：

```diff
diff --git a/src/compiler/backend/x64/code-generator-x64.cc b/src/compiler/backend/x64/code-generator-x64.cc
索引 61c3a45a16..9c37ed7464 100644
--- a/src/compiler/backend/x64/code-generator-x64.cc
+++ b/src/compiler/backend/x64/code-generator-x64.cc
@@ -731,6 +731,9 @@ CodeGenerator::CodeGenResult CodeGenerator::AssembleArchInstruction(
   InstructionCode opcode = instr->opcode();
   ArchOpcode arch_opcode = ArchOpcodeField::decode(opcode);
   switch (arch_opcode) {
+    case kX64Int32Add1: {
+      break;
+    }
     case kArchCallCodeObject: {
       if (HasImmediateInput(instr, 0)) {
         Handle<Code> code = i.InputCode(0);
```

目前我们暂时将代码生成留空，可以运行测试以确保一切编译无误：

```
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# 在 ../../test/cctest/wasm/test-run-wasm.cc 第 37 行发生致命错误
# 检查失败：11 == r.Call() (11 vs. 10)。
```

这个失败是预期的，因为我们的新指令尚未实现 —— 它实质上是一个无操作，因此实际值没有变化（`10`）。

为了实现我们的操作码，可以使用 `add` 汇编指令：

```diff
diff --git a/src/compiler/backend/x64/code-generator-x64.cc b/src/compiler/backend/x64/code-generator-x64.cc
索引 6c828d6bc4..260c8619f2 100644
--- a/src/compiler/backend/x64/code-generator-x64.cc
+++ b/src/compiler/backend/x64/code-generator-x64.cc
@@ -744,6 +744,11 @@ CodeGenerator::CodeGenResult CodeGenerator::AssembleArchInstruction(
   InstructionCode opcode = instr->opcode();
   ArchOpcode arch_opcode = ArchOpcodeField::decode(opcode);
   switch (arch_opcode) {
+    case kX64Int32Add1: {
+      DCHECK_EQ(i.OutputRegister(), i.InputRegister(0));
+      __ addl(i.InputRegister(0), Immediate(1));
+      break;
+    }
     case kArchCallCodeObject: {
       if (HasImmediateInput(instr, 0)) {
         Handle<Code> code = i.InputCode(0);
```

这样测试就通过了：

幸运的是，`addl` 已有实现。如果我们的新操作码需要编写新的汇编指令实现，我们可以将其添加到 [src/compiler/backend/x64/assembler-x64.cc](https://cs.chromium.org/chromium/src/v8/src/codegen/x64/assembler-x64.cc)，在那里汇编指令被编码成字节并发出。

:::note
**提示：** 要检查生成的代码，可以通过向 `cctest` 传递 `--print-code`。
:::

## 其他架构

在这个代码实验中，我们仅为 x64 实现了这个新指令。对其他架构的实现步骤类似：添加 TurboFan 机器操作符，使用与平台相关的文件进行指令选择、调度、代码生成和汇编。

提示：如果我们将目前所做的内容编译到另一个目标上，例如 arm64，我们可能会在链接时遇到错误。要解决这些错误，请添加 `UNIMPLEMENTED()` 的存根。
