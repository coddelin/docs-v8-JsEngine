---
title: "V8リリース v6.5"
author: "V8チーム"
date: "2018-02-01 13:33:37"
tags: 
  - リリース
description: "V8 v6.5はストリーミングWebAssemblyコンパイルのサポートを追加し、新しい「非信頼コードモード」を含みます。"
tweet: "959174292406640640"
---
6週間ごとに、[リリースプロセス](/docs/release-process)の一環としてV8の新しいブランチを作成しています。各バージョンは、Chrome Betaマイルストーンの直前にV8のGitマスターからブランチされます。本日、最新のブランチ、[V8バージョン6.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.5)を発表します。このバージョンは数週間後のChrome 65安定版と連携してリリースされるまでベータ版です。V8 v6.5は、開発者向けのさまざまな新機能を備えています。この投稿では、リリースを控えた注目のハイライトをいくつか紹介します。

<!--truncate-->
## 非信頼コードモード

最新の投機的サイドチャネル攻撃「Spectre」に対応するため、V8には[非信頼コードモード](/docs/untrusted-code-mitigations)が導入されました。V8を組み込む場合、ユーザー生成の信頼できないコードを処理する可能性があるアプリケーションではこのモードを活用することを検討してください。このモードはデフォルトで有効になっており、Chromeにも含まれています。

## WebAssemblyコードのストリーミングコンパイル

WebAssembly APIは、`fetch()` APIと組み合わせて[ストリーミングコンパイル](https://developers.google.com/web/updates/2018/04/loading-wasm)をサポートするための特別な関数を提供します:

```js
const module = await WebAssembly.compileStreaming(fetch('foo.wasm'));
```

このAPIはV8 v6.1およびChrome 61以降で利用可能ですが、初期の実装ではストリーミングコンパイルは実際には使用されていませんでした。しかし、V8 v6.5およびChrome 65では、このAPIを利用してモジュールのバイトをダウンロード中にすでにWebAssemblyモジュールをコンパイルします。個々の関数のバイトをすべてダウンロードするとすぐに、その関数をバックグラウンドスレッドに渡してコンパイルします。

測定結果では、このAPIを使用すると、Chrome 65でのWebAssemblyコンパイルが高性能マシンで最大50 Mbit/sのダウンロード速度に追いつくことが示されています。つまり、50 Mbit/sでWebAssemblyコードをダウンロードすると、ダウンロードが終了するのと同時にそのコードのコンパイルが終了します。

下記のグラフでは、67 MBのWebAssemblyモジュール（約190,000個の関数）のダウンロードとコンパイルにかかる時間を測定します。25 Mbit/s、50 Mbit/s、および100 Mbit/sのダウンロード速度で測定を行いました。

![](/_img/v8-release-65/wasm-streaming-compilation.svg)

ダウンロード時間がWebAssemblyモジュールのコンパイル時間よりも長い場合、例えば上記のグラフの25 Mbit/sおよび50 Mbit/sでは、`WebAssembly.compileStreaming()`は最後のバイトをダウンロードした直後にほぼ直ちにコンパイルを終了します。

ダウンロード時間がコンパイル時間よりも短い場合、`WebAssembly.compileStreaming()`の実行時間は最初にモジュールをダウンロードせずにWebAssemblyモジュールをコンパイルするのと同じくらいの時間がかかります。

## パフォーマンス

私たちは、JavaScriptのビルトイン関数の高速経路を広げる作業を継続し、「デオプティマイゼーションループ」と呼ばれる有害な状況を検出して防ぐためのメカニズムを追加しました。このループは、最適化されたコードがデオプティマイズされ、問題が何であるかを学習する方法がない場合に発生します。このようなシナリオでは、TurboFanが最適化を試み続け、最終的に約30回の試行後に諦めます。この状況は、第二次元配列ビルトインのコールバック関数内で配列の形状を変更した場合などに発生します。例えば、配列の`length`を変更する場合です。V8 v6.5では、これが発生した場合にそのサイトの配列ビルトインのインライン化を将来の最適化試行で停止するようにしています。

また、これまで関数呼び出し間の副作用のために除外されていた多くのビルトインをインライン化して、高速経路を広げました。さらに、`String.prototype.indexOf`の[関数呼び出しのパフォーマンスが10倍に向上しました](https://bugs.chromium.org/p/v8/issues/detail?id=6270)。

V8 v6.4では、`Array.prototype.forEach`、`Array.prototype.map`、および`Array.prototype.filter`のサポートがインライン化されましたが、V8 v6.5では次のものが追加されました:

- `Array.prototype.reduce`
- `Array.prototype.reduceRight`
- `Array.prototype.find`
- `Array.prototype.findIndex`
- `Array.prototype.some`
- `Array.prototype.every`

さらに、これらのすべてのビルトインで高速経路が広げられました。最初は浮動小数点数を含む配列や[「空白」が含まれる配列](/blog/elements-kinds)、例えば `[3, 4.5, , 6]` を見ると中断していましたが、`find`と`findIndex`を除き、現在ではこれらのタイプの配列を処理できます。ただし、仕様上の要件により空白を`undefined`に変換する必要があるため、`find`と`findIndex`では現在も課題があります（_現時点では…！_）。

次の画像は、V8 v6.4 と比較した場合のインラインビルトインの改善差分を示しており、整数配列、倍精度浮動小数点配列、穴を持つ倍精度浮動小数点配列に分解されています。時間はミリ秒単位です。

![V8 v6.4以来のパフォーマンスの向上](/_img/v8-release-65/performance-improvements.svg)

## V8 API

`git log branch-heads/6.4..branch-heads/6.5 include/v8.h` を使用して、APIの変更リストを取得してください。

[アクティブなV8チェックアウト](/docs/source-code#using-git)がある開発者は、`git checkout -b 6.5 -t branch-heads/6.5` を使用して、V8 v6.5の新機能を試すことができます。または、[Chromeのベータチャンネル](https://www.google.com/chrome/browser/beta.html)を購読して、新機能を自分で試すことも可能です。
