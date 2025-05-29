---
title: &apos;Binding opcional en `catch`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-03-27
tags:
  - ECMAScript
  - ES2019
description: &apos;En ES2019, ahora se puede usar `catch` sin un parámetro.&apos;
tweet: &apos;956209997808939008&apos;
---
La cláusula `catch` de las sentencias `try` solía requerir un binding:

```js
try {
  doSomethingThatMightThrow();
} catch (exception) {
  //     ^^^^^^^^^
  // ¡Debemos nombrar el binding, incluso si no lo usamos!
  handleException();
}
```

En ES2019, ahora se puede [usar `catch` sin un binding](https://tc39.es/proposal-optional-catch-binding/). Esto es útil si no necesitas el objeto `exception` en el código que maneja la excepción.

```js
try {
  doSomethingThatMightThrow();
} catch { // → ¡Sin binding!
  handleException();
}
```

## Soporte para binding opcional en `catch`

<feature-support chrome="66 /blog/v8-release-66#optional-catch-binding"
                 firefox="58 https://bugzilla.mozilla.org/show_bug.cgi?id=1380881"
                 safari="yes https://trac.webkit.org/changeset/220068/webkit"
                 nodejs="10 https://github.com/nodejs/node/blob/master/doc/changelogs/CHANGELOG_V10.md#2018-04-24-version-1000-current-jasnell"
                 babel="yes"></feature-support>

<!--truncate-->