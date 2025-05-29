---
title: 'V8-Version v6.3'
author: 'das V8-Team'
date: 2017-10-25 13:33:37
tags:
  - Veröffentlichung
description: 'V8 v6.3 enthält Leistungsverbesserungen, reduzierte Speichernutzung und Unterstützung neuer JavaScript-Sprachfunktionen.'
tweet: '923168001108643840'
---
Alle sechs Wochen erstellen wir im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process) einen neuen Branch von V8. Jede Version wird kurz vor einem Chrome-Beta-Meilenstein aus dem Git-Master von V8 abgezweigt. Heute freuen wir uns, unseren neuesten Branch, [V8-Version 6.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.3), anzukündigen, der bis zu seiner Veröffentlichung in Zusammenarbeit mit Chrome 63 Stable in einigen Wochen im Beta-Modus ist. V8 v6.3 ist vollgepackt mit allerlei Entwickler-Features. Dieser Beitrag bietet eine Vorschau auf einige der Highlights in Erwartung der Veröffentlichung.

<!--truncate-->
## Geschwindigkeit

[Jank Busters](/blog/jank-busters) III wurde als Teil des [Orinoco](/blog/orinoco)-Projekts veröffentlicht. Das gleichzeitige Markieren ([70-80%](https://chromeperf.appspot.com/report?sid=612eec65c6f5c17528f9533349bad7b6f0020dba595d553b1ea6d7e7dcce9984) des Markierens erfolgt auf einem nicht blockierenden Thread) ist ausgeliefert.

Der Parser benötigt jetzt keine [zweite Präparierung einer Funktion](https://docs.google.com/document/d/1TqpdGeLmURL2gc18s6PwNeyZOvayQJtJ16TCn0BEt48/edit#heading=h.un2pnqwbiw11) mehr. Dies führt zu einer [14% mittleren Verbesserung der Parse-Zeit](https://docs.google.com/document/d/1TqpdGeLmURL2gc18s6PwNeyZOvayQJtJ16TCn0BEt48/edit#heading=h.dvuo4tqnsmml) in unserem internen Startup-Top25-Benchmark.

`string.js` wurde komplett auf CodeStubAssembler portiert. Vielen Dank an [@peterwmwong](https://twitter.com/peterwmwong) für [seine hervorragenden Beiträge](https://chromium-review.googlesource.com/q/peter.wm.wong)! Als Entwickler bedeutet dies, dass eingebaute String-Funktionen wie `String#trim` ab Version V8 v6.3 wesentlich schneller sind.

Die Leistung von `Object.is()` ist jetzt ungefähr auf Augenhöhe mit Alternativen. Im Allgemeinen setzt V8 v6.3 den Weg zu besserer ES2015+ Leistung fort. Neben anderen Punkten haben wir die [Geschwindigkeit des polymorphen Zugriffs auf Symbole](https://bugs.chromium.org/p/v8/issues/detail?id=6367), [polymorphe Inline-Funktion von Konstruktoraufrufen](https://bugs.chromium.org/p/v8/issues/detail?id=6885) und [(markierte) Template-Literale](https://pasteboard.co/GLYc4gt.png) verbessert.

![Die Leistung von V8 in den letzten sechs Releases](/_img/v8-release-63/ares6.svg)

Die schwache optimierte Funktionsliste ist entfernt worden. Weitere Informationen finden Sie im [dedizierten Blog-Post](/blog/lazy-unlinking).

Die genannten Punkte sind eine nicht erschöpfende Liste von Leistungsverbesserungen. Es wurden viele weitere Arbeiten zur Leistung durchgeführt.

## Speicherverbrauch

[Schreibschutzmechanismen wurden auf die Verwendung des CodeStubAssembler umgestellt](https://chromium.googlesource.com/v8/v8/+/dbfdd4f9e9741df0a541afdd7516a34304102ee8). Dies spart etwa 100 KB Speicher pro isoliertem Prozess.

## JavaScript-Sprachfunktionen

V8 unterstützt jetzt die folgenden Stufe-3-Funktionen: [dynamischer Modul-Import über `import()`](/features/dynamic-import), [`Promise.prototype.finally()`](/features/promise-finally) und [asynchrone Iteratoren/Generatoren](https://github.com/tc39/proposal-async-iteration).

Mit dem [dynamischen Modul-Import](/features/dynamic-import) ist es sehr einfach, Module basierend auf Laufzeitbedingungen zu importieren. Dies ist nützlich, wenn eine Anwendung bestimmte Code-Module verzögert laden soll.

[`Promise.prototype.finally`](/features/promise-finally) ermöglicht eine einfache Bereinigung, nachdem ein Promise abgeschlossen wurde.

Das Iterieren mit asynchronen Funktionen wurde durch die Einführung von [asynchronen Iteratoren/Generatoren](https://github.com/tc39/proposal-async-iteration) ergonomischer.

Auf der `Intl`-Seite wird jetzt [`Intl.PluralRules`](/features/intl-pluralrules) unterstützt. Diese API ermöglicht leistungsstarke internationalisierte Pluralisierungen.

## Inspector/Debugging

In Chrome 63 wird [Blockabdeckung](https://docs.google.com/presentation/d/1IFqqlQwJ0of3NuMvcOk-x4P_fpi1vJjnjGrhQCaJkH4/edit#slide=id.g271d6301ff_0_44) ebenfalls in der DevTools-Benutzeroberfläche unterstützt. Bitte beachten Sie, dass das Inspektor-Protokoll die Blockabdeckung bereits seit V8 v6.2 unterstützt.

## V8 API

Bitte sehen Sie sich unsere [Zusammenfassung der API-Änderungen](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit) an. Dieses Dokument wird regelmäßig einige Wochen nach jeder Hauptveröffentlichung aktualisiert.

Entwickler mit einem [aktuellen V8-Checkout](/docs/source-code#using-git) können `git checkout -b 6.3 -t branch-heads/6.3` verwenden, um mit den neuen Funktionen in V8 v6.3 zu experimentieren. Alternativ können Sie den [Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
