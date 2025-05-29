---
title: 'V8のLinux `perf`統合'
description: 'このドキュメントは、Linuxの`perf`ツールを使用してV8のJITコードのパフォーマンスを分析する方法を説明します。'
---
V8にはLinuxの`perf`ツールをサポートする機能が組み込まれています。これは、`--perf-prof`コマンドラインオプションで有効化されます。
V8は実行中にパフォーマンスデータをファイルに書き出し、Linuxの`perf`ツールを使ってV8のJITコード（JS関数名を含む）のパフォーマンスを分析することができます。

## 必要条件

- `linux-perf`バージョン5以上（以前のバージョンにはJITのサポートがありません）。（[最後](#build-perf)のセクションを参照してください）
- より良いC++コードのシンボル解決のために`enable_profiling=true`でV8/Chromeをビルドしてください。

## V8のビルド

Linux perfとのV8の統合を使用するには、`enable_profiling = true`のgnフラグでビルドする必要があります。

```bash
echo 'enable_profiling = true' >> out/x64.release/args.gn
autoninja -C out/x64.release
```

## [`linux-perf-d8.py`](https://source.chromium.org/search?q=linux-perf-d8.py)を使用した`d8`のプロファイリング

`d8`をビルドした後、Linux perfを使用できます。

```bash
tools/profiling/linux-perf-d8.py out/x64.release/d8 path/to/test.js;
```

より完全な例:

```bash
echo '(function f() {
    var s = 0; for (var i = 0; i < 1000000000; i++) { s += i; } return s;
  })();' > test.js;

# カスタムV8フラグと、混乱を避けるための別の出力ディレクトリを使用:
mkdir perf_results
tools/profiling/linux-perf-d8.py --perf-data-dir=perf_results \
    out/x64.release/d8 --expose-gc --allow-natives-syntax test.js;

# 高度なUI（`-flame`はGoogle非公開、 `-web`を公開用の代替として使用）:
pprof -flame perf_results/XXX_perf.data.jitted;
# ターミナルベースのツール:
perf report -i perf_results/XXX_perf.data.jitted;
```

`linux-perf-d8.py --help`を確認して詳細を確認してください。なお、`d8`バイナリ引数の後にすべての`d8`フラグを使用できます。


## [linux-perf-chrome.py](https://source.chromium.org/search?q=linux-perf-chrome.py)を使用したChromeやcontent_shellのプロファイリング

1. [linux-perf-chrome.py](https://source.chromium.org/search?q=linux-perf-chrome.py)スクリプトを使用してChromeをプロファイリングできます。正しいC++シンボルを取得するには、[必要なChromeのgnフラグ](https://chromium.googlesource.com/chromium/src/+/master/docs/profiling.md#General-checkout-setup)を追加してください。

1. ビルドが完了したら、C++およびJSコードの全シンボルを使用してウェブサイトをプロファイリングできます。

    ```bash
    mkdir perf_results;
    tools/profiling/linux-perf-chrome.py out/x64.release/chrome \
        --perf-data-dir=perf_results --timeout=30
    ```

1. ウェブサイトに移動した後、ブラウザを閉じるか、`--timeout`が完了するのを待ちます。
1. ブラウザを終了した後、`linux-perf.py`がファイルを後処理し、各レンダープロセスの結果ファイルのリストを表示します。

   ```
   chrome_renderer_1583105_3.perf.data.jitted      19.79MiB
   chrome_renderer_1583105_2.perf.data.jitted       8.59MiB
   chrome_renderer_1583105_4.perf.data.jitted       0.18MiB
   chrome_renderer_1583105_1.perf.data.jitted       0.16MiB
   ```

## linux-perfの結果の探索

最後に、Linuxの`perf`ツールを使用してd8またはChromeレンダープロセスのプロファイルを探索できます。

```bash
perf report -i perf_results/XXX_perf.data.jitted
```

また、[pprof](https://github.com/google/pprof)を使用してさらに多くのビジュアル化を生成することもできます。

```bash
# 注意: `-flame`はGoogle専用、公開用には`-web`を使用。
pprof -flame perf_results/XXX_perf.data.jitted;
```

## 低レベルのLinux-perfの使用法

### `d8`を直接使用したlinux-perf

使用ケースによっては、`d8`で直接linux-perfを使用することが必要になる場合があります。
これは2段階の手順が必要です。まず`perf record`で`perf.data`ファイルを作成し、その後`perf inject`を使ってJSシンボルを注入して後処理します。

``` bash
perf record --call-graph=fp --clockid=mono --freq=max \
    --output=perf.data
    out/x64.release/d8 \
      --perf-prof --no-write-protect-code-memory \
      --interpreted-frames-native-stack \
    test.js;
perf inject --jit --input=perf.data --output=perf.data.jitted;
perf report --input=perf.data.jitted;
```

### V8のlinux-perfフラグ

[`--perf-prof`](https://source.chromium.org/search?q=FLAG_perf_prof)は、JITコード内のパフォーマンスサンプルを記録するためにV8のコマンドラインで使用されます。

[`--nowrite-protect-code-memory`](https://source.chromium.org/search?q=FLAG_nowrite_protect_code_memory)は、コードメモリの書き込み保護を無効にするために必要です。これは、`perf`がコードページの書き込みビットを解除するイベントを検出した際にコードページに関する情報を破棄するためです。以下は、テストJavaScriptファイルからサンプルを記録する例です。

[`--interpreted-frames-native-stack`](https://source.chromium.org/search?q=FLAG_interpreted_frames_native_stack) は、インタプリタ関数の異なるエントリポイント (InterpreterEntryTrampoline のコピー版) を生成するために使用され、アドレスだけに基づいて `perf` で区別できるようにします。InterpreterEntryTrampoline をコピーする必要があるため、わずかなパフォーマンスおよびメモリの低下が発生します。


### Linux の `perf` を Chrome で直接使用する

1. 同じ V8 フラグを使用して Chrome 自体をプロファイルできます。上記の V8 フラグに関する手順を実行し、[必要な Chrome の GN フラグ](https://chromium.googlesource.com/chromium/src/+/master/docs/profiling.md#General-checkout-setup) を Chrome ビルドに追加してください。

1. ビルドが完了したら、C++ コードと JS コードの完全なシンボルを使用してウェブサイトをプロファイルできます。

    ```bash
    out/x64.release/chrome \
        --user-data-dir=`mktemp -d` \
        --no-sandbox --incognito --enable-benchmarking \
        --js-flags='--perf-prof --no-write-protect-code-memory --interpreted-frames-native-stack'
    ```

1. Chrome を起動した後、タスク マネージャを使用してレンダラープロセス ID を見つけ、それを使用してプロファイルを開始します:

    ```bash
    perf record -g -k mono -p $RENDERER_PID -o perf.data
    ```

1. ウェブサイトに移動し、次のセクションに進んで `perf` の出力を評価する方法を確認してください。

1. 実行が完了したら、V8 が JIT コードのパフォーマンス サンプルで出力したデータと、`perf` ツールから収集した静的情報を組み合わせてください:

   ```bash
   perf inject --jit --input=perf.data --output=perf.data.jitted
   ```

1. 最後に、Linux の `perf` [ツールを使用して結果を調査](#Explore-linux-perf-results) できます。

## `perf` のビルド

古い Linux カーネルを使用している場合は、ローカルで JIT サポート付きの Linux `perf` をビルドできます。

- 新しい Linux カーネルをインストールし、その後マシンを再起動してください:

  ```bash
   sudo apt-get install linux-generic-lts-wily;
  ```

- 依存関係をインストールします:

  ```bash
  sudo apt-get install libdw-dev libunwind8-dev systemtap-sdt-dev libaudit-dev \
     libslang2-dev binutils-dev liblzma-dev;
  ```

- 最新の `perf` ツールのソースを含むカーネルソースをダウンロードします:

  ```bash
  cd some/directory;
  git clone --depth 1 git://git.kernel.org/pub/scm/linux/kernel/git/tip/tip.git;
  cd tip/tools/perf;
  make
  ```

以下の手順では、`some/director/tip/tools/perf/perf` として `perf` を呼び出します。
