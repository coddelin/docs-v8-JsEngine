---
title: "V8リリース v7.3"
author: "Clemens Backes, コンパイラ担当"
avatars:
  - clemens-backes
date: 2019-02-07 11:30:42
tags:
  - リリース
description: "V8 v7.3には、WebAssemblyや非同期のパフォーマンス改善、非同期スタックトレース、Object.fromEntries、String#matchAllなど、非常に多くの新機能が詰まっています！"
tweet: "1093457099441561611"
---
6週間ごとに、私たちは[V8リリースプロセス](/docs/release-process)の一環としてV8の新しいブランチを作成します。各バージョンはV8のGitマスターから直接Chrome Betaのマイルストーン直前に派生しています。本日、最新のブランチ[V8バージョン7.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.3)を発表します。このバージョンは数週間後にChrome 73 Stableと連携してリリースされるまでベータ段階です。V8 v7.3は、開発者向けの魅力的な機能が満載です。この投稿では、リリースを待ついくつかのハイライトを紹介します。

<!--truncate-->
## 非同期スタックトレース

[`--async-stack-traces`フラグ](/blog/fast-async#improved-developer-experience)をデフォルトで有効にします。[ゼロコスト非同期スタックトレース](https://bit.ly/v8-zero-cost-async-stack-traces)により、重い非同期コードを使用している場合でも通常エラーが検出された際にログファイルやサービスへ送られる`error.stack`プロパティが問題の原因に関する洞察を提供します。

## `await`の高速化

上記の`--async-stack-traces`フラグに関連して、`--harmony-await-optimization`フラグもデフォルトで有効にします。これは`--async-stack-traces`の前提となる機能です。詳細については[高速非同期関数とプロミス](/blog/fast-async#await-under-the-hood)をご覧ください。

## WebAssemblyの高速起動

Liftoffの内部最適化により、生成されたコードの品質を損なうことなくWebAssemblyのコンパイル速度を大幅に向上させました。ほとんどのワークロードでは、コンパイル時間が15〜25％短縮されました。

![Epic ZenGardenデモのLiftoffコンパイル時間](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html)](/_img/v8-release-73/liftoff-epic.svg)

## JavaScript言語機能

V8 v7.3にはいくつかの新しいJavaScript言語機能が含まれています。

### `Object.fromEntries`

`Object.entries` APIはこれまでも知られていますが:

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]
```

残念ながら、`entries`の結果から同等のオブジェクトに戻る簡単な方法はありませんでした…今まで！V8 v7.3は[`Object.fromEntries()`](/features/object-fromentries)をサポートしており、新しいビルトインAPIで`Object.entries`の逆を行います:

```js
const result = Object.fromEntries(entries);
// → { x: 42, y: 50 }
```

詳細情報や使用例については[Object.fromEntriesの機能説明](/features/object-fromentries)をご覧ください。

### `String.prototype.matchAll`

グローバル（`g`）またはスティッキー（`y`）正規表現の一般的な使用例は、文字列に適用し、すべての一致を反復処理することです。新しい`String.prototype.matchAll` APIを使用すると、特にキャプチャグループを持つ正規表現の場合、これが以前より簡単になりました:

```js
const string = 'Favorite GitHub repos: tc39/ecma262 v8/v8.dev';
const regex = /\b(?<owner>[a-z0-9]+)\/(?<repo>[a-z0-9\.]+)\b/g;

for (const match of string.matchAll(regex)) {
  console.log(`${match[0]} at ${match.index} with '${match.input}'`);
  console.log(`→ owner: ${match.groups.owner}`);
  console.log(`→ repo: ${match.groups.repo}`);
}

// 出力:
//
// tc39/ecma262 at 23 with 'Favorite GitHub repos: tc39/ecma262 v8/v8.dev'
// → owner: tc39
// → repo: ecma262
// v8/v8.dev at 36 with 'Favorite GitHub repos: tc39/ecma262 v8/v8.dev'
// → owner: v8
// → repo: v8.dev
```

詳細については[String.prototype.matchAllの機能説明](/features/string-matchall)をご覧ください。

### `Atomics.notify`

`Atomics.wake`は`Atomics.notify`に名前が変更され、[最近の仕様変更](https://github.com/tc39/ecma262/pull/1220)と一致しました。

## V8 API

`git log branch-heads/7.2..branch-heads/7.3 include/v8.h`を使用してAPI変更の一覧を取得してください。

[アクティブなV8チェックアウト](/docs/source-code#using-git)を持つ開発者は、`git checkout -b 7.3 -t branch-heads/7.3`を使用してV8 v7.3の新機能を試すことができます。また、[Chromeのベータチャンネルに登録](https://www.google.com/chrome/browser/beta.html)して、新しい機能を試すこともできます。
