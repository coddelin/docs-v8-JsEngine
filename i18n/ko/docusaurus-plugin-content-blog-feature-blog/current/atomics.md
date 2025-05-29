---
title: '`Atomics.wait`, `Atomics.notify`, `Atomics.waitAsync`'
author: '[Marja Hölttä](https://twitter.com/marjakh), a non-blocking blogger'
avatars:
  - marja-holtta
date: 2020-09-24
tags:
  - ECMAScript
  - ES2020
  - Node.js 16
description: 'Atomics.wait와 Atomics.notify는 예를 들어 뮤텍스를 구현하는 데 유용한 저수준 동기화 프리미티브입니다. Atomics.wait는 워커 스레드에서만 사용할 수 있습니다. V8 버전 8.7부터는 비블로킹 버전인 Atomics.waitAsync를 지원하며, 메인 스레드에서도 사용할 수 있습니다.'
tweet: '1309118447377358848'
---
[`Atomics.wait`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/wait)와 [`Atomics.notify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/notify)는 뮤텍스 및 기타 동기화 수단을 구현하는 데 유용한 저수준 동기화 프리미티브입니다. 하지만 `Atomics.wait`는 블로킹이기 때문에 메인 스레드에서 호출할 수 없습니다(시도 시 `TypeError`가 발생합니다).

<!--truncate-->
V8의 버전 8.7부터는 비블로킹 버전인 [`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md)를 지원하며, 메인 스레드에서도 사용할 수 있습니다.

이 게시물에서는 워커 스레드에서 동기적으로, 그리고 워커 스레드 또는 메인 스레드에서 비동기적으로 작동하는 뮤텍스를 구현하기 위해 이러한 저수준 API를 사용하는 방법에 대해 설명합니다.

`Atomics.wait`와 `Atomics.waitAsync`는 다음 매개변수를 받습니다:

- `buffer`: `SharedArrayBuffer`를 기반으로 하는 `Int32Array` 또는 `BigInt64Array`
- `index`: 배열 내의 유효한 인덱스
- `expectedValue`: `(buffer, index)`로 설명되는 메모리 위치에 존재하기를 기대하는 값
- `timeout`: 밀리초 단위의 시간 초과 (선택 사항, 기본값은 `Infinity`)

`Atomics.wait`의 반환 값은 문자열입니다. 메모리 위치에 예상 값이 없으면, `Atomics.wait`는 즉시 `not-equal` 값을 반환합니다. 그렇지 않으면, 다른 스레드가 동일한 메모리 위치에서 `Atomics.notify`를 호출하거나 지정한 시간 초과가 도달할 때까지 스레드가 블로킹됩니다. 전자의 경우, `Atomics.wait`는 `ok` 값을 반환하며, 후자의 경우 `timed-out` 값을 반환합니다.

`Atomics.notify`는 다음 매개변수를 받습니다:

- `SharedArrayBuffer`를 기반으로 하는 `Int32Array` 또는 `BigInt64Array`
- 배열 내에서 유효한 인덱스
- 통지할 대기자 수 (선택 사항, 기본값은 `Infinity`)

It notifies the given amount of waiters, in FIFO order, waiting on the memory location described by `(buffer, index)`. If there are several pending `Atomics.wait` calls or `Atomics.waitAsync` calls related to the same location, they are all in the same FIFO queue.

대조적으로, `Atomics.waitAsync`는 항상 즉시 반환됩니다. 반환 값은 다음 중 하나입니다:

- `{ async: false, value: 'not-equal' }` (메모리 위치에 예상 값이 없는 경우)
- `{ async: false, value: 'timed-out' }` (즉각적인 타임아웃 0의 경우에만)
- `{ async: true, value: promise }`

Promise는 이후에 문자열 값 `ok`로 해결될 수 있습니다(`Atomics.notify`가 동일한 메모리 위치에서 호출된 경우) 또는 `timed-out`으로 해결될 수 있습니다(시간 초과가 도달한 경우). Promise는 절대 거부되지 않습니다.

다음 예는 `Atomics.waitAsync`의 기본 사용법을 보여줍니다:

```js
const sab = new SharedArrayBuffer(16);
const i32a = new Int32Array(sab);
const result = Atomics.waitAsync(i32a, 0, 0, 1000);
//                                     |  |  ^ timeout (opt)
//                                     |  ^ expected value
//                                     ^ index

if (result.value === 'not-equal') {
  // SharedArrayBuffer의 값이 예상된 값과 일치하지 않습니다.
} else {
  result.value instanceof Promise; // true
  result.value.then(
    (value) => {
      if (value == 'ok') { /* 통지됨 */ }
      else { /* 값은 'timed-out'임 */ }
    });
}

// 이 스레드, 또는 다른 스레드에서:
Atomics.notify(i32a, 0);
```

다음으로, 동기적 및 비동기로 모두 사용 가능한 뮤텍스 구현을 보여주겠습니다. 뮤텍스의 동기적 버전 구현은 이전에 [이 블로그 게시물](https://blogtitle.github.io/using-javascript-sharedarraybuffers-and-atomics/) 등에서 논의된 바 있습니다.

예제에서 `Atomics.wait`와 `Atomics.waitAsync`의 시간 초과 매개변수를 사용하지 않습니다. 이 매개변수는 시간 초과가 있는 조건 변수를 구현하는 데 사용할 수 있습니다.

우리의 뮤텍스 클래스 `AsyncLock`은 `SharedArrayBuffer`를 기반으로 작동하며, 다음 메서드를 구현합니다:

- `lock` — 우리가 뮤텍스를 잠글 수 있을 때까지 스레드를 차단 (워커 스레드에서만 사용 가능)
- `unlock` — 뮤텍스를 잠금 해제 (`lock`의 상대 동작)
- `executeLocked(callback)` — 비블로킹 잠금, 메인 스레드에서 사용할 수 있음; 뮤텍스를 잠그는 데 성공하면 `callback`을 실행하도록 예약

각 항목이 어떻게 구현될 수 있는지 살펴보겠습니다. 클래스 정의는 상수와 `SharedArrayBuffer`를 매개변수로 받는 생성자를 포함합니다.

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

`i32a[0]`에는 `LOCKED` 또는 `UNLOCKED` 값 중 하나가 포함됩니다. 이는 또한 `Atomics.wait` 및 `Atomics.waitAsync`의 대기 위치입니다. `AsyncLock` 클래스는 다음 불변성을 보장합니다:

1. `i32a[0] == LOCKED`일 때, 스레드가 `i32a[0]`에서 `Atomics.wait` 또는 `Atomics.waitAsync`를 통해 대기를 시작하면 결국 알림을 받습니다.
1. 알림을 받은 후 스레드는 잠금을 시도합니다. 잠금을 획득하면 잠금을 해제할 때 다시 알립니다.

## 동기 잠금 및 해제

다음은 작업자 스레드에서만 호출할 수 있는 차단 메서드 `lock`을 보여줍니다:

```js
lock() {
  while (true) {
    const oldValue = Atomics.compareExchange(this.i32a, AsyncLock.INDEX,
                        /* old value >>> */  AsyncLock.UNLOCKED,
                        /* new value >>> */  AsyncLock.LOCKED);
    if (oldValue == AsyncLock.UNLOCKED) {
      return;
    }
    Atomics.wait(this.i32a, AsyncLock.INDEX,
                 AsyncLock.LOCKED); // <<< 예상 시작 값
  }
}
```

스레드가 `lock()`을 호출하면 먼저 `Atomics.compareExchange`를 사용하여 잠금 상태를 `UNLOCKED`에서 `LOCKED`로 변경하여 잠금을 얻으려고 시도합니다. `Atomics.compareExchange`는 상태 변경을 원자적으로 수행하려고 하며, 메모리 위치의 원래 값을 반환합니다. 원래 값이 `UNLOCKED`였다면 상태 변경이 성공했다는 것을 알 수 있으며, 스레드는 잠금을 획득합니다. 추가 조치가 필요하지 않습니다.

`Atomics.compareExchange`가 잠금 상태 변경에 실패하면 다른 스레드가 잠금을 소유하고 있는 것입니다. 따라서 이 스레드는 `Atomics.wait`를 사용하여 다른 스레드가 잠금을 해제할 때까지 기다립니다. 메모리 위치에 예상한 값이 그대로 있다면 (`AsyncLock.LOCKED`), `Atomics.wait`를 호출하면 스레드가 차단되며 다른 스레드가 `Atomics.notify`를 호출할 때만 `Atomics.wait` 호출이 반환됩니다.

`unlock` 메서드는 잠금을 `UNLOCKED` 상태로 설정하고 잠금을 기다리던 대기자 중 하나를 깨우기 위해 `Atomics.notify`를 호출합니다. 상태 변경은 항상 성공해야 하며, 이는 이 스레드가 잠금을 소유하고 있고 다른 누구도 동시에 `unlock()`을 호출해선 안되기 때문입니다.

```js
unlock() {
  const oldValue = Atomics.compareExchange(this.i32a, AsyncLock.INDEX,
                      /* old value >>> */  AsyncLock.LOCKED,
                      /* new value >>> */  AsyncLock.UNLOCKED);
  if (oldValue != AsyncLock.LOCKED) {
    throw new Error('잠금을 소유하지 않은 상태에서 잠금을 해제하려 했습니다');
  }
  Atomics.notify(this.i32a, AsyncLock.INDEX, 1);
}
```

간단한 경우는 다음과 같습니다: 잠금이 비어 있고 스레드 T1이 `Atomics.compareExchange`를 통해 잠금 상태를 변경하여 잠금을 획득합니다. 스레드 T2가 잠금을 획득하려고 `Atomics.compareExchange`를 호출하지만 잠금 상태 변경에 실패합니다. T2는 `Atomics.wait`를 호출하여 스레드를 차단합니다. 어느 시점에서 T1이 잠금을 해제하고 `Atomics.notify`를 호출합니다. 그러면 T2에서의 `Atomics.wait` 호출이 `'ok'`를 반환하며 T2가 깨어납니다. 그 후 T2는 다시 잠금을 시도하고 이번에는 성공합니다.

또한 두 가지 가능한 코너 케이스가 있습니다 — 이들은 `Atomics.wait` 및 `Atomics.waitAsync`가 특정 값으로 인덱스를 확인하는 이유를 설명합니다:

- T1이 잠금을 소유하고 있고 T2가 이를 얻으려고 합니다. 먼저, T2는 `Atomics.compareExchange`로 잠금 상태를 변경하려고 했지만 실패합니다. 그러나 T1이 T2가 `Atomics.wait`를 호출하기 전에 잠금을 해제한 경우, T2가 `Atomics.wait`를 호출하면 즉시 `'not-equal'` 값을 반환합니다. 이 경우, T2는 다음 루프 반복을 계속하며 다시 잠금을 시도합니다.
- T1이 잠금을 소유하고 있고 T2는 `Atomics.wait`를 통해 대기 중입니다. T1이 잠금을 해제하면 T2가 깨어납니다 (`Atomics.wait` 호출이 반환됨) 그리고 다시 `Atomics.compareExchange`를 통해 잠금을 얻으려고 하지만 다른 스레드 T3이 이미 잠금을 획득한 경우입니다. 이 경우 `Atomics.compareExchange` 호출이 잠금을 얻는 데 실패하며, T2는 `Atomics.wait`를 다시 호출해 T3이 잠금을 해제할 때까지 차단됩니다.

후자의 코너 케이스 때문에 뮤텍스는 “공정”하지 않습니다. T2가 잠금이 해제되기를 기다리고 있었지만 T3가 와서 즉시 잠금을 획득할 수 있습니다. 보다 현실적인 잠금 구현에서는 여러 상태를 사용하여 “잠금”과 “경쟁이 있는 잠금”을 구별할 수 있습니다.

## 비동기 잠금

비차단 `executeLocked` 메서드는 차단 메서드 `lock`과 달리 메인 스레드에서 호출할 수 있습니다. 이 메서드는 콜백 함수를 유일한 매개변수로 받고, 잠금을 성공적으로 획득한 후 콜백을 실행하도록 예약합니다.

```js
executeLocked(f) {
  const self = this;

  async function tryGetLock() {
    while (true) {
      const oldValue = Atomics.compareExchange(self.i32a, AsyncLock.INDEX,
                          /* 원래 값 >>> */  AsyncLock.UNLOCKED,
                          /* 새로운 값 >>> */  AsyncLock.LOCKED);
      if (oldValue == AsyncLock.UNLOCKED) {
        f();
        self.unlock();
        return;
      }
      const result = Atomics.waitAsync(self.i32a, AsyncLock.INDEX,
                                       AsyncLock.LOCKED);
                                   //  ^ 시작 시 예상 값
      await result.value;
    }
  }

  tryGetLock();
}
```

내부 함수 `tryGetLock`은 이전과 같이 먼저 `Atomics.compareExchange`를 사용하여 잠금을 얻으려고 시도합니다. 만약 잠금 상태를 성공적으로 변경하면 콜백을 실행하고, 잠금을 해제한 후 반환합니다.

`Atomics.compareExchange`가 잠금을 얻는 데 실패하면, 우리는 잠금이 아마도 해제되었을 때 다시 시도해야 합니다. 잠금이 해제될 때까지 블록하고 대기할 수는 없기 때문에, 대신 `Atomics.waitAsync`와 반환된 Promise를 사용하여 새로운 시도를 예약합니다.

만약 `Atomics.waitAsync`를 성공적으로 시작했다면, 반환된 Promise는 잠금을 보유하고 있는 스레드가 `Atomics.notify`를 실행하면 해결됩니다. 그런 다음 잠금을 기다리고 있던 스레드는 이전과 같이 다시 잠금을 얻으려고 시도합니다.

`Atomics.compareExchange` 호출과 `Atomics.waitAsync` 호출 사이에서 잠금이 해제되거나, Promise가 해결되고 `Atomics.compareExchange` 호출 사이에서 잠금이 다시 획득되는 것과 같은 동일한 경계 사례가 비동기 버전에서도 가능합니다. 따라서 코드가 이를 견고하게 처리해야 합니다.

## 결론

이 게시물에서, 우리는 동기화 프리미티브 `Atomics.wait`, `Atomics.waitAsync`, 그리고 `Atomics.notify`를 사용하여 주 스레드와 워커 스레드 모두에서 사용할 수 있는 뮤텍스를 구현하는 방법을 보여주었습니다.

## 기능 지원

### `Atomics.wait` 및 `Atomics.notify`

<feature-support chrome="68"
                 firefox="78"
                 safari="no"
                 nodejs="8.10.0"
                 babel="no"></feature-support>

### `Atomics.waitAsync`

<feature-support chrome="87"
                 firefox="no"
                 safari="no"
                 nodejs="16"
                 babel="no"></feature-support>
