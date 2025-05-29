---
title: "CodeStubAssembler 内蔵機能"
description: "このドキュメントはCodeStubAssembler内蔵機能の記述の導入を目的としており、V8の開発者を対象としています。"
---
このドキュメントはCodeStubAssembler内蔵機能の記述の導入を目的としており、V8の開発者を対象としています。

:::note
**注意:** [Torque](/docs/torque)は新しい内蔵機能を実装する推奨方法としてCodeStubAssemblerを置き換えるものです。このガイドのTorque版については[Torque 内蔵機能](/docs/torque-builtins)を参照してください。
:::

## 内蔵機能

V8では、内蔵機能はランタイムでVMが実行可能なコードのチャンクと見なすことができます。一般的な使用例としてはビルトインオブジェクト(RegExpやPromiseなど)の関数を実装することですが、内蔵機能は他の内部機能(例: ICシステムの一部として)を提供するためにも使用されます。

V8の内蔵機能は、さまざまな方法で実装できます(それぞれ異なるトレードオフがあります):

- **プラットフォーム依存のアセンブリ言語**: 非常に効率的ですが、すべてのプラットフォームへの手作業での移植が必要で、維持が困難です。
- **C++**: ランタイム関数と非常に似たスタイルを持ち、V8の強力なランタイム機能にアクセスできますが、通常性能に敏感な領域には適していません。
- **JavaScript**: 簡潔で読みやすいコード、迅速な内部関数へのアクセス、しかし遅いランタイム呼び出しの頻繁な使用、型汚染による予測できない性能、複雑でわかりにくいJSセマンティクスに関する微妙な問題があります。
- **CodeStubAssembler**: アセンブリ言語に非常に近い効率的な低レベル機能を提供しながら、プラットフォーム非依存で可読性を保ちます。

この残りのドキュメントは後者に焦点を当て、簡単なCodeStubAssembler(CSA)内蔵機能を開発するための簡単なチュートリアルを提供します。

## CodeStubAssembler

V8のCodeStubAssemblerは、アセンブリの薄い抽象化として低レベルのプリミティブを提供するカスタムのプラットフォーム非依存のアセンブラーですが、高レベルの機能の広範なライブラリも提供します。

```cpp
// 低レベル:
// addrの指し示すポインタサイズのデータをvalueにロードする。
Node* addr = /* ... */;
Node* value = Load(MachineType::IntPtr(), addr);

// 高レベル:
// JS操作ToString(object)を実行。
// ToStringのセマンティクスはhttps://tc39.es/ecma262/#sec-tostringで指定されています。
Node* object = /* ... */;
Node* string = ToString(context, object);
```

CSA内蔵機能はTurboFanコンパイルパイプラインの一部を通過して実行されます(ブロックスケジューリングとレジスタ割り当てを含み、最適化処理は含まない)。これにより最終的な実行可能コードが生成されます。

## CodeStubAssembler 内蔵機能の記述

このセクションでは1つの引数を取り、それが数値`42`を表しているかどうかを返すシンプルなCSA内蔵機能を記述します。この内蔵機能は`Math`オブジェクトにインストールされ、JSから利用可能になります(ついでという意味で)。

この例は以下を示します:

- JS関数のように呼び出されるJavaScriptリンクを持つCSA内蔵機能の作成。
- CSAを使用して単純なロジックを実装: Smiとヒープナンバーの処理、条件分岐、TFS内蔵機能への呼び出し。
- CSA変数の使用。
- CSA内蔵機能を`Math`オブジェクトにインストール。

ローカルで確認したい場合、次のコードは[7a8d20a7](https://chromium.googlesource.com/v8/v8/+/7a8d20a79f9d5ce6fe589477b09327f3e90bf0e0)修正版に基づいています。

## `MathIs42` の宣言

内蔵機能は[`src/builtins/builtins-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h?q=builtins-definitions.h+package:%5Echromium$&l=1)の`BUILTIN_LIST_BASE`マクロで宣言されます。JSリンクと1つのパラメータ`X`を持つ新しいCSA内蔵機能を作成するには:

```cpp
#define BUILTIN_LIST_BASE(CPP, API, TFJ, TFC, TFS, TFH, ASM, DBG)              \
  // […snip…]
  TFJ(MathIs42, 1, kX)                                                         \
  // […snip…]
```

`BUILTIN_LIST_BASE`は異なる種類の内蔵機能を表すいくつかの異なるマクロを受け取ります(詳細についてはインラインドキュメントを参照してください)。CSA内蔵機能は具体的に以下に分かれています:

- **TFJ**: JavaScriptリンク。
- **TFS**: スタブリンク。
- **TFC**: 特殊なインターフェース記述子が必要なスタブリンク内蔵機能(例: 引数がタグなしまたは特定のレジスタに渡される必要がある場合)。
- **TFH**: ICハンドラに使用される特殊なスタブリンク内蔵機能。

## `MathIs42` の定義

内蔵機能の定義はトピックごとに整理された`src/builtins/builtins-*-gen.cc`ファイルに配置されています。我々は`Math`の内蔵機能を書くので、定義を[`src/builtins/builtins-math-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-math-gen.cc?q=builtins-math-gen.cc+package:%5Echromium$&l=1)に置きます。

```cpp
// TF_BUILTINは指定されたアセンブラの新しいサブクラスを内部で作成する便利なマクロです。
TF_BUILTIN(MathIs42, MathBuiltinsAssembler) {
  // 現在の関数コンテキスト（すべてのスタブに暗黙の引数として含まれる）をロードします。
  // および X 引数をロードします。ビルトイン宣言で定義された名前を使用して
  // パラメータを参照できることに注意してください。
  Node* const context = Parameter(Descriptor::kContext);
  Node* const x = Parameter(Descriptor::kX);

  // この時点で、x は基本的に何でもあり得ます - Smi、HeapNumber、
  // undefined、またはその他の任意の JavaScript オブジェクトです。次に、ToNumber
  // ビルトインを呼び出し、使用可能な数値に x を変換します。
  // CallBuiltin を使用すると、任意の CSA ビルトインを簡単に呼び出すことができます。
  Node* const number = CallBuiltin(Builtins::kToNumber, context, x);

  // 結果の値を格納するための CSA 変数を作成します。
  // この変数の型は kTagged で、タグ付けされたポインタのみを格納します。
  VARIABLE(var_result, MachineRepresentation::kTagged);

  // ジャンプターゲットとして使用されるいくつかのラベルを定義する必要があります。
  Label if_issmi(this), if_isheapnumber(this), out(this);

  // ToNumber は常に数値を返します。ここでは、数値が Smi
  // または HeapNumber であるかを区別する必要があります - ここでは、
  // number が Smi であるかを確認し、対応するラベルに条件付きでジャンプします。
  Branch(TaggedIsSmi(number), &if_issmi, &if_isheapnumber);

  // ラベルをバインドすることで、そのラベルに対応するコード生成を開始します。
  BIND(&if_issmi);
  {
    // SelectBooleanConstant は渡された条件が true/false に応じて JS の true/false 値を返します。
    // 結果は var_result 変数にバインドされ、その後無条件に out ラベルにジャンプします。
    var_result.Bind(SelectBooleanConstant(SmiEqual(number, SmiConstant(42))));
    Goto(&out);
  }

  BIND(&if_isheapnumber);
  {
    // ToNumber は Smi または HeapNumber のいずれかしか返すことができません。
    // 確認のため number が実際に HeapNumber であることを保証するアサートを追加します。
    CSA_ASSERT(this, IsHeapNumber(number));
    // HeapNumber には浮動小数点値がラップされています。この値を明示的に抽出し、
    // 浮動小数点の比較を行い、その結果に基づいて再び var_result をバインドする必要があります。
    Node* const value = LoadHeapNumberValue(number);
    Node* const is_42 = Float64Equal(value, Float64Constant(42));
    var_result.Bind(SelectBooleanConstant(is_42));
    Goto(&out);
  }

  BIND(&out);
  {
    Node* const result = var_result.value();
    CSA_ASSERT(this, IsBoolean(result));
    Return(result);
  }
}
```

## `Math.Is42`を添付する

`Math`のようなビルトインオブジェクトは主に[`src/bootstrapper.cc`](https://cs.chromium.org/chromium/src/v8/src/bootstrapper.cc?q=src/bootstrapper.cc+package:%5Echromium$&l=1)（一部は `.js` ファイルで設定されます）で設定されます。新しいビルトインの添付は簡単です:

```cpp
// 明確にするために含めた、Math を設定する既存のコード。
Handle<JSObject> math = factory->NewJSObject(cons, TENURED);
JSObject::AddProperty(global, name, math, DONT_ENUM);
// [...省略...]
SimpleInstallFunction(math, "is42", Builtins::kMathIs42, 1, true);
```

これで `Is42` が添付されたので、JS から呼び出せるようになります:

```bash
$ out/debug/d8
d8> Math.is42(42);
true
d8> Math.is42('42.0');
true
d8> Math.is42(true);
false
d8> Math.is42({ valueOf: () => 42 });
true
```

## スタブリンクのビルトインを定義し呼び出す

CSAビルトインは、`MathIs42`で使用したJSリンクの代わりにスタブリンクでも作成可能です。このようなビルトインは、複数の呼び出し元で使用されるコードを別のコードオブジェクトに抽出し、そのコードを一度だけ生成するのに役立ちます。HeapNumber を処理するコードを `MathIsHeapNumber42` というビルトインに抽出し、それを `MathIs42` から呼び出す方法を見てみましょう。

TFSスタブの定義と使用は簡単です; 宣言は再び[`src/builtins/builtins-definitions.h`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-definitions.h?q=builtins-definitions.h+package:%5Echromium$&l=1)に配置します:

```cpp
#define BUILTIN_LIST_BASE(CPP, API, TFJ, TFC, TFS, TFH, ASM, DBG)              \
  // [...省略...]
  TFS(MathIsHeapNumber42, kX)                                                  \
  TFJ(MathIs42, 1, kX)                                                         \
  // [...省略...]
```

現在のところ、`BUILTIN_LIST_BASE`内での順序は重要です。`MathIs42` が `MathIsHeapNumber42` を呼び出すため、後者の後に前者をリストする必要があります（この制約は今後解消される予定です）。

定義も簡単です。[`src/builtins/builtins-math-gen.cc`](https://cs.chromium.org/chromium/src/v8/src/builtins/builtins-math-gen.cc?q=builtins-math-gen.cc+package:%5Echromium$&l=1)で:

```cpp
// TFSビルトインの定義はTFJビルトインと全く同じです。
TF_BUILTIN(MathIsHeapNumber42, MathBuiltinsAssembler) {
  Node* const x = Parameter(Descriptor::kX);
  CSA_ASSERT(this, IsHeapNumber(x));
  Node* const value = LoadHeapNumberValue(x);
  Node* const is_42 = Float64Equal(value, Float64Constant(42));
  Return(SelectBooleanConstant(is_42));
}
```

最後に、新しいビルトインを `MathIs42` から呼び出してみましょう:

```cpp
TF_BUILTIN(MathIs42, MathBuiltinsAssembler) {
  // […省略…]
  BIND(&if_isheapnumber);
  {
    // ヒープナンバーをインラインで処理する代わりに、新しいTFSスタブへ呼び出します。
    var_result.Bind(CallBuiltin(Builtins::kMathIsHeapNumber42, context, number));
    Goto(&out);
  }
  // […省略…]
}
```

なぜそもそもTFSバルトインに気を遣う必要があるのでしょうか？ なぜコードをインライン化のままにしておかないのでしょうか（もしくは可読性向上のためヘルパーメソッドに抽出する）？

重要な理由はコードスペースにあります：バルトインはコンパイル時に生成され、V8スナップショットに含まれるため、すべての作成されたアイソレートに（かなりの）空間を無条件で消費します。一般的に使用される大きなコード部分をTFSバルトインに抽出することで、10KBから100KB単位のスペース節約に素早くつながる可能性があります。

## スタブリンクバルトインのテスト

新しいバルトインが非標準（少なくとも非C++）の呼び出し規約を使用しているにも関わらず、テストケースを書くことが可能です。以下のコードを[`test/cctest/compiler/test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc?l=1&rcl=4cab16db27808cf66ab883e7904f1891f9fd0717)に追加することで、すべてのプラットフォーム上でバルトインをテストできます。

```cpp
TEST(MathIsHeapNumber42) {
  HandleAndZoneScope scope;
  Isolate* isolate = scope.main_isolate();
  Heap* heap = isolate->heap();
  Zone* zone = scope.main_zone();

  StubTester tester(isolate, zone, Builtins::kMathIs42);
  Handle<Object> result1 = tester.Call(Handle<Smi>(Smi::FromInt(0), isolate));
  CHECK(result1->BooleanValue());
}
```
