---
title: 'Verbesserte Code-Caching'
author: 'Mythri Alle, Haupt-Code-Cacher'
date: 2018-04-24 13:33:37
avatars:
  - 'mythri-alle'
tags:
  - internals
tweet: '988728000677142528'
description: 'Ab Chrome 66 speichert V8 mehr (Byte-)Code, indem der Cache nach der Top-Level-Ausführung generiert wird.'
---
V8 verwendet [Code-Caching](/blog/code-caching), um den generierten Code für häufig verwendete Skripte zu speichern. Ab Chrome 66 speichern wir mehr Code, indem wir den Cache nach der Top-Level-Ausführung generieren. Dies führt zu einer Reduktion der Parsing- und Kompilierungszeit um 20–40 % während des ersten Ladevorgangs.

<!--truncate-->
## Hintergrund

V8 verwendet zwei Arten des Code-Cachings, um generierten Code für die spätere Wiederverwendung zu speichern. Die erste ist der In-Memory-Cache, der innerhalb jeder Instanz von V8 verfügbar ist. Der nach der initialen Kompilierung generierte Code wird in diesem Cache gespeichert und ist nach der Quellzeichenfolge indiziert. Dieser steht zur Wiederverwendung innerhalb derselben Instanz von V8 zur Verfügung. Die andere Art des Code-Cachings serialisiert den generierten Code und speichert ihn auf der Festplatte für die spätere Nutzung. Dieser Cache ist nicht spezifisch für eine bestimmte Instanz von V8 und kann über verschiedene Instanzen von V8 hinweg verwendet werden. Dieser Blogpost konzentriert sich auf diese zweite Art des Code-Cachings, wie sie in Chrome verwendet wird. (Andere Integratoren verwenden diese Art des Code-Cachings ebenfalls; sie ist nicht auf Chrome beschränkt. Dieser Blogpost konzentriert sich jedoch nur auf die Verwendung in Chrome.)

Chrome speichert den serialisierten generierten Code im Festplatten-Cache und indiziert ihn mit der URL der Skriptressource. Beim Laden eines Skripts prüft Chrome den Festplatten-Cache. Falls das Skript bereits im Cache ist, übergibt Chrome die Serialisierten Daten als Teil der Kompilierungsanforderung an V8. V8 deserialisiert dann diese Daten, anstatt das Skript zu parsen und zu kompilieren. Es gibt auch zusätzliche Prüfungen, um sicherzustellen, dass der Code noch nutzbar ist (zum Beispiel: eine Versionsinkompatibilität macht die gecachten Daten unbrauchbar).

Echtzeitdaten zeigen, dass die Trefferquote des Code-Caches (für Skripte, die gecacht werden könnten) hoch ist (~86 %). Obwohl die Trefferquote dieser Skripte hoch ist, ist die Menge an Code, die wir pro Skript cachen, nicht sehr hoch. Unsere Analyse zeigte, dass das Erhöhen der Menge des gecachten Codes die Zeit für das Parsen und Kompilieren von JavaScript-Code um etwa 40 % reduzieren würde.

## Erhöhung der Menge an gecachtem Code

Im bisherigen Ansatz war das Code-Caching an die Anforderungen zur Kompilierung des Skripts gekoppelt.

Integratoren konnten V8 anweisen, den während der Top-Level-Kompilierung einer neuen JavaScript-Quelldatei generierten Code zu serialisieren. V8 lieferte den serialisierten Code nach der Kompilierung des Skripts zurück. Wenn Chrome das gleiche Skript erneut anfordert, ruft V8 den serialisierten Code aus dem Cache ab und deserialisiert ihn. V8 vermeidet das vollständige Neukompilieren von Funktionen, die bereits im Cache sind. Diese Szenarien sind in der folgenden Abbildung dargestellt:

![](/_img/improved-code-caching/warm-hot-run-1.png)

V8 kompiliert nur die Funktionen, die voraussichtlich sofort ausgeführt werden (IIFEs), während der Top-Level-Kompilierung und markiert andere Funktionen für die spätere, lazy Kompilierung. Dies hilft, die Ladezeiten der Seite zu verkürzen, indem Funktionen, die nicht benötigt werden, nicht kompiliert werden. Es bedeutet jedoch, dass die serialisierten Daten nur den Code für die Funktionen enthalten, die eifrig kompiliert wurden.

Vor Chrome 59 mussten wir den Code-Cache generieren, bevor eine Ausführung gestartet wurde. Der frühere Baseline-Compiler von V8 (Full-codegen) generierte spezialisierten Code für den Ausführungskontext. Full-codegen nutzte Code-Patching, um Operationen für den spezifischen Ausführungskontext zu beschleunigen. Solcher Code kann nicht einfach serialisiert werden, indem kontextspezifische Daten entfernt werden, um ihn in anderen Ausführungskontexten zu verwenden.

Mit [der Einführung von Ignition](/blog/launching-ignition-and-turbofan) in Chrome 59 ist diese Einschränkung nicht mehr notwendig. Ignition verwendet [datengetriebene Inline-Caches](https://www.youtube.com/watch?v=u7zRSm8jzvA), um Operationen im aktuellen Ausführungskontext zu beschleunigen. Die kontextabhängigen Daten werden in Feedback-Vektoren gespeichert und sind vom generierten Code getrennt. Dies hat die Möglichkeit eröffnet, Code-Caches auch nach der Ausführung des Skripts zu generieren. Während wir das Skript ausführen, werden mehr Funktionen (die für lazy Kompilierung markiert wurden) kompiliert, was es uns ermöglicht, mehr Code zu cachen.

V8 bietet eine neue API, `ScriptCompiler::CreateCodeCache`, um Code-Caches unabhängig von den Kompilierungsanforderungen anzufordern. Das Anfordern von Code-Caches zusammen mit Kompilierungsanforderungen ist veraltet und wird ab V8 v6.6 nicht mehr funktionieren. Seit Version 66 verwendet Chrome diese API, um den Code-Cache nach der Ausführung auf oberster Ebene anzufordern. Die folgende Abbildung zeigt das neue Szenario zur Anforderung des Code-Caches. Der Code-Cache wird nach der Ausführung auf oberster Ebene angefordert und enthält daher den Code für Funktionen, die später während der Ausführung des Skripts kompiliert wurden. Bei späteren Ausführungen (im Folgenden als "heiße" Ausführungen bezeichnet) wird die Kompilierung von Funktionen während der Ausführung auf oberster Ebene vermieden.

![](/_img/improved-code-caching/warm-hot-run-2.png)

## Ergebnisse

Die Leistung dieses Features wurde mit unseren internen [realen Benchmarks](https://cs.chromium.org/chromium/src/tools/perf/page_sets/v8_top_25.py?q=v8.top&sq=package:chromium&l=1) gemessen. Das folgende Diagramm zeigt die Verringerung der Parse- und Kompilierungszeit im Vergleich zum früheren Cache-Schema. Es zeigt eine Reduktion von etwa 20–40 % sowohl bei der Parse- als auch bei der Kompilierungszeit auf den meisten Seiten.

![](/_img/improved-code-caching/parse.png)

![](/_img/improved-code-caching/compile.png)

Daten aus der Praxis zeigen ähnliche Ergebnisse mit einer Reduktion von 20–40 % der Zeit, die für die Kompilierung von JavaScript-Code sowohl auf dem Desktop als auch auf Mobilgeräten aufgewendet wird. Unter Android führt diese Optimierung auch zu einer Reduktion von 1–2 % bei übergeordneten Seitennetzwerkmetriken, wie z. B. der Zeit, die eine Webseite benötigt, um interaktiv zu werden. Wir haben auch die Speicher- und Festplattennutzung von Chrome überwacht und keine merklichen Rückschritte festgestellt.
