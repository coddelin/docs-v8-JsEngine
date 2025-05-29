---
title: '交叉編譯及除錯 ARM/Android'
description: '本文件解釋如何為 ARM/Android 交叉編譯 V8，以及如何除錯它。'
---
首先，確保您能夠[使用 GN 建構](/docs/build-gn)。

然後，在您的 `.gclient` 配置文件中添加 `android`。

```python
target_os = ['android']  # 添加此行以取得 Android 相關資料。
```

`target_os` 欄位是一個列表，因此如果您也在 Unix 平台上建構，則它將如下所示：

```python
target_os = ['android', 'unix']  # 多種目標作業系統。
```

運行 `gclient sync`，您將在 `./third_party/android_tools` 目錄下取得大量內容。

在您的手機或平板電腦上啟用開發者模式，並開啟 USB 除錯，詳情參見[此處](https://developer.android.com/studio/run/device.html)。同時，將實用的 [`adb`](https://developer.android.com/studio/command-line/adb.html) 工具加入系統路徑中。它位於您的檢出目錄 `./third_party/android_sdk/public/platform-tools` 中。

## 使用 `gm`

使用 [`tools/dev/gm.py` 腳本](/docs/build-gn#gm) 自動建構 V8 測試並在設備上運行。

```bash
alias gm=/path/to/v8/tools/dev/gm.py
gm android_arm.release.check
```

此指令將二進制檔和測試推送到設備上的 `/data/local/tmp/v8` 目錄。

## 手動建構

使用 `v8gen.py` 生成 ARM 發行版或除錯版：

```bash
tools/dev/v8gen.py arm.release
```

然後運行 `gn args out.gn/arm.release` 並確認您擁有以下鍵值：

```python
target_os = "android"      # 這些行需要手動修改
target_cpu = "arm"         # 因為 v8gen.py 預設假定為模擬器建構。
v8_target_cpu = "arm"
is_component_build = false
```

這些鍵值在除錯版本中也是相同的。如果您正在為類似 Pixel C 的 arm64 設備（支持 32 位和 64 位二進制檔）進行建構，鍵值應如下所示：

```python
target_os = "android"      # 這些行需要手動修改
target_cpu = "arm64"       # 因為 v8gen.py 預設假定為模擬器建構。
v8_target_cpu = "arm64"
is_component_build = false
```

現在進行建構：

```bash
ninja -C out.gn/arm.release d8
```

使用 `adb` 將二進制檔和快照檔案複製到手機：

```bash
adb shell 'mkdir -p /data/local/tmp/v8/bin'
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
d8> 'w00t!'
"w00t!"
d8>
```

## 除錯

### d8

在 Android 設備上遠端除錯 `d8` 相對簡單。首先在 Android 設備上啟動 `gdbserver`：

```bash
bullhead:/data/local/tmp/v8/bin $ gdbserver :5039 $D8 <arguments>
```

然後在主機設備上連接到服務器。

```bash
adb forward tcp:5039 tcp:5039
gdb $D8
gdb> target remote :5039
```

`gdb` 和 `gdbserver` 需要相容於彼此，如果有疑問請使用 [Android NDK](https://developer.android.com/ndk) 中的二進制檔案。注意，預設情況下 `d8` 二進制檔案是剝除的（移除除錯資訊），然而 `$OUT_DIR/exe.unstripped/d8` 包含未剝除的二進制檔案。

### 日誌

預設情況下，部分 `d8` 的除錯輸出會上傳到 Android 系統日誌中，可以使用 [`logcat`](https://developer.android.com/studio/command-line/logcat) 進行轉儲。不幸的是，有時候某些特定的除錯輸出會在系統日誌和 `adb` 之間分散，而有時候某些部分似乎完全丟失。為避免這些問題，建議在 `gn args` 中添加以下設置：

```python
v8_android_log_stdout = true
```

### 浮點問題

`gn args` 設置 `arm_float_abi = "hard"`，這是 V8 Arm GC 壓力測試機使用的設置，可能會導致在與 GC 壓力測試機不同的硬體（例如 Nexus 7）上看到完全荒謬的程式行為。

## 使用 Sourcery G++ Lite

Sourcery G++ Lite 交叉編譯器套件是 Sourcery G++ 的免費版本，由 [CodeSourcery](http://www.codesourcery.com/) 提供。這裡有一個[用於 ARM 處理器的 GNU 工具鏈](http://www.codesourcery.com/sgpp/lite/arm)頁面。確認您需要的版本以適配您的主機/目標組合。

以下指令使用 [2009q1-203 用於 ARM GNU/Linux](http://www.codesourcery.com/sgpp/lite/arm/portal/release858)，如果使用不同版本，請相應更改以下的 URL 和 `TOOL_PREFIX`。

### 在主機和目標上安裝

最簡單的設置方式是在主機和目標上同一位置安裝完整的 Sourcery G++ Lite 套件。這將確保所需的所有庫在兩邊都可用。如果要在主機上使用默認庫，則不需要在目標上安裝任何內容。

以下腳本安裝在 `/opt/codesourcery`:

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

## 配置檔案

- 編譯一個二進位檔案，將其推送到設備，並在主機上保存一份副本:

    ```bash
    adb shell cp /data/local/tmp/v8/bin/d8 /data/local/tmp/v8/bin/d8-version.under.test
    cp out.gn/arm.release/d8 ./d8-version.under.test
    ```

- 獲取分析日誌並將其複製到主機:

    ```bash
    adb push benchmarks /data/local/tmp
    adb shell cd /data/local/tmp/benchmarks; ../v8/bin/d8-version.under.test run.js --prof
    adb shell /data/local/tmp/v8/bin/d8-version.under.test benchmark.js --prof
    adb pull /data/local/tmp/benchmarks/v8.log ./
    ```

- 在您喜歡的編輯器中打開 `v8.log` 並編輯第一行，以匹配 `d8-version.under.test` 二進位檔案在工作站上的完整路徑（而不是設備上的 `/data/local/tmp/v8/bin/` 路徑）

- 使用主機的 `d8` 和適當的 `nm` 二進位檔案運行 tick 處理器:

    ```bash
    cp out/x64.release/d8 .  # 僅需執行一次
    cp out/x64.release/natives_blob.bin .  # 僅需執行一次
    cp out/x64.release/snapshot_blob.bin .  # 僅需執行一次
    tools/linux-tick-processor --nm=$(pwd)/third_party/android_ndk/toolchains/arm-linux-androideabi-4.9/prebuilt/linux-x86_64/bin/arm-linux-androideabi-nm
    ```
