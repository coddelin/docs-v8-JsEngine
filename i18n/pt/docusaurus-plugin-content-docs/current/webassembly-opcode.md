---
title: 'WebAssembly - adicionando um novo opcode'
description: 'Este tutorial explica como implementar uma nova instrução WebAssembly no V8.'
---
[WebAssembly](https://webassembly.org/) (Wasm) é um formato binário de instrução para uma máquina virtual baseada em pilha. Este tutorial guia o leitor na implementação de uma nova instrução WebAssembly no V8.

O WebAssembly é implementado no V8 em três partes:

- o interpretador
- o compilador básico (Liftoff)
- o compilador de otimização (TurboFan)

O restante deste documento foca no pipeline TurboFan, explicando como adicionar uma nova instrução Wasm e implementá-la no TurboFan.

Em um nível alto, as instruções Wasm são compiladas em um grafo TurboFan, e confiamos no pipeline TurboFan para compilar o grafo em (eventualmente) código de máquina. Para mais informações sobre o TurboFan, confira a [documentação do V8](/docs/turbofan).

## Códigos de operação/Instruções

Vamos definir uma nova instrução que adiciona `1` a um [`int32`](https://webassembly.github.io/spec/core/syntax/types.html#syntax-valtype) (no topo da pilha).

:::note
**Nota:** Uma lista de instruções suportadas por todas as implementações de Wasm pode ser encontrada na [especificação](https://webassembly.github.io/spec/core/appendix/index-instructions.html).
:::

Todas as instruções Wasm são definidas em [`src/wasm/wasm-opcodes.h`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-opcodes.h). As instruções são agrupadas aproximadamente por funcionalidade, por exemplo: controle, memória, SIMD, atômicas, etc.

Vamos adicionar nossa nova instrução, `I32Add1`, na seção `FOREACH_SIMPLE_OPCODE`:

```diff
diff --git a/src/wasm/wasm-opcodes.h b/src/wasm/wasm-opcodes.h
index 6970c667e7..867cbf451a 100644
--- a/src/wasm/wasm-opcodes.h
+++ b/src/wasm/wasm-opcodes.h
@@ -96,6 +96,7 @@ bool IsJSCompatibleSignature(const FunctionSig* sig, bool hasBigIntFeature);

 // Expressões com assinaturas.
 #define FOREACH_SIMPLE_OPCODE(V)  \
+  V(I32Add1, 0xee, i_i)           \
   V(I32Eqz, 0x45, i_i)            \
   V(I32Eq, 0x46, i_ii)            \
   V(I32Ne, 0x47, i_ii)            \
```

O WebAssembly é um formato binário, então `0xee` especifica a codificação desta instrução. Neste tutorial escolhemos `0xee` porque está atualmente não utilizado.

:::note
**Nota:** De fato, adicionar uma instrução à especificação envolve trabalho além do descrito aqui.
:::

Podemos executar um teste unitário simples para os códigos de operação com:

```
$ tools/dev/gm.py x64.debug unittests/WasmOpcodesTest*
...
[==========] Executando 1 teste de 1 suíte de teste.
[----------] Configuração do ambiente global de teste concluída.
[----------] 1 teste de WasmOpcodesTest
[ RUN      ] WasmOpcodesTest.EveryOpcodeHasAName
../../test/unittests/wasm/wasm-opcodes-unittest.cc:27: Falha
Valor de: false
  Atual: false
Esperado: true
WasmOpcodes::OpcodeName(kExprI32Add1) == "unknown"; plazz halp in src/wasm/wasm-opcodes.cc
[  FAILED  ] WasmOpcodesTest.EveryOpcodeHasAName
```

Este erro indica que não temos um nome para nossa nova instrução. Adicionar um nome ao novo código de operação pode ser feito em [`src/wasm/wasm-opcodes.cc`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-opcodes.cc):

```diff
diff --git a/src/wasm/wasm-opcodes.cc b/src/wasm/wasm-opcodes.cc
index 5ed664441d..2d4e9554fe 100644
--- a/src/wasm/wasm-opcodes.cc
+++ b/src/wasm/wasm-opcodes.cc
@@ -75,6 +75,7 @@ const char* WasmOpcodes::OpcodeName(WasmOpcode opcode) {
     // clang-format off

     // Códigos de operação padrão
+    CASE_I32_OP(Add1, "add1")
     CASE_INT_OP(Eqz, "eqz")
     CASE_ALL_OP(Eq, "eq")
     CASE_I64x2_OP(Eq, "eq")
```

Ao adicionar nossa nova instrução em `FOREACH_SIMPLE_OPCODE`, estamos pulando um [bocado de trabalho](https://cs.chromium.org/chromium/src/v8/src/wasm/function-body-decoder-impl.h?l=1751-1756&rcl=686b68edf9f42c201c2b25bca9f4bef72ff41c0b) que é feito em `src/wasm/function-body-decoder-impl.h`, o qual decodifica os códigos de operação Wasm e chama o gerador de grafos TurboFan. Assim, dependendo do que seu opcode faz, poderá haver mais trabalho a ser feito. Vamos pular esses detalhes no interesse de brevidade.

## Escrevendo um teste para o novo código de operação

Os testes Wasm podem ser encontrados em [`test/cctest/wasm/`](https://cs.chromium.org/chromium/src/v8/test/cctest/wasm/). Vamos dar uma olhada em [`test/cctest/wasm/test-run-wasm.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/wasm/test-run-wasm.cc), onde muitos códigos de operação "simples" são testados.

Há muitos exemplos neste arquivo que podemos seguir. A configuração geral é:

- criar um `WasmRunner`
- configurar variáveis globais para armazenar o resultado (opcional)
- configurar variáveis locais como parâmetros para a instrução (opcional)
- construir o módulo wasm
- executá-lo e comparar com uma saída esperada

Aqui está um teste simples para o nosso novo código de operação:

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

Execute o teste:

```
$ tools/dev/gm.py x64.debug 'cctest/test-run-wasm-simd/RunWasmTurbofan_I32Add1'
...
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# Erro fatal em ../../src/compiler/wasm-compiler.cc, linha 988
# Opcode não suportado 0xee:i32.add1
```

:::note
**Dica:** Encontrar o nome do teste pode ser complicado, já que a definição do teste está atrás de um macro. Use [Pesquisa de Código](https://cs.chromium.org/) para explorar e descobrir as definições de macro.
:::

Este erro indica que o compilador não conhece nossa nova instrução. Isso mudará na próxima seção.

## Compilando Wasm em TurboFan

Na introdução, mencionamos que as instruções Wasm são compiladas em um gráfico TurboFan. `wasm-compiler.cc` é onde isso acontece. Vamos dar uma olhada em um exemplo de opcode, [`I32Eqz`](https://cs.chromium.org/chromium/src/v8/src/compiler/wasm-compiler.cc?l=716&rcl=686b68edf9f42c201c2b25bca9f4bef72ff41c0b):

```cpp
  switch (opcode) {
    case wasm::kExprI32Eqz:
      op = m->Word32Equal();
      return graph()->NewNode(op, input, mcgraph()->Int32Constant(0));
```

Isso alterna o opcode Wasm `wasm::kExprI32Eqz`, e constrói um gráfico TurboFan consistindo da operação `Word32Equal` com as entradas `input`, que é o argumento para a instrução Wasm, e uma constante `0`.

O operador `Word32Equal` é fornecido pela máquina abstrata V8 subjacente, que é independente de arquitetura. Posteriormente na pipeline, esse operador de máquina abstrata será traduzido em montagem dependente da arquitetura.

Para nosso novo opcode, `I32Add1`, precisamos de um gráfico que adicione uma constante 1 à entrada, então podemos reutilizar um operador de máquina existente, `Int32Add`, passando a entrada, e uma constante 1:

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

Isso é suficiente para fazer o teste passar. No entanto, nem todas as instruções têm um operador de máquina TurboFan existente. Neste caso, precisamos adicionar este novo operador à máquina. Vamos tentar isso.

## Operadores de máquina TurboFan

Queremos adicionar o conhecimento de `Int32Add1` à máquina TurboFan. Então, vamos fingir que ele existe e usá-lo primeiro:

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

Tentar executar o mesmo teste leva a uma falha de compilação que hints onde fazer alterações:

```
../../src/compiler/wasm-compiler.cc:717:34: erro: nenhum membro chamado 'Int32Add1' em 'v8::internal::compiler::MachineOperatorBuilder'; você quis dizer 'Int32Add'?
      return graph()->NewNode(m->Int32Add1(), input);
                                 ^~~~~~~~~
                                 Int32Add
```

Há alguns lugares que precisam ser modificados para adicionar um operador:

1. [`src/compiler/machine-operator.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/machine-operator.cc)
1. header [`src/compiler/machine-operator.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/machine-operator.h)
1. lista de opcodes que a máquina entende [`src/compiler/opcodes.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/opcodes.h)
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

Executar o teste novamente agora gera uma falha diferente:

```
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# Erro fatal em ../../src/compiler/backend/instruction-selector.cc, linha 2072
# Operador inesperado #289:Int32Add1 @ nó #7
```

## Seleção de instruções

Até agora, estivemos trabalhando no nível do TurboFan, lidando com (um mar de) nós no gráfico do TurboFan. No entanto, no nível de montagem, temos instruções e operandos. Seleção de instruções é o processo de traduzir este gráfico para instruções e operandos.

O último erro do teste indicou que precisamos de algo em [`src/compiler/backend/instruction-selector.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/instruction-selector.cc). Este é um grande arquivo com uma declaração switch gigante sobre todos os opcodes de máquina. Ele chama a seleção de instruções específica da arquitetura, usando o padrão de visitante para emitir instruções para cada tipo de nó.

Como adicionamos um novo opcode de máquina TurboFan, precisamos adicioná-lo aqui também:

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
       FATAL("Operador inesperado #%d:%s @ nó #%d", node->opcode(),
             node->op()->mnemonic(), node->id());
```

A seleção de instruções depende da arquitetura, então precisamos adicioná-la também aos arquivos de seleção de instruções específicos da arquitetura. Para este codelab, focamos apenas na arquitetura x64, então [`src/compiler/backend/x64/instruction-selector-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-selector-x64.cc)
precisa ser modificado:

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

E também precisamos adicionar este novo opcode específico para x64, `kX64Int32Add1`, a [`src/compiler/backend/x64/instruction-codes-x64.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-codes-x64.h):

```diff
diff --git a/src/compiler/backend/x64/instruction-codes-x64.h b/src/compiler/backend/x64/instruction-codes-x64.h
index 9b8be0e0b5..7f5faeb87b 100644
--- a/src/compiler/backend/x64/instruction-codes-x64.h
+++ b/src/compiler/backend/x64/instruction-codes-x64.h
@@ -12,6 +12,7 @@ namespace compiler {
 // OpCodes específicos do X64 que especificam qual sequência de montagem emitir.
 // A maioria dos opcodes especifica uma única instrução.
 #define TARGET_ARCH_OPCODE_LIST(V)        \
+  V(X64Int32Add1)                         \
   V(X64Add)                               \
   V(X64Add32)                             \
   V(X64And)                               \
```

## Agendamento de instruções e geração de código

Executando nosso teste, vemos novos erros de compilação:

```
../../src/compiler/backend/x64/instruction-scheduler-x64.cc:15:11: erro: valor de enumeração 'kX64Int32Add1' não tratado no switch [-Werror,-Wswitch]
  switch (instr->arch_opcode()) {
          ^
1 erro gerado.
...
../../src/compiler/backend/x64/code-generator-x64.cc:733:11: erro: valor de enumeração 'kX64Int32Add1' não tratado no switch [-Werror,-Wswitch]
  switch (arch_opcode) {
          ^
1 erro gerado.
```

[Agendamento de instruções](https://en.wikipedia.org/wiki/Instruction_scheduling) cuida das dependências que as instruções podem ter para permitir mais otimização (por exemplo, reordenamento de instruções). Nosso novo opcode não possui dependência de dados, então podemos adicioná-lo simples a: [`src/compiler/backend/x64/instruction-scheduler-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-scheduler-x64.cc):

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

A geração de código é onde traduzimos nossos opcodes específicos da arquitetura em montagem. Vamos adicionar uma cláusula a [`src/compiler/backend/x64/code-generator-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/code-generator-x64.cc):

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

Por enquanto deixamos nossa geração de código vazia, e podemos executar o teste para garantir que tudo compile:

```
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# Erro fatal em ../../test/cctest/wasm/test-run-wasm.cc, linha 37
# Verificação falhou: 11 == r.Call() (11 vs. 10).
```

Essa falha é esperada, já que nossa nova instrução ainda não foi implementada — é essencialmente uma operação nula, então nosso valor real não foi alterado (`10`).

Para implementar nosso opcode, podemos usar a instrução de montagem `add`:

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

E isso faz o teste passar:

Felizmente para nós, `addl` já está implementado. Se nosso novo opcode exigisse a escrita de uma nova implementação de instrução de montagem, nós a adicionaríamos em [`src/compiler/backend/x64/assembler-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/codegen/x64/assembler-x64.cc), onde a instrução de montagem é codificada em bytes e emitida.

:::note
**Dica:** Para inspecionar o código gerado, podemos passar `--print-code` para o `cctest`.
:::

## Outras arquiteturas

Neste codelab, implementamos esta nova instrução apenas para x64. As etapas necessárias para outras arquiteturas são semelhantes: adicionar operadores de máquina TurboFan, usar os arquivos dependentes da plataforma para seleção de instruções, agendamento, geração de código, montador.

Dica: se compilarmos o que fizemos até agora em outro alvo, por exemplo, arm64, é provável que tenhamos erros de ligação. Para resolver esses erros, adicione stubs `UNIMPLEMENTED()`.
