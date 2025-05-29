---
title: "Entendendo a especificação ECMAScript, parte 2"
author: "[Marja Hölttä](https://twitter.com/marjakh), espectadora especulativa da especificação"
avatars: 
  - marja-holtta
date: 2020-03-02
tags: 
  - ECMAScript
  - Entendendo o ECMAScript
description: "Tutorial sobre como ler a especificação do ECMAScript, parte 2"
tweet: "1234550773629014016"
---

Vamos praticar nossas incríveis habilidades de leitura da especificação um pouco mais. Se você não olhou o episódio anterior, agora é um bom momento para fazê-lo!

[Todos os episódios](/blog/tags/understanding-ecmascript)

## Pronto para a parte 2?

Uma maneira divertida de conhecer a especificação é começar com um recurso JavaScript que sabemos que existe e descobrir como ele está especificado.

> Aviso! Este episódio contém algoritmos copiados da [especificação ECMAScript](https://tc39.es/ecma262/) de fevereiro de 2020. Eles eventualmente estarão desatualizados.

Sabemos que as propriedades são procuradas na cadeia de protótipos: se um objeto não possui a propriedade que estamos tentando ler, subimos na cadeia de protótipos até encontrá-la (ou encontrar um objeto que não tem mais um protótipo).

Por exemplo:

```js
const o1 = { foo: 99 };
const o2 = {};
Object.setPrototypeOf(o2, o1);
o2.foo;
// → 99
```

## Onde está definida a caminhada no protótipo?

Vamos tentar descobrir onde esse comportamento está definido. Um bom lugar para começar é uma lista de [Métodos Internos do Objeto](https://tc39.es/ecma262/#sec-object-internal-methods-and-internal-slots).

Existem `[[GetOwnProperty]]` e `[[Get]]` – estamos interessados na versão que não está restrita às propriedades _próprias_, então vamos com `[[Get]]`.

Infelizmente, o [tipo de especificação Descriptor de Propriedade](https://tc39.es/ecma262/#sec-property-descriptor-specification-type) também tem um campo chamado `[[Get]]`, então, ao navegar pela especificação de `[[Get]]`, precisamos distinguir cuidadosamente entre os dois usos independentes.

<!--truncate-->
`[[Get]]` é um **método interno essencial**. Objetos **ordinários** implementam o comportamento padrão para métodos internos essenciais. Objetos **exóticos** podem definir seu próprio método interno `[[Get]]` que desvia do comportamento padrão. Neste post, focamos em objetos ordinários.

A implementação padrão para `[[Get]]` delega para `OrdinaryGet`:

:::ecmascript-algorithm
> **[`[[Get]] ( P, Receiver )`](https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-get-p-receiver)**
>
> Quando o método interno `[[Get]]` de `O` é chamado com a chave da propriedade `P` e o valor em linguagem ECMAScript `Receiver`, as seguintes etapas são tomadas:
>
> 1. Retorne `? OrdinaryGet(O, P, Receiver)`.

Veremos em breve que `Receiver` é o valor usado como o **valor de this** ao chamar uma função getter de uma propriedade de acessor.

`OrdinaryGet` é definido assim:

:::ecmascript-algorithm
> **[`OrdinaryGet ( O, P, Receiver )`](https://tc39.es/ecma262/#sec-ordinaryget)**
>
> Quando a operação abstrata `OrdinaryGet` é chamada com o Objeto `O`, a chave da propriedade `P`, e o valor em linguagem ECMAScript `Receiver`, as seguintes etapas são tomadas:
>
> 1. Asserte: `IsPropertyKey(P)` é `true`.
> 1. Deixe `desc` ser `? O.[[GetOwnProperty]](P)`.
> 1. Se `desc` for `undefined`, então
>     1. Deixe `parent` ser `? O.[[GetPrototypeOf]]()`.
>     1. Se `parent` for `null`, retorne `undefined`.
>     1. Retorne `? parent.[[Get]](P, Receiver)`.
> 1. Se `IsDataDescriptor(desc)` for `true`, retorne `desc.[[Value]]`.
> 1. Asserte: `IsAccessorDescriptor(desc)` é `true`.
> 1. Deixe `getter` ser `desc.[[Get]]`.
> 1. Se `getter` for `undefined`, retorne `undefined`.
> 1. Retorne `? Call(getter, Receiver)`.

A caminhada na cadeia de protótipos está dentro da etapa 3: se não encontrarmos a propriedade como uma propriedade própria, chamamos o método `[[Get]]` do protótipo que delega para o `OrdinaryGet` novamente. Se ainda não encontrarmos a propriedade, chamamos o método `[[Get]]` do protótipo dela, que delega para o `OrdinaryGet` novamente, e assim por diante, até encontrarmos a propriedade ou alcançarmos um objeto sem protótipo.

Vamos ver como esse algoritmo funciona quando acessamos `o2.foo`. Primeiro invocamos `OrdinaryGet` com `O` sendo `o2` e `P` sendo `"foo"`. `O.[[GetOwnProperty]]("foo")` retorna `undefined`, já que `o2` não tem uma propriedade própria chamada `"foo"`, então seguimos o ramo de if na etapa 3. Na etapa 3.a, configuramos `parent` para o protótipo de `o2`, que é `o1`. `parent` não é `null`, então não retornamos na etapa 3.b. Na etapa 3.c, chamamos o método `[[Get]]` do protótipo com a chave da propriedade `"foo"`, e retornamos o que ele retorna.

O protótipo (`o1`) é um objeto ordinário, então seu método `[[Get]]` invoca `OrdinaryGet` novamente, desta vez com `O` sendo `o1` e `P` sendo `"foo"`. `o1` tem uma propriedade própria chamada `"foo"`, então na etapa 2, `O.[[GetOwnProperty]]("foo")` retorna o Descriptor de Propriedade associado e armazenamos isso em `desc`.

[Property Descriptor](https://tc39.es/ecma262/#sec-property-descriptor-specification-type) é um tipo de especificação. Os Descritores de Propriedades de Dados armazenam o valor da propriedade diretamente no campo `[[Value]]`. Os Descritores de Propriedades Acessoras armazenam as funções acessoras nos campos `[[Get]]` e/ou `[[Set]]`. Neste caso, o Descritor de Propriedade associado a `"foo"` é um Descritor de Propriedade de Dados.

O Descritor de Propriedade de Dados que armazenamos em `desc` no passo 2 não é `undefined`, então não seguimos o ramo `if` no passo 3. A seguir, executamos o passo 4. O Descritor de Propriedade é um Descritor de Propriedade de Dados, então retornamos o campo `[[Value]]`, `99`, no passo 4, e terminamos.

## O que é `Receiver` e de onde ele vem?

O parâmetro `Receiver` é usado apenas no caso de propriedades acessoras no passo 8. Ele é passado como o **valor de this** ao chamar a função getter de uma propriedade acessora.

`OrdinaryGet` passa o `Receiver` original por toda a recursão, sem alterações (passo 3.c). Vamos descobrir de onde o `Receiver` vem originalmente!

Pesquisando por lugares onde `[[Get]]` é chamado, encontramos uma operação abstrata chamada `GetValue`, que opera em Referências. Referência é um tipo de especificação, composto de um valor base, o nome referenciado, e um indicador de referência estrita. No caso de `o2.foo`, o valor base é o Objeto `o2`, o nome referenciado é a String `"foo"`, e o indicador de referência estrita é `false`, já que o código de exemplo é negligente.

### Paralelo: Por que Referência não é um Registro?

Paralelo: Referência não é um Registro, embora pareça que poderia ser. Ela contém três componentes, que poderiam muito bem ser expressos como três campos nomeados. Referência não é um Registro apenas por razões históricas.

### De volta ao `GetValue`

Vamos ver como o `GetValue` é definido:

:::ecmascript-algorithm
> **[`GetValue ( V )`](https://tc39.es/ecma262/#sec-getvalue)**
>
> 1. `ReturnIfAbrupt(V)`.
> 1. Se `Type(V)` não for `Reference`, retorne `V`.
> 1. Deixe `base` ser `GetBase(V)`.
> 1. Se `IsUnresolvableReference(V)` for `true`, lance uma exceção `ReferenceError`.
> 1. Se `IsPropertyReference(V)` for `true`, então
>     1. Se `HasPrimitiveBase(V)` for `true`, então
>         1. Asserte: Neste caso, `base` nunca será `undefined` ou `null`.
>         1. Defina `base` como `! ToObject(base)`.
>     1. Retorne `? base.[[Get]](GetReferencedName(V), GetThisValue(V))`.
> 1. Caso contrário,
>     1. Asserte: `base` é um Registro de Ambiente.
>     1. Retorne `? base.GetBindingValue(GetReferencedName(V), IsStrictReference(V))`.

A Referência no nosso exemplo é `o2.foo`, que é uma referência de propriedade. Então seguimos o ramo 5. Não seguimos o ramo em 5.a, já que o valor base (`o2`) não é [um valor primitivo](/blog/react-cliff#javascript-types) (um Número, String, Symbol, BigInt, Boolean, Undefined ou Null).

Então chamamos `[[Get]]` no passo 5.b. O `Receiver` que passamos é `GetThisValue(V)`. Neste caso, é apenas o valor base da Referência:

:::ecmascript-algorithm
> **[`GetThisValue( V )`](https://tc39.es/ecma262/#sec-getthisvalue)**
>
> 1. Asserte: `IsPropertyReference(V)` é `true`.
> 1. Se `IsSuperReference(V)` for `true`, então
>     1. Retorne o valor do componente `thisValue` da referência `V`.
> 1. Retorne `GetBase(V)`.

Para `o2.foo`, não seguimos o ramo no passo 2, já que não é uma Super Referência (como `super.foo`), mas seguimos o passo 3 e retornamos o valor base da Referência, que é `o2`.

Juntando tudo, descobrimos que configuramos o `Receiver` para ser a base da Referência original, e então o mantemos inalterado durante a caminhada na cadeia de protótipos. Finalmente, se a propriedade que encontramos for uma propriedade acessora, usamos o `Receiver` como o **valor de this** ao chamá-la.

Em particular, o **valor de this** dentro de um getter refere-se ao objeto original de onde tentamos obter a propriedade, e não ao objeto onde encontramos a propriedade durante a caminhada na cadeia de protótipos.

Vamos testar!

```js
const o1 = { x: 10, get foo() { return this.x; } };
const o2 = { x: 50 };
Object.setPrototypeOf(o2, o1);
o2.foo;
// → 50
```

Neste exemplo, temos uma propriedade acessora chamada `foo` e definimos um getter para ela. O getter retorna `this.x`.

Então acessamos `o2.foo` - o que o getter retorna?

Descobrimos que quando chamamos o getter, o **valor de this** é o objeto de onde tentamos originalmente obter a propriedade, e não o objeto onde a encontramos. Neste caso, o **valor de this** é `o2`, não `o1`. Podemos verificar isso checando se o getter retorna `o2.x` ou `o1.x`, e de fato, ele retorna `o2.x`.

Funcionou! Conseguimos prever o comportamento deste trecho de código com base no que lemos na especificação.

## Acessando propriedades — por que isso invoca `[[Get]]`?

Onde a especificação diz que o método interno do Objeto `[[Get]]` será invocado ao acessar uma propriedade como `o2.foo`? Certamente isso tem que ser definido em algum lugar. Não confie apenas na minha palavra!

Descobrimos que o método interno do Objeto `[[Get]]` é chamado a partir da operação abstrata `GetValue`, que opera em Referências. Mas de onde `GetValue` é chamado?

### Semântica em tempo de execução para `MemberExpression`

As regras gramaticais da especificação definem a sintaxe da linguagem. [Semântica de tempo de execução](https://tc39.es/ecma262/#sec-runtime-semantics) define o que os construtos sintáticos “significam” (como avaliá-los em tempo de execução).

Se você não está familiarizado com [gramáticas livres de contexto](https://en.wikipedia.org/wiki/Context-free_grammar), é uma boa ideia dar uma olhada agora!

Vamos analisar mais profundamente as regras gramaticais em um episódio posterior, vamos manter simples por agora! Em particular, podemos ignorar os subscritos (`Yield`, `Await` e assim por diante) nas produções para este episódio.

As seguintes produções descrevem como é um [`MemberExpression`](https://tc39.es/ecma262/#prod-MemberExpression):

```grammar
MemberExpression :
  PrimaryExpression
  MemberExpression [ Expression ]
  MemberExpression . IdentifierName
  MemberExpression TemplateLiteral
  SuperProperty
  MetaProperty
  new MemberExpression Arguments
```

Aqui temos 7 produções para `MemberExpression`. Um `MemberExpression` pode ser apenas um `PrimaryExpression`. Alternativamente, um `MemberExpression` pode ser construído a partir de outro `MemberExpression` e `Expression`, unindo-os: `MemberExpression [ Expression ]`, por exemplo, `o2['foo']`. Ou pode ser `MemberExpression . IdentifierName`, por exemplo, `o2.foo` — esta é a produção relevante para nosso exemplo.

Semânticas de tempo de execução para a produção `MemberExpression : MemberExpression . IdentifierName` definem o conjunto de passos a serem seguidos ao avaliá-lo:

:::ecmascript-algorithm
> **[Semântica de Tempo de Execução: Avaliação para `MemberExpression : MemberExpression . IdentifierName`](https://tc39.es/ecma262/#sec-property-accessors-runtime-semantics-evaluation)**
>
> 1. Defina `baseReference` como o resultado da avaliação de `MemberExpression`.
> 1. Defina `baseValue` como `? GetValue(baseReference)`.
> 1. Se o código correspondente a este `MemberExpression` estiver em modo estrito, defina `strict` como `true`; caso contrário, defina `strict` como `false`.
> 1. Retorne `? EvaluatePropertyAccessWithIdentifierKey(baseValue, IdentifierName, strict)`.

O algoritmo delega para a operação abstrata `EvaluatePropertyAccessWithIdentifierKey`, então precisamos lê-la também:

:::ecmascript-algorithm
> **[`EvaluatePropertyAccessWithIdentifierKey( baseValue, identifierName, strict )`](https://tc39.es/ecma262/#sec-evaluate-property-access-with-identifier-key)**
>
> A operação abstrata `EvaluatePropertyAccessWithIdentifierKey` recebe como argumentos um valor `baseValue`, um Nó de Análise Sintática `identifierName` e um argumento Booleano `strict`. Ela executa os seguintes passos:
>
> 1. Afirma: `identifierName` é um `IdentifierName`.
> 1. Defina `bv` como `? RequireObjectCoercible(baseValue)`.
> 1. Defina `propertyNameString` como `StringValue` de `identifierName`.
> 1. Retorne um valor do tipo Reference cujo componente base value seja `bv`, cujo nome referenciado seja `propertyNameString`, e cujo indicador de referência strict seja `strict`.

Ou seja: `EvaluatePropertyAccessWithIdentifierKey` constrói uma Referência que utiliza o `baseValue` providenciado como a base, o valor de string de `identifierName` como o nome da propriedade, e `strict` como o indicador de modo estrito.

Eventualmente, esta Referência é passada para `GetValue`. Isso é definido em vários lugares na especificação, dependendo de como a Referência acaba sendo utilizada.

### `MemberExpression` como um parâmetro

No nosso exemplo, utilizamos o acesso à propriedade como um parâmetro:

```js
console.log(o2.foo);
```

Neste caso, o comportamento é definido nas semânticas de tempo de execução da produção `ArgumentList`, que chama `GetValue` no argumento:

:::ecmascript-algorithm
> **[Semântica de Tempo de Execução: Avaliação de Lista de Argumentos](https://tc39.es/ecma262/#sec-argument-lists-runtime-semantics-argumentlistevaluation)**
>
> `ArgumentList : AssignmentExpression`
>
> 1. Defina `ref` como o resultado da avaliação de `AssignmentExpression`.
> 1. Defina `arg` como `? GetValue(ref)`.
> 1. Retorne uma Lista cujo único item seja `arg`.

`o2.foo` não parece um `AssignmentExpression`, mas é um, então esta produção é aplicável. Para descobrir o motivo, confira este [conteúdo extra](/blog/extras/understanding-ecmascript-part-2-extra), mas isso não é estritamente necessário neste ponto.

O `AssignmentExpression` na etapa 1 é `o2.foo`. `ref`, o resultado da avaliação de `o2.foo`, é a Referência mencionada anteriormente. Na etapa 2 chamamos `GetValue` sobre ela. Assim, sabemos que o método interno do Objeto `[[Get]]` será invocado, e a caminhada pela cadeia de protótipos ocorrerá.

## Resumo

Neste episódio, analisamos como a especificação define uma funcionalidade de linguagem, neste caso, a busca por protótipo, através de todas as diferentes camadas: os construtos sintáticos que ativam a funcionalidade e os algoritmos que a definem.
