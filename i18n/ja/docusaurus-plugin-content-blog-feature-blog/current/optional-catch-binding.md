---
title: "オプションの`catch`バインディング"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2018-03-27
tags:
  - ECMAScript
  - ES2019
description: "ES2019では、catchがパラメータなしで使用できるようになりました。"
tweet: "956209997808939008"
---
`try`文の`catch`句は以前はバインディングが必要でした:

```js
try {
  doSomethingThatMightThrow();
} catch (exception) {
  //     ^^^^^^^^^
  // バインディング名を付ける必要があります、たとえそれを使用しなくても！
  handleException();
}
```

ES2019では、`catch`が[バインディングなしで使用可能](https://tc39.es/proposal-optional-catch-binding/)になりました。この機能は、例外を処理するコードで`exception`オブジェクトが必要ない場合に便利です。

```js
try {
  doSomethingThatMightThrow();
} catch { // → バインディングなし！
  handleException();
}
```

## オプションの`catch`バインディング対応状況

<feature-support chrome="66 /blog/v8-release-66#optional-catch-binding"
                 firefox="58 https://bugzilla.mozilla.org/show_bug.cgi?id=1380881"
                 safari="yes https://trac.webkit.org/changeset/220068/webkit"
                 nodejs="10 https://github.com/nodejs/node/blob/master/doc/changelogs/CHANGELOG_V10.md#2018-04-24-version-1000-current-jasnell"
                 babel="yes"></feature-support>

<!--truncate-->