---
title: "Acelerando elementos espalhados"
author: "Hai Dang & Georg Neis"
date: "2018-12-04 16:57:21"
tags: 
  - ECMAScript
  - benchmarks
description: "O V8 v7.2 acelera significativamente Array.from(array) assim como [...spread] para arrays, strings, conjuntos e mapas."
tweet: "1070344545685118976"
---
Durante seu estágio de três meses na equipe do V8, Hai Dang trabalhou na melhoria do desempenho de `[...array]`, `[...string]`, `[...set]`, `[...map.keys()]` e `[...map.values()]` (quando os elementos espalhados estão no início do literal do array). Ele até tornou `Array.from(iterable)` muito mais rápido também. Este artigo explica alguns dos detalhes técnicos de suas mudanças, que estão incluídas no V8 a partir da versão v7.2.

<!--truncate-->
## Elementos espalhados

Os elementos espalhados são componentes de literais de arrays que possuem a forma `...iterable`. Eles foram introduzidos no ES2015 como uma maneira de criar arrays a partir de objetos iteráveis. Por exemplo, o literal do array `[1, ...arr, 4, ...b]` cria um array cujo primeiro elemento é `1` seguido pelos elementos do array `arr`, depois `4` e, finalmente, os elementos do array `b`:

```js
const a = [2, 3];
const b = [5, 6, 7];
const result = [1, ...a, 4, ...b];
// → [1, 2, 3, 4, 5, 6, 7]
```

Como outro exemplo, qualquer string pode ser espalhada para criar um array de seus caracteres (pontos de código Unicode):

```js
const str = 'こんにちは';
const result = [...str];
// → ['こ', 'ん', 'に', 'ち', 'は']
```

Da mesma forma, qualquer conjunto pode ser espalhado para criar um array de seus elementos, ordenados pela ordem de inserção:

```js
const s = new Set();
s.add('V8');
s.add('TurboFan');
const result = [...s];
// → ['V8', 'TurboFan']
```

Em geral, a sintaxe de elementos espalhados `...x` em um literal de array assume que `x` fornece um iterador (acessível através de `x[Symbol.iterator]()`). Este iterador é então usado para obter os elementos a serem inseridos no array resultante.

O caso de uso simples de espalhar um array `arr` em um novo array, sem adicionar outros elementos antes ou depois, `[...arr]`, é considerado uma maneira concisa e idiomática de clonar superficialmente `arr` no ES2015. Infelizmente, no V8, o desempenho desse idiomatismo estava muito atrás de seu equivalente no ES5. O objetivo do estágio do Hai foi mudar isso!

## Por que os elementos espalhados são (ou eram!) lentos?

Existem várias maneiras de clonar superficialmente um array `arr`. Por exemplo, você pode usar `arr.slice()`, ou `arr.concat()`, ou `[...arr]`. Ou, você pode escrever sua própria função `clone` que utiliza um padrão `for`-loop:

```js
function clone(arr) {
  // Pré-aloca o número correto de elementos para evitar
  // ter que expandir o array.
  const result = new Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    result[i] = arr[i];
  }
  return result;
}
```

Idealmente, todas essas opções teriam características de desempenho semelhantes. Infelizmente, se você escolher `[...arr]` no V8, é (ou _era_) provável que seja mais lento do que `clone`! O motivo é que o V8 basicamente transpila `[...arr]` em uma iteração como a seguinte:

```js
function(arr) {
  const result = [];
  const iterator = arr[Symbol.iterator]();
  const next = iterator.next;
  for ( ; ; ) {
    const iteratorResult = next.call(iterator);
    if (iteratorResult.done) break;
    result.push(iteratorResult.value);
  }
  return result;
}
```

Este código é geralmente mais lento que `clone` por alguns motivos:

1. Ele precisa criar o `iterator` no início, carregando e avaliando a propriedade `Symbol.iterator`.
1. Ele precisa criar e consultar o objeto `iteratorResult` a cada passo.
1. Ele expande o array `result` a cada passo da iteração chamando `push`, assim realocando repetidamente o armazenamento subjacente.

A razão para usar tal implementação é que, como mencionado anteriormente, o espalhamento pode ser feito não apenas em arrays, mas, de fato, em objetos _iteráveis_ arbitrários, e deve seguir [o protocolo de iteração](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols). No entanto, o V8 deveria ser inteligente o suficiente para reconhecer se o objeto sendo espalhado é um array, de forma que possa realizar a extração dos elementos em um nível mais baixo e, consequentemente:

1. evitar a criação do objeto iterador,
1. evitar a criação dos objetos de resultado do iterador, e
1. evitar o crescimento contínuo e, portanto, a realocação do array resultante (sabemos o número de elementos com antecedência).

Implementamos essa ideia simples usando [CSA](/blog/csa) para arrays _rápidos_, ou seja, arrays com um dos seis tipos de [elementos mais comuns](/blog/elements-kinds). A otimização se aplica para [o cenário comum do mundo real](/blog/real-world-performance) onde o espalhamento ocorre no início do literal de array, como `[...foo]`. Como mostrado no gráfico abaixo, este novo caminho rápido oferece aproximadamente uma melhoria de desempenho de 3× ao espalhar um array de comprimento 100.000, tornando-o cerca de 25% mais rápido que o loop `clone` escrito à mão.

![Melhoria de desempenho ao espalhar um array rápido](/_img/spread-elements/spread-fast-array.png)

:::nota
**Nota:** Embora não mostrado aqui, o caminho rápido também se aplica quando os elementos espalhados são seguidos por outros componentes (por exemplo, `[...arr, 1, 2, 3]`), mas não quando são precedidos por outros (por exemplo, `[1, 2, 3, ...arr]`).
:::

## Siga com cuidado por esse caminho rápido

Isso é claramente uma aceleração impressionante, mas precisamos ser muito cuidadosos sobre quando é correto seguir esse caminho rápido: o JavaScript permite ao programador modificar o comportamento de iteração de objetos (mesmo arrays) de várias maneiras. Como os elementos espalhados são especificados para usar o protocolo de iteração, precisamos garantir que tais modificações sejam respeitadas. Fazemos isso evitando completamente o caminho rápido sempre que a mecânica original de iteração foi modificada. Por exemplo, isso inclui situações como as seguintes.

### Propriedade própria `Symbol.iterator`

Normalmente, um array `arr` não possui sua própria propriedade [`Symbol.iterator`](https://tc39.es/ecma262/#sec-symbol.iterator), então, ao procurar por esse símbolo, ele será encontrado no protótipo do array. No exemplo abaixo, o protótipo é ignorado ao definir a propriedade `Symbol.iterator` diretamente em `arr`. Após essa modificação, procurar por `Symbol.iterator` em `arr` resulta em um iterador vazio, e assim o espalhamento de `arr` não gera elementos e o literal de array é avaliado como um array vazio.

```js
const arr = [1, 2, 3];
arr[Symbol.iterator] = function() {
  return { next: function() { return { done: true }; } };
};
const result = [...arr];
// → []
```

### `next` modificado no `%ArrayIteratorPrototype%`

O método `next` também pode ser modificado diretamente no [`%ArrayIteratorPrototype%`](https://tc39.es/ecma262/#sec-%arrayiteratorprototype%-object), o protótipo dos iteradores de arrays (que afeta todos os arrays).

```js
Object.getPrototypeOf([][Symbol.iterator]()).next = function() {
  return { done: true };
}
const arr = [1, 2, 3];
const result = [...arr];
// → []
```

## Lidando com arrays _holey_

É necessário um cuidado extra ao copiar arrays com buracos, ou seja, arrays como `['a', , 'c']` que estão faltando alguns elementos. Espalhar um array assim, por virtude de aderir ao protocolo de iteração, não preserva os buracos, mas ao invés disso os preenche com os valores encontrados no protótipo do array nos índices correspondentes. Por padrão, não há elementos no protótipo de um array, o que significa que quaisquer buracos são preenchidos com `undefined`. Por exemplo, `[...['a', , 'c']]` é avaliado como um novo array `['a', undefined, 'c']`.

Nosso caminho rápido é inteligente o suficiente para lidar com buracos nesta situação padrão. Em vez de copiar cegamente o armazenamento de suporte do array de entrada, ele observa os buracos e cuida de convertê-los em valores `undefined`. O gráfico abaixo contém medições para um array de entrada com comprimento de 100.000 contendo apenas (marcados) 600 inteiros — o resto são buracos. Ele mostra que espalhar tal um array _holey_ agora é mais de 4× mais rápido do que usar a função `clone`. (Antes eram aproximadamente iguais, mas isso não é mostrado no gráfico).

Observe que, embora `slice` esteja incluído neste gráfico, a comparação com ele é injusta porque `slice` tem uma semântica diferente para arrays com buracos: ele preserva todos os buracos, então tem muito menos trabalho para fazer.

![Melhoria de desempenho ao espalhar um array com buracos de inteiros ([`HOLEY_SMI_ELEMENTS`](/blog/elements-kinds))](/_img/spread-elements/spread-holey-smi-array.png)

O preenchimento de buracos com `undefined` que nosso caminho rápido precisa realizar não é tão simples quanto parece: pode exigir a conversão de todo o array para um tipo de elemento diferente. O próximo gráfico mede tal situação. A configuração é a mesma de acima, exceto que desta vez os 600 elementos do array são doubles não encaixotados e o array tem o tipo de elementos `HOLEY_DOUBLE_ELEMENTS`. Como esse tipo de elementos não pode conter valores marcados como `undefined`, espalhar envolve uma transição custosa de tipo de elementos, por isso a pontuação para `[...a]` é muito menor do que no gráfico anterior. No entanto, ainda é muito mais rápido do que `clone(a)`.

![Melhoria de desempenho ao espalhar um array com buracos de doubles ([`HOLEY_DOUBLE_ELEMENTS`](/blog/elements-kinds))](/_img/spread-elements/spread-holey-double-array.png)

## Espalhando strings, conjuntos e mapas

A ideia de ignorar o objeto iterador e evitar o crescimento do array resultante também se aplica ao espalhamento de outros tipos de dados padrão. De fato, implementamos caminhos rápidos semelhantes para strings primitivos, para conjuntos e para mapas, cada vez cuidando de ignorá-los na presença de comportamento de iteração modificado.

Com relação aos conjuntos, o caminho rápido suporta não apenas espalhar diretamente um conjunto ([...set]), mas também espalhar seu iterador de chaves (`[...set.keys()]`) e seu iterador de valores (`[...set.values()]`). Em nossos micro-benchmarks, essas operações agora são cerca de 18× mais rápidas do que antes.

O caminho rápido para mapas é semelhante, mas não suporta espalhar um mapa diretamente (`[...map]`), porque consideramos isso uma operação incomum. Pelo mesmo motivo, nenhum dos caminhos rápidos suporta o iterador `entries()`. Em nossos micro-benchmarks, essas operações agora são cerca de 14× mais rápidas do que antes.

Para espalhar strings (`[...string]`), medimos uma melhoria de aproximadamente 5×, como mostrado no gráfico abaixo pelas linhas roxa e verde. Observe que isso é ainda mais rápido do que um loop for-of otimizado pelo TurboFan (o TurboFan entende a iteração de strings e pode gerar código otimizado para isso), representado pelas linhas azul e rosa. O motivo para haver dois gráficos em cada caso é que os micro-benchmarks operam em duas representações diferentes de strings (strings de um byte e de dois bytes).

![Melhoria de desempenho ao espalhar uma string](/_img/spread-elements/spread-string.png)

![Melhoria de desempenho ao espalhar um conjunto com 100.000 números inteiros (magenta, cerca de 18×), mostrado aqui em comparação com um loop `for`-`of` (vermelho)](/_img/spread-elements/spread-set.png)

## Melhorando o desempenho de `Array.from`

Felizmente, nossos caminhos rápidos para elementos espalhados podem ser reutilizados para `Array.from` no caso em que `Array.from` é chamado com um objeto iterável e sem uma função de mapeamento, por exemplo, `Array.from([1, 2, 3])`. A reutilização é possível porque, neste caso, o comportamento de `Array.from` é exatamente o mesmo que o do espalhamento. Isso resulta em uma melhoria de desempenho enorme, mostrada abaixo para um array com 100 números de ponto flutuante.

![Melhoria de desempenho de `Array.from(array)` onde `array` contém 100 números de ponto flutuante](/_img/spread-elements/array-from-array-of-doubles.png)

## Conclusão

O V8 v7.2 / Chrome 72 melhora significativamente o desempenho de elementos espalhados quando eles ocorrem no início do literal de array, por exemplo, `[...x]` ou `[...x, 1, 2]`. A melhoria se aplica ao espalhamento de arrays, strings primitivas, conjuntos, chaves de mapas, valores de mapas e — por extensão — ao `Array.from(x)`.
