---
title: 'Optimierung des V8-Speicherverbrauchs'
author: 'die V8 Memory Sanitation Engineers Ulan Degenbaev, Michael Lippautz, Hannes Payer und Toon Verwaest'
avatars:
  - 'ulan-degenbaev'
  - 'michael-lippautz'
  - 'hannes-payer'
date: 2016-10-07 13:33:37
tags:
  - speicher
  - benchmarks
description: 'Das V8-Team hat den Speicherverbrauch mehrerer Websites analysiert und signifikant reduziert, die als repräsentativ für moderne Webentwicklungsmuster identifiziert wurden.'
---
Der Speicherverbrauch ist eine wichtige Dimension im Bereich der Leistungsabstimmung virtueller JavaScript-Maschinen. In den letzten Monaten hat das V8-Team den Speicherverbrauch mehrerer Websites analysiert und dabei signifikant reduziert, die als repräsentativ für moderne Webentwicklungsmuster betrachtet wurden. In diesem Blogpost stellen wir die Arbeitslasten und Werkzeuge vor, die wir in unserer Analyse verwendet haben, erläutern Speicheroptimierungen im Garbage Collector und zeigen, wie wir den von V8 analysierten Speicherverbrauch beim Parser und bei den Compilern reduziert haben.

<!--truncate-->
## Benchmarks

Um V8 zu profilieren und Optimierungen zu finden, die für die größte Anzahl von Nutzern relevant sind, ist es entscheidend, Arbeitslasten zu definieren, die reproduzierbar, aussagekräftig und häufige reale Verwendungsszenarien von JavaScript simulieren. Ein großartiges Werkzeug für diese Aufgabe ist [Telemetry](https://catapult.gsrc.io/telemetry), ein Performance-Test-Framework, das geskriptete Website-Interaktionen in Chrome ausführt und alle Serverantworten aufzeichnet, um eine vorhersehbare Wiederholung dieser Interaktionen in unserer Testumgebung zu ermöglichen. Wir wählten eine Reihe beliebter Nachrichten-, Sozial- und Medienwebsites aus und definierten für sie die folgenden gemeinsamen Benutzerinteraktionen:

Eine Arbeitslast für das Browsen von Nachrichten- und Sozialwebsites:

1. Öffnen Sie eine beliebte Nachrichten- oder Sozialwebsite, z. B. Hacker News.
2. Klicken Sie auf den ersten Link.
3. Warten Sie, bis die neue Website geladen ist.
4. Scrollen Sie ein paar Seiten nach unten.
5. Klicken Sie auf die Zurück-Schaltfläche.
6. Klicken Sie auf den nächsten Link auf der ursprünglichen Website und wiederholen Sie die Schritte 3-6 einige Male.

Eine Arbeitslast für das Browsen von Medienwebsites:

1. Öffnen Sie ein Element auf einer beliebten Medienwebsite, z. B. ein Video auf YouTube.
2. Konsumieren Sie dieses Element, indem Sie einige Sekunden warten.
3. Klicken Sie auf das nächste Element und wiederholen Sie die Schritte 2–3 einige Male.

Sobald ein Arbeitsablauf erfasst ist, kann er so oft wie nötig gegen eine Entwicklungsversion von Chrome wiederholt werden, z. B. jedes Mal, wenn eine neue Version von V8 erstellt wird. Während der Wiedergabe wird der Speicherverbrauch von V8 in festen Zeitabständen gemessen, um einen aussagekräftigen Durchschnitt zu erhalten. Die Benchmarks finden Sie [hier](https://cs.chromium.org/chromium/src/tools/perf/page_sets/system_health/browsing_stories.py?q=browsing+news&sq=package:chromium&dr=CS&l=11).

## Speichervisualisierung

Eine der Hauptherausforderungen bei der Leistungsoptimierung ist es, ein klares Bild des internen Zustands der virtuellen Maschine zu erhalten, um Fortschritte zu verfolgen oder potenzielle Kompromisse abzuwägen. Für die Optimierung des Speicherverbrauchs bedeutet dies, den Speicherverbrauch von V8 während der Ausführung genau zu verfolgen. Es gibt zwei Kategorien von Speicher, die verfolgt werden müssen: Speicher im verwalteten V8-Heap und Speicher, der im C++-Heap zugewiesen ist. Die Funktion **V8 Heap Statistics** ist ein Mechanismus, der von Entwicklern, die an den internen Teilen von V8 arbeiten, verwendet wird, um tiefe Einblicke in beide Kategorien zu erhalten. Wenn das Flag `--trace-gc-object-stats` beim Starten von Chrome (54 oder neuer) oder der `d8`-Befehlszeilenschnittstelle angegeben wird, protokolliert V8 speicherbezogene Statistiken in der Konsole. Wir haben ein benutzerdefiniertes Werkzeug, den [V8 Heap Visualizer](https://mlippautz.github.io/v8-heap-stats/), entwickelt, um diese Ausgaben zu visualisieren. Das Tool zeigt eine zeitachsenbasierte Ansicht sowohl für verwaltete als auch für C++-Heaps. Es bietet auch eine detaillierte Aufschlüsselung der Speichernutzung bestimmter interner Datentypen und größenbasierte Histogramme für jeden dieser Typen.

Ein häufiger Arbeitsablauf während unserer Optimierungsbemühungen besteht darin, einen Instanztyp auszuwählen, der im Zeitachsen-Diagramm einen großen Teil des Heaps einnimmt, wie in Abbildung 1 gezeigt. Sobald ein Instanztyp ausgewählt ist, zeigt das Tool eine Verteilung der Verwendungen dieses Typs. In diesem Beispiel haben wir die interne Datenstruktur FixedArray von V8 ausgewählt, eine untypisierte, vektorähnliche Containerstruktur, die an vielen Stellen in der virtuellen Maschine verwendet wird. Abbildung 2 zeigt eine typische FixedArray-Verteilung, in der wir sehen können, dass der Großteil des Speichers auf ein spezifisches FixedArray-Nutzungsszenario zurückzuführen ist. In diesem Fall werden FixedArrays als Speicherung für spärliche JavaScript-Arrays verwendet (was wir DICTIONARY\_ELEMENTS nennen). Mit diesen Informationen ist es möglich, zum tatsächlichen Code zurückzukehren und entweder zu überprüfen, ob diese Verteilung tatsächlich das erwartete Verhalten darstellt oder ob eine Optimierungsmöglichkeit besteht. Wir haben das Tool verwendet, um Ineffizienzen mit einer Reihe interner Typen zu identifizieren.

![Abbildung 1: Zeitachsenansicht des verwalteten Heaps und des Off-Heap-Speichers](/_img/optimizing-v8-memory/timeline-view.png)

![Abbildung 2: Verteilung des Instanztyps](/_img/optimizing-v8-memory/distribution.png)

Abbildung 3 zeigt den Speicherverbrauch des C++-Heaps, der hauptsächlich aus Zonen-Speicher besteht (temporäre Speicherbereiche, die von V8 für kurze Zeit verwendet werden; unten ausführlicher besprochen). Da der Zonen-Speicher am häufigsten vom V8-Parser und den Compilern genutzt wird, entsprechen die Spitzen Ereignissen des Parsens und der Kompilierung. Ein gut funktionierender Ablauf besteht nur aus Spitzen, was darauf hinweist, dass der Speicher freigegeben wird, sobald er nicht mehr benötigt wird. Im Gegensatz dazu deuten Plateaus (d. h. längere Zeiträume mit höherem Speicherverbrauch) darauf hin, dass es Optimierungspotenzial gibt.

![Abbildung 3: Zonen-Speicher](/_img/optimizing-v8-memory/zone-memory.png)

Frühe Anwender können auch die Integration in [Chrome’s Tracing-Infrastruktur](https://www.chromium.org/developers/how-tos/trace-event-profiling-tool) ausprobieren. Dazu müssen Sie die neueste Chrome Canary-Version mit `--track-gc-object-stats` ausführen und [einen Trace erfassen](https://www.chromium.org/developers/how-tos/trace-event-profiling-tool/recording-tracing-runs#TOC-Capture-a-trace-on-Chrome-desktop), die die Kategorie `v8.gc_stats` enthält. Die Daten erscheinen dann unter dem Ereignis `V8.GC_Object_Stats`.

## Reduzierung der JavaScript-Heap-Größe

Es gibt einen inhärenten Kompromiss zwischen Garbage-Collection-Durchsatz, Latenz und Speicherverbrauch. Zum Beispiel kann die Garbage-Collection-Latenz (die für den Benutzer sichtbares Ruckeln verursacht) durch die Nutzung von mehr Speicher reduziert werden, um häufige Garbage-Collection-Aufrufe zu vermeiden. Bei mobilen Geräten mit niedrigem Speicher, d. h. Geräten mit weniger als 512 MB RAM, kann die Priorisierung der Latenz und des Durchsatzes über dem Speicherverbrauch zu Speicherplatzfehlern und suspendierten Tabs auf Android führen.

Um für diese Mobile Devices mit niedrigem Speicher die richtigen Kompromisse besser auszugleichen, haben wir einen speziellen Modus zur Speicherreduzierung eingeführt, der mehrere Garbage-Collection-Heuristiken anpasst, um den Speicherverbrauch des JavaScript-Heaps zu verringern.

1. Am Ende einer vollständigen Garbage-Collection bestimmt die Heap-Wachstumsstrategie von V8, wann die nächste Garbage-Collection stattfindet, basierend auf der Menge der aktiven Objekte mit etwas zusätzlichem Puffer. Im Speicherreduktionsmodus verwendet V8 weniger Puffer, was aufgrund häufiger Garbage-Collections zu weniger Speicherverbrauch führt.
1. Darüber hinaus wird diese Schätzung als feste Grenze behandelt, die unfertige inkrementelle Markierungsarbeiten zwingt, in der Haupt-Garbage-Collection-Pause abgeschlossen zu werden. Normalerweise kann bei deaktiviertem Speicherreduktionsmodus die unfertige inkrementelle Markierungsarbeit diese Grenze beliebig überschreiten und die Haupt-Garbage-Collection-Pause wird erst ausgelöst, wenn das Markieren abgeschlossen ist.
1. Speichfragmentierung wird durch aggressivere Speicherkompaktion weiter reduziert.

Abbildung 4 zeigt einige der Verbesserungen auf Geräten mit niedrigem Speicher seit Chrome 53. Besonders bemerkenswert ist, dass der durchschnittliche V8-Heap-Speicherverbrauch des Mobile-New-York-Times-Benchmark um etwa 66 % reduziert wurde. Insgesamt haben wir eine Reduzierung der durchschnittlichen V8-Heap-Größe in diesem Set von Benchmarks um 50 % beobachtet.

![Abbildung 4: Reduzierung des V8-Heap-Speichers seit Chrome 53 auf Geräten mit geringem Speicher](/_img/optimizing-v8-memory/heap-memory-reduction.png)

Eine weitere kürzlich eingeführte Optimierung reduziert nicht nur den Speicherverbrauch auf Geräten mit niedrigem Speicher, sondern auch auf leistungsstärkeren mobilen und Desktop-Maschinen. Die Reduzierung der Seitengröße des V8-Heaps von 1 MB auf 512 kB führt zu einem geringeren Speicherbedarf, wenn nicht viele aktive Objekte vorhanden sind, und zu einer bis zu 2× geringeren Gesamt-Speicherfragmentierung. Sie ermöglicht es V8 außerdem, mehr Kompaktierungsarbeit durchzuführen, da kleinere Arbeitsstücke es den Speicherkompaktierungs-Threads ermöglichen, mehr Arbeit parallel auszuführen.

## Reduzierung des Zonen-Speichers

Zusätzlich zum JavaScript-Heap verwendet V8 Speicher außerhalb des Heaps für interne VM-Operationen. Der größte Teil des Speichers wird durch Speicherbereiche namens _Zonen_ zugewiesen. Zonen sind eine Art regionsbasierter Speichermanager, der schnelle Allokation und Massendeallokation ermöglicht, bei der der gesamte zonenallozierte Speicher auf einmal freigegeben wird, wenn die Zone zerstört wird. Zonen werden im gesamten Parser und in den Compilern von V8 verwendet.

Eine der wichtigsten Verbesserungen in Chrome 55 resultiert aus der Reduzierung des Speicherverbrauchs während des Hintergrund-Parsens. Hintergrund-Parsen ermöglicht es V8, Skripts zu parsen, während eine Seite geladen wird. Das Speichervisualisierungstool half uns zu entdecken, dass der Hintergrundparser eine gesamte Zone lange nach der Kompilierung des Codes am Leben erhalten würde. Durch das sofortige Freigeben der Zone nach der Kompilierung haben wir die Lebensdauer der Zonen erheblich reduziert, was zu einem reduzierten durchschnittlichen und maximalen Speicherverbrauch führte.

Eine weitere Verbesserung ergibt sich durch eine bessere Packung von Feldern in den Knoten des _abstrakten Syntaxbaums_, die vom Parser erzeugt werden. Bisher haben wir darauf vertraut, dass der C++-Compiler die Felder dort zusammenfasst, wo es möglich ist. Zwei Booleans benötigen beispielsweise nur zwei Bits und sollten innerhalb eines Wortes oder innerhalb des ungenutzten Bruchteils des vorherigen Wortes positioniert werden. Der C++-Compiler findet jedoch nicht immer die kompakteste Packung, daher packen wir stattdessen die Bits manuell. Dies führt nicht nur zu einer reduzierten Spitzen-Speicherausnutzung, sondern auch zu einer verbesserten Parser- und Compiler-Leistung.

Abbildung 5 zeigt die Verbesserungen des Spitzen-Zonen-Speichers seit Chrome 54, die durchschnittlich um etwa 40 % über die gemessenen Webseiten reduziert wurden.

![Abbildung 5: V8-Reduktion des Spitzen-Zonen-Speichers seit Chrome 54 auf Desktop](/_img/optimizing-v8-memory/peak-zone-memory-reduction.png)

In den kommenden Monaten werden wir weiterhin daran arbeiten, den Speicherbedarf von V8 zu reduzieren. Wir haben weitere Zonen-Speicher-Optimierungen für den Parser geplant und möchten uns auf Geräte mit einem Speicherbereich von 512 MB bis 1 GB konzentrieren.

**Aktualisierung:** Alle oben diskutierten Verbesserungen reduzieren den Gesamtspeicherverbrauch von Chrome 55 auf _Geräten mit niedrigem Speicher_ im Vergleich zu Chrome 53 um bis zu 35 %. Andere Gerätesegmente profitieren nur von den Zonen-Speicher-Verbesserungen.
