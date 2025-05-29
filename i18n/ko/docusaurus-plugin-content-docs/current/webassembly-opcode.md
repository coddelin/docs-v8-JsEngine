---
title: 'WebAssembly - 새로운 opcode 추가하기'
description: '이 튜토리얼은 V8에서 새로운 WebAssembly 명령어를 구현하는 방법을 설명합니다.'
---
[WebAssembly](https://webassembly.org/) (Wasm)은 스택 기반 가상 머신을 위한 바이너리 명령어 포맷입니다. 이 튜토리얼은 V8에서 새로운 WebAssembly 명령어를 구현하는 과정을 독자에게 안내합니다.

WebAssembly는 V8에서 크게 세 부분으로 구성되어 있습니다:

- 인터프리터
- 기본 컴파일러 (Liftoff)
- 최적화 컴파일러 (TurboFan)

이 문서의 나머지 부분에서는 TurboFan 파이프라인에 집중하여 새로운 Wasm 명령어를 추가하고 TurboFan에서 구현하는 방법을 설명합니다.

대략적으로 Wasm 명령어는 TurboFan 그래프로 컴파일되며, TurboFan 파이프라인을 사용해 최종적으로 머신 코드로 그래프를 컴파일합니다. TurboFan에 대한 더 많은 정보는 [V8 문서](/docs/turbofan)를 참조하세요.

## Opcode/명령어

스택 상단의 [`int32`](https://webassembly.github.io/spec/core/syntax/types.html#syntax-valtype)에 `1`을 추가하는 새로운 명령어를 정의해봅시다.

:::note
**주의:** 모든 Wasm 구현이 지원하는 명령어 목록은 [사양](https://webassembly.github.io/spec/core/appendix/index-instructions.html)에서 확인할 수 있습니다.
:::

모든 Wasm 명령어는 [`src/wasm/wasm-opcodes.h`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-opcodes.h)에서 정의됩니다. 명령어들은 예를 들어 제어, 메모리, SIMD, 원자성 등 수행하는 작업에 따라 그룹으로 나뉩니다.

`FOREACH_SIMPLE_OPCODE` 섹션에 새로운 명령어 `I32Add1`을 추가해봅시다:

```diff
diff --git a/src/wasm/wasm-opcodes.h b/src/wasm/wasm-opcodes.h
index 6970c667e7..867cbf451a 100644
--- a/src/wasm/wasm-opcodes.h
+++ b/src/wasm/wasm-opcodes.h
@@ -96,6 +96,7 @@ bool IsJSCompatibleSignature(const FunctionSig* sig, bool hasBigIntFeature);

 // 시그니처와 함께 표현.
 #define FOREACH_SIMPLE_OPCODE(V)  \
+  V(I32Add1, 0xee, i_i)           \
   V(I32Eqz, 0x45, i_i)            \
   V(I32Eq, 0x46, i_ii)            \
   V(I32Ne, 0x47, i_ii)            \
```

WebAssembly는 바이너리 포맷이므로 `0xee`는 이 명령어의 인코딩을 지정합니다. 이 튜토리얼에서는 현재 사용되지 않은 `0xee`를 선택했습니다.

:::note
**주의:** 실제로 명령어를 사양에 추가하려면 여기에서 설명된 것 이상의 작업이 필요합니다.
:::

다음 명령어로 opcode의 간단한 단위 테스트를 실행할 수 있습니다:

```
$ tools/dev/gm.py x64.debug unittests/WasmOpcodesTest*
...
[==========] 1개의 테스트를 실행 중.
[----------] 글로벌 테스트 환경 설정 완료.
[----------] WasmOpcodesTest의 테스트 진행.
[ RUN      ] WasmOpcodesTest.EveryOpcodeHasAName
../../test/unittests/wasm/wasm-opcodes-unittest.cc:27: 실패
값: false
  실제: false
예상: true
WasmOpcodes::OpcodeName(kExprI32Add1) == "unknown"; plazz halp in src/wasm/wasm-opcodes.cc
[  FAILED  ] WasmOpcodesTest.EveryOpcodeHasAName
```

이 오류는 새로운 명령어에 이름이 없음을 나타냅니다. 새 opcode에 이름을 추가하려면 [`src/wasm/wasm-opcodes.cc`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-opcodes.cc)에서 작업을 수행할 수 있습니다:

```diff
diff --git a/src/wasm/wasm-opcodes.cc b/src/wasm/wasm-opcodes.cc
index 5ed664441d..2d4e9554fe 100644
--- a/src/wasm/wasm-opcodes.cc
+++ b/src/wasm/wasm-opcodes.cc
@@ -75,6 +75,7 @@ const char* WasmOpcodes::OpcodeName(WasmOpcode opcode) {
     // clang-format off

     // 표준 opcode
+    CASE_I32_OP(Add1, "add1")
     CASE_INT_OP(Eqz, "eqz")
     CASE_ALL_OP(Eq, "eq")
     CASE_I64x2_OP(Eq, "eq")
```

`FOREACH_SIMPLE_OPCODE`에 새로운 명령어를 추가함으로써 [`src/wasm/function-body-decoder-impl.h`](https://cs.chromium.org/chromium/src/v8/src/wasm/function-body-decoder-impl.h?l=1751-1756&rcl=686b68edf9f42c201c2b25bca9f4bef72ff41c0b)에 있는 Wasm opcode를 디코딩하고 TurboFan 그래프 생성기로 호출하는 [상당량의 작업](https://cs.chromium.org/chromium/src/v8/src/wasm/function-body-decoder-impl.h?l=1751-1756&rcl=686b68edf9f42c201c2b25bca9f4bef72ff41c0b)을 생략합니다. 따라서 opcode가 수행하는 작업에 따라 더 많은 작업이 필요할 수 있으며, 간단히 하기 위해 이를 생략합니다.

## 새로운 opcode에 대한 테스트 작성하기

Wasm 테스트는 [`test/cctest/wasm/`](https://cs.chromium.org/chromium/src/v8/test/cctest/wasm/)에서 찾을 수 있습니다. [`test/cctest/wasm/test-run-wasm.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/wasm/test-run-wasm.cc)를 살펴보면 많은 "간단한" opcode가 테스트되는 것을 확인할 수 있습니다.

이 파일에는 따라할 수 있는 많은 예제가 있습니다. 일반적인 설정은 다음과 같습니다:

- `WasmRunner` 생성
- 결과를 저장할 글로벌 변수 설정 (선택사항)
- 명령어에 대한 매개변수로 로컬 변수 설정 (선택사항)
- Wasm 모듈 빌드
- 실행하고 예상 출력과 비교

새로운 opcode에 대한 간단한 테스트는 다음과 같습니다:

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

테스트 실행:

```
$ tools/dev/gm.py x64.debug 'cctest/test-run-wasm-simd/RunWasmTurbofan_I32Add1'
...
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# ../../src/compiler/wasm-compiler.cc, 988행 치명적 오류
# 지원되지 않는 연산코드 0xee:i32.add1
```

:::note
**팁:** 테스트 이름을 찾는 것은 테스트 정의가 매크로 뒤에 있기 때문에 어려울 수 있습니다. 매크로 정의를 발견하려면 [Code Search](https://cs.chromium.org/)를 사용하세요.
:::

이 오류는 컴파일러가 새로운 명령어를 인식하지 못한다는 것을 나타냅니다. 다음 단락에서는 이 부분이 변경될 것입니다.

## Wasm을 TurboFan으로 컴파일하기

소개에서 언급했듯이 Wasm 명령어는 TurboFan 그래프로 컴파일됩니다. `wasm-compiler.cc` 파일에서 이 과정이 이루어집니다. 예제 연산코드 [`I32Eqz`](https://cs.chromium.org/chromium/src/v8/src/compiler/wasm-compiler.cc?l=716&rcl=686b68edf9f42c201c2b25bca9f4bef72ff41c0b)를 살펴보겠습니다:

```cpp
  switch (opcode) {
    case wasm::kExprI32Eqz:
      op = m->Word32Equal();
      return graph()->NewNode(op, input, mcgraph()->Int32Constant(0));
```

이 코드는 Wasm 연산코드인 `wasm::kExprI32Eqz`에 대한 스위치를 수행하며, TurboFan 그래프를 구성합니다. 그래프는 Wasm 명령어의 인수인 `input`과 상수 `0`을 가지고 `Word32Equal` 연산으로 구성됩니다.

`Word32Equal` 연산자는 아키텍처 독립적인 V8 추상 머신에서 제공됩니다. 파이프라인의 후반에 이 추상 머신 연산자는 아키텍처 종속적인 어셈블리어 코드로 변환됩니다.

새로운 연산코드 `I32Add1`의 경우, 입력 값에 상수 1을 더하는 그래프가 필요합니다. 이를 위해 기존 머신 연산자인 `Int32Add`를 입력값과 상수 1로 호출하여 재사용할 수 있습니다:

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

이것으로 테스트를 통과할 수 있습니다. 하지만 모든 명령어가 기존 TurboFan 머신 연산자를 가지고 있는 것은 아닙니다. 그런 경우, 새로운 연산자를 머신에 추가해야 합니다. 이를 시도해보겠습니다.

## TurboFan 머신 연산자

`Int32Add1`에 대한 정보를 TurboFan 머신에 추가하려고 합니다. 존재하는 것처럼 가정하고 우선 사용해보겠습니다:

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

동일한 테스트 실행 시 컴파일 오류가 발생하며, 어디를 수정해야 할지 힌트를 줍니다:

```
../../src/compiler/wasm-compiler.cc:717:34: error: 'v8::internal::compiler::MachineOperatorBuilder'에 'Int32Add1' 멤버가 없습니다. 'Int32Add'를 사용하시겠습니까?
      return graph()->NewNode(m->Int32Add1(), input);
                                 ^~~~~~~~~
                                 Int32Add
```

연산자를 추가하려면 몇 가지 수정이 필요합니다:

1. [`src/compiler/machine-operator.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/machine-operator.cc)
1. 헤더 [`src/compiler/machine-operator.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/machine-operator.h)
1. 머신이 인식할 수 있는 연산코드 목록 [`src/compiler/opcodes.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/opcodes.h)
1. 검증기 [`src/compiler/verifier.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/verifier.cc)

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
 // X64 고유 명령 코드로 어셈블리 시퀀스를 지정합니다.
 // 대부분의 명령 코드는 단일 명령을 지정합니다.
 #define TARGET_ARCH_OPCODE_LIST(V)        \
+  V(X64Int32Add1)                         \
   V(X64Add)                               \
   V(X64Add32)                             \
   V(X64And)                               \
```

## 명령 스케줄링 및 코드 생성

테스트를 실행하면 새 컴파일 오류를 확인할 수 있습니다:

```
../../src/compiler/backend/x64/instruction-scheduler-x64.cc:15:11: error: 열거 값 'kX64Int32Add1'가 switch에서 처리되지 않음 [-Werror,-Wswitch]
  switch (instr->arch_opcode()) {
          ^
1 error generated.
...
../../src/compiler/backend/x64/code-generator-x64.cc:733:11: error: 열거 값 'kX64Int32Add1'가 switch에서 처리되지 않음 [-Werror,-Wswitch]
  switch (arch_opcode) {
          ^
1 error generated.
```

[명령 스케줄링](https://en.wikipedia.org/wiki/Instruction_scheduling)은 명령 간 종속성을 처리하여 더 많은 최적화를 가능하게 합니다 (예: 명령 재배치). 새 명령 코드는 데이터 종속성이 없으므로 간단히 추가할 수 있습니다: [`src/compiler/backend/x64/instruction-scheduler-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-scheduler-x64.cc):

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

코드 생성은 아키텍처 고유 명령 코드를 어셈블리 코드로 변환하는 과정입니다. 다음을 추가해봅시다: [`src/compiler/backend/x64/code-generator-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/code-generator-x64.cc):

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

현재는 코드 생성을 비워둔 상태로 테스트를 실행해 컴파일되는지 확인할 수 있습니다:

```
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# Fatal error in ../../test/cctest/wasm/test-run-wasm.cc, line 37
# Check failed: 11 == r.Call() (11 vs. 10).
```

이 오류는 예상된 것입니다. 새 명령이 아직 구현되지 않았기 때문으로 — 본질적으로 아무 작업도 하지 않기 때문에 실제 값이 변경되지 않았습니다 (`10`).

새 명령 코드를 구현하려면 `add` 어셈블리 명령을 사용할 수 있습니다:

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

이를 통해 테스트가 통과됩니다:

다행히도 우리에게는 이미 구현된 `addl`이 있습니다. 만약 새 명령 코드가 새로운 어셈블리 명령 구현을 필요로 했다면, 이를 [`src/compiler/backend/x64/assembler-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/codegen/x64/assembler-x64.cc)에 추가했을 것입니다. 여기에서 어셈블리 명령이 바이트로 인코딩되고 출력됩니다.

:::note
**팁:** 생성된 코드를 확인하려면 `--print-code`를 `cctest`에 전달할 수 있습니다.
:::

## 기타 아키텍처

이 코드랩에서는 x64용으로만 이 새로운 명령을 구현했습니다. 다른 아키텍처에 필요한 단계는 유사합니다: TurboFan 머신 연산자를 추가하고, 명령 선택, 스케줄링, 코드 생성, 어셈블러에 플랫폼 종속 파일을 사용하십시오.

팁: 우리가 지금까지 한 내용을 다른 대상(예: arm64)에서 컴파일하면 링크 오류가 발생할 가능성이 높습니다. 이러한 오류를 해결하려면 `UNIMPLEMENTED()` 스텁을 추가하십시오.
