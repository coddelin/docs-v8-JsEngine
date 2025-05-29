---
title: &apos;V8 Version v6.0&apos;
author: &apos;das V8-Team&apos;
date: 2017-06-09 13:33:37
tags:
  - Veröffentlichung
description: &apos;V8 v6.0 bringt mehrere Leistungsverbesserungen mit sich und führt Unterstützung für `SharedArrayBuffer` sowie Rest-/Spread-Eigenschaften für Objekte ein.&apos;
---
Alle sechs Wochen erstellen wir einen neuen Zweig von V8 im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process). Jede Version wird unmittelbar vor einem Chrome-Beta-Meilenstein vom Git-Master von V8 abgezweigt. Heute freuen wir uns, unseren neuesten Zweig anzukündigen: [V8 Version 6.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.0), der bis zur Veröffentlichung in Zusammenhang mit Chrome 60 Stable in einigen Wochen in der Beta bleibt. V8 6.0 ist voller spannender Funktionen für Entwickler. Wir möchten Ihnen einen Ausblick auf einige Highlights geben, um die Veröffentlichung vorzubereiten.

<!--truncate-->
## `SharedArrayBuffer`s

V8 v6.0 führt Unterstützung für [`SharedArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer) ein, einen Low-Level-Mechanismus zur gemeinsamen Nutzung von Speicher zwischen JavaScript-Workern und zur Synchronisierung des Kontrollflusses über Worker hinweg. SharedArrayBuffers ermöglichen JavaScript den Zugriff auf gemeinsamen Speicher, Atomics und Futexes. Sie öffnen auch die Möglichkeit, Anwendungen mit Threads über asm.js oder WebAssembly ins Web zu bringen.

Für ein kurzes, niedrigstufiges Tutorial lesen Sie die Spec-[Tutorial-Seite](https://github.com/tc39/ecmascript_sharedmem/blob/master/TUTORIAL.md) oder konsultieren Sie die [Emscripten-Dokumentation](https://kripken.github.io/emscripten-site/docs/porting/pthreads.html) zur Portierung von Pthreads.

## Objekt-Rest-/Spread-Eigenschaften

Diese Version führt Rest-Eigenschaften für die Destrukturierungszuweisung von Objekten und Spread-Eigenschaften für Objektliterale ein. Objekt-Rest-/Spread-Eigenschaften sind Stage-3-ES.next-Funktionen.

Spread-Eigenschaften bieten auch eine knappe Alternative zu `Object.assign()` in vielen Situationen.

```js
// Rest-Eigenschaften für die Destrukturierungszuweisung von Objekten:
const person = {
  firstName: &apos;Sebastian&apos;,
  lastName: &apos;Markbåge&apos;,
  country: &apos;USA&apos;,
  state: &apos;CA&apos;,
};
const { firstName, lastName, ...rest } = person;
console.log(firstName); // Sebastian
console.log(lastName); // Markbåge
console.log(rest); // { country: &apos;USA&apos;, state: &apos;CA&apos; }

// Spread-Eigenschaften für Objektliterale:
const personCopy = { firstName, lastName, ...rest };
console.log(personCopy);
// { firstName: &apos;Sebastian&apos;, lastName: &apos;Markbåge&apos;, country: &apos;USA&apos;, state: &apos;CA&apos; }
```

Weitere Informationen finden Sie in [unserem Erklärartikel zu Objekt-Rest- und Spread-Eigenschaften](/features/object-rest-spread).

## ES2015 Leistung

V8 v6.0 verbessert weiterhin die Leistung von ES2015-Funktionen. Diese Version enthält Optimierungen an Sprachfeature-Implementierungen, die insgesamt zu einer ungefähr 10%igen Verbesserung der [ARES-6](http://browserbench.org/ARES-6/)-Bewertung von V8 führen.

## V8 API

Bitte sehen Sie sich unsere [Zusammenfassung der API-Änderungen](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit) an. Dieses Dokument wird einige Wochen nach jeder Hauptveröffentlichung regelmäßig aktualisiert.

Entwickler mit einem [aktiven V8-Checkout](/docs/source-code#using-git) können `git checkout -b 6.0 -t branch-heads/6.0` verwenden, um die neuen Funktionen in V8 6.0 auszuprobieren. Alternativ können Sie [den Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst testen.
