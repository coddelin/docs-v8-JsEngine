---
title: "弱い参照とファイナライザ"
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
description: "JavaScriptに弱い参照とファイナライザがやってきます！この記事では新しい機能について説明します。"
tweet: "1148603966848151553"
---
一般的に、JavaScriptではオブジェクトへの参照は_強く保持されており_、オブジェクトへの参照がある限り、ガベージコレクションされることはありません。

```js
const ref = { x: 42, y: 51 };
// `ref`（または同じオブジェクトへの他の参照）にアクセスできる限り、
// オブジェクトはガベージコレクションされません。
```

現在のところ、`WeakMap`と`WeakSet`はJavaScriptでオブジェクトを弱参照する唯一の方法です：`WeakMap`や`WeakSet`にキーとしてオブジェクトを追加しても、ガベージコレクションを妨げることはありません。

```js
const wm = new WeakMap();
{
  const ref = {};
  const metaData = 'foo';
  wm.set(ref, metaData);
  wm.get(ref);
  // → metaData
}
// このブロックスコープ内で`ref`への参照が無くなったため、
// オブジェクトはガベージコレクションされます。
// ただし、それが`wm`のキーである場合でも、`wm`へのアクセスは可能です。

<!--truncate-->
const ws = new WeakSet();
{
  const ref = {};
  ws.add(ref);
  ws.has(ref);
  // → true
}
// このブロックスコープ内で`ref`への参照が無くなったため、
// オブジェクトはガベージコレクションされます。
// ただし、それが`ws`のキーである場合でも、`ws`へのアクセスは可能です。
```

:::note
**注意:** `WeakMap.prototype.set(ref, metaData)`は、オブジェクト`ref`に値`metaData`のプロパティを追加するかのように動作すると考えることができます：オブジェクトへの参照がある限り、メタデータを取得できます。オブジェクトへの参照がなくなると、それが追加された`WeakMap`への参照がまだ存在していても、オブジェクトはガベージコレクションされる可能性があります。同様に、`WeakSet`はすべての値が真偽値である特殊な`WeakMap`と考えることができます。

JavaScriptの`WeakMap`は実際には_弱参照ではなく_、キーが生きている間はその内容を強く参照します。キーがガベージコレクションされると、その内容を弱参照するようになります。このような関係をより正確には[_エフェメロン_](https://en.wikipedia.org/wiki/Ephemeron)と呼ぶことができます。
:::

`WeakRef`はより高度なAPIであり、_真の_弱参照を提供し、オブジェクトのライフタイムを垣間見ることができます。一緒に例を見ていきましょう。

例として、サーバーと通信するためにWebソケットを使用するチャットWebアプリケーションを作成していると仮定しましょう。`MovingAvg`クラスは、パフォーマンス診断目的のためにWebソケットからのイベントセットを保持し、遅延の単純移動平均を計算するために使用されます。

```js
class MovingAvg {
  constructor(socket) {
    this.events = [];
    this.socket = socket;
    this.listener = (ev) => { this.events.push(ev); };
    socket.addEventListener('message', this.listener);
  }

  compute(n) {
    // 最後のnイベントに対して単純移動平均を計算します。
    // …
  }
}
```

`MovingAvgComponent`クラスに使用され、そのクラスでは遅延の単純移動平均の監視を開始および停止する操作を制御できます。

```js
class MovingAvgComponent {
  constructor(socket) {
    this.socket = socket;
  }

  start() {
    this.movingAvg = new MovingAvg(this.socket);
  }

  stop() {
    // ガベージコレクタにメモリーを解放させる。
    this.movingAvg = null;
  }

  render() {
    // レンダリングを行う。
    // …
  }
}
```

`MovingAvg`インスタンス内にすべてのサーバーメッセージを保持することが大量のメモリを使用するとわかっています。そのため、監視が停止された際には`this.movingAvg`をnullにすることでガベージコレクタにメモリを解放させます。

しかし、DevToolsのメモリパネルを確認したところ、メモリが全く解放されていないことが判明しました！経験豊富なWeb開発者ならバグをすでに見つけたかもしれませんが、イベントリスナーは強い参照となるため、明示的に削除する必要があります。

`start()`を呼び出した後、オブジェクトグラフは以下のようになります。ここで、実線の矢印は強い参照を意味します。`MovingAvgComponent`インスタンスから実線の矢印を通じて到達可能なすべてのものはガベージコレクションされません。

![](/_img/weakrefs/after-start.svg)

`stop()`を呼び出した後、`MovingAvgComponent`インスタンスから`MovingAvg`インスタンスへの強参照を削除しましたが、ソケットのリスナー上では削除していません。

![](/_img/weakrefs/after-stop.svg)

したがって、`MovingAvg`インスタンスのリスナーが`this`を参照することで、イベントリスナーが削除されない限りインスタンス全体が生き続けます。

これまでのソリューションは、`dispose`メソッドを使用して手動でイベントリスナーを登録解除することでした。

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

このアプローチの欠点は、手動によるメモリ管理が必要である点です。`MovingAvgComponent`や他の`MovingAvg`クラスの利用者は、`dispose`を呼び出さないとメモリリークを引き起こしてしまう可能性があります。さらに悪いことに、手動メモリ管理は連鎖的で、`MovingAvgComponent`の利用者も`stop`を呼び出す必要があるなど、影響が拡大します。この診断クラスのイベントリスナーの有無はアプリケーションの動作に依存せず、リスナー自体は計算速度には影響しないもののメモリ使用量が高いです。理想的には、このリスナーのライフタイムを`MovingAvg`インスタンスのライフタイムに論理的に結びつけるべきです。これにより、`MovingAvg`はガベージコレクタによる自動メモリ回収が可能な他のJavaScriptオブジェクトと同様に動作するようになります。

`WeakRef`を使用することで、実際のイベントリスナーに対する_弱い参照_を作成し、その`WeakRef`を外部イベントリスナー内でラップすることで、このジレンマを解決することが可能になります。これにより、ガベージコレクタは`MovingAvg`インスタンスや`events`配列など、実際のイベントリスナーが活性化しているメモリをクリーンアップすることができます。

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
**注意:** 関数への`WeakRef`の使用は慎重に行う必要があります。JavaScriptの関数は[クロージャ](https://en.wikipedia.org/wiki/Closure_(computer_programming))であり、これにより関数内で参照される自由変数の値を含む外部環境を強く参照します。これらの外部環境は、_他の_ クロージャが参照している変数を含む場合があります。つまり、クロージャとそのメモリは他のクロージャによって微妙に強く参照されていることがよくあります。このため、`addWeakListener`は個別の関数として実装されており、`wrapper`は`MovingAvg`のコンストラクタ内にローカルとして存在しないようにしています。V8では、もし`wrapper`が`MovingAvg`のコンストラクタ内にローカルで配置され、`WeakRef`でラップされたリスナーと語彙スコープを共有していた場合、`MovingAvg`インスタンスとそのすべてのプロパティが共有環境を通して`wrapper`リスナーから到達可能となり、インスタンスがガベージコレクトされなくなります。コードを書く際にはこれを頭に入れておいてください。
:::

最初にイベントリスナーを作成し、それを`this.listener`に割り当てます。このようにして、`MovingAvg`インスタンスが存在する限り、イベントリスナーも存続します。

その後、`addWeakListener`で、実際のイベントリスナーをターゲットとする`WeakRef`を作成します。その内部の`wrapper`で、これを`deref`します。`WeakRef`は他に強い参照がない場合にターゲットのガベージコレクションを妨げないため、`deref`を使用してターゲットを手動で参照する必要があります。その間にターゲットがガベージコレクトされている場合、`deref`は`undefined`を返します。それ以外の場合、元のターゲット（つまりリスナー関数）が返され、[オプショナルチェイニング](/features/optional-chaining)を使用してその関数を呼び出します。

イベントリスナーが`WeakRef`でラップされているため、そのイベントリスナーへの唯一の強い参照は`MovingAvg`インスタンス上の`listener`プロパティになります。つまり、イベントリスナーのライフタイムを`MovingAvg`インスタンスのライフタイムに成功裏に結びつけたことになります。

到達可能性のダイアグラムに戻ると、`WeakRef`実装で`start()`を呼び出した後のオブジェクトグラフは次のようになります（点線は弱い参照を意味します）。

![](/_img/weakrefs/weak-after-start.svg)

`stop()`を呼び出した後は、リスナーへの唯一の強い参照を削除した状況が次のようになります。

![](/_img/weakrefs/weak-after-stop.svg)

最終的にガベージコレクションが発生した後、`MovingAvg`インスタンスとリスナーは回収されます。

![](/_img/weakrefs/weak-after-gc.svg)

しかし、ここにはまだ問題があります。それは、`WeakRef`でリスナーをラップすることでリスナーに間接層を追加しましたが、`addWeakListener`内のラッパーは元々リスナーがリークしていた理由と同じ理由で依然としてリークしています。このリークは`MovingAvg`インスタンス全体がリークしていた場合に比べると軽微ですが、それでもリークです。これを解決する方法が、`WeakRef`の補完機能である`FinalizationRegistry`です。新しい`FinalizationRegistry` APIを使用すると、ガベージコレクタが登録されたオブジェクトを削除した際に実行されるコールバックを登録することができます。このようなコールバックは_ファイナライザ_と呼ばれます。

:::note
**注意：** ファイナライゼーションコールバックはイベントリスナーのガベージコレクション後に即座に実行されるわけではありません。そのため、重要なロジックやメトリクスのために使用しないでください。ガベージコレクションおよびファイナライゼーションコールバックのタイミングは指定されていません。事実上、ガベージコレクションを全く行わないエンジンでも完全に準拠します。しかし、エンジンがガベージコレクションを行い、ファイナライゼーションコールバックが後から実行されることを仮定するのは安全です。ただし、環境が破棄される（タブが閉じる、ワーカーが終了するなど）場合を除きます。この不確定性を心に留めてコードを書くようにしてください。
:::

ガベージコレクションされたイベントリスナーを `FinalizationRegistry` を使用して `wrapper` をソケットから削除するためにコールバックを登録することができます。最終的な実装は以下のようになります：

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

:::note
**注意：** `gListenersRegistry` はファイナライザが実行されるようにグローバル変数として保持されます。`FinalizationRegistry` は登録されたオブジェクトによって存続するわけではありません。レジストリ自体がガベージコレクションされると、ファイナライザが実行されない場合があります。
:::

イベントリスナーを作成して `this.listener` に代入することで、`MovingAvg` インスタンスによって強く参照されるようにします（1）。次に、`WeakRef` を使用して作業を行うイベントリスナーをラップし、ガベージコレクション可能にして、`this` を介して `MovingAvg` インスタンスへの参照が漏れないようにします（2）。`WeakRef` がまだ有効かどうかをチェックし、その場合に呼び出すラッパーを作成します（3）。`FinalizationRegistry` に内側のリスナーを登録し、登録時に `{ socket, wrapper }` という保持値を渡します（4）。その後、返されたラッパーをイベントリスナーとして `socket` に追加します（5）。`MovingAvg` インスタンスと内側のリスナーがガベージコレクションされた後に、保持値が渡された状態でファイナライザが実行される可能性があります。ファイナライザ内では、ラッパーも削除し、`MovingAvg` インスタンスの使用に関連したすべてのメモリをガベージコレクション可能にします（6）。

これにより、`MovingAvgComponent` の元の実装はメモリリークすることなく、手動での破棄も必要ありません。

## やりすぎないように

これらの新しい機能について知った後、`WeakRef` をすべてに使用したくなるかもしれません。しかし、それはおそらく良い考えではありません。いくつかのものは、`WeakRef` やファイナライザの利用に明確に適していません。

一般的に、ガベージコレクタが `WeakRef` を掃除する、またはファイナライザを予測可能なタイミングで呼び出すことに依存するコードを書くのは避けてください — [それは不可能です](https://github.com/tc39/proposal-weakrefs#a-note-of-caution)。さらに、オブジェクトがガベージコレクション可能かどうかは、クロージャの表現などの実装の詳細に依存する場合があり、それは微妙でJavaScriptエンジンの間や同じエンジンの異なるバージョン間でも異なる場合があります。具体的には、ファイナライザコールバック：

- ガベージコレクションの直後に発生するとは限りません。
- 実際のガベージコレクションと同じ順序で発生するとは限りません。
- ブラウザウィンドウが閉じられた場合など、まったく発生しない可能性があります。

そのため、重要なロジックをファイナライザのコードパスに配置しないでください。それらはガベージコレクションに応じてクリーンアップを実行するのに便利ですが、メモリ使用量に関する意味のあるメトリックを記録するために信頼して使用することはできません。その目的のためには、[`performance.measureUserAgentSpecificMemory`](https://web.dev/monitor-total-page-memory-usage/) を参照してください。

`WeakRef` とファイナライザはメモリを節約するのに役立ち、進化的な拡張手段として控えめに使用すると最も効果的です。これらは上級ユーザー向けの機能であり、大部分の使用はフレームワークやライブラリ内で行われると予想されます。

## `WeakRef` のサポート状況

<feature-support chrome="74 https://v8.dev/blog/v8-release-84#weak-references-and-finalizers"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1561074"
                 safari="no"
                 nodejs="14.6.0"
                 babel="no"></feature-support>
