---
title: "V8版本9.3发布"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars:
 - "ingvar-stepanyan"
date: 2021-08-09
tags:
 - 发布
description: "V8版本9.3支持Object.hasOwn和Error原因，提升编译性能，并在Android上禁用不可信代码生成缓解措施。"
tweet: ""
---
每六周我们都会在[发布流程](https://v8.dev/docs/release-process)的一部分中创建一个新的V8分支。每个版本都是在Chrome Beta里程碑之前，从V8的主Git分支分支出来的。今天，我们很高兴宣布我们的最新分支，[V8版本9.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.3)，将在接下来的几周内与Chrome 93稳定版协调发布之前进行beta测试。V8 v9.3包含各种面向开发者的实用功能。这篇文章对于一些重点功能提供了预览，以期待即将的发布。

<!--truncate-->
## JavaScript

### Sparkplug批量编译

我们在v9.1中发布了超快的新中层JIT编译器[Sparkplug](https://v8.dev/blog/sparkplug)。出于安全考虑，V8对其生成的代码内存进行了[写保护](https://en.wikipedia.org/wiki/W%5EX)，在可写（编译期间）和可执行之间切换权限。这目前是通过调用`mprotect`实现的。然而，由于Sparkplug生成代码的速度非常快，为每个单独编译的函数调用`mprotect`的成本已成为编译时间的主要瓶颈。在V8 v9.3中，我们引入了Sparkplug的批量编译：而不是单独编译每个函数，我们改为批量编译多个函数。这通过每批只执行一次内存页权限切换来分摊成本。

批量编译在不降低JavaScript执行性能的情况下，最多可将整体编译时间（Ignition + Sparkplug）减少44%。如果仅考虑编译Sparkplug代码的成本，影响显然更大，例如在Win 10上的`docs_scrolling`基准测试（见下图）中减少82%。令人惊讶的是，批量编译提升的编译性能甚至超过了W^X的成本，因为将相似的操作合并处理通常对CPU更有利。下图显示了W^X对编译时间（Ignition + Sparkplug）的影响，以及批量编译如何有效地缓解这种开销。

![基准测试](/_img/v8-release-93/sparkplug.svg)

### `Object.hasOwn`

`Object.hasOwn`是`Object.prototype.hasOwnProperty.call`更容易使用的别名。

例如：

```javascript
Object.hasOwn({ prop: 42 }, 'prop')
// → true
```

有关稍微多一点（但并不多！）的详细信息，请查看我们的[功能说明](https://v8.dev/features/object-has-own)。

### Error原因

从v9.3开始，各种内置的`Error`构造函数扩展为可接受一个带有`cause`属性的选项包作为第二个参数。如果传递了这样的选项包，`cause`属性的值将作为该`Error`实例的自有属性安装。这为链式错误提供了一种标准化的方法。

例如：

```javascript
const parentError = new Error('parent');
const error = new Error('parent', { cause: parentError });
console.log(error.cause === parentError);
// → true
```

如往常一样，请参阅我们更深入的[功能说明](https://v8.dev/features/error-cause)。

## 禁用Android上的不可信代码缓解措施

三年前，我们推出了一系列[代码生成缓解措施](https://v8.dev/blog/spectre)，以抵御Spectre攻击。我们始终意识到这是一个临时的权宜之计，仅能部分防御[Spectre](https://spectreattack.com/spectre.pdf)攻击。唯一有效的保护方法是通过[站点隔离](https://blog.chromium.org/2021/03/mitigating-side-channel-attacks.html)隔离网站。站点隔离已经在桌面设备上的Chrome中启用了一段时间，但是由于资源限制，在Android上启用完整的站点隔离是一项更大的挑战。然而，从Chrome 92开始，[Android上的站点隔离](https://security.googleblog.com/2021/07/protecting-more-with-site-isolation.html)已在更多包含敏感数据的网站上启用。

因此，我们决定在Android上禁用V8的Spectre代码生成缓解措施。这些缓解措施比站点隔离效果较弱，并且带来了性能成本。禁用这些缓解措施使Android的表现与桌面平台一致；在这些平台上，相关缓解措施自V8 v7.0起已被关闭。通过禁用这些缓解措施，我们在Android上的基准性能测试中看到了显著的改进。

![性能提升](/_img/v8-release-93/code-mitigations.svg)

## V8 API

请使用`git log branch-heads/9.2..branch-heads/9.3 include/v8.h`获取API更改列表。
