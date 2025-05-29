---
title: "Arm64 Linuxでのコンパイル"
description: "Arm64 Linux上でネイティブにV8を構築するためのヒントとコツ"
---
もし、x86やApple Silicon MacではないマシンでのV8の[チェックアウト](/docs/source-code)および[ビルド](/docs/build-gn)方法に関する指示を確認した後に問題に遭遇した場合、これはビルドシステムがネイティブバイナリをダウンロードし、それを実行できないためかもしれません。ただし、Arm64 Linuxマシンを使用してV8で作業することは__公式にはサポートされていません__が、それらの障害を乗り越えることは比較的簡単です。

## `vpython`の回避

`fetch v8`、`gclient sync`、その他の`depot_tools`コマンドは「vpython」というPythonラッパーを使用します。これに関連するエラーが発生した場合、以下の変数を定義して、システムのPythonインストールを使用するようにできます:

```bash
export VPYTHON_BYPASS="manually managed python not supported by chrome operations"
```

## 互換性のある`ninja`バイナリ

最初に行うべきことは、`ninja`のネイティブバイナリを使用することを確認することで、これを`depot_tools`のものではなく選択します。これを簡単に行う方法は、`depot_tools`をインストールする際に以下のようにPATHを調整することです:

```bash
export PATH=$PATH:/path/to/depot_tools
```

この方法により、システムの`ninja`インストールを利用できるようになります。もしなければ、[ソースからビルド](https://github.com/ninja-build/ninja#building-ninja-itself)することができます。

## clangのコンパイル

デフォルトでは、V8は自身のclangビルドを使用することを要求しますが、これはマシン上で実行できない可能性があります。GN引数を調整して[システムのclangまたはGCC](#system_clang_gcc)を使用することもできますが、アップストリームと同じclangを使用する方が良い場合があります。それが最もサポートされているバージョンだからです。

V8チェックアウトから直接ローカルでビルドすることができます:

```bash
./tools/clang/scripts/build.py --without-android --without-fuchsia \
                               --host-cc=gcc --host-cxx=g++ \
                               --gcc-toolchain=/usr \
                               --use-system-cmake --disable-asserts
```

## GN引数を手動で設定する

便利なスクリプトはデフォルトでは動作しない可能性があります。その代わり、[マニュアル](/docs/build-gn#gn)のワークフローに従ってGN引数を手動で設定する必要があります。以下の引数を使うことで通常の「release」、「optdebug」、「debug」構成を取得できます:

- `release`

```bash
is_debug=false
```

- `optdebug`

```bash
is_debug=true
v8_enable_backtrace=true
v8_enable_slow_dchecks=true
```

- `debug`

```bash
is_debug=true
v8_enable_backtrace=true
v8_enable_slow_dchecks=true
v8_optimized_debug=false
```

## システムのclangまたはGCCを使用する

GCCを使ったビルドはclangを使用するコンパイルを無効にするだけです:

```bash
is_clang=false
```

デフォルトでは、V8は`lld`をリンクすることを要求しますが、これは最近のバージョンのGCCを必要とします。`use_lld=false`を使うとgoldリンカに切り替えることができ、または`use_gold=false`で`ld`を使用することもできます。

システムにインストールされているclangを使用したい場合、例えば`/usr`にある場合は、以下の引数を使用できます:

```bash
clang_base_path="/usr"
clang_use_chrome_plugins=false
```

ただし、システムのclangバージョンが十分にサポートされていない場合、未知のコンパイラフラグなどの警告に対処する必要があるかもしれません。この場合、警告をエラーとして扱うのを止めるには以下を使用します:

```bash
treat_warnings_as_errors=false
```
