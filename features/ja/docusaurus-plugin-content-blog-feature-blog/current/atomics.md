---
title: '`Atomics.wait`, `Atomics.notify`, `Atomics.waitAsync`'
author: '[マリヤ・ホルタ](https://twitter.com/marjakh)、ノンブロッキングブロガー'
avatars:
  - marja-holtta
date: 2020-09-24
tags:
  - ECMAScript
  - ES2020
  - Node.js 16
description: 'Atomics.wait と Atomics.notify は、ミューテックスなどを実装するための低レベルの同期プリミティブです。Atomics.wait はワーカースレッドでのみ使用可能です。V8 バージョン 8.7 は、非同期版である Atomics.waitAsync を新しくサポートし、メインスレッドでも使用可能です。'
tweet: '1309118447377358848'
---
[`Atomics.wait`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/wait) および [`Atomics.notify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/notify) は、ミューテックスやその他の同期手段を実装するために便利な低レベルの同期プリミティブです。しかし、`Atomics.wait` はブロッキングであるため、メインスレッドで呼び出すことはできません（試みると `TypeError` が投げられます）。

<!--truncate-->
バージョン 8.7 から、V8 は非同期版である [`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md) をサポートしており、メインスレッドでも使用できます。

この記事では、これらの低レベル API を使用して、同期的（ワーカースレッド用）および非同期的（ワーカースレッドまたはメインスレッド用）の両方で動作するミューテックスを実装する方法を説明します。

`Atomics.wait` と `Atomics.waitAsync` は以下のパラメータを取ります:

- `buffer`: `SharedArrayBuffer` に基づく `Int32Array` または `BigInt64Array`
- `index`: 配列内の有効なインデックス
- `expectedValue`: メモリ位置 `(buffer, index)` にあると期待される値
- `timeout`: ミリ秒単位のタイムアウト (オプション、デフォルトは `Infinity`)

`Atomics.wait` の戻り値は文字列です。メモリ位置が期待値を含んでいない場合、`Atomics.wait` はすぐに `not-equal` を返します。それ以外の場合、タイムアウトに達するか、別のスレッドが同じメモリ位置で `Atomics.notify` を呼び出すまでスレッドはブロックされます。前者の場合、`Atomics.wait` は `ok` を返し、後者の場合、`timed-out` を返します。

`Atomics.notify` は以下のパラメータを取ります:

- `SharedArrayBuffer` に基づいた `Int32Array` または `BigInt64Array`
- 配列内の有効なインデックス
- 通知する待機者の数 (オプション、デフォルトは `Infinity`)

指定された数の待機者を FIFO 順で通知し、メモリ位置 `(buffer, index)` に対応します。同じ場所に関連する複数の `Atomics.wait` 呼び出しまたは `Atomics.waitAsync` 呼び出しがある場合、それらはすべて同じ FIFO キューに存在します。

`Atomics.wait` と対照的に、`Atomics.waitAsync` は常にすぐに戻ります。戻り値は以下のいずれかです:

- `{ async: false, value: 'not-equal' }`（メモリ位置が期待値を含んでいない場合）
- `{ async: false, value: 'timed-out' }`（即時タイムアウト 0 の場合のみ）
- `{ async: true, value: promise }`

Promise は後で文字列値 `ok`（`Atomics.notify` が同じメモリ位置で呼び出された場合）または `timed-out`（タイムアウトが到達した場合）で解決されることがあります。Promise が拒否されることはありません。

以下の例では、`Atomics.waitAsync` の基本的な使用方法を示しています:

```js
const sab = new SharedArrayBuffer(16);
const i32a = new Int32Array(sab);
const result = Atomics.waitAsync(i32a, 0, 0, 1000);
//                                     |  |  ^ タイムアウト (オプション)
//                                     |  ^ 期待値
//                                     ^ インデックス

if (result.value === 'not-equal') {
  // SharedArrayBuffer の値が期待値ではありません。
} else {
  result.value instanceof Promise; // true
  result.value.then(
    (value) => {
      if (value == 'ok') { /* 通知済み */ }
      else { /* 値は 'timed-out' */ }
    });
}

// このスレッド内または他のスレッド内で:
Atomics.notify(i32a, 0);
```

次に、同期的にも非同期的にも使用できるミューテックスを実装する方法を示します。同期版のミューテックス実装については、[この記事](https://blogtitle.github.io/using-javascript-sharedarraybuffers-and-atomics/)などで以前に議論されています。

例では、`Atomics.wait` や `Atomics.waitAsync` のタイムアウトパラメータを使用していません。このパラメータはタイムアウト付きの条件変数を実装するために使用できます。

ミューテックスクラス `AsyncLock` は `SharedArrayBuffer` に基づき、以下のメソッドを実装します:

- `lock` — ミューテックスをロックできるまでスレッドをブロックします（ワーカースレッドでのみ使用可能）
- `unlock` — ミューテックスをアンロックします（`lock` の対応方法）
- `executeLocked(callback)` — ノンブロッキングロック、メインスレッドで使用可能。ロックを取得できた時点で `callback` を実行するようにスケジュールされます。

それぞれの実装方法を見ていきましょう。クラス定義には定数と、`SharedArrayBuffer`をパラメータとして受け取るコンストラクタが含まれています。

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

ここで、`i32a[0]`は`LOCKED`または`UNLOCKED`のいずれかの値を含んでいます。また、それは`Atomics.wait`や`Atomics.waitAsync`の待機場所でもあります。この`AsyncLock`クラスは以下の不変条件を保証します:

1. `i32a[0] == LOCKED`の場合、スレッドが`i32a[0]`で`Atomics.wait`または`Atomics.waitAsync`を使用して待機を開始すると、最終的には通知を受け取ることになります。
2. 通知を受けた後、スレッドはロックを取得しようとします。ロックを取得できた場合、ロック解除時に再度通知を行います。

## 同期ロックとアンロック

次に、ワーカースレッドからのみ呼び出せるブロッキング`lock`メソッドを示します:

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
                 AsyncLock.LOCKED); // <<< 初期値として期待する値
  }
}
```

スレッドが`lock()`を呼び出すと、まず`Atomics.compareExchange`を使用してロック状態を`UNLOCKED`から`LOCKED`に変更することでロックを取得しようとします。`Atomics.compareExchange`は状態変更を原子的に試み、メモリ位置の元の値を返します。元の値が`UNLOCKED`であれば、状態変更が成功し、スレッドがロックを取得したことを示します。それ以上の操作は必要ありません。

もし`Atomics.compareExchange`がロック状態の変更に失敗した場合、別のスレッドがロックを保持しているはずです。この場合、このスレッドは他のスレッドがロックを解放するのを待つために`Atomics.wait`を試みます。そのメモリ位置が依然として期待する値（この場合、`AsyncLock.LOCKED`）を保持している場合、`Atomics.wait`を呼び出すとスレッドがブロックされ、別のスレッドが`Atomics.notify`を呼び出すまで`Atomics.wait`呼び出しは戻りません。

`unlock`メソッドはロックを`UNLOCKED`状態に設定し、ロックを待機していた1つのスレッドを起こすために`Atomics.notify`を呼び出します。この状態変更は常に成功することが想定されています。なぜなら、このスレッドはロックを保持しており、その間に他の誰も`unlock()`を呼び出さないはずだからです。

```js
unlock() {
  const oldValue = Atomics.compareExchange(this.i32a, AsyncLock.INDEX,
                      /* old value >>> */  AsyncLock.LOCKED,
                      /* new value >>> */  AsyncLock.UNLOCKED);
  if (oldValue != AsyncLock.LOCKED) {
    throw new Error(&apos;ミューテックスを保持していない状態でアンロックしようとしました&apos;);
  }
  Atomics.notify(this.i32a, AsyncLock.INDEX, 1);
}
```

シンプルなケースの流れは次の通りです: ロックが空いており、スレッドT1が`Atomics.compareExchange`を使用してロック状態を変更することでロックを取得します。スレッドT2がロックを取得しようとして`Atomics.compareExchange`を呼び出しますが、ロック状態の変更に成功しません。T2は次に`Atomics.wait`を呼び出し、スレッドをブロックします。ある時点でT1がロックを解放し、`Atomics.notify`を呼び出します。それにより、T2での`Atomics.wait`呼び出しが`&apos;ok&apos;`を返し、T2を起こします。T2は再びロックを取得しようと試み、今回は成功します。

また、2つの角ケースがあります — これらは`Atomics.wait`および`Atomics.waitAsync`が特定のインデックス値を確認する理由を示しています。

- T1がロックを保持しており、T2がそれを取得しようとしています。まず、T2は`Atomics.compareExchange`を使用してロック状態を変更しようとしますが、成功しません。しかし、T2が`Atomics.wait`を呼び出す前にT1がロックを解放します。T2が`Atomics.wait`を呼び出すと、それはすぐに`&apos;not-equal&apos;`の値を返します。その場合、T2は次のループ反復を続行し、再びロックを取得しようとします。
- T1がロックを保持しており、T2は`Atomics.wait`を使用してそれを待っています。T1がロックを解放すると、T2が起きます（`Atomics.wait`呼び出しが戻ります）そして、`Atomics.compareExchange`を試みてロックを取得します。ただし、別のスレッドT3がより早くロックを取得してしまいます。その結果、`Atomics.compareExchange`呼び出しがロックの取得に失敗し、T2は再び`Atomics.wait`を呼び出してT3がロックを解放するのを待ちます。

この後者の角ケースのため、ミューテックスは“公平”ではありません。T2がロックが解放されるのを待っていたにもかかわらず、T3が来てすぐにそれを取得する可能性があります。より現実的なロック実装では、“ロック済み”と“競合によるロック済み”を区別するためにいくつかの状態を使用することがあります。

## 非同期ロック

ブロッキングしない`executeLocked`メソッドは、ブロッキングする`lock`メソッドとは異なり、メインスレッドから呼び出すことができます。このメソッドはコールバック関数を唯一のパラメータとして受け取り、ロックの取得に成功した後にコールバックを実行するようスケジュールします。

```js
executeLocked(f) {
  const self = this;

  async function tryGetLock() {
    while (true) {
      const oldValue = Atomics.compareExchange(self.i32a, AsyncLock.INDEX,
                          /* 古い値 >>> */  AsyncLock.UNLOCKED,
                          /* 新しい値 >>> */  AsyncLock.LOCKED);
      if (oldValue == AsyncLock.UNLOCKED) {
        f();
        self.unlock();
        return;
      }
      const result = Atomics.waitAsync(self.i32a, AsyncLock.INDEX,
                                       AsyncLock.LOCKED);
                                   //  ^ 開始時の期待値
      await result.value;
    }
  }

  tryGetLock();
}
```

内部関数`tryGetLock`は、以前と同様にまず`Atomics.compareExchange`を使用してロックを取得しようとします。そのロック状態が正常に変更された場合、コールバックを実行し、ロックを解除してリターンします。

`Atomics.compareExchange`がロックを取得するのに失敗した場合、ロックが解放されたと思われるときに再試行する必要があります。ただし、ロックが解放されるのを待つためにブロックすることはできません。その代わりに、`Atomics.waitAsync`とそれが返すPromiseを使用して新しい試行をスケジュールします。

`Atomics.waitAsync`を正常に開始できた場合、ロックを保持しているスレッドが`Atomics.notify`を実行すると、返されたPromiseが解決されます。その後、ロックを待っていたスレッドは以前のように再びロックを取得しようとします。

非同期バージョンでも、`Atomics.compareExchange`呼び出しと`Atomics.waitAsync`呼び出しの間でロックが解放される、またはPromiseが解決される間にロックが再び取得されるなど、同じコーナーケースが発生する可能性があります。そのため、コードはそれらを堅牢に処理する必要があります。

## 結論

この投稿では、`Atomics.wait`、`Atomics.waitAsync`、および`Atomics.notify`の同期プリミティブを使用して、メインスレッドおよびワーカースレッドの両方で使用可能なミューテックスを実装する方法を説明しました。

## 機能サポート

### `Atomics.wait`と`Atomics.notify`

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
