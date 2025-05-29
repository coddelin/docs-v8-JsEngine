---
title: 'GUIとIDEの設定'
description: 'このドキュメントには、V8コードベースを操作するためのGUIおよびIDE固有のヒントが含まれています。'
---
V8のソースコードは[Chromium Code Search](https://cs.chromium.org/chromium/src/v8/)でオンラインで閲覧できます。

このプロジェクトのGitリポジトリは、他の多くのクライアントプログラムやプラグインを使用してアクセスできます。詳細については、使用するクライアントのドキュメントを参照してください。

## Visual Studio Codeとclangd

VSCodeをV8用にセットアップする手順については、この[ドキュメント](https://docs.google.com/document/d/1BpdCFecUGuJU5wN6xFkHQJEykyVSlGN8B9o3Kz2Oes8/)を参照してください。これが現在(2021年)推奨される設定です。

## Eclipse

EclipseをV8用にセットアップする手順については、この[ドキュメント](https://docs.google.com/document/d/1q3JkYNJhib3ni9QvNKIY_uarVxeVDiDi6teE5MbVIGQ/)を参照してください。注意: 2020年現在、EclipseでV8をインデックス化するのはうまく動作しません。

## Visual Studio Codeとcquery

VSCodeとcqueryは優れたコードナビゲーション機能を提供します。C++シンボルに対する「定義に移動」や「すべての参照を検索」機能を備えており、非常に良好に動作します。このセクションでは、*nixシステムで基本的なセットアップを行う方法を説明します。

### VSCodeをインストール

好みの方法でVSCodeをインストールしてください。このガイドでは、コマンドラインで`code`コマンドを使用してVSCodeを実行できることを前提とします。

### cqueryをインストール

[cquery](https://github.com/cquery-project/cquery)をお好きなディレクトリにクローンしてください。このガイドでは`CQUERY_DIR="$HOME/cquery"`を使用します。

```bash
git clone https://github.com/cquery-project/cquery "$CQUERY_DIR"
cd "$CQUERY_DIR"
git submodule update --init
mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=release -DCMAKE_INSTALL_PREFIX=release -DCMAKE_EXPORT_COMPILE_COMMANDS=YES
make install -j8
```

何か問題が発生した場合は、必ず[cqueryの入門ガイド](https://github.com/cquery-project/cquery/wiki)を確認してください。

後でcqueryを更新するには、`git pull && git submodule update`を使用できます（`cmake .. -DCMAKE_BUILD_TYPE=release -DCMAKE_INSTALL_PREFIX=release -DCMAKE_EXPORT_COMPILE_COMMANDS=YES && make install -j8`で再ビルドするのを忘れないでください）。

### VSCode用cquery-pluginをインストールして構成する

cquery拡張機能をVSCodeのマーケットプレイスからインストールします。V8チェックアウト内でVSCodeを開きます:

```bash
cd v8
code .
```

VSCodeの設定に移動します。例えば、ショートカット<kbd>Ctrl</kbd> + <kbd>,</kbd>を使用します。

以下の内容を適切に`YOURUSERNAME`および`YOURV8CHECKOUTDIR`を置き換えてワークスペース構成に追加してください。

```json
"settings": {
  "cquery.launch.command": "/home/YOURUSERNAME/cquery/build/release/bin/cquery",
  "cquery.cacheDirectory": "/home/YOURUSERNAME/YOURV8CHECKOUTDIR/.vscode/cquery_cached_index/",
  "cquery.completion.include.blacklist": [".*/.vscache/.*", "/tmp.*", "build/.*"],
  […]
}
```

### `compile_commands.json`をcqueryに提供する

最後のステップは、cqueryに`compile_commands.json`を生成することです。このファイルには、cqueryが使用するV8をビルドする際の特定のコンパイラーコマンドラインが含まれます。V8チェックアウト内で以下のコマンドを実行してください:

```bash
ninja -C out.gn/x64.release -t compdb cxx cc > compile_commands.json
```

このコマンドは、時間が経つにつれて新しいソースファイルをcqueryに教えるために再実行する必要があります。特に、`BUILD.gn`が変更された後、常にコマンドを再実行する必要があります。

### 他の便利な設定

Visual Studio Codeの括弧の自動閉じ機能はあまりうまく動作しません。この機能は以下で無効化できます。

```json
"editor.autoClosingBrackets": false
```

ユーザー設定で無効化します。

以下の除外マスクは、検索時に不要な結果を避けるのに役立ちます (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>):

```js
"files.exclude": {
  "**/.vscode": true,  // これはデフォルトの値です
},
"search.exclude": {
  "**/out*": true,     // これはデフォルトの値です
  "**/build*": true    // これはデフォルトの値です
},
```
