---
title: &apos;`Atomics.wait`, `Atomics.notify`, `Atomics.waitAsync`&apos;
author: &apos;[Marja Hölttä](https://twitter.com/marjakh), 非阻塞博客作者&apos;
avatars:
  - marja-holtta
date: 2020-09-24
tags:
  - ECMAScript
  - ES2020
  - Node.js 16
description: &apos;Atomics.wait 和 Atomics.notify 是低層同步原型，適合用於實現例如互斥鎖。Atomics.wait 只能在 worker 執行緒中使用。V8 版本 8.7 現在支援非阻塞版，Atomics.waitAsync，也可以在主執行緒上使用。&apos;
tweet: &apos;1309118447377358848&apos;
---
[`Atomics.wait`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/wait) 和 [`Atomics.notify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/notify) 是低層同步原型，適合用於實現互斥鎖及其他同步方式。然而，由於 `Atomics.wait` 是阻塞操作，因此無法在主執行緒上呼叫（嘗試這樣做會拋出 `TypeError`）。

<!--truncate-->
從版本 8.7 開始，V8 支援非阻塞版 [`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md)，同樣可以在主執行緒使用。

在本文中，我們解釋如何使用這些低層 API 實現一個同步（用於 worker 執行緒）和非同步（用於 worker 執行緒或主執行緒）都可工作的互斥鎖。

`Atomics.wait` 和 `Atomics.waitAsync` 接收以下參數：

- `buffer`: 一個由 `SharedArrayBuffer` 支援的 `Int32Array` 或 `BigInt64Array`
- `index`: 陣列中的有效索引
- `expectedValue`: 我們預期在記憶體位置 `(buffer, index)` 中存在的值
- `timeout`: 毫秒級的超時（可選，默認為 `Infinity`）

`Atomics.wait` 的返回值是一個字串。如果記憶體位置不包含預期的值，`Atomics.wait` 立即返回值 `&apos;not-equal&apos;`。否則，執行緒會被阻塞，直到其他執行緒使用相同的記憶體位置呼叫 `Atomics.notify` 或超時期限到。前者情況下，`Atomics.wait` 返回值 `&apos;ok&apos;`，後者情況下，`Atomics.wait` 返回值 `&apos;timed-out&apos;`。

`Atomics.notify` 接收以下參數：

- 一個由 `SharedArrayBuffer` 支援的 `Int32Array` 或 `BigInt64Array`
- 陣列中的有效索引
- 要通知的等待者數量（可選，默認為 `Infinity`）

它按 FIFO 順序通知指定數量的等待者，等待記憶體位置 `(buffer, index)`。如果同一位置有多個掛起的 `Atomics.wait` 或 `Atomics.waitAsync` 呼叫，它們都在同一個 FIFO 隊列中。

與 `Atomics.wait` 相反，`Atomics.waitAsync` 總是立即返回。返回值如下之一：

- `{ async: false, value: &apos;not-equal&apos; }`（如果記憶體位置不包含預期值）
- `{ async: false, value: &apos;timed-out&apos; }`（僅適用於立即超時 0）
- `{ async: true, value: promise }`

該 Promise 可能後來被解析為字串值 `&apos;ok&apos;`（如果在相同記憶體位置呼叫了 `Atomics.notify`）或 `&apos;timed-out&apos;`（如果超時期限到）。Promise 不會被拒絕。

以下示例演示 `Atomics.waitAsync` 的基本用法：

```js
const sab = new SharedArrayBuffer(16);
const i32a = new Int32Array(sab);
const result = Atomics.waitAsync(i32a, 0, 0, 1000);
//                                     |  |  ^ timeout (opt)
//                                     |  ^ expected value
//                                     ^ index

if (result.value === &apos;not-equal&apos;) {
  // SharedArrayBuffer 中的值不是預期的。
} else {
  result.value instanceof Promise; // true
  result.value.then(
    (value) => {
      if (value == &apos;ok&apos;) { /* 已通知 */ }
      else { /* 值為 &apos;timed-out&apos; */ }
    });
}

// 在此執行緒中或另一個執行緒中：
Atomics.notify(i32a, 0);
```

接下來，我們將展示如何實現一個可同步及非同步使用的互斥鎖。同步版互斥鎖的實現已在過往討論，例例如 [此部落格文章](https://blogtitle.github.io/using-javascript-sharedarraybuffers-and-atomics/)。

在示例中，我們未在 `Atomics.wait` 和 `Atomics.waitAsync` 中使用超時參數。該參數可用於實現具有超時的條件變數。

我們的互斥鎖類別 `AsyncLock`，基於 `SharedArrayBuffer` 並實現以下方法：

- `lock` — 阻塞執行緒直到我們能夠鎖定互斥鎖（僅能在工作執行緒使用）
- `unlock` — 解鎖互斥鎖（`lock` 的對應操作）
- `executeLocked(callback)` — 非阻塞鎖，可被主執行緒使用；安排 `callback` 在管理到鎖後執行

讓我們來看看如何實現這些功能。類定義包含常量和一個構造函數，該構造函數將 `SharedArrayBuffer` 作為參數。

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

這裡的 `i32a[0]` 包含的值是 `LOCKED` 或 `UNLOCKED`。它同時也是 `Atomics.wait` 和 `Atomics.waitAsync` 的等待位置。`AsyncLock` 類確保了以下的不變性：

1. 如果 `i32a[0] == LOCKED`，並且一個線程開始在 `i32a[0]` 上等待（通過 `Atomics.wait` 或 `Atomics.waitAsync`），它最終會收到通知。
2. 在被通知後，線程嘗試獲取鎖。如果成功獲取鎖，它在釋放時會再次通知。

## 同步鎖定與解鎖

接下來我們展示阻塞的 `lock` 方法，它只能由工作線程調用：

```js
lock() {
  while (true) {
    const oldValue = Atomics.compareExchange(this.i32a, AsyncLock.INDEX,
                        /* 舊值 >>> */  AsyncLock.UNLOCKED,
                        /* 新值 >>> */  AsyncLock.LOCKED);
    if (oldValue == AsyncLock.UNLOCKED) {
      return;
    }
    Atomics.wait(this.i32a, AsyncLock.INDEX,
                 AsyncLock.LOCKED); // <<< 開始時期望的值
  }
}
```

當一個線程調用 `lock()` 時，首先它嘗試使用 `Atomics.compareExchange` 將鎖的狀態從 `UNLOCKED` 更改為 `LOCKED` 來獲取鎖。`Atomics.compareExchange` 嘗試以原子方式進行狀態更改，並返回內存位置的原始值。如果原始值是 `UNLOCKED`，我們知道狀態更改成功，該線程獲取了鎖。不需要再做其他事情。

如果 `Atomics.compareExchange` 沒有成功更改鎖的狀態，則可能是另一個線程持有了鎖。於是該線程嘗試通過 `Atomics.wait` 等待另一個線程釋放鎖。如果內存位置仍持有預期值（在此情況下為 `AsyncLock.LOCKED`），調用 `Atomics.wait` 會阻塞該線程，並且 `Atomics.wait` 調用僅在另一個線程調用 `Atomics.notify` 時返回。

`unlock` 方法將鎖設置為 `UNLOCKED` 狀態，並調用 `Atomics.notify` 喚醒一個正在等待鎖的線程。狀態更改總是預期會成功，因為此線程持有鎖，同時其他人不應該在此期間調用 `unlock()`。

```js
unlock() {
  const oldValue = Atomics.compareExchange(this.i32a, AsyncLock.INDEX,
                      /* 舊值 >>> */  AsyncLock.LOCKED,
                      /* 新值 >>> */  AsyncLock.UNLOCKED);
  if (oldValue != AsyncLock.LOCKED) {
    throw new Error(&apos;嘗試解鎖但未持有互斥鎖&apos;);
  }
  Atomics.notify(this.i32a, AsyncLock.INDEX, 1);
}
```

簡單的情況如下：鎖是空閒的，線程 T1 通過使用 `Atomics.compareExchange` 更改鎖狀態來獲取它。線程 T2 嘗試通過調用 `Atomics.compareExchange` 獲取鎖，但未成功改變鎖狀態。於是 T2 調用 `Atomics.wait`，線程被阻塞。最終，T1 釋放鎖並調用 `Atomics.notify`。這使得 T2 中的 `Atomics.wait` 調用返回 `&apos;ok&apos;`，喚醒了 T2。然後 T2 再次嘗試獲取鎖，這次成功了。

還有 2 種可能的邊界情況 —— 它們展示了 `Atomics.wait` 和 `Atomics.waitAsync` 在指定索引處檢查特定值的原因：

- T1 持有鎖，T2 嘗試獲取它。首先，T2 嘗試通過 `Atomics.compareExchange` 改變鎖狀態，但未成功。但是在 T2 調用 `Atomics.wait` 之前，T1 釋放了鎖。當 T2 調用 `Atomics.wait` 時，它立即返回值 `&apos;not-equal&apos;`。在這種情況下，T2 繼續下一次循環迭代，嘗試再次獲取鎖。
- T1 持有鎖，T2 使用 `Atomics.wait` 等待它。T1 釋放鎖 —— T2 被喚醒（`Atomics.wait` 調用返回），並嘗試通過 `Atomics.compareExchange` 獲取鎖，但另一個線程 T3 比它更快，已經獲得了鎖。因此，`Atomics.compareExchange` 無法成功獲取鎖，T2 再次調用 `Atomics.wait`，阻塞直到 T3 釋放鎖。

由於後一種邊界情況，互斥鎖並不“公平”。有可能 T2 一直在等待鎖被釋放，但 T3 直接獲得了鎖。一個更現實的鎖實現可能會使用多種狀態來區分“加鎖”和“因競爭而加鎖”。

## 異步鎖

非阻塞的 `executeLocked` 方法可從主線程調用，不同於阻塞的 `lock` 方法。它僅接收一個回調函數作為參數，並在成功獲取鎖後執行該回調。

```js
executeLocked(f) {
  const self = this;

  async function tryGetLock() {
    while (true) {
      const oldValue = Atomics.compareExchange(self.i32a, AsyncLock.INDEX,
                          /* 舊數值 >>> */  AsyncLock.UNLOCKED,
                          /* 新數值 >>> */  AsyncLock.LOCKED);
      if (oldValue == AsyncLock.UNLOCKED) {
        f();
        self.unlock();
        return;
      }
      const result = Atomics.waitAsync(self.i32a, AsyncLock.INDEX,
                                       AsyncLock.LOCKED);
                                   //  ^ 開始時的期望數值
      await result.value;
    }
  }

  tryGetLock();
}
```

內部函數 `tryGetLock` 首先嘗試使用 `Atomics.compareExchange` 獲取鎖，如之前一樣。如果成功改變鎖的狀態，它就可以執行回調函數，解鎖並返回。

如果 `Atomics.compareExchange` 未能獲取鎖，我們需要在鎖可能空閒時再次嘗試。我們不能阻塞並等待鎖變為空閒——相反，我們使用 `Atomics.waitAsync` 和它返回的 Promise 來安排重新嘗試。

如果我們成功啟動了 `Atomics.waitAsync`，返回的 Promise 會在持有鎖的執行緒調用 `Atomics.notify` 時解析。然後等待鎖的執行緒會像之前一樣再次嘗試獲取鎖。

同樣的邊界情況（在調用 `Atomics.compareExchange` 和 `Atomics.waitAsync` 之間鎖被釋放，以及在 Promise 解析和調用 `Atomics.compareExchange` 之間鎖再次被獲取）也可能在異步版本中發生，因此代碼必須以穩健的方式處理這些情況。

## 結論

在本文中，我們展示了如何使用同步原語 `Atomics.wait`、`Atomics.waitAsync` 和 `Atomics.notify` 來實現一個可以在主執行緒和工作執行緒中使用的互斥鎖。

## 功能支持

### `Atomics.wait` 和 `Atomics.notify`

<feature-support chrome="68"
                 firefox="78"
                 safari="無"
                 nodejs="8.10.0"
                 babel="無"></feature-support>

### `Atomics.waitAsync`

<feature-support chrome="87"
                 firefox="無"
                 safari="無"
                 nodejs="16"
                 babel="無"></feature-support>
