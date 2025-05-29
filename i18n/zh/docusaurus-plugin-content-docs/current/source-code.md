---
title: '检查 V8 源代码'
description: '本文档说明如何在本地检查 V8 源代码。'
---
本文档说明如何在本地检查 V8 源代码。如果您只想在线浏览源代码，请使用以下链接：

- [浏览](https://chromium.googlesource.com/v8/v8/)
- [浏览最新版本](https://chromium.googlesource.com/v8/v8/+/master)
- [变更记录](https://chromium.googlesource.com/v8/v8/+log/master)

## 使用 Git

V8 的 Git 仓库位于 https://chromium.googlesource.com/v8/v8.git，并且有官方镜像在 GitHub 上：https://github.com/v8/v8。

不要直接使用 `git clone` 克隆这些 URL！如果您希望通过您的检出版本构建 V8，请按照以下说明正确设置环境。

## 操作指南

1. 在 Linux 或 macOS 上，首先安装 Git，然后安装 [`depot_tools`](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up)。

    在 Windows 上，请按照 Chromium 的说明 ([Google 内部员工](https://goto.google.com/building-chrome-win)，[非 Google 内部员工](https://chromium.googlesource.com/chromium/src/+/master/docs/windows_build_instructions.md#Setting-up-Windows)) 安装 Git、Visual Studio、Windows 调试工具以及 `depot_tools`。

1. 更新 `depot_tools`，通过在终端/命令行中执行以下命令完成更新。在 Windows 上，请使用命令提示符 (`cmd.exe`) 而非 PowerShell 或其他工具。

    ```
    gclient
    ```

1. 对于 **推送权限**，需要设置一个包含您的 Git 密码的 `.netrc` 文件：

    1. 前往 https://chromium.googlesource.com/new-password 并用您的提交者账户登录（通常是一个 `@chromium.org` 的账户）。注意：创建新密码不会自动撤销之前生成的密码。请确保使用与 `git config user.email` 设置相同的电子邮件。
    1. 查看包含 shell 命令的大灰框。将这些命令粘贴到您的 shell 中。

1. 现在获取 V8 源代码，包括所有分支和依赖项：

    ```bash
    mkdir ~/v8
    cd ~/v8
    fetch v8
    cd v8
    ```

之后，您将进入一个特意设置的分离头状态。

您可以选择设置新分支的跟踪方式：

```bash
git config branch.autosetupmerge always
git config branch.autosetuprebase always
```

或者，您可以按照如下方式创建新的本地分支（推荐）：

```bash
git new-branch fix-bug-1234
```

## 保持最新

使用 `git pull` 更新当前分支。注意，如果您不在一个分支上，`git pull` 将无法工作，此时需要使用 `git fetch`。

```bash
git pull
```

有时 V8 的依赖项会被更新。您可以通过运行以下命令来同步更新：

```bash
gclient sync
```

## 提交代码进行审核

```bash
git cl upload
```

## 提交

您可以通过 codereview 上的 CQ 复选框提交（推荐）。另见 [Chromium 的操作说明](https://chromium.googlesource.com/chromium/src/+/master/docs/infra/cq.md)，了解 CQ 标志和故障排除方法。

如果需要比默认设置更多的 trybots，请在 Gerrit 的提交信息中添加以下内容（例如添加一个 nosnap bot）：

```
CQ_INCLUDE_TRYBOTS=tryserver.v8:v8_linux_nosnap_rel
```

要手动提交，请更新您的分支：

```bash
git pull --rebase origin
```

然后使用以下命令提交：

```bash
git cl land
```

## Try jobs

此部分仅供 V8 项目成员使用。

### 从 codereview 创建 try job

1. 将一个 CL 上传到 Gerrit。

    ```bash
    git cl upload
    ```

1. 通过向 try bots 发送 try job 来尝试 CL，如下所示：

    ```bash
    git cl try
    ```

1. 等待 try bots 构建并发送结果到您的电子邮件。您也可以在 Gerrit 上查看补丁的 try 状态。

1. 如果补丁应用失败，您需要重新基准化您的补丁或者指定同步的 V8 修订版本：

```bash
git cl try --revision=1234
```

### 从本地分支创建 try job

1. 在本地仓库的 git 分支提交一些更改。

1. 通过向 try bots 发送 try job 来尝试更改，如下所示：

    ```bash
    git cl try
    ```

1. 等待 try bots 构建并发送结果到您的电子邮件。注意：当前某些副本存在问题，建议从 codereview 发送 try jobs。

### 有用的参数

修订参数告诉 try bot 使用代码库中的哪个修订版本来应用您的本地更改。如果不指定修订，[V8 的最新稳定修订版本 (LKGR)](https://v8-status.appspot.com/lkgr) 将被用作基准。

```bash
git cl try --revision=1234
```

为了避免 try job 在所有 bots 上运行，可以使用 `--bot` 参数并提供一个用逗号分隔的构建器名称列表。例如：

```bash
git cl try --bot=v8_mac_rel
```

### 查看 try server

```bash
git cl try-results
```

## 源代码分支

V8 有几个不同的分支；如果您不确定要获取哪个版本，您很可能需要最新的稳定版本。查看更多关于使用不同分支的信息，请查看我们的[发布流程](/docs/release-process)。

您可能希望关注 Chrome 稳定版（或测试版）渠道中使用的 V8 版本，详见 https://omahaproxy.appspot.com/。
