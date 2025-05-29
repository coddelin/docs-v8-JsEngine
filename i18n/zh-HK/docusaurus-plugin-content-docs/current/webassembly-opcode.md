---
title: 'WebAssembly - 添加新指令碼'
description: '本教學說明如何在 V8 中實現新的 WebAssembly 指令。'
---
[WebAssembly](https://webassembly.org/) (Wasm) 是一種基於堆疊的虛擬機的二進制指令格式。本教學將帶領讀者在 V8 中實現一個新的 WebAssembly 指令。

WebAssembly 在 V8 中分為三個部分實現：

- 解譯器
- 基線編譯器（Liftoff）
- 優化編譯器（TurboFan）

本文檔接下來的部分將重點關注 TurboFan 流程，詳細介紹如何添加一個新的 Wasm 指令並在 TurboFan 中實現它。

從高層次來看，Wasm 指令被編譯成一個 TurboFan 圖，由我們依賴的 TurboFan 流程將此圖編譯成（最終）機器碼。有關 TurboFan 的更多資訊，可參閱 [V8 文件](/docs/turbofan)。

## 操作碼/指令

讓我們定義一個新的指令，它將堆疊頂部的 [`int32`](https://webassembly.github.io/spec/core/syntax/types.html#syntax-valtype) 加 `1`。

:::note
**注意：** 所有 Wasm 實現支持的指令列表可以在[規範](https://webassembly.github.io/spec/core/appendix/index-instructions.html)中找到。
:::

所有的 Wasm 指令都定義在 [`src/wasm/wasm-opcodes.h`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-opcodes.h) 中。指令按照功能大致分組，例如控制、記憶體、SIMD、原子等。

我們來把新的指令 `I32Add1` 添加到 `FOREACH_SIMPLE_OPCODE` 部分：

```diff
diff --git a/src/wasm/wasm-opcodes.h b/src/wasm/wasm-opcodes.h
index 6970c667e7..867cbf451a 100644
--- a/src/wasm/wasm-opcodes.h
+++ b/src/wasm/wasm-opcodes.h
@@ -96,6 +96,7 @@ bool IsJSCompatibleSignature(const FunctionSig* sig, bool hasBigIntFeature);

 // 帶有簽名的表達式。
 #define FOREACH_SIMPLE_OPCODE(V)  \
+  V(I32Add1, 0xee, i_i)           \
   V(I32Eqz, 0x45, i_i)            \
   V(I32Eq, 0x46, i_ii)            \
   V(I32Ne, 0x47, i_ii)            \
```

WebAssembly 是一種二進制格式，因此 `0xee` 指定此指令的編碼。在本教學中，我們選擇了目前未使用的 `0xee`。

:::note
**注意：** 實際上將指令添加到規範中需要超出本文檔描述的工作。
:::

我們可以使用以下指令運行一個簡單的操作碼單元測試：

```
$ tools/dev/gm.py x64.debug unittests/WasmOpcodesTest*
...
[==========] Running 1 test from 1 test suite.
[----------] Global test environment set-up.
[----------] 1 test from WasmOpcodesTest
[ RUN      ] WasmOpcodesTest.EveryOpcodeHasAName
../../test/unittests/wasm/wasm-opcodes-unittest.cc:27: Failure
Value of: false
  Actual: false
Expected: true
WasmOpcodes::OpcodeName(kExprI32Add1) == "unknown"; plazz halp in src/wasm/wasm-opcodes.cc
[  FAILED  ] WasmOpcodesTest.EveryOpcodeHasAName
```

此錯誤表示我們還沒有為新的指令命名。我們可以在 [`src/wasm/wasm-opcodes.cc`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-opcodes.cc) 中添加新操作碼的名稱：

```diff
diff --git a/src/wasm/wasm-opcodes.cc b/src/wasm/wasm-opcodes.cc
index 5ed664441d..2d4e9554fe 100644
--- a/src/wasm/wasm-opcodes.cc
+++ b/src/wasm/wasm-opcodes.cc
@@ -75,6 +75,7 @@ const char* WasmOpcodes::OpcodeName(WasmOpcode opcode) {
     // clang-format off

     // 標準操作碼
+    CASE_I32_OP(Add1, "add1")
     CASE_INT_OP(Eqz, "eqz")
     CASE_ALL_OP(Eq, "eq")
     CASE_I64x2_OP(Eq, "eq")
```

通過在 `FOREACH_SIMPLE_OPCODE` 添加新指令，我們跳過了一些[相當大的工作](https://cs.chromium.org/chromium/src/v8/src/wasm/function-body-decoder-impl.h?l=1751-1756&rcl=686b68edf9f42c201c2b25bca9f4bef72ff41c0b)，這些工作在 `src/wasm/function-body-decoder-impl.h` 中負責解碼 Wasm 操作碼並調用 TurboFan 圖生成器。因此，根據您的指令碼的功能，可能需要更多工作。為了簡潔起見，我們省略這部分工作。

## 為新操作碼編寫測試

Wasm 測試可以在 [`test/cctest/wasm/`](https://cs.chromium.org/chromium/src/v8/test/cctest/wasm/) 找到。我們來看看 [`test/cctest/wasm/test-run-wasm.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/wasm/test-run-wasm.cc)，許多“簡單”的操作碼測試都在這裡進行。

這個文件中有很多例子我們可以參考。一般設置為：

- 創建 `WasmRunner`
- 設置全域變數以保存結果（可選）
- 設置作為指令參數的本地變數（可選）
- 構建 wasm 模組
- 執行測試並與預期輸出比較

以下是我們新操作碼的一個簡單測試：

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

執行測試：

```
$ tools/dev/gm.py x64.debug 'cctest/test-run-wasm-simd/RunWasmTurbofan_I32Add1'
...
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# Fatal error in ../../src/compiler/wasm-compiler.cc, line 988
# 不支援的操作碼 0xee:i32.add1
```

:::note
**提示:** 找到測試名稱可能會比較棘手，因為測試定義是通過一個巨集來進行的。使用[Code Search](https://cs.chromium.org/)點擊來探索巨集定義。
:::

此錯誤表明編譯器不知道我們的新指令。在下一節中將進行修改。

## 編譯 Wasm 到 TurboFan

在介紹中，我們提到Wasm指令被編譯為TurboFan圖。`wasm-compiler.cc`是執行此操作的地方。以下是操作碼 [`I32Eqz`](https://cs.chromium.org/chromium/src/v8/src/compiler/wasm-compiler.cc?l=716&rcl=686b68edf9f42c201c2b25bca9f4bef72ff41c0b) 的示例：

```cpp
  switch (opcode) {
    case wasm::kExprI32Eqz:
      op = m->Word32Equal();
      return graph()->NewNode(op, input, mcgraph()->Int32Constant(0));
```

這將對Wasm操作碼 `wasm::kExprI32Eqz` 進行切換，並構建 TurboFan 圖，包括操作 `Word32Equal` 與 `input` （即Wasm指令的參數）和常數 `0` 作為輸入。

`Word32Equal` 運算符由底層的 V8 抽象機提供，是與架構無關的。稍後此抽象機運算符將被轉換為與架構相關的匯編。

對於我們的新操作碼 `I32Add1`，我們需要一個添加常數1到輸入的圖，因此可以重用現有機器運算符 `Int32Add`，將 `input` 和常數1傳入：

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

這就足以讓測試通過。然而，並非所有指令都有現有的 TurboFan 機器運算符。在這種情況下，我們必須將此新運算符新增到機器中。讓我們試試看。

## TurboFan 機器運算符

我們想將 `Int32Add1` 的相關知識新增到 TurboFan 機器中。所以讓我們假設它已存在，並先使用它：

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

嘗試運行相同的測試會導致編譯失敗，並提示需要更改的地方：

```
../../src/compiler/wasm-compiler.cc:717:34: error: no member named 'Int32Add1' in 'v8::internal::compiler::MachineOperatorBuilder'; did you mean 'Int32Add'?
      return graph()->NewNode(m->Int32Add1(), input);
                                 ^~~~~~~~~
                                 Int32Add
```

有幾個地方需要修改以新增運算符：

1. [`src/compiler/machine-operator.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/machine-operator.cc)
1. 標頭文件 [`src/compiler/machine-operator.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/machine-operator.h)
1. 機器理解的操作碼列表 [`src/compiler/opcodes.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/opcodes.h)
1. 驗證器 [`src/compiler/verifier.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/verifier.cc)

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

```diff
diff --git a/src/compiler/machine-operator.h b/src/compiler/machine-operator.h
index a2b9fce0ee..f95e75a445 100644
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

```diff
diff --git a/src/compiler/opcodes.h b/src/compiler/opcodes.h
index ce24a0bd3f..2c8c5ebaca 100644
--- a/src/compiler/opcodes.h
+++ b/src/compiler/opcodes.h
@@ -506,6 +506,7 @@
   V(Float64LessThanOrEqual)

 #define MACHINE_UNOP_32_LIST(V) \
+  V(Int32Add1)                  \
   V(Word32Clz)                  \
   V(Word32Ctz)                  \
   V(Int32AbsWithOverflow)       \
```

```diff
diff --git a/src/compiler/verifier.cc b/src/compiler/verifier.cc
index 461aef0023..95251934ce 100644
--- a/src/compiler/verifier.cc
+++ b/src/compiler/verifier.cc
@@ -1861,6 +1861,7 @@ void Verifier::Visitor::Check(Node* node, const AllNodes& all) {
     case IrOpcode::kSignExtendWord16ToInt64:
     case IrOpcode::kSignExtendWord32ToInt64:
     case IrOpcode::kStaticAssert:
+    case IrOpcode::kInt32Add1:

 #define SIMD_MACHINE_OP_CASE(Name) case IrOpcode::k##Name:
       MACHINE_SIMD_OP_LIST(SIMD_MACHINE_OP_CASE)
```

Running the test again now gives us a different failure:

```
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# Fatal error in ../../src/compiler/backend/instruction-selector.cc, line 2072
# Unexpected operator #289:Int32Add1 @ node #7
```

## Instruction selection

So far we have been working at the TurboFan level, dealing with (a sea of) nodes in the TurboFan graph. However, at the assembly level, we have instructions and operands. Instruction selection is the process of translating this graph to instructions and operands.

The last test error indicated that we need something in [`src/compiler/backend/instruction-selector.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/instruction-selector.cc).  This is a big file with a giant switch statement over all the machine opcodes.  It calls into architecture specific instruction selection, using the visitor pattern to emit instructions for each type of node.

Since we added a new TurboFan machine opcode, we need to add it here as well:

```diff
diff --git a/src/compiler/backend/instruction-selector.cc b/src/compiler/backend/instruction-selector.cc
index 3152b2d41e..7375085649 100644
--- a/src/compiler/backend/instruction-selector.cc
+++ b/src/compiler/backend/instruction-selector.cc
@@ -2067,6 +2067,8 @@ void InstructionSelector::VisitNode(Node* node) {
       return MarkAsWord32(node), VisitS1x16AnyTrue(node);
     case IrOpcode::kS1x16AllTrue:
       return MarkAsWord32(node), VisitS1x16AllTrue(node);
+    case IrOpcode::kInt32Add1:
+      return MarkAsWord32(node), VisitInt32Add1(node);
     default:
       FATAL("Unexpected operator #%d:%s @ node #%d", node->opcode(),
             node->op()->mnemonic(), node->id());
```

Instruction selection is architecture dependent, so we have to add it to the architecture specific instruction selector files too. For this codelab we only focus on the x64 architecture, so [`src/compiler/backend/x64/instruction-selector-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-selector-x64.cc)
needs to be modified:

```diff
diff --git a/src/compiler/backend/x64/instruction-selector-x64.cc b/src/compiler/backend/x64/instruction-selector-x64.cc
index 2324e119a6..4b55671243 100644
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

And we also need to add this new x64-specific opcode, `kX64Int32Add1` to [`src/compiler/backend/x64/instruction-codes-x64.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-codes-x64.h):

```diff
diff --git a/src/compiler/backend/x64/instruction-codes-x64.h b/src/compiler/backend/x64/instruction-codes-x64.h
index 9b8be0e0b5..7f5faeb87b 100644
--- a/src/compiler/backend/x64/instruction-codes-x64.h
+++ b/src/compiler/backend/x64/instruction-codes-x64.h
@@ -12,6 +12,7 @@ namespace compiler {
 // X64-specific opcodes that specify which assembly sequence to emit.
 // Most opcodes specify a single instruction.
 #define TARGET_ARCH_OPCODE_LIST(V)        \
+  V(X64Int32Add1)                         \
   V(X64Add)                               \
   V(X64Add32)                             \
   V(X64And)                               \
```

## 指令排程和程式碼生成

執行我們的測試，我們看到新的編譯錯誤：

```
../../src/compiler/backend/x64/instruction-scheduler-x64.cc:15:11: error: enumeration value 'kX64Int32Add1' not handled in switch [-Werror,-Wswitch]
  switch (instr->arch_opcode()) {
          ^
1 error generated.
...
../../src/compiler/backend/x64/code-generator-x64.cc:733:11: error: enumeration value 'kX64Int32Add1' not handled in switch [-Werror,-Wswitch]
  switch (arch_opcode) {
          ^
1 error generated.
```

[指令排程](https://en.wikipedia.org/wiki/Instruction_scheduling)處理指令之間可能存在的依賴性，以允許更多的最佳化（例如指令重新排序）。我們的新操作碼沒有資料依賴性，因此可以簡單地將其添加到：[`src/compiler/backend/x64/instruction-scheduler-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-scheduler-x64.cc)：

```diff
diff --git a/src/compiler/backend/x64/instruction-scheduler-x64.cc b/src/compiler/backend/x64/instruction-scheduler-x64.cc
index 79eda7e78d..3667a84577 100644
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

程式碼生成的工作是將我們的架構特定操作碼轉換為組合語言。我們可以向 [`src/compiler/backend/x64/code-generator-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/code-generator-x64.cc) 添加一個分支：

```diff
diff --git a/src/compiler/backend/x64/code-generator-x64.cc b/src/compiler/backend/x64/code-generator-x64.cc
index 61c3a45a16..9c37ed7464 100644
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

目前我們的程式碼生成仍然是空的，我們可以執行測試以確保所有內容都能進行編譯：

```
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# Fatal error in ../../test/cctest/wasm/test-run-wasm.cc, line 37
# Check failed: 11 == r.Call() (11 vs. 10).
```

此失敗是意料之中的，因為我們的新指令尚未實現—它本質上是一個空操作，因此實際值未改變（`10`）。

若要實現我們的操作碼，我們可以使用 `add` 組合指令：

```diff
diff --git a/src/compiler/backend/x64/code-generator-x64.cc b/src/compiler/backend/x64/code-generator-x64.cc
index 6c828d6bc4..260c8619f2 100644
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

這使得測試能夠通過：

幸運的是，`addl` 已經實現。如果我們的新操作碼需要編寫新的組合指令實現，我們將把它添加到 [`src/compiler/backend/x64/assembler-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/codegen/x64/assembler-x64.cc) 中，該文件負責將組合指令編碼為位元組並進行發出。

:::note
**提示：** 若要檢查生成的程式碼，我們可以向 `cctest` 傳遞 `--print-code`。
:::

## 其他架構

在這個 codelab 中，我們僅為 x64 實現了這個新指令。其他架構所需的步驟類似：添加 TurboFan 機器操作符，使用與平臺相關的檔案進行指令選擇、排程、程式碼生成、組譯。

提示：如果我們將目前完成的內容編譯到其他目標，例如 arm64，我們可能會在鏈接時遇到錯誤。為了解決這些錯誤，請添加 `UNIMPLEMENTED()` 零件。
