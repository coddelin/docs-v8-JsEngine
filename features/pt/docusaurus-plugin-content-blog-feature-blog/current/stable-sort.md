---
title: &apos;Ordenação estável de `Array.prototype.sort`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-07-02
tags:
  - ECMAScript
  - ES2019
  - io19
description: &apos;Agora `Array.prototype.sort` é garantido como estável.&apos;
tweet: &apos;1146067251302244353&apos;
---
Digamos que você tenha um array de cachorros, onde cada cachorro tem um nome e uma classificação. (Se isso parecer um exemplo estranho, você deve saber que existe uma conta no Twitter que se especializa exatamente nisso... Não pergunte!)

```js
// Note como o array já está ordenado alfabeticamente por `nome`.
const doggos = [
  { name: &apos;Abby&apos;,   rating: 12 },
  { name: &apos;Bandit&apos;, rating: 13 },
  { name: &apos;Choco&apos;,  rating: 14 },
  { name: &apos;Daisy&apos;,  rating: 12 },
  { name: &apos;Elmo&apos;,   rating: 12 },
  { name: &apos;Falco&apos;,  rating: 13 },
  { name: &apos;Ghost&apos;,  rating: 14 },
];
// Ordene os cachorros por `rating` em ordem decrescente.
// (Isso atualiza `doggos` diretamente.)
doggos.sort((a, b) => b.rating - a.rating);
```

<!--truncate-->
O array está pré-ordenado alfabeticamente por nome. Para ordenar por classificação (`rating`) em vez disso (para obter os cachorros com melhores classificações primeiro), usamos `Array#sort`, passando um callback personalizado que compara as classificações. Este é o resultado que você provavelmente esperaria:

```js
[
  { name: &apos;Choco&apos;,  rating: 14 },
  { name: &apos;Ghost&apos;,  rating: 14 },
  { name: &apos;Bandit&apos;, rating: 13 },
  { name: &apos;Falco&apos;,  rating: 13 },
  { name: &apos;Abby&apos;,   rating: 12 },
  { name: &apos;Daisy&apos;,  rating: 12 },
  { name: &apos;Elmo&apos;,   rating: 12 },
]
```

Os cachorros estão ordenados por classificação, mas dentro de cada classificação, ainda estão ordenados alfabeticamente por nome. Por exemplo, Choco e Ghost têm a mesma pontuação de 14, mas Choco aparece antes de Ghost no resultado da ordenação, porque essa era a ordem no array original.

No entanto, para obter esse resultado, o motor JavaScript não pode usar _qualquer_ algoritmo de ordenação — ele deve ser um chamado “ordenamento estável”. Por muito tempo, a especificação de JavaScript não exigiu estabilidade de ordenação para `Array#sort`, deixando isso para a implementação. E porque esse comportamento não estava especificado, você também poderia obter este resultado de ordenação, onde Ghost aparece repentinamente antes de Choco:

```js
[
  { name: &apos;Ghost&apos;,  rating: 14 }, // 😢
  { name: &apos;Choco&apos;,  rating: 14 }, // 😢
  { name: &apos;Bandit&apos;, rating: 13 },
  { name: &apos;Falco&apos;,  rating: 13 },
  { name: &apos;Abby&apos;,   rating: 12 },
  { name: &apos;Daisy&apos;,  rating: 12 },
  { name: &apos;Elmo&apos;,   rating: 12 },
]
```

Em outras palavras, os desenvolvedores de JavaScript não podiam confiar na estabilidade da ordenação. Na prática, a situação era ainda mais irritante, pois alguns motores JavaScript usariam uma ordenação estável para arrays curtos e uma ordenação instável para arrays maiores. Isso era realmente confuso, já que os desenvolvedores testavam seu código, viam um resultado estável, mas então, de repente, obtinham um resultado instável em produção quando o array era um pouco maior.

Mas há boas notícias. Nós [projetamos uma alteração na especificação](https://github.com/tc39/ecma262/pull/1340) que torna `Array#sort` estável, e ela foi aceita. Todos os principais motores de JavaScript agora implementam uma ordenação estável em `Array#sort`. É apenas uma preocupação a menos para os desenvolvedores de JavaScript. Legal!

(Ah, e [fizemos o mesmo para `TypedArray`s](https://github.com/tc39/ecma262/pull/1433): essa ordenação agora também é estável.)

:::note
**Observação:** Embora a estabilidade seja agora exigida pela especificação, os motores de JavaScript ainda são livres para implementar qualquer algoritmo de ordenação que prefiram. [V8 usa Timsort](/blog/array-sort#timsort), por exemplo. A especificação não exige nenhum algoritmo de ordenação específico.
:::

## Suporte ao recurso

### Ordenação estável de `Array.prototype.sort`

<feature-support chrome="70 /blog/v8-release-70#javascript-language-features"
                 firefox="yes"
                 safari="yes"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-array"></feature-support>

### Ordenação estável de `%TypedArray%.prototype.sort`

<feature-support chrome="74 https://bugs.chromium.org/p/v8/issues/detail?id=8567"
                 firefox="67 https://bugzilla.mozilla.org/show_bug.cgi?id=1290554"
                 safari="yes"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-typed-arrays"></feature-support>
