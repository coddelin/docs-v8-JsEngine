---
title: "Überarbeitetes `Function.prototype.toString`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2018-03-25
tags: 
  - ECMAScript
  - ES2019
description: "Function.prototype.toString gibt jetzt exakte Ausschnitte des Quelltextes zurück, einschließlich Leerzeichen und Kommentare."
---
[`Function.prototype.toString()`](https://tc39.es/Function-prototype-toString-revision/) gibt jetzt exakte Ausschnitte des Quelltextes zurück, einschließlich Leerzeichen und Kommentare. Hier ist ein Beispiel, das das alte und das neue Verhalten vergleicht:

<!--truncate-->
```js
// Beachten Sie den Kommentar zwischen dem Schlüsselwort `function`
// und dem Funktionsnamen sowie das Leerzeichen nach
// dem Funktionsnamen.
function /* ein Kommentar */ foo () {}

// Früher, in V8:
foo.toString();
// → 'function foo() {}'
//             ^ kein Kommentar
//                ^ kein Leerzeichen

// Jetzt:
foo.toString();
// → 'function /* Kommentar */ foo () {}'
```

## Feature-Unterstützung

<feature-support chrome="66 /blog/v8-release-66#function-tostring"
                 firefox="ja"
                 safari="nein"
                 nodejs="8"
                 babel="nein"></feature-support>
