---
title: &apos;V8リリース v5.9&apos;
author: &apos;V8チーム&apos;
date: 2017-04-27 13:33:37
tags:
  - リリース
description: &apos;V8 v5.9では新しいIgnition + TurboFanパイプラインが導入され、すべてのプラットフォームでWebAssembly TrapIfサポートが追加されています。&apos;
---
6週間ごとに、[リリースプロセス](/docs/release-process)の一環として新しいV8ブランチを作成しています。各バージョンは、Chromeのベータマイルストーンの直前にV8のGitマスターから分岐されます。本日、最新ブランチ[V8バージョン5.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.9)を発表することを嬉しく思います。このバージョンは数週間後にChrome 59 ステーブル版と連携してリリースされるまでベータ版になります。V8 5.9は開発者向けのさまざまな新機能を備えています。このリリースに先立ち、そのハイライトのいくつかをプレビューとしてお届けします。

<!--truncate-->
## Ignition+TurboFanが開始されました

V8 v5.9はIgnition+TurboFanがデフォルトで有効になった最初のバージョンとなります。一般的に、この切り替えによってメモリ消費が少なくなり、ウェブアプリケーション全体の起動が速くなるはずです。そして、この新しいパイプラインはすでに大規模なテストを受けているため、安定性やパフォーマンスの問題が発生することは想定していません。ただし、コードのパフォーマンスが急激に低下した場合は、[ご連絡ください](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline)。

詳細については、[専用ブログ記事](/blog/launching-ignition-and-turbofan)をご覧ください。

## すべてのプラットフォームでのWebAssembly `TrapIf`サポート

[WebAssembly `TrapIf`サポート](https://chromium.googlesource.com/v8/v8/+/98fa962e5f342878109c26fd7190573082ac3abe)により、コードのコンパイルにかかる時間が大幅に短縮されました（約30%）。

![](/_img/v8-release-59/angrybots.png)

## V8 API

[API変更の概要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)をご確認ください。このドキュメントは各主要リリースの数週間後に定期的に更新されます。

[アクティブなV8チェックアウト](/docs/source-code#using-git)を持つ開発者は、`git checkout -b 5.9 -t branch-heads/5.9`を使用してV8 5.9の新機能を試すことができます。または、[Chromeのベータチャンネル](https://www.google.com/chrome/browser/beta.html)に登録し、まもなく新機能を自分で体験することもできます。
