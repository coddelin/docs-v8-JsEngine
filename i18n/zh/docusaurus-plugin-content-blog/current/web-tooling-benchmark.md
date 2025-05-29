---
title: "宣布 Web Tooling Benchmark"
author: "Benedikt Meurer（[@bmeurer](https://twitter.com/bmeurer)），JavaScript 性能协调员"
avatars:
  - "benedikt-meurer"
date: 2017-11-06 13:33:37
tags:
  - 基准测试
  - Node.js
description: "全新的 Web Tooling Benchmark 通过在 Babel、TypeScript 和其他实际项目中，帮助识别和修复 V8 的性能瓶颈。"
tweet: "927572065598824448"
---
JavaScript 性能对 V8 团队来说一直很重要，在这篇文章中，我们希望讨论一个新的 JavaScript [Web Tooling Benchmark](https://v8.github.io/web-tooling-benchmark)。我们最近正在使用它来识别和修复 V8 中的一些性能瓶颈。您可能已经知道 V8 对 [Node.js 的强烈承诺](/blog/v8-nodejs)，而这个基准测试进一步延续了这一承诺，特别是通过运行基于 Node.js 构建的常见开发者工具的性能测试。Web Tooling Benchmark 中包含的工具是现代开发者和设计师今天使用的构建现代网站和基于云的应用程序的工具。为了继续我们专注于 [现实场景性能](/blog/real-world-performance/) 而不是人工基准测试的努力，我们使用开发者每天运行的实际代码创建了这个基准测试。

<!--truncate-->
Web Tooling Benchmark 套件从一开始就旨在涵盖 Node.js 的重要 [开发者工具使用案例](https://github.com/nodejs/benchmarking/blob/master/docs/use_cases.md#web-developer-tooling)。由于 V8 团队专注于核心 JavaScript 性能，因此我们以一种专注于 JavaScript 工作负载并排除对 Node.js 特定 I/O 或外部交互的测量方式来构建这个基准测试。这使得能够在 Node.js、所有浏览器以及所有主要的 JavaScript 引擎 shell 中运行基准测试，包括 `ch`（ChakraCore）、`d8`（V8）、`jsc`（JavaScriptCore）和 `jsshell`（SpiderMonkey）。尽管这个基准测试不限于 Node.js，我们还是很高兴 [Node.js 基准测试工作组](https://github.com/nodejs/benchmarking) 正考虑将其作为 Node 性能的标准 ([nodejs/benchmarking#138](https://github.com/nodejs/benchmarking/issues/138))。

工具基准测试中的各个测试涵盖了开发者常用于构建基于 JavaScript 应用的各种工具，例如：

- 使用 `es2015` 预设的 [Babel](https://github.com/babel/babel) 转译器。
- Babel 使用的解析器 — 名为 [Babylon](https://github.com/babel/babylon)，运行在几个流行输入上（包括 [lodash](https://lodash.com/) 和 [Preact](https://github.com/developit/preact) 的打包文件）。
- [webpack](http://webpack.js.org/) 使用的 [acorn](https://github.com/ternjs/acorn) 解析器。
- [TypeScript](http://www.typescriptlang.org/) 编译器，运行在 [TodoMVC](https://github.com/tastejs/todomvc) 项目中的 [typescript-angular](https://github.com/tastejs/todomvc/tree/master/examples/typescript-angular) 示例项目上。

有关所有包含测试的详细信息，请参阅[深入分析](https://github.com/v8/web-tooling-benchmark/blob/master/docs/in-depth.md)。

基于我们过去在其他基准测试（例如 [Speedometer](http://browserbench.org/Speedometer)）的经验，这些基准测试由于框架新版本发布后很快过时，因此我们确保基准测试中的每个工具都能够轻松更新至最新版本。通过基于 npm 基础设施来建立基准套件，我们可以轻松更新它，以确保始终测试 JavaScript 开发工具的最新状态。更新一个测试用例只需将版本号在 `package.json` 清单中递增即可。

我们创建了一个 [跟踪缺陷](http://crbug.com/v8/6936) 和一个 [电子表格](https://docs.google.com/spreadsheets/d/14XseWDyiJyxY8_wXkQpc7QCKRgMrUbD65sMaNvAdwXw)，记录了到目前为止我们收集的关于 V8 在新基准测试中的性能的所有相关信息。我们的调查已经得出了一些有趣的结果。例如，我们发现 V8 经常触发 `instanceof` 的慢路径 ([v8:6971](http://crbug.com/v8/6971))，导致 3–4 倍的性能下降。我们还发现并修复了某些形式的属性分配（例如 `obj[name] = val`，其中 `obj` 是通过 `Object.create(null)` 创建）的性能瓶颈。在这些情况下，尽管 V8 可以利用 `obj` 具有 `null` 原型这一事实，它仍然会走慢路径 ([v8:6985](http://crbug.com/v8/6985))。通过这个基准测试做出的这些及其他发现，不仅改善了 Node.js 中的 V8，还提升了 Chrome 中的性能。

我们不仅仅致力于让 V8 更快，还在找到问题时修复并向上游提交了基准测试工具和库中的性能错误。例如，我们发现了 [Babel](https://github.com/babel/babel) 中的一些性能问题，其中代码模式像

```js
value = items[items.length - 1];
```

会导致访问属性 `"-1"`，因为代码在之前没有检查 `items` 是否为空。这种代码模式由于需要查找 `"-1"` 属性，会使 V8 走慢路径，尽管稍微修改后的等效 JavaScript 代码会快得多。我们帮助在 Babel 中修复了这些问题（[babel/babel#6582](https://github.com/babel/babel/pull/6582)、[babel/babel#6581](https://github.com/babel/babel/pull/6581) 和 [babel/babel#6580](https://github.com/babel/babel/pull/6580)）。我们还发现并修复了一个问题，即 Babel 会超出字符串长度进行访问（[babel/babel#6589](https://github.com/babel/babel/pull/6589)），这会触发 V8 中的另一个慢路径。此外，我们还[优化了数组和字符串的越界读取](https://twitter.com/bmeurer/status/926357262318305280)。我们期待[继续与社区合作](https://twitter.com/rauchg/status/924349334346276864)，以改进这一重要用例的性能，不仅限于在 V8 上运行时，还包括在其他 JavaScript 引擎（如 ChakraCore）上运行时。

我们对真实世界性能的高度关注，特别是改进流行的 Node.js 工作负载的努力，从 V8 最近几个版本中在基准测试中的持续改进得以体现：

![](/_img/web-tooling-benchmark/chart.svg)

自 V8 v5.8（[切换到 Ignition+TurboFan 架构](/blog/launching-ignition-and-turbofan)之前的最后一个 V8 版本）以来，V8 在工具基准测试中的得分已提升了约 **60%**。

在过去的几年里，V8 团队认识到，没有任何一个 JavaScript 基准测试——即使是一个用心良苦、精心设计的测试——可以被用作 JavaScript 引擎整体性能的唯一代理。然而，我们确实认为新的 **Web 工具基准测试** 突出了值得关注的 JavaScript 性能领域。尽管名称和初衷如此，我们发现 Web 工具基准测试套件不仅代表工具工作负载，还代表了广泛的更复杂 JavaScript 应用程序，这些应用程序并未被前端为主的基准测试（如 Speedometer）很好地测试。它绝不是 Speedometer 的替代品，而是一组补充测试。

最好的消息是，由于 Web 工具基准测试围绕实际工作负载构建，我们预计最近在基准测试得分上的改进将直接转化为开发者生产力的提高，表现为[减少构建等待时间](https://xkcd.com/303/)。许多这些改进已在 Node.js 中可用：在撰写本文时，Node 8 LTS 对应的 V8 版本为 v6.1，Node 9 对应的 V8 版本为 v6.2。

最新版本的基准测试托管在 [https://v8.github.io/web-tooling-benchmark/](https://v8.github.io/web-tooling-benchmark/)。
