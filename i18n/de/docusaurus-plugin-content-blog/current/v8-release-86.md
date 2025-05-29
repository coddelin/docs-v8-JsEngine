---
title: 'V8-Veröffentlichung v8.6'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), ein Keyboard-Fuzzer'
avatars:
 - 'ingvar-stepanyan'
date: 2020-09-21
tags:
 - Veröffentlichung
description: 'Die V8-Veröffentlichung v8.6 bringt respektvollen Code, Leistungsverbesserungen und normative Änderungen mit sich.'
tweet: '1308062287731789825'
---
Alle sechs Wochen erstellen wir einen neuen V8-Zweig im Rahmen unseres [Veröffentlichungsprozesses](https://v8.dev/docs/release-process). Jede Version wird direkt vor einem Chrome-Beta-Meilenstein von V8’s Git-Master abgezweigt. Heute freuen wir uns, unseren neuesten Zweig bekanntzugeben, [V8 Version 8.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.6), der sich bis zur Veröffentlichung in Zusammenarbeit mit Chrome 86 Stable in einigen Wochen in der Beta-Phase befindet. V8 v8.6 ist voller Entwickler-freundlicher Technologien. In diesem Beitrag bieten wir eine Vorschau auf einige Highlights zur Vorbereitung auf die Veröffentlichung.

<!--truncate-->
## Respektvoller Code

Die Version v8.6 macht die V8-Codebasis [respektvoller](https://v8.dev/docs/respectful-code). Das Team schloss sich einem Chromium-weiten Einsatz an, um Googles Verpflichtungen zur Rassengerechtigkeit einzuhalten, indem einige unsensible Begriffe im Projekt ersetzt wurden. Dies ist ein fortlaufender Prozess, und jeder externe Beitragende ist willkommen, mitzuhelfen! Die Liste der noch verfügbaren Aufgaben finden Sie [hier](https://docs.google.com/document/d/1rK7NQK64c53-qbEG-N5xz7uY_QUVI45sUxinbyikCYM/edit).

## JavaScript

### Open-Source-JS-Fuzzer

JS-Fuzzer ist ein mutationsbasierter JavaScript-Fuzzer, der ursprünglich von Oliver Chang entwickelt wurde. Er war in der Vergangenheit ein Eckpfeiler für V8’s [Stabilität](https://bugs.chromium.org/p/chromium/issues/list?q=ochang_js_fuzzer%20label%3AStability-Crash%20label%3AClusterfuzz%20-status%3AWontFix%20-status%3ADuplicate&can=1) und [Sicherheit](https://bugs.chromium.org/p/chromium/issues/list?q=ochang_js_fuzzer%20label%3ASecurity%20label%3AClusterfuzz%20-status%3AWontFix%20-status%3ADuplicate&can=1) und ist jetzt [Open Source](https://chromium-review.googlesource.com/c/v8/v8/+/2320330).

Der Fuzzer verändert bestehende cross-engine Testfälle unter Verwendung von [Babel](https://babeljs.io/) AST-Transformationen, die durch erweiterbare [Mutator-Klassen](https://chromium.googlesource.com/v8/v8/+/320d98709f/tools/clusterfuzz/js_fuzzer/mutators/) konfiguriert werden. Kürzlich haben wir auch begonnen, eine Instanz des Fuzzers im Differential-Testmodus laufen zu lassen, um JavaScript-[Korrektheitsprobleme](https://bugs.chromium.org/p/chromium/issues/list?q=blocking%3A1050674%20-status%3ADuplicate&can=1) zu erkennen. Beiträge sind willkommen! Weitere Informationen finden Sie in der [README](https://chromium.googlesource.com/v8/v8/+/master/tools/clusterfuzz/js_fuzzer/README.md).

### Geschwindigkeitsverbesserungen in `Number.prototype.toString`

Die Konvertierung einer JavaScript-Zahl in eine Zeichenkette kann im Allgemeinen überraschend komplex sein; wir müssen Gleitkommagenauigkeit, wissenschaftliche Notation, NaNs, Unendlichkeiten, Rundungen und so weiter berücksichtigen. Wir wissen nicht einmal, wie groß die resultierende Zeichenkette sein wird, bevor wir sie berechnen. Aufgrund dessen fiel unsere Implementierung von `Number.prototype.toString` auf eine C++-Runtime-Funktion zurück.

Aber oft möchte man einfach nur eine einfache, kleine Ganzzahl (ein „Smi“) ausgeben. Dies ist eine viel einfachere Operation, und der Overhead des Aufrufs einer C++-Runtime-Funktion ist nicht mehr gerechtfertigt. Deshalb haben wir zusammen mit unseren Freunden von Microsoft einen einfachen schnellen Pfad für kleine Ganzzahlen zu `Number.prototype.toString` hinzugefügt, der in Torque geschrieben wurde, um diesen Overhead für diesen häufigen Fall zu reduzieren. Diese Verbesserung hat die Microbenchmarks für das Drucken von Zahlen um ~75% beschleunigt.

### `Atomics.wake` entfernt

`Atomics.wake` wurde in `Atomics.notify` umbenannt, um einer Spezifikationsänderung [in v7.3](https://v8.dev/blog/v8-release-73#atomics.notify) zu entsprechen. Der veraltete Alias `Atomics.wake` wurde nun entfernt.

### Kleine normative Änderungen

- Anonyme Klassen haben jetzt eine `.name`-Eigenschaft, deren Wert die leere Zeichenkette `''` ist. [Spezifikationsänderung](https://github.com/tc39/ecma262/pull/1490).
- Die Escape-Sequenzen `\8` und `\9` sind in Template-String-Literalen im [lockeren Modus](https://developer.mozilla.org/de/docs/Glossary/Sloppy_mode) und in allen Zeichenkettenliteralen im [strikten Modus](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Strict_mode) jetzt ungültig. [Spezifikationsänderung](https://github.com/tc39/ecma262/pull/2054).
- Das eingebaute `Reflect`-Objekt besitzt jetzt eine `Symbol.toStringTag`-Eigenschaft, deren Wert `'Reflect'` ist. [Spezifikationsänderung](https://github.com/tc39/ecma262/pull/2057).

## WebAssembly

### SIMD auf Liftoff

Liftoff ist der Basis-Compiler für WebAssembly und wird seit V8 v8.5 auf allen Plattformen ausgeliefert. Der [SIMD-Vorschlag](https://v8.dev/features/simd) ermöglicht es WebAssembly, die häufiger verfügbaren Hardware-Vektor-Instruktionen zu nutzen, um rechenintensive Arbeitslasten zu beschleunigen. Er befindet sich derzeit in einer [Origin Trial](https://v8.dev/blog/v8-release-84#simd-origin-trial), die Entwicklern erlaubt, eine Funktion auszuprobieren, bevor sie standardisiert wird.

Bis jetzt wurde SIMD nur in TurboFan implementiert, V8's High-End-Compiler. Dies ist notwendig, um die maximale Leistung aus den SIMD-Instruktionen zu erhalten. WebAssembly-Module, die SIMD-Instruktionen verwenden, haben einen schnelleren Start und oft bessere Laufzeitleistung als ihre skalaren Gegenstücke, die mit TurboFan kompiliert wurden. Zum Beispiel: Angenommen, eine Funktion nimmt ein Array von Floats und beschränkt dessen Werte auf Null (hier aus Klarheitsgründen in JavaScript geschrieben):

```js
function clampZero(f32array) {
  for (let i = 0; i < f32array.length; ++i) {
    if (f32array[i] < 0) {
      f32array[i] = 0;
    }
  }
}
```

Lassen Sie uns zwei verschiedene Implementierungen dieser Funktion vergleichen, wobei Liftoff und TurboFan verwendet werden:

1. Eine skalare Implementierung, bei der die Schleife 4 Mal entrollt wird.
2. Eine SIMD-Implementierung, die die `i32x4.max_s`-Instruktion verwendet.

Wenn man die skalare Implementierung mit Liftoff als Basis verwendet, sehen wir folgende Ergebnisse:

![Ein Graph, der zeigt, dass Liftoff SIMD etwa 2.8× schneller ist als Liftoff-Skalar, verglichen mit TurboFan SIMD, das etwa 7.5× schneller ist](/_img/v8-release-86/simd.svg)

### Schnellere Wasm-zu-JS-Aufrufe

Wenn WebAssembly eine importierte JavaScript-Funktion aufruft, wird ein sogenannter „Wasm-to-JS Wrapper“ (oder „Import-Wrapper“) verwendet. Dieser Wrapper [übersetzt die Argumente](https://webassembly.github.io/spec/js-api/index.html#tojsvalue) zu Objekten, die JavaScript versteht. Wenn der JavaScript-Aufruf zurückkehrt, übersetzt er die Rückgabewerte [zurück zu WebAssembly](https://webassembly.github.io/spec/js-api/index.html#towebassemblyvalue).

Um sicherzustellen, dass das JavaScript-`arguments`-Objekt genau die Argumente widerspiegelt, die von WebAssembly übergeben wurden, wird ein sogenannter „arguments adapter trampoline“ verwendet, wenn eine Abweichung in der Anzahl der Argumente festgestellt wird.

In vielen Fällen ist dies jedoch nicht erforderlich, da die aufgerufene Funktion das `arguments`-Objekt nicht verwendet. In V8.6 haben wir einen [Patch](https://crrev.com/c/2317061) von unseren Microsoft-Mitwirkenden eingeführt, der in diesen Fällen den Aufruf über den Arguments-Adapter vermeidet, was die betroffenen Aufrufe deutlich schneller macht.

## V8 API

### Erkennung von ausstehenden Hintergrundaufgaben mit `Isolate::HasPendingBackgroundTasks`

Die neue API-Funktion `Isolate::HasPendingBackgroundTasks` erlaubt Embedders zu überprüfen, ob ausstehende Hintergrundarbeiten vorliegen, die schließlich neue Vordergrundaufgaben posten werden, wie beispielsweise die WebAssembly-Kompilierung.

Diese API sollte das Problem lösen, bei dem ein Embedder V8 herunterfährt, obwohl noch ausstehende WebAssembly-Kompilierung vorliegt, die letztlich die weitere Skriptausführung auslösen wird. Mit `Isolate::HasPendingBackgroundTasks` kann der Embedder auf neue Vordergrundaufgaben warten, anstatt V8 herunterzufahren.

Bitte verwenden Sie `git log branch-heads/8.5..branch-heads/8.6 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem aktiven V8-Checkout können `git checkout -b 8.6 -t branch-heads/8.6` nutzen, um die neuen Funktionen in V8 v8.6 auszuprobieren. Alternativ können Sie [Chrome’s Beta-Kanal abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
