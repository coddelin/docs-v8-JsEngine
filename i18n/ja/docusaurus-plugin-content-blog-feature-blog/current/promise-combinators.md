---
title: "Promiseの組み合わせ"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-06-12
tags: 
  - ECMAScript
  - ES2020
  - ES2021
  - io19
  - Node.js 16
description: "JavaScriptには4つのPromiseコンビネーターがあります: Promise.all, Promise.race, Promise.allSettled, そしてPromise.anyです。"
tweet: "1138819493956710400"
---
ES2015でPromiseが導入されて以来、JavaScriptでは静的メソッド`Promise.all`と`Promise.race`の2つのPromiseコンビネーターがサポートされています。

現在、標準化プロセスを進行中の2つの新しい提案があります: `Promise.allSettled`と`Promise.any`です。この追加により、JavaScriptには合計4つのPromiseコンビネーターが存在し、それぞれ異なるユースケースを可能にします。

<!--truncate-->
ここでは4つのコンビネーターの概要を紹介します:


| 名前                                        | 説明                                           | ステータス                                                         |
| ------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| [`Promise.allSettled`](#promise.allsettled) | 短絡しない                                     | [ES2020で追加 ✅](https://github.com/tc39/proposal-promise-allSettled) |
| [`Promise.all`](#promise.all)               | 入力値が拒否された場合に短絡                   | ES2015で追加 ✅                                                  |
| [`Promise.race`](#promise.race)             | 入力値が解決された場合に短絡                   | ES2015で追加 ✅                                                  |
| [`Promise.any`](#promise.any)               | 入力値が成功した場合に短絡                     | [ES2021で追加 ✅](https://github.com/tc39/proposal-promise-any)        |


各コンビネーターの例を見てみましょう。

## `Promise.all`

<feature-support chrome="32"
                 firefox="29"
                 safari="8"
                 nodejs="0.12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.all`は、すべての入力Promiseが成功した時、またはそのうちの1つが拒否された時に反応します。

例えば、ユーザーがボタンをクリックして完全に新しいUIをレンダリングするためにスタイルシートを読み込みたい場合。このプログラムは、各スタイルシートのHTTPリクエストを並行して開始します:

```js
const promises = [
  fetch('/component-a.css'),
  fetch('/component-b.css'),
  fetch('/component-c.css'),
];
try {
  const styleResponses = await Promise.all(promises);
  enableStyles(styleResponses);
  renderNewUi();
} catch (reason) {
  displayError(reason);
}
```

すべてのリクエストが成功した後だけ新しいUIのレンダリングを開始したいとします。何か問題が発生した場合、他の作業が終了するのを待たずにできるだけ早くエラーメッセージを表示したい場合。

その場合、`Promise.all`を使用して、すべてのPromiseが成功するのを待つか、1つが拒否された時点で通知を受け取ることができます。

## `Promise.race`

<feature-support chrome="32"
                 firefox="29"
                 safari="8"
                 nodejs="0.12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.race`は、複数のPromiseを実行して以下のいずれかを実現したい場合に役立ちます:

1. 最初に成功した結果に対応する (Promiseが成功した場合)、または
1. 最初に拒否されたPromiseがある場合、ただちに対応する。

つまり、Promiseの1つが拒否された場合、その拒否を保存してエラーケースを別途処理したい場合。この例ではその処理を行います:

```js
try {
  const result = await Promise.race([
    performHeavyComputation(),
    rejectAfterTimeout(2000),
  ]);
  renderResult(result);
} catch (error) {
  renderError(error);
}
```

計算負荷の高いタスクを実行し、それが長時間かかる可能性がある場合、2秒後に拒否されるPromiseとの競争をさせます。最初のPromiseが成功または拒否される結果に応じて、計算結果をレンダリングするか、エラーメッセージを別々のコード経路で表示します。

## `Promise.allSettled`

<feature-support chrome="76"
                 firefox="71 https://bugzilla.mozilla.org/show_bug.cgi?id=1549176"
                 safari="13"
                 nodejs="12.9.0 https://nodejs.org/en/blog/release/v12.9.0/"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.allSettled`は、すべての入力Promiseが解決された時点で信号を出します。それは成功または拒否された状態のどちらかを意味します。この機能はPromiseの状態を気にせず、仕事が完了したかどうかだけを知りたい場合に便利です。

例えば、一連の独立したAPI呼び出しを開始し、`Promise.allSettled`を使用してそれらすべてが完了するのを確認した後、ローディングスピナーを削除するなどの処理を行うことができます:

```js
const promises = [
  fetch('/api-call-1'),
  fetch('/api-call-2'),
  fetch('/api-call-3'),
];
// これらのリクエストのうちいくつかは失敗し、いくつかは成功すると想定されます。

await Promise.allSettled(promises);
// すべてのAPI呼び出しが（失敗または成功として）完了しました。
removeLoadingIndicator();
```

## `Promise.any`

<feature-support chrome="85 https://bugs.chromium.org/p/v8/issues/detail?id=9808"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1568903"
                 safari="14 https://bugs.webkit.org/show_bug.cgi?id=202566"
                 nodejs="16"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.any`は、いずれかのプロミスが完了した時点でシグナルを提供します。これは`Promise.race`に似ていますが、`any`はプロミスの1つが拒否された場合でも早期拒否を行いません。

```js
const promises = [
  fetch('/endpoint-a').then(() => 'a'),
  fetch('/endpoint-b').then(() => 'b'),
  fetch('/endpoint-c').then(() => 'c'),
];
try {
  const first = await Promise.any(promises);
  // いずれかのプロミスが完了しました。
  console.log(first);
  // → 例えば 'b'
} catch (error) {
  // すべてのプロミスが拒否されました。
  console.assert(error instanceof AggregateError);
  // 拒否された値をログ出力します:
  console.log(error.errors);
  // → [
  //     <TypeError: Failed to fetch /endpoint-a>,
  //     <TypeError: Failed to fetch /endpoint-b>,
  //     <TypeError: Failed to fetch /endpoint-c>
  //   ]
}
```

このコード例では、どのエンドポイントが最も早く応答するかを確認し、それをログ出力します。_すべて_のリクエストが失敗した場合にのみ、`catch`ブロックに入ってエラーを処理します。

`Promise.any`の拒否は、一度に複数のエラーを表すことができます。この機能を言語レベルでサポートするために、`AggregateError`という新しいエラータイプが導入されました。このタイプは上記の例での基本的な使用法に加えて、他のエラータイプと同様にプログラムで構築することもできます:

```js
const aggregateError = new AggregateError([errorA, errorB, errorC], '何かがうまくいかなかった！');
```
