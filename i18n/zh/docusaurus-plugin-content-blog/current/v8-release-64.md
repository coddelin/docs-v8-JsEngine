---
title: "V8 发布 v6.4"
author: "V8 团队"
date: 2017-12-19 13:33:37
tags:
  - 发布
description: "V8 v6.4 包括性能改进、新的 JavaScript 语言特性等。"
tweet: "943057597481082880"
---
每六周，我们根据 [发布流程](/docs/release-process) 创建一个 V8 的新分支。每个版本会在 Chrome Beta 的里程碑前从 V8 的 Git 主分支分支。今天我们很高兴地宣布最新的分支，[V8 版本 6.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.4)，该版本将在 Beta 状态直至几周后与 Chrome 64 稳定版同步发布。V8 v6.4 提供了各种面向开发者的改进。本文是该版本发布前一些亮点的预览。

<!--truncate-->
## 性能

V8 v6.4 将 `instanceof` 运算符的性能 [提升了 3.6 倍](https://bugs.chromium.org/p/v8/issues/detail?id=6971)。直接结果是，根据 [V8 的 Web 工具基准测试](https://github.com/v8/web-tooling-benchmark)，[uglify-js](http://lisperator.net/uglifyjs/) 的速度提升了 15-20%。

此次发布还修复了 `Function.prototype.bind` 的一些性能瓶颈。例如，现在 TurboFan [始终内联](https://bugs.chromium.org/p/v8/issues/detail?id=6946) 所有单态的 `bind` 调用。此外，TurboFan 还支持绑定回调模式，这意味着你可以使用以下代码替代传统的写法：

```js
doSomething(callback, someObj);
```

你现在可以使用：

```js
doSomething(callback.bind(someObj));
```

这种方式代码更具可读性，同时仍然可以获得相同的性能。

多亏了 [Peter Wong](https://twitter.com/peterwmwong) 的最新贡献，[`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap) 和 [`WeakSet`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet) 现在使用 [CodeStubAssembler](/blog/csa) 实现，从而使性能提高了最多 5 倍。

![](/_img/v8-release-64/weak-collection.svg)

作为 V8 [持续努力](https://bugs.chromium.org/p/v8/issues/detail?id=1956) 改进数组内置函数性能的一部分，我们通过使用 CodeStubAssembler 重新实现 `Array.prototype.slice` 性能提高了约 4 倍。此外，`Array.prototype.map` 和 `Array.prototype.filter` 的调用在许多情况下现在都被内联，使它们的性能可以与手写版本竞争。

我们还优化了数组、类型化数组和字符串中的越界读取操作，[以避免约 10 倍的性能损失](https://bugs.chromium.org/p/v8/issues/detail?id=7027)，这是在[观察到此类模式](/blog/elements-kinds#avoid-reading-beyond-length)被广泛使用后进行的优化。

## 内存

V8 的内置代码对象和字节码处理器现在会从快照中懒加载反序列化，这可以显著减少每个 Isolate 消耗的内存。Chrome 的基准测试显示，在浏览常见网站时每个标签页的存储节省了几百 KB。

![](/_img/v8-release-64/codespace-consumption.svg)

明年初请期待关于此主题的专题博客文章。

## ECMAScript 语言特性

此次 V8 发布包含对两个令人兴奋的正则表达式新特性的支持。

对于带 `/u` 标志的正则表达式，[Unicode 属性转义](https://mathiasbynens.be/notes/es-unicode-property-escapes) 现在默认启用。

```js
const regexGreekSymbol = /\p{Script_Extensions=Greek}/u;
regexGreekSymbol.test('π');
// → true
```

正则表达式中对[命名捕获组](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features#named_captures) 的支持现在也是默认启用的。

```js
const pattern = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/u;
const result = pattern.exec('2017-12-15');
// result.groups.year === '2017'
// result.groups.month === '12'
// result.groups.day === '15'
```

了解更多关于这些功能的信息，请参阅我们的博客文章 [即将推出的正则表达式功能](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features)。

感谢 [Groupon](https://twitter.com/GrouponEng)，V8 现在实现了 [`import.meta`](https://github.com/tc39/proposal-import-meta)，允许嵌入器公开与当前模块相关的主机特定元数据。例如，Chrome 64 通过 `import.meta.url` 暴露模块 URL，并计划未来为 `import.meta` 添加更多属性。

为了协助使用国际化格式器生成的字符串的本地感知格式化，开发者现在可以使用 [`Intl.NumberFormat.prototype.formatToParts()`](https://github.com/tc39/proposal-intl-formatToParts) 将数字格式化为一系列标记及其类型。感谢 [Igalia](https://twitter.com/igalia) 在 V8 中实现了这一功能！

## V8 API

请使用 `git log branch-heads/6.3..branch-heads/6.4 include/v8.h` 来获取API更改的列表。

拥有[有效V8检出](/docs/source-code#using-git)的开发者可以使用 `git checkout -b 6.4 -t branch-heads/6.4` 来试验 V8 v6.4 中的新功能。或者，您可以[订阅Chrome的Beta频道](https://www.google.com/chrome/browser/beta.html)，并很快自己尝试这些新功能。
