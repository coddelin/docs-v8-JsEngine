---
title: 'V8リリース v7.7'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))、リリースノートの怠けた作成者'
avatars:
  - 'mathias-bynens'
date: 2019-08-13 16:45:00
tags:
  - リリース
description: 'V8 v7.7 は遅延フィードバック割り当て、WebAssemblyのバックグラウンドコンパイルの高速化、スタックトレースの改善、新しいIntl.NumberFormat機能を備えています。'
tweet: '1161287541611323397'
---
V8では、6週間ごとに[リリースプロセス](/docs/release-process)の一環として新しいブランチを作成します。各バージョンはChrome Betaの節目直前にV8のGitマスターからブランチされます。本日、私たちは最新のブランチ、[V8バージョン7.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.7)を発表できることを嬉しく思います。このブランチは数週間後にChrome 77 Stableと連携してリリースされるまでベータ版です。V8 v7.7には開発者に向けた様々な魅力的な新機能が満載です。この投稿ではリリースに向けたハイライトのプレビューを提供します。

<!--truncate-->
## パフォーマンス（サイズ＆速度）

### 遅延フィードバック割り当て

JavaScriptを最適化するために、V8は様々な操作に渡されるオペランドのタイプについてフィードバックを収集します（例: `+` または `o.foo`）。このフィードバックはこれらの操作を特定のタイプに合わせて最適化するために使用されます。この情報は「フィードバックベクター」に保存されており、これにより高速な実行が実現しますが、フィードバックベクターの割り当てに必要なメモリ使用量にコストを払うことになります。

V8のメモリ使用量を削減するために、フィードバックベクターは関数が特定のバイトコード量を実行した後に遅延で割り当てられるようになりました。これにより、収集されたフィードバックから利益を得ない短命な関数にはフィードバックベクターが割り当てられることを避けることができます。当社のラボ実験では、フィードバックベクターを遅延で割り当てることでV8ヒープサイズを約2〜8％削減できることが示されています。

![](/_img/v8-release-77/lazy-feedback-allocation.svg)

実際の環境での実験では、これによりChromeユーザーにおいてデスクトップでV8のヒープサイズが1〜2％、モバイルプラットフォームで5〜6％削減されることが示されました。デスクトップではパフォーマンスの低下はなく、モバイルプラットフォームではメモリが限られた低価格の電話機で実際にパフォーマンスの改善も見られました。メモリを節約する最近の作業に関する詳細なブログ投稿をご期待ください。

### WebAssemblyのスケーラブルなバックグラウンドコンパイル

過去のマイルストーンではWebAssemblyのバックグラウンドコンパイルのスケーラビリティに取り組んできました。コンピューターにコアが多ければ多いほど、この効果をより享受できます。以下のグラフは24コアのXeonマシンで作成され、[Epic ZenGarden デモ](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html)をコンパイルしています。スレッド数に応じて、V8 v7.4 と比較してコンパイル時間を半分以下に短縮できます。

![](/_img/v8-release-77/liftoff-compilation-speedup.svg)

![](/_img/v8-release-77/turbofan-compilation-speedup.svg)

### スタックトレースの改善

V8で投げられるほぼすべてのエラーは作成時にスタックトレースをキャプチャします。このスタックトレースはJavaScriptから非標準の `error.stack` プロパティを通じてアクセスできます。スタックトレースが初めて `error.stack` を通じて取得されると、V8は基盤にある構造化スタックトレースを文字列にシリアル化します。このシリアル化されたスタックトレースは、後の `error.stack` アクセスを高速化するために保持されます。

過去のバージョンでは、[スタックトレースロジックの内部リファクタリング](https://docs.google.com/document/d/1WIpwLgkIyeHqZBc9D3zDtWr7PL-m_cH6mfjvmoC6kSs/edit) ([追跡バグ](https://bugs.chromium.org/p/v8/issues/detail?id=8742))に取り組み、コードを簡素化し、スタックトレースシリアル化のパフォーマンスを最大30％向上させました。

## JavaScript言語機能

[`Intl.NumberFormat` API](/features/intl-numberformat)は、このリリースでロケール対応の番号フォーマットに新しい機能を追加しました！コンパクトな表記、科学的表記、工学的表記、符号表示、および測定単位に対応しています。

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'meter-per-second',
});
formatter.format(299792458);
// → '299,792,458 m/s'
```

[機能の説明](/features/intl-numberformat)を参照して詳細を確認してください。

## V8 API

`git log branch-heads/7.6..branch-heads/7.7 include/v8.h` を使用してAPI変更のリストを取得してください。

アクティブな[V8チェックアウト](/docs/source-code#using-git)をお持ちの開発者は、`git checkout -b 7.7 -t branch-heads/7.7` を使用してV8 v7.7の新機能を試すことができます。または、[Chromeのベータチャンネルに登録](https://www.google.com/chrome/browser/beta.html)して、新機能を自分で試してみることができます。
