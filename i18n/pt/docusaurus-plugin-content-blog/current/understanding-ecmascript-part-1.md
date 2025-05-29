---
title: &apos;Entendendo a especificação ECMAScript, parte 1&apos;
author: &apos;[Marja Hölttä](https://twitter.com/marjakh), espectador especulativo da especificação&apos;
avatars:
  - marja-holtta
date: 2020-02-03 13:33:37
tags:
  - ECMAScript
  - Entendendo ECMAScript
description: &apos;Tutorial sobre como ler a especificação ECMAScript&apos;
tweet: &apos;1224363301146189824&apos;
---

[Todos os episódios](/blog/tags/understanding-ecmascript)

Neste artigo, analisamos uma função simples na especificação e tentamos entender a notação. Vamos lá!

## Prefácio

Mesmo que você saiba JavaScript, ler sua especificação de linguagem, [Especificação da Linguagem ECMAScript, ou apenas a especificação ECMAScript](https://tc39.es/ecma262/), pode ser bastante assustador. Pelo menos foi assim que me senti quando comecei a lê-la pela primeira vez.

<!--truncate-->
Vamos começar com um exemplo concreto e percorrer a especificação para entendê-lo. O código a seguir demonstra o uso de `Object.prototype.hasOwnProperty`:

```js
const o = { foo: 1 };
o.hasOwnProperty(&apos;foo&apos;); // true
o.hasOwnProperty(&apos;bar&apos;); // false
```

No exemplo, `o` não possui uma propriedade chamada `hasOwnProperty`, então subimos na cadeia de protótipos para procurá-la. Nós a encontramos no protótipo de `o`, que é `Object.prototype`.

Para descrever como `Object.prototype.hasOwnProperty` funciona, a especificação usa descrições semelhantes a pseudocódigos:

:::ecmascript-algorithm
> **[`Object.prototype.hasOwnProperty(V)`](https://tc39.es/ecma262#sec-object.prototype.hasownproperty)**
>
> Quando o método `hasOwnProperty` é chamado com o argumento `V`, os seguintes passos são realizados:
>
> 1. Deixe `P` ser `? ToPropertyKey(V)`.
> 2. Deixe `O` ser `? ToObject(this value)`.
> 3. Retorne `? HasOwnProperty(O, P)`.
:::

…e…

:::ecmascript-algorithm
> **[`HasOwnProperty(O, P)`](https://tc39.es/ecma262#sec-hasownproperty)**
>
> A operação abstrata `HasOwnProperty` é usada para determinar se um objeto possui uma propriedade própria com a chave de propriedade especificada. Um valor booleano é retornado. A operação é chamada com os argumentos `O` e `P`, onde `O` é o objeto e `P` é a chave de propriedade. Essa operação abstrata realiza os seguintes passos:
>
> 1. Afirme: `Type(O)` é `Object`.
> 2. Afirme: `IsPropertyKey(P)` é `true`.
> 3. Deixe `desc` ser `? O.[[GetOwnProperty]](P)`.
> 4. Se `desc` for `undefined`, retorne `false`.
> 5. Retorne `true`.
:::

Mas o que é uma “operação abstrata”? O que são as coisas dentro de `[[ ]]`? Por que há um `?` antes de uma função? O que as afirmações significam?

Vamos descobrir!

## Tipos de linguagem e tipos de especificação

Vamos começar com algo que parece familiar. A especificação usa valores como `undefined`, `true` e `false`, que já conhecemos do JavaScript. Todos eles são [**valores de linguagem**](https://tc39.es/ecma262/#sec-ecmascript-language-types), valores de **tipos de linguagem** que a especificação também define.

A especificação também usa valores de linguagem internamente, por exemplo, um tipo de dado interno pode conter um campo cujos valores possíveis são `true` e `false`. Em contraste, os motores JavaScript geralmente não usam valores de linguagem internamente. Por exemplo, se o motor JavaScript for escrito em C++, ele tipicamente usará o `true` e `false` do C++ (e não suas representações internas do `true` e `false` do JavaScript).

Além dos tipos de linguagem, a especificação também usa [**tipos de especificação**](https://tc39.es/ecma262/#sec-ecmascript-specification-types), que são tipos que ocorrem apenas na especificação, mas não na linguagem JavaScript. O motor JavaScript não precisa (mas é livre para) implementá-los. Neste post do blog, conheceremos o tipo de especificação Record (e seu subtipo Completion Record).

## Operações abstratas

[**Operações abstratas**](https://tc39.es/ecma262/#sec-abstract-operations) são funções definidas na especificação ECMAScript; elas são definidas para o propósito de escrever a especificação de maneira concisa. Um motor JavaScript não precisa implementá-las como funções separadas dentro do motor. Elas não podem ser chamadas diretamente a partir do JavaScript.

## Slots internos e métodos internos

[**Slots internos** e **métodos internos**](https://tc39.es/ecma262/#sec-object-internal-methods-and-internal-slots) usam nomes entre `[[ ]]`.

Slots internos são membros de dados de um objeto JavaScript ou de um tipo de especificação. Eles são usados para armazenar o estado do objeto. Métodos internos são funções membros de um objeto JavaScript.

Por exemplo, todo objeto JavaScript possui um slot interno `[[Prototype]]` e um método interno `[[GetOwnProperty]]`.

Slots internos e métodos não são acessíveis a partir do JavaScript. Por exemplo, você não pode acessar `o.[[Prototype]]` ou chamar `o.[[GetOwnProperty]]()`. Um motor JavaScript pode implementá-los para seu próprio uso interno, mas não é obrigatório.

Às vezes, métodos internos delegam para operações abstratas de nomes semelhantes, como no caso de objetos ordinários' `[[GetOwnProperty]]:`

:::ecmascript-algorithm
> **[`[[GetOwnProperty]](P)`](https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots-getownproperty-p)**
>
> Quando o método interno `[[GetOwnProperty]]` de `O` é chamado com a chave de propriedade `P`, os seguintes passos são realizados:
>
> 1. Retorne `! OrdinaryGetOwnProperty(O, P)`.
:::

(Vamos descobrir o que o ponto de exclamação significa no próximo capítulo.)

`OrdinaryGetOwnProperty` não é um método interno, já que não está associado a nenhum objeto; em vez disso, o objeto no qual opera é passado como um parâmetro.

`OrdinaryGetOwnProperty` é chamado de “ordinário” porque opera em objetos ordinários. Objetos ECMAScript podem ser **ordinários** ou **exóticos**. Objetos ordinários devem ter o comportamento padrão para um conjunto de métodos chamados **métodos internos essenciais**. Se um objeto se desviar do comportamento padrão, ele é exótico.

O objeto exótico mais conhecido é o `Array`, uma vez que sua propriedade length se comporta de uma maneira não padrão: configurar a propriedade `length` pode remover elementos do `Array`.

Métodos internos essenciais são os métodos listados [aqui](https://tc39.es/ecma262/#table-5).

## Registros de Conclusão

E quanto aos pontos de interrogação e de exclamação? Para entendê-los, precisamos analisar [**Registros de Conclusão**](https://tc39.es/ecma262/#sec-completion-record-specification-type)!

O Registro de Conclusão é um tipo de especificação (definido apenas para propósitos de especificação). Um mecanismo JavaScript não precisa ter um tipo de dado interno correspondente.

Um Registro de Conclusão é um “registro” — um tipo de dado que possui um conjunto fixo de campos nomeados. Um Registro de Conclusão possui três campos:

:::table-wrapper
| Nome         | Descrição                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `[[Type]]`   | Um dos seguintes: `normal`, `break`, `continue`, `return` ou `throw`. Todos os outros tipos, exceto `normal`, são **conclusões abruptas**.  |
| `[[Value]]`  | O valor produzido quando a conclusão ocorreu, por exemplo, o valor de retorno de uma função ou a exceção (se uma foi lançada).             |
| `[[Target]]` | Usado para transferências de controle direcionadas (não relevante para este post).                                                        |
:::

Toda operação abstrata implicitamente retorna um Registro de Conclusão. Mesmo que pareça que uma operação abstrata retornaria um tipo simples, como Booleano, ele é implicitamente envolvido em um Registro de Conclusão com o tipo `normal` (veja [Valores de Conclusão Implícitos](https://tc39.es/ecma262/#sec-implicit-completion-values)).

Nota 1: A especificação não é totalmente consistente nesse aspecto; há algumas funções auxiliares que retornam valores puros e cujos valores de retorno são usados como estão, sem extrair o valor do Registro de Conclusão. Isso geralmente é claro pelo contexto.

Nota 2: Os editores da especificação estão analisando maneiras de tornar o manuseio do Registro de Conclusão mais explícito.

Se um algoritmo lançar uma exceção, isso significa retornar um Registro de Conclusão com `[[Type]]` `throw` cujo `[[Value]]` é o objeto de exceção. Ignoraremos os tipos `break`, `continue` e `return` por enquanto.

[`ReturnIfAbrupt(argument)`](https://tc39.es/ecma262/#sec-returnifabrupt) significa realizar os seguintes passos:

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. Se `argument` for abrupto, retorne `argument`
> 2. Defina `argument` como `argument.[[Value]]`.
<!-- markdownlint-enable blanks-around-lists -->
:::

Ou seja, inspecionamos um Registro de Conclusão; se for uma conclusão abrupta, retornamos imediatamente. Caso contrário, extraímos o valor do Registro de Conclusão.

`ReturnIfAbrupt` pode parecer uma chamada de função, mas não é. Ele faz com que a função onde `ReturnIfAbrupt()` ocorre retorne, e não a própria função `ReturnIfAbrupt`. Comporta-se mais como uma macro em linguagens do tipo C.

`ReturnIfAbrupt` pode ser usado assim:

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. Deixe `obj` ser `Foo()`. (`obj` é um Registro de Conclusão.)
> 2. `ReturnIfAbrupt(obj)`.
> 3. `Bar(obj)`. (Se ainda estamos aqui, `obj` é o valor extraído do Registro de Conclusão.)
<!-- markdownlint-enable blanks-around-lists -->
:::

E agora [o ponto de interrogação](https://tc39.es/ecma262/#sec-returnifabrupt-shorthands) entra em cena: `? Foo()` é equivalente a `ReturnIfAbrupt(Foo())`. Usar uma abreviação é prático: não precisamos escrever o código de tratamento de erros explicitamente a cada vez.

Da mesma forma, `Deixe val ser ! Foo()` é equivalente a:

:::ecmascript-algorithm
<!-- markdownlint-disable blanks-around-lists -->
> 1. Deixe `val` ser `Foo()`.
> 2. Afirme: `val` não é uma conclusão abrupta.
> 3. Defina `val` como `val.[[Value]]`.
<!-- markdownlint-enable blanks-around-lists -->
:::

Com esse conhecimento, podemos reescrever `Object.prototype.hasOwnProperty` assim:

:::ecmascript-algoritmo
> **`Object.prototype.hasOwnProperty(V)`**
>
> 1. Deixe `P` ser `ToPropertyKey(V)`.
> 2. Se `P` for uma interrupção abrupta, retorne `P`
> 3. Configure `P` para `P.[[Value]]`
> 4. Deixe `O` ser `ToObject(this value)`.
> 5. Se `O` for uma interrupção abrupta, retorne `O`
> 6. Configure `O` para `O.[[Value]]`
> 7. Deixe `temp` ser `HasOwnProperty(O, P)`.
> 8. Se `temp` for uma interrupção abrupta, retorne `temp`
> 9. Configure `temp` para `temp.[[Value]]`
> 10. Retorne `NormalCompletion(temp)`
:::

…e podemos reescrever `HasOwnProperty` assim:

:::ecmascript-algoritmo
> **`HasOwnProperty(O, P)`**
>
> 1. Afirme: `Type(O)` é `Object`.
> 2. Afirme: `IsPropertyKey(P)` é `true`.
> 3. Deixe `desc` ser `O.[[GetOwnProperty]](P)`.
> 4. Se `desc` for uma interrupção abrupta, retorne `desc`
> 5. Configure `desc` para `desc.[[Value]]`
> 6. Se `desc` for `undefined`, retorne `NormalCompletion(false)`.
> 7. Retorne `NormalCompletion(true)`.
:::

Também podemos reescrever o método interno `[[GetOwnProperty]]` sem o ponto de exclamação:

:::ecmascript-algoritmo
<!-- markdownlint-disable blanks-around-lists -->
> **`O.[[GetOwnProperty]]`**
>
> 1. Deixe `temp` ser `OrdinaryGetOwnProperty(O, P)`.
> 2. Afirme: `temp` não é uma interrupção abrupta.
> 3. Configure `temp` para `temp.[[Value]]`.
> 4. Retorne `NormalCompletion(temp)`.
<!-- markdownlint-enable blanks-around-lists -->
:::

Aqui assumimos que `temp` é uma nova variável temporária que não colide com mais nada.

Também usamos o conhecimento de que, quando uma declaração de retorno retorna algo diferente de um Registro de Conclusão, ele é implicitamente envolto em um `NormalCompletion`.

### Desvio lateral: `Return ? Foo()`

A especificação usa a notação `Return ? Foo()` — por que o ponto de interrogação?

`Return ? Foo()` expande-se para:

:::ecmascript-algoritmo
<!-- markdownlint-disable blanks-around-lists -->
> 1. Deixe `temp` ser `Foo()`.
> 2. Se `temp` for uma interrupção abrupta, retorne `temp`.
> 3. Configure `temp` para `temp.[[Value]]`.
> 4. Retorne `NormalCompletion(temp)`.
<!-- markdownlint-enable blanks-around-lists -->
:::

O que é o mesmo que `Return Foo()`; ele se comporta da mesma maneira para conclusões abruptas e normais.

`Return ? Foo()` é usado apenas por razões editoriais, para deixar mais explícito que `Foo` retorna um Registro de Conclusão.

## Afirmações

As afirmações na especificação garantem condições invariáveis dos algoritmos. Elas são adicionadas para clareza, mas não adicionam nenhum requisito à implementação — a implementação não precisa verificá-las.

## Avançando

As operações abstratas delegam a outras operações abstratas (veja a imagem abaixo), mas com base neste post do blog devemos ser capazes de descobrir o que elas fazem. Encontraremos Property Descriptors, que é apenas outro tipo de especificação.

![Gráfico de chamada de função começando de `Object.prototype.hasOwnProperty`](/_img/understanding-ecmascript-part-1/call-graph.svg)

## Resumo

Lemos um método simples — `Object.prototype.hasOwnProperty` — e **operações abstratas** que ele invoca. Familiarizamo-nos com os atalhos `?` e `!` relacionados ao tratamento de erros. Encontramos **tipos de linguagem**, **tipos de especificação**, **slots internos** e **métodos internos**.

## Links úteis

[Como Ler a Especificação ECMAScript](https://timothygu.me/es-howto/): um tutorial que cobre grande parte do material abordado neste post, de um ângulo ligeiramente diferente.
