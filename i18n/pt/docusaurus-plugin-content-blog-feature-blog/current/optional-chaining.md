---
title: "Encadeamento opcional"
author: "Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski)), destruidora de cadeias opcionais"
avatars: 
  - "maya-armyanova"
date: 2019-08-27
tags: 
  - ECMAScript
  - ES2020
description: "O encadeamento opcional permite a expressão legível e concisa de acessos a propriedades com verificação de valores nulos embutida."
tweet: "1166360971914481669"
---
Cadeias longas de acessos a propriedades em JavaScript podem ser propensas a erros, já que qualquer uma delas pode ser avaliada como `null` ou `undefined` (também conhecidos como valores “nulos”). Verificar a existência de propriedade em cada etapa facilmente se transforma em uma estrutura profundamente aninhada de instruções `if` ou uma condição `if` longa que replica a cadeia de acesso à propriedade:

<!--truncate-->
```js
// Versão propensa a erros, pode lançar exceção.
const nameLength = db.user.name.length;

// Menos propensa a erros, mas mais difícil de ler.
let nameLength;
if (db && db.user && db.user.name)
  nameLength = db.user.name.length;
```

O exemplo acima também pode ser expresso usando o operador ternário, o que não ajuda exatamente na legibilidade:

```js
const nameLength =
  (db
    ? (db.user
      ? (db.user.name
        ? db.user.name.length
        : undefined)
      : undefined)
    : undefined);
```

## Apresentando o operador de encadeamento opcional

Certamente você não quer escrever código assim, então ter alguma alternativa é desejável. Algumas outras linguagens oferecem uma solução elegante para esse problema usando um recurso chamado “encadeamento opcional”. De acordo com [uma proposta recente de especificação](https://github.com/tc39/proposal-optional-chaining), “uma cadeia opcional é uma cadeia de um ou mais acessos a propriedades e chamadas de função, sendo que a primeira começa com o token `?.`”.

Usando o novo operador de encadeamento opcional, podemos reescrever o exemplo acima da seguinte forma:

```js
// Ainda verifica erros e é muito mais legível.
const nameLength = db?.user?.name?.length;
```

O que acontece quando `db`, `user` ou `name` é `undefined` ou `null`? Com o operador de encadeamento opcional, o JavaScript inicializa `nameLength` como `undefined` em vez de lançar um erro.

Observe que esse comportamento também é mais robusto do que nossa verificação para `if (db && db.user && db.user.name)`. Por exemplo, e se `name` fosse sempre garantido como uma string? Poderíamos mudar `name?.length` para `name.length`. Então, se `name` fosse uma string vazia, ainda obteríamos o comprimento correto de `0`. Isso ocorre porque a string vazia é um valor falsy: ela se comporta como `false` em uma cláusula `if`. O operador de encadeamento opcional corrige essa fonte comum de bugs.

## Formas adicionais de sintaxe: chamadas e propriedades dinâmicas

Também há uma versão do operador para chamar métodos opcionais:

```js
// Estende a interface com um método opcional, presente
// apenas para usuários administradores.
const adminOption = db?.user?.validateAdminAndGetPrefs?.().option;
```

A sintaxe pode parecer inesperada, já que `?.()` é o operador real, que se aplica à expressão _antes_ dele.

Há um terceiro uso do operador, que é o acesso opcional a propriedades dinâmicas, feito via `?.[]`. Ele retorna o valor referenciado pelo argumento nos colchetes, ou `undefined` caso não haja objeto para obter o valor. Aqui está um caso de uso possível, seguindo o exemplo acima:

```js
// Estende as capacidades do acesso à propriedade estática
// com um nome de propriedade gerado dinamicamente.
const optionName = 'configuração opcional';
const optionLength = db?.user?.preferences?.[optionName].length;
```

Esta última forma também está disponível para indexar arrays opcionalmente, por exemplo:

```js
// Se `usersArray` for `null` ou `undefined`,
// então `userName` avalia graciosamente para `undefined`.
const userIndex = 42;
const userName = usersArray?.[userIndex].name;
```

O operador de encadeamento opcional pode ser combinado com o [operador de fusão nula `??`](/features/nullish-coalescing) quando é necessário um valor padrão não `undefined`. Isso permite acesso seguro a propriedades profundas com um valor padrão especificado, abordando um caso de uso comum que anteriormente exigia bibliotecas externas, como [`_.get` do lodash](https://lodash.dev/docs/4.17.15#get):

```js
const object = { id: 123, names: { first: 'Alice', last: 'Smith' }};

{ // Com lodash:
  const firstName = _.get(object, 'names.first');
  // → 'Alice'

  const middleName = _.get(object, 'names.middle', '(sem nome do meio)');
  // → '(sem nome do meio)'
}

{ // Com encadeamento opcional e fusão nula:
  const firstName = object?.names?.first ?? '(sem primeiro nome)';
  // → 'Alice'

  const middleName = object?.names?.middle ?? '(sem nome do meio)';
  // → '(sem nome do meio)'
}
```

## Propriedades do operador de encadeamento opcional

O operador de encadeamento opcional tem algumas propriedades interessantes: _curto-circuito_, _empilhamento_ e _remoção opcional_. Vamos passar por cada uma delas com um exemplo.

_Curto-circuito_ significa não avaliar o restante da expressão se um operador de encadeamento opcional retornar cedo:

```js
// `age` é incrementado apenas se `db` e `user` estiverem definidos.
db?.user?.grow(++age);
```

_Encadeamento_ significa que mais de um operador de encadeamento opcional pode ser aplicado em uma sequência de acessos de propriedades:

```js
// Um encadeamento opcional pode ser seguido por outro encadeamento opcional.
const firstNameLength = db.users?.[42]?.names.first.length;
```

Ainda assim, seja cuidadoso ao usar mais de um operador de encadeamento opcional em um único encadeamento. Se um valor é garantido que não será nulo ou indefinido, então usar `?.` para acessar propriedades nele é desencorajado. No exemplo acima, `db` é considerado sempre definido, mas `db.users` e `db.users[42]` podem não estar. Se houver tal usuário no banco de dados, então `names.first.length` é assumido como sempre definido.

_Deleção opcional_ significa que o operador `delete` pode ser combinado com um encadeamento opcional:

```js
// `db.user` é deletado apenas se `db` estiver definido.
delete db?.user;
```

Mais detalhes podem ser encontrados na [seção _Semântica_ da proposta](https://github.com/tc39/proposal-optional-chaining#semantics).

## Suporte para encadeamento opcional

<feature-support chrome="80 https://bugs.chromium.org/p/v8/issues/detail?id=9553"
                 firefox="74 https://bugzilla.mozilla.org/show_bug.cgi?id=1566143"
                 safari="13.1 https://bugs.webkit.org/show_bug.cgi?id=200199"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-optional-chaining"></feature-support>
