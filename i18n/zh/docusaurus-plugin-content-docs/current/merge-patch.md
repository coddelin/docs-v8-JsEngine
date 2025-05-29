---
title: '合并及补丁'
description: '本文档介绍如何将 V8 补丁合并到发布分支。'
---
如果你有一个针对 `main` 分支的补丁（例如一个重要的 bug 修复）需要合并到某个 V8 发布分支（refs/branch-heads/12.5），请继续阅读。

以下示例使用了 V8 的 12.3 分支版本。请将 `12.3` 替换为你的版本号。更多信息可阅读 [V8 的版本编号文档](/docs/version-numbers)。

如果一个补丁已合并，则必须在 V8 的问题追踪器中创建相关问题。这有助于跟踪合并情况。

## 什么样的补丁可以被合并？

- 补丁解决了一个 *严重的* bug（按重要性排序）：
    1. 安全性 bug
    1. 稳定性 bug
    1. 正确性 bug
    1. 性能 bug
- 补丁不修改 API。
- 补丁不改变分支切割前存在的行为（除非改变行为是为了修复 bug）。

更多信息请参考 [相关的 Chromium 页面](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/process/merge_request.md)。如有疑问，请发送邮件到 v8-dev@googlegroups.com。

## 合并流程

V8 追踪器中的合并流程是通过属性驱动的。因此，请将 'Merge-Request' 设置为相关的 Chrome Milestone。如果合并仅影响 V8 的某个[移植版本](https://v8.dev/docs/ports)，请相应地设置 HW 属性。例如：

```
Merge-Request: 123
HW: MIPS,LoongArch64
```

审核后，这将调整为：

```
Merge: Approved-123
或者
Merge: Rejected-123
```

在 CL 登陆后，这将再次调整为：

```
Merge: Merged-123, Merged-12.3
```

## 如何检查某个提交是否已合并/回退/具有 Canary 覆盖

使用 [chromiumdash](https://chromiumdash.appspot.com/commit/) 验证相关 CL 是否有 Canary 覆盖。


在顶部 **Releases** 部分应显示一个 Canary。

## 如何创建合并 CL

### 选项 1：使用 [gerrit](https://chromium-review.googlesource.com/)（推荐）


1. 打开你想要合并的 CL。
2. 从扩展菜单（三个竖点，位于右上角）中选择 "Cherry pick"。
3. 输入目标分支 "refs/branch-heads/*XX.X*"（用正确的分支替换 *XX.X*）。
4. 修改提交信息：
   1. 在标题前加上 "Merged: "。
   2. 删除页脚中与原始 CL 对应的行（"Change-Id", "Reviewed-on", "Reviewed-by", "Commit-Queue", "Cr-Commit-Position"）。一定要保留 "(cherry picked from commit XXX)" 行，因为一些工具需要该行来关联原始 CL。
5. 如果有合并冲突，请继续创建 CL。为解决冲突，可以使用 gerrit 的 UI 或从菜单（三个竖点，位于右上角）中使用 "下载补丁" 命令，便捷地在本地拉取补丁。
6. 提交审核。

### 选项 2：使用自动脚本

假设你正在将修订版 af3cf11 合并到分支 12.2（请指定完整的 git 哈希，此处为简化使用缩写）。

```
https://source.chromium.org/chromium/chromium/src/+/main:v8/tools/release/merge_to_branch_gerrit.py --branch 12.3 -r af3cf11
```


### 登陆后：查看 [分支流水线](https://ci.chromium.org/p/v8)

如果在应用补丁后某个构建器不是绿色的，请立即回退合并。一个名为 `AutoTagBot` 的机器人会在 10 分钟后自动处理正确的版本控制。

## 为 Canary/Dev 版本打补丁

如果你需要为 Canary/Dev 版本打补丁（这种情况不应经常发生），请在问题中 cc vahl@ 或 machenbach@。谷歌员工：在创建 CL 之前，请查看 [内部站点](http://g3doc/company/teams/v8/patching_a_version)。

