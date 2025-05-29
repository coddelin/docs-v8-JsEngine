---
title: "V8リリース v9.4"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars:
 - "ingvar-stepanyan"
date: 2021-09-06
tags:
 - リリース
description: "V8リリースv9.4は、クラス静的初期化ブロックをJavaScriptに導入します。"
tweet: "1434915404418277381"
---
6週間ごとに、[リリースプロセス](https://v8.dev/docs/release-process)の一環として新しいV8のブランチを作成します。各バージョンは、Chrome Betaマイルストーンの直前にV8のGitマスターから分岐されます。本日、私たちは最新のブランチ、[V8バージョン9.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.4)を発表します。このバージョンは数週間後にChrome 94 Stableと連携してリリースされるまでベータ版として提供されます。V8 v9.4には、開発者向けのあらゆる種類の便利な新機能が詰まっています。この投稿では、リリースに先立ち、いくつかのハイライトをプレビューします。

<!--truncate-->
## JavaScript

### クラス静的初期化ブロック

クラスは、クラス評価ごとに一度だけ実行されるべきコードをグループ化する能力を静的初期化ブロックを通じて得ることができます。

```javascript
class C {
  // このブロックはクラス自体が評価されるときに実行されます
  static { console.log("C's static block"); }
}
```

v9.4から、クラス静的初期化ブロックは`--harmony-class-static-blocks`フラグなしで利用可能になります。これらのブロックのスコープに関する詳細なセマンティクスについては、[我々の説明](https://v8.dev/features/class-static-initializer-blocks)をご参照ください。

## V8 API

`git log branch-heads/9.3..branch-heads/9.4 include/v8.h`を使用してAPIの変更リストを取得してください。

アクティブなV8チェックアウトを持つ開発者は、`git checkout -b 9.4 -t branch-heads/9.4`を使用してV8 v9.4の新機能を試してみることができます。または、[Chromeのベータチャンネル](https://www.google.com/chrome/browser/beta.html)を購読して、自分で新機能を試すこともできます。
