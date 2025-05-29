---
title: "V8リリース v7.0"
author: "Michael Hablich"
avatars:
  - michael-hablich
date: 2018-10-15 17:17:00
tags:
  - リリース
description: "V8 v7.0では、WebAssemblyスレッド、Symbol.prototype.description、そしてより多くのプラットフォームでの組み込みバイナリが含まれています！"
tweet: "1051857446279532544"
---
約6週間ごとに、私たちは[V8のリリースプロセス](/docs/release-process)の一環として、新しいV8のブランチを作成します。各バージョンはChromeのベータ版マイルストーン直前にV8のGit masterからブランチが切られます。本日、[V8 version 7.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.0)の最新ブランチを発表できることを嬉しく思います。これは今後数週間でChrome 70安定版と調整してリリースされるまでベータ版です。V8 v7.0は開発者向けのすばらしい機能が満載です。この投稿では、リリースに先立ちいくつかの注目ポイントを予告します。

<!--truncate-->
## 組み込みバイナリ

[組み込みバイナリ](/blog/embedded-builtins)は、複数のV8 Isolate間で生成コードを共有することでメモリを節約します。V8 v6.9からx64で組み込みバイナリを有効にしました。V8 v7.0では、これらのメモリ節約をia32以外のすべてのプラットフォームに拡張しました。

## WebAssemblyスレッドのプレビュー

WebAssembly (Wasm) は、C++などの言語で書かれたコードをコンパイルしてウェブで実行することを可能にします。ネイティブアプリケーションの非常に便利な機能の1つは、スレッドを使用する能力です。これは並列計算のための基本的な手段です。ほとんどのCおよびC++開発者は、アプリケーションスレッド管理の標準化されたAPIであるpthreadsに精通しているでしょう。

[WebAssembly コミュニティグループ](https://www.w3.org/community/webassembly/)は、真のマルチスレッドアプリケーションを可能にするためにスレッドをウェブにもたらす作業を進めています。この取り組みの一環として、V8はWebAssemblyエンジンでスレッドをサポートするために必要な実装を行いました。この機能をChromeで使用するには、`chrome://flags/#enable-webassembly-threads`で有効化するか、サイトが[Origin Trial](https://github.com/GoogleChrome/OriginTrials)に登録できます。Origin Trialsは、開発者が完全に標準化される前に新しいウェブ機能を試験的に使用できるものであり、これは新しい機能の検証と改善に不可欠な実世界のフィードバックを収集するのに役立ちます。

## JavaScript言語機能

[`description` プロパティ](https://tc39.es/proposal-Symbol-description/)が `Symbol.prototype` に追加されます。これにより、`Symbol` の説明にもっとエルゴノミックにアクセスする方法が提供されます。以前は、説明に `Symbol.prototype.toString()` を介して間接的にしかアクセスできませんでした。この実装を提供したIgaliaに感謝します！

`Array.prototype.sort` は、V8 v7.0では安定しています。以前は、V8は10個以上の要素を持つ配列に対して不安定なQuickSortを使用していました。現在、安定したTimSortアルゴリズムを使用しています。[こちらのブログ記事](/blog/array-sort)で詳細をご覧ください。

## V8 API

`git log branch-heads/6.9..branch-heads/7.0 include/v8.h` を使用して、API変更のリストを確認できます。

アクティブな[V8チェックアウト](/docs/source-code#using-git)を持つ開発者は、`git checkout -b 7.0 -t branch-heads/7.0` を使用して、V8 v7.0の新機能を試すことができます。または[Chromeのベータチャンネルに登録](https://www.google.com/chrome/browser/beta.html)して、間もなく新機能を実際に試してみることができます。
