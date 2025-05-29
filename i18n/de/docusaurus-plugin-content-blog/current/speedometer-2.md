---
title: &apos;Chrome begrüßt Speedometer 2.0!&apos;
author: &apos;die Blink- und V8-Teams&apos;
date: 2018-01-24 13:33:37
tags:
  - benchmarks
description: &apos;Ein Überblick über die Leistungsverbesserungen, die wir bisher in Blink und V8 basierend auf Speedometer 2.0 erzielt haben.&apos;
tweet: &apos;956232641736421377&apos;
---
Seit der ersten Veröffentlichung von Speedometer 1.0 im Jahr 2014 verwenden die Blink- und V8-Teams den Benchmark als Proxy für die reale Nutzung von beliebten JavaScript-Frameworks, und wir haben auf diesem Benchmark erhebliche Geschwindigkeitssteigerungen erzielt. Wir haben unabhängig überprüft, dass diese Verbesserungen reale Benutzerergebnisse liefern, indem wir sie an echten Websites gemessen haben und festgestellt haben, dass Verbesserungen der Ladezeiten beliebter Websites auch die Speedometer-Wertung verbessern.

<!--truncate-->
Seitdem hat sich JavaScript schnell weiterentwickelt und mit ES2015 und späteren Standards viele neue Sprachfunktionen hinzugefügt. Das gilt auch für die Frameworks selbst, und so ist Speedometer 1.0 im Laufe der Zeit veraltet. Die Verwendung von Speedometer 1.0 als Optimierungsindikator birgt daher das Risiko, keine neueren Code-Muster zu messen, die aktiv verwendet werden.

Die Blink- und V8-Teams begrüßen [die kürzliche Veröffentlichung des aktualisierten Speedometer 2.0 Benchmarks](https://webkit.org/blog/8063/speedometer-2-0-a-benchmark-for-modern-web-app-responsiveness/). Die Anwendung des ursprünglichen Konzepts auf eine Liste zeitgenössischer Frameworks, Transpiler und ES2015-Funktionen macht den Benchmark wieder zu einem erstklassigen Kandidaten für Optimierungen. Speedometer 2.0 ist eine großartige Ergänzung für [unsere Werkzeugkiste für reale Leistungsbenchmarks](/blog/real-world-performance).

## Chromes Fortschritt bisher

Die Blink- und V8-Teams haben bereits eine erste Runde von Verbesserungen abgeschlossen, die die Bedeutung dieses Benchmarks für uns unterstreichen und unsere Reise fortsetzen, uns auf reale Leistung zu konzentrieren. Verglichen mit Chrome 60 vom Juli 2017 haben wir mit dem neuesten Chrome 64 auf einem Macbook Pro Mitte 2016 (4 Kerne, 16GB RAM) etwa eine 21%ige Verbesserung der Gesamtbewertung (Läufe pro Minute) erreicht.

![Vergleich der Speedometer-2-Scores zwischen Chrome 60 und 64](/_img/speedometer-2/scores.png)

Schauen wir uns die einzelnen Punkte von Speedometer 2.0 genauer an. Wir haben die Leistung der React-Laufzeit durch die Verbesserung von [`Function.prototype.bind`](https://chromium.googlesource.com/v8/v8/+/808dc8cff3f6530a627ade106cbd814d16a10a18) verdoppelt. Vanilla-ES2015, AngularJS, Preact und VueJS haben sich durch [Beschleunigung des JSON-Parsings](https://chromium-review.googlesource.com/c/v8/v8/+/700494) und verschiedene andere Leistungsverbesserungen um 19%–42% verbessert. Die Laufzeit der jQuery-TodoMVC-App wurde durch Verbesserungen in der DOM-Implementierung von Blink reduziert, darunter [leichtere Formularelemente](https://chromium.googlesource.com/chromium/src/+/f610be969095d0af8569924e7d7780b5a6a890cd) und [Anpassungen an unserem HTML-Parser](https://chromium.googlesource.com/chromium/src/+/6dd09a38aaae9c15adf5aad966f761f180bf1cef). Zusätzliche Optimierungen der Inline-Caches von V8 in Kombination mit dem Optimierungskompilator erzielten Verbesserungen über alle Bereiche hinweg.

![Ergebnisverbesserungen für jeden Subtest von Speedometer 2 zwischen Chrome 60 und 64](/_img/speedometer-2/improvements.png)

Eine wesentliche Änderung gegenüber Speedometer 1.0 ist die Berechnung der Endbewertung. Zuvor begünstigte der Durchschnitt aller Bewertungen die Arbeit an nur den langsamsten Punkten. Wenn man die absoluten Zeiten betrachtet, die für jeden einzelnen Punkt aufgewendet werden, sieht man beispielsweise, dass die EmberJS-Debug-Version etwa 35-mal so lange dauert wie der schnellste Benchmark. Daher hat die Fokussierung auf EmberJS-Debug das größte Potenzial, um die Gesamtbewertung zu verbessern.

![](/_img/speedometer-2/time.png)

Speedometer 2.0 verwendet das geometrische Mittel für die Endbewertung und bevorzugt gleiche Investitionen in jedes Framework. Lassen Sie uns unsere kürzliche 16,5%ige Verbesserung von Preact betrachten. Es wäre ziemlich unfair, auf die 16,5%ige Verbesserung zu verzichten, nur weil ihr Anteil an der Gesamtzeit gering ist.

Wir freuen uns darauf, weitere Leistungsverbesserungen für Speedometer 2.0 und damit für das gesamte Web zu bringen. Bleiben Sie dran für weitere Leistungs-High-Fives.
