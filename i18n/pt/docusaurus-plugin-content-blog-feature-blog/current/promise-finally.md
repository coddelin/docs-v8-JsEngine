---
title: 'Promise.prototype.finally'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2017-10-23
tags:
  - ECMAScript
  - ES2018
description: 'Promise.prototype.finally permite registrar um callback para ser chamado quando uma promessa for resolvida (ou seja, concluída com sucesso ou rejeitada).'
tweet: '922459978857824261'
---
`Promise.prototype.finally` permite registrar um callback para ser chamado quando uma promessa é _resolvida_ (ou seja, concluída com sucesso ou rejeitada).

Imagine que você deseja buscar alguns dados para mostrar na página. Ah, e você quer mostrar um indicador de carregamento quando a requisição começar e ocultá-lo quando a requisição for concluída. Quando algo der errado, você exibe uma mensagem de erro no lugar.

```js
const fetchAndDisplay = ({ url, element }) => {
  showLoadingSpinner();
  fetch(url)
    .then((response) => response.text())
    .then((text) => {
      element.textContent = text;
      hideLoadingSpinner();
    })
    .catch((error) => {
      element.textContent = error.message;
      hideLoadingSpinner();
    });
};

<!--truncate-->
fetchAndDisplay({
  url: someUrl,
  element: document.querySelector('#output')
});
```

Se a requisição for bem-sucedida, exibimos os dados. Se algo der errado, exibimos uma mensagem de erro no lugar.

De qualquer maneira, precisamos chamar `hideLoadingSpinner()`. Até agora, não temos outra opção senão duplicar esta chamada tanto no bloco `then()` quanto no bloco `catch()`. Com `Promise.prototype.finally`, podemos fazer melhor:

```js
const fetchAndDisplay = ({ url, element }) => {
  showLoadingSpinner();
  fetch(url)
    .then((response) => response.text())
    .then((text) => {
      element.textContent = text;
    })
    .catch((error) => {
      element.textContent = error.message;
    })
    .finally(() => {
      hideLoadingSpinner();
    });
};
```

Isso não apenas reduz a duplicação de código, como também separa mais claramente a fase de manipulação de sucesso/erro da fase de limpeza. Muito bom!

Atualmente, a mesma coisa é possível com `async`/`await`, e sem `Promise.prototype.finally`:

```js
const fetchAndDisplay = async ({ url, element }) => {
  showLoadingSpinner();
  try {
    const response = await fetch(url);
    const text = await response.text();
    element.textContent = text;
  } catch (error) {
    element.textContent = error.message;
  } finally {
    hideLoadingSpinner();
  }
};
```

Como [`async` e `await` são estritamente melhores](https://mathiasbynens.be/notes/async-stack-traces), nossa recomendação continua sendo usá-los em vez de promises padrão. Dito isso, se por algum motivo você prefere promises padrão, `Promise.prototype.finally` pode ajudar a tornar seu código mais simples e organizado.

## Suporte para `Promise.prototype.finally`

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="11.1"
                 nodejs="10"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>
