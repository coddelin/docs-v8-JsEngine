---
title: "弱引用和终结器"
author: "Sathya Gunasekaran ([@_gsathya](https://twitter.com/_gsathya)), Mathias Bynens ([@mathias](https://twitter.com/mathias)), Shu-yu Guo ([@_shu](https://twitter.com/_shu)), and Leszek Swirski ([@leszekswirski](https://twitter.com/leszekswirski))"
avatars:
- "sathya-gunasekaran"
- "mathias-bynens"
- "shu-yu-guo"
- "leszek-swirski"
date: 2019-07-09
updated: 2020-06-19
tags:
  - ECMAScript
  - ES2021
  - io19
  - Node.js 14
description: "弱引用和终结器即将在 JavaScript 中实现！本文解释了这一新功能。"
tweet: "1148603966848151553"
---
一般来说，JavaScript 中对象的引用是_强引用_，这意味着只要你有对对象的引用，它就不会被垃圾回收。

```js
const ref = { x: 42, y: 51 };
// 只要你可以访问到 `ref`（或其他对同一对象的引用），这个对象就不会被垃圾回收。
```

目前，`WeakMap` 和 `WeakSet` 是在 JavaScript 中以某种方式弱引用对象的唯一方式：将一个对象作为键添加到 `WeakMap` 或 `WeakSet` 中不会阻止它被垃圾回收。

```js
const wm = new WeakMap();
{
  const ref = {};
  const metaData = 'foo';
  wm.set(ref, metaData);
  wm.get(ref);
  // → metaData
}
// 我们在这个代码块作用域中不再拥有对 `ref` 的引用，因此它现在可以被垃圾回收，尽管它是 `wm` 中的一个键，而我们仍然可以访问到 `wm`。

<!--truncate-->
const ws = new WeakSet();
{
  const ref = {};
  ws.add(ref);
  ws.has(ref);
  // → true
}
// 我们在这个代码块作用域中不再拥有对 `ref` 的引用，因此它现在可以被垃圾回收，尽管它是 `ws` 中的一个键，而我们仍然可以访问到 `ws`。
```

:::note
**注意：** 你可以将 `WeakMap.prototype.set(ref, metaData)` 看作是在对象 `ref` 上添加了一个值为 `metaData` 的属性：只要你有对这个对象的引用，你就可以获取到元数据。一旦你不再拥有对该对象的引用，即使你仍然拥有对添加对象的 `WeakMap` 的引用，它也可以被垃圾回收。同样，你可以将 `WeakSet` 视为 `WeakMap` 的一种特殊情况，所有的值都是布尔值。

一个 JavaScript `WeakMap` 并不是真正的_弱引用_：只要键还存在，它实际上是_强引用_其内容的。一旦键被垃圾回收，`WeakMap` 才会弱引用其内容。这种关系的更准确名称是 [_ephemeron_](https://en.wikipedia.org/wiki/Ephemeron)。
:::

`WeakRef` 是一个更高级的 API，它提供了_真正的_弱引用，使我们能够观察对象的生命周期。让我们一起通过一个例子来了解它。

在这个例子中，假设我们正在开发一个使用 WebSocket 与服务器通信的聊天网页应用程序。假设有一个 `MovingAvg` 类，它为性能诊断目的保留了一组来自 WebSocket 的事件，以计算简单移动平均的延迟。

```js
class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.socket = socket;
    this.listener = (ev) => { this.events.push(ev); };
    socket.addEventListener('message', this.listener);
  }

  compute(n) {
    // 计算最近 n 个事件的简单移动平均值。
    // …
  }
}
```

它被一个 `MovingAvgComponent` 类使用，该类可以控制何时开始和停止观察延迟的简单移动平均值。

```js
class MovingAvgComponent {
  constructor(socket) {
    this.socket = socket;
  }

  start() {
    this.movingAvg = new MovingAvg(this.socket);
  }

  stop() {
    // 允许垃圾回收器回收内存。
    this.movingAvg = null;
  }

  render() {
    // 做一些渲染。
    // …
  }
}
```

我们知道，在 `MovingAvg` 实例中保留所有的服务器消息会占用大量内存，因此在监视停止时，我们会将 `this.movingAvg` 置为 null，以便垃圾回收器回收内存。

然而，在 DevTools 的内存面板中检查后，我们发现内存根本没有被回收！经验丰富的网页开发人员可能已经发现了问题所在：事件监听器是强引用，必须显式移除它们。

让我们通过可达性图来使这个问题更加清晰。在调用 `start()` 之后，我们的对象图如下图所示，实心箭头表示强引用。从 `MovingAvgComponent` 实例通过实心箭头可达的所有内容都不会被垃圾回收。

![](/_img/weakrefs/after-start.svg)

在调用 `stop()` 之后，我们从 `MovingAvgComponent` 实例到 `MovingAvg` 实例的强引用被移除了，但没有移除通过 WebSocket 的监听器的引用。

![](/_img/weakrefs/after-stop.svg)

因此，`MovingAvg` 实例中的监听器通过引用 `this`，只要事件监听器未移除，就会使整个实例保持存活。

到目前为止，解决方案是通过一个 `dispose` 方法手动取消注册事件监听器。

```js
class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.socket = socket;
    this.listener = (ev) => { this.events.push(ev); };
    socket.addEventListener('message', this.listener);
  }

  dispose() {
    this.socket.removeEventListener('message', this.listener);
  }

  // …
}
```

这种方法的缺点是需要手动管理内存。`MovingAvgComponent` 和所有其他使用 `MovingAvg` 类的用户必须记得调用 `dispose`，否则会导致内存泄漏。更糟糕的是，手动内存管理是级联的：`MovingAvgComponent` 的用户必须记得调用 `stop`，否则会发生内存泄漏，以此类推。应用程序的行为并不依赖这个诊断类的事件监听器，并且监听器在内存使用方面成本较高，但不是在计算方面。我们真正需要的是让监听器的生命周期在逻辑上与 `MovingAvg` 实例绑定，这样 `MovingAvg` 可以像其他 JavaScript 对象一样使用，由垃圾收集器自动回收内存。

`WeakRef` 使得通过创建指向实际事件监听器的_弱引用_，并将该 `WeakRef` 包裹在外层事件监听器中，解决这个难题成为可能。通过这种方式，垃圾收集器可以清理实际事件监听器及其保持活跃的内存，例如 `MovingAvg` 实例及其 `events` 数组。

```js
function addWeakListener(socket, listener) {
  const weakRef = new WeakRef(listener);
  const wrapper = (ev) => { weakRef.deref()?.(ev); };
  socket.addEventListener('message', wrapper);
}

class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.listener = (ev) => { this.events.push(ev); };
    addWeakListener(socket, this.listener);
  }
}
```

:::note
**注意：** 对函数的 `WeakRef` 必须谨慎处理。JavaScript 函数是[闭包](https://en.wikipedia.org/wiki/Closure_(computer_programming))，并强引用外部环境，这些外部环境包含函数内引用的自由变量的值。这些外部环境可能包含 _其他_ 闭包也引用的变量。也就是说，当处理闭包时，它们的内存通常会以微妙的方式被其他闭包强引用。这就是为什么 `addWeakListener` 是一个独立函数，而 `wrapper` 不是本地的 `MovingAvg` 构造函数。在 V8 中，如果 `wrapper` 是本地的 `MovingAvg` 构造函数并与被 `WeakRef` 包裹的监听器共享词法作用域，则 `MovingAvg` 实例及其所有属性会通过共享环境从包裹监听器变得可达，从而导致实例不可回收。在编写代码时需牢记这一点。
:::

我们首先创建事件监听器并将其分配给 `this.listener`，使其被 `MovingAvg` 实例强引用。换句话说，只要 `MovingAvg` 实例存活，事件监听器也会存活。

然后，在 `addWeakListener` 中，我们创建一个 `WeakRef`，其_目标_是实际的事件监听器。在 `wrapper` 中，我们对其进行解引用。因为如果目标没有其他强引用，`WeakRef` 不会阻止其目标被垃圾回收，所以我们必须手动解引用以获取目标。如果目标在此期间被垃圾回收，`deref` 返回 `undefined`。否则，返回原始目标，即我们随后使用[可选链](/features/optional-chaining)调用的 `listener` 函数。

由于事件监听器被封装在 `WeakRef` 中，对它的_唯一_强引用是 `MovingAvg` 实例上的 `listener` 属性。也就是说，我们成功地将事件监听器的生命周期绑定到 `MovingAvg` 实例的生命周期。

回到可达性图，调用带有 `WeakRef` 实现的 `start()` 后，我们的对象图如下，虚线箭头表示弱引用。

![](/_img/weakrefs/weak-after-start.svg)

调用 `stop()` 后，我们移除了对监听器的唯一强引用：

![](/_img/weakrefs/weak-after-stop.svg)

最终，在垃圾收集发生后，`MovingAvg` 实例和监听器都会被收集：

![](/_img/weakrefs/weak-after-gc.svg)

但这里仍然有一个问题：我们通过将监听器包裹在一个 `WeakRef` 中为 `listener` 添加了一个间接层，但 `addWeakListener` 中的包裹器仍然因为最初 `listener` 泄漏的原因而泄漏。当然，这个泄漏较小，因为只有包裹器泄漏，而不是整个 `MovingAvg` 实例，但它仍是一个泄漏。解决这一问题的方法是 `WeakRef` 的配套功能 `FinalizationRegistry`。通过新的 `FinalizationRegistry` API，我们可以注册一个回调函数，在垃圾收集器清除注册对象时运行。这样的回调函数称为_终结器_。

:::note
**注意：** 垃圾回收事件侦听器后，终结回调不会立即运行，因此不要将其用于重要的逻辑或指标。垃圾回收和终结回调的时间是未指定的。事实上，一个从不进行垃圾回收的引擎也会完全符合规范。然而，可以安全地假设引擎将会执行垃圾回收，并且终结回调会在稍后时间调用，除非环境被丢弃（例如关闭标签页或终止工作线程）。编写代码时请记住这种不确定性。
:::

我们可以使用 `FinalizationRegistry` 注册一个回调，当内部事件侦听器被垃圾回收时，将 `wrapper` 从 socket 中移除。我们的最终实现如下所示：

```js
const gListenersRegistry = new FinalizationRegistry(({ socket, wrapper }) => {
  socket.removeEventListener('message', wrapper); // 6
});

function addWeakListener(socket, listener) {
  const weakRef = new WeakRef(listener); // 2
  const wrapper = (ev) => { weakRef.deref()?.(ev); }; // 3
  gListenersRegistry.register(listener, { socket, wrapper }); // 4
  socket.addEventListener('message', wrapper); // 5
}

class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.listener = (ev) => { this.events.push(ev); }; // 1
    addWeakListener(socket, this.listener);
  }
}
```

:::注意
**注意：** `gListenersRegistry` 是一个全局变量以确保终结回调能够执行。`FinalizationRegistry` 不会因其注册的对象而保持存活。如果注册表本身被垃圾回收，其终结回调可能不会执行。
:::

我们创建了一个事件侦听器并将其赋值给 `this.listener`，以便它受到 `MovingAvg` 实例的强引用（1）。然后，我们将完成工作的事件侦听器用 `WeakRef` 包装，使其能够被垃圾回收，并防止其通过 `this` 泄漏对 `MovingAvg` 实例的引用（2）。我们创建了一个 `wrapper` 来解引用 `WeakRef` 并检查它是否仍然活着，如果是，则调用它（3）。我们在 `FinalizationRegistry` 上注册内部侦听器，并传递一个包含值 `{ socket, wrapper }` 的注册项（4）。然后，我们将返回的 `wrapper` 添加为 `socket` 上的事件侦听器（5）。在 `MovingAvg` 实例和内部侦听器垃圾回收后的一段时间内，终结回调可能会运行，并将包含值传递给它。最终回调内部我们移除 `wrapper`，使得与 `MovingAvg` 实例使用相关的所有内存都能够被垃圾回收（6）。

通过所有这些处理，我们最初实现的 `MovingAvgComponent` 既不会泄露内存，也不需要任何手动清理。

## 不要过度使用

听到这些新功能后，可能会很诱惑地想用 `WeakRef` 对所有东西都应用™。然而，这可能不是一个好主意。有些东西明确地 _不_ 是 `WeakRef` 和终结回调的良好用例。

通常，避免编写依赖于垃圾回收器在任何可预测时间清理 `WeakRef` 或调用终结回调的代码——[这是不可能做到的](https://github.com/tc39/proposal-weakrefs#a-note-of-caution)。此外，对象是否能够被垃圾回收可能取决于实现细节，例如闭包的表示，这些既微妙又可能因 JavaScript 引擎以及同一引擎的不同版本而有所不同。具体来说，终结回调可能：

- 不会在垃圾回收后立即发生。
- 不一定按照实际垃圾回收的顺序发生。
- 可能完全不会发生，例如浏览器窗口关闭时。

因此，不要在终结回调的代码路径中放置重要的逻辑。它们对响应垃圾回收中的清理很有用，但无法可靠地用于，例如，记录内存使用的有意义的指标。对于此类用例，请参考 [`performance.measureUserAgentSpecificMemory`](https://web.dev/monitor-total-page-memory-usage/)。

`WeakRef` 和终结回调可以帮助减少内存使用，并且在作为渐进增强的手段时使用效果最佳。由于它们是高级功能，我们预计大多数使用将会发生在框架或库中。

## `WeakRef` 支持

<feature-support chrome="74 https://v8.dev/blog/v8-release-84#weak-references-and-finalizers"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1561074"
                 safari="no"
                 nodejs="14.6.0"
                 babel="no"></feature-support>
