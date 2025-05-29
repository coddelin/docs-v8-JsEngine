---
title: "使用 GN 編譯 V8"
description: "此文件說明如何使用 GN 編譯 V8。"
---
V8 使用 [GN](https://gn.googlesource.com/gn/+/master/docs/) 進行編譯。GN 是一種元構建系統，能為多種其他構建系統生成構建文件。因此，如何進行構建依賴於所使用的“後端”構建系統及編譯器。
以下指引假定您已擁有 [V8 的源代碼檢出](/docs/source-code) 且已 [安裝構建依賴項](/docs/build)。

更多有關 GN 的資訊可參考 [Chromium 的文檔](https://www.chromium.org/developers/gn-build-configuration) 或 [GN 的官方文檔](https://gn.googlesource.com/gn/+/master/docs/)。

從源代碼編譯 V8 需經過三個步驟：

1. 生成構建文件
1. 編譯
1. 運行測試

編譯 V8 有兩種工作流程：

- 使用名為 `gm` 的幫助腳本進行便捷工作流程，該腳本結合了以上三步驟
- 原始工作流程，手動為每個步驟分別執行低層級指令

## 使用 `gm` 編譯 V8（便捷工作流程）

`gm` 是一個方便的多合一腳本，能生成構建文件、觸發構建並可選擇性地運行測試。它位於您 V8 源碼檢出目錄的 `tools/dev/gm.py`。建議您將別名添加到 shell 配置中：

```bash
alias gm=/path/to/v8/tools/dev/gm.py
```

然後可以使用 `gm` 為已知的配置編譯 V8，例如 `x64.release`：

```bash
gm x64.release
```

若需要在編譯後直接運行測試，請執行：

```bash
gm x64.release.check
```

`gm` 輸出其執行的所有指令，使得可以方便地追蹤及重新執行它們（如有需要）。

`gm` 允許通過單一指令生成所需的二進制文件並運行特定的測試：

```bash
gm x64.debug mjsunit/foo cctest/test-bar/*
```

## 編譯 V8：原始手動工作流程

### 步驟 1：生成構建文件

生成構建文件有多種方式：

1. 原始手動工作流程直接使用 `gn`。
1. 一個名為 `v8gen` 的幫助腳本可簡化常見配置的流程。

#### 使用 `gn` 生成構建文件

使用 `gn` 為目錄 `out/foo` 生成構建文件：

```bash
gn args out/foo
```

此操作會打開一個編輯器窗口，可用於指定 [`gn` 參數](https://gn.googlesource.com/gn/+/master/docs/reference.md)。或者可以在命令行中傳遞參數：

```bash
gn gen out/foo --args='is_debug=false target_cpu="x64" v8_target_cpu="arm64" use_goma=true'
```

這會生成構建文件，用於使用 arm64 模擬器在釋放模式下編譯 V8，并使用 `goma` 進行編譯。

了解所有可用的 `gn` 參數，請執行：

```bash
gn args out/foo --list
```

#### 使用 `v8gen` 生成構建文件

V8 存儲庫包括了一個方便的 `v8gen` 腳本，用於更輕鬆地為常見配置生成構建文件。建議您將別名添加到 shell 配置中：

```bash
alias v8gen=/path/to/v8/tools/dev/v8gen.py
```

執行 `v8gen --help` 獲取更多信息。

列出可用的配置（或某個主配置的機器人）：

```bash
v8gen list
```

```bash
v8gen list -m client.v8
```

按一個特定的 `client.v8` 瀑布機器人的方式在目錄 `foo` 中進行構建：

```bash
v8gen -b 'V8 Linux64 - debug builder' -m client.v8 foo
```

### 步驟 2：編譯 V8

若要編譯整個 V8（假設 `gn` 已生成至 `x64.release` 資料夾），請執行：

```bash
ninja -C out/x64.release
```

若僅編譯特定的目標，例如 `d8`，請在指令後添加目標名稱：

```bash
ninja -C out/x64.release d8
```

### 步驟 3：運行測試

您可以將輸出目錄傳遞給測試驅動程式，其他相關標誌會從構建中推斷出來：

```bash
tools/run-tests.py --outdir out/foo
```

您也可以測試最近編譯的構建（位於 `out.gn`）：

```bash
tools/run-tests.py --gn
```

**構建上遇到問題？請至 [v8.dev/bug](https://v8.dev/bug) 報告問題，或至 [v8-users@googlegroups.com](mailto:v8-users@googlegroups.com) 尋求幫助。**
