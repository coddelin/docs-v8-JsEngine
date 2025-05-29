---
title: 'Turbocharging V8 mit veränderlichen Heap-Zahlen'
author: '[Victor Gomes](https://twitter.com/VictorBFG), der Bit-Shifter'
avatars:
  - victor-gomes
date: 2025-02-25
tags:
  - JavaScript
  - Benchmarks
  - Internals
description: "Hinzufügen von veränderlichen Heap-Zahlen zum Skriptkontext"
tweet: ''
---

Bei V8 streben wir ständig danach, die Leistung von JavaScript zu verbessern. Im Rahmen dieser Bemühungen haben wir kürzlich die [JetStream2](https://browserbench.org/JetStream2.1/)-Benchmark-Suite geprüft, um Leistungseinbrüche zu beseitigen. Dieser Beitrag beschreibt eine spezifische Optimierung, die eine signifikante Verbesserung von `2.5x` im `async-fs`-Benchmark ergab und zu einem spürbaren Anstieg der Gesamtpunktzahl beitrug. Die Optimierung wurde durch den Benchmark inspiriert, aber solche Muster finden sich auch im [echten Code](https://github.com/WebAssembly/binaryen/blob/3339c1f38da5b68ce8bf410773fe4b5eee451ab8/scripts/fuzz_shell.js#L248).

<!--truncate-->
# Der Ziel-Benchmark `async-fs` und ein ungewöhnliches `Math.random`

Der `async-fs`-Benchmark ist, wie der Name vermuten lässt, eine JavaScript-Dateisystemimplementierung, die sich auf asynchrone Operationen konzentriert. Jedoch gibt es eine überraschende Leistungsengstelle: die Implementierung von `Math.random`. Es verwendet eine eigene, deterministische Implementierung von `Math.random` für konsistente Ergebnisse über mehrere Durchläufe hinweg. Die Implementierung lautet:

```js
let seed;
Math.random = (function() {
  return function () {
    seed = ((seed + 0x7ed55d16) + (seed << 12))  & 0xffffffff;
    seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
    seed = ((seed + 0x165667b1) + (seed << 5))   & 0xffffffff;
    seed = ((seed + 0xd3a2646c) ^ (seed << 9))   & 0xffffffff;
    seed = ((seed + 0xfd7046c5) + (seed << 3))   & 0xffffffff;
    seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;
    return (seed & 0xfffffff) / 0x10000000;
  };
})();
```

Die entscheidende Variable hier ist `seed`. Sie wird bei jedem Aufruf von `Math.random` aktualisiert und erzeugt die pseudozufällige Sequenz. Wesentlich ist, dass `seed` in einem `ScriptContext` gespeichert wird.

Ein `ScriptContext` dient als Speicherort für Werte, die innerhalb eines bestimmten Skripts zugänglich sind. Intern wird dieses Kontext als ein Array von V8's markierten Werten dargestellt. Für die Standardkonfiguration von V8 auf 64-Bit-Systemen belegt jeder dieser markierten Werte 32 Bit. Das am wenigsten signifikante Bit jedes Wertes dient als Markierung. Ein `0` zeigt ein 31-Bit _Small Integer_ (`SMI`) an. Der tatsächliche Integer-Wert wird direkt gespeichert, um ein Bit nach links verschoben. Ein `1` zeigt auf einen [komprimierten Zeiger](https://v8.dev/blog/pointer-compression), der auf ein Heap-Objekt verweist, wobei der komprimierte Zeigerwert um eins erhöht wird.

![`ScriptContext` Layout: Blaue Slots sind Zeiger auf die Kontext-Metadaten und das globale Objekt (`NativeContext`). Der gelbe Slot zeigt einen nicht markierten Double-Precision-Gleitkommawert an.](/_img/mutable-heap-number/script-context.svg)

Diese Markierung unterscheidet, wie Zahlen gespeichert werden. `SMIs` befinden sich direkt im `ScriptContext`. Größere Zahlen oder solche mit Dezimalbruchteilen werden indirekt als unveränderliche `HeapNumber`-Objekte auf dem Heap gespeichert (ein 64-Bit-Double), wobei das `ScriptContext` einen komprimierten Zeiger darauf hält. Dieser Ansatz behandelt verschiedene Zahlentypen effizient, während er für den häufigen `SMI`-Fall optimiert ist.

# Die Engstelle

Das Profiling von `Math.random` hat zwei wesentliche Leistungsprobleme offenbart:

- **`HeapNumber`-Zuweisung:** Der Slot, der der Variablen `seed` im Skriptkontext zugewiesen ist, zeigt auf eine Standard-HeapNumber, die unveränderlich ist. Jedes Mal, wenn die Funktion `Math.random` `seed` aktualisiert, muss ein neues `HeapNumber`-Objekt auf dem Heap zugewiesen werden, was zu erheblichem Druck bei der Zuweisung und Müllabfuhr führt.

- **Gleitkommamathematik:** Obwohl die Berechnungen innerhalb von `Math.random` grundsätzlich Integer-Operationen sind (unter Verwendung von bitweisen Verschiebungen und Additionen), kann der Compiler dies nicht vollständig ausnutzen. Da `seed` als generische `HeapNumber` gespeichert ist, verwendet der generierte Code langsamere Gleitkommaoperationen. Der Compiler kann nicht beweisen, dass `seed` immer einen Wert enthält, der als Integer darstellbar ist. Während der Compiler möglicherweise über 32-Bit-Integer-Bereiche spekulieren könnte, liegt der Fokus von V8 hauptsächlich auf `SMIs`. Selbst bei 32-Bit-Integer-Spekulation wäre eine möglicherweise kostspielige Konvertierung von 64-Bit-Gleitkomma zu 32-Bit-Integer, zusammen mit einer verlustfreien Überprüfung, dennoch erforderlich.

# Die Lösung

Um diese Probleme zu adressieren, haben wir eine zweistufige Optimierung implementiert:

- **Slottyp-Verfolgung / veränderbare Heap-Nummer-Slots:** Wir haben [Konstantwertverfolgung im Scriptkontext](https://issues.chromium.org/u/2/issues/42203515) (let-Variablen, die initialisiert, aber nie geändert wurden) erweitert, um Typinformationen einzuschließen. Wir verfolgen, ob der Slotwert eine Konstante, ein `SMI`, ein `HeapNumber` oder ein allgemein markierter Wert ist. Außerdem haben wir das Konzept von veränderbaren Heap-Nummer-Slots innerhalb von Scriptkontexten eingeführt, ähnlich wie bei [veränderbaren Heap-Nummernfeldern](https://v8.dev/blog/react-cliff#smi-heapnumber-mutableheapnumber) für `JSObjects`. Statt auf eine unveränderliche `HeapNumber` zu verweisen, gehört die `HeapNumber` im Slot des Scriptkontextes, und ihre Adresse sollte nicht ausgelaufen werden. Dies beseitigt die Notwendigkeit, bei jeder Aktualisierung für optimierten Code eine neue `HeapNumber` zuzuweisen. Die besessene `HeapNumber` wird selbst an Ort und Stelle verändert.

- **Veränderbare Heap `Int32`:** Wir erweitern die Slottypen des Scriptkontextes, um zu verfolgen, ob ein numerischer Wert in den `Int32`-Bereich fällt. Ist dies der Fall, speichert die veränderbare `HeapNumber` den Wert als rohes `Int32`. Falls notwendig, bietet der Übergang zu einem `double` den zusätzlichen Vorteil, dass keine Neuzuweisung der `HeapNumber` erforderlich ist. Im Fall von `Math.random` kann der Compiler nun beobachten, dass `seed` konsequent mit Ganzzahloperationen aktualisiert wird und den Slot als einen veränderbaren `Int32` kennzeichnen.

![Statusmaschine für Slottypen. Ein grüner Pfeil zeigt einen Übergang durch Speichern eines `SMI`-Wertes an. Blaue Pfeile stehen für Übergänge durch Speichern eines `Int32`-Wertes, und rote Pfeile für einen doppelt-präzisen Gleitkommawert. Der Zustand `Other` fungiert als Senkenzustand, der weitere Übergänge verhindert.](/_img/mutable-heap-number/transitions.svg)

Es ist wichtig zu verstehen, dass diese Optimierungen eine Codeabhängigkeit vom Typ des im Kontextslot gespeicherten Wertes einführen. Der durch den JIT-Compiler generierte optimierte Code verlässt sich darauf, dass der Slot einen spezifischen Typ enthält (hier ein `Int32`). Falls irgendein Code einen Wert in den `seed`-Slot schreibt, der den Typ verändert (z. B. eine Gleitkommazahl oder einen String), muss der optimierte Code deoptimiert werden. Diese Deoptimierung ist notwendig, um die Korrektheit zu gewährleisten. Daher ist die Stabilität des im Slot gespeicherten Typs entscheidend, um die Spitzenleistung aufrechtzuerhalten. Im Fall von `Math.random` stellt das Bitmaskieren im Algorithmus sicher, dass die Seed-Variable immer einen `Int32`-Wert enthält.

# Die Ergebnisse

Diese Änderungen beschleunigen die eigenartige `Math.random`-Funktion erheblich:

- **Keine Zuweisung / schnelle In-Situ-Aktualisierungen:** Der `seed`-Wert wird direkt innerhalb seines veränderbaren Slots im Scriptkontext aktualisiert. Während der Ausführung von `Math.random` werden keine neuen Objekte zugewiesen.

- **Ganzzahloperationen:** Der Compiler, der über das Wissen verfügt, dass der Slot einen `Int32` enthält, kann hochoptimierte Ganzzahlinstruktionen (Verschiebungen, Additionen usw.) generieren. Dadurch wird der Overhead der Gleitkommaarithmetik vermieden.

![`async-fs` Benchmark-Ergebnisse auf einem Mac M1. Höhere Werte sind besser.](/_img/mutable-heap-number/result.png)

Die kombinierte Wirkung dieser Optimierungen führt zu einer bemerkenswerten `~2.5x` Beschleunigung im `async-fs` Benchmark. Dies trägt wiederum zu einer `~1.6%` Verbesserung des gesamten JetStream2-Scores bei. Dies zeigt, dass scheinbar einfacher Code unerwartete Leistungsengpässe erzeugen kann und dass kleine, gezielte Optimierungen große Auswirkungen nicht nur auf den Benchmark haben können.

