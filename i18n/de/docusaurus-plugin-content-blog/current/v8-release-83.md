---
title: &apos;V8-Version v8.3&apos;
author: &apos;[Victor Gomes](https://twitter.com/VictorBFG), sicher von zu Hause aus arbeitend&apos;
avatars:
 - &apos;victor-gomes&apos;
date: 2020-05-04
tags:
 - release
description: &apos;V8 v8.3 bietet schnellere ArrayBuffers, größere Wasm-Speicher und veraltete APIs an.&apos;
tweet: &apos;1257333120115847171&apos;
---

Alle sechs Wochen erstellen wir im Rahmen unseres [Freigabeprozesses](https://v8.dev/docs/release-process) einen neuen V8-Branch. Jede Version wird direkt vor einem Chrome-Beta-Meilenstein aus V8s Git-Master verzweigt. Heute freuen wir uns, unseren neuesten Branch anzukündigen, [V8 Version 8.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.3), der sich bis zur Veröffentlichung in Abstimmung mit Chrome 83 Stable in einigen Wochen in der Beta-Phase befindet. V8 v8.3 ist vollgepackt mit allerlei Entwickler-Features. Dieser Artikel gibt eine Vorschau auf einige der Highlights, um die Veröffentlichung vorwegzunehmen.

<!--truncate-->
## Leistung

### Schnellere `ArrayBuffer`-Verfolgung im Garbage Collector

Speicherbasen von `ArrayBuffer`s werden außerhalb des V8-Heaps mithilfe des vom Einbettungsprogramm bereitgestellten `ArrayBuffer::Allocator` zugewiesen. Diese Speicherbasen müssen freigegeben werden, wenn ihr `ArrayBuffer`-Objekt vom Garbage Collector zurückgewonnen wird. V8 v8.3 hat einen neuen Mechanismus zur Verfolgung von `ArrayBuffer`s und deren Speicherbasen, der es dem Garbage Collector ermöglicht, gleichzeitig mit der Anwendung Speicherbasen zu iterieren und freizugeben. Weitere Details finden Sie in [diesem Entwurfsdokument](https://docs.google.com/document/d/1-ZrLdlFX1nXT3z-FAgLbKal1gI8Auiaya_My-a0UJ28/edit#heading=h.gfz6mi5p212e). Dies reduzierte die Gesamtlaufzeit der GC-Pause in `ArrayBuffer`-intensiven Workloads um 50%.

### Größere Wasm-Speicher

Gemäß einer Aktualisierung der [WebAssembly-Spezifikation](https://webassembly.github.io/spec/js-api/index.html#limits) erlaubt V8 v8.3 jetzt Modulen, Speicher mit einer Größe von bis zu 4 GB anzufordern, wodurch speicherintensivere Anwendungsfälle auf von V8 betriebenen Plattformen ermöglicht werden. Bitte beachten Sie, dass so viel Speicher möglicherweise nicht immer auf dem System des Benutzers verfügbar ist; wir empfehlen, kleiner dimensionierte Speicher zu erstellen, sie bei Bedarf zu erweitern und ein Scheitern beim Vergrößern anwenderfreundlich zu behandeln.

## Fehlerbehebungen

### Schreibvorgänge in Objekte mit typisierten Arrays in der Prototyp-Kette

Gemäß der JavaScript-Spezifikation müssen wir bei der Speicherung eines Werts zum angegebenen Schlüssel die Prototyp-Kette durchsuchen, um zu sehen, ob der Schlüssel bereits auf dem Prototyp existiert. Meistens existieren diese Schlüssel nicht auf der Prototyp-Kette, und so installiert V8 schnelle Lookup-Handler, um diese Prototyp-Kettensuchen zu vermeiden, wenn dies sicher ist.

Wir haben jedoch kürzlich ein bestimmtes Szenario identifiziert, in dem V8 diesen schnellen Lookup-Handler fälschlicherweise installiert hat, was zu einem falschen Verhalten führte. Wenn `TypedArray`s in der Prototyp-Kette vorhanden sind, sollten alle Speichervorgänge zu Schlüsseln, die OOB des `TypedArray` sind, ignoriert werden. Zum Beispiel sollte im folgenden Fall `v[2]` keine Eigenschaft zu `v` hinzufügen und die nachfolgenden Lesevorgänge sollten `undefined` zurückgeben.

```js
v = {};
v.__proto__ = new Int32Array(1);
v[2] = 123;
return v[2]; // Sollte undefined zurückgeben
```

V8’s schnelle Lookup-Handler behandeln diesen Fall nicht, und wir würden stattdessen `123` im obigen Beispiel zurückgeben. V8 v8.3 behebt dieses Problem, indem schnelle Lookup-Handler nicht verwendet werden, wenn `TypedArray`s in der Prototyp-Kette vorhanden sind. Da dies kein häufiger Fall ist, haben wir in unseren Benchmarks keine Leistungseinbußen festgestellt.

## V8-API

### Veraltete experimentelle `WeakRefs`- und `FinalizationRegistry`-APIs

Die folgenden experimentellen APIs im Zusammenhang mit `WeakRefs` sind veraltet:

- `v8::FinalizationGroup`
- `v8::Isolate::SetHostCleanupFinalizationGroupCallback`

`FinalizationRegistry` (umbenannt von `FinalizationGroup`) ist Teil des [JavaScript-Vorschlags für schwache Referenzen](https://v8.dev/features/weak-references) und bietet JavaScript-Programmierern eine Möglichkeit, Finalizer zu registrieren. Diese APIs dienen dazu, dass das Einbettungsprogramm Bereinigungsaufgaben für `FinalizationRegistry` plant und ausführt, bei denen die registrierten Finalizer aufgerufen werden; sie sind veraltet, da sie nicht mehr benötigt werden. `FinalizationRegistry`-Bereinigungsaufgaben werden jetzt automatisch von V8 über den vom Einbettungsprogramm bereitgestellten Vordergrund-Task-Runner geplant und erfordern keinen zusätzlichen Einbettungscode.

### Weitere API-Änderungen

Bitte verwenden Sie `git log branch-heads/8.1..branch-heads/8.3 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem aktiven V8-Checkout können `git checkout -b 8.3 -t branch-heads/8.3` verwenden, um mit den neuen Funktionen in V8 v8.3 zu experimentieren. Alternativ können Sie sich [für den Chrome-Betakanal anmelden](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
