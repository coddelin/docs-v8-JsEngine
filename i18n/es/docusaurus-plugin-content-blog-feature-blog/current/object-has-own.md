---
title: "`Object.hasOwn`"
author: "Victor Gomes ([@VictorBFG](https://twitter.com/VictorBFG))"
avatars: 
  - "victor-gomes"
date: 2021-07-01
tags: 
  - ECMAScript
description: "`Object.hasOwn` hace que `Object.prototype.hasOwnProperty` sea más accesible."
tweet: "1410577516943847424"
---

Hoy en día, es muy común escribir código como este:

```js
const hasOwnProperty = Object.prototype.hasOwnProperty;

if (hasOwnProperty.call(object, 'foo')) {
  // `object` tiene la propiedad `foo`.
}
```

O usar bibliotecas que exponen una versión simple de `Object.prototype.hasOwnProperty`, como [has](https://www.npmjs.com/package/has) o [lodash.has](https://www.npmjs.com/package/lodash.has).

Con la propuesta [`Object.hasOwn`](https://github.com/tc39/proposal-accessible-object-hasownproperty), podemos simplemente escribir:

```js
if (Object.hasOwn(object, 'foo')) {
  // `object` tiene la propiedad `foo`.
}
```

`Object.hasOwn` ya está disponible en V8 v9.3 detrás de la bandera `--harmony-object-has-own`, y lo desplegaremos pronto en Chrome.

## Compatibilidad con `Object.hasOwn`

<feature-support chrome="yes https://chromium-review.googlesource.com/c/v8/v8/+/2922117"
                 firefox="yes https://hg.mozilla.org/try/rev/94515f78324e83d4fd84f4b0ab764b34aabe6d80"
                 safari="yes https://bugs.webkit.org/show_bug.cgi?id=226291"
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#accessible-objectprototypehasownproperty"></feature-support>

<!--truncate-->