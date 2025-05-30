---
title: "`Promise.prototype.finally`"
author: "Матиас Байненс ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2017-10-23
tags: 
  - ECMAScript
  - ES2018
description: "Promise.prototype.finally позволяет зарегистрировать обратный вызов, который вызывается при завершении промиса (то есть при выполнении или отклонении)."
tweet: "922459978857824261"
---
`Promise.prototype.finally` позволяет зарегистрировать обратный вызов, который вызывается при _завершении_ промиса (то есть при выполнении или отклонении).

Представьте, что вы хотите получить данные, чтобы показать их на странице. Ах да, вы хотите показать индикатор загрузки, когда запрос начинается, и скрыть его, когда запрос завершается. Когда что-то идет не так, вы показываете сообщение об ошибке вместо этого.

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

Если запрос успешен, мы отображаем данные. Если что-то идет не так, мы показываем сообщение об ошибке вместо этого.

В любом случае нам нужно вызвать `hideLoadingSpinner()`. До сих пор у нас не было другого выбора, кроме как дублировать этот вызов как в блоке `then()`, так и в блоке `catch()`. С `Promise.prototype.finally` мы можем сделать лучше:

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

Это не только уменьшает дублирование кода, но и яснее разделяет этап обработки успеха/ошибки и этап очистки. Здорово!

В настоящее время то же самое возможно с использованием `async`/`await` и без `Promise.prototype.finally`:

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

Так как [`async` и `await` однозначно лучше](https://mathiasbynens.be/notes/async-stack-traces), наша рекомендация остается использовать их вместо обычных промисов. Тем не менее, если вы предпочитаете обычные промисы по какой-то причине, `Promise.prototype.finally` может помочь сделать ваш код проще и чище.

## Поддержка `Promise.prototype.finally`

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="11.1"
                 nodejs="10"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>
