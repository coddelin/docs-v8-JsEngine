---
title: "V8 Torque ユーザーマニュアル"
description: "このドキュメントは、V8コードベースで使用されるV8 Torque言語を説明します。"
---
V8 Torqueは、V8プロジェクトに貢献する開発者が、VMの意図的な変更に焦点を当て、実装に関係のない詳細に気を取られることなく、変更を表現できるようにする言語です。この言語は、[ECMAScript仕様](https://tc39.es/ecma262/)を直接V8に実装するのを簡単にするために十分にシンプルでありながら、特定のオブジェクト形状のテストに基づく高速経路の作成など、堅牢な方法で低レベルのV8最適化トリックを表現するのに十分に強力に設計されています。

Torqueは、V8エンジニアとJavaScript開発者に馴染みがあるもので、TypeScriptのような構文を兼ね備えており、V8コードの記述や理解を容易にします。また、コードスタブアセンブラ（`CodeStubAssembler`）で既に共通している概念を反映した構文や型を組み込んでいます。強力な型システムと構造化された制御フローにより、Torqueは設計段階からの正確さを保証します。Torqueの表現力は、[現在V8のビルトインで見つかるほぼすべての機能](/docs/builtin-functions)を表現するのに十分です。また、C++で記述された`CodeStubAssembler`ビルトインや`macro`との相互運用性を共有しており、Torqueコードが手書きのCSA機能を使用することもその逆も可能です。

Torqueは、高レベルでセマンティックリッチなV8の実装の断片を表現するための言語構造を提供し、Torqueコンパイラがこれらの断片を`CodeStubAssembler`を使用して効率的なアセンブリコードに変換します。Torqueの言語構造とコンパイラのエラーチェックは、`CodeStubAssembler`を直接使用する従来の方法では面倒で誤りがちだった正確性を保証する方法を提供します。従来、`CodeStubAssembler`を使用して最適なコードを書くには、V8エンジニアが多くの専門知識を頭に入れ、微妙な落とし穴を回避する必要がありました。この知識の多くは文書化されていなかったため、効率的なビルトインを書くための学習曲線は急でした。また、必要な知識を習得していても、非直感的で監視されていない落とし穴により正確性や[セキュリティ](https://bugs.chromium.org/p/chromium/issues/detail?id=775888)[バグ](https://bugs.chromium.org/p/chromium/issues/detail?id=785804)がしばしば発生しました。Torqueを使用することで、これらの落とし穴の多くが回避され、自動的にTorqueコンパイラによって認識されるようになります。

## 入門

Torqueで記述された大部分のソースコードは、V8リポジトリの[`src/builtins`ディレクトリ](https://github.com/v8/v8/tree/master/src/builtins)に`*.tq`の拡張子でチェックインされています。V8のヒープに割り当てられたクラスのTorque定義は、C++定義と一緒に`.tq`ファイルに存在し、`src/objects`内の対応するC++ファイルと同じ名前になっています。実際のTorqueコンパイラは[`src/torque`](https://github.com/v8/v8/tree/master/src/torque)以下にあります。Torque機能のテストは、[`test/torque`](https://github.com/v8/v8/tree/master/test/torque)、[`test/cctest/torque`](https://github.com/v8/v8/tree/master/test/cctest/torque)、および[`test/unittests/torque`](https://github.com/v8/v8/tree/master/test/unittests/torque)以下にチェックインされています。

Torque言語を体験するために、「Hello World!」を出力するV8ビルトインを書いてみましょう。これを行うには、Torqueの`macro`をテストケース内に追加し、それを`cctest`テストフレームワークから呼び出します。

`test/torque/test-torque.tq`ファイルを開き、次のコードを末尾に追加します（ただし、最後の閉じ括弧`}`の前に記述します）：

```torque
@export
macro PrintHelloWorld(): void {
  Print('Hello world!');
}
```

次に、`test/cctest/torque/test-torque.cc`を開き、新しいTorqueコードを使用してコードスタブを構築する次のテストケースを追加します：

```cpp
TEST(HelloWorld) {
  Isolate* isolate(CcTest::InitIsolateOnce());
  CodeAssemblerTester asm_tester(isolate, JSParameterCount(0));
  TestTorqueAssembler m(asm_tester.state());
  {
    m.PrintHelloWorld();
    m.Return(m.UndefinedConstant());
  }
  FunctionTester ft(asm_tester.GenerateCode(), 0);
  ft.Call();
}
```

次に[`cctest`実行可能ファイルをビルドします](/docs/test)、最後に`cctest`テストを実行して「Hello world」を出力します：

```bash
$ out/x64.debug/cctest test-torque/HelloWorld
Hello world!
```

## Torqueがコードを生成する仕組み

Torqueコンパイラは、直接的に機械コードを生成するのではなく、V8の既存の`CodeStubAssembler`インターフェースを呼び出すC++コードを生成します。`CodeStubAssembler`は[TurboFanコンパイラ](https://v8.dev/docs/turbofan)のバックエンドを使用して効率的なコードを生成します。そのため、Torqueのコンパイルには複数のステップが必要です：

1. `gn`ビルドは、まずTorqueコンパイラを実行します。それにより、すべての`*.tq`ファイルが処理されます。それぞれのTorqueファイル`path/to/file.tq`は、以下のファイルを生成します：
    - `path/to/file-tq-csa.cc` と `path/to/file-tq-csa.h` に生成されたCSAマクロを含む。
    - クラス定義を含む対応するヘッダー `path/to/file.h` にインクルードされる `path/to/file-tq.inc`。
    - クラス定義のC++アクセサを含む対応するインラインヘッダー `path/to/file-inl.h` にインクルードされる `path/to/file-tq-inl.inc`。
    - 生成されたヒープバリファイアやプリンターなどを含む `path/to/file-tq.cc`。

    Torqueコンパイラは、V8ビルドで使用される他のさまざまな `.h` ファイルも生成します。
1. `gn` ビルドは、ステップ1で生成された `-csa.cc` ファイルをコンパイルして `mksnapshot` 実行ファイルを生成します。
1. `mksnapshot` が実行されると、V8のすべてのビルトインが生成され、スナップショットファイルにパッケージングされます。それには、Torqueで定義されたものや、Torqueで定義された機能を使用するその他のビルトインも含まれます。
1. 残りのV8がビルドされます。Torqueで作成されたすべてのビルトインは、スナップショットファイルを通じてV8内でアクセス可能になります。それらは他のビルトイン同様に呼び出すことができます。さらに、`d8` または `chrome` 実行ファイルには、クラス定義に関連する生成されたコンパイルユニットが直接含まれます。

視覚的には、ビルドプロセスは次のように見えます:

<figure>
  <img src="/_img/docs/torque/build-process.svg" width="800" height="480" alt="" loading="lazy"/>
</figure>

## Torqueツール

Torqueには基本的なツールと開発環境サポートが用意されています。

- Torque用の [Visual Studio Codeプラグイン](https://github.com/v8/vscode-torque) があり、カスタム言語サーバーを使って定義への移動機能などを提供します。
- `.tq` ファイルを変更した後に使用すべきフォーマットツールもあります: `tools/torque/format-torque.py -i <filename>`

## Torqueを含むビルドのトラブルシューティング

これを知る必要がある理由は？ Torqueファイルが機械コードに変換される各プロセスを理解することは重要です。なぜなら、Torqueをスナップショットに埋め込まれたバイナリコードに変換する各段階で、さまざまな問題（およびバグ）が発生する可能性があるからです。

- Torqueコード（つまり `.tq` ファイル）に構文エラーや意味エラーがある場合、Torqueコンパイラが失敗します。この段階でV8ビルドは中止され、ビルドの後半部分で発見される可能性のある他のエラーは表示されません。
- Torqueコードの構文が正しく、Torqueコンパイラの厳密な意味チェックに合格したとしても、`mksnapshot` のビルドが失敗する可能性があります。これは主に、`.tq` ファイルで提供される外部定義に矛盾がある場合に発生します。Torqueコードで `extern` キーワードでマークされた定義は、必要な機能の定義がC++にあることをTorqueコンパイラに知らせます。現在のところ、`.tq` ファイルの `extern` 定義と、それらが参照するC++コードとの結合は緩やかであり、その結合はTorqueコンパイル時には検証されません。`extern` 定義が一致しない（または微妙な場合には機能を誤認させる）と、`code-stub-assembler.h` ヘッダーファイルや他のV8ヘッダーでアクセスする機能に影響し、`mksnapshot` のC++ビルドが失敗します。
- `mksnapshot` が正常にビルドされても、実行時に失敗する場合があります。例えば、Torqueの `static_assert` がTurbofanによって検証できないため、生成されたCSAコードをTurbofanがコンパイルできない場合があります。また、スナップショット作成時に実行されるTorque提供のビルトインにバグがある可能性もあります。例えば、Torqueで作成されたビルトインである `Array.prototype.splice` は、JavaScriptのスナップショット初期化プロセスの一部として、デフォルトのJavaScript環境を設定するために呼び出されます。その実装にバグがあると、`mksnapshot` は実行中にクラッシュします。`mksnapshot` がクラッシュした場合は、`--gdb-jit-full` フラグを指定して呼び出すと、追加のデバッグ情報が生成され、例えばTorque生成のビルトイン名が `gdb` スタックトレースに表示されるなど、有用なコンテキストが得られることがあります。
- もちろん、Torque作成のコードが `mksnapshot` を通過したとしても、それがバグを含んだりクラッシュしたりする可能性があります。`torque-test.tq` や `torque-test.cc` にテストケースを追加することで、自分のTorqueコードが期待通りに動作することを確認するのが良い方法です。もしTorqueコードが結果的に `d8` や `chrome` でクラッシュする場合、再び `--gdb-jit-full` フラグが非常に役立ちます。

## `constexpr`: コンパイル時 vs. 実行時

Torqueビルドプロセスを理解することは、Torque言語のコア機能である `constexpr` を理解する上でも重要です。

Torqueは、Torqueコード内の式を実行時に評価することを許可します（つまり、JavaScriptを実行する一環としてV8のビルトインが実行されるとき）。しかし、それだけでなく、式をコンパイル時に評価することも可能です（つまり、Torqueビルドプロセスの一部として、V8ライブラリや `d8` 実行ファイルが作成される前に）。

Torqueは、式をビルド時に評価する必要があることを示すために`constexpr`キーワードを使用します。その使用法は[C++の`constexpr`](https://en.cppreference.com/w/cpp/language/constexpr)に多少類似しています。C++から`constexpr`キーワードとその一部の構文を借りるだけでなく、Torqueでは同様に、コンパイルタイムでの評価とランタイムでの評価の区別を示すために`constexpr`を使用します。

ただし、Torqueの`constexpr`のセマンティクスにはいくつか微妙な違いがあります。C++では、`constexpr`式はC++コンパイラによって完全に評価される可能性があります。Torqueでは、`constexpr`式はTorqueコンパイラによって完全には評価されず、代わりにC++の型、変数、および式にマップされます。それらは`mksnapshot`の実行時に完全に評価される必要があります。Torqueライターの視点では、`constexpr`式はランタイムで実行されるコードを生成しないため、その意味でコンパイルタイムのものと考えられますが、技術的にはTorqueに外部にあるC++コードによって評価され、`mksnapshot`が実行されるものです。したがって、Torqueでは、`constexpr`は基本的に「`mksnapshot`時」を意味し、「コンパイル時」を意味するわけではありません。

ジェネリックと組み合わせることで、`constexpr`はV8の開発者が事前に予想できる特定の少数の詳細が異なる、非常に効率的な特殊化されたビルトインを多数生成するために使用できる強力なTorqueツールです。

## ファイル

Torqueコードは個々のソースファイルにパッケージ化されています。各ソースファイルは一連の宣言で構成され、これらの宣言は名前空間宣言で任意にラップされ、宣言の名前空間を分離することができます。文法の説明はおそらく最新ではありません。真実のソースは[Torqueコンパイラの文法定義](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/torque/torque-parser.cc?q=TorqueGrammar::TorqueGrammar)にあり、コンテキストフリー文法ルールを使用して記述されています。

Torqueファイルは宣言のシーケンスです。可能な宣言は[`torque-parser.cc`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/torque/torque-parser.cc?q=TorqueGrammar::declaration)にリストされています。

## 名前空間

Torqueの名前空間は独立した名前空間で宣言を行うことができます。C++の名前空間に似ています。他の名前空間で自動的に表示されない宣言を作成することができます。名前空間は入れ子にすることが可能で、入れ子の名前空間内の宣言はそれを含む名前空間の宣言に資格なしでアクセスできます。名前空間宣言で明示的に指定されていない宣言は、すべての名前空間で表示される共有グローバルデフォルト名前空間に配置されます。名前空間は再開することができ、複数のファイルにまたがって定義することができます。

例:

```torque
macro IsJSObject(o: Object): bool { … }  // デフォルト名前空間内

namespace array {
  macro IsJSArray(o: Object): bool { … }  // array名前空間内
};

namespace string {
  // …
  macro TestVisibility() {
    IsJsObject(o); // OK, グローバル名前空間がここで見える
    IsJSArray(o);  // エラー、この名前空間内では見えない
    array::IsJSArray(o);  // OK, 明示的な名前空間指定
  }
  // …
};

namespace array {
  // OK, 名前空間が再開されました。
  macro EnsureWriteableFastElements(array: JSArray){ … }
};
```

## 宣言

### 型

Torqueは強く型付けされています。その型システムは、それが提供する多くのセキュリティおよび正確性の保証の基礎です。

多くの基本的な型に対して、Torqueは実際にはそれらについて非常識には多くの知識を持っていません。代わりに、多くの型は明示的な型マッピングを通じて`CodeStubAssembler`およびC++型とゆるく結合されており、そのマッピングの厳格性をC++コンパイラに依存しています。そのような型は抽象型として実現されています。

#### 抽象型

Torqueの抽象型はC++コンパイル時およびCodeStubAssemblerランタイム値に直接マップされます。その宣言は名前とC++型との関係を指定します:

```grammar
AbstractTypeDeclaration :
  type IdentifierName ExtendsDeclaration opt GeneratesDeclaration opt ConstexprDeclaration opt

ExtendsDeclaration :
  extends IdentifierName ;

GeneratesDeclaration :
  generates StringLiteral ;

ConstexprDeclaration :
  constexpr StringLiteral ;
```

`IdentifierName`は抽象型の名前を指定し、`ExtendsDeclaration`は、宣言された型が派生している型をオプションで指定します。`GeneratesDeclaration`は、`CodeStubAssembler`コードでその型のランタイム値を含むために使用されるC++の`TNode`型に対応する文字列リテラルをオプションで指定します。`ConstexprDeclaration`は、ビルド時（`mksnapshot`時）評価のためのTorque型に対応するC++型を指定する文字列リテラルです。

`base.tq`からTorqueの31ビットと32ビットの符号付き整数型の例を以下に示します:

```torque
type int32 generates 'TNode<Int32T>' constexpr 'int32_t';
type int31 extends int32 generates 'TNode<Int32T>' constexpr 'int31_t';
```

#### ユニオン型

ユニオン型は値がいくつかの可能な型のいずれかに属することを表します。タグ付き値に対してのみユニオン型を許可しています。これは、マップポインタを使用してランタイムで区別できるためです。例えば、JavaScriptの数値はSmi値または割り当てられた`HeapNumber`オブジェクトです。

```torque
type Number = Smi | HeapNumber;
```

共用型は以下の等式を満たします：

- `A | B = B | A`
- `A | (B | C) = (A | B) | C`
- `A | B = A` ただし `B` が `A` のサブタイプである場合

タグ付き型のみから共用型を形成することが許可されています。なぜなら、タグ付けされていない型では実行時に区別することができないためです。

共用型をCSAにマッピングする場合、共用型内のすべての型に共通する最も具体的なスーパタイプが選択されます。ただし、`Number` および `Numeric` については対応するCSA共用型にマッピングされます。

#### クラスタイプ

クラスタイプを使用すると、TorqueコードからV8 GCヒープ上の構造化されたオブジェクトを定義、割り当て、操作することが可能になります。それぞれのTorqueクラスタイプはC++コード内のHeapObjectのサブクラスに対応する必要があります。V8のC++実装とTorque実装の間で冗長なコードを維持するコストを最小限に抑えるために、Torqueクラスタイプの定義は必要に応じてC++のオブジェクトアクセスコードを生成するのに使用されます。これにより、C++とTorqueの同期を手動で取る手間が削減されます。

```grammar
ClassDeclaration :
  ClassAnnotation* extern opt transient opt class IdentifierName ExtendsDeclaration opt GeneratesDeclaration opt {
    ClassMethodDeclaration*
    ClassFieldDeclaration*
  }

ClassAnnotation :
  @doNotGenerateCppClass
  @generateBodyDescriptor
  @generatePrint
  @abstract
  @export
  @noVerifier
  @hasSameInstanceTypeAsParent
  @highestInstanceTypeWithinParentClassRange
  @lowestInstanceTypeWithinParentClassRange
  @reserveBitsInInstanceType ( NumericLiteral )
  @apiExposedInstanceTypeValue ( NumericLiteral )

ClassMethodDeclaration :
  transitioning opt IdentifierName ImplicitParameters opt ExplicitParameters ReturnType opt LabelsDeclaration opt StatementBlock

ClassFieldDeclaration :
  ClassFieldAnnotation* weak opt const opt FieldDeclaration;

ClassFieldAnnotation :
  @noVerifier
  @if ( Identifier )
  @ifnot ( Identifier )

FieldDeclaration :
  Identifier ArraySpecifier opt : Type ;

ArraySpecifier :
  [ Expression ]
```

クラスの例：

```torque
extern class JSProxy extends JSReceiver {
  target: JSReceiver|Null;
  handler: JSReceiver|Null;
}
```

`extern` は、このクラスがTorqueでのみ定義されたものではなく、C++で定義されていることを示します。

クラス内のフィールド宣言は、CodeStubAssemblerから使用可能なフィールドのゲッターとセッターを暗黙的に生成します。例えば：

```cpp
// In TorqueGeneratedExportedMacrosAssembler:
TNode<HeapObject> LoadJSProxyTarget(TNode<JSProxy> p_o);
void StoreJSProxyTarget(TNode<JSProxy> p_o, TNode<HeapObject> p_v);
```

前述のように、Torqueで定義されるフィールドはC++コードを生成し、重複するアクセサやヒープ訪問コードを排除します。JSProxyの手書き定義は、以下のように生成されたクラステンプレートを継承する必要があります：

```cpp
// In js-proxy.h:
class JSProxy : public TorqueGeneratedJSProxy<JSProxy, JSReceiver> {

  // Torqueによって生成された内容以外に必要なものをここに記述...

  // 最後に、パブリック/プライベートの設定に影響するため：
  TQ_OBJECT_CONSTRUCTORS(JSProxy)
}

// In js-proxy-inl.h:
TQ_OBJECT_CONSTRUCTORS_IMPL(JSProxy)
```

生成されたクラスはキャスト関数、フィールドアクセサ関数、およびフィールドオフセット定数（この場合、`kTargetOffset` や `kHandlerOffset` など）を提供します。これらはクラスの先頭からの各フィールドのバイトオフセットを表します。

##### クラスタイプの注釈

一部のクラスでは、上記の例に示した継承パターンを使用できない場合があります。そのような場合、クラスは `@doNotGenerateCppClass` を指定し、直接スーパークラスタイプを継承し、フィールドオフセット定数用のTorque生成マクロを含めることができます。このようなクラスは独自にアクセサやキャスト関数を実装する必要があります。このマクロを使用する例は以下の通りです：

```cpp
class JSProxy : public JSReceiver {
 public:
  DEFINE_FIELD_OFFSET_CONSTANTS(
      JSReceiver::kHeaderSize, TORQUE_GENERATED_JS_PROXY_FIELDS)
  // クラスの他の部分は省略...
}
```

`@generateBodyDescriptor` を追加すると、Torqueは生成されたクラス内に`BodyDescriptor`を生成します。これはガベージコレクタがオブジェクトをどのように訪問すべきかを表します。それ以外の場合、C++コードは独自のオブジェクト訪問を定義するか、既存のパターンを使用する必要があります（例えば、`Struct`を継承し、`STRUCT_LIST`にクラスを含めると、クラスはタグ付き値のみを含むとみなされます）。

`@generatePrint` 注釈が追加されると、ジェネレータはTorqueレイアウトで定義されたフィールド値を出力するC++関数を実装します。JSProxyの例を使用すると、シグネチャは `void TorqueGeneratedJSProxy<JSProxy, JSReceiver>::JSProxyPrint(std::ostream& os)` となり、これは`JSProxy`が継承することができます。

また、Torqueコンパイラはすべての`extern`クラスに対して検証コードを生成しますが、クラスが`@noVerifier`注釈を使用してオプトアウトする場合は除きます。例えば、上記のJSProxyクラス定義は、Torqueタイプ定義に従ってフィールドが有効であることを検証するC++メソッド`void TorqueGeneratedClassVerifiers::JSProxyVerify(JSProxy o, Isolate* isolate)`を生成します。また、生成されたクラス`TorqueGeneratedJSProxy<JSProxy, JSReceiver>::JSProxyVerify`にも対応する関数を生成し、これが`TorqueGeneratedClassVerifiers`の静的関数を呼び出します。クラスに追加の検証を加えたい場合（例えば、数値の受け入れ可能な範囲、またはフィールド`bar`が非nullの場合にフィールド`foo`がtrueである必要があるなど）、C++クラスに`DECL_VERIFIER(JSProxy)`を追加してそれを`src/objects-debug.cc`で実装します。そのようなカスタム検証の最初のステップは、生成された検証器を呼び出すことであるべきです。例えば、`TorqueGeneratedClassVerifiers::JSProxyVerify(*this, isolate);`。 (これらの検証器をGCの前後で実行するには、`v8_enable_verify_heap = true`でビルドし、`--verify-heap`で実行してください。)

`@abstract`は、クラス自体がインスタンス化されず、それ自身のインスタンスタイプを持たないことを示します。論理的にクラスに属するインスタンスタイプは、派生クラスのインスタンスタイプです。

`@export`注釈は、Torqueコンパイラが具体的なC++クラス（上記例の`JSProxy`など）を生成するようにします。これは明らかに、Torque生成コードによって提供される以上のC++機能を追加したくない場合にのみ有用です。`extern`と併用することはできません。Torque内でのみ定義され使用されるクラスの場合、`extern`も`@export`も使用しないのが最も適切です。

`@hasSameInstanceTypeAsParent`は、親クラスと同じインスタンスタイプを持つが、一部のフィールドの名前を変更したり、別のマップを持ったりする可能性があるクラスを示します。このような場合、親クラスは抽象的ではありません。

`@highestInstanceTypeWithinParentClassRange`、`@lowestInstanceTypeWithinParentClassRange`、`@reserveBitsInInstanceType`、および`@apiExposedInstanceTypeValue`の各注釈は、インスタンスタイプの生成に影響します。通常はこれらを無視しても問題ありません。Torqueは、`v8::internal::InstanceType`列挙内のすべてのクラスに対してコンパイル時にユニークな値を割り当て、V8がJSヒープ内の任意のオブジェクトの型を実行時に判断できるようにします。Torqueのインスタンスタイプの割り当ては大半のケースで十分ですが、一部のケースでは、特定のクラスのインスタンスタイプをビルド間で安定させたい場合、または親クラスのインスタンスタイプ範囲の始点または終点に配置したい場合、Torque外部で定義可能な予約値の範囲が必要な場合があります。

##### クラスフィールド

上記の例のような単純な値だけでなく、クラスフィールドにインデックス付きデータを含めることもできます。以下はその例です:

```torque
extern class CoverageInfo extends HeapObject {
  const slot_count: int32;
  slots[slot_count]: CoverageInfoSlot;
}
```

これは、`CoverageInfo`のインスタンスが`slot_count`のデータに基づいてさまざまなサイズであることを意味します。

C++とは異なり、Torqueはフィールド間に自動的にパディングを追加しません。代わりに、フィールドが正しく整列されていない場合はエラーを発生させます。また、Torqueは強いフィールド、弱いフィールド、およびスカラーフィールドが同じカテゴリの他のフィールドと一緒にフィールド順に配置されることを要求します。

`const`は、フィールドが実行時に変更できない（少なくとも簡単には変更できない）ことを意味します。Torqueでは、これを試みるとコンパイルが失敗します。これは、長さフィールドには良い考えです。これらは慎重にリセットされるべきであり、解放されたスペースを解放する必要がある場合もあり、マーキングスレッドとのデータ競合を引き起こす可能性があります。
実際、Torqueはインデックス付きデータに使用される長さフィールドが`const`であることを要求します。

`weak`はフィールド宣言の先頭にあると、そのフィールドがカスタムの弱参照であることを意味します。ただし、弱フィールドに対する`MaybeObject`タグ付けメカニズムとは異なります。
さらに、`weak`は`kEndOfStrongFieldsOffset`や`kStartOfWeakFieldsOffset`といった定数の生成に影響します。これは一部のカスタム`BodyDescriptor`で使用されるレガシー機能であり、現在もまだ`weak`とマークされたフィールドをまとめて配置する必要があります。Torqueがすべての`BodyDescriptor`を生成できるようになったら、このキーワードを削除する予定です。

フィールドに格納されるオブジェクトが`MaybeObject`形式の弱参照（2番目のビットがセットされているもの）である可能性がある場合は、型に`Weak<T>`を使用すべきであり、`weak`キーワードを使用しては**いけません**。この規則に対する例外はいくつか存在します。例えば、`Map`のフィールドのように、強参照型と弱参照型の両方を含む場合や、弱セクションへの含まれるために`weak`としてもマークされている場合:

```torque
  weak transitions_or_prototype_info: Map|Weak<Map>|TransitionArray|
      PrototypeInfo|Smi;
```

`@if`と`@ifnot`は、特定のビルド構成で含まれるべきフィールドをマークしますが、他の構成には含まれません。これらは`src/torque/torque-parser.cc`にある`BuildFlags`のリストから値を受け取ります。

##### Torque外で完全に定義されたクラス

一部のクラスはTorqueで定義されていませんが、Torqueはインスタンスタイプを割り当てる責任があるため、すべてのクラスを知っている必要があります。この場合、クラスはボディなしで宣言することができます。この場合、Torqueはインスタンスタイプ以外のものを生成しません。例:

```torque
extern class OrderedHashMap extends HashTable;
```

#### シェイプ

`shape`を定義することは、`class`を定義するのと同様ですが、`class`の代わりにキーワード`shape`を使用します。`shape`は、`JSObject`のサブタイプで、インオブジェクトプロパティの時点での配置を表します（仕様上ではこれは「データプロパティ」で、「内部スロット」ではありません）。`shape`は自身のインスタンスタイプを持ちません。特定のシェイプを持つオブジェクトは辞書モードに入る可能性があり、プロパティを別のバックストアに移動するため、いつでもそのシェイプを失うことがあります。

#### 構造体

`struct`はデータのコレクションをまとめて簡単に受け渡すためのものです（`Struct`という名前のクラスとは完全に無関係です）。クラスのように、データに対して操作するマクロを含めることができます。クラスとは異なり、ジェネリックもサポートしています。その構文はクラスに似ています:

```torque
@export
struct PromiseResolvingFunctions {
  resolve: JSFunction;
  reject: JSFunction;
}

struct ConstantIterator<T: type> {
  macro Empty(): bool {
    return false;
  }
  macro Next(): T labels _NoMore {
    return this.value;
  }

  value: T;
}
```

##### Structのアノテーション

`@export`とマークされた任意のstructは、生成されたファイル`gen/torque-generated/csa-types.h`に予測可能な名前で含まれます。その名前には`TorqueStruct`が先頭につけられるため、`PromiseResolvingFunctions`は`TorqueStructPromiseResolvingFunctions`になります。

Structのフィールドは`const`としてマークすることができ、これは書き込まれないことを意味します。ただし、struct全体が上書きされることは可能です。

##### Structsをクラスフィールドとして使用

Structはクラスフィールドの型として使用することができます。その場合、クラス内のデータはパッキングされ、順序付けられたデータとして表されます（それ以外の場合、structには特別なアラインメント要件はありません）。これは特にクラス内のインデックス付きフィールドに便利です。例えば、`DescriptorArray`は3つの値を持つstructの配列を含んでいます:

```torque
struct DescriptorEntry {
  key: Name|Undefined;
  details: Smi|Undefined;
  value: JSAny|Weak<Map>|AccessorInfo|AccessorPair|ClassPositions;
}

extern class DescriptorArray extends HeapObject {
  const number_of_all_descriptors: uint16;
  number_of_descriptors: uint16;
  raw_number_of_marked_descriptors: uint16;
  filler16_bits: uint16;
  enum_cache: EnumCache;
  descriptors[number_of_all_descriptors]: DescriptorEntry;
}
```

##### 参照とスライス

`Reference<T>`および`Slice<T>`は、ヒープオブジェクト内のデータへのポインタを表す特殊なstructです。両方ともオブジェクトとオフセットを含みます。`Slice<T>`はさらに長さを含みます。これらのstructを直接構築する代わりに、特別な構文を使用することができます:`&o.x`はオブジェクト`o`内のフィールド`x`への`Reference`を作成し、`x`がインデックス付きフィールドである場合はデータへの`Slice`を作成します。参照とスライスの両方について、定数版と可変版があります。参照については、これらのタイプは`&T`および`const &T`として、可変および定数の参照をそれぞれ表します。可変性はそれらが指すデータを指しますが、必ずしもグローバルには保持されない可能性があります。つまり、可変データへの定数参照を作成することができます。スライスの場合、タイプに特別な構文はなく、2つのバージョンは`ConstSlice<T>`および`MutableSlice<T>`として書かれます。参照はC++と同様に`*`または`->`でデリファレンスできます。

タグ付けされていないデータへの参照およびスライスは、オフヒープデータを指すこともできます。

#### ビットフィールド構造体

`bitfield struct`は、単一の数値にパックされた数値データのコレクションを表します。構文は通常の`struct`と似ていますが、各フィールドにためのビット数が追加されます。

```torque
bitfield struct DebuggerHints extends uint31 {
  side_effect_state: int32: 2 bit;
  debug_is_blackboxed: bool: 1 bit;
  computed_debug_is_blackboxed: bool: 1 bit;
  debugging_id: int32: 20 bit;
}
```

ビットフィールド構造体（または他の数値データ）が`Smi`内に保存されている場合、`SmiTagged<T>`型を使用して表すことができます。

#### 関数ポインタの型

関数ポインタは、Torqueで定義された組み込み関数のみを指すことができます。これはデフォルトのABIを保証するためです。特にバイナリコードサイズを削減するために有用です。

関数ポインタの型は匿名（Cのように）ですが、型エイリアスにバインドすることができます（Cにおける`typedef`のように）。

```torque
type CompareBuiltinFn = builtin(implicit context: Context)(Object, Object, Object) => Number;
```

#### 特殊な型

`void`と`never`というキーワードで示される2つの特殊な型があります。`void`は値を返さない呼び出し可能なものの戻り型として使用され、`never`は実際には戻らず（つまり例外的な経路でのみ終了する）呼び出し可能なものの戻り型として使用されます。

#### 一時的な型

V8ではヒープオブジェクトはランタイムでレイアウトを変更することがあります。変更の対象となるオブジェクトレイアウトや、型システムにおける他の一時的な仮定を表現するために、Torqueは「一時的な型」という概念をサポートしています。抽象型を宣言する際に、キーワード`transient`を追加することで、その型を一時的な型としてマークします。

```torque
// JSArrayマップを持つHeapObjectで、グローバルNoElementsProtectorが無効化されていない場合に
// 高速にパックされた要素または高速に穴のある要素を持つ。
transient type FastJSArray extends JSArray
    generates 'TNode<JSArray>';
```

例えば、`FastJSArray`の場合、配列が辞書形式の要素に変更されたり、グローバル`NoElementsProtector`が無効化された場合、一時的な型は無効化されます。これをTorqueで表現するには、潜在的にそれを行う可能性のある呼び出し可能なすべてに`transitioning`と注釈を付けます。例えば、JavaScript関数を呼び出すことで任意のJavaScriptを実行できるため、それは`transitioning`です。

```torque
extern transitioning macro Call(implicit context: Context)
                               (Callable, Object): Object;
```

これが型システムで規制される方法は、変換操作を超えて一時的な型の値にアクセスすることが違法であるということです。

```torque
const fastArray : FastJSArray = Cast<FastJSArray>(array) otherwise Bailout;
Call(f, Undefined);
return fastArray; // 型エラー: fastArrayはここで無効です。
```

#### Enums

列挙型は、一連の定数を定義し、それらをC++のenumクラスに類似した名前の下にグループ化する手段を提供します。宣言は`enum`キーワードによって導入され、次の構文構造に従います。

```grammar
EnumDeclaration :
  extern enum IdentifierName ExtendsDeclaration opt ConstexprDeclaration opt { IdentifierName list+ (, ...) opt }
```

基本的な例は以下のようになります。

```torque
extern enum LanguageMode extends Smi {
  kStrict,
  kSloppy
}
```

この宣言は新しい型`LanguageMode`を定義し、`extends`節は基礎となる型、つまり列挙型の値を表すために使用されるランタイム型を指定します。この例では、`Smi`型が生成する`TNode<Smi>`です。`constexpr LanguageMode`は、生成されたCSAファイル内で列挙型のデフォルト名を置き換える`constexpr`節が指定されていないため、`LanguageMode`に変換されます。`extends`節が省略されると、Torqueは型の`constexpr`バージョンのみを生成します。`extern`キーワードは、この列挙型がC++で定義されていることをTorqueに伝えます。現在、`extern`列挙型のみがサポートされています。

Torqueは列挙型の各エントリに対して独自の型と定数を生成します。それらは列挙型の名前に一致する名前空間内に定義されます。`FromConstexpr<>`の必要な特殊化は、エントリの`constexpr`型を列挙型に変換するために生成されます。C++ファイル内でエントリの値は`<enum-constexpr>::<entry-name>`という形式で生成され、ここで`<enum-constexpr>`は列挙型のために生成された`constexpr`名です。上記の例では、これらは`LanguageMode::kStrict`と`LanguageMode::kSloppy`です。

Torqueの列挙型は`typeswitch`構文と非常によく連携します。なぜなら、値が独自の型を使用して定義されるからです。

```torque
typeswitch(language_mode) {
  case (LanguageMode::kStrict): {
    // ...
  }
  case (LanguageMode::kSloppy): {
    // ...
  }
}
```

もし列挙型が`.tq`ファイルで使用される値よりも多くの値を持つC++定義を含んでいる場合、Torqueはそのことを知る必要があります。これは、最後のエントリの後に`...`を追加して列挙型を「開いた」と宣言することで行われます。例えば、一部のオプションのみがTorque内で使用可能となる`ExtractFixedArrayFlag`を考えてみましょう。

```torque
enum ExtractFixedArrayFlag constexpr 'CodeStubAssembler::ExtractFixedArrayFlag' {
  kFixedDoubleArrays,
  kAllFixedArrays,
  kFixedArrays,
  ...
}
```

### Callables

CallableはJavaScriptやC++の関数に概念的には似ていますが、CSAコードやV8ランタイムと有用に相互作用できる追加のセマンティクスを持っています。Torqueは複数の種類のCallableを提供します：`macro`、`builtin`、`runtime`、および`intrinsic`。

```grammar
CallableDeclaration :
  MacroDeclaration
  BuiltinDeclaration
  RuntimeDeclaration
  IntrinsicDeclaration
```

#### `macro` Callable

マクロは生成されたCSA生成C++のチャンクに対応するCallableです。`macro`はTorqueで完全に定義される場合もあり、その場合CSAコードはTorqueによって生成されます。または、`extern`でマークされる場合があり、その場合は手書きのCSAコードをCodeStubAssemblerクラスで提供する必要があります。概念的には、呼び出し箇所でインライン化されるCSAコードのチャンクとして`macro`を考えると役立ちます。

`macro`宣言はTorqueで次の形式を取ります。

```grammar
MacroDeclaration :
   transitioning opt macro IdentifierName ImplicitParameters opt ExplicitParameters ReturnType opt LabelsDeclaration opt StatementBlock
  extern transitioning opt macro IdentifierName ImplicitParameters opt ExplicitTypes ReturnType opt LabelsDeclaration opt ;
```

すべての非`extern` Torque `macro`は、その`StatementBlock`本体を使用して、その名前空間の生成された`Assembler`クラスのCSA生成機能を作成します。このコードは、`code-stub-assembler.cc`にある他のコードと非常によく似ていますが、マシン生成されたためにやや読みにくいかもしれません。`extern`でマークされた`macro`はTorqueには本体が書かれておらず、手書きのC++ CSAコードにインターフェイスを提供し、それをTorqueから利用できるようにします。

`macro`定義は暗黙的および明示的なパラメータ、オプションの返り値型、およびオプションのラベルを指定します。パラメータと返り値型は以下で詳細に説明されますが、現時点ではこれらがTypeScriptのパラメータのように動作することを知っておくと十分です。それについては、TypeScriptドキュメントの関数型セクション[こちら](https://www.typescriptlang.org/docs/handbook/functions.html)に記載されています。

ラベルは、`macro`からの例外的な終了のためのメカニズムです。それらはCSAラベルに1:1で対応し、`macro`から生成されたC++メソッドの`CodeStubAssemblerLabels*`型のパラメータとして追加されます。その正確な意味については後述しますが、`macro`の宣言においては、カンマで区切られたラベルのリストが`labels`キーワードでオプションとして提供され、`macro`のパラメータリストと戻り値の型の後に配置されます。

以下は、`base.tq`からの外部およびTorqueで定義された`macro`の例です:

```torque
extern macro BranchIfFastJSArrayForCopy(Object, Context): never
    labels Taken, NotTaken;
macro BranchIfNotFastJSArrayForCopy(implicit context: Context)(o: Object):
    never
    labels Taken, NotTaken {
  BranchIfFastJSArrayForCopy(o, context) otherwise NotTaken, Taken;
}
```

#### `builtin`呼び出し可能

`builtin`は、完全にTorqueで定義されるか、または`extern`としてマークされる点で`macro`に似ています。Torqueベースの`builtin`の場合、`builtin`の本文はV8 `builtin`を生成するために使用され、これは他のV8の`builtin`と同様に呼び出すことができ、`builtin-definitions.h`に関連情報を自動的に追加します。`macro`と同様に、Torqueの`builtin`が`extern`としてマークされている場合、Torqueベースの本文は存在せず、既存のV8 `builtin`へのインターフェースのみが提供され、これによりTorqueコードから使用することが可能になります。

`builtin`のTorqueでの宣言形式は次の通りです:

```grammar
MacroDeclaration :
  transitioning opt javascript opt builtin IdentifierName ImplicitParameters opt ExplicitParametersOrVarArgs ReturnType opt StatementBlock
  extern transitioning opt javascript opt builtin IdentifierName ImplicitParameters opt ExplicitTypesOrVarArgs ReturnType opt ;
```

Torqueの`builtin`コードは1つのコピーのみ存在し、それは生成された`builtin`コードオブジェクト内にあります。`macro`とは異なり、Torqueコードから`builtin`を呼び出した場合、CSAコードは呼び出し元でインライン化されるのではなく、代わりにその`builtin`への呼び出しが生成されます。

`builtin`はラベルを持つことができません。

`builtin`の実装をコーディングする場合、`builtin`内の最終的な呼び出しである場合に限り、`builtin`またはランタイム関数への[tailcall](https://en.wikipedia.org/wiki/Tail_call)を作成することができます。この場合、コンパイラは新しいスタックフレームを作成しないようにする可能性があります。単に呼び出しの前に`tail`を追加するだけです。例: `tail MyBuiltin(foo, bar);`

#### `runtime`呼び出し可能

`runtime`はTorqueに対して外部の機能性へのインターフェースを提供できる点で`builtin`に似ています。しかし、CSAで実装される代わりに、`runtime`が提供する機能性は常に標準的なランタイムコールバックとしてV8で実装されなければなりません。

`runtime`のTorqueでの宣言形式は次の通りです:

```grammar
MacroDeclaration :
  extern transitioning opt runtime IdentifierName ImplicitParameters opt ExplicitTypesOrVarArgs ReturnType opt ;
```

`extern runtime`として指定された名前<i>IdentifierName</i>は、<code>Runtime::k<i>IdentifierName</i></code>によって指定されるランタイム関数に対応します。

`builtin`と同様に、`runtime`はラベルを持つことができません。

適切な場合、ランタイム関数をtailcallとして呼び出すことも可能です。単に呼び出しの前に`tail`キーワードを含めるだけです。

ランタイム関数宣言は、しばしば`runtime`と呼ばれる名前空間内に配置されます。この名前空間は同じ名前の`builtin`と区別し、呼び出し元でランタイム関数を呼び出していることをより明確にします。この命名規則を必須にすることを検討すべきです。

#### `intrinsic`呼び出し可能

`intrinsic`はTorqueで提供される内部機能性にアクセスするための`builtin`呼び出し可能です。それらはTorqueで宣言されるものの、実装はTorqueコンパイラが提供するため定義されません。`intrinsic`の宣言形式は次の文法を使用します:

```grammar
IntrinsicDeclaration :
  intrinsic % IdentifierName ImplicitParameters opt ExplicitParameters ReturnType opt ;
```

ほとんどの場合、“ユーザー”Torqueコードが`intrinsic`を直接使用する必要はほとんどありません。
以下はサポートされている`intrinsic`の例です:

```torque
// %RawObjectCastは、オブジェクトを目的の型であるかどうかを厳密にテストせずに、オブジェクトからそのサブタイプにキャストします。
// RawObjectCastはTorqueコードのどこでも（ほとんどの場合は）*絶対に*使用されるべきではありませんが、
// 適切なassert()による型アサーションの後にTorqueベースのUnsafeCast演算子で使用されます。
intrinsic %RawObjectCast<A: type>(o: Object): A;

// %RawPointerCastは、RawPtrを目的の型であるかどうかを厳密にテストせずに、そのサブタイプにキャストします。
intrinsic %RawPointerCast<A: type>(p: RawPtr): A;

// %RawConstexprCastは、コンパイル時定数値を別の値に変換します。
// ソース型と目的型の両方は'constexpr'でなければなりません。
// %RawConstexprCastは生成されたC++コード内でstatic_castに変換されます。
intrinsic %RawConstexprCast<To: type, From: type>(f: From): To;

// %FromConstexprは、constexpr値を非constexpr値に変換します。現在のところ、次の非constexpr型への変換のみがサポートされています: Smi, Number, String, uintptr, intptr, int32
intrinsic %FromConstexpr<To: type, From: type>(b: From): To;

// %Allocateは、V8のGCヒープから'size'分の未初期化オブジェクトを割り当て、その結果得られるオブジェクトポインタを
// 指定のTorqueクラスにより、コンストラクタがその後標準フィールドアクセスオペレーターを使用してオブジェクトを初期化できるようにします。
// このintrinsicはTorqueコードから呼び出されるべきではありません。それは、'new'演算子を脱糖化するときに内部的に使用されます。
// 内部的に使用されるものでTorqueコードから呼び出されるべきではありません。
// 内部的に使用されます。
intrinsic %Allocate<Class: type>(size: intptr): Class;
```

`builtin`や`runtime`と同様に、`intrinsic`はラベルを持つことはできません。

### 明示的なパラメーター

Torqueで定義されたCallable（Torqueの`macro`や`builtin`など）は、明示的なパラメータリストを持ちます。これらのリストは型付きTypeScript関数のパラメータリストを思わせる構文を使用しますが、Torqueではオプションのパラメータやデフォルトのパラメータをサポートしていません。さらに、Torqueで実装された`builtin`は、V8の内部JavaScript呼び出し規約を使用する`builtin`（例: `javascript`キーワードが付いているもの）である場合、任意にrestパラメータをサポートすることができます。

```grammar
ExplicitParameters :
  ( ( IdentifierName : TypeIdentifierName ) list* )
  ( ( IdentifierName : TypeIdentifierName ) list+ (, ... IdentifierName ) opt )
```

例としては次のようなものがあります。

```torque
javascript builtin ArraySlice(
    (implicit context: Context)(receiver: Object, ...arguments): Object {
  // …
}
```

### 暗黙的なパラメーター

TorqueのCallableは、[Scalaの暗黙的パラメーター](https://docs.scala-lang.org/tour/implicit-parameters.html)に似たものを使用して暗黙的なパラメーターを指定することができます。

```grammar
ImplicitParameters :
  ( implicit ( IdentifierName : TypeIdentifierName ) list* )
```

具体的には、`macro`は明示的なパラメーターに加えて暗黙的なパラメーターを宣言することができます。

```torque
macro Foo(implicit context: Context)(x: Smi, y: Smi)
```

CSAにマッピングする際、暗黙的パラメーターと明示的パラメーターは同じように処理され、共同のパラメーターリストを形成します。

暗黙的パラメーターは呼び出しの際に言及されず、暗黙的に渡されます: `Foo(4, 5)`。これが機能するためには、`Foo(4, 5)` は`context`という名前の値を提供するコンテキストで呼び出される必要があります。例:

```torque
macro Bar(implicit context: Context)() {
  Foo(4, 5);
}
```

Scalaとは対照的に、暗黙的パラメーターの名前が同一でない場合はこれを禁止します。

オーバーロード解決が混乱を招く可能性があるため、暗黙的パラメーターがオーバーロード解決に全く影響を与えないことを保証しています。すなわち、オーバーロードセットの候補を比較する際、呼び出しサイトで利用可能な暗黙的なバインディングを考慮しません。単一の最適なオーバーロードが見つかった後に、暗黙的パラメーターの暗黙的バインディングが利用可能かどうかを確認します。

暗黙的パラメーターを明示的パラメーターの左側に置くことはScalaとは異なりますが、CSAで`context`パラメーターを最初に置く既存の規約によりよく適合しています。

#### `js-implicit`

Torqueで定義されたJavaScriptリンク付きのbuiltinでは、`implicit`の代わりにキーワード`js-implicit`を使用する必要があります。引数は次の呼び出し規約の4つのコンポーネントに限定されます。

- context: `NativeContext`
- receiver: `JSAny` (JavaScriptでの`this`)
- target: `JSFunction` (JavaScriptでの`arguments.callee`)
- newTarget: `JSAny` (JavaScriptでの`new.target`)

すべてを宣言する必要はなく、使用したいものだけを宣言してください。例として、`Array.prototype.shift`のコードはこちらです。

```torque
  // https://tc39.es/ecma262/#sec-array.prototype.shift
  transitioning javascript builtin ArrayPrototypeShift(
      js-implicit context: NativeContext, receiver: JSAny)(...arguments): JSAny {
  ...
```

`context`引数が`NativeContext`である点に注意してください。これは、V8のbuiltinが常にそのクロージャの中にネイティブコンテキストを埋め込むためです。このjs-implicit規約でこれをエンコードすることで、関数コンテキストからネイティブコンテキストをロードする操作を排除することができます。

### オーバーロード解決

Torqueの`macro`や演算子（`macro`の別名）は、引数の型をオーバーロードすることができます。オーバーロード規則はC++の規則からインスパイアされています: オーバーロードは他のすべての代替よりも厳密に優れている場合に選択されます。これは、少なくとも1つのパラメーターで厳密に優れていて、他のすべてのパラメーターでより良いか等しく良い必要があることを意味します。

2つのオーバーロードの対応するパラメーターのペアを比較する場合、

- 以下の場合、それらは等しく良いと見なされます:
    - それらが等しい場合;
    - 両方が何らかの暗黙的変換を必要とする場合。
- 以下の場合、一方が他方より優れていると見なされます:
    - 一方が他方の厳密なサブタイプである場合;
    - 一方が暗黙的な変換を必要とせず、他方が必要とする場合。

すべての代替よりも厳密に優れているオーバーロードがない場合、これはコンパイルエラーを引き起こします。

### Deferredブロック

ステートメントブロックは任意で`deferred`としてマークすることができ、これはそのブロックが比較的まれに実行されることをコンパイラに示すシグナルとなります。コンパイラはこれらのブロックを関数の末尾に配置することを選択し、非遅延コード領域のキャッシュ局所性を向上させる場合があります。例えば、`Array.prototype.forEach`の実装コードでは、「高速」パスに留まるよう期待され、バイアウトケースはごく稀にしか取られません:

```torque
  let k: Number = 0;
  try {
    return FastArrayForEach(o, len, callbackfn, thisArg)
        otherwise Bailout;
  }
  label Bailout(kValue: Smi) deferred {
    k = kValue;
  }
```

別の例として、辞書形式の要素ケースが遅延とマークされることで、より可能性の高いケースのコード生成を改善する例を示します（`Array.prototype.join`の実装コードより）:

```torque
  if (IsElementsKindLessThanOrEqual(kind, HOLEY_ELEMENTS)) {
    loadFn = LoadJoinElement<FastSmiOrObjectElements>;
  } else if (IsElementsKindLessThanOrEqual(kind, HOLEY_DOUBLE_ELEMENTS)) {
    loadFn = LoadJoinElement<FastDoubleElements>;
  } else if (kind == DICTIONARY_ELEMENTS)
    deferred {
      const dict: NumberDictionary =
          UnsafeCast<NumberDictionary>(array.elements);
      const nofElements: Smi = GetNumberDictionaryNumberOfElements(dict);
      // <etc>...
```

## CSAコードをTorqueに移植する

[`Array.of`を移植したパッチ](https://chromium-review.googlesource.com/c/v8/v8/+/1296464)は、CSAコードをTorqueに移植する際の最低限の例として役立ちます。
