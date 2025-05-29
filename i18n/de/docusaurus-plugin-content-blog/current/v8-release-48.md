---
title: "V8 Version v4.8"
author: "Das V8-Team"
date: 2015-11-25 13:33:37
tags:
  - Veröffentlichung
description: "V8 v4.8 fügt Unterstützung für mehrere neue ES2015-Sprachfunktionen hinzu."
---
Etwa alle sechs Wochen erstellen wir einen neuen Branch von V8 im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process). Jede Version wird direkt vor der Verzweigung des Chrome-Beta-Meilensteins aus dem Git-Master von V8 abgezweigt. Heute freuen wir uns, unseren neuesten Branch, [V8 Version 4.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.8), anzukündigen, der sich in der Beta-Phase befindet, bis er zusammen mit Chrome 48 Stable veröffentlicht wird. V8 4.8 enthält eine Reihe von Funktionen, die für Entwickler wichtig sind, daher möchten wir Ihnen einen Vorgeschmack auf einige der Höhepunkte geben, die in einigen Wochen veröffentlicht werden.

<!--truncate-->
## Verbesserte Unterstützung für ECMAScript 2015 (ES6)

Diese Version von V8 bietet Unterstützung für zwei [wohlbekannte Symbole](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Well-known_symbols), integrierte Symbole aus der ES2015-Spezifikation, die es Entwicklern ermöglichen, mehrere zuvor verborgene Low-Level-Sprachkonstrukte zu nutzen.

### `@@isConcatSpreadable`

Der Name für eine boolesche Eigenschaft, die, wenn sie `true` ist, anzeigt, dass ein Objekt durch `Array.prototype.concat` in seine Array-Elemente aufgeflacht werden soll.

```js
(function() {
  'use strict';
  class AutomaticallySpreadingArray extends Array {
    get [Symbol.isConcatSpreadable]() {
      return true;
    }
  }
  const first = [1];
  const second = new AutomaticallySpreadingArray();
  second[0] = 2;
  second[1] = 3;
  const all = first.concat(second);
  // Gibt [1, 2, 3] aus
  console.log(all);
}());
```

### `@@toPrimitive`

Der Name für eine Methode, die bei einem Objekt für implizite Konvertierungen in primitive Werte aufgerufen wird.

```js
(function(){
  'use strict';
  class V8 {
    [Symbol.toPrimitive](hint) {
      if (hint === 'string') {
        console.log('string');
        return 'V8';
      } else if (hint === 'number') {
        console.log('number');
        return 8;
      } else {
        console.log('default:' + hint);
        return 8;
      }
    }
  }

  const engine = new V8();
  console.log(Number(engine));
  console.log(String(engine));
}());
```

### `ToLength`

Die ES2015-Spezifikation passt die abstrakte Operation für Typkonvertierungen an, um ein Argument in eine Ganzzahl umzuwandeln, die sich zur Verwendung als Länge eines array-ähnlichen Objekts eignet. (Obwohl dies nicht direkt beobachtbar ist, könnte diese Änderung indirekt sichtbar sein, wenn mit array-ähnlichen Objekten mit negativer Länge gearbeitet wird.)

## V8 API

Bitte informieren Sie sich über unsere [Zusammenfassung der API-Änderungen](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Dieses Dokument wird regelmäßig einige Wochen nach jeder Hauptversion aktualisiert.

Entwickler mit einem [aktiven V8-Checkout](https://v8.dev/docs/source-code#using-git) können `git checkout -b 4.8 -t branch-heads/4.8` verwenden, um die neuen Funktionen von V8 v4.8 auszuprobieren. Alternativ können Sie [den Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
