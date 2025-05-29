---
title: "為 iOS 進行交叉編譯"
description: "本文件解釋了如何為 iOS 進行交叉編譯 V8。"
---
此頁面簡要介紹如何構建用於 iOS 的 V8 目標。

## 要求

- 一台安裝了 Xcode 的 macOS（OS X）主機。
- 一台 64 位目標 iOS 設備（不支持傳統的 32 位 iOS 設備）。
- V8 v7.5 或更新版本。
- 對於 iOS，禁用 JIT 是一個硬性要求（截至 2020 年 12 月）。因此，請使用標誌 '--expose_gc --jitless'

## 初始設置

請按照[構建 V8 的說明](/docs/build)進行操作。

通過在 `.gclient` 配置文件中添加 `target_os`，來獲取 iOS 交叉編譯所需的附加工具。該文件位於 `v8` 源文件目錄的父目錄中：

```python
# [... .gclient 的其他內容，例如 'solutions' 變量 ...]
target_os = ['ios']
```

更新 `.gclient` 後，運行 `gclient sync` 下載附加工具。

## 手動構建

本節介紹如何構建用於物理 iOS 設備或 Xcode iOS 模擬器的單體式 V8 版本。此構建的輸出是一個 `libv8_monolith.a` 文件，該文件包含所有 V8 庫以及 V8 快照。

通過運行 `gn args out/release-ios` 設置 GN 構建文件，並插入以下鍵值：

```python
ios_deployment_target = 10
is_component_build = false
is_debug = false
target_cpu = "arm64"                  # 對於模擬器構建，使用 "x64"。
target_os = "ios"
use_custom_libcxx = false             # 使用 Xcode 的 libcxx。
v8_enable_i18n_support = false        # 生成較小的二進制文件。
v8_monolithic = true                  # 啟用 v8_monolith 目標。
v8_use_external_startup_data = false  # 快照包含在二進制文件中。
v8_enable_pointer_compression = false # iOS 上不支持。
```

現在構建：

```bash
ninja -C out/release-ios v8_monolith
```

最後，將生成的 `libv8_monolith.a` 文件作為靜態庫添加到 Xcode 項目中。有關在應用程序中嵌入 V8 的更多文檔，請參見[嵌入 V8 的入門指南](/docs/embed)。
