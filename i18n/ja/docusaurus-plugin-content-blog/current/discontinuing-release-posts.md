---
title: "リリースブログ投稿を終了"
author: "Shu-yu Guo ([@shu_](https://twitter.com/_shu))"
avatars: 
 - "shu-yu-guo"
date: 2022-06-17
tags: 
 - release
description: "V8はChromeのリリーススケジュールや機能に関するブログ投稿を支持し、リリースブログ投稿を終了します。"
tweet: "1537857497825824768"
---

V8の新しいリリースブランチごとにブログ投稿が行われてきましたが、v9.9以降、リリースブログ投稿がないことにお気づきかもしれません。v10.0以降、新しいブランチごとのリリースブログ投稿を終了します。しかしご安心ください。リリースブログ投稿で入手できていた情報はすべて引き続き入手可能です！今後その情報をどこで見つけられるかを以下にお読みください。

<!--truncate-->
## リリーススケジュールと現在のバージョン

V8の最新リリースを把握するためにリリースブログ投稿を読んでいましたか？

V8はChromeのリリーススケジュールに準拠しています。V8の最新の安定版リリースについては、[Chromeリリースロードマップ](https://chromestatus.com/roadmap)をご参照ください。

毎月4週間ごとに、[リリースプロセス](https://v8.dev/docs/release-process)の一環として新しいV8のブランチを作成します。各バージョンはChrome Betaマイルストーン直前にV8のGitメインブランチからブランチ化されます。こうしたブランチはベータ版であり、[Chromeリリースロードマップ](https://chromestatus.com/roadmap)と連携してリリースされます。

Chromeバージョンの特定のV8ブランチを見つけるには:

1. Chromeのバージョンを10で割ってV8のバージョンを取得します。例えば、Chrome 102はV8 10.2となります。
1. バージョン番号X.Yの場合、そのブランチは次の形式のURLで見つけることができます：

```
https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/X.Y
```

例えば、10.2ブランチはhttps://chromium.googlesource.com/v8/v8.git/+log/branch-heads/10.2 で見つけることができます。

バージョン番号とブランチの詳細については、[詳細な記事](https://v8.dev/docs/version-numbers)をご覧ください。

V8バージョンX.Yについて、アクティブなV8チェックアウトを行っている開発者は`git checkout -b X.Y -t branch-heads/X.Y`を使用して、そのバージョンの新機能を試すことができます。

## 新しいJavaScriptまたはWebAssembly機能

新しいJavaScriptまたはWebAssemblyの機能がフラグの背後で実装されたか、デフォルトで有効になったかどうかを知るためにリリースブログ投稿を読んでいましたか？

[Chromeリリースロードマップ](https://chromestatus.com/roadmap)をご参照ください。このロードマップには、各リリースの新機能とマイルストーンがリストされています。

注： [独立した詳細な機能の記事](/features)は、その機能がV8に実装される前または後に公開されることがあります。

## 注目すべきパフォーマンスの向上

注目すべきパフォーマンスの向上について知るためにリリースブログ投稿を読んでいましたか？

今後、[Sparkplug](https://v8.dev/blog/sparkplug)のような過去の改善のために行ったように、注目すべきパフォーマンスの向上について独立したブログ投稿を書く予定です。

## APIの変更

APIの変更について知るためにリリースブログ投稿を読んでいましたか？

以前のバージョンA.Bと後のバージョンX.Yの間でV8 APIを変更したコミットのリストを参照するには、アクティブなV8チェックアウト内で`git log branch-heads/A.B..branch-heads/X.Y include/v8\*.h`を使用してください。
