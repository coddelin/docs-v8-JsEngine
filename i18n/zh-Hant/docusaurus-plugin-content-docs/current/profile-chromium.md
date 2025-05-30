---
title: "使用 V8 對 Chromium 進行分析"
description: "本文件解釋如何使用 V8 的 CPU 和堆分析器搭配 Chromium。"
---
[V8 的 CPU 和堆分析器](/docs/profile) 在 V8 的 shell 中使用十分簡單，但在 Chromium 中使用可能會令人感到疑惑。本頁面旨在為您提供幫助。

## 為什麼在 Chromium 中使用 V8 的分析器與在 V8 shell 中使用它不同？

Chromium 是一個複雜的應用程序，而非 V8 shell。以下是影響分析器使用的 Chromium 特性列表：

- 每個渲染器是一個獨立的進程（好吧，不是完全每一個，但我們省略這個細節），所以它們不能共享同一個日誌文件；
- 圍繞渲染器進程的沙盒會阻止其寫入磁盤；
- 開發者工具配置分析器以滿足其自身目的；
- V8 的日志代碼包含了一些優化，用以簡化日志狀態檢查。

## 如何運行 Chromium 以獲取 CPU 分析文件？

以下是運行 Chromium 並從進程啟動開始獲取 CPU 分析文件的方法：

```bash
./Chromium --no-sandbox --user-data-dir=`mktemp -d` --incognito --js-flags='--prof'
```

請注意，您不會在開發者工具中看到分析結果，因為所有數據都被記錄到文件中，而不是記錄到開發者工具。

### 參數描述

`--no-sandbox` 會關閉渲染器沙盒，使 Chrome 能夠寫入日志文件。

`--user-data-dir` 用於建立一個新的設定檔，使用它可以避免緩存和已安裝擴展的潛在副作用（可選）。

`--incognito` 用於進一步防止結果被污染（可選）。

`--js-flags` 包含傳遞給 V8 的參數：

- `--logfile=%t.log` 指定日志文件的名稱模式。`%t` 將被展開成以毫秒表示的當前時間，因此每個進程都會獲得自己的日志文件。如果需要，您可以添加前綴或後綴，例如：`prefix-%t-suffix.log`。默認情況下，每個隔離環境都會獲得一個單獨的日志文件。
- `--prof` 告知 V8 將統計分析信息寫入日志文件。

## Android

Android 上的 Chrome 有一系列獨特之處，使得分析稍微複雜一些。

- 必須在通過設備啟動 Chrome 之前使用 `adb` 寫入命令行。因此，有時命令行中的引號可能會丟失，最好用逗號分隔 `--js-flags` 裡的參數，而不是使用空格和引號。
- 日志文件的路徑必須指定為 Android 文件系統上可寫的地方的絕對路徑。
- Android 的渲染器進程沙盒化意味着，即使使用了 `--no-sandbox`，渲染器進程仍然無法寫入文件系統上的文件，因此需要使用 `--single-process` 以使渲染器和瀏覽器進程在同一進程中運行。
- `.so` 嵌入在 Chrome 的 APK 中，这意味着符號化需要將 APK 的內存地址轉換為构建中的未刪減 `.so` 文件。

以下命令啟用 Android 上的分析：

```bash
./build/android/adb_chrome_public_command_line --no-sandbox --single-process --js-flags='--logfile=/storage/emulated/0/Download/%t.log,--prof'
<關閉並重新啟動 Android 設備上的 Chrome>
adb pull /storage/emulated/0/Download/<日志文件>
./src/v8/tools/linux-tick-processor --apk-embedded-library=out/Release/lib.unstripped/libchrome.so --preprocess <日志文件>
```

## 備註

在 Windows 下，請確保為 `chrome.dll` 打開 `.MAP` 文件創建，但不要為 `chrome.exe` 打開。
