---
title: &apos;在 Arm64 Linux 上編譯&apos;
description: &apos;在 Arm64 Linux 上原生構建 V8 的技巧和注意事項&apos;
---
如果您已經按照說明完成了如何在非 x86 或蘋果 Silicon Mac 的機器上[檢出](/docs/source-code)和[構建](/docs/build-gn) V8 的操作，您可能遇到了一些麻煩，這是因為構建系統下載了原生二進制文件但無法運行它們。然而，即便在 Arm64 Linux 機器上使用 V8 是__不受官方支持的__，克服這些障礙其實非常簡單。

## 跳過 `vpython`

`fetch v8`、`gclient sync` 和其他 `depot_tools` 命令使用了一個名為 "vpython" 的 python 包裝器。如果您看到與其相關的錯誤，可以定義以下變量以使用系統的 python 安裝代替：

```bash
export VPYTHON_BYPASS="manually managed python not supported by chrome operations"
```

## 相容的 `ninja` 二進制檔

第一步是確保我們使用 `ninja` 的原生二進制檔，而不是 `depot_tools` 中的版本。為此，在安裝 `depot_tools` 時，可以如下修改您的 PATH：

```bash
export PATH=$PATH:/path/to/depot_tools
```

這樣，您將能夠使用系統已安裝的 `ninja`，因為它很可能是可用的。如果不可用，您也可以[從源代碼構建](https://github.com/ninja-build/ninja#building-ninja-itself)。

## 編譯 clang

默認情況下，V8 將使用其自帶的 clang 构建版本，而該版本可能無法在您的機器上運行。您可以修改 GN 參數以[使用系統的 clang 或 GCC](#system_clang_gcc)，然而您可能希望使用與上游一致的 clang，因為它是最受支持的版本。

您可以在 V8 的檢出目錄中直接當地構建：

```bash
./tools/clang/scripts/build.py --without-android --without-fuchsia \
                               --host-cc=gcc --host-cxx=g++ \
                               --gcc-toolchain=/usr \
                               --use-system-cmake --disable-asserts
```

## 手動設置 GN 參數

方便的腳本可能默認情況下無法使用，因此您需要遵循[手動](/docs/build-gn#gn)流程手動設置 GN 參數。您可以使用以下參數獲取常用的 "release"、"optdebug" 和 "debug" 配置：

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

## 使用系統的 clang 或 GCC

使用 GCC 只需要禁用 clang 編譯：

```bash
is_clang=false
```

請注意，默認情況下，V8 使用 `lld` 進行鏈接，這需要較新的 GCC。您可以使用 `use_lld=false` 切換到 gold 連結器，或者額外使用 `use_gold=false` 切換到 `ld`。

如果您希望使用系統已安裝的 clang，例如位於 `/usr` 中，您可以使用以下參數：

```bash
clang_base_path="/usr"
clang_use_chrome_plugins=false
```

然而，由於系統的 clang 版本可能不被完全支持，您可能會遇到一些警告，例如未知的編譯器標誌。在這種情況下，可以禁用將警告視為錯誤：

```bash
treat_warnings_as_errors=false
```
