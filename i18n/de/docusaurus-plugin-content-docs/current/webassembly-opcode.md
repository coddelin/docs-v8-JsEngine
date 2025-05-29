---
title: 'WebAssembly - Hinzufügen eines neuen Opcodes'
description: 'Dieses Tutorial erklärt, wie man eine neue WebAssembly-Anweisung in V8 implementiert.'
---
[WebAssembly](https://webassembly.org/) (Wasm) ist ein binäres Anweisungsformat für eine stackbasierte virtuelle Maschine. Dieses Tutorial führt den Leser durch die Implementierung einer neuen WebAssembly-Anweisung in V8.

WebAssembly wird in V8 in drei Teilen implementiert:

- der Interpreter
- der Baseline-Compiler (Liftoff)
- der Optimierungs-Compiler (TurboFan)

Der Rest dieses Dokuments konzentriert sich auf die TurboFan-Pipeline und erläutert, wie man eine neue Wasm-Anweisung hinzufügt und in TurboFan implementiert.

Auf hoher Ebene werden Wasm-Anweisungen in einen TurboFan-Graphen kompiliert, und wir nutzen die TurboFan-Pipeline, um den Graphen (letztendlich) in Maschinencode zu kompilieren. Mehr über TurboFan erfahren Sie in den [V8-Dokumenten](/docs/turbofan).

## Opcodes/Anweisungen

Definieren wir eine neue Anweisung, die `1` zu einem [`int32`](https://webassembly.github.io/spec/core/syntax/types.html#syntax-valtype) (oben auf dem Stack) hinzufügt.

:::note
**Hinweis:** Eine Liste der von allen Wasm-Implementierungen unterstützten Anweisungen finden Sie in der [Spezifikation](https://webassembly.github.io/spec/core/appendix/index-instructions.html).
:::

Alle Wasm-Anweisungen sind in [`src/wasm/wasm-opcodes.h`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-opcodes.h) definiert. Die Anweisungen sind grob nach ihrer Funktion gruppiert, z. B. Steuerung, Speicher, SIMD, Atomar usw.

Fügen wir unsere neue Anweisung, `I32Add1`, im Abschnitt `FOREACH_SIMPLE_OPCODE` hinzu:

```diff
diff --git a/src/wasm/wasm-opcodes.h b/src/wasm/wasm-opcodes.h
index 6970c667e7..867cbf451a 100644
--- a/src/wasm/wasm-opcodes.h
+++ b/src/wasm/wasm-opcodes.h
@@ -96,6 +96,7 @@ bool IsJSCompatibleSignature(const FunctionSig* sig, bool hasBigIntFeature);

 // Ausdrücke mit Signaturen.
 #define FOREACH_SIMPLE_OPCODE(V)  \
+  V(I32Add1, 0xee, i_i)           \
   V(I32Eqz, 0x45, i_i)            \
   V(I32Eq, 0x46, i_ii)            \
   V(I32Ne, 0x47, i_ii)            \
```

WebAssembly ist ein binäres Format, daher gibt `0xee` die Codierung dieser Anweisung an. In diesem Tutorial haben wir `0xee` gewählt, da es derzeit nicht verwendet wird.

:::note
**Hinweis:** Das Hinzufügen einer Anweisung zur Spezifikation erfordert Arbeiten, die über das hier Beschriebene hinausgehen.
:::

Wir können einen einfachen Unit-Test für Opcodes mit folgendem Befehl ausführen:

```
$ tools/dev/gm.py x64.debug unittests/WasmOpcodesTest*
...
[==========] 1 Test in 1 Testsuite wird ausgeführt.
[----------] Globale Testumgebung eingerichtet.
[----------] 1 Test von WasmOpcodesTest
[ RUN      ] WasmOpcodesTest.EveryOpcodeHasAName
../../test/unittests/wasm/wasm-opcodes-unittest.cc:27: Fehler
Wert von: false
  Tatsächlich: false
Erwartet: true
WasmOpcodes::OpcodeName(kExprI32Add1) == "unknown"; plazz halp in src/wasm/wasm-opcodes.cc
[  FAILED  ] WasmOpcodesTest.EveryOpcodeHasAName
```

Dieser Fehler zeigt an, dass wir keinen Namen für unsere neue Anweisung haben. Das Hinzufügen eines Namens für den neuen Opcode kann in [`src/wasm/wasm-opcodes.cc`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-opcodes.cc) erfolgen:

```diff
diff --git a/src/wasm/wasm-opcodes.cc b/src/wasm/wasm-opcodes.cc
index 5ed664441d..2d4e9554fe 100644
--- a/src/wasm/wasm-opcodes.cc
+++ b/src/wasm/wasm-opcodes.cc
@@ -75,6 +75,7 @@ const char* WasmOpcodes::OpcodeName(WasmOpcode opcode) {
     // clang-format off

     // Standard-Opcodes
+    CASE_I32_OP(Add1, "add1")
     CASE_INT_OP(Eqz, "eqz")
     CASE_ALL_OP(Eq, "eq")
     CASE_I64x2_OP(Eq, "eq")
```

Indem wir unsere neue Anweisung in `FOREACH_SIMPLE_OPCODE` hinzufügen, überspringen wir eine [beträchtliche Menge Arbeit](https://cs.chromium.org/chromium/src/v8/src/wasm/function-body-decoder-impl.h?l=1751-1756&rcl=686b68edf9f42c201c2b25bca9f4bef72ff41c0b), die in `src/wasm/function-body-decoder-impl.h` geleistet wird, wo Wasm-Opcodes dekodiert und in den TurboFan-Graphengenerator aufgerufen werden. Abhängig davon, was Ihr Opcode tut, könnten Sie mehr Arbeit zu tun haben. Wir überspringen dies im Interesse der Kürze.

## Schreiben eines Tests für den neuen Opcode

Wasm-Tests finden Sie in [`test/cctest/wasm/`](https://cs.chromium.org/chromium/src/v8/test/cctest/wasm/). Werfen wir einen Blick auf [`test/cctest/wasm/test-run-wasm.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/wasm/test-run-wasm.cc), wo viele „einfache“ Opcodes getestet werden.

In dieser Datei gibt es viele Beispiele, denen wir folgen können. Die allgemeine Einrichtung ist:

- Erstellen Sie einen `WasmRunner`
- Richten Sie globale Variablen zur Ergebnisaufnahme ein (optional)
- Richten Sie lokale Variablen als Parameter für die Anweisung ein (optional)
- Bauen Sie das Wasm-Modul
- Führen Sie es aus und vergleichen Sie es mit einer erwarteten Ausgabe

Hier ist ein einfacher Test für unseren neuen Opcode:

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

Führen Sie den Test aus:

```
$ tools/dev/gm.py x64.debug &apos;cctest/test-run-wasm-simd/RunWasmTurbofan_I32Add1&apos;
...
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# Fataler Fehler in ../../src/compiler/wasm-compiler.cc, Zeile 988
# Nicht unterstützter Opcode 0xee:i32.add1
```

:::note
**Tipp:** Den Testnamen zu finden, kann knifflig sein, da sich die Testdefinition hinter einem Makro befindet. Verwenden Sie [Code Search](https://cs.chromium.org/), um die Makrodefinitionen zu entdecken.
:::

Dieser Fehler zeigt an, dass der Compiler unsere neue Anweisung nicht kennt. Das wird sich im nächsten Abschnitt ändern.

## Kompilieren von Wasm in TurboFan

In der Einführung haben wir erwähnt, dass Wasm-Anweisungen in ein TurboFan-Diagramm kompiliert werden. `wasm-compiler.cc` ist der Ort, an dem dies geschieht. Sehen wir uns ein Beispiel für einen Opcode an, [`I32Eqz`](https://cs.chromium.org/chromium/src/v8/src/compiler/wasm-compiler.cc?l=716&rcl=686b68edf9f42c201c2b25bca9f4bef72ff41c0b):

```cpp
  switch (opcode) {
    case wasm::kExprI32Eqz:
      op = m->Word32Equal();
      return graph()->NewNode(op, input, mcgraph()->Int32Constant(0));
```

Dies schaltet den Wasm-Opcode `wasm::kExprI32Eqz` ein und erstellt ein TurboFan-Diagramm, das aus der Operation `Word32Equal` mit den Eingaben `input` (das Argument der Wasm-Anweisung) und einer Konstanten `0` besteht.

Der Operator `Word32Equal` wird von der zugrunde liegenden V8-Abstraktionsmaschine bereitgestellt, die von der Architektur unabhängig ist. Später in der Pipeline wird dieser abstrakte Maschinenoperator in architekturabhängige Assembly übersetzt.

Für unseren neuen Opcode, `I32Add1`, benötigen wir ein Diagramm, das eine Konstante 1 zu der Eingabe hinzufügt. Daher können wir einen bestehenden Maschinenoperator, `Int32Add`, wiederverwenden, indem wir ihm die Eingabe und eine Konstante 1 übergeben:

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

Das reicht aus, um den Test zu bestehen. Allerdings haben nicht alle Anweisungen einen bestehenden TurboFan-Maschinenoperator. In diesem Fall müssen wir diesen neuen Operator zur Maschine hinzufügen. Versuchen wir das.

## TurboFan-Maschinenoperatoren

Wir möchten `Int32Add1` der TurboFan-Maschine bekannt machen. Also tun wir so, als ob es ihn schon gibt, und verwenden ihn zuerst:

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

Der Versuch, denselben Test auszuführen, führt zu einem Kompilierungsfehler, der darauf hinweist, wo Änderungen vorgenommen werden müssen:

```
../../src/compiler/wasm-compiler.cc:717:34: Fehler: kein Mitglied namens &apos;Int32Add1&apos; in &apos;v8::internal::compiler::MachineOperatorBuilder&apos;; meinten Sie &apos;Int32Add&apos;?
      return graph()->NewNode(m->Int32Add1(), input);
                                 ^~~~~~~~~
                                 Int32Add
```

Es gibt ein paar Stellen, die geändert werden müssen, um einen Operator hinzuzufügen:

1. [`src/compiler/machine-operator.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/machine-operator.cc)
1. Header [`src/compiler/machine-operator.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/machine-operator.h)
1. Liste der von der Maschine verstandenen Opcodes [`src/compiler/opcodes.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/opcodes.h)
1. Verifizierer [`src/compiler/verifier.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/verifier.cc)

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

Wiederholter Testlauf gibt jetzt einen anderen Fehler:

```
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# Fataler Fehler in ../../src/compiler/backend/instruction-selector.cc, Zeile 2072
# Unerwarteter Operator #289:Int32Add1 @ node #7
```

## Instruktionsauswahl

Bisher haben wir auf der TurboFan-Ebene gearbeitet und uns mit (einem Meer von) Knoten im TurboFan-Diagramm beschäftigt. Auf der Assembly-Ebene haben wir jedoch Anweisungen und Operanden. Die Instruktionsauswahl ist der Prozess, dieses Diagramm in Anweisungen und Operanden zu übersetzen.

Der letzte Testfehler deutete darauf hin, dass wir etwas in [`src/compiler/backend/instruction-selector.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/instruction-selector.cc) benötigen. Dies ist eine große Datei mit einer riesigen switch-Anweisung über alle Maschinen-OpCodes. Es ruft architekturspezifische Instruktionsauswahl auf und verwendet das Besucher-Muster, um Anweisungen für jeden Knotentyp zu erstellen.

Da wir einen neuen TurboFan-Maschinenopcode hinzugefügt haben, müssen wir ihn hier ebenfalls hinzufügen:

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
       FATAL("Unerwarteter Operator #%d:%s @ Knoten #%d", node->opcode(),
             node->op()->mnemonic(), node->id());
```

Die Instruktionsauswahl ist architekturabhängig, daher müssen wir sie auch zu den architekturspezifischen Instruktionsauswahl-Dateien hinzufügen. Für dieses Codelab konzentrieren wir uns nur auf die x64-Architektur, daher muss [`src/compiler/backend/x64/instruction-selector-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-selector-x64.cc) angepasst werden:

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

Und wir müssen auch diesen neuen x64-spezifischen Opcode, `kX64Int32Add1` zu [`src/compiler/backend/x64/instruction-codes-x64.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-codes-x64.h) hinzufügen:

```diff
diff --git a/src/compiler/backend/x64/instruction-codes-x64.h b/src/compiler/backend/x64/instruction-codes-x64.h
index 9b8be0e0b5..7f5faeb87b 100644
--- a/src/compiler/backend/x64/instruction-codes-x64.h
+++ b/src/compiler/backend/x64/instruction-codes-x64.h
@@ -12,6 +12,7 @@ namespace compiler {
 // X64-spezifische Opcodes, die angeben, welche Assembly-Sequenz ausgegeben werden soll.
 // Die meisten Opcodes geben eine einzelne Anweisung an.
 #define TARGET_ARCH_OPCODE_LIST(V)        \
+  V(X64Int32Add1)                         \
   V(X64Add)                               \
   V(X64Add32)                             \
   V(X64And)                               \
```

## Anweisungsplanung und Codegenerierung

Wenn wir unseren Test ausführen, sehen wir neue Kompilierungsfehler:

```
../../src/compiler/backend/x64/instruction-scheduler-x64.cc:15:11: Fehler: Enumerationswert &apos;kX64Int32Add1&apos; nicht im Switch behandelt [-Werror,-Wswitch]
  switch (instr->arch_opcode()) {
          ^
1 Fehler generiert.
...
../../src/compiler/backend/x64/code-generator-x64.cc:733:11: Fehler: Enumerationswert &apos;kX64Int32Add1&apos; nicht im Switch behandelt [-Werror,-Wswitch]
  switch (arch_opcode) {
          ^
1 Fehler generiert.
```

[Anweisungsplanung](https://de.wikipedia.org/wiki/Maschinensteuerung) kümmert sich um Abhängigkeiten, die Anweisungen haben können, um mehr Optimierung zu ermöglichen (z. B. Umordnung von Anweisungen). Unser neuer Opcode hat keine Datenabhängigkeit, deshalb können wir ihn einfach hinzufügen zu: [`src/compiler/backend/x64/instruction-scheduler-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-scheduler-x64.cc):

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

Die Codegenerierung ist der Schritt, bei dem wir unsere architekturspezifischen Opcodes in Assembly übersetzen. Fügen wir eine Klausel hinzu zu [`src/compiler/backend/x64/code-generator-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/code-generator-x64.cc):

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

Vorerst lassen wir unsere Codegenerierung leer und können den Test ausführen, um sicherzustellen, dass alles kompiliert:

```
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# Schwerer Fehler in ../../test/cctest/wasm/test-run-wasm.cc, Zeile 37
# Bedingung fehlgeschlagen: 11 == r.Call() (11 vs. 10).
```

Dieser Fehler ist zu erwarten, da unsere neue Anweisung noch nicht implementiert ist — sie ist im Wesentlichen eine No-Op, daher blieb unser tatsächlicher Wert unverändert (`10`).

Um unseren Opcode zu implementieren, können wir den `add`-Assembly-Befehl verwenden:

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

Und das bringt den Test zum Bestehen:

Glücklicherweise ist `addl` bereits implementiert. Wenn unser neuer Opcode das Schreiben einer neuen Implementierung des Assembly-Befehls erfordern würde, würden wir ihn hinzufügen zu [`src/compiler/backend/x64/assembler-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/codegen/x64/assembler-x64.cc), wo der Assembly-Befehl in Bytes codiert und ausgegeben wird.

:::note
**Tipp:** Um den generierten Code zu inspizieren, können wir `--print-code` an `cctest` übergeben.
:::

## Andere Architekturen

In diesem Codelab haben wir diese neue Anweisung nur für x64 implementiert. Die erforderlichen Schritte für andere Architekturen sind ähnlich: TurboFan-Maschinenoperatoren hinzufügen, die plattformabhängigen Dateien für Instruktionsauswahl, Planung, Codegenerierung und Assembler verwenden.

Tipp: Wenn wir das, was wir bisher getan haben, auf ein anderes Ziel, z. B. arm64, kompilieren, erhalten wir wahrscheinlich Fehler beim Verlinken. Um diese Fehler zu beheben, fügen Sie `UNIMPLEMENTED()`-Stubs hinzu.
