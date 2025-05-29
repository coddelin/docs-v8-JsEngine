---
title: 'Kurze eingebaute Aufrufe'
author: '[Toon Verwaest](https://twitter.com/tverwaes), Der große Short'
avatars:
  - toon-verwaest
date: 2021-05-06
tags:
  - JavaScript
description: 'In V8 v9.1 haben wir die eingebetteten Builtins vorübergehend auf Desktop deaktiviert, um Leistungsprobleme zu vermeiden, die durch weit entfernte indirekte Aufrufe verursacht werden.'
tweet: '1394267917013897216'
---

In V8 v9.1 haben wir die [eingebetteten Builtins](https://v8.dev/blog/embedded-builtins) vorübergehend auf Desktop deaktiviert. Obwohl das Einbetten von Builtins die Speichernutzung erheblich verbessert, haben wir festgestellt, dass Funktionsaufrufe zwischen eingebetteten Builtins und JIT-kompiliertem Code zu erheblichen Leistungseinbußen führen können. Diese Kosten hängen von der Mikroarchitektur der CPU ab. In diesem Beitrag erklären wir, warum dies passiert, wie die Leistung aussieht und was wir planen, um dieses Problem langfristig zu lösen.

<!--truncate-->
## Codezuweisung

Maschinencode, der von den Just-in-Time (JIT)-Compilern von V8 generiert wird, wird dynamisch auf Speicherseiten zugewiesen, die dem VM gehören. V8 weist Speicherseiten innerhalb eines zusammenhängenden Adressbereichs zu, der entweder zufällig irgendwo im Speicher liegt (aus Gründen der [Adressraum-Layout-Randomisierung](https://de.wikipedia.org/wiki/Adressraum-Layout-Randomisierung)) oder sich innerhalb des 4-GiB-virtuellen Speichercages befindet, das wir für die [Zeigerkompression](https://v8.dev/blog/pointer-compression) reservieren.

V8 JIT-Code ruft sehr häufig Builtins auf. Builtins sind im Grunde genommen Maschinencode-Schnipsel, die als Teil der VM ausgeliefert werden. Es gibt Builtins, die vollständige Funktionen der JavaScript-Standardbibliothek implementieren, wie z. B. [`Function.prototype.bind`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_objects/Function/bind). Viele Builtins sind jedoch Helferschnipsel von Maschinencode, die die Lücke zwischen den höheren Semantiken von JS und den niedrigeren Fähigkeiten der CPU füllen. Zum Beispiel, wenn eine JavaScript-Funktion eine andere JavaScript-Funktion aufrufen möchte, ruft die Implementierung dieser Funktion oft ein `CallFunction`-Builtin auf, das herausfindet, wie die Ziel-JavaScript-Funktion aufgerufen werden soll; z. B., ob es sich um einen Proxy oder eine reguläre Funktion handelt, wie viele Argumente sie erwartet usw. Da diese Schnipsel bekannt sind, wenn wir die VM erstellen, werden sie "eingebettet" in die Chrome-Binärdatei, was bedeutet, dass sie sich innerhalb des Chrome-Binärcode-Bereichs befinden.

## Direkte vs. indirekte Aufrufe

Auf 64-Bit-Architekturen liegt die Chrome-Binärdatei, die diese Builtins enthält, beliebig weit von JIT-Code entfernt. Mit dem [x86-64](https://de.wikipedia.org/wiki/X86-64)-Instruktionssatz bedeutet dies, dass wir keine direkten Aufrufe verwenden können: Sie verwenden ein 32-Bit signed Immediate, das als Offset zur Adresse des Aufrufs dient, und das Ziel kann mehr als 2 GiB entfernt sein. Stattdessen müssen wir uns auf indirekte Aufrufe über ein Register oder Speicheroperand verlassen. Solche Aufrufe sind stärker auf Vorhersagen angewiesen, da aus der Anweisungsdekodierung selbst nicht unmittelbar ersichtlich ist, was das Ziel des Aufrufs ist. Auf [ARM64](https://de.wikipedia.org/wiki/AArch64) können wir überhaupt keine direkten Aufrufe verwenden, da der Bereich auf 128 MiB begrenzt ist. Dies bedeutet, dass wir in beiden Fällen auf die Genauigkeit des indirekten Sprungvorhersagers der CPU angewiesen sind.

## Begrenzungen der indirekten Sprungvorhersage

Bei Zielsetzung x86-64 wäre es hilfreich, sich auf direkte Aufrufe zu verlassen. Dies würde die Belastung des indirekten Sprungvorhersagers reduzieren, da das Ziel nach der Dekodierung der Anweisung bekannt ist, und es ist auch nicht erforderlich, das Ziel aus einem Konstanten oder Speicher in ein Register zu laden. Aber es geht nicht nur um die offensichtlichen Unterschiede, die im Maschinencode sichtbar sind.

Aufgrund von [Spectre v2](https://googleprojectzero.blogspot.com/2018/01/reading-privileged-memory-with-side.html) haben verschiedene Gerät-/OS-Kombinationen die indirekte Sprungvorhersage deaktiviert. Dies bedeutet, dass wir bei solchen Konfigurationen sehr kostspielige Wartezyklen bei Funktionsaufrufen haben, die sich auf das `CallFunction`-Builtin aus JIT-Code stützen.

Noch wichtiger ist, dass 64-Bit-Instruktionssatz-Architekturen (die „hochsprachige Sprache der CPU“) zwar indirekte Aufrufe zu weit entfernten Adressen unterstützen, die Mikroarchitektur jedoch Optimierungen mit beliebigen Einschränkungen implementieren kann. Es scheint üblich zu sein, dass indirekte Sprungvorhersager davon ausgehen, dass die Entfernungen von Aufrufen eine bestimmte Distanz nicht überschreiten (z. B. 4 GiB), was weniger Speicher pro Vorhersage erfordert. Z. B. erklärt das [Intel Optimization Manual](https://www.intel.com/content/dam/www/public/us/en/documents/manuals/64-ia-32-architectures-optimization-manual.pdf) ausdrücklich:

> Für 64-Bit-Anwendungen kann die Leistung der Sprungvorhersage negativ beeinflusst werden, wenn das Ziel eines Sprungs mehr als 4 GB vom Sprung entfernt ist.

Während bei ARM64 der architektonische Aufrufbereich für direkte Aufrufe auf 128 MiB begrenzt ist, zeigt sich, dass der [Apple M1](https://en.wikipedia.org/wiki/Apple_M1)-Chip die gleiche mikroarchitektonische 4-GiB-Reichweitenbegrenzung für die Vorhersage indirekter Aufrufe hat. Indirekte Aufrufe an ein Ziel, das weiter als 4 GiB entfernt ist, scheinen immer falsch vorhergesagt zu werden. Aufgrund des besonders großen [Reorder-Puffers](https://en.wikipedia.org/wiki/Re-order_buffer) des M1, der Komponente der CPU, die die spekulative Ausführung zukünftiger vorhergesagter Anweisungen außer der Reihe ermöglicht, führen häufige Fehlvorhersagen zu einer außergewöhnlich großen Leistungseinbuße.

## Temporäre Lösung: Builtins kopieren

Um die Kosten häufiger Fehlvorhersagen zu vermeiden und unnötige Abhängigkeit von der Zweigvorhersage auf x86-64 zu reduzieren, haben wir entschieden, die Builtins vorübergehend in V8's Zeigerkompressionskäfig auf Desktop-Geräten mit ausreichendem Speicher zu kopieren. Damit wird der kopierte Builtin-Code nahe am dynamisch generierten Code platziert. Die Leistungsergebnisse hängen stark von der Gerätekonfiguration ab, aber hier sind einige Ergebnisse von unseren Leistungsbots:

![Browsing-Benchmarks, die von Live-Seiten aufgezeichnet wurden](/_img/short-builtin-calls/v8-browsing.svg)

![Verbesserung der Benchmark-Ergebnisse](/_img/short-builtin-calls/benchmarks.svg)

Das Entfernen der Eingebundenheit von Builtins erhöht die Speichernutzung auf betroffenen Geräten um 1,2 bis 1,4 MiB pro V8-Instanz. Als bessere langfristige Lösung untersuchen wir die Möglichkeit, JIT-Code näher am Chrome-Binary zu platzieren. Auf diese Weise können wir die Builtins wieder einbetten, um die Speicherersparnis zurückzugewinnen und gleichzeitig die Leistung der Aufrufe von V8-generiertem Code zu C++-Code weiter zu verbessern.
