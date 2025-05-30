---
title: "V8リリース v9.1"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))、私のプライベートブランドのテスト"
avatars: 
 - "ingvar-stepanyan"
date: 2021-05-04
tags: 
 - リリース
description: "V8リリースv9.1では、プライベートブランドチェックのサポート、デフォルトで有効化されたトップレベルawait、そしてパフォーマンス改善を提供します。"
tweet: "1389613320953532417"
---
6週間ごとに、[リリースプロセス](https://v8.dev/docs/release-process)の一環としてV8の新しいブランチを作成しています。それぞれのバージョンは、Chrome Betaマイルストーン直前にV8のGitマスターからブランチ化されます。本日、私たちは最新のブランチ、[V8バージョン9.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.1)を発表できることを嬉しく思います。このバージョンは、数週間後にChrome 91 Stableと連携してリリースされるまでベータ版となります。V8 v9.1は、開発者に向けたさまざまな便利な機能に満ちています。この投稿では、リリースを見越した重要なハイライトの一部をご紹介します。

<!--truncate-->
## JavaScript

### `FastTemplateCache`の改善

v8 APIは、埋め込み側から新しいインスタンスを作成できる`Template`インターフェースを公開しています。

新しいオブジェクトインスタンスを作成および構成するにはいくつかのステップが必要となり、これは既存のオブジェクトを複製する方がしばしば高速である理由です。V8は、最近作成されたオブジェクトをテンプレートに基づいて直接クローンするために、小さく高速な配列キャッシュと大きく遅い辞書キャッシュという2レベルのキャッシュ戦略を使用しています。

以前は、テンプレートのキャッシュインデックスがテンプレートの作成時に割り当てられていましたが、キャッシュに挿入されたタイミングではありませんでした。この結果、多くの場合まったくインスタンス化されないテンプレートのために高速配列キャッシュが予約されてしまいました。この問題を修正した結果、Speedometer2-FlightJSベンチマークで4.5％の改善が見られました。

### トップレベル`await`

[トップレベル`await`](https://v8.dev/features/top-level-await)は、v9.1からデフォルトで有効化され、`--harmony-top-level-await`なしで利用できます。

[Blinkレンダリングエンジン](https://www.chromium.org/blink)においては、トップレベル`await`はすでにバージョン89で[デフォルトで有効化](https://v8.dev/blog/v8-release-89#top-level-await)されていますのでご注意ください。

埋め込み開発者は、この有効化により、`v8::Module::Evaluate`が常に`v8::Promise`オブジェクトを返し、完了値ではなくなることに注意してください。モジュール評価が成功すれば`Promise`は完了値で解決され、評価が失敗すればエラーで拒否されます。評価されたモジュールが非同期でない（つまりトップレベル`await`を含まない）場合、および非同期依存関係を持たない場合は、返された`Promise`は充足または拒否されます。それ以外の場合、返された`Promise`は保留状態になります。

詳しくは[こちらの説明](https://v8.dev/features/top-level-await)をご覧ください。

### プライベートブランドのチェック、別名`#foo in obj`

プライベートブランドのチェック構文は、`--harmony-private-brand-checks`を必要とせず、v9.1でデフォルトで有効化されています。この機能により、[`in`オペレーター](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in)がプライベートフィールドの`#`名前にも対応するよう拡張されます。以下の例をご覧ください。

```javascript
class A {
  static test(obj) {
    console.log(#foo in obj);
  }

  #foo = 0;
}

A.test(new A()); // true
A.test({}); // false
```

詳細な情報については、[こちらの説明](https://v8.dev/features/private-brand-checks)をぜひご覧ください。

### 短い組み込み関数の呼び出し

このリリースでは、一時的に64ビットデスクトップマシンで組み込み関数の埋め込みを解除しました（[embedded builtins](https://v8.dev/blog/embedded-builtins)を元に戻します）。これらのマシンにおいて、埋め込みを解除することによるパフォーマンスの向上がメモリコストを上回ります。これは、アーキテクチャ的およびマイクロアーキテクチャ的な詳細によるものです。

詳細については、近日中に別のブログ投稿を公開する予定です。

## V8 API

`git log branch-heads/9.0..branch-heads/9.1 include/v8.h`を使用して、APIの変更点一覧を確認してください。

アクティブなV8のチェックアウトを持つ開発者は、`git checkout -b 9.1 -t branch-heads/9.1`を使用してV8 v9.1の新しい機能を試すことができます。または[Chromeのベータチャンネル](https://www.google.com/chrome/browser/beta.html)を購読して、近々新しい機能を試してみることもできます。
