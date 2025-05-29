---
title: &apos;Até 4GB de memória em WebAssembly&apos;
author: &apos;Andreas Haas, Jakob Kummerow, e Alon Zakai&apos;
avatars:
  - &apos;andreas-haas&apos;
  - &apos;jakob-kummerow&apos;
  - &apos;alon-zakai&apos;
date: 2020-05-14
tags:
  - WebAssembly
  - JavaScript
  - ferramentas
tweet: &apos;1260944314441633793&apos;
---

## Introdução

Graças ao trabalho recente no Chrome e Emscripten, agora você pode usar até 4GB de memória em aplicações WebAssembly. Isso é um aumento em relação ao limite anterior de 2GB. Pode parecer estranho que tenha havido um limite - afinal, nenhum trabalho foi necessário para permitir que as pessoas usassem 512MB ou 1GB de memória! - mas acontece que há algumas coisas especiais acontecendo no salto de 2GB para 4GB, tanto no navegador quanto na cadeia de ferramentas, que descreveremos neste post.

<!--truncate-->
## 32 bits

Um pouco de contexto antes de entrarmos em mais detalhes: o novo limite de 4GB é a maior quantidade de memória possível com ponteiros de 32 bits, que é o que o WebAssembly atualmente suporta, conhecido como “wasm32” no LLVM e em outros lugares. Há trabalho em andamento para um “wasm64” ([“memory64”](https://github.com/WebAssembly/memory64/blob/master/proposals/memory64/Overview.md) na especificação wasm) no qual os ponteiros podem ser de 64 bits e poderíamos usar mais de 16 milhões de terabytes de memória (!), mas até lá, 4GB é o máximo que podemos esperar acessar.

Parece que sempre deveríamos ter sido capazes de acessar 4GB, já que é isso que os ponteiros de 32 bits permitem. Então, por que estávamos limitados a metade disso, apenas 2GB? Há várias razões, tanto do lado do navegador quanto da cadeia de ferramentas. Vamos começar com o navegador.

## Trabalho no Chrome/V8

Em princípio, as mudanças no V8 parecem simples: Apenas garantir que todo o código gerado para funções WebAssembly, bem como todo o código de gerenciamento de memória, use inteiros de 32 bits sem sinal para índices de memória e comprimentos, e deveríamos estar prontos. No entanto, na prática, há mais do que isso! Como a memória WebAssembly pode ser exportada para JavaScript como um ArrayBuffer, também tivemos que mudar a implementação de ArrayBuffers do JavaScript, TypedArrays, e todas as APIs da Web que usam ArrayBuffers e TypedArrays, como Web Audio, WebGPU e WebUSB.

O primeiro problema que tivemos que resolver foi que o V8 usava [Smis](https://v8.dev/blog/pointer-compression#value-tagging-in-v8) (ou seja, inteiros assinados de 31 bits) para índices e comprimentos de TypedArray, então o tamanho máximo era, na verdade, 2<sup>30</sup>-1, ou cerca de 1GB. Além disso, descobrimos que mudar tudo para inteiros de 32 bits não seria suficiente, porque o comprimento de uma memória de 4GB na verdade não cabe em um inteiro de 32 bits. Para ilustrar: em decimal, há 100 números com dois dígitos (0 a 99), mas "100" em si é um número de três dígitos. Analogamente, 4GB podem ser endereçados com endereços de 32 bits, mas 4GB em si é um número de 33 bits. Poderíamos ter nos contentado com um limite ligeiramente menor, mas como tivemos que tocar todo o código TypedArray de qualquer forma, queríamos prepará-lo para limites futuros ainda maiores enquanto estávamos nele. Então mudamos todo o código que lida com índices ou comprimentos de TypedArray para usar tipos de inteiros de 64 bits, ou Números do JavaScript onde é necessário interface com o JavaScript. Como benefício adicional, isso significa que suportar memórias ainda maiores para wasm64 agora deve ser relativamente direto!

Um segundo desafio foi lidar com os casos especiais do JavaScript para elementos de Array, em comparação com propriedades nomeadas regulares, que são refletidos em nossa implementação de objetos. (Este é um problema bastante técnico relacionado à especificação do JavaScript, então não se preocupe se você não entender todos os detalhes.) Considere este exemplo:

```js
console.log(array[5_000_000_000]);
```

Se `array` for um objeto ou array JavaScript simples, então `array[5_000_000_000]` seria tratado como uma busca de propriedade baseada em string. O tempo de execução procuraria uma propriedade nomeada com a string “5000000000”. Se nenhuma tal propriedade puder ser encontrada, ele percorreria a cadeia de protótipos em busca dessa propriedade ou, eventualmente, retornaria `undefined` no final da cadeia. No entanto, se `array` em si, ou um objeto em sua cadeia de protótipos, for um TypedArray, então o tempo de execução deve procurar um elemento indexado no índice 5.000.000.000 ou imediatamente retornar `undefined` se este índice estiver fora dos limites.

Em outras palavras, as regras para TypedArrays são bastante diferentes de Arrays normais, e a diferença se manifesta principalmente para índices enormes. Então, enquanto apenas permitíamos TypedArrays menores, nossa implementação poderia ser relativamente simples; em particular, olhar para a chave de propriedade apenas uma vez era suficiente para decidir se o caminho de busca "indexado" ou "nomeado" deveria ser tomado. Para permitir TypedArrays maiores, agora temos que fazer essa distinção repetidamente enquanto percorremos a cadeia de protótipos, o que exige cache cuidadoso para evitar desacelerar o código JavaScript existente com trabalho repetido e sobrecarga.

## Trabalho da cadeia de ferramentas

Do lado da ferramenta, também tivemos que trabalhar, a maior parte disso no código de suporte JavaScript, não no código compilado em WebAssembly. O principal problema era que o Emscripten sempre escreveu acessos à memória neste formato:

```js
HEAP32[(ptr + offset) >> 2]
```

Isso lê 32 bits (4 bytes) como um inteiro com sinal a partir do endereço `ptr + offset`. Como funciona é que `HEAP32` é um Int32Array, o que significa que cada índice na matriz tem 4 bytes. Portanto, precisamos dividir o endereço em bytes (`ptr + offset`) por 4 para obter o índice, o que é feito pelo `>> 2`.

O problema é que `>>` é uma operação *com sinal*! Se o endereço estiver na marca de 2GB ou acima, ele transbordará a entrada para um número negativo:

```js
// Um pouco abaixo de 2GB está ok, isso imprime 536870911
console.log((2 * 1024 * 1024 * 1024 - 4) >> 2);
// 2GB transborda e obtemos -536870912 :(
console.log((2 * 1024 * 1024 * 1024) >> 2);
```

A solução é fazer um deslocamento *sem sinal*, `>>>`:

```js
// Isso nos dá 536870912, como queremos!
console.log((2 * 1024 * 1024 * 1024) >>> 2);
```

O Emscripten sabe em tempo de compilação se você pode usar 2GB ou mais de memória (dependendo das flags que você usa; veja mais detalhes posteriormente). Se suas flags permitem endereços de 2GB ou mais, então o compilador reescreverá automaticamente todos os acessos à memória para usar `>>>` em vez de `>>`, o que inclui não apenas os acessos a `HEAP32` etc., como nos exemplos acima, mas também operações como `.subarray()` e `.copyWithin()`. Em outras palavras, o compilador mudará para usar ponteiros sem sinal em vez dos com sinal.

Essa transformação aumenta um pouco o tamanho do código - um caractere extra em cada deslocamento - e é por isso que não fazemos isso se você não estiver usando endereços de 2GB ou mais. Embora a diferença seja tipicamente menor que 1%, é simplesmente desnecessário e fácil de evitar - e muitas pequenas otimizações somam!

Outros problemas raros podem surgir no código de suporte JavaScript. Enquanto acessos normais à memória são tratados automaticamente como descrito anteriormente, fazer algo como comparar manualmente um ponteiro com sinal a um sem sinal irá (no endereço de 2GB ou acima) retornar falso. Para encontrar esses problemas, auditamos o JavaScript do Emscripten e também executamos a suíte de testes em um modo especial onde tudo é colocado no endereço de 2GB ou mais. (Observe que, se você escrever seu próprio código de suporte em JavaScript, pode haver coisas para corrigir aí também, caso faça operações manuais com ponteiros fora dos acessos normais à memória.)

## Experimentando

Para testar isso, [obtenha a última versão do Emscripten](https://emscripten.org/docs/getting_started/downloads.html), ou pelo menos a versão 1.39.15. Em seguida, compile com flags como

```
emcc -s ALLOW_MEMORY_GROWTH -s MAXIMUM_MEMORY=4GB
```

Essas flags habilitam o crescimento de memória e permitem que o programa aloque até 4GB de memória. Observe que, por padrão, você só poderá alocar até 2GB - você deve optar explicitamente por usar 2-4GB (isso nos permite emitir código mais compacto, emitindo `>>` em vez de `>>>`, como mencionado acima).

Certifique-se de testar no Chrome M83 (atualmente em Beta) ou posterior. Por favor, registre problemas se encontrar algo errado!

## Conclusão

O suporte para até 4GB de memória é mais um passo para tornar a web tão capaz quanto as plataformas nativas, permitindo que programas de 32 bits usem tanta memória quanto normalmente usariam. Por si só, isso não habilita uma classe completamente nova de aplicativos, mas permite experiências de alto padrão, como um nível muito grande em um jogo ou manipulação de grandes conteúdos em um editor gráfico.

Conforme mencionado anteriormente, o suporte para memória de 64 bits também está planejado, o que permitirá acessar ainda mais que 4GB. No entanto, wasm64 terá a mesma desvantagem que 64 bits tem em plataformas nativas, que é que os ponteiros ocupam o dobro da memória. É por isso que o suporte a 4GB no wasm32 é tão importante: podemos acessar o dobro da memória do que antes, enquanto o tamanho do código permanece tão compacto quanto o wasm sempre foi!

Como sempre, teste seu código em vários navegadores, e também lembre-se de que 2-4GB é muita memória! Se você precisar de tanto, use, mas não faça isso desnecessariamente, já que pode não haver memória livre suficiente nos computadores de muitos usuários. Recomendamos que você comece com uma memória inicial o menor possível e a aumente, se necessário; e, se permitir crescimento, trate de forma graciosa o caso de uma falha de `malloc()`.
