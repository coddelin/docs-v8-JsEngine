---
title: 'V8 发布 v5.1'
author: 'V8 团队'
date: 2016-04-23 13:33:37
tags:
  - 发布
description: 'V8 v5.1 带来了性能改进、降低卡顿和内存消耗，以及对 ECMAScript 语言功能的支持增强。'
---
V8 [发布流程](/docs/release-process) 的第一步是在 Chromium 分支出 Chrome Beta 里程碑之前（大约每六周一次）从 Git 主分支创建一个新分支。我们最新的发布分支是 [V8 v5.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.1)，它将在 beta 版中保持一段时间，直到与 Chrome 51 稳定版一起发布一个稳定版本。以下是这个 V8 版本中的新开发者功能亮点。

<!--truncate-->
## 改进的 ECMAScript 支持

V8 v5.1 包含了一些针对符合 ES2017 草案规范的改动。

### `Symbol.species`

诸如 `Array.prototype.map` 的数组方法会使用子类实例作为其输出，可以选择通过更改 [`Symbol.species`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/species) 来定制此行为。类似的改动也应用于其他内置类。

### `instanceof` 定制

构造函数可以实现自己的 [`Symbol.hasInstance`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Other_symbols) 方法，以覆盖默认行为。

### 迭代器关闭

在 [`for`-`of`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of) 循环（或其他内置迭代，如 [扩展](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator)操作符）中创建的迭代器现在会检查关闭方法，当循环提前终止时将调用该方法。这可以在迭代完成后用于清理。

### RegExp 子类化 `exec` 方法

RegExp 子类可以覆盖 `exec` 方法，以更改核心匹配算法，并保证它被高层函数如 `String.prototype.replace` 调用。

### 函数名称推断

现在为函数表达式推断的函数名称通常会在函数的 [`name`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name) 属性中提供，遵循 ES2015 正式化的规则。这可能会改变现有的堆栈跟踪，并提供与之前 V8 版本不同的名称。这还为具有计算属性名的属性和方法提供了有用的名称：

```js
class Container {
  ...
  [Symbol.iterator]() { ... }
  ...
}
const c = new Container;
console.log(c[Symbol.iterator].name);
// → '[Symbol.iterator]'
```

### `Array.prototype.values`

类似于其他集合类型，`Array` 上的 [`values`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/values) 方法返回一个数组内容的迭代器。

## 性能改进

V8 v5.1 还针对以下 JavaScript 功能带来了显著的性能改进：

- 执行如 `for`-`in` 的循环
- `Object.assign`
- Promise 和 RegExp 实例化
- 调用 `Object.prototype.hasOwnProperty`
- `Math.floor`, `Math.round` 和 `Math.ceil`
- `Array.prototype.push`
- `Object.keys`
- `Array.prototype.join` 和 `Array.prototype.toString`
- 展平重复字符串，例如 `'.'.repeat(1000)`

## WebAssembly (Wasm)

V8 v5.1 初步支持 [WebAssembly](/blog/webassembly-experimental)。你可以在 `d8` 中通过 `--expose_wasm` 标志启用它。或者你可以使用 Chrome 51（Beta 频道）试用 [Wasm 演示](https://webassembly.github.io/demo/)。

## 内存

V8 实现了更多的 [Orinoco](/blog/orinoco) 片段：

- 并行年轻代撤离
- 可扩展记忆集合
- 黑色分配

这样减少了卡顿并在需要时降低内存消耗。

## V8 API

请查看我们的 [API更改总结](https://bit.ly/v8-api-changes)。此文档在每次主要发布几周后会定期更新。

拥有 [活动的 V8 检出](https://v8.dev/docs/source-code#using-git) 的开发者可以使用 `git checkout -b 5.1 -t branch-heads/5.1` 来尝试 V8 v5.1 的新功能。或者，你也可以 [订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，尽快亲自试用这些新功能。
