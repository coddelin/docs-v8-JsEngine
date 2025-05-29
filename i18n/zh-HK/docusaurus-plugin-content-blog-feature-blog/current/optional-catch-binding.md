---
title: "可選擇 `catch` 綁定"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2018-03-27
tags:
  - ECMAScript
  - ES2019
description: "在 ES2019，catch 現在可以在沒有參數的情況下使用。"
tweet: "956209997808939008"
---
`try` 語句的 `catch` 子句以往需要一個綁定：

```js
try {
  doSomethingThatMightThrow();
} catch (exception) {
  //     ^^^^^^^^^
  // 我們必須命名這個綁定，縱使我們不使用它！
  handleException();
}
```

在 ES2019，`catch` 現在可以[在沒有綁定的情況下使用](https://tc39.es/proposal-optional-catch-binding/)。如果您在處理異常的代碼中不需要 `exception` 對象時，這很實用。

```js
try {
  doSomethingThatMightThrow();
} catch { // → 無綁定！
  handleException();
}
```

## 可選擇的 `catch` 綁定支持

<feature-support chrome="66 /blog/v8-release-66#optional-catch-binding"
                 firefox="58 https://bugzilla.mozilla.org/show_bug.cgi?id=1380881"
                 safari="yes https://trac.webkit.org/changeset/220068/webkit"
                 nodejs="10 https://github.com/nodejs/node/blob/master/doc/changelogs/CHANGELOG_V10.md#2018-04-24-version-1000-current-jasnell"
                 babel="yes"></feature-support>

<!--truncate-->