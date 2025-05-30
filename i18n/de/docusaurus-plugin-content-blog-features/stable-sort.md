---
title: "Stabile `Array.prototype.sort`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-07-02
tags: 
  - ECMAScript
  - ES2019
  - io19
description: "Array.prototype.sort ist jetzt garantiert stabil."
tweet: "1146067251302244353"
---
Angenommen, Sie haben ein Array von Hunden, wobei jeder Hund einen Namen und eine Bewertung hat. (Falls dies wie ein seltsames Beispiel klingt, sollten Sie wissen, dass es ein Twitter-Konto gibt, das sich genau darauf spezialisiert hat… Fragen Sie nicht!)

```js
// Beachten Sie, dass das Array nach `name` alphabetisch vorsortiert ist.
const doggos = [
  { name: 'Abby',   rating: 12 },
  { name: 'Bandit', rating: 13 },
  { name: 'Choco',  rating: 14 },
  { name: 'Daisy',  rating: 12 },
  { name: 'Elmo',   rating: 12 },
  { name: 'Falco',  rating: 13 },
  { name: 'Ghost',  rating: 14 },
];
// Sortieren Sie die Hunde nach `rating` in absteigender Reihenfolge.
// (Dies aktualisiert `doggos` direkt.)
doggos.sort((a, b) => b.rating - a.rating);
```

<!--truncate-->
Das Array ist alphabetisch nach Namen vorsortiert. Um stattdessen nach Bewertung zu sortieren (sodass die Hunde mit der höchsten Bewertung zuerst kommen), verwenden wir `Array#sort` und geben eine benutzerdefinierte Rückruffunktion weiter, die die Bewertungen vergleicht. Dies ist das Ergebnis, das Sie wahrscheinlich erwarten würden:

```js
[
  { name: 'Choco',  rating: 14 },
  { name: 'Ghost',  rating: 14 },
  { name: 'Bandit', rating: 13 },
  { name: 'Falco',  rating: 13 },
  { name: 'Abby',   rating: 12 },
  { name: 'Daisy',  rating: 12 },
  { name: 'Elmo',   rating: 12 },
]
```

Die Hunde sind nach Bewertung sortiert, aber innerhalb jeder Bewertung sind sie weiterhin alphabetisch nach Namen sortiert. Zum Beispiel haben Choco und Ghost dieselbe Bewertung von 14, aber Choco erscheint im Sortierergebnis vor Ghost, da dies ebenfalls die Reihenfolge im ursprünglichen Array war.

Um dieses Ergebnis zu erhalten, kann die JavaScript-Engine jedoch nicht _irgendeinen_ Sortieralgorithmus verwenden – es muss ein sogenannter „stabiler Sortieralgorithmus“ sein. Lange Zeit verlangte die JavaScript-Spezifikation keine Stabilität für `Array#sort` und überließ es den Implementierungen. Da dieses Verhalten nicht spezifiziert war, hätten Sie auch dieses Sortierergebnis erhalten können, bei dem Ghost plötzlich vor Choco erscheint:

```js
[
  { name: 'Ghost',  rating: 14 }, // 😢
  { name: 'Choco',  rating: 14 }, // 😢
  { name: 'Bandit', rating: 13 },
  { name: 'Falco',  rating: 13 },
  { name: 'Abby',   rating: 12 },
  { name: 'Daisy',  rating: 12 },
  { name: 'Elmo',   rating: 12 },
]
```

Mit anderen Worten: JavaScript-Entwickler konnten sich nicht auf Sortierstabilität verlassen. Praktisch war die Situation noch frustrierender, da einige JavaScript-Engines einen stabilen Sortieralgorithmus für kurze Arrays und einen instabilen Sortieralgorithmus für größere Arrays verwendeten. Dies war wirklich verwirrend, da Entwickler ihren Code testeten, ein stabiles Ergebnis sahen, aber plötzlich ein instabiles Ergebnis in der Produktion erhielten, wenn das Array etwas größer war.

Aber es gibt gute Nachrichten. Wir haben [eine Änderung an der Spezifikation vorgeschlagen](https://github.com/tc39/ecma262/pull/1340), die `Array#sort` stabil macht, und sie wurde akzeptiert. Alle großen JavaScript-Engines implementieren nun eine stabile `Array#sort`. Eine Sorge weniger für JavaScript-Entwickler. Schön!

(Oh, und [wir haben dasselbe für `TypedArray`s gemacht](https://github.com/tc39/ecma262/pull/1433): Auch diese Sortierung ist jetzt stabil.)

:::note
**Hinweis:** Obwohl Stabilität nun gemäß Spezifikation erforderlich ist, sind JavaScript-Engines weiterhin frei, jeden beliebigen Sortieralgorithmus zu implementieren. [V8 verwendet Timsort](/blog/array-sort#timsort), zum Beispiel. Die Spezifikation schreibt keinen bestimmten Sortieralgorithmus vor.
:::

## Unterstützung für die Funktion

### Stabile `Array.prototype.sort`

<feature-support chrome="70 /blog/v8-release-70#javascript-language-features"
                 firefox="ja"
                 safari="ja"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="ja https://github.com/zloirock/core-js#ecmascript-array"></feature-support>

### Stabile `%TypedArray%.prototype.sort`

<feature-support chrome="74 https://bugs.chromium.org/p/v8/issues/detail?id=8567"
                 firefox="67 https://bugzilla.mozilla.org/show_bug.cgi?id=1290554"
                 safari="ja"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="ja https://github.com/zloirock/core-js#ecmascript-typed-arrays"></feature-support>
