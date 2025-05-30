---
title: "Atribuição lógica"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu))"
avatars: 
  - "shu-yu-guo"
date: 2020-05-07
tags: 
  - ECMAScript
  - ES2021
  - Node.js 16
description: "JavaScript agora suporta atribuições compostas com operações lógicas."
tweet: "1258387483823345665"
---
O JavaScript suporta uma gama de [operadores de atribuição compostos](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Assignment_Operators) que permitem aos programadores expressar de forma sucinta uma operação binária em conjunto com a atribuição. Atualmente, apenas operações matemáticas ou bit a bit são suportadas.

<!--truncate-->
O que faltava era a capacidade de combinar operações lógicas com atribuição. Até agora! O JavaScript agora suporta atribuições lógicas com os novos operadores `&&=`, `||=`, e `??=`.

## Operadores de atribuição lógica

Antes de mergulharmos nos novos operadores, vamos revisar os operadores de atribuição compostos já existentes. Por exemplo, o significado de `lhs += rhs` é aproximadamente equivalente a `lhs = lhs + rhs`. Essa equivalência aproximada se aplica a todos os operadores existentes `@=` onde `@` representa um operador binário como `+` ou `|`. Vale notar que isso é, estritamente falando, correto apenas quando `lhs` é uma variável. Para expressões mais complexas no lado esquerdo, como `obj[computedPropertyName()] += rhs`, o lado esquerdo é avaliado apenas uma vez.

Agora vamos explorar os novos operadores. Em contraste com os operadores existentes, `lhs @= rhs` não significa aproximadamente `lhs = lhs @ rhs` quando `@` é uma operação lógica: `&&`, `||`, ou `??`.

```js
// Como revisão adicional, aqui está a semântica do operador lógico AND:
x && y
// → y quando x é verdadeiro
// → x quando x não é verdadeiro

// Primeiro, atribuição lógica AND. As duas linhas a seguir
// deste bloco de comentários são equivalentes.
// Note que, assim como os operadores de atribuição compostos existentes,
// lados esquerdos mais complexos são avaliados apenas uma vez.
x &&= y;
x && (x = y);

// A semântica do operador lógico OR:
x || y
// → x quando x é verdadeiro
// → y quando x não é verdadeiro

// Da mesma forma, atribuição lógica OR:
x ||= y;
x || (x = y);

// A semântica do operador de coalescência nula:
x ?? y
// → y quando x é nulo ou indefinido
// → x quando x não é nulo ou indefinido

// Finalmente, atribuição de coalescência nula:
x ??= y;
x ?? (x = y);
```

## Semântica de curto-circuito

Diferentemente das suas contrapartes matemáticas e bit a bit, as atribuições lógicas seguem o comportamento de curto-circuito das suas respectivas operações lógicas. Elas _apenas_ realizam uma atribuição se a operação lógica avaliaria o lado direito.

A princípio isso pode parecer confuso. Por que não atribuir incondicionalmente ao lado esquerdo como nos outros operadores de atribuição compostos?

Há uma razão prática para a diferença. Quando combinamos operações lógicas com atribuição, a atribuição pode causar um efeito colateral que deve ocorrer condicionalmente baseado no resultado dessa operação lógica. Causar o efeito colateral de forma incondicional pode impactar negativamente o desempenho ou até mesmo a corretude do programa.

Vamos tornar isso concreto com um exemplo de duas versões de uma função que define uma mensagem padrão em um elemento.

```js
// Exibe uma mensagem padrão se nada for sobrescrito.
// Apenas atribui ao innerHTML se estiver vazio. Não causa
// perda de foco nos elementos internos de msgElement.
function setDefaultMessage() {
  msgElement.innerHTML ||= '<p>Sem mensagens<p>';
}

// Exibe uma mensagem padrão se nada for sobrescrito.
// Com bug! Pode causar perda de foco nos elementos internos de
// msgElement toda vez que for chamada.
function setDefaultMessageBuggy() {
  msgElement.innerHTML = msgElement.innerHTML || '<p>Sem mensagens<p>';
}
```

:::note
**Nota:** Como a propriedade `innerHTML` é [especificada](https://w3c.github.io/DOM-Parsing/#dom-innerhtml-innerhtml) para retornar uma string vazia em vez de `null` ou `undefined`, `||=` deve ser usado em vez de `??=`. Ao escrever código, lembre-se de que muitas APIs da web não utilizam `null` ou `undefined` para indicar vazio ou ausência.
:::

No HTML, atribuir à propriedade `.innerHTML` de um elemento é destrutivo. Os filhos internos são deletados, e novos filhos analisados a partir da string recém-atribuída são inseridos. Mesmo quando a nova string é igual à antiga, isso causa tanto trabalho adicional quanto perda de foco nos elementos internos. Por essa razão prática de evitar efeitos colaterais indesejados, a semântica dos operadores de atribuição lógica realiza curto-circuito na atribuição.

Pode ajudar a pensar na simetria com outros operadores de atribuição compostos da seguinte forma. Operadores matemáticos e bit a bit são incondicionais, então a atribuição também é incondicional. Operadores lógicos são condicionais, então a atribuição também é condicional.

## Suporte para atribuições lógicas

<feature-support chrome="85"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1629106"
                 safari="14 https://developer.apple.com/documentation/safari-release-notes/safari-14-beta-release-notes#Novos-Recursos:~:text=Adicionado%20suporte%20para%20operadores%20de%20atribuição%20lógica."
                 nodejs="16"
                 babel="sim https://babeljs.io/docs/en/babel-plugin-proposal-logical-assignment-operators"></feature-support>
