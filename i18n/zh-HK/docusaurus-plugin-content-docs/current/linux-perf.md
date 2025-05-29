---
title: 'V8 的 Linux `perf` 整合'
description: '本文檔說明如何使用 Linux `perf` 工具分析 V8 的 JIT 編譯代碼之性能。'
---
V8 內建支持 Linux `perf` 工具。透過 `--perf-prof` 命令行選項啟用此功能。
V8 在執行期間會將性能數據寫出到文件，可用於使用 Linux `perf` 工具分析 V8 的 JIT 編譯代碼（包括 JS 函數名稱）。

## 系統需求

- `linux-perf` 版本需為 5 或更高版本（之前的版本不支援 JIT）。（參考 [文末](#build-perf) 的說明）
- 使用 `enable_profiling=true` 編譯 V8/Chrome，以便獲得更好的 C++ 代碼符號化。

## 編譯 V8

若要使用 V8 的 Linux perf 整合功能，需透過以下 gn 標誌進行編譯：`enable_profiling = true`。

```bash
echo 'enable_profiling = true' >> out/x64.release/args.gn
autoninja -C out/x64.release
```

## 利用 [`linux-perf-d8.py`](https://source.chromium.org/search?q=linux-perf-d8.py) 為 `d8` 進行性能分析

完成 `d8` 編譯後，可開始使用 linux perf：

```bash
tools/profiling/linux-perf-d8.py out/x64.release/d8 path/to/test.js;
```

更完整的範例：

```bash
echo '(function f() {
    var s = 0; for (var i = 0; i < 1000000000; i++) { s += i; } return s;
  })();' > test.js;

# 使用自訂的 V8 標誌以及獨立的輸出目錄以減少雜亂：
mkdir perf_results
tools/profiling/linux-perf-d8.py --perf-data-dir=perf_results \
    out/x64.release/d8 --expose-gc --allow-natives-syntax test.js;

# 高級界面（`-flame` 僅限 Google 員工，公眾可選用 `-web` 替代）：
pprof -flame perf_results/XXX_perf.data.jitted;
# 基於終端工具：
perf report -i perf_results/XXX_perf.data.jitted;
```

查閱 `linux-perf-d8.py --help` 以獲得更多細節。注意，你可以在 `d8` 二進制文件參數後使用所有 `d8` 標誌。


## 使用 [linux-perf-chrome.py](https://source.chromium.org/search?q=linux-perf-chrome.py) 為 Chrome 或 content_shell 進行性能分析

1. 你可以使用 [linux-perf-chrome.py](https://source.chromium.org/search?q=linux-perf-chrome.py) 腳本為 chrome 進行性能分析。請確保添加了 [必要的 chrome gn 標誌](https://chromium.googlesource.com/chromium/src/+/master/docs/profiling.md#General-checkout-setup)，以獲得正確的 C++ 符號。

2. 一旦你的編譯完成後，你可以為網站進行性能分析（包含 C++ 和 JS 代碼的完整符號）。

    ```bash
    mkdir perf_results;
    tools/profiling/linux-perf-chrome.py out/x64.release/chrome \
        --perf-data-dir=perf_results --timeout=30
    ```

3. 瀏覽至你的網站，然後關閉瀏覽器（或等待 `--timeout` 完成）。
4. 退出瀏覽器後，`linux-perf.py` 會對文件進行後處理，並顯示每個渲染器進程的結果文件列表：

   ```
   chrome_renderer_1583105_3.perf.data.jitted      19.79MiB
   chrome_renderer_1583105_2.perf.data.jitted       8.59MiB
   chrome_renderer_1583105_4.perf.data.jitted       0.18MiB
   chrome_renderer_1583105_1.perf.data.jitted       0.16MiB
   ```

## 探索 linux-perf 分析結果

最後，你可以使用 Linux `perf` 工具探索 `d8` 或 Chrome 渲染器進程的剖面：

```bash
perf report -i perf_results/XXX_perf.data.jitted
```

你也可以使用 [pprof](https://github.com/google/pprof) 生成更多可視化圖表：

```bash
# 注意：`-flame` 僅限 Google 使用，可選用 `-web` 作為公眾替代：
pprof -flame perf_results/XXX_perf.data.jitted;
```

## 低階 Linux `perf` 使用方式

### 直接使用 `d8` 與 Linux `perf`

根據你的使用情況，你可能需要直接結合 `d8` 使用 Linux `perf`。
這需分兩步完成，首先 `perf record` 創建一個包含信息的 `perf.data` 文件，然後用 `perf inject` 注入 JS 符號。

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

### V8 Linux `perf` 標誌

[`--perf-prof`](https://source.chromium.org/search?q=FLAG_perf_prof) 用於 V8 命令行以在 JIT 代碼中的記錄性能樣本。

[`--nowrite-protect-code-memory`](https://source.chromium.org/search?q=FLAG_nowrite_protect_code_memory) 用於禁用代碼內存的寫保護。這是必要的，因為 `perf` 在看到移除代碼頁寫保護事件時會丟失該頁的相關信息。以下是一個記錄 JavaScript 測試文件樣本的例子：

[`--interpreted-frames-native-stack`](https://source.chromium.org/search?q=FLAG_interpreted_frames_native_stack) 用於為解釋執行的函式創建不同的入口點（InterpreterEntryTrampoline 的複製版本），以便僅根據地址即可讓 `perf` 區分開來。由於 InterpreterEntryTrampoline 必須被複製，這會導致輕微的性能和記憶體回退。


### 直接使用 linux-perf 與 chrome

1. 你可以使用相同的 V8 旗標來對 chrome 本身進行分析。按照上述關於正確 V8 旗標的指導，並將 [必要的 chrome gn 旗標](https://chromium.googlesource.com/chromium/src/+/master/docs/profiling.md#General-checkout-setup) 添加到你的 chrome 構建中。

1. 當你的構建準備好後，你可以對網站進行分析，包括 C++ 和 JS 代碼的完整符號。

    ```bash
    out/x64.release/chrome \
        --user-data-dir=`mktemp -d` \
        --no-sandbox --incognito --enable-benchmarking \
        --js-flags='--perf-prof --no-write-protect-code-memory --interpreted-frames-native-stack'
    ```

1. 啟動 chrome 後，使用任務管理器找到渲染器進程 ID，並用它來開始分析：

    ```bash
    perf record -g -k mono -p $RENDERER_PID -o perf.data
    ```

1. 瀏覽到你的網站，然後繼續下一節，了解如何評估 perf 輸出。

1. 執行結束後，將從 `perf` 工具收集的靜態信息與 V8 對 JIT 代碼輸出的性能樣本結合：

   ```bash
   perf inject --jit --input=perf.data --output=perf.data.jitted
   ```

1. 最後你可以使用 Linux `perf` [工具來探索](#Explore-linux-perf-results)

## 構建 `perf`

如果你有一個過時的 Linux 核心，你可以本地構建支持 JIT 的 linux-perf。

- 安裝新的 Linux 核心，然後重新啟動你的機器：

  ```bash
   sudo apt-get install linux-generic-lts-wily;
  ```

- 安裝依賴項：

  ```bash
  sudo apt-get install libdw-dev libunwind8-dev systemtap-sdt-dev libaudit-dev \
     libslang2-dev binutils-dev liblzma-dev;
  ```

- 下載包含最新 `perf` 工具源代碼的核心源代碼：

  ```bash
  cd some/directory;
  git clone --depth 1 git://git.kernel.org/pub/scm/linux/kernel/git/tip/tip.git;
  cd tip/tools/perf;
  make
  ```

在接下來的步驟中，將 `perf` 作為 `some/director/tip/tools/perf/perf` 調用。
