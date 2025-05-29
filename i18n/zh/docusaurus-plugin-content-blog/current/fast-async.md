---
title: '更快的异步函数和Promise'
author: 'Maya Armyanova（[@Zmayski](https://twitter.com/Zmayski)），永远等待的预测者，以及Benedikt Meurer（[@bmeurer](https://twitter.com/bmeurer)），专业性能承诺者'
avatars:
  - 'maya-armyanova'
  - 'benedikt-meurer'
date: 2018-11-12 16:45:07
tags:
  - ECMAScript
  - 基准测试
  - 演讲
description: '更快且更易于调试的异步函数和Promise即将登陆V8 v7.2 / Chrome 72。'
tweet: '1062000102909169670'
---
JavaScript中的异步处理传统上被认为速度不是特别快。更糟糕的是，调试实时JavaScript应用程序——特别是Node.js服务器——并不是一件容易的事，尤其是异步编程。幸运的是，时代正在改变。这篇文章探讨了我们如何优化V8中的异步函数和Promise（也在一定程度上优化了其他JavaScript引擎），并描述了我们如何改进异步代码的调试体验。

<!--truncate-->
:::note
**注意:** 如果您更喜欢看演讲而不是阅读文章，那么可以欣赏下面的视频！如果不喜欢，请跳过视频并继续阅读。
:::

<figure>
  <div class="视频 视频-16:9">
    <iframe src="https://www.youtube.com/embed/DFP5DKDQfOc" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

## 一种新的异步编程方法

### 从回调到Promise再到异步函数

在Promise成为JavaScript语言的一部分之前，基于回调的API通常用于异步代码，特别是在Node.js中。以下是一个示例：

```js
function handler(done) {
  validateParams((error) => {
    if (error) return done(error);
    dbQuery((error, dbResults) => {
      if (error) return done(error);
      serviceCall(dbResults, (error, serviceResults) => {
        console.log(result);
        done(error, serviceResults);
      });
    });
  });
}
```

这种深度嵌套回调的使用模式通常被称为“回调地狱”，因为它使代码难以阅读且难以维护。

幸运的是，现在有了Promise成为JavaScript语言的一部分，同样的代码可以以更优雅和便于维护的方式编写：

```js
function handler() {
  return validateParams()
    .then(dbQuery)
    .then(serviceCall)
    .then(result => {
      console.log(result);
      return result;
    });
}
```

最近，JavaScript还支持了[异步函数](https://web.dev/articles/async-functions)。上述异步代码现在可以用看起来非常类似同步代码的方式编写：

```js
async function handler() {
  await validateParams();
  const dbResults = await dbQuery();
  const results = await serviceCall(dbResults);
  console.log(results);
  return results;
}
```

使用异步函数代码变得更加简洁，并且控制和数据流更容易跟踪，尽管执行仍然是异步的。（注意，JavaScript的执行仍然发生在单线程中，这意味着异步函数本身不会创建物理线程。）

### 从事件监听器回调到异步迭代

另一种异步范式，尤其是在Node.js中很常见，是[`ReadableStream`](https://nodejs.org/api/stream.html#stream_readable_streams)。以下是一个示例：

```js
const http = require('http');

http.createServer((req, res) => {
  let body = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    res.write(body);
    res.end();
  });
}).listen(1337);
```

这段代码可能有点难以跟随：接收的数据按块处理，这些块只能在回调中访问，而流结束信号也发生在回调中。当你没有意识到函数会立即终止，实际处理必须发生在回调中时，容易引入错误。

幸运的是，一个名为[异步迭代](http://2ality.com/2016/10/asynchronous-iteration.html)的ES2018新特性可以简化这段代码：

```js
const http = require('http');

http.createServer(async (req, res) => {
  try {
    let body = '';
    req.setEncoding('utf8');
    for await (const chunk of req) {
      body += chunk;
    }
    res.write(body);
    res.end();
  } catch {
    res.statusCode = 500;
    res.end();
  }
}).listen(1337);
```

现在，我们可以把实际处理请求的逻辑放到一个单独的异步函数中，而不是两个不同的回调——`'data'`和`'end'`回调，并使用新的`for await…of`循环异步迭代块。我们还添加了一个`try-catch`块来避免`unhandledRejection`问题[^1]。

[^1]: 感谢 [Matteo Collina](https://twitter.com/matteocollina) 指出 [这个问题](https://github.com/mcollina/make-promises-safe/blob/master/README.md#the-unhandledrejection-problem)。

你今天就可以在生产环境中使用这些新功能了！异步函数从 **Node.js 8 (V8 v6.2 / Chrome 62)** 开始完全支持，异步迭代器和生成器从 **Node.js 10 (V8 v6.8 / Chrome 68)** 开始完全支持！

## 异步性能改进

我们已经成功地在 V8 v5.5 (Chrome 55 & Node.js 7) 和 V8 v6.8 (Chrome 68 & Node.js 10) 之间显著提高了异步代码的性能。我们达到了一个开发者可以安全地使用这些新的编程范式而不必担心速度的性能水平。

![](/_img/fast-async/doxbee-benchmark.svg)

上图显示了 [doxbee 基准测试](https://github.com/v8/promise-performance-tests/blob/master/lib/doxbee-async.js)，该测试测量了大量使用 Promise 的代码的性能。请注意，图表表示执行时间，因此越低越好。

在 [parallel 基准测试](https://github.com/v8/promise-performance-tests/blob/master/lib/parallel-async.js) 中，专门测试了 [`Promise.all()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) 的性能，结果更令人振奋：

![](/_img/fast-async/parallel-benchmark.svg)

我们将 `Promise.all` 性能提高了 **8 倍**。

然而，上述基准测试是合成的小型基准。V8 团队更关心我们的优化如何影响 [实际用户代码的真实世界性能](/blog/real-world-performance)。

![](/_img/fast-async/http-benchmarks.svg)

上图可视化了一些广泛使用的 HTTP 中间件框架的性能，这些框架大量使用了 Promise 和 `async` 函数。请注意，此图显示的是每秒的请求数，因此与之前的图表不同，数值越高越好。这些框架的性能从 Node.js 7 (V8 v5.5) 到 Node.js 10 (V8 v6.8) 显著提高。

这些性能改进是以下三个关键成果的结果：

- [TurboFan](/docs/turbofan)，新的优化编译器 🎉
- [Orinoco](/blog/orinoco)，新的垃圾回收器 🚛
- 一个 Node.js 8 的 bug 导致 `await` 跳过微任务 🐛

我们在 [Node.js 8 中发布 TurboFan](/blog/launching-ignition-and-turbofan) 时，带来了全局巨大的性能提升。

我们还开发了一个新的垃圾回收器，称为 Orinoco，将垃圾收集工作从主线程移开，从而显著提高了请求处理性能。

最后但同样重要的是，Node.js 8 中存在一个 bug，导致 `await` 在某些情况下跳过微任务，从而提高了性能。这个 bug 最初是一个无意的规范违背，但后来我们从中获得了优化的灵感。我们从解释这个错误行为开始：

:::note
**注意：** 以下行为根据写作时的 JavaScript 规范是正确的。从那时起，我们的规范提案被接受，以下“错误”行为现在是正确的。
:::

```js
const p = Promise.resolve();

(async () => {
  await p; console.log(&apos;after:await&apos;);
})();

p.then(() => console.log(&apos;tick:a&apos;))
 .then(() => console.log(&apos;tick:b&apos;));
```

上面的程序创建了一个已完成的 Promise `p`，并 `await` 它的结果，同时还链接了两个处理程序。在你看来，`console.log` 的调用会以什么顺序执行呢？

由于 `p` 已完成，你可能认为它会先打印 `&apos;after:await&apos;`，然后是 `&apos;tick&apos;`。事实上，在 Node.js 8 中确实如此：

![Node.js 8 中的 `await` bug](/_img/fast-async/await-bug-node-8.svg)

虽然这种行为看起来很直观，但根据规范它是不正确的。Node.js 10 实现了正确的行为，即先执行已链式调用的处理程序，然后才继续执行异步函数。

![Node.js 10 不再有 `await` bug](/_img/fast-async/await-bug-node-10.svg)

这种 _“正确行为”_ 可以说并不立即显而易见，甚至让 JavaScript 开发者感到惊讶，因此值得解释。在我们深入承诺和异步函数的神奇世界之前，让我们从一些基础概念开始。

### 任务与微任务

在高层次上，JavaScript 中有 _任务_ 和 _微任务_。任务处理事件（例如 I/O 和定时器），一次执行一个。微任务实现延迟执行，用于 `async`/`await` 和 Promise，并在每个任务结束时执行。微任务队列总是在执行返回到事件循环之前被清空。

![微任务与任务的区别](/_img/fast-async/microtasks-vs-tasks.svg)

更多详细信息，请查看 Jake Archibald 的[浏览器中的任务、微任务、队列和调度](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/)的解释。Node.js 的任务模型非常相似。

### 异步函数

根据 MDN 的说法，异步函数是一种异步操作的函数，它使用隐式的 Promise 来返回结果。异步函数旨在使异步代码看起来像同步代码，从而隐藏一些异步处理的复杂性。

最简单可能的异步函数如下所示：

```js
async function computeAnswer() {
  return 42;
}
```

调用时返回一个 Promise，可以像处理其他 Promise 一样获取其值。

```js
const p = computeAnswer();
// → Promise

p.then(console.log);
// 下一轮打印 42
```

你只能在下一次运行微任务时获得这个 Promise `p` 的值。换句话说，上述程序在语义上等价于使用 `Promise.resolve` 和这个值：

```js
function computeAnswer() {
  return Promise.resolve(42);
}
```

异步函数的真正强大之处在于 `await` 表达式，它会导致函数暂停执行，直到 Promise 被解析，然后再恢复执行。`await` 的值即为解析后的 Promise 的值。以下是一个实例说明了其意义：

```js
async function fetchStatus(url) {
  const response = await fetch(url);
  return response.status;
}
```

`fetchStatus` 的执行会在 `await` 上暂停，随后在 `fetch` Promise 完成后恢复。这在某种程度上等同于将一个处理程序链接到 `fetch` 返回的 Promise。

```js
function fetchStatus(url) {
  return fetch(url).then(response => response.status);
}
```

这个处理程序包含了异步函数中 `await` 后的代码。

通常，你会传递一个 `Promise` 给 `await`，但实际上你可以等待任意 JavaScript 值。如果 `await` 后的表达式值不是 Promise，则会将其转换为 Promise。这意味着如果愿意，你也可以 `await 42`：

```js
async function foo() {
  const v = await 42;
  return v;
}

const p = foo();
// → Promise

p.then(console.log);
// 最终打印 `42`
```

更有趣的是，`await` 可以与任何[“可 then 化对象”](https://promisesaplus.com/) 一起使用，即任何带有 `then` 方法的对象，即使它并不是真正的 Promise。因此，你可以实现一些有趣的东西，比如一个异步的睡眠操作，它测量实际睡眠时间：

```js
class Sleep {
  constructor(timeout) {
    this.timeout = timeout;
  }
  then(resolve, reject) {
    const startTime = Date.now();
    setTimeout(() => resolve(Date.now() - startTime),
               this.timeout);
  }
}

(async () => {
  const actualTime = await new Sleep(1000);
  console.log(actualTime);
})();
```

让我们看看 V8 在内部是如何处理 `await` 的，在遵循[规范](https://tc39.es/ecma262/#await)的情况下。以下是一个简单的异步函数 `foo`：

```js
async function foo(v) {
  const w = await v;
  return w;
}
```

调用时，它会将参数 `v` 包装成一个 Promise，并暂停异步函数的执行，直到该 Promise 被解析。一旦发生这种情况，函数的执行恢复，`w` 被赋值为解析后的 Promise 值。随后从异步函数返回该值。

### `await` 的内部工作原理

首先，V8 将这个函数标记为_可恢复的_，这意味着可以暂停执行并稍后（在 `await` 点）恢复执行。然后它创建所谓的 `implicit_promise`，即调用异步函数时返回的 Promise，最终解析为异步函数生成的值。

![简单异步函数与引擎转换后的对比图](/_img/fast-async/await-under-the-hood.svg)

接下来是有趣的部分：实际的 `await`。首先传给 `await` 的值会被包装成一个 Promise。然后，这个包装后的 Promise 会被附加处理程序，以便在 Promise 完成后恢复函数，并暂停异步函数的执行，将 `implicit_promise` 返回给调用者。一旦 `promise` 被完成，异步函数的执行会恢复，使用 `promise` 中的值 `w` 并将 `implicit_promise` 解析为 `w`。

简而言之，`await v` 的初始步骤是：

1. 将传递给 `await` 的值 `v` 包装成一个 Promise。
2. 附加处理程序以稍后恢复异步函数。
3. 暂停异步函数并将 `implicit_promise` 返回给调用者。

让我们逐步解析这些操作。假设 `await` 操作的对象已经是一个 Promise，并且已被解析为值 `42`。然后引擎会创建一个新的 `promise` 并解析该 Promise。这在下一轮中完成这些 Promise 的延迟链接，由规范所谓的 [`PromiseResolveThenableJob`](https://tc39.es/ecma262/#sec-promiseresolvethenablejob) 来表示。

![](/_img/fast-async/await-step-1.svg)

然后引擎会创建另一个所谓的`临时`Promise。它被称为*临时的*，因为它从未被链式调用——它是引擎内部完全专用的。这种`临时`Promise然后会被链接到原来的`Promise`上，并加入适当的处理程序以恢复异步函数。这种`performPromiseThen`操作本质上就是[`Promise.prototype.then()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then)在幕后所做的事情。最后，异步函数的执行被挂起，控制权返回给调用者。

![](/_img/fast-async/await-step-2.svg)

执行在调用者中继续，最终调用栈变空。然后JavaScript引擎开始运行微任务：它运行之前调度的[`PromiseResolveThenableJob`](https://tc39.es/ecma262/#sec-promiseresolvethenablejob)，随后调度新的[`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob)将`Promise`链接到传递给`await`的值。然后，引擎返回继续处理微任务队列，因为必须清空微任务队列后才能继续主事件循环。

![](/_img/fast-async/await-step-3.svg)

接下来是[`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob)，它使用我们`await`的Promise中的值（在这种情况下为`42`）完成`Promise`，并将反应调度到`临时`Promise。然后引擎再次返回到微任务循环，其中最后包含一个需要处理的微任务。

![](/_img/fast-async/await-step-4-final.svg)

现在第二个[`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob)将解决结果传播到`临时`Promise，并恢复异步函数的挂起执行，返回从`await`获取的值`42`。

![`await`开销的概述](/_img/fast-async/await-overhead.svg)

总结我们所学到的，对于每个`await`，引擎必须额外创建**两个**Promise（即使右边已经是一个Promise），并且需要**至少三次**微任务队列调度。谁会想到单个`await`表达式会带来_如此大的开销_？！

![](/_img/fast-async/await-code-before.svg)

让我们看看这些开销的来源。第一行负责创建包装Promise。第二行立即将包装Promise解析为`await`的值`v`。这两行负责一个额外的Promise加上三次微任务调度中的两次。如果`v`已经是Promise（这是常见情况，因为应用通常在Promise上执行`await`），这算是较高的开销。在开发者不太可能的情况下`await`一个例如`42`的值，引擎仍需要将其包装成Promise。

事实证明，规范中已经有一个[`promiseResolve`](https://tc39.es/ecma262/#sec-promise-resolve)操作，只在需要时进行包装：

![](/_img/fast-async/await-code-comparison.svg)

该操作直接返回Promise，对于其他值必要时才包装成Promise。这样，在传递给`await`的值已经是Promise的常见情况下，可以节省一个额外的Promise及两个微任务调度。这种新行为在[V8 v7.2中已经默认启用](/blog/v8-release-72#async%2Fawait)。对于V8 v7.1，可以使用`--harmony-await-optimization`选项启用新行为。我们已[将此更改提议为ECMAScript规范的一部分](https://github.com/tc39/ecma262/pull/1250)。

以下是改进后的`await`背后的工作原理，分步骤说明：

![](/_img/fast-async/await-new-step-1.svg)

假设我们再次`await`一个被解析为`42`的Promise。多亏了[`promiseResolve`](https://tc39.es/ecma262/#sec-promise-resolve)的魔力，现在`Promise`直接引用相同的Promise`v`，因此该步骤不需要做任何处理。随后引擎继续如之前创建`临时`Promise，调度一个 [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob)以在微任务队列的下一次调度中恢复异步函数的执行，挂起函数的执行，并返回调用者。

![](/_img/fast-async/await-new-step-2.svg)

最终当所有JavaScript执行完成后，引擎开始运行微任务以执行[`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob)。此任务将`Promise`的解决结果传播到`临时`Promise，并恢复异步函数的执行，从`await`中返回`42`。

![减少`await`开销的总结](/_img/fast-async/await-overhead-removed.svg)

此优化避免了在传递给`await`的值已经是Promise的情况下创建包装Promise的需要，在这种情况下，我们从**至少三次**微任务调度减少到仅剩**一次**微任务调度。这种行为与Node.js 8类似，只是现在它不再是一个错误——而是正在标准化的一项优化！

仍然感觉不太对劲的是，尽管`临时`Promise完全是引擎内部使用，但引擎不得不创建它。事实证明，`临时`Promise的存在仅是为了满足规范中内部`performPromiseThen`操作的API约束。

![](/_img/fast-async/await-optimized.svg)

最近在对ECMAScript规范的一次[编辑修改](https://github.com/tc39/ecma262/issues/694)中解决了这个问题。引擎不再需要为`await`创建`throwaway` promise —— 在大多数情况下[^2]。

[^2]: 如果在Node.js中使用了[`async_hooks`](https://nodejs.org/api/async_hooks.html)，那么V8仍然需要创建`throwaway` promise，因为`before`和`after`钩子会运行在`throwaway` promise的上下文中。

![优化前后`await`代码的比较](/_img/fast-async/node-10-vs-node-12.svg)

将Node.js 10中的`await`与可能出现在Node.js 12中的优化后的`await`进行比较，展示了这一更改的性能影响：

![](/_img/fast-async/benchmark-optimization.svg)

**现在`async`/`await`的性能超过了手写的Promise代码**。这里的关键点是我们显著减少了异步函数的开销——不仅在V8中，而且在所有JavaScript引擎中，通过修改规范实现了这一点。

**更新：** 从V8 v7.2和Chrome 72开始，`--harmony-await-optimization`默认启用。[对ECMAScript规范的补丁](https://github.com/tc39/ecma262/pull/1250)已被合并。

## 改进开发者体验

除了性能外，JavaScript开发者也关心诊断和解决问题的能力，而在处理异步代码时，这并不总是那么容易。[Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools)支持*异步堆栈跟踪*，即不仅包括堆栈的当前同步部分，还包括异步部分：

![](/_img/fast-async/devtools.png)

这是本地开发期间一个非常有用的功能。然而，一旦应用部署，这种方法实际上对你没有帮助。在事后调试期间，你只能在日志文件中看到`Error#stack`的输出，这并不能告诉你关于异步部分的任何信息。

我们最近在[零成本异步堆栈跟踪](https://bit.ly/v8-zero-cost-async-stack-traces)上进行了一些工作，该功能将异步函数调用丰富到`Error#stack`属性中。“零成本”听起来很有吸引力，不是吗？当Chrome DevTools功能带来了大量开销时，如何能够是零成本？考虑这个例子，`foo`异步调用`bar`，而`bar`在`await`一个Promise后抛出了一个异常：

```js
async function foo() {
  await bar();
  return 42;
}

async function bar() {
  await Promise.resolve();
  throw new Error(&apos;BEEP BEEP&apos;);
}

foo().catch(error => console.log(error.stack));
```

在Node.js 8或Node.js 10中运行这段代码会得到以下输出：

```text/2
$ node index.js
Error: BEEP BEEP
    at bar (index.js:8:9)
    at process._tickCallback (internal/process/next_tick.js:68:7)
    at Function.Module.runMain (internal/modules/cjs/loader.js:745:11)
    at startup (internal/bootstrap/node.js:266:19)
    at bootstrapNodeJSCore (internal/bootstrap/node.js:595:3)
```

注意，尽管调用`foo()`引发了错误，`foo`根本不在堆栈跟踪中。这使得JavaScript开发者在事后调试时变得复杂，无论你的代码是部署在网页应用还是某些云容器中。

有趣的是，引擎知道`bar`完成后应该在哪里继续：就是函数`foo`中的`await`之后的地方。巧合的是，这也是函数`foo`被挂起的位置。引擎可以使用此信息重建异步堆栈跟踪的部分，特别是那些`await`的位置。应用此更改后，输出结果变为：

```text/2,7
$ node --async-stack-traces index.js
Error: BEEP BEEP
    at bar (index.js:8:9)
    at process._tickCallback (internal/process/next_tick.js:68:7)
    at Function.Module.runMain (internal/modules/cjs/loader.js:745:11)
    at startup (internal/bootstrap/node.js:266:19)
    at bootstrapNodeJSCore (internal/bootstrap/node.js:595:3)
    at async foo (index.js:2:3)
```

在堆栈跟踪中，最顶层的函数最先出现，然后是其余同步堆栈跟踪，接着是异步调用函数`foo`中的`bar`。此更改在V8中通过新的`--async-stack-traces`标志实现。**更新：** 从V8 v7.3开始，`--async-stack-traces`默认启用。

然而，如果您将其与上面 Chrome DevTools 中的异步堆栈跟踪进行比较，您会注意到异步堆栈跟踪中缺少实际调用 `foo` 的位置。如前所述，该方法利用了 `await` 的恢复和挂起位置相同的事实——但对于常规的 [`Promise#then()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then) 或 [`Promise#catch()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch) 调用，这并不成立。更多背景信息请参阅 Mathias Bynens 关于[为什么 `await` 胜过 `Promise#then()`](https://mathiasbynens.be/notes/async-stack-traces)的解释。

## 结论

我们通过两个重要的优化使得异步函数运行更快：

- 移除了两个额外的微任务，以及
- 移除了 `throwaway` promise。

除此之外，通过 [*零成本异步堆栈跟踪*](https://bit.ly/v8-zero-cost-async-stack-traces) 提升了开发者的体验，零成本异步堆栈跟踪支持异步函数中的 `await` 和 `Promise.all()`。

同时我们还为 JavaScript 开发者提供了一些不错的性能建议：

- 优先使用 `async` 函数和 `await` 而非手写的 promise 代码，以及
- 使用 JavaScript 引擎提供的原生 promise 实现以利用优化技巧，例如避免 `await` 需要的两个微任务。
