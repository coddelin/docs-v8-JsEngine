---
title: "从JS到DOM再回溯的跟踪"
author: "Ulan Degenbaev、Alexei Filippov、Michael Lippautz 和 Hannes Payer——DOM 小组"
avatars: 
  - "ulan-degenbaev"
  - "michael-lippautz"
  - "hannes-payer"
date: "2018-03-01 13:33:37"
tags: 
  - 内部原理
  - 内存
description: "Chrome 的开发者工具现在可以跟踪和快照C++ DOM对象，并显示从JavaScript可达的所有DOM对象及其引用。"
tweet: "969184997545562112"
---
在Chrome 66中调试内存泄漏变得更加容易了。Chrome的开发者工具现在可以跟踪和快照C++ DOM对象，并显示从JavaScript可达的所有DOM对象及其引用。这项功能是V8垃圾回收器的新C++跟踪机制的优点之一。

<!--truncate-->
## 背景

在垃圾回收系统中，内存泄漏发生于由于其他对象的无意引用未释放的未使用对象。网页中的内存泄漏通常涉及JavaScript对象和DOM元素之间的交互。

以下[示例](https://ulan.github.io/misc/leak.html)显示了当程序员忘记注销事件侦听器时发生的内存泄漏。事件侦听器引用的所有对象都不能被垃圾回收。特别地，iframe窗口和事件侦听器一起泄漏。

```js
// 主窗口：
const iframe = document.createElement('iframe');
iframe.src = 'iframe.html';
document.body.appendChild(iframe);
iframe.addEventListener('load', function() {
  const localVariable = iframe.contentWindow;
  function leakingListener() {
    // 用 `localVariable` 做一些事情。
    if (localVariable) {}
  }
  document.body.addEventListener('my-debug-event', leakingListener);
  document.body.removeChild(iframe);
  // 错误：忘记注销 `leakingListener`。
});
```

泄漏的iframe窗口还保持着其所有JavaScript对象不被销毁。

```js
// iframe.html:
class Leak {};
window.globalVariable = new Leak();
```

理解保留路径的概念对于找到内存泄漏的根源很重要。保留路径是防止泄漏对象被垃圾回收的一连串对象。链条从根对象（例如主窗口的全局对象）开始，到泄漏对象结束。链条中的每个中间对象都直接引用下一个对象。例如，iframe中 `Leak` 对象的保留路径如下所示：

![图1：通过 `iframe` 和事件侦听器泄漏的对象的保留路径](/_img/tracing-js-dom/retaining-path.svg)

注意，保留路径两次跨越了 JavaScript / DOM 的边界（分别以绿色/红色标出）。JavaScript 对象存在于 V8 堆上，而 DOM 对象是 Chrome 中的 C++ 对象。

## 开发者工具堆快照

通过在开发者工具中捕获堆快照，我们可以检查任何对象的保留路径。堆快照精确捕获了 V8 堆上的所有对象。直到最近，它对 C++ DOM 对象的信息仍然是近似的。例如，Chrome 65 中显示的玩具示例中的 `Leak` 对象的保留路径是不完整的：

![图2：Chrome 65 中的保留路径](/_img/tracing-js-dom/chrome-65.png)

只有第一行是精确的：`Leak` 对象确实存储在 iframe 窗口对象的 `global_variable` 中。后续行对真正的保留路径进行了近似，使得内存泄漏的调试变得困难。

自 Chrome 66 起，开发者工具可以通过 C++ DOM 对象进行跟踪并精确捕获它们及其之间的引用。这基于先前为跨组件垃圾回收引入的强大 C++ 对象跟踪机制。结果是，[开发者工具中的保留路径](https://www.youtube.com/watch?v=ixadA7DFCx8) 现在实际上是正确的：

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/ixadA7DFCx8" width="640" height="360" loading="lazy"></iframe>
  </div>
  <figcaption>图3：Chrome 66 中的保留路径</figcaption>
</figure>

## 深入探讨：跨组件跟踪

DOM 对象由 Blink 管理——它是 Chrome 的渲染引擎，负责将 DOM 转换为屏幕上的实际文本和图像。Blink 及其 DOM 表示是用 C++ 编写的，这意味着 DOM 不能直接暴露给 JavaScript。相反，DOM 中的对象分为两部分：一个可供 JavaScript 使用的 V8 包装对象，以及代表 DOM 节点的 C++ 对象。这些对象相互直接引用。在多个组件（如 Blink 和 V8）之间确定对象的存活性和所有权是困难的，因为所有相关方都需要就哪些对象仍然存活、哪些可以回收达成一致。

在Chrome 56及更早的版本（即截至2017年3月），Chrome使用一种称为_对象分组_的机制来确定对象的存活性。根据文档包含关系，将对象分配到组中。只要组中有一个对象通过其他保留路径保持存活，组中所有包含的对象都会保持存活。在DOM节点上下文中，这种机制有意义，因为DOM节点总是引用所属的文档，从而形成所谓的DOM树。然而，这种抽象方法删除了所有实际的保留路径，使调试变得困难，如图2所示。在不符合这种场景的情况下，例如，作为事件监听器使用的JavaScript闭包，这种方法变得繁琐，并导致各种问题，比如JavaScript包装对象过早被回收，结果导致它们被替换为空的JS包装对象，丢失了所有属性。

从Chrome 57开始，这种方法被跨组件跟踪机制所取代，该机制通过从JavaScript跟踪到DOM的C++实现再返回的方法来确定对象的存活性。我们在C++端实现了增量跟踪，并使用写屏障避免了我们在[之前的博客文章](/blog/orinoco-parallel-scavenger)中谈到的“停顿世界”式跟踪卡顿问题。跨组件跟踪不仅提供了更好的延迟表现，还能更好地跨组件边界近似对象的存活性，并修复了曾经导致泄漏的几个[场景](https://bugs.chromium.org/p/chromium/issues/detail?id=501866)。除此之外，它还允许DevTools提供一个实际代表DOM的快照，如图3所示。

试试看！我们很期待听到您的反馈。
