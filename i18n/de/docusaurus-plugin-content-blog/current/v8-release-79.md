---
title: "V8 Veröffentlichung v7.9"
author: "Santiago Aboy Solanes, Spezialist für Zeigerkompression"
avatars:
  - "santiago-aboy-solanes"
date: 2019-11-20
tags:
  - veröffentlichung
description: "V8 v7.9 entfernt die Deprecation für Double ⇒ Tagged-Übergänge, ermöglicht das Handling von API-Gettern in Builtins, OSR-Caching und bietet Wasm-Unterstützung für mehrere Codebereiche."
tweet: "1197187184304050176"
---
Alle sechs Wochen erstellen wir einen neuen Branch von V8 im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process). Jede Version wird direkt vor einem Chrome-Beta-Meilenstein aus dem Git-Master von V8 heraus getrackt. Heute freuen wir uns, unseren neuesten Branch [V8 Version 7.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.9) anzukündigen, der bis zur Veröffentlichung in Koordination mit Chrome 79 Stable in einigen Wochen in der Beta-Phase ist. V8 v7.9 ist vollgepackt mit allerlei Entwickler-freundlichen Extras. Dieser Beitrag gibt einen Vorgeschmack auf einige Highlights als Vorfreude auf die Veröffentlichung.

<!--truncate-->
## Leistung (Größe & Geschwindigkeit)

### Entfernte Deprecation für Double ⇒ Tagged-Übergänge

Sie erinnern sich vielleicht aus früheren Blogbeiträgen, dass V8 nachverfolgt, wie Felder in den Objektformen dargestellt werden. Wenn sich die Darstellung eines Feldes ändert, muss die aktuelle Objektform „deprecated“ werden, und es wird eine neue Form mit der neuen Felddarstellung erstellt.

Eine Ausnahme hiervon ist, wenn alte Feldwerte garantiert mit der neuen Darstellung kompatibel sind. In diesen Fällen können wir die neue Darstellung einfach direkt in der Objektform austauschen, und sie funktioniert weiterhin für die alten Feldwerte. In V8 v7.6 haben wir diese In-Place-Darstellungsänderungen für Smi ⇒ Tagged und HeapObject ⇒ Tagged-Übergänge aktiviert, konnten jedoch Double ⇒ Tagged aufgrund unserer MutableHeapNumber-Optimierung nicht vermeiden.

In V8 v7.9 haben wir MutableHeapNumber entfernt und verwenden stattdessen HeapNumbers, die implizit änderbar sind, wenn sie einem Double-Darstellungsfeld angehören. Das bedeutet, dass wir etwas sorgfältiger mit HeapNumbers umgehen müssen (die jetzt änderbar sind, wenn sie sich in einem Double-Feld befinden, und ansonsten unveränderlich sind), aber HeapNumbers sind mit der Tagged-Darstellung kompatibel. Daher können wir auch im Fall von Double ⇒ Tagged die Deprecation vermeiden.

Diese relativ einfache Änderung hat die Speedometer AngularJS-Bewertung um 4% verbessert.

![Speedometer AngularJS score improvements](/_img/v8-release-79/speedometer-angularjs.svg)

### Handling von API-Gettern in Builtins

Bisher hat V8 beim Umgang mit von der Embedding-API (wie Blink) definierten Gettern immer einen Miss zum C++-Runtime verursacht. Dazu gehörten Getter, die in der HTML-Spezifikation definiert sind, wie `Node.nodeType`, `Node.nodeName` usw.

V8 hat den gesamten Prototypenlauf in der Builtin-Funktion durchgeführt, um den Getter zu laden, und ist dann zum Runtime gewechselt, sobald erkannt wurde, dass der Getter von der API definiert ist. Im C++-Runtime wurde die Prototypenkette erneut durchlaufen, um den Getter erneut abzurufen, bevor er ausgeführt wurde, wodurch viel Arbeit doppelt geleistet wurde.

Im Allgemeinen kann [der Inline-Caching-Mechanismus (IC)](https://mathiasbynens.be/notes/shapes-ics) dies abmildern, da V8 nach dem ersten Miss zum C++-Runtime einen IC-Handler installiert. Mit der neuen [Lazy Feedback Allocation](https://v8.dev/blog/v8-release-77#lazy-feedback-allocation) installiert V8 jedoch keine IC-Handler, bis die Funktion eine Zeit lang ausgeführt wurde.

Jetzt werden in V8 v7.9 diese Getter bereits in den Builtins verarbeitet, ohne dass ein Miss zum C++-Runtime erforderlich ist, selbst wenn keine IC-Handler installiert sind, indem spezielle API-Stubs genutzt werden, die direkt auf den API-Getter zugreifen können. Dies führt zu einem Rückgang der im IC-Runtime verbrachten Zeit um 12% im Speedometer-Backbone- und jQuery-Benchmark.

![Speedometer Backbone und jQuery improvements](/_img/v8-release-79/speedometer.svg)

### OSR-Caching

Wenn V8 erkennt, dass bestimmte Funktionen intensiv genutzt werden, werden sie für eine Optimierung beim nächsten Aufruf markiert. Wenn die Funktion erneut ausgeführt wird, kompiliert V8 sie mit dem optimierenden Compiler und nutzt den optimierten Code ab dem darauffolgenden Aufruf. Für Funktionen mit lang laufenden Schleifen ist dies jedoch nicht ausreichend. V8 verwendet eine Technik namens On-Stack-Replacement (OSR), um optimierten Code für die derzeit ausgeführte Funktion zu installieren. Dadurch können wir den optimierten Code bereits während der ersten Ausführung der Funktion nutzen, während sie in einer intensiven Schleife steckt.

Wenn die Funktion ein zweites Mal ausgeführt wird, wird sie sehr wahrscheinlich wieder OSRed. Vor V8 v7.9 mussten wir die Funktion erneut optimieren, um sie erneut OSRed zu machen. Ab v7.9 haben wir jedoch OSR-Caching hinzugefügt, um optimierten Code für OSR-Ersatz beizubehalten, der durch den Loop-Header identifiziert wird, der als Einstiegspunkt in der OSRed-Funktion verwendet wurde. Dies hat die Leistung einiger Spitzenleistungs-Benchmarks um 5–18% verbessert.

![OSR caching improvements](/_img/v8-release-79/osr-caching.svg)

## WebAssembly

### Unterstützung für mehrere Codebereiche

Bisher bestand jedes WebAssembly-Modul auf 64-Bit-Architekturen genau aus einem Codebereich, der bei der Modulerstellung reserviert wurde. Dies ermöglichte es uns, innerhalb eines Moduls Near-Calls zu verwenden, beschränkte uns jedoch auf 128 MB Codebereich auf arm64 und erforderte eine vorab reservierte Größe von 1 GB auf x64.

Mit v7.9 hat V8 Unterstützung für mehrere Codebereiche auf 64-Bit-Architekturen erhalten. Dadurch können wir nur den geschätzten benötigten Codebereich reservieren und später bei Bedarf weitere Codebereiche hinzufügen. Für Aufrufe zwischen Codebereichen, die für Near-Calls zu weit voneinander entfernt sind, wird ein Far-Jump verwendet. Statt ~1000 WebAssembly-Module pro Prozess unterstützt V8 nun mehrere Millionen, nur begrenzt durch den tatsächlichen verfügbaren Speicher.

## V8 API

Bitte nutzen Sie `git log branch-heads/7.8..branch-heads/7.9 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem [aktiven V8-Checkout](/docs/source-code#using-git) können `git checkout -b 7.9 -t branch-heads/7.9` verwenden, um mit den neuen Funktionen in V8 v7.9 zu experimentieren. Alternativ können Sie [Chrome's Beta-Kanal abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
