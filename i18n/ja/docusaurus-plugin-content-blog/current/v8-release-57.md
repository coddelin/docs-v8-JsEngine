---
title: 'V8リリースv5.7'
author: 'V8チーム'
date: 2017-02-06 13:33:37
tags:
  - リリース
description: 'V8 v5.7はデフォルトでWebAssemblyを有効化し、パフォーマンスの改善とECMAScript言語機能のサポートを強化しています。'
---
毎6週間ごとに、私たちは[リリースプロセス](/docs/release-process)の一環としてV8の新しいブランチを作成しています。各バージョンは、Chromeのベータマイルストーン直前にV8のGitマスターから分岐されます。本日、私たちは最新のブランチ[V8バージョン5.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.7)を発表します。このブランチは数週間後にChrome 57 Stableと調整してリリースされるまでベータ版となります。V8 5.7には、開発者向けの多くの便利な機能が詰まっています。このリリースを前に、一部のハイライトをご紹介します。

<!--truncate-->
## パフォーマンスの改善

### ネイティブasync関数の性能がPromiseと同等

Async関数は、Promiseを使用したコードとほぼ同じくらい高速になりました。当チームの[microbenchmarks](https://codereview.chromium.org/2577393002)によると、Async関数の実行性能は4倍に向上しました。同期間中、Promise全体の性能も倍増しました。

![Linux x64でのV8におけるAsync性能向上](/_img/v8-release-57/async.png)

### ES2015の継続的な改善

V8は新しい言語機能を性能コストなしで使えるように、ES2015言語機能を高速化し続けています。スプレッド演算子、分割代入、ジェネレーターは現在では[その単純なES5相当とほぼ同等の速度](https://fhinkel.github.io/six-speed/)です。

### RegExpが15%高速化

RegExp関数を自己ホスト型のJavaScript実装からTurboFanのコード生成アーキテクチャに結び付けた実装に移行することで、RegExp全体のパフォーマンスが約15%向上しました。詳細は[こちらのブログ記事](/blog/speeding-up-regular-expressions)をご覧ください。

## JavaScript言語機能

ECMAScript標準ライブラリへの最近の追加機能のいくつかがこのリリースに含まれています。2つのStringメソッド、[`padStart`](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/padStart)と[`padEnd`](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd)は便利な文字列フォーマット機能を提供し、[`Intl.DateTimeFormat.prototype.formatToParts`](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat/formatToParts)はロケールに応じた日付/時刻のフォーマットをカスタマイズする能力を提供します。

## WebAssembly有効化

Chrome 57（V8 v5.7を含む）は、デフォルトでWebAssemblyを有効化する最初のリリースとなります。詳細については、[webassembly.org](http://webassembly.org/)の開始ガイドおよび[MDN](https://developer.mozilla.org/ja/docs/WebAssembly/API)のAPIドキュメントをご覧ください。

## V8 APIへの追加

私たちの[API変更の概要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)をご覧ください。このドキュメントは主要リリースの数週間後に定期的に更新されます。[アクティブなV8チェックアウト](/docs/source-code#using-git)を持つ開発者は、`git checkout -b 5.7 -t branch-heads/5.7`を使用してV8 v5.7の新機能を試すことができます。または、[Chromeのベータチャンネル](https://www.google.com/chrome/browser/beta.html)を購読し、間もなく新機能をお試しください。

### `PromiseHook`

このC++ APIにより、Promiseのライフサイクルを追跡するプロファイリングコードの実装が可能になります。これにより、Nodeの新しい[AsyncHook API](https://github.com/nodejs/node-eps/pull/18)が実現され、[非同期コンテキスト伝播](https://docs.google.com/document/d/1tlQ0R6wQFGqCS5KeIw0ddoLbaSYx6aU7vyXOkv-wvlM/edit#)を構築できます。

`PromiseHook` APIは次の4つのライフサイクルフックを提供します：init、resolve、before、after。新しいPromiseが作成されるとinitフックが実行され、Promiseが解決されるとresolveフックが実行されます。pre & postフックは[`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob)の直前と直後に実行されます。詳細については、[追跡問題](https://bugs.chromium.org/p/v8/issues/detail?id=4643)および[設計ドキュメント](https://docs.google.com/document/d/1rda3yKGHimKIhg5YeoAmCOtyURgsbTH_qaYR79FELlk/edit)をご覧ください。
