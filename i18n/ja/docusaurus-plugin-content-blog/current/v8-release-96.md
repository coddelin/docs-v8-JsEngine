---
title: &apos;V8リリース v9.6&apos;
author: &apos;Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))&apos;
avatars:
 - &apos;ingvar-stepanyan&apos;
date: 2021-10-13
tags:
 - release
description: &apos;V8リリース v9.6 では、WebAssemblyへの参照型のサポートが追加されました。&apos;
tweet: &apos;1448262079476076548&apos;
---
毎月4週間ごとに、私たちは[リリースプロセス](https://v8.dev/docs/release-process)の一環として、新しいV8のブランチを作成しています。各バージョンは、Chrome Betaマイルストーンの直前にV8のGitマスターから分岐されます。本日、最新のブランチ [V8バージョン9.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.6) を発表できて大変嬉しいです。このバージョンは、数週間後にChrome 96の安定版と連携してリリースされるまでベータ版となります。V8 v9.6は、開発者向けのさまざまな新機能を備えています。この投稿では、リリースに先立っていくつかの注目すべき点を予習としてご紹介します。

<!--truncate-->
## WebAssembly

### 参照型

[Reference Types提案](https://github.com/WebAssembly/reference-types/blob/master/proposals/reference-types/Overview.md)はV8 v9.6で実装され、JavaScriptからの外部参照を安全にWebAssemblyモジュール内で使用できるようにします。`externref`（以前は`anyref`として知られていた）データ型は、JavaScriptオブジェクトへの参照を安全に保持する方法を提供し、V8のガベージコレクタと完全に統合されています。

すでに参照型をオプションでサポートしているいくつかのツールチェーンには、[Rustのためのwasm-bindgen](https://rustwasm.github.io/wasm-bindgen/reference/reference-types.html)や[AssemblyScript](https://www.assemblyscript.org/compiler.html#command-line-options)があります。

## V8 API

`git log branch-heads/9.5..branch-heads/9.6 include/v8\*.h`を使用して、APIの変更リストを取得してください。

アクティブなV8チェックアウトを行っている開発者は、`git checkout -b 9.6 -t branch-heads/9.6`を使用してV8 v9.6の新機能を試すことができます。または、[Chromeのベータチャンネルに登録](https://www.google.com/chrome/browser/beta.html)して、近々新機能をお試しいただくことも可能です。
