---
title: "Causas de erros"
author: "Victor Gomes ([@VictorBFG](https://twitter.com/VictorBFG))"
avatars:
  - "victor-gomes"
date: 2021-07-07
tags:
  - ECMAScript
description: "JavaScript agora suporta causas de erros."
tweet: "1412774651558862850"
---

Imagine que você tem uma função que chama dois processos de trabalho separados `doSomeWork` e `doMoreWork`. Ambas as funções podem lançar o mesmo tipo de erros, mas você precisa tratá-los de maneiras diferentes.

Capturar o erro e lançá-lo novamente com informações contextuais adicionais é uma abordagem comum para esse problema, por exemplo:

```js
function doWork() {
  try {
    doSomeWork();
  } catch (err) {
    throw new CustomError('Falha em algum trabalho', err);
  }
  doMoreWork();
}

try {
  doWork();
} catch (err) {
  // O |err| vem de |doSomeWork| ou de |doMoreWork|?
}
```

Infelizmente, a solução acima é trabalhosa, já que é necessário criar seu próprio `CustomError`. E, pior ainda, nenhuma ferramenta de desenvolvimento é capaz de fornecer mensagens de diagnóstico úteis para exceções inesperadas, pois não há consenso sobre como representar adequadamente esses erros.

<!--truncate-->
O que tem faltado até agora é uma maneira padrão de encadear erros. O JavaScript agora suporta causas de erros. Um parâmetro de opções adicional pode ser adicionado ao construtor `Error` com uma propriedade `cause`, cujo valor será atribuído às instâncias de erro. Os erros podem, então, ser facilmente encadeados.

```js
function doWork() {
  try {
    doSomeWork();
  } catch (err) {
    throw new Error('Falha em algum trabalho', { cause: err });
  }
  try {
    doMoreWork();
  } catch (err) {
    throw new Error('Falha em mais trabalho', { cause: err });
  }
}

try {
  doWork();
} catch (err) {
  switch(err.message) {
    case 'Falha em algum trabalho':
      handleSomeWorkFailure(err.cause);
      break;
    case 'Falha em mais trabalho':
      handleMoreWorkFailure(err.cause);
      break;
  }
}
```

Esse recurso está disponível no V8 v9.3.

## Suporte para causas de erros

<feature-support chrome="93 https://chromium-review.googlesource.com/c/v8/v8/+/2784681"
                 firefox="91 https://bugzilla.mozilla.org/show_bug.cgi?id=1679653"
                 safari="15 https://bugs.webkit.org/show_bug.cgi?id=223302"
                 nodejs="no"
                 babel="no"></feature-support>
