---
title: '贡献到 V8'
description: '本文档解释了如何贡献到 V8。'
---
本页面的信息解释了如何贡献到 V8。在向我们提交贡献之前，请务必阅读完整内容。

## 获取代码

请参阅[检查 V8 源代码](/docs/source-code)。

## 在您贡献之前

### 在 V8 的邮件列表中寻求指导

在进行较大的 V8 贡献之前，您应该首先通过 [V8 贡献者邮件列表](https://groups.google.com/group/v8-dev) 与我们取得联系，这样我们可以提供帮助并可能为您提供指导。事先沟通协调可以大大避免后续可能的挫折感。

### 签署 CLA

在我们使用您的代码之前，您需要签署 [Google 个人贡献者许可协议](https://cla.developers.google.com/about/google-individual)，可以在线完成。主要是因为您的更改的版权仍然归您所有，即使您的贡献成为我们代码库的一部分，因此我们需要您的许可来使用和分发您的代码。我们还需要确保其他事项，例如如果您知道您的代码侵犯了他人的专利，您会告知我们。您可以在提交代码并得到成员批准后再完成这一手续，但在我们将您的代码加入代码库之前，您必须完成此步骤。

由公司进行的贡献适用不同的协议，即 [软件授权和公司贡献者许可协议](https://cla.developers.google.com/about/google-corporate)。

在线签署协议[点击这里](https://cla.developers.google.com/)。

## 提交您的代码

V8 的源代码遵循 [Google C++ 风格指南](https://google.github.io/styleguide/cppguide.html)，因此您应该熟悉这些指南。在提交代码之前，您必须通过我们所有的[测试](/docs/test)，并成功运行 presubmit 检查：

```bash
git cl presubmit
```

presubmit 脚本使用了 Google 的代码静态检查工具 [`cpplint.py`](https://raw.githubusercontent.com/google/styleguide/gh-pages/cpplint/cpplint.py)。它是 [`depot_tools`](https://dev.chromium.org/developers/how-tos/install-depot-tools) 工具的一部分，并且需要在您的 `PATH` 中——因此如果 `depot_tools` 已包含在您的 `PATH` 中，一切应该都能正常工作。

### 上传到 V8 的代码审查工具

所有提交，包括项目成员的提交，都需要审查。我们使用与 Chromium 项目相同的代码审查工具和流程。为了提交补丁，您需要获取 [`depot_tools`](https://dev.chromium.org/developers/how-tos/install-depot-tools) 并按照[请求审查](https://chromium.googlesource.com/chromium/src/+/master/docs/contributing.md)中的说明进行操作（使用您的 V8 工作区，而不是 Chromium 工作区）。

### 注意破坏或回归现象

获得代码审查批准后，您可以使用提交队列来提交您的补丁。提交队列会运行一系列测试，如果所有测试通过，就会提交您的补丁。一旦您的更改被提交，可以关注[控制台](https://ci.chromium.org/p/v8/g/main/console)，直到在您的更改之后机器人变为绿色为止，因为控制台运行的测试要比提交队列更多。
