---
title: "WebAssembly - добавление нового опкода"
description: "Этот учебник объясняет, как реализовать новую инструкцию WebAssembly в V8."
---
[WebAssembly](https://webassembly.org/) (Wasm) — это двоичный формат инструкций для виртуальной машины на основе стека. Этот учебник шаг за шагом объясняет реализацию новой инструкции WebAssembly в V8.

WebAssembly в V8 реализован в трех частях:

- интерпретатор
- базовый компилятор (Liftoff)
- оптимизирующий компилятор (TurboFan)

Остальная часть этого документа сосредоточена на конвейере TurboFan, объясняя, как добавить новую инструкцию Wasm и реализовать её в TurboFan.

На высоком уровне инструкции Wasm компилируются в граф TurboFan, и мы полагаемся на конвейер TurboFan для компиляции графа в (в конечном счете) машинный код. Чтобы узнать больше о TurboFan, ознакомьтесь с [документацией V8](/docs/turbofan).

## Опкоды/Инструкции

Определим новую инструкцию, которая добавляет `1` к [`int32`](https://webassembly.github.io/spec/core/syntax/types.html#syntax-valtype) (на вершине стека).

:::note
**Примечание:** Список инструкций, поддерживаемых всеми реализациями Wasm, можно найти в [спецификации](https://webassembly.github.io/spec/core/appendix/index-instructions.html).
:::

Все инструкции Wasm определены в [`src/wasm/wasm-opcodes.h`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-opcodes.h). Инструкции сгруппированы приблизительно в зависимости от их функции, например управление, память, SIMD, атомарные операции и т.д.

Добавим нашу новую инструкцию, `I32Add1`, в раздел `FOREACH_SIMPLE_OPCODE`:

```diff
diff --git a/src/wasm/wasm-opcodes.h b/src/wasm/wasm-opcodes.h
index 6970c667e7..867cbf451a 100644
--- a/src/wasm/wasm-opcodes.h
+++ b/src/wasm/wasm-opcodes.h
@@ -96,6 +96,7 @@ bool IsJSCompatibleSignature(const FunctionSig* sig, bool hasBigIntFeature);

 // Выражения с сигнатурами.
 #define FOREACH_SIMPLE_OPCODE(V)  \
+  V(I32Add1, 0xee, i_i)           \
   V(I32Eqz, 0x45, i_i)            \
   V(I32Eq, 0x46, i_ii)            \
   V(I32Ne, 0x47, i_ii)            \
```

WebAssembly — это двоичный формат, поэтому `0xee` указывает кодировку этой инструкции. В этом учебнике мы выбрали `0xee`, так как она в настоящее время не используется.

:::note
**Примечание:** Фактическое добавление инструкции в спецификацию требует работы, выходящей за рамки описанного здесь.
:::

Мы можем запустить простой unit-тест для опкодов с:

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

Эта ошибка указывает на то, что у нашей новой инструкции нет имени. Добавление имени для нового опкода можно сделать в [`src/wasm/wasm-opcodes.cc`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-opcodes.cc):

```diff
diff --git a/src/wasm/wasm-opcodes.cc b/src/wasm/wasm-opcodes.cc
index 5ed664441d..2d4e9554fe 100644
--- a/src/wasm/wasm-opcodes.cc
+++ b/src/wasm/wasm-opcodes.cc
@@ -75,6 +75,7 @@ const char* WasmOpcodes::OpcodeName(WasmOpcode opcode) {
     // clang-format off

     // Стандартные опкоды
+    CASE_I32_OP(Add1, "add1")
     CASE_INT_OP(Eqz, "eqz")
     CASE_ALL_OP(Eq, "eq")
     CASE_I64x2_OP(Eq, "eq")
```

Добавив нашу новую инструкцию в `FOREACH_SIMPLE_OPCODE`, мы пропускаем [значительный объем работы](https://cs.chromium.org/chromium/src/v8/src/wasm/function-body-decoder-impl.h?l=1751-1756&rcl=686b68edf9f42c201c2b25bca9f4bef72ff41c0b), который выполняется в `src/wasm/function-body-decoder-impl.h`, где декодируются опкоды Wasm и вызывается генератор графа TurboFan. Таким образом, в зависимости от того, что делает ваш опкод, вам может понадобиться выполнить больше работы. Мы пропускаем это ради краткости.

## Написание теста для нового опкода

Тесты Wasm находятся в [`test/cctest/wasm/`](https://cs.chromium.org/chromium/src/v8/test/cctest/wasm/). Давайте рассмотрим [`test/cctest/wasm/test-run-wasm.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/wasm/test-run-wasm.cc), где тестируются многие «простые» опкоды.

В этом файле много примеров, которые мы можем использовать. Общая настройка включает:

- создание `WasmRunner`
- настройка глобальных переменных для хранения результата (опционально)
- настройка локальных переменных как параметров для инструкции (опционально)
- построение модуля wasm
- запуск и сравнение с ожидаемым результатом

Вот простой тест для нашего нового опкода:

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

Запустите тест:

```
$ tools/dev/gm.py x64.debug 'cctest/test-run-wasm-simd/RunWasmTurbofan_I32Add1'
...
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# Фатальная ошибка в ../../src/compiler/wasm-compiler.cc, строка 988
# Неподдерживаемая операция 0xee:i32.add1
```

:::note
**Подсказка:** Найти имя теста может быть непросто, так как определение теста скрыто за макросом. Используйте [Code Search](https://cs.chromium.org/), чтобы кликом пройтись по определению макросов.
:::

Эта ошибка говорит о том, что компилятор не знает о нашей новой инструкции. Это изменится в следующем разделе.

## Компиляция Wasm в TurboFan

В введении мы упоминали, что инструкции Wasm компилируются в граф TurboFan. `wasm-compiler.cc` — место, где это происходит. Давайте посмотрим на пример инструкции [`I32Eqz`](https://cs.chromium.org/chromium/src/v8/src/compiler/wasm-compiler.cc?l=716&rcl=686b68edf9f42c201c2b25bca9f4bef72ff41c0b):

```cpp
  switch (opcode) {
    case wasm::kExprI32Eqz:
      op = m->Word32Equal();
      return graph()->NewNode(op, input, mcgraph()->Int32Constant(0));
```

Здесь происходит переключение на инструкцию Wasm `wasm::kExprI32Eqz`, и строится граф TurboFan, состоящий из операции `Word32Equal` с входными данными `input`, которые передаются в инструкцию Wasm, и константой `0`.

Оператор `Word32Equal` предоставляется базовой абстрактной машиной V8, которая не зависит от архитектуры. Позднее в пайплайне этот оператор абстрактной машины будет переведен в архитектурно зависимый ассемблер.

Для новой инструкции, `I32Add1`, нам нужен граф, который добавляет к входным данным константу 1, так что мы можем использовать существующий оператор машины, `Int32Add`, передавая ему входные данные и константу 1:

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

Этого достаточно, чтобы тест прошел. Однако, не все инструкции имеют существующий оператор машины TurboFan. В этом случае нам придется добавить новый оператор в машину. Давайте попробуем это сделать.

## Операторы машины TurboFan

Мы хотим добавить информацию об `Int32Add1` в машину TurboFan. Так что давайте притворимся, что он существует, и сначала применим его:

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

Попытка запустить тот же тест приводит к ошибке компиляции, которая подсказывает место для внесения изменений:

```
../../src/compiler/wasm-compiler.cc:717:34: ошибка: в 'v8::internal::compiler::MachineOperatorBuilder' нет члена с именем 'Int32Add1'; возможно, вы имели в виду 'Int32Add'?
      return graph()->NewNode(m->Int32Add1(), input);
                                 ^~~~~~~~~
                                 Int32Add
```

Существует несколько мест, которые нужно изменить, чтобы добавить оператор:

1. [`src/compiler/machine-operator.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/machine-operator.cc)
1. заголовок [`src/compiler/machine-operator.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/machine-operator.h)
1. список инструкций, которыми понимает машина [`src/compiler/opcodes.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/opcodes.h)
1. проверка [`src/compiler/verifier.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/verifier.cc)

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

## Избор инструкций

На данный момент мы работали на уровне TurboFan, имея дело с (массивом) узлов в графе TurboFan. Однако на уровне сборки у нас есть инструкции и операнды. Избор инструкций — это процесс перевода этого графа в инструкции и операнды.

Ошибка последнего теста указала на то, что нам нужно что-то в файле [`src/compiler/backend/instruction-selector.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/instruction-selector.cc). Это большой файл с гигантским оператором switch для всех машинных опкодов. Он вызывает архитектурно-специфический выбор инструкций, используя паттерн посетителя для генерации инструкций для каждого типа узла.

Поскольку мы добавили новый машинный опкод TurboFan, нам нужно добавить его сюда тоже:

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
       FATAL("Неожиданный оператор #%d:%s @ узел #%d", node->opcode(),
             node->op()->mnemonic(), node->id());
```

Избор инструкций зависит от архитектуры, поэтому мы должны добавить его в файлы выборщика инструкций, специфичные для архитектуры. Для этого учебного курса мы сосредотачиваемся только на архитектуре x64, поэтому [`src/compiler/backend/x64/instruction-selector-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-selector-x64.cc)
нужно изменить:

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

И нам также нужно добавить этот новый опкод, специфичный для x64, `kX64Int32Add1` в [`src/compiler/backend/x64/instruction-codes-x64.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-codes-x64.h):

```diff
diff --git a/src/compiler/backend/x64/instruction-codes-x64.h b/src/compiler/backend/x64/instruction-codes-x64.h
index 9b8be0e0b5..7f5faeb87b 100644
--- а/src/compiler/backend/x64/instruction-codes-x64.h
+++ б/src/compiler/backend/x64/instruction-codes-x64.h
@@ -12,6 +12,7 @@ namespace compiler {
 // X64-специфические опкоды, указывающие, какую последовательность ассемблерных инструкций нужно генерировать.
 // Большинство опкодов указывают одну инструкцию.
 #define TARGET_ARCH_OPCODE_LIST(V)        \
+  V(X64Int32Add1)                         \
   V(X64Add)                               \
   V(X64Add32)                             \
   V(X64And)                               \
```

## Планирование инструкций и генерация кода

Выполнив наш тест, мы видим новые ошибки компиляции:

```
../../src/compiler/backend/x64/instruction-scheduler-x64.cc:15:11: ошибка: значение перечисления 'kX64Int32Add1' не обработано в switch [-Werror,-Wswitch]
  switch (instr->arch_opcode()) {
          ^
1 ошибка сгенерирована.
...
../../src/compiler/backend/x64/code-generator-x64.cc:733:11: ошибка: значение перечисления 'kX64Int32Add1' не обработано в switch [-Werror,-Wswitch]
  switch (arch_opcode) {
          ^
1 ошибка сгенерирована.
```

[Планирование инструкций](https://ru.wikipedia.org/wiki/Планирование_инструкций) обрабатывает зависимости между инструкциями для увеличения эффективности (например, перестановка инструкций). Наш новый опкод не имеет зависимости, поэтому мы можем просто добавить его в: [`src/compiler/backend/x64/instruction-scheduler-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-scheduler-x64.cc):

```diff
diff --git а/src/compiler/backend/x64/instruction-scheduler-x64.cc б/src/compiler/backend/x64/instruction-scheduler-x64.cc
index 79eda7e78d..3667a84577 100644
--- а/src/compiler/backend/x64/instruction-scheduler-x64.cc
+++ б/src/compiler/backend/x64/instruction-scheduler-x64.cc
@@ -13,6 +13,7 @@ bool InstructionScheduler::SchedulerSupported() { return true; }
 int InstructionScheduler::GetTargetInstructionFlags(
     const Instruction* instr) const {
   switch (instr->arch_opcode()) {
+    case kX64Int32Add1:
     case kX64Add:
     case kX64Add32:
     case kX64And:
```

Генерация кода — это процесс перевода специфических для архитектуры опкодов в ассемблер. Добавим условие в [`src/compiler/backend/x64/code-generator-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/code-generator-x64.cc):

```diff
diff --git а/src/compiler/backend/x64/code-generator-x64.cc б/src/compiler/backend/x64/code-generator-x64.cc
index 61c3a45a16..9c37ed7464 100644
--- а/src/compiler/backend/x64/code-generator-x64.cc
+++ б/src/compiler/backend/x64/code-generator-x64.cc
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

На данный момент мы оставляем генерацию кода пустой, и можем выполнить тест, чтобы убедиться, что всё компилируется:

```
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# Фатальная ошибка в ../../test/cctest/wasm/test-run-wasm.cc, строка 37
# Ошибка проверки: 11 == r.Call() (11 vs. 10).
```

Эта ошибка ожидаема, поскольку наша новая инструкция ещё не реализована — она фактически ничего не делает, так что фактическое значение осталось неизменным (`10`).

Чтобы реализовать наш опкод, мы можем использовать команду `add` из ассемблера:

```diff
diff --git а/src/compiler/backend/x64/code-generator-x64.cc б/src/compiler/backend/x64/code-generator-x64.cc
index 6c828d6bc4..260c8619f2 100644
--- а/src/compiler/backend/x64/code-generator-x64.cc
+++ б/src/compiler/backend/x64/code-generator-x64.cc
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

И теперь тест проходит:

К счастью для нас, `addl` уже реализован. Если бы наш новый опкод требовал написания реализации новой инструкции ассемблера, мы добавили бы её в [`src/compiler/backend/x64/assembler-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/codegen/x64/assembler-x64.cc), где инструкция ассемблера кодируется в байты и генерируется.

:::note
**Совет:** Чтобы увидеть сгенерированный код, можно передать `--print-code` в `cctest`.
:::

## Другие архитектуры

В этой лабораторной работе мы реализовали эту новую инструкцию только для x64. Шаги, необходимые для других архитектур, похожи: добавьте операторы машины TurboFan, используйте файлы, зависящие от платформы, для выбора инструкции, планирования, генерации кода и ассемблера.

Совет: если мы скомпилируем то, что сделали до сих пор, на другой целевой платформе, например arm64, вероятно, мы столкнемся с ошибками связывания. Чтобы устранить эти ошибки, добавьте заглушки `UNIMPLEMENTED()`.
