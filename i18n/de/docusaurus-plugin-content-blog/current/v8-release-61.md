---
title: 'V8 Veröffentlichung v6.1'
author: 'das V8-Team'
date: 2017-08-03 13:33:37
tags:
  - Veröffentlichung
description: 'V8 v6.1 kommt mit einer reduzierten Binärgröße und enthält Leistungsverbesserungen. Zusätzlich wird asm.js jetzt validiert und in WebAssembly kompiliert.'
---
Alle sechs Wochen erstellen wir einen neuen Branch von V8 im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process). Jede Version wird direkt vor einem Chrome-Beta-Meilenstein vom Git-Master von V8 abgeleitet. Heute freuen wir uns, unseren neuesten Branch, [V8 Version 6.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.1), anzukündigen, der sich bis zu seiner Veröffentlichung in Zusammenarbeit mit Chrome 61 Stable in einigen Wochen in der Beta befindet. V8 v6.1 ist vollgepackt mit allerlei Entwicklertools. Wir möchten Ihnen einen Vorgeschmack auf einige der Highlights im Hinblick auf die Veröffentlichung geben.

<!--truncate-->
## Leistungsverbesserungen

Das Besuchen aller Elemente der Maps und Sets – entweder durch [Iteration](http://exploringjs.com/es6/ch_iteration.html) oder die Methoden [`Map.prototype.forEach`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach) / [`Set.prototype.forEach`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/forEach) – ist deutlich schneller geworden, mit einer reinen Leistungsverbesserung von bis zu 11× seit Version 6.0 von V8. Weitere Informationen finden Sie im [dedizierten Blogbeitrag](https://benediktmeurer.de/2017/07/14/faster-collection-iterators/).

![](/_img/v8-release-61/iterating-collections.svg)

Zusätzlich dazu wurde weiterhin an der Leistung anderer Sprachfunktionen gearbeitet. Beispielsweise ist die Methode [`Object.prototype.isPrototypeOf`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isPrototypeOf), die wichtig für code ist, der auf Objektliteralen und `Object.create` statt auf Klassen und Konstruktorfunktionen basiert, jetzt immer genauso schnell und oft schneller als die Verwendung des [Operators `instanceof`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof).

![](/_img/v8-release-61/checking-prototype.svg)

Funktionsaufrufe und Konstruktoraufrufe mit variabler Argumentanzahl sind ebenfalls deutlich schneller geworden. Aufrufe, die mit [`Reflect.apply`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/apply) und [`Reflect.construct`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/construct) durchgeführt werden, erhielten eine Leistungssteigerung von bis zu 17× in der neuesten Version.

![](/_img/v8-release-61/call-construct.svg)

`Array.prototype.forEach` wird jetzt in TurboFan inlined und für alle wichtigen nicht-löchrigen [Elementtypen](/blog/elements-kinds) optimiert.

## Reduzierung der Binärgröße

Das V8-Team hat den veralteten Crankshaft-Compiler vollständig entfernt, was eine signifikante Reduzierung der Binärgröße zur Folge hat. Zusammen mit der Entfernung des Builtins-Generators reduziert dies die bereitgestellte Binärgröße von V8 um über 700 KB, abhängig von der jeweiligen Plattform.

## asm.js wird jetzt validiert und in WebAssembly kompiliert

Wenn V8 asm.js-Code begegnet, versucht es jetzt, diesen zu validieren. Valider asm.js-Code wird anschließend in WebAssembly transpiliert. Laut den Leistungsevaluierungen von V8 steigert dies in der Regel die Durchsatzleistung. Aufgrund des zusätzlichen Validierungsschritts können isolierte Rückschritte in der Startleistung auftreten.

Bitte beachten Sie, dass diese Funktion standardmäßig nur auf der Chromium-Seite aktiviert wurde. Wenn Sie ein Einbettungsentwickler sind und den asm.js-Validator nutzen möchten, aktivieren Sie die Flagge `--validate-asm`.

## WebAssembly

Beim Debuggen von WebAssembly ist es jetzt möglich, lokale Variablen in den DevTools anzuzeigen, wenn ein Breakpoint im WebAssembly-Code ausgelöst wird.

## V8-API

Bitte sehen Sie sich unsere [Zusammenfassung der API-Änderungen](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit) an. Dieses Dokument wird einige Wochen nach jeder Hauptveröffentlichung regelmäßig aktualisiert.

Entwickler mit einem [aktiven V8-Checkout](/docs/source-code#using-git) können `git checkout -b 6.1 -t branch-heads/6.1` verwenden, um mit den neuen Funktionen in V8 v6.1 zu experimentieren. Alternativ können Sie sich [für den Beta-Kanal von Chrome anmelden](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
