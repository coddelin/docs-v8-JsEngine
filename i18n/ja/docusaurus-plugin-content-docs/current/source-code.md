---
title: &apos;V8ソースコードのチェックアウト&apos;
description: &apos;このドキュメントでは、V8ソースコードをローカルにチェックアウトする方法を説明します。&apos;
---
このドキュメントでは、V8ソースコードをローカルにチェックアウトする方法を説明します。オンラインでソースを閲覧したい場合は、以下のリンクを使用してください：

- [閲覧](https://chromium.googlesource.com/v8/v8/)
- [最新の変更を閲覧](https://chromium.googlesource.com/v8/v8/+/master)
- [変更履歴](https://chromium.googlesource.com/v8/v8/+log/master)

## Gitの使用

V8のGitリポジトリは https://chromium.googlesource.com/v8/v8.git にあり、GitHubの公式ミラーは https://github.com/v8/v8 にあります。

これらのURLを直接`git clone`しないでください！V8をチェックアウトしてビルドしたい場合は、以下の手順に従い、正しく設定を行ってください。

## 手順

1. LinuxまたはmacOSでは、まずGitをインストールし、その後[`depot_tools`](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up)をインストールしてください。

    Windowsでは、Chromeの手順に従ってインストールしてください（[Google社員向け](https://goto.google.com/building-chrome-win)、[非Google社員向け](https://chromium.googlesource.com/chromium/src/+/master/docs/windows_build_instructions.md#Setting-up-Windows)）。Git、Visual Studio、Windowsデバッグツール、および`depot_tools`をインストールします。

1. ターミナル/シェルで以下を実行し、`depot_tools`を更新してください。Windowsでは、PowerShellや他のシェルではなく、コマンドプロンプト(`cmd.exe`)で行う必要があります。

    ```
    gclient
    ```

1. **プッシュアクセス**が必要な場合は、Gitのパスワードで`.netrc`ファイルを設定する必要があります：

    1. https://chromium.googlesource.com/new-password にアクセスし、コミッターアカウント（通常は`@chromium.org`アカウント）でログインします。注：新しいパスワードの作成は、以前に作成されたパスワードを自動的に無効化しません。`git config user.email`に設定されたメールと同じメールを使用してください。
    1. シェルコマンドを含む灰色の大きなボックスを確認し、その内容をシェルに貼り付けてください。

1. V8ソースコードをすべてのブランチと依存関係を含めて取得します：

    ```bash
    mkdir ~/v8
    cd ~/v8
    fetch v8
    cd v8
    ```

その後、意図的にヘッドが分離された状態になります。

新しいブランチをどのようにトラッキングするかを指定することもできます：

```bash
git config branch.autosetupmerge always
git config branch.autosetuprebase always
```

または、以下のようにして新しいローカルブランチを作成することもできます（推奨）：

```bash
git new-branch fix-bug-1234
```

## 最新状態を保つ

現在のブランチを`git pull`で更新します。ブランチにいない場合、`git pull`は使用できません。その場合は代わりに`git fetch`を使用してください。

```bash
git pull
```

V8の依存関係が更新されることがあります。それらを同期するには以下を実行してください：

```bash
gclient sync
```

## コードレビューへの送信

```bash
git cl upload
```

## コミット

コミットには（推奨）コードレビューのCQチェックボックスを使用します。CQフラグやトラブルシューティングについては[Chromiumの指示](https://chromium.googlesource.com/chromium/src/+/master/docs/infra/cq.md)も参照してください。

より多くのトライボットが必要な場合は、コミットメッセージに以下を追加します（例：nosnapボットを追加）：

```
CQ_INCLUDE_TRYBOTS=tryserver.v8:v8_linux_nosnap_rel
```

手動でランディングするには、ブランチを更新します：

```bash
git pull --rebase origin
```

その後、以下を使用してコミットします：

```bash
git cl land
```

## トライジョブ

このセクションはV8プロジェクトメンバー向けです。

### コードレビューからトライジョブを作成する

1. CLをGerritにアップロードします。

    ```bash
    git cl upload
    ```

1. トライボットにトライジョブを送信してCLを試します：

    ```bash
    git cl try
    ```

1. トライボットがビルドを終了し、結果のメールが届くのを待ちます。Gerritでパッチのトライ状態を確認することもできます。

1. パッチの適用に失敗した場合、パッチをリベースするか、同期するV8のリビジョンを指定する必要があります：

```bash
git cl try --revision=1234
```

### ローカルブランチからトライジョブを作成する

1. ローカルリポジトリのGitブランチにいくつかの変更をコミットします。

1. トライボットにトライジョブを送信して変更を試します：

    ```bash
    git cl try
    ```

1. トライボットがビルドを終了し、結果のメールが届くのを待ちます。注：現在、一部のレプリカに問題があります。コードレビューからトライジョブを送信することを推奨します。

### 有用な引数

リビジョン引数は、トライボットにローカル変更を適用するコードベースのリビジョンを指定します。リビジョンが指定されていない場合、[V8のLKGRリビジョン](https://v8-status.appspot.com/lkgr)が基準として使用されます。

```bash
git cl try --revision=1234
```

すべてのボットでトライジョブを実行しないようにするには、ビルダーネームをカンマ区切りで指定する`--bot`フラグを使用します。例：

```bash
git cl try --bot=v8_mac_rel
```

### トライサーバーの確認

```bash
git cl try-results
```

## ソースコードブランチ

V8にはいくつかの異なるブランチがあります。どのバージョンを取得するべきか迷った場合は、最新の安定版を選択するのがおそらく適切です。異なるブランチについての詳細は、[リリースプロセス](/docs/release-process)をご覧ください。

Chromeが安定版（またはベータ版）チャンネルで提供しているV8のバージョンを追跡したい場合は、https://omahaproxy.appspot.com/ を参照してください。
