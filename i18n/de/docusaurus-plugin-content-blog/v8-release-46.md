---
title: "V8 Veröffentlichung v4.6"
author: "das V8-Team"
date: "2015-08-28 13:33:37"
tags: 
  - Veröffentlichung
description: "V8 v4.6 kommt mit reduzierten Rucklern und Unterstützung für neue ES2015-Sprachfunktionen."
---
Etwa alle sechs Wochen erstellen wir im Rahmen unseres [Veröffentlichungsprozesses](https://v8.dev/docs/release-process) einen neuen Branch von V8. Jede Version wird unmittelbar vor dem Branch von Chrome für einen Chrome-Beta-Meilenstein vom Git-Master von V8 abgezweigt. Heute freuen wir uns, unseren neuesten Branch [V8 Version 4.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.6) vorzustellen, der sich in der Beta-Phase befinden wird, bis er in Abstimmung mit Chrome 46 Stable freigegeben wird. V8 4.6 ist vollgepackt mit allerlei Neuerungen für Entwickler, daher möchten wir Ihnen einen Vorgeschmack auf einige Highlights geben, die in den kommenden Wochen veröffentlicht werden.

<!--truncate-->
## Verbesserte Unterstützung für ECMAScript 2015 (ES6)

V8 v4.6 fügt Unterstützung für mehrere [ECMAScript 2015 (ES6)](https://www.ecma-international.org/ecma-262/6.0/) Features hinzu.

### Spread-Operator

Der [Spread-Operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator) macht die Arbeit mit Arrays wesentlich bequemer. Beispielsweise wird imperativer Code überflüssig, wenn Sie einfach nur Arrays zusammenführen möchten.

```js
// Arrays zusammenführen
// Code ohne Spread-Operator
const inner = [3, 4];
const merged = [0, 1, 2].concat(inner, [5]);

// Code mit Spread-Operator
const inner = [3, 4];
const merged = [0, 1, 2, ...inner, 5];
```

Eine weitere gute Verwendung des Spread-Operators ist die Ersetzung von `apply`:

```js
// Funktionsparameter in einem Array gespeichert
// Code ohne Spread-Operator
function myFunction(a, b, c) {
  console.log(a);
  console.log(b);
  console.log(c);
}
const argsInArray = ['Hi ', 'Spread ', 'operator!'];
myFunction.apply(null, argsInArray);

// Code mit Spread-Operator
function myFunction (a,b,c) {
  console.log(a);
  console.log(b);
  console.log(c);
}

const argsInArray = ['Hi ', 'Spread ', 'operator!'];
myFunction(...argsInArray);
```

### `new.target`

[`new.target`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new.target) ist eines der ES6-Features, die die Arbeit mit Klassen verbessern sollen. Im Hintergrund ist es tatsächlich ein impliziter Parameter für jede Funktion. Wenn eine Funktion mit dem Schlüsselwort new aufgerufen wird, hält der Parameter eine Referenz auf die aufgerufene Funktion. Wenn new nicht verwendet wird, ist der Parameter undefined.

In der Praxis bedeutet das, dass Sie mit new.target herausfinden können, ob eine Funktion normal oder als Konstruktor über das Schlüsselwort new aufgerufen wurde.

```js
function myFunction() {
  if (new.target === undefined) {
    throw 'Versuchen Sie, es mit new aufzurufen.';
  }
  console.log('Funktioniert!');
}

// Bricht ab:
myFunction();

// Funktioniert:
const a = new myFunction();
```

Wenn ES6-Klassen und Vererbung verwendet werden, wird new.target im Konstruktor einer Superklasse an den abgeleiteten Konstruktor gebunden, der mit new aufgerufen wurde. Dies gibt Superklassen während der Konstruktion Zugriff auf das Prototype-Objekt der abgeleiteten Klasse.

## Reduzierung von Rucklern

[Ruckeln](https://en.wiktionary.org/wiki/jank#Noun) kann nerven, besonders beim Spielen eines Spiels. Oft ist es noch schlimmer, wenn das Spiel mehrere Spieler umfasst. [oortonline.gl](http://oortonline.gl/) ist ein WebGL-Benchmark, der die Grenzen aktueller Browser testet, indem er eine komplexe 3D-Szene mit Partikeleffekten und moderner Shader-Rendering rendert. Das V8-Team machte es sich zur Aufgabe, die Leistungsgrenzen von Chrome in solchen Umgebungen auszuloten. Wir sind noch nicht fertig, aber die Früchte unserer Bemühungen zeigen bereits jetzt Wirkung. Chrome 46 zeigt erstaunliche Fortschritte in der oortonline.gl-Leistung, die Sie unten selbst sehen können.

Einige der Optimierungen umfassen:

- [Leistungsverbesserungen bei TypedArrays](https://code.google.com/p/v8/issues/detail?id=3996)
    - TypedArrays werden stark in Rendering-Engines wie Turbulenz (der Engine hinter oortonline.gl) verwendet. Zum Beispiel erstellen Engines oft TypedArrays (wie Float32Array) in JavaScript und übergeben sie nach Anwendung von Transformationen an WebGL.
    - Der Schlüsselpunkt war die Optimierung der Interaktion zwischen dem Einbettungsprogramm (Blink) und V8.
- [Leistungssteigerungen beim Übergeben von TypedArrays und anderem Speicher von V8 an Blink](https://code.google.com/p/chromium/issues/detail?id=515795)
    - Es ist nicht erforderlich, zusätzliche Handles (die auch von V8 nachverfolgt werden) für TypedArrays zu erstellen, wenn sie als Teil einer Einwegkommunikation an WebGL übergeben werden.
    - Beim Erreichen externer (von Blink allokierter) Speichergrenzen starten wir jetzt eine inkrementelle Garbage-Collection anstelle einer vollständigen.
- [Planung der Garbage-Collection in Leerlaufzeiten](/blog/free-garbage-collection)
    - Garbage-Collection-Operationen werden während Leerlaufzeiten im Main-Thread geplant, was den Kompositor entlastet und zu einer flüssigeren Darstellung führt.
- [Concurrentes Sweepen für die gesamte alte Generation des garbage-collected Heaps aktiviert](https://code.google.com/p/chromium/issues/detail?id=507211)
    - Das Freigeben nicht genutzter Speicherbereiche erfolgt auf zusätzlichen Threads, die gleichzeitig mit dem Haupt-Thread laufen, wodurch die Haupt-Garbage-Collection-Pausenzeit erheblich reduziert wird.

Das Gute daran ist, dass alle Änderungen in Bezug auf oortonline.gl allgemeine Verbesserungen sind, die potenziell alle Nutzer von Anwendungen beeinflussen, die intensiv WebGL nutzen.

## V8-API

Bitte sehen Sie sich unsere [Zusammenfassung der API-Änderungen](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit) an. Dieses Dokument wird regelmäßig einige Wochen nach jeder Hauptversion aktualisiert.

Entwickler mit einem [aktiven V8-Checkout](https://v8.dev/docs/source-code#using-git) können `git checkout -b 4.6 -t branch-heads/4.6` nutzen, um die neuen Funktionen in V8 v4.6 zu testen. Alternativ können Sie [Chrome's Beta-Kanal abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
