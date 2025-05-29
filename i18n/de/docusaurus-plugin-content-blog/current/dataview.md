---
title: "Verbesserung der `DataView`-Leistung in V8"
author: "Théotime Grohens, <i lang=\"fr\">der Gelehrte von Daten-Ansicht</i>, und Benedikt Meurer ([@bmeurer](https://twitter.com/bmeurer)), professioneller Leistungsfreund"
avatars: 
  - "benedikt-meurer"
date: "2018-09-18 11:20:37"
tags: 
  - ECMAScript
  - Benchmarks
description: "V8 v6.9 schließt die Leistungslücke zwischen DataView und äquivalentem TypedArray-Code, wodurch DataView effektiv für leistungsrelevante Anwendungen in der realen Welt nutzbar wird."
tweet: "1041981091727466496"
---
[`DataView`s](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView) sind eine der zwei möglichen Methoden, um Speicher auf niedriger Ebene in JavaScript zuzugreifen, die andere ist [`TypedArray`s](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray). Bislang waren `DataView`s in V8 viel weniger optimiert als `TypedArray`s, was zu einer schlechteren Leistung bei Aufgaben wie grafikintensiven Workloads oder beim Decodieren/Kodieren von Binärdaten führte. Die Gründe dafür waren hauptsächlich historische Entscheidungen, wie die Tatsache, dass [asm.js](http://asmjs.org/) `TypedArray`s statt `DataView`s gewählt hat, und so waren Engines motiviert, sich auf die Leistung von `TypedArray`s zu konzentrieren.

<!--truncate-->
Aufgrund der Leistungseinbußen entschieden sich JavaScript-Entwickler wie das Google Maps Team, `DataView`s zu vermeiden und stattdessen auf `TypedArray`s zurückzugreifen, was jedoch auf Kosten der erhöhten Code-Komplexität geschah. In diesem Artikel erklären wir, wie wir die Leistung von `DataView` so verbessert haben, dass sie — und sogar darüber hinaus — äquivalentem `TypedArray`-Code in [V8 v6.9](/blog/v8-release-69) entspricht, was `DataView` effektiv für leistungsrelevante Anwendungen in der realen Welt nutzbar macht.

## Hintergrund

Seit der Einführung von ES2015 unterstützt JavaScript das Lesen und Schreiben von Rohdaten in binären Puffern, den sogenannten [`ArrayBuffer`s](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer). `ArrayBuffer`s können nicht direkt zugegriffen werden; stattdessen müssen Programme ein sogenanntes *Arraybuffer-Ansicht*-Objekt verwenden, das entweder ein `DataView` oder ein `TypedArray` sein kann.

`TypedArray`s ermöglichen Programmen den Zugriff auf den Puffer als ein Array von einheitlich typisierten Werten, wie beispielsweise `Int16Array` oder `Float32Array`.

```js
const buffer = new ArrayBuffer(32);
const array = new Int16Array(buffer);

for (let i = 0; i < array.length; i++) {
  array[i] = i * i;
}

console.log(array);
// → [0, 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225]
```

Auf der anderen Seite ermöglichen `DataView`s einen weitaus feineren Datenzugriff. Sie erlauben dem Programmierer, den Typ von Werten auszuwählen, die aus dem Puffer gelesen und in ihn geschrieben werden, indem spezialisierte Getter und Setter für jeden Zahlentyp bereitgestellt werden, was sie nützlich zum Serialisieren von Datenstrukturen macht.

```js
const buffer = new ArrayBuffer(32);
const view = new DataView(buffer);

const person = { age: 42, height: 1.76 };

view.setUint8(0, person.age);
view.setFloat64(1, person.height);

console.log(view.getUint8(0)); // Erwartete Ausgabe: 42
console.log(view.getFloat64(1)); // Erwartete Ausgabe: 1.76
```

Darüber hinaus ermöglichen `DataView`s auch die Auswahl der Byte-Reihenfolge der Datenspeicherung, was nützlich sein kann, wenn Daten von externen Quellen wie Netzwerken, Dateien oder GPUs empfangen werden.

```js
const buffer = new ArrayBuffer(32);
const view = new DataView(buffer);

view.setInt32(0, 0x8BADF00D, true); // Schreibe Little-Endian.
console.log(view.getInt32(0, false)); // Lese Big-Endian.
// Erwartete Ausgabe: 0x0DF0AD8B (233876875)
```

Eine effiziente `DataView`-Implementierung war seit langem eine Funktionsanforderung (siehe [diesen Fehlerbericht](https://bugs.chromium.org/p/chromium/issues/detail?id=225811) vor über 5 Jahren), und wir freuen uns, bekanntzugeben, dass die `DataView`-Leistung nun gleichwertig ist!

## Legacy-Runtime-Implementierung

Bis vor Kurzem wurden die `DataView`-Methoden als eingebaute C++-Runtime-Funktionen in V8 implementiert. Dies ist sehr kostspielig, da jeder Aufruf einen teuren Übergang von JavaScript zu C++ (und zurück) erfordert.

Um die tatsächlichen Leistungskosten dieser Implementierung zu untersuchen, haben wir ein Leistungs-Benchmark eingerichtet, das die native `DataView`-Getter-Implementierung mit einer JavaScript-Wrapper-Funktion vergleicht, die das Verhalten von `DataView` simuliert. Dieser Wrapper verwendet ein `Uint8Array`, um Daten Byte für Byte aus dem zugrunde liegenden Puffer zu lesen, und berechnet dann den Rückgabewert aus diesen Bytes. Hier ist beispielsweise die Funktion zum Lesen von Little-Endian 32-Bit-Unsigned-Integer-Werten:

```js
function LittleEndian(buffer) { // Simuliere Little-Endian-DataView-Lesevorgänge.
  this.uint8View_ = new Uint8Array(buffer);
}

LittleEndian.prototype.getUint32 = function(byteOffset) {
  return this.uint8View_[byteOffset] |
    (this.uint8View_[byteOffset + 1] << 8) |
    (this.uint8View_[byteOffset + 2] << 16) |
    (this.uint8View_[byteOffset + 3] << 24);
};
```

`TypedArray`s sind in V8 bereits stark optimiert, sodass sie das Leistungsziel darstellen, das wir erreichen wollten.

![Ursprüngliche `DataView`-Performance](/_img/dataview/dataview-original.svg)

Unser Benchmark zeigt, dass die Performance des `DataView`-Getters in nativer Form bis zu **4-mal** langsamer war als die auf `Uint8Array` basierende Wrapper-Implementierung, sowohl bei Big-Endian- als auch bei Little-Endian-Lesevorgängen.

## Verbesserung der Basisleistung

Unser erster Schritt zur Verbesserung der Leistung von `DataView`-Objekten bestand darin, die Implementierung von der C++-Laufzeit auf [`CodeStubAssembler` (auch CSA genannt)](/blog/csa) zu übertragen. CSA ist eine portable Assemblersprache, die es uns ermöglicht, Code direkt in TurboFans maschinenlevel-zwischendarstellung (IR) zu schreiben. Wir verwenden sie, um optimierte Teile der JavaScript-Standardbibliothek von V8 zu implementieren. Durch die Neuschreibung des Codes in CSA umgehen wir den Aufruf von C++ vollständig und generieren gleichzeitig effizienten Maschinencode, indem wir die Backend-Funktionen von TurboFan nutzen.

CSA-Code manuell zu schreiben ist jedoch mühsam. Der Kontrollfluss in CSA wird ähnlich wie in Assembly ausgedrückt, mit expliziten Labels und `goto`s, was den Code schwieriger lesbar und auf den ersten Blick schwerer verständlich macht.

Um Entwicklern das Beitragen zur optimierten JavaScript-Standardbibliothek in V8 zu erleichtern und die Lesbarkeit sowie Wartbarkeit zu verbessern, begannen wir, eine neue Sprache namens V8 *Torque* zu entwickeln, die zu CSA kompiliert wird. Das Ziel von *Torque* ist es, die Low-Level-Details zu abstrahieren, die das Schreiben und die Wartung von CSA-Code erschweren, während das gleiche Leistungsprofil beibehalten wird.

Die Neuschreibung des `DataView`-Codes war eine ausgezeichnete Gelegenheit, Torque für neuen Code einzusetzen und den Torque-Entwicklern während des Prozesses umfangreiche Rückmeldungen zur Sprache zu geben. So sieht die `getUint32()`-Methode des `DataView` aus, wenn sie in Torque geschrieben wird:

```torque
macro LoadDataViewUint32(buffer: JSArrayBuffer, offset: intptr,
                    requested_little_endian: bool,
                    signed: constexpr bool): Number {
  let data_pointer: RawPtr = buffer.backing_store;

  let b0: uint32 = LoadUint8(data_pointer, offset);
  let b1: uint32 = LoadUint8(data_pointer, offset + 1);
  let b2: uint32 = LoadUint8(data_pointer, offset + 2);
  let b3: uint32 = LoadUint8(data_pointer, offset + 3);
  let result: uint32;

  if (requested_little_endian) {
    result = (b3 << 24) | (b2 << 16) | (b1 << 8) | b0;
  } else {
    result = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
  }

  return convert<Number>(result);
}
```

Das Verschieben der `DataView`-Methoden nach Torque zeigte bereits eine **3-fache Verbesserung** der Leistung, erreichte jedoch noch nicht die Performance des `Uint8Array`-basierten Wrappers.

![Torque `DataView`-Performance](/_img/dataview/dataview-torque.svg)

## Optimierung für TurboFan

Wenn JavaScript-Code oft ausgeführt wird, kompilieren wir ihn mit unserem TurboFan-Optimierungskompilierer, um hochoptimierten Maschinencode zu generieren, der effizienter läuft als interpretierter Bytecode.

TurboFan funktioniert, indem es den eingehenden JavaScript-Code in eine interne Graph-Darstellung übersetzt (genauer gesagt, [ein „Sea-of-Nodes“](https://darksi.de/d.sea-of-nodes/)). Es beginnt mit hochrangigen Knoten, die JavaScript-Operationen und -Semantiken entsprechen, und verfeinert sie schrittweise zu immer niedrigeren Ebenen, bis letztendlich Maschinencode generiert wird.

Insbesondere wird ein Funktionsaufruf, wie z. B. das Aufrufen einer `DataView`-Methode, intern als `JSCall`-Knoten dargestellt, der letztendlich auf einen tatsächlichen Funktionsaufruf im generierten Maschinencode hinausläuft.

TurboFan ermöglicht es uns jedoch zu überprüfen, ob der `JSCall`-Knoten tatsächlich ein Aufruf einer bekannten Funktion ist, beispielsweise eine der integrierten Funktionen, und diesen Knoten in der IR inline zu setzen. Das bedeutet, dass der komplizierte `JSCall` zur Kompilierungszeit durch einen Untergraphen ersetzt wird, der die Funktion darstellt. Dadurch kann TurboFan den inneren Teil der Funktion in nachfolgenden Durchläufen im weiteren Kontext optimieren, anstatt sie isoliert zu betrachten, und vor allem die kostspielige Funktion ersetzen.

![Anfängliche TurboFan `DataView`-Performance](/_img/dataview/dataview-turbofan-initial.svg)

Die Implementierung des Inline-Setzens durch TurboFan hat es letztendlich ermöglicht, die Leistung unseres `Uint8Array`-Wrappers zu erreichen und sogar zu übertreffen, und war **8-mal** schneller als die frühere C++-Implementierung.

## Weitere TurboFan-Optimierungen

Beim Blick auf den durch TurboFan generierten Maschinencode nach dem Inline-Setzen der `DataView`-Methoden gab es noch Raum für einige Verbesserungen. Die erste Implementierung dieser Methoden versuchte, dem Standard ziemlich genau zu folgen und warf Fehler, wenn die Spezifikation dies vorgab (z. B. beim Versuch, außerhalb der Grenzen des zugrunde liegenden `ArrayBuffer` zu lesen oder zu schreiben).

Der Code, den wir in TurboFan schreiben, soll für die gängigen, häufig genutzten Fälle so schnell wie möglich optimiert sein — er muss nicht jeden möglichen Randfall unterstützen. Indem wir die komplexe Behandlung dieser Fehler entfernt und einfach zurück zur grundlegenden Torque-Implementierung deoptimiert haben, wenn wir eine Ausnahme werfen müssen, konnten wir den Umfang des generierten Codes um etwa 35 % reduzieren, was zu einer deutlich spürbaren Beschleunigung und wesentlich einfacherer TurboFan-Code führte.

Aufbauend auf der Idee, in TurboFan so spezialisiert wie möglich zu sein, haben wir auch die Unterstützung für Indizes oder Offsets entfernt, die zu groß sind (außerhalb des Smi-Bereichs) innerhalb des TurboFan-optimierten Codes. Dadurch konnten wir die Behandlung der Float64-Arithmetik loswerden, die für Offsets benötigt wird, die nicht in einen 32-Bit-Wert passen, und vermieden, große Ganzzahlen auf dem Heap zu speichern.

Im Vergleich zur ursprünglichen TurboFan-Implementierung hat dies die `DataView`-Benchmark-Ergebnisse mehr als verdoppelt. `DataView`s sind jetzt bis zu 3-mal schneller als der `Uint8Array`-Wrapper und etwa **16-mal schneller** als unsere ursprüngliche `DataView`-Implementierung!

![Endgültige TurboFan-`DataView`-Leistung](/_img/dataview/dataview-turbofan-final.svg)

## Auswirkungen

Wir haben die Leistungswirkung der neuen Implementierung an einigen realen Beispielen sowie anhand unseres eigenen Benchmarks bewertet.

`DataView`s werden oft verwendet, um Daten zu dekodieren, die in binären Formaten aus JavaScript kodiert sind. Ein solches binäres Format ist [FBX](https://de.wikipedia.org/wiki/FBX), ein Format, das für den Austausch von 3D-Animationen verwendet wird. Wir haben den FBX-Loader der beliebten JavaScript-3D-Bibliothek [three.js](https://threejs.org/) instrumentiert und eine Reduzierung der Ausführungszeit um 10 % (ca. 80 ms) gemessen.

Wir haben die Gesamtleistung von `DataView`s mit `TypedArray`s verglichen. Wir haben festgestellt, dass unsere neue `DataView`-Implementierung nahezu dieselbe Leistung wie `TypedArray`s bietet, wenn auf Daten zugegriffen wird, die in der nativen Endianess ausgerichtet sind (Little-Endian bei Intel-Prozessoren). Dies schließt einen Großteil der Leistungslücke und macht `DataView`s zu einer praktischen Wahl in V8.

![`DataView`- vs. `TypedArray`-Spitzenleistung](/_img/dataview/dataview-vs-typedarray.svg)

Wir hoffen, dass Sie jetzt beginnen können, `DataView`s dort zu verwenden, wo es sinnvoll ist, anstatt sich auf `TypedArray`-Shims zu verlassen. Bitte senden Sie uns Feedback zu Ihren `DataView`-Anwendungen! Sie können uns [über unseren Bug-Tracker](https://crbug.com/v8/new), per E-Mail an v8-users@googlegroups.com oder über [@v8js auf Twitter](https://twitter.com/v8js) erreichen.
