---
title: "Testing"
description: "此文檔說明了 V8 儲存庫中測試框架的內容。"
---
V8 包含了一個測試框架，可以用於測試引擎。該框架允許您運行隨源碼一起提供的測試套件以及其他測試，例如 [Test262 測試套件](https://github.com/tc39/test262)。

## 運行 V8 測試

[使用 `gm`](/docs/build-gn#gm)，只需在任何建構目標後附加 `.check` 即可運行測試，例如：

```bash
gm x64.release.check
gm x64.optdebug.check  # 推薦：速度適中，並帶有 DCHECKs。
gm ia32.check
gm release.check
gm check  # 編譯並測試所有預設平臺
```

`gm` 會在運行測試之前自動建構所需的目標。您還可以限制要運行的測試：

```bash
gm x64.release test262
gm x64.debug mjsunit/regress/regress-123
```

如果您已經建構了 V8，您也可以手動運行測試：

```bash
tools/run-tests.py --outdir=out/ia32.release
```

同樣，您可以指定要運行哪個測試：

```bash
tools/run-tests.py --outdir=ia32.release cctest/test-heap/SymbolTable/* mjsunit/delete-in-eval
```

使用 `--help` 參數運行該腳本可以了解更多選項。

## 運行更多測試

默認情況下運行的測試集並不包括所有可用的測試。您可以在 `gm` 或 `run-tests.py` 的命令列中指定額外的測試套件：

- `benchmarks`（僅測試正確性；不會生成性能結果！）
- `mozilla`
- `test262`
- `webkit`

## 運行微基準測試

在 `test/js-perf-test` 下，我們有用於追蹤功能表現的微基準測試。有一個專門的運行工具：`tools/run_perf.py`。使用如下方式運行：

```bash
tools/run_perf.py --arch x64 --binary-override-path out/x64.release/d8 test/js-perf-test/JSTests.json
```

如果您不想運行所有的 `JSTests`，您可以提供一個 `filter` 參數：

```bash
tools/run_perf.py --arch x64 --binary-override-path out/x64.release/d8 --filter JSTests/TypedArrays test/js-perf-test/JSTests.json
```

## 更新調試器測試期望值

在更新測試後，您可能需要為其重新生成期望值檔案。可以通過運行以下命令實現：

```bash
tools/run-tests.py --regenerate-expected-files --outdir=ia32.release inspector/debugger/set-instrumentation-breakpoint
```

如果您想了解測試輸出的變化，也可以用此方法。首先使用上述命令重新生成期望檔案，然後使用以下命令檢查差異：

```bash
git diff
```

## 更新位元碼期望值（重新基準化）

有時位元碼期望值可能會改變，導致 `cctest` 測試失敗。要更新黃金檔案，請通過運行以下命令建構 `test/cctest/generate-bytecode-expectations`：

```bash
gm x64.release generate-bytecode-expectations
```

…然後通過向生成的二進制檔案傳遞 `--rebaseline` 參數來更新預設的輸入集：

```bash
out/x64.release/generate-bytecode-expectations --rebaseline
```

更新的黃金檔案現在已在 `test/cctest/interpreter/bytecode_expectations/` 中可用。

## 添加新的位元碼期望值測試

1. 在 `cctest/interpreter/test-bytecode-generator.cc` 中添加一個新測試案例，並為其指定與此測試同名的黃金檔案。

1. 編譯 `generate-bytecode-expectations`：

    ```bash
    gm x64.release generate-bytecode-expectations
    ```

1. 運行：

    ```bash
    out/x64.release/generate-bytecode-expectations --raw-js testcase.js --output=test/cctest/interpreter/bytecode-expectations/testname.golden
    ```

    其中 `testcase.js` 包含在 `test-bytecode-generator.cc` 文件中添加的 JavaScript 測試案例，`testname` 是在 `test-bytecode-generator.cc` 中定義的測試名稱。
