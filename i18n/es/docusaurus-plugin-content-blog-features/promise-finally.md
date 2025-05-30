---
title: "`Promise.prototype.finally`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2017-10-23
tags: 
  - ECMAScript
  - ES2018
description: "Promise.prototype.finally permite registrar un callback que será invocado cuando una promesa sea resuelta (es decir, cumplida o rechazada)."
tweet: "922459978857824261"
---
`Promise.prototype.finally` permite registrar un callback que será invocado cuando una promesa esté _resuelta_ (es decir, cumplida o rechazada).

Imagina que quieres obtener algunos datos para mostrar en la página. Ah, y quieres mostrar un spinner de carga cuando la solicitud comienza, y ocultarlo cuando la solicitud se complete. Cuando algo salga mal, muestras un mensaje de error en su lugar.

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

Si la solicitud tiene éxito, mostramos los datos. Si algo sale mal, mostramos un mensaje de error en su lugar.

En cualquier caso, necesitamos llamar a `hideLoadingSpinner()`. Hasta ahora, no teníamos otra opción más que duplicar esta llamada tanto en el bloque `then()` como en el bloque `catch()`. Con `Promise.prototype.finally`, podemos hacerlo mejor:

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

Esto no solo reduce la duplicación de código, sino que también separa más claramente la fase de manejo de éxito/error de la fase de limpieza. ¡Genial!

Actualmente, lo mismo es posible con `async`/`await`, y sin `Promise.prototype.finally`:

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

Dado que [`async` y `await` son estrictamente mejores](https://mathiasbynens.be/notes/async-stack-traces), nuestra recomendación sigue siendo usarlos en lugar de promesas simples. Dicho esto, si prefieres promesas simples por alguna razón, `Promise.prototype.finally` puede ayudarte a hacer tu código más simple y limpio.

## Soporte para `Promise.prototype.finally`

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="11.1"
                 nodejs="10"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>
