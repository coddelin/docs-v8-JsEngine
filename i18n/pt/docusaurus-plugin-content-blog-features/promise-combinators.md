---
title: "Combinadores de Promise"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-06-12
tags: 
  - ECMAScript
  - ES2020
  - ES2021
  - io19
  - Node.js 16
description: "Existem quatro combinadores de Promise em JavaScript: Promise.all, Promise.race, Promise.allSettled, e Promise.any."
tweet: "1138819493956710400"
---
Desde a introdução de promises no ES2015, o JavaScript suporta exatamente dois combinadores de promise: os métodos estáticos `Promise.all` e `Promise.race`.

Duas novas propostas estão atualmente passando pelo processo de padronização: `Promise.allSettled` e `Promise.any`. Com essas adições, haverá um total de quatro combinadores de promise no JavaScript, cada um possibilitando diferentes casos de uso.

<!--truncate-->
Aqui está uma visão geral dos quatro combinadores:


| nome                                       | descrição                                      | status                                                           |
| ------------------------------------------ | --------------------------------------------- | ---------------------------------------------------------------- |
| [`Promise.allSettled`](#promise.allsettled) | não interrompe no primeiro erro               | [adicionado no ES2020 ✅](https://github.com/tc39/proposal-promise-allSettled) |
| [`Promise.all`](#promise.all)              | interrompe quando um valor de entrada é rejeitado | adicionado no ES2015 ✅                                           |
| [`Promise.race`](#promise.race)            | interrompe quando um valor de entrada é resolvido | adicionado no ES2015 ✅                                           |
| [`Promise.any`](#promise.any)              | interrompe quando um valor de entrada é realizado | [adicionado no ES2021 ✅](https://github.com/tc39/proposal-promise-any)       |


Vamos dar uma olhada em um exemplo de caso de uso para cada combinador.

## `Promise.all`

<feature-support chrome="32"
                 firefox="29"
                 safari="8"
                 nodejs="0.12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.all` permite que você saiba quando todas as promises de entrada foram realizadas ou quando uma delas foi rejeitada.

Imagine que o usuário clica em um botão e você deseja carregar algumas folhas de estilo para poder renderizar uma nova interface do usuário. Este programa inicia uma solicitação HTTP para cada folha de estilo em paralelo:

```js
const promises = [
  fetch('/component-a.css'),
  fetch('/component-b.css'),
  fetch('/component-c.css'),
];
try {
  const styleResponses = await Promise.all(promises);
  enableStyles(styleResponses);
  renderNewUi();
} catch (reason) {
  displayError(reason);
}
```

Você só deseja começar a renderizar a nova interface do usuário quando _todas_ as solicitações forem bem-sucedidas. Se algo der errado, você deseja exibir uma mensagem de erro o mais rápido possível, sem esperar que qualquer outro trabalho termine.

Neste caso, você pode usar `Promise.all`: você quer saber quando todas as promises forem realizadas, _ou_ assim que uma delas for rejeitada.

## `Promise.race`

<feature-support chrome="32"
                 firefox="29"
                 safari="8"
                 nodejs="0.12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.race` é útil se você deseja executar várias promises, e ou…

1. fazer algo com o primeiro resultado bem-sucedido que chegar (no caso de uma das promises ser realizada), _ou_
1. fazer algo assim que uma das promises for rejeitada.

Ou seja, se uma das promises for rejeitada, você deseja preservar essa rejeição para tratar o caso de erro separadamente. O exemplo a seguir faz exatamente isso:

```js
try {
  const result = await Promise.race([
    performHeavyComputation(),
    rejectAfterTimeout(2000),
  ]);
  renderResult(result);
} catch (error) {
  renderError(error);
}
```

Nós iniciamos uma tarefa computacionalmente cara que pode levar muito tempo, mas competimos com outra promise que é rejeitada após 2 segundos. Dependendo da primeira promise a ser realizada ou rejeitada, renderizamos o resultado calculado ou a mensagem de erro, em dois caminhos de código separados.

## `Promise.allSettled`

<feature-support chrome="76"
                 firefox="71 https://bugzilla.mozilla.org/show_bug.cgi?id=1549176"
                 safari="13"
                 nodejs="12.9.0 https://nodejs.org/en/blog/release/v12.9.0/"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.allSettled` fornece um sinal quando todas as promises de entrada estão _resolvidas_, o que significa que elas foram _realizadas_ ou _rejeitadas_. Isso é útil em casos onde você não se importa com o estado da promise, você só quer saber quando o trabalho foi concluído, independentemente de ser bem-sucedido.

Por exemplo, você pode iniciar uma série de chamadas de API independentes e usar `Promise.allSettled` para garantir que todas sejam concluídas antes de fazer outra coisa, como remover um indicador de carregamento:

```js
const promises = [
  fetch('/api-call-1'),
  fetch('/api-call-2'),
  fetch('/api-call-3'),
];
// Imagine que algumas dessas requisições falhem e outras sejam bem-sucedidas.

await Promise.allSettled(promises);
// Todas as chamadas de API foram finalizadas (seja com falhas ou sucesso).
removeLoadingIndicator();
```

## `Promise.any`

<feature-support chrome="85 https://bugs.chromium.org/p/v8/issues/detail?id=9808"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1568903"
                 safari="14 https://bugs.webkit.org/show_bug.cgi?id=202566"
                 nodejs="16"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.any` fornece um sinal assim que uma das promessas é cumprida. Isso é semelhante a `Promise.race`, mas `any` não rejeita antecipadamente quando uma das promessas é rejeitada.

```js
const promises = [
  fetch('/endpoint-a').then(() => 'a'),
  fetch('/endpoint-b').then(() => 'b'),
  fetch('/endpoint-c').then(() => 'c'),
];
try {
  const first = await Promise.any(promises);
  // Qualquer uma das promessas foi cumprida.
  console.log(first);
  // → por exemplo 'b'
} catch (error) {
  // Todas as promessas foram rejeitadas.
  console.assert(error instanceof AggregateError);
  // Registre os valores das rejeições:
  console.log(error.errors);
  // → [
  //     <TypeError: Falha ao buscar /endpoint-a>,
  //     <TypeError: Falha ao buscar /endpoint-b>,
  //     <TypeError: Falha ao buscar /endpoint-c>
  //   ]
}
```

Este exemplo de código verifica qual endpoint responde mais rapidamente e, em seguida, o registra. Somente se _todas_ as requisições falharem acabamos no bloco `catch`, onde podemos então lidar com os erros.

`Promise.any` pode representar múltiplos erros ao mesmo tempo. Para suportar isso no nível da linguagem, um novo tipo de erro chamado `AggregateError` foi introduzido. Além do uso básico no exemplo acima, objetos `AggregateError` também podem ser programaticamente construídos, assim como outros tipos de erros:

```js
const aggregateError = new AggregateError([errorA, errorB, errorC], 'Algo deu errado!');
```
