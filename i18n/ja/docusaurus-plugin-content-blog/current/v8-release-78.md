---
title: 'V8リリースv7.8'
author: 'Ingvar Stepanyan（[@RReverser](https://twitter.com/RReverser)）、怠惰なソーサラー'
avatars:
  - 'ingvar-stepanyan'
date: 2019-09-27
tags:
  - release
description: 'V8 v7.8はプリロード時のストリーミングコンパイル、WebAssembly C API、高速なオブジェクト分解と正規表現の一致、そして起動時間の改善を特徴としています。'
tweet: '1177600702861971459'
---
V8では6週間ごとに新しいブランチを作成する[リリースプロセス](/docs/release-process)を実施しています。各バージョンはChrome Betaマイルストーン直前のV8 Gitマスターから分岐します。本日、最新のブランチ[V8 version 7.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.8)を発表できることを嬉しく思います。このブランチは数週間後にChrome 78 Stableに合わせてリリースされるまでベータ版です。V8 v7.8には、開発者向けの数々の素晴らしい機能が詰まっています。本記事では、リリースを期待していくつかのハイライトをご紹介します。

<!--truncate-->
## JavaScriptのパフォーマンス（サイズと速度）

### プリロード時のスクリプトストリーミング

[V8 v7.5でのスクリプトストリーミングの取り組み](/blog/v8-release-75#script-streaming-directly-from-network)を覚えていらっしゃるでしょうか。その取り組みでは、ネットワークから直接データを読み込む背景コンパイルを改善しました。Chrome 78では、プリロード中のスクリプトストリーミングを有効化しています。

以前は、HTML解析中に`<script>`タグが検出されるとスクリプトストリーミングが開始され、解析が一時停止するか（通常スクリプトの場合）、コンパイルが終了した後スクリプトが実行される（非同期スクリプトの場合）仕組みでした。つまり、以下のような通常の同期スクリプトの場合には：

```html
<!DOCTYPE html>
<html>
<head>
  <script src="main.js"></script>
</head>
...
```

以前のパイプラインはおおむね次のようになっていました：

<figure>
  <img src="/_img/v8-release-78/script-streaming-0.svg" width="458" height="130" alt="" loading="lazy"/>
</figure>

同期スクリプトは`document.write()`を使用できるため、`<script>`タグを検出するとHTML解析を一時停止する必要がありました。コンパイルは`<script>`タグが検出されたときに開始されるため、HTMLを解析してから実際にスクリプトを実行するまでの間に大きなギャップが生じ、この間にページを読み込み続けることができません。

しかし、HTMLをスキャンしてプリロードするリソースを探す初期の段階でも`<script>`タグに遭遇しますので、実際のパイプラインは次のような構造になります：

<figure>
  <img src="/_img/v8-release-78/script-streaming-1.svg" width="600" height="130" alt="" loading="lazy"/>
</figure>

JavaScriptファイルをプリロードする場合には、最終的にそれを実行する可能性が高いという合理的な仮定があります。そのため、Chrome 76以降では、プリロードストリーミングを試験的に導入し、スクリプトの読み込み時にコンパイルも開始する取り組みを行っています。

<figure>
  <img src="/_img/v8-release-78/script-streaming-2.svg" width="495" height="130" alt="" loading="lazy"/>
</figure>

さらに素晴らしいのは、スクリプトの読み込みが終了する前にコンパイルを開始できるため、プリロードストリーミングを利用した場合のパイプラインは次のようになります：

<figure>
  <img src="/_img/v8-release-78/script-streaming-3.svg" width="480" height="217" alt="" loading="lazy"/>
</figure>

この結果、場合によっては、スクリプトタグが検出されてからスクリプトが実行を開始するまでの目に見えるコンパイル時間をゼロに減らせる場合があります。実験において、この目に見えるコンパイル時間は平均して5〜20%短縮されました。

さらに良いニュースとして、実験インフラのおかげでChrome 78でこれをデフォルトで有効化するだけでなく、Chrome 76以降のユーザーにもこの機能をオンにすることができました。

### 高速化されたオブジェクト分解

以下の形式のオブジェクト分解...

```js
const {x, y} = object;
```

...はほぼ次のような展開形と同等です...

```js
const x = object.x;
const y = object.y;
```

...ただし、`object`が`undefined`や`null`である場合に特別なエラーを投げる必要があります...

```
$ v8 -e 'const object = undefined; const {x, y} = object;'
unnamed:1: TypeError: Cannot destructure property `x` of 'undefined' or 'null'.
const object = undefined; const {x, y} = object;
                                 ^
```

...通常の未定義変数参照エラーとは異なります：

```
$ v8 -e 'const object = undefined; object.x'
unnamed:1: TypeError: Cannot read property 'x' of undefined
const object = undefined; object.x
                                 ^
```

この追加のチェックにより、オブジェクト分解が簡単な変数代入よりも遅くなることがありましたが、[Twitterで報告されました](https://twitter.com/mkubilayk/status/1166360933087752197)。

V8 v7.8以降では、オブジェクト分解は**展開された変数代入と同等の高速**になりました（実際、どちらも同じバイトコードを生成します）。現在では、明示的な`undefined`/`null`チェックを行う代わりに、`object.x`をロードする際に例外がスローされ、その例外が分解の結果である場合にそれを捕捉します。

### 怠惰なソース位置

JavaScriptからバイトコードをコンパイルする際に、バイトコードのシーケンスをソースコード内の文字位置に結びつけるソース位置表が生成されます。ただし、この情報は主に、例外のシンボル化やデバッグやプロファイリングなどの開発者タスクを実行する場合にのみ使用されるため、大部分が無駄なメモリとなります。

これを回避するために、（デバッガーやプロファイラーが接続されていない場合を想定して）ソース位置を収集せずにバイトコードをコンパイルするようになりました。ソース位置は実際にスタックトレースが生成されるとき、例えば`Error.stack`を呼び出す際や例外のスタックトレースをコンソールに印刷する場合にのみ収集されます。これには少しコストがかかります。というのも、ソース位置を生成するには関数を再解析してコンパイルする必要があるためです。しかし、ほとんどのウェブサイトは本番環境でスタックトレースをシンボル化しないため、観測可能なパフォーマンスの影響はありません。私たちのラボテストでは、V8のメモリ使用量が1〜2.5%削減されることが分かりました。

![AndroidGoデバイスでの遅延ソース位置によるメモリ削減](/_img/v8-release-78/memory-savings.svg)

### RegExp不一致時の高速化

一般に、正規表現（RegExp）は入力文字列を先頭から順に進みながら、各位置から一致を探します。ただし、その位置が文字列の最後に近づき、一致が不可能になると、V8は（ほとんどの場合）新しい一致の開始位置を探すのをやめ、すぐに失敗を返します。この最適化は、コンパイル済みおよび解釈された正規表現の両方に適用され、不一致が一般的で、かつ成功する一致の最小長が平均的な入力文字列の長さに比べて相対的に大きい場合の処理に対して速度向上をもたらします。

この取り組みに着想を得たJetStream 2のUniPokerテストでは、V8 v7.8により全繰り返しの平均サブスコアが20%向上しました。

## WebAssembly

### WebAssembly C/C++ API

v7.8以降、V8の[Wasm C/C++ API](https://github.com/WebAssembly/wasm-c-api)の実装は実験的ステータスを卒業し、正式にサポートされます。このAPIを使用すると、JavaScriptを一切使用せずに、C/C++アプリケーション内でV8をWebAssembly実行エンジンとして利用できます。詳細および手順については、[ドキュメント](https://docs.google.com/document/d/1oFPHyNb_eXg6NzrE6xJDNPdJrHMZvx0LqsD6wpbd9vY/edit)を参照してください。

### 起動時間の改善

WebAssemblyからJavaScript関数を呼び出す際、またはJavaScriptからWebAssembly関数を呼び出す際には、引数の表現を切り替えるラッパーコードを実行する必要があります。このラッパー生成は非常にコストがかかることがあります。[Epic ZenGardenデモ](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html)では、ラッパーのコンパイルがモジュールの起動（コンパイル+インスタンス化）時間の約20%を占めています（18コアのXeonマシンでの計測）。

今回のリリースでは、マルチコアマシンでバックグラウンドスレッドをより良く利用することで、この問題を改善しました。[関数コンパイルのスケール](https://v8.dev/blog/v8-release-77#wasm-compilation)に向けた最近の取り組みを活用し、新しい非同期パイプラインにこのラッパーコンパイルを統合しました。この結果、ラッパーコンパイルは同じマシンでのEpic ZenGardenデモの起動時間の約8%を占めるだけになりました。

## V8 API

`git log branch-heads/7.7..branch-heads/7.8 include/v8.h`を使用して、API変更のリストを取得してください。

[アクティブなV8チェックアウト](/docs/source-code#using-git)を行っている開発者は、`git checkout -b 7.8 -t branch-heads/7.8`を使用してV8 v7.8の新機能を試すことができます。あるいは[Chromeのベータチャンネル](https://www.google.com/chrome/browser/beta.html)に登録し、すぐに新機能を試してみることもできます。
