---
title: "V8发布版本6.0"
author: "V8团队"
date: 2017-06-09 13:33:37
tags:
  - 发布
description: "V8版本6.0带来了多个性能改进，并引入了对`SharedArrayBuffer`和对象剩余/展开属性的支持。"
---
每六周，我们会按照[发布流程](/docs/release-process)创建一个新的V8分支。每个版本都是在Chrome Beta里程碑之前从V8的Git主分支分出去的。今天，我们很高兴地宣布最新分支[V8版本6.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.0)，它将处于测试阶段，直到几周后与Chrome 60稳定版协调发布。V8 6.0中充满了各种面向开发者的特性。我们希望提前展示一些亮点，以期为发布做好准备。

<!--truncate-->
## `SharedArrayBuffer`

V8版本6.0引入了对[`SharedArrayBuffer`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)的支持，这是一种低级机制，用于在JavaScript工作线程之间共享内存并同步工作流。SharedArrayBuffer为JavaScript提供共享内存、原子操作和futex支持。它还解锁了通过asm.js或WebAssembly将多线程应用程序移植到Web的可能性。

相关的简介教程请参阅规范中的[教程页面](https://github.com/tc39/ecmascript_sharedmem/blob/master/TUTORIAL.md)，或参考[Emscripten的文档](https://kripken.github.io/emscripten-site/docs/porting/pthreads.html)以进行pthread移植。

## 对象剩余/展开属性

本次发布为对象解构赋值引入了剩余属性，为对象字面量引入了展开属性。对象剩余/展开属性是第3阶段的ES.next特性。

展开属性在许多情况下提供了`Object.assign()`的简洁替代。

```js
// 对象解构赋值的剩余属性:
const person = {
  firstName: 'Sebastian',
  lastName: 'Markbåge',
  country: '美国',
  state: '加州',
};
const { firstName, lastName, ...rest } = person;
console.log(firstName); // Sebastian
console.log(lastName); // Markbåge
console.log(rest); // { country: '美国', state: '加州' }

// 对象字面量的展开属性:
const personCopy = { firstName, lastName, ...rest };
console.log(personCopy);
// { firstName: 'Sebastian', lastName: 'Markbåge', country: '美国', state: '加州' }
```

更多信息，请参阅[我们关于对象剩余和展开属性的说明](/features/object-rest-spread)。

## ES2015性能

V8版本6.0继续提升ES2015特性的性能。本次版本对语言特性实现进行了优化，总体上使V8的[ARES-6](http://browserbench.org/ARES-6/)评分提高了约10%。

## V8 API

请查看我们[API更改概要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。该文档会在每次重大发布后几周进行定期更新。

开发者可以拥有一个[活动的V8签出](/docs/source-code#using-git)，通过`git checkout -b 6.0 -t branch-heads/6.0`试验V8 6.0中的新功能。或者您可以[订阅Chrome的Beta频道](https://www.google.com/chrome/browser/beta.html)，自己尽早体验这些新特性。
