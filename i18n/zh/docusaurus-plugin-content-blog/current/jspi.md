---
title: '介绍 WebAssembly JavaScript Promise 集成 API'
description: '本文介绍 JSPI 并提供一些简单的示例，帮助你开始使用它'
author: 'Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl'
date: 2024-07-01
tags:
  - WebAssembly
---
JavaScript Promise 集成 (JSPI) API 允许以假定 _同步_ 访问外部功能编写的 WebAssembly 应用程序能够在实际功能为 _异步_ 的环境中流畅运行。

<!--truncate-->
本文概述了 JSPI API 的核心功能、如何访问它、如何为其开发软件，并提供了一些示例供试用。

## ‘JSPI’的用途是什么？

异步 API 通过将操作的 _开始_ 和 _完成_ 分开来运行；后者通常在一段时间后才发生。最重要的是，应用程序在启动操作后继续执行；然后在操作完成时会收到通知。

例如，使用 `fetch` API，Web 应用程序可以访问与 URL 关联的内容；然而，`fetch` 函数不会直接返回抓取的结果，而是返回一个 `Promise` 对象。通过将一个 _回调_ 附加到该 `Promise` 对象上，重新建立抓取响应与原始请求之间的连接。回调函数可以检查响应并收集数据（如果数据存在）。

在许多情况下，C/C++（以及其他许多语言）应用程序最初是针对 _同步_ API 编写的。例如，Posix 的 `read` 函数在 I/O 操作完成之前不会完成：`read` 函数会 *阻塞*，直到读取完成。

然而，阻塞浏览器的主线程是不允许的；并且许多环境也不支持同步编程。结果就出现了应用程序开发者对于简单易用的 API 的需求与需要用异步代码构建 I/O 的生态系统之间的不匹配。这对现有的遗留应用尤其是个问题，因为这些应用的移植成本很高。

JSPI 是一种 API，用于弥合同步应用程序与异步 Web API 之间的差距。它通过拦截异步 Web API 函数返回的 `Promise` 对象并 _暂停_ WebAssembly 应用程序来实现。当异步 I/O 操作完成时，WebAssembly 应用程序会 _恢复_。这使得 WebAssembly 应用程序可以使用直线代码来执行异步操作并处理它们的结果。

关键是，使用 JSPI 对 WebAssembly 应用程序本身的修改非常少。

### JSPI 是如何工作的？

JSPI 通过拦截从 JavaScript 调用返回的 `Promise` 对象并暂停 WebAssembly 应用程序的主逻辑来工作。一个回调被附加到这个 `Promise` 对象上，当浏览器的事件循环任务运行器调用时，将恢复被暂停的 WebAssembly 代码。

此外，WebAssembly 导出被重新构造为返回一个 `Promise` 对象 &mdash; 而不是从导出原本返回的值。这个 `Promise` 对象成为 WebAssembly 应用程序返回的值：当 WebAssembly 代码被暂停时，[^first] 导出 `Promise` 对象就会作为进入 WebAssembly 的调用值返回。

[^first]: 如果 WebAssembly 应用程序多次被暂停，后续的暂停将返回到浏览器的事件循环，并且不会直接对 web 应用程序可见。

当原始调用完成时，导出 Promise 被解析：如果原始 WebAssembly 函数返回一个正常值，导出 `Promise` 对象会用该值（转换为 JavaScript 对象）被解析；如果抛出了异常，则导出 `Promise` 对象会被拒绝。

#### 包装导入和导出

这通过在 WebAssembly 模块实例化阶段 _包装_ 导入和导出来实现。函数包装器为正常的异步导入添加了暂停行为，并将暂停路由到 `Promise` 对象的回调。

没有必要将 WebAssembly 模块的所有导入和导出都进行包装。某些执行路径不涉及调用异步 API 的导出最好不要进行包装。同样，并非所有 WebAssembly 模块的导入都是异步 API 函数；这些导入也不应该进行包装。

当然，有许多内部机制支持这些功能实现；[^1] 但是 JSPI 并未改变 JavaScript 语言或 WebAssembly 本身。它的操作仅限于 JavaScript 和 WebAssembly 之间的边界。

从Web应用程序开发人员的角度来看，结果是一段代码，可以以类似于JavaScript中其他异步函数的方式参与到JavaScript的异步函数和Promise世界中。从WebAssembly开发人员的角度来看，这使他们能够使用同步API来构建应用程序，同时参与Web的异步生态系统。

### 预期性能

由于在挂起和恢复WebAssembly模块时使用的机制基本上是恒定时间的，我们预计使用JSPI不会带来高成本——特别是与其他基于转换的方法相比。

需要做恒定数量的工作来将异步API调用返回的`Promise`对象传播到WebAssembly。同样，当一个Promise被解析时，WebAssembly应用程序可以以恒定时间开销恢复运行。

然而，与浏览器中其他Promise风格的API一样，每当WebAssembly应用程序挂起时，它将不会再次‘被唤醒’，除非通过浏览器任务运行程序。这要求启动WebAssembly计算的JavaScript代码的执行本身返回到浏览器。

### 我可以使用JSPI挂起JavaScript程序吗？

JavaScript已经有一个完善的机制来表示异步计算：`Promise`对象和 `async` 函数表示法。JSPI旨在与这些很好地集成，但并不是为了取代它们。

### 今天我如何使用JSPI？

JSPI目前正在由W3C WebAssembly工作组进行标准化。截至本文撰写时，其已达到标准化过程的第3阶段，我们预计将在2024年底之前实现完全标准化。

JSPI可用于Linux、MacOS、Windows和ChromeOS上的Chrome，支持Intel和Arm平台，包括64位和32位系统。[^firefox]

[^firefox]: JSPI在Firefox Nightly中也可用：在 `about:config` 面板中开启 "`javascript.options.wasm_js_promise_integration`" 并重新启动。

今天可以通过两种方式使用JSPI：通过[原产地试验](https://developer.chrome.com/origintrials/#/register_trial/1603844417297317889) 和本地Chrome标志。要在本地测试，请在Chrome中访问`chrome://flags`，搜索“Experimental WebAssembly JavaScript Promise Integration (JSPI)”并勾选复选框。按照提示重新启动以生效。

您应该使用至少`126.0.6478.26`版本以获取最新版本的API。我们建议使用开发通道以确保应用任何稳定性更新。此外，如果您希望使用Emscripten生成WebAssembly（我们推荐这样做），您应该使用至少`3.1.61`的版本。

启用后，您应该能够运行使用JSPI的脚本。下面我们展示如何使用Emscripten在C/C++中生成一个适配JSPI的WebAssembly模块。如果您的应用程序涉及其他语言，例如未使用Emscripten，那么我们建议查看API的工作机制，您可以查看[提案](https://github.com/WebAssembly/js-promise-integration/blob/main/proposals/js-promise-integration/Overview.md)。

#### 限制

JSPI的Chrome实现已支持典型的使用场景。然而，它仍然被认为是实验性的，所以有一些局限需要注意：

- 需要使用命令行标志或参与原产地试验。
- 每次调用JSPI导出都会运行在固定大小的栈上。
- 调试支持有限。特别是，在开发工具面板中可能难以看到不同的事件发生。为JSPI应用程序提供更丰富的调试支持已经列入开发计划。

## 一个小的演示

为了看到这一切的运作，让我们尝试一个简单的例子。这个C程序以一种极其糟糕的方式计算斐波那契数：通过将加法交给JavaScript完成，更糟糕的是，甚至还使用了JavaScript `Promise` 对象：[译注2]

```c
long promiseFib(long x) {
 if (x == 0)
   return 0;
 if (x == 1)
   return 1;
 return promiseAdd(promiseFib(x - 1), promiseFib(x - 2));
}
// 承诺执行一个加法
EM_ASYNC_JS(long, promiseAdd, (long x, long y), {
  return Promise.resolve(x+y);
});
```

`promiseFib` 函数本身是斐波那契函数的一个简单递归版本。令人感兴趣的部分（从我们的角度来看）是定义`promiseAdd`，它使用JSPI完成了两个斐波那契数部分的加法操作。

我们使用了Emscripten宏 `EM_ASYNC_JS` 将 `promiseFib` 函数写成一个C程序中的JavaScript函数体。由于在JavaScript中加法通常并不涉及Promise，我们需要通过构造一个`Promise`来强制这一过程。

`EM_ASYNC_JS` 宏生成了所有必要的胶合代码，以便我们可以使用JSPI访问Promise的结果，就像它是一个普通函数一样。

要编译这个小演示，我们使用了Emscripten的 `emcc` 编译器：[译注4]

```sh
emcc -O3 badfib.c -o b.html -s JSPI
```

这将把我们的程序编译为一个可加载的HTML文件（`b.html`）。这里最特别的命令行选项是`-s JSPI`。它启用了使用JSPI与返回Promise的JavaScript导入接口的代码生成选项。

如果您将生成的`b.html`文件加载到Chrome中，那么您应该看到接近以下的输出内容：

```
fib(0) 0微秒 0微秒 0微秒
fib(1) 0微秒 0微秒 0微秒
fib(2) 0微秒 0微秒 3微秒
fib(3) 0微秒 0微秒 4微秒
…
fib(15) 0微秒 13微秒 1225微秒
```

这只是前15个斐波那契数的列表，每个斐波那契数后面是计算单个斐波那契数的平均时间（微秒）。每行的三个时间值分别表示纯WebAssembly计算、混合JavaScript/WebAssembly计算以及挂起版本计算所需的时间。

请注意，`fib(2)`是涉及访问Promise的最小计算，到计算`fib(15)`时，大约已进行了1000次`promiseAdd`调用。这表明JSPI函数的实际成本约为1微秒——虽然显著高于仅加两个整数的成本，但比典型访问外部I/O函数所需的毫秒时间要小得多。

## 使用JSPI懒加载代码

在下一个例子中，我们将研究JSPI的一种可能有些出人意料的用途：动态加载代码。其思路是`fetch`包含所需代码的模块，但推迟到第一次调用所需函数时再加载。

我们需要使用JSPI，因为像`fetch`这样的API本质上是异步的，但我们希望能够从应用程序中的任意位置调用它们——特别是，从尚不存在的函数调用中调用它们。

核心理念是用一个桩函数替换动态加载的函数；该桩函数首先加载缺失的函数代码，用加载的代码替换自身，然后使用原始参数调用新加载的代码。后续任何调用都直接转到加载的函数。此策略允许一种本质上透明的动态加载代码方法。

我们将要加载的模块相当简单，其中包含一个返回`42`的函数：

```c
// 这是一个简单的提供42的程序
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE long provide42(){
  return 42l;
}
```

这个代码位于一个名为`p42.c`的文件中，并使用Emscripten编译时没有构建任何‘额外功能’：

```sh
emcc p42.c -o p42.wasm --no-entry -Wl,--import-memory
```

`EMSCRIPTEN_KEEPALIVE`前缀是Emscripten的宏，它确保即使在代码中未使用函数`provide42`也不会被消除。结果是一个包含我们希望动态加载的函数的WebAssembly模块。

我们在`p42.c`的构建中添加的`-Wl,--import-memory`标志是为了确保它能访问主模块具有的相同内存。[^3]

为了动态加载代码，我们使用标准的`WebAssembly.instantiateStreaming` API：

```js
WebAssembly.instantiateStreaming(fetch('p42.wasm'));
```

这个表达式使用`fetch`定位编译好的Wasm模块，用`WebAssembly.instantiateStreaming`编译从fetch获得的结果并创建一个实例化的模块。`fetch`和`WebAssembly.instantiateStreaming`都会返回Promise；因此我们不能简单地访问结果并提取所需函数。相反，我们使用`EM_ASYNC_JS`宏将其包装成一种JSPI风格的导入：

```c
EM_ASYNC_JS(fooFun, resolveFun, (), {
  console.log('正在加载promise42');
  LoadedModule = (await WebAssembly.instantiateStreaming(fetch('p42.wasm'))).instance;
  return addFunction(LoadedModule.exports['provide42']);
});
```

注意`console.log`调用，我们将用它来确保我们的逻辑是正确的。

`addFunction`是Emscripten API的一部分，但为了确保它在运行时对我们可用，我们必须通知`emcc`它是所需的依赖项。我们通过以下行来实现：

```c
EM_JS_DEPS(funDeps, "$addFunction")
```

在我们想要动态加载代码的情况下，我们希望确保没有不必要地加载代码；在这个例子中，我们希望确保对`provide42`的后续调用不会触发重新加载。C语言有一个简单功能可以实现这一点：我们不直接调用`provide42`，而是通过一个跳板调用，让函数加载，然后在实际调用函数之前改变跳板以绕过自身。我们可以使用一个适当的函数指针来实现：

```c
extern fooFun get42;

long stub(){
  get42 = resolveFun();
  return get42();
}

fooFun get42 = stub;
```

从程序的其余部分的角度看，我们要调用的函数叫`get42`。它的初始实现是通过`stub`实现的，`stub`调用`resolveFun`以实际加载函数。在成功加载后，我们将get42改为指向新加载的函数，并调用它。

我们的主函数调用`get42`两次：[^6]

```c
int main() {
  printf("第一次调用p42() = %ld\n", get42());
  printf("第二次调用 = %ld\n", get42());
}
```

在浏览器中运行此代码的结果是如下日志：

```
正在加载 promise42
第一次调用 p42() = 42
第二次调用 = 42
```

注意，`正在加载 promise42` 这行只出现了一次，而 `get42` 实际上被调用了两次。

这个例子展示了 JSPI 可以以一些意想不到的方式使用：动态加载代码似乎与创建 promise 相距甚远。此外，还有其他方法将 WebAssembly 模块动态链接在一起；这并不代表对此问题的最终解决方案。

我们非常期待看到您能够利用这一新功能实现什么！加入 W3C WebAssembly 社区组的 [仓库](https://github.com/WebAssembly/js-promise-integration) 讨论。

## 附录 A：`badfib` 的完整代码


```c
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <emscripten.h>

typedef long (testFun)(long, int);

#define microSeconds (1000000)

long add(long x, long y) {
  return x + y;
}

// 请求 JS 执行加法
EM_JS(long, jsAdd, (long x, long y), {
  return x + y;
});

// promise 异步加法
EM_ASYNC_JS(long, promiseAdd, (long x, long y), {
  return Promise.resolve(x+y);
});

__attribute__((noinline))
long localFib(long x) {
 if (x==0)
   return 0;
 if (x==1)
   return 1;
 return add(localFib(x - 1), localFib(x - 2));
}

__attribute__((noinline))
long jsFib(long x) {
  if (x==0)
    return 0;
  if (x==1)
    return 1;
  return jsAdd(jsFib(x - 1), jsFib(x - 2));
}

__attribute__((noinline))
long promiseFib(long x) {
  if (x==0)
    return 0;
  if (x==1)
    return 1;
  return promiseAdd(promiseFib(x - 1), promiseFib(x - 2));
}

long runLocal(long x, int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += localFib(x);
  return temp / count;
}

long runJs(long x,int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += jsFib(x);
  return temp / count;
}

long runPromise(long x, int count) {
  long temp = 0;
  for(int ix = 0; ix < count; ix++)
    temp += promiseFib(x);
  return temp / count;
}

double runTest(testFun test, int limit, int count){
  clock_t start = clock();
  test(limit, count);
  clock_t stop = clock();
  return ((double)(stop - start)) / CLOCKS_PER_SEC;
}

void runTestSequence(int step, int limit, int count) {
  for (int ix = 0; ix <= limit; ix += step){
    double light = (runTest(runLocal, ix, count) / count) * microSeconds;
    double jsTime = (runTest(runJs, ix, count) / count) * microSeconds;
    double promiseTime = (runTest(runPromise, ix, count) / count) * microSeconds;
    printf("fib(%d) %gμs %gμs %gμs %gμs\n",ix, light, jsTime, promiseTime, (promiseTime - jsTime));
  }
}

EMSCRIPTEN_KEEPALIVE int main() {
  int step =  1;
  int limit = 15;
  int count = 1000;
  runTestSequence(step, limit, count);
  return 0;
}
```

## 附录 B：`u42.c` 和 `p42.c` 的代码

`u42.c` C 代码是我们动态加载示例的主要部分：

```c
#include <stdio.h>
#include <emscripten.h>

typedef long (*fooFun)();

// promise 异步生成一个函数
EM_ASYNC_JS(fooFun, resolveFun, (), {
  console.log('正在加载 promise42');
  LoadedModule = (await WebAssembly.instantiateStreaming(fetch('p42.wasm'))).instance;
  return addFunction(LoadedModule.exports['provide42']);
});

EM_JS_DEPS(funDeps, "$addFunction")

extern fooFun get42;

long stub() {
  get42 = resolveFun();
  return get42();
}

fooFun get42 = stub;

int main() {
  printf("第一次调用 p42() = %ld\n", get42());
  printf("第二次调用 = %ld\n", get42());
}
```

`p42.c` 代码是动态加载的模块。

```c
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE long provide42() {
  return 42l;
}
```

<!-- 脚注位于底部。 -->
## 注意事项

[^1]: 对技术细节感兴趣的读者可以参阅 [JSPI 的 WebAssembly 提案](https://github.com/WebAssembly/js-promise-integration/blob/main/proposals/js-promise-integration/Overview.md) 和 [V8 栈切换设计文档](https://docs.google.com/document/d/16Us-pyte2-9DECJDfGm5tnUpfngJJOc8jbj54HMqE9Y)。

[^2]: 注意：附录 A 中包含完整的程序。

[^3]: 我们的具体示例并不需要此标记，但对较大的程序可能需要。

[^4]: 注意：您需要一个版本号 ≥ 3.1.61 的 Emscripten。

[^6]: 附录 B 中展示了完整的程序。
