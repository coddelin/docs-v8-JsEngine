---
title: &apos;WebAssembly - 新しいオペコードの追加&apos;
description: &apos;このチュートリアルは、V8で新しいWebAssembly命令を実装する方法を説明します。&apos;
---
[WebAssembly](https://webassembly.org/) (Wasm) はスタックベースの仮想マシンのためのバイナリ命令形式です。このチュートリアルでは、新しいWebAssembly命令をV8に実装する手順を紹介します。

WebAssemblyはV8に以下の3つの部分で実装されています：

- インタプリタ
- ベースラインコンパイラ（Liftoff）
- 最適化コンパイラ（TurboFan）

このドキュメントの残りの部分ではTurboFanパイプラインに焦点を当て、新しいWasm命令を追加してTurboFanに実装する方法を説明します。

大まかには、Wasm命令はTurboFanグラフにコンパイルされ、その後TurboFanパイプラインを使用して（最終的に）マシンコードにコンパイルされます。TurboFanの詳細については、[V8ドキュメント](/docs/turbofan)をご覧ください。

## オペコード/命令

スタックの上にある[`int32`](https://webassembly.github.io/spec/core/syntax/types.html#syntax-valtype)に`1`を加える新しい命令を定義してみましょう。

:::note
**注意:** すべてのWasm実装によってサポートされている命令のリストは、[仕様](https://webassembly.github.io/spec/core/appendix/index-instructions.html)で確認できます。
:::

すべてのWasm命令は[`src/wasm/wasm-opcodes.h`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-opcodes.h)で定義されています。これらの命令は、例えば制御、メモリ、SIMD、アトミックなど、機能別に大まかにグループ化されています。

`I32Add1`という新しい命令を`FOREACH_SIMPLE_OPCODE`セクションに追加してみましょう：

```diff
diff --git a/src/wasm/wasm-opcodes.h b/src/wasm/wasm-opcodes.h
index 6970c667e7..867cbf451a 100644
--- a/src/wasm/wasm-opcodes.h
+++ b/src/wasm/wasm-opcodes.h
@@ -96,6 +96,7 @@ bool IsJSCompatibleSignature(const FunctionSig* sig, bool hasBigIntFeature);

 // シグネチャを持つ式。
 #define FOREACH_SIMPLE_OPCODE(V)  \
+  V(I32Add1, 0xee, i_i)           \
   V(I32Eqz, 0x45, i_i)            \
   V(I32Eq, 0x46, i_ii)            \
   V(I32Ne, 0x47, i_ii)            \
```

WebAssemblyはバイナリ形式なので、この命令のエンコーディングを`0xee`として指定します。このチュートリアルでは、現在未使用の`0xee`を選択しました。

:::note
**注意:** 実際に仕様に命令を追加するには、ここで説明している内容以上の作業が必要です。
:::

オペコードに関するシンプルな単体テストを次のように実行できます：

```
$ tools/dev/gm.py x64.debug unittests/WasmOpcodesTest*
...
[==========] 1つのテストスイートから1テストを実行中。
[----------] グローバルテスト環境のセットアップ。
[----------] WasmOpcodesTestから1つのテスト
[ 実行中    ] WasmOpcodesTest.EveryOpcodeHasAName
../../test/unittests/wasm/wasm-opcodes-unittest.cc:27: 失敗
Value of: false
  実際: false
期待値: true
WasmOpcodes::OpcodeName(kExprI32Add1) == "unknown"; plazz halp in src/wasm/wasm-opcodes.cc
[  失敗  ] WasmOpcodesTest.EveryOpcodeHasAName
```

このエラーは、新しい命令に対して名前がないことを示しています。新しいオペコードの名前を[`src/wasm/wasm-opcodes.cc`](https://cs.chromium.org/chromium/src/v8/src/wasm/wasm-opcodes.cc)に追加できます：

```diff
diff --git a/src/wasm/wasm-opcodes.cc b/src/wasm/wasm-opcodes.cc
index 5ed664441d..2d4e9554fe 100644
--- a/src/wasm/wasm-opcodes.cc
+++ b/src/wasm/wasm-opcodes.cc
@@ -75,6 +75,7 @@ const char* WasmOpcodes::OpcodeName(WasmOpcode opcode) {
     // clang-format off

     // 標準オペコード
+    CASE_I32_OP(Add1, "add1")
     CASE_INT_OP(Eqz, "eqz")
     CASE_ALL_OP(Eq, "eq")
     CASE_I64x2_OP(Eq, "eq")
```

`FOREACH_SIMPLE_OPCODE`内に新しい命令を追加することにより、`src/wasm/function-body-decoder-impl.h`内で行われる[かなりの作業](https://cs.chromium.org/chromium/src/v8/src/wasm/function-body-decoder-impl.h?l=1751-1756&rcl=686b68edf9f42c201c2b25bca9f4bef72ff41c0b)を省略しています。このファイルではWasmオペコードがデコードされ、TurboFanグラフジェネレータへと呼び出されます。そのため、オペコードの動作内容によってはさらに作業が必要になる可能性があります。簡潔さを保つため、ここでは詳細を省略しています。

## 新しいオペコードのテストを書く

Wasmのテストは[`test/cctest/wasm/`](https://cs.chromium.org/chromium/src/v8/test/cctest/wasm/)で見つけることができます。[`test/cctest/wasm/test-run-wasm.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/wasm/test-run-wasm.cc)を見てみましょう。このファイルでは多くの“シンプル”なオペコードがテストされています。

このファイルにはたくさんの例があります。それらを参考にできます。一般的なセットアップは以下の通りです：

- `WasmRunner`を作成する
- 結果を保持するためのグローバルを設定（オプション）
- 命令へのパラメータとしてローカルを設定（オプション）
- Wasmモジュールを構築
- 実行して期待される出力と比較

以下は新しいオペコードに対する簡単なテストです：

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

テストを実行する:

```
$ tools/dev/gm.py x64.debug &apos;cctest/test-run-wasm-simd/RunWasmTurbofan_I32Add1&apos;
...
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# Fatal error in ../../src/compiler/wasm-compiler.cc, line 988
# Unsupported opcode 0xee:i32.add1
```

:::note
**ヒント:** テストの名前を見つけるのは難しい場合があります。テスト定義がマクロの後ろに隠れていることがあるからです。[コード検索](https://cs.chromium.org/)を使用してクリックし、マクロの定義を確認してください。
:::

このエラーは、コンパイラが新しい命令を認識していないことを示しています。これは次のセクションで変更されます。

## WasmのTurboFanへのコンパイル

冒頭で説明したように、Wasm命令はTurboFanグラフにコンパイルされます。この処理は`wasm-compiler.cc`で行われます。例として[`I32Eqz`](https://cs.chromium.org/chromium/src/v8/src/compiler/wasm-compiler.cc?l=716&rcl=686b68edf9f42c201c2b25bca9f4bef72ff41c0b)オペコードを見てみましょう:

```cpp
  switch (opcode) {
    case wasm::kExprI32Eqz:
      op = m->Word32Equal();
      return graph()->NewNode(op, input, mcgraph()->Int32Constant(0));
```

これはWasmオペコード`wasm::kExprI32Eqz`に基づいて切り替え、TurboFanグラフを構築します。グラフには操作`Word32Equal`と、Wasm命令の引数である`input`および定数`0`が含まれます。

`Word32Equal`オペレーターは、基盤となるV8抽象マシンによって提供され、アーキテクチャに依存しません。後のパイプラインで、この抽象マシンオペレーターはアーキテクチャ依存のアセンブリに変換されます。

新しいオペコード`I32Add1`の場合、入力に定数1を加えるグラフが必要なので、既存のマシンオペレーター`Int32Add`を使い、入力および定数1を渡します。

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

これはテストを通過するのに十分です。ただし、すべての命令に既存のTurboFanマシンオペレーターがあるわけではありません。その場合、新しいオペレーターをマシンに追加する必要があります。試してみましょう。

## TurboFanマシンオペレーター

`Int32Add1`の知識をTurboFanマシンに追加したいのです。そこで、まずそれが存在するかのように振る舞い、使用してみます。

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

同じテストを実行しようとすると、どこに変更を加えるべきかを示唆するコンパイルエラーが発生します。

```
../../src/compiler/wasm-compiler.cc:717:34: error: no member named &apos;Int32Add1&apos; in &apos;v8::internal::compiler::MachineOperatorBuilder&apos;; did you mean &apos;Int32Add&apos;?
      return graph()->NewNode(m->Int32Add1(), input);
                                 ^~~~~~~~~
                                 Int32Add
```

オペレーターを追加するために変更が必要な箇所がいくつかあります。

1. [`src/compiler/machine-operator.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/machine-operator.cc)
1. ヘッダー[`src/compiler/machine-operator.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/machine-operator.h)
1. マシンが理解するオペコードの一覧[`src/compiler/opcodes.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/opcodes.h)
1. 検証ツール[`src/compiler/verifier.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/verifier.cc)

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

実行テストでは、異なるエラーが発生しました:

```
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# 致命的なエラーが ../../src/compiler/backend/instruction-selector.cc の 2072 行に発生しました
# 予期しないオペレーター #289:Int32Add1 @ ノード #7
```

## 命令選択

これまでのところ、TurboFan レベルで作業してきたため、TurboFan グラフ内のノードの数に圧倒されています。しかし、アセンブリレベルでは命令とオペランドが存在します。命令選択は、このグラフを命令とオペランドに変換するプロセスです。

最後に発生したテストエラーにより、[`src/compiler/backend/instruction-selector.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/instruction-selector.cc)に何かが必要であることが示されています。このファイルは非常に大きく、マシンオペコードを含む巨大なスイッチ文が含まれています。訪問者パターンを使用して各種ノードに対する命令を生成するため、アーキテクチャ固有の命令選択に呼び出します。

新しい TurboFan マシンオペコードを追加したため、ここにも追加する必要があります:

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
       FATAL("予期しないオペレーター #%d:%s @ ノード #%d", node->opcode(),
             node->op()->mnemonic(), node->id());
```

命令選択はアーキテクチャに依存するため、アーキテクチャ固有の命令選択ファイルにも追加する必要があります。このコードラボでは x64 アーキテクチャのみを対象とするため、[`src/compiler/backend/x64/instruction-selector-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-selector-x64.cc)を修正する必要があります:

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

そして、この新しい x64 特有のオペコード `kX64Int32Add1` を [`src/compiler/backend/x64/instruction-codes-x64.h`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-codes-x64.h) に追加する必要があります:

```diff
diff --git a/src/compiler/backend/x64/instruction-codes-x64.h b/src/compiler/backend/x64/instruction-codes-x64.h
インデックス 9b8be0e0b5..7f5faeb87b 100644
--- a/src/compiler/backend/x64/instruction-codes-x64.h
+++ b/src/compiler/backend/x64/instruction-codes-x64.h
@@ -12,6 +12,7 @@ 名前空間 compiler {
 // X64固有のオペコード。どのアセンブリシーケンスを生成するかを指定します。
 // ほとんどのオペコードは単一の命令を指定します。
 #define TARGET_ARCH_OPCODE_LIST(V)        \
+  V(X64Int32Add1)                         \
   V(X64Add)                               \
   V(X64Add32)                             \
   V(X64And)                               \
```

## 命令スケジューリングとコード生成

テストを実行すると、新しいコンパイルエラーが表示されます：

```
../../src/compiler/backend/x64/instruction-scheduler-x64.cc:15:11: エラー: 列挙値&apos;kX64Int32Add1&apos;がswitch内で処理されていません [-Werror,-Wswitch]
  switch (instr->arch_opcode()) {
          ^
1 エラー生成。
...
../../src/compiler/backend/x64/code-generator-x64.cc:733:11: エラー: 列挙値&apos;kX64Int32Add1&apos;がswitch内で処理されていません [-Werror,-Wswitch]
  switch (arch_opcode) {
          ^
1 エラー生成。
```

[命令スケジューリング](https://en.wikipedia.org/wiki/Instruction_scheduling)は、命令が持つ可能性のある依存関係を考慮して、より最適な処理（例：命令の並べ替え）を可能にします。新しいオペコードにはデータ依存性がないため、次のように簡単に追加できます： [`src/compiler/backend/x64/instruction-scheduler-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/instruction-scheduler-x64.cc)：

```diff
diff --git a/src/compiler/backend/x64/instruction-scheduler-x64.cc b/src/compiler/backend/x64/instruction-scheduler-x64.cc
インデックス 79eda7e78d..3667a84577 100644
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

コード生成は、アーキテクチャ固有のオペコードをアセンブリに変換する部分です。次を追加します：[`src/compiler/backend/x64/code-generator-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/compiler/backend/x64/code-generator-x64.cc)：

```diff
diff --git a/src/compiler/backend/x64/code-generator-x64.cc b/src/compiler/backend/x64/code-generator-x64.cc
インデックス 61c3a45a16..9c37ed7464 100644
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

現時点ではコード生成を空白のままにし、テストを実行して全てがコンパイルされるか確認します：

```
=== cctest/test-run-wasm/RunWasmTurbofan_Int32Add1 ===
#
# 致命的エラー ../../test/cctest/wasm/test-run-wasm.cc, 行 37
# チェック失敗: 11 == r.Call() (11 vs. 10)。
```

このエラーは予想通りです。新しい命令はまだ実装されていないため、基本的には no-op で、実際の値は変更されませんでした（`10` のまま）。

オペコードを実装するには、`add` アセンブリ命令を使用します：

```diff
diff --git a/src/compiler/backend/x64/code-generator-x64.cc b/src/compiler/backend/x64/code-generator-x64.cc
インデックス 6c828d6bc4..260c8619f2 100644
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

これでテストがパスします：

幸いなことに、`addl` は既に実装されています。新しいオペコードが新しいアセンブリ命令の実装を必要とする場合、[`src/compiler/backend/x64/assembler-x64.cc`](https://cs.chromium.org/chromium/src/v8/src/codegen/x64/assembler-x64.cc)に追加します。このファイルでは、アセンブリ命令がバイトにエンコードされて出力されます。

:::note
**ヒント:** 生成されたコードを確認するには、`--print-code` を `cctest` に渡せばよいです。
:::

## 他のアーキテクチャ

このコースラボでは、この新しい命令をx64用にのみ実装しました。他のアーキテクチャの場合も必要な手順は似ています。TurboFanのマシンオペレーターを追加し、命令選択、スケジューリング、コード生成、アセンブラのためのプラットフォーム依存のファイルを利用します。

ヒント: 現時点での作業を別のターゲット、例えばarm64でコンパイルすると、リンク中にエラーが発生する可能性があります。これらのエラーを解決するには、`UNIMPLEMENTED()`スタブを追加してください。
