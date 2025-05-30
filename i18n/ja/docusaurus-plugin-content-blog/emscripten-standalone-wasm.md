---
title: "ウェブ外: Emscriptenを使用した単独のWebAssemblyバイナリ"
author: "Alon Zakai"
avatars: 
  - "alon-zakai"
date: 2019-11-21
tags: 
  - WebAssembly
  - tooling
description: "Emscriptenは、JavaScriptを必要としない単独のWasmファイルをサポートします。"
tweet: "1197547645729988608"
---
Emscriptenは常に、ウェブやNode.jsのような他のJavaScript環境へのコンパイルを最優先にしてきました。しかし、WebAssemblyがJavaScriptなしで使用され始めると、新しいユースケースが登場し、それに合わせてEmscriptenのJSランタイムに依存しない[**単独のWasm**](https://github.com/emscripten-core/emscripten/wiki/WebAssembly-Standalone)ファイルの生成をサポートするようになりました。この投稿では、その理由が興味深い点について説明します。

<!--truncate-->
## Emscriptenの単独モードの使用

まず、この新しい機能を使って何ができるか見てみましょう！[この記事](https://hacks.mozilla.org/2018/01/shrinking-webassembly-and-javascript-code-sizes-in-emscripten/)のように、2つの数字を加算する単一の関数をエクスポートする「Hello World」タイプのプログラムから始めます：

```c
// add.c
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
int add(int x, int y) {
  return x + y;
}
```

通常は、`emcc -O3 add.c -o add.js` を使用してこれをビルドし、`add.js` と `add.wasm` を生成します。しかし、今回は `emcc` にWasmのみを生成するよう指示します：

```
emcc -O3 add.c -o add.wasm
```

`emcc` がWasmだけを生成することを確認すると、それを「単独モード」にします。このモードでは、JavaScriptランタイムコードを一切使用せずに、可能な限り自立した形で実行できるWasmファイルが生成されます。

逆コンパイルした場合、非常に簡潔でたったの87バイトです！明らかな`add` 関数を含んでいます

```lisp
(func $add (param $0 i32) (param $1 i32) (result i32)
 (i32.add
  (local.get $0)
  (local.get $1)
 )
)
```

そして、もう一つの関数`_start`も含まれています。

```lisp
(func $_start
 (nop)
)
```

`_start` は [WASI](https://github.com/WebAssembly/WASI) 仕様の一部で、Emscriptenの単独モードはそれを実装してWASIランタイムでの実行を可能にします。（通常、`_start`はグローバル初期化を行いますが、ここでは必要ないため空です。）

### 独自のJavaScriptローダを記述する

このような単独のWasmファイルの利点の一つは、独自のJavaScriptを記述してロードして実行できる点です。これにより、使用ケースに応じて非常に最小限のコードにすることが可能です。例えば、Node.jsで以下のように記述できます：

```js
// load-add.js
const binary = require('fs').readFileSync('add.wasm');

WebAssembly.instantiate(binary).then(({ instance }) => {
  console.log(instance.exports.add(40, 2));
});
```

わずか4行！これを実行すると予想通り`42`が出力されます。この例は非常にシンプルですが、場合によってはあまり多くのJavaScriptが不要で、EmscriptenのデフォルトのJavaScriptランタイムよりも軽量な実装が可能です（Emscriptenのランタイムは多くの環境とオプションをサポートしています）。その実例として[zeux's meshoptimizer](https://github.com/zeux/meshoptimizer/blob/bdc3006532dd29b03d83dc819e5fa7683815b88e/js/meshopt_decoder.js)があります。わずか57行でメモリ管理や成長などを含みます！

### Wasmランタイムでの実行

独立したWasmファイルのもう一つの利点は、[wasmer](https://wasmer.io)、[wasmtime](https://github.com/bytecodealliance/wasmtime)、または[WAVM](https://github.com/WAVM/WAVM) のようなWasmランタイムで実行できる点です。例えば、以下のhello worldを考えてみましょう：

```cpp
// hello.cpp
#include <stdio.h>

int main() {
  printf("hello, world!\n");
  return 0;
}
```

これをどのランタイムでもビルドして実行できます：

```bash
$ emcc hello.cpp -O3 -o hello.wasm
$ wasmer run hello.wasm
hello, world!
$ wasmtime hello.wasm
hello, world!
$ wavm run hello.wasm
hello, world!
```

EmscriptenはできるだけWASI APIを使用するため、このようなプログラムは100％WASIを利用し、WASIをサポートするランタイムで実行可能になります（後述するプログラムでWASI以上の機能を必要とする場合を除く）。

### Wasmプラグインのビルド

ウェブやサーバー以外では、Wasmのエキサイティングな分野は **プラグイン** です。例えば、画像編集ソフトではWasmプラグインを使用して、画像にフィルターやその他の操作を行うことができます。このタイプのユースケースでは、これまでの例のように単独のWasmバイナリが必要ですが、埋め込みアプリケーションの適切なAPIも持つ必要があります。

プラグインは動的ライブラリと関連していることがあり、動的ライブラリはそれを実装するための一つの方法です。Emscriptenは[SIDE_MODULE](https://github.com/emscripten-core/emscripten/wiki/Linking#general-dynamic-linking)オプションを使用して動的ライブラリをサポートしており、これがWasmプラグインを構築する方法となっていました。しかし、ここで説明する新しいスタンドアロンWasmオプションは、いくつかの点でそれを改善します。第一に、動的ライブラリでは再配置可能なメモリが必要であり、それが不要な場合（ロード後に他のWasmにリンクしない場合）はオーバーヘッドが発生します。第二に、スタンドアロン出力はWasmランタイムで実行されるようにも設計されていることが、先に述べたように挙げられます。

ここまでの話では順調ですね: Emscriptenはこれまで通りJavaScript + WebAssemblyを出力することもできますし、さらにWebAssembly単体を出力することも可能になりました。これにより、JavaScriptが存在しない環境（例えばWasmランタイム）で実行したり、自分でカスタムJavaScriptローダーコードを作成することができます。それでは、背景と技術的な詳細について話しましょう！

## WebAssemblyの2種類の標準API

WebAssemblyは、インポートとして受け取ったAPIにのみアクセスできます。コアWasm仕様には具体的なAPIの詳細はありません。Wasmの現在の進化を考えると、人々がインポートして使用する主なAPIとして、3つのカテゴリが見込まれます：

- **Web API**: これはWasmプログラムがWeb上で使用するものです。このAPIは既存の標準化されたJavaScriptが使用できるAPIでもあります。現在は間接的にJSグルーコードを通じて呼び出されていますが、将来的には[インターフェイス型](https://github.com/WebAssembly/interface-types/blob/master/proposals/interface-types/Explainer.md)を用いて直接呼び出される予定です。
- **WASI API**: WASIは主にサーバー上でWasmのためのAPIを標準化することに焦点を当てています。
- **その他のAPI**: 様々なカスタム埋め込み環境が独自のアプリケーション特有のAPIを定義します。例えば、先ほどの例で挙げた画像編集ツールでは、視覚効果を行うAPIを実装するWasmプラグインのケースが該当します。注意点として、プラグインはネイティブ動的ライブラリのように「システム」APIにアクセスすることもあれば、非常にサンドボックス化され、まったくインポートがない場合（埋め込み環境がそのメソッドのみを呼び出す場合）もあります。

WebAssemblyは[2つの標準化されたAPI群](https://www.goodreads.com/quotes/589703-the-good-thing-about-standards-is-that-there-are-so)を持つ、という興味深い位置にあります。これは、一つがWeb向けであり、一方がサーバー向けであることから納得できます。これらの環境には異なる要求があるため、Node.jsがWeb上のJavaScriptと同一のAPIを持たないのと似た理由です。

しかし、Webやサーバー以外にも、特にWasmプラグインがあります。一例として、プラグインはWeb上のアプリケーション内で実行されることもあれば（[JSプラグインのように](https://www.figma.com/blog/an-update-on-plugin-security/#a-technology-change)）、Web以外のアプリケーション内でも実行されます。さらに、埋め込みアプリケーションの場所に関係なく、プラグイン環境はWeb環境でもサーバー環境でもありません。そのため、どのAPIセットが使用されるかはすぐには分かりません。これはポートされるコード、埋め込まれるWasmランタイムなどに依存する場合があります。

## 可能な限り統一を目指そう

Emscriptenがこの点で役立つ具体的な方法の一つは、WASI APIを可能な限り使用することで**不要な**APIの違いを避けることです。前述の通り、Web上ではEmscriptenコードはWeb APIに間接的にアクセスしますが、JavaScriptを通じて行われるため、そのJavaScript APIがWASIのように見える場合には、不要なAPIの違いを削減できます。このような場合、それと同じバイナリがサーバー上でも実行可能です。つまり、Wasmが情報をログに記録する際、以下のようにJSに呼び出す必要があります：

```js
wasm   =>   function musl_writev(..) { .. console.log(..) .. }
```

`musl_writev`は、[musl libc](https://www.musl-libc.org)がファイルディスクリプターにデータを書き込むためのLinuxシステムコールインターフェースの実装であり、それが適切なデータで`console.log`を呼び出す形になります。Wasmモジュールはその`musl_writev`をインポートし、それを呼び出します。これによりJSとWasm間でABIが定義されます。このABIは任意のもので（実際、Emscriptenはそれを最適化するために時間をかけて変更してきました）、これをWASIに一致するABIに置き換えると次のようになります：

```js
wasm   =>   function __wasi_fd_write(..) { .. console.log(..) .. }
```

これは大きな変更ではなく、ABIのリファクタリングが必要なだけで、JS環境で実行する際には大差ありません。しかし、この変更によりJSなしでもWasmを実行可能になります。なぜなら、そのWASI APIがWASIランタイムで認識されるためです！これが先ほど述べたスタンドアロンWasmの例が動作する方法であり、WASI APIを使用するようにEmscriptenをリファクタリングするだけで実現できます。

EmscriptenがWASI APIを使用するもう一つの利点は、実際の問題点を見つけてWASI仕様に貢献できる点です。たとえば、[WASIの"whence"定数を変更する](https://github.com/WebAssembly/WASI/pull/106)ことが有益であると考えられることを発見したり、[コードサイズ](https://github.com/WebAssembly/WASI/issues/109)や[POSIX互換性](https://github.com/WebAssembly/WASI/issues/122)に関する議論を開始したりしました。

Emscriptenが可能な限りWASIを使用することは、Web、サーバー、プラグイン環境をターゲットにした単一のSDKをユーザーに提供するのにも役立ちます。Emscriptenだけがそれを可能にしているわけではなく、WASI SDKの出力も[WASI Web Polyfill](https://wasi.dev/polyfill/)やWasmerの[wasmer-js](https://github.com/wasmerio/wasmer-js)を使用してWebで実行できますが、EmscriptenのWeb出力はよりコンパクトであるため、Webパフォーマンスを妥協せずに単一のSDKを使用可能にします。

ところで、Emscriptenを使って1つのコマンドで独立したWasmファイルをオプションのJSと共に生成することができます：

```
emcc -O3 add.c -o add.js -s STANDALONE_WASM
```

これにより、`add.js` と `add.wasm` が生成されます。Wasmファイルは以前にWasmファイルのみを単独で生成した場合と同様に独立しています（`-o add.wasm` を指定した際に `STANDALONE_WASM` が自動的に設定される）。しかし、今回はそれに加えてJSファイルが生成され、これを読み込んで実行できます。このJSは、独自のJSコードを書きたくない場合にWeb上でWasmを実行するのに役立ちます。

## *非*独立型Wasmは必要か？

`STANDALONE_WASM` フラグはなぜ存在するのか？理論的にはEmscriptenが常に `STANDALONE_WASM` を設定することも可能で、それがより簡単です。しかし、独立したWasmファイルはJSに依存することができず、それにはいくつかの欠点があります：

- Wasmのインポートとエクスポート名を最適化することができません。最適化は両側、つまりWasmとそれをロードする側が一致している場合のみ動作します。
- 通常、WasmメモリはJS内で作成され、JSが起動中に使用を開始できるため、並行して作業を行うことができます。しかし、独立型WasmではメモリをWasm内で作成する必要があります。
- いくつかのAPIはJSで行う方が簡単です。たとえば、Cのアサーションが失敗した時に呼び出される[`__assert_fail`](https://github.com/emscripten-core/emscripten/pull/9558)は通常[JSで実装されています](https://github.com/emscripten-core/emscripten/blob/2b42a35f61f9a16600c78023391d8033740a019f/src/library.js#L1235)。これはたった1行で記述され、JS関数が呼び出されるとしても、全体のコードサイズはかなり小さいです。一方、独立ビルドではJSに依存することができないため、[muslの`assert.c`](https://github.com/emscripten-core/emscripten/blob/b8896d18f2163dbf2fa173694eeac71f6c90b68c/system/lib/libc/musl/src/exit/assert.c#L4)を使用します。これには`fprintf`を使用するため、多くのCの`stdio`サポートを引き込む結果となり、間接的な呼び出しを含むため未使用機能を削除することが難しくなります。全体として、こうした詳細が総コードサイズに大きな違いをもたらします。

Webでもそれ以外でも実行したい場合、かつコードサイズおよび起動時間を100%最適化したい場合は、`-s STANDALONE` の有無で2つの別々のビルドを作成する必要があります。これはフラグを切り替えるだけで非常に簡単です！

## 必要なAPIの違い

Emscriptenは可能な限りWASI APIを使用して、**不要な**APIの違いを回避しようとしています。しかし、**必要な**違いはあるのでしょうか？残念ながら、あります。一部のWASI APIはトレードオフを必要とします。例えば：

- WASIはさまざまなPOSIX機能をサポートしていません。例えば[ユーザー/グループ/ワールドファイル権限](https://github.com/WebAssembly/WASI/issues/122)です。その結果、例えば(Linuxシステムの)`ls`を完全に実装することはできません（詳細はリンクに記載されています）。Emscriptenの既存のファイルシステム層はこれらの機能の一部をサポートしているため、すべてのファイルシステム操作にWASI APIを使用する場合は[一部のPOSIXサポートが失われる](https://github.com/emscripten-core/emscripten/issues/9479#issuecomment-542815711)ことになります。
- WASIの`path_open`は、Wasm自体に余分な権限処理を強制するために[コードサイズでコストが発生します](https://github.com/WebAssembly/WASI/issues/109)。このコードはWeb上では不要です。
- WASIは[メモリ増加の通知API](https://github.com/WebAssembly/WASI/issues/82)を提供していないため、JSランタイムはメモリが増加したかどうかを常にチェックし、それを毎回インポートおよびエクスポートの際に更新する必要があります。このオーバーヘッドを回避するために、Emscriptenは通知APIである`emscripten_notify_memory_growth`を提供しています。このAPIは、以前述べたzeuxのmeshoptimizerの[わずか1行のコード](https://github.com/zeux/meshoptimizer/blob/bdc3006532dd29b03d83dc819e5fa7683815b88e/js/meshopt_decoder.js#L10)で実装されていることがわかります。

将来的には、WASIがより多くのPOSIXサポートやメモリ増加通知などを追加する可能性があります。WASIはまだ非常に実験的であり、大きく変更されることが予測されています。現状では、Emscriptenが特定の機能を使用している場合、100%WASIバイナリを生成することはありません。特に、ファイルのオープンではWASIではなくPOSIX方式を使用します。そのため、`fopen`を呼び出す場合、結果のWasmファイルは100%WASIではありません。しかし、`printf`のみを使用する場合（すでに開いている`stdout`上で操作する）、これは100%WASIになります。これは冒頭で見た「Hello World」例のように、Emscriptenの出力がWASIランタイムで動作する場合です。

もしユーザーに役立つ場合は、コードサイズを犠牲にして厳密なWASI準拠を実現する`PURE_WASI`オプションを追加することも可能ですが、それが緊急でない場合（これまで見たほとんどのプラグインユースケースでは完全なファイルI/Oを必要としていません）、Emscriptenがこれらの非WASI APIを削除できるようにWASIの改善を待つのも良いでしょう。それが最善の結果であり、上記リンクで示されているように、私たちはその方向に向けて取り組んでいます。

しかしながら、仮にWASIが改善されたとしても、前述したようにWasmには2つの標準化されたAPIが存在するという事実は避けられません。将来的には、Emscriptenがインターフェース型を使用して直接Web APIを呼び出すことになると考えています。これは、以前の`musl_writev`の例のように、一度WASI風のJS APIを利用してからWeb APIを呼び出す方法よりもコンパクトになるためです。この点において、ポリフィルや何らかの変換層を導入すれば支援は可能ですが、不必要にそれを使用したくはありません。そのため、WebとWASI環境それぞれに対して別々のビルドが必要になります。（これは多少残念なことです。理論的には、WASIがWeb APIのスーパーセットであれば回避できたはずですが、明らかにそれはサーバー側の妥協を意味することになったでしょう。）

## 現在の状況

かなり多くの機能がすでに動作しています！主な制限は次の通りです:

- **WebAssemblyの制限**: C++例外、setjmp、pthreadなどの機能はWasmの制限によりJavaScript依存となっており、現時点では良い非JS代替がありません。（Emscriptenが一部を[Asyncifyを使用して](https://www.youtube.com/watch?v=qQOP6jqZqf8&list=PLqh1Mztq_-N2OnEXkdtF5yymcihwqG57y&index=2&t=0s)サポートし始める可能性があります。または、[ネイティブなWasm機能](https://github.com/WebAssembly/exception-handling/blob/master/proposals/Exceptions.md)がVMに到着するのを待つかもしれません。）
- **WASIの制限**: OpenGLやSDLのようなライブラリやAPIの対応するWASI APIがまだありません。

これら全てをEmscriptenのスタンドアローンモードで使用することは**可能**ですが、出力にはJSランタイムコードへの呼び出しが含まれます。その結果、完全なWASIにはなりません（同様の理由で、これらの機能はWASI SDKでも動作しません）。これらのWasmファイルはWASIランタイムでは動作しませんが、Web上で使用することができ、自分自身のJSランタイムを作成することもできます。また、それらをプラグインとして使用することも可能です。例えば、ゲームエンジンにはOpenGLを使用してレンダリングするプラグインを持たせることができ、開発者はそれらをスタンドアローンモードでコンパイルして、エンジンのWasmランタイム内でOpenGLのインポートを実装します。スタンドアローンWasmモードはここでも有用で、Emscriptenが可能な限りスタンドアローンな出力を生成します。

また、JavaScriptではない代替が**存在**するにもかかわらず、まだ変換されていないAPIも見つけるかもしれません。作業は引き続き進行中ですので、どうぞ[バグを報告してください](https://github.com/emscripten-core/emscripten/issues)。そして、いつでもお手伝いを歓迎します！
