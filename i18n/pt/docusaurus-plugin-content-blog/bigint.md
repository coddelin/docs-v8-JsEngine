---
title: "Adicionando BigInts ao V8"
author: "Jakob Kummerow, árbitro de precisão"
date: "2018-05-02 13:33:37"
tags: 
  - ECMAScript
description: "V8 agora suporta BigInts, um recurso da linguagem JavaScript que permite inteiros de precisão arbitrária."
tweet: "991705626391732224"
---
Nos últimos meses, implementamos o suporte para [BigInts](/features/bigint) no V8, conforme especificado atualmente por [esta proposta](https://github.com/tc39/proposal-bigint), para ser incluído em uma futura versão do ECMAScript. O post a seguir conta a história de nossas aventuras.

<!--truncate-->
## Resumo rápido

Como um programador JavaScript, você agora[^1] tem inteiros com precisão arbitrária[^2] em sua caixa de ferramentas:

```js
const a = 2172141653n;
const b = 15346349309n;
a * b;
// → 33334444555566667777n     // Yay!
Number(a) * Number(b);
// → 33334444555566670000      // Boo!
const such_many = 2n ** 222n;
// → 6739986666787659948666753771754907668409286105635143120275902562304n
```

Para detalhes sobre a nova funcionalidade e como ela pode ser usada, consulte [nosso artigo aprofundado sobre BigInt](/features/bigint). Estamos ansiosos para ver as coisas incríveis que você irá construir com eles!

[^1]: _Agora_ se você executar o Chrome Beta, Dev ou Canary, ou uma [versão de pré-visualização do Node.js](https://github.com/v8/node/tree/vee-eight-lkgr), caso contrário _em breve_ (Chrome 67, Node.js na ponta provavelmente na mesma época).

[^2]: Arbitrária até um limite definido pela implementação. Desculpe, ainda não descobrimos como espremer uma quantidade infinita de dados na quantidade finita de memória do seu computador.

## Representando BigInts na memória

Normalmente, computadores armazenam inteiros nos registradores da CPU (que atualmente geralmente têm 32 ou 64 bits de largura), ou em pedaços de memória do tamanho de registradores. Isso leva aos valores mínimo e máximo que você pode estar familiarizado. Por exemplo, um inteiro de 32 bits com sinal pode conter valores de -2.147.483.648 a 2.147.483.647. No entanto, a ideia dos BigInts é não ser limitada por esses limites.

Então, como alguém pode armazenar um BigInt com cem, ou mil, ou um milhão de bits? Ele não cabe em um registrador, então alocamos um objeto na memória. Nós o tornamos grande o suficiente para conter todos os bits do BigInt, em uma série de pedaços, que chamamos de “dígitos” — porque isso é conceitualmente muito semelhante à forma como alguém pode escrever números maiores que “9” usando mais dígitos, como em “10”; exceto onde o sistema decimal usa dígitos de 0 a 9, nossos BigInts usam dígitos de 0 a 4294967295 (ou seja, `2**32-1`). Este é o intervalo de valores de um registrador de CPU de 32 bits[^3], sem um bit de sinal; armazenamos o bit de sinal separadamente. Em pseudocódigo, um objeto `BigInt` com `3*32 = 96` bits se parece com isto:

```js
{
  type: 'BigInt',
  sign: 0,
  num_digits: 3,
  digits: [0x12…, 0x34…, 0x56…],
}
```

[^3]: Em máquinas de 64 bits, usamos dígitos de 64 bits, ou seja, de 0 a 18446744073709551615 (ou seja, `2n**64n-1n`).

## Voltando à escola e de volta a Knuth

Trabalhar com inteiros mantidos em registradores da CPU é muito fácil: por exemplo, para multiplicar dois deles, há uma instrução de máquina que o software pode usar para dizer à CPU “multiplique o conteúdo desses dois registradores!”, e a CPU fará isso. Para a aritmética BigInt, temos que encontrar nossa própria solução. Felizmente, essa tarefa em particular é algo que literalmente toda criança em algum momento aprende a resolver: você se lembra do que fazia na escola quando tinha que multiplicar 345 \* 678 e não podia usar uma calculadora?

```
345 * 678
---------
     30    //   5 * 6
+   24     //  4  * 6
+  18      // 3   * 6
+     35   //   5 *  7
+    28    //  4  *  7
+   21     // 3   *  7
+      40  //   5 *   8
+     32   //  4  *   8
+    24    // 3   *   8
=========
   233910
```

É exatamente assim que o V8 multiplica BigInts: um dígito por vez, somando os resultados intermediários. O algoritmo funciona tão bem para `0` a `9` quanto para os dígitos muito maiores de um BigInt.

Donald Knuth publicou uma implementação específica de multiplicação e divisão de números grandes formados por pedaços menores no Volume 2 de seu clássico _The Art of Computer Programming_, em 1969. A implementação do V8 segue este livro, o que mostra que esta é uma peça atemporal de ciência da computação.

## “Menos dessugestão” == mais doces?

Talvez surpreendentemente, tivemos que dedicar bastante esforço para fazer funcionar operações unárias aparentemente simples, como `-x`. Até agora, `-x` fazia exatamente a mesma coisa que `x * (-1)`, então, para simplificar as coisas, o V8 aplicava exatamente essa substituição o mais cedo possível ao processar JavaScript, ou seja, no analisador sintático. Essa abordagem é chamada de “dessugestão”, porque trata uma expressão como `-x` como “açúcar sintático” para `x * (-1)`. Outros componentes (o interpretador, o compilador, todo o sistema de execução) nem precisavam saber o que era uma operação unária, porque eles só viam a multiplicação, que é claro, devem suportar de qualquer maneira.

Com BigInts, no entanto, essa implementação de repente se torna inválida, porque multiplicar um BigInt com um Número (como `-1`) deve lançar um `TypeError`[^4]. O parser teria que dessugar `-x` para `x * (-1n)` se `x` for um BigInt — mas o parser não tem como saber o que `x` avaliará. Portanto, tivemos que parar de depender desse dessugar inicial e, em vez disso, adicionar suporte adequado para operações unárias em ambos os Numbers e BigInts em todos os lugares.

[^4]: Misturar os tipos de operandos `BigInt` e `Number` geralmente não é permitido. Isso é um pouco incomum para JavaScript, mas há [uma explicação](/features/bigint#operators) para essa decisão.

## Um pouco de diversão com operações bit a bit

A maioria dos sistemas computacionais em uso hoje armazena números inteiros sinalizados usando um truque elegante chamado 'complemento de dois', que tem as propriedades interessantes de que o primeiro bit indica o sinal, e adicionar 1 ao padrão de bits sempre incrementa o número em 1, lidando automaticamente com o bit de sinal. Por exemplo, para números inteiros de 8 bits:

- `10000000` é -128, o menor número representável,
- `10000001` é -127,
- `11111111` é -1,
- `00000000` é 0,
- `00000001` é 1,
- `01111111` é 127, o maior número representável.

Essa codificação é tão comum que muitos programadores a esperam e dependem dela, e a especificação BigInt reflete esse fato ao prescrever que BigInts devem agir como se usassem a representação de complemento de dois. Como descrito acima, os BigInts do V8 não!

Para realizar operações bit a bit de acordo com a especificação, nossos BigInts, portanto, devem fingir estar usando complemento de dois nos bastidores. Para valores positivos, isso não faz diferença, mas números negativos devem fazer trabalho extra para realizar isso. Isso tem o efeito um tanto surpreendente de que `a & b`, se `a` e `b` forem ambos BigInts negativos, na verdade realiza _quatro_ etapas (em vez de apenas uma se fossem ambos positivos): ambas as entradas são convertidas para o formato falso de complemento de dois, então a operação real é feita, então o resultado é convertido de volta para nossa representação real. Por quê esse vai-e-volta, você pode perguntar? Porque todas as operações não bit a bit são muito mais fáceis assim.

## Dois novos tipos de TypedArrays

A proposta BigInt inclui dois novos tipos de TypedArray: `BigInt64Array` e `BigUint64Array`. Agora podemos ter TypedArrays com elementos inteiros de 64 bits de largura, já que os BigInts fornecem uma maneira natural de ler e escrever todos os bits nesses elementos, enquanto, se alguém tentasse usar Numbers para isso, alguns bits poderiam ser perdidos. É por isso que os novos arrays não são exatamente como os TypedArrays existentes de 8/16/32 bits: acessar seus elementos é sempre feito com BigInts; tentar usar Numbers lança uma exceção.

```js
> const big_array = new BigInt64Array(1);
> big_array[0] = 123n;  // OK
> big_array[0]
123n
> big_array[0] = 456;
TypeError: Cannot convert 456 to a BigInt
> big_array[0] = BigInt(456);  // OK
```

Assim como o código JavaScript que trabalha com esses tipos de arrays parece e funciona de maneira um pouco diferente do código tradicional de TypedArray, tivemos que generalizar nossa implementação de TypedArray para se comportar de forma diferente para os dois recém-chegados.

## Considerações de otimização

Por enquanto, estamos lançando uma implementação básica de BigInts. É funcionalmente completa e deve fornecer um desempenho sólido (um pouco mais rápido do que as bibliotecas existentes no userland), mas não é particularmente otimizada. A razão é que, de acordo com nosso objetivo de priorizar aplicações do mundo real sobre benchmarks artificiais, primeiro queremos ver como você usará BigInts, para que possamos então otimizar precisamente os casos que são importantes para você!

Por exemplo, se percebemos que BigInts relativamente pequenos (até 64 bits) são um caso de uso importante, poderíamos torná-los mais eficientes em termos de memória usando uma representação especial para eles:

```js
{
  type: 'BigInt-Int64',
  value: 0x12…,
}
```

Um dos detalhes que resta ver é se devemos fazer isso para os intervalos de valor 'int64', intervalos 'uint64' ou ambos — tendo em mente que ter menos caminhos rápidos para suportar significa que podemos entregá-los mais cedo, e também que cada caminho rápido adicional, ironicamente, torna tudo um pouco mais lento, porque as operações afetadas sempre têm que verificar se ele é aplicável.

Outra questão é o suporte a BigInts no compilador de otimização. Para aplicações computacionalmente pesadas que operam com valores de 64 bits e rodam em hardware de 64 bits, manter esses valores em registradores seria muito mais eficiente do que alocá-los como objetos no heap, como fazemos atualmente. Temos planos de como implementar esse suporte, mas é outro caso em que primeiro gostaríamos de descobrir se isso é realmente o que vocês, nossos usuários, mais se preocupam; ou se deveríamos gastar nosso tempo em algo diferente.

Por favor, envie-nos feedback sobre para que você está usando os BigInts e quaisquer problemas que encontrar! Você pode nos contatar pelo nosso rastreador de bugs [crbug.com/v8/new](https://crbug.com/v8/new), por e-mail para [v8-users@googlegroups.com](mailto:v8-users@googlegroups.com) ou [@v8js](https://twitter.com/v8js) no Twitter.
