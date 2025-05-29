---
title: "Promise-Kombinatoren"
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
description: "Es gibt vier Promise-Kombinatoren in JavaScript: Promise.all, Promise.race, Promise.allSettled und Promise.any."
tweet: "1138819493956710400"
---
Seit der Einführung von Promises in ES2015 unterstützt JavaScript genau zwei Promise-Kombinatoren: die statischen Methoden `Promise.all` und `Promise.race`.

Zwei neue Vorschläge befinden sich derzeit im Standardisierungsprozess: `Promise.allSettled` und `Promise.any`. Mit diesen Ergänzungen gibt es insgesamt vier Promise-Kombinatoren in JavaScript, die jeweils unterschiedliche Anwendungsfälle ermöglichen.

<!--truncate-->
Hier ist ein Überblick über die vier Kombinatoren:


| Name                                        | Beschreibung                                   | Status                                                          |
| ------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------- |
| [`Promise.allSettled`](#promise.allsettled) | bricht nicht ab                                | [hinzugefügt in ES2020 ✅](https://github.com/tc39/proposal-promise-allSettled) |
| [`Promise.all`](#promise.all)               | bricht ab, wenn ein Eingabewert abgelehnt wird | hinzugefügt in ES2015 ✅                                         |
| [`Promise.race`](#promise.race)             | bricht ab, wenn ein Eingabewert abgeschlossen ist | hinzugefügt in ES2015 ✅                                         |
| [`Promise.any`](#promise.any)               | bricht ab, wenn ein Eingabewert erfüllt wird      | [hinzugefügt in ES2021 ✅](https://github.com/tc39/proposal-promise-any)        |


Schauen wir uns ein Beispiel für jeden Kombinator an.

## `Promise.all`

<feature-support chrome="32"
                 firefox="29"
                 safari="8"
                 nodejs="0.12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.all` informiert Sie, wenn entweder alle Eingabepromises erfüllt wurden oder eines davon abgelehnt wird.

Stellen Sie sich vor, der Benutzer klickt auf eine Schaltfläche und Sie möchten einige Stylesheets laden, um eine komplett neue Benutzeroberfläche darzustellen. Dieses Programm startet für jedes Stylesheet eine HTTP-Anfrage parallel:

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

Sie möchten die neue Benutzeroberfläche nur dann rendern, wenn _alle_ Anfragen erfolgreich waren. Wenn etwas schiefgeht, möchten Sie stattdessen so schnell wie möglich eine Fehlermeldung anzeigen, ohne auf andere Prozesse zu warten.

In einem solchen Fall könnten Sie `Promise.all` verwenden: Sie möchten wissen, wann alle Promises erfüllt sind, _oder_ sobald eines von ihnen abgelehnt wird.

## `Promise.race`

<feature-support chrome="32"
                 firefox="29"
                 safari="8"
                 nodejs="0.12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.race` ist nützlich, wenn Sie mehrere Promises ausführen möchten und entweder…

1. etwas mit dem ersten erfolgreichen Ergebnis machen, das eingeht (falls eines der Promises erfüllt wird), _oder_
1. etwas tun, sobald eines der Promises abgelehnt wird.

Das heißt, wenn eines der Promises abgelehnt wird, möchten Sie diese Ablehnung beibehalten, um den Fehlerfall separat zu behandeln. Das folgende Beispiel macht genau das:

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

Wir starten eine rechnerisch aufwendige Aufgabe, die lange dauern könnte, aber wir lassen sie mit einem Promise konkurrieren, das nach 2 Sekunden abgelehnt wird. Abhängig von dem ersten Promise, das erfüllt oder abgelehnt wird, rendern wir entweder das berechnete Ergebnis oder die Fehlermeldung in zwei separaten Codepfaden.

## `Promise.allSettled`

<feature-support chrome="76"
                 firefox="71 https://bugzilla.mozilla.org/show_bug.cgi?id=1549176"
                 safari="13"
                 nodejs="12.9.0 https://nodejs.org/en/blog/release/v12.9.0/"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.allSettled` gibt Ihnen ein Signal, wenn alle Eingabepromises _abgewickelt_ sind, das heißt, sie sind entweder _erfüllt_ oder _abgelehnt_. Dies ist nützlich in Fällen, in denen es Ihnen nicht um den Zustand des Promises geht, sondern Sie einfach nur wissen möchten, wann die Arbeit erledigt ist, unabhängig davon, ob sie erfolgreich war.

Zum Beispiel können Sie eine Reihe unabhängiger API-Aufrufe starten und `Promise.allSettled` verwenden, um sicherzustellen, dass sie alle abgeschlossen sind, bevor Sie etwas anderes tun, wie z. B. das Entfernen eines Ladeindikators:

```js
const promises = [
  fetch('/api-call-1'),
  fetch('/api-call-2'),
  fetch('/api-call-3'),
];
// Stellen Sie sich vor, einige dieser Anfragen schlagen fehl, und einige sind erfolgreich.

await Promise.allSettled(promises);
// Alle API-Aufrufe wurden abgeschlossen (entweder fehlgeschlagen oder erfolgreich).
removeLoadingIndicator();
```

## `Promise.any`

<feature-support chrome="85 https://bugs.chromium.org/p/v8/issues/detail?id=9808"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1568903"
                 safari="14 https://bugs.webkit.org/show_bug.cgi?id=202566"
                 nodejs="16"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.any` gibt Ihnen ein Signal, sobald eines der Versprechen erfüllt ist. Dies ist ähnlich wie `Promise.race`, außer dass `any` nicht frühzeitig abbricht, wenn eines der Versprechen abgelehnt wird.

```js
const promises = [
  fetch('/endpoint-a').then(() => 'a'),
  fetch('/endpoint-b').then(() => 'b'),
  fetch('/endpoint-c').then(() => 'c'),
];
try {
  const first = await Promise.any(promises);
  // Eines der Versprechen wurde erfüllt.
  console.log(first);
  // → z. B. 'b'
} catch (error) {
  // Alle Versprechen wurden abgelehnt.
  console.assert(error instanceof AggregateError);
  // Protokollieren Sie die Ablehnungswerte:
  console.log(error.errors);
  // → [
  //     <TypeError: Failed to fetch /endpoint-a>,
  //     <TypeError: Failed to fetch /endpoint-b>,
  //     <TypeError: Failed to fetch /endpoint-c>
  //   ]
}
```

Dieses Codebeispiel überprüft, welcher Endpunkt am schnellsten antwortet, und protokolliert ihn dann. Nur wenn _alle_ Anfragen fehlschlagen, gelangen wir in den `catch`-Block, wo wir dann die Fehler behandeln können.

`Promise.any`-Ablehnungen können mehrere Fehler gleichzeitig darstellen. Um dies auf Sprachebene zu unterstützen, wurde ein neuer Fehlertyp namens `AggregateError` eingeführt. Zusätzlich zur grundlegenden Verwendung im obigen Beispiel können `AggregateError`-Objekte auch programmgesteuert erstellt werden, genau wie die anderen Fehlertypen:

```js
const aggregateError = new AggregateError([errorA, errorB, errorC], 'Es ist etwas schief gelaufen!');
```
