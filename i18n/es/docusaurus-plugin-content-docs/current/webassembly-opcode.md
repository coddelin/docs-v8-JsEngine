---
title: "WebAssembly - agregar un nuevo opcode"
description: "Este tutorial explica cómo implementar una nueva instrucción de WebAssembly en V8."
---
[WebAssembly](https://webassembly.org/) (Wasm) es un formato de instrucción binaria para una máquina virtual basada en pila. Este tutorial guía al lector a través de la implementación de una nueva instrucción de WebAssembly en V8.

WebAssembly se implementa en V8 en tres partes:

- el intérprete
- el compilador base (Liftoff)
- el compilador de optimización (TurboFan)

El resto de este documento se centra en la tubería de TurboFan, explicando cómo agregar una nueva instrucción de Wasm e implementarla en TurboFan.

A un nivel alto, las instrucciones de Wasm se compilan en un grafo de TurboFan, y confiamos en la tubería de TurboFan para compilar el grafo en código de máquina (finalmente). Para más información sobre TurboFan, consulta los [documentos de V8](/docs/turbofan).

## OpCodes/Instrucciones

Definamos una nueva instrucción que agregue `1` a un [`int32`](https://webassembly.github.io/spec/core/syntax/types.html#syntax-valtype) (en la parte superior de la pila).

:::note
**Nota:** Una lista de instrucciones compatibles con todas las implementaciones de Wasm se puede encontrar en la [especificación](https://webassembly.github.io/spec/core/appendix/index-instructions.html).
:::

Todas las instrucciones de Wasm están definidas en [`src/wasm/wasm-opcodes.h`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-opcodes.h). Las instrucciones están agrupadas más o menos por lo que hacen, e.g., control, memoria, SIMD, atómico, etc.

Agreguemos nuestra nueva instrucción, `I32Add1`, a la sección `FOREACH_SIMPLE_OPCODE`:

```diff
diff --git a/src/wasm/wasm-opcodes.h b/src/wasm/wasm-opcodes.h
index 6970c667e7..867cbf451a 100644
--- a/src/wasm/wasm-opcodes.h
+++ b/src/wasm/wasm-opcodes.h
@@ -96,6 +96,7 @@ bool IsJSCompatibleSignature(const FunctionSig* sig, bool hasBigIntFeature);

 // Expresiones con firmas.
 #define FOREACH_SIMPLE_OPCODE(V)  \
+  V(I32Add1, 0xee, i_i)           \
   V(I32Eqz, 0x45, i_i)            \
   V(I32Eq, 0x46, i_ii)            \
   V(I32Ne, 0x47, i_ii)            \
```

WebAssembly es un formato binario, por lo que `0xee` especifica la codificación de esta instrucción. En este tutorial elegimos `0xee` ya que actualmente no está en uso.

:::note
**Nota:** Agregar realmente una instrucción a la especificación implica trabajo más allá de lo descrito aquí.
:::

Podemos ejecutar una simple prueba unitaria para los opcodes con:

```
$ tools/dev/gm.py x64.debug unittests/WasmOpcodesTest*
...
[==========] Ejecución de 1 prueba de 1 conjunto de pruebas.
[----------] Configuración global del entorno de prueba.
[----------] 1 prueba de WasmOpcodesTest
[ RUN      ] WasmOpcodesTest.EveryOpcodeHasAName
../../test/unittests/wasm/wasm-opcodes-unittest.cc:27: Error
Valor de: false
  Actual: false
Esperado: true
WasmOpcodes::OpcodeName(kExprI32Add1) == "unknown"; plazz halp in src/wasm/wasm-opcodes.cc
[  FAILED  ] WasmOpcodesTest.EveryOpcodeHasAName
```

Este error indica que no tenemos un nombre para nuestra nueva instrucción. Agregar un nombre para el nuevo opcode se puede hacer en [`src/wasm/wasm-opcodes.cc`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-opcodes.cc):

```diff
diff --git a/src/wasm/wasm-opcodes.cc b/src/wasm/wasm-opcodes.cc
index 5ed664441d..2d4e9554fe 100644
--- a/src/wasm/wasm-opcodes.cc
+++ b/src/wasm/wasm-opcodes.cc
@@ -75,6 +75,7 @@ const char* WasmOpcodes::OpcodeName(WasmOpcode opcode) {
     // clang-format off

     // Opcodes estándar
+    CASE_I32_OP(Add1, "add1")
     CASE_INT_OP(Eqz, "eqz")
     CASE_ALL_OP(Eq, "eq")
     CASE_I64x2_OP(Eq, "eq")
```

Al agregar nuestra nueva instrucción en `FOREACH_SIMPLE_OPCODE`, estamos omitiendo una [buena cantidad de trabajo](https://cs.chromium.org/chromium/src/v8/src/wasm/function-body-decoder-impl.h?l=1751-1756&rcl=686b68edf9f42c201c2b25bca9f4bef72ff41c0b) que se realiza en `src/wasm/function-body-decoder-impl.h`, el cual decodifica los opcodes de Wasm y llama al generador de grafos de TurboFan. Por lo tanto, dependiendo de lo que haga tu opcode, podrías tener más trabajo por hacer. Nos saltamos esto en interés de la brevedad.

## Escribiendo una prueba para el nuevo opcode

Las pruebas de Wasm se pueden encontrar en [`test/cctest/wasm/`](https://cs.chromium.org/chromium/src/v8/test/cctest/wasm/). Echemos un vistazo a [`test/cctest/wasm/test-run-wasm.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/wasm/test-run-wasm.cc), donde se prueban muchos opcodes “simples”.

Hay muchos ejemplos en este archivo que podemos seguir. La configuración general es:

- crear un `WasmRunner`
- configurar variables globales para almacenar el resultado (opcional)
- configurar locales como parámetros para la instrucción (opcional)
- construir el módulo wasm
- ejecutarlo y compararlo con un resultado esperado

Aquí hay una simple prueba para nuestro nuevo opcode:

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

Ejecute la prueba:

```
$ tools/dev/gm.py x64.debug 'cctest/test-run-wasm-simd/RunWasmTurbofan_I32Add1'
...
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# Error fatal en ../../src/compiler/wasm-compiler.cc, línea 988
# Código de operación no soportado 0xee:i32.add1
```

:::note
**Consejo:** Encontrar el nombre de la prueba puede ser complicado, ya que la definición de la prueba está detrás de una macro. Utilice [Code Search](https://cs.chromium.org/) para hacer clic y descubrir las definiciones de macros.
:::

Este error indica que el compilador no conoce nuestra nueva instrucción. Eso cambiará en la próxima sección.

## Compilando Wasm en TurboFan

En la introducción, mencionamos que las instrucciones Wasm se compilan en un gráfico TurboFan. `wasm-compiler.cc` es donde esto ocurre. Echemos un vistazo a un ejemplo de código de operación, [`I32Eqz`](https://cs.chromium.org/chromium/src/v8/src/compiler/wasm-compiler.cc?l=716&rcl=686b68edf9f42c201c2b25bca9f4bef72ff41c0b):

```cpp
  switch (opcode) {
    case wasm::kExprI32Eqz:
      op = m->Word32Equal();
      return graph()->NewNode(op, input, mcgraph()->Int32Constant(0));
```

Esto cambia según el código de operación Wasm `wasm::kExprI32Eqz`, y construye un gráfico de TurboFan que consiste en la operación `Word32Equal` con las entradas `input`, que es el argumento de la instrucción Wasm, y una constante `0`.

El operador `Word32Equal` lo proporciona la máquina abstracta subyacente de V8, que es independiente de la arquitectura. Más adelante en la canalización, este operador de máquina abstracta se traducirá en lenguaje ensamblador dependiente de la arquitectura.

Para nuestro nuevo código de operación, `I32Add1`, necesitamos un gráfico que sume una constante de 1 al input, por lo que podemos reutilizar un operador de máquina existente, `Int32Add`, pasándole el input y una constante de 1:

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

Esto es suficiente para que la prueba pase. Sin embargo, no todas las instrucciones tienen un operador de máquina TurboFan existente. En ese caso, tenemos que agregar este nuevo operador a la máquina. Intentemos eso.

## Operadores de máquina TurboFan

Queremos agregar el conocimiento de `Int32Add1` a la máquina TurboFan. Así que pretendamos que existe y usemos esto primero:

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

Intentar ejecutar la misma prueba lleva a un fallo de compilación que indica dónde realizar cambios:

```
../../src/compiler/wasm-compiler.cc:717:34: error: no member named 'Int32Add1' en 'v8::internal::compiler::MachineOperatorBuilder'; ¿querías decir 'Int32Add'?
      return graph()->NewNode(m->Int32Add1(), input);
                                 ^~~~~~~~~
                                 Int32Add
```

Hay un par de lugares que necesitan ser modificados para agregar un operador:

1. [`src/compiler/machine-operator.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/machine-operator.cc)
1. encabezado [`src/compiler/machine-operator.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/machine-operator.h)
1. lista de códigos de operación que entiende la máquina [`src/compiler/opcodes.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/opcodes.h)
1. verificador [`src/compiler/verifier.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/verifier.cc)

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

Durante la ejecución de la prueba ahora obtenemos un error diferente:

```
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# Error fatal en ../../src/compiler/backend/instruction-selector.cc, línea 2072
# Operador inesperado #289:Int32Add1 @ nodo #7
```

## Selección de instrucciones

Hasta ahora hemos trabajado a nivel de TurboFan, tratando con (un mar de) nodos en el gráfico de TurboFan. Sin embargo, a nivel de ensamblador, tenemos instrucciones y operandos. La selección de instrucciones es el proceso de traducir este gráfico a instrucciones y operandos.

El último error de la prueba indicó que necesitamos algo en [`src/compiler/backend/instruction-selector.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/instruction-selector.cc). Este es un archivo grande con una declaración gigante de switch sobre todos los códigos de operación de máquina. Utiliza el patrón de visitante para emitir instrucciones para cada tipo de nodo.

Dado que agregamos un nuevo código de operación de máquina TurboFan, necesitamos agregarlo aquí también:

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
       FATAL("Operador inesperado #%d:%s @ nodo #%d", node->opcode(),
             node->op()->mnemonic(), node->id());
```

La selección de instrucciones es dependiente de la arquitectura, por lo que también debemos agregarlo a los archivos específicos de selección de instrucciones de la arquitectura. Para este codelab, nos enfocamos únicamente en la arquitectura x64, por lo que [`src/compiler/backend/x64/instruction-selector-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-selector-x64.cc)
necesita ser modificado:

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

Y también necesitamos agregar este nuevo código de operación específico de x64, `kX64Int32Add1`, a [`src/compiler/backend/x64/instruction-codes-x64.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-codes-x64.h):

```diff
diff --git a/src/compiler/backend/x64/instruction-codes-x64.h b/src/compiler/backend/x64/instruction-codes-x64.h
índice 9b8be0e0b5..7f5faeb87b 100644
--- a/src/compiler/backend/x64/instruction-codes-x64.h
+++ b/src/compiler/backend/x64/instruction-codes-x64.h
@@ -12,6 +12,7 @@ namespace compiler {
 // Códigos de operación específicos de X64 que especifican qué secuencia de ensamblado emitir.
 // La mayoría de los códigos de operación especifican una única instrucción.
 #define TARGET_ARCH_OPCODE_LIST(V)        \
+  V(X64Int32Add1)                         \
   V(X64Add)                               \
   V(X64Add32)                             \
   V(X64And)                               \
```

## Programación de instrucciones y generación de código

Ejecutando nuestra prueba, vemos nuevos errores de compilación:

```
../../src/compiler/backend/x64/instruction-scheduler-x64.cc:15:11: error: el valor de la enumeración 'kX64Int32Add1' no se maneja en el switch [-Werror,-Wswitch]
  switch (instr->arch_opcode()) {
          ^
1 error generado.
...
../../src/compiler/backend/x64/code-generator-x64.cc:733:11: error: el valor de la enumeración 'kX64Int32Add1' no se maneja en el switch [-Werror,-Wswitch]
  switch (arch_opcode) {
          ^
1 error generado.
```

[Programación de instrucciones](https://en.wikipedia.org/wiki/Instruction_scheduling) se ocupa de las dependencias que las instrucciones pueden tener para permitir una mayor optimización (por ejemplo, reordenación de instrucciones). Nuestra nueva instrucción de operación no tiene dependencia de datos, por lo que podemos añadirla simplemente en: [`src/compiler/backend/x64/instruction-scheduler-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-scheduler-x64.cc):

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

La generación de código es donde traducimos nuestros códigos de operación específicos de la arquitectura en ensamblado. Agreguemos una cláusula a [`src/compiler/backend/x64/code-generator-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/code-generator-x64.cc):

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

Por ahora dejamos vacía nuestra generación de código, y podemos ejecutar la prueba para asegurarnos de que todo compila:

```
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# Error fatal en ../../test/cctest/wasm/test-run-wasm.cc, línea 37
# Fallo en la comprobación: 11 == r.Call() (11 frente a 10).
```

Este fallo es esperado, ya que nuestra nueva instrucción no está implementada aún — es esencialmente un no-op, por lo que nuestro valor real no cambió (`10`).

Para implementar nuestra instrucción de operación, podemos usar la instrucción de ensamblado `add`:

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

Y con esto, la prueba pasa:

Por suerte para nosotros, `addl` ya está implementado. Si nuestra nueva instrucción de operación requería escribir una nueva implementación de instrucción de ensamblado, la añadiríamos a [`src/compiler/backend/x64/assembler-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/codegen/x64/assembler-x64.cc), donde la instrucción de ensamblado se codifica en bytes y se emite.

:::note
**Consejo:** Para inspeccionar el código generado, podemos pasar `--print-code` a `cctest`.
:::

## Otras arquitecturas

En este laboratorio de código, solo hemos implementado esta nueva instrucción para x64. Los pasos requeridos para otras arquitecturas son similares: añadir operadores de máquina TurboFan, usar los archivos dependientes de la plataforma para la selección de instrucciones, programación, generación de código, ensamblador.

Consejo: si compilamos lo que hemos hecho hasta ahora en otro objetivo, por ejemplo, arm64, es probable que obtengamos errores de enlace. Para resolver esos errores, agrega stubs `UNIMPLEMENTED()`.
