---
title: &apos;Hochleistungs-Müllsammlung für C++&apos;
author: &apos;Anton Bikineev, Omer Katz ([@omerktz](https://twitter.com/omerktz)) und Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz)), C++ Speicherflüsterer&apos;
avatars:
  - &apos;anton-bikineev&apos;
  - &apos;omer-katz&apos;
  - &apos;michael-lippautz&apos;
date: 2020-05-26
tags:
  - Interna
  - Speicher
  - cppgc
description: &apos;Dieser Beitrag beschreibt den Oilpan C++ Garbage Collector, seine Verwendung in Blink und wie er das Sweeping, d.h. die Rückgewinnung von nicht mehr erreichbarem Speicher, optimiert.&apos;
tweet: &apos;1265304883638480899&apos;
---

In der Vergangenheit haben wir [bereits](https://v8.dev/blog/trash-talk) [über](https://v8.dev/blog/concurrent-marking) [die](https://v8.dev/blog/tracing-js-dom) Müllsammlung für JavaScript, das Document Object Model (DOM) und wie dies alles in V8 implementiert und optimiert wird, geschrieben. Nicht alles in Chromium ist jedoch JavaScript, da der größte Teil des Browsers und seiner Blink-Rendering-Engine, in die V8 eingebettet ist, in C++ geschrieben wurde. JavaScript kann verwendet werden, um mit dem DOM zu interagieren, das dann von der Rendering-Pipeline verarbeitet wird.

<!--truncate-->
Da das C++-Objekt-Diagramm rund um das DOM stark mit JavaScript-Objekten verknüpft ist, hat das Chromium-Team vor einigen Jahren auf einen Garbage Collector namens [Oilpan](https://www.youtube.com/watch?v=_uxmEyd6uxo) umgestellt, um diese Art von Speicher zu verwalten. Oilpan ist ein in C++ geschriebener Garbage Collector zur Verwaltung von C++-Speicher, der mit V8 über [cross-component tracing](https://research.google/pubs/pub47359/) verbunden werden kann und das verworrene C++/JavaScript-Objekt-Diagramm als einen Heap behandelt.

Dieser Beitrag ist der erste in einer Serie von Oilpan-Blogposts, die einen Überblick über die grundlegenden Prinzipien von Oilpan und seine C++-APIs geben. In diesem Beitrag werden wir einige der unterstützten Funktionen behandeln, erklären, wie sie mit den verschiedenen Subsystemen des Garbage Collectors interagieren und tiefgehend darauf eingehen, wie Objekte im Sweeper gleichzeitig zurückgewonnen werden.

Am aufregendsten ist, dass Oilpan derzeit in Blink implementiert ist, aber in Form einer [Bibliothek zur Müllsammlung](https://chromium.googlesource.com/v8/v8.git/+/HEAD/include/cppgc/) zu V8 verlagert wird. Das Ziel ist es, C++-Garbage-Sammlung allgemein für alle V8-Einbettungen und mehr C++-Entwickler zugänglich zu machen.

## Hintergrund

Oilpan implementiert einen [Mark-Sweep](https://de.wikipedia.org/wiki/Tracing_garbage_collection) Garbage Collector, bei dem die Müllsammlung in zwei Phasen unterteilt ist: *Markierung*, bei der der verwaltete Heap auf lebende Objekte gescannt wird, und *Sweeping*, bei der tote Objekte auf dem verwalteten Heap zurückgewonnen werden.

Wir haben die Grundlagen der Markierung bereits bei der Einführung von [Concurrent Marking in V8](https://v8.dev/blog/concurrent-marking) behandelt. Zusammengefasst kann das Scannen aller Objekte auf lebende als Graph-Traversierung betrachtet werden, bei der Objekte Knoten und Zeiger zwischen Objekten Kanten sind. Die Traversierung beginnt bei Wurzeln, die Register, nativer Ausführungs-Stack (den wir ab jetzt einfach Stack nennen) und andere Globals sind, wie [hier](https://v8.dev/blog/concurrent-marking#background) beschrieben.

C++ unterscheidet sich in diesem Aspekt nicht von JavaScript. Im Gegensatz zu JavaScript sind C++-Objekte jedoch statisch typisiert und können ihre Darstellung zur Laufzeit nicht ändern. C++-Objekte, die mit Oilpan verwaltet werden, nutzen diese Tatsache und bieten eine Beschreibung von Zeigern zu anderen Objekten (Kanten im Diagramm) über das Besucher-Muster. Das grundlegende Muster zur Beschreibung von Oilpan-Objekten ist folgendes:

```cpp
class LinkedNode final : public GarbageCollected<LinkedNode> {
 public:
  LinkedNode(LinkedNode* next, int value) : next_(next), value_(value) {}
  void Trace(Visitor* visitor) const {
    visitor->Trace(next_);
  }
 private:
  Member<LinkedNode> next_;
  int value_;
};

LinkedNode* CreateNodes() {
  LinkedNode* first_node = MakeGarbageCollected<LinkedNode>(nullptr, 1);
  LinkedNode* second_node = MakeGarbageCollected<LinkedNode>(first_node, 2);
  return second_node;
}
```

Im obigen Beispiel wird `LinkedNode` von Oilpan verwaltet, wie durch die Vererbung von `GarbageCollected<LinkedNode>` angegeben. Wenn der Garbage Collector ein Objekt verarbeitet, entdeckt er ausgehende Zeiger, indem er die `Trace`-Methode des Objekts aufruft. Der Typ `Member` ist ein intelligenter Zeiger, der syntaktisch ähnlich zu z.B. `std::shared_ptr` ist, der von Oilpan bereitgestellt wird und verwendet wird, um einen konsistenten Zustand während der Traversierung des Diagramms während der Markierung aufrechtzuerhalten. All dies ermöglicht es Oilpan, genau zu wissen, wo Zeiger in seinen verwalteten Objekten wohnen.

Eifrige Leser haben wahrscheinlich bemerkt ~~und könnten erschrocken sein~~, dass `first_node` und `second_node` im obigen Beispiel als rohe C++-Zeiger auf dem Stack gehalten werden. Oilpan fügt keine Abstraktionen für die Arbeit mit dem Stack hinzu und verlässt sich ausschließlich auf konservatives Stack-Scanning, um Zeiger in seinen verwalteten Heap zu finden, wenn Wurzeln verarbeitet werden. Dies funktioniert, indem der Stack Wort für Wort durchlaufen und diese Wörter als Zeiger in den verwalteten Heap interpretiert werden. Das bedeutet, dass Oilpan keine Leistungseinbußen für den Zugriff auf stack-allozierte Objekte verursacht. Stattdessen werden die Kosten auf die Garbage-Collection-Zeit verschoben, wo der Stack konservativ gescannt wird. Oilpan, wie es im Renderer integriert ist, versucht, die Garbage Collection zu verzögern, bis ein Zustand erreicht wird, in dem garantiert ist, dass keine interessanten Stacks vorhanden sind. Da das Web ereignisbasiert ist und die Ausführung durch die Verarbeitung von Aufgaben in Ereignisschleifen gesteuert wird, gibt es reichlich solche Gelegenheiten.

Oilpan wird in Blink verwendet, welches eine große C++-Codebasis mit viel ausgereiftem Code ist, und unterstützt daher auch:

- Mehrfachvererbung durch Mixins und Verweise auf solche Mixins (interne Zeiger).
- Auslösen der Garbage Collection während der Ausführung von Konstruktoren.
- Das Lebenderhalten von Objekten aus nicht verwaltetem Speicher durch `Persistent`-Smartpointer, die als Wurzeln behandelt werden.
- Kollektionen, die sequentielle (z. B. Vektoren) und assoziative (z. B. Sets und Maps) Container mit Kompaktierung der Speicherzuweisungen abdecken.
- Schwache Referenzen, schwache Rückrufe und [Ephemerons](https://en.wikipedia.org/wiki/Ephemeron).
- Finalizer-Rückrufe, die vor der Rückgewinnung einzelner Objekte ausgeführt werden.

## Aufräumen für C++

Bleiben Sie dran für einen separaten Blog-Post, in dem detailliert beschrieben wird, wie das Markieren in Oilpan funktioniert. In diesem Artikel gehen wir davon aus, dass das Markieren abgeschlossen ist und Oilpan mit Hilfe ihrer `Trace`-Methoden alle erreichbaren Objekte entdeckt hat. Nach dem Markieren haben alle erreichbaren Objekte ihr Markierungs-Bit gesetzt.

Das Aufräumen ist nun die Phase, in der nicht erreichbare Objekte (diejenigen, die während des Markierens nicht erreichbar waren) zurückgewonnen und deren zugrunde liegender Speicher entweder dem Betriebssystem zurückgegeben oder für nachfolgende Speicheranforderungen verfügbar gemacht wird. Im Folgenden zeigen wir, wie Oilpans Aufräumer funktioniert – sowohl aus Nutzungs- als auch Einschränkungsperspektive – und wie er eine hohe Rückgewinnungsrate erzielt.

Der Aufräumer findet nicht erreichbare Objekte, indem er den Heap-Speicher durchläuft und die Markierungs-Bits überprüft. Um die C++-Semantik zu bewahren, muss der Aufräumer den Destruktor jedes nicht erreichbaren Objekts aufrufen, bevor dessen Speicher freigegeben wird. Nicht-triviale Destruktoren werden als Finalizer implementiert.

Aus Sicht des Programmierers gibt es keine definierte Reihenfolge, in der Destruktoren ausgeführt werden, da die Iteration, die der Aufräumer verwendet, die Konstruktionsreihenfolge nicht berücksichtigt. Dies bedeutet eine Einschränkung, dass Finalizer keine anderen Objekte im Heap berühren dürfen. Dies ist eine häufige Herausforderung beim Schreiben von Benutzer-Code, der eine Finalisierungs-Reihenfolge erfordert, da verwaltete Sprachen in der Regel keine Reihenfolge in ihren Finalisierungssemantiken unterstützen (z. B. Java). Oilpan verwendet ein Clang-Plugin, das, neben vielen anderen Dingen, statisch überprüft, dass während der Zerstörung eines Objekts keine Heap-Objekte zugegriffen werden:

```cpp
class GCed : public GarbageCollected<GCed> {
 public:
  void DoSomething();
  void Trace(Visitor* visitor) {
    visitor->Trace(other_);
  }
  ~GCed() {
    other_->DoSomething();  // Fehler: Finalizer &apos;~GCed&apos; greift auf
                            // potenziell finalisiertes Feld &apos;other_&apos; zu.
  }
 private:
  Member<GCed> other_;
};
```

Für die Neugierigen: Oilpan bietet Pre-Finalisierungs-Rückrufe für komplexe Anwendungsfälle, die den Zugriff auf den Heap vor der Zerstörung von Objekten erfordern. Solche Rückrufe verursachen jedoch mehr Overhead pro Garbage-Collection-Zyklus und werden in Blink nur sparsam verwendet.

## Inkrementelles und paralleles Aufräumen

Nachdem wir die Einschränkungen von Destruktoren in einer verwalteten C++-Umgebung behandelt haben, ist es Zeit, sich genauer anzusehen, wie Oilpan die Aufräumphase implementiert und optimiert.

Bevor wir ins Detail gehen, ist es wichtig, sich daran zu erinnern, wie Programme im Allgemeinen im Web ausgeführt werden. Jede Ausführung, z. B. von JavaScript-Programmen, aber auch Garbage Collection, wird vom Hauptthread durch die Verteilung von Aufgaben in einer [Ereignisschleife](https://en.wikipedia.org/wiki/Event_loop) gesteuert. Der Renderer unterstützt, ähnlich wie andere Anwendungsumgebungen, Hintergrundaufgaben, die parallel zum Hauptthread ausgeführt werden, um die Verarbeitung von Hauptthread-Arbeiten zu erleichtern.

Zu Beginn einfach: Oilpan implementierte ursprünglich ein Stop-the-World-Aufräumen, das als Teil der Garbage-Collection-Finalisierungspause lief und die Ausführung der Anwendung im Hauptthread unterbrach:

![Stop-the-World-Aufräumen](/_img/high-performance-cpp-gc/stop-the-world-sweeping.svg)

Für Anwendungen mit weichen Echtzeitanforderungen ist der bestimmende Faktor beim Umgang mit Garbage Collection die Latenz. Stop-the-World-Aufräumen kann eine signifikante Pausenzeit verursachen, die eine für den Benutzer sichtbare Anwendungs-Latenz zur Folge hat. Im nächsten Schritt zur Reduzierung der Latenz wurde das Aufräumen inkrementell gemacht:

![Inkrementelles Aufräumen](/_img/high-performance-cpp-gc/incremental-sweeping.svg)

Mit dem inkrementellen Ansatz wird das Sweeping aufgeteilt und zusätzlichen Hauptthread-Aufgaben delegiert. Im besten Fall werden solche Aufgaben vollständig in der [Leerlaufzeit](https://research.google/pubs/pub45361/) ausgeführt, wodurch eine Beeinträchtigung der regulären Anwendungsausführung vermieden wird. Intern teilt der Sweeper die Arbeit in kleinere Einheiten basierend auf dem Konzept von Seiten auf. Seiten können sich in zwei interessanten Zuständen befinden: *zu-kehrende* Seiten, die der Sweeper noch verarbeiten muss, und *bereits-gekehrte* Seiten, die der Sweeper bereits verarbeitet hat. Bei der Speicherzuweisung werden nur bereits-gekehrte Seiten berücksichtigt, und lokale Zuweisungspuffer (LABs) werden aus freien Listen aufgefüllt, die eine Liste verfügbarer Speicherblöcke enthalten. Um Speicher aus einer freien Liste zu erhalten, versucht die Anwendung zunächst, Speicher in bereits-gekehrten Seiten zu finden, hilft dann bei der Verarbeitung von zu-kehrenden Seiten, indem sie den Sweep-Algorithmus in die Zuweisung integriert, und fordert neuen Speicher vom Betriebssystem nur an, wenn keiner verfügbar ist.

Oilpan verwendet seit Jahren inkrementelles Sweeping, aber da Anwendungen und die resultierenden Objektgraphen immer größer wurden, begann das Sweeping, die Anwendungsleistung zu beeinträchtigen. Um das inkrementelle Sweeping zu verbessern, haben wir begonnen, Hintergrundaufgaben für die gleichzeitige Wiederherstellung von Speicher zu nutzen. Es gibt zwei grundlegende Invarianten, die verwendet werden, um Datenrennen zwischen Hintergrundaufgaben, die den Sweeper ausführen, und der Anwendung, die neue Objekte zuweist, auszuschließen:

- Der Sweeper verarbeitet nur toten Speicher, der per Definition von der Anwendung nicht erreichbar ist.
- Die Anwendung weist nur auf bereits-gekehrten Seiten zu, die per Definition nicht mehr vom Sweeper verarbeitet werden.

Beide Invarianten stellen sicher, dass es keinen Konflikt um das Objekt und seinen Speicher geben sollte. Leider hängt C++ stark von Destruktoren ab, die als Finalizer implementiert sind. Oilpan erzwingt, dass Finalizer im Hauptthread ausgeführt werden, um Entwicklern zu helfen und Datenrennen im Anwendungscode selbst auszuschließen. Um dieses Problem zu lösen, verschiebt Oilpan die Objekt-Finalisierung auf den Hauptthread. Konkret wird jedes Mal, wenn der gleichzeitige Sweeper auf ein Objekt stößt, das einen Finalizer (Destruktor) hat, dieses in eine Finalisierungswarteschlange verschoben, die in einer separaten Finalisierungsphase verarbeitet wird, die immer auf dem Hauptthread ausgeführt wird, der auch die Anwendung ausführt. Der gesamte Arbeitsablauf mit gleichzeitigem Sweeping sieht folgendermaßen aus:

![Gleichzeitiges Sweeping mit Hintergrundaufgaben](/_img/high-performance-cpp-gc/concurrent-sweeping.svg)

Da Finalizer möglicherweise Zugriff auf die gesamte Nutzlast des Objekts benötigen, wird das Hinzufügen des entsprechenden Speichers zur freien Liste bis nach der Ausführung des Finalizers verzögert. Wenn keine Finalizer ausgeführt werden, fügt der auf dem Hintergrundthread ausgeführte Sweeper den zurückgewonnenen Speicher sofort der freien Liste hinzu.

# Ergebnisse

Das Hintergrund-Sweeping wurde in Chrome M78 ausgeliefert. Unser [Benchmarking-Framework für reale Anwendungen](https://v8.dev/blog/real-world-performance) zeigt eine Reduzierung der Sweeping-Zeit im Hauptthread um 25%-50% (durchschnittlich 42%). Siehe unten eine ausgewählte Reihe von Datenpunkten.

![Sweeping-Zeit des Hauptthreads in Millisekunden](/_img/high-performance-cpp-gc/results.svg)

Die verbleibende Zeit, die auf dem Hauptthread verbracht wird, ist für die Ausführung von Finalizern vorgesehen. Es wird weiterhin daran gearbeitet, die Anzahl der Finalizer für stark instanziierte Objekttypen in Blink zu reduzieren. Der spannende Teil hierbei ist, dass alle diese Optimierungen im Anwendungscode vorgenommen werden, da das Sweeping sich automatisch anpasst, wenn keine Finalizer vorhanden sind.

Bleiben Sie dran für weitere Beiträge über die Müllsammlung in C++ im Allgemeinen und speziell über Updates der Oilpan-Bibliothek, da wir uns einer Veröffentlichung nähern, die von allen V8-Nutzern verwendet werden kann.
