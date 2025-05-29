---
title: "V8 Torque ビルトイン"
description: "このドキュメントはTorqueビルトインの作成に関する入門として、V8開発者を対象としています。"
---
このドキュメントはTorqueビルトインの作成に関する入門として、V8開発者を対象としています。TorqueはCodeStubAssemblerの代わりとして、新しいビルトインを実装するための推奨方法です。[CodeStubAssembler builtins](/docs/csa-builtins) を参照して、このガイドのCSAバージョンをご覧ください。

## ビルトイン

V8では、ビルトインはVMがランタイムで実行可能なコードの塊と見なされています。一般的な使用例として、ビルトインオブジェクト（例えば`RegExp`や`Promise`）の関数を実装することが挙げられますが、ビルトインは他の内部機能（例えばICシステムの一部として）を提供するためにも使用されます。

V8のビルトインは、さまざまな方法で実装することができます（それぞれ異なるトレードオフがあります）：

- **プラットフォーム依存のアセンブリ言語**：非常に効率的であるが、すべてのプラットフォームに手動で移植する必要があり、保守が困難。
- **C++**：ランタイム関数に非常に似ており、V8の強力なランタイム機能にアクセスできるが、通常はパフォーマンスが重要な領域には適していない。
- **JavaScript**：簡潔で読みやすいコード、速い内部関数へのアクセスが可能だが、遅いランタイム呼び出しを頻繁に使用することがある。型汚染による予測不能なパフォーマンス、複雑で理解しづらいJSのセマンティクスによる微妙な問題がある。JavaScriptのビルトインは廃止予定であり、追加するべきではない。
- **CodeStubAssembler**：プラットフォーム非依存性を維持しつつ、読みやすさを保ちながらアセンブリ言語に非常に近い効率的な低レベル機能を提供。
- **[V8 Torque](/docs/torque)**：CodeStubAssemblerに変換されるV8固有のドメイン固有言語。CodeStubAssemblerを拡張し、静的型付けや読みやすく表現力豊かな構文を提供。

このドキュメントでは最後の方法に焦点を当て、JavaScriptに公開された簡単なTorqueビルトインの開発に関する簡単なチュートリアルを提供します。Torqueに関するより完全な情報については、[V8 Torqueユーザーマニュアル](/docs/torque)をご覧ください。

## Torqueビルトインの作成

このセクションでは、単一の引数を受け取り、それが`42`という数値を表しているかどうかを返す簡単なCSAビルトインを作成します。このビルトインは、`Math`オブジェクトにインストールすることでJSに公開されます（実行可能であるため）。

この例では以下を示します：

- JavaScriptのリンクを持つTorqueビルトインの作成。これによりJS関数のように呼び出せる。
- Torqueを使用した簡単なロジックの実装：型の区別、Smiとヒープ番号の処理、条件文。
- CSAビルトインを`Math`オブジェクトにインストール。

ローカルで追従したい場合は、以下のコードはリビジョン[589af9f2](https://chromium.googlesource.com/v8/v8/+/589af9f257166f66774b4fb3008cd09f192c2614)に基づいています。

## `MathIs42`の定義

Torqueコードは`src/builtins/*.tq`ファイルにあり、テーマごとに大まかに整理されています。ここでは`Math`のビルトインを作成するため、`src/builtins/math.tq`に定義を配置します。このファイルがまだ存在しないため、[`BUILD.gn`](https://cs.chromium.org/chromium/src/v8/BUILD.gn) 内の [`torque_files`](https://cs.chromium.org/chromium/src/v8/BUILD.gn?l=914&rcl=589af9f257166f66774b4fb3008cd09f192c2614)に追加する必要があります。

```torque
namespace math {
  javascript builtin MathIs42(
      context: Context, receiver: Object, x: Object): Boolean {
    // この時点では、xは基本的に何でも持つ可能性があります - Smi、HeapNumber、
    // undefined、その他の任意のJSオブジェクトなど。ToNumber_InlineはCodeStubAssemblerで
    // 定義されています。この関数は（引数が既に数値である場合）高速パスをインライン化し、
    // そうでない場合はToNumberビルトインを呼び出します。
    const number: Number = ToNumber_Inline(x);
    // typeswitchを使用して、値の動的型に基づいて分岐できます。
    // 型システムは、NumberがSmiまたはHeapNumberに限られることを知っているため、この
    // 分岐は網羅的です。
    typeswitch (number) {
      case (smi: Smi): {
        // smi == 42の結果はJavaScriptのブール値ではないため、条件文を使用してJavaScriptの
        // ブール値を作成します。
        return smi == 42 ? True : False;
      }
      case (heapNumber: HeapNumber): {
        return Convert<float64>(heapNumber) == 42 ? True : False;
      }
    }
  }
}
```

定義はTorque名前空間`math`内に配置します。この名前空間は以前は存在しなかったため、[`BUILD.gn`](https://cs.chromium.org/chromium/src/v8/BUILD.gn)内の[`torque_namespaces`](https://cs.chromium.org/chromium/src/v8/BUILD.gn?l=933&rcl=589af9f257166f66774b4fb3008cd09f192c2614)に追加する必要があります。

## `Math.is42`の添付

`Math`のような組み込みオブジェクトは、主に[`src/bootstrapper.cc`](https://cs.chromium.org/chromium/src/v8/src/bootstrapper.cc?q=src/bootstrapper.cc+package:%5Echromium$&l=1)でセットアップされます（一部のセットアップは`.js`ファイルで行われます）。新しい組み込みを追加するのは簡単です:

```cpp
// Mathのセットアップ用の既存のコード。明確にするためにここに含めています。
Handle<JSObject> math = factory->NewJSObject(cons, TENURED);
JSObject::AddProperty(global, name, math, DONT_ENUM);
// […省略…]
SimpleInstallFunction(isolate_, math, "is42", Builtins::kMathIs42, 1, true);
```

これで`is42`が追加され、JSから呼び出せるようになりました:

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

## スタブリンクを使った組み込みの定義と呼び出し

組み込みは、上記の`MathIs42`で使用したJSリンクではなく、スタブリンクを使用して作成することもできます。そのような組み込みは、複数の呼び出し元で使用されるコードを一度だけ生成して別個のコードオブジェクトに抽出することで便利です。ここでは、ヒープ数値を処理するコードを新しい組み込み`HeapNumberIs42`として抽出し、それを`MathIs42`から呼び出します。

定義も簡単です。JavaScriptリンクを持った組み込みとの差は、`javascript`キーワードを省略することと受信者引数がないことだけです。

```torque
namespace math {
  builtin HeapNumberIs42(implicit context: Context)(heapNumber: HeapNumber):
      Boolean {
    return Convert<float64>(heapNumber) == 42 ? True : False;
  }

  javascript builtin MathIs42(implicit context: Context)(
      receiver: Object, x: Object): Boolean {
    const number: Number = ToNumber_Inline(x);
    typeswitch (number) {
      case (smi: Smi): {
        return smi == 42 ? True : False;
      }
      case (heapNumber: HeapNumber): {
        // ヒープ数値をインラインで処理する代わりに、新しい組み込みを呼び出します。
        return HeapNumberIs42(heapNumber);
      }
    }
  }
}
````

なぜ組み込みに関心を持つべきなのでしょうか？コードをインラインに残したり、可読性向上のためにマクロに抽出したりしない理由は何でしょうか？

重要な理由の1つはコードスペースです。組み込みはコンパイル時に生成され、V8のスナップショットに含まれるか、バイナリに埋め込まれます。広範囲で使用されるコードを個別の組み込みに抽出することで、数十キロバイトから数百キロバイトに及ぶスペース節約が迅速に可能になります。

## スタブリンクの組み込みをテストする

新しい組み込みが非標準（少なくとも非C++）の呼び出し規約を使用していても、そのテストケースを記述することは可能です。次のコードを[`test/cctest/compiler/test-run-stubs.cc`](https://cs.chromium.org/chromium/src/v8/test/cctest/compiler/test-run-stubs.cc)に追加して、すべてのプラットフォームで組み込みをテストできます:

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
