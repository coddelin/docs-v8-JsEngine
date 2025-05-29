---
title: "V8-Version v6.9"
author: "das V8-Team"
date: 2018-08-07 13:33:37
tags:
  - Veröffentlichung
description: "V8 v6.9 bietet reduzierten Speicherverbrauch durch eingebettete Built-ins, schnelleren Start von WebAssembly durch Liftoff, bessere Leistung von DataView und WeakMap und vieles mehr!"
tweet: "1026825606003150848"
---
Alle sechs Wochen erstellen wir einen neuen Branch von V8 im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process). Jede Version wird direkt vor einem Chrome-Beta-Meilenstein von V8s Git-Master abgespalten. Heute freuen wir uns, unseren neuesten Branch, [V8-Version 6.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.9), ankündigen zu können, der in Beta ist, bis er in einigen Wochen zusammen mit Chrome 69 Stable veröffentlicht wird. V8 v6.9 ist vollgepackt mit allerlei Entwickler-freundlichen Features. Dieser Beitrag bietet eine Vorschau auf einige Highlights in Vorfreude auf die Veröffentlichung.

<!--truncate-->
## Speicherersparnis durch eingebettete Built-ins

V8 wird mit einer umfangreichen Bibliothek von eingebauten Funktionen ausgeliefert. Beispiele sind Methoden auf eingebauten Objekten wie `Array.prototype.sort` und `RegExp.prototype.exec`, aber auch eine Vielzahl interner Funktionen. Da ihre Generierung lange dauert, werden eingebaute Funktionen zur Build-Zeit kompiliert und in einem [Snapshot](/blog/custom-startup-snapshots) serialisiert, der später zur Laufzeit deserialisiert wird, um den anfänglichen Zustand des JavaScript-Heaps zu erstellen.

Eingebaute Funktionen verbrauchen derzeit 700 KB in jedem Isolate (ein Isolate entspricht in etwa einem Browser-Tab in Chrome). Dies ist ziemlich ineffizient, und letztes Jahr begannen wir daran zu arbeiten, diesen Overhead zu reduzieren. In V8 v6.4 haben wir [Lazy Deserialization](/blog/lazy-deserialization) eingeführt, wodurch jedes Isolate nur für die eingebauten Funktionen zahlt, die es tatsächlich benötigt (aber jedes Isolate hatte weiterhin eine eigene Kopie).

[Eingebettete Built-ins](/blog/embedded-builtins) gehen einen Schritt weiter. Ein eingebettetes Built-in wird von allen Isolates geteilt und direkt in die Binärdatei eingebettet, anstatt es auf den JavaScript-Heap zu kopieren. Das bedeutet, dass eingebettete Funktionen im Speicher nur einmal existieren, unabhängig davon, wie viele Isolates laufen, eine besonders nützliche Eigenschaft jetzt, da [Seitenisolation](https://developers.google.com/web/updates/2018/07/site-isolation) standardmäßig aktiviert wurde. Mit eingebetteten Built-ins haben wir eine mittlere _Reduzierung der V8-Heaps-Größe um 9%_ auf den Top-10k-Websites für x64 gesehen. Von diesen Websites sparen 50% mindestens 1,2 MB, 30% sparen mindestens 2,1 MB und 10% sparen 3,7 MB oder mehr.

V8 v6.9 wird mit Unterstützung für eingebettete Built-ins auf x64-Plattformen ausgeliefert. Andere Plattformen werden bald in kommenden Versionen folgen. Weitere Details finden Sie in unserem [dedizierten Blogbeitrag](/blog/embedded-builtins).

## Leistung

### Liftoff, der neue First-Tier-Compiler für WebAssembly

WebAssembly hat einen neuen Baseline-Compiler erhalten, der einen viel schnelleren Start komplexer Websites mit großen WebAssembly-Modulen ermöglicht (wie Google Earth und AutoCAD). Abhängig von der Hardware sehen wir Beschleunigungen von mehr als dem 10-fachen. Für weitere Details siehe [den ausführlichen Liftoff-Blogbeitrag](/blog/liftoff).

<figure>
  <img src="/_img/v8-liftoff.svg" width="256" height="256" alt="" loading="lazy"/>
  <figcaption>Logo für Liftoff, V8s Baseline-Compiler für WebAssembly</figcaption>
</figure>

### Schnellere `DataView`-Operationen

[`DataView`](https://tc39.es/ecma262/#sec-dataview-objects)-Methoden wurden in V8 Torque neu implementiert, was im Vergleich zur früheren Implementierung zur Laufzeit einen kostspieligen Aufruf zu C++ erspart. Darüber hinaus inlinieren wir jetzt Aufrufe zu `DataView`-Methoden beim Kompilieren von JavaScript-Code in TurboFan, was für viel bessere Spitzenleistungen bei heißem Code sorgt. Die Verwendung von `DataView`s ist jetzt genauso effizient wie die Verwendung von `TypedArray`s, wodurch `DataView`s endlich zur praktikablen Wahl in leistungskritischen Situationen werden. Wir werden dies ausführlicher in einem kommenden Blogbeitrag über `DataView`s behandeln, bleiben Sie dran!

### Schnellere Verarbeitung von `WeakMap`s während der Speicherbereinigung

V8 v6.9 reduziert die Pausenzeit bei Mark-Compact-Speicherbereinigung durch verbesserte Verarbeitung von `WeakMap`s. Concurrent und inkrementelles Marking können nun `WeakMap`s verarbeiten, während zuvor all diese Arbeit in der finalen atomaren Pause des Mark-Compact GC erledigt wurde. Da nicht alle Arbeit außerhalb der Pause verlagert werden kann, führt der GC nun auch mehr Arbeit parallel aus, um die Pausenzeit weiter zu reduzieren. Diese Optimierungen haben die durchschnittliche Pausenzeit für Mark-Compact GC im [Web Tooling Benchmark](https://github.com/v8/web-tooling-benchmark) im Wesentlichen halbiert.

`WeakMap`-Verarbeitung verwendet einen Festpunkt-Iterationsalgorithmus, der in bestimmten Fällen zu einem quadratischen Laufzeitverhalten führen kann. Mit der neuen Version ist V8 nun in der Lage, zu einem anderen Algorithmus zu wechseln, der garantiert in linearer Zeit abgeschlossen wird, falls die GC innerhalb einer bestimmten Anzahl von Iterationen nicht fertig wird. Zuvor konnten Worst-Case-Beispiele konstruiert werden, bei denen die GC einige Sekunden brauchte, um selbst bei einem relativ kleinen Heap fertig zu werden, während der lineare Algorithmus innerhalb weniger Millisekunden abschließt.

## JavaScript-Sprachfeatures

V8 v6.9 unterstützt [`Array.prototype.flat` und `Array.prototype.flatMap`](/features/array-flat-flatmap).

`Array.prototype.flat` glättet ein gegebenes Array rekursiv bis zur angegebenen `depth`, die standardmäßig auf `1` gesetzt ist:

```js
// Eine Ebene glätten:
const array = [1, [2, [3]]];
array.flat();
// → [1, 2, [3]]

// Rekursiv glätten, bis das Array keine verschachtelten Arrays mehr enthält:
array.flat(Infinity);
// → [1, 2, 3]
```

`Array.prototype.flatMap` ähnelt `Array.prototype.map`, glättet jedoch das Ergebnis in ein neues Array.

```js
[2, 3, 4].flatMap((x) => [x, x * 2]);
// → [2, 4, 3, 6, 4, 8]
```

Weitere Details finden Sie in [unserem `Array.prototype.{flat,flatMap}`-Erläuterung](/features/array-flat-flatmap).

## V8 API

Verwenden Sie bitte `git log branch-heads/6.8..branch-heads/6.9 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem [aktiven V8-Checkout](/docs/source-code#using-git) können `git checkout -b 6.9 -t branch-heads/6.9` verwenden, um die neuen Funktionen in V8 v6.9 auszuprobieren. Alternativ können Sie [den Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
