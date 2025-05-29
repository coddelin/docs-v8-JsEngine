---
title: 'WebAssembly JavaScript Promise Integration APIの紹介'
description: 'この文書はJSPIを紹介し、それを使用して始めるための簡単な例を提供します'
author: 'Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl'
date: 2024-07-01
tags:
  - WebAssembly
---
JavaScript Promise Integration (JSPI) APIは、外部機能への_同期的_なアクセスを想定して書かれたWebAssemblyアプリケーションが、実際には_非同期的_に動作する環境でスムーズに操作できるようにします。

<!--truncate-->
この覚書はJSPI APIの主要な機能、そのアクセス方法、ソフトウェア開発方法、および試してみるべき例を概説します。

## 『JSPI』とは何のため？

非同期APIは、操作の_開始_とその_完了_を分離して動作します。後者は前者の後にしばらくしてから行われます。最も重要なのは、操作を開始した後にアプリケーションが実行を続け、操作が完了したときに通知されることです。

例として、`fetch` APIを使用すると、WebアプリケーションはURLに関連付けられた内容にアクセスできます。しかし、`fetch`関数はフェッチ結果を直接返すことはなく、その代わりに`Promise`オブジェクトを返します。フェッチ応答と元のリクエストの接続はその`Promise`オブジェクトに_コールバック_を添付することで再確立されます。コールバック関数は応答を検査し、データが存在する場合はそれを収集することができます。

多くの場合、C/C++（およびその他の多くの言語）アプリケーションは元々_同期的_なAPIを前提として作成されています。例えば、Posixの`read`関数はI/O操作が完了するまで終了しません:`read`関数は読み取りが完了するまで*ブロック*します。

しかし、ブラウザのメインスレッドをブロックすることは許可されておらず、多くの環境では同期プログラミングをサポートしていません。その結果、アプリケーションプログラマーが使いやすいAPIを求める願望と、I/Oを非同期コードで作成することを求める広いエコシステムとの間にミスマッチが生じます。これは、移植が高額な費用となる既存のレガシーアプリケーションにとって特に問題です。

JSPIは同期的なアプリケーションと非同期的なWeb APIの間のギャップを埋めるAPIです。これは非同期的なWeb API関数によって返される`Promise`オブジェクトをインターセプトし、WebAssemblyアプリケーションを_一時停止_させることによって機能します。非同期I/O操作が完了すると、WebAssemblyアプリケーションが_再開_されます。これにより、WebAssemblyアプリケーションが直線的なコードを使用して非同期操作を行い、その結果を処理できるようになります。

決定的に、JSPIを使用するにはWebAssemblyアプリケーション自体の変更はほとんど必要ありません。

### JSPIはどのように機能するのか？

JSPIはJavaScriptへの呼び出しで返された`Promise`オブジェクトをインターセプトし、WebAssemblyアプリケーションの主なロジックを一時停止させることで機能します。この`Promise`オブジェクトにはコールバックが付け加えられ、ブラウザのイベントループタスクランナーにより呼び出されると、停止していたWebAssemblyコードが再開されます。

さらに、WebAssemblyエクスポートが再構成され、元のエクスポートから返された値の代わりに`Promise`オブジェクトを返すようになります。この`Promise`オブジェクトはWebAssemblyアプリケーションによって返される値となります。WebAssemblyコードが一時停止された際に[^first]、エクスポート`Promise`オブジェクトがWebAssemblyへの呼び出しの値として返されます。

[^first]: WebAssemblyアプリケーションが複数回一時停止された場合、後続の一時停止はブラウザのイベントループに戻り、Webアプリケーションから直接は見えなくなります。

エクスポートされた`Promise`は元の呼び出しが完了すると解決されます：もし元のWebAssembly関数が通常の値を返した場合、エクスポートされた`Promise`オブジェクトはその値（JavaScriptオブジェクトに変換されたもの）で解決されます。もし例外が投げられた場合、エクスポートされた`Promise`オブジェクトは拒絶されます。

#### インポートとエクスポートのラッピング

これは、WebAssemblyモジュールのインスタンス化フェーズでインポートとエクスポートを_ラッピング_することで実現されます。関数ラッパーは通常の非同期インポートに停止動作を追加し、一時停止を`Promise`オブジェクトのコールバックにルーティングします。

WebAssemblyモジュールのすべてのエクスポートとインポートをラッピングする必要はありません。非同期APIを呼び出さない実行パスを持つエクスポートはラッピングするよりもそのままにしておく方が良いです。同様に、WebAssemblyモジュールのインポートすべてが非同期API関数へのものでない場合もあります。その場合もラッピングするべきではありません。

もちろん、これを可能にするために大量の内部メカニズムがあります。[^1] しかし、JavaScript言語やWebAssemblyそのものはJSPIによって変更されることはありません。その操作はJavaScriptとWebAssemblyの境界に限定されています。

Webアプリケーション開発者の視点から見ると、結果としてJavaScriptの非同期関数やPromiseの世界に参加するコード群が生成されます。これは、JavaScriptで書かれた他の非同期関数が動作する方法に類似しています。一方、WebAssembly開発者の視点からは、同期APIを用いてアプリケーションを構築しながらもWebの非同期エコシステムに参加できるようになります。

### 期待されるパフォーマンス

WebAssemblyモジュールの停止および再開時に使用されるメカニズムは本質的に一定時間であるため、JSPIの使用には高いコストが発生しないと予想されます。特に他の変換ベースのアプローチと比較して。

非同期API呼び出しで返される`Promise`オブジェクトをWebAssemblyに伝播するには一定量の作業が必要です。同様に、Promiseが解決されたときも、WebAssemblyアプリケーションを一定時間のオーバーヘッドで再開することができます。

しかし、ブラウザ内の他のPromiseスタイルのAPIと同様に、WebAssemblyアプリケーションが一時停止すると、ブラウザのタスクランナーによって再び「起動」されない限り再開されません。これには、WebAssembly計算を開始したJavaScriptコードの実行自体がブラウザに戻る必要があります。

### JSPIを使ってJavaScriptプログラムを一時停止できますか？

JavaScriptにはすでに非同期計算を表現するためのよく発達したメカニズム、つまり`Promise`オブジェクトと`async`関数の表記があります。JSPIはこれと良好に統合するように設計されていますが、それを置き換えるものではありません。

### JSPIを今日使うにはどうすればよいですか？

JSPIは現在、W3C WebAssembly WGによって標準化されています。本稿執筆時点で、標準化プロセスのフェーズ3にあり、2024年末までに完全な標準化を見込んでいます。

JSPIは現在、Linux、MacOS、WindowsおよびChromeOS上のChromeで利用可能であり、IntelおよびArmプラットフォームの64ビットと32ビット両方で動作します。[^firefox]

[^firefox]: JSPIはFirefoxナイトリー版でも利用可能です。about:configパネルで"`javascript.options.wasm_js_promise_integration`"をオンにして、再起動してください。

JSPIは現在2つの方法で使用可能です：[オリジントライアル](https://developer.chrome.com/origintrials/#/register_trial/1603844417297317889)を通じてと、ローカルでChromeフラグを通じてです。ローカルでテストするには、Chromeの`chrome://flags`に移動し、「Experimental WebAssembly JavaScript Promise Integration (JSPI)」を検索してチェックボックスをオンにします。効果を反映するには、提示されたように再起動してください。

APIの最新バージョンを利用するには、少なくともバージョン`126.0.6478.26`を使用する必要があります。安定性の更新が適用されることを確実にするために、Devチャネルの使用をお勧めします。また、WebAssemblyを生成するためにEmscriptenを使用する場合（推奨）、少なくともバージョン`3.1.61`を使用するべきです。

有効化後、JSPIを使用するスクリプトを実行できるはずです。以下に、JSPIを使用するC/C++で書かれたWebAssemblyモジュールを生成するためにEmscriptenの使用方法を示します。アプリケーションが異なる言語を含む場合（例えばEmscriptenを使用しない場合）、APIの動作を確認するために[提案](https://github.com/WebAssembly/js-promise-integration/blob/main/proposals/js-promise-integration/Overview.md)を読むことをお勧めします。

#### 制限事項

ChromeのJSPI実装は典型的な使用ケースをすでにサポートしています。しかし、まだ実験的と考えられているので、以下の制限事項に留意する必要があります：

- コマンドラインフラグの使用またはオリジントライアルへの参加が必要です。
- JSPIのエクスポートへの各呼び出しは固定サイズのスタックで実行されます。
- デバッグサポートはやや限られています。特に、Devツールパネルで発生するさまざまなイベントを確認するのが難しいかもしれません。JSPIアプリケーションのデバッグをより豊かにするサポートを提供することがロードマップに含まれています。

## 小さなデモ

動作を確認するために、簡単な例を試してみましょう。このCプログラムは非常に効率が悪い方法でフィボナッチを計算します。それはJavaScriptに加算を依頼し、さらに悪いことにJavaScriptの`Promise`オブジェクトを使用してそれを実行します:[^2]

```c
long promiseFib(long x) {
 if (x == 0)
   return 0;
 if (x == 1)
   return 1;
 return promiseAdd(promiseFib(x - 1), promiseFib(x - 2));
}
// promise an addition
EM_ASYNC_JS(long, promiseAdd, (long x, long y), {
  return Promise.resolve(x+y);
});
```

`promiseFib`関数自体はフィボナッチ関数の単純な再帰バージョンです。興味深い部分（私たちの視点から見て）は、JSPIを使用して2つのフィボナッチ計算の追加を行う`promiseAdd`の定義です。

`EM_ASYNC_JS`Emscriptenマクロを使用し、Cプログラム内で`promiseFib`関数をJavaScript内の関数として記述します。通常JavaScriptでの加算はPromiseを含まないため、Promiseを構築して強制する必要があります。

`EM_ASYNC_JS`マクロは、Promise の結果を通常の関数のようにアクセスできるようにするために必要なすべての接着コードを生成します。

小さなデモをコンパイルするには、Emscriptenの`emcc`コンパイラを使用します:[^4]

```sh
emcc -O3 badfib.c -o b.html -s JSPI
```

これによりプログラムがコンパイルされ、ロード可能なHTMLファイル（`b.html`）が作成されます。ここで最も特別なコマンドラインオプションは`-s JSPI`です。これにより、Promiseを返すJavaScriptインポートとインターフェースするコードを生成するオプションが起動されます。

生成された`b.html`ファイルをChromeにロードすると、以下に近い出力が表示されるはずです：

```
fib(0) 0μs 0μs 0μs
fib(1) 0μs 0μs 0μs
fib(2) 0μs 0μs 3μs
fib(3) 0μs 0μs 4μs
…
fib(15) 0μs 13μs 1225μs
```

これは単に最初の15個のフィボナッチ数と、それを計算するのにかかった平均マイクロ秒数です。それぞれの行の3つの時間値は、純粋なWebAssembly計算、JavaScript/WebAssembly混合計算、そしてサスペンドバージョンの計算にかかった時間を示しています。

`fib(2)`がプロミスのアクセスを含む最小の計算であり、`fib(15)`が計算されるまでに約1000回の`promiseAdd`呼び出しが行われています。これは、JSPI関数の実際のコストが約1μsであり、整数の加算よりもかなり高いですが、外部I/O関数へのアクセスに通常必要とされるミリ秒に比べると非常に小さいことを示唆しています。

## JSPIを使用したコードの遅延読み込み

次の例では、JSPIの多少驚くべき使い方である動的コード読み込みについて見ていきます。必要なコードを含むモジュールを`fetch`で取得しますが、その機能が最初に呼び出されるまで遅らせるアイデアです。

`fetch`のようなAPIは本質的に非同期であるため、JSPIを使用する必要がありますが、アプリケーション内の任意の場所、特にまだ存在しない関数の呼び出し中からこれらを呼び出したいと考えています。

核心となるアイデアは動的にロードされた関数をスタブに置き換えることです。このスタブは最初に欠けている関数コードをロードし、自身をロードされたコードと交換した後、元の引数を使用して新しくロードされたコードを呼び出します。その後の関数への呼び出しは直接ロードされた関数に遷移します。この戦略により、コードの動的ロードを本質的に透明なアプローチで行うことが可能です。

ロードするモジュールは比較的単純で、`42`を返す関数が含まれています:

```c
// これは簡単な42プロバイダです
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE long provide42(){
  return 42l;
}
```

このコードは`p42.c`というファイルにあり、追加のオプションを構築せずにEmscriptenを使用してコンパイルされます:

```sh
emcc p42.c -o p42.wasm --no-entry -Wl,--import-memory
```

`EMSCRIPTEN_KEEPALIVE`プレフィックスはEmscriptenマクロで、たとえコード内で使用されていなくても`provide42`関数が削除されないようにします。これにより、動的にロードしたい関数を含むWebAssemblyモジュールが生成されます。

`p42.c`のビルドに追加した`-Wl,--import-memory`フラグは、メインモジュールと同じメモリにアクセスできるようにするためのものです[^3]。

コードを動的にロードするために、標準の`WebAssembly.instantiateStreaming`APIを使用します:

```js
WebAssembly.instantiateStreaming(fetch('p42.wasm'));
```

この式は`fetch`を使用してコンパイル済みのWasmモジュールを見つけ、`WebAssembly.instantiateStreaming`を使用して結果をコンパイルし、インスタンス化されたモジュールを作成します。`fetch`と`WebAssembly.instantiateStreaming`はプロミスを返すため、その結果を単純に取得して必要な機能を抽出することはできません。代わりに、これを`EM_ASYNC_JS`マクロを使用してJSPIスタイルのインポートにラップします:

```c
EM_ASYNC_JS(fooFun, resolveFun, (), {
  console.log('loading promise42');
  LoadedModule = (await WebAssembly.instantiateStreaming(fetch('p42.wasm'))).instance;
  return addFunction(LoadedModule.exports['provide42']);
});
```

`console.log`の呼び出しに注目してください。これを使用してロジックが正しいことを確認します。

`addFunction`はEmscripten APIの一部ですが、ランタイムで利用できるようにするために`emcc`に依存関係として通知する必要があります。以下の行でこれを行います:

```c
EM_JS_DEPS(funDeps, "$addFunction")
```

コードを動的にロードしたい状況では、不要なコードロードを避けたいと考えます。この場合、`provide42`への後続の呼び出しがリロードをトリガーしないことを確認したいです。Cにはこれを達成する簡単な機能があります。それは`provide42`を直接呼び出すのではなく、トランポリンを介して呼び出し、その後、実際に関数を呼び出す直前にトランポリンを自分自身をバイパスするように変更します。これを適切な関数ポインターを使用して実現できます:

```c
extern fooFun get42;

long stub(){
  get42 = resolveFun();
  return get42();
}

fooFun get42 = stub;
```

プログラムの残りの部分の観点では、呼び出したい関数は`get42`と呼ばれています。初期の実装は`stub`を介して行われ、実際に関数をロードするために`resolveFun`を呼び出します。ロードが成功した後、`get42`を新しくロードされた関数を指すように変更して呼び出します。

メイン関数は`get42`を2回呼び出します:[^6]

```c
int main() {
  printf("first call p42() = %ld\n", get42());
  printf("second call = %ld\n", get42());
}
```

ブラウザでこれを実行した結果は次のようなログになります:

```
ロード中 promise42
最初の呼び出し p42() = 42
2回目の呼び出し = 42
```

ライン `ロード中 promise42` は一度だけ表示されますが、`get42` は実際には2回呼び出されています。

この例は、JSPI が予想外の方法で利用できることを示しています。動的にコードをロードするのは、Promises を作成することからは大きく離れているように見えます。なお、WebAssembly モジュールを動的にリンクするための他の方法も存在します。本例はこの課題の決定的な解決策を示すものではありません。

この新しい機能で何ができるかを見るのが私たちは非常に楽しみです！W3C WebAssembly Community Group の [リポジトリ](https://github.com/WebAssembly/js-promise-integration) で議論に参加してください。

## 付録 A: `badfib` の完全なリスト


```c
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <emscripten.h>

typedef long (testFun)(long, int);

#define マイクロ秒 (1000000)

long add(long x, long y) {
  return x + y;
}

// JS に加算を依頼する
EM_JS(long, jsAdd, (long x, long y), {
  return x + y;
});

// 加算を約束する
EM_ASYNC_JS(long, promiseAdd, (long x, long y), {
  return Promise.resolve(x+y);
});

__attribute__((noinline))
long localFib(long x) {
 if (x==0)
   return 0;
 if (x==1)
   return 1;
 return add(localFib(x - 1), localFib(x - 2));
}

__attribute__((noinline))
long jsFib(long x) {
  if (x==0)
    return 0;
  if (x==1)
    return 1;
  return jsAdd(jsFib(x - 1), jsFib(x - 2));
}

__attribute__((noinline))
long promiseFib(long x) {
  if (x==0)
    return 0;
  if (x==1)
    return 1;
  return promiseAdd(promiseFib(x - 1), promiseFib(x - 2));
}

long runLocal(long x, int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += localFib(x);
  return temp / count;
}

long runJs(long x,int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += jsFib(x);
  return temp / count;
}

long runPromise(long x, int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += promiseFib(x);
  return temp / count;
}

double runTest(testFun test, int limit, int count){
  clock_t start = clock();
  test(limit, count);
  clock_t stop = clock();
  return ((double)(stop - start)) / CLOCKS_PER_SEC;
}

void runTestSequence(int step, int limit, int count) {
  for (int ix = 0; ix <= limit; ix += step){
    double light = (runTest(runLocal, ix, count) / count) * マイクロ秒;
    double jsTime = (runTest(runJs, ix, count) / count) * マイクロ秒;
    double promiseTime = (runTest(runPromise, ix, count) / count) * マイクロ秒;
    printf("fib(%d) %gμs %gμs %gμs %gμs\n",ix, light, jsTime, promiseTime, (promiseTime - jsTime));
  }
}

EMSCRIPTEN_KEEPALIVE int main() {
  int step =  1;
  int limit = 15;
  int count = 1000;
  runTestSequence(step, limit, count);
  return 0;
}
```

## 付録 B: `u42.c` と `p42.c` のリスト

`u42.c` C コードは、私たちの動的ロード例のメイン部分を表しています:

```c
#include <stdio.h>
#include <emscripten.h>

typedef long (*fooFun)();

// 関数を約束する
EM_ASYNC_JS(fooFun, resolveFun, (), {
  console.log('ロード中 promise42');
  LoadedModule = (await WebAssembly.instantiateStreaming(fetch('p42.wasm'))).instance;
  return addFunction(LoadedModule.exports['provide42']);
});

EM_JS_DEPS(funDeps, "$addFunction")

extern fooFun get42;

long stub() {
  get42 = resolveFun();
  return get42();
}

fooFun get42 = stub;

int main() {
  printf("最初の呼び出し p42() = %ld\n", get42());
  printf("2回目の呼び出し = %ld\n", get42());
}
```

`p42.c` のコードは動的にロードされるモジュールです。

```c
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE long provide42() {
  return 42l;
}
```

<!-- 脚注自体は最下部に記載 -->
## 脚注

[^1]: 技術的な詳細に興味がある方は、[JSPI の WebAssembly 提案](https://github.com/WebAssembly/js-promise-integration/blob/main/proposals/js-promise-integration/Overview.md) と [V8 スタックスイッチング設計ポートフォリオ](https://docs.google.com/document/d/16Us-pyte2-9DECJDfGm5tnUpfngJJOc8jbj54HMqE9Y) を参照してください。

[^2]: 完全なプログラムは以下の付録 A に記載しています。

[^3]: この特定の例ではこのフラグは不要ですが、より大きなプロジェクトでは必要になる可能性があります。

[^4]: Emscripten バージョンが 3.1.61 以上である必要があります。

[^6]: 完全なプログラムは付録 B に記載されています。
