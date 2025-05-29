---
title: "`String.prototype.matchAll`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-02-02
tags: 
  - ECMAScript
  - ES2020
  - io19
description: "String.prototype.matchAll facilita a iteração através de todos os objetos de correspondência que uma expressão regular produz."
---
É comum aplicar repetidamente a mesma expressão regular em uma string para obter todas as correspondências. Até certo ponto, isso já é possível hoje usando o método `String#match`.

Neste exemplo, encontramos todas as palavras que consistem apenas em dígitos hexadecimais e, em seguida, registramos cada correspondência:

```js
const string = 'Números hex mágicos: DEADBEEF CAFE';
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
for (const match of string.match(regex)) {
  console.log(match);
}

// Saída:
//
// 'DEADBEEF'
// 'CAFE'
```

No entanto, isso só fornece os _substrings_ que correspondem. Normalmente, você não quer apenas os substrings, mas também informações adicionais, como o índice de cada substring ou os grupos de captura dentro de cada correspondência.

Já é possível alcançar isso escrevendo seu próprio loop e rastreando os objetos de correspondência você mesmo, mas é um pouco chato e não muito prático:

```js
const string = 'Números hex mágicos: DEADBEEF CAFE';
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
let match;
while (match = regex.exec(string)) {
  console.log(match);
}

// Saída:
//
// [ 'DEADBEEF', índice: 19, entrada: 'Números hex mágicos: DEADBEEF CAFE' ]
// [ 'CAFE',     índice: 28, entrada: 'Números hex mágicos: DEADBEEF CAFE' ]
```

A nova API `String#matchAll` torna isso mais fácil do que nunca: agora você pode escrever um simples loop `for`-`of` para obter todos os objetos de correspondência.

```js
const string = 'Números hex mágicos: DEADBEEF CAFE';
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
for (const match of string.matchAll(regex)) {
  console.log(match);
}

// Saída:
//
// [ 'DEADBEEF', índice: 19, entrada: 'Números hex mágicos: DEADBEEF CAFE' ]
// [ 'CAFE',     índice: 28, entrada: 'Números hex mágicos: DEADBEEF CAFE' ]
```

`String#matchAll` é especialmente útil para expressões regulares com grupos de captura. Ele fornece todas as informações para cada correspondência individual, incluindo os grupos de captura.

```js
const string = 'Repositórios favoritos do GitHub: tc39/ecma262 v8/v8.dev';
const regex = /\b(?<owner>[a-z0-9]+)\/(?<repo>[a-z0-9\.]+)\b/g;
for (const match of string.matchAll(regex)) {
  console.log(`${match[0]} em ${match.index} com '${match.input}'`);
  console.log(`→ proprietário: ${match.groups.owner}`);
  console.log(`→ repositório: ${match.groups.repo}`);
}

<!--truncate-->
// Saída:
//
// tc39/ecma262 em 23 com 'Repositórios favoritos do GitHub: tc39/ecma262 v8/v8.dev'
// → proprietário: tc39
// → repositório: ecma262
// v8/v8.dev em 36 com 'Repositórios favoritos do GitHub: tc39/ecma262 v8/v8.dev'
// → proprietário: v8
// → repositório: v8.dev
```

A ideia geral é que você escreve um simples loop `for`-`of`, e o `String#matchAll` cuida do resto para você.

:::note
**Nota:** Como o nome implica, o `String#matchAll` é destinado a iterar através de _todos_ os objetos de correspondência. Como tal, ele deve ser usado com expressões regulares globais, ou seja, aquelas com o sinalizador `g`, já que qualquer expressão regular não global produziria apenas uma única correspondência (no máximo). Chamar `matchAll` com uma expressão regular não global resulta em uma exceção `TypeError`.
:::

## Suporte para `String.prototype.matchAll`

<feature-support chrome="73 /blog/v8-release-73#string.prototype.matchall"
                 firefox="67"
                 safari="13"
                 nodejs="12"
                 babel="sim https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
