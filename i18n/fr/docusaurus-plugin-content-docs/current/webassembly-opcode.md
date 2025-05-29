---
title: &apos;WebAssembly - ajout d&apos;un nouvel opcode&apos;
description: &apos;Ce tutoriel explique comment implémenter une nouvelle instruction WebAssembly dans V8.&apos;
---
[WebAssembly](https://webassembly.org/) (Wasm) est un format d&apos;instruction binaire pour une machine virtuelle basée sur une pile. Ce tutoriel guide le lecteur à travers l&apos;implémentation d&apos;une nouvelle instruction WebAssembly dans V8.

WebAssembly est implémenté dans V8 en trois parties:

- l&apos;interpréteur
- le compilateur de base (Liftoff)
- le compilateur d&apos;optimisation (TurboFan)

Le reste de ce document se concentre sur le pipeline TurboFan, expliquant comment ajouter une nouvelle instruction Wasm et l&apos;implémenter dans TurboFan.

À un haut niveau, les instructions Wasm sont compilées en un graphe TurboFan, et nous comptons sur le pipeline TurboFan pour compiler ce graphe en code machine. Pour en savoir plus sur TurboFan, consultez la [documentation de V8](/docs/turbofan).

## Opcodes/Instructions

Définissons une nouvelle instruction qui ajoute `1` à un [`int32`](https://webassembly.github.io/spec/core/syntax/types.html#syntax-valtype) (au sommet de la pile).

:::note
**Remarque :** Une liste des instructions prises en charge par toutes les implémentations Wasm est disponible dans la [spécification](https://webassembly.github.io/spec/core/appendix/index-instructions.html).
:::

Toutes les instructions Wasm sont définies dans [`src/wasm/wasm-opcodes.h`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-opcodes.h). Les instructions sont regroupées de manière approximative selon leur fonction, comme par exemple contrôle, mémoire, SIMD, atomique, etc.

Ajoutons notre nouvelle instruction, `I32Add1`, à la section `FOREACH_SIMPLE_OPCODE` :

```diff
diff --git a/src/wasm/wasm-opcodes.h b/src/wasm/wasm-opcodes.h
index 6970c667e7..867cbf451a 100644
--- a/src/wasm/wasm-opcodes.h
+++ b/src/wasm/wasm-opcodes.h
@@ -96,6 +96,7 @@ bool IsJSCompatibleSignature(const FunctionSig* sig, bool hasBigIntFeature);

 // Expressions avec des signatures.
 #define FOREACH_SIMPLE_OPCODE(V)  \
+  V(I32Add1, 0xee, i_i)           \
   V(I32Eqz, 0x45, i_i)            \
   V(I32Eq, 0x46, i_ii)            \
   V(I32Ne, 0x47, i_ii)            \
```

WebAssembly est un format binaire, donc `0xee` spécifie l&apos;encodage de cette instruction. Dans ce tutoriel, nous avons choisi `0xee` car elle est actuellement inutilisée.

:::note
**Remarque :** Ajouter réellement une instruction à la spécification nécessite des étapes supplémentaires non décrites ici.
:::

Nous pouvons exécuter un simple test unitaire pour les opcodes avec :

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

Cette erreur indique que nous n&apos;avons pas de nom pour notre nouvelle instruction. Ajouter un nom pour le nouvel opcode peut être fait dans [`src/wasm/wasm-opcodes.cc`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-opcodes.cc) :

```diff
diff --git a/src/wasm/wasm-opcodes.cc b/src/wasm/wasm-opcodes.cc
index 5ed664441d..2d4e9554fe 100644
--- a/src/wasm/wasm-opcodes.cc
+++ b/src/wasm/wasm-opcodes.cc
@@ -75,6 +75,7 @@ const char* WasmOpcodes::OpcodeName(WasmOpcode opcode) {
     // clang-format off

     // Opcodes standards
+    CASE_I32_OP(Add1, "add1")
     CASE_INT_OP(Eqz, "eqz")
     CASE_ALL_OP(Eq, "eq")
     CASE_I64x2_OP(Eq, "eq")
```

En ajoutant notre nouvelle instruction dans `FOREACH_SIMPLE_OPCODE`, nous ignorons un [travail conséquent](https://cs.chromium.org/chromium/src/v8/src/wasm/function-body-decoder-impl.h?l=1751-1756&rcl=686b68edf9f42c201c2b25bca9f4bef72ff41c0b) qui est effectué dans `src/wasm/function-body-decoder-impl.h`, lequel décode les opcodes Wasm et fait appel au générateur de graphes TurboFan. Ainsi, en fonction de ce que fait votre opcode, vous pourriez avoir plus de travail à faire. Nous passons cette partie pour des raisons de concision.

## Écriture d&apos;un test pour le nouvel opcode

Les tests Wasm se trouvent dans [`test/cctest/wasm/`](https://cs.chromium.org/chromium/src/v8/test/cctest/wasm/). Jetons un œil à [`test/cctest/wasm/test-run-wasm.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/wasm/test-run-wasm.cc), où de nombreux opcodes « simples » sont testés.

Ce fichier contient de nombreux exemples que nous pouvons suivre. La structure générale est la suivante :

- créer un `WasmRunner`
- configurer des globals pour contenir le résultat (optionnel)
- configurer des locals comme paramètres de l&apos;instruction (optionnel)
- construire le module wasm
- l&apos;exécuter et comparer avec une sortie attendue

Voici un test simple pour notre nouvel opcode :

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

Exécutez le test :

```
$ tools/dev/gm.py x64.debug &apos;cctest/test-run-wasm-simd/RunWasmTurbofan_I32Add1&apos;
...
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# Erreur fatale dans ../../src/compiler/wasm-compiler.cc, ligne 988
# Opcode non supporté 0xee:i32.add1
```

:::note
**Astuce:** Trouver le nom du test peut être compliqué, car la définition du test se trouve derrière une macro. Utilisez [Code Search](https://cs.chromium.org/) pour explorer les définitions des macros.
:::

Cette erreur indique que le compilateur ne connaît pas notre nouvelle instruction. Cela va changer dans la section suivante.

## Compilation de Wasm dans TurboFan

Dans l'introduction, nous avons mentionné que les instructions Wasm sont compilées dans un graphique TurboFan. `wasm-compiler.cc` est là où cela se produit. Jetons un coup d'œil à un exemple d'opcode, [`I32Eqz`](https://cs.chromium.org/chromium/src/v8/src/compiler/wasm-compiler.cc?l=716&rcl=686b68edf9f42c201c2b25bca9f4bef72ff41c0b) :

```cpp
  switch (opcode) {
    case wasm::kExprI32Eqz:
      op = m->Word32Equal();
      return graph()->NewNode(op, input, mcgraph()->Int32Constant(0));
```

Cela bascule sur l'opcode Wasm `wasm::kExprI32Eqz`, et construit un graphique TurboFan consistant en l'opération `Word32Equal` avec les entrées `input`, qui est l'argument pour l'instruction Wasm, et une constante `0`.

L'opérateur `Word32Equal` est fourni par la machine abstraite sous-jacente V8, qui est indépendante de l'architecture. Plus tard dans le pipeline, cet opérateur abstrait sera traduit en assemblage dépendant de l'architecture.

Pour notre nouvel opcode, `I32Add1`, nous avons besoin d'un graphique qui ajoute une constante 1 à l'entrée, donc nous pouvons réutiliser un opérateur de machine existant, `Int32Add`, lui passant l'entrée, et une constante 1 :

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

Cela suffit pour réussir le test. Cependant, toutes les instructions n'ont pas un opérateur de machine TurboFan existant. Dans ce cas, nous devons ajouter ce nouvel opérateur à la machine. Essayons cela.

## Opérateurs de machine TurboFan

Nous voulons ajouter la connaissance de `Int32Add1` à la machine TurboFan. Donc prétendons qu'il existe et utilisons-le d'abord :

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

Essayer d'exécuter le même test conduit à un échec de compilation qui donne un indice sur où faire des modifications :

```
../../src/compiler/wasm-compiler.cc:717:34: erreur : aucun membre nommé &apos;Int32Add1&apos; dans &apos;v8::internal::compiler::MachineOperatorBuilder&apos;; vouliez-vous dire &apos;Int32Add&apos;?
      return graph()->NewNode(m->Int32Add1(), input);
                                 ^~~~~~~~~
                                 Int32Add
```

Il y a quelques endroits qui doivent être modifiés pour ajouter un opérateur :

1. [`src/compiler/machine-operator.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/machine-operator.cc)
1. en-tête [`src/compiler/machine-operator.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/machine-operator.h)
1. liste des opcodes que la machine comprend [`src/compiler/opcodes.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/opcodes.h)
1. vérificateur [`src/compiler/verifier.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/verifier.cc)

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

Exécuter le test à nouveau maintenant donne une erreur différente :

```
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# Erreur fatale dans ../../src/compiler/backend/instruction-selector.cc, ligne 2072
# Opérateur inattendu #289:Int32Add1 @ node #7
```

## Sélection d'instructions

Jusqu'à présent, nous avons travaillé au niveau TurboFan, en manipulant (une mer de) noeuds dans le graphe TurboFan. Cependant, au niveau de l'assembleur, nous avons des instructions et des opérandes. La sélection d'instructions est le processus de traduction de ce graphe en instructions et opérandes.

Le dernier message d'erreur du test indiquait que nous avions besoin de quelque chose dans [`src/compiler/backend/instruction-selector.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/instruction-selector.cc).  Il s'agit d'un fichier volumineux avec une grande instruction switch couvrant tous les opcodes machine.  Il fait appel à une sélection d'instructions spécifique à l'architecture, en utilisant le pattern visiteur pour émettre des instructions pour chaque type de noeud.

Puisque nous avons ajouté un nouvel opcode machine TurboFan, nous devons également l'ajouter ici :

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
       FATAL("Opérateur inattendu #%d:%s @ node #%d", node->opcode(),
             node->op()->mnemonic(), node->id());
```

La sélection d'instructions dépend de l'architecture, donc nous devons également l'ajouter aux fichiers de sélection d'instructions spécifiques à l'architecture. Pour ce codelab, nous nous concentrons uniquement sur l'architecture x64, donc [`src/compiler/backend/x64/instruction-selector-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-selector-x64.cc)
doit être modifié :

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

Et nous devons également ajouter ce nouveau opcode spécifique à x64, `kX64Int32Add1` à [`src/compiler/backend/x64/instruction-codes-x64.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-codes-x64.h) :

```diff
diff --git a/src/compiler/backend/x64/instruction-codes-x64.h b/src/compiler/backend/x64/instruction-codes-x64.h
index 9b8be0e0b5..7f5faeb87b 100644
--- a/src/compiler/backend/x64/instruction-codes-x64.h
+++ b/src/compiler/backend/x64/instruction-codes-x64.h
@@ -12,6 +12,7 @@ namespace compiler {
 // Codes d'opérations spécifiques au X64 qui spécifient quelle séquence d'assemblage émettre.
 // La plupart des codes d'opérations spécifient une seule instruction.
 #define TARGET_ARCH_OPCODE_LIST(V)        \
+  V(X64Int32Add1)                         \
   V(X64Add)                               \
   V(X64Add32)                             \
   V(X64And)                               \
```

## Ordonnancement des instructions et génération de code

En exécutant notre test, nous voyons de nouvelles erreurs de compilation :

```
../../src/compiler/backend/x64/instruction-scheduler-x64.cc:15:11: error: valeur d'énumération &apos;kX64Int32Add1&apos; non gérée dans le switch [-Werror,-Wswitch]
  switch (instr->arch_opcode()) {
          ^
1 erreur générée.
...
../../src/compiler/backend/x64/code-generator-x64.cc:733:11: error: valeur d'énumération &apos;kX64Int32Add1&apos; non gérée dans le switch [-Werror,-Wswitch]
  switch (arch_opcode) {
          ^
1 erreur générée.
```

[L'ordonnancement des instructions](https://en.wikipedia.org/wiki/Instruction_scheduling) s'occupe des dépendances que les instructions peuvent avoir pour permettre plus d'optimisations (par exemple, le réordonnancement des instructions). Notre nouveau code d'opération n'a pas de dépendance de données, nous pouvons donc simplement l'ajouter à : [`src/compiler/backend/x64/instruction-scheduler-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-scheduler-x64.cc) :

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

La génération de code est le processus où nous traduisons nos codes d'opération spécifiques à l'architecture en assembleur. Ajoutons une clause à [`src/compiler/backend/x64/code-generator-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/code-generator-x64.cc) :

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

Pour l'instant, nous laissons notre génération de code vide, et nous pouvons exécuter le test pour vérifier que tout compile :

```
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# Erreur fatale dans ../../test/cctest/wasm/test-run-wasm.cc, ligne 37
# Vérification échouée : 11 == r.Call() (11 vs. 10).
```

Cette erreur est attendue, car notre nouvelle instruction n'est pas encore implémentée — c'est essentiellement un no-op, donc notre valeur réelle est restée inchangée (`10`).

Pour implémenter notre code d'opération, nous pouvons utiliser l'instruction d'assemblage `add` :

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

Et cela fait passer le test :

Heureusement pour nous, `addl` est déjà implémenté. Si notre nouveau code d'opération nécessitait l'écriture d'une nouvelle implémentation d'instruction d'assemblage, nous l'ajouterions à [`src/compiler/backend/x64/assembler-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/codegen/x64/assembler-x64.cc), où l'instruction d'assemblage est encodée en octets et émise.

:::note
**Astuce :** Pour inspecter le code généré, nous pouvons passer `--print-code` à `cctest`.
:::

## Autres architectures

Dans ce codelab, nous avons uniquement implémenté cette nouvelle instruction pour x64. Les étapes nécessaires pour d'autres architectures sont similaires : ajouter des opérateurs machine TurboFan, utiliser les fichiers dépendants de la plateforme pour la sélection des instructions, la planification, la génération de code, l'assembleur.

Conseil : si nous compilons ce que nous avons fait jusqu'à présent sur une autre cible, par exemple arm64, nous risquons d'obtenir des erreurs lors de l'édition de liens. Pour résoudre ces erreurs, ajoutez des stubs `UNIMPLEMENTED()`.
