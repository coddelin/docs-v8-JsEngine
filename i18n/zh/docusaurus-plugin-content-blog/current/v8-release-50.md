---
title: "V8 发布 v5.0"
author: "V8 团队"
date: 2016-03-15 13:33:37
tags:
  - 发布
description: "V8 v5.0 带来了性能改善，并新增了对多个 ES2015 语言特性的支持。"
---
V8 [发布流程](/docs/release-process) 的第一步是在 Chrome Beta 里程碑分支之前从 Git 主分支创建一个新分支（大约每六周一次）。我们最新的发布分支是 [V8 v5.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.0)，它将在我们与 Chrome 50 Stable 一起发布稳定版本之前保持测试版状态。以下是这个版本中面向开发者的新功能亮点。

<!--truncate-->
:::note
**注意:** 版本号 5.0 不具有语义上的重要意义，也不标志着一个主要版本（与次要版本相对）。
:::

## 改进的 ECMAScript 2015 (ES6) 支持

V8 v5.0 包含一些与正则表达式（regex）匹配相关的 ES2015 特性。

### RegExp Unicode 标志

[RegExp Unicode 标志](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Parameters)，`u`，开启正则表达式匹配的新 Unicode 模式。Unicode 标志将模式和正则表达式字符串视为 Unicode 码点序列，并引入了新的 Unicode 码点转义语法。

```js
/😊{2}/.test('😊😊');
// false

/😊{2}/u.test('😊😊');
// true

/\u{76}\u{38}/u.test('v8');
// true

/\u{1F60A}/u.test('😊');
// true
```

`u` 标志还使得 `.` 原子（也称为单字符匹配器）匹配任何 Unicode 符号，而不仅仅是基本多语言平面（BMP）中的字符。

```js
const string = 'the 🅛 train';

/the\s.\strain/.test(string);
// false

/the\s.\strain/u.test(string);
// true
```

### RegExp 自定义钩子

ES2015 提供了 RegExp 子类可以更改匹配语义的钩子。子类可以重写名为 `Symbol.match`、`Symbol.replace`、`Symbol.search` 和 `Symbol.split` 的方法，以改变 RegExp 子类在 `String.prototype.match` 等方法中的行为。

## ES2015 和 ES5 功能的性能改进

版本 5.0 还为已经实现的 ES2015 和 ES5 特性带来了一些显著的性能改进。

剩余参数的实现比前一个版本快 8-10 倍，使得在函数调用之后将大量参数收集到一个数组中更加高效。`Object.keys` 用于按 `for`-`in` 返回的顺序迭代对象的可枚举属性，现在快了大约 2 倍。

## V8 API

请查阅我们的 [API 更改摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。该文档会在每次主要版本发布后几周内定期更新。

开发者可以使用 [活跃的 V8 checkout](https://v8.dev/docs/source-code#using-git) 执行 `git checkout -b 5.0 -t branch-heads/5.0` 来体验 V8 5.0 中的新特性。或者可以 [订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，自己尽快试用这些新功能。
