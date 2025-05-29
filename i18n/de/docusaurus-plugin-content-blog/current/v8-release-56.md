---
title: &apos;V8 Version v5.6&apos;
author: &apos;das V8-Team&apos;
date: 2016-12-02 13:33:37
tags:
  - Veröffentlichung
description: &apos;V8 v5.6 kommt mit einer neuen Compiler-Pipeline, Leistungsverbesserungen und erweitertem Support für ECMAScript-Sprachfunktionen.&apos;
---
Alle sechs Wochen erstellen wir im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process) einen neuen V8-Zweig. Jede Version wird direkt vor einem Chrome-Beta-Meilenstein von V8s Git-Master verzweigt. Heute freuen wir uns, unseren neuesten Zweig, [V8 Version 5.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.6), anzukündigen, der bis zur Veröffentlichung in Zusammenarbeit mit Chrome 56 Stable in einigen Wochen in der Beta-Phase sein wird. V8 5.6 ist vollgepackt mit allerlei Entwickler-Features, daher möchten wir Ihnen einen Vorgeschmack auf einige Highlights geben, die mit der Veröffentlichung erwartet werden.

<!--truncate-->
## Ignition- und TurboFan-Pipeline für ES.next (und mehr) ausgeliefert

Ab Version 5.6 kann V8 die gesamte JavaScript-Sprache optimieren. Darüber hinaus werden viele Sprachfunktionen durch eine neue Optimierungs-Pipeline in V8 verarbeitet. Diese Pipeline verwendet den [Ignition-Interpreter](/blog/ignition-interpreter) von V8 als Grundlage und optimiert häufig ausgeführte Methoden mit dem leistungsstärkeren [TurboFan-Optimierungskompilierer](/docs/turbofan) von V8. Die neue Pipeline wird für neue Sprachfunktionen aktiviert (z. B. viele der neuen Funktionen aus den ES2015- und ES2016-Spezifikationen) oder wann immer Crankshaft ([der „klassische“ Optimierungskompilierer von V8](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html)) eine Methode nicht optimieren kann (z. B. try-catch, with).

Warum leiten wir nur einige JavaScript-Sprachfunktionen durch die neue Pipeline? Die neue Pipeline eignet sich besser für die Optimierung des gesamten Spektrums der JS-Sprache (vergangene und gegenwärtige Funktionen). Es handelt sich um eine gesündere, modernere Codebasis, die speziell für reale Anwendungsfälle entwickelt wurde, einschließlich der Ausführung von V8 auf Geräten mit wenig Speicher.

Wir haben begonnen, Ignition/TurboFan mit den neuesten ES.next-Funktionen zu verwenden, die wir zu V8 hinzugefügt haben (ES.next = JavaScript-Funktionen, wie in ES2015 und später spezifiziert), und werden künftig mehr Funktionen durch diese Pipeline leiten, während wir ihre Leistung weiterhin verbessern. Mittelfristig strebt das V8-Team an, die gesamte JavaScript-Ausführung in V8 auf die neue Pipeline umzustellen. Solange es jedoch noch reale Anwendungsfälle gibt, in denen Crankshaft JavaScript schneller ausführt als die neue Ignition/TurboFan-Pipeline, werden wir in der kurzen Frist beide Pipelines unterstützen, um sicherzustellen, dass JavaScript-Code in V8 in allen Situationen so schnell wie möglich ausgeführt wird.

Warum verwendet die neue Pipeline sowohl den neuen Ignition-Interpreter als auch den neuen TurboFan-Optimierungskompilierer? JavaScript schnell und effizient auszuführen erfordert mehrere Mechanismen oder Ebenen unter der Haube einer JavaScript-virtuellen Maschine, um die niedrigstufige Ausführungsarbeit zu leisten. Zum Beispiel ist es hilfreich, eine erste Ebene zu haben, die schnell mit der Ausführung von Code beginnt, und eine zweite Optimierungsebene, die länger an der Kompilierung von häufig genutzten Funktionen arbeitet, um die Leistung für langfristig laufenden Code zu maximieren.

Ignition und TurboFan sind V8s zwei neue Ausführungsebenen, die zusammen am effektivsten funktionieren. Aufgrund von Effizienz-, Einfachheits- und Größenüberlegungen wurde TurboFan darauf ausgelegt, JavaScript-Methoden zu optimieren, indem er mit dem [Bytecode](https://en.wikipedia.org/wiki/Bytecode) arbeitet, der vom Ignition-Interpreter von V8 erzeugt wird. Durch die enge Abstimmung der beiden Komponenten können Optimierungen vorgenommen werden, die nur aufgrund der Präsenz der anderen möglich sind. Infolgedessen werden ab Version 5.6 alle Funktionen, die von TurboFan optimiert werden, zunächst durch den Ignition-Interpreter ausgeführt. Die Verwendung dieser einheitlichen Ignition/TurboFan-Pipeline ermöglicht die Optimierung von Funktionen, die in der Vergangenheit nicht optimierbar waren, da sie nun die Optimierungsmöglichkeiten von TurboFan nutzen können. Zum Beispiel hat sich durch die Leitung von [Generatoren](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) durch sowohl Ignition als auch TurboFan die Laufzeitleistung von Generatoren fast verdreifacht.

Weitere Informationen zu V8s Weg zur Einführung von Ignition und TurboFan finden Sie in [Benedikts ausführlichem Blogbeitrag](https://benediktmeurer.de/2016/11/25/v8-behind-the-scenes-november-edition/).

## Leistungsverbesserungen

V8 v5.6 liefert eine Reihe wichtiger Verbesserungen im Speicher- und Leistungsprofil.

### Speicherbedingtes Ruckeln

[Gleichzeitiges Remembered-Set-Filtering](https://bugs.chromium.org/p/chromium/issues/detail?id=648568) wurde eingeführt: Ein weiterer Schritt in Richtung [Orinoco](/blog/orinoco).

### Stark verbesserte ES2015-Leistung

Entwickler beginnen typischerweise mit der Verwendung neuer Sprachfunktionen mit Hilfe von Transpilern aufgrund zweier Herausforderungen: Rückwärtskompatibilität und Leistungsbedenken.

Das Ziel von V8 ist es, die Leistungslücke zwischen Transpilern und der „native“ ES.next-Leistung von V8 zu schließen, um die letztgenannte Herausforderung zu beseitigen. Wir haben große Fortschritte gemacht, um die Leistung neuer Sprachfunktionen auf das Niveau ihrer transpilierten ES5-Äquivalente zu bringen. In dieser Version finden Sie, dass die Leistung der ES2015-Funktionen deutlich schneller ist als in früheren V8-Versionen und in einigen Fällen die ES2015-Leistung der von ES5 transpilierten Äquivalente annähert.

Insbesondere der [Spread](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Operators/Spread_operator)-Operator sollte jetzt bereit sein, nativ verwendet zu werden. Anstatt Folgendes zu schreiben…

```js
// Wie Math.max, aber gibt 0 statt -∞ für keine Argumente zurück.
function specialMax(...args) {
  if (args.length === 0) return 0;
  return Math.max.apply(Math, args);
}
```

…können Sie jetzt Folgendes schreiben…

```js
function specialMax(...args) {
  if (args.length === 0) return 0;
  return Math.max(...args);
}
```

…und erzielen ähnliche Leistungsergebnisse. Insbesondere enthält V8 v5.6 Beschleunigungen für die folgenden Mikro-Benchmarks:

- [Destructuring](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring)
- [Destructuring-Array](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring-array)
- [Destructuring-String](https://github.com/fhinkel/six-speed/tree/master/tests/destructuring-string)
- [For-of-Array](https://github.com/fhinkel/six-speed/tree/master/tests/for-of-array)
- [Generator](https://github.com/fhinkel/six-speed/tree/master/tests/generator)
- [Spread](https://github.com/fhinkel/six-speed/tree/master/tests/spread)
- [Spread-Generator](https://github.com/fhinkel/six-speed/tree/master/tests/spread-generator)
- [Spread-Literal](https://github.com/fhinkel/six-speed/tree/master/tests/spread-literal)

Siehe das folgende Diagramm für einen Vergleich zwischen V8 v5.4 und v5.6.

![Vergleich der ES2015-Funktionsleistung von V8 v5.4 und v5.6 mit [SixSpeed](https://fhinkel.github.io/six-speed/)](/_img/v8-release-56/perf.png)

Dies ist erst der Anfang; es gibt noch viel mehr in zukünftigen Versionen!

## Sprachfunktionen

### `String.prototype.padStart` / `String.prototype.padEnd`

[`String.prototype.padStart`](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String/padStart) und [`String.prototype.padEnd`](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd) sind die neuesten Stage-4-Ergänzungen für ECMAScript. Diese Bibliotheksfunktionen werden offiziell in v5.6 ausgeliefert.

:::note
**Hinweis:** Wieder zurückgezogen.
:::

## WebAssembly-Vorschau im Browser

Chromium 56 (das V8 v5.6 enthält) wird die WebAssembly-Browser-Vorschau ausliefern. Weitere Informationen finden Sie im [dedizierten Blogeintrag](/blog/webassembly-browser-preview).

## V8 API

Bitte überprüfen Sie unsere [Zusammenfassung der API-Änderungen](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Dieses Dokument wird regelmäßig einige Wochen nach jeder Hauptveröffentlichung aktualisiert.

Entwickler mit einem [aktiven V8-Checkout](/docs/source-code#using-git) können `git checkout -b 5.6 -t branch-heads/5.6` verwenden, um die neuen Funktionen in V8 v5.6 auszuprobieren. Alternativ können Sie [Chrome’s Beta-Kanal abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
