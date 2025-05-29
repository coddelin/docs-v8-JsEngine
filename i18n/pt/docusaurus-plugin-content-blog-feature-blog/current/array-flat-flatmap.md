---
title: "`Array.prototype.flat` e `Array.prototype.flatMap`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2019-06-11
tags:
  - ECMAScript
  - ES2019
  - io19
description: "Array.prototype.flat achata um array até a profundidade especificada. Array.prototype.flatMap equivale a realizar um map seguido de um flat separadamente."
tweet: "1138457106380709891"
---
## `Array.prototype.flat`

O array neste exemplo tem vários níveis de profundidade: contém um array que, por sua vez, contém outro array.

```js
const array = [1, [2, [3]]];
//            ^^^^^^^^^^^^^ array externo
//                ^^^^^^^^  array interno
//                    ^^^   array mais interno
```

`Array#flat` retorna uma versão achatada de um array fornecido.

```js
array.flat();
// → [1, 2, [3]]

// …é equivalente a:
array.flat(1);
// → [1, 2, [3]]
```

A profundidade padrão é `1`, mas você pode passar qualquer número para achatar recursivamente até essa profundidade. Para continuar achatando recursivamente até o resultado não conter mais arrays aninhados, passamos `Infinity`.

```js
// Achatar recursivamente até o array não conter mais arrays aninhados:
array.flat(Infinity);
// → [1, 2, 3]
```

Por que esse método é chamado de `Array.prototype.flat` e não `Array.prototype.flatten`? [Leia nosso artigo sobre #SmooshGate para descobrir!](https://developers.google.com/web/updates/2018/03/smooshgate)

## `Array.prototype.flatMap`

Aqui está outro exemplo. Temos uma função `duplicate` que recebe um valor e retorna um array que contém esse valor duas vezes. Se aplicarmos `duplicate` a cada valor de um array, terminamos com um array aninhado.

```js
const duplicate = (x) => [x, x];

[2, 3, 4].map(duplicate);
// → [[2, 2], [3, 3], [4, 4]]
```

Você pode então chamar `flat` no resultado para achatar o array:

```js
[2, 3, 4].map(duplicate).flat(); // 🐌
// → [2, 2, 3, 3, 4, 4]
```

Como esse padrão é tão comum na programação funcional, agora há um método dedicado `flatMap` para ele.

```js
[2, 3, 4].flatMap(duplicate); // 🚀
// → [2, 2, 3, 3, 4, 4]
```

`flatMap` é um pouco mais eficiente em comparação a fazer um `map` seguido de um `flat` separadamente.

Interessado em casos de uso para `flatMap`? Confira [a explicação de Axel Rauschmayer](https://exploringjs.com/impatient-js/ch_arrays.html#flatmap-mapping-to-zero-or-more-values).

## Suporte a `Array#{flat,flatMap}`

<feature-support chrome="69 /blog/v8-release-69#javascript-language-features"
                 firefox="62"
                 safari="12"
                 nodejs="11"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-array"></feature-support>
