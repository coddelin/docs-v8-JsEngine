---
title: "V8 ❤️ Node.js"
author: "Franziska Hinkelmann, Node 猴子补丁开发者"
date: "2016-12-15 13:33:37"
tags: 
  - Node.js
description: "本文重点介绍了最近为在 V8 和 Chrome DevTools 中更好支持 Node.js 所做的一些努力。"
---
Node.js 的受欢迎程度在过去几年里稳步增长，我们一直致力于让 Node.js 更加优秀。本文重点介绍了 V8 和 DevTools 的一些最新努力。

## 在 DevTools 中调试 Node.js

你现在可以[使用 Chrome 开发者工具调试 Node 应用](https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27#.knjnbsp6t)。Chrome DevTools 团队将实现调试协议的源代码从 Chromium 移到 V8，使 Node 核心更容易保持与调试器源代码和依赖项同步。其他浏览器厂商和 IDE 也使用 Chrome 调试协议，共同提升开发者使用 Node 时的体验。

<!--truncate-->
## ES2015 性能提升

我们正在努力使 V8 比以往更快。[我们最近的许多性能工作集中在 ES6 特性](/blog/v8-release-56)，包括 promises、生成器、析构函数以及剩余/展开运算符。由于 Node 6.2 及更高版本中的 V8 完全支持 ES6，Node 开发者可以“原生”使用新的语言特性，而无需使用填充库。这意味着 Node 开发者通常最先受益于 ES6 性能改进。同样，他们通常也是最先发现性能回退的人。感谢细心的 Node 社区，我们发现并修复了一些回退问题，包括 [`instanceof`](https://github.com/nodejs/node/issues/9634)、[`buffer.length`](https://github.com/nodejs/node/issues/9006)、[长参数列表](https://github.com/nodejs/node/pull/9643) 和 [`let`/`const`](https://github.com/nodejs/node/issues/9729) 的性能问题。

## 即将推出 Node.js `vm` 模块和 REPL 的修复

[`vm` 模块](https://nodejs.org/dist/latest-v7.x/docs/api/vm.html)存在[一些长期问题](https://github.com/nodejs/node/issues/6283)。为了更好地解决这些问题，我们扩展了 V8 API 以实现更直观的行为。我们很高兴地宣布，vm 模块的改进是我们作为[Node 基金会 Outreachy 项目](https://nodejs.org/en/foundation/outreachy/)导师支持的项目之一。我们希望在不久的将来能看到这一项目和其他项目的更多进展。

## `async`/`await`

使用异步函数，你可以通过顺序等待 promises 来极大简化异步代码的编写流程。`async`/`await` 将随着[下次 V8 更新](https://github.com/nodejs/node/pull/9618)登陆 Node。我们最近对 promises 和生成器性能的改进帮助异步函数变得更快。相关方面，我们也正在提供[promise 钩子](https://bugs.chromium.org/p/v8/issues/detail?id=4643)，这是[Node Async 钩子 API](https://github.com/nodejs/node-eps/pull/18)所需的一组内省 API。

## 想尝试最新的 Node.js 吗？

如果你迫不及待想测试 Node 中最新的 V8 特性，并且不介意使用最新的、不稳定的软件，可以在[这里](https://github.com/v8/node/tree/vee-eight-lkgr)尝试我们的集成分支。[V8 在进入 Node.js 之前会持续集成到 Node](https://ci.chromium.org/p/v8/builders/luci.v8.ci/V8%20Linux64%20-%20node.js%20integration)，这样我们可以尽早发现问题。但请注意，这比 Node.js 的最新分支更加实验性。
