---
title: &apos;ARM/Androidのクロスコンパイルとデバッグ&apos;
description: &apos;このドキュメントは、ARM/Android用にV8をクロスコンパイルする方法と、それをデバッグする方法を説明します。&apos;
---
まず、[GNでビルドする](/docs/build-gn)ことができることを確認します。

次に、`android`を`.gclient`構成ファイルに追加します。

```python
target_os = [&apos;android&apos;]  # Android関連のものがチェックアウトされるように追加。
```

`target_os`フィールドはリストですので、もし同時にunix上でビルドする場合は以下のようになります:

```python
target_os = [&apos;android&apos;, &apos;unix&apos;]  # 複数のターゲットOS。
```

`gclient sync`を実行すると、`./third_party/android_tools`配下に大規模なチェックアウトが行われます。

スマートフォンやタブレットで開発者モードを有効にし、USBデバッグをオンにしてください。手順については[こちら](https://developer.android.com/studio/run/device.html)をご覧ください。また、便利な[`adb`](https://developer.android.com/studio/command-line/adb.html)ツールをパスに追加してください。adbはチェックアウト内の`./third_party/android_sdk/public/platform-tools`にあります。

## `gm`の使用

[`tools/dev/gm.py`スクリプト](/docs/build-gn#gm)を使用して、V8のテストを自動的にビルドし、デバイスで実行できます。

```bash
alias gm=/path/to/v8/tools/dev/gm.py
gm android_arm.release.check
```

このコマンドは、バイナリとテストをデバイスの`/data/local/tmp/v8`ディレクトリに送ります。

## 手動ビルド

`v8gen.py`を使用してARMのリリースまたはデバッグビルドを生成します:

```bash
tools/dev/v8gen.py arm.release
```

次に`gn args out.gn/arm.release`を実行し、以下のキーが含まれていることを確認してください:

```python
target_os = "android"      # 以下の行は手動で変更する必要があります
target_cpu = "arm"         # v8gen.pyはシミュレーター用ビルドを想定しています。
v8_target_cpu = "arm"
is_component_build = false
```

デバッグビルドでもキーは同じです。Pixel Cのような32ビットと64ビットの両方のバイナリをサポートするarm64デバイスの場合、キーは以下のようになります:

```python
target_os = "android"      # 以下の行は手動で変更する必要があります
target_cpu = "arm64"       # v8gen.pyはシミュレーター用ビルドを想定しています。
v8_target_cpu = "arm64"
is_component_build = false
```

次にビルドします:

```bash
ninja -C out.gn/arm.release d8
```

`adb`を使用してバイナリとスナップショットファイルを電話にコピーします:

```bash
adb shell &apos;mkdir -p /data/local/tmp/v8/bin&apos;
adb push out.gn/arm.release/d8 /data/local/tmp/v8/bin
adb push out.gn/arm.release/icudtl.dat /data/local/tmp/v8/bin
adb push out.gn/arm.release/snapshot_blob.bin /data/local/tmp/v8/bin
```

```bash
rebuffat:~/src/v8$ adb shell
bullhead:/ $ cd /data/local/tmp/v8/bin
bullhead:/data/local/tmp/v8/bin $ ls
v8 icudtl.dat snapshot_blob.bin
bullhead:/data/local/tmp/v8/bin $ ./d8
V8 version 5.8.0 (candidate)
d8> &apos;w00t!&apos;
"w00t!"
d8>
```

## デバッグ

### d8

Androidデバイスでの`d8`のリモートデバッグは比較的簡単です。まず、Androidデバイスで`gdbserver`を起動します:

```bash
bullhead:/data/local/tmp/v8/bin $ gdbserver :5039 $D8 <arguments>
```

次に、ホストデバイスでサーバーに接続します。

```bash
adb forward tcp:5039 tcp:5039
gdb $D8
gdb> target remote :5039
```

`gdb`と`gdbserver`は互換性がある必要があります。疑問がある場合は[Android NDK](https://developer.android.com/ndk)のバイナリを使用してください。デフォルトで`d8`バイナリはストリップされています（デバッグ情報が削除されています）が、`$OUT_DIR/exe.unstripped/d8`にはストリップされていないバイナリが含まれています。

### ロギング

デフォルトでは、`d8`の一部のデバッグ出力はAndroidシステムログに記録されます。[`logcat`](https://developer.android.com/studio/command-line/logcat)を使用してログをダンプできます。しかし、特定のデバッグ出力がシステムログと`adb`の間で分割されたり、完全に欠落しているように見える場合があります。これらの問題を回避するために、以下の設定を`gn args`に追加することをお勧めします:

```python
v8_android_log_stdout = true
```

### 浮動小数点の問題

V8 Arm GCストレスボットで使用される`gn args`設定`arm_float_abi = "hard"`は、GCストレスボットが使用しているハードウェアとは異なるハードウェア（例: Nexus 7）で、全く意味不明なプログラム動作を引き起こす可能性があります。

## Sourcery G++ Liteの使用

Sourcery G++ Liteクロスコンパイラスイートは、[CodeSourcery](http://www.codesourcery.com/)が提供するSourcery G++の無料版です。ARMプロセッサ用[GNU Toolchain](http://www.codesourcery.com/sgpp/lite/arm)のページがあります。ホストとターゲットの組み合わせに必要なバージョンを決定してください。

以下の手順では、[ARM GNU/Linux用の2009q1-203](http://www.codesourcery.com/sgpp/lite/arm/portal/release858)を使用しています。別のバージョンを使用する場合は、以下のURLと`TOOL_PREFIX`を変更してください。

### ホストとターゲットでのインストール

最も簡単な設定方法は、完全なSourcery G++ Liteパッケージをホストとターゲットの両方に同じ場所にインストールすることです。これにより必要なすべてのライブラリが両方で利用可能になります。ホストでデフォルトライブラリを使用する場合、ターゲット側には何もインストールする必要はありません。

次のスクリプトは`/opt/codesourcery`にインストールします:

```bash
#!/bin/sh

sudo mkdir /opt/codesourcery
cd /opt/codesourcery
sudo chown "$USERNAME" .
chmod g+ws .
umask 2
wget http://www.codesourcery.com/sgpp/lite/arm/portal/package4571/public/arm-none-linux-gnueabi/arm-2009q1-203-arm-none-linux-gnueabi-i686-pc-linux-gnu.tar.bz2
tar -xvf arm-2009q1-203-arm-none-linux-gnueabi-i686-pc-linux-gnu.tar.bz2
```

## プロファイル

- バイナリをコンパイルし、デバイスにプッシュし、ホストにもそのコピーを保持する:

    ```bash
    adb shell cp /data/local/tmp/v8/bin/d8 /data/local/tmp/v8/bin/d8-version.under.test
    cp out.gn/arm.release/d8 ./d8-version.under.test
    ```

- プロファイリングログを取得し、それをホストにコピーする:

    ```bash
    adb push benchmarks /data/local/tmp
    adb shell cd /data/local/tmp/benchmarks; ../v8/bin/d8-version.under.test run.js --prof
    adb shell /data/local/tmp/v8/bin/d8-version.under.test benchmark.js --prof
    adb pull /data/local/tmp/benchmarks/v8.log ./
    ```

- お好きなエディタで`v8.log`を開き、最初の行を編集して、作業中のワークステーション上にある`d8-version.under.test`バイナリのフルパスに一致させます（デバイス上では`/data/local/tmp/v8/bin/`パスでした）

- ホストの`d8`と適切な`nm`バイナリを使用してティックプロセッサを実行する:

    ```bash
    cp out/x64.release/d8 .  # 一度だけ必要
    cp out/x64.release/natives_blob.bin .  # 一度だけ必要
    cp out/x64.release/snapshot_blob.bin .  # 一度だけ必要
    tools/linux-tick-processor --nm=$(pwd)/third_party/android_ndk/toolchains/arm-linux-androideabi-4.9/prebuilt/linux-x86_64/bin/arm-linux-androideabi-nm
    ```
