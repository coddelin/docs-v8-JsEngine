---
title: "发布流程"
description: "本文档解释了 V8 的发布流程。"
---
V8 的发布流程与 [Chrome](https://www.chromium.org/getting-involved/dev-channel) 的发布流程紧密相关。V8 团队使用 Chrome 的四个发布渠道向用户推送新版本。

如果您想查找某个 Chrome 版本中包含的 V8 版本，可以查看 [Chromiumdash](https://chromiumdash.appspot.com/releases)。对于每个 Chrome 版本，在 V8 仓库中都会创建一个独立的分支，以便于回溯，例如 [Chrome M121](https://chromium.googlesource.com/v8/v8/+log/refs/branch-heads/12.1)。

## Canary 发布版本

每天会通过 [Chrome 的 Canary 渠道](https://www.google.com/chrome/browser/canary.html?platform=win64)向用户推送一个新的 Canary 构建版本。通常，其交付内容是来自 [main](https://chromium.googlesource.com/v8/v8.git/+/refs/heads/main) 的最新且足够稳定的版本。

Canary 的分支通常如下所示：

## 开发 (Dev) 发布版本

每周会通过 [Chrome 的 Dev 渠道](https://www.google.com/chrome/browser/desktop/index.html?extra=devchannel&platform=win64)向用户推送一个新的 Dev 构建版本。通常，其交付内容包括 Canary 渠道上最新且足够稳定的 V8 版本。


## 测试 (Beta) 发布版本

大约每两周会创建一个新的主要分支，例如 [Chrome 94](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.4)。这与 [Chrome 的 Beta 渠道](https://www.google.com/chrome/browser/beta.html?platform=win64) 的创建同步进行。Chrome Beta 固定于 V8 分支的头部。在大约两周后，该分支将被提升为稳定版本。

仅选择性地将更改合并到该分支，以稳定版本。

Beta 的分支通常如下所示：

```
refs/branch-heads/12.1
```

它们基于 Canary 分支。

## 稳定 (Stable) 发布版本

大约每四周会发布一个新的主要稳定版本。不会创建特殊的分支，因为最新的 Beta 分支会被直接提升为稳定版本。此版本通过 [Chrome 的稳定渠道](https://www.google.com/chrome/browser/desktop/index.html?platform=win64) 推送给用户。

稳定发布版本的分支通常如下所示：

```
refs/branch-heads/12.1
```

它们是被提升（重用）的 Beta 分支。

## API

Chromiumdash 还提供了一个 API 用于收集相同的信息：

```
https://chromiumdash.appspot.com/fetch_milestones (获取 V8 的分支名称，例如 refs/branch-heads/12.1)
https://chromiumdash.appspot.com/fetch_releases (获取 V8 分支的 git 哈希值)
```

以下参数是有用的：
mstone=121
channel=Stable,Canary,Beta,Dev
platform=Mac,Windows,Lacros,Linux,Android,Webview,etc.

## 我应该嵌入哪个版本到我的应用中？

与 Chrome 稳定渠道使用的分支相同的分支头。

我们通常会将重要的错误修复回合并到稳定分支，因此如果您关心稳定性、安全性和正确性，也应该包含这些更新——这就是为什么我们推荐“分支的头部”，而不是一个确切的版本。

一旦一个新分支被提升为稳定版本，我们就会停止维护之前的稳定分支。这大约每四周发生一次，所以您应该准备好至少这么频繁地更新。

**相关链接：** [我应该使用哪个 V8 版本？](/docs/version-numbers#which-v8-version-should-i-use%3F)
