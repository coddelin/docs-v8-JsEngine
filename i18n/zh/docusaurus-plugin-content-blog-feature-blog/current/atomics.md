---
title: '`Atomics.wait`, `Atomics.notify`, `Atomics.waitAsync`
author: "[Marja Hölttä](https://twitter.com/marjakh), 一个非阻塞的博主"
avatars:
  - marja-holtta
date: 2020-09-24
tags:
  - ECMAScript
  - ES2020
  - Node.js 16
description: "Atomics.wait和Atomics.notify是底层同步原语，适用于实现例如互斥锁。Atomics.wait仅适用于工作线程。V8版本8.7现已支持非阻塞版本Atomics.waitAsync，也可用于主线程。"
tweet: "1309118447377358848"
---
[`Atomics.wait`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/wait) 和 [`Atomics.notify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/notify) 是底层同步原语，适用于实现互斥锁和其他同步手段。然而，由于`Atomics.wait`是阻塞的，无法在主线程上调用（尝试这样做会抛出 `TypeError`）。

<!--truncate-->
从版本8.7开始，V8支持非阻塞版本[`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md)，也可用于主线程。

在本文中，我们解释如何使用这些底层API来实现一个可以在工作线程同步使用，也可以在主线程异步使用的互斥锁。

`Atomics.wait` 和 `Atomics.waitAsync` 接受以下参数：

- `buffer`: 一个由 `SharedArrayBuffer` 支持的 `Int32Array` 或 `BigInt64Array`
- `index`: 数组内的有效索引
- `expectedValue`: 我们期望存在于由 `(buffer, index)` 描述的内存位置的值
- `timeout`: 超时时间，单位为毫秒（可选，默认值为 `Infinity`）

`Atomics.wait` 的返回值是一个字符串。如果内存位置不包含期望值，`Atomics.wait` 会立即返回值 `not-equal`。否则，线程会被阻塞，直到另一个线程在相同内存位置调用 `Atomics.notify` 或达到超时时间。在前一种情况下，`Atomics.wait` 返回值为 `ok`，而在后一种情况下返回值为 `timed-out`。

`Atomics.notify` 接受以下参数：

- 一个由 `SharedArrayBuffer` 支持的 `Int32Array` 或 `BigInt64Array`
- 一个数组内部有效的索引
- 要通知的等待者数量（可选，默认值为 `Infinity`）

它按照FIFO顺序通知在由 `(buffer, index)` 描述的内存位置等待的等待者。如果有多个与同一位置相关联的 `Atomics.wait` 调用或 `Atomics.waitAsync` 调用，它们都在同一个FIFO队列中。

与 `Atomics.wait` 相比，`Atomics.waitAsync` 总是立即返回。返回值如下之一：

- `{ async: false, value: 'not-equal' }`（如果内存位置未包含期望值）
- `{ async: false, value: 'timed-out' }`（仅在立即超时0时）
- `{ async: true, value: promise }`

该promise稍后可能会以字符串值`ok`（如果在相同内存位置调用了`Atomics.notify`）或`timed-out`（如果达到超时时间）解析。Promise绝不会被拒绝。

以下示例展示了`Atomics.waitAsync`的基本用法：

```js
const sab = new SharedArrayBuffer(16);
const i32a = new Int32Array(sab);
const result = Atomics.waitAsync(i32a, 0, 0, 1000);
//                                     |  |  ^ 超时（可选）
//                                     |  ^ 期望值
//                                     ^ 索引

if (result.value === 'not-equal') {
  // SharedArrayBuffer中的值不是期望值。
} else {
  result.value instanceof Promise; // true
  result.value.then(
    (value) => {
      if (value == 'ok') { /* 已通知 */ }
      else { /* 值为 'timed-out' */ }
    });
}

// 在该线程或其他线程中：
Atomics.notify(i32a, 0);
```

接下来，我们将展示如何实现一个可以同步和异步使用的互斥锁。同步版本的互斥锁实现已在例如[本文](https://blogtitle.github.io/using-javascript-sharedarraybuffers-and-atomics/) 中讨论过。

在此示例中，我们未在`Atomics.wait`和`Atomics.waitAsync`中使用timeout参数。此参数可用于实现具有超时的条件变量。

我们的互斥锁类`AsyncLock`基于`SharedArrayBuffer`操作，并实现以下方法：

- `lock` — 阻塞线程直到我们能够锁定互斥锁（仅适用于工作线程）
- `unlock` — 解锁互斥锁（`lock`的对应方法）
- `executeLocked(callback)` — 非阻塞锁定，可由主线程使用；计划在锁定后执行`callback`

我们来看看如何实现这些功能。类定义包括常量和构造函数，构造函数以`SharedArrayBuffer`作为参数。

```js
class AsyncLock {
  static INDEX = 0;
  static UNLOCKED = 0;
  static LOCKED = 1;

  constructor(sab) {
    this.sab = sab;
    this.i32a = new Int32Array(sab);
  }

  lock() {
    /* … */
  }

  unlock() {
    /* … */
  }

  executeLocked(f) {
    /* … */
  }
}
```

这里，`i32a[0]`包含值`LOCKED`或`UNLOCKED`之一。它也是`Atomics.wait`和`Atomics.waitAsync`的等待位置。`AsyncLock`类确保以下不变量:

1. 如果`i32a[0] == LOCKED`，且线程开始在`i32a[0]`等待（通过`Atomics.wait`或`Atomics.waitAsync`)，它最终会被通知。
1. 在收到通知后，线程尝试获取锁。如果获取了锁，它将在释放锁时再次通知。

## 同步锁与解锁

接下来我们展示只能从工作线程调用的阻塞式`lock`方法:

```js
lock() {
  while (true) {
    const oldValue = Atomics.compareExchange(this.i32a, AsyncLock.INDEX,
                        /* 旧值 >>> */  AsyncLock.UNLOCKED,
                        /* 新值 >>> */  AsyncLock.LOCKED);
    if (oldValue == AsyncLock.UNLOCKED) {
      return;
    }
    Atomics.wait(this.i32a, AsyncLock.INDEX,
                 AsyncLock.LOCKED); // <<< 初始预期值
  }
}
```

当线程调用`lock()`时，它首先尝试通过使用`Atomics.compareExchange`将锁状态从`UNLOCKED`更改为`LOCKED`来获取锁。`Atomics.compareExchange`尝试以原子方式进行状态更改，并返回内存位置的原始值。如果原始值为`UNLOCKED`，我们知道状态更改成功，线程获取了锁，不需要其他操作。

如果`Atomics.compareExchange`未能更改锁状态，则另一个线程必须持有锁。因此，该线程尝试调用`Atomics.wait`以等待其他线程释放锁。如果内存位置仍然包含预期值（在这种情况下为`AsyncLock.LOCKED`），调用`Atomics.wait`将阻塞线程，并且只有当另一个线程调用`Atomics.notify`时，`Atomics.wait`调用才会返回。

`unlock`方法将锁设置为`UNLOCKED`状态，并调用`Atomics.notify`，唤醒一个等待锁的线程。状态更改应始终成功，因为此线程持有锁，而其他线程在此期间不应该调用`unlock()`。

```js
unlock() {
  const oldValue = Atomics.compareExchange(this.i32a, AsyncLock.INDEX,
                      /* 旧值 >>> */  AsyncLock.LOCKED,
                      /* 新值 >>> */  AsyncLock.UNLOCKED);
  if (oldValue != AsyncLock.LOCKED) {
    throw new Error('尝试解锁时未持有互斥锁');
  }
  Atomics.notify(this.i32a, AsyncLock.INDEX, 1);
}
```

以下是简单情况：锁是空闲的，线程T1通过使用`Atomics.compareExchange`更改锁状态来获取锁。线程T2尝试通过调用`Atomics.compareExchange`获取锁，但未能成功更改锁状态。然后T2调用`Atomics.wait`，阻塞线程。某个时候，T1释放锁并调用`Atomics.notify`。这使得T2中的`Atomics.wait`调用返回`'ok'`，唤醒T2。然后T2再次尝试获取锁，并成功。

还有2种可能的边界情况——这些说明了为什么`Atomics.wait`和`Atomics.waitAsync`需要在索引处检查特定值：

- T1持有锁，T2尝试获取锁。首先，T2尝试以`Atomics.compareExchange`更改锁状态，但未成功。但在T2调用`Atomics.wait`之前，T1释放了锁。当T2调用`Atomics.wait`时，它会立即返回值`'not-equal'`。在这种情况下，T2继续下一次循环迭代，尝试再次获取锁。
- T1持有锁，T2正在使用`Atomics.wait`等待。T1释放锁——T2被唤醒（`Atomics.wait`调用返回），并尝试使用`Atomics.compareExchange`获取锁，但另一个线程T3抢先获取了锁。因此，调用`Atomics.compareExchange`未能获取锁，T2再次调用`Atomics.wait`，阻塞直到T3释放锁。

由于后一种边界情况，互斥锁并不“公平”。可能出现的情况是T2一直在等待锁释放，但T3立即获取了锁。更实际的锁实现可能会使用多个状态来区分“锁定”和“锁定但存在争用”。

## 异步锁

非阻塞式`executeLocked`方法可以从主线程调用，而阻塞式`lock`方法不能。它获取一个回调函数作为其唯一参数，并安排回调在成功获取锁后执行。

```js
executeLocked(f) {
  const self = this;

  async function tryGetLock() {
    while (true) {
      const oldValue = Atomics.compareExchange(self.i32a, AsyncLock.INDEX,
                          /* 旧值 >>> */  AsyncLock.UNLOCKED,
                          /* 新值 >>> */  AsyncLock.LOCKED);
      if (oldValue == AsyncLock.UNLOCKED) {
        f();
        self.unlock();
        return;
      }
      const result = Atomics.waitAsync(self.i32a, AsyncLock.INDEX,
                                       AsyncLock.LOCKED);
                                   //  ^ 开始时的期望值
      await result.value;
    }
  }

  tryGetLock();
}
```

内部函数 `tryGetLock` 试图首先通过 `Atomics.compareExchange` 获取锁，如前所述。如果成功更改了锁状态，它可以执行回调、解锁并返回。

如果 `Atomics.compareExchange` 未能获取锁，我们需要在锁可能变为可用时重新尝试。我们不能阻塞并等待锁变为可用——相反，我们使用 `Atomics.waitAsync` 以及它返回的 Promise 来安排新的尝试。

如果我们成功启动了 `Atomics.waitAsync`，当占有锁的线程执行 `Atomics.notify` 时，返回的 Promise 会被解析。然后，等待锁的线程会像之前一样再次尝试获取锁。

异步版本中也可能存在同样的边界情况（在 `Atomics.compareExchange` 调用和 `Atomics.waitAsync` 调用之间，锁被释放，或者在 Promise 解析与 `Atomics.compareExchange` 调用之间，锁再次被占有），因此代码需要以健壮的方式处理它们。

## 结论

在本文中，我们展示了如何使用同步原语 `Atomics.wait`、`Atomics.waitAsync` 和 `Atomics.notify` 来实现一个可同时用于主线程和工作线程的互斥锁。

## 功能支持

### `Atomics.wait` 和 `Atomics.notify`

<feature-support chrome="68"
                 firefox="78"
                 safari="无"
                 nodejs="8.10.0"
                 babel="无"></feature-support>

### `Atomics.waitAsync`

<feature-support chrome="87"
                 firefox="无"
                 safari="无"
                 nodejs="16"
                 babel="无"></feature-support>
