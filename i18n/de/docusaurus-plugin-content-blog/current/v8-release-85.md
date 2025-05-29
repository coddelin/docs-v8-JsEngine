---
title: "V8 Version v8.5 Veröffentlichung"
author: "Zeynep Cankara, verfolgt einige Maps"
avatars:
 - "zeynep-cankara"
date: 2020-07-21
tags:
 - veröffentlichung
description: "V8 Version v8.5 enthält Promise.any, String#replaceAll, logische Zuweisungsoperatoren, WebAssembly-Mehrwertunterstützung, BigInt-Unterstützung und Leistungsverbesserungen."
tweet:
---
Alle sechs Wochen erstellen wir einen neuen Zweig von V8 im Rahmen unseres [Veröffentlichungsverfahrens](https://v8.dev/docs/release-process). Jede Version wird direkt vor einem Chrome Beta-Meilenstein von V8s Git-Master verzweigt. Heute freuen wir uns, unseren neuesten Zweig bekanntzugeben, [V8 Version 8.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.5), der sich bis zur Veröffentlichung in Zusammenarbeit mit Chrome 85 Stable in einigen Wochen in der Beta befindet. V8 v8.5 ist gefüllt mit allerlei Entwickler-freundlichen Funktionen. Dieser Beitrag bietet eine Vorschau auf einige der Highlights im Vorfeld der Veröffentlichung.

<!--truncate-->
## JavaScript

### `Promise.any` und `AggregateError`

`Promise.any` ist ein Promise-Kombinator, der das resultierende Versprechen auflöst, sobald eines der Eingabe-Promises erfüllt wird.

```js
const promises = [
  fetch('/endpoint-a').then(() => 'a'),
  fetch('/endpoint-b').then(() => 'b'),
  fetch('/endpoint-c').then(() => 'c'),
];
try {
  const first = await Promise.any(promises);
  // Eines der Promises wurde erfüllt.
  console.log(first);
  // → z. B. 'b'
} catch (error) {
  // Alle Promises wurden abgelehnt.
  console.assert(error instanceof AggregateError);
  // Die Ablehnungswerte protokollieren:
  console.log(error.errors);
}
```

Wenn alle Eingabe-Promises abgelehnt werden, wird das resultierende Versprechen mit einem `AggregateError`-Objekt abgelehnt, das eine `errors`-Eigenschaft enthält, die ein Array mit Ablehnungswerten hält.

Weitere Informationen finden Sie in [unserer Erklärung](https://v8.dev/features/promise-combinators#promise.any).

### `String.prototype.replaceAll`

`String.prototype.replaceAll` bietet eine einfache Möglichkeit, alle Vorkommen eines Teilstrings zu ersetzen, ohne ein globales `RegExp` zu erstellen.

```js
const queryString = 'q=query+string+parameters';

// Funktioniert, erfordert jedoch Escaping innerhalb von regulären Ausdrücken.
queryString.replace(/\+/g, ' ');
// → 'q=query string parameters'

// Einfacher!
queryString.replaceAll('+', ' ');
// → 'q=query string parameters'
```

Weitere Informationen finden Sie in [unserer Erklärung](https://v8.dev/features/string-replaceall).

### Logische Zuweisungsoperatoren

Logische Zuweisungsoperatoren sind neue zusammengesetzte Zuweisungsoperatoren, die die logischen Operationen `&&`, `||` oder `??` mit der Zuweisung kombinieren.

```js
x &&= y;
// Ungefähr gleichbedeutend mit x && (x = y)
x ||= y;
// Ungefähr gleichbedeutend mit x || (x = y)
x ??= y;
// Ungefähr gleichbedeutend mit x ?? (x = y)
```

Beachtest, dass im Gegensatz zu mathematischen und bitweisen zusammengesetzten Zuweisungsoperatoren logische Zuweisungsoperatoren die Zuweisung nur bedingt durchführen.

Weitere Details finden Sie in [unserer Erklärung](https://v8.dev/features/logical-assignment).

## WebAssembly

### Liftoff auf allen Plattformen ausgeliefert

Seit V8 v6.9 wird [Liftoff](https://v8.dev/blog/liftoff) als Baseline-Compiler für WebAssembly auf Intel-Plattformen verwendet (und Chrome 69 hat es auf Desktop-Systemen aktiviert). Da wir besorgt über den Anstieg des Speichers waren (aufgrund des vom Baseline-Compiler generierten zusätzlichen Codes), haben wir es bisher für mobile Systeme zurückgehalten. Nach einigen Experimenten in den letzten Monaten sind wir zuversichtlich, dass der Speicheranstieg für die meisten Fälle vernachlässigbar ist, daher wird Liftoff schließlich standardmäßig für alle Architekturen aktiviert, was insbesondere auf Arm-Geräten (32- und 64-Bit) eine erhöhte Kompilierrate bringt. Chrome 85 folgt und liefert Liftoff aus.

### Unterstützung für Mehrwert ausgeliefert

WebAssembly-Unterstützung für [Mehrwert-Codeblöcke und Funktionsrückgaben](https://github.com/WebAssembly/multi-value) ist jetzt für die allgemeine Nutzung verfügbar. Dies spiegelt die kürzliche Zusammenführung des Vorschlags im offiziellen WebAssembly-Standard wider und wird von allen Kompilierungsstufen unterstützt.

Zum Beispiel ist dies jetzt eine gültige WebAssembly-Funktion:

```wasm
(func $swap (param i32 i32) (result i32 i32)
  (local.get 1) (local.get 0)
)
```

Wenn die Funktion exportiert wird, kann sie auch von JavaScript aufgerufen werden, und sie gibt ein Array zurück:

```js
instance.exports.swap(1, 2);
// → [2, 1]
```

Im Gegensatz dazu, wenn eine JavaScript-Funktion ein Array (oder einen beliebigen Iterator) zurückgibt, kann sie importiert und als Mehrwert-Funktion innerhalb des WebAssembly-Moduls aufgerufen werden:

```js
new WebAssembly.Instance(module, {
  imports: {
    swap: (x, y) => [y, x],
  },
});
```

```wasm
(func $main (result i32 i32)
  i32.const 0
  i32.const 1
  call $swap
)
```

Wichtiger ist, dass Toolchains diese Funktion jetzt nutzen können, um kompakteren und schnelleren Code innerhalb eines WebAssembly-Moduls zu generieren.

### Unterstützung für JS BigInts

WebAssembly-Unterstützung für [die Umwandlung von WebAssembly-I64-Werten von und zu JavaScript-BigInts](https://github.com/WebAssembly/JS-BigInt-integration) wurde eingeführt und steht gemäß der neuesten Änderung im offiziellen Standard zur allgemeinen Nutzung bereit.

Damit können WebAssembly-Funktionen mit i64-Parametern und Rückgabewerten aus JavaScript ohne Genauigkeitsverlust aufgerufen werden:

```wasm
(module
  (func $add (param $x i64) (param $y i64) (result i64)
    local.get $x
    local.get $y
    i64.add)
  (export "add" (func $add)))
```

In JavaScript können als i64-Parameter nur BigInts übergeben werden:

```js
WebAssembly.instantiateStreaming(fetch('i64.wasm'))
  .then(({ module, instance }) => {
    instance.exports.add(12n, 30n);
    // → 42n
    instance.exports.add(12, 30);
    // → TypeError: Parameter sind nicht vom Typ BigInt
  });
```

## V8-API

Bitte benutzen Sie `git log branch-heads/8.4..branch-heads/8.5 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem aktiven V8-Checkout können `git checkout -b 8.5 -t branch-heads/8.5` verwenden, um die neuen Funktionen in V8 v8.5 auszuprobieren. Alternativ können Sie [den Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst testen.
