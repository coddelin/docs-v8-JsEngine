---
title: '交叉编译 iOS'
description: '本文档解释了如何为 iOS 交叉编译 V8。'
---
本页是构建针对 iOS 的 V8 的简要介绍。

## 要求

- 一台安装了 Xcode 的 macOS（OS X）主机。
- 一个 64 位目标 iOS 设备（不支持过时的 32 位 iOS 设备）。
- V8 v7.5 或更高版本。
- jitless 是 iOS 的硬性要求（截至 2020 年 12 月）。因此请使用参数 '--expose_gc --jitless'

## 初始设置

按照[构建 V8 的说明](/docs/build)。

通过在 `.gclient` 配置文件中添加 `target_os` 来获取用于 iOS 交叉编译的额外工具，该配置文件位于 `v8` 源目录的父目录中：

```python
# [... .gclient 的其他内容，例如 'solutions' 变量 ...]
target_os = ['ios']
```

更新 `.gclient` 后，运行 `gclient sync` 下载额外的工具。

## 手动构建

本节说明如何构建一个整体的 V8 版本，以用于物理 iOS 设备或 Xcode iOS 模拟器。构建的输出是一个 `libv8_monolith.a` 文件，其中包含所有 V8 库以及 V8 快照。

通过运行 `gn args out/release-ios` 来设置 GN 构建文件，并插入以下键值：

```python
ios_deployment_target = 10
is_component_build = false
is_debug = false
target_cpu = "arm64"                  # 模拟器构建为 "x64"。
target_os = "ios"
use_custom_libcxx = false             # 使用 Xcode 的 libcxx。
v8_enable_i18n_support = false        # 生成较小的二进制文件。
v8_monolithic = true                  # 启用 v8_monolith 目标。
v8_use_external_startup_data = false  # 快照包含在二进制文件中。
v8_enable_pointer_compression = false # iOS 不支持。
```

现在构建：

```bash
ninja -C out/release-ios v8_monolith
```

最后，将生成的 `libv8_monolith.a` 文件作为静态库添加到您的 Xcode 项目中。有关在您的应用程序中嵌入 V8 的更多文档，请参阅[开始嵌入 V8](/docs/embed)。
