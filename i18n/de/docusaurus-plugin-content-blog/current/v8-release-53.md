---
title: 'V8-Version v5.3'
author: 'das V8-Team'
date: 2016-07-18 13:33:37
tags:
  - Veröffentlichung
description: 'V8 v5.3 bietet Leistungsverbesserungen und einen geringeren Speicherverbrauch.'
---
Ungefähr alle sechs Wochen erstellen wir einen neuen Branch von V8 im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process). Jede Version wird direkt vor der Erstellung eines Chrome-Beta-Meilensteins aus dem Git-Master von V8 abgezweigt. Heute freuen wir uns, unseren neuesten Branch anzukündigen, [V8-Version 5.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.3), der bis zu seiner Veröffentlichung in Verbindung mit Chrome 53 Stable in der Beta bleiben wird. V8 v5.3 ist vollgepackt mit allerlei Entwicklerfunktionen, und wir möchten Ihnen eine Vorschau auf einige der Highlights geben, die in wenigen Wochen veröffentlicht werden.

<!--truncate-->
## Speicher

### Neuer Ignition-Interpreter

Ignition, V8s neuer Interpreter, ist funktionsfertig und wird in Chrome 53 für Android-Geräte mit geringem Speicher aktiviert. Der Interpreter bringt sofortige Speicherersparnisse für JIT-Code und ermöglicht V8 zukünftige Optimierungen für einen schnelleren Start während der Codeausführung. Ignition arbeitet gemeinsam mit V8s bestehenden Optimierungskompilern (TurboFan und Crankshaft), um sicherzustellen, dass „heißer“ Code weiterhin für maximale Leistung optimiert wird. Wir arbeiten weiterhin an der Verbesserung der Interpreterleistung und hoffen, Ignition bald auf allen Plattformen, Mobilgeräten und Desktops, aktivieren zu können. Suchen Sie in einem kommenden Blogbeitrag nach weiteren Informationen zu Ignitions Design, Architektur und Leistungsgewinnen. Eingebettete Versionen von V8 können den Ignition-Interpreter mit dem Flag `--ignition` aktivieren.

### Reduzierte Ruckler

V8 v5.3 enthält verschiedene Änderungen zur Reduzierung von Anwendungsrucklern und Müllsammelzeiten. Zu diesen Änderungen gehören:

- Optimierung schwacher globaler Handles, um den Aufwand für externe Speicherverarbeitung zu reduzieren
- Vereinheitlichung des Heaps für vollständige Müllsammlungen, um Evakuierungsruckler zu reduzieren
- Optimierung von V8s [Black Allocation](/blog/orinoco)-Erweiterungen während der Müllsammlungsmarkierungsphase

Zusammen reduzieren diese Verbesserungen die Pausenzeiten vollständiger Müllsammlungen um etwa 25 %, gemessen beim Durchsuchen eines Korpus beliebter Webseiten. Weitere Details zu den kürzlichen Optimierungen der Müllsammlung zur Reduzierung von Rucklern finden Sie in den „Jank Busters“-Blogbeiträgen [Teil 1](/blog/jank-busters) & [Teil 2](/blog/orinoco).

## Leistung

### Verbesserung der Seitenstartzeit

Das V8-Team hat kürzlich damit begonnen, Leistungsverbesserungen anhand eines Korpus von 25 echten Webseitenladevorgängen (einschließlich beliebter Websites wie Facebook, Reddit, Wikipedia und Instagram) zu verfolgen. Zwischen V8 v5.1 (gemessen in Chrome 51 von April) und V8 v5.3 (gemessen in einer aktuellen Chrome Canary 53) haben wir die Startzeit insgesamt über die gemessenen Webseiten um ~7% verbessert. Diese Verbesserungen beim Laden von echten Webseiten spiegelten ähnliche Gewinne im Speedometer-Benchmark wider, der in V8 v5.3 um 14 % schneller lief. Weitere Details zu unserem neuen Testframework, Laufzeitverbesserungen und Analysen zum Ablauf, wie V8 Zeit während des Seitenladevorgangs verbringt, finden Sie in unserem kommenden Blogbeitrag zur Startleistung.

### ES2015 `Promise`-Leistung

Die Leistung von V8 im [Bluebird ES2015 `Promise`-Benchmark-Suite](https://github.com/petkaantonov/bluebird/tree/master/benchmark) hat sich in V8 v5.3 um 20–40 % verbessert, je nach Architektur und Benchmark.

![V8s Promise-Leistung im Zeitverlauf auf einem Nexus 5x](/_img/v8-release-53/promise.png)

## V8-API

Bitte sehen Sie sich unsere [Zusammenfassung der API-Änderungen](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit) an. Dieses Dokument wird einige Wochen nach jeder Hauptversion regelmäßig aktualisiert.

Entwickler mit einem [aktiven V8-Checkout](https://v8.dev/docs/source-code#using-git) können `git checkout -b 5.3 -t branch-heads/5.3` verwenden, um die neuen Funktionen in V8 5.3 auszuprobieren. Alternativ können Sie [den Chrome-Beta-Kanal abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
