---
title: "V8 リリース v9.7"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars: 
 - "ingvar-stepanyan"
date: 2021-11-05
tags: 
 - リリース
description: "V8 リリース v9.7 では、配列内を逆方向に検索するための新しい JavaScript メソッドが追加されました。"
tweet: ""
---
4週間ごとに、[リリースプロセス](https://v8.dev/docs/release-process) の一環として新しい V8 のブランチを作成します。各バージョンは、Chrome Beta マイルストーンの直前に V8 の Git メインから分岐されます。本日、私たちは最新のブランチ [V8 バージョン 9.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.7) を発表できることを嬉しく思います。このバージョンは数週間以内に Chrome 97 Stable に合わせてリリースされるまでベータ版の状態です。V8 v9.7 は開発者に向けたさまざまな新機能を詰め込んでいます。この投稿では、リリースの期待を高めるいくつかのハイライトをプレビューします。

<!--truncate-->
## JavaScript

### `findLast` と `findLastIndex` 配列メソッド

`Array` および `TypedArray` 上の `findLast` と `findLastIndex` メソッドは、配列の末尾から条件に一致する要素を見つけます。

例えば:

```js
[1,2,3,4].findLast((el) => el % 2 === 0)
// → 4 (最後の偶数要素)
```

これらのメソッドは v9.7 からフラグなしで利用可能です。

より詳しい情報は、[機能説明](https://v8.dev/features/finding-in-arrays#finding-elements-from-the-end) をご覧ください。

## V8 API

`git log branch-heads/9.6..branch-heads/9.7 include/v8\*.h` を使用して、API の変更リストを取得してください。

アクティブな V8 チェックアウトを持つ開発者は `git checkout -b 9.7 -t branch-heads/9.7` を使用して V8 v9.7 の新機能を試すことができます。あるいは [Chrome のベータチャンネルに登録する](https://www.google.com/chrome/browser/beta.html) ことで、間もなく新機能を自分で試すこともできます。
