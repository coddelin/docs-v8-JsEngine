---
title: "`Promise.prototype.finally`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2017-10-23
tags: 
  - ECMAScript
  - ES2018
description: "Promise.prototype.finally permet d'enregistrer un callback qui sera invoqué une fois qu'une promesse est réglée (c'est-à-dire résolue ou rejetée)."
tweet: "922459978857824261"
---
`Promise.prototype.finally` permet d'enregistrer un callback qui sera invoqué une fois qu'une promesse est _réglée_ (c'est-à-dire résolue ou rejetée).

Imaginez que vous voulez récupérer des données pour les afficher sur la page. Oh, et vous voulez montrer un indicateur de chargement lorsque la requête commence et le cacher lorsque la requête se termine. En cas de problème, vous affichez un message d'erreur à la place.

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

Si la requête réussit, nous affichons les données. En cas de problème, nous affichons un message d'erreur à la place.

Dans les deux cas, nous devons appeler `hideLoadingSpinner()`. Jusqu'à présent, nous n'avions pas d'autre choix que de dupliquer cet appel dans les blocs `then()` et `catch()`. Avec `Promise.prototype.finally`, nous pouvons faire mieux :

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

Non seulement cela réduit la duplication du code, mais cela sépare également plus explicitement la phase de traitement réussie/échouée et la phase de nettoyage. Sympa !

Actuellement, la même chose est possible avec `async`/`await`, et sans `Promise.prototype.finally` :

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

Étant donné que [`async` et `await` sont strictement meilleurs](https://mathiasbynens.be/notes/async-stack-traces), nous recommandons de continuer à les utiliser à la place des promesses classiques. Cela dit, si vous préférez les promesses classiques pour une raison quelconque, `Promise.prototype.finally` peut vous aider à rendre votre code plus simple et plus propre.

## Support de `Promise.prototype.finally`

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="11.1"
                 nodejs="10"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>
