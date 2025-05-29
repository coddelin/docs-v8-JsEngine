---
title: "`Promise.prototype.finally`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2017-10-23
tags:
  - ECMAScript
  - ES2018
description: "Promise.prototype.finally を使用すると、Promise が完了した際（成功または失敗が確定した場合）に呼び出されるコールバックを登録できます。"
tweet: "922459978857824261"
---
`Promise.prototype.finally` を使用すると、Promise が _完了_（成功または失敗が確定）した際に呼び出されるコールバックを登録できます。

ページに表示するデータを取得したいと想像してください。そして、リクエストが開始された際にローディングスピナーを表示し、リクエストが完了した際にスピナーを非表示にします。問題が発生した場合には、代わりにエラーメッセージを表示します。

```js
const fetchAndDisplay = ({ url, element }) => {
  showLoadingSpinner();
  fetch(url)
    .then((response) => response.text())
    .then((text) => {
      element.textContent = text;
      hideLoadingSpinner();
    })
    .catch((error) => {
      element.textContent = error.message;
      hideLoadingSpinner();
    });
};

<!--truncate-->
fetchAndDisplay({
  url: someUrl,
  element: document.querySelector('#output')
});
```

リクエストが成功した場合はデータを表示します。何か問題が発生した場合は、代わりにエラーメッセージを表示します。

いずれの場合でも、`hideLoadingSpinner()` を呼び出す必要があります。これまでは、`then()` と `catch()` の両方のブロックでこの呼び出しを複製するしかありませんでした。`Promise.prototype.finally` を使用すれば、これを改善できます:

```js
const fetchAndDisplay = ({ url, element }) => {
  showLoadingSpinner();
  fetch(url)
    .then((response) => response.text())
    .then((text) => {
      element.textContent = text;
    })
    .catch((error) => {
      element.textContent = error.message;
    })
    .finally(() => {
      hideLoadingSpinner();
    });
};
```

これによりコードの重複が減るだけでなく、成功/失敗の処理フェーズと後処理フェーズがより明確に分離されます。素晴らしいですね！

現在、`async`/`await` を使用すれば、`Promise.prototype.finally` を使わなくても同様のことが可能です:

```js
const fetchAndDisplay = async ({ url, element }) => {
  showLoadingSpinner();
  try {
    const response = await fetch(url);
    const text = await response.text();
    element.textContent = text;
  } catch (error) {
    element.textContent = error.message;
  } finally {
    hideLoadingSpinner();
  }
};
```

[`async` と `await` はより優れている](https://mathiasbynens.be/notes/async-stack-traces)ため、標準の Promise よりもこれらを使用することを推奨します。それにもかかわらず、何らかの理由で標準の Promise を好む場合は、`Promise.prototype.finally` を使用することでコードをよりシンプルで明快にすることができます。

## `Promise.prototype.finally` のサポート

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="11.1"
                 nodejs="10"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>
