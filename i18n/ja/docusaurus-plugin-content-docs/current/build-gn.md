---
title: &apos;GNを使用してV8をビルドする&apos;
description: &apos;このドキュメントは、GNを使用してV8を構築する方法を説明しています。&apos;
---
V8は[GN](https://gn.googlesource.com/gn/+/master/docs/)を使用して構築されます。GNは他の多くのビルドシステムのためのビルドファイルを生成するためのメタビルドシステムです。そのため、どの”バックエンド”のビルドシステムやコンパイラを使用するかによって、ビルド手順が変わります。
以下の手順は、既に[V8のチェックアウト](/docs/source-code)を行い、[ビルド依存関係をインストール](/docs/build)していることを前提としています。

GNに関する追加情報は、[Chromiumのドキュメント](https://www.chromium.org/developers/gn-build-configuration)や[GN自身のドキュメント](https://gn.googlesource.com/gn/+/master/docs/)に記載されています。

V8をソースからビルドするには、3つのステップが必要です:

1. ビルドファイルの生成
2. コンパイル
3. テストの実行

V8をビルドするには2つのワークフローがあります:

- 3つのステップを便利に組み合わせたヘルパースクリプト`gm`を使用する便利なワークフロー
- 各ステップを手動で実行する低レベルのコマンドを使用する生のワークフロー

## `gm`を使用してV8をビルドする（便利なワークフロー）

`gm`は、ビルドファイルの生成、ビルドのトリガー、およびオプションでテストの実行を行う便利なオールインワンスクリプトです。このスクリプトは、V8のチェックアウト中の`tools/dev/gm.py`にあります。シェル設定にエイリアスを追加することをお勧めします:

```bash
alias gm=/path/to/v8/tools/dev/gm.py
```

その後、`gm`を使用して、`x64.release`のような既知の設定でV8をビルドできます:

```bash
gm x64.release
```

ビルド直後にテストを実行するには、以下を実行します:

```bash
gm x64.release.check
```

`gm`は実行中のすべてのコマンドを出力するため、必要に応じてそれを追跡し再実行することが容易です。

`gm`を使用すると、必要なバイナリをビルドし、特定のテストを1つのコマンドで実行できます:

```bash
gm x64.debug mjsunit/foo cctest/test-bar/*
```

## V8をビルドする: 生の、手動のワークフロー

### ステップ 1: ビルドファイルを生成する

ビルドファイルを生成するにはいくつかの方法があります:

1. 生の手動ワークフローでは、直接`gn`を使用します。
2. `v8gen`というヘルパースクリプトが、一般的な設定用にプロセスを簡素化します。

#### `gn`を使用してビルドファイルを生成する

`gn`を使用して、ディレクトリ`out/foo`用のビルドファイルを生成します:

```bash
gn args out/foo
```

これによりエディタウィンドウが開き、[`gn`の引数](https://gn.googlesource.com/gn/+/master/docs/reference.md)を指定できます。また、引数をコマンドラインで渡すこともできます:

```bash
gn gen out/foo --args=&apos;is_debug=false target_cpu="x64" v8_target_cpu="arm64" use_goma=true&apos;
```

これにより、arm64シミュレータを使用したリリースモードで`goma`を使用してV8をコンパイルするためのビルドファイルが生成されます。

利用可能なすべての`gn`引数の概要を表示するには、以下を実行します:

```bash
gn args out/foo --list
```

#### `v8gen`を使用してビルドファイルを生成する

V8リポジトリには、一般的な設定用のビルドファイルをより簡単に生成するための便利なスクリプト`v8gen`が含まれています。シェル設定にエイリアスを追加することをお勧めします:

```bash
alias v8gen=/path/to/v8/tools/dev/v8gen.py
```

`v8gen --help`を実行して、詳細情報を確認してください。

利用可能な設定（またはマスターのボット）を一覧表示します:

```bash
v8gen list
```

```bash
v8gen list -m client.v8
```

`client.v8`ウォーターフォールの特定のボットのようにフォルダ`foo`でビルドする:

```bash
v8gen -b &apos;V8 Linux64 - debug builder&apos; -m client.v8 foo
```

### ステップ 2: V8をコンパイルする

`gn`が`x64.release`フォルダに生成されたと仮定して、V8全体をビルドするには、以下を実行します:

```bash
ninja -C out/x64.release
```

`d8`のような特定のターゲットをビルドするには、それらをコマンドに追加します:

```bash
ninja -C out/x64.release d8
```

### ステップ 3: テストを実行する

テストドライバに出力ディレクトリを渡すことができます。他の関連するフラグはビルドから推測されます:

```bash
tools/run-tests.py --outdir out/foo
```

`out.gn`にある最新のビルドをテストすることもできます:

```bash
tools/run-tests.py --gn
```

**ビルドの問題がありますか？[v8.dev/bug](/bug)でバグを報告するか、&lt;v8-users@googlegroups.com>で助けを求めてください。**
