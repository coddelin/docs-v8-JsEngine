---
title: 'V8 的版本编号方案'
description: '本文档解释了 V8 的版本编号方案。'
---
V8 的版本号格式为 `x.y.z.w`，其中：

- `x.y` 是 Chromium 里程碑除以 10（例如 M60 → `6.0`）
- 每当有新的 [LKGR](https://www.chromium.org/chromium-os/developer-library/glossary/#acronyms)（通常每天几次）时，`z` 会自动增加
- 在分支点之后手动回合的补丁会导致 `w` 增加

如果 `w` 为 `0`，则版本号中省略它。例如，v5.9.211（而不是 “v5.9.211.0”）在回合补丁后会被提升为 v5.9.211.1。

## 我应该使用哪个 V8 版本？

嵌入 V8 的用户通常应使用 *与 Chrome 所带 V8 的次版本对应的分支的最新头部代码*。

### 找到与最新稳定版 Chrome 对应的 V8 次版本

要找出这个版本：

1. 转到 https://chromiumdash.appspot.com/releases
2. 在表格中找到最新稳定版 Chrome 版本
3. 点击 (i) 并查看 `V8` 列


### 找到对应分支的头部

V8 的版本相关分支不会出现在在线代码库 https://chromium.googlesource.com/v8/v8.git 中；只有标签会出现。要找到该分支的头部，请前往以下格式的 URL：

```
https://chromium.googlesource.com/v8/v8.git/+/branch-heads/<minor-version>
```

例如：对于找到的 V8 次版本 12.1，我们转到 https://chromium.googlesource.com/v8/v8.git/+/branch-heads/12.1，会找到一个标题为 “Version 12.1.285.2” 的提交。

**注意：** 你绝不应该仅仅通过在上述次版本中找到数值上最大的标签来选择版本，因为有时这些版本可能不受支持，例如它们可能是在决定次版本的切分位置之前就被标记的。此类版本不会接收回溯或类似支持。

例如：V8 的标签 `5.9.212`、`5.9.213`、`5.9.214`、`5.9.214.1` … 和 `5.9.223` 被废弃，尽管它们的数值比 5.9.211.33 的**分支头部**更大。

### 检出对应分支的头部

如果你已经有源码，可以直接检出头部。如果你使用 `depot_tools` 检索了源码，那么可以使用以下命令：

```bash
git branch --remotes | grep branch-heads/
```

来列出相关分支。你需要检出与上面找到的 V8 次版本对应的分支，并使用该分支。最终所在的标签就是适合你作为嵌入者使用的 V8 版本。

如果你没有使用 `depot_tools`，请编辑 `.git/config` 并在 `[remote "origin"]` 部分添加以下行：

```
fetch = +refs/branch-heads/*:refs/remotes/branch-heads/*
```
