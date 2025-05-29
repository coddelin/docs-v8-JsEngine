---
title: &apos;`Symbol.prototype.description`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-06-25
tags:
  - ECMAScript
  - ES2019
description: &apos;Symbol.prototype.description fournit un moyen ergonomique d&apos;accéder à la description d&apos;un symbole.&apos;
tweet: &apos;1143432835665211394&apos;
---
Les `Symbol` en JavaScript peuvent recevoir une description lors de leur création :

```js
const symbol = Symbol(&apos;foo&apos;);
//                    ^^^^^
```

Auparavant, la seule façon d&apos;accéder à cette description par programme était de manière indirecte via `Symbol.prototype.toString()` :

```js
const symbol = Symbol(&apos;foo&apos;);
//                    ^^^^^
symbol.toString();
// → &apos;Symbol(foo)&apos;
//           ^^^
symbol.toString().slice(7, -1); // 🤔
// → &apos;foo&apos;
```

Cependant, ce code semble légèrement magique, pas très explicite, et viole le principe « exprimer l&apos;intention, non l&apos;implémentation ». Cette technique ne permet pas non plus de faire la distinction entre un symbole sans description (c&apos;est-à-dire `Symbol()`) et un symbole dont la description est une chaîne vide (c&apos;est-à-dire `Symbol(&apos;&apos;)`).

<!--truncate-->
[Le nouveau getter `Symbol.prototype.description`](https://tc39.es/ecma262/#sec-symbol.prototype.description) offre un moyen plus ergonomique d&apos;accéder à la description d&apos;un `Symbol` :

```js
const symbol = Symbol(&apos;foo&apos;);
//                    ^^^^^
symbol.description;
// → &apos;foo&apos;
```

Pour les `Symbol` sans description, le getter retourne `undefined` :

```js
const symbol = Symbol();
symbol.description;
// → undefined
```

## Support de `Symbol.prototype.description`

<feature-support chrome="70 /blog/v8-release-70#javascript-language-features"
                 firefox="63"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-symbol"></feature-support>
