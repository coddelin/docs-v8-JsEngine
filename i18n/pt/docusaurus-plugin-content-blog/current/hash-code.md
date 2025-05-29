---
title: 'Otimizando tabelas de hash: ocultando o código de hash'
author: '[Sathya Gunasekaran](https://twitter.com/_gsathya), guardião dos códigos de hash'
avatars:
  - 'sathya-gunasekaran'
date: 2018-01-29 13:33:37
tags:
  - internals
tweet: '958046113390411776'
description: 'Várias estruturas de dados em JavaScript, como Map, Set, WeakSet e WeakMap, usam tabelas de hash internamente. Este artigo explica como o V8 v6.3 melhora o desempenho das tabelas de hash.'
---
ECMAScript 2015 introduziu várias novas estruturas de dados, como Map, Set, WeakSet e WeakMap, todas elas usam tabelas de hash internamente. Este post detalha as [melhorias recentes](https://bugs.chromium.org/p/v8/issues/detail?id=6404) no modo como o [V8 v6.3+](/blog/v8-release-63) armazena as chaves nas tabelas de hash.

<!--truncate-->
## Código de hash

Uma [_função de hash_](https://en.wikipedia.org/wiki/Hash_function) é usada para mapear uma chave específica para um local na tabela de hash. Um _código de hash_ é o resultado de executar essa função de hash em uma chave específica.

No V8, o código de hash é apenas um número aleatório, independente do valor do objeto. Portanto, não podemos recomputá-lo, o que significa que precisamos armazená-lo.

Para objetos JavaScript que eram usados como chaves, anteriormente, o código de hash era armazenado como um símbolo privado no objeto. Um símbolo privado no V8 é semelhante a um [`Symbol`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol), exceto que não é enumerável e não vaza para o JavaScript em nível de usuário.

```js
function GetObjectHash(key) {
  let hash = key[hashCodeSymbol];
  if (IS_UNDEFINED(hash)) {
    hash = (MathRandom() * 0x40000000) | 0;
    if (hash === 0) hash = 1;
    key[hashCodeSymbol] = hash;
  }
  return hash;
}
```

Isso funcionou bem porque não precisávamos reservar memória para um campo de código de hash até que o objeto fosse adicionado a uma tabela de hash, momento em que um novo símbolo privado era armazenado no objeto.

O V8 também podia otimizar a busca do símbolo do código de hash da mesma forma que qualquer outra busca de propriedade usando o sistema IC, fornecendo buscas muito rápidas para o código de hash. Isso funciona bem para [buscas monomórficas IC](https://en.wikipedia.org/wiki/Inline_caching#Monomorphic_inline_caching), quando as chaves têm a mesma [classe oculta](/). No entanto, a maioria dos códigos do mundo real não segue esse padrão e frequentemente as chaves têm classes ocultas diferentes, levando a buscas IC [megamórficas](https://en.wikipedia.org/wiki/Inline_caching#Megamorphic_inline_caching) lentas do código de hash.

Outro problema com a abordagem de símbolo privado era que ela desencadeava uma [transição de classe oculta](/#fast-property-access) na chave ao armazenar o código de hash. Isso resultava em código polimórfico ruim não apenas para a busca do código de hash, mas também para outras buscas de propriedade na chave e [desotimização](https://floitsch.blogspot.com/2012/03/optimizing-for-v8-inlining.html) a partir de código otimizado.

## Armazenamento de suporte de objetos JavaScript

Um objeto JavaScript (`JSObject`) no V8 usa duas palavras (além do seu cabeçalho): uma palavra para armazenar um ponteiro para o armazenamento de suporte de elementos, e outra para armazenar um ponteiro para o armazenamento de suporte de propriedades.

O armazenamento de suporte de elementos é usado para armazenar propriedades que se parecem com [índices de array](https://tc39.es/ecma262/#sec-array-index), enquanto o armazenamento de suporte de propriedades é usado para armazenar propriedades cujas chaves são strings ou símbolos. Veja este [post no blog do V8](/blog/fast-properties) de Camillo Bruni para mais informações sobre esses armazenamentos de suporte.

```js
const x = {};
x[1] = 'bar';      // ← armazenado em elementos
x['foo'] = 'bar';  // ← armazenado em propriedades
```

## Ocultando o código de hash

A solução mais fácil para armazenar o código de hash seria estender o tamanho de um objeto JavaScript por uma palavra e armazenar o código de hash diretamente no objeto. No entanto, isso desperdiçaria memória para objetos que não são adicionados a uma tabela de hash. Em vez disso, poderíamos tentar armazenar o código de hash no armazenamento de elementos ou no armazenamento de propriedades.

O armazenamento de suporte de elementos é um array que contém seu comprimento e todos os elementos. Não há muito o que fazer aqui, já que armazenar o código de hash em um slot reservado (como o índice 0) ainda desperdiçaria memória quando não usamos o objeto como chave em uma tabela de hash.

Vamos olhar o armazenamento de suporte de propriedades. Existem dois tipos de estruturas de dados usadas como armazenamento de suporte de propriedades: arrays e dicionários.

Ao contrário da array usada no armazenamento de suporte de elementos, que não tem um limite superior, a array usada no armazenamento de suporte de propriedades tem um limite superior de 1022 valores. O V8 muda para usar um dicionário ao exceder esse limite por razões de desempenho. (Estou simplificando um pouco — o V8 também pode usar um dicionário em outros casos, mas há um limite superior fixo no número de valores que podem ser armazenados na array.)

Portanto, há três estados possíveis para o armazenamento de suporte de propriedades:

1. vazio (sem propriedades)
2. array (pode armazenar até 1022 valores)
3. dicionário

Vamos discutir cada um desses.

### A loja de suporte de propriedades está vazia

No caso vazio, podemos armazenar diretamente o código de hash neste deslocamento no `JSObject`.

![](/_img/hash-code/properties-backing-store-empty.png)

### A loja de suporte de propriedades é um array

O V8 representa inteiros menores que 2<sup>31</sup> (em sistemas de 32 bits) não embalados como [Smi](https://wingolog.org/archives/2011/05/18/value-representation-in-javascript-implementations)s. Em um Smi, o bit menos significativo é uma tag usada para distingui-lo de ponteiros, enquanto os 31 bits restantes contêm o valor inteiro real.

Normalmente, arrays armazenam seu comprimento como um Smi. Como sabemos que a capacidade máxima deste array é apenas 1022, precisamos de apenas 10 bits para armazenar o comprimento. Podemos usar os 21 bits restantes para armazenar o código de hash!

![](/_img/hash-code/properties-backing-store-array.png)

### A loja de suporte de propriedades é um dicionário

No caso do dicionário, aumentamos o tamanho do dicionário em 1 palavra para armazenar o código de hash em um slot dedicado no início do dicionário. Conseguimos lidar com o desperdício potencial de uma palavra de memória neste caso, porque o aumento proporcional no tamanho não é tão grande como no caso do array.

![](/_img/hash-code/properties-backing-store-dictionary.png)

Com essas alterações, a busca do código de hash não precisa mais passar pela complexa maquinaria de busca de propriedades do JavaScript.

## Melhorias de desempenho

O benchmark [SixSpeed](https://github.com/kpdecker/six-speed) rastreia o desempenho de Map e Set, e essas mudanças resultaram em uma melhoria de ~500%.

![](/_img/hash-code/sixspeed.png)

Essa mudança causou uma melhoria de 5% no benchmark Basic em [ARES6](https://webkit.org/blog/7536/jsc-loves-es6/) também.

![](/_img/hash-code/ares-6.png)

Isso também resultou em uma melhoria de 18% em um dos benchmarks na suíte de benchmarks [Emberperf](http://emberperf.eviltrout.com/) que testa Ember.js.

![](/_img/hash-code/emberperf.jpg)
