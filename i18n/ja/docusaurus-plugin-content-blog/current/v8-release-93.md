---
title: 'V8 リリース v9.3'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))'
avatars:
 - 'ingvar-stepanyan'
date: 2021-08-09
tags:
 - リリース
description: 'V8 リリース v9.3 は、Object.hasOwnとError causesのサポートを提供し、コンパイル性能を向上させ、Androidでの不信コード生成緩和策を無効化します。'
tweet: ''
---
約6週間ごとに、私たちは[リリースプロセス](https://v8.dev/docs/release-process)の一環として新しい V8 のブランチを作成しています。各バージョンは Chrome ベータ版のマイルストーン直前に V8 のメイン Git ブランチから分岐されます。本日は、新しいブランチである[V8 バージョン9.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.3)を発表することができました。このバージョンは数週間後の Chrome 93 安定版のリリースと連携してリリースされるまでベータ版となります。V8 v9.3 には開発者に役立つ様々な新機能が含まれています。この投稿では、リリースを待ち望む一部のハイライトを紹介します。

<!--truncate-->
## JavaScript

### Sparkplug のバッチコンパイル

私たちは、超高速の新しい中間層 JIT コンパイラ [Sparkplug](https://v8.dev/blog/sparkplug) を v9.1 でリリースしました。セキュリティ上の理由から、V8 は生成したコードメモリを[書き込み保護](https://en.wikipedia.org/wiki/W%5EX)しており、コンパイル中に書き込み可能権限と実行可能権限を切り替える必要があります。これには `mprotect` 呼び出しが使用されています。しかし、Sparkplug はコードを非常に迅速に生成するため、個々のコンパイルされた関数ごとに `mprotect` を呼び出すコストがコンパイル時間の大きなボトルネックとなっていました。V8 v9.3 では、Sparkplug のバッチコンパイルを導入します：関数を個別にコンパイルするのではなく、複数の関数をまとめてバッチコンパイルします。これにより、メモリページの権限を一度だけ変更するだけで済むため、コストが緩和されます。

バッチコンパイルにより、JavaScript の実行性能を低下させることなく、コンパイル全体の時間（Ignition + Sparkplug）が最大44％短縮されます。Sparkplug コードのコンパイルコストだけを見ると、影響はさらに大きくなり、例えば Win 10 上の `docs_scrolling` ベンチマークで82％の短縮（以下参照）を実現しています。驚くべきことに、バッチコンパイルは W^X のコスト以上にコンパイル性能を向上させる結果となりました。同様の操作をまとめることが CPU にとっても有効であるためです。以下のチャートに、コンパイル時間（Ignition + Sparkplug）における W^X の影響と、バッチコンパイルによるオーバーヘッドの緩和具合を示しています。

![ベンチマーク](/_img/v8-release-93/sparkplug.svg)

### `Object.hasOwn`

`Object.hasOwn` は `Object.prototype.hasOwnProperty.call` の簡便な別名です。

例えば:

```javascript
Object.hasOwn({ prop: 42 }, 'prop')
// → true
```

やや詳しい情報（あまり多くはありませんが！）は、[機能説明](https://v8.dev/features/object-has-own)をご覧ください。

### Error の原因

v9.3 から、複数の組み込みの `Error` コンストラクタが、第2パラメータとして `cause` 属性を含むオプションバッグを受け入れる形に拡張されました。このようなオプションバッグが渡された場合、`cause` 属性の値は `Error` インスタンスの独自プロパティとして設定されます。これにより、エラーを連鎖させる標準化された方法が提供されます。

例えば:

```javascript
const parentError = new Error('parent');
const error = new Error('parent', { cause: parentError });
console.log(error.cause === parentError);
// → true
```

通常通り、より詳細な[機能説明](https://v8.dev/features/error-cause)をご覧ください。

## Android で不信コード緩和策を無効化

3年前、Spectre 攻撃に対抗するために一連の[コード生成緩和策](https://v8.dev/blog/spectre)を導入しました。しかし、これらは [Spectre](https://spectreattack.com/spectre.pdf) 攻撃への部分的な緩和しか提供せず、一時的な措置であることは当初から認識していました。唯一の効果的な保護策は、ウェブサイトを[サイト分離](https://blog.chromium.org/2021/03/mitigating-side-channel-attacks.html)によって隔離することです。サイト分離はデスクトップ版 Chrome では以前から有効化されていますが、Android で完全なサイト分離を有効化するにはリソースの制約により課題がありました。しかし Chrome 92 の時点で、[Android 上のサイト分離](https://security.googleblog.com/2021/07/protecting-more-with-site-isolation.html)が機密データを含む多数のサイトで有効化されました。

これにより、Android 用の Spectre に対する V8 のコード生成緩和策を無効化する決定をしました。これらの緩和策はサイト分離ほど効果的ではなく、性能コストを課します。無効化することにより、Android が V8 v7.0 以降この緩和策が無効化されているデスクトッププラットフォームと同等になります。これらの緩和策を無効化することで、Android 上のベンチマーク性能が大幅に向上したことが確認されています。

![性能向上](/_img/v8-release-93/code-mitigations.svg)

## V8 API

`git log branch-heads/9.2..branch-heads/9.3 include/v8.h` を使用して、API の変更点のリストを取得してください。
