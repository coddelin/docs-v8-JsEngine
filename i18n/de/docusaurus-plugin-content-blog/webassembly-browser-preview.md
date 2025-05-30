---
title: "WebAssembly-Browser-Vorschau"
author: "das V8-Team"
date: "2016-10-31 13:33:37"
tags: 
  - WebAssembly
description: "WebAssembly oder Wasm ist ein neues Laufzeit- und Kompilierungsziel für das Web, jetzt hinter einer Flagge in Chrome Canary verfügbar!"
---
Heute freuen wir uns, zusammen mit [Firefox](https://hacks.mozilla.org/2016/10/webassembly-browser-preview) und [Edge](https://blogs.windows.com/msedgedev/2016/10/31/webassembly-browser-preview/) eine WebAssembly-Browser-Vorschau anzukündigen. [WebAssembly](http://webassembly.org/) oder Wasm ist ein neues Laufzeit- und Kompilierungsziel für das Web, entwickelt von Mitarbeitern von Google, Mozilla, Microsoft, Apple und der [W3C WebAssembly Community Group](https://www.w3.org/community/webassembly/).

<!--truncate-->
## Was markiert diesen Meilenstein?

Dieser Meilenstein ist bedeutsam, weil er Folgendes markiert:

- einen Release-Kandidaten für unser [MVP](http://webassembly.org/docs/mvp/) (Minimum Viable Product)-Design (einschließlich [Semantik](http://webassembly.org/docs/semantics/), [Binärformat](http://webassembly.org/docs/binary-encoding/) und [JS-API](http://webassembly.org/docs/js/))
- kompatible und stabile Implementierungen von WebAssembly hinter einer Flagge im Hauptzweig von V8 und SpiderMonkey, in Entwicklungs-Builds von Chakra und in Arbeit in JavaScriptCore
- eine [funktionierende Toolchain](http://webassembly.org/getting-started/developers-guide/) für Entwickler zur Kompilierung von WebAssembly-Modulen aus C/C++-Quelldateien
- einen [Fahrplan](http://webassembly.org/roadmap/) zur Veröffentlichung von WebAssembly standardmäßig aktiviert, vorbehaltlich Änderungen basierend auf Feedback aus der Community

Weitere Informationen zu WebAssembly finden Sie auf der [Projektseite](http://webassembly.org/) sowie in unserem [Entwicklerhandbuch](http://webassembly.org/getting-started/developers-guide/), um die WebAssembly-Kompilierung aus C & C++ unter Verwendung von Emscripten zu testen. Die Dokumente zum [Binärformat](http://webassembly.org/docs/binary-encoding/) und zur [JS-API](http://webassembly.org/docs/js/) erläutern die binäre Codierung von WebAssembly und den Mechanismus zur Instanziierung von WebAssembly-Modulen im Browser. Hier ist ein kurzes Beispiel, das zeigt, wie wasm aussieht:

![Eine Implementierung der Funktion des größten gemeinsamen Teilers in WebAssembly, die die Rohbytes, das Textformat (WAST) und den C-Quellcode zeigt.](/_img/webassembly-browser-preview/gcd.svg)

Da WebAssembly in Chrome ([chrome://flags/#enable-webassembly](chrome://flags/#enable-webassembly)) noch hinter einer Flagge steht, wird es noch nicht für den Einsatz in der Produktion empfohlen. Die Browser-Vorschau markiert jedoch eine Zeit, in der wir aktiv [Feedback](http://webassembly.org/community/feedback/) zum Design und zur Implementierung der Spezifikation sammeln. Entwickler werden ermutigt, Anwendungen zu testen, zu kompilieren und zu portieren und diese im Browser auszuführen.

V8 optimiert weiterhin die Implementierung von WebAssembly im [TurboFan-Compiler](/blog/turbofan-jit). Seit dem letzten März, als wir die experimentelle Unterstützung erstmals angekündigt haben, haben wir die Unterstützung für parallele Kompilierung hinzugefügt. Außerdem nähern wir uns der Fertigstellung einer alternativen asm.js-Pipeline, die asm.js in WebAssembly [im Hintergrund](https://www.chromestatus.com/feature/5053365658583040) konvertiert, damit bestehende asm.js-Websites einige der Vorteile der WebAssembly-Kompilierung im Voraus nutzen können.

## Was kommt als Nächstes?

Sofern keine wesentlichen Designänderungen aufgrund von Feedback aus der Community erfolgen, plant die WebAssembly Community Group die Erstellung einer offiziellen Spezifikation im ersten Quartal 2017, zu welchem Zeitpunkt Browser dazu ermutigt werden, WebAssembly standardmäßig aktiviert auszuliefern. Ab diesem Punkt wird das Binärformat auf Version 1 zurückgesetzt und WebAssembly wird versionlos, feature-geprüft und abwärtskompatibel sein. Einen detaillierteren [Fahrplan](http://webassembly.org/roadmap/) finden Sie auf der WebAssembly-Projektseite.
