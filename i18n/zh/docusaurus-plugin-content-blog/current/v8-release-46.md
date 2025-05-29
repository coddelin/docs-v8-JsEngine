---
title: 'V8版本发布v4.6'
author: 'V8团队'
date: 2015-08-28 13:33:37
tags:
  - 发布
description: 'V8 v4.6带来了减少卡顿和支持新的ES2015语言特性。'
---
大约每六周，我们会创建一个新的V8分支作为我们[发布流程](https://v8.dev/docs/release-process)的一部分。每个版本是在Chrome为Beta里程碑分支之前，直接从V8的Git主分支分支出来的。今天我们很高兴宣布我们的最新分支，[V8版本4.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.6)，它将在Chrome 46稳定版发布之前处于Beta版本阶段。V8 4.6包含各种面向开发者的实用功能，因此我们想提前向你介绍一些亮点，以期待未来几周的发布。

<!--truncate-->
## 改进的ECMAScript 2015 (ES6)支持

V8 v4.6新增了几个[ECMAScript 2015 (ES6)](https://www.ecma-international.org/ecma-262/6.0/)特性。

### 扩展运算符

[扩展运算符](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator)使操作数组变得更加方便。例如，当你仅需要合并数组时，它使得命令式代码变得多余。

```js
// 合并数组
// 不使用扩展运算符的代码
const inner = [3, 4];
const merged = [0, 1, 2].concat(inner, [5]);

// 使用扩展运算符的代码
const inner = [3, 4];
const merged = [0, 1, 2, ...inner, 5];
```

使用扩展运算符替换`apply`也是一个好方法：

```js
// 参数存储在数组中
// 不使用扩展运算符的代码
function myFunction(a, b, c) {
  console.log(a);
  console.log(b);
  console.log(c);
}
const argsInArray = ['Hi ', 'Spread ', 'operator!'];
myFunction.apply(null, argsInArray);

// 使用扩展运算符的代码
function myFunction (a,b,c) {
  console.log(a);
  console.log(b);
  console.log(c);
}

const argsInArray = ['Hi ', 'Spread ', 'operator!'];
myFunction(...argsInArray);
```

### `new.target`

[`new.target`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new.target)是ES6的功能之一，旨在改善类的使用。在底层，它实际上是每个函数的一个隐式参数。如果函数是使用关键字new调用的，那么这个参数持有对调用函数的引用。如果没有使用new，则参数为undefined。

实际上，这意味着你可以使用new.target来判断一个函数是正常调用还是通过new关键字构造调用。

```js
function myFunction() {
  if (new.target === undefined) {
    throw '试试用new调用它。';
  }
  console.log('成功！');
}

// 错误：
myFunction();

// 正确：
const a = new myFunction();
```

当使用ES6类和继承时，在超类的构造函数内部，new.target绑定到通过new调用的派生类构造函数。特别是，这使得超类在构造期间可以访问派生类的prototype。

## 减少卡顿

[卡顿](https://en.wiktionary.org/wiki/jank#Noun)可能很难忍受，尤其是在玩游戏时。通常，当游戏有多个玩家时，情况会更糟。[oortonline.gl](http://oortonline.gl/)是一个WebGL基准测试工具，通过渲染一个复杂的3D场景，包含粒子效果和现代着色器渲染，测试当前浏览器的极限。V8团队开始了一项任务，旨在推动Chrome在这些环境下的性能极限。我们还没有完成，但努力已经产生了成果。Chrome 46在oortonline.gl性能方面显示出令人难以置信的进步，你可以亲自体验。

一些优化包括：

- [TypedArray性能改进](https://code.google.com/p/v8/issues/detail?id=3996)
    - TypedArray在渲染引擎如Turbulenz（oortonline.gl背后的引擎）中被大量使用。例如，引擎通常会在JavaScript中创建TypedArray（如Float32Array），并在应用转换后将其传递给WebGL。
    - 关键点是优化嵌入器（Blink）与V8之间的交互。
- [在从V8传递TypedArray和其他内存到Blink时的性能改进](https://code.google.com/p/chromium/issues/detail?id=515795)
    - 在作为单向通信的一部分传递给WebGL时，不需要为TypedArray创建额外的句柄（也由V8跟踪）。
    - 在达到外部（Blink）分配的内存限制时，我们现在启动增量垃圾回收，而非全量回收。
- [空闲垃圾回收调度](/blog/free-garbage-collection)
    - 垃圾回收操作在主线程的空闲时间调度，这样解锁了合成器，使渲染更流畅。
- [为垃圾收集堆的所有老年代启用了并发清除](https://code.google.com/p/chromium/issues/detail?id=507211)
    - 未使用的内存块的释放在额外的线程上并发进行，与主线程并行操作，这显著减少了主垃圾收集暂停时间。

好消息是，与 oortonline.gl 相关的所有更改都是一般改进，这可能会影响所有密集使用 WebGL 的应用程序用户。

## V8 API

请查看我们的[API 变更摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。在每次重大版本发布后，该文档会在几周内定期更新。

拥有[活跃 V8 checkout](https://v8.dev/docs/source-code#using-git)的开发者可以使用 `git checkout -b 4.6 -t branch-heads/4.6` 来试验 V8 v4.6 的新功能。或者，您可以[订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，然后很快就能亲自尝试新功能。
