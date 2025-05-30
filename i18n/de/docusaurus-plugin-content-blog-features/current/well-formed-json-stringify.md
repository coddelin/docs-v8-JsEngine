---
title: "Gut geformtes `JSON.stringify`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2018-09-11
tags: 
  - ECMAScript
  - ES2019
description: "JSON.stringify gibt jetzt Escape-Sequenzen für einsame Surrogate aus, wodurch seine Ausgabe gültiges Unicode wird (und in UTF-8 darstellbar ist)."
---
`JSON.stringify` wurde zuvor so spezifiziert, dass es schlecht geformte Unicode-Zeichenketten zurückgibt, wenn die Eingabe einsame Surrogate enthält:

```js
JSON.stringify('\uD800');
// → '"�"'
```

[Der Vorschlag „Gut geformtes `JSON.stringify`“](https://github.com/tc39/proposal-well-formed-stringify) ändert `JSON.stringify` so, dass es Escape-Sequenzen für einsame Surrogate ausgibt, wodurch seine Ausgabe gültiges Unicode wird (und in UTF-8 darstellbar ist):

<!--truncate-->
```js
JSON.stringify('\uD800');
// → '"\\ud800"'
```

Beachten Sie, dass `JSON.parse(stringified)` immer noch die gleichen Ergebnisse wie zuvor liefert.

Diese Funktion ist eine kleine, längst überfällige Korrektur in JavaScript. Sie ist eine Sorge weniger für JavaScript-Entwickler. In Kombination mit [_JSON ⊂ ECMAScript_](/features/subsume-json) ermöglicht sie das sichere Einbetten von JSON-serialisierten Daten als Literale in JavaScript-Programme, sowie das Schreiben des generierten Codes auf die Festplatte in einer beliebigen Unicode-kompatiblen Codierung (z. B. UTF-8). Dies ist äußerst nützlich für [Metaprogrammierungsanwendungen](/features/subsume-json#embedding-json).

## Unterstützung der Funktion

<feature-support chrome="72 /blog/v8-release-72#well-formed-json.stringify"
                 firefox="64"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="ja https://github.com/zloirock/core-js#ecmascript-json"></feature-support>
