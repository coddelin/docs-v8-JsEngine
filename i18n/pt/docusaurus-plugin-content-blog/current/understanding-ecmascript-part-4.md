---
title: "Entendendo a especificação ECMAScript, parte 4"
author: "[Marja Hölttä](https://twitter.com/marjakh), espectadora especulativa de especificações"
avatars:
  - marja-holtta
date: 2020-05-19
tags:
  - ECMAScript
  - Entendendo ECMAScript
description: "Tutorial sobre leitura da especificação ECMAScript"
tweet: "1262815621756014594"
---

[Todos os episódios](/blog/tags/understanding-ecmascript)

## Enquanto isso em outras partes da Web

[Jason Orendorff](https://github.com/jorendorff) da Mozilla publicou [uma análise aprofundada incrível sobre peculiaridades sintáticas de JS](https://github.com/mozilla-spidermonkey/jsparagus/blob/master/js-quirks.md#readme). Embora os detalhes de implementação sejam diferentes, todos os motores JS enfrentam os mesmos problemas com essas peculiaridades.

<!--truncate-->
## Gramáticas de cobertura

Neste episódio, examinamos mais profundamente as *gramáticas de cobertura*. Elas são uma forma de especificar a gramática para construções sintáticas que parecem ambíguas à primeira vista.

Novamente, vamos pular os subscritos para `[In, Yield, Await]` por brevidade, já que não são importantes para este post do blog. Consulte [parte 3](/blog/understanding-ecmascript-part-3) para uma explicação do significado e uso deles.

## Antevisões finitas

Normalmente, os analisadores decidem qual produção usar com base em uma antevisão finita (uma quantidade fixa de tokens subsequentes).

Em alguns casos, o próximo token determina a produção a ser usada de forma não ambígua. [Por exemplo](https://tc39.es/ecma262/#prod-UpdateExpression):

```grammar
UpdateExpression :
  LeftHandSideExpression
  LeftHandSideExpression ++
  LeftHandSideExpression --
  ++ UnaryExpression
  -- UnaryExpression
```

Se estivermos analisando uma `UpdateExpression` e o próximo token for `++` ou `--`, saberemos imediatamente qual produção usar. Se o próximo token não for nenhum dos dois, ainda não será tão ruim: podemos analisar um `LeftHandSideExpression` começando da posição em que estamos e decidir o que fazer depois de analisá-lo.

Se o token após o `LeftHandSideExpression` for `++`, a produção a ser usada é `UpdateExpression : LeftHandSideExpression ++`. O caso para `--` é semelhante. E se o token após o `LeftHandSideExpression` não for `++` nem `--`, usamos a produção `UpdateExpression : LeftHandSideExpression`.

### Lista de parâmetros de função arrow ou uma expressão entre parênteses?

Distinguir listas de parâmetros de função arrow de expressões entre parênteses é mais complicado.

Por exemplo:

```js
let x = (a,
```

Isso é o início de uma função arrow, como esta?

```js
let x = (a, b) => { return a + b };
```

Ou talvez seja uma expressão entre parênteses, como esta?

```js
let x = (a, 3);
```

O que quer que esteja entre parênteses pode ser arbitrariamente longo - não podemos saber o que é com base em uma quantidade finita de tokens.

Vamos imaginar por um momento que tivéssemos as seguintes produções simples:

```grammar
AssignmentExpression :
  ...
  ArrowFunction
  ParenthesizedExpression

ArrowFunction :
  ArrowParameterList => ConciseBody
```

Agora não podemos escolher a produção a ser usada com uma antevisão finita. Se tivéssemos que analisar um `AssignmentExpression` e o próximo token fosse `(`, como decidiríamos o que analisar em seguida? Poderíamos analisar `ArrowParameterList` ou `ParenthesizedExpression`, mas nossa suposição poderia estar errada.

### O novo símbolo muito permissivo: `CPEAAPL`

A especificação resolve esse problema introduzindo o símbolo `CoverParenthesizedExpressionAndArrowParameterList` (`CPEAAPL`, para abreviar). `CPEAAPL` é um símbolo que realmente é um `ParenthesizedExpression` ou um `ArrowParameterList` nos bastidores, mas ainda não sabemos qual.

As [produções](https://tc39.es/ecma262/#prod-CoverParenthesizedExpressionAndArrowParameterList) para `CPEAAPL` são muito permissivas, permitindo todas as construções que podem ocorrer em `ParenthesizedExpression` e em `ArrowParameterList`s:

```grammar
CPEAAPL :
  ( Expression )
  ( Expression , )
  ( )
  ( ... BindingIdentifier )
  ( ... BindingPattern )
  ( Expression , ... BindingIdentifier )
  ( Expression , ... BindingPattern )
```

Por exemplo, as seguintes expressões são `CPEAAPL`s válidas:

```js
// Expressão entre parênteses e Lista de parâmetros válidas:
(a, b)
(a, b = 1)

// Expressão entre parênteses válida:
(1, 2, 3)
(function foo() { })

// Lista de parâmetros válida:
()
(a, b,)
(a, ...b)
(a = 1, ...b)

// Não válida, mas ainda um CPEAAPL:
(1, ...b)
(1, )
```

A vírgula final e o `...` podem ocorrer apenas em `ArrowParameterList`. Algumas construções, como `b = 1`, podem ocorrer em ambas, mas têm significados diferentes: Dentro de `ParenthesizedExpression`, é uma atribuição; dentro de `ArrowParameterList`, é um parâmetro com um valor padrão. Números e outras expressões primárias que não são nomes válidos de parâmetro (ou padrões de destruturação de parâmetros) só podem ocorrer em `ParenthesizedExpression`. Mas todos podem ocorrer dentro de um `CPEAAPL`.

### Usando `CPEAAPL` nas produções

Agora podemos usar o permissivo `CPEAAPL` nas [produções de `AssignmentExpression`](https://tc39.es/ecma262/#prod-AssignmentExpression). (Nota: `ConditionalExpression` leva a `PrimaryExpression` através de uma longa cadeia de produção que não está mostrada aqui.)

```grammar
AssignmentExpression :
  ConditionalExpression
  ArrowFunction
  ...

ArrowFunction :
  ArrowParameters => ConciseBody

ArrowParameters :
  BindingIdentifier
  CPEAAPL

PrimaryExpression :
  ...
  CPEAAPL

```

Imagine que estamos novamente na situação em que precisamos analisar um `AssignmentExpression` e o próximo token é `(`. Agora podemos analisar um `CPEAAPL` e descobrir mais tarde qual produção usar. Não importa se estamos analisando um `ArrowFunction` ou um `ConditionalExpression`, o próximo símbolo a ser analisado é `CPEAAPL` em qualquer caso!

Depois de analisar o `CPEAAPL`, podemos decidir qual produção usar para o `AssignmentExpression` original (aquele contendo o `CPEAAPL`). Esta decisão é feita com base no token que segue o `CPEAAPL`.

Se o token for `=>`, usamos a produção:

```grammar
AssignmentExpression :
  ArrowFunction
```

Se o token for outra coisa, usamos a produção:

```grammar
AssignmentExpression :
  ConditionalExpression
```

Por exemplo:

```js
let x = (a, b) => { return a + b; };
//      ^^^^^^
//     CPEAAPL
//             ^^
//             O token que segue o CPEAAPL

let x = (a, 3);
//      ^^^^^^
//     CPEAAPL
//            ^
//            O token que segue o CPEAAPL
```

Nesse ponto, podemos manter o `CPEAAPL` como está e continuar analisando o restante do programa. Por exemplo, se o `CPEAAPL` estiver dentro de um `ArrowFunction`, ainda não precisamos verificar se é uma lista válida de parâmetros de função arrow ou não - isso pode ser feito mais tarde. (Analisadores do mundo real podem optar por fazer a verificação de validade imediatamente, mas do ponto de vista da especificação, não precisamos.)

### Restringindo CPEAAPLs

Como vimos antes, as produções da gramática para `CPEAAPL` são muito permissivas e permitem construções (como `(1, ...a)`) que nunca são válidas. Depois de fazermos a análise do programa de acordo com a gramática, precisamos desconsiderar as construções ilegais correspondentes.

A especificação faz isso adicionando as seguintes restrições:

:::ecmascript-algorithm
> [Semântica Estática: Erros Prematuros](https://tc39.es/ecma262/#sec-grouping-operator-static-semantics-early-errors)
>
> `PrimaryExpression : CPEAAPL`
>
> É um Erro de Sintaxe se `CPEAAPL` não estiver cobrindo uma `ParenthesizedExpression`.

:::ecmascript-algorithm
> [Sintaxe Suplementar](https://tc39.es/ecma262/#sec-primary-expression)
>
> Ao processar uma instância da produção
>
> `PrimaryExpression : CPEAAPL`
>
> a interpretação do `CPEAAPL` é refinada usando a seguinte gramática:
>
> `ParenthesizedExpression : ( Expression )`

Isso significa: se um `CPEAAPL` ocorre no lugar de `PrimaryExpression` na árvore de sintaxe, ele é na verdade uma `ParenthesizedExpression` e esta é sua única produção válida.

`Expression` nunca pode estar vazia, então `( )` não é uma `ParenthesizedExpression` válida. Listas separadas por vírgula como `(1, 2, 3)` são criadas pelo [operador vírgula](https://tc39.es/ecma262/#sec-comma-operator):

```grammar
Expression :
  AssignmentExpression
  Expression , AssignmentExpression
```

De forma similar, se um `CPEAAPL` ocorre no lugar de `ArrowParameters`, as seguintes restrições se aplicam:

:::ecmascript-algorithm
> [Semântica Estática: Erros Prematuros](https://tc39.es/ecma262/#sec-arrow-function-definitions-static-semantics-early-errors)
>
> `ArrowParameters : CPEAAPL`
>
> É um Erro de Sintaxe se `CPEAAPL` não estiver cobrindo um `ArrowFormalParameters`.

:::ecmascript-algorithm
> [Sintaxe Suplementar](https://tc39.es/ecma262/#sec-arrow-function-definitions)
>
> Quando a produção
>
> `ArrowParameters` : `CPEAAPL`
>
> é reconhecida, a seguinte gramática é usada para refinar a interpretação de `CPEAAPL`:
>
> `ArrowFormalParameters :`
> `( UniqueFormalParameters )`

### Outras gramáticas de cobertura

Além de `CPEAAPL`, a especificação utiliza gramáticas de cobertura para outras construções aparentemente ambíguas.

`ObjectLiteral` é usado como uma gramática de cobertura para `ObjectAssignmentPattern`, que ocorre dentro de listas de parâmetros de função arrow. Isso significa que `ObjectLiteral` permite construções que não podem ocorrer dentro de objetos literais reais.

```grammar
ObjectLiteral :
  ...
  { PropertyDefinitionList }

PropertyDefinition :
  ...
  CoverInitializedName

CoverInitializedName :
  IdentifierReference Initializer

Initializer :
  = AssignmentExpression
```

Por exemplo:

```js
let o = { a = 1 }; // erro de sintaxe

// Função arrow com um parâmetro de desestruturação com um valor
// padrão:
let f = ({ a = 1 }) => { return a; };
f({}); // retorna 1
f({a : 6}); // retorna 6
```

Funções async arrow também parecem ambíguas com um lookahead finito:

```js
let x = async(a,
```

Isso é uma chamada para uma função chamada `async` ou uma função arrow async?

```js
let x1 = async(a, b);
let x2 = async();
function async() { }

let x3 = async(a, b) => {};
let x4 = async();
```

Para isso, a gramática define um símbolo de gramática de cobertura `CoverCallExpressionAndAsyncArrowHead`, que funciona de forma semelhante a `CPEAAPL`.

## Resumo

Neste episódio, analisamos como a especificação define gramáticas de cobertura e as utiliza em casos onde não podemos identificar a construção sintática atual com base em um lookahead finito.

Em particular, investigamos como distinguir listas de parâmetros de funções arrow de expressões entre parênteses e como a especificação utiliza uma gramática de cobertura para inicialmente analisar construtos ambíguos de forma permissiva e restringi-los posteriormente com regras semânticas estáticas.
