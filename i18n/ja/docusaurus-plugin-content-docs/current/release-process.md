---
title: "リリースプロセス"
description: "このドキュメントはV8のリリースプロセスを説明します。"
---
V8のリリースプロセスは[Chrome](https://www.chromium.org/getting-involved/dev-channel)のリリースプロセスと密接に連携しています。V8チームは、Chromeのすべてのリリースチャンネルを利用して新しいバージョンをユーザーに提供しています。

Chromeリリースで使用されているV8バージョンを確認したい場合は、[Chromiumdash](https://chromiumdash.appspot.com/releases)をチェックできます。Chromeの各リリースに対して、V8リポジトリ内に個別のブランチが作成されるため、たとえば[Chrome M121](https://chromium.googlesource.com/v8/v8/+log/refs/branch-heads/12.1)のように逆引きが簡単です。

## カナリリリース

毎日、新しいカナリビルドが[Chromeのカナリチャンネル](https://www.google.com/chrome/browser/canary.html?platform=win64)を通じてユーザーに配信されます。通常、配信されるものは[main](https://chromium.googlesource.com/v8/v8.git/+/refs/heads/main)の最新で十分に安定したバージョンです。

カナリのブランチは通常以下のようになります:

## 開発版リリース

毎週、新しい開発版ビルドが[Chromeの開発版チャンネル](https://www.google.com/chrome/browser/desktop/index.html?extra=devchannel&platform=win64)を通じてユーザーに配信されます。通常、配信されるものはカナリチャンネルでの最新で十分に安定したV8バージョンを含みます。


## ベータリリース

概ね2週間ごとに新しい主要ブランチが作成されます。例：[Chrome 94](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.4)。これは[Chromeのベータチャンネル](https://www.google.com/chrome/browser/beta.html?platform=win64)の作成に同期して行われます。Chrome BetaはV8のブランチの先頭に固定されます。約2週間後にこのブランチは安定版に昇格します。

変更はバージョンの安定化を目的としてブランチに対してのみチェリーピックされます。

ベータのブランチは通常以下のようになります:

```
refs/branch-heads/12.1
```

カナリブランチに基づいています。

## 安定版リリース

概ね4週間ごとに新しい安定版リリースが行われます。特別なブランチは作成されず、最新のベータブランチが単純に安定版に昇格します。このバージョンは[Chromeの安定版チャンネル](https://www.google.com/chrome/browser/desktop/index.html?platform=win64)を通じてユーザーに配信されます。

安定版リリースのブランチは通常以下のようになります:

```
refs/branch-heads/12.1
```

これらは昇格（再利用）されたベータブランチです。

## API

Chromiumdashは同じ情報を収集するためのAPIも提供しています:

```
https://chromiumdash.appspot.com/fetch_milestones (例: V8ブランチ名を取得するためのrefs/branch-heads/12.1)
https://chromiumdash.appspot.com/fetch_releases (例: V8ブランチのgitハッシュを取得する)
```

以下のパラメータが役立ちます:
mstone=121
channel=Stable,Canary,Beta,Dev
platform=Mac,Windows,Lacros,Linux,Android,Webview,etc.

## 自分のアプリケーションにどのバージョンを組み込むべきか？

Chromeの安定版チャンネルが使用している同じブランチの最新のもの。

重要なバグ修正を安定版ブランチに頻繁にバックマージするため、安定性やセキュリティ、正確性を気にする場合はこれらの更新も含めるべきです。そのため、特定のバージョンではなく「ブランチの最新」を推奨しています。

新しいブランチが安定版に昇格するたびに、以前の安定版ブランチのメンテナンスを停止します。これは4週間ごとに発生するため、少なくともこの頻度で更新する準備が必要です。

**関連:** [どのV8バージョンを使用すべきか？](/docs/version-numbers#which-v8-version-should-i-use%3F)
