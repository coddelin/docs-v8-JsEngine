---
title: 'V8-Version v5.4'
author: 'Das V8-Team'
date: 2016-09-09 13:33:37
tags:
  - Veröffentlichung
description: 'V8 v5.4 bietet Leistungsverbesserungen und reduzierten Speicherverbrauch.'
---
Alle sechs Wochen erstellen wir einen neuen Branch von V8 im Rahmen unseres [Freigabeprozesses](/docs/release-process). Jede Version wird direkt vor einem Chrome-Beta-Meilenstein vom Git-Master von V8 verzweigt. Heute freuen wir uns, unseren neuesten Branch [V8-Version 5.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.4) anzukündigen, der bis zur Veröffentlichung zusammen mit Chrome 54 Stable in einigen Wochen im Beta-Stadium bleibt. V8 v5.4 ist mit allerlei Entwickler-Features ausgestattet, und wir möchten Ihnen einen Überblick über einige Highlights in Erwartung der Veröffentlichung geben.

<!--truncate-->
## Leistungsverbesserungen

V8 v5.4 liefert eine Reihe von wichtigen Verbesserungen hinsichtlich Speicherbedarf und Startgeschwindigkeit. Dies trägt insbesondere dazu bei, die initiale Skriptausführung zu beschleunigen und die Seitenladezeit in Chrome zu reduzieren.

### Speicher

Bei der Messung des Speicherverbrauchs von V8 sind zwei Kennwerte besonders wichtig: _Maximaler Speicherverbrauch_ und _Durchschnittlicher Speicherverbrauch_. Typischerweise ist es genauso wichtig, den maximalen Verbrauch zu reduzieren wie den Durchschnitt, da ein Skript, das den verfügbaren Speicher auch nur kurzzeitig erschöpft, einen _Out of Memory_-Absturz verursachen kann, selbst wenn der durchschnittliche Verbrauch nicht sehr hoch ist. Für Optimierungszwecke ist es nützlich, den Speicher von V8 in zwei Kategorien zu unterteilen: _Heap-Speicher_, der tatsächliche JavaScript-Objekte enthält, und _Off-Heap-Speicher_, der den Rest wie interne Datenstrukturen umfasst, die vom Compiler, Parser und Garbage Collector zugewiesen werden.

In Version 5.4 haben wir den Garbage Collector von V8 für Geräte mit wenig Arbeitsspeicher (512 MB oder weniger) optimiert. Je nach angezeigter Website reduziert dies den _maximalen Speicherverbrauch_ von _Heap-Speicher_ um bis zu **40%**.

Das Speicherverwaltungssystem des JavaScript-Parsers von V8 wurde vereinfacht, um unnötige Allokationen zu vermeiden, wodurch der _Off-Heap-Maximalspeicherverbrauch_ um bis zu **20%** reduziert wurde. Diese Speicherersparnisse sind besonders hilfreich bei der Reduzierung des Speicherbedarfs großer Skriptdateien, einschließlich asm.js-Anwendungen.

### Start & Geschwindigkeit

Unsere Arbeit zur Vereinfachung des Parsers von V8 hat nicht nur geholfen, den Speicherverbrauch zu senken, sondern auch die Laufzeitleistung des Parsers verbessert. Diese Vereinfachung, kombiniert mit weiteren Optimierungen von JavaScript-Builtins und wie der Zugriff auf Eigenschaften von JavaScript-Objekten globale [Inline-Caches](https://en.wikipedia.org/wiki/Inline_caching) nutzt, führte zu spürbaren Leistungsverbesserungen beim Start.

Unsere [interne Start-Test-Suite](https://www.youtube.com/watch?v=xCx4uC7mn6Y), die die Echtwelt-JavaScript-Leistung misst, verbesserte sich um einen Median von 5%. Der [Speedometer](http://browserbench.org/Speedometer/)-Benchmark profitiert ebenfalls von diesen Optimierungen und verbessert sich um [~10 bis 13% im Vergleich zu v5.2](https://chromeperf.appspot.com/report?sid=f5414b72e864ffaa4fd4291fa74bf3fd7708118ba534187d36113d8af5772c86&start_rev=393766&end_rev=416239).

![](/_img/v8-release-54/speedometer.png)

## V8 API

Bitte werfen Sie einen Blick auf unsere [Zusammenfassung der API-Änderungen](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Dieses Dokument wird regelmäßig ein paar Wochen nach jeder Hauptversion aktualisiert.

Entwickler mit einem [aktiven V8-Checkout](/docs/source-code#using-git) können `git checkout -b 5.4 -t branch-heads/5.4` verwenden, um mit den neuen Funktionen in V8 v5.4 zu experimentieren. Alternativ können Sie [Chromes Beta-Kanal abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
