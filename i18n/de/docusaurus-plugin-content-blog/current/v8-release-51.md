---
title: 'V8-Version v5.1'
author: 'das V8-Team'
date: 2016-04-23 13:33:37
tags:
  - Veröffentlichung
description: 'V8 v5.1 bringt Verbesserungen in der Performance, reduzierte Unterbrechungen und Speicherverbrauch sowie erhöhte Unterstützung für ECMAScript-Sprachfunktionen.'
---
Der erste Schritt im [Veröffentlichungsprozess](/docs/release-process) von V8 ist, einen neuen Branch von der Git-Master-Version zu erstellen, unmittelbar bevor Chromium für einen Chrome-Beta-Meilenstein verzweigt (etwa alle sechs Wochen). Unser neuester Release-Branch ist [V8 v5.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.1), der bis zu einer stabilen Version als Beta bleibt, die zusammen mit Chrome 51 Stable veröffentlicht wird. Hier sind die Highlights der neuen Entwicklerfunktionen dieser Version von V8.

<!--truncate-->
## Verbesserte ECMAScript-Unterstützung

V8 v5.1 enthält zahlreiche Änderungen, um die ES2017-Entwurfsspezifikation einzuhalten.

### `Symbol.species`

Array-Methoden wie `Array.prototype.map` erstellen Instanzen der Unterklasse als Ausgabe, mit der Möglichkeit, dies durch Änderung von [`Symbol.species`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/species) anzupassen. Ähnliche Änderungen wurden an anderen eingebauten Klassen vorgenommen.

### Anpassung von `instanceof`

Konstruktoren können ihre eigene [`Symbol.hasInstance`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Other_symbols)-Methode implementieren, die das Standardverhalten überschreibt.

### Iteratorschließung

Iteratoren, die im Rahmen einer [`for`-`of`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of)-Schleife (oder anderer eingebauter Iteration wie dem [Spread](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator)-Operator) erstellt werden, werden nun auf eine Schließmethode überprüft, die aufgerufen wird, wenn die Schleife vorzeitig beendet wird. Dies kann für Aufräumarbeiten nach der Iteration verwendet werden.

### RegExp-Unterklassen `exec` Methode

RegExp-Unterklassen können die `exec`-Methode überschreiben, um nur den Kernabgleichalgorithmus zu ändern, mit der Garantie, dass dieser von höheren Funktionen wie `String.prototype.replace` aufgerufen wird.

### Funktionsnamen-Inferenz

Funktionsnamen, die für Funktionsausdrücke abgeleitet werden, sind nun in der [`name`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name)-Eigenschaft von Funktionen erhältlich, gemäß der ES2015-Formalierung dieser Regeln. Dies könnte bestehende Stack-Traces ändern und andere Namen als frühere V8-Versionen liefern. Es liefert auch nützliche Namen für Eigenschaften und Methoden mit berechneten Eigenschaftsnamen:

```js
class Container {
  ...
  [Symbol.iterator]() { ... }
  ...
}
const c = new Container;
console.log(c[Symbol.iterator].name);
// → '[Symbol.iterator]'
```

### `Array.prototype.values`

Analog zu anderen Sammlungsarten gibt die [`values`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/values)-Methode auf `Array` einen Iterator über die Inhalte des Arrays zurück.

## Leistungsverbesserungen

V8 v5.1 bringt auch einige bemerkenswerte Verbesserungen in der Leistung für die folgenden JavaScript-Funktionen:

- Ausführen von Schleifen wie `for`-`in`
- `Object.assign`
- Promise- und RegExp-Instanziierung
- Aufruf von `Object.prototype.hasOwnProperty`
- `Math.floor`, `Math.round` und `Math.ceil`
- `Array.prototype.push`
- `Object.keys`
- `Array.prototype.join` & `Array.prototype.toString`
- Wiederholte Zeichenketten glätten, z.B. `'.'.repeat(1000)`

## WebAssembly (Wasm)

V8 v5.1 hat eine vorläufige Unterstützung für [WebAssembly](/blog/webassembly-experimental). Sie können es über das Flag `--expose_wasm` in `d8` aktivieren. Alternativ können Sie die [Wasm-Demos](https://webassembly.github.io/demo/) mit Chrome 51 (Beta-Kanal) ausprobieren.

## Speicher

V8 hat weitere Teile von [Orinoco](/blog/orinoco) implementiert:

- Parallele Evakuierung der jungen Generation
- Skalierbare erinnerte Sets
- Schwarze Zuweisung

Der Einfluss sind reduzierte Unterbrechungen und Speicherverbrauch in Notzeiten.

## V8 API

Bitte werfen Sie einen Blick auf unsere [Zusammenfassung der API-Änderungen](https://bit.ly/v8-api-changes). Dieses Dokument wird einige Wochen nach jeder Hauptversion regelmäßig aktualisiert.

Entwickler mit einem [aktiven V8-Auschecken](https://v8.dev/docs/source-code#using-git) können `git checkout -b 5.1 -t branch-heads/5.1` verwenden, um mit den neuen Funktionen von V8 v5.1 zu experimentieren. Alternativ können Sie sich zum [Beta-Kanal von Chrome][https://www.google.com/chrome/browser/beta.html) anmelden und die neuen Funktionen bald selbst ausprobieren.
