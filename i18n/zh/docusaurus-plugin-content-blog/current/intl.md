---
title: '更快且功能更丰富的国际化 API'
author: '[சத்யா குணசேகரன் (Sathya Gunasekaran)](https://twitter.com/_gsathya)'
date: 2019-04-25 16:45:37
avatars:
  - 'sathya-gunasekaran'
tags:
  - ECMAScript
  - Intl
description: 'JavaScript 国际化 API 正在成长，其 V8 的实现变得更快了！'
tweet: '1121424877142122500'
---
[ECMAScript 国际化 API 规范](https://tc39.es/ecma402/) (ECMA-402，或 `Intl`) 提供了关键的区域特定功能，如日期格式化、数字格式化、复数形式选择和排序。Chrome V8 和 Google 国际化团队一直在合作，为 V8 的 ECMA-402 实现添加功能，同时清理技术债务并改善性能和与其他浏览器的互操作性。

<!--truncate-->
## 底层架构改进

最初，ECMA-402 规范主要使用 V8 的扩展功能以 JavaScript 实现，并位于 V8 代码库之外。使用外部扩展 API 意味着 V8 内部用于类型检查、外部 C++ 对象的生命周期管理和内部私有数据存储的多个 API 无法使用。为了提高启动性能，这一实现后来被移入 V8 代码库，以启用这些内建功能的[快照生成](/blog/custom-startup-snapshots)。

V8 使用带有自定义[形状（隐藏类）](https://mathiasbynens.be/notes/shapes-ics)的特殊 `JSObject` 来描述 ECMAScript 指定的内置 JavaScript 对象（如 `Promise`、`Map`、`Set` 等）。通过这种方法，V8 可以预分配所需的内部槽并生成快速访问，而不是一次添加一个属性，从而导致性能下降和更差的内存使用。

`Intl` 的实现没有按照这种架构建模，这是由于历史上的分离所致。因此，国际化规范中指定的所有内置 JavaScript 对象（如 `NumberFormat`、`DateTimeFormat`）都是通用的 `JSObject`，需要通过添加多个属性来改变它们的内部槽。

没有专用 `JSObject` 的另一后果是类型检查变得更加复杂。类型信息存储在私有符号下，并通过昂贵的属性访问在 JS 和 C++ 端进行类型检查，而不是只查看其形状。

### 现代化代码库

随着目前逐渐远离在 V8 中编写自托管内建函数，现在正是现代化 ECMA402 实现的好时机。

### 摆脱自托管的 JS

虽然自托管使代码简洁且易于阅读，但频繁使用慢速运行时调用来访问 ICU API 导致了性能问题。因此，为了减少此类运行时调用的数量，很多 ICU 功能被重复实现于 JavaScript 中。

通过在 C++ 中重写内建函数，现在访问 ICU API 更快了，因为没有运行时调用的额外开销。

### 改进 ICU

ICU 是一组 C/C++ 库，被包括所有主要 JavaScript 引擎在内的大量应用程序使用，用于提供 Unicode 和全球化支持。作为将 `Intl` 切换到 ICU 的 V8 实现的一部分，我们[发现](https://unicode-org.atlassian.net/browse/ICU-20140)了[许多](https://unicode-org.atlassian.net/browse/ICU-9562)[问题](https://unicode-org.atlassian.net/browse/ICU-20098)，并进行了修复。

在实现新提案（例如 [`Intl.RelativeTimeFormat`](/features/intl-relativetimeformat)、[`Intl.ListFormat`](/features/intl-listformat) 和 `Intl.Locale`）的过程中，我们通过[增加](https://unicode-org.atlassian.net/browse/ICU-13256)[多个](https://unicode-org.atlassian.net/browse/ICU-20121)[新 API](https://unicode-org.atlassian.net/browse/ICU-20342) 来扩展 ICU，以支持这些新的 ECMAScript 提案。

所有这些新增功能帮助其他 JavaScript 引擎更快地实现这些提案，将网络推向前进！例如，Firefox 正在基于我们的 ICU 工作实施多个新的 `Intl` API。

## 性能

由于这些工作，我们通过优化多个快速路径以及缓存各种 `Intl` 对象的初始化和 `Number.prototype`、`Date.prototype`、`String.prototype` 上的 `toLocaleString` 方法，提升了国际化 API 的性能。

例如，创建一个新的 `Intl.NumberFormat` 对象变得快了约 24 倍。

![[微基准测试](https://cs.chromium.org/chromium/src/v8/test/js-perf-test/Intl/constructor.js) 测试创建各种 `Intl` 对象的性能](/_img/intl/performance.svg)

请注意，为了更好的性能，建议显式创建 *并重复使用* `Intl.NumberFormat` 或 `Intl.DateTimeFormat` 或 `Intl.Collator` 对象，而不是调用像 `toLocaleString` 或 `localeCompare` 这样的方法。

## 新的 `Intl` 功能

所有这些工作为构建新功能提供了良好的基础，我们正在继续发布所有处于第3阶段的新国际化提案。

[`Intl.RelativeTimeFormat`](/features/intl-relativetimeformat) 已在 Chrome 71 中推出，[`Intl.ListFormat`](/features/intl-listformat) 已在 Chrome 72 中推出，[`Intl.Locale`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Locale) 已在 Chrome 74 中推出，[`Intl.DateTimeFormat` 的 `dateStyle` 和 `timeStyle` 选项](https://github.com/tc39/proposal-intl-datetime-style)以及[为 `Intl.DateTimeFormat` 添加 BigInt 支持](https://github.com/tc39/ecma402/pull/236)已在 Chrome 76 中推出。[`Intl.DateTimeFormat#formatRange`](https://github.com/tc39/proposal-intl-DateTimeFormat-formatRange)、[`Intl.Segmenter`](https://github.com/tc39/proposal-intl-segmenter/) 和 [为 `Intl.NumberFormat` 添加更多选项](https://github.com/tc39/proposal-unified-intl-numberformat/)目前正在 V8 中开发，我们希望尽快发布它们！

许多这些新的 API，以及其他正在研发中的功能，都是由于我们在标准化新特性方面的努力，以帮助开发人员进行国际化。[`Intl.DisplayNames`](https://github.com/tc39/proposal-intl-displaynames) 是一个第1阶段提案，允许用户本地化语言、地区或脚本显示名称的显示名称。[`Intl.DateTimeFormat#formatRange`](https://github.com/fabalbon/proposal-intl-DateTimeFormat-formatRange) 是一个第3阶段提案，规定一种能够以简洁和符合区域设置的方式格式化日期范围的方法。[统一的 `Intl.NumberFormat` API 提案](https://github.com/tc39/proposal-unified-intl-numberformat) 是一个第3阶段提案，通过支持测量单位、货币和符号显示策略以及科学和紧凑表示法来改进 `Intl.NumberFormat`。您也可以通过在 [其 GitHub 仓库](https://github.com/tc39/ecma402)上贡献来参与 ECMA-402 的未来发展。

## 结论

`Intl` 提供了一个功能丰富的 API，用于执行国际化所需的几项操作，将繁重的工作留给浏览器处理，无需通过网络传输过多的数据或代码。仔细思考这些 API 的正确使用可以使您的用户界面在不同区域设置中表现更好。由于 Google V8 和 i18n 团队与 TC39 及其 ECMA-402 子组的合作，您现在可以访问更多的功能、更好的性能，并期待随着时间的推移进一步改进。
