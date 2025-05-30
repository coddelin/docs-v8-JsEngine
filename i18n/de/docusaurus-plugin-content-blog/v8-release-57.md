---
title: "V8-Version v5.7"
author: "das V8-Team"
date: "2017-02-06 13:33:37"
tags: 
  - Veröffentlichung
description: "V8 v5.7 aktiviert WebAssembly standardmäßig und enthält Leistungsverbesserungen sowie erweiterte Unterstützung für ECMAScript-Sprachfunktionen."
---
Alle sechs Wochen erstellen wir einen neuen Branch von V8 im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process). Jede Version wird direkt vor einem Chrome-Beta-Meilenstein vom Git-Master von V8 abgezweigt. Heute freuen wir uns, unseren neuesten Branch, [V8 Version 5.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.7), anzukündigen, der sich bis zur Veröffentlichung in Verbindung mit Chrome 57 Stable in einigen Wochen in der Beta-Phase befindet. V8 5.7 ist vollgepackt mit allerlei Entwickler-Features. Wir möchten Ihnen einen Vorgeschmack auf einige der Highlights geben, um die Veröffentlichung zu erwarten.

<!--truncate-->
## Leistungsverbesserungen

### Native Async-Funktionen so schnell wie Promises

Async-Funktionen sind jetzt ungefähr so schnell wie derselbe Code, der mit Promises geschrieben wurde. Die Ausführungsleistung von Async-Funktionen hat sich laut unseren [Microbenchmarks](https://codereview.chromium.org/2577393002) vervierfacht. Im gleichen Zeitraum hat sich auch die Gesamtleistung von Promises verdoppelt.

![Leistungsverbesserungen von Async in V8 unter Linux x64](/_img/v8-release-57/async.png)

### Weitere Verbesserungen bei ES2015

V8 macht weiterhin ES2015-Sprachfunktionen schneller, damit Entwickler neue Funktionen nutzen können, ohne Leistungseinbußen zu erleiden. Der Spread-Operator, Destructuring und Generatoren sind jetzt [ungefähr so schnell wie ihre naiven ES5-Äquivalente](https://fhinkel.github.io/six-speed/).

### RegExp 15% schneller

Das Migrieren von RegExp-Funktionen von einer selbst gehosteten JavaScript-Implementierung zu einer, die in die Codegenerierungsarchitektur von TurboFan eingebunden ist, hat eine etwa 15% schnellere Gesamtleistung von RegExp erbracht. Weitere Details finden Sie im [dedizierten Blogeintrag](/blog/speeding-up-regular-expressions).

## JavaScript-Sprachfunktionen

Mehrere kürzliche Ergänzungen zur ECMAScript-Standardbibliothek sind in dieser Version enthalten. Zwei String-Methoden, [`padStart`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart) und [`padEnd`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd), bieten nützliche Funktionen zur String-Formatierung, während [`Intl.DateTimeFormat.prototype.formatToParts`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat/formatToParts) Autoren die Möglichkeit gibt, ihre Datums-/Zeitformatierung auf lokalisierte Weise anzupassen.

## WebAssembly aktiviert

Chrome 57 (inklusive V8 v5.7) wird die erste Version sein, die WebAssembly standardmäßig aktiviert. Weitere Details finden Sie in den Einführungsdokumenten auf [webassembly.org](http://webassembly.org/) und in der API-Dokumentation auf [MDN](https://developer.mozilla.org/en-US/docs/WebAssembly/API).

## V8-API-Erweiterungen

Bitte werfen Sie einen Blick auf unsere [Zusammenfassung der API-Änderungen](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Dieses Dokument wird regelmäßig ein paar Wochen nach jeder Hauptveröffentlichung aktualisiert. Entwickler mit einem [aktiven V8-Checkout](/docs/source-code#using-git) können `git checkout -b 5.7 -t branch-heads/5.7` verwenden, um mit den neuen Funktionen in V8 v5.7 zu experimentieren. Alternativ können Sie [Chrome's Beta-Kanal abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.

### `PromiseHook`

Diese C++-API ermöglicht es Benutzern, Profiling-Code zu implementieren, der den Lebenszyklus von Promises nachverfolgt. Dies ermöglicht die kommende [AsyncHook-API](https://github.com/nodejs/node-eps/pull/18) von Node, mit der Sie [asynchrone Kontextweitergabe](https://docs.google.com/document/d/1tlQ0R6wQFGqCS5KeIw0ddoLbaSYx6aU7vyXOkv-wvlM/edit#) erstellen können.

Die `PromiseHook`-API bietet vier Lebenszyklus-Hooks: init, resolve, before und after. Der init-Hook wird ausgeführt, wenn ein neues Promise erstellt wird; der resolve-Hook wird ausgeführt, wenn ein Promise aufgelöst wird; die pre- und post-Hooks werden unmittelbar vor und nach einem [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob) ausgeführt. Weitere Informationen finden Sie im [Tracking-Issue](https://bugs.chromium.org/p/v8/issues/detail?id=4643) und im [Design-Dokument](https://docs.google.com/document/d/1rda3yKGHimKIhg5YeoAmCOtyURgsbTH_qaYR79FELlk/edit).
