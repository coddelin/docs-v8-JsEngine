---
title: "`globalThis`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-07-16
tags: 
  - ECMAScript
  - ES2020
  - Node.js 12
  - io19
description: "globalThis 引入了一种统一的机制，可以在任何 JavaScript 环境中访问全局 this，无论脚本目标如何。"
tweet: "1151140681374547969"
---
如果你之前为网页浏览器编写过 JavaScript，你可能用过 `window` 来访问全局 `this`。在 Node.js 中，你可能使用过 `global`。如果你编写的代码需要同时在这两种环境下运行，你可能会检测这些对象哪个可用，然后使用它——但是随着你想支持的环境和用例数量的增加，需要检查的标识符列表会迅速膨胀，事情变得复杂起来：

<!--truncate-->
```js
// 一种获取全局 `this` 的幼稚尝试。不要这样使用！
const getGlobalThis = () => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  // 注意：这可能仍然返回错误的结果！
  if (typeof this !== 'undefined') return this;
  throw new Error('无法定位全局 `this`');
};
const theGlobalThis = getGlobalThis();
```

关于为什么上述方法是不足的（以及更复杂的技术），可以阅读 [_一个恐怖的 `globalThis` polyfill 在通用 JavaScript 中_](https://mathiasbynens.be/notes/globalthis)。

[`globalThis` 提案](https://github.com/tc39/proposal-global) 引入了一种*统一的*机制，可以在任何 JavaScript 环境（浏览器、Node.js 或其他？）中访问全局 `this`，无论脚本目标是何（经典脚本还是模块？）。

```js
const theGlobalThis = globalThis;
```

注意，现代代码可能完全不需要访问全局 `this`。使用 JavaScript 模块，你可以声明式地 `import` 和 `export` 功能，而不是处理全局状态。`globalThis` 对于需要全局访问的 polyfill 和其他库仍然是有用的。

## `globalThis` 支持

<feature-support chrome="71 /blog/v8-release-71#javascript-language-features"
                 firefox="65"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-globalthis"></feature-support>
