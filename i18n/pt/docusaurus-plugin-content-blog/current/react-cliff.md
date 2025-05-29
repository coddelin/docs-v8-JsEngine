---
title: "A história de um declínio de desempenho no V8 do React"
author: "Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)) e Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "benedikt-meurer"
  - "mathias-bynens"
date: 2019-08-28 16:45:00
tags:
  - internos
  - apresentações
description: "Este artigo descreve como o V8 escolhe representações otimizadas na memória para vários valores JavaScript e como isso afeta a máquina de formas — tudo isso ajuda a explicar um recente declínio de desempenho no núcleo do React."
tweet: "1166723359696130049"
---
[Anteriormente](https://mathiasbynens.be/notes/shapes-ics), discutimos como os motores de JavaScript otimizam o acesso a objetos e arrays por meio do uso de Shapes e Inline Caches, e exploramos [como os motores aceleram o acesso a propriedades do protótipo](https://mathiasbynens.be/notes/prototypes) em particular. Este artigo descreve como o V8 escolhe representações otimizadas na memória para vários valores JavaScript e como isso afeta a máquina de formas — tudo isso ajuda a explicar [um recente declínio de desempenho no núcleo do React](https://github.com/facebook/react/issues/14365).

<!--truncate-->
:::note
**Nota:** Se você prefere assistir a uma apresentação em vez de ler artigos, aproveite o vídeo abaixo! Caso contrário, ignore o vídeo e continue lendo.
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/0I0d8LkDqyc" width="640" height="360" loading="lazy" allowfullscreen></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=0I0d8LkDqyc">“Fundamentos dos motores JavaScript: o bom, o mau e o feio”</a>, apresentado por Mathias Bynens e Benedikt Meurer no AgentConf 2019.</figcaption>
</figure>

## Tipos de JavaScript

Cada valor JavaScript possui exatamente um de (atualmente) oito tipos diferentes: `Number`, `String`, `Symbol`, `BigInt`, `Boolean`, `Undefined`, `Null` e `Object`.

![](/_img/react-cliff/01-javascript-types.svg)

Com uma exceção notável, esses tipos são observáveis em JavaScript através do operador `typeof`:

```js
typeof 42;
// → 'number'
typeof 'foo';
// → 'string'
typeof Symbol('bar');
// → 'symbol'
typeof 42n;
// → 'bigint'
typeof true;
// → 'boolean'
typeof undefined;
// → 'undefined'
typeof null;
// → 'object' 🤔
typeof { x: 42 };
// → 'object'
```

`typeof null` retorna `'object'`, e não `'null'`, apesar de `Null` ser um tipo por si só. Para entender o motivo, considere que o conjunto de todos os tipos JavaScript está dividido em dois grupos:

- _objetos_ (ou seja, o tipo `Object`)
- _primitivos_ (ou seja, qualquer valor que não seja objeto)

Assim, `null` significa “nenhum valor de objeto”, enquanto `undefined` significa “nenhum valor”.

![](/_img/react-cliff/02-primitives-objects.svg)

Seguindo essa linha de raciocínio, Brendan Eich projetou o JavaScript para fazer com que `typeof` retornasse `'object'` para todos os valores do lado direito, ou seja, todos os objetos e valores `null`, no espírito do Java. É por isso que `typeof null === 'object'`, apesar de a especificação ter um tipo `Null` separado.

![](/_img/react-cliff/03-primitives-objects-typeof.svg)

## Representação de valor

Os motores de JavaScript precisam ser capazes de representar valores JavaScript arbitrários na memória. No entanto, é importante notar que o tipo JavaScript de um valor é separado de como os motores de JavaScript representam esse valor na memória.

O valor `42`, por exemplo, tem o tipo `number` em JavaScript.

```js
typeof 42;
// → 'number'
```

Existem várias maneiras de representar um número inteiro como `42` na memória:

:::table-wrapper
| representação                      | bits                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------- |
| complemento de dois de 8 bits     | `0010 1010`                                                                       |
| complemento de dois de 32 bits    | `0000 0000 0000 0000 0000 0000 0010 1010`                                         |
| binário codificado decimal (BCD)  | `0100 0010`                                                                       |
| ponto flutuante de 32 bits IEEE-754 | `0100 0010 0010 1000 0000 0000 0000 0000`                                         |
| ponto flutuante de 64 bits IEEE-754 | `0100 0000 0100 0101 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000` |
:::

O ECMAScript padroniza os números como valores de ponto flutuante de 64 bits, também conhecidos como _ponto flutuante de dupla precisão_ ou _Float64_. No entanto, isso não significa que os motores JavaScript armazenam números na representação Float64 o tempo todo — fazer isso seria extremamente ineficiente! Os motores podem escolher outras representações internas, desde que o comportamento observável corresponda exatamente ao Float64.

A maioria dos números em aplicativos JavaScript do mundo real são [índices válidos de arrays ECMAScript](https://tc39.es/ecma262/#array-index), ou seja, valores inteiros no intervalo de 0 a 2³²−2.

```js
array[0]; // Menor índice possível de um array.
array[42];
array[2**32-2]; // Maior índice possível de um array.
```

Os motores JavaScript podem escolher uma representação otimizada na memória para esses números para otimizar o código que acessa elementos de um array por índice. Para que o processador realize a operação de acesso à memória, o índice do array deve estar disponível em [complemento de dois](https://en.wikipedia.org/wiki/Two%27s_complement). Representar índices de array como Float64 seria um desperdício, já que o motor teria que converter entre Float64 e complemento de dois toda vez que alguém acessasse um elemento do array.

A representação de complemento de dois de 32 bits não é útil apenas para operações de arrays. De maneira geral, **os processadores executam operações inteiras muito mais rápido do que operações de ponto flutuante**. É por isso que, no exemplo a seguir, o primeiro loop é facilmente duas vezes mais rápido em comparação com o segundo loop.

```js
for (let i = 0; i < 1000; ++i) {
  // rápido 🚀
}

for (let i = 0.1; i < 1000.1; ++i) {
  // lento 🐌
}
```

O mesmo vale para operações também. O desempenho do operador módulo no próximo código depende de se você está lidando com inteiros ou não.

```js
const remainder = value % divisor;
// Rápido 🚀 se `value` e `divisor` forem representados como inteiros,
// lento 🐌 caso contrário.
```

Se ambos os operandos forem representados como inteiros, a CPU pode calcular o resultado de forma muito eficiente. V8 possui caminhos rápidos adicionais para os casos em que o `divisor` é uma potência de dois. Para valores representados como flutuantes, o cálculo é muito mais complexo e demora muito mais.

Como operações inteiras geralmente são executadas muito mais rápido do que operações com ponto flutuante, parece que os motores poderiam apenas usar complemento de dois para todos os inteiros e todos os resultados de operações inteiras. Infelizmente, isso violaria a especificação ECMAScript! O ECMAScript padroniza no Float64, e assim **certas operações de inteiros realmente produzem valores flutuantes**. É importante que os motores JS produzam os resultados corretos nesses casos.

```js
// Float64 tem um intervalo de inteiros seguros de 53 bits. Além desse intervalo,
// você perde precisão.
2**53 === 2**53+1;
// → true

// Float64 suporta zeros negativos, então -1 * 0 deve ser -0, mas
// não há como representar zero negativo em complemento de dois.
-1*0 === -0;
// → true

// Float64 tem infinitos que podem ser produzidos através de divisão
// por zero.
1/0 === Infinity;
// → true
-1/0 === -Infinity;
// → true

// Float64 também tem NaNs.
0/0 === NaN;
```

Embora os valores à esquerda sejam inteiros, todos os valores à direita são flutuantes. É por isso que nenhuma das operações acima pode ser realizada corretamente usando complemento de dois de 32 bits. Os motores JavaScript devem tomar cuidado especial para garantir que operações inteiras recaiam apropriadamente para produzir os resultados sofisticados de Float64.

Para pequenos inteiros no intervalo de inteiros com sinal de 31 bits, V8 usa uma representação especial chamada `Smi`. Tudo que não é um `Smi` é representado como um `HeapObject`, que é o endereço de alguma entidade na memória. Para números, usamos um tipo especial de `HeapObject`, o chamado `HeapNumber`, para representar números que não estão no intervalo de `Smi`.

```js
 -Infinity // HeapNumber
-(2**30)-1 // HeapNumber
  -(2**30) // Smi
       -42 // Smi
        -0 // HeapNumber
         0 // Smi
       4.2 // HeapNumber
        42 // Smi
   2**30-1 // Smi
     2**30 // HeapNumber
  Infinity // HeapNumber
       NaN // HeapNumber
```

Como o exemplo acima mostra, alguns números JavaScript são representados como `Smi`s, e outros são representados como `HeapNumber`s. O V8 é especificamente otimizado para `Smi`s, porque pequenos inteiros são tão comuns em programas JavaScript do mundo real. `Smi`s não precisam ser alocados como entidades dedicadas na memória e permitem operações rápidas de inteiros em geral.

A conclusão importante aqui é que **mesmo valores com o mesmo tipo de JavaScript podem ser representados de maneiras completamente diferentes** nos bastidores, como uma otimização.

### `Smi` vs. `HeapNumber` vs. `MutableHeapNumber`

Veja como isso funciona nos bastidores. Digamos que você tenha o seguinte objeto:

```js
const o = {
  x: 42,  // Smi
  y: 4.2, // HeapNumber
};
```

O valor `42` para `x` pode ser codificado como `Smi`, então ele pode ser armazenado dentro do objeto em si. O valor `4.2`, por outro lado, precisa de uma entidade separada para conter o valor, e o objeto aponta para essa entidade.

![](/_img/react-cliff/04-smi-vs-heapnumber.svg)

Agora, digamos que executamos o seguinte código JavaScript:

```js
o.x += 10;
// → o.x agora é 52
o.y += 1;
// → o.y agora é 5.2
```

Neste caso, o valor de `x` pode ser atualizado diretamente, já que o novo valor `52` também se encaixa no intervalo de `Smi`.

![](/_img/react-cliff/05-update-smi.svg)

No entanto, o novo valor de `y=5.2` não se encaixa em um `Smi` e também é diferente do valor anterior `4.2`, então o V8 precisa alocar uma nova entidade `HeapNumber` para a atribuição a `y`.

![](/_img/react-cliff/06-update-heapnumber.svg)

`HeapNumber`s não são mutáveis, o que permite certas otimizações. Por exemplo, se atribuirmos o valor de `y` para `x`:

```js
o.x = o.y;
// → o.x agora é 5.2
```

…agora podemos simplesmente vincular ao mesmo `HeapNumber` em vez de alocar um novo para o mesmo valor.

![](/_img/react-cliff/07-heapnumbers.svg)

Uma desvantagem dos `HeapNumber`s serem imutáveis é que seria lento atualizar campos com valores fora do intervalo de `Smi` frequentemente, como no exemplo a seguir:

```js
// Cria uma instância de `HeapNumber`.
const o = { x: 0.1 };

for (let i = 0; i < 5; ++i) {
  // Cria uma instância adicional de `HeapNumber`.
  o.x += 1;
}
```

A primeira linha criaria uma instância de `HeapNumber` com o valor inicial `0.1`. O corpo do loop muda esse valor para `1.1`, `2.1`, `3.1`, `4.1` e, finalmente, `5.1`, criando um total de seis instâncias de `HeapNumber` no caminho, das quais cinco são lixo assim que o loop termina.

![](/_img/react-cliff/08-garbage-heapnumbers.svg)

Para evitar esse problema, o V8 fornece uma maneira de atualizar campos numéricos fora do intervalo de `Smi` no local também, como uma otimização. Quando um campo numérico contém valores fora do intervalo de `Smi`, o V8 marca esse campo como um campo `Double` na forma e aloca um chamado `MutableHeapNumber` que contém o valor real codificado como Float64.

![](/_img/react-cliff/09-mutableheapnumber.svg)

Quando o valor do campo muda, o V8 não precisa mais alocar um novo `HeapNumber`, mas pode simplesmente atualizar o `MutableHeapNumber` no local.

![](/_img/react-cliff/10-update-mutableheapnumber.svg)

No entanto, há uma ressalva para essa abordagem também. Como o valor de um `MutableHeapNumber` pode mudar, é importante garantir que eles não sejam compartilhados.

![](/_img/react-cliff/11-mutableheapnumber-to-heapnumber.svg)

Por exemplo, se você atribuir `o.x` a alguma outra variável `y`, você não gostaria que o valor de `y` mudasse na próxima vez que `o.x` mudasse — isso seria uma violação da especificação do JavaScript! Assim, quando `o.x` é acessado, o número deve ser *reempacotado* em um `HeapNumber` regular antes de ser atribuído a `y`.

Para floats, o V8 realiza toda a magia de “empacotamento” mencionada acima nos bastidores. Mas para pequenos inteiros seria um desperdício usar a abordagem do `MutableHeapNumber`, já que `Smi` é uma representação mais eficiente.

```js
const object = { x: 1 };
// → sem “empacotamento” para `x` no objeto

object.x += 1;
// → atualiza o valor de `x` dentro do objeto
```

Para evitar a ineficiência, tudo o que precisamos fazer para pequenos inteiros é marcar o campo na forma como representação `Smi` e simplesmente atualizar o valor numérico no local enquanto ele estiver dentro do intervalo de inteiros pequenos.

![](/_img/react-cliff/12-smi-no-boxing.svg)

## Depreciações e migrações de forma

E se um campo inicialmente contiver um `Smi`, mas depois armazenar um número fora do intervalo de inteiros pequenos? Como neste caso, com dois objetos usando a mesma forma onde `x` é representado como `Smi` inicialmente:

```js
const a = { x: 1 };
const b = { x: 2 };
// → objetos têm `x` como campo `Smi` agora

b.x = 0.2;
// → `b.x` agora é representado como um `Double`

y = a.x;
```

Isso começa com dois objetos apontando para a mesma forma, onde `x` é marcado como representação `Smi`:

![](/_img/react-cliff/13-shape.svg)

Quando `b.x` muda para a representação `Double`, o V8 aloca uma nova forma onde `x` é atribuído como representação `Double` e aponta de volta para a forma vazia. O V8 também aloca um `MutableHeapNumber` para armazenar o novo valor `0.2` para a propriedade `x`. Em seguida, atualizamos o objeto `b` para apontar para essa nova forma e alteramos o slot no objeto para apontar para o `MutableHeapNumber` alocado anteriormente no offset 0. E, finalmente, marcamos a forma antiga como obsoleta e a desvinculamos da árvore de transição. Isso é feito tendo uma nova transição para `'x'` da forma vazia para a forma recém-criada.

![](/_img/react-cliff/14-shape-transition.svg)

Não podemos remover completamente a forma antiga neste momento, pois ela ainda é usada por `a` e seria muito caro percorrer a memória para encontrar todos os objetos apontando para a forma antiga e atualizá-los imediatamente. Em vez disso, o V8 faz isso de forma preguiçosa: qualquer acesso ou atribuição de propriedade a `a` migra-a para a nova forma primeiro. A ideia é eventualmente tornar a forma obsoleta inacessível e permitir que o coletor de lixo a remova.

![](/_img/react-cliff/15-shape-deprecation.svg)

Um caso mais complicado ocorre se o campo que muda de representação não for o último na cadeia:

```js
const o = {
  x: 1,
  y: 2,
  z: 3,
};

o.y = 0.1;
```

Nesse caso, o V8 precisa encontrar a chamada _forma de divisão_, que é a última forma na cadeia antes da propriedade relevante ser introduzida. Aqui estamos mudando `y`, então precisamos encontrar a última forma que não tenha `y`, que em nosso exemplo é a forma que introduziu `x`.

![](/_img/react-cliff/16-split-shape.svg)

A partir da forma dividida, criamos uma nova cadeia de transição para `y` que reproduz todas as transições anteriores, mas com `'y'` sendo marcado como representação `Double`. E usamos essa nova cadeia de transição para `y`, marcando a subárvore antiga como obsoleta. No último passo, migramos a instância `o` para a nova forma, usando um `MutableHeapNumber` para armazenar o valor de `y` agora. Dessa forma, novos objetos não seguem o caminho antigo, e assim que todas as referências à forma antiga desaparecem, a parte obsoleta da árvore desaparece também.

## Transições de extensibilidade e níveis de integridade

`Object.preventExtensions()` impede que novas propriedades sejam adicionadas a um objeto. Se você tentar, ele lança uma exceção. (Se você não estiver no modo estrito, ele não lança uma exceção, mas silenciosamente não faz nada.)

```js
const object = { x: 1 };
Object.preventExtensions(object);
object.y = 2;
// TypeError: Não é possível adicionar a propriedade y;
//            o objeto não é extensível
```

`Object.seal` faz o mesmo que `Object.preventExtensions`, mas também marca todas as propriedades como não configuráveis, o que significa que você não pode excluí-las ou alterar sua enumerabilidade, configurabilidade ou capacidade de gravação.

```js
const object = { x: 1 };
Object.seal(object);
object.y = 2;
// TypeError: Não é possível adicionar a propriedade y;
//            o objeto não é extensível
delete object.x;
// TypeError: Não é possível excluir a propriedade x
```

`Object.freeze` faz o mesmo que `Object.seal`, mas também impede que os valores de propriedades existentes sejam alterados, marcando-os como somente leitura.

```js
const object = { x: 1 };
Object.freeze(object);
object.y = 2;
// TypeError: Não é possível adicionar a propriedade y;
//            o objeto não é extensível
delete object.x;
// TypeError: Não é possível excluir a propriedade x
object.x = 3;
// TypeError: Não é possível atribuir a propriedade somente leitura x
```

Vamos considerar este exemplo concreto, com dois objetos que ambos têm uma única propriedade `x`, e onde então impedimos quaisquer extensões adicionais ao segundo objeto.

```js
const a = { x: 1 };
const b = { x: 2 };

Object.preventExtensions(b);
```

Começa como já sabemos, fazendo a transição da forma vazia para uma nova forma que contém a propriedade `'x'` (representada como `Smi`). Quando impedimos extensões ao `b`, realizamos uma transição especial para uma nova forma marcada como não extensível. Essa transição especial não introduz nenhuma nova propriedade — é realmente apenas um marcador.

![](/_img/react-cliff/17-shape-nonextensible.svg)

Note como não podemos apenas atualizar a forma com `x` no local, já que ela é usada pelo outro objeto `a`, que ainda é extensível.

## O problema de desempenho do React

Agora vamos juntar tudo e usar o que aprendemos para entender [o recente problema #14365 do React](https://github.com/facebook/react/issues/14365). Quando a equipe do React fez o perfil de uma aplicação do mundo real, eles detectaram uma queda de desempenho incomum no V8 que afetava o núcleo do React. Aqui está um exemplo simplificado que reproduz o bug:

```js
const o = { x: 1, y: 2 };
Object.preventExtensions(o);
o.y = 0.2;
```

Temos um objeto com dois campos que têm representação `Smi`. Impedimos quaisquer extensões adicionais ao objeto e, eventualmente, forçamos o segundo campo a ter representação `Double`.

Como aprendemos anteriormente, isso cria aproximadamente a seguinte configuração:

![](/_img/react-cliff/18-repro-shape-setup.svg)

Ambas as propriedades são marcadas como representação `Smi`, e a última transição é a transição de extensibilidade para marcar a forma como não extensível.

Agora precisamos mudar `y` para representação `Double`, o que significa que precisamos começar novamente encontrando a forma dividida. Neste caso, é a forma que introduziu `x`. Mas agora o V8 ficou confuso, já que a forma dividida era extensível enquanto a forma atual estava marcada como não extensível. E o V8 realmente não sabia como reproduzir as transições corretamente neste caso. Então o V8 essencialmente desistiu de tentar entender isso, e em vez disso criou uma forma separada que não está conectada à árvore de formas existente e não é compartilhada com outros objetos. Pense nisso como uma _forma órfã_:

![](/_img/react-cliff/19-orphaned-shape.svg)

Você pode imaginar que isso é bem ruim se isso acontecer com muitos objetos, pois torna todo o sistema de formas inútil.

No caso do React, aqui está o que aconteceu: cada `FiberNode` tem alguns campos que devem armazenar timestamps quando o perfil está ativado.

```js
class FiberNode {
  constructor() {
    this.actualStartTime = 0;
    Object.preventExtensions(this);
  }
}

const node1 = new FiberNode();
const node2 = new FiberNode();
```

Esses campos (como `actualStartTime`) são inicializados com `0` ou `-1`, e assim começam com representação `Smi`. Mas, mais tarde, timestamps reais em ponto flutuante de [`performance.now()`](https://w3c.github.io/hr-time/#dom-performance-now) são armazenados nesses campos, causando a mudança para representação `Double`, já que eles não cabem em um `Smi`. Além disso, o React também impede extensões às instâncias de `FiberNode`.

Inicialmente, o exemplo simplificado acima parecia assim:

![](/_img/react-cliff/20-fibernode-shape.svg)

Há duas instâncias compartilhando uma árvore de formas, tudo funcionando como esperado. Mas então, ao armazenar o timestamp real, o V8 se confunde ao encontrar a forma dividida:

![](/_img/react-cliff/21-orphan-islands.svg)

O V8 atribui uma nova forma órfã ao `node1`, e o mesmo acontece com o `node2` algum tempo depois, resultando em duas _ilhas órfãs_, cada uma com suas próprias formas desconectadas. Muitos aplicativos React do mundo real têm não apenas duas, mas dezenas de milhares desses `FiberNode`s. Como você pode imaginar, essa situação não era particularmente boa para o desempenho do V8.

Felizmente, [corrigimos esse problema de desempenho](https://chromium-review.googlesource.com/c/v8/v8/+/1442640/) no [V8 v7.4](/blog/v8-release-74), e estamos [procurando tornar as mudanças de representação de campos mais baratas](https://bit.ly/v8-in-place-field-representation-changes) para remover quaisquer problemas de desempenho remanescentes. Com o reparo, o V8 agora faz o que é correto:

![](/_img/react-cliff/22-fix.svg)

As duas instâncias de `FiberNode` apontam para a forma não extensível onde `'actualStartTime'` é um campo `Smi`. Quando a primeira atribuição para `node1.actualStartTime` ocorre, uma nova cadeia de transição é criada e a cadeia anterior é marcada como obsoleta:

![](/_img/react-cliff/23-fix-fibernode-shape-1.svg)

Observe como a transição de extensibilidade agora é reproduzida corretamente na nova cadeia.

![](/_img/react-cliff/24-fix-fibernode-shape-2.svg)

Após a atribuição para `node2.actualStartTime`, ambos os nós referem-se à nova forma, e a parte obsoleta da árvore de transição pode ser limpa pelo coletor de lixo.

:::note
**Nota:** Você pode pensar que toda essa obsolescência/migração de formas é complexa, e estaria certo. Na verdade, suspeitamos que em sites do mundo real causa mais problemas (em termos de desempenho, uso de memória e complexidade) do que ajuda, especialmente porque com [compressão de ponteiros](https://bugs.chromium.org/p/v8/issues/detail?id=7703) não seremos mais capazes de usá-la para armazenar campos de valor duplo diretamente no objeto. Por isso, esperamos [remover completamente o mecanismo de obsolescência de formas do V8](https://bugs.chromium.org/p/v8/issues/detail?id=9606). Poderíamos dizer que ele está _\*põe os óculos escuros\*_ sendo obsoleto. _YEEEAAAHHH…_
:::

A equipe do React [mitigou o problema em sua parte](https://github.com/facebook/react/pull/14383) garantindo que todos os campos de tempo e duração em `FiberNode`s começassem com representação `Double`:

```js
class FiberNode {
  constructor() {
    // Força a representação `Double` desde o início.
    this.actualStartTime = Number.NaN;
    // Posteriormente, você ainda pode inicializar com o valor desejado:
    this.actualStartTime = 0;
    Object.preventExtensions(this);
  }
}

const node1 = new FiberNode();
const node2 = new FiberNode();
```

Em vez de `Number.NaN`, qualquer valor de ponto flutuante que não caiba no intervalo `Smi` poderia ser usado. Exemplos incluem `0.000001`, `Number.MIN_VALUE`, `-0` e `Infinity`.

Vale a pena destacar que o bug específico do React era específico do V8 e que, em geral, os desenvolvedores não deveriam otimizar para uma versão específica de um motor JavaScript. Ainda assim, é bom ter um controle quando as coisas não funcionam.

Lembre-se de que o motor JavaScript realiza alguma mágica nos bastidores, e você pode ajudá-lo evitando misturar tipos, se possível. Por exemplo, não inicialize seus campos numéricos com `null`, pois isso desativa todos os benefícios do acompanhamento de representação de campos e torna seu código mais legível:

```js
// Não faça isso!
class Point {
  x = null;
  y = null;
}

const p = new Point();
p.x = 0.1;
p.y = 402;
```

Em outras palavras, **escreva código legível, e o desempenho virá!**

## Conclusões

Cobrimos os seguintes tópicos neste mergulho profundo:

- O JavaScript distingue entre “primitivos” e “objetos”, e `typeof` é um mentiroso.
- Mesmo valores com o mesmo tipo JavaScript podem ter representações diferentes nos bastidores.
- O V8 tenta encontrar a representação ideal para cada propriedade em seus programas JavaScript.
- Discutimos como o V8 lida com obsolescências e migrações de formas, incluindo transições de extensibilidade.

Com base nesse conhecimento, identificamos algumas dicas práticas de codificação em JavaScript que podem ajudar a melhorar o desempenho:

- Sempre inicialize seus objetos da mesma maneira, para que as formas possam ser eficazes.
- Escolha valores iniciais sensatos para seus campos para ajudar os motores JavaScript na seleção de representação.
