---
title: 'Revisado `Function.prototype.toString`'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2018-03-25
tags:
  - ECMAScript
  - ES2019
description: 'Function.prototype.toString agora retorna trechos exatos do texto do código-fonte, incluindo espaços em branco e comentários.'
---
[`Function.prototype.toString()`](https://tc39.es/Function-prototype-toString-revision/) agora retorna trechos exatos do texto do código-fonte, incluindo espaços em branco e comentários. Aqui está um exemplo comparando o comportamento antigo e o novo:

<!--truncate-->
```js
// Observe o comentário entre a palavra-chave `function`
// e o nome da função, bem como o espaço após
// o nome da função.
function /* um comentário */ foo () {}

// Anteriormente, no V8:
foo.toString();
// → 'function foo() {}'
//             ^ nenhum comentário
//                ^ nenhum espaço

// Agora:
foo.toString();
// → 'function /* comentário */ foo () {}'
```

## Suporte ao recurso

<feature-support chrome="66 /blog/v8-release-66#function-tostring"
                 firefox="sim"
                 safari="não"
                 nodejs="8"
                 babel="não"></feature-support>
