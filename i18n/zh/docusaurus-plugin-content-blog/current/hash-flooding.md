---
title: '关于 Node.js 中的哈希泛滥漏洞…'
author: '杨国 ([@hashseed](https://twitter.com/hashseed))'
avatars:
  - 'yang-guo'
date: 2017-08-11 13:33:37
tags:
  - 安全
description: 'Node.js 曾受到一次哈希泛滥漏洞的影响。这篇文章提供了一些背景，并解释了 V8 的解决方案。'
---
今年七月初，Node.js 为所有当前维护的分支发布了一个[安全更新](https://nodejs.org/en/blog/vulnerability/july-2017-security-releases/)，以解决哈希泛滥漏洞问题。这次中间修复以显著启动性能回退为代价。同时，V8 已经实现了一个解决方案，从而避免了性能下降。

<!--truncate-->
在这篇文章中，我们想要介绍一些关于漏洞和最终解决方案的背景和历史。

## 哈希泛滥攻击

哈希表是计算机科学中最重要的数据结构之一。它们在 V8 中被广泛使用，例如用来存储对象的属性。平均而言，插入一个新条目的效率非常高，为[𝒪(1)](https://en.wikipedia.org/wiki/Big_O_notation)。但是，哈希冲突可能会导致最糟糕的情况为 𝒪(n)。这意味着插入 n 个条目可能需要耗费 𝒪(n²) 的时间。

在 Node.js 中，[HTTP 头](https://nodejs.org/api/http.html#http_response_getheaders)被表示为 JavaScript 对象。头名称和值的对被存储为对象属性。通过精心准备的 HTTP 请求，攻击者可以发动拒绝服务攻击。一个 Node.js 进程会因为忙于最糟糕情况下的哈希表插入操作而变得无响应。

这种攻击早在[2011 年 12 月](https://events.ccc.de/congress/2011/Fahrplan/events/4680.en.html)就已被披露，并被证明会影响许多编程语言。那么为什么 V8 和 Node.js 花了这么长时间才解决这个问题？

实际上，在漏洞披露后不久，V8 的工程师就与 Node.js 社区合作开发了一个[缓解措施](https://github.com/v8/v8/commit/81a0271004833249b4fe58f7d64ae07e79cffe40)。自 Node.js v0.11.8 起，这个问题就被解决了。这个修复引入了所谓的_哈希种子值_。哈希种子在启动时随机生成，并用于为特定 V8 实例中的每个哈希值播种。如果不了解哈希种子，攻击者很难触发最坏情况，更不用说针对所有 Node.js 实例进行攻击。

以下是修复[提交](https://github.com/v8/v8/commit/81a0271004833249b4fe58f7d64ae07e79cffe40)消息的一部分：

> 这个版本仅解决了那些自己编译 V8 或不使用快照的用户的问题。基于快照的预编译 V8 仍将具有可预测的字符串哈希值。

这个版本仅解决了那些自己编译 V8 或不使用快照的用户的问题。基于快照的预编译 V8 仍将具有可预测的字符串哈希值。

## 启动快照

启动快照是 V8 中的一种机制，用于显著加速引擎启动和创建新上下文（例如通过 Node.js 中的[vm 模块](https://nodejs.org/api/vm.html)）。V8 会从现有快照反序列化，而不是从头开始设置初始对象和内部数据结构。一个包含快照的最新 V8 构建可以在不到 3 毫秒内启动，并且只需不到一毫秒即可创建一个新上下文。而没有快照的情况下，启动需要超过 200 毫秒，创建新上下文需要超过 10 毫秒。这是数量级上的差异。

我们在[之前的文章](/blog/custom-startup-snapshots)中介绍过任何 V8 嵌入者都可以如何利用启动快照。

一个预建的快照包含哈希表和其他基于哈希值的数据结构。一旦从快照初始化后，哈希种子就不能更改，否则这些数据结构会被破坏。一个包含快照的 Node.js 版本会使用固定的哈希种子，从而使缓解失效。

这就是提交消息中明确警告的内容。

## 几乎解决但并不完全

时间快进到 2015 年，Node.js 的一个[问题](https://github.com/nodejs/node/issues/1631)报告称创建新上下文的性能已回退。不出意外，这是因为缓解措施禁用了启动快照。但在当时，并非参与讨论的每个人都知道[原因](https://github.com/nodejs/node/issues/528#issuecomment-71009086)。

正如这篇[文章](/blog/math-random)所解释的，V8 使用伪随机数生成器来生成 Math.random 的结果。每个 V8 上下文都有自己的一份随机数生成状态。这是为了防止 Math.random 的结果在不同上下文中是可预测的。

上下文创建后，随机数生成器的状态会从外部来源进行种子初始化。无论上下文是从零开始创建还是从快照反序列化创建都无关紧要。

随机数生成器的状态不知为何被[混淆](https://github.com/nodejs/node/issues/1631#issuecomment-100044148)成了哈希种子。因此，从 [io.js v2.0.2](https://github.com/nodejs/node/pull/1679) 开始，一个预构建的快照成为官方版本的一部分。

## 第二次尝试

直到2017年5月，在V8、[Google的项目零](https://googleprojectzero.blogspot.com/) 和 Google云平台之间的一些内部讨论中，我们才意识到Node.js仍然容易受哈希泛洪攻击。

初步响应来自于 [Ali](https://twitter.com/ofrobots) 和 [Myles](https://twitter.com/MylesBorins)，他们是 [Google Cloud Platform Node.js产品](https://cloud.google.com/nodejs/) 背后的团队成员。他们与Node.js社区合作，[默认禁用启动快照](https://github.com/nodejs/node/commit/eff636d8eb7b009c40fb053802c169ba1417293d)。这次还新增了一个[测试用例](https://github.com/nodejs/node/commit/9fedc1f09648ff7cebed65883966f5647686a38a)。

但是我们并不想仅仅停留在这里。禁用启动快照对性能有[显著](https://github.com/nodejs/node/issues/14229)影响。多年来，我们在V8中加入了许多新的[语言](/blog/high-performance-es2015) [特性](/blog/webassembly-browser-preview) 和 [复杂的](/blog/launching-ignition-and-turbofan) [优化](/blog/speeding-up-regular-expressions)。其中一些新增内容使从零启动更加昂贵。在安全发布之后，我们立即着手开发一个长期解决方案。目标是能够[重新启用启动快照](https://github.com/nodejs/node/issues/14171)而不会再次变得容易受到哈希泛洪攻击。

从[提议的解决方案](https://docs.google.com/document/d/1br7T3jk5JAJSYaT8eZdQlqrPTDRClheGpRU1-BpY1ss/edit)中，我们选择并实现了最务实的一种解决方案。在从快照反序列化之后，我们会选择一个新的哈希种子。之后会重新哈希受影响的数据结构以确保一致性。

事实证明，在一个普通的启动快照中，实际上只有少数数据结构受到影响。令我们欣喜的是，[重新哈希哈希表](https://github.com/v8/v8/commit/0e8e0030775518b69eb8522823ea3754e6bddc69)在V8中已经变得简单易行。添加的额外开销微乎其微。

重新启用启动快照的补丁已经[合并](https://github.com/nodejs/node/commit/2ae2874ae7dfec2c55b5d390d25b6eed9932f78d)[到](https://github.com/nodejs/node/commit/14e4254f68f71a6afaf3ebe16794172b08e68d7b) Node.js。它是最近Node.js v8.3.0 [发布](https://medium.com/the-node-js-collection/node-js-8-3-0-is-now-available-shipping-with-the-ignition-turbofan-execution-pipeline-aa5875ad3367)的一部分。
