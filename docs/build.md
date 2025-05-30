---
title: "从源代码构建V8"
description: "本文档解释了如何从源代码构建V8。"
---
为了能够在Windows/Linux/macOS上为x64从头构建V8，请按照以下步骤操作。

## 获取V8源代码

请按照我们指南中关于[获取V8源代码](/docs/source-code)的说明进行操作。

## 安装构建依赖

1. 对于macOS：安装Xcode并接受其许可协议。（如果您已单独安装命令行工具，请[先卸载它们](https://bugs.chromium.org/p/chromium/issues/detail?id=729990#c1)。）

1. 确保您在V8的源目录中。如果您按照前一节中的每个步骤进行操作，那么您已经在正确的位置。

1. 下载所有构建依赖：

   ```bash
   gclient sync
   ```

   对于Google员工 - 如果在运行hooks时出现Failed to fetch file或Login required错误，请首先通过运行以下命令验证Google Storage的身份：

   ```bash
   gsutil.py config
   ```

   使用您的@google.com账户登录，并在询问项目ID时输入`0`。

1. 这一步仅在Linux上需要。安装其他构建依赖：

    ```bash
    ./build/install-build-deps.sh
    ```

## 构建V8

1. 确保您处于`main`分支的V8源目录中。

    ```bash
    cd /path/to/v8
    ```

1. 拉取最新的更改并安装任何新的构建依赖：

    ```bash
    git pull && gclient sync
    ```

1. 编译源代码：

    ```bash
    tools/dev/gm.py x64.release
    ```

    或者，可以编译源代码并立即运行测试：

    ```bash
    tools/dev/gm.py x64.release.check
    ```

    有关`gm.py`辅助脚本及其触发的命令的更多信息，请参阅[使用GN构建](/docs/build-gn)。
