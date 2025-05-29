---
title: "Wie V8 die reale Leistung misst"
author: "das V8-Team"
date: "2016-12-21 13:33:37"
tags: 
  - Benchmarks
description: "Das V8-Team hat eine neue Methodik entwickelt, um die reale JavaScript-Leistung zu messen und zu verstehen."
---
Im letzten Jahr hat das V8-Team eine neue Methodik entwickelt, um die reale JavaScript-Leistung zu messen und zu verstehen. Wir haben die gewonnenen Erkenntnisse genutzt, um die Art und Weise zu ändern, wie das V8-Team JavaScript schneller macht. Unser neuer Fokus auf die reale Welt stellt eine bedeutende Verschiebung gegenüber unserem traditionellen Leistungsfokus dar. Wir sind zuversichtlich, dass diese Methodik im Jahr 2017 die Fähigkeit der Nutzer und Entwickler, sich auf vorhersehbare Leistung von V8 für echtes JavaScript in Chrome und Node.js zu verlassen, erheblich verbessern wird.

<!--truncate-->
Das alte Sprichwort „Was gemessen wird, wird verbessert“ gilt besonders in der Welt der Entwicklung von JavaScript-Virtual-Maschinen (VM). Die Wahl der richtigen Metriken zur Leistungsoptimierung ist eines der wichtigsten Dinge, die ein VM-Team im Laufe der Zeit tun kann. Die folgende Zeitleiste veranschaulicht grob, wie sich die JavaScript-Benchmarking seit der ersten Veröffentlichung von V8 entwickelt hat:

![Entwicklung der JavaScript-Benchmarks](/_img/real-world-performance/evolution.png)

Historisch gesehen haben V8 und andere JavaScript-Engines die Leistung mit synthetischen Benchmarks gemessen. Anfangs verwendeten VM-Entwickler Mikrobenchmarks wie [SunSpider](https://webkit.org/perf/sunspider/sunspider.html) und [Kraken](http://krakenbenchmark.mozilla.org/). Mit der Reifung des Browsermarkts begann eine zweite Benchmarking-Ära, in der größere, aber dennoch synthetische Test-Suites wie [Octane](http://chromium.github.io/octane/) und [JetStream](http://browserbench.org/JetStream/) verwendet wurden.

Mikrobenchmarks und statische Test-Suites haben einige Vorteile: Sie sind leicht zu starten, einfach zu verstehen und können in jedem Browser ausgeführt werden, was eine vergleichende Analyse erleichtert. Aber diese Bequemlichkeit bringt eine Reihe von Nachteilen mit sich. Da sie nur eine begrenzte Anzahl von Testfällen enthalten, ist es schwierig, Benchmarks zu entwerfen, die die Merkmale des Webs insgesamt genau widerspiegeln. Darüber hinaus werden Benchmarks in der Regel selten aktualisiert; daher haben sie Schwierigkeiten, mit neuen Trends und Mustern der JavaScript-Entwicklung Schritt zu halten. Schließlich haben VM-Entwickler im Laufe der Jahre jede Ecke und Winkel der traditionellen Benchmarks erkundet und dabei Möglichkeiten entdeckt und genutzt, Benchmark-Ergebnisse zu verbessern, indem sie Arbeit während der Ausführung der Benchmarks verschieben oder sogar überspringen, sofern diese extern nicht beobachtbar ist. Diese Art von benchmark-score-getriebener Verbesserung und Überoptimierung für Benchmarks bietet nicht immer viel Nutzen für Benutzer oder Entwickler, und die Geschichte hat gezeigt, dass es langfristig sehr schwierig ist, einen „nicht manipulierbaren“ synthetischen Benchmark zu erstellen.

## Messen von echten Websites: WebPageReplay & Runtime Call Stats

Angesichts der Intuition, dass wir mit traditionellen statischen Benchmarks nur einen Teil der Leistungsstory sahen, machte sich das V8-Team daran, die reale Leistung zu messen, indem es das Laden tatsächlicher Websites benchmarkte. Wir wollten Anwendungsfälle messen, die widerspiegeln, wie Endbenutzer tatsächlich im Web surfen, und beschlossen, Leistungsmetriken von Websites wie Twitter, Facebook und Google Maps abzuleiten. Mit einem Stück Chrome-Infrastruktur namens [WebPageReplay](https://github.com/chromium/web-page-replay) konnten wir Seitenladevorgänge deterministisch aufzeichnen und abspielen.

Parallel dazu haben wir ein Tool namens Runtime Call Stats entwickelt, das es uns ermöglichte, zu analysieren, wie verschiedene JavaScript-Codes unterschiedliche V8-Komponenten belasteten. Zum ersten Mal hatten wir nicht nur die Möglichkeit, V8-Änderungen problemlos gegen echte Websites zu testen, sondern auch vollständig zu verstehen, wie und warum V8 unter unterschiedlichen Workloads unterschiedlich arbeitete.

Wir überwachen jetzt Änderungen anhand eines Test-Suites von etwa 25 Websites, um die Optimierung von V8 zu leiten. Zusätzlich zu den oben genannten Websites und anderen aus den Alexa Top 100 haben wir Websites ausgewählt, die mit gängigen Frameworks (React, Polymer, Angular, Ember und mehr) implementiert wurden, Websites aus verschiedenen geografischen Regionen und Websites oder Bibliotheken, deren Entwicklungsteams mit uns zusammengearbeitet haben, wie Wikipedia, Reddit, Twitter und Webpack. Wir glauben, dass diese 25 Websites repräsentativ für das Web im Allgemeinen sind und dass Leistungsverbesserungen auf diesen Websites direkt in ähnlichen Geschwindigkeitsverbesserungen für Websites widergespiegelt werden, die heute von JavaScript-Entwicklern geschrieben werden.

Für eine ausführliche Präsentation über die Entwicklung unserer Test-Suite von Websites und Runtime Call Stats sehen Sie sich die [BlinkOn 6 Präsentation über reale Leistung](https://www.youtube.com/watch?v=xCx4uC7mn6Y) an. Sie können sogar [das Runtime Call Stats-Tool selbst ausführen](/docs/rcs).

## Einen echten Unterschied machen

Die Analyse dieser neuen, realen Leistungsmetriken und deren Vergleich mit traditionellen Benchmarks mit Hilfe von Runtime Call Stats hat uns tiefere Einblicke gegeben, wie verschiedene Arbeitslasten V8 auf unterschiedliche Weise belasten.

Aus diesen Messungen haben wir festgestellt, dass die Octane-Leistung tatsächlich ein schlechter Stellvertreter für die Leistung auf der Mehrheit der 25 getesteten Websites war. Sie können dies im unten stehenden Diagramm sehen: Die Farbverteilung von Octane unterscheidet sich stark von jeder anderen Arbeitslast, insbesondere von denen der realen Websites. Bei der Ausführung von Octane ist die Engstelle von V8 häufig die Ausführung von JavaScript-Code. Die meisten realen Websites hingegen belasten stattdessen den Parser und Compiler von V8. Wir erkannten, dass Optimierungen, die für Octane vorgenommen wurden, oft keine Auswirkungen auf reale Webseiten hatten und in einigen Fällen diese [Optimierungen reale Websites langsamer machten](https://benediktmeurer.de/2016/12/16/the-truth-about-traditional-javascript-benchmarks/#a-closer-look-at-octane).

![Verteilung der Laufzeit bei Ausführung von Octane, der Einzelschritte von Speedometer und dem Laden von Websites aus unserem Test-Suite auf Chrome 57](/_img/real-world-performance/startup-distribution.png)

Wir haben auch festgestellt, dass ein anderer Benchmark tatsächlich ein besserer Stellvertreter für echte Websites war. [Speedometer](http://browserbench.org/Speedometer/), ein WebKit-Benchmark, der Anwendungen enthält, die in React, Angular, Ember und anderen Frameworks geschrieben sind, zeigte ein sehr ähnliches Laufzeitprofil wie die 25 Sites. Obwohl kein Benchmark die Genauigkeit realer Webseiten erreicht, glauben wir, dass Speedometer die realen Arbeitslasten moderner JavaScript-Anwendungen im Web besser approximiert als Octane.

## Fazit: ein schnellerer V8 für alle

Im Laufe des letzten Jahres hat die Test-Suite für reale Websites und unser Runtime Call Stats-Tool es uns ermöglicht, V8-Leistungsoptimierungen zu liefern, die das Laden von Seiten insgesamt um durchschnittlich 10-20% beschleunigen. Angesichts des historischen Schwerpunkts auf der Optimierung des Seitenladens in Chrome ist eine zweistellige Verbesserung dieser Kennzahl im Jahr 2016 eine bedeutende Leistung. Die gleichen Optimierungen haben auch unsere Punktzahl im Speedometer um 20-30% verbessert.

Diese Leistungsverbesserungen sollten sich auch in anderen Websites widerspiegeln, die von Webentwicklern mit modernen Frameworks und ähnlichen JavaScript-Mustern geschrieben wurden. Unsere Verbesserungen an Built-ins wie `Object.create` und [`Function.prototype.bind`](https://benediktmeurer.de/2015/12/25/a-new-approach-to-function-prototype-bind/), Optimierungen im Zusammenhang mit dem Objektfabrikmuster, Arbeiten an den [Inline-Caches](https://en.wikipedia.org/wiki/Inline_caching) von V8 und laufende Parser-Verbesserungen sollen allgemein anwendbare Verbesserungen in bisher übersehenen Bereichen von JavaScript sein, die von allen Entwicklern genutzt werden, nicht nur von den repräsentativen Websites, die wir verfolgen.

Wir planen, unsere Nutzung realer Websites auszuweiten, um die Leistungsarbeit von V8 zu leiten. Bleiben Sie gespannt auf weitere Einblicke in Benchmarks und Skriptleistung.
