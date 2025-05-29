---
title: '可选的`catch`绑定'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2018-03-27
tags:
  - ECMAScript
  - ES2019
description: '在ES2019中，catch现在可以不带参数使用。'
tweet: '956209997808939008'
---
`try`语句的`catch`子句过去需要一个绑定：

```js
try {
  doSomethingThatMightThrow();
} catch (exception) {
  //     ^^^^^^^^^
  // 我们必须命名绑定，即使我们不使用它！
  handleException();
}
```

在ES2019中，`catch`现在可以[不带绑定使用](https://tc39.es/proposal-optional-catch-binding/)。如果您在处理异常的代码中不需要`exception`对象，这将非常有用。

```js
try {
  doSomethingThatMightThrow();
} catch { // → 无绑定！
  handleException();
}
```

## 可选的`catch`绑定支持

<feature-support chrome="66 /blog/v8-release-66#optional-catch-binding"
                 firefox="58 https://bugzilla.mozilla.org/show_bug.cgi?id=1380881"
                 safari="yes https://trac.webkit.org/changeset/220068/webkit"
                 nodejs="10 https://github.com/nodejs/node/blob/master/doc/changelogs/CHANGELOG_V10.md#2018-04-24-version-1000-current-jasnell"
                 babel="yes"></feature-support>

<!--truncate-->