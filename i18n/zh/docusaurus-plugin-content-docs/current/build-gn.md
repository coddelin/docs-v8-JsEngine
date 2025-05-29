---
title: '使用 GN 构建 V8'
description: '本文档介绍如何使用 GN 构建 V8。'
---
V8 是通过 [GN](https://gn.googlesource.com/gn/+/master/docs/) 构建的。GN 是一种元构建系统，它为多种其他构建系统生成构建文件。因此，如何构建取决于您使用的“后台”构建系统和编译器。
以下说明假定您已经有一个 [V8 的代码库](/docs/source-code) 并且已[安装构建依赖项](/docs/build)。

有关 GN 的更多信息，请参见 [Chromium 的文档](https://www.chromium.org/developers/gn-build-configuration) 或 [GN 的文档](https://gn.googlesource.com/gn/+/master/docs/)。

从源码构建 V8 包含三个步骤：

1. 生成构建文件
2. 编译
3. 运行测试

构建 V8 有两种工作流程：

- 使用一个名为 `gm` 的辅助脚本，它将上述三个步骤整合为一个方便的工作流程
- 原始的工作流程，其中您需要手动运行每个步骤的单独命令

## 使用 `gm` 构建 V8（方便的工作流程）

`gm` 是一个便捷的多合一脚本，用于生成构建文件、触发构建并可选地运行测试。它位于您的 V8 代码库中的 `tools/dev/gm.py`。我们建议在您的 shell 配置中添加一个别名：

```bash
alias gm=/path/to/v8/tools/dev/gm.py
```

然后您可以使用 `gm` 为已知配置（例如 `x64.release`）构建 V8：

```bash
gm x64.release
```

在构建完成后立即运行测试：

```bash
gm x64.release.check
```

`gm` 输出它执行的所有命令，使追踪和重新执行它们变得简单。

`gm` 使得通过单个命令构建所需二进制文件并运行特定测试成为可能：

```bash
gm x64.debug mjsunit/foo cctest/test-bar/*
```

## 构建 V8：原始手动工作流程

### 第一步：生成构建文件

有几种生成构建文件的方法：

1. 使用 `gn` 直接进行原始手动工作流程。
2. 一个名为 `v8gen` 的辅助脚本简化了常用配置的过程。

#### 使用 `gn` 生成构建文件

使用 `gn` 为目录 `out/foo` 生成构建文件：

```bash
gn args out/foo
```

这会打开一个编辑器窗口，用于指定 [`gn` 参数](https://gn.googlesource.com/gn/+/master/docs/reference.md)。或者，您可以在命令行中传递参数：

```bash
gn gen out/foo --args='is_debug=false target_cpu="x64" v8_target_cpu="arm64" use_goma=true'
```

这会生成用于以 arm64 模拟器在 release 模式下使用 `goma` 编译的构建文件。

要查看所有可用的 `gn` 参数，请运行：

```bash
gn args out/foo --list
```

#### 使用 `v8gen` 生成构建文件

V8 代码库包含一个名为 `v8gen` 的便捷脚本，可更轻松地为常用配置生成构建文件。我们建议在您的 shell 配置中添加一个别名：

```bash
alias v8gen=/path/to/v8/tools/dev/v8gen.py
```

调用 `v8gen --help` 以获取更多信息。

列出可用配置（或主机上的 bot）：

```bash
v8gen list
```

```bash
v8gen list -m client.v8
```

在 `foo` 文件夹内生成 `client.v8` 瀑布流中的某个 bot 配置：

```bash
v8gen -b 'V8 Linux64 - debug builder' -m client.v8 foo
```

### 第二步：编译 V8

要构建 V8 的全部内容（假定 `gn` 生成到 `x64.release` 文件夹），运行：

```bash
ninja -C out/x64.release
```

要构建特定目标（比如 `d8`），将目标附加到命令中：

```bash
ninja -C out/x64.release d8
```

### 第三步：运行测试

您可以将输出目录传递给测试驱动程序。其他相关标志可以从构建推断：

```bash
tools/run-tests.py --outdir out/foo
```

您也可以测试最近编译的构建（在 `out.gn`）：

```bash
tools/run-tests.py --gn
```

**构建问题？请通过 [v8.dev/bug](https://v8.dev/bug) 提交 bug 或在 v8-users@googlegroups.com 上寻求帮助。**
