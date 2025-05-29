---
title: &apos;V8-Version v8.4&apos;
author: &apos;Camillo Bruni, genießt einige frische Booleans&apos;
avatars:
 - &apos;camillo-bruni&apos;
date: 2020-06-30
tags:
 - Veröffentlichung
description: &apos;V8 v8.4 bietet schwache Referenzen und verbesserte WebAssembly-Leistung.&apos;
tweet: &apos;1277983235641761795&apos;
---
Alle sechs Wochen erstellen wir als Teil unseres [Veröffentlichungsprozesses](https://v8.dev/docs/release-process) einen neuen V8-Branch. Jede Version wird direkt vom Git-Master von V8 abgeleitet, bevor ein Chrome Beta-Meilenstein erreicht wird. Heute präsentieren wir stolz unsere neueste Version, [V8 Version 8.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.4), die sich bis zur Veröffentlichung in Koordination mit Chrome 84 Stable in einigen Wochen in der Beta-Phase befindet. V8 v8.4 ist voller Entwickler-freundlicher Features. Dieser Beitrag bietet einen Ausblick auf einige Highlights in Erwartung der Veröffentlichung.

<!--truncate-->
## WebAssembly

### Verbesserte Startzeit

Der Basiskompilierer von WebAssembly ([Liftoff](https://v8.dev/blog/liftoff)) unterstützt jetzt [atomare Anweisungen](https://github.com/WebAssembly/threads) und [Bulk-Memory-Operationen](https://github.com/WebAssembly/bulk-memory-operations). Das bedeutet, dass selbst bei Verwendung dieser relativ neuen Spezifikationserweiterungen extrem schnelle Startzeiten erreicht werden.

### Besseres Debugging

Im Rahmen kontinuierlicher Bemühungen, das Debugging in WebAssembly zu verbessern, können wir nun jedes aktive WebAssembly-Frame untersuchen, wenn die Ausführung angehalten oder ein Haltepunkt erreicht wird.
Dies wurde durch die Wiederverwendung von [Liftoff](https://v8.dev/blog/liftoff) für Debugging realisiert. Früher musste der gesamte Code, der Haltepunkte hatte oder schrittweise durchlaufen wurde, im WebAssembly-Interpreter ausgeführt werden, was die Ausführung erheblich verlangsamte (oft um das 100-fache). Mit Liftoff verliert man nur etwa ein Drittel der Leistung, kann jedoch den gesamten Code durchgehen und ihn jederzeit untersuchen.

### SIMD-Origin-Testphase

Das SIMD-Vorschlag ermöglicht es WebAssembly, häufig verfügbare Hardware-Vektor-Anweisungen zu nutzen, um rechenintensive Arbeitslasten zu beschleunigen. V8 bietet [Unterstützung](https://v8.dev/features/simd) für den [WebAssembly-SIMD-Vorschlag](https://github.com/WebAssembly/simd). Um dies in Chrome zu aktivieren, verwenden Sie das Flag `chrome://flags/#enable-webassembly-simd` oder melden Sie sich für einen [Origin-Test](https://developers.chrome.com/origintrials/#/view_trial/-4708513410415853567) an. [Origin-Tests](https://github.com/GoogleChrome/OriginTrials/blob/gh-pages/developer-guide.md) ermöglichen es Entwicklern, eine Funktion zu testen, bevor sie standardisiert wird, und wertvolles Feedback zu geben. Sobald eine Origin-Website in den Test aufgenommen wurde, werden Benutzer für die Dauer des Testzeitraums automatisch in die Funktion integriert, ohne Chrome-Flags aktualisieren zu müssen.

## JavaScript

### Schwache Referenzen und Finalizer

:::note
**Warnung!** Schwache Referenzen und Finalizer sind fortgeschrittene Funktionen! Sie hängen vom Verhalten der Speicherbereinigung ab. Speicherbereinigung ist nicht deterministisch und erfolgt möglicherweise überhaupt nicht.
:::

JavaScript ist eine Speicher-bereinigende Sprache, was bedeutet, dass Speicher, der von Objekten belegt wird, die für das Programm nicht mehr erreichbar sind, automatisch freigegeben werden kann, wenn der Speicherbereiniger läuft. Mit Ausnahme von Referenzen in `WeakMap` und `WeakSet` sind alle Referenzen in JavaScript stark und verhindern, dass das referenzierte Objekt durch die Speicherbereinigung freigegeben wird. Zum Beispiel:

```js
const globalRef = {
  callback() { console.log(&apos;foo&apos;); }
};
// Solange globalRef über den globalen Scope erreichbar ist,
// werden weder es noch die Funktion in seiner callback-Eigenschaft entfernt.
```

JavaScript-Programmierer können nun Objekte schwach über die `WeakRef`-Funktion referenzieren. Objekte, die durch schwache Referenzen referenziert werden, verhindern nicht, dass sie durch die Speicherbereinigung freigegeben werden, sofern sie nicht auch stark referenziert werden.

```js
const globalWeakRef = new WeakRef({
  callback() { console.log(&apos;foo&apos;); }
});

(async function() {
  globalWeakRef.deref().callback();
  // Ausgabelog: „foo”. globalWeakRef ist garantiert lebendig
  // für die erste Runde der Event-Loop, nachdem es erstellt wurde.

  await new Promise((resolve, reject) => {
    setTimeout(() => { resolve(&apos;foo&apos;); }, 42);
  });
  // Warte eine Runde der Event-Loop.

  globalWeakRef.deref()?.callback();
  // Das Objekt innerhalb von globalWeakRef könnte durch die Speicherbereinigung
  // entfernt werden, nachdem die erste Runde abgeschlossen ist, da es
  // anderweitig nicht erreichbar ist.
})();
```

Die Begleitfunktion von `WeakRef`s ist `FinalizationRegistry`, die es Programmierern ermöglicht, Rückrufe zu registrieren, die ausgeführt werden, nachdem ein Objekt durch die Speicherbereinigung entfernt wurde. Zum Beispiel könnte das folgende Programm `42` in die Konsole ausgeben, nachdem das unerreichbare Objekt in der IIFE entfernt wurde.

```js
const registry = new FinalizationRegistry((heldValue) => {
  console.log(heldValue);
});

(function () {
  const garbage = {};
  registry.register(garbage, 42);
  // Das zweite Argument ist der „gehaltene“ Wert, der beim Entfernen des ersten Arguments
})();
```

Finalizer werden im Event-Loop ausgeführt und unterbrechen niemals die synchrone JavaScript-Ausführung.

Dies sind fortgeschrittene und leistungsstarke Funktionen, und mit etwas Glück benötigt Ihr Programm sie nicht. Bitte lesen Sie unsere [Erklärung](https://v8.dev/features/weak-references), um mehr darüber zu erfahren!

### Private Methoden und Accessoren

Private Felder, die in v7.4 eingeführt wurden, wurden um Unterstützung für private Methoden und Accessoren erweitert. Syntaktisch beginnen die Namen privater Methoden und Accessoren mit `#`, genau wie private Felder. Das Folgende ist ein kurzer Einblick in die Syntax.

```js
class Component {
  #privateMethod() {
    console.log("Ich bin nur innerhalb von Component aufrufbar!");
  }
  get #privateAccessor() { return 42; }
  set #privateAccessor(x) { }
}
```

Private Methoden und Accessoren haben die gleichen Geltungsbereichsregeln und Semantik wie private Felder. Bitte lesen Sie unsere [Erklärung](https://v8.dev/features/class-fields), um mehr zu erfahren.

Vielen Dank an [Igalia](https://twitter.com/igalia) für die Mitwirkung an der Implementierung!

## V8 API

Bitte verwenden Sie `git log branch-heads/8.3..branch-heads/8.4 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem aktiven V8-Checkout können `git checkout -b 8.4 -t branch-heads/8.4` verwenden, um mit den neuen Funktionen in V8 v8.4 zu experimentieren. Alternativ können Sie [den Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
