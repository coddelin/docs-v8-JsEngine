---
title: "JIT-loses V8"
author: "Jakob Gruber ([@schuay](https://twitter.com/schuay))"
avatars:
  - "jakob-gruber"
date: 2019-03-13 13:03:19
tags:
  - internals
description: "V8 v7.4 unterstützt die JavaScript-Ausführung ohne Zuordnung ausführbaren Speichers zur Laufzeit."
tweet: "1105777150051999744"
---
V8 v7.4 unterstützt nun die JavaScript-Ausführung ohne Zuordnung ausführbaren Speichers zur Laufzeit.

In seiner Standardkonfiguration basiert V8 stark auf der Fähigkeit, zur Laufzeit ausführbaren Speicher zuzuweisen und zu ändern. Beispielsweise erstellt der [TurboFan-Optimierungskompilierer](/blog/turbofan-jit) nativen Code für häufig aufgerufene JavaScript (JS)-Funktionen just-in-time, und die meisten regulären JS-Ausdrücke werden vom [irregexp-Motor](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html) in nativen Code kompiliert. Die Erstellung ausführbaren Speichers zur Laufzeit ist ein Teil dessen, was V8 schnell macht.

<!--truncate-->
Aber in einigen Situationen kann es wünschenswert sein, V8 ohne Zuordnung ausführbaren Speichers auszuführen:

1. Einige Plattformen (z. B. iOS, Smart-TVs, Spielkonsolen) verbieten nicht privilegierten Anwendungen den Schreibzugriff auf ausführbaren Speicher, und es war bisher unmöglich, V8 dort zu verwenden; und
1. das Verbot von Schreibzugriffen auf ausführbaren Speicher verringert die Angriffsfläche der Anwendung für Exploits.

V8's neuer JIT-loser Modus ist dafür gedacht, diese Punkte anzusprechen. Wenn V8 mit dem `--jitless`-Flag gestartet wird, läuft V8 ohne jegliche Laufzeitzuordnung von ausführbarem Speicher.

Wie funktioniert das? Im Wesentlichen wechselt V8 in einen ausschließlich Interpreter-basierten Modus auf Grundlage bestehender Technologien: Der gesamte benutzerdefinierte JS-Code wird durch den [Ignition-Interpreter](/blog/ignition-interpreter) ausgeführt, und das Musterabgleichen von regulären Ausdrücken wird ebenfalls interpretiert. WebAssembly wird derzeit nicht unterstützt, aber Interpretation liegt ebenfalls im Bereich des Möglichen. V8's Builtins sind immer noch in nativen Code kompiliert, gehören jedoch dank unserer jüngsten Bemühungen, sie in die V8-Binärdatei [einzubetten](/blog/embedded-builtins), nicht mehr zum verwalteten JS-Heap.

Letztendlich haben uns diese Änderungen ermöglicht, V8's Heap zu erstellen, ohne Ausführungsberechtigungen für irgendeinen seiner Speicherbereiche zu benötigen.

## Ergebnisse

Da der JIT-lose Modus den Optimierungskompiler deaktiviert, ist dies mit einer Leistungseinbuße verbunden. Wir haben eine Vielzahl von Benchmarks betrachtet, um besser zu verstehen, wie sich die Leistungsmerkmale von V8 ändern. [Speedometer 2.0](/blog/speedometer-2) soll eine typische Webanwendung vertreten; der [Web Tooling Benchmark](/blog/web-tooling-benchmark) enthält eine Reihe von JS-Entwicklerwerkzeugen; und wir haben auch einen Benchmark aufgenommen, der einen [Browsing-Workflow in der Living Room YouTube App](https://chromeperf.appspot.com/report?sid=518c637ffa0961f965afe51d06979375467b12b87e72061598763e5a36876306) simuliert. Alle Messungen wurden lokal auf einem x64-Linux-Desktop über 5 Läufe durchgeführt.

![JIT-los vs. Standard-V8. Werte sind auf 100 für die Standardkonfiguration von V8 normalisiert.](/_img/jitless/benchmarks.svg)

Speedometer 2.0 ist im JIT-losen Modus etwa 40% langsamer. Ungefähr die Hälfte der Regression kann auf den deaktivierten Optimierungskompiler zurückgeführt werden. Die andere Hälfte wird vom Interpreter für reguläre Ausdrücke verursacht, der ursprünglich als Debugging-Hilfe gedacht war und zukünftig Leistungsverbesserungen erfahren wird.

Der Web Tooling Benchmark verbringt tendenziell mehr Zeit in TurboFan-optimiertem Code und zeigt daher bei aktiviertem JIT-losen Modus eine größere Regression von 80%.

Letztendlich haben wir eine simulierte Browsing-Sitzung in der Living Room YouTube App gemessen, die sowohl Videowiedergabe als auch Menünavigation umfasst. Hier ist der JIT-lose Modus ungefähr gleichwertig und zeigt nur eine 6%ige Verlangsamung bei der JS-Ausführung im Vergleich zur Standardkonfiguration von V8. Dieser Benchmark zeigt, wie die Spitzenleistungsfähigkeit optimierten Codes nicht immer mit der [realen Leistung](/blog/real-world-performance) korreliert ist und dass Embeddings in vielen Situationen auch im JIT-losen Modus eine angemessene Leistung behalten können.

Der Speicherverbrauch hat sich nur geringfügig geändert, mit einem Median von 1,7% weniger Heap-Größe von V8 beim Laden eines repräsentativen Satzes an Websites.

Wir ermutigen Embeddings auf eingeschränkten Plattformen oder mit besonderen Sicherheitsanforderungen, den neuen JIT-losen Modus von V8 zu berücksichtigen, der jetzt in V8 v7.4 verfügbar ist. Wie immer sind Fragen und Feedback in der [v8-users](https://groups.google.com/forum/#!forum/v8-users) Diskussionsgruppe willkommen.

## FAQ

*Was ist der Unterschied zwischen `--jitless` und `--no-opt`?*

Mit `--no-opt` wird der TurboFan-Optimierungskompiler deaktiviert. `--jitless` deaktiviert die gesamte Laufzeitzuordnung von ausführbarem Speicher.
