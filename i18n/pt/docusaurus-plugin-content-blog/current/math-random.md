---
title: "Existe `Math.random()`, e depois existe `Math.random()`"
author: "Yang Guo ([@hashseed](https://twitter.com/hashseed)), engenheiro de software e designer de dados"
avatars:
  - "yang-guo"
date: 2015-12-17 13:33:37
tags:
  - ECMAScript
  - internals
description: "A implementação de `Math.random` no V8 agora usa um algoritmo chamado xorshift128+, melhorando a aleatoriedade em comparação com a antiga implementação MWC1616."
---
> `Math.random()` retorna um valor do tipo `Number` com sinal positivo, maior ou igual a `0`, mas menor que `1`, escolhido aleatoriamente ou pseudoaleatoriamente com distribuição aproximadamente uniforme dentro desse intervalo, usando um algoritmo ou estratégia dependente da implementação. Esta função não aceita argumentos.

<!--truncate-->
— _[ES 2015, seção 20.2.2.27](http://tc39.es/ecma262/#sec-math.random)_

`Math.random()` é a fonte de aleatoriedade mais conhecida e usada frequentemente em JavaScript. No V8 e na maioria dos outros motores JavaScript, é implementado usando um [gerador de números pseudoaleatórios](https://en.wikipedia.org/wiki/Pseudorandom_number_generator) (PRNG). Como todos os PRNGs, o número aleatório é derivado de um estado interno, que é alterado por um algoritmo fixo para cada novo número aleatório. Portanto, para um estado inicial específico, a sequência de números aleatórios é determinística. Como o tamanho de bits n do estado interno é limitado, os números que um PRNG gera eventualmente se repetirão. O limite superior para o comprimento do período desse [ciclo de permutação](https://en.wikipedia.org/wiki/Cyclic_permutation) é 2<sup>n</sup>.

Existem muitos algoritmos PRNG diferentes; entre os mais conhecidos estão [Mersenne-Twister](https://en.wikipedia.org/wiki/Mersenne_Twister) e [LCG](https://en.wikipedia.org/wiki/Linear_congruential_generator). Cada um tem suas características particulares, vantagens e desvantagens. Idealmente, ele usaria o mínimo de memória possível para o estado inicial, seria rápido de executar, teria um grande comprimento de período e ofereceria uma distribuição aleatória de alta qualidade. Enquanto o uso de memória, desempenho e comprimento de período podem ser facilmente medidos ou calculados, a qualidade é mais difícil de determinar. Existe muita matemática por trás dos testes estatísticos para verificar a qualidade dos números aleatórios. O conjunto de testes padrão PRNG, [TestU01](http://simul.iro.umontreal.ca/testu01/tu01.html), implementa muitos desses testes.

Até [final de 2015](https://github.com/v8/v8/blob/ceade6cf239e0773213d53d55c36b19231c820b5/src/js/math.js#L143) (até a versão 4.9.40), a escolha de PRNG do V8 era MWC1616 (multiplicar com transporte, combinando duas partes de 16 bits). Ele usa 64 bits de estado interno e se parece aproximadamente com isso:

```cpp
uint32_t state0 = 1;
uint32_t state1 = 2;
uint32_t mwc1616() {
  state0 = 18030 * (state0 & 0xFFFF) + (state0 >> 16);
  state1 = 30903 * (state1 & 0xFFFF) + (state1 >> 16);
  return state0 << 16 + (state1 & 0xFFFF);
}
```

O valor de 32 bits é então transformado em um número de ponto flutuante entre 0 e 1, de acordo com a especificação.

MWC1616 usa pouca memória e é bastante rápido para computar, mas infelizmente oferece qualidade inferior:

- O número de valores aleatórios que pode gerar está limitado a 2<sup>32</sup>, em oposição aos 2<sup>52</sup> números entre 0 e 1 que a ponto flutuante de precisão dupla pode representar.
- A metade superior mais significativa do resultado depende quase totalmente do valor de state0. O comprimento do período seria no máximo 2<sup>32</sup>, mas em vez de poucos ciclos de permutação grandes, existem muitos ciclos curtos. Com um estado inicial mal escolhido, o comprimento do ciclo pode ser inferior a 40 milhões.
- Ele falha em muitos testes estatísticos no conjunto de testes TestU01.

Isso foi [apontado](https://medium.com/@betable/tifu-by-using-math-random-f1c308c4fd9d) para nós, e após entender o problema e realizar algumas pesquisas, decidimos reimplementar o `Math.random` com base em um algoritmo chamado [xorshift128+](http://vigna.di.unimi.it/ftp/papers/xorshiftplus.pdf). Ele usa 128 bits de estado interno, tem um comprimento de período de 2<sup>128</sup> - 1 e passa em todos os testes do conjunto TestU01.

A implementação [foi integrada no V8 v4.9.41.0](https://github.com/v8/v8/blob/085fed0fb5c3b0136827b5d7c190b4bd1c23a23e/src/base/utils/random-number-generator.h#L102) dentro de alguns dias após tomarmos conhecimento do problema. Tornou-se disponível com o Chrome 49. Tanto [Firefox](https://bugzilla.mozilla.org/show_bug.cgi?id=322529#c99) quanto [Safari](https://bugs.webkit.org/show_bug.cgi?id=151641) também mudaram para xorshift128+.

No V8 v7.1, a implementação foi ajustada novamente [CL](https://chromium-review.googlesource.com/c/v8/v8/+/1238551/5), confiando apenas em state0. Por favor, encontre mais detalhes sobre a implementação no [código fonte](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/base/utils/random-number-generator.h;l=119?q=XorShift128&sq=&ss=chromium).

No entanto, não se engane: embora o xorshift128+ seja uma grande melhoria em relação ao MWC1616, ele ainda não é [criptograficamente seguro](https://en.wikipedia.org/wiki/Cryptographically_secure_pseudorandom_number_generator). Para casos de uso como hashing, geração de assinaturas e criptografia/descriptografia, PRNGs comuns são inadequados. A API de Criptografia da Web introduz [`window.crypto.getRandomValues`](https://developer.mozilla.org/en-US/docs/Web/API/RandomSource/getRandomValues), um método que retorna valores aleatórios criptograficamente seguros, com um custo de desempenho.

Por favor, lembre-se de que, se você encontrar áreas de melhoria no V8 e no Chrome, mesmo aquelas que — como esta — não afetam diretamente a conformidade com as especificações, estabilidade ou segurança, registre [um problema em nosso rastreador de bugs](https://bugs.chromium.org/p/v8/issues/entry?template=Defect%20report%20from%20user).
