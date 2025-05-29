---
title: "Object.hasOwn"
author: "Victor Gomes ([@VictorBFG](https://twitter.com/VictorBFG))"
avatars:
  - "victor-gomes"
date: 2021-07-01
tags:
  - ECMAScript
description: "`Object.hasOwn` rend `Object.prototype.hasOwnProperty` plus accessible."
tweet: "1410577516943847424"
---

Aujourd'hui, il est très courant d'écrire du code comme celui-ci :

```js
const hasOwnProperty = Object.prototype.hasOwnProperty;

if (hasOwnProperty.call(object, 'foo')) {
  // `object` possède la propriété `foo`.
}
```

Ou d'utiliser des bibliothèques qui exposent une version simplifiée de `Object.prototype.hasOwnProperty`, telles que [has](https://www.npmjs.com/package/has) ou [lodash.has](https://www.npmjs.com/package/lodash.has).

Avec la proposition [`Object.hasOwn`](https://github.com/tc39/proposal-accessible-object-hasownproperty), nous pouvons simplement écrire :

```js
if (Object.hasOwn(object, 'foo')) {
  // `object` possède la propriété `foo`.
}
```

`Object.hasOwn` est déjà disponible dans V8 v9.3 derrière le drapeau `--harmony-object-has-own`, et nous le déploierons bientôt dans Chrome.

## Support de `Object.hasOwn`

<feature-support chrome="oui https://chromium-review.googlesource.com/c/v8/v8/+/2922117"
                 firefox="oui https://hg.mozilla.org/try/rev/94515f78324e83d4fd84f4b0ab764b34aabe6d80"
                 safari="oui https://bugs.webkit.org/show_bug.cgi?id=226291"
                 nodejs="non"
                 babel="oui https://github.com/zloirock/core-js#accessible-objectprototypehasownproperty"></feature-support>

<!--truncate-->