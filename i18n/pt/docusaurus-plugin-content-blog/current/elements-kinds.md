---
title: &apos;Tipos de elementos em V8&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2017-09-12 13:33:37
tags:
  - internals
  - presentations
description: &apos;Este mergulho técnico explica como o V8 otimiza operações em arrays por trás das cenas, e o que isso significa para desenvolvedores JavaScript.&apos;
tweet: &apos;907608362191376384&apos;
---
:::note
**Nota:** Se você prefere assistir a uma apresentação em vez de ler artigos, aproveite o vídeo abaixo!
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/m9cTaYI95Zc" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

Objetos JavaScript podem ter propriedades arbitrárias associadas a eles. Os nomes das propriedades dos objetos podem conter qualquer caractere. Um dos casos interessantes que um motor JavaScript pode escolher otimizar são propriedades cujos nomes são puramente numéricos, mais especificamente [índices de array](https://tc39.es/ecma262/#array-index).

<!--truncate-->
No V8, propriedades com nomes inteiros — a forma mais comum das quais são objetos gerados pelo construtor `Array` — são tratadas de forma especial. Embora em muitas circunstâncias essas propriedades indexadas numericamente se comportem como outras propriedades, o V8 escolhe armazená-las separadamente das propriedades não numéricas para fins de otimização. Internamente, o V8 até dá a essas propriedades um nome especial: _elementos_. Objetos têm [propriedades](/blog/fast-properties) que mapeiam para valores, enquanto arrays têm índices que mapeiam para elementos.

Embora essas informações internas nunca sejam diretamente expostas a desenvolvedores JavaScript, elas explicam por que certos padrões de código são mais rápidos que outros.

## Tipos comuns de elementos

Ao executar o código JavaScript, o V8 mantém o controle de que tipo de elementos cada array contém. Essas informações permitem que o V8 otimize qualquer operação no array especificamente para este tipo de elemento. Por exemplo, quando você chama `reduce`, `map` ou `forEach` em um array, o V8 pode otimizar essas operações com base no tipo de elementos que o array contém.

Veja este array, por exemplo:

```js
const array = [1, 2, 3];
```

Que tipos de elementos ele contém? Se você perguntar ao operador `typeof`, ele dirá que o array contém `number`s. No nível da linguagem, isso é tudo que você obtém: o JavaScript não distingue entre inteiros, floats e doubles — todos são apenas números. No entanto, no nível do motor, podemos fazer distinções mais precisas. O tipo de elemento para este array é `PACKED_SMI_ELEMENTS`. No V8, o termo Smi refere-se ao formato usado para armazenar pequenos inteiros. (Chegaremos à parte `PACKED` em um minuto.)

Posteriormente, adicionar um número de ponto flutuante ao mesmo array faz com que ele transite para um tipo de elemento mais genérico:

```js
const array = [1, 2, 3];
// tipo de elemento: PACKED_SMI_ELEMENTS
array.push(4.56);
// tipo de elemento: PACKED_DOUBLE_ELEMENTS
```

Adicionar um literal de string ao array altera seu tipo de elemento mais uma vez.

```js
const array = [1, 2, 3];
// tipo de elemento: PACKED_SMI_ELEMENTS
array.push(4.56);
// tipo de elemento: PACKED_DOUBLE_ELEMENTS
array.push(&apos;x&apos;);
// tipo de elemento: PACKED_ELEMENTS
```

Vimos três tipos de elementos distintos até agora, com os seguintes tipos básicos:

- <b>Sm</b>all <b>i</b>nteiros, também conhecidos como Smi.
- Doubles, para números de ponto flutuante e inteiros que não podem ser representados como um Smi.
- Elementos regulares, para valores que não podem ser representados como Smi ou doubles.

Observe que doubles formam uma variante mais geral de Smi, e elementos regulares são outra generalização em cima de doubles. O conjunto de números que podem ser representados como um Smi é um subconjunto dos números que podem ser representados como um double.

O importante aqui é que transições de tipos de elementos só vão em uma direção: de específicos (por exemplo, `PACKED_SMI_ELEMENTS`) para mais gerais (por exemplo, `PACKED_ELEMENTS`). Uma vez que um array é marcado como `PACKED_ELEMENTS`, ele não pode voltar para `PACKED_DOUBLE_ELEMENTS`, por exemplo.

Até agora, aprendemos o seguinte:

- O V8 atribui um tipo de elemento a cada array.
- O tipo de elemento de um array não está gravado em pedra — ele pode mudar em tempo de execução. No exemplo anterior, passamos de `PACKED_SMI_ELEMENTS` para `PACKED_ELEMENTS`.
- Transições de tipos de elementos só podem ir de tipos específicos para tipos mais gerais.

## Tipos `PACKED` versus `HOLEY`

Até agora, lidamos apenas com arrays densos ou compactados. Criar buracos no array (ou seja, torná-lo esparso) degrada o tipo de elemento para sua variante “holey”:

```js
const array = [1, 2, 3, 4.56, &apos;x&apos;];
// tipo de elemento: PACKED_ELEMENTS
array.length; // 5
array[9] = 1; // array[5] até array[8] são agora buracos
// tipo de elemento: HOLEY_ELEMENTS
```

O V8 faz essa distinção porque operações em arrays compactados podem ser otimizadas mais agressivamente do que operações em arrays com buracos. Para arrays compactados, a maioria das operações pode ser realizada de forma eficiente. Em comparação, operações em arrays com buracos exigem verificações adicionais e buscas caras na cadeia de protótipos.

Cada um dos tipos de elementos básicos que vimos até agora (ou seja, Smis, doubles e elementos regulares) possui duas variantes: a compactada e a versão com buracos. Não só podemos fazer a transição de, por exemplo, `PACKED_SMI_ELEMENTS` para `PACKED_DOUBLE_ELEMENTS`, como também podemos fazer a transição de qualquer tipo `PACKED` para sua contraparte `HOLEY`.

Para recapitular:

- Os tipos de elementos mais comuns possuem versões `PACKED` e `HOLEY`.
- Operações em arrays compactados são mais eficientes do que operações em arrays com buracos.
- Tipos de elementos podem fazer a transição de `PACKED` para versões `HOLEY`.

## A estrutura em grade dos tipos de elementos

O V8 implementa este sistema de transição de tag como uma [estrutura em grade](https://en.wikipedia.org/wiki/Lattice_%28order%29). Aqui está uma visualização simplificada disso, apresentando apenas os tipos de elementos mais comuns:

![](/_img/elements-kinds/lattice.svg)

Só é possível fazer a transição para baixo na grade. Uma vez que um único número de ponto flutuante é adicionado a uma matriz de Smis, essa matriz é marcada como DOUBLE, mesmo que você substitua o valor de ponto flutuante por um Smi posteriormente. Da mesma forma, uma vez que um buraco é criado em uma matriz, ela será marcada como contendo buracos para sempre, mesmo que você a preencha mais tarde.

:::note
**Atualização @ 28-02-2025:** Agora há uma exceção a isso [especificamente para `Array.prototype.fill`](https://chromium-review.googlesource.com/c/v8/v8/+/6285929).
:::

O V8 atualmente distingue [21 tipos diferentes de elementos](https://cs.chromium.org/chromium/src/v8/src/elements-kind.h?l=14&rcl=ec37390b2ba2b4051f46f153a8cc179ed4656f5d), cada um com seu próprio conjunto de possíveis otimizações.

Em geral, tipos de elementos mais específicos permitem otimizações mais detalhadas. Quanto mais abaixo no grade o tipo de elemento estiver, mais lentas podem ser as manipulações desse objeto. Para obter o desempenho ideal, evite transições desnecessárias para tipos menos específicos — mantenha-se no mais específico aplicável à sua situação.

## Dicas de desempenho

Na maioria dos casos, o monitoramento de tipos de elementos funciona de forma invisível nos bastidores e você não precisa se preocupar com isso. Mas aqui estão algumas coisas que você pode fazer para obter o maior benefício possível do sistema.

### Evite ler além do comprimento da matriz

Um pouco inesperadamente (dado o título deste post), nossa dica número 1 de desempenho não está diretamente relacionada ao monitoramento de tipos de elementos (embora o que acontece nos bastidores seja um pouco semelhante). Ler além do comprimento de uma matriz pode ter um impacto surpreendente no desempenho, por exemplo, ler `array[42]` quando `array.length === 5`. Nesse caso, o índice da matriz `42` está fora dos limites, a propriedade não está presente na matriz em si e, portanto, o motor de JavaScript precisa realizar buscas caras na cadeia de protótipos. Uma vez que uma carga entra nesta situação, o V8 lembra que “essa carga precisa lidar com casos especiais”, e ela nunca será tão rápida quanto era antes de ler fora dos limites.

Não escreva seus loops assim:

```js
// Não faça isso!
for (let i = 0, item; (item = items[i]) != null; i++) {
  doSomething(item);
}
```

Esse código lê todos os elementos da matriz e um a mais. Ele só termina quando encontra um elemento `undefined` ou `null`. (O jQuery usa esse padrão em alguns lugares.)

Em vez disso, escreva seus loops da maneira antiga e continue iterando até atingir o último elemento.

```js
for (let index = 0; index < items.length; index++) {
  const item = items[index];
  doSomething(item);
}
```

Quando a coleção sobre a qual você está iterando é iterável (como é o caso para arrays e `NodeList`s), isso é ainda melhor: basta usar `for-of`.

```js
for (const item of items) {
  doSomething(item);
}
```

Para arrays especificamente, você poderia usar o método embutido `forEach`:

```js
items.forEach((item) => {
  doSomething(item);
});
```

Hoje em dia, o desempenho tanto de `for-of` quanto de `forEach` é semelhante ao loop `for` tradicional.

Evite ler além do comprimento da matriz! Nesse caso, a verificação de limites do V8 falha, a verificação para determinar se a propriedade está presente falha e então o V8 precisa buscar na cadeia de protótipos. O impacto é ainda pior quando você acidentalmente usa o valor em cálculos, por exemplo:

```js
function Maximum(array) {
  let max = 0;
  for (let i = 0; i <= array.length; i++) { // COMPARAÇÃO ERRADA!
    if (array[i] > max) max = array[i];
  }
  return max;
}
```

Aqui, a última iteração lê além do comprimento da matriz, o que retorna `undefined`, contaminando não apenas a carga, mas também a comparação: em vez de comparar apenas números, agora precisa lidar com casos especiais. Corrigir a condição de terminação para o adequado `i < array.length` proporciona uma **melhoria de desempenho de 6×** para este exemplo (medido em arrays com 10.000 elementos, de modo que o número de iterações diminui apenas 0,01%).

### Evite transições de tipos de elementos

Em geral, se você precisa realizar muitas operações em um array, tente mantê-lo em um tipo de elementos o mais específico possível, para que o V8 possa otimizar essas operações ao máximo.

Isso é mais difícil do que parece. Por exemplo, apenas adicionar `-0` a um array de pequenos inteiros já é suficiente para que ele mude para `PACKED_DOUBLE_ELEMENTS`.

```js
const array = [3, 2, 1, +0];
// PACKED_SMI_ELEMENTS
array.push(-0);
// PACKED_DOUBLE_ELEMENTS
```

Como resultado, quaisquer operações futuras neste array são otimizadas de uma maneira completamente diferente do que seriam para Smis.

Evite `-0`, a menos que você precise explicitamente diferenciar `-0` de `+0` no seu código. (Provavelmente você não precisa.)

O mesmo vale para `NaN` e `Infinity`. Eles são representados como doubles, então adicionar um único `NaN` ou `Infinity` a um array de `SMI_ELEMENTS` o transforma em `DOUBLE_ELEMENTS`.

```js
const array = [3, 2, 1];
// PACKED_SMI_ELEMENTS
array.push(NaN, Infinity);
// PACKED_DOUBLE_ELEMENTS
```

Se você planeja realizar muitas operações em um array de inteiros, considere normalizar `-0` e bloquear `NaN` e `Infinity` ao inicializar os valores. Dessa forma, o array permanece no tipo `PACKED_SMI_ELEMENTS`. Esse custo de normalização única pode valer as otimizações posteriores.

Na verdade, se você está realizando operações matemáticas em um array de números, considere usar um TypedArray. Também temos tipos específicos de elementos para eles.

### Prefira arrays a objetos semelhantes a arrays

Alguns objetos no JavaScript — especialmente no DOM — parecem arrays, embora não sejam propriamente arrays. É possível criar objetos semelhantes a arrays você mesmo:

```js
const arrayLike = {};
arrayLike[0] = &apos;a&apos;;
arrayLike[1] = &apos;b&apos;;
arrayLike[2] = &apos;c&apos;;
arrayLike.length = 3;
```

Este objeto tem um `length` e suporta acesso a elementos indexados (assim como um array!), mas carece de métodos de array como `forEach` em seu protótipo. Ainda é possível chamar genéricos de array nele, no entanto:

```js
Array.prototype.forEach.call(arrayLike, (value, index) => {
  console.log(`${ index }: ${ value }`);
});
// Isso registra &apos;0: a&apos;, depois &apos;1: b&apos;, e finalmente &apos;2: c&apos;.
```

Este código chama o `Array.prototype.forEach` nativo no objeto semelhante a array, e funciona como esperado. No entanto, isso é mais lento do que chamar `forEach` em um array adequado, que é altamente otimizado no V8. Se você planeja usar métodos de array neste objeto mais de uma vez, considere transformá-lo em um array real antes:

```js
const actualArray = Array.prototype.slice.call(arrayLike, 0);
actualArray.forEach((value, index) => {
  console.log(`${ index }: ${ value }`);
});
// Isso registra &apos;0: a&apos;, depois &apos;1: b&apos;, e finalmente &apos;2: c&apos;.
```

O custo único de conversão pode valer as otimizações posteriores, especialmente se você planeja realizar muitas operações no array.

O objeto `arguments`, por exemplo, é um objeto semelhante a array. É possível chamar métodos de array nele, mas tais operações não serão totalmente otimizadas como seriam para um array adequado.

```js
const logArgs = function() {
  Array.prototype.forEach.call(arguments, (value, index) => {
    console.log(`${ index }: ${ value }`);
  });
};
logArgs(&apos;a&apos;, &apos;b&apos;, &apos;c&apos;);
// Isso registra &apos;0: a&apos;, depois &apos;1: b&apos;, e finalmente &apos;2: c&apos;.
```

Os parâmetros rest do ES2015 podem ajudar aqui. Eles produzem arrays adequados que podem ser usados em vez dos objetos semelhantes a arrays `arguments` de forma elegante.

```js
const logArgs = (...args) => {
  args.forEach((value, index) => {
    console.log(`${ index }: ${ value }`);
  });
};
logArgs(&apos;a&apos;, &apos;b&apos;, &apos;c&apos;);
// Isso registra &apos;0: a&apos;, depois &apos;1: b&apos;, e finalmente &apos;2: c&apos;.
```

Hoje em dia, não há uma boa razão para usar o objeto `arguments` diretamente.

Em geral, evite objetos semelhantes a arrays sempre que possível e use arrays adequados em vez disso.

### Evite polimorfismo

Se você tiver código que lida com arrays de muitos tipos diferentes de elementos, isso pode levar a operações polimórficas que são mais lentas do que uma versão do código que opera apenas em um único tipo de elementos.

Considere o exemplo a seguir, onde uma função de biblioteca é chamada com vários tipos de elementos. (Observe que este não é o `Array.prototype.forEach` nativo, que tem seu próprio conjunto de otimizações além das otimizações específicas de tipos de elementos discutidas neste artigo.)

```js
const each = (array, callback) => {
  for (let index = 0; index < array.length; ++index) {
    const item = array[index];
    callback(item);
  }
};
const doSomething = (item) => console.log(item);

each([], () => {});

each([&apos;a&apos;, &apos;b&apos;, &apos;c&apos;], doSomething);
// `each` é chamado com `PACKED_ELEMENTS`. O V8 usa um cache inline
// (ou "IC") para lembrar que `each` foi chamado com este tipo específico
// de elementos. O V8 é otimista e assume que os
// acessos `array.length` e `array[index]` dentro da função `each`
// são monomórficos (ou seja, só recebem um único tipo
// de elemento) até prova em contrário. Para cada chamada futura a
// `each`, o V8 verifica se o tipo de elementos é `PACKED_ELEMENTS`. Se
// for, o V8 pode reutilizar o código gerado anteriormente. Se não, mais trabalho
// é necessário.

each([1.1, 2.2, 3.3], doSomething);
// `each` é chamado com `PACKED_DOUBLE_ELEMENTS`. Porque o V8 agora viu diferentes tipos de elementos sendo passados para `each` em seu IC, os acessos a `array.length` e `array[index]` dentro da função `each` são marcados como polimórficos. O V8 agora precisa de uma verificação adicional toda vez que `each` é chamado: uma para `PACKED_ELEMENTS` (como antes), uma nova para `PACKED_DOUBLE_ELEMENTS`, e uma para qualquer outro tipo de elementos (como antes). Isso causa um impacto na performance.
// O `array.length` e `array[index]` acessos dentro da função `each` são marcados como polimórficos. V8 agora precisa de uma verificação adicional toda vez que `each` é chamado: uma para `PACKED_ELEMENTS` (como antes), uma nova para `PACKED_DOUBLE_ELEMENTS`, e uma para qualquer outro tipo de elementos (como antes).

each([1, 2, 3], doSomething);
// `each` é chamado com `PACKED_SMI_ELEMENTS`. Isso ativa outro grau de polimorfismo.
// Agora existem três tipos diferentes de elementos no IC para `each`. Para cada chamada do `each` a partir de agora, outro tipo de verificação de elementos é necessário para reutilizar o código gerado para `PACKED_SMI_ELEMENTS`. Isso vem com um custo de desempenho.

```

Métodos embutidos (como `Array.prototype.forEach`) podem lidar com esse tipo de polimorfismo de maneira muito mais eficiente, então considere usá-los em vez de funções de bibliotecas externas em situações onde a performance é sensível.

Outro exemplo de monomorfismo vs. polimorfismo no V8 envolve formatos de objeto, também conhecidos como a classe oculta de um objeto. Para aprender sobre esse caso, confira [o artigo de Vyacheslav](https://mrale.ph/blog/2015/01/11/whats-up-with-monomorphism.html).

### Evite criar buracos

Para padrões de codificação do mundo real, a diferença de desempenho entre acessar arrays com buracos ou arrays compactos geralmente é muito pequena para ser relevante ou até mesmo mensurável. Se (e esse é um grande “se”!) suas medições de desempenho indicarem que economizar cada última instrução de máquina em código otimizado vale a pena, então você pode tentar manter seus arrays em modo de elementos compactos. Digamos que estamos tentando criar um array, por exemplo:

```js
const array = new Array(3);
// O array é esparso neste ponto, então é marcado como
// `HOLEY_SMI_ELEMENTS`, ou seja, a possibilidade mais específica dada
// as informações atuais.
array[0] = 'a';
// Espere aí, isso é uma string em vez de um número inteiro pequeno… Então o tipo
// transita para `HOLEY_ELEMENTS`.
array[1] = 'b';
array[2] = 'c';
// Neste ponto, todas as três posições no array estão preenchidas, então
// o array está compactado (ou seja, não mais esparso). No entanto, não podemos
// transitar para um tipo mais específico como `PACKED_ELEMENTS`. O tipo de elementos
// continua sendo `HOLEY_ELEMENTS`.
```

Uma vez que o array é marcado como esparso, ele permanecerá esparso para sempre — mesmo se todos os seus elementos estiverem presentes mais tarde!

Uma maneira melhor de criar um array é usar um literal em vez disso:

```js
const array = ['a', 'b', 'c'];
// tipo de elementos: PACKED_ELEMENTS
```

Se você não souber todos os valores com antecedência, crie um array vazio e, mais tarde, use `push` para adicionar os valores a ele.

```js
const array = [];
// …
array.push(someValue);
// …
array.push(someOtherValue);
```

Essa abordagem garante que o array nunca transite para um tipo de elementos esparsos. Como resultado, V8 pode potencialmente gerar código otimizado ligeiramente mais rápido para algumas operações nesse array.

## Depurando tipos de elementos

Para descobrir o “tipo de elementos” de um objeto específico, obtenha uma construção de depuração do `d8` (ou compilando diretamente [do código-fonte](/docs/build) em modo de depuração ou obtendo um binário pré-compilado usando [`jsvu`](https://github.com/GoogleChromeLabs/jsvu)) e execute:

```bash
out/x64.debug/d8 --allow-natives-syntax
```

Isso abre um REPL do `d8` onde [funções especiais](https://cs.chromium.org/chromium/src/v8/src/runtime/runtime.h?l=20&rcl=05720af2b09a18be5c41bbf224a58f3f0618f6be) como `%DebugPrint(object)` estão disponíveis. O campo “elements” em sua saída revela o “tipo de elementos” de qualquer objeto que você passar para ele.

```js
d8> const array = [1, 2, 3]; %DebugPrint(array);
DebugPrint: 0x1fbbad30fd71: [JSArray]
 - map = 0x10a6f8a038b1 [FastProperties]
 - prototype = 0x1212bb687ec1
 - elements = 0x1fbbad30fd19 <FixedArray[3]> [PACKED_SMI_ELEMENTS (COW)]
 - length = 3
 - properties = 0x219eb0702241 <FixedArray[0]> {
    #length: 0x219eb0764ac9 <AccessorInfo> (const accessor descriptor)
 }
 - elements= 0x1fbbad30fd19 <FixedArray[3]> {
           0: 1
           1: 2
           2: 3
 }
[…]
```

Note que “COW” significa [copy-on-write](https://en.wikipedia.org/wiki/Copy-on-write), que é mais uma otimização interna. Não se preocupe com isso por enquanto — esse é um tópico para outro post no blog!

Outro sinalizador útil que está disponível em construções de depuração é `--trace-elements-transitions`. Ative-o para permitir que o V8 informe sempre que ocorrer uma transição de tipo de elementos.

```bash
$ cat my-script.js
const array = [1, 2, 3];
array[3] = 4.56;

$ out/x64.debug/d8 --trace-elements-transitions my-script.js
transição de tipos [PACKED_SMI_ELEMENTS -> PACKED_DOUBLE_ELEMENTS] em ~+34 em x.js:2 para 0x1df87228c911 <JSArray[3]> de 0x1df87228c889 <FixedArray[3]> para 0x1df87228c941 <FixedDoubleArray[22]>
```
