---
title: &apos;Revisado `Function.prototype.toString`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-03-25
tags:
  - ECMAScript
  - ES2019
description: &apos;Function.prototype.toString agora retorna trechos exatos do texto do código-fonte, incluindo espaços em branco e comentários.&apos;
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
// → &apos;function foo() {}&apos;
//             ^ nenhum comentário
//                ^ nenhum espaço

// Agora:
foo.toString();
// → &apos;function /* comentário */ foo () {}&apos;
```

## Suporte ao recurso

<feature-support chrome="66 /blog/v8-release-66#function-tostring"
                 firefox="sim"
                 safari="não"
                 nodejs="8"
                 babel="não"></feature-support>
