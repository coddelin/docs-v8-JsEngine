---
title: 'Numerische Separatoren'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2019-05-28
tags:
  - ECMAScript
  - ES2021
  - io19
description: 'JavaScript unterstützt jetzt Unterstriche als Trennzeichen in numerischen Literalen, was die Lesbarkeit und Wartbarkeit des Quellcodes erhöht.'
tweet: '1129073383931559936'
---
Große numerische Literale sind für das menschliche Auge schwer schnell zu erkennen, besonders wenn viele sich wiederholende Ziffern vorhanden sind:

```js
1000000000000
   1019436871.42
```

Um die Lesbarkeit zu verbessern, ermöglicht [eine neue JavaScript-Sprachfunktion](https://github.com/tc39/proposal-numeric-separator) die Verwendung von Unterstrichen als Trennzeichen in numerischen Literalen. Somit kann das oben stehende nun so umgeschrieben werden, dass die Ziffern beispielsweise in Tausendergruppen zusammengefasst werden:

<!--truncate-->
```js
1_000_000_000_000
    1_019_436_871.42
```

Jetzt ist es einfacher zu erkennen, dass die erste Zahl eine Billion ist und die zweite Zahl in der Größenordnung von 1 Milliarde liegt.

Numerische Separatoren tragen zur Verbesserung der Lesbarkeit aller Arten von numerischen Literalen bei:

```js
// Ein Dezimal-Integer-Literal mit Tausendergruppen:
1_000_000_000_000
// Ein Dezimal-Literal mit Tausendergruppen:
1_000_000.220_720
// Ein Binär-Integer-Literal mit Bit-Gruppen pro Oktett:
0b01010110_00111000
// Ein Binär-Integer-Literal mit Bit-Gruppen pro Nibble:
0b0101_0110_0011_1000
// Ein Hexadezimal-Integer-Literal mit Zifferngruppen pro Byte:
0x40_76_38_6A_73
// Ein BigInt-Literal mit Tausendergruppen:
4_642_473_943_484_686_707n
```

Sie funktionieren sogar bei Oktal-Integer-Literalen (obwohl [ich mir kein Beispiel vorstellen kann](https://github.com/tc39/proposal-numeric-separator/issues/44), bei dem Trennzeichen für solche Literale von Nutzen sind):

```js
// Ein numerischer Separator in einem Oktal-Integer-Literal: 🤷‍♀️
0o123_456
```

Beachten Sie, dass JavaScript auch eine ältere Syntax für Oktal-Literale ohne das explizite Präfix `0o` hat. Zum Beispiel `017 === 0o17`. Diese Syntax wird im Strict-Modus oder innerhalb von Modulen nicht unterstützt und sollte in modernem Code nicht verwendet werden. Dementsprechend werden numerische Separatoren für diese Literale nicht unterstützt. Verwenden Sie stattdessen Literale im `0o17`-Stil.

## Unterstützung für numerische Separatoren

<feature-support chrome="75 /blog/v8-release-75#numeric-separators"
                 firefox="70 https://hacks.mozilla.org/2019/10/firefox-70-a-bountiful-release-for-all/"
                 safari="13"
                 nodejs="12.5.0 https://nodejs.org/en/blog/release/v12.5.0/"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-numeric-separator"></feature-support>
