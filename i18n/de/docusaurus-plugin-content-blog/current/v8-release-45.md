---
title: &apos;V8-Version v4.5&apos;
author: &apos;das V8-Team&apos;
date: 2015-07-17 13:33:37
tags:
  - Version
description: &apos;V8 v4.5 bietet Leistungsverbesserungen und unterstützt mehrere ES2015-Funktionen.&apos;
---
Etwa alle sechs Wochen erstellen wir im Rahmen unseres [Release-Prozesses](https://v8.dev/docs/release-process) einen neuen Zweig von V8. Jede Version wird direkt vor dem Chrome-Zweig für eine Chrome-Beta-Meilenstein aus dem Git-Master von V8 abgezweigt. Heute freuen wir uns, unseren neuesten Zweig, [V8-Version 4.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.5), anzukündigen, der bis zur Veröffentlichung in Zusammenarbeit mit Chrome 45 Stable in der Beta-Phase sein wird. V8 v4.5 ist vollgepackt mit allerlei Entwickler-Features, daher möchten wir Ihnen einen Überblick über einige Highlights geben, um die Veröffentlichung in einigen Wochen vorzubereiten.

<!--truncate-->
## Verbesserte Unterstützung für ECMAScript 2015 (ES6)

V8 v4.5 unterstützt mehrere [ECMAScript 2015 (ES6)](https://www.ecma-international.org/ecma-262/6.0/)-Funktionen.

### Pfeilfunktionen

Mit Hilfe von [Pfeilfunktionen](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Functions/Arrow_functions) ist es möglich, einen effizienteren Code zu schreiben.

```js
const data = [0, 1, 3];
// Code ohne Pfeilfunktionen
const convertedData = data.map(function(value) { return value * 2; });
console.log(convertedData);
// Code mit Pfeilfunktionen
const convertedData = data.map(value => value * 2);
console.log(convertedData);
```

Die lexikalische Bindung von &apos;this&apos; ist ein weiterer großer Vorteil von Pfeilfunktionen. Dadurch wird die Verwendung von Rückrufen in Methoden wesentlich einfacher.

```js
class MyClass {
  constructor() { this.a = &apos;Hallo, &apos;; }
  hello() { setInterval(() => console.log(this.a + &apos;Welt!&apos;), 1000); }
}
const myInstance = new MyClass();
myInstance.hello();
```

### Array/TypedArray-Funktionen

Alle neuen Methoden für [Arrays und TypedArrays](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Array#Methods), die in ES2015 spezifiziert sind, werden nun in V8 v4.5 unterstützt. Sie erleichtern die Arbeit mit Arrays und TypedArrays erheblich. Unter den hinzugefügten Methoden befinden sich `Array.from` und `Array.of`. Außerdem wurden Methoden hinzugefügt, die die meisten `Array`-Methoden auf jeder Art von TypedArray spiegeln.

### `Object.assign`

[`Object.assign`](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) ermöglicht es Entwicklern, Objekte schnell zusammenzuführen und zu klonen.

```js
const target = { a: &apos;Hallo, &apos; };
const source = { b: &apos;Welt!&apos; };
// Zusammenführen der Objekte.
Object.assign(target, source);
console.log(target.a + target.b);
```

Diese Funktion kann auch genutzt werden, um Funktionen einzubinden.

## Mehr JavaScript-Sprachfunktionen sind „optimierbar“

Seit vielen Jahren hat der traditionelle Optimierungskomparator von V8, [Crankshaft](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html), großartige Arbeit bei der Optimierung vieler gängiger JavaScript-Muster geleistet. Er hatte jedoch nie die Fähigkeit, die gesamte JavaScript-Sprache zu unterstützen, und die Verwendung bestimmter Sprachfunktionen in einer Funktion – wie `try`/`catch` und `with` – verhinderte, dass sie optimiert werden konnte. V8 musste für diese Funktion auf seinen langsameren Basiskompilierer zurückgreifen.

Eines der Designziele des neuen Optimierungskompilers von V8, [TurboFan](/blog/turbofan-jit), ist es, schließlich alle JavaScript-Funktionen zu optimieren, einschließlich ECMAScript 2015-Funktionen. In V8 v4.5 haben wir begonnen, TurboFan zur Optimierung einiger Sprachfunktionen einzusetzen, die von Crankshaft nicht unterstützt werden: `for`-`of`, `class`, `with` und berechnete Eigenschaftsnamen.

Hier ist ein Beispiel für Code, der &apos;for-of&apos; verwendet und jetzt von TurboFan kompiliert werden kann:

```js
const sequence = [&apos;Erste&apos;, &apos;Zweite&apos;, &apos;Dritte&apos;];
for (const value of sequence) {
  // Dieser Bereich ist jetzt optimierbar.
  const object = {a: &apos;Hallo, &apos;, b: &apos;Welt!&apos;, c: value};
  console.log(object.a + object.b + object.c);
}
```

Obwohl Funktionen, die diese Sprachfunktionen verwenden, zunächst nicht die gleiche Spitzenleistung wie anderer Code erreichen, der von Crankshaft kompiliert wurde, kann TurboFan sie jetzt erheblich beschleunigen, verglichen mit unserem aktuellen Basiskompilierer. Noch besser ist, dass die Leistung schnell weiter verbessert wird, während wir weitere Optimierungen für TurboFan entwickeln.

## V8-API

Bitte sehen Sie sich unsere [Zusammenfassung der API-Änderungen](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit) an. Dieses Dokument wird regelmäßig einige Wochen nach jeder Hauptversion aktualisiert.

Entwickler mit einem [aktiven V8-Checkout](https://v8.dev/docs/source-code#using-git) können `git checkout -b 4.5 -t branch-heads/4.5` verwenden, um die neuen Funktionen in V8 v4.5 zu testen. Alternativ können Sie sich [für den Beta-Kanal von Chrome anmelden](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
