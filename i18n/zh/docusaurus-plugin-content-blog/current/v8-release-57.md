---
title: "V8版本 v5.7"
author: "V8团队"
date: 2017-02-06 13:33:37
tags:
  - 发布
description: "V8 v5.7默认启用WebAssembly，并包含性能改进及对ECMAScript语言功能的支持增加。"
---
每隔六周，我们会根据我们的[发布流程](/docs/release-process)创建一个新的V8分支。每个版本都会在Chrome测试版里程碑前从V8的Git主线中分支出来。今天我们很高兴宣布最新的分支，[V8版本 5.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.7)，该版本将在测试版中运行，直到几周后与Chrome 57稳定版同步发布。V8 5.7充满了各种面向开发者的新功能。我们希望在发布之前让大家先一睹其中的一些亮点。

<!--truncate-->
## 性能改进

### 原生异步函数的性能与Promise相当

异步函数现在的运行性能已大致与使用Promise编写的同类代码相当。根据我们的[微基准测试](https://codereview.chromium.org/2577393002)，异步函数的执行性能提升了四倍。同时，Promise的整体性能也提高了两倍。

![异步性能在Linux x64下的改进](/_img/v8-release-57/async.png)

### 持续改进ES2015

V8继续优化ES2015语言功能的性能，使开发者使用新功能不会带来性能成本。扩展运算符、解构赋值和生成器现已[与其简单的ES5等效项性能大致相当](https://fhinkel.github.io/six-speed/)。

### 正则表达式性能提升15%

将正则表达式功能从一个自托管的JavaScript实现迁移到集成TurboFan的代码生成架构，使整体正则表达式性能提高了约15%。更多细节可以在[专门的博客帖子](/blog/speeding-up-regular-expressions)中找到。

## JavaScript语言功能

本次发布包括了ECMAScript标准库的几个最新添加功能。两个String方法，[`padStart`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart) 和 [`padEnd`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd)，提供了有用的字符串格式化功能，而 [`Intl.DateTimeFormat.prototype.formatToParts`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat/formatToParts)让开发者能够以符合地区设置的方式自定义日期/时间格式。

## WebAssembly默认启用

Chrome 57（包含V8 v5.7）将是第一个默认启用WebAssembly的版本。更多详情请参阅[webassembly.org](http://webassembly.org/)上的入门文档以及[MDN](https://developer.mozilla.org/en-US/docs/WebAssembly/API)上的API文档。

## V8 API 新增功能

请查看我们的[API更改摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。此文档通常在每次主要版本发布后几周内定期更新。拥有[活跃V8检出](/docs/source-code#using-git)的开发者可以使用 `git checkout -b 5.7 -t branch-heads/5.7` 来尝试V8 v5.7的新功能。也可以[订阅Chrome的测试渠道](https://www.google.com/chrome/browser/beta.html)，很快自己试用新功能。

### `PromiseHook`

这个C++ API允许用户实现通过Promise生命周期的追踪代码。这使得Node即将推出的[AsyncHook API](https://github.com/nodejs/node-eps/pull/18)得以实现，并支持构建[异步上下文传播](https://docs.google.com/document/d/1tlQ0R6wQFGqCS5KeIw0ddoLbaSYx6aU7vyXOkv-wvlM/edit#)。

`PromiseHook` API 提供了四个生命周期钩子：init、resolve、before和after。init钩子在新Promise创建时运行；resolve钩子在Promise被解析时运行；pre和post钩子分别在[`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob)之前和之后运行。更多信息请查看[跟踪问题](https://bugs.chromium.org/p/v8/issues/detail?id=4643)和[设计文档](https://docs.google.com/document/d/1rda3yKGHimKIhg5YeoAmCOtyURgsbTH_qaYR79FELlk/edit)。
