---
title: 'V8の埋め込みを始める'
description: 'この文書は、いくつかの主要なV8の概念を紹介し、V8コードを始めるための「Hello World」例を提供します。'
---
この文書は、いくつかの主要なV8の概念を紹介し、V8コードを始めるための「Hello World」例を提供します。

## 対象読者

この文書は、C++アプリケーション内にV8 JavaScriptエンジンを埋め込みたいと考えているC++プログラマーを対象としています。これにより、アプリケーションのC++オブジェクトやメソッドをJavaScriptで使用できるようにし、JavaScriptのオブジェクトや関数をC++アプリケーションで使用できるようにする方法を学べます。

## Hello World

[Hello Worldの例](https://chromium.googlesource.com/v8/v8/+/branch-heads/11.9/samples/hello-world.cc)を見てみましょう。この例では、文字列引数としてJavaScript文を受け取り、それをJavaScriptコードとして実行し、その結果を標準出力に表示します。

まず、いくつかの主要な概念を説明します:

- アイソレート（isolate）は、その独自のヒープを持つ仮想マシンインスタンスです。
- ローカルハンドル（local handle）はオブジェクトへのポインタです。すべてのV8オブジェクトはハンドルを使用してアクセスされます。これはV8のガベージコレクタの動作方式のために必要です。
- ハンドルスコープ（handle scope）は任意の数のハンドルを格納するコンテナと考えることができます。ハンドルを使用し終わったら、それぞれのハンドルを個別に削除する代わりに、それらのスコープを削除するだけで済みます。
- コンテキスト（context）は、単一のV8インスタンス内で分離した関連性のないJavaScriptコードを実行できる実行環境です。どのコンテキストでJavaScriptコードを実行したいかを明示的に指定する必要があります。

これらの概念については、[上級ガイド](/docs/embed#advanced-guide)でさらに詳しく説明されています。

## サンプルを実行する

以下の手順に従って、自分でサンプルを実行してみてください:

1. [Gitの手順](/docs/source-code#using-git)に従ってV8のソースコードをダウンロードします。
2. このHello Worldの例の手順は、V8 v13.1で最後にテストされています。このブランチを以下のコマンドでチェックアウトできます: `git checkout branch-heads/13.1 -b sample -t`
3. ヘルパースクリプトを使用してビルド構成を作成します:

    ```bash
    tools/dev/v8gen.py x64.release.sample
    ```

    ビルド設定を調べて手動で編集するには、次のコマンドを実行します:

    ```bash
    gn args out.gn/x64.release.sample
    ```

4. Linuxの64ビット環境で静的ライブラリをビルドします:

    ```bash
    ninja -C out.gn/x64.release.sample v8_monolith
    ```

5. ビルドプロセスで作成された静的ライブラリにリンクしながら、`hello-world.cc`をコンパイルします。たとえば、GNUコンパイラーとLLDリンカーを使用して64ビットLinuxで次のようにします:

    ```bash
    g++ -I. -Iinclude samples/hello-world.cc -o hello_world -fno-rtti -fuse-ld=lld -lv8_monolith -lv8_libbase -lv8_libplatform -ldl -Lout.gn/x64.release.sample/obj/ -pthread -std=c++20 -DV8_COMPRESS_POINTERS -DV8_ENABLE_SANDBOX
    ```

6. 複雑なコードの場合、ICUデータファイルがないとV8が動作しません。このファイルをバイナリが保存されている場所にコピーします:

    ```bash
    cp out.gn/x64.release.sample/icudtl.dat .
    ```

7. コマンドラインで`hello_world`実行可能ファイルを実行します。例として、LinuxでV8ディレクトリ内で次のコマンドを実行します:

    ```bash
    ./hello_world
    ```

8. `Hello, World!`が出力されます。やったね！
   注意: 2024年11月現在、プロセスの起動中にセグフォールトが発生する可能性もあります。調査中です。問題に遭遇した場合、その原因を突き止められたら、[issue 377222400](https://issues.chromium.org/issues/377222400)にコメントするか、[パッチを提出](https://v8.dev/docs/contribute)してください。

最新のブランチと同期している例を探している場合は、[`hello-world.cc`](https://chromium.googlesource.com/v8/v8/+/main/samples/hello-world.cc)をチェックしてください。これは非常にシンプルな例で、スクリプトを文字列として実行する以上のことを行いたい場合があります。[以下の上級ガイド](#advanced-guide)にV8埋め込みに関するさらなる情報があります。

## 他のサンプルコード

以下のサンプルはソースコードのダウンロードの一部として提供されています。

### [`process.cc`](https://github.com/v8/v8/blob/main/samples/process.cc)

このサンプルは、仮想的なHTTPリクエスト処理アプリケーション（たとえば、Webサーバーの一部になる可能性があるもの）をスクリプタブルに拡張するためのコードを提供します。JavaScriptスクリプトを引数として受け取り、その中には`Process`という関数が必要です。このJavaScriptの`Process`関数は、たとえばサーバー上で提供される各ページへのアクセス数を収集するなどの目的で使用できます。

### [`shell.cc`](https://github.com/v8/v8/blob/main/samples/shell.cc)

このサンプルは、ファイル名を引数として受け取り、その内容を読み取って実行します。また、コマンドプロンプトを含み、JavaScriptコードスニペットを入力して実行することもできます。このサンプルでは、`print`のような追加関数をオブジェクトや関数テンプレートを使用してJavaScriptに追加しています。

## 上級ガイド

V8を単体の仮想マシンとして使用する方法や、ハンドル、スコープ、コンテキストなどの主要なV8の概念に慣れたところで、これらの概念についてさらに議論し、独自のC++アプリケーションにV8を組み込むために重要なその他の概念をいくつか紹介します。

V8 APIは、スクリプトのコンパイルと実行、C++メソッドとデータ構造へのアクセス、エラー処理、セキュリティチェックを有効にする機能を提供します。あなたのアプリケーションは、他のC++ライブラリと同じようにV8を利用することができます。あなたのC++コードは、ヘッダー`include/v8.h`を含むことでV8 APIにアクセスします。

### ハンドルとガベージコレクション

ハンドルは、JavaScriptオブジェクトがヒープ内にある場所への参照を提供します。V8のガベージコレクターは、もうアクセスできないオブジェクトが使用していたメモリを回収します。ガベージコレクションプロセス中、ガベージコレクターはしばしばオブジェクトをヒープ内の異なる場所に移動します。ガベージコレクターがオブジェクトを移動する際には、そのオブジェクトを指しているすべてのハンドルを新しい場所に更新します。

オブジェクトがJavaScriptからアクセスできず、そこへの参照のあるハンドルがない場合、そのオブジェクトはガベージと見なされます。ガベージコレクターは時々、ガベージと見なされるすべてのオブジェクトを削除します。V8のガベージコレクション機構は、V8の性能の鍵となる要素です。

ハンドルにはいくつかの種類があります：

- ローカルハンドルはスタック上に保持され、適切なデストラクターが呼び出されると削除されます。これらのハンドルの寿命はハンドルスコープによって決定され、多くの場合、関数呼び出しの開始時に作成されます。ハンドルスコープが削除されると、ガベージコレクターはそのスコープ内のハンドルで以前参照されていたオブジェクト（それがJavaScriptや他のハンドルからアクセスできなくなった場合）を解放できるようになります。このタイプのハンドルは、上記のHello Worldの例で使用されています。

    ローカルハンドルは`Local<SomeType>`クラスを持っています。

    **注意:** ハンドルスタックはC++のコールスタックの一部ではありませんが、ハンドルスコープはC++スタックに埋め込まれています。ハンドルスコープはスタック割り当てのみ可能であり、`new`で割り当てることはできません。

- 永続ハンドルはローカルハンドルと同様に、ヒープに割り当てられたJavaScriptオブジェクトへの参照を提供します。それには2つの種類があり、参照の寿命管理が異なります。一つの関数呼び出し以上の期間オブジェクトに対する参照を保持する必要がある場合や、ハンドルの寿命がC++スコープと一致しない場合は、永続ハンドルを使用してください。例えば、Google Chromeは永続ハンドルを使用してDocument Object Model (DOM)ノードを参照します。永続ハンドルは`PersistentBase::SetWeak`を使用して弱化することができ、ガベージコレクターがオブジェクトへの唯一の参照が弱い永続ハンドルのみである場合にコールバックをトリガーします。

    - `UniquePersistent<SomeType>`ハンドルは、C++のコンストラクターとデストラクターを使用して基盤となるオブジェクトの寿命を管理します。
    - `Persistent<SomeType>`はそのコンストラクターで構築できますが、明示的に`Persistent::Reset`でクリアする必要があります。

- ここで簡単に触れるだけの、ほとんど使用されることのないハンドルの種類もあります：

    - `Eternal`は、削除されることがないと予想されるJavaScriptオブジェクト用の永続ハンドルです。ガベージコレクターがそのオブジェクトの生存性を判定する必要がなくなるため、安価に使用できます。
    - `Persistent`と`UniquePersistent`の両方はコピーできないため、標準C++11より以前のライブラリコンテナの値としては適していません。`PersistentValueMap`と`PersistentValueVector`は、マップやベクトルのようなセマンティクスを持つ永続値のコンテナクラスを提供します。C++11の埋め込みコードにはこれらは不要です。なぜならC++11のムーブセマンティクスが基盤となる問題を解決しているためです。

もちろん、オブジェクトを作成するたびにローカルハンドルを作成すると、多くのハンドルが生成される可能性があります！これがハンドルスコープが非常に役立つところです。ハンドルスコープは多くのハンドルを保持するコンテナと考えることができます。ハンドルスコープのデストラクターが呼ばれると、そのスコープ内で作成されたすべてのハンドルがスタックから削除されます。予想される通り、これによりこれらのハンドルが指しているオブジェクトがガベージコレクターによってヒープから削除される資格を持つようになります。

[非常にシンプルなHello Worldの例](#hello-world)に戻ると、以下の図でハンドルスタックとヒープに割り当てられたオブジェクトを確認できます。`Context::New()`が`Local`ハンドルを返し、`Persistent`ハンドルを新たに作成して永続ハンドルの使用方法を示しています。

![](/_img/docs/embed/local-persist-handles-review.png)

デストラクタ `HandleScope::~HandleScope` が呼び出されると、ハンドルスコープが削除されます。削除されたハンドルスコープ内のハンドルによって参照されていたオブジェクトは、他に参照がない場合、次回のガベージコレクションで削除対象となります。ガベージコレクターは `source_obj` や `script_obj` オブジェクトをヒープから削除することもできます。これらはハンドルや JavaScript から到達可能な場所からの参照が失われているためです。コンテキストハンドルは永続的なハンドルであるため、ハンドルスコープが終了しても削除されません。コンテキストハンドルを削除する唯一の方法は、それに対して明示的に `Reset` を呼び出すことです。

:::note
**注意:** このドキュメント全体において、「ハンドル」という用語はローカルハンドルを指します。永続的なハンドルについて話す場合、その用語は完全な形で使用されます。
:::

このモデルにおける一般的な落とし穴の1つを認識することが重要です: *ハンドルスコープを宣言した関数からローカルハンドルを直接返すことはできません* 。もしそうすると、返そうとしているローカルハンドルは、関数が終了する直前にハンドルスコープのデストラクタによって削除されてしまいます。ローカルハンドルを返す正しい方法は、`HandleScope` の代わりに `EscapableHandleScope` を構築し、ハンドルスコープ上で `Escape` メソッドを呼び出して返したいハンドルの値を渡すことです。以下は実際の動作例です:

```cpp
// この関数は3つの要素 (x, y, z) を含む新しい配列を返します。
Local<Array> NewPointArray(int x, int y, int z) {
  v8::Isolate* isolate = v8::Isolate::GetCurrent();

  // 一時ハンドルを作成するためにハンドルスコープを使用します。
  v8::EscapableHandleScope handle_scope(isolate);

  // 新しい空の配列を作成します。
  v8::Local<v8::Array> array = v8::Array::New(isolate, 3);

  // 配列の作成時にエラーが発生した場合は空の結果を返します。
  if (array.IsEmpty())
    return v8::Local<v8::Array>();

  // 値を設定します。
  array->Set(0, Integer::New(isolate, x));
  array->Set(1, Integer::New(isolate, y));
  array->Set(2, Integer::New(isolate, z));

  // Escape を使用して値を返します。
  return handle_scope.Escape(array);
}
```

`Escape` メソッドは引数の値を囲んでいるスコープにコピーし、すべてのローカルハンドルを削除した後、安全に返せる新しいハンドルコピーを提供します。

### コンテキスト

V8において、コンテキストとは、単一のV8インスタンス内で別個で無関係なJavaScriptアプリケーションを実行できる実行環境です。任意のJavaScriptコードを実行したいコンテキストを明示的に指定する必要があります。

なぜこれが必要なのでしょうか？ JavaScriptはビルトインのユーティリティ関数やオブジェクトのセットを提供しており、JavaScriptコードによって変更される可能性があります。例えば、完全に無関係な2つのJavaScript関数が同じ方法でグローバルオブジェクトを変更した場合、予期せぬ結果が発生する可能性がかなり高くなります。

CPU時間とメモリの観点では、ビルトインオブジェクトの数を考慮すると、新しい実行コンテキストを作成する操作は高価であるように思われるかもしれません。ただし、V8の広範なキャッシュにより、最初に作成するコンテキストはやや高価ですが、後続のコンテキストははるかに安価になります。これは、最初のコンテキストはビルトインオブジェクトを作成し、ビルトインのJavaScriptコードを解析する必要がありますが、後続のコンテキストはそのコンテキスト用にビルトインオブジェクトを作成する必要があるだけだからです。V8スナップショット機能（ビルドオプション `snapshot=yes` で有効化され、これがデフォルト）を使用することで、最初のコンテキストを作成する時間が著しく最適化されます。スナップショットにはすでにコンパイルされたビルトインJavaScriptコードのコードが含まれるシリアル化されたヒープが含まれているためです。ガベージコレクションと共に、V8の広範なキャッシュはV8のパフォーマンスを支える重要な要素となっています。

コンテキストを作成すると、何度でもそのコンテキストに入ったり、退出したりすることができます。コンテキストAにいる間に別のコンテキストBに入ることも可能です。これにより、現在のコンテキストAがBに置き換えられます。Bから退出すると、Aが現在のコンテキストとして復元されます。以下にそのイメージを示します。

![](/_img/docs/embed/intro-contexts.png)

各コンテキストのビルトインユーティリティ関数やオブジェクトは個別に保たれることに注意してください。コンテキストを作成する際にセキュリティトークンを設定することも可能です。詳細については、[セキュリティモデル](#security-model) のセクションを参照してください。

V8でコンテキストを使用する動機は、ブラウザの各ウィンドウやiframeが独自の新しいJavaScript環境を持てるようにすることでした。

### テンプレート

テンプレートは、コンテキスト内でのJavaScript関数およびオブジェクトの設計図です。テンプレートを使用して、C++関数やデータ構造をJavaScriptオブジェクトでラッピングし、JavaScriptスクリプトで操作できるようにすることができます。例えば、Google Chromeはテンプレートを使用してC++のDOMノードをJavaScriptオブジェクトとしてラッピングし、グローバルネームスペースに関数をインストールします。同じテンプレートを使用して新しいコンテキストを作成することができます。必要な数だけテンプレートを作成することが可能ですが、特定のテンプレートは任意のコンテキスト内で1つしかインスタンス化できません。

JavaScriptでは、関数とオブジェクトの間に強い二面性があります。JavaやC++で新しい型のオブジェクトを作成する場合、通常は新しいクラスを定義します。JavaScriptでは、その代わりに新しい関数を作成し、その関数をコンストラクタとして使用してインスタンスを作成します。JavaScriptオブジェクトの構造と機能は、そのオブジェクトを構築した関数と密接に結びついています。この点はV8テンプレートの動作方法にも反映されています。テンプレートには以下の2種類があります。

- 関数テンプレート

    関数テンプレートは、1つの関数の設計図です。テンプレートを使用してJavaScript関数をインスタンス化したいコンテキスト内で、テンプレートの`GetFunction`メソッドを呼び出すことでJavaScriptインスタンスを作成します。また、C++コールバックを関数テンプレートに関連付けて、JavaScript関数インスタンスが呼び出されたときにそのコールバックが実行されるようにすることもできます。

- オブジェクトテンプレート

    各関数テンプレートには関連付けられたオブジェクトテンプレートがあります。これは、コンストラクタとしてこの関数を使用して作成されたオブジェクトを構成するために使用されます。オブジェクトテンプレートに関連付けることができる2種類のC++コールバックがあります:

    - アクセサコールバック: 特定のオブジェクトプロパティがスクリプトでアクセスされたときに実行されます
    - インターセプタコールバック: 任意のオブジェクトプロパティがスクリプトでアクセスされたときに実行されます

  [アクセサ](#accessors)と[インターセプタ](#interceptors)については、このドキュメント内で後ほど詳述します。

次のコード例は、グローバルオブジェクトのテンプレートを作成し、組み込みのグローバル関数を設定する方法を示しています。

```cpp
// グローバルオブジェクトのテンプレートを作成し、
// 組み込みのグローバル関数を設定します。
v8::Local<v8::ObjectTemplate> global = v8::ObjectTemplate::New(isolate);
global->Set(v8::String::NewFromUtf8(isolate, "log"),
            v8::FunctionTemplate::New(isolate, LogCallback));

// 各プロセッサは独自のコンテキストを持ち、異なるプロセッサが
// お互いに影響を与えません。
v8::Persistent<v8::Context> context =
    v8::Context::New(isolate, nullptr, global);
```

このサンプルコードは、`process.cc`ファイルの`JsHttpProcessor::Initializer`から引用されたものです。

### アクセサ

アクセサとは、JavaScriptスクリプトによってオブジェクトプロパティにアクセスされたときに値を計算して返すC++コールバックです。アクセサは`SetAccessor`メソッドを使用してオブジェクトテンプレートを通じて構成されます。このメソッドは、関連付けられたプロパティの名前と、スクリプトがそのプロパティを読み取ろうとしたり書き込もうとしたりする際に実行される2つのコールバックを受け取ります。

アクセサの複雑さは、操作しているデータの種類によって変わります:

- [静的なグローバル変数へのアクセス](#accessing-static-global-variables)
- [動的な変数へのアクセス](#accessing-dynamic-variables)

### 静的なグローバル変数へのアクセス

たとえば、C++の整数変数`x`と`y`があり、それをJavaScriptでグローバル変数として利用可能にしたいとします。そのためには、スクリプトがこれらの変数を読み書きするたびにC++アクセサ関数を呼び出す必要があります。これらのアクセサ関数は、C++の整数を`Integer::New`を使用してJavaScriptの整数に変換し、JavaScriptの整数を`Int32Value`を使用してC++の整数に変換します。以下に例を示します:

```cpp
void XGetter(v8::Local<v8::String> property,
              const v8::PropertyCallbackInfo<Value>& info) {
  info.GetReturnValue().Set(x);
}

void XSetter(v8::Local<v8::String> property, v8::Local<v8::Value> value,
             const v8::PropertyCallbackInfo<void>& info) {
  x = value->Int32Value();
}

// YGetter/YSetterはほぼ同じなので省略

v8::Local<v8::ObjectTemplate> global_templ = v8::ObjectTemplate::New(isolate);
global_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "x"),
                          XGetter, XSetter);
global_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "y"),
                          YGetter, YSetter);
v8::Persistent<v8::Context> context =
    v8::Context::New(isolate, nullptr, global_templ);
```

上記のコードでオブジェクトテンプレートはコンテキストと同時に作成されています。このテンプレートは事前に作成しておき、任意のコンテキストで使用することもできます。

### 動的な変数へのアクセス

前述の例では、変数は静的でグローバルでした。操作対象のデータがブラウザのDOMツリーのように動的だった場合はどうでしょう? 例えば、`x`と`y`がC++クラス`Point`のオブジェクトフィールドであると仮定します:

```cpp
class Point {
 public:
  Point(int x, int y) : x_(x), y_(y) { }
  int x_, y_;
}
```

JavaScriptで任意の数のC++`point`インスタンスを利用可能にするためには、各C++`point`に対応するJavaScriptオブジェクトを作成し、そのJavaScriptオブジェクトとC++インスタンスを接続する必要があります。これは外部値や内部オブジェクトフィールドを使って行われます。

まず、`point`ラッパーオブジェクト用のオブジェクトテンプレートを作成します:

```cpp
v8::Local<v8::ObjectTemplate> point_templ = v8::ObjectTemplate::New(isolate);
```

各JavaScriptの`point`オブジェクトは、ラッパーであるC++オブジェクトへの参照を内部フィールドとして保持します。これらのフィールドはJavaScript内からアクセスできず、C++コードからのみアクセスできるため、このように呼ばれます。オブジェクトに内部フィールドを持たせる数は、以下のようにオブジェクトテンプレートで設定します:

```cpp
point_templ->SetInternalFieldCount(1);
```

ここでは内部フィールド数を`1`に設定しており、オブジェクトは1つの内部フィールドを持ち、そのインデックスは`0`で、C++オブジェクトを指します。

`x`および`y`のアクセサをテンプレートに追加します:

```cpp
point_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "x"),
                         GetPointX, SetPointX);
point_templ->SetAccessor(v8::String::NewFromUtf8(isolate, "y"),
                         GetPointY, SetPointY);
```

次に、テンプレートの新しいインスタンスを作成し、内部フィールド`0`をポイント`p`の外部ラッパーに設定することで、C++のポイントをラップします。

```cpp
Point* p = ...;
v8::Local<v8::Object> obj = point_templ->NewInstance();
obj->SetInternalField(0, v8::External::New(isolate, p));
```

外部オブジェクトは、単に`void*`のラッパーです。外部オブジェクトは内部フィールドに参照値を保存するためだけに使用されます。JavaScriptオブジェクトはC++オブジェクトへの直接参照を持つことはできないため、外部値はJavaScriptからC++にアクセスするための「ブリッジ」として使用されます。この意味で、外部値はハンドルとは正反対であり、ハンドルはC++がJavaScriptオブジェクトを参照できるようにします。

`x`の`get`および`set`アクセサの定義は以下の通りです。`y`のアクセサの定義は、`x`を`y`に置き換える点を除いて同一です。

```cpp
void GetPointX(Local<String> property,
               const PropertyCallbackInfo<Value>& info) {
  v8::Local<v8::Object> self = info.Holder();
  v8::Local<v8::External> wrap =
      v8::Local<v8::External>::Cast(self->GetInternalField(0));
  void* ptr = wrap->Value();
  int value = static_cast<Point*>(ptr)->x_;
  info.GetReturnValue().Set(value);
}

void SetPointX(v8::Local<v8::String> property, v8::Local<v8::Value> value,
               const v8::PropertyCallbackInfo<void>& info) {
  v8::Local<v8::Object> self = info.Holder();
  v8::Local<v8::External> wrap =
      v8::Local<v8::External>::Cast(self->GetInternalField(0));
  void* ptr = wrap->Value();
  static_cast<Point*>(ptr)->x_ = value->Int32Value();
}
```

アクセサは、JavaScriptオブジェクトによってラップされた`point`オブジェクトへの参照を抽出し、関連フィールドを読み書きします。この方法により、これらの汎用アクセサは任意の数のラップされたポイントオブジェクトに対して使用できます。

### インターセプタ

スクリプトが任意のオブジェクトプロパティにアクセスするたびにコールバックを指定することもできます。これらはインターセプタと呼ばれます。効率性のため、インターセプタには2種類あります。

- *名前付きプロパティインターセプタ* - 文字列名でプロパティにアクセスする際に呼び出されます。ブラウザ環境での例は、`document.theFormName.elementName`です。
- *インデックス付きプロパティインターセプタ* - インデックス付きプロパティにアクセスする際に呼び出されます。ブラウザ環境での例は、`document.forms.elements[0]`です。

V8のソースコードに提供されているサンプル`process.cc`には、インターセプタ使用の例が含まれています。以下のコードスニペットでは、`SetNamedPropertyHandler`が`MapGet`および`MapSet`インターセプタを指定しています。

```cpp
v8::Local<v8::ObjectTemplate> result = v8::ObjectTemplate::New(isolate);
result->SetNamedPropertyHandler(MapGet, MapSet);
```

`MapGet`インターセプタは以下の通りです。

```cpp
void JsHttpRequestProcessor::MapGet(v8::Local<v8::String> name,
                                    const v8::PropertyCallbackInfo<Value>& info) {
  // このオブジェクトによってラップされたマップを取得します。
  map<string, string> *obj = UnwrapMap(info.Holder());

  // JavaScript文字列をstd::stringに変換します。
  string key = ObjectToString(name);

  // 標準STLイディオムを使用して値を検索します。
  map<string, string>::iterator iter = obj->find(key);

  // キーが存在しない場合、シグナルとして空のハンドルを返します。
  if (iter == obj->end()) return;

  // それ以外の場合、値を取得し、それをJavaScript文字列にラップします。
  const string &value = (*iter).second;
  info.GetReturnValue().Set(v8::String::NewFromUtf8(
      value.c_str(), v8::String::kNormalString, value.length()));
}
```

アクセサと同様に、指定されたコールバックはプロパティがアクセスされるたびに呼び出されます。アクセサとインターセプタの違いは、インターセプタがすべてのプロパティを処理するのに対し、アクセサは特定の1つのプロパティに関連付けられていることです。

### セキュリティモデル

「同一オリジンポリシー」（NetScape Navigator 2.0で初めて導入）は、ある「オリジン」から読み込まれたドキュメントやスクリプトが、別の「オリジン」からのドキュメントのプロパティを取得したり設定したりすることを防ぎます。「オリジン」という用語は、ここではドメイン名（例：`www.example.com`）、プロトコル（例：`https`）、およびポートの組み合わせとして定義されます。たとえば、`www.example.com:81`は`www.example.com`と同一オリジンではありません。同一オリジンと見なされるには、これら3つすべてが一致する必要があります。この保護がなければ、悪意あるウェブページが他のウェブページの整合性を侵害する可能性があります。

V8では、「オリジン」はコンテキストとして定義されます。呼び出しているコンテキスト以外のコンテキストへのアクセスはデフォルトでは許可されません。呼び出しているコンテキスト以外へのアクセスを許可するには、セキュリティトークンまたはセキュリティコールバックを使用する必要があります。セキュリティトークンは任意の値でよいですが、通常は他に存在しない正規の文字列であるシンボルが使用されます。コンテキストを設定するときに`SetSecurityToken`を使用してセキュリティトークンをオプションとして指定することができます。セキュリティトークンを指定しない場合、V8は新しく作成するコンテキストに対して自動的に1つ生成します。


グローバル変数へのアクセスを試みると、V8セキュリティシステムはまずアクセスされるグローバルオブジェクトのセキュリティトークンと、アクセスを試みるコードのセキュリティトークンとを比較します。トークンが一致する場合、アクセスが許可されます。トークンが一致しない場合、V8はアクセスを許可すべきかどうかを確認するためにコールバックを実行します。オブジェクトテンプレートの`SetAccessCheckCallbacks`メソッドを使用して、オブジェクトへのアクセスを許可するかどうかを指定できます。その後、V8セキュリティシステムはアクセスされるオブジェクトのセキュリティコールバックを取得し、別のコンテキストがアクセスできるかどうか確認するためにコールバックを実行します。このコールバックにはアクセスされるオブジェクト、アクセスされるプロパティの名前、アクセスの種類（例: 読み取り、書き込み、削除など）が渡され、許可するかどうかを返します。

このメカニズムはGoogle Chromeで実装されており、セキュリティトークンが一致しない場合には、以下のみのアクセスを許可する特別なコールバックが使用されます: `window.focus()`、`window.blur()`、`window.close()`、`window.location`、`window.open()`、`history.forward()`、`history.back()`、`history.go()`。

### 例外

何らかのエラーが発生した場合 — 例えば、スクリプトや関数が存在しないプロパティを読み取ろうとした場合、または関数が関数でないものを呼び出そうとした場合など — V8は例外を投げます。

操作が成功しなかった場合、V8は空のハンドルを返します。そのため、コードは実行を続行する前に返り値が空のハンドルでないことを確認する必要があります。空のハンドルかどうかを確認するには、`Local`クラスのパブリックメンバー関数`IsEmpty()`を使用します。

`TryCatch`を使用して例外をキャッチできます。例えば以下のように:

```cpp
v8::TryCatch trycatch(isolate);
v8::Local<v8::Value> v = script->Run();
if (v.IsEmpty()) {
  v8::Local<v8::Value> exception = trycatch.Exception();
  v8::String::Utf8Value exception_str(exception);
  printf("Exception: %s\n", *exception_str);
  // ...
}
```

返された値が空のハンドルであり、`TryCatch`を配置していない場合、コードは中断する必要があります。`TryCatch`を配置している場合、例外はキャッチされ、コードの処理が続行されます。

### 継承

JavaScriptは*クラスなし*のオブジェクト指向言語であり、そのため従来のオブジェクト指向言語とは異なり、古典的な継承ではなくプロトタイプの継承を使用します。この仕組みはC++やJavaなどの従来のオブジェクト指向言語に慣れたプログラマーにとっては少々紛らわしいかもしれません。

JavaやC++のようなクラスベースのオブジェクト指向言語は、クラスとインスタンスという2つの異なるエンティティの概念に基づいています。JavaScriptはプロトタイプベースの言語であるため、この区別を行いません: JavaScriptは単にオブジェクトを持つだけです。JavaScriptはクラス階層の宣言をネイティブにサポートしていませんが、JavaScriptのプロトタイプメカニズムにより、オブジェクトのすべてのインスタンスにカスタムプロパティやメソッドを簡単に追加することができます。JavaScriptではオブジェクトにカスタムプロパティを追加できます。例えば以下のように:

```js
// `bicycle`という名前のオブジェクトを作成
function bicycle() {}
// `bicycle`インスタンス`roadbike`を作成
var roadbike = new bicycle();
// `roadbike`に`wheels`というカスタムプロパティを定義
roadbike.wheels = 2;
```

この方法で追加されたカスタムプロパティは、そのオブジェクトのインスタンスにのみ存在します。例えば`bicycle()`の別のインスタンス`mountainbike`を作成すると、`mountainbike.wheels`は明示的に`wheels`プロパティが追加されない限り`undefined`を返します。

これが必要な場合もありますが、すべてのオブジェクトインスタンスにカスタムプロパティを追加する方が便利な場合もあります — すべての自転車には車輪があるはずです。この点でJavaScriptのプロトタイプオブジェクトは非常に役立ちます。プロトタイプオブジェクトを使用するためには、オブジェクトにカスタムプロパティを追加する前に`prototype`キーワードを参照します。以下のように:

```js
// まず、“bicycle”オブジェクトを作成
function bicycle() {}
// オブジェクトのプロトタイプに`wheels`プロパティを割り当て
bicycle.prototype.wheels = 2;
```

`bicycle()`のすべてのインスタンスには、事前に組み込まれた`wheels`プロパティが含まれるようになります。

V8ではテンプレートを使用して同じアプローチが適用されます。各`FunctionTemplate`には`PrototypeTemplate`メソッドがあり、関数のプロトタイプ用のテンプレートを提供します。`PrototypeTemplate`にプロパティを設定し、それらのプロパティにC++関数を関連付けることで、対応する`FunctionTemplate`のすべてのインスタンスにそれらが存在するようになります。例えば:

```cpp
v8::Local<v8::FunctionTemplate> biketemplate = v8::FunctionTemplate::New(isolate);
biketemplate->PrototypeTemplate().Set(
    v8::String::NewFromUtf8(isolate, "wheels"),
    v8::FunctionTemplate::New(isolate, MyWheelsMethodCallback)->GetFunction()
);
```

これにより、`biketemplate`のすべてのインスタンスには、プロトタイプチェーンに`wheels`メソッドが含まれます。このメソッドが呼び出されると、C++関数`MyWheelsMethodCallback`が呼び出されます。

V8の`FunctionTemplate`クラスには`Inherit()`というパブリックメンバー関数があり、ある関数テンプレートを別の関数テンプレートから継承させたい場合に呼び出すことができます。以下のように使用します:

```cpp
void Inherit(v8::Local<v8::FunctionTemplate> parent);
```
