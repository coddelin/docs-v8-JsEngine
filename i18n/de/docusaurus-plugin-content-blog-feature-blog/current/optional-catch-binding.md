---
title: "Optionale `catch`-Bindung"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2018-03-27
tags:
  - ECMAScript
  - ES2019
description: "In ES2019 kann `catch` jetzt ohne Parameter verwendet werden."
tweet: "956209997808939008"
---
Die `catch`-Klausel von `try`-Anweisungen erforderte früher eine Bindung:

```js
try {
  doSomethingThatMightThrow();
} catch (exception) {
  //     ^^^^^^^^^
  // Wir müssen die Bindung benennen, auch wenn wir sie nicht verwenden!
  handleException();
}
```

In ES2019 kann `catch` jetzt [ohne eine Bindung verwendet werden](https://tc39.es/proposal-optional-catch-binding/). Dies ist nützlich, wenn Sie das `exception`-Objekt im Code, der die Ausnahme behandelt, nicht benötigen.

```js
try {
  doSomethingThatMightThrow();
} catch { // → Keine Bindung!
  handleException();
}
```

## Unterstützung für optionale `catch`-Bindung

<feature-support chrome="66 /blog/v8-release-66#optional-catch-binding"
                 firefox="58 https://bugzilla.mozilla.org/show_bug.cgi?id=1380881"
                 safari="yes https://trac.webkit.org/changeset/220068/webkit"
                 nodejs="10 https://github.com/nodejs/node/blob/master/doc/changelogs/CHANGELOG_V10.md#2018-04-24-version-1000-current-jasnell"
                 babel="yes"></feature-support>

<!--truncate-->