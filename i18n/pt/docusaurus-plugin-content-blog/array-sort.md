---
title: "Organizando coisas no V8"
author: "Simon Zünd ([@nimODota](https://twitter.com/nimODota)), comparador consistente"
avatars: 
  - simon-zuend
date: "2018-09-28 11:20:37"
tags: 
  - ECMAScript
  - internos
description: "A partir do V8 v7.0 / Chrome 70, Array.prototype.sort é estável."
tweet: "1045656758700650502"
---
`Array.prototype.sort` estava entre os últimos recursos incorporados em JavaScript auto-hospedado no V8. Portá-lo ofereceu-nos a oportunidade de experimentar diferentes algoritmos e estratégias de implementação e finalmente [torná-lo estável](https://mathiasbynens.be/demo/sort-stability) no V8 v7.0 / Chrome 70.

<!--truncate-->
## Contexto

Ordenar em JavaScript é complicado. Este post do blog analisa algumas peculiaridades na interação entre um algoritmo de ordenação e a linguagem JavaScript, e descreve nossa jornada para mover o V8 para um algoritmo estável e tornar o desempenho mais previsível.

Ao comparar diferentes algoritmos de ordenação, observamos seu pior e seu desempenho médio, dado como um limite no crescimento assintótico (ou seja, notaçao “Big O”) de operações de memória ou número de comparações. Observe que em linguagens dinâmicas, como JavaScript, uma operação de comparação geralmente é muito mais cara do que um acesso à memória. Isso se deve ao fato de que comparar dois valores ao ordenar geralmente envolve chamadas ao código do usuário.

Vamos dar uma olhada em um exemplo simples de ordenação de alguns números em ordem crescente com base em uma função de comparação fornecida pelo usuário. Uma função de comparação _consistente_ retorna `-1` (ou qualquer outro valor negativo), `0`, ou `1` (ou qualquer outro valor positivo) quando os dois valores fornecidos são menores, iguais ou maiores, respectivamente. Uma função de comparação que não segue esse padrão é _inconsistente_ e pode ter efeitos colaterais arbitrários, como modificar o array que se pretende ordenar.

```js
const array = [4, 2, 5, 3, 1];

function compare(a, b) {
  // Código arbitrário vai aqui, por exemplo `array.push(1);`.
  return a - b;
}

// Uma chamada de ordenação “típica”.
array.sort(compare);
```

Mesmo no próximo exemplo, podem ocorrer chamadas ao código do usuário. A função de comparação “padrão” chama `toString` em ambos os valores e realiza uma comparação lexicográfica nas representações de string.

```js
const array = [4, 2, 5, 3, 1];

array.push({
  toString() {
    // Código arbitrário vai aqui, por exemplo `array.push(1);`.
    return '42';
  }
});

// Ordenar sem uma função de comparação.
array.sort();
```

### Mais diversão com acessores e interações na cadeia de protótipos

Esta é a parte onde deixamos a especificação para trás e aventuramos-nos no território de comportamento “definido pela implementação”. A especificação possui uma lista de condições que, quando atendidas, permitem que o mecanismo ordene o objeto/array da maneira que considerar apropriada — ou não ordene de maneira alguma. Os mecanismos ainda devem seguir algumas regras básicas, mas todo o resto é bastante incerto. Por um lado, isso dá aos desenvolvedores de mecanismos a liberdade de experimentar diferentes implementações. Por outro lado, os usuários esperam um comportamento razoável, mesmo que a especificação não exija que exista algum. Isso é ainda mais complicado pelo fato de que “comportamento razoável” nem sempre é fácil de determinar.

Esta seção mostra que ainda existem alguns aspectos do `Array#sort` onde o comportamento do mecanismo difere bastante. Estes são casos extremos difíceis e, como mencionado acima, nem sempre é claro qual seria “a coisa certa a fazer”. Não recomendamos escrever código dessa forma; os mecanismos não vão otimizá-lo.

O primeiro exemplo mostra um array com alguns acessores (ou seja, getters e setters) e um “registro de chamadas” em diferentes mecanismos JavaScript. Os acessores são o primeiro caso em que a ordem de classificação resultante é definida pela implementação:

```js
const array = [0, 1, 2];

Object.defineProperty(array, '0', {
  get() { console.log('get 0'); return 0; },
  set(v) { console.log('set 0'); }
});

Object.defineProperty(array, '1', {
  get() { console.log('get 1'); return 1; },
  set(v) { console.log('set 1'); }
});

array.sort();
```

Aqui está a saída desse código em vários mecanismos. Observe que não há respostas “certas” ou “erradas” aqui — a especificação deixa isso a critério da implementação!

```
// Chakra
get 0
get 1
set 0
set 1

// JavaScriptCore
get 0
get 1
get 0
get 0
get 1
get 1
set 0
set 1

// V8
get 0
get 0
get 1
get 1
get 1
get 0

#### SpiderMonkey
get 0
get 1
set 0
set 1
```

O próximo exemplo mostra interações com a cadeia de protótipos. Para abreviar, não exibimos o registro de chamadas.

```js
const object = {
 1: 'd1',
 2: 'c1',
 3: 'b1',
 4: undefined,
 __proto__: {
   length: 10000,
   1: 'e2',
   10: 'a2',
   100: 'b2',
   1000: 'c2',
   2000: undefined,
   8000: 'd2',
   12000: 'XX',
   __proto__: {
     0: 'e3',
     1: 'd3',
     2: 'c3',
     3: 'b3',
     4: 'f3',
     5: 'a3',
     6: undefined,
   },
 },
};
Array.prototype.sort.call(object);
```

A saída mostra o `object` após ser ordenado. Novamente, não há uma resposta correta aqui. Este exemplo apenas demonstra como a interação entre propriedades indexadas e a cadeia de protótipos pode ser estranha:

```js
// Chakra
['a2', 'a3', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e3', undefined, undefined, undefined]

// JavaScriptCore
['a2', 'a2', 'a3', 'b1', 'b2', 'b2', 'c1', 'c2', 'd1', 'd2', 'e3', undefined]

// V8
['a2', 'a3', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e3', undefined, undefined, undefined]

// SpiderMonkey
['a2', 'a3', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e3', undefined, undefined, undefined]
```

### O que o V8 faz antes e depois de ordenar

:::note
**Nota:** Esta seção foi atualizada em junho de 2019 para refletir mudanças no pré- e pós-processamento de `Array#sort` no V8 v7.7.
:::

O V8 possui um passo de pré-processamento antes de realmente ordenar qualquer coisa e também um passo de pós-processamento. A ideia básica é coletar todos os valores não `undefined` em uma lista temporária, ordenar essa lista temporária e depois escrever os valores ordenados de volta na matriz ou objeto original. Isso libera o V8 de se preocupar com acessores ou a cadeia de protótipos durante a ordenação propriamente dita.

A especificação espera que `Array#sort` produza uma ordem de classificação que possa ser conceitualmente particionada em três segmentos:

  1. Todos os valores não `undefined` ordenados de acordo com a função de comparação.
  1. Todos os valores `undefined`.
  1. Todos os buracos, ou seja, propriedades inexistentes.

O algoritmo de ordenação propriamente dito precisa ser aplicado apenas ao primeiro segmento. Para alcançar isso, o passo de pré-processamento do V8 funciona aproximadamente da seguinte maneira:

  1. Deixe `length` ser o valor da propriedade `”length”` do array ou objeto a ser ordenado.
  1. Deixe `numberOfUndefineds` ser 0.
  1. Para cada `value` no intervalo de `[0, length)`:
    a. Se `value` for um buraco: não faça nada
    b. Se `value` for `undefined`: incremente `numberOfUndefineds` em 1.
    c. Caso contrário, adicione `value` a uma lista temporária chamada `elements`.

Após esses passos serem executados, todos os valores não `undefined` estão contidos na lista temporária `elements`. Valores `undefined` são simplesmente contabilizados, em vez de adicionados a `elements`. Como mencionado acima, a especificação exige que valores `undefined` sejam ordenados no final. Porém, valores `undefined` não são realmente passados para a função de comparação fornecida pelo usuário, então podemos contabilizar apenas a quantidade de ocorrências de `undefined` que ocorreram.

O próximo passo é realmente ordenar `elements`. Veja [a seção sobre TimSort](/blog/array-sort#timsort) para uma descrição detalhada.

Após a ordenação ser concluída, os valores ordenados precisam ser escritos de volta na matriz ou objeto original. O passo de pós-processamento consiste em três fases que lidam com os segmentos conceituais:

  1. Escreva de volta todos os valores de `elements` para o objeto original no intervalo de `[0, elements.length)`.
  1. Defina todos os valores de `[elements.length, elements.length + numberOfUndefineds)` como `undefined`.
  1. Exclua todos os valores no intervalo de `[elements.length + numberOfUndefineds, length)`.

O passo 3 é necessário caso o objeto original contenha buracos no intervalo de ordenação. Valores no intervalo de `[elements.length + numberOfUndefineds, length)` já foram movidos para o início, e não executar o passo 3 resultaria em valores duplicados.

## História

`Array.prototype.sort` e `TypedArray.prototype.sort` dependiam da mesma implementação de Quicksort escrita em JavaScript. O algoritmo de ordenação em si é bastante simples: A base é um Quicksort com um fallback para Insertion Sort para matrizes menores (comprimento < 10). O fallback para Insertion Sort também era usado quando a recursão de Quicksort atingia um comprimento de submatriz de 10. O Insertion Sort é mais eficiente para matrizes menores. Isso porque o Quicksort é chamado recursivamente duas vezes após o particionamento. Cada chamada recursiva tinha o overhead de criar (e descartar) um quadro de pilha.

Escolher um elemento pivô adequado tem um grande impacto quando se trata de Quicksort. O V8 empregava duas estratégias:

- O pivô era escolhido como a mediana do primeiro, último e um terceiro elemento da submatriz que está sendo ordenada. Para matrizes menores, esse terceiro elemento é simplesmente o elemento do meio.
- Para matrizes maiores, uma amostra era feita, então ordenada, e a mediana da amostra ordenada servia como o terceiro elemento no cálculo acima.

Uma das vantagens do Quicksort é que ele ordena no lugar. O overhead de memória vem da alocação de uma pequena matriz para a amostra ao ordenar matrizes grandes e do espaço de pilha de log(n). A desvantagem é que não é um algoritmo estável e há a chance de o algoritmo atingir o pior cenário, onde o QuickSort se degrada para 𝒪(n²).

### Apresentando o V8 Torque

Como um leitor ávido do blog do V8, você pode ter ouvido falar do [`CodeStubAssembler`](/blog/csa), ou CSA para abreviar. O CSA é um componente do V8 que nos permite escrever TurboFan IR de baixo nível diretamente em C++, que mais tarde é traduzido em código de máquina para a arquitetura apropriada usando o backend do TurboFan.

CSA é amplamente utilizado para escrever os chamados 'caminhos rápidos' para built-ins JavaScript. Uma versão de caminho rápido de um built-in geralmente verifica se certas invariantes se mantêm (por exemplo, nenhum elemento na cadeia de protótipos, nenhum acessador, etc) e então usa operações mais rápidas e específicas para implementar a funcionalidade do built-in. Isso pode resultar em tempos de execução que são uma ordem de magnitude mais rápidos do que uma versão mais genérica.

O lado negativo do CSA é que ele realmente pode ser considerado uma linguagem de montagem. O fluxo de controle é modelado usando explicitamente `labels` e `gotos`, o que torna difícil ler e implementar algoritmos mais complexos no CSA e propensos a erros.

Entra [V8 Torque](/docs/torque). Torque é uma linguagem de domínio específico com sintaxe semelhante ao TypeScript que atualmente usa CSA como seu único alvo de compilação. Torque permite quase o mesmo nível de controle que o CSA, ao mesmo tempo em que oferece construções de nível mais alto, como `while` e `for`. Além disso, é fortemente tipada e no futuro conterá verificações de segurança, como verificações automáticas fora dos limites, proporcionando aos engenheiros do V8 garantias mais fortes.

Os primeiros built-ins principais que foram reescritos no V8 Torque foram [`TypedArray#sort`](/blog/v8-release-68) e [`Dataview` operations](/blog/dataview). Ambos serviram ao propósito adicional de fornecer feedback aos desenvolvedores do Torque sobre quais recursos de linguagem são necessários e quais padrões devem ser usados para escrever built-ins de forma eficiente. No momento da redação, vários built-ins de `JSArray` tiveram suas implementações de fallback auto-hospedadas em JavaScript movidas para Torque (por exemplo, `Array#unshift`), enquanto outros foram completamente reescritos (por exemplo, `Array#splice` e `Array#reverse`).

### Movendo `Array#sort` para Torque

A versão inicial de Torque do `Array#sort` foi mais ou menos uma tradução direta da implementação em JavaScript. A única diferença foi que, em vez de usar uma abordagem de amostragem para arrays maiores, o terceiro elemento para o cálculo do pivô foi escolhido aleatoriamente.

Isso funcionou razoavelmente bem, mas como ainda utilizava Quicksort, `Array#sort` permaneceu instável. [A solicitação por um `Array#sort` estável](https://bugs.chromium.org/p/v8/issues/detail?id=90) está entre os tickets mais antigos no rastreador de bugs do V8. Experimentos com Timsort como próximo passo nos ofereceram várias coisas. Primeiro, gostamos que seja estável e ofereça algumas garantias algorítmicas interessantes (veja a próxima seção). Segundo, Torque ainda estava em desenvolvimento e implementar um built-in mais complexo, como `Array#sort` com Timsort, resultou em muitos feedbacks acionáveis que influenciaram Torque como linguagem.

## Timsort

Timsort, desenvolvido inicialmente por Tim Peters para Python em 2002, poderia ser melhor descrito como uma variante de Mergesort adaptativa e estável. Apesar de os detalhes serem bastante complexos e serem melhor descritos [pelo próprio criador](https://github.com/python/cpython/blob/master/Objects/listsort.txt) ou na [página da Wikipedia](https://en.wikipedia.org/wiki/Timsort), os conceitos básicos são fáceis de entender. Enquanto Mergesort geralmente trabalha de forma recursiva, Timsort funciona de forma iterativa. Ele processa um array da esquerda para a direita e busca os chamados _runs_. Um run é simplesmente uma sequência que já está ordenada. Isso inclui sequências que são ordenadas 'do jeito errado', pois essas sequências podem simplesmente ser revertidas para formar um run. No início do processo de ordenação, um comprimento mínimo de run é determinado, dependendo do comprimento do input. Se Timsort não conseguir encontrar runs naturais com esse comprimento mínimo, um run é 'reforçado artificialmente' usando Insertion Sort.

Os runs encontrados dessa forma são acompanhados usando uma pilha que lembra o índice inicial e o comprimento de cada run. De tempos em tempos, os runs na pilha são mesclados até que reste apenas um run ordenado. Timsort tenta manter um equilíbrio ao decidir quais runs mesclar. Por um lado, você deseja mesclar cedo, pois os dados desses runs têm grande chance de já estar no cache. Por outro lado, deseja mesclar o mais tarde possível para aproveitar os padrões nos dados que podem emergir. Para conseguir isso, Timsort mantém duas invariantes. Assumindo que `A`, `B` e `C` são os três runs mais altos na pilha:

- `|C| > |B| + |A|`
- `|B| > |A|`

![Pilhas de runs antes e depois de mesclar `A` com `B`](/_img/array-sort/runs-stack.svg)

A imagem mostra o caso em que `|A| > |B|`, então `B` é mesclado com o menor dos dois runs.

Observe que Timsort só mescla runs consecutivos, isso é necessário para manter a estabilidade, caso contrário elementos iguais seriam transferidos entre runs. Além disso, a primeira invariante garante que os comprimentos dos runs cresçam ao menos tão rápido quanto os números de Fibonacci, dando um limite superior para o tamanho da pilha de runs quando sabemos o comprimento máximo do array.

Agora podemos ver que sequências já ordenadas são classificadas em 𝒪(n), já que tal array resultaria em um único run que não precisa ser mesclado. O pior caso é 𝒪(n log n). Essas propriedades algorítmicas, junto com a natureza estável do Timsort, foram algumas das razões pelas quais escolhemos Timsort ao invés de Quicksort no final.

### Implementando Timsort em Torque

Os builtins geralmente possuem diferentes caminhos de código que são escolhidos durante a execução, dependendo de várias variáveis. A versão mais genérica pode lidar com qualquer tipo de objeto, independentemente de ser um `JSProxy`, possuir interceptores ou precisar realizar buscas na cadeia de protótipos ao recuperar ou definir propriedades.
O caminho genérico é bastante lento na maioria dos casos, pois precisa levar em conta todas as eventualidades. Mas, se soubermos de antemão que o objeto a ser ordenado é um `JSArray` simples contendo apenas Smis, todas essas operações caras de `[[Get]]` e `[[Set]]` podem ser substituídas por simples Carregamentos e Armazenamentos em um `FixedArray`. O principal diferenciador é o [`ElementsKind`](/blog/elements-kinds).

O problema agora se torna como implementar um caminho rápido. O algoritmo principal permanece o mesmo para todos, mas a maneira como acessamos os elementos muda com base no `ElementsKind`. Uma maneira de realizar isso seria direcionar para o “acessador” correto em cada ponto de chamada. Imagine um switch para cada operação de “carregamento”/“armazenamento”, onde escolhemos um ramo diferente com base no caminho rápido escolhido.

Outra solução (e essa foi a primeira abordagem tentada) é simplesmente copiar todo o builtin uma vez para cada caminho rápido e embutir o método de acesso de carregamento/armazenamento correto. Essa abordagem revelou-se impraticável para o Timsort, pois é um builtin grande e fazer uma cópia para cada caminho rápido acabou exigindo 106 KB no total, o que é muito para um único builtin.

A solução final é ligeiramente diferente. Cada operação de carregamento/armazenamento para cada caminho rápido é colocada em seu próprio “mini-builtin”. Veja o exemplo de código que mostra a operação de “carregamento” para `FixedDoubleArray`s.

```torque
Load<FastDoubleElements>(
    context: Context, sortState: FixedArray, elements: HeapObject,
    index: Smi): Object {
  try {
    const elems: FixedDoubleArray = UnsafeCast<FixedDoubleArray>(elements);
    const value: float64 =
        LoadDoubleWithHoleCheck(elems, index) otherwise Bailout;
    return AllocateHeapNumberWithValue(value);
  }
  label Bailout {
    // A etapa de pré-processamento removeu todos os buracos ao compactar todos os elementos
    // no início do array. Encontrar um buraco significa que a função cmp ou
    // ToString altera o array.
    return Failure(sortState);
  }
}
```

Para comparar, a operação genérica de “carregamento” é simplesmente uma chamada para `GetProperty`. Mas, enquanto a versão acima gera código de máquina eficiente e rápido para carregar e converter um `Number`, `GetProperty` é uma chamada para outro builtin que pode potencialmente envolver uma busca na cadeia de protótipos ou invocar uma função acessadora.

```js
builtin Load<ElementsAccessor : type>(
    context: Context, sortState: FixedArray, elements: HeapObject,
    index: Smi): Object {
  return GetProperty(context, elements, index);
}
```

Um caminho rápido então se torna simplesmente um conjunto de ponteiros de função. Isso significa que só precisamos de uma cópia do algoritmo principal enquanto configuramos todos os ponteiros de função relevantes uma vez antecipadamente. Embora isso reduza muito o espaço de código necessário (para 20k), vem ao custo de um desvio indireto em cada ponto de acesso. Isso é ainda exacerbado pela recente mudança para usar [builtins incorporados](/blog/embedded-builtins).

### Estado de classificação

![](/_img/array-sort/sort-state.svg)

A imagem acima mostra o “estado de classificação”. É um `FixedArray` que mantém o controle de tudo o que é necessário durante a ordenação. Cada vez que `Array#sort` é chamado, esse estado de classificação é alocado. As entradas 4 a 7 são o conjunto de ponteiros de função discutidos acima que formam um caminho rápido.

O builtin “check” é usado toda vez que retornamos do código JavaScript do usuário, para verificar se podemos continuar no caminho rápido atual. Ele usa o “mapa inicial do receptor” e o “comprimento inicial do receptor” para isso. Caso o código do usuário tenha modificado o objeto atual, simplesmente abandonamos a execução da ordenação, redefinimos todos os ponteiros para suas versões mais genéricas e reiniciamos o processo de ordenação. O “status de saída” no slot 8 é usado para sinalizar essa redefinição.

A entrada “compare” pode apontar para dois builtins diferentes. Um chama uma função de comparação fornecida pelo usuário, enquanto o outro implementa a comparação padrão que chama `toString` em ambos os argumentos e, em seguida, faz uma comparação lexicográfica.

O restante dos campos (com exceção do ID do caminho rápido) é específico do Timsort. A pilha de execução (descrita acima) é inicializada com um tamanho de 85, o que é suficiente para ordenar arrays de comprimento 2<sup>64</sup>. O array temporário é usado para mesclar execuções. Ele cresce de tamanho conforme necessário, mas nunca excede `n/2`, onde `n` é o comprimento da entrada.

### Compensações de desempenho

Mover a ordenação de JavaScript auto-hospedado para Torque traz compromissos de desempenho. Como `Array#sort` é escrito em Torque, agora é um código compilado estaticamente, o que significa que ainda podemos criar caminhos rápidos para certos [`ElementsKind`s](/blog/elements-kinds), mas nunca será tão rápido quanto uma versão altamente otimizada do TurboFan que pode utilizar feedback de tipo. Por outro lado, em casos onde o código não se aquece o suficiente para justificar a compilação JIT ou o ponto de chamada é megamórfico, ficamos presos ao interpretador ou a uma versão lenta/genérica. A análise, compilação e possível otimização da versão de JavaScript auto-hospedado também é uma sobrecarga que não é necessária com a implementação Torque.

Embora a abordagem Torque não resulte no mesmo desempenho máximo para ordenação, ela evita quedas bruscas de desempenho. O resultado é um desempenho de ordenação muito mais previsível do que era anteriormente. Tenha em mente que Torque está em constante evolução e, além de direcionar CSA, pode direcionar TurboFan no futuro, permitindo a compilação JIT de código escrito em Torque.

### Microbenchmarks

Antes de começarmos com `Array#sort`, adicionamos muitos microbenchmarks diferentes para obter uma melhor compreensão do impacto que a reimplementação teria. O primeiro gráfico mostra o caso de uso "normal" de ordenação de vários ElementsKinds com uma função de comparação fornecida pelo usuário.

Tenha em mente que, nesses casos, o compilador JIT pode fazer muito trabalho, já que ordenar é quase tudo o que fazemos. Isso também permite que o compilador de otimização incorpore a função de comparação na versão de JavaScript, enquanto temos a sobrecarga de chamada do builtin para JavaScript no caso Torque. Ainda assim, apresentamos um desempenho melhor em quase todos os casos.

![](/_img/array-sort/micro-bench-basic.svg)

O próximo gráfico mostra o impacto do Timsort ao processar arrays que já estão completamente ordenados ou têm subsequências que já estão ordenadas de alguma maneira. O gráfico usa Quicksort como referência e mostra o aumento de velocidade do Timsort (até 17× no caso de “DownDown”, onde o array consiste em duas sequências ordenadas inversamente). Como pode ser visto, exceto no caso de dados aleatórios, o Timsort tem um desempenho melhor em todos os outros casos, mesmo que estejamos ordenando `PACKED_SMI_ELEMENTS`, onde o Quicksort superou o Timsort no microbenchmark acima.

![](/_img/array-sort/micro-bench-presorted.svg)

### Benchmark de Ferramentas da Web

O [Benchmark de Ferramentas da Web](https://github.com/v8/web-tooling-benchmark) é uma coleção de cargas de trabalho de ferramentas geralmente usadas por desenvolvedores web, como Babel e TypeScript. O gráfico usa o JavaScript Quicksort como referência e compara o aumento de velocidade do Timsort em relação a ele. Em quase todos os benchmarks mantemos o mesmo desempenho, com exceção de chai.

![](/_img/array-sort/web-tooling-benchmark.svg)

O benchmark chai passa *um terço* de seu tempo dentro de uma única função de comparação (um cálculo de distância de string). O benchmark é a suíte de testes do próprio chai. Devido aos dados, o Timsort precisa de mais comparações neste caso, o que tem um impacto maior no tempo de execução geral, já que uma grande parte do tempo é gasta dentro dessa função de comparação específica.

### Impacto na memória

Analisar snapshots do heap do V8 enquanto se navega por cerca de 50 sites (tanto em dispositivos móveis quanto em desktops) não mostrou regressões ou melhorias de memória. Por um lado, isso é surpreendente: a troca do Quicksort pelo Timsort introduziu a necessidade de um array temporário para mesclar sequências, que pode crescer muito maior do que os arrays temporários usados para amostragem. Por outro lado, esses arrays temporários têm vida muito curta (apenas durante a chamada do `sort`) e podem ser alocados e descartados rapidamente no espaço novo do V8.

## Conclusão

Em resumo, nos sentimos muito melhor com as propriedades algorítmicas e o comportamento de desempenho previsível de um Timsort implementado em Torque. O Timsort está disponível a partir do V8 v7.0 e Chrome 70. Boa ordenação!
