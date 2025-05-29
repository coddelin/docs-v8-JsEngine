---
title: '從原始碼編譯 V8'
description: '本文檔説明如何從原始碼編譯 V8。'
---
為了能夠在 Windows/Linux/macOS 上從零開始編譯 V8（針對 x64），請遵循以下步驟。

## 獲取 V8 原始碼

按照我們的指南中的指示操作：[檢出 V8 原始碼](/docs/source-code)。

## 安裝編譯依賴項

1. 對於 macOS：安裝 Xcode 並接受其許可協議。（如果您單獨安裝了命令行工具，[先移除它們](https://bugs.chromium.org/p/chromium/issues/detail?id=729990#c1)。）

1. 確保您在 V8 原始碼目錄中。如果您遵循了上一部分中的每一步操作，那麼您已經處於正確的位置。

1. 下載所有編譯依賴項：

   ```bash
   gclient sync
   ```

   適用於 Googlers——如果在運行 hooks 時看到 Failed to fetch file 或 Login required 錯誤，請先通過運行以下命令驗證 Google Storage：

   ```bash
   gsutil.py config
   ```

   使用您的 @google.com 帳戶登錄，並在詢問項目 ID 時輸入 `0`。

1. 此步驟僅在 Linux 上需要。安裝額外的編譯依賴項：

    ```bash
    ./build/install-build-deps.sh
    ```

## 編譯 V8

1. 確保您在 `main` 分支的 V8 原始碼目錄中。

    ```bash
    cd /path/to/v8
    ```

1. 拉取最新更改並安裝任何新的編譯依賴項：

    ```bash
    git pull && gclient sync
    ```

1. 編譯原始碼：

    ```bash
    tools/dev/gm.py x64.release
    ```

    或者，編譯原始碼並立即運行測試：

    ```bash
    tools/dev/gm.py x64.release.check
    ```

    有關 `gm.py` 幫助腳本及其觸發的命令的更多資訊，請參見 [用 GN 編譯](/docs/build-gn)。
