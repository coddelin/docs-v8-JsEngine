---
title: "V8リリースv6.9"
author: "V8チーム"
date: "2018-08-07 13:33:37"
tags: 
  - リリース
description: "V8 v6.9は、埋め込み組み込み関数によるメモリ使用量削減、LiftoffによるWebAssemblyの起動速度向上、DataViewとWeakMapのパフォーマンス改善など、多くの新機能を備えています！"
tweet: "1026825606003150848"
---
6週間ごとに、V8は[リリースプロセス](/docs/release-process)の一環として新しいブランチを作成します。各バージョンは、Chromeのベータ版マイルストーン直前にV8のGitマスターから分岐されます。本日、最新のブランチ[V8バージョン6.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.9)を発表できることを嬉しく思います。このバージョンは数週間後のChrome 69 Stableのリリースと連携してベータ版で配信されます。V8 v6.9は開発者にとって多くの魅力的な機能が詰まっています。本記事では、リリースに先立ち、注目のハイライトについてのプレビューを提供します。

<!--truncate-->
## 組み込み機能によるメモリ削減

V8は広範な組み込み関数ライブラリを提供しています。例えば`Array.prototype.sort`や`RegExp.prototype.exec`のような組み込みオブジェクトのメソッド、または幅広い内部機能が含まれています。これらの関数の生成には時間がかかるため、組み込み関数はビルド時にコンパイルされ、[スナップショット](/blog/custom-startup-snapshots)としてシリアライズされます。その後、このスナップショットは実行時に逆シリアライズされ、初期JavaScriptヒープ状態を作成します。

現在、組み込み関数は各アイソレート（ブラウザタブにおおよそ対応）で700 KBを消費しています。これは非常に無駄が多いため、昨年からこのオーバーヘッドを削減する作業を進めています。V8 v6.4では、[遅延デシリアライゼーション](/blog/lazy-deserialization)を提供し、各アイソレートが実際に必要な組み込み機能の分だけ負担するようにしました（ただし、各アイソレートが独自のコピーを持っていました）。

[埋め込み組み込み機能](/blog/embedded-builtins)はさらに一歩進みます。埋め込み組み込み機能はすべてのアイソレート間で共有され、JavaScriptヒープにコピーされる代わりに、バイナリ自体に埋め込まれています。これにより、どれだけ多くのアイソレートが実行されていても、組み込み機能はメモリ内に1回だけ存在します。この性質は、[サイト・アイソレーション](https://developers.google.com/web/updates/2018/07/site-isolation)がデフォルトで有効化された現在、特に有用です。埋め込み組み込み機能を使用することで、x64プラットフォーム上で最上位10,000サイトのV8ヒープサイズを中央値で_9%削減_することができました。これらのサイトのうち、50%は少なくとも1.2 MBを、30%は少なくとも2.1 MBを、10%は3.7 MB以上を節約しています。

V8 v6.9では、x64プラットフォームでの埋め込み組み込み機能のサポートが提供されています。他のプラットフォームも近日中のリリースで対応予定です。詳細については、[専用ブログ記事](/blog/embedded-builtins)を参照してください。

## パフォーマンス

### Liftoff、WebAssemblyの新しい第1段階コンパイラ

WebAssemblyは、大規模なWebAssemblyモジュールを持つ複雑なウェブサイト（Google EarthやAutoCADなど）の起動を大幅に高速化するため、新しいベースラインコンパイラを導入しました。ハードウェアによっては10倍以上の速度向上が見られます。詳細は[詳しいLiftoffブログ記事](/blog/liftoff)をご参照ください。

<figure>
  <img src="/_img/v8-liftoff.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Liftoffのロゴ、V8のWebAssembly用ベースラインコンパイラ</figcaption>
</figure>

### より高速な`DataView`操作

[`DataView`](https://tc39.es/ecma262/#sec-dataview-objects)メソッドはV8 Torqueで再実装され、以前のランタイム実装と比較してC++呼び出しの手間が省かれました。また、TurboFanでJavaScriptコードをコンパイルするときに`DataView`メソッドの呼び出しをインライン化するようになり、ホットコードのピークパフォーマンスがさらに向上しました。これにより、`DataView`は`TypedArray`と同じくらい効率的になり、パフォーマンスが要求される状況でも`DataView`を選択肢とする価値が生まれました。`DataView`に関する詳しい内容は、次回のブログ記事で取り上げる予定ですので、お楽しみに！

### ガベージコレクション中の`WeakMap`処理の高速化

V8 v6.9では`WeakMap`の処理を改善することで、Mark-Compactガベージコレクションの停止時間を短縮しました。これまで最終的なMark-Compact GCの原子的停止フェーズで行われていた`WeakMap`の処理が、並行および増分のマークにより処理されるようになりました。全ての処理を停止時間外に移すことはできませんが、GCは停止時間をさらに短縮するために、並列でより多くの作業を行っています。この最適化により、[Web Tooling Benchmark](https://github.com/v8/web-tooling-benchmark)におけるMark-Compact GCの平均停止時間がほぼ半減しました。

`WeakMap` の処理は固定ポイント反復アルゴリズムを使用しており、特定のケースでは二次的なランタイム性能低下を引き起こす可能性があります。しかし、新しいリリースでは、GC が一定の反復回数内で終了しない場合に線形時間で終了することが保証される別のアルゴリズムに切り替えることが可能になりました。以前は、比較的小さなヒープであっても、GC が完了するのに数秒かかる最悪のケースが構築される可能性がありましたが、線形アルゴリズムでは数ミリ秒以内に終了します。

## JavaScript の言語仕様

V8 v6.9 は [`Array.prototype.flat` と `Array.prototype.flatMap`](/features/array-flat-flatmap) をサポートしています。

`Array.prototype.flat` は、指定された `depth` (デフォルトは `1`) まで再帰的に配列をフラット化します:

```js
// 1階層のみフラット化:
const array = [1, [2, [3]]];
array.flat();
// → [1, 2, [3]]

// 配列内のネストされた配列がなくなるまで再帰的にフラット化:
array.flat(Infinity);
// → [1, 2, 3]
```

`Array.prototype.flatMap` は `Array.prototype.map` に似ていますが、結果を新しい配列にフラット化します。

```js
[2, 3, 4].flatMap((x) => [x, x * 2]);
// → [2, 4, 3, 6, 4, 8]
```

詳しくは [`Array.prototype.{flat,flatMap}` の説明記事](/features/array-flat-flatmap) をご覧ください。

## V8 API

API の変更点一覧を取得するには `git log branch-heads/6.8..branch-heads/6.9 include/v8.h` を使用してください。

[V8 を利用中の開発者](/docs/source-code#using-git) は `git checkout -b 6.9 -t branch-heads/6.9` を使用して V8 v6.9 の新機能を試すことができます。または、[Chrome のベータ版チャンネルを登録](https://www.google.com/chrome/browser/beta.html)して、新機能を自分で試すこともできます。
