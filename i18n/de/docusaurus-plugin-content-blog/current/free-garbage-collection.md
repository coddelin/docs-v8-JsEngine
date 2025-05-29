---
title: "Kostenlose Speicherbereinigung"
author: "Hannes Payer und Ross McIlroy, Idle Garbage Collectors"
avatars:
  - "hannes-payer"
  - "ross-mcilroy"
date: 2015-08-07 13:33:37
tags:
  - internals
  - speicher
description: "Chrome 41 versteckt aufwendige Speicherverwaltungsoperationen in kleinen, sonst ungenutzten Leerlaufzeiten, wodurch Ruckler reduziert werden."
---
Die JavaScript-Performance bleibt einer der zentralen Werte von Chrome, insbesondere wenn es darum geht, eine flüssige Benutzererfahrung zu ermöglichen. Ab Chrome 41 nutzt V8 eine neue Technik, um die Reaktionsfähigkeit von Webanwendungen zu erhöhen, indem aufwendige Speicherverwaltungsoperationen in kleinen, sonst ungenutzten Leerlaufzeiten verborgen werden. Dadurch können Webentwickler mit flüssigerem Scrolling und geschmeidigen Animationen mit deutlich weniger Rucklern aufgrund von Speicherbereinigung rechnen.

<!--truncate-->
Viele moderne Sprachmaschinen wie die V8-JavaScript-Engine von Chrome verwalten den Speicher für laufende Anwendungen dynamisch, sodass sich Entwickler nicht selbst darum kümmern müssen. Die Engine durchläuft in regelmäßigen Abständen den der Anwendung zugewiesenen Speicher, stellt fest, welche Daten nicht mehr benötigt werden, und löscht diese, um Platz freizugeben. Dieser Prozess wird als [Speicherbereinigung](https://de.wikipedia.org/wiki/Speicherbereinigung_(Informatik)) bezeichnet.

In Chrome streben wir eine flüssige visuelle Erfahrung mit 60 Frames pro Sekunde (FPS) an. Obwohl V8 bereits versucht, die Speicherbereinigung in kleine Abschnitte zu unterteilen, können und werden größere Speicherbereinigungsoperationen zu unvorhersehbaren Zeiten durchgeführt — manchmal mitten in einer Animation — wodurch die Ausführung pausiert und das Ziel von 60 FPS nicht erreicht wird.

Chrome 41 führte einen [Aufgabenplaner für die Blink-Rendering-Engine](https://blog.chromium.org/2015/04/scheduling-tasks-intelligently-for_30.html) ein, der die Priorisierung latenzempfindlicher Aufgaben ermöglicht, um sicherzustellen, dass Chrome reaktionsschnell bleibt. Neben der Möglichkeit, Arbeiten zu priorisieren, verfügt dieser Aufgabenplaner über zentralisiertes Wissen darüber, wie ausgelastet das System ist, welche Aufgaben erledigt werden müssen und wie dringend jede dieser Aufgaben ist. Dadurch kann er abschätzen, wann Chrome wahrscheinlich im Leerlauf ist und wie lange dieser Leerlauf voraussichtlich andauern wird.

Ein Beispiel dafür tritt auf, wenn Chrome eine Animation auf einer Webseite anzeigt. Die Animation aktualisiert den Bildschirm mit 60 FPS, wodurch Chrome etwa 16,6 ms Zeit für das Update hat. Chrome beginnt mit der Arbeit am aktuellen Frame, sobald der vorherige Frame angezeigt wurde, und führt Eingabe-, Animations- und Frame-Rendering-Aufgaben für diesen neuen Frame aus. Wenn Chrome all diese Arbeiten in weniger als 16,6 ms abschließt, hat es bis zum nächsten Frame nichts mehr zu tun. Der Planer von Chrome ermöglicht es V8, diese _Leerlaufzeit_ zu nutzen, indem er spezielle _Leerlaufaufgaben_ plant, während Chrome ansonsten untätig wäre.

![Abbildung 1: Framerendering mit Leerlaufaufgaben](/_img/free-garbage-collection/frame-rendering.png)

Leerlaufaufgaben sind spezielle Aufgaben mit niedriger Priorität, die ausgeführt werden, wenn der Planer feststellt, dass sich Chrome in einer Leerlaufphase befindet. Leerlaufaufgaben erhalten eine Deadline, die die Schätzung des Planers dafür ist, wie lange Chrome voraussichtlich im Leerlauf bleibt. Im Animationsbeispiel in Abbildung 1 wäre dies der Zeitpunkt, zu dem der nächste Frame zu zeichnen beginnt. In anderen Situationen (z. B. wenn keine Bildschirmaktivität stattfindet) könnte dies der Zeitpunkt sein, zu dem die nächste ausstehende Aufgabe geplant ist, mit einer Obergrenze von 50 ms, um sicherzustellen, dass Chrome auf unerwartete Benutzereingaben reagiert. Die Deadline wird von der Leerlaufaufgabe verwendet, um abzuschätzen, wie viel Arbeit erledigt werden kann, ohne Ruckler oder Verzögerungen bei der Eingaberückmeldung zu verursachen.

Die in den Leerlaufaufgaben durchgeführte Speicherbereinigung ist von kritischen, latenzempfindlichen Operationen verborgen. Das bedeutet, dass diese Speicherbereinigungsaufgaben „kostenlos“ erledigt werden. Um zu verstehen, wie V8 das macht, lohnt es sich, die aktuelle Speicherbereinigungsstrategie von V8 zu betrachten.

## Tiefer Einblick in die Speicherbereinigungsengine von V8

V8 verwendet einen [generationalen Garbage Collector](http://www.memorymanagement.org/glossary/g.html#term-generational-garbage-collection), bei dem der JavaScript-Heap in eine kleine junge Generation für neu zugewiesene Objekte und eine große alte Generation für langlebige Objekte aufgeteilt ist. [Da die meisten Objekte jung sterben](http://www.memorymanagement.org/glossary/g.html#term-generational-hypothesis), ermöglicht diese generationale Strategie dem Garbage Collector, regelmäßige, kurze Speicherbereinigungen in der kleineren jungen Generation (bekannt als Scavenges) durchzuführen, ohne Objekte in der alten Generation durchsuchen zu müssen.

Die junge Generation verwendet eine Zuteilungsstrategie mit einem [Halbraum](http://www.memorymanagement.org/glossary/s.html#semi.space), bei der neue Objekte zunächst im aktiven Halbraum der jungen Generation zugeteilt werden. Sobald dieser Halbraum voll wird, werden die lebenden Objekte durch eine Räumungsoperation in den anderen Halbraum verschoben. Objekte, die bereits einmal verschoben wurden, werden in die alte Generation befördert und gelten als langlebig. Nachdem die lebenden Objekte verschoben wurden, wird der neue Halbraum aktiv und alle verbleibenden toten Objekte im alten Halbraum werden verworfen.

Die Dauer einer Räumungsoperation der jungen Generation hängt daher von der Größe der lebenden Objekte in der jungen Generation ab. Eine Räumung ist schnell (&lt;1 ms), wenn die meisten Objekte in der jungen Generation unzugänglich werden. Wenn jedoch die meisten Objekte eine Räumung überleben, kann die Dauer der Räumung erheblich länger sein.

Eine Hauptsammlung des gesamten Heaps wird durchgeführt, wenn die Größe der lebenden Objekte in der alten Generation ein heuristisch abgeleitetes Limit überschreitet. Die alte Generation verwendet einen [Mark-and-Sweep-Collector](http://www.memorymanagement.org/glossary/m.html#term-mark-sweep) mit mehreren Optimierungen zur Verbesserung der Latenz und des Speicherverbrauchs. Die Markierungslatenz hängt von der Anzahl der lebenden Objekte ab, die markiert werden müssen, wobei die Markierung des gesamten Heaps bei großen Webanwendungen möglicherweise mehr als 100 ms dauert. Um zu vermeiden, dass der Haupt-Thread für solch lange Zeiträume pausiert wird, verfügt V8 seit langem über die Fähigkeit, [lebende Objekte schrittweise in vielen kleinen Schritten zu markieren](https://blog.chromium.org/2011/11/game-changer-for-interactive.html), mit dem Ziel, die Dauer jedes Markierungsschritts unter 5 ms zu halten.

Nach dem Markieren wird der freie Speicher durch das Durchlaufen des gesamten Speichers der alten Generation wieder für die Anwendung verfügbar gemacht. Diese Aufgabe wird parallel von dedizierten Räumungs-Threads ausgeführt. Schließlich wird eine Speicherverdichtung durchgeführt, um die Speicherfragmentierung in der alten Generation zu reduzieren. Diese Aufgabe kann sehr zeitaufwändig sein und wird nur durchgeführt, wenn Speicherfragmentierung ein Problem darstellt.

Zusammenfassend gibt es vier Hauptaufgaben bei der Speicherbereinigung:

1. Räumungsoperationen der jungen Generation, die normalerweise schnell sind
2. Markierungsschritte, die vom schrittweisen Markierer durchgeführt werden und beliebig lange dauern können, abhängig von der Schrittgröße
3. Gesamte Speicherbereinigungen, die viel Zeit in Anspruch nehmen können
4. Gesamte Speicherbereinigungen mit aggressiver Speicherverdichtung, die viel Zeit in Anspruch nehmen können, aber fragmentierten Speicher bereinigen

Um diese Operationen in Leerlaufzeiten durchzuführen, postet V8 Speicherbereinigungs-Leerlaufaufgaben an den Scheduler. Wenn diese Leerlaufaufgaben ausgeführt werden, erhalten sie eine Frist, bis zu der sie abgeschlossen sein sollten. Der Leerlaufzeit-Handler von V8 bewertet, welche Speicherbereinigungsaufgaben durchgeführt werden sollten, um den Speicherverbrauch zu reduzieren, wobei die Frist eingehalten wird, um zukünftige Ruckler beim Frame-Rendering oder Eingabe-Latenz zu vermeiden.

Der Speicherbereiniger führt eine Räumungsoperation der jungen Generation während einer Leerlaufaufgabe aus, wenn die gemessene Zuweisungsrate der Anwendung zeigt, dass die junge Generation vor der nächsten erwarteten Leerlaufperiode voll sein könnte. Zusätzlich berechnet er die durchschnittliche Dauer der letzten Räumungsaufgaben, um die Dauer zukünftiger Räumungen vorherzusagen und sicherzustellen, dass die Fristen der Leerlaufaufgaben nicht verletzt werden.

Wenn die Größe der lebenden Objekte in der alten Generation nahe an der Grenze des Heaps liegt, wird die schrittweise Markierung gestartet. Die Schritte der schrittweisen Markierung können linear an der Anzahl der zu markierenden Bytes skaliert werden. Basierend auf der durchschnittlich gemessenen Markierungsgeschwindigkeit versucht der Leerlaufzeit-Handler für Speicherbereinigung, so viel Markierungsarbeit wie möglich in eine gegebene Leerlaufaufgabe zu integrieren.

Eine vollständige Speicherbereinigung wird während einer Leerlaufaufgabe geplant, wenn die alte Generation fast voll ist und wenn die der Aufgabe zugewiesene Frist voraussichtlich lang genug ist, um die Bereinigung abzuschließen. Die Pausenzeit der Sammlung wird basierend auf der Markierungsgeschwindigkeit multipliziert mit der Anzahl der zugewiesenen Objekte vorhergesagt. Gesamte Speicherbereinigungen mit zusätzlicher Verdichtung werden nur durchgeführt, wenn die Webseite längere Zeit im Leerlauf war.

## Leistungsevaluierung

Um den Einfluss von Speicherbereinigungen während der Leerlaufzeit zu bewerten, haben wir das [Telemetry-Performance-Benchmarking-Framework von Chrome](https://www.chromium.org/developers/telemetry) verwendet, um zu bewerten, wie geschmeidig beliebte Websites scrollen, während sie geladen werden. Wir haben die [Top 25](https://code.google.com/p/chromium/codesearch#chromium/src/tools/perf/benchmarks/smoothness.py&l=15) Websites auf einem Linux-Arbeitsplatz sowie [typische mobile Websites](https://code.google.com/p/chromium/codesearch#chromium/src/tools/perf/benchmarks/smoothness.py&l=104) auf einem Android Nexus 6 Smartphone getestet. Beide öffnen beliebte Webseiten (einschließlich komplexer Webanwendungen wie Gmail, Google Docs und YouTube) und scrollen deren Inhalte für einige Sekunden. Chrome zielt darauf ab, das Scrollen mit 60 FPS für eine reibungslose Benutzererfahrung zu ermöglichen.

Abbildung 2 zeigt den Prozentsatz der Speicherbereinigung, die während der Leerlaufzeit geplant wurde. Die schnellere Hardware des Arbeitsplatzes führt zu insgesamt mehr Leerlaufzeit im Vergleich zum Nexus 6, und ermöglicht somit, dass ein größerer Prozentsatz der Speicherbereinigung während dieser Leerlaufzeit geplant wird (43 % im Vergleich zu 31 % beim Nexus 6), was eine Verbesserung um etwa 7 % bei unserer [Metrics für Ruckler](https://www.chromium.org/developers/design-documents/rendering-benchmarks) ergibt.

![Abbildung 2: Der Prozentsatz der Müllsammlung, der während der Leerlaufzeiten erfolgt](/_img/free-garbage-collection/idle-time-gc.png)

Neben der Verbesserung der Flüssigkeit der Seitenwiedergabe bieten diese Leerlaufzeiten auch die Möglichkeit, eine aggressivere Müllsammlung durchzuführen, wenn die Seite vollständig inaktiv wird. Die jüngsten Verbesserungen in Chrome 45 nutzen dies aus, um die Menge des von Leerlauf-Tab-Vordergrund belegten Speichers drastisch zu reduzieren. Abbildung 3 zeigt eine Vorschau darauf, wie der Speicherverbrauch des JavaScript-Heaps von Gmail um etwa 45 % reduziert werden kann, wenn er inaktiv wird, im Vergleich zur gleichen Seite in Chrome 43.

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/ij-AFUfqFdI" width="640" height="360" loading="lazy"></iframe>
  </div>
  <figcaption>Abbildung 3: Speicherverbrauch für Gmail in der neuesten Version von Chrome 45 (links) vs. Chrome 43</figcaption>
</figure>

Diese Verbesserungen zeigen, dass es möglich ist, Pausen bei der Müllsammlung zu verbergen, indem man intelligenter mit dem Timing teurer Müllsammeloperationen umgeht. Webentwickler müssen sich nicht länger vor den Pausen der Müllsammlung fürchten, selbst wenn sie auf seidenweiche 60 FPS-Animationen abzielen. Bleiben Sie dran für weitere Verbesserungen, während wir die Grenzen der Müllsammlungsplanung erweitern.
