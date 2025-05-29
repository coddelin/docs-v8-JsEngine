---
title: 'V8 发布 v5.5'
author: 'V8 团队'
date: 2016-10-24 13:33:37
tags:
  - 发布
description: 'V8 v5.5 带来了内存使用减少和对 ECMAScript 语言功能支持的增强。'
---
每六周，我们会按照[发布流程](/docs/release-process)创建一个新的 V8 分支。每个版本都是在 Chrome Beta 的里程碑之前从 V8 的 Git 主分支生成的。今天，我们很高兴宣布我们的最新分支，[V8 版本 5.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.5)，它将进入测试版，直到几周后与 Chrome 55 稳定版协同发布。V8 v5.5 包含了各种面向开发者的功能，因此我们希望提前为您揭示一些亮点，以期望发布。

<!--truncate-->
## 语言功能

### 异步函数

在 v5.5 中，V8 支持 JavaScript ES2017 [异步函数](https://developers.google.com/web/fundamentals/getting-started/primers/async-functions)，使得编写使用和创建 Promises 的代码更加容易。使用异步函数，等待 Promise 的解析只需在其前面输入 await，并像值是同步可用的一样继续操作 - 无需回调。请查看[这篇文章](https://developers.google.com/web/fundamentals/getting-started/primers/async-functions)了解介绍。

以下是用典型的异步 Promise 基式风格编写的获取 URL 并返回响应文本的示例函数。

```js
function logFetch(url) {
  return fetch(url)
    .then(response => response.text())
    .then(text => {
      console.log(text);
    }).catch(err => {
      console.error('fetch 失败', err);
    });
}
```

以下是使用异步函数重写的代码，移除了回调。

```js
async function logFetch(url) {
  try {
    const response = await fetch(url);
    console.log(await response.text());
  } catch (err) {
    console.log('fetch 失败', err);
  }
}
```

## 性能改进

V8 v5.5 带来了许多关于内存占用的关键改进。

### 内存

内存消耗是 JavaScript 虚拟机性能权衡空间中的重要维度。在过去的几个版本中，V8 团队分析并显著减少了一些被认为代表现代网络开发模式的网站的内存占用。V8 5.5 在**低内存设备**上将 Chrome 的总体内存消耗减少了最多 35%（与 Chrome 53 中的 V8 5.3 相比），这归因于 V8 堆大小和区域内存使用的减少。其他设备类型也从区域内存减少中受益。请查看[专门的博客文章](/blog/optimizing-v8-memory)了解详细信息。

## V8 API

请查看我们的[API 变化摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。该文档会在每次主要发布后的几周内定期更新。

### V8 检测器迁移

V8 检测器已从 Chromium 迁移到 V8。检测器代码现已完全存储在 [V8 存储库](https://chromium.googlesource.com/v8/v8/+/master/src/inspector/)中。

拥有[活跃的 V8 检出版本](/docs/source-code#using-git)的开发者可以使用 `git checkout -b 5.5 -t branch-heads/5.5` 来尝试 V8 5.5 中的新功能。或者，您可以[订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，很快亲自尝试新功能。
