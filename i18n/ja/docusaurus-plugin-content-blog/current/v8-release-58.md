---
title: &apos;V8 リリース v5.8&apos;
author: &apos;V8チーム&apos;
date: 2017-03-20 13:33:37
tags:
  - リリース
description: &apos;V8 v5.8は任意のヒープサイズの使用を可能にし、スタートアップ性能を向上させます。&apos;
---
6週間ごとに、私たちは[リリースプロセス](/docs/release-process)の一環としてV8の新しいブランチを作成します。各バージョンはChrome Betaマイルストーンの直前にV8のGitマスターから分岐されます。本日、私たちは最新のブランチである[V8バージョン5.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.8)を発表できることを嬉しく思います。このバージョンは数週間後にChrome 58 Stableと連携してリリースされるまでベータ版となります。V8 5.8は開発者向けの様々な便利機能で満たされています。リリースを見越して、いくつかのハイライトをプレビューとしてご紹介します。

<!--truncate-->
## 任意のヒープサイズ

V8のヒープ制限は歴史的に、32ビット符号付き整数範囲に収まるように余裕を持たせて設定されていました。時間が経つにつれて、この便利さがV8内のコードを不注意にし、異なるビット幅の型を混成することになり、制限を増やす能力が実質的に妨げられることになりました。V8 v5.8では任意のヒープサイズの使用が可能になりました。詳しくは[専用のブログ投稿](/blog/heap-size-limit)をご覧ください。

## スタートアップ性能

V8 v5.8では、スタートアップ時にV8に費やされる時間を段階的に削減する作業を引き続き実施しました。コードのコンパイルや解析に費やされる時間の削減に加え、ICシステムの最適化により、[実際のスタートアップワークロード](/blog/real-world-performance)で約5%の改善が得られました。

## V8 API

[API変更の概要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)をご覧ください。この文書は各主要リリースの数週間後に定期的に更新されます。

[アクティブなV8チェックアウト](/docs/source-code#using-git)を持つ開発者は、`git checkout -b 5.8 -t branch-heads/5.8`を使用してV8 5.8の新機能を試すことができます。または、[Chromeのベータチャンネルに登録](https://www.google.com/chrome/browser/beta.html)して、新機能をすぐにお試しいただけます。
