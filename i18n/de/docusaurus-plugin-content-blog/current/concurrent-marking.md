---
title: 'Gleichzeitiges Markieren in V8'
author: 'Ulan Degenbaev, Michael Lippautz und Hannes Payer — Befreier des Hauptthreads'
avatars:
  - 'ulan-degenbaev'
  - 'michael-lippautz'
  - 'hannes-payer'
date: 2018-06-11 13:33:37
tags:
  - internals
  - memory
description: 'Dieser Beitrag beschreibt die Garbage-Collection-Technik namens gleichzeitiges Markieren.'
tweet: '1006187194808233985'
---
Dieser Beitrag beschreibt die Garbage-Collection-Technik namens _gleichzeitiges Markieren_. Die Optimierung ermöglicht einer JavaScript-Anwendung, die Ausführung fortzusetzen, während der Garbage Collector den Heap scannt, um lebende Objekte zu finden und zu markieren. Unsere Benchmarks zeigen, dass gleichzeitiges Markieren die auf dem Hauptthread verbrachte Zeit beim Markieren um 60%–70% reduziert. Gleichzeitiges Markieren ist das letzte Puzzlestück des [Orinoco-Projekts](/blog/orinoco) — das Projekt zum schrittweisen Austausch des alten Garbage Collectors mit dem neuen überwiegend gleichzeitigen und parallelen Garbage Collector. Gleichzeitiges Markieren ist in Chrome 64 und Node.js v10 standardmäßig aktiviert.

<!--truncate-->
## Hintergrund

Das Markieren ist eine Phase des [Mark-Compact](https://en.wikipedia.org/wiki/Tracing_garbage_collection)-Garbage Collectors von V8. Während dieser Phase entdeckt und markiert der Collector alle lebenden Objekte. Das Markieren beginnt mit der Menge bekannter lebender Objekte wie dem globalen Objekt und den derzeit aktiven Funktionen — den sogenannten Wurzeln. Der Collector markiert die Wurzeln als lebend und folgt den Zeigern darin, um weitere lebende Objekte zu entdecken. Der Collector fährt fort, die neu entdeckten Objekte zu markieren und Zeigern zu folgen, bis keine weiteren Objekte mehr zu markieren sind. Am Ende des Markierens sind alle unmarkierten Objekte auf dem Heap aus der Anwendung nicht erreichbar und können sicher zurückgewonnen werden.

Wir können das Markieren als [Graphtraversierung](https://en.wikipedia.org/wiki/Graph_traversal) betrachten. Die Objekte auf dem Heap sind Knoten des Graphen. Zeiger von einem Objekt zu einem anderen sind Kanten des Graphen. Angenommen, wir haben einen Knoten im Graphen, können wir alle ausgehenden Kanten dieses Knotens mit der [Hidden Class](/blog/fast-properties) des Objekts finden.

![Abbildung 1. Objekt-Graph](/_img/concurrent-marking/00.svg)

V8 implementiert das Markieren mithilfe von zwei Markierungsbits pro Objekt und einer Markierungs-Arbeitsliste. Zwei Markierungsbits kodieren drei Farben: weiß (`00`), grau (`10`) und schwarz (`11`). Anfänglich sind alle Objekte weiß, was bedeutet, dass der Collector sie noch nicht entdeckt hat. Ein weißes Objekt wird grau, wenn der Collector es entdeckt und zur Markierungs-Arbeitsliste hinzufügt. Ein graues Objekt wird schwarz, wenn der Collector es aus der Markierungs-Arbeitsliste entnimmt und alle Felder besucht. Dieses Schema heißt Tri-Color-Markierung. Die Markierung ist abgeschlossen, wenn keine grauen Objekte mehr vorhanden sind. Alle verbleibenden weißen Objekte sind nicht erreichbar und können sicher zurückgewonnen werden.

![Abbildung 2. Markieren beginnt bei den Wurzeln](/_img/concurrent-marking/01.svg)

![Abbildung 3. Der Collector wandelt ein graues Objekt in schwarz um, indem er seine Zeiger verarbeitet](/_img/concurrent-marking/02.svg)

![Abbildung 4. Der endgültige Zustand nach Abschluss der Markierung](/_img/concurrent-marking/03.svg)

Es sei darauf hingewiesen, dass der oben beschriebene Markierungsalgorithmus nur funktioniert, wenn die Anwendung pausiert, während die Markierung vorgenommen wird. Wenn wir der Anwendung erlauben, während des Markierens auszuführen, könnte die Anwendung den Graphen verändern und letztlich den Collector dazu verleiten, lebende Objekte freizugeben.

## Reduzierung der Markierungspause

Das vollständig durchgeführte Markieren kann mehrere hundert Millisekunden für große Heaps in Anspruch nehmen.

![](/_img/concurrent-marking/04.svg)

Solche langen Pausen können Anwendungen unresponsive machen und zu einer schlechten Benutzererfahrung führen. Im Jahr 2011 wechselte V8 vom vollständigen Markieren zum inkrementellen Markieren. Während des inkrementellen Markierens teilt der Garbage Collector die Markierungsarbeit in kleinere Abschnitte auf und erlaubt der Anwendung, zwischen den Abschnitten auszuführen:

![](/_img/concurrent-marking/05.svg)

Der Garbage Collector entscheidet, wie viel inkrementelle Markierungsarbeit in jedem Abschnitt durchgeführt wird, um der Allocationsrate der Anwendung zu entsprechen. In allgemeinen Fällen verbessert dies die Reaktionsfähigkeit der Anwendung erheblich. Für große Heaps unter Speicherbelastung können jedoch immer noch lange Pausen auftreten, während der Collector versucht, mit den Allocations Schritt zu halten.

Inkrementelles Markieren ist nicht kostenlos. Die Anwendung muss den Garbage Collector über alle Operationen informieren, die den Objekt-Graphen verändern. V8 implementiert die Benachrichtigung mithilfe einer Dijkstra-artigen Schreib-Barriere. Nach jedem Schreibvorgang der Form `object.field = value` in JavaScript fügt V8 den Schreib-Barriere-Code ein:

```cpp
// Wird nach `object.field = value` aufgerufen.
write_barrier(object, field_offset, value) {
  if (color(object) == black && color(value) == white) {
    set_color(value, grey);
    marking_worklist.push(value);
  }
}
```

Die Schreibbarriere erzwingt die Invariante, dass kein schwarzes Objekt auf ein weißes Objekt verweist. Dies ist auch als starke Tri-Color-Invariante bekannt und stellt sicher, dass die Anwendung kein lebendes Objekt vor dem Garbage Collector verstecken kann. Somit sind alle weißen Objekte am Ende der Markierung wirklich für die Anwendung nicht erreichbar und können gefahrlos freigegeben werden.

Inkrementelles Markieren lässt sich gut mit der Planung der Garbage Collection in Leerlaufzeiten integrieren, wie in einem [früheren Blogbeitrag](/blog/free-garbage-collection) beschrieben. Der Blink-Taskplaner von Chrome kann während der Leerlaufzeit der Hauptthread kleine inkrementelle Markierungsschritte planen, ohne Störungen zu verursachen. Diese Optimierung funktioniert besonders gut, wenn Leerlaufzeiten verfügbar sind.

Aufgrund der Kosten der Schreibbarriere kann inkrementelles Markieren den Durchsatz der Anwendung verringern. Es ist möglich, sowohl den Durchsatz als auch die Pausenzeiten durch den Einsatz zusätzlicher Arbeiter-Threads zu verbessern. Es gibt zwei Möglichkeiten, auf Arbeiter-Threads zu markieren: paralleles Markieren und gleichzeitiges Markieren.

**Paralleles** Markieren erfolgt sowohl im Haupt-Thread als auch in Arbeiter-Threads. Die Anwendung wird während der gesamten parallelen Markierungsphase angehalten. Dies ist die mehrthreadfähige Version der Stop-the-World-Markierung.

![](/_img/concurrent-marking/06.svg)

**Gleichzeitiges** Markieren erfolgt hauptsächlich in Arbeiter-Threads. Die Anwendung kann weiterlaufen, während das gleichzeitige Markieren stattfindet.

![](/_img/concurrent-marking/07.svg)

Die beiden folgenden Abschnitte beschreiben, wie wir die Unterstützung für paralleles und gleichzeitiges Markieren in V8 hinzugefügt haben.

## Paralleles Markieren

Beim parallelen Markieren können wir davon ausgehen, dass die Anwendung nicht gleichzeitig läuft. Dies vereinfacht die Implementierung erheblich, da wir annehmen können, dass der Objektdiagramm statisch ist und sich nicht ändert. Um das Objektdiagramm parallel zu markieren, müssen wir die Datenstrukturen des Garbage Collectors threadsicher gestalten und einen Weg finden, die Markierungsarbeit effizient zwischen Threads zu teilen. Die folgende Grafik zeigt die Datenstrukturen, die beim parallelen Markieren verwendet werden. Die Pfeile zeigen die Flussrichtung der Daten. Zur Vereinfachung werden Datenstrukturen, die für die Speicherdefragmentierung benötigt werden, in der Grafik weggelassen.

![Abbildung 5. Datenstrukturen für paralleles Markieren](/_img/concurrent-marking/08.svg)

Beachten Sie, dass die Threads nur vom Objektdiagramm lesen und es niemals ändern. Die Markierungsbits der Objekte und die Markierungsarbeitsliste müssen Lese- und Schreibzugriffe unterstützen.

## Markierungsarbeitsliste und Arbeitsklau

Die Implementierung der Markierungsarbeitsliste ist entscheidend für die Leistung und gleicht eine schnelle, thread-lokale Leistung mit der Menge an Arbeit, die an andere Threads verteilt werden kann, aus, falls diese keine Arbeit mehr haben.

Die extremen Seiten in diesem Kompromissbereich sind (a) die Verwendung einer vollständig gleichzeitigen Datenstruktur für beste Teilbarkeit sämtlicher Objekte und (b) die Verwendung einer vollständig thread-lokalen Datenstruktur, bei der keine Objekte geteilt werden können, zur Optimierung des thread-lokalen Durchsatzes. Abbildung 6 zeigt, wie V8 diese Anforderungen durch die Verwendung einer Markierungsarbeitsliste, die auf Segmenten für thread-lokale Einfügungen und Entfernungen basiert, ausgleicht. Sobald ein Segment voll wird, wird es an einen gemeinsam genutzten globalen Pool veröffentlicht, in dem es für Arbeitsklau verfügbar ist. Auf diese Weise ermöglicht V8 Markierungsthreads, so lange wie möglich lokal ohne Synchronisation zu arbeiten und dennoch Fälle zu bewältigen, in denen ein einzelner Thread ein neues Teilobjektdiagramm erreicht, während ein anderer Thread keine Aufgaben mehr hat, da er seine lokalen Segmente vollständig entleert hat.

![Abbildung 6. Markierungsarbeitsliste](/_img/concurrent-marking/09.svg)

## Gleichzeitiges Markieren

Gleichzeitiges Markieren erlaubt es JavaScript, auf dem Haupt-Thread zu laufen, während Arbeiter-Threads Objekte im Heap besuchen. Dies eröffnet die Möglichkeit für viele potenzielle Datenrennen. Beispielsweise könnte JavaScript auf ein Objektfeld schreiben, während ein Arbeiter-Thread gleichzeitig von diesem Feld liest. Die Datenrennen könnten den Garbage Collector dazu verleiten, ein lebendes Objekt freizugeben oder primitive Werte mit Zeigern zu verwechseln.

Jede Operation im Haupt-Thread, die das Objektdiagramm verändert, stellt eine potenzielle Quelle für ein Datenrennen dar. Da V8 eine Hochleistungs-Engine mit vielen Optimierungen des Objektlayouts ist, ist die Liste der potenziellen Datenrennquellen ziemlich lang. Hier ist eine hochrangige Aufschlüsselung:

- Objekterstellung.
- Schreiben in ein Objektfeld.
- Änderungen am Objektlayout.
- Deserialisierung aus dem Snapshot.
- Materialisierung während der Deoptimierung einer Funktion.
- Räumung während der Garbage Collection der jungen Generation.
- Code-Patching.

Der Haupt-Thread muss diese Operationen mit den Arbeiter-Threads synchronisieren. Die Kosten und die Komplexität der Synchronisation hängen von der jeweiligen Operation ab. Die meisten Operationen ermöglichen eine leichte Synchronisation mit atomaren Speicherzugriffen, aber einige Operationen erfordern einen exklusiven Zugriff auf das Objekt. In den folgenden Unterabschnitten beleuchten wir einige der interessanten Fälle.

### Schreibbarriere

Das durch das Schreiben in ein Objektfeld verursachte Datenrennen wird gelöst, indem die Schreiboperation in einen [entspannten atomaren Schreibvorgang](https://en.cppreference.com/w/cpp/atomic/memory_order#Relaxed_ordering) umgewandelt und die Schreibbarriere angepasst wird:

```cpp
// Wird nach atomic_relaxed_write(&object.field, value); aufgerufen.
write_barrier(object, field_offset, value) {
  if (color(value) == weiß && atomic_color_transition(value, weiß, grau)) {
    marking_worklist.push(value);
  }
}
```

Vergleichen Sie es mit der zuvor verwendeten Schreibbarriere:

```cpp
// Wird nach `object.field = value` aufgerufen.
write_barrier(object, field_offset, value) {
  if (color(object) == schwarz && color(value) == weiß) {
    set_color(value, grau);
    marking_worklist.push(value);
  }
}
```

Es gibt zwei Änderungen:

1. Die Farbprüfung des Quellobjekts (`color(object) == schwarz`) ist weggefallen.
2. Der Farbübergang des `value` von weiß zu grau erfolgt atomar.

Ohne die Farbprüfung des Quellobjekts wird die Schreibbarriere konservativer, d. h. sie kann Objekte als lebendig markieren, auch wenn diese Objekte eigentlich nicht erreichbar sind. Wir haben die Prüfung entfernt, um eine teure Speichersperre zu vermeiden, die zwischen der Schreiboperation und der Schreibbarriere erforderlich wäre:

```cpp
atomic_relaxed_write(&object.field, value);
memory_fence();
write_barrier(object, field_offset, value);
```

Ohne die Speichersperre kann der Speicherladevorgang des Objektfarbwerts vor die Schreiboperation verschoben werden. Wenn wir die Verschiebung nicht verhindern, kann die Schreibbarriere möglicherweise eine graue Objektfarbe sehen und abbrechen, während ein Worker-Thread das Objekt ohne den neuen Wert markiert. Die ursprüngliche von Dijkstra et al. vorgeschlagene Schreibbarriere überprüft ebenfalls nicht die Objektfarbe. Sie haben dies aus Einfachheit getan, aber wir benötigen dies zur Korrektheit.

### Bailout-Arbeitsliste

Einige Operationen, beispielsweise Code-Patching, erfordern exklusiven Zugriff auf das Objekt. Früh entschieden wir, auf Per-Objekt-Sperren zu verzichten, da diese zu einem Prioritätsumkehrungsproblem führen können, bei dem der Haupt-Thread auf einen Worker-Thread warten muss, der während des Haltens einer Objektsperre descheduled wird. Anstatt ein Objekt zu sperren, erlauben wir dem Worker-Thread, das Besuchen des Objekts abzubrechen. Der Worker-Thread macht dies, indem er das Objekt in die Bailout-Arbeitsliste schiebt, die nur vom Haupt-Thread verarbeitet wird:

![Abbildung 7. Die Bailout-Arbeitsliste](/_img/concurrent-marking/10.svg)

Worker-Threads brechen bei optimierten Code-Objekten, versteckten Klassen und schwachen Sammlungen ab, weil ihr Besuch eine Sperrung oder teure Synchronisationsprotokolle erfordern würde.

Rückblickend hat sich die Bailout-Arbeitsliste als großartig für inkrementelle Entwicklung erwiesen. Wir haben mit der Implementierung begonnen, indem Worker-Threads bei allen Objekttypen abbrachen und die Parallelität nach und nach hinzugefügt.

### Änderungen an der Objektlayout

Ein Feld eines Objekts kann drei Arten von Werten speichern: einen markierten Zeiger, einen markierten kleinen Integer (auch bekannt als Smi) oder einen unmarkierten Wert wie eine unboxed Gleitkommazahl. [Zeiger-Markierung](https://en.wikipedia.org/wiki/Tagged_pointer) ist eine wohlbekannte Technik, die eine effiziente Darstellung von unboxed Integern ermöglicht. In V8 zeigt das am wenigsten signifikante Bit eines markierten Werts an, ob es sich um einen Zeiger oder einen Integer handelt. Dies basiert auf der Tatsache, dass Zeiger wortausgerichtet sind. Die Information darüber, ob ein Feld markiert oder unmarkiert ist, wird in der versteckten Klasse des Objekts gespeichert.

Einige Operationen in V8 ändern ein Objektfeld von markiert zu unmarkiert (oder umgekehrt), indem sie das Objekt zu einer anderen versteckten Klasse überführen. Eine solche Änderung des Objektlayouts ist für das gleichzeitige Markieren unsicher. Wenn die Änderung erfolgt, während ein Worker-Thread das Objekt gleichzeitig mithilfe der alten versteckten Klasse besucht, sind zwei Arten von Fehlern möglich. Erstens könnte der Worker einen Zeiger verpassen und denken, dass es sich um einen unmarkierten Wert handelt. Die Schreibbarriere schützt vor dieser Art von Fehler. Zweitens könnte der Worker einen unmarkierten Wert als Zeiger behandeln und darauf zugreifen, was zu einem ungültigen Speicherzugriff führt, gefolgt von einem Programmabsturz. Um diesen Fall zu behandeln, verwenden wir ein Snapshotting-Protokoll, das sich an der Mark-Bit des Objekts synchronisiert. Das Protokoll umfasst zwei Parteien: den Haupt-Thread, der ein Objektfeld von markiert zu unmarkiert ändert, und den Worker-Thread, der das Objekt besucht. Bevor das Feld geändert wird, stellt der Haupt-Thread sicher, dass das Objekt als schwarz markiert wird und fügt es zur Bailout-Arbeitsliste zum späteren Besuch hinzu:

```cpp
atomic_color_transition(object, weiß, grau);
if (atomic_color_transition(object, grau, schwarz)) {
  // Das Objekt wird später vom Haupt-Thread während der Bearbeitung
  // der Bailout-Arbeitsliste erneut besucht.
  bailout_worklist.push(object);
}
unsafe_object_layout_change(object);
```

Wie im unten stehenden Codeausschnitt gezeigt, lädt der Worker-Thread zunächst die versteckte Klasse des Objekts und snapshottet alle Zeigerfelder des Objekts, die von der versteckten Klasse angegeben werden, mithilfe von [atomaren entspannten Ladeoperationen](https://en.cppreference.com/w/cpp/atomic/memory_order#Relaxed_ordering). Dann versucht er, das Objekt schwarz zu markieren, indem er eine atomare Vergleichs- und Tauschoperation ausführt. Wenn das Markieren erfolgreich ist, bedeutet dies, dass das Snapshot konsistent mit der versteckten Klasse sein muss, da der Haupt-Thread das Objekt schwarz markiert, bevor er dessen Layout ändert.

```cpp
snapshot = [];
hidden_class = atomic_relaxed_load(&object.hidden_class);
für (field_offset in pointer_field_offsets(hidden_class)) {
  pointer = atomic_relaxed_load(object + field_offset);
  snapshot.add(field_offset, pointer);
}
wenn (atomic_color_transition(object, grey, black)) {
  visit_pointers(snapshot);
}
```

Beachten Sie, dass ein weißes Objekt, das eine unsichere Layoutänderung durchläuft, im Hauptthread markiert werden muss. Unsichere Layoutänderungen sind relativ selten, daher hat dies keine großen Auswirkungen auf die Leistung von Anwendungen in der realen Welt.

## Alles zusammenführen

Wir haben die gleichzeitige Markierung in die bestehende Infrastruktur für inkrementelles Markieren integriert. Der Hauptthread initiiert das Markieren, indem er die Wurzeln scannt und die Markierungs-Arbeitsliste füllt. Danach werden gleichzeitige Markierungsaufgaben an die Worker-Threads gepostet. Die Worker-Threads helfen dem Hauptthread, schneller Markierungsfortschritte zu erzielen, indem sie die Markierungs-Arbeitsliste kooperativ leeren. Gelegentlich nimmt der Hauptthread an der Markierung teil, indem er die Bailout-Arbeitsliste und die Markierungs-Arbeitsliste verarbeitet. Sobald die Markierungs-Arbeitslisten leer werden, schließt der Hauptthread die Müllsammlung ab. Während der Finalisierung scannt der Hauptthread die Wurzeln erneut und entdeckt möglicherweise weitere weiße Objekte. Diese Objekte werden mit Hilfe der Worker-Threads parallel markiert.

![](/_img/concurrent-marking/11.svg)

## Ergebnisse

Unser [Benchmarking-Framework für die reale Welt](/blog/real-world-performance) zeigt etwa 65% und 70% Reduktion der Markierungszeit des Hauptthreads pro Müllsammelzyklus auf Mobil- und Desktop-Plattformen.

![Zeitaufwand für das Markieren im Hauptthread (je niedriger, desto besser)](/_img/concurrent-marking/12.svg)

Die gleichzeitige Markierung reduziert auch Müllsammel-Stottern in Node.js. Dies ist besonders wichtig, da Node.js nie eine Planung der Müllsammlung während Leerlaufzeiten implementiert hat und daher nie in der Lage war, Markierungszeiten in nicht-stotterkritischen Phasen zu verbergen. Die gleichzeitige Markierung wurde in Node.js v10 ausgeliefert.
