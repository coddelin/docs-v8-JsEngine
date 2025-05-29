---
title: &apos;テスト&apos;
description: &apos;このドキュメントは、V8リポジトリの一部であるテストフレームワークについて説明します。&apos;
---
V8にはエンジンをテストするためのテストフレームワークが含まれています。このフレームワークを使用すると、ソースコードに含まれる独自のテストスイートや、[Test262テストスイート](https://github.com/tc39/test262)などの他のテストを実行できます。

## V8テストの実行

[`gm`](/docs/build-gn#gm)を使用して、任意のビルドターゲットに`.check`を追加するだけで、テストを実行できます。例:

```bash
gm x64.release.check
gm x64.optdebug.check  # 推奨: 適度に速く、DCHECKが有効。
gm ia32.check
gm release.check
gm check  # デフォルトのすべてのプラットフォームをビルドしてテスト
```

`gm`はテストを実行する前に必要なターゲットを自動的にビルドします。テストを絞り込むこともできます:

```bash
gm x64.release test262
gm x64.debug mjsunit/regress/regress-123
```

すでにV8をビルドしている場合は、手動でテストを実行することもできます:

```bash
tools/run-tests.py --outdir=out/ia32.release
```

再度、実行するテストを指定することもできます:

```bash
tools/run-tests.py --outdir=ia32.release cctest/test-heap/SymbolTable/* mjsunit/delete-in-eval
```

`--help`を付けてスクリプトを実行すると、その他のオプションを確認できます。

## 追加テストの実行

デフォルトで実行されるテストセットには、すべての利用可能なテストが含まれているわけではありません。`gm`または`run-tests.py`のコマンドラインで追加のテストスイートを指定できます:

- `benchmarks`（正確性用のみ; ベンチマーク結果の生成はなし！）
- `mozilla`
- `test262`
- `webkit`

## 微小ベンチマークの実行

`test/js-perf-test`の下には、機能のパフォーマンスを追跡するための微小ベンチマークがあります。これらの特別なランナー: `tools/run_perf.py`を使用して実行します。以下のように実行してください:

```bash
tools/run_perf.py --arch x64 --binary-override-path out/x64.release/d8 test/js-perf-test/JSTests.json
```

すべての`JSTests`を実行したくない場合は、`filter`引数を指定できます:

```bash
tools/run_perf.py --arch x64 --binary-override-path out/x64.release/d8 --filter JSTests/TypedArrays test/js-perf-test/JSTests.json
```

## インスペクターテスト期待値の更新

テストを更新した後、その期待値ファイルを再生成する必要がある場合があります。次のコマンドを実行して達成できます:

```bash
tools/run-tests.py --regenerate-expected-files --outdir=ia32.release inspector/debugger/set-instrumentation-breakpoint
```

これは、テストの出力がどのように変わったかを確認する場合にも便利です。まず、上記のコマンドを使用して期待値ファイルを再生成し、その後以下を使用して差分を確認してください:

```bash
git diff
```

## バイトコード期待値の更新（リベースライン化）

バイトコード期待値が変更されることで`cctest`の失敗が発生することがあります。ゴールデンファイルを更新するには、以下を実行して`test/cctest/generate-bytecode-expectations`をビルドしてください:

```bash
gm x64.release generate-bytecode-expectations
```

その後、生成されたバイナリに`--rebaseline`フラグを渡してデフォルトの入力セットを更新します:

```bash
out/x64.release/generate-bytecode-expectations --rebaseline
```

更新されたゴールデンファイルは現在、`test/cctest/interpreter/bytecode_expectations/`にあります。

## 新しいバイトコード期待値テストの追加

1. `cctest/interpreter/test-bytecode-generator.cc`に新しいテストケースを追加し、同じテスト名のゴールデンファイルを指定します。

1. `generate-bytecode-expectations`をビルドします:

    ```bash
    gm x64.release generate-bytecode-expectations
    ```

1. 実行します

    ```bash
    out/x64.release/generate-bytecode-expectations --raw-js testcase.js --output=test/cctest/interpreter/bytecode-expectations/testname.golden
    ```

    ここで、`testcase.js`は`test-bytecode-generator.cc`に追加されたJavaScriptのテストケースを含み、`testname`は`test-bytecode-generator.cc`に定義したテストの名前です。
