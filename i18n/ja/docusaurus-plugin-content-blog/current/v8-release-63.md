---
title: "V8リリースv6.3"
author: "V8チーム"
date: "2017-10-25 13:33:37"
tags: 
  - release
description: "V8 v6.3はパフォーマンスの向上、メモリ消費の削減、新しいJavaScript言語機能のサポートを含みます。"
tweet: "923168001108643840"
---
6週間ごとに、私たちの[リリースプロセス](/docs/release-process)の一環としてV8の新しいブランチを作成します。各バージョンはChrome Betaマイルストーンの直前にV8のGitマスターから分岐されます。本日、私たちは最新のブランチ[V8バージョン6.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.3)を発表できることを嬉しく思います。このブランチは、数週間後にChrome 63の安定版と連携してリリースされるまでベータ版です。V8 v6.3は、開発者向けの素晴らしい改善が詰まっています。この投稿では、リリースに向けたハイライトのいくつかを予告します。

<!--truncate-->
## 高速化

[Jank Busters](/blog/jank-busters) III が [Orinoco](/blog/orinoco) プロジェクトの一環として登場しました。並行マーク（マークの[70-80%](https://chromeperf.appspot.com/report?sid=612eec65c6f5c17528f9533349bad7b6f0020dba595d553b1ea6d7e7dcce9984) はノンブロッキングスレッド上で実行される）が出荷されました。

パーサーはもはや[関数を再度事前解析する必要はありません](https://docs.google.com/document/d/1TqpdGeLmURL2gc18s6PwNeyZOvayQJtJ16TCn0BEt48/edit#heading=h.un2pnqwbiw11)。これにより、内部起動Top25ベンチマークで[中央値14%の解析時間の改善](https://docs.google.com/document/d/1TqpdGeLmURL2gc18s6PwNeyZOvayQJtJ16TCn0BEt48/edit#heading=h.dvuo4tqnsmml)が得られます。

`string.js` は完全にCodeStubAssemblerに移植されました。[Peterwmwong](https://twitter.com/peterwmwong)さんによる[素晴らしい貢献](https://chromium-review.googlesource.com/q/peter.wm.wong)に感謝します。これにより、V8 v6.3の時点で`String#trim`のような組み込みの文字列関数が非常に速くなります。

`Object.is()`のパフォーマンスは、代替案にほぼ匹敵するようになりました。一般的に言えば、V8 v6.3はES2015+の性能向上に向けた道を引き続き進んでいます。他の項目に加え、[シンボルの多型アクセスの速度](https://bugs.chromium.org/p/v8/issues/detail?id=6367)、[コンストラクタ呼び出しの多型インライン化](https://bugs.chromium.org/p/v8/issues/detail?id=6885)、および[タグ付きテンプレートリテラル](https://pasteboard.co/GLYc4gt.png)の速度を向上させました。

![過去6回のリリースにわたるV8のパフォーマンス](/_img/v8-release-63/ares6.svg)

弱最適化関数リストは廃止されました。詳しい情報は[専用ブログ記事](/blog/lazy-unlinking)で確認できます。

上述の項目は、速度改善の完全なリストではありません。他にも多くのパフォーマンス関連の作業が行われています。

## メモリ消費

[Write barriersがCodeStubAssemblerを使用するように切り替えられました](https://chromium.googlesource.com/v8/v8/+/dbfdd4f9e9741df0a541afdd7516a34304102ee8)。これにより、各アイソレートで約100KBのメモリを節約できます。

## JavaScript言語機能

V8は以下のステージ3機能をサポートするようになりました：[動的モジュールインポート`import()`](https://features/dynamic-import)、[`Promise.prototype.finally()`](/features/promise-finally) および[非同期のイテレーター/ジェネレーター](https://github.com/tc39/proposal-async-iteration)。

[動的モジュールインポート](/features/dynamic-import)を使用すると、実行時条件に基づいてモジュールを非常に簡単にインポートできます。これは特定のコードモジュールを遅延ロードする必要があるアプリケーションに便利です。

[`Promise.prototype.finally`](/features/promise-finally)は、Promiseが解決された後に簡単にクリーンアップする方法を導入します。

[非同期のイテレーター/ジェネレーター](https://github.com/tc39/proposal-async-iteration)の導入により、非同期関数によるイテレーションがより使いやすくなりました。

`Intl`側では、[`Intl.PluralRules`](/features/intl-pluralrules)がサポートされました。このAPIは、高性能な国際化された複数形表現を可能にします。

## インスペクター/デバッグ

Chrome 63では、[ブロックカバレッジ](https://docs.google.com/presentation/d/1IFqqlQwJ0of3NuMvcOk-x4P_fpi1vJjnjGrhQCaJkH4/edit#slide=id.g271d6301ff_0_44)がDevTools UIでサポートされるようになりました。インスペクタープロトコルはすでにV8 v6.2からブロックカバレッジをサポートしています。

## V8 API

API変更の[概要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)をご覧ください。このドキュメントは、各主要リリースの数週間後に定期的に更新されています。

[アクティブなV8チェックアウト](/docs/source-code#using-git)を持つ開発者は、git checkout -b 6.3 -t branch-heads/6.3を使用して、新しいV8 v6.3の機能を試すことができます。または[Chrome Betaチャネル](https://www.google.com/chrome/browser/beta.html)に登録し、新機能をすぐに自分で試してみることができます。
