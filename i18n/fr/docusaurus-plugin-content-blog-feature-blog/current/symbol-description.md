---
title: "`Symbol.prototype.description`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-06-25
tags: 
  - ECMAScript
  - ES2019
description: "Symbol.prototype.description fournit un moyen ergonomique d'accéder à la description d'un symbole."
tweet: "1143432835665211394"
---
Les `Symbol` en JavaScript peuvent recevoir une description lors de leur création :

```js
const symbol = Symbol('foo');
//                    ^^^^^
```

Auparavant, la seule façon d'accéder à cette description par programme était de manière indirecte via `Symbol.prototype.toString()` :

```js
const symbol = Symbol('foo');
//                    ^^^^^
symbol.toString();
// → 'Symbol(foo)'
//           ^^^
symbol.toString().slice(7, -1); // 🤔
// → 'foo'
```

Cependant, ce code semble légèrement magique, pas très explicite, et viole le principe « exprimer l'intention, non l'implémentation ». Cette technique ne permet pas non plus de faire la distinction entre un symbole sans description (c'est-à-dire `Symbol()`) et un symbole dont la description est une chaîne vide (c'est-à-dire `Symbol('')`).

<!--truncate-->
[Le nouveau getter `Symbol.prototype.description`](https://tc39.es/ecma262/#sec-symbol.prototype.description) offre un moyen plus ergonomique d'accéder à la description d'un `Symbol` :

```js
const symbol = Symbol('foo');
//                    ^^^^^
symbol.description;
// → 'foo'
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
