---
title: "WebAssemblyのコンパイルパイプライン"
description: "この記事では、V8のWebAssemblyコンパイラとWebAssemblyコードがいつコンパイルされるかについて説明します。"
---

WebAssemblyはバイナリ形式で、JavaScript以外のプログラミング言語のコードを効率的かつ安全にウェブ上で実行することができます。この文書では、V8におけるWebAssemblyのコンパイルパイプラインを掘り下げ、さまざまなコンパイラを使用して良好なパフォーマンスを提供する方法を説明します。

## Liftoff

初めは、V8はWebAssemblyモジュール内の関数を一切コンパイルしません。代わりに、関数が初めて呼び出される際に、基礎コンパイラ[Liftoff](/blog/liftoff)によって遅延コンパイルされます。Liftoffは[単一パスコンパイラ](https://en.wikipedia.org/wiki/One-pass_compiler)であり、一度WebAssemblyコードを繰り返し処理し、各WebAssembly命令に対してすぐに機械コードを生成します。単一パスコンパイラは迅速なコード生成に優れていますが、適用できる最適化は限られています。実際、LiftoffはWebAssemblyコードを非常に迅速にコンパイルすることができ、1秒間に数十メガバイトを処理できます。

Liftoffによるコンパイルが完了すると、その生成された機械コードがWebAssemblyモジュールに登録され、将来の関数呼び出しではそのコンパイル済みコードがすぐに使用されます。

## TurboFan

Liftoffは非常に短期間でそこそこ速い機械コードを生成します。しかし、各WebAssembly命令に個別にコードを生成するため、レジスタ割り当ての改善や冗長なロードの削除、強度削減や関数インライン化などの一般的なコンパイラ最適化のような最適化の余地はほとんどありません。

このため、頻繁に実行される関数、つまり_ホット_な関数は[V8の最適化コンパイラTurboFan](/docs/turbofan)を使用して再コンパイルされます。TurboFanは[マルチパスコンパイラ](https://en.wikipedia.org/wiki/Multi-pass_compiler)であり、機械コードを生成する前に複数の内部表現を構築します。これらの追加の内部表現により最適化が可能となり、レジスタ割り当ての改善も可能で、結果としてコードの速度が著しく向上します。

V8はWebAssembly関数がどれほど頻繁に呼び出されるかを監視します。ある関数が一定の閾値に達すると、その関数は_ホット_であるとみなされ、バックグラウンドスレッドで再コンパイルがトリガーされます。コンパイルが完了すると、新しいコードがWebAssemblyモジュールに登録され、既存のLiftoffコードを置き換えます。その関数への新しい呼び出しは、LiftoffコードではなくTurboFanによって生成された新しい最適化コードを使用します。ただし、オンスタックリプレースメントは行わないため、もしTurboFanコードが関数呼び出し後に利用可能になっても、その関数呼び出しはLiftoffコードで実行を完了します。

## コードキャッシュ

`WebAssembly.compileStreaming`を使用してWebAssemblyモジュールがコンパイルされた場合、TurboFanで生成された機械コードもキャッシュされます。同じURLからWebAssemblyモジュールが再度取得されると、追加のコンパイルなしでキャッシュされたコードをすぐに使用できます。コードキャッシュに関する詳細は[別の記事](/blog/wasm-code-caching)で提供されています。

コードキャッシュは、生成されたTurboFanコード量が一定の閾値に達した際にトリガーされます。このため、巨大なWebAssemblyモジュールの場合にはTurboFanコードが段階的にキャッシュされますが、小規模なWebAssemblyモジュールの場合にはTurboFanコードがキャッシュされないこともあります。Liftoffコードはキャッシュされません。なぜなら、Liftoffコンパイルはキャッシュからコードをロードするほど高速であるためです。

## デバッグ

前述のとおり、TurboFanは最適化を適用します。その多くはコードの再配置や変数の削除、さらにはコードの一部をスキップすることを含みます。このため、特定の命令でブレークポイントを設定したい場合、実際にプログラムがどこで停止すべきかが不明瞭になる可能性があります。言い換えれば、TurboFanコードはデバッグに適していません。そのため、DevToolsを開いてデバッグを開始すると、すべてのTurboFanコードが再びLiftoffコードで置き換えられます（「段階的に下げられます」）。これにより、各WebAssembly命令が1つの機械コードセクションに正確にマップされ、すべてのローカルおよびグローバル変数が保持される状態になります。

## プロファイリング

さらに少し混乱させるかもしれませんが、DevTools内では、「パフォーマンス」タブを開いて「記録」ボタンをクリックすると、すべてのコードが再び段階的に上げられ（TurboFanで再コンパイルされ）ます。「記録」ボタンはパフォーマンスプロファイリングを開始します。Liftoffコードをプロファイリングするのは代表的ではなく、それはTurboFanが未完了の間だけ使用され、TurboFanの生成物よりもはるかに遅い可能性があります。TurboFanの生成物は圧倒的多数の時間実行されています。

## 実験用のフラグ

実験のために、V8やChromeを設定してWebAssemblyコードをLiftoffだけ、またはTurboFanだけでコンパイルするように構成することができます。また、最初に呼び出されたときにだけ関数をコンパイルする「遅延コンパイル」を試すことも可能です。以下のフラグを使用することで、これらの実験モードを有効にできます：

- Liftoffのみの場合:
    - V8では、`--liftoff --no-wasm-tier-up`フラグを設定してください。
    - Chromeでは、WebAssemblyティアリングを無効化（`chrome://flags/#enable-webassembly-tiering`）し、WebAssemblyベースラインコンパイラを有効化（`chrome://flags/#enable-webassembly-baseline`）してください。

- TurboFanのみの場合:
    - V8では、`--no-liftoff --no-wasm-tier-up`フラグを設定してください。
    - Chromeでは、WebAssemblyティアリングを無効化（`chrome://flags/#enable-webassembly-tiering`）し、WebAssemblyベースラインコンパイラを無効化（`chrome://flags/#enable-webassembly-baseline`）してください。

- 遅延コンパイル:
    - 遅延コンパイルは、関数が最初に呼び出されたときにのみコンパイルされるコンパイルモードです。本番環境の設定と同様に、関数は最初にLiftoffでコンパイルされ（実行をブロック）、その後バックグラウンドでTurboFanを使用して再コンパイルされます。
    - V8では、`--wasm-lazy-compilation`フラグを設定してください。
    - Chromeでは、WebAssembly遅延コンパイルを有効化（`chrome://flags/#enable-webassembly-lazy-compilation`）してください。

## コンパイル時間

LiftoffとTurboFanのコンパイル時間を測定する方法はいくつかあります。V8の本番環境設定では、`new WebAssembly.Module()`が終了するまでの時間や、`WebAssembly.compile()`がPromiseを解決するまでの時間を測定することで、Liftoffのコンパイル時間をJavaScriptから測定できます。TurboFanのコンパイル時間を測定するには、TurboFanのみの構成で同様に行います。

![Google Earthの[WebAssemblyコンパイル](https://earth.google.com/web)のトレース。](/_img/wasm-compilation-pipeline/trace.svg)

`chrome://tracing/`で`v8.wasm`カテゴリを有効化することで、より詳細にコンパイル時間を測定することもできます。Liftoffのコンパイルは、コンパイルの開始から`wasm.BaselineFinished`イベントまでの時間、TurboFanのコンパイルは`wasm.TopTierFinished`イベントで終了します。コンパイル自体は、`WebAssembly.compileStreaming()`の場合は`wasm.StartStreamingCompilation`イベント、`new WebAssembly.Module()`の場合は`wasm.SyncCompile`イベント、`WebAssembly.compile()`の場合は`wasm.AsyncCompile`イベントで開始します。Liftoffのコンパイルは`wasm.BaselineCompilation`イベントで示され、TurboFanのコンパイルは`wasm.TopTierCompilation`イベントで示されます。上記の図は、Google Earthで記録されたトレースを示したもので、主要なイベントが強調されています。

さらに詳細なトレースデータは、`v8.wasm.detailed`カテゴリで利用可能で、個々の関数のコンパイル時間などの情報を提供します。
