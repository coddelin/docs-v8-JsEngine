---
title: "V8-Version v9.6"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars: 
 - "ingvar-stepanyan"
date: 2021-10-13
tags: 
 - Veröffentlichung
description: "Die V8-Version v9.6 bringt Unterstützung für Referenztypen zu WebAssembly."
tweet: "1448262079476076548"
---
Alle vier Wochen erstellen wir einen neuen Zweig von V8 im Rahmen unseres [Veröffentlichungsprozesses](https://v8.dev/docs/release-process). Jede Version wird direkt vor einem Chrome-Beta-Meilenstein aus dem Git-Master von V8 abgezweigt. Heute freuen wir uns, unseren neuesten Zweig anzukündigen, [V8-Version 9.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.6), der sich bis zur Veröffentlichung in Zusammenarbeit mit Chrome 96 Stable in einigen Wochen in der Beta-Phase befindet. V8 v9.6 ist vollgepackt mit allerlei Entwickler-Boni. Dieser Beitrag bietet einen Überblick über einige der Highlights als Vorfreude auf die Veröffentlichung.

<!--truncate-->
## WebAssembly

### Referenztypen

Der [Vorschlag für Referenztypen](https://github.com/WebAssembly/reference-types/blob/master/proposals/reference-types/Overview.md), der in V8 v9.6 implementiert wurde, ermöglicht die Verwendung externer Referenzen aus JavaScript undurchsichtig in WebAssembly-Modulen. Der Datentyp `externref` (ehemals als `anyref` bekannt) bietet eine sichere Möglichkeit, eine Referenz auf ein JavaScript-Objekt zu halten, und ist vollständig in V8s Müllsammler integriert.

Einige Toolchains, die bereits optionale Unterstützung für Referenztypen bieten, sind [wasm-bindgen für Rust](https://rustwasm.github.io/wasm-bindgen/reference/reference-types.html) und [AssemblyScript](https://www.assemblyscript.org/compiler.html#command-line-options).

## V8-API

Bitte verwenden Sie `git log branch-heads/9.5..branch-heads/9.6 include/v8\*.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem aktiven V8-Checkout können `git checkout -b 9.6 -t branch-heads/9.6` verwenden, um mit den neuen Funktionen in V8 v9.6 zu experimentieren. Alternativ können Sie sich [für den Beta-Kanal von Chrome anmelden](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
