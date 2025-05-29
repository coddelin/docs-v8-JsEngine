---
title: &apos;ソースからV8をビルドする&apos;
description: &apos;このドキュメントでは、ソースからV8をビルドする方法を説明します。&apos;
---
Windows/Linux/macOS用x64でV8を最初からビルドするためには、以下の手順に従ってください。

## V8ソースコードを取得する

[V8のソースコードをチェックアウトする](/docs/source-code)ガイドの手順に従ってください。

## ビルド依存関係のインストール

1. macOSの場合：Xcodeをインストールし、ライセンス契約に同意します。（コマンドラインツールを別途インストールした場合は、[まずそれを削除してください](https://bugs.chromium.org/p/chromium/issues/detail?id=729990#c1)）。

1. V8ソースディレクトリにいることを確認してください。前のセクションのすべての手順を実行していれば、すでに正しい場所にいます。

1. すべてのビルド依存関係をダウンロードします：

   ```bash
   gclient sync
   ```

   Googler向け - フック実行時にFailed to fetch fileやLogin requiredエラーが表示された場合、まずGoogle Storageに認証するため以下を実行してください：

   ```bash
   gsutil.py config
   ```

   @google.comのアカウントでログインし、プロジェクトIDを聞かれたら`0`を入力してください。

1. この手順はLinuxのみ必要です。追加のビルド依存関係をインストールします：

    ```bash
    ./build/install-build-deps.sh
    ```

## V8のビルド

1. `main`ブランチ上でV8ソースディレクトリにいることを確認してください。

    ```bash
    cd /path/to/v8
    ```

1. 最新の変更をプルし、新しいビルド依存関係をインストールします：

    ```bash
    git pull && gclient sync
    ```

1. ソースをコンパイルします：

    ```bash
    tools/dev/gm.py x64.release
    ```

    または、ソースをコンパイルしすぐにテストを実行するには：

    ```bash
    tools/dev/gm.py x64.release.check
    ```

    `gm.py`ヘルパースクリプトとそれがトリガーするコマンドの詳細については、[GNでのビルド](/docs/build-gn)をご覧ください。
