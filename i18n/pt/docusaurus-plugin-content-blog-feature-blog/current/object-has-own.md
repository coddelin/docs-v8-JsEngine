---
title: "`Object.hasOwn`"
author: "Victor Gomes ([@VictorBFG](https://twitter.com/VictorBFG))"
avatars:
  - "victor-gomes"
date: 2021-07-01
tags:
  - ECMAScript
description: "`Object.hasOwn` torna `Object.prototype.hasOwnProperty` mais acessível."
tweet: "1410577516943847424"
---

Hoje, é muito comum escrever código assim:

```js
const hasOwnProperty = Object.prototype.hasOwnProperty;

if (hasOwnProperty.call(object, 'foo')) {
  // `object` possui a propriedade `foo`.
}
```

Ou usar bibliotecas que expõem uma versão simplificada de `Object.prototype.hasOwnProperty`, como [has](https://www.npmjs.com/package/has) ou [lodash.has](https://www.npmjs.com/package/lodash.has).

Com a proposta [`Object.hasOwn`](https://github.com/tc39/proposal-accessible-object-hasownproperty), podemos simplesmente escrever:

```js
if (Object.hasOwn(object, 'foo')) {
  // `object` possui a propriedade `foo`.
}
```

`Object.hasOwn` já está disponível no V8 v9.3 por trás da flag `--harmony-object-has-own`, e em breve será implementado no Chrome.

## Suporte para `Object.hasOwn`

<feature-support chrome="yes https://chromium-review.googlesource.com/c/v8/v8/+/2922117"
                 firefox="yes https://hg.mozilla.org/try/rev/94515f78324e83d4fd84f4b0ab764b34aabe6d80"
                 safari="yes https://bugs.webkit.org/show_bug.cgi?id=226291"
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#accessible-objectprototypehasownproperty"></feature-support>

<!--truncate-->