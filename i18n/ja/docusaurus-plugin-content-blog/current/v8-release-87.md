---
title: "V8リリースv8.7"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), V8の旗手"
avatars: 
 - "ingvar-stepanyan"
date: 2020-10-23
tags: 
 - リリース
description: "V8リリースv8.7はネイティブ呼び出し用の新しいAPI、Atomics.waitAsync、バグ修正、パフォーマンス改善をもたらします。"
tweet: "1319654229863182338"
---
V8では、6週間ごとに新しいブランチを作成する[リリースプロセス](https://v8.dev/docs/release-process)の一環として、新しいバージョンを提供しています。各バージョンは、Chromeのベータ版マイルストーンの直前にV8のGitマスターからブランチが作成されます。本日、最新のブランチ[V8バージョン8.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.7)を発表できることを嬉しく思います。このバージョンは数週間後にChrome 87の安定版に合わせてリリースされるまでベータ版にあります。V8 v8.7は、開発者向けの数多くの機能が盛り込まれています。この投稿では、リリースに先駆けていくつかのハイライトを紹介します。

<!--truncate-->
## JavaScript

### 危険な高速JS呼び出し

V8 v8.7には、JavaScriptからネイティブ呼び出しを行うための強化されたAPIが含まれています。

この機能は現在まだ実験的で、V8では`--turbo-fast-api-calls`フラグ、Chromeでは`--enable-unsafe-fast-js-calls`フラグを通じて有効化できます。この機能はChromeの一部のネイティブグラフィックスAPIのパフォーマンス向上を目的としていますが、他の埋め込みアプリケーションでも使用できます。このAPIは、開発者が`v8::FunctionTemplate`のインスタンスを作成する新しい手段を提供します。この詳細は[こちらのヘッダーファイル](https://source.chromium.org/chromium/chromium/src/+/master:v8/include/v8-fast-api-calls.h)で確認できます。オリジナルAPIで作成された関数には影響を与えません。

詳細および利用可能な機能一覧については[こちらの説明文](https://docs.google.com/document/d/1nK6oW11arlRb7AA76lJqrBIygqjgdc92aXUPYecc9dU/edit?usp=sharing)をご覧ください。

### `Atomics.waitAsync`

[`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md)がV8 v8.7で利用可能になりました。

[`Atomics.wait`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/wait)および[`Atomics.notify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/notify)は、ミューテックスや同期手段を実装するために役立つ低レベルの同期プリミティブです。ただし、`Atomics.wait`はブロッキングであるため、メインスレッドで呼び出すことはできません（試みた場合はTypeErrorがスローされます）。非ブロッキング版の[`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md)は、メインスレッドでも利用可能です。

`Atomics` APIの詳細については[こちらの説明文](https://v8.dev/features/atomics)をご参照ください。

## V8 API

`git log branch-heads/8.6..branch-heads/8.7 include/v8.h`を使用することで、APIの変更一覧を取得できます。

アクティブなV8チェックアウトを持つ開発者は、`git checkout -b 8.7 -t branch-heads/8.7`を使用してV8 v8.7の新機能を試すことができます。または、[Chromeのベータ版チャンネルを購読する](https://www.google.com/chrome/browser/beta.html)ことで、新機能をすぐに試すことも可能です。
