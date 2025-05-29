---
title: "エラー原因"
author: "Victor Gomes ([@VictorBFG](https://twitter.com/VictorBFG))"
avatars:
  - "victor-gomes"
date: 2021-07-07
tags:
  - ECMAScript
description: "JavaScriptはエラー原因をサポートするようになりました。"
tweet: "1412774651558862850"
---

例えば、`doSomeWork` と `doMoreWork` という2つの異なる作業を呼び出す関数があるとします。この2つの関数は同じ種類のエラーを投げる可能性がありますが、それらを別々に処理する必要があります。

エラーをキャッチし、それに追加のコンテキスト情報を付加して再スローすることは、この問題に対処する一般的な方法です。例えば以下のように:

```js
function doWork() {
  try {
    doSomeWork();
  } catch (err) {
    throw new CustomError('作業の一部が失敗しました', err);
  }
  doMoreWork();
}

try {
  doWork();
} catch (err) {
  // |err| は |doSomeWork| または |doMoreWork| のどちらから来たのか？
}
```

残念ながら、上記の解決法は手間がかかります。なぜなら、自分で `CustomError` を作成する必要があるからです。さらに悪いことに、開発ツールが予期しない例外に対して有益な診断メッセージを提供することができません。これは、これらのエラーを正しく表現する方法についての合意がないためです。

<!--truncate-->
これまで不足していたのは、エラーをチェーンする標準的な方法です。JavaScriptは現在、エラー原因をサポートしています。`Error` コンストラクタに `cause` プロパティを含む追加のオプションパラメータを追加することで、この値がエラーインスタンスに割り当てられます。そしてエラーを簡単にチェーンすることができます。

```js
function doWork() {
  try {
    doSomeWork();
  } catch (err) {
    throw new Error('作業の一部が失敗しました', { cause: err });
  }
  try {
    doMoreWork();
  } catch (err) {
    throw new Error('さらに多くの作業が失敗しました', { cause: err });
  }
}

try {
  doWork();
} catch (err) {
  switch(err.message) {
    case '作業の一部が失敗しました':
      handleSomeWorkFailure(err.cause);
      break;
    case 'さらに多くの作業が失敗しました':
      handleMoreWorkFailure(err.cause);
      break;
  }
}
```

この機能はV8 v9.3で利用可能です。

## エラー原因のサポート

<feature-support chrome="93 https://chromium-review.googlesource.com/c/v8/v8/+/2784681"
                 firefox="91 https://bugzilla.mozilla.org/show_bug.cgi?id=1679653"
                 safari="15 https://bugs.webkit.org/show_bug.cgi?id=223302"
                 nodejs="no"
                 babel="no"></feature-support>
