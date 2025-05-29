---
title: 'Variable `catch` facultative'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2018-03-27
tags:
  - ECMAScript
  - ES2019
description: 'En ES2019, catch peut maintenant être utilisé sans paramètre.'
tweet: '956209997808939008'
---
La clause `catch` des instructions `try` nécessitait un paramètre :

```js
try {
  faireQuelqueChoseQuiPeutJeterErreur();
} catch (exception) {
  //     ^^^^^^^^^
  // Nous devons nommer le paramètre, même si nous ne l'utilisons pas !
  gérerException();
}
```

En ES2019, `catch` peut maintenant être [utilisé sans paramètre](https://tc39.es/proposal-optional-catch-binding/). Cela est utile si vous n’avez pas besoin de l’objet `exception` dans le code qui gère l’exception.

```js
try {
  faireQuelqueChoseQuiPeutJeterErreur();
} catch { // → Pas de paramètre !
  gérerException();
}
```

## Prise en charge de la variable `catch` facultative

<feature-support chrome="66 /blog/v8-release-66#optional-catch-binding"
                 firefox="58 https://bugzilla.mozilla.org/show_bug.cgi?id=1380881"
                 safari="yes https://trac.webkit.org/changeset/220068/webkit"
                 nodejs="10 https://github.com/nodejs/node/blob/master/doc/changelogs/CHANGELOG_V10.md#2018-04-24-version-1000-current-jasnell"
                 babel="yes"></feature-support>

<!--truncate-->