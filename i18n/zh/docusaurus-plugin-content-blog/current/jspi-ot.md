---
title: "WebAssembly JSPI 即将进入原始试验"
description: "我们将解释 JSPI 原始试验的开始"
author: "Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl"
date: 2024-03-06
tags:
  - WebAssembly
---
WebAssembly 的 JavaScript Promise 集成 (JSPI) API 正在随着 Chrome M123 版本进入原始试验阶段。这意味着您可以测试您和您的用户是否能够从这个新 API 中受益。

JSPI 是一个 API，允许所谓的顺序代码（已编译为 WebAssembly）访问 _异步_ 的 Web API。许多 Web API 是以 JavaScript 的 `Promise` 表达的：它们不是立即执行请求的操作，而是返回一个 `Promise` 来执行。当操作最终执行时，浏览器的任务运行器会用 Promise 调用任何回调。JSPI 接入这个架构，使 WebAssembly 应用程序在返回 `Promise` 时暂停，并在 `Promise` 被解析时恢复运行。

<!--truncate-->
您可以在[这里](https://v8.dev/blog/jspi)找到有关 JSPI 的更多信息以及使用方法，规范本身在[这里](https://github.com/WebAssembly/js-promise-integration)。

## 要求

除了注册原始试验，您还需要生成适当的 WebAssembly 和 JavaScript。如果您正在使用 Emscripten，这将非常简单。您需要确保使用最低版本为 3.1.47。

## 注册原始试验

JSPI 仍处于预发布阶段；它正在经历标准化过程，直到完成该过程的第 4 阶段之前，不会完全发布。要在今天使用它，您可以在 Chrome 浏览器中设置一个标志；或者，您可以申请一个原始试验令牌，使您的用户无需自己设置标志即可访问它。

要注册，您可以点击[这里](https://developer.chrome.com/origintrials/#/register_trial/1603844417297317889)，务必按照注册流程完成注册。要了解更多关于原始试验的一般信息，[此处](https://developer.chrome.com/docs/web-platform/origin-trials)是一个很好的起点。

## 一些潜在的注意事项

WebAssembly 社区对 JSPI API 的某些方面进行了[讨论](https://github.com/WebAssembly/js-promise-integration/issues)。因此，有一些变更已被指出，这些变更需要时间才能完全通过系统实施。我们预计这些更改将以*软启动*方式推出：我们将在更改可用时分享它们，但现有 API 将至少维护到原始试验结束。

此外，还存在某些在原始试验期间可能无法完全解决的已知问题：

对于密集创建派生计算的应用程序，包装的序列（即使用 JSPI 访问异步 API）的性能可能会受到影响。这是因为在创建包装调用时使用的资源在调用之间不会被缓存；我们依赖垃圾回收来清除创建的堆栈。
我们当前为每个包装调用分配了一个固定大小的堆栈。为了适应复杂的应用程序，这个堆栈是必要的大。但这也意味着在大量简单的包装调用“正在进行”时，应用程序可能会遇到内存压力。

这些问题都不太可能阻碍对 JSPI 的实验；我们预计它们将在 JSPI 正式发布之前被解决。

## 反馈

由于 JSPI 是一个标准化跟踪中的工作，我们更倾向于在[这里](https://github.com/WebAssembly/js-promise-integration/issues)分享任何问题和反馈。不过，也可以在标准 Chrome 错误报告[网站](https://issues.chromium.org/new)提交错误报告。如果您怀疑代码生成有问题，可以使用[此处](https://github.com/emscripten-core/emscripten/issues)报告问题。

最后，我们希望听到您发现的任何好处。请使用[问题追踪器](https://github.com/WebAssembly/js-promise-integration/issues)分享您的经验。
