---
title: 'V8 发布 v7.3'
author: 'Clemens Backes，编译器管理者'
avatars:
  - clemens-backes
date: 2019-02-07 11:30:42
tags:
  - 发布
description: 'V8 v7.3 提供了 WebAssembly 和异步性能改进、异步堆栈跟踪、Object.fromEntries、String#matchAll 等更多内容！'
tweet: '1093457099441561611'
---
每六周，我们会根据 [发布流程](/docs/release-process) 创建一个新的 V8 分支。每个版本的分支都会在 Chrome Beta 版本里程碑之前直接从 V8 的 Git 主分支中提取。今天我们很高兴地宣布我们最新的分支，[V8 版本 7.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.3)，它将在接下来几周与 Chrome 73 稳定版同步发布之前处于 Beta 状态。 V8 v7.3 为开发者提供了各种各样的新功能。本文提前展示了一些亮点。

<!--truncate-->
## 异步堆栈跟踪

我们默认启用了 [`--async-stack-traces` 标志](/blog/fast-async#improved-developer-experience)。（[零成本异步堆栈跟踪](https://bit.ly/v8-zero-cost-async-stack-traces)）使得在处理大量异步代码的生产环境中诊断问题变得更加容易，因为通常发送到日志文件/服务的 `error.stack` 属性现在可以提供更多问题原因的洞察。

## 更快的 `await`

与前面提到的 `--async-stack-traces` 标志相关，我们还默认启用了 `--harmony-await-optimization` 标志，这是 `--async-stack-traces` 的前提条件。更多详情请参阅 [更快的异步函数和 promise](/blog/fast-async#await-under-the-hood)。

## 更快的 Wasm 启动

通过对 Liftoff 内部的优化，我们显著提高了 WebAssembly 的编译速度，同时未降低生成代码的质量。在大多数工作负载下，编译时间减少了 15–25%。

![在 [Epic ZenGarden 演示](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html) 上的 Liftoff 编译时间](/_img/v8-release-73/liftoff-epic.svg)

## JavaScript 语言特性

V8 v7.3 带来了多个新的 JavaScript 语言特性。

### `Object.fromEntries`

`Object.entries` API 并不是什么新鲜事：

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]
```

不幸的是，在此前并没有简单的方法可以将 `entries` 结果转换回等效的对象……直到现在！V8 v7.3 支持 [`Object.fromEntries()`](/features/object-fromentries)，一个新的内置 API，可以执行 `Object.entries` 的逆操作：

```js
const result = Object.fromEntries(entries);
// → { x: 42, y: 50 }
```

有关更多信息和示例用例，请参阅 [我们的 `Object.fromEntries` 特性说明](/features/object-fromentries)。

### `String.prototype.matchAll`

全局（`g`）或粘性（`y`）正则表达式的常见用例是将其应用于字符串并迭代所有匹配项。新的 `String.prototype.matchAll` API 使这种操作变得前所未有的简单，尤其是对于带捕获组的正则表达式：

```js
const string = 'Favorite GitHub repos: tc39/ecma262 v8/v8.dev';
const regex = /\b(?<owner>[a-z0-9]+)\/(?<repo>[a-z0-9\.]+)\b/g;

for (const match of string.matchAll(regex)) {
  console.log(`${match[0]} at ${match.index} with '${match.input}'`);
  console.log(`→ owner: ${match.groups.owner}`);
  console.log(`→ repo: ${match.groups.repo}`);
}

// 输出:
//
// tc39/ecma262 at 23 with 'Favorite GitHub repos: tc39/ecma262 v8/v8.dev'
// → owner: tc39
// → repo: ecma262
// v8/v8.dev at 36 with 'Favorite GitHub repos: tc39/ecma262 v8/v8.dev'
// → owner: v8
// → repo: v8.dev
```

更多详情请阅读 [我们的 `String.prototype.matchAll` 说明](/features/string-matchall)。

### `Atomics.notify`

`Atomics.wake` 已重命名为 `Atomics.notify`，以符合 [最近的规范变更](https://github.com/tc39/ecma262/pull/1220)。

## V8 API

请使用 `git log branch-heads/7.2..branch-heads/7.3 include/v8.h` 获取 API 变更列表。

拥有 [活动 V8 检出](/docs/source-code#using-git) 的开发者可以使用 `git checkout -b 7.3 -t branch-heads/7.3` 来试验 V8 v7.3 的新功能。另外，你也可以 [订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，很快亲自尝试这些新功能。
