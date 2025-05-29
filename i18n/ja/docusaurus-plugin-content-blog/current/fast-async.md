---
title: '非同期関数とプロミスの高速化'
author: 'Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski)), 常に待機する予測者, と Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)), プロのパフォーマンス保証者'
avatars:
  - 'maya-armyanova'
  - 'benedikt-meurer'
date: 2018-11-12 16:45:07
tags:
  - ECMAScript
  - ベンチマーク
  - プレゼンテーション
description: 'V8 v7.2 / Chrome 72に高速でデバッグしやすい非同期関数とプロミスが登場します。'
tweet: '1062000102909169670'
---
JavaScriptにおける非同期処理は従来、特に速いとは言えないレピュテーションを持っていました。さらに悪いことに、ライブJavaScriptアプリケーション、特にNode.jsサーバーのデバッグは簡単ではありません。_特に_ 非同期プログラミングに関してはそうです。しかし、時代は変わりつつあります。本記事では、V8で非同期関数とプロミスをどのように最適化したか（そしてある程度は他のJavaScriptエンジンでも）、および非同期コードのデバッグ体験をどのように改善したかを探ります。

<!--truncate-->
:::note
**注意:** 記事を読むよりもプレゼンを見る方が好きな場合は、以下のビデオをお楽しみください！興味がない場合は、動画をスキップして次へ進んでください。
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/DFP5DKDQfOc" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

## 非同期プログラミングへの新しいアプローチ

### コールバックからプロミスへ、そして非同期関数へ

プロミスがJavaScript言語の一部になる前は、Node.jsで特に非同期コードに使われるコールバックベースのAPIが一般的でした。以下はその例です:

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

このように深くネストされたコールバックを使用する特定のパターンは、一般的に _「コールバック地獄」_ と呼ばれ、コードが読みにくく、保守が難しくなります。

幸運にも、現在ではプロミスがJavaScript言語の一部になり、同じコードをよりエレガントで保守しやすい方法で記述できるようになりました:

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

さらに最近、JavaScriptは [非同期関数](https://web.dev/articles/async-functions) のサポートを取得しました。上記の非同期コードは、同期コードに非常に似た方法で記述することができます:

```js
async function handler() {
  await validateParams();
  const dbResults = await dbQuery();
  const results = await serviceCall(dbResults);
  console.log(results);
  return results;
}
```

非同期関数を使用すると、コードが簡潔になり、制御とデータフローがはるかに追跡しやすくなります。それでも実行は非同期のままであるという事実にもかかわらずです。（JavaScriptの実行はまだ単一スレッドで行われます。つまり、非同期関数が物理的なスレッドを作成するわけではありません。）

### イベントリスナーコールバックから非同期イテレーションへ

Node.jsで特に一般的なもう一つの非同期のパラダイムは、[`ReadableStream`](https://nodejs.org/api/stream.html#stream_readable_streams) のものです。以下はその例です:

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

このコードは少々理解しづらいかもしれません。受信データはコールバック内でのみアクセスできるチャンクごとに処理され、ストリームの終端を示す信号もコールバック内で発生します。ここで、関数が即座に終了し、実際の処理がコールバックで行われる必要があることを認識しないと、バグを導入しやすくなります。

幸運にも、[非同期イテレーション](http://2ality.com/2016/10/asynchronous-iteration.html) と呼ばれるES2018の新機能がこのコードを簡潔にすることができます:

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

`'data'` と `'end'` コールバックに処理ロジックを分ける代わりに、新しい `for await…of` ループを使用してチャンクを非同期的にイテレーションし、単一の非同期関数にすべてをまとめることができます。また、`try-catch` ブロックを追加し、`unhandledRejection` 問題[^1] を回避しました。

[^1]: [Matteo Collina](https://twitter.com/matteocollina)さん、[この問題](https://github.com/mcollina/make-promises-safe/blob/master/README.md#the-unhandledrejection-problem)を指摘していただきありがとうございます。

これらの新しい機能は今すぐ本番環境で使用できます！非同期関数は、**Node.js 8 (V8 v6.2 / Chrome 62)以降で完全にサポート**されており、非同期イテレーターとジェネレーターは、**Node.js 10 (V8 v6.8 / Chrome 68)以降で完全にサポート**されています！

## 非同期パフォーマンスの改善

V8 v5.5 (Chrome 55 & Node.js 7)からV8 v6.8 (Chrome 68 & Node.js 10)までの間に、非同期コードのパフォーマンスを大幅に向上させることができました。この新しいプログラミングパラダイムを速度を気にせず安全に使用できるレベルに達しました。

![](/_img/fast-async/doxbee-benchmark.svg)

上のチャートは、[doxbee ベンチマーク](https://github.com/v8/promise-performance-tests/blob/master/lib/doxbee-async.js)を示しており、promise重視のコードのパフォーマンスを測定します。チャートは実行時間を可視化しており、低い方が良いことを意味します。

[並列ベンチマーク](https://github.com/v8/promise-performance-tests/blob/master/lib/parallel-async.js)の結果はさらに興奮します。特に[`Promise.all()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)の性能を強調しています:

![](/_img/fast-async/parallel-benchmark.svg)

`Promise.all`の性能を**8倍**向上させることができました。

ただし、上記のベンチマークは合成的なマイクロベンチマークです。V8チームは[実際のユーザーコードの実世界のパフォーマンス](/blog/real-world-performance)に対する最適化の影響により関心があります。

![](/_img/fast-async/http-benchmarks.svg)

上記のチャートは、promisesや非同期関数を多用する一部の人気HTTPミドルウェアフレームワークのパフォーマンスを可視化しています。このグラフはリクエスト/秒を示しており、前のチャートとは異なり、数字が高いほど良いことを意味します。これらのフレームワークのパフォーマンスは、Node.js 7 (V8 v5.5)とNode.js 10 (V8 v6.8)の間で大幅に改善されました。

これらのパフォーマンス改善は次の3つの重要な成果の結果です:

- [TurboFan](/docs/turbofan)、新しい最適化コンパイラー 🎉
- [Orinoco](/blog/orinoco)、新しいガベージコレクター 🚛
- Node.js 8で`await`がマイクロティックをスキップするバグ 🐛

[TurboFanをリリース](/blog/launching-ignition-and-turbofan)した際に、[Node.js 8](https://medium.com/the-node-js-collection/node-js-8-3-0-is-now-available-shipping-with-the-ignition-turbofan-execution-pipeline-aa5875ad3367)において全体的な大幅な性能向上を達成しました。

また、新しいガベージコレクターであるOrinocoにも取り組んでおり、メインスレッドからガベージコレクションの作業を移行することで、リクエスト処理が大幅に改善されます。

そして最後に、Node.js 8で`await`が場合によってはマイクロティックをスキップする便利なバグがあり、これにより性能が向上しました。このバグは意図しない仕様違反として始まりましたが、後に最適化のアイデアを提供しました。このバグ的挙動から説明を始めましょう。

:::note
**注意:** 以下の挙動は執筆時点でJavaScriptの仕様に従った正当なものでした。その後、私たちの仕様提案が受け入れられ、以下の「バグ的挙動」が現在では正しいものになりました。
:::

```js
const p = Promise.resolve();

(async () => {
  await p; console.log('after:await');
})();

p.then(() => console.log('tick:a'))
 .then(() => console.log('tick:b'));
```

上記のプログラムは満たされたpromise `p`を作成し、その結果を`await`しますが、それに対して2つのハンドラーをチェーンします。`console.log`呼び出しがどの順序で実行されることを期待しますか？

`p`が満たされた状態なので、最初に`'after:await'`を出力し、その後`'tick'`を出力すると予想するかもしれません。実際、Node.js 8ではそのような挙動になります:

![Node.js 8における`await`バグ](/_img/fast-async/await-bug-node-8.svg)

この挙動は直感的に見えるかもしれませんが、仕様に従ったものではありません。Node.js 10は正しい挙動を実装しており、最初にチェーンされたハンドラーを実行し、その後非同期関数を続行します。

![Node.js 10ではもはや`await`バグがない](/_img/fast-async/await-bug-node-10.svg)

この_「正しい挙動」_はすぐには明らかではないかもしれず、JavaScript開発者にとって驚くべきものでした。そのため説明に値します。promiseと非同期関数の魔法の世界に移る前に、いくつかの基盤から始めましょう。

### タスク vs. マイクロタスク

高レベルでは、JavaScriptには_タスク_と_マイクロタスク_があります。タスクはI/Oやタイマーのイベントを処理し、一度に1つずつ実行されます。マイクロタスクは`async`/`await`とpromiseの遅延実行を実装し、各タスクの後に実行されます。マイクロタスクキューは常にイベントループに戻る前に空になります。

![マイクロタスクとタスクの違い](/_img/fast-async/microtasks-vs-tasks.svg)

詳細については、Jake Archibald の[ブラウザにおけるタスク、マイクロタスク、キュー、スケジュールの説明](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/)をご覧ください。Node.jsのタスクモデルも非常に似ています。

### 非同期関数

MDN によると、非同期関数とは、その結果を返すために暗黙的なプロミスを利用して非同期に動作する関数のことです。非同期関数は、非同期コードを同期コードのように見せることを意図しており、開発者から非同期処理の複雑さの一部を隠します。

最も単純な非同期関数は以下のようになります:

```js
async function computeAnswer() {
  return 42;
}
```

呼び出すとプロミスを返し、他のプロミスと同様にその値を取得できます。

```js
const p = computeAnswer();
// → プロミス

p.then(console.log);
// 次のターンで 42 を出力
```

このプロミス `p` の値を取得できるのは、次回マイクロタスクが実行されたときだけです。言い換えれば、上記のプログラムは、値を指定して `Promise.resolve` を使用するのと意味的に同等です:

```js
function computeAnswer() {
  return Promise.resolve(42);
}
```

`await` 式の力により、非同期関数が本来の力を発揮します。`await` はプロミスが解決されるまで関数の実行を一時停止し、完了後に再開します。`await` の値は、その満たされたプロミスの値です。以下の例を見てみましょう:

```js
async function fetchStatus(url) {
  const response = await fetch(url);
  return response.status;
}
```

`fetchStatus` の実行は `await` で停止し、`fetch` プロミスが完了した後に再開します。これは、`fetch` から返されたプロミスにハンドラを連結することとほぼ同等です。

```js
function fetchStatus(url) {
  return fetch(url).then(response => response.status);
}
```

このハンドラは、非同期関数内の `await` に続くコードを含みます。

通常は `await` に `Promise` を渡しますが、任意の JavaScript 値にも待機することが可能です。`await` に続く式の値がプロミスでない場合、それはプロミスへ変換されます。したがって、必要に応じて `await 42` を使用することもできます:

```js
async function foo() {
  const v = await 42;
  return v;
}

const p = foo();
// → プロミス

p.then(console.log);
// 最終的に `42` を出力
```

もっと興味深いのは、`await` が [「thenable」](https://promisesaplus.com/)（`then` メソッドを持つオブジェクト）であれば、実際のプロミスでなくても動作することです。これにより、例えばスリープの実際の時間を計測するような非同期スリープを作成することができます:

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

次に、[仕様](https://tc39.es/ecma262/#await)に従って、V8が`await`の内部で何をしているかを見てみましょう。以下のような単純な非同期関数`foo`を例にします:

```js
async function foo(v) {
  const w = await v;
  return w;
}
```

呼び出されると、パラメータ `v` をプロミスとしてラップし、そのプロミスが解決されるまで非同期関数の実行を一時停止します。それが完了すると、関数の実行が再開され、`w` に満たされたプロミスの値が割り当てられます。この値が非同期関数から返されます。

### `await` の内部動作

まず初めに、V8はこの関数を_再開可能_とマークします。これは、実行が一時停止し、後日（`await` ポイントで）再開できることを意味します。その後、いわゆる`暗黙的プロミス`を作成します。これが、非同期関数を呼び出すと返されるプロミスで、最終的には非同期関数によって生成された値を解決します。

![単純な非同期関数とエンジンがそれに変換するものの比較](/_img/fast-async/await-under-the-hood.svg)

次に興味深い部分に進みます: 実際の `await`。まず、`await` に渡された値がプロミスとしてラップされます。その後、このラップされたプロミスにハンドラが接続され、プロミスが満たされたら関数を再開します。そして、非同期関数の実行は一時停止され、`暗黙的プロミス`が呼び出し元に返されます。プロミスが満たされると、非同期関数の実行がプロミスの値 `w` で再開され、`暗黙的プロミス`が `w` で解決されます。

要するに、`await v` の初期ステップは次の通りです:

1. `await` に渡された値 `v` をプロミスとしてラップする。
2. 後で非同期関数を再開するためのハンドラを接続する。
3. 非同期関数を一時停止し、`暗黙的プロミス`を呼び出し元に返す。

個々の操作をステップごとに説明します。ここでは、`await` されているものが既にプロミスで、そのプロミスが値 `42` で満たされていると仮定します。その後、エンジンは新しいプロミスを作成し、それに `await` されている値を解決します。これは、仕様が[`PromiseResolveThenableJob`](https://tc39.es/ecma262/#sec-promiseresolvethenablejob) と呼ぶ方法で、次のターンでこれらのプロミスを遅延的に連鎖します。

![](/_img/fast-async/await-step-1.svg)

次にエンジンは「使い捨て」と呼ばれる新しいプロミスを作成します。それは完全にエンジン内部のものであり、誰もこれにチェーンしないため、使い捨てと言われます。この「使い捨て」プロミスは`promise`に適切なハンドラでチェーンされ、非同期関数を再開します。この`performPromiseThen`操作は、裏で[`Promise.prototype.then()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then)と本質的に同じことをしています。そして、非同期関数の実行は中断され、制御は呼び出し元に戻ります。

![](/_img/fast-async/await-step-2.svg)

実行は呼び出し元側で続行され、やがてコールスタックが空になります。そしてJavaScriptエンジンはマイクロタスクを開始します。エンジンは先にスケジュールされた[`PromiseResolveThenableJob`](https://tc39.es/ecma262/#sec-promiseresolvethenablejob)を実行し、`await`に渡された値にプロミスをチェーンする新しい[`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob)をスケジュールします。その後、エンジンはマイクロタスクキューの処理を続けます。マイクロタスクキューが空にならない限り、メインのイベントループに進むことはできません。

![](/_img/fast-async/await-step-3.svg)

次に[`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob)が実行されます。このジョブは`await`しているプロミスからの値（この場合は`42`）で`promise`を満たし、そのリアクションを「使い捨て」プロミスにスケジュールします。そしてエンジンは再びマイクロタスクループに戻り、残りのマイクロタスクを処理します。

![](/_img/fast-async/await-step-4-final.svg)

次にこの2番目の[`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob)が「使い捨て」プロミスに解決を伝播し、非同期関数の中断された実行を再開します。そして`await`から値`42`を返します。

![`await`のオーバーヘッドの概要図](/_img/fast-async/await-overhead.svg)

学んだことをまとめると、各`await`に対してエンジンは**追加で2つのプロミス**を作成する必要があります（右辺がすでにプロミスであっても）。そして**少なくとも3つ**のマイクロタスクキューのティックが必要です。1つの`await`式がこれほどのオーバーヘッドを引き起こすとは誰も思わなかったでしょう！

![](/_img/fast-async/await-code-before.svg)

このオーバーヘッドがどこから来るのかを見てみましょう。最初の行はラッパープロミスを作成する責任があります。2行目は即座にそのラッパープロミスを`await`された値`v`で解決します。この2行が追加プロミス1つと3つのマイクロティックのうち2つを占めています。これは`v`がすでにプロミスである場合（通常のケースです。なぜなら通常アプリケーションはプロミスで`await`します）にはかなり高価です。開発者が例えば`42`で`await`するような稀なケースでも、エンジンはそれをプロミスにラップする必要があります。

実際、仕様には必要に応じてラップのみを行う[`promiseResolve`](https://tc39.es/ecma262/#sec-promise-resolve)操作がすでにあります:

![](/_img/fast-async/await-code-comparison.svg)

この操作はプロミスを変更せず、必要に応じて他の値をプロミスにラップするだけです。この方法で、`await`に渡される値がすでにプロミスである通常のケースでは追加のプロミス1つとマイクロタスクキューのティック2つを節約できます。この新しい動作は[V8 v7.2ではすでにデフォルトで有効化されています](/blog/v8-release-72#async%2Fawait)。V8 v7.1では`--harmony-await-optimization`フラグを使用して新しい動作を有効化できます。この変更をECMAScript仕様に[提案しています](https://github.com/tc39/ecma262/pull/1250)。

ここで新しく改善された`await`が内部でどのように動作するのか、ステップごとに見てみましょう:

![](/_img/fast-async/await-new-step-1.svg)

再び、`42`で満たされたプロミスで`await`することを仮定します。[`promiseResolve`](https://tc39.es/ecma262/#sec-promise-resolve)の魔法のおかげで、`promise`は現在同じプロミス`v`を参照しているだけなので、このステップでは何もする必要がありません。その後、エンジンは以前とまったく同じように進み、「使い捨て」プロミスを作成し、[`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob)をスケジュールしてマイクロタスクキューの次のティックで非同期関数を再開し、関数の実行を中断して呼び出し元に戻ります。

![](/_img/fast-async/await-new-step-2.svg)

やがてすべてのJavaScriptの実行が完了すると、エンジンはマイクロタスクを開始し、[`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob)を実行します。このジョブは`promise`の解決を「使い捨て」に伝播し、非同期関数の実行を再開して、`await`から`42`を返します。

![`await`のオーバーヘッド削減の概要図](/_img/fast-async/await-overhead-removed.svg)

この最適化により、`await`に渡される値がすでにプロミスである場合には、ラッパープロミスの作成を回避することができ、この場合**最低3つ**のマイクロティックからわずか**1つ**のマイクロティックに減少します。この動作はNode.js 8が行うものに似ていますが、今回はもうバグではなく、標準化されつつある最適化です！

エンジンが完全に内部のものである「使い捨て」プロミスを作成しなければならないのはまだ違和感があります。実際、「使い捨て」プロミスは仕様の内部操作`performPromiseThen`のAPI制約を満たすためだけに存在していることがわかります。

![](/_img/fast-async/await-optimized.svg)

これは最近のECMAScript仕様への[編集変更](https://github.com/tc39/ecma262/issues/694)で対処されました。エンジンは、もはや`await`のための`throwaway`プロミスを作成する必要はありません — ほとんどの場合[^2]。

[^2]: V8は`async_hooks`（[Node.js](https://nodejs.org/api/async_hooks.html)で使用される）のコンテキスト内で`throwaway`プロミスで`before`と`after`フックが実行されるため、まだ`throwaway`プロミスを作成する必要があります。

![最適化前後の`await`コードの比較](/_img/fast-async/node-10-vs-node-12.svg)

Node.js 10における`await`と、最適化されたNode.js 12での`await`を比較すると、この変更のパフォーマンスへの影響が見られます:

![](/_img/fast-async/benchmark-optimization.svg)

**`async`/`await`は手書きのプロミスコードを上回るパフォーマンスを発揮します**。重要なポイントは、非同期関数のオーバーヘッドを大幅に削減したことです — V8だけでなく、すべてのJavaScriptエンジンで、仕様を修正することでこれを実現しました。

**更新:** V8 v7.2およびChrome 72以降、`--harmony-await-optimization`はデフォルトで有効化されています。[この修正](https://github.com/tc39/ecma262/pull/1250)はECMAScript仕様に統合されました。

## 開発者体験の向上

パフォーマンスだけでなく、JavaScript開発者は問題の診断と修正能力にも関心を持っています。非同期コードに取り組む場合、それが必ずしも容易であるとは限りません。[Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools)は*非同期スタックトレース*、すなわち現在の同期スタック部分だけでなく非同期部分も含むスタックトレースをサポートしています:

![](/_img/fast-async/devtools.png)

これはローカル開発中に非常に便利な機能です。ただし、このアプローチはアプリケーションがデプロイされた後ではあまり役に立ちません。ポストモーテムデバッグ時には、ログファイルに`Error#stack`出力しか表示されず、それには非同期部分についての情報は含まれていません。

最近、非同期関数呼び出しで`Error#stack`プロパティを充実させる[*ゼロコストの非同期スタックトレース*](https://bit.ly/v8-zero-cost-async-stack-traces)に取り組んでいます。「ゼロコスト」と聞くと興奮を覚えるでしょう。このChrome DevTools機能には大きなオーバーヘッドを伴うのに、どうやったらゼロコストになるのでしょうか？`foo`が非同期的に`bar`を呼び出し、`bar`がプロミスを`await`した後に例外を投げる場合の例を考えてみてください:

```js
async function foo() {
  await bar();
  return 42;
}

async function bar() {
  await Promise.resolve();
  throw new Error('BEEP BEEP');
}

foo().catch(error => console.log(error.stack));
```

このコードをNode.js 8またはNode.js 10で実行すると、次のような出力が得られます:

```text/2
$ node index.js
Error: BEEP BEEP
    at bar (index.js:8:9)
    at process._tickCallback (internal/process/next_tick.js:68:7)
    at Function.Module.runMain (internal/modules/cjs/loader.js:745:11)
    at startup (internal/bootstrap/node.js:266:19)
    at bootstrapNodeJSCore (internal/bootstrap/node.js:595:3)
```

`foo()`の呼び出しがエラーを引き起こしているにもかかわらず、`foo`がスタックトレースに全く含まれていない点に注意してください。これにより、ウェブアプリケーションやクラウドコンテナ内でコードがデプロイされているかどうかに関わらず、JavaScript開発者がポストモーテムデバッグを行うことが難しくなります。

ここで興味深いのは、`bar`が完了した際にエンジンがどこで続けるべきかを知っている点です: `foo`関数の`await`の直後です。同時に、これが`foo`関数が一時停止された場所でもあります。エンジンはこの情報を使って非同期スタックトレースの特定部分 — `await`サイト — を再構成できます。この変更により、出力は以下のようになります:

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

スタックトレースでは、最上位の関数が最初に来て、その後に残りの同期スタックトレースが続き、それに続いて関数`foo`での非同期呼び出し`bar`が表示されます。この変更は新しい`--async-stack-traces`フラグの背後にあるV8に実装されています。**更新**: V8 v7.3以降、`--async-stack-traces`はデフォルトで有効になっています。

しかし、これを上記のChrome DevToolsの非同期スタックトレースと比較すると、スタックトレースの非同期部分から`foo`の実際の呼び出し箇所が欠けていることに気づくでしょう。前述の通り、このアプローチでは、`await`の場合、再開地点と中断地点が同じであるという事実を利用しています。しかし、通常の[`Promise#then()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then)や[`Promise#catch()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch)の呼び出しの場合はそうではありません。この背景については、Mathias Bynensが説明した[なぜ`await`が`Promise#then()`を上回るのか](https://mathiasbynens.be/notes/async-stack-traces)をご覧ください。

## 結論

2つの重要な最適化のおかげで、非同期関数が高速になりました:

- 余分な2つのマイクロチックの削除、および
- `throwaway`プロミスの削除。

さらに、開発者体験を向上させるために[*ゼロコスト非同期スタックトレース*](https://bit.ly/v8-zero-cost-async-stack-traces)を導入しました。これは非同期関数での`await`や`Promise.all()`で利用可能です。

そして、JavaScript開発者に向けた良いパフォーマンスアドバイスもあります:

- 手書きのプロミスコードよりも`async`関数と`await`を優先すること、そして
- JavaScriptエンジンが提供するネイティブプロミス実装を使用してショートカットの利点を活用すること、つまり`await`で2つのマイクロチックを回避すること。
