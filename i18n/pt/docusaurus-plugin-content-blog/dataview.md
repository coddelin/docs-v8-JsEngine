---
title: "Melhorando o desempenho do `DataView` no V8"
author: "Théotime Grohens, <i lang=\"fr\">o especialista em Data-Vue</i>, e Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)), especialista em desempenho profissional"
avatars: 
  - "benedikt-meurer"
date: "2018-09-18 11:20:37"
tags: 
  - ECMAScript
  - benchmarks
description: "O V8 v6.9 reduz a diferença de desempenho entre DataView e o código equivalente TypedArray, tornando o DataView efetivamente utilizável para aplicações reais críticas de desempenho."
tweet: "1041981091727466496"
---
[`DataView`s](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView) são uma das duas maneiras possíveis de realizar acessos de memória em baixo nível no JavaScript, sendo a outra [`TypedArray`s](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray). Até agora, os `DataView`s eram muito menos otimizados do que os `TypedArray`s no V8, resultando em desempenho inferior em tarefas como cargas de trabalho intensivas em gráficos ou na decodificação/codificação de dados binários. As razões para isso foram principalmente escolhas históricas, como o fato de que [asm.js](http://asmjs.org/) escolheu `TypedArray`s em vez de `DataView`s, incentivando os motores a focarem no desempenho dos `TypedArray`s.

<!--truncate-->
Por causa da penalidade de desempenho, desenvolvedores de JavaScript, como a equipe do Google Maps, decidiram evitar `DataView`s e depender dos `TypedArray`s, mesmo que isso aumentasse a complexidade do código. Este artigo explica como nós elevamos o desempenho do `DataView` para corresponder — e até superar — o código equivalente de `TypedArray` no [V8 v6.9](/blog/v8-release-69), tornando `DataView` utilizável para aplicações reais críticas de desempenho.

## Contexto

Desde a introdução do ES2015, o JavaScript suporta leitura e escrita de dados em buffers binários brutos chamados [`ArrayBuffer`s](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer). Os `ArrayBuffer`s não podem ser acessados diretamente; em vez disso, os programas devem usar um objeto *view* de buffer de array, que pode ser um `DataView` ou um `TypedArray`.

`TypedArray`s permitem que programas acessem o buffer como uma matriz de valores uniformemente tipados, como um `Int16Array` ou um `Float32Array`.

```js
const buffer = new ArrayBuffer(32);
const array = new Int16Array(buffer);

for (let i = 0; i < array.length; i++) {
  array[i] = i * i;
}

console.log(array);
// → [0, 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225]
```

Por outro lado, `DataView`s permitem acessos mais detalhados aos dados. Eles permitem que o programador escolha o tipo de valores lidos e escritos no buffer, fornecendo métodos especializados de getters e setters para cada tipo de número, tornando-os úteis para serializar estruturas de dados.

```js
const buffer = new ArrayBuffer(32);
const view = new DataView(buffer);

const person = { age: 42, height: 1.76 };

view.setUint8(0, person.age);
view.setFloat64(1, person.height);

console.log(view.getUint8(0)); // Saída esperada: 42
console.log(view.getFloat64(1)); // Saída esperada: 1.76
```

Além disso, `DataView`s também permitem a escolha da endianness do armazenamento de dados, o que pode ser útil ao receber dados de fontes externas como a rede, um arquivo ou uma GPU.

```js
const buffer = new ArrayBuffer(32);
const view = new DataView(buffer);

view.setInt32(0, 0x8BADF00D, true); // Escrita em Little-endian.
console.log(view.getInt32(0, false)); // Leitura em Big-endian.
// Saída esperada: 0x0DF0AD8B (233876875)
```

Uma implementação eficiente de `DataView` tem sido um pedido de recurso há muito tempo (veja [este relatório de bug](https://bugs.chromium.org/p/chromium/issues/detail?id=225811) de mais de 5 anos atrás), e estamos felizes em anunciar que o desempenho de DataView agora está equivalente!

## Implementação legada de tempo de execução

Até recentemente, os métodos `DataView` eram implementados como funções integradas em C++ no tempo de execução no V8. Isso é muito caro, pois cada chamada requeria uma transição custosa de JavaScript para C++ (e de volta).

Para investigar o custo real de desempenho incorrido por esta implementação, configuramos um benchmark de desempenho que compara a implementação nativa de getter do `DataView` com um wrapper em JavaScript que simula o comportamento de `DataView`. Este wrapper usa um `Uint8Array` para ler dados byte a byte do buffer subjacente e depois calcula o valor retornado a partir desses bytes. Aqui está, por exemplo, a função para leitura de valores inteiros sem sinal de 32 bits em Little-endian:

```js
function LittleEndian(buffer) { // Simula leitura de DataView em Little-endian.
  this.uint8View_ = new Uint8Array(buffer);
}

LittleEndian.prototype.getUint32 = function(byteOffset) {
  return this.uint8View_[byteOffset] |
    (this.uint8View_[byteOffset + 1] << 8) |
    (this.uint8View_[byteOffset + 2] << 16) |
    (this.uint8View_[byteOffset + 3] << 24);
};
```

`TypedArray`s já estão amplamente otimizados no V8, então eles representam a meta de desempenho que queríamos alcançar.

![Desempenho original de `DataView`](/_img/dataview/dataview-original.svg)

Nosso benchmark mostra que o desempenho dos getters nativos de `DataView` era até **4 vezes** mais lento do que o wrapper baseado em `Uint8Array`, tanto para leituras em big-endian quanto em little-endian.

## Melhorando o desempenho básico

Nosso primeiro passo para melhorar o desempenho dos objetos `DataView` foi mover a implementação do runtime C++ para [`CodeStubAssembler` (também conhecido como CSA)](/blog/csa). CSA é uma linguagem de montagem portátil que nos permite escrever código diretamente na representação intermediária de nível de máquina (IR) do TurboFan, e o usamos para implementar partes otimizadas da biblioteca padrão do JavaScript no V8. Reescrever o código em CSA evita completamente a chamada para o C++, e também gera código de máquina eficiente aproveitando o backend do TurboFan.

No entanto, escrever código CSA manualmente é trabalhoso. O fluxo de controle no CSA é expresso de maneira semelhante ao assembly, usando rótulos explícitos e `goto`s, o que torna o código mais difícil de ler e entender à primeira vista.

Para facilitar a contribuição dos desenvolvedores à biblioteca padrão otimizada do JavaScript no V8, e melhorar a legibilidade e a manutenção, começamos a projetar uma nova linguagem chamada V8 *Torque*, que compila para CSA. O objetivo da *Torque* é abstrair os detalhes de baixo nível que dificultam a escrita e a manutenção do código CSA, mantendo o mesmo perfil de desempenho.

Reescrever o código `DataView` foi uma excelente oportunidade para começar a usar Torque para novo código, e ajudou a fornecer aos desenvolvedores de Torque muitos feedbacks sobre a linguagem. Este é o método `getUint32()` de `DataView`, escrito em Torque:

```torque
macro LoadDataViewUint32(buffer: JSArrayBuffer, offset: intptr,
                    requested_little_endian: bool,
                    signed: constexpr bool): Number {
  let data_pointer: RawPtr = buffer.backing_store;

  let b0: uint32 = LoadUint8(data_pointer, offset);
  let b1: uint32 = LoadUint8(data_pointer, offset + 1);
  let b2: uint32 = LoadUint8(data_pointer, offset + 2);
  let b3: uint32 = LoadUint8(data_pointer, offset + 3);
  let result: uint32;

  if (requested_little_endian) {
    result = (b3 << 24) | (b2 << 16) | (b1 << 8) | b0;
  } else {
    result = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
  }

  return convert<Number>(result);
}
```

Mover os métodos `DataView` para Torque já mostrou uma **melhoria de 3×** no desempenho, mas ainda não alcançou o desempenho do wrapper baseado em `Uint8Array`.

![Desempenho do Torque `DataView`](/_img/dataview/dataview-torque.svg)

## Otimizando para TurboFan

Quando o código JavaScript fica quente, nós o compilamos usando nosso compilador otimizador TurboFan, para gerar código de máquina altamente otimizado que funciona com mais eficiência do que o bytecode interpretado.

O TurboFan funciona traduzindo o código JavaScript recebido em uma representação gráfica interna (mais precisamente, [um “mar de nós”](https://darksi.de/d.sea-of-nodes/)). Ele começa com nós de alto nível que correspondem às operações e semânticas do JavaScript e os refina gradualmente em nós de nível cada vez mais baixo, até finalmente gerar código de máquina.

Em particular, uma chamada de função, como chamar um dos métodos `DataView`, é representada internamente como um nó `JSCall`, que eventualmente se resume a uma chamada de função real no código de máquina gerado.

No entanto, o TurboFan nos permite verificar se o nó `JSCall` é realmente uma chamada para uma função conhecida, por exemplo, uma das funções incorporadas, e inserir esse nó no IR. Isso significa que o complicado `JSCall` é substituído em tempo de compilação por um subgrafo que representa a função. Isso permite que o TurboFan otimize o interior da função em passagens subsequentes como parte de um contexto mais amplo, em vez de por conta própria, e, o mais importante, se livrar da chamada de função custosa.

![Desempenho inicial do TurboFan `DataView`](/_img/dataview/dataview-turbofan-initial.svg)

Implementar a inserção TurboFan finalmente nos permitiu igualar e até superar o desempenho do nosso wrapper `Uint8Array`, sendo **8 vezes** mais rápido do que a implementação anterior em C++.

## Mais otimizações no TurboFan

Ao observar o código de máquina gerado pelo TurboFan após inserir os métodos `DataView`, ainda havia espaço para melhoria. A primeira implementação desses métodos tentou seguir o padrão bem de perto e lançou erros quando o especificado indica isso (por exemplo, ao tentar ler ou gravar fora dos limites do `ArrayBuffer` subjacente).

No entanto, o código que escrevemos no TurboFan é projetado para ser otimizado e o mais rápido possível para os casos comuns e frequentes — ele não precisa suportar todos os possíveis casos extremos. Ao remover todo o tratamento detalhado desses erros e simplesmente fazer a desotimização retornando à implementação padrão do Torque quando precisamos lançar uma exceção, conseguimos reduzir o tamanho do código gerado em cerca de 35%, gerando um aumento de velocidade bem perceptível, além de um código TurboFan consideravelmente mais simples.

Seguindo essa ideia de ser o mais especializado possível no TurboFan, também removemos o suporte para índices ou deslocamentos que são muito grandes (fora do intervalo Smi) dentro do código otimizado pelo TurboFan. Isso nos permitiu eliminar o tratamento de aritmética de float64 necessária para deslocamentos que não se encaixam em um valor de 32 bits e evitar o armazenamento de números inteiros grandes no heap.

Comparado à implementação inicial do TurboFan, isso mais que dobrou a pontuação do benchmark de `DataView`. Os `DataView`s agora estão até 3 vezes mais rápidos do que o wrapper `Uint8Array`, e cerca de **16 vezes mais rápidos** do que nossa implementação original de `DataView`!

![Desempenho final de `DataView` no TurboFan](/_img/dataview/dataview-turbofan-final.svg)

## Impacto

Avaliamos o impacto de desempenho da nova implementação em alguns exemplos do mundo real, além de nosso próprio benchmark.

Os `DataView`s são frequentemente utilizados ao decodificar dados codificados em formatos binários no JavaScript. Um desses formatos binários é o [FBX](https://en.wikipedia.org/wiki/FBX), um formato usado para troca de animações 3D. Instrumentamos o carregador FBX da popular biblioteca JavaScript 3D [three.js](https://threejs.org/) e medimos uma redução de 10% (cerca de 80 ms) em seu tempo de execução.

Comparamos o desempenho geral dos `DataView`s com os `TypedArray`s. Descobrimos que nossa nova implementação de `DataView` proporciona praticamente o mesmo desempenho que os `TypedArray`s ao acessar dados alinhados na endianidade nativa (little-endian em processadores Intel), reduzindo grande parte da diferença de desempenho e tornando os `DataView`s uma opção prática no V8.

![Desempenho máximo de `DataView` vs. `TypedArray`](/_img/dataview/dataview-vs-typedarray.svg)

Esperamos que agora você possa começar a usar `DataView`s onde fizer sentido, em vez de depender de shims de `TypedArray`. Por favor, envie-nos feedback sobre seus usos de `DataView`! Você pode nos contatar [via nosso rastreador de bugs](https://crbug.com/v8/new), por e-mail para v8-users@googlegroups.com, ou via [@v8js no Twitter](https://twitter.com/v8js).
