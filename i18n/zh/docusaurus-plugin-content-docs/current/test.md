---
title: "测试"
description: "本文档介绍了V8代码库中的测试框架。"
---
V8 包含一个测试框架，允许您对引擎进行测试。该框架支持运行我们源代码中包含的测试套件及其他套件，例如 [Test262测试套件](https://github.com/tc39/test262)。

## 运行 V8 测试

[使用 `gm`](/docs/build-gn#gm)，您只需在构建目标后附加 `.check` 来运行测试，例如：

```bash
gm x64.release.check
gm x64.optdebug.check  # 推荐: 速度较快，并启用DCHECK。
gm ia32.check
gm release.check
gm check  # 构建并测试所有默认平台
```

`gm` 在运行测试前会自动构建所需的目标。您还可以限制要运行的测试：

```bash
gm x64.release test262
gm x64.debug mjsunit/regress/regress-123
```

如果您已经构建了 V8，可以手动运行测试：

```bash
tools/run-tests.py --outdir=out/ia32.release
```

同样，您可以指定要运行的测试：

```bash
tools/run-tests.py --outdir=ia32.release cctest/test-heap/SymbolTable/* mjsunit/delete-in-eval
```

使用 `--help` 参数运行脚本，了解更多选项。

## 运行更多测试

默认要运行的测试集并不包括所有可用的测试。您可以在 `gm` 或 `run-tests.py` 命令行中指定额外的测试套件：

- `benchmarks` (仅用于正确性；不会生成基准测试结果！)
- `mozilla`
- `test262`
- `webkit`

## 运行微基准测试

在 `test/js-perf-test` 下，我们有跟踪功能性能的微基准测试。用于这些测试有一个特殊的运行程序：`tools/run_perf.py`。运行方式如下：

```bash
tools/run_perf.py --arch x64 --binary-override-path out/x64.release/d8 test/js-perf-test/JSTests.json
```

如果您不希望运行所有 `JSTests`，可提供 `filter` 参数：

```bash
tools/run_perf.py --arch x64 --binary-override-path out/x64.release/d8 --filter JSTests/TypedArrays test/js-perf-test/JSTests.json
```

## 更新调试器测试预期结果

更新测试后，可能需要重新生成其预期结果文件。可以通过运行以下命令实现：

```bash
tools/run-tests.py --regenerate-expected-files --outdir=ia32.release inspector/debugger/set-instrumentation-breakpoint
```

如果您想查看测试输出的变化，此命令同样有用。首先使用上述命令重新生成预期结果文件，然后通过以下命令检查差异：

```bash
git diff
```

## 更新字节码预期结果 (重新基准化)

有时字节码预期结果可能会更改，导致 `cctest` 失败。要更新黄金文件，可以通过运行以下命令构建 `test/cctest/generate-bytecode-expectations`：

```bash
gm x64.release generate-bytecode-expectations
```

…然后通过将 `--rebaseline` 参数传递给生成的二进制文件来更新默认输入集：

```bash
out/x64.release/generate-bytecode-expectations --rebaseline
```

更新后的黄金文件现在位于 `test/cctest/interpreter/bytecode_expectations/`。

## 添加一个新的字节码预期测试

1. 在 `cctest/interpreter/test-bytecode-generator.cc` 中添加一个新的测试用例，并指定一个与测试同名的黄金文件。

1. 构建 `generate-bytecode-expectations`：

    ```bash
    gm x64.release generate-bytecode-expectations
    ```

1. 运行

    ```bash
    out/x64.release/generate-bytecode-expectations --raw-js testcase.js --output=test/cctest/interpreter/bytecode-expectations/testname.golden
    ```

    其中 `testcase.js` 包含了添加到 `test-bytecode-generator.cc` 的 JavaScript 测试用例，而 `testname` 是在 `test-bytecode-generator.cc` 中定义的测试名称。
