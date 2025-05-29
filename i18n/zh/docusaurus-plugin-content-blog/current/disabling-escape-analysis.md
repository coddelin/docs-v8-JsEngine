---
title: '暂时禁用逃逸分析'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias)), 沙盒逃逸分析员'
avatars:
  - 'mathias-bynens'
date: 2017-09-22 13:33:37
tags:
  - 安全
description: '我们已在 Chrome 61 中禁用 V8 的逃逸分析，以保护用户免受安全漏洞的影响。'
tweet: '911339802884284416'
---
在 JavaScript 中，一个分配的对象如果从当前函数外部可以访问，就被称为 _逃逸_。通常情况下，V8 会在 JavaScript 堆中分配新对象，但通过 _逃逸分析_，优化编译器可以确定一个对象是否可以特殊处理，因为其生命周期被证明仅限于函数的激活状态。当对新分配对象的引用不会逃逸创建它的函数时，JavaScript 引擎不需要显式地在堆中分配该对象。相反，它们可以有效地将对象的值视为函数的局部变量。这反过来又启用了各种优化，如将这些值存储在堆栈或寄存器中，或者在某些情况下完全优化掉这些值。逃逸的对象（更准确地说，不能证明其不会逃逸的对象）必须在堆中分配。

<!--truncate-->
例如，逃逸分析使 V8 能够有效地重写以下代码：

```js
function foo(a, b) {
  const object = { a, b };
  return object.a + object.b;
  // 注意：`object` 没有逃逸。
}
```

…为以下代码，这使得多个底层优化成为可能：

```js
function foo(a, b) {
  const object_a = a;
  const object_b = b;
  return object_a + object_b;
}
```

V8 v6.1 及更早版本使用了一种复杂的逃逸分析实现，自引入以来生成了许多错误。此实现现已被移除，并且一个全新的逃逸分析代码库在 [V8 v6.2](/blog/v8-release-62) 中可用。

然而，已发现并向我们负责披露了一个 [Chrome 安全漏洞](https://chromereleases.googleblog.com/2017/09/stable-channel-update-for-desktop_21.html)，此漏洞涉及 V8 v6.1 中旧的逃逸分析实现。为了保护我们的用户，我们已在 Chrome 61 中关闭了逃逸分析。Node.js 不会受到影响，因为此漏洞依赖于执行不可信的 JavaScript。

关闭逃逸分析会对性能产生负面影响，因为它禁用了上述优化。具体而言，以下 ES2015 功能可能会出现短期性能下降：

- 解构赋值
- `for`-`of` 迭代
- 数组展开运算符
- 剩余参数

请注意，禁用逃逸分析只是临时措施。在 Chrome 62 中，我们将发布 V8 v6.2 中的全新实现的逃逸分析功能，并且最重要的是，该功能已启用。
