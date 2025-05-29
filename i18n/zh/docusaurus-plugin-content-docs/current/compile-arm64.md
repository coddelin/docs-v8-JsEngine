---
title: "在 Arm64 Linux 上编译"
description: "在 Arm64 Linux 上本地构建 V8 的技巧和方法"
---
如果你已阅读如何在 [检出代码](/docs/source-code) 和 [构建](/docs/build-gn) V8 的说明，但你的机器既不是 x86 也不是 Apple Silicon Mac，你可能会遇到一些麻烦，因为构建系统会下载原生二进制文件，但无法运行它们。然而，即使使用 Arm64 Linux 机器进行 V8 工作 __并非官方支持__，克服这些障碍其实很简单。

## 绕过 `vpython`

`fetch v8`、`gclient sync` 和其他 `depot_tools` 命令使用一种名为 "vpython" 的 Python 包装器。如果你看到与此相关的错误，可以定义以下变量来改用系统的 Python 安装：

```bash
export VPYTHON_BYPASS="manually managed python not supported by chrome operations"
```

## 兼容的 `ninja` 二进制文件

首先确保我们使用本地的 `ninja` 二进制文件，而不是 `depot_tools` 中的版本。一个简单的方法是，在安装 `depot_tools` 时按如下方式调整你的 PATH：

```bash
export PATH=$PATH:/path/to/depot_tools
```

这样，你就可以使用系统中已有的 `ninja` 安装。如果没有，可以 [从源代码构建](https://github.com/ninja-build/ninja#building-ninja-itself)。

## 编译 clang

默认情况下，V8 会尝试使用其自身构建的 clang，但它可能无法在你的机器上运行。你可以调整 GN 参数来 [使用系统的 clang 或 GCC](#system_clang_gcc)，然而，你可能会希望使用与上游一致的 clang，因为它是最有支持性的版本。

你可以直接从 V8 仓库中本地构建它：

```bash
./tools/clang/scripts/build.py --without-android --without-fuchsia \
                               --host-cc=gcc --host-cxx=g++ \
                               --gcc-toolchain=/usr \
                               --use-system-cmake --disable-asserts
```

## 手动设置 GN 参数

便捷脚本可能不能默认工作，因此你必须按照 [手动](/docs/build-gn#gn) 流程手动设置 GN 参数。以下是用于获取"release"、"optdebug" 和"debug" 配置所需的参数：

- `release`

```bash
is_debug=false
```

- `optdebug`

```bash
is_debug=true
v8_enable_backtrace=true
v8_enable_slow_dchecks=true
```

- `debug`

```bash
is_debug=true
v8_enable_backtrace=true
v8_enable_slow_dchecks=true
v8_optimized_debug=false
```

## 使用系统的 clang 或 GCC

使用 GCC 构建只需要禁用 clang 编译：

```bash
is_clang=false
```

请注意，默认情况下，V8 将使用 `lld` 进行链接，这需要较新的 GCC 版本。你可以用 `use_lld=false` 切换到 gold 链接器，或者进一步使用 `use_gold=false` 切换到 `ld`。

如果你想使用系统安装的 clang，例如位于 `/usr`，可以使用以下参数：

```bash
clang_base_path="/usr"
clang_use_chrome_plugins=false
```

然而，由于系统的 clang 版本可能不被很好支持，你可能会遇到一些警告，比如未知的编译器标志。在这种情况下，可以通过以下方式停止将警告视为错误：

```bash
treat_warnings_as_errors=false
```
