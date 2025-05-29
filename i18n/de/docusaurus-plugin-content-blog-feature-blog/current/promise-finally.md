---
title: "`Promise.prototype.finally`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2017-10-23
tags:
  - ECMAScript
  - ES2018
description: "Promise.prototype.finally ermöglicht das Registrieren eines Rückrufs, der ausgeführt wird, wenn ein Versprechen abgeschlossen ist (d.h. entweder erfüllt oder abgelehnt)."
tweet: "922459978857824261"
---
`Promise.prototype.finally` ermöglicht das Registrieren eines Rückrufs, der ausgeführt wird, wenn ein Versprechen _abgeschlossen_ ist (d.h. entweder erfüllt oder abgelehnt).

Stellen Sie sich vor, Sie möchten einige Daten abrufen, um sie auf der Seite anzuzeigen. Oh, und Sie möchten einen Ladekreisel anzeigen, wenn die Anfrage startet, und ihn ausblenden, wenn die Anfrage abgeschlossen ist. Wenn etwas schiefgeht, zeigen Sie stattdessen eine Fehlermeldung an.

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

Wenn die Anfrage erfolgreich ist, zeigen wir die Daten an. Wenn etwas schiefgeht, zeigen wir stattdessen eine Fehlermeldung an.

In beiden Fällen müssen wir `hideLoadingSpinner()` aufrufen. Bis jetzt hatten wir keine andere Wahl, als diesen Aufruf sowohl im `then()`- als auch im `catch()`-Block zu duplizieren. Mit `Promise.prototype.finally` können wir es besser machen:

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

Dies reduziert nicht nur die Code-Duplizierung, sondern trennt auch die Erfolgs-/Fehlerphase klarer von der Aufräumphase. Ordentlich!

Derzeit ist dasselbe auch mit `async`/`await`, und ohne `Promise.prototype.finally`, möglich:

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

Da [`async` und `await` strikt besser sind](https://mathiasbynens.be/notes/async-stack-traces), empfehlen wir weiterhin, sie anstelle von normalen Versprechen zu verwenden. Wenn Sie jedoch aus irgendeinem Grund normale Versprechen bevorzugen, kann `Promise.prototype.finally` dazu beitragen, Ihren Code einfacher und sauberer zu machen.

## Unterstützung für `Promise.prototype.finally`

<feature-support chrome="63 /blog/v8-release-63"
                 firefox="58"
                 safari="11.1"
                 nodejs="10"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>
