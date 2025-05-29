---
title: "V8-Version v7.0"
author: "Michael Hablich"
avatars:
  - michael-hablich
date: 2018-10-15 17:17:00
tags:
  - Veröffentlichung
description: "V8 v7.0 beinhaltet WebAssembly-Threads, Symbol.prototype.description und eingebettete Built-Ins auf weiteren Plattformen!"
tweet: "1051857446279532544"
---
Alle sechs Wochen erstellen wir einen neuen Branch von V8 im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process). Jede Version wird unmittelbar vor einem Chrome-Beta-Meilenstein von V8s Git-Master abgezweigt. Heute freuen wir uns, unseren neuesten Branch anzukündigen, [V8 Version 7.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.0), der sich bis zur Veröffentlichung in Chrome 70 Stable in einigen Wochen in der Beta-Phase befindet. V8 v7.0 ist gefüllt mit allerlei Entwickler-freundlichen Funktionen. Dieser Beitrag bietet einen Vorgeschmack auf einige Highlights zur Vorbereitung der Veröffentlichung.

<!--truncate-->
## Eingebettete Built-Ins

[Eingebettete Built-Ins](/blog/embedded-builtins) sparen Speicher, indem generierter Code zwischen mehreren V8-Isolates geteilt wird. Ab V8 v6.9 haben wir eingebettete Built-Ins auf x64 aktiviert. V8 v7.0 bringt diese Speicherersparnisse auf alle restlichen Plattformen außer ia32.

## Ein Vorgeschmack auf WebAssembly-Threads

WebAssembly (Wasm) ermöglicht die Kompilierung von in C++ und anderen Sprachen geschriebenem Code, um im Web ausgeführt zu werden. Eine sehr nützliche Funktion nativer Anwendungen ist die Möglichkeit, Threads zu verwenden – ein Grundelement für parallele Berechnungen. Die meisten C- und C++-Entwickler kennen Pthreads, eine standardisierte API für die Verwaltung von Anwendungs-Threads.

Die [WebAssembly Community Group](https://www.w3.org/community/webassembly/) arbeitet daran, Threads ins Web zu bringen, um echte multithread-fähige Anwendungen zu ermöglichen. Im Rahmen dieser Bemühungen hat V8 die notwendige Unterstützung für Threads in der WebAssembly-Engine implementiert. Um diese Funktion in Chrome zu verwenden, können Sie sie über `chrome://flags/#enable-webassembly-threads` aktivieren, oder Ihre Website kann sich für einen [Origin Trial](https://github.com/GoogleChrome/OriginTrials) anmelden. Origin Trials ermöglichen Entwicklern, mit neuen Web-Funktionen zu experimentieren, bevor sie vollständig standardisiert sind. Dies hilft uns, Feedback aus der Praxis zu sammeln, das für die Validierung und Verbesserung neuer Funktionen entscheidend ist.

## JavaScript-Sprachfunktionen

[Eine `description`-Eigenschaft](https://tc39.es/proposal-Symbol-description/) wird zu `Symbol.prototype` hinzugefügt. Dies bietet eine ergonomischere Möglichkeit, die Beschreibung eines `Symbol` zuzugreifen. Bisher konnte die Beschreibung nur indirekt über `Symbol.prototype.toString()` abgerufen werden. Vielen Dank an Igalia für die Implementierung!

`Array.prototype.sort` ist jetzt ab V8 v7.0 stabil. Bisher verwendete V8 einen instabilen QuickSort für Arrays mit mehr als 10 Elementen. Jetzt verwenden wir den stabilen TimSort-Algorithmus. Weitere Details finden Sie in [unserem Blogbeitrag](/blog/array-sort).

## V8 API

Bitte verwenden Sie `git log branch-heads/6.9..branch-heads/7.0 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem [aktiven V8-Checkout](/docs/source-code#using-git) können `git checkout -b 7.0 -t branch-heads/7.0` verwenden, um die neuen Funktionen in V8 v7.0 zu testen. Alternativ können Sie [auf den Chrome-Beta-Kanal abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
