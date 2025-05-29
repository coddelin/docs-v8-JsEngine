---
title: "`Object.hasOwn`"
author: "Victor Gomes ([@VictorBFG](https://twitter.com/VictorBFG))"
avatars:
  - "victor-gomes"
date: 2021-07-01
tags:
  - ECMAScript
description: "`Object.hasOwn` macht `Object.prototype.hasOwnProperty` zugänglicher."
tweet: "1410577516943847424"
---

Heutzutage ist es sehr üblich, einen Code wie diesen zu schreiben:

```js
const hasOwnProperty = Object.prototype.hasOwnProperty;

if (hasOwnProperty.call(object, 'foo')) {
  // `object` hat die Eigenschaft `foo`.
}
```

Oder Bibliotheken zu verwenden, die eine vereinfachte Version von `Object.prototype.hasOwnProperty` bereitstellen, wie z. B. [has](https://www.npmjs.com/package/has) oder [lodash.has](https://www.npmjs.com/package/lodash.has).

Mit dem [`Object.hasOwn`-Vorschlag](https://github.com/tc39/proposal-accessible-object-hasownproperty) können wir einfach schreiben:

```js
if (Object.hasOwn(object, 'foo')) {
  // `object` hat die Eigenschaft `foo`.
}
```

`Object.hasOwn` ist bereits in V8 v9.3 hinter dem `--harmony-object-has-own`-Flag verfügbar, und wir werden es bald in Chrome einführen.

## Unterstützung für `Object.hasOwn`

<feature-support chrome="ja https://chromium-review.googlesource.com/c/v8/v8/+/2922117"
                 firefox="ja https://hg.mozilla.org/try/rev/94515f78324e83d4fd84f4b0ab764b34aabe6d80"
                 safari="ja https://bugs.webkit.org/show_bug.cgi?id=226291"
                 nodejs="nein"
                 babel="ja https://github.com/zloirock/core-js#accessible-objectprototypehasownproperty"></feature-support>

<!--truncate-->