---
title: "`Symbol.prototype.description`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-06-25
tags: 
  - ECMAScript
  - ES2019
description: "Symbol.prototype.description fornece uma maneira ergonômica de acessar a descrição de um Symbol."
tweet: "1143432835665211394"
---
Os `Symbol`s do JavaScript podem receber uma descrição ao serem criados:

```js
const symbol = Symbol('foo');
//                    ^^^^^
```

Anteriormente, a única maneira de acessar essa descrição de forma programática era indiretamente através de `Symbol.prototype.toString()`:

```js
const symbol = Symbol('foo');
//                    ^^^^^
symbol.toString();
// → 'Symbol(foo)'
//           ^^^
symbol.toString().slice(7, -1); // 🤔
// → 'foo'
```

No entanto, o código parece um pouco mágico, não é muito autoexplicativo, e viola o princípio "exprima a intenção, não a implementação". A técnica acima também não permite distinguir entre um símbolo sem descrição (ou seja, `Symbol()`) e um símbolo com uma string vazia como descrição (ou seja, `Symbol('')`).

<!--truncate-->
[O novo getter `Symbol.prototype.description`](https://tc39.es/ecma262/#sec-symbol.prototype.description) fornece uma maneira mais ergonômica de acessar a descrição de um `Symbol`:

```js
const symbol = Symbol('foo');
//                    ^^^^^
symbol.description;
// → 'foo'
```

Para `Symbol`s sem uma descrição, o getter retorna `undefined`:

```js
const symbol = Symbol();
symbol.description;
// → undefined
```

## Suporte para `Symbol.prototype.description`

<feature-support chrome="70 /blog/v8-release-70#javascript-language-features"
                 firefox="63"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="sim https://github.com/zloirock/core-js#ecmascript-symbol"></feature-support>
