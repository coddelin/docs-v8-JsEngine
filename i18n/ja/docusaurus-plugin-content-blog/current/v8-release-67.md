---
title: 'V8リリースv6.7'
author: 'V8チーム'
date: 2018-05-04 13:33:37
tags:
  - リリース
tweet: '992506342391742465'
description: 'V8 v6.7は、より多くの不信任コード緩和策を追加し、BigIntサポートを提供します。'
---
6週ごとに、[リリースプロセス](/docs/release-process)の一環としてV8の新しいブランチを作成しています。各バージョンは、Chrome Betaマイルストーン直前にV8のGitマスターから分岐されます。本日、最新のブランチ[V8 version 6.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.7)を発表できることを嬉しく思います。これは数週間でChrome 67のStable版との連携でリリースされるまでベータ版です。V8 v6.7には開発者向けの便利な機能が満載です。本投稿ではリリースに先立ち、そのハイライトの一部をご紹介します。

<!--truncate-->
## JavaScript言語機能

V8 v6.7はデフォルトでBigIntサポートを備えています。BigIntはJavaScriptの新しい数値プリミティブで、任意の精度で整数を表現できます。[BigInt機能の説明](/features/bigint)を読んで、JavaScriptでBigIntがどのように使用されるかについて詳しく学び、[V8の実装の詳細についての記事](/blog/bigint)もご覧ください。

## 不信任コード緩和策

V8 v6.7では、情報漏洩を防ぐために不信任JavaScriptおよびWebAssemblyコードに対する[追加の側チャネル脆弱性緩和策](/docs/untrusted-code-mitigations)を導入しました。

## V8 API

API変更のリストを取得するには、`git log branch-heads/6.6..branch-heads/6.7 include/v8.h`を使用してください。

アクティブな[V8チェックアウト](/docs/source-code#using-git)を持つ開発者は、`git checkout -b 6.7 -t branch-heads/6.7`を使用してV8 v6.7の新機能を実験できます。または、[Chromeのベータチャンネル](https://www.google.com/chrome/browser/beta.html)に登録して、近いうちに新機能を試すこともできます。
