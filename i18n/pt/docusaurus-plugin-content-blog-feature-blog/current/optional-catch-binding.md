---
title: "Vínculo opcional de `catch`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2018-03-27
tags:
  - ECMAScript
  - ES2019
description: "No ES2019, `catch` agora pode ser usado sem um parâmetro."
tweet: "956209997808939008"
---
A cláusula `catch` de instruções `try` costumava exigir um vínculo:

```js
try {
  doSomethingThatMightThrow();
} catch (exception) {
  //     ^^^^^^^^^
  // Precisamos nomear o vínculo, mesmo que não o utilizemos!
  handleException();
}
```

No ES2019, `catch` agora pode ser [usado sem um vínculo](https://tc39.es/proposal-optional-catch-binding/). Isso é útil se você não precisar do objeto `exception` no código que lida com a exceção.

```js
try {
  doSomethingThatMightThrow();
} catch { // → Sem vínculo!
  handleException();
}
```

## Suporte ao vínculo opcional `catch`

<feature-support chrome="66 /blog/v8-release-66#optional-catch-binding"
                 firefox="58 https://bugzilla.mozilla.org/show_bug.cgi?id=1380881"
                 safari="yes https://trac.webkit.org/changeset/220068/webkit"
                 nodejs="10 https://github.com/nodejs/node/blob/master/doc/changelogs/CHANGELOG_V10.md#2018-04-24-version-1000-current-jasnell"
                 babel="yes"></feature-support>

<!--truncate-->