---
title: '如果您的 CL 导致 Node.js 集成构建失败，该怎么做'
description: '本文档解释了如果您的 CL 导致 Node.js 集成构建失败，该怎么做。'
---
[Node.js](https://github.com/nodejs/node) 使用 V8 的稳定版或测试版。为了额外的集成，V8 团队使用 V8 的[主分支](https://chromium.googlesource.com/v8/v8/+/refs/heads/main)构建 Node，也就是使用今天的 V8 版本。我们为[Linux](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Linux64)提供了集成机器人，而[Windows](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Win64)和[Mac](https://ci.chromium.org/p/node-ci/builders/ci/Node-CI%20Mac64)仍在开发中。

如果 V8 提交队列中的[`node_ci_linux64_rel`](https://ci.chromium.org/p/node-ci/builders/try/node_ci_linux64_rel)机器人失败，要么您的 CL 确实存在问题（需要修复），要么需要修改[Node](https://github.com/v8/node/)。如果 Node 测试失败，在日志文件中搜索“Not OK”。**本文档描述了如何在本地复现问题以及如何对[V8 的 Node 分支](https://github.com/v8/node/)进行修改，如果您的 V8 CL 导致构建失败的话。**

## 源代码

按照 node-ci 仓库中的[说明](https://chromium.googlesource.com/v8/node-ci)检出源代码。

## 测试对 V8 的修改

V8 被设置为 node-ci 的一个 DEPS 依赖项。您可能需要为测试或重现故障对 V8 进行更改。为此，请将您的主要 V8 检出添加为远程：

```bash
cd v8
git remote add v8 <your-v8-dir>/.git
git fetch v8
git checkout v8/<your-branch>
cd ..
```

记得在编译之前运行 gclient hooks。

```bash
gclient runhooks
JOBS=`nproc` make test
```

## 修改 Node.js

Node.js 也被设置为 node-ci 的 `DEPS` 依赖项。您可能需要修改 Node.js，以修复 V8 更改可能导致的中断。V8 对[Node.js 的一个分支](https://github.com/v8/node)进行测试。您需要一个 GitHub 账号来修改该分支。

### 获取 Node 源代码

Fork [V8 的 Node.js GitHub 仓库](https://github.com/v8/node/)（点击 fork 按钮），除非您之前已经 Fork 过。

将您的分支和 V8 的分支都作为远程添加到现有检出中：

```bash
cd node
git remote add v8 http://github.com/v8/node
git remote add <your-user-name> [git@github.com](mailto:git@github.com):<your-user-name>/node.git
git fetch v8
git checkout v8/node-ci-<sync-date>
export BRANCH_NAME=`date +"%Y-%m-%d"`_fix_name
git checkout -b $BRANCH_NAME
```

> **注意** `<sync-date>` 是我们与上游 Node.js 同步的日期。选择最新的日期。

对 Node.js 检出进行修改，并提交更改。然后将更改推送到 GitHub：

```bash
git push <your-user-name> $BRANCH_NAME
```

并在 `node-ci-<sync-date>` 分支上创建一个拉取请求。


一旦拉取请求被合并到 V8 的 Node.js 分支，您需要更新 node-ci 的 `DEPS` 文件，并创建一个 CL。

```bash
git checkout -b update-deps
gclient setdep --var=node_revision=<merged-commit-hash>
git add DEPS
git commit -m '更新 Node'
git cl upload
```
