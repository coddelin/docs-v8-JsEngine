---
title: "Coalescência nula"
author: "Justin Ridgewell"
avatars: 
  - "justin-ridgewell"
date: 2019-09-17
tags: 
  - ECMAScript
  - ES2020
description: "O operador de coalescência nula do JavaScript permite expressões padrão mais seguras."
tweet: "1173971116865523714"
---
A [proposta de coalescência nula](https://github.com/tc39/proposal-nullish-coalescing/) (`??`) adiciona um novo operador de curto-circuito destinado a lidar com valores padrão.

Você pode já estar familiarizado com os outros operadores de curto-circuito `&&` e `||`. Ambos lidam com valores “truthy” e “falsy”. Imagine o exemplo de código `lhs && rhs`. Se `lhs` (lido como, _lado esquerdo_) for falsy, a expressão avalia para `lhs`. Caso contrário, avalia para `rhs` (lido como, _lado direito_). O oposto é verdadeiro para o exemplo de código `lhs || rhs`. Se `lhs` for truthy, a expressão avalia para `lhs`. Caso contrário, avalia para `rhs`.

<!--truncate-->
Mas o que exatamente significa “truthy” e “falsy”? Em termos de especificação, isso equivale à operação abstrata [`ToBoolean`](https://tc39.es/ecma262/#sec-toboolean). Para nós, desenvolvedores de JavaScript, **tudo** é truthy, exceto os valores falsy `undefined`, `null`, `false`, `0`, `NaN` e a string vazia `''`. (Tecnicamente, o valor associado a `document.all` também é falsy, mas chegaremos a isso mais tarde.)

Então, qual é o problema com `&&` e `||`? E por que precisamos de um novo operador de coalescência nula? É porque essa definição de truthy e falsy não se ajusta a todos os cenários e isso leva a bugs. Imagine o seguinte:

```js
function Component(props) {
  const enable = props.enabled || true;
  // …
}
```

Neste exemplo, vamos tratar a propriedade `enabled` como uma propriedade booleana opcional que controla se alguma funcionalidade no componente está habilitada. Ou seja, podemos definir explicitamente `enabled` como `true` ou `false`. Mas, porque é uma propriedade _opcional_, podemos definir implicitamente como `undefined` simplesmente não a configurando. Se for `undefined`, queremos tratá-la como se o componente estivesse `enabled = true` (seu valor padrão).

Até agora, você provavelmente já percebeu o bug no exemplo de código. Se configurarmos explicitamente `enabled = true`, a variável `enable` será `true`. Se configurarmos implicitamente `enabled = undefined`, a variável `enable` será `true`. E se configurarmos explicitamente `enabled = false`, a variável `enable` ainda será `true`! Nossa intenção era _definir_ o valor padrão como `true`, mas, na verdade, forçamos o valor em vez disso. A correção nesse caso é ser muito explícito sobre os valores que esperamos:

```js
function Component(props) {
  const enable = props.enabled !== false;
  // …
}
```

Vemos esse tipo de bug aparecer com todos os valores falsy. Isso poderia ter sido facilmente um string opcional (onde a string vazia `''` é considerada uma entrada válida) ou um número opcional (onde `0` é considerado uma entrada válida). Este é um problema tão comum que agora estamos introduzindo o operador de coalescência nula para lidar com esse tipo de atribuição de valor padrão:

```js
function Component(props) {
  const enable = props.enabled ?? true;
  // …
}
```

O operador de coalescência nula (`??`) age de forma muito semelhante ao operador `||`, exceto que não usamos “truthy” ao avaliar o operador. Em vez disso, usamos a definição de “nulo”, significando “o valor é estritamente igual a `null` ou `undefined`”. Então, imagine a expressão `lhs ?? rhs`: se `lhs` não for nulo, avalia para `lhs`. Caso contrário, avalia para `rhs`.

Explicitamente, isso significa que os valores `false`, `0`, `NaN` e a string vazia `''` são todos valores falsy que não são nulos. Quando esses valores falsy-mas-não-nulos estiverem no lado esquerdo de um `lhs ?? rhs`, a expressão avalia para eles em vez do lado direito. Adeus bugs!

```js
false ?? true;   // => false
0 ?? 1;          // => 0
'' ?? 'default'; // => ''

null ?? [];      // => []
undefined ?? []; // => []
```

## E quanto à atribuição padrão durante a destruturação?

Você pode ter notado que o último exemplo de código também poderia ser corrigido usando atribuição padrão dentro de uma destruturação de objeto:

```js
function Component(props) {
  const {
    enabled: enable = true,
  } = props;
  // …
}
```

É um pouco longo, mas ainda é completamente válido em JavaScript. Contudo, usa uma semântica ligeiramente diferente. A atribuição padrão dentro de destruturas de objeto verifica se a propriedade é estritamente igual a `undefined`, e, se for, atribui o valor padrão.

Mas esses testes de igualdade estrita apenas para `undefined` nem sempre são desejáveis, e um objeto para realizar a destruturação nem sempre está disponível. Por exemplo, talvez você queira aplicar um valor padrão ao retorno de uma função (sem objeto para destruturar). Ou talvez a função retorne `null` (o que é comum para APIs DOM). São nesses casos que você deve recorrer à coalescência nula:

```js
// Coalescência nula concisa
const link = document.querySelector('link') ?? document.createElement('link');

// Atribuição padrão ao desestruturar com boilerplate
const {
  link = document.createElement('link'),
} = {
  link: document.querySelector('link') || undefined
};
```

Além disso, alguns novos recursos como [encadeamento opcional](/features/optional-chaining) não funcionam perfeitamente com desestruturação. Como a desestruturação requer um objeto, você precisa proteger a desestruturação caso o encadeamento opcional retorne `undefined` em vez de um objeto. Com a coalescência nula, não temos esse problema:

```js
// Encadeamento opcional e coalescência nula em conjunto
const link = obj.deep?.container.link ?? document.createElement('link');

// Atribuição padrão ao desestruturar com encadeamento opcional
const {
  link = document.createElement('link'),
} = (obj.deep?.container || {});
```

## Combinando e misturando operadores

O design de linguagem é difícil, e nem sempre conseguimos criar novos operadores sem um certo grau de ambiguidade na intenção do desenvolvedor. Se você já misturou os operadores `&&` e `||`, provavelmente já se deparou com essa ambiguidade. Imagine a expressão `lhs && middle || rhs`. Em JavaScript, isso é analisado da mesma forma que a expressão `(lhs && middle) || rhs`. Agora imagine a expressão `lhs || middle && rhs`. Esta é analisada da mesma forma que `lhs || (middle && rhs)`.

Você provavelmente percebe que o operador `&&` tem maior precedência para seu lado esquerdo e direito do que o operador `||`, o que significa que os parênteses implícitos envolvem o `&&` em vez do `||`. Ao projetar o operador `??`, tivemos que decidir qual seria a precedência. Ele poderia ter:

1. menor precedência que ambos `&&` e `||`
1. menor que `&&` mas maior que `||`
1. maior precedência que ambos `&&` e `||`

Para cada uma dessas definições de precedência, então tivemos que executá-la nos quatro casos de teste possíveis:

1. `lhs && middle ?? rhs`
1. `lhs ?? middle && rhs`
1. `lhs || middle ?? rhs`
1. `lhs ?? middle || rhs`

Em cada expressão de teste, tivemos que decidir onde os parênteses implícitos pertenciam. E se eles não envolvessem a expressão exatamente da forma como o desenvolvedor pretendia, teríamos código mal escrito. Infelizmente, independentemente do nível de precedência escolhido, uma das expressões de teste poderia violar as intenções do desenvolvedor.

No final, decidimos exigir parênteses explícitos ao misturar `??` e (`&&` ou `||`) (observe que fui explícito com meu agrupamento de parênteses! piada meta!). Se você misturar, deve envolver um dos grupos de operadores em parênteses, ou receberá um erro de sintaxe.

```js
// Grupos de parênteses explícitos são obrigatórios para misturar
(lhs && middle) ?? rhs;
lhs && (middle ?? rhs);

(lhs ?? middle) && rhs;
lhs ?? (middle && rhs);

(lhs || middle) ?? rhs;
lhs || (middle ?? rhs);

(lhs ?? middle) || rhs;
lhs ?? (middle || rhs);
```

Dessa forma, o analisador de linguagem sempre corresponde ao que o desenvolvedor pretendia. E qualquer pessoa que ler o código depois poderá entendê-lo imediatamente também. Legal!

## Fale-me sobre `document.all`

[`document.all`](https://developer.mozilla.org/en-US/docs/Web/API/Document/all) é um valor especial que você nunca deve usar. Mas se você usá-lo, é melhor saber como ele interage com “truthy” e “nullish”.

`document.all` é um objeto parecido com um array, o que significa que possui propriedades indexadas como um array e um comprimento. Objetos geralmente são “truthy” — mas surpreendentemente, `document.all` finge ser um valor “falsy”! Na verdade, ele é igual em comparação frouxa a ambos `null` e `undefined` (o que normalmente significa que ele não pode ter propriedades).

Ao usar `document.all` com `&&` ou `||`, ele finge ser “falsy”. Mas, ele não é igual estrito a `null` nem a `undefined`, então ele não é “nullish”. Assim, ao usar `document.all` com `??`, ele se comporta como qualquer outro objeto.

```js
document.all || true; // => true
document.all ?? true; // => HTMLAllCollection[]
```

## Suporte para coalescência nula

<feature-support chrome="80 https://bugs.chromium.org/p/v8/issues/detail?id=9547"
                 firefox="72 https://bugzilla.mozilla.org/show_bug.cgi?id=1566141"
                 safari="13.1 https://webkit.org/blog/10247/new-webkit-features-in-safari-13-1/"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-nullish-coalescing-operator"></feature-support>
