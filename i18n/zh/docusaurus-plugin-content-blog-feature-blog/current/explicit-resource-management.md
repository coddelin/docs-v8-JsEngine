---
title: "JavaScript 的新超能力：显式资源管理"
author: "Rezvan Mahdavi Hezaveh"
avatars: 
  - "rezvan-mahdavi-hezaveh"
date: 2025-05-09
tags: 
  - ECMAScript
description: "显式资源管理提案使开发者能够显式管理资源的生命周期。"
tweet: ""
---

显式资源管理（Explicit Resource Management）提案引入了一种确定性方法，用于显式管理像文件句柄、网络连接等资源的生命周期。这一提案包括以下语言新增功能：`using` 和 `await using` 声明，自动在资源超出作用域时调用 dispose 方法；`[Symbol.dispose]()` 和 `[Symbol.asyncDispose]()` 符号用于清理操作；两个新的全局对象 `DisposableStack` 和 `AsyncDisposableStack` 作为容器来聚合可清理的资源；以及一种新的错误类型 `SuppressedError`（同时包含最近抛出的错误以及被抑制的错误），用于处理在资源清理期间发生错误而可能掩盖从代码主体或其他资源清理中抛出的现有错误的场景。这些新增功能使开发者能够通过提供对资源清理的精细控制，编写更强健、高效且可维护的代码。

<!--truncate-->
## `using` 和 `await using` 声明

显式资源管理提案的核心在于 `using` 和 `await using` 声明。`using` 声明专为同步资源设计，确保在声明该资源的作用域退出时调用 `[Symbol.dispose]()` 方法。对于异步资源，`await using` 声明工作原理类似，确保在调用 `[Symbol.asyncDispose]()` 方法后等待其结果，从而支持异步清理操作。这种区分使开发者可以可靠地管理同步和异步资源，防止内存泄漏并提高代码整体质量。`using` 和 `await using` 关键词可在 `{}` 大括号内使用（例如代码块、for 循环和函数主体内），但不能在顶层使用。

例如，在使用 [`ReadableStreamDefaultReader`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader) 时，关键在于调用 `reader.releaseLock()` 来解锁流，以便其它地方可以使用该流。然而，错误处理引入了一个常见问题：如果在读取过程中发生错误，并且在错误传播之前未调用 `releaseLock()`，该流将保持锁定状态。让我们从一个简单的例子开始：

```javascript
let responsePromise = null;

async function readFile(url) {  
    if (!responsePromise) {
        // 只有当我们还没有 Promise 时才进行 fetch
        responsePromise = fetch(url);
    }
    const response = await responsePromise;
    if (!response.ok) {
      throw new Error(`HTTP 错误！状态码：${response.status}`);
    }
    const processedData = await processData(response);

    // 使用 processedData 做某些事情
    ...
 }

async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;
    let processedData;
    
    while (!done) {
        ({ done, value } = await reader.read());
        if (value) {
            // 处理数据并将结果保存到 processedData
            ...
            // 这里抛出了一个错误！
        }
    }
    
    // 因为错误在这行代码之前抛出，流保持锁定。
    reader.releaseLock(); 

    return processedData;
  }
 
 readFile('https://example.com/largefile.dat');
```

因此，开发者在使用流时必须有 `try...finally` 块，并将 `reader.releaseLock()` 放在 `finally` 中。这种模式确保 `reader.releaseLock()` 总是被调用。

```javascript
async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;
    let processedData;
    
    try {
        while (!done) {
            ({ done, value } = await reader.read());
            if (value) {
                // 处理数据并将结果保存到 processedData
                ...
                // 这里抛出了一个错误！
            }
        }
    } finally {
        // 流上的 reader 锁将始终被释放。
        reader.releaseLock();
    }

    return processedData;
  }
 
 readFile('https://example.com/largefile.dat');
```

写此代码的另一个方法是创建一个可释放的资源对象 `readerResource`，它包含读取器（`response.body.getReader()`）和 `[Symbol.dispose]()` 方法，该方法调用 `this.reader.releaseLock()`。`using` 声明确保当代码块退出时会调用 `readerResource[Symbol.dispose]()`，无需再手动记住调用 `releaseLock`，因为 `using` 声明会自动处理此事。未来可能会在像流这样的 Web API 中集成 `[Symbol.dispose]` 和 `[Symbol.asyncDispose]`，这样开发者无需手动编写包装对象。

```javascript
 async function processData(response) {
    const reader = response.body.getReader();
    let done = false;
    let value;

    // 将读取器包装在一个可释放资源中
    using readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
        },
    };
    const { reader } = readerResource;

    let done = false;
    let value;
    let processedData;
    while (!done) {
        ({ done, value } = await reader.read());
        if (value) {
            // 处理数据并将结果保存在 processedData 中
            ...
            // 此处抛出了一个错误！
        }
    }
    return processedData;
  }
 // readerResource[Symbol.dispose]() 会被自动调用。

 readFile('https://example.com/largefile.dat');
```

## `DisposableStack` 和 `AsyncDisposableStack`

为了进一步方便管理多个可释放资源，该提案引入了 `DisposableStack` 和 `AsyncDisposableStack`。这些基于堆栈的结构允许开发者将多个资源分组并协调释放。当堆栈被同步或异步释放时，这些资源会按照添加的相反顺序被释放，以确保正确处理它们之间的依赖关系。这在处理涉及多个相关资源的复杂场景时简化了清理过程。这两种结构提供了 `use()`、`adopt()` 和 `defer()` 等方法用于添加资源或清理操作，还有 `dispose()` 或 `asyncDispose()` 方法用于触发清理。`DisposableStack` 和 `AsyncDisposableStack` 分别实现了 `[Symbol.dispose]()` 和 `[Symbol.asyncDispose]()`，因此可以与 `using` 和 `await using` 关键字一起使用。它们为在定义范围内管理多个资源的释放提供了强有力的解决方案。

让我们看看每个方法的示例：

`use(value)` 将资源添加到堆栈顶部。

```javascript
{
    const readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
            console.log('读取器锁已释放。');
        },
    };
    using stack = new DisposableStack();
    stack.use(readerResource);
}
// 读取器锁已释放。
```

`adopt(value, onDispose)` 添加一个不可释放的资源和一个清理回调到堆栈顶部。

```javascript
{
    using stack = new DisposableStack();
    stack.adopt(
      response.body.getReader(), reader = > {
        reader.releaseLock();
        console.log('读取器锁已释放。');
      });
}
// 读取器锁已释放。
```

`defer(onDispose)` 添加一个清理回调到堆栈顶部。对于没有关联资源的清理操作，这非常有用。

```javascript
{
    using stack = new DisposableStack();
    stack.defer(() => console.log("完成。"));
}
// 完成。
```

`move()` 将当前堆栈中所有资源移到一个新的 `DisposableStack` 中。这在需要将资源的所有权转移到代码的另一部分时非常有用。

```javascript
{
    using stack = new DisposableStack();
    stack.adopt(
      response.body.getReader(), reader = > {
        reader.releaseLock();
        console.log('读取器锁已释放。');
      });
    using newStack = stack.move();
}
// 此时只有 newStack 存在，且其中的资源将被释放。
// 读取器锁已释放。
```

`dispose()` 在 DisposableStack 中，`disposeAsync()` 在 AsyncDisposableStack 中，用于释放该对象内的资源。

```javascript
{
    const readerResource = {
        reader: response.body.getReader(),
        [Symbol.dispose]() {
            this.reader.releaseLock();
            console.log('读取器锁已释放。');
        },
    };
    let stack = new DisposableStack();
    stack.use(readerResource);
    stack.dispose();
}
// 读取器锁已释放。
```

## 可用性

显式资源管理已在 Chromium 134 和 V8 v13.8 中发布。

## 显式资源管理支持

<feature-support chrome="134 https://chromestatus.com/feature/5071680358842368"
                 firefox="134 (nightly) https://bugzilla.mozilla.org/show_bug.cgi?id=1927195"
                 safari="不支持 https://bugs.webkit.org/show_bug.cgi?id=248707" 
                 nodejs="不支持"
                 babel="支持 https://github.com/zloirock/core-js#explicit-resource-management"></feature-support>
