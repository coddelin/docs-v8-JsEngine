---
title: "V8 リリース v5.2"
author: "V8 チーム"
date: 2016-06-04 13:33:37
tags:
  - リリース
description: "V8 v5.2 は ES2016 の言語機能をサポートします。"
---
約6週間ごとに、私たちは[リリースプロセス](/docs/release-process)の一環として V8 の新しいブランチを作成します。各バージョンは、Chrome が Chrome Beta マイルストーン用にブランチを分岐する直前に、V8 の Git マスターから分岐されます。本日、最新のブランチである [V8 バージョン 5.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.2) を発表します。このバージョンは Chrome 52 Stable と連携してリリースされるまでベータ版です。V8 5.2 は開発者向けのさまざまな便利な機能が満載で、数週間後のリリースを見越して、注目すべき機能をいくつかご紹介します。

<!--truncate-->
## ES2015 & ES2016 サポート

V8 v5.2 には ES2015 (別名 ES6) および ES2016 (別名 ES7) のサポートが含まれています。

### 指数演算子

このリリースには ES2016 の指数演算子のサポートが含まれています。この演算子は `Math.pow` の代わりに使える中置表記です。

```js
let n = 3**3; // n == 27
n **= 2; // n == 729
```

### 進化する仕様

進化する仕様、ウェブ互換性バグ、および末尾呼び出しに関する継続的な標準議論の詳細については、V8 のブログ投稿 [ES2015, ES2016, and beyond](/blog/modern-javascript) を参照してください。

## パフォーマンス

V8 v5.2 には、JavaScript の組み込み関数の性能を向上させるためのさらなる最適化が含まれています。これには、isArray メソッド、in 演算子、Function.prototype.bind などの Array 操作の改善が含まれます。これは、人気のあるウェブページのランタイム呼び出し統計の新しい分析に基づいた組み込み関数を高速化するための継続的な作業の一環です。詳細については、[V8 Google I/O 2016 のトーク](https://www.youtube.com/watch?v=N1swY14jiKc) を参照してください。また、実際のウェブサイトから得られたパフォーマンス最適化に関するブログ投稿が近日中に公開される予定です。

## V8 API

API の変更点の概要については、[こちらをご覧ください](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。この文書は、各主要リリースの数週間後に定期的に更新されます。

開発者は、[アクティブな V8 チェックアウト](https://v8.dev/docs/source-code#using-git)を利用して `git checkout -b 5.2 -t branch-heads/5.2` を使用することで、V8 v5.2 の新機能を試すことができます。または、[Chrome のベータチャンネルを購読](https://www.google.com/chrome/browser/beta.html)して、すぐに新機能を自分で試すことも可能です。
