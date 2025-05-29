---
title: "Propriedades rápidas no V8"
author: "Camillo Bruni ([@camillobruni](https://twitter.com/camillobruni)), também autor de [“Rápido `for`-`in`”](/blog/fast-for-in)"
avatars:
  - "camillo-bruni"
date: 2017-08-30 13:33:37
tags:
  - internals
description: "Este mergulho técnico explica como o V8 lida com as propriedades JavaScript nos bastidores."
---
Neste post do blog, gostaríamos de explicar como o V8 lida internamente com as propriedades do JavaScript. Do ponto de vista do JavaScript, são necessárias apenas algumas distinções para as propriedades. Objetos JavaScript se comportam principalmente como dicionários, com chaves de string e objetos arbitrários como valores. No entanto, a especificação trata propriedades indexadas por inteiros e outras propriedades de forma diferente [durante a iteração](https://tc39.es/ecma262/#sec-ordinaryownpropertykeys). Fora isso, as diferentes propriedades se comportam praticamente da mesma maneira, independentemente de serem indexadas por inteiros ou não.

<!--truncate-->
No entanto, nos bastidores, o V8 depende de diversas representações diferentes de propriedades por razões de desempenho e memória. Neste post do blog, vamos explicar como o V8 consegue fornecer acesso rápido a propriedades enquanto lida com propriedades adicionadas dinamicamente. Entender como as propriedades funcionam é essencial para explicar como otimizações como [caches inline](http://mrale.ph/blog/2012/06/03/explaining-js-vms-in-js-inline-caches.html) funcionam no V8.

Este post explica a diferença no tratamento de propriedades indexadas por inteiros e propriedades nomeadas. Após isso, mostraremos como o V8 mantém HiddenClasses ao adicionar propriedades nomeadas para fornecer uma maneira rápida de identificar a forma de um objeto. Em seguida, continuaremos fornecendo insights sobre como as propriedades nomeadas são otimizadas para acessos rápidos ou modificações rápidas, dependendo do uso. Na seção final, fornecemos detalhes sobre como o V8 lida com propriedades indexadas por inteiros ou índices de array.

## Propriedades nomeadas vs. elementos

Vamos começar analisando um objeto muito simples, como `{a: "foo", b: "bar"}`. Esse objeto possui duas propriedades nomeadas, `"a"` e `"b"`. Ele não possui índices inteiros para nomes de propriedades. Propriedades indexadas por array, mais comumente conhecidas como elementos, são mais proeminentes em arrays. Por exemplo, o array `["foo", "bar"]` tem duas propriedades indexadas por array: 0, com o valor "foo", e 1, com o valor "bar". Esta é a primeira grande distinção sobre como o V8 lida com propriedades em geral.

O diagrama a seguir mostra como um objeto básico do JavaScript se parece na memória.

![](/_img/fast-properties/jsobject.png)

Elementos e propriedades são armazenados em duas estruturas de dados separadas, o que torna mais eficiente a adição e o acesso a propriedades ou elementos para diferentes padrões de uso.

Os elementos são usados principalmente para os vários [métodos do `Array.prototype`](https://tc39.es/ecma262/#sec-properties-of-the-array-prototype-object), como `pop` ou `slice`. Dado que essas funções acessam propriedades em intervalos consecutivos, o V8 também os representa como arrays simples internamente — na maioria das vezes. Mais adiante neste post, explicaremos como às vezes mudamos para uma representação baseada em dicionário esparso para economizar memória.

Propriedades nomeadas são armazenadas de maneira semelhante em um array separado. No entanto, diferentemente dos elementos, não podemos simplesmente usar a chave para deduzir sua posição dentro do array de propriedades; precisamos de alguns metadados adicionais. No V8, cada objeto JavaScript tem um HiddenClass associado. O HiddenClass armazena informações sobre a forma de um objeto e, entre outras coisas, um mapeamento de nomes de propriedades para índices nas propriedades. Para complicar as coisas, às vezes usamos um dicionário para as propriedades em vez de um array simples. Vamos explicar isso em mais detalhes em uma seção dedicada.

**Conclusão desta seção:**

- Propriedades indexadas por array são armazenadas em um armazenador de elementos separado.
- Propriedades nomeadas são armazenadas no armazenador de propriedades.
- Elementos e propriedades podem ser arrays ou dicionários.
- Cada objeto JavaScript possui um HiddenClass associado que mantém informações sobre a forma do objeto.

## HiddenClasses e DescriptorArrays

Depois de explicar a distinção geral entre elementos e propriedades nomeadas, precisamos observar como as HiddenClasses funcionam no V8. Essa HiddenClass armazena meta-informações sobre um objeto, incluindo o número de propriedades no objeto e uma referência ao protótipo do objeto. As HiddenClasses são conceitualmente semelhantes às classes em linguagens de programação orientadas a objetos típicas. No entanto, em uma linguagem baseada em protótipos como JavaScript, geralmente não é possível conhecer as classes com antecedência. Assim, neste caso, no V8, as HiddenClasses são criadas dinamicamente e atualizadas à medida que os objetos mudam. As HiddenClasses servem como um identificador para o formato de um objeto e, como tal, são um ingrediente muito importante para o compilador otimizador do V8 e os caches inline. Por exemplo, o compilador otimizador pode acessar diretamente as propriedades inline se puder garantir uma estrutura de objetos compatível por meio da HiddenClass.

Vamos observar as partes importantes de uma HiddenClass.

![](/_img/fast-properties/hidden-class.png)

No V8, o primeiro campo de um objeto JavaScript aponta para uma HiddenClass. (De fato, isso ocorre para qualquer objeto que esteja no heap do V8 e gerenciado pelo coletor de lixo.) Em termos de propriedades, as informações mais importantes são o terceiro campo de bits, que armazena o número de propriedades, e um ponteiro para o array de descritores. O array de descritores contém informações sobre propriedades nomeadas, como o próprio nome e a posição onde o valor é armazenado. Observe que não rastreamos propriedades indexadas por inteiros aqui, portanto, não há entrada no array de descritores.

A suposição básica sobre HiddenClasses é que objetos com a mesma estrutura — por exemplo, as mesmas propriedades nomeadas na mesma ordem — compartilham a mesma HiddenClass. Para alcançar isso, usamos uma HiddenClass diferente quando uma propriedade é adicionada a um objeto. No exemplo a seguir, começamos com um objeto vazio e adicionamos três propriedades nomeadas.

![](/_img/fast-properties/adding-properties.png)

Toda vez que uma nova propriedade é adicionada, a HiddenClass do objeto é alterada. Nos bastidores, o V8 cria uma árvore de transição que conecta as HiddenClasses. O V8 sabe qual HiddenClass usar quando, por exemplo, você adiciona a propriedade "a" a um objeto vazio. Essa árvore de transição garante que você acabe com a mesma HiddenClass final se adicionar as mesmas propriedades na mesma ordem. O exemplo a seguir mostra que seguiríamos a mesma árvore de transição mesmo se adicionássemos propriedades indexadas simples no meio.

![](/_img/fast-properties/transitions.png)

No entanto, se criarmos um novo objeto que receba uma propriedade diferente adicionada, neste caso a propriedade `"d"`, o V8 cria uma ramificação separada para as novas HiddenClasses.

![](/_img/fast-properties/transition-trees.png)

**Conclusão desta seção:**

- Objetos com a mesma estrutura (mesmas propriedades na mesma ordem) têm a mesma HiddenClass
- Por padrão, cada nova propriedade nomeada adicionada faz com que uma nova HiddenClass seja criada.
- Adicionar propriedades indexadas por array não cria novas HiddenClasses.

## Os três tipos diferentes de propriedades nomeadas

Depois de dar uma visão geral de como o V8 usa HiddenClasses para rastrear o formato de objetos, vamos nos aprofundar em como essas propriedades são realmente armazenadas. Conforme explicado na introdução acima, existem dois tipos fundamentais de propriedades: nomeadas e indexadas. A seção a seguir aborda as propriedades nomeadas.

Um objeto simples como `{a: 1, b: 2}` pode ter várias representações internas no V8. Enquanto objetos JavaScript se comportam mais ou menos como dicionários simples externamente, o V8 tenta evitar dicionários porque dificultam certas otimizações, como [caches inline](https://en.wikipedia.org/wiki/Inline_caching), que explicaremos em um post separado.

**Propriedades em objeto vs. propriedades normais:** O V8 suporta as chamadas propriedades em objeto, que são armazenadas diretamente nos próprios objetos. Estas são as propriedades mais rápidas disponíveis no V8, pois são acessadas sem nenhuma indireção. O número de propriedades em objeto é predeterminado pelo tamanho inicial do objeto. Se mais propriedades forem adicionadas do que há espaço no objeto, elas são armazenadas no armazenamento de propriedades. O armazenamento de propriedades adiciona um nível de indireção, mas pode crescer de forma independente.

![](/_img/fast-properties/in-object-properties.png)

**Propriedades rápidas vs. lentas:** A próxima distinção importante é entre propriedades rápidas e lentas. Normalmente, definimos as propriedades armazenadas no armazenamento de propriedades lineares como "rápidas". Propriedades rápidas são acessadas simplesmente por índice no armazenamento de propriedades. Para ir do nome da propriedade à posição real no armazenamento de propriedades, precisamos consultar o array de descritores na HiddenClass, como descrevemos anteriormente.

![](/_img/fast-properties/fast-vs-slow-properties.png)

No entanto, se muitas propriedades forem adicionadas e removidas de um objeto, isso pode gerar muito tempo e sobrecarga de memória para manter o array de descritores e as HiddenClasses. Assim, o V8 também suporta as chamadas propriedades lentas. Um objeto com propriedades lentas possui um dicionário autônomo como armazenamento de propriedades. Todas as meta-informações sobre as propriedades não são mais armazenadas no array de descritores na HiddenClass, mas diretamente no dicionário de propriedades. Assim, propriedades podem ser adicionadas e removidas sem atualizar a HiddenClass. Como os caches inline não funcionam com propriedades de dicionário, estas geralmente são mais lentas do que as propriedades rápidas.

**Conclusão desta seção:**

- Existem três tipos diferentes de propriedades nomeadas: em objeto, rápidas e lentas/dicionário.
    1. Propriedades em objeto são armazenadas diretamente no próprio objeto e proporcionam o acesso mais rápido.
    1. Propriedades rápidas vivem no armazenamento de propriedades, todas as informações meta estão armazenadas no array de descritores na HiddenClass.
    1. Propriedades lentas vivem em um dicionário de propriedades independente, as informações meta não são mais compartilhadas pela HiddenClass.
- Propriedades lentas permitem uma remoção e adição de propriedades eficiente, mas são mais lentas para acessar em comparação com os outros dois tipos.

## Elementos ou propriedades indexadas por array

Até agora analisamos propriedades nomeadas e ignoramos propriedades indexadas por inteiros, comumente usadas em arrays. O gerenciamento de propriedades indexadas por inteiros não é menos complexo do que o de propriedades nomeadas. Embora todas as propriedades indexadas sejam sempre mantidas separadamente no armazenamento de elementos, existem [20](https://cs.chromium.org/chromium/src/v8/src/elements-kind.h?q=elements-kind.h&sq=package:chromium&dr&l=14) tipos diferentes de elementos!

**Elementos Compactados ou Com Lacunas:** A primeira grande distinção que o V8 faz é se o armazenamento de elementos está compactado ou possui lacunas. Lacunas surgem no armazenamento de elementos se você excluir um elemento indexado ou, por exemplo, não o definir. Um exemplo simples é `[1,,3]`, onde a segunda entrada é uma lacuna. O exemplo a seguir ilustra essa questão:

```js
const o = ['a', 'b','c'];
console.log(o[1]);          // Imprime 'b'.

delete o[1];                // Introduz uma lacuna no armazenamento de elementos.
console.log(o[1]);          // Imprime 'undefined'; a propriedade 1 não existe.
o.__proto__ = {1: 'B'};     // Define a propriedade 1 no protótipo.

console.log(o[0]);          // Imprime 'a'.
console.log(o[1]);          // Imprime 'B'.
console.log(o[2]);          // Imprime 'c'.
console.log(o[3]);          // Imprime undefined.
```

![](/_img/fast-properties/hole.png)

Resumindo, se uma propriedade não está presente no receptor, precisamos continuar olhando na cadeia de protótipos. Dado que os elementos são independentes, ou seja, não armazenamos informações sobre propriedades indexadas presentes na HiddenClass, precisamos de um valor especial, chamado _hole_, para marcar propriedades que não estão presentes. Isso é crucial para o desempenho das funções de Array. Se sabemos que não há lacunas, ou seja, o armazenamento de elementos está compactado, podemos realizar operações locais sem buscas caras na cadeia de protótipos.

**Elementos Rápidos ou em Modo Dicionário:** A segunda grande distinção feita nos elementos é se eles são rápidos ou em modo dicionário. Elementos rápidos são arrays internos simples da VM, onde o índice de propriedade corresponde ao índice no armazenamento de elementos. No entanto, essa representação simples é bastante ineficiente para arrays muito grandes e esparsos/com lacunas onde apenas poucas entradas estão ocupadas. Nesse caso, usamos uma representação baseada em dicionário para economizar memória ao custo de um acesso ligeiramente mais lento:

```js
const sparseArray = [];
sparseArray[9999] = 'foo'; // Cria um array com elementos em modo dicionário.
```

Neste exemplo, alocar um array completo com 10k entradas seria bastante ineficiente. O que acontece, em vez disso, é que o V8 cria um dicionário onde armazenamos trios chave-valor-descritor. A chave neste caso seria `'9999'` e o valor `'foo'`, e o descritor padrão é usado. Dado que não temos uma maneira de armazenar detalhes do descritor na HiddenClass, o V8 recorre a elementos lentos sempre que você define propriedades indexadas com um descritor personalizado:

```js
const array = [];
Object.defineProperty(array, 0, {value: 'fixed', configurable: false});
console.log(array[0]);      // Imprime 'fixed'.
array[0] = 'other value';   // Não pode sobrescrever o índice 0.
console.log(array[0]);      // Ainda imprime 'fixed'.
```

Neste exemplo, adicionamos uma propriedade não configurável ao array. Essa informação é armazenada na parte do descritor de um trio de dicionário de elementos lentos. É importante observar que as funções de Array são consideravelmente mais lentas em objetos com elementos lentos.

**Elementos Smi e Double:** Para elementos rápidos, existe outra distinção importante feita no V8. Por exemplo, se você armazenar apenas inteiros em um Array, um caso de uso comum, o GC não precisa olhar para o array, já que os inteiros são diretamente codificados como chamados inteiros pequenos (Smis) no local. Outro caso especial são Arrays que contêm apenas doubles. Diferentemente dos Smis, os números de ponto flutuante geralmente são representados como objetos completos ocupando várias palavras. No entanto, o V8 armazena doubles brutos para arrays puramente double para evitar o custo de memória e desempenho. O seguinte exemplo lista quatro exemplos de elementos Smi e double:

```js
const a1 = [1,   2, 3];  // Smi Compactados
const a2 = [1,    , 3];  // Smi com Lacunas, a2[1] lê do protótipo
const b1 = [1.1, 2, 3];  // Double Compactados
const b2 = [1.1,  , 3];  // Double com Lacunas, b2[1] lê do protótipo
```

**Elementos Especiais:** Com as informações até aqui, cobrimos 7 dos 20 tipos diferentes de elementos. Para simplificar, excluímos 9 tipos de elementos para TypedArrays, dois para wrappers de String e, por último, dois outros tipos especiais de elementos para objetos de argumentos.

**O ElementsAccessor:** Como você pode imaginar, não estamos exatamente interessados em escrever funções de Array 20 vezes em C++, uma vez para cada [tipo de elementos](/blog/elements-kinds). É aí que entra um pouco de magia em C++. Em vez de implementar funções de Array repetidamente, criamos o `ElementsAccessor`, onde principalmente precisamos implementar apenas funções simples que acessam elementos do armazenamento de suporte. O `ElementsAccessor` depende de [CRTP](https://en.wikipedia.org/wiki/Curiously_recurring_template_pattern) para criar versões especializadas de cada função de Array. Então, se você chama algo como `slice` em um array, o V8 internamente chama uma função interna escrita em C++ e despacha via o `ElementsAccessor` para a versão especializada da função:

![](/_img/fast-properties/elements-accessor.png)

**Conclusão desta seção:**

- Existem propriedades indexadas em modo rápido e modo de dicionário, e elementos.
- Propriedades rápidas podem ser compactadas ou podem conter lacunas, o que indica que uma propriedade indexada foi deletada.
- Os elementos são especializados com base em seu conteúdo para acelerar as funções de Array e reduzir a sobrecarga de GC.

Entender como as propriedades funcionam é fundamental para muitas otimizações no V8. Para desenvolvedores JavaScript, muitas dessas decisões internas não são diretamente visíveis, mas elas explicam por que certos padrões de código são mais rápidos do que outros. Alterar o tipo de propriedade ou elemento normalmente faz com que o V8 crie um HiddenClass diferente, o que pode levar a poluição de tipos que [impede o V8 de gerar código otimizado](http://mrale.ph/blog/2015/01/11/whats-up-with-monomorphism.html). Fique atento para mais postagens sobre como funcionam os internos do VM no V8.
