---
title: &apos;Jank-Busters Teil Eins&apos;
author: &apos;die Jank-Busters: Jochen Eisinger, Michael Lippautz und Hannes Payer&apos;
avatars:
  - &apos;michael-lippautz&apos;
  - &apos;hannes-payer&apos;
date: 2015-10-30 13:33:37
tags:
  - Speicher
description: &apos;Dieser Artikel behandelt Optimierungen, die zwischen Chrome 41 und Chrome 46 implementiert wurden und die Garbage-Collection-Pausen deutlich reduzieren, was zu einer besseren Benutzererfahrung führt.&apos;
---
Jank, oder anders gesagt sichtbares Stocken, kann bemerkt werden, wenn Chrome nicht in der Lage ist, einen Frame innerhalb von 16,66 ms zu rendern (was die Bewegung mit 60 Frames pro Sekunde unterbricht). Zum jetzigen Zeitpunkt wird der Großteil der V8-Garbage-Collection-Arbeiten auf dem Haupt-Rendering-Thread ausgeführt, siehe Abbildung 1, was häufig zu Jank führt, wenn zu viele Objekte verwaltet werden müssen. Jank zu eliminieren war für das V8-Team schon immer eine hohe Priorität ([1](https://blog.chromium.org/2011/11/game-changer-for-interactive.html), [2](https://www.youtube.com/watch?v=3vPOlGRH6zk), [3](/blog/free-garbage-collection)). Dieser Artikel diskutiert einige Optimierungen, die zwischen Chrome 41 und Chrome 46 implementiert wurden und die Garbage-Collection-Pausen signifikant reduzieren, was zu einer besseren Benutzererfahrung führt.

<!--truncate-->
![Abbildung 1: Garbage-Collection auf dem Haupt-Thread durchgeführt](/_img/jank-busters/gc-main-thread.png)

Eine Hauptursache für Jank während der Garbage-Collection ist die Verarbeitung verschiedener Buchhaltungsdatenstrukturen. Viele dieser Datenstrukturen ermöglichen Optimierungen, die nicht mit der Garbage-Collection zusammenhängen. Zwei Beispiele sind die Liste aller ArrayBuffers und die Liste der Ansichten jedes ArrayBuffers. Diese Listen ermöglichen eine effiziente Implementierung des DetachArrayBuffer-Vorgangs, ohne die Zugriffsgeschwindigkeit auf eine ArrayBuffer-Ansicht zu beeinträchtigen. In Situationen jedoch, in denen eine Webseite Millionen von ArrayBuffers erstellt (z. B. WebGL-basierte Spiele), verursacht das Aktualisieren dieser Listen während der Garbage-Collection erhebliches Jank. In Chrome 46 haben wir diese Listen entfernt und stattdessen getrennte Puffer durch das Einfügen von Checks vor jedem Laden und Speichern in ArrayBuffers erkannt. Dadurch wurden die Kosten für das Durchlaufen der großen Buchhaltungsliste während der GC auf die Programmausführung verteilt, was weniger Jank zur Folge hat. Obwohl die Checks pro Zugriff theoretisch die Durchsatzgeschwindigkeit von Programmen, die stark ArrayBuffers nutzen, verlangsamen können, kann der optimierende Compiler von V8 in der Praxis oft redundante Checks entfernen und verbleibende Checks aus Schleifen herausheben, was zu einem deutlich gleichmäßigeren Ausführungsprofil mit wenig oder gar keinem gesamten Leistungsabfall führt.

Ein weiterer Ursprung von Jank ist die Buchhaltung, die mit der Verfolgung der Lebensdauer von Objekten, die zwischen Chrome und V8 geteilt werden, verbunden ist. Obwohl die Speicherheaps von Chrome und V8 unterschiedlich sind, müssen sie für bestimmte Objekte wie DOM-Knoten synchronisiert werden, die in Chromes C++-Code implementiert sind, aber von JavaScript aus zugänglich sind. V8 erstellt einen undurchsichtigen Datentyp namens Handle, der es Chrome ermöglicht, ein V8-Heap-Objekt zu manipulieren, ohne die Implementierungsdetails zu kennen. Die Lebensdauer des Objekts ist an den Handle gebunden: Solange Chrome den Handle behält, wird der Garbage-Collector von V8 das Objekt nicht entfernen. V8 erstellt eine interne Datenstruktur namens globaler Verweis für jeden Handle, den es zurück an Chrome über die V8-API weitergibt, und diese globalen Verweise zeigen dem Garbage-Collector von V8, dass das Objekt noch existiert. Für WebGL-Spiele kann Chrome Millionen solcher Handles erstellen, und V8 muss wiederum die entsprechenden globalen Verweise erstellen, um deren Lebenszyklus zu verwalten. Das Verarbeiten dieser großen Mengen an globalen Verweisen innerhalb der Haupt-Garbage-Collection-Pause zeigt sich als Jank. Glücklicherweise werden Objekte, die an WebGL kommuniziert werden, oft nur weitergereicht und nie tatsächlich modifiziert, was eine einfache statische [Escape-Analyse](https://en.wikipedia.org/wiki/Escape_analysis) ermöglicht. Im Wesentlichen wird für WebGL-Funktionen, die normalerweise kleine Arrays als Parameter verwenden, die zugrunde liegende Datenkopie auf den Stack verschoben, wodurch ein globaler Verweis überflüssig wird. Das Ergebnis eines solchen gemischten Ansatzes ist eine Reduzierung der Pausenzeit um bis zu 50% für rendering-intensive WebGL-Spiele.

Der Großteil der Garbage-Collection von V8 wird auf dem Haupt-Rendering-Thread durchgeführt. Das Verschieben von Garbage-Collection-Operationen auf parallele Threads reduziert die Wartezeit für den Garbage-Collector und minimiert weiter Jank. Dies ist eine inhärent komplizierte Aufgabe, da die Haupt-JavaScript-Anwendung und der Garbage-Collector gleichzeitig dieselben Objekte beobachten und modifizieren können. Bisher war die Parallelität auf das Ausfegen der alten Generation des regulären JS-Heap beschränkt. Kürzlich haben wir auch das parallele Ausfegen des Code- und Kartenraums des V8-Heaps implementiert. Außerdem haben wir das parallele Freigeben ungenutzter Seiten implementiert, um die Arbeitslast auf dem Haupt-Thread zu reduzieren, siehe Abbildung 2.

![Abbildung 2: Einige Garbage-Collection-Operationen, die von den koncurrenten Garbage-Collection-Threads durchgeführt werden.](/_img/jank-busters/gc-concurrent-threads.png)

Die Wirkung der besprochenen Optimierungen ist deutlich sichtbar in WebGL-basierten Spielen, zum Beispiel im [Oort Online-Demo von Turbolenz](http://oortonline.gl/). Das folgende Video vergleicht Chrome 41 mit Chrome 46:

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/PgrCJpbTs9I" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

Wir sind derzeit dabei, weitere Garbage-Collection-Komponenten inkrementell, koncurrent und parallel zu machen, um die Pausenzeiten der Garbage-Collection im Hauptthread weiter zu verkürzen. Bleiben Sie dran, da wir einige interessante Patches in der Pipeline haben.
