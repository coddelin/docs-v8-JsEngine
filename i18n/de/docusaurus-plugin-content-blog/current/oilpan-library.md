---
title: 'Oilpan-Bibliothek'
author: 'Anton Bikineev, Omer Katz ([@omerktz](https://twitter.com/omerktz)) und Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz)), effiziente und effektive Dateibeweger'
avatars:
  - anton-bikineev
  - omer-katz
  - michael-lippautz
date: 2021-11-10
tags:
  - internals
  - speicher
  - cppgc
description: 'V8 wird mit Oilpan geliefert, einer Garbage-Collection-Bibliothek zur Verwaltung des verwalteten C++-Speichers.'
tweet: '1458406645181165574'
---

Während der Titel dieses Beitrags möglicherweise darauf hinweist, tief in eine Sammlung von Büchern über Ölpfannen – ein Thema mit überraschend viel Literatur, wenn man Konstruktionstechniken für Pfannen berücksichtigt – einzutauchen, schauen wir stattdessen genauer auf Oilpan, einen C++ Garbage Collector, der seit V8 v9.4 als Bibliothek über V8 bereitgestellt wird.

<!--truncate-->
Oilpan ist ein [Trace-basierter Garbage Collector](https://de.wikipedia.org/wiki/Tracing_garbage_collection), was bedeutet, dass er lebende Objekte durch das Durchlaufen eines Objektgraphs in einer Markierungsphase bestimmt. Tote Objekte werden in einer Sweep-Phase zurückgewonnen, über die wir bereits [früher auf unserem Blog berichtet haben](https://v8.dev/blog/high-performance-cpp-gc). Beide Phasen können abwechselnd oder parallel zum tatsächlichen C++-Anwendungscode ausgeführt werden. Die Referenzverwaltung für Heap-Objekte ist präzise und konservativ für den nativen Stack. Das bedeutet, dass Oilpan weiß, wo Referenzen auf dem Heap liegen, jedoch den Speicher scannen muss, wobei davon ausgegangen wird, dass zufällige Bitsequenzen Zeiger für den Stack darstellen. Oilpan unterstützt auch die Kompaktierung (Defragmentierung des Heaps) für bestimmte Objekte, wenn die Garbage Collection ohne nativen Stack ausgeführt wird.

Was hat es also damit auf sich, es als Bibliothek durch V8 bereitzustellen?

Blink, das von WebKit abgespalten wurde, verwendete ursprünglich Referenzzählung, ein [bekanntes Paradigma für C++-Code](https://en.cppreference.com/w/cpp/memory/shared_ptr), zur Verwaltung seines Speichers im Heap. Die Referenzzählung sollte Speicherverwaltungsprobleme lösen, ist jedoch bekannt dafür, anfällig für Speicherlecks durch Zyklen zu sein. Zusätzlich zu diesem inhärenten Problem litt Blink auch unter [Verwendung-nach-Freigabe-Problemen](https://de.wikipedia.org/wiki/Dangling_pointer), da die Referenzzählung manchmal aus Leistungsgründen weggelassen wurde. Oilpan wurde ursprünglich speziell für Blink entwickelt, um das Programmiermodell zu vereinfachen und Speicherlecks sowie Verwendung-nach-Freigabe-Probleme zu beseitigen. Wir glauben, dass Oilpan erfolgreich war, das Modell zu vereinfachen und den Code sicherer zu machen.

Ein weiterer weniger offensichtlicher Grund für die Einführung von Oilpan in Blink war die Unterstützung der Integration in andere Systeme mit Garbage Collection wie V8, die schließlich zur Implementierung des [vereinheitlichten JavaScript- und C++-Heaps](https://v8.dev/blog/tracing-js-dom) führte, bei dem Oilpan C++-Objekte[^1] verarbeitet. Mit immer mehr verwalteten Objekt-Hierarchien und besserer Integration in V8 wurde Oilpan im Laufe der Zeit immer komplexer und das Team erkannte, dass es die gleichen Konzepte wie in V8s Garbage Collector neu erfand und die gleichen Probleme löste. Die Integration in Blink erforderte den Bau von etwa 30k Zielen, um tatsächlich einen „Hello World“-Garbage-Collection-Test für den vereinheitlichten Heap auszuführen.

Anfang 2020 begannen wir eine Reise, Oilpan aus Blink herauszulösen und in eine Bibliothek zu kapseln. Wir beschlossen, den Code in V8 zu hosten, Abstraktionen wo möglich wiederzuverwenden und eine grundlegende Bereinigung der Garbage-Collection-Schnittstelle vorzunehmen. Zusätzlich zur Behebung aller oben genannten Probleme würde [eine Bibliothek](https://docs.google.com/document/d/1ylZ25WF82emOwmi_Pg-uU6BI1A-mIbX_MG9V87OFRD8/) auch anderen Projekten ermöglichen, Garbage-Collection-C++ zu nutzen. Wir haben die Bibliothek in V8 v9.4 eingeführt und sie in Blink ab Chromium M94 aktiviert.

## Was steckt drin?

Ähnlich wie der Rest von V8 bietet Oilpan jetzt eine [stabile API](https://chromium.googlesource.com/v8/v8.git/+/HEAD/include/cppgc/) und Einbettende können sich auf die regulären [V8-Konventionen](https://v8.dev/docs/api) verlassen. Beispielsweise bedeutet dies, dass die APIs ordnungsgemäß dokumentiert sind (siehe [GarbageCollected](https://chromium.googlesource.com/v8/v8.git/+/main/include/cppgc/garbage-collected.h#17)) und eine Deprecation-Periode durchlaufen, falls sie entfernt oder geändert werden sollen.

Der Kern von Oilpan ist als eigenständiger C++-Garbage-Collector im `cppgc`-Namespace verfügbar. Die Einrichtung ermöglicht auch, eine vorhandene V8-Plattform zu nutzen, um einen Heap für verwaltete C++-Objekte zu erstellen. Garbage Collections können so konfiguriert werden, dass sie automatisch ausgeführt werden und sich in die Task-Infrastruktur integrieren, oder sie können explizit unter Berücksichtigung des nativen Stacks ausgelöst werden. Die Idee ist, Embedders, die nur verwaltete C++-Objekte benötigen, zu ermöglichen, sich nicht mit V8 als Ganzem zu befassen. Sehen Sie sich dieses [„Hello-World“-Programm](https://chromium.googlesource.com/v8/v8.git/+/main/samples/cppgc/hello-world.cc) als Beispiel an. Ein Embedder dieser Konfiguration ist PDFium, das die eigenständige Version von Oilpan zum [Schutz von XFA](https://groups.google.com/a/chromium.org/g/chromium-dev/c/RAqBXZWsADo/m/9NH0uGqCAAAJ?utm_medium=email&utm_source=footer) verwendet, wodurch dynamischere PDF-Inhalte ermöglicht werden.

Praktischerweise verwenden Tests für den Kern von Oilpan diese Einrichtung, was bedeutet, dass es nur Sekunden dauert, einen spezifischen Garbage-Collection-Test zu erstellen und auszuführen. Heute existieren [über 400 solcher Unit-Tests](https://source.chromium.org/chromium/chromium/src/+/main:v8/test/unittests/heap/cppgc/) für den Kern von Oilpan. Die Einrichtung dient auch als Spielwiese, um zu experimentieren und neue Dinge auszuprobieren und kann verwendet werden, um Annahmen zur Rohleistung zu validieren.

Die Oilpan-Bibliothek kümmert sich auch um die Verarbeitung von C++-Objekten, wenn sie mit dem einheitlichen Heap über V8 verwendet wird, was eine vollständige Verflechtung von C++- und JavaScript-Objektgraphen ermöglicht. Diese Konfiguration wird in Blink verwendet, um den C++-Speicher des DOM und mehr zu verwalten. Oilpan stellt auch ein Trait-System bereit, mit dem der Kern des Garbage Collectors um Typen erweitert werden kann, die spezifische Anforderungen zur Bestimmung der Lebendigkeit haben. Auf diese Weise kann Blink seine eigenen Sammlungslibraries bereitstellen, die sogar den Aufbau von JavaScript-ähnlichen Ephemeron-Maps ([`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)) in C++ ermöglichen. Wir empfehlen dies nicht jedem, aber es zeigt, zu welchen Anpassungen dieses System in der Lage ist.

## Wohin geht die Reise?

Die Oilpan-Bibliothek bietet uns eine solide Grundlage, die wir nun nutzen können, um die Leistung zu verbessern. Wo zuvor Garbage-Collection-spezifische Funktionen in der öffentlichen API von V8 benötigt wurden, um mit Oilpan zu interagieren, können wir jetzt direkt implementieren, was wir brauchen. Dies ermöglicht schnelle Iterationen sowie Abkürzungen und Leistungsverbesserungen, wo möglich.

Wir sehen auch Potenzial darin, bestimmte grundlegende Container direkt durch Oilpan bereitzustellen, um das Rad nicht neu zu erfinden. Dies würde anderen Embedders ermöglichen, von Datenstrukturen zu profitieren, die zuvor spezifisch für Blink erstellt wurden.

In Erwartung einer vielversprechenden Zukunft für Oilpan möchten wir darauf hinweisen, dass die bestehenden [`EmbedderHeapTracer`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-embedder-heap.h;l=75)-APIs nicht weiter verbessert werden und zu einem bestimmten Zeitpunkt möglicherweise veraltet sein könnten. Bereits Ressourcen nutzende Embedders, die ihre eigene Tracing-Systeme implementiert haben, sollten in der Lage sein, problemlos zu Oilpan zu wechseln, indem sie einfach die C++-Objekte auf einem neugeschaffenen [Oilpan-Heap](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-cppgc.h;l=91) zuweisen, der dann an ein V8-Isolate angehängt wird. Bestehende Infrastrukturen für Referenzmodellierung wie [`TracedReference`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-traced-handle.h;l=334) (für Referenzen innerhalb von V8) und [interne Felder](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-object.h;l=502) (für Referenzen, die aus V8 ausgehen) werden von Oilpan unterstützt.

Bleiben Sie dran für weitere Verbesserungen der Garbage Collection in der Zukunft!

Probleme entdeckt oder Vorschläge? Lassen Sie es uns wissen:

- [oilpan-dev@chromium.org](mailto:oilpan-dev@chromium.org)
- Monorail: [Blink>GarbageCollection](https://bugs.chromium.org/p/chromium/issues/entry?template=Defect+report+from+user&components=Blink%3EGarbageCollection) (Chromium), [Oilpan](https://bugs.chromium.org/p/v8/issues/entry?template=Defect+report+from+user&components=Oilpan) (V8)

[^1]: Weitere Informationen zur Garbage Collection über Komponenten hinweg finden Sie im [Forschungsartikel](https://research.google/pubs/pub48052/).
