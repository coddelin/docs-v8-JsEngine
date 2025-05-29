---
title: "V8发布版本v8.4"
author: "Camillo Bruni, 享受一些新鲜的布尔值"
avatars: 
 - "camillo-bruni"
date: 2020-06-30
tags: 
 - 发布
description: "V8 v8.4具有弱引用和改进的WebAssembly性能。"
tweet: "1277983235641761795"
---
每六周，我们会创建一个新的V8分支，作为我们的[发布流程](https://v8.dev/docs/release-process)的一部分。每个版本都是在Chrome Beta里程碑之前直接从V8的Git主分支分支出来的。今天，我们很高兴宣布我们的最新分支，[V8版本8.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.4)，它将与Chrome 84 Stable协调发布，在接下来的几周内处于Beta阶段。V8 v8.4充满了各种面向开发者的好东西。这篇文章将提供一些主要亮点的预览，为发布做准备。

<!--truncate-->
## WebAssembly

### 改进的启动时间

WebAssembly的基础编译器([Liftoff](https://v8.dev/blog/liftoff))现在支持[原子指令](https://github.com/WebAssembly/threads)和[批量内存操作](https://github.com/WebAssembly/bulk-memory-operations)。这意味着即使您使用这些较新的规范添加，也可以获得非常快的启动时间。

### 更好的调试

在持续改善WebAssembly调试体验的过程中，我们现在能够在您暂停执行或到达断点时检查任何活动的WebAssembly帧。
这通过重新使用[Liftoff](https://v8.dev/blog/liftoff)来进行调试实现的。在过去，所有具有断点或经过的代码都需要在WebAssembly解释器中执行，这会显著降低执行速度（通常是100倍左右）。使用Liftoff，您只会丧失大约三分之一的性能，但您可以随时通过所有代码并检查它。

### SIMD原始试验

SIMD提案允许WebAssembly利用常用的硬件向量指令来加速计算密集型工作负载。V8已经[支持](https://v8.dev/features/simd)了[WebAssembly SIMD提案](https://github.com/WebAssembly/simd)。要在Chrome中启用该功能，可以使用标志`chrome://flags/#enable-webassembly-simd`或注册[原始试验](https://developers.chrome.com/origintrials/#/view_trial/-4708513410415853567)。[原始试验](https://github.com/GoogleChrome/OriginTrials/blob/gh-pages/developer-guide.md)允许开发者在标准化之前试验某个功能，并提供有价值的反馈。一旦一个来源选择进入试验，用户将在试验期间启用该功能，而无需更新Chrome标志。

## JavaScript

### 弱引用和终结器

:::note
**警告！** 弱引用和终结器是高级功能！它们依赖于垃圾回收行为。垃圾回收是非确定性的，可能根本不会发生。
:::

JavaScript是一种支持垃圾回收的语言，这意味着当垃圾回收器运行时，程序不再可到达的对象所占用的内存可能会被自动回收。除了`WeakMap`和`WeakSet`中的引用外，JavaScript中的所有引用都是强引用并防止被引用的对象被垃圾回收。例如：

```js
const globalRef = {
  callback() { console.log('foo'); }
};
// 只要globalRef可以通过全局作用域访问，
// 它以及其callback属性中的函数都不会被回收。
```

JavaScript程序员现在可以通过`WeakRef`功能弱引用对象。通过弱引用的对象如果没有被强引用，也不会阻止其被垃圾回收。

```js
const globalWeakRef = new WeakRef({
  callback() { console.log('foo'); }
});

(async function() {
  globalWeakRef.deref().callback();
  // 打印“foo”到控制台。globalWeakRef在其创建后会保证在事件循环的第一轮中存活。

  await new Promise((resolve, reject) => {
    setTimeout(() => { resolve('foo'); }, 42);
  });
  // 等待事件循环的一轮。

  globalWeakRef.deref()?.callback();
  // globalWeakRef中的对象可能在第一轮事件循环之后被垃圾回收，
  // 因为它不再可以访问。
})();
```

与`WeakRef`功能配套的是`FinalizationRegistry`，它使程序员可以注册在对象被垃圾回收之后调用的回调。例如，下面的程序可能会在IIFE中不可达的对象被回收后打印`42`到控制台。

```js
const registry = new FinalizationRegistry((heldValue) => {
  console.log(heldValue);
});

(function () {
  const garbage = {};
  registry.register(garbage, 42);
  // 第二个参数是“被持有”的值，当第一个参数被垃圾回收时，
  // 它将被传递给终结器。
})();
```

终结者将在事件循环中运行，并且永远不会中断同步执行的 JavaScript。

这些是高级且强大的功能，如果幸运的话，您的程序可能用不到它们。请阅读我们的[说明文档](https://v8.dev/features/weak-references)以了解更多信息！

### 私有方法和访问器

私有字段在 v7.4 中发布，现在增加了对私有方法和访问器的支持。在语法上，私有方法和访问器的名称以 `#` 开始，就像私有字段一样。以下是语法的简要示例。

```js
class Component {
  #privateMethod() {
    console.log("我只能在 Component 内部调用！");
  }
  get #privateAccessor() { return 42; }
  set #privateAccessor(x) { }
}
```

私有方法和访问器拥有与私有字段相同的作用域规则和语义。请查看我们的[说明文档](https://v8.dev/features/class-fields)以了解更多信息。

感谢 [Igalia](https://twitter.com/igalia) 对此功能的贡献！

## V8 API

请使用 `git log branch-heads/8.3..branch-heads/8.4 include/v8.h` 获取 API 更改的列表。

拥有有效 V8 检出的开发者可以使用 `git checkout -b 8.4 -t branch-heads/8.4` 来试验 V8 v8.4 中的新功能。或者您可以[订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，并立即试用这些新功能。
