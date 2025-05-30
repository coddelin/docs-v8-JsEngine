---
title: "停止发布版本博客文章"
author: "郭书瑜 ([@shu_](https://twitter.com/_shu))"
avatars: 
 - "shu-yu-guo"
date: 2022-06-17
tags: 
 - 版本发布
description: "V8将停止版本博客文章，转而根据Chrome发布计划和功能博客文章发布更新信息。"
tweet: "1537857497825824768"
---

过去，每个新的V8发布分支都会有一篇博客文章。你可能注意到自v9.9以来就没有发布过版本博客文章。从v10.0开始，我们将不再为每个新分支发布版本博客文章。但是不用担心，你依然可以获得以前通过版本博客文章获取的信息！继续阅读，了解未来在哪里找到这些信息。

<!--truncate-->
## 发布计划和当前版本

你是否通过阅读版本博客文章来确定V8的最新版本？

V8采用Chrome的发布计划。欲了解当前V8的最新稳定版本，请查阅 [Chrome发布路线图](https://chromestatus.com/roadmap)。

每隔四周，我们会创建一个新的V8分支，这是我们[发布流程](https://v8.dev/docs/release-process)的一部分。每个版本会从V8的Git主分支中分出，在Chrome Beta阶段前生成。这些分支处于测试阶段，并根据[Chrome发布路线图](https://chromestatus.com/roadmap)成为正式版本。

要查找特定Chrome版本关联的V8分支：

1. 将Chrome版本除以10即可得出V8版本。例如，Chrome 102对应V8 10.2。
1. 对于版本号X.Y，其分支可以通过以下形式的URL找到：

```
https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/X.Y
```

例如，10.2分支可以在https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/10.2找到。

有关版本号和分支的更多信息，请参阅[我们的详细文章](https://v8.dev/docs/version-numbers)。

对于一个V8版本X.Y，拥有激活的V8代码库的开发者可以使用`git checkout -b X.Y -t branch-heads/X.Y`来尝试该版本的新功能。

## 新的JavaScript或WebAssembly功能

你是否通过阅读版本博客文章以了解有哪些新的JavaScript或WebAssembly功能已经实现或默认启用？

请查阅 [Chrome发布路线图](https://chromestatus.com/roadmap)，该路线图列出了每个版本的新功能及其里程碑。

请注意，[独立的功能深度解析文章](/features)可能会在功能在V8中实现之前或之后发布。

## 显著的性能改进

你是否通过阅读版本博客文章了解显著的性能改进？

未来，我们将单独撰写吸引注意的性能改进博客文章，就像过去为[火花塞（Sparkplug)](https://v8.dev/blog/sparkplug)这样的改进所做的那样。

## API更改

你是否通过阅读版本博客文章了解API更改？

要查看从早期版本A.B到更新版本X.Y期间修改V8 API的提交列表，请在激活的V8代码库中使用`git log branch-heads/A.B..branch-heads/X.Y include/v8\*.h`。
