---
title: 'V8 Release v6.8'
author: 'Das V8-Team'
date: 2018-06-21 13:33:37
tags:
  - Veröffentlichung
description: 'V8 v6.8 bietet reduzierten Speicherverbrauch und mehrere Leistungsverbesserungen.'
tweet: '1009753739060826112'
---
Alle sechs Wochen erstellen wir einen neuen Zweig von V8 im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process). Jede Version wird direkt vor einem Chrome-Beta-Meilenstein vom Git-Master von V8 abgezweigt. Heute freuen wir uns, unseren neuesten Zweig ankündigen zu können, [V8 Version 6.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.8), der bis zur Veröffentlichung in Zusammenarbeit mit Chrome 68 Stable in einigen Wochen in der Beta-Phase ist. V8 v6.8 ist voller Entwickler-feindlicher Leckerbissen. Dieses Posting bietet eine Vorschau auf einige Highlights in Erwartung der Veröffentlichung.

<!--truncate-->
## Speicher

JavaScript-Funktionen hielten unnötig äußere Funktionen und deren Metadaten (bekannt als `SharedFunctionInfo` oder `SFI`) am Leben. Insbesondere bei stark funktionalem Code, der auf kurzlebige IIFEs angewiesen ist, konnte dies zu unerwarteten Speicherlecks führen. Vor dieser Änderung hielt ein aktiver `Context` (d. h. eine Heap-Darstellung einer Funktionsaktivierung) den `SFI` der Funktion am Leben, die den Kontext erstellt hatte:

![](/_img/v8-release-68/context-jsfunction-before.svg)

Indem der `Context` auf ein `ScopeInfo`-Objekt verweist, das die für das Debugging notwendige abgemagerte Information enthält, können wir die Abhängigkeit vom `SFI` durchbrechen.

![](/_img/v8-release-68/context-jsfunction-after.svg)

Wir haben bereits auf mobilen Geräten über einen Satz der Top 10 Seiten eine Verbesserung des V8-Speichers um 3 % festgestellt.

Parallel dazu haben wir den Speicherverbrauch von `SFI`s selbst reduziert, unnötige Felder entfernt oder sie, wenn möglich, komprimiert und ihre Größe um ~25 % verringert. Weitere Reduzierungen folgen in zukünftigen Versionen. Wir haben festgestellt, dass `SFI`s 2–6 % des V8-Speichers auf typischen Websites einnehmen, sogar nachdem sie vom Kontext getrennt wurden, sodass Sie Speicherverbesserungen bei Code mit einer großen Anzahl von Funktionen sehen sollten.

## Leistung

### Verbesserungen beim Array-Destructuring

Der optimierende Compiler generierte keinen idealen Code für Array-Destructuring. Beispielsweise war das Tauschen von Variablen mit `[a, b] = [b, a]` bisher doppelt so langsam wie `const tmp = a; a = b; b = tmp`. Sobald wir Escape-Analysen freigeben konnten, um alle temporären Zuweisungen zu eliminieren, ist das Array-Destructuring mit einem temporären Array genauso schnell wie eine einfache Zuweisungssequenz.

### Verbesserungen bei `Object.assign`

Bisher hatte `Object.assign` einen schnellen Pfad, der in C++ geschrieben wurde. Das bedeutete, dass die JavaScript-zu-C++-Grenze für jeden `Object.assign`-Aufruf überschritten werden musste. Eine offensichtliche Möglichkeit, die eingebaute Leistung zu verbessern, war die Implementierung eines schnellen Pfads auf der JavaScript-Seite. Wir hatten zwei Optionen: entweder es als eingebaute native JS zu implementieren (was in diesem Fall zu unnötiger Überkopfbelastung führen würde), oder es [unter Verwendung der CodeStubAssembler-Technologie](/blog/csa) zu implementieren (die mehr Flexibilität bietet). Wir entschieden uns für die letztere Lösung. Die neue Implementierung von `Object.assign` verbessert den Score von [Speedometer2/React-Redux um etwa 15 %, verbessert den gesamten Score von Speedometer 2 um 1,5 %](https://chromeperf.appspot.com/report?sid=d9ea9a2ae7cd141263fde07ea90da835cf28f5c87f17b53ba801d4ac30979558&start_rev=550155&end_rev=552590).

### Verbesserungen bei `TypedArray.prototype.sort`

`TypedArray.prototype.sort` hat zwei Pfade: einen schnellen Pfad, der verwendet wird, wenn der Nutzer keine Vergleichsfunktion bereitstellt, und einen langsamen Pfad für alles andere. Bis jetzt wiederverwendete der langsame Pfad die Implementierung von `Array.prototype.sort`, die viel mehr tut, als für das Sortieren von `TypedArray`s notwendig ist. V8 v6.8 ersetzt den langsamen Pfad durch eine Implementierung in [CodeStubAssembler](/blog/csa). (Nicht direkt CodeStubAssembler, sondern eine domänenspezifische Sprache, die darauf aufbaut).

Die Leistung beim Sortieren von `TypedArray`s ohne Vergleichsfunktion bleibt gleich, während es bis zu 2,5× schneller ist, wenn eine Vergleichsfunktion verwendet wird.

![](/_img/v8-release-68/typedarray-sort.svg)

## WebAssembly

In V8 v6.8 können Sie beginnen, [trap-basierte Grenzprüfung](https://docs.google.com/document/d/17y4kxuHFrVxAiuCP_FFtFA2HP5sNPsCD10KEx17Hz6M/edit) auf Linux x64-Plattformen zu verwenden. Diese Speicherverwaltungsoptimierung verbessert die Ausführungsgeschwindigkeit von WebAssembly erheblich. Sie wird bereits in Chrome 68 verwendet und in Zukunft werden schrittweise weitere Plattformen unterstützt.

## V8 API

Bitte verwenden Sie `git log branch-heads/6.7..branch-heads/6.8 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem [aktiven V8-Checkout](/docs/source-code#using-git) können `git checkout -b 6.8 -t branch-heads/6.8` verwenden, um mit den neuen Funktionen in V8 v6.8 zu experimentieren. Alternativ können Sie den [Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
