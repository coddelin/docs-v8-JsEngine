---
title: 'Необязательное связывание `catch`'
author: 'Матиас Байненс ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2018-03-27
tags:
  - ECMAScript
  - ES2019
description: 'В ES2019 `catch` теперь может использоваться без параметра.'
tweet: '956209997808939008'
---
Конструкция `catch` в инструкции `try` ранее требовала связывание:

```js
try {
  doSomethingThatMightThrow();
} catch (exception) {
  //     ^^^^^^^^^
  // Мы должны указать связывание, даже если не используем его!
  handleException();
}
```

В ES2019 `catch` теперь может [использоваться без связывания](https://tc39.es/proposal-optional-catch-binding/). Это полезно, если объект `exception` не требуется в коде, обрабатывающем исключение.

```js
try {
  doSomethingThatMightThrow();
} catch { // → Без связывания!
  handleException();
}
```

## Поддержка необязательного связывания `catch`

<feature-support chrome="66 /blog/v8-release-66#optional-catch-binding"
                 firefox="58 https://bugzilla.mozilla.org/show_bug.cgi?id=1380881"
                 safari="yes https://trac.webkit.org/changeset/220068/webkit"
                 nodejs="10 https://github.com/nodejs/node/blob/master/doc/changelogs/CHANGELOG_V10.md#2018-04-24-version-1000-current-jasnell"
                 babel="yes"></feature-support>

<!--truncate-->