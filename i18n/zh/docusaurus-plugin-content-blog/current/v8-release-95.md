---
title: "V8 版本 v9.5 发布"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars:
 - "ingvar-stepanyan"
date: 2021-09-21
tags:
 - 发布
description: "V8 版本 v9.5 带来了更新的国际化 API 和 WebAssembly 异常处理支持。"
tweet: "1440296019623759872"
---
每四周我们会创建 V8 的一个新分支，作为我们[发布流程](https://v8.dev/docs/release-process)的一部分。每个版本都会在 Chrome Beta 里程碑之前从 V8 的 Git 主分支分叉出来。今天我们很高兴宣布我们的最新分支，[V8 版本 9.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.5)，它将进入 Beta 测试阶段，直到几周后与 Chrome 95 Stable 一起发布。V8 v9.5 带来了各类面向开发者的实用功能。这篇文章将预测一些亮点，期待正式发布。

<!--truncate-->
## JavaScript

### `Intl.DisplayNames` v2

在 v8.1 中，我们在 Chrome 81 中推出了 [`Intl.DisplayNames` API](https://v8.dev/features/intl-displaynames)，支持的类型包括“语言”、“地区”、“书写方式”和“货币”。在 v9.5 中，我们现在新增了两种支持类型：“日历”和“日期时间字段”。它们分别返回不同日历类型和日期时间字段的显示名称：

```js
const esCalendarNames = new Intl.DisplayNames(['es'], { type: 'calendar' });
const frDateTimeFieldNames = new Intl.DisplayNames(['fr'], { type: 'dateTimeField' });
esCalendarNames.of('roc');  // "calendario de la República de China"
frDateTimeFieldNames.of('month'); // "mois"
```

我们还通过新增 languageDisplay 选项增强了对语言类型的支持，该选项可以是“standard”或“dialect”（如果未指定，则默认为“dialect”）：

```js
const jaDialectLanguageNames = new Intl.DisplayNames(['ja'], { type: 'language' });
const jaStandardLanguageNames = new Intl.DisplayNames(['ja'], { type: 'language', languageDisplay: 'standard'});
jaDialectLanguageNames.of('en-US')  // "アメリカ英語"
jaDialectLanguageNames.of('en-AU')  // "オーストラリア英語"
jaDialectLanguageNames.of('en-GB')  // "イギリス英語"

jaStandardLanguageNames.of('en-US') // "英語 (アメリカ合衆国)"
jaStandardLanguageNames.of('en-AU') // "英語 (オーストラリア)"
jaStandardLanguageNames.of('en-GB') // "英語 (イギリス)"
```

### 扩展的 `timeZoneName` 选项

v9.5 中的 `Intl.DateTimeFormat` API 现在支持 `timeZoneName` 选项的四种新值：

- “shortGeneric” 输出短通用的非地点格式时区名称，例如“PT”、“ET”，不指示是否处于夏令时。
- “longGeneric” 输出长通用的非地点格式时区名称，例如“Pacific Time”、“Mountain Time”，不指示是否处于夏令时。
- “shortOffset” 输出短的本地化 GMT 格式时区名称，例如“GMT-8”。
- “longOffset” 输出长的本地化 GMT 格式时区名称，例如“GMT-0800”。

## WebAssembly

### 异常处理

V8 现在支持 [WebAssembly 异常处理 (Wasm EH)](https://github.com/WebAssembly/exception-handling/blob/master/proposals/exception-handling/Exceptions.md) 提案，这样使用兼容工具链编译的模块（例如 [Emscripten](https://emscripten.org/docs/porting/exceptions.html)）可以在 V8 中执行。该提案旨在相比之前使用 JavaScript 的解决方案降低开销。

例如，我们使用旧的和新的异常处理实现分别将 [Binaryen](https://github.com/WebAssembly/binaryen/) 优化器编译为 WebAssembly。

启用异常处理时，代码大小的增加幅度[从旧的基于 JavaScript 的异常处理的 43% 降至新的 Wasm EH 特性仅 9%](https://github.com/WebAssembly/exception-handling/issues/20#issuecomment-919716209)。

当我们在几个大型测试文件上运行 `wasm-opt.wasm -O3` 时，启用了 Wasm EH 的版本相比没有异常的基准没有性能损失，而基于 JavaScript 的版本则耗时多了约 30%。

但是，Binaryen 对异常检查的使用是稀疏的。在异常负载较重的工作中，性能差异预计会更大。

## V8 API

主要的 v8.h 头文件已经拆分为几个可以单独包含的部分。例如 `v8-isolate.h` 现在包含 `v8::Isolate` 类。声明方法传递 `v8::Local<T>` 的许多头文件现在可以导入 `v8-forward.h`，从而获得 `v8::Local` 和所有 V8 堆对象类型的定义。

请使用 `git log branch-heads/9.4..branch-heads/9.5 include/v8\*.h` 获取 API 更改列表。
