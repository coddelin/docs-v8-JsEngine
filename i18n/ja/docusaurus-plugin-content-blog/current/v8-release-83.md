---
title: "V8リリース v8.3"
author: "[Victor Gomes](https://twitter.com/VictorBFG), 在宅勤務を安全に実施中"
avatars:
 - "victor-gomes"
date: 2020-05-04
tags:
 - リリース
description: "V8 v8.3は、より高速なArrayBuffer、より大きなWasmメモリ、そして廃止されたAPIを特徴としています。"
tweet: "1257333120115847171"
---

6週間ごとに、新しいV8のブランチを[V8のリリースプロセス](https://v8.dev/docs/release-process)の一環として作成します。各バージョンはChrome Betaのマイルストーン直前にV8のGitのマスターから分岐されます。本日、新しいブランチである[V8バージョン8.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.3)を発表できることを嬉しく思います。このバージョンは、数週間後にChrome 83 Stableと連携してリリースされるまでベータ版です。V8 v8.3は開発者向けの便利な機能でいっぱいです。この投稿では、公開に先立ち、いくつかの注目ポイントを紹介します。

<!--truncate-->
## パフォーマンス

### ガーレジコレクターによる高速な`ArrayBuffer`トラッキング

`ArrayBuffer`のバッキングストアは埋め込み側が提供する`ArrayBuffer::Allocator`を使用してV8のヒープ外に割り当てられます。これらのバッキングストアは、`ArrayBuffer`オブジェクトがガーベジコレクターによって回収される際に解放する必要があります。V8 v8.3では、`ArrayBuffer`とそのバッキングストアをトラッキングする新しい仕組みが導入され、ガーベジコレクターがアプリケーションに並行してバッキングストアを反復処理し、解放できるようになりました。詳細は[この設計文書](https://docs.google.com/document/d/1-ZrLdlFX1nXT3z-FAgLbKal1gI8Auiaya_My-a0UJ28/edit#heading=h.gfz6mi5p212e)をご覧ください。この変更により、`ArrayBuffer`を多用するワークロードでGC停止時間が50％削減されました。

### より大きなWasmメモリ

[WebAssembly仕様](https://webassembly.github.io/spec/js-api/index.html#limits)の更新に従い、V8 v8.3ではモジュールが最大4GBのメモリを要求できるようになり、よりメモリを多く使用するユースケースがV8を搭載したプラットフォームで可能になりました。ただし、このようなメモリは必ずしもユーザーのシステムで利用できるわけではありません。小さなサイズでメモリを作成し、必要に応じて拡張し、拡張の失敗を適切に処理することを推奨します。

## 修正

### プロトタイプチェーン内に型付き配列を持つオブジェクトへの格納

JavaScript仕様に従うと、指定されたキーに値を格納する場合、プロトタイプチェーンを検索してそのキーがすでにプロトタイプに存在するかどうかを確認する必要があります。ほとんどの場合、これらのキーはプロトタイプチェーン上に存在しないため、安全な場合はV8が高速検索ハンドラーをインストールしてこれらのプロトタイプチェーンの検索を回避します。

しかし、最近特定のシナリオでV8がこの高速検索ハンドラーを誤ってインストールし、誤った動作を引き起こすことを確認しました。`TypedArray`がプロトタイプチェーン上にある場合、`TypedArray`の外側のキーへのすべての格納は無視されるべきです。例えば、以下の場合では`v[2]`は`v`にプロパティを追加すべきではなく、後続の読み取りはundefinedを返すべきです。

```js
v = {};
v.__proto__ = new Int32Array(1);
v[2] = 123;
return v[2]; // undefinedを返すべきです
```

V8の高速検索ハンドラーはこのケースを正しく処理せず、上記の例では代わりに`123`を返していました。V8 v8.3では、`TypedArray`がプロトタイプチェーン上にある場合に高速検索ハンドラーを使用しないよう修正されました。このケースは一般的ではないため、ベンチマーク上では性能の低下は見られませんでした。

## V8 API

### 実験的WeakRefsとFinalizationRegistry APIが廃止

以下の実験的WeakRefs関連APIは廃止されました：

- `v8::FinalizationGroup`
- `v8::Isolate::SetHostCleanupFinalizationGroupCallback`

`FinalizationRegistry`（旧称`FinalizationGroup`）は[JavaScriptの弱参照提案](https://v8.dev/features/weak-references)の一部であり、JavaScriptプログラマーがファイナライザーを登録する方法を提供します。これらのAPIは、埋め込み側が`FinalizationRegistry`のクリーンアップタスクをスケジュールおよび実行するために用いられますが、これ以上必要ではないため廃止されました。`FinalizationRegistry`のクリーンアップタスクは現在、埋め込み側の`v8::Platform`が提供するフォアグラウンドタスクランナーを使用してV8によって自動的にスケジュールされ、追加の埋め込みコードを必要としません。

### その他のAPI変更

`git log branch-heads/8.1..branch-heads/8.3 include/v8.h`を使用してAPI変更のリストを取得してください。

アクティブなV8チェックアウトを持つ開発者は、`git checkout -b 8.3 -t branch-heads/8.3`を使用してV8 v8.3の新機能を試すことができます。または、[Chromeのベータチャンネルを購読](https://www.google.com/chrome/browser/beta.html)して、近日中に新しい機能を試すことも可能です。
