---
title: 'iOS向けクロスコンパイル'
description: 'このドキュメントでは、iOS向けのV8をクロスコンパイルする方法を説明します。'
---
このページはiOSターゲット用にV8をビルドするための簡単な紹介ガイドです。

## 必須要件

- XcodeがインストールされたmacOS（OS X）ホストマシン。
- 64ビットのターゲットiOSデバイス（レガシー32ビットiOSデバイスは非対応）。
- V8バージョン7.5またはそれ以降。
- iOSでは（2020年12月時点）jitlessが必須です。そのため、フラグ '--expose_gc --jitless' を使用してください。

## 初期設定

[V8をビルドするための手順](/docs/build)に従って作業を進めてください。

`v8` ソースディレクトリの親ディレクトリにある `.gclient` 設定ファイルに `target_os` を追加して、iOSクロスコンパイルに必要なツールを取得します。

```python
# [... .gclient の他の内容 (例えば'solutions' 変数など) ...]
target_os = ['ios']
```

`.gclient` を更新した後、`gclient sync` を実行して追加のツールをダウンロードします。

## 手動ビルド

このセクションでは、物理的なiOSデバイスまたはXcode iOSシミュレータで使用するためのモノリシックなV8バージョンをビルドする方法を示しています。このビルドの出力は、すべてのV8ライブラリとV8スナップショットを含む `libv8_monolith.a` ファイルです。

次のキーを挿入して、`gn args out/release-ios` を実行し、GNビルドファイルをセットアップします：

```python
ios_deployment_target = 10
is_component_build = false
is_debug = false
target_cpu = "arm64"                  # シミュレータビルドの場合は "x64"。
target_os = "ios"
use_custom_libcxx = false             # Xcodeのlibcxxを使用。
v8_enable_i18n_support = false        # 小さいバイナリを生成。
v8_monolithic = true                  # v8_monolithターゲットを有効化。
v8_use_external_startup_data = false  # スナップショットはバイナリに含まれる。
v8_enable_pointer_compression = false # iOSでは未対応。
```

次にビルドします：

```bash
ninja -C out/release-ios v8_monolith
```

最後に、生成された `libv8_monolith.a` ファイルをスタティックライブラリとしてXcodeプロジェクトに追加します。アプリケーションにV8を埋め込む詳細なドキュメンテーションについては、[V8の埋め込みを開始する](/docs/embed)を参照してください。
