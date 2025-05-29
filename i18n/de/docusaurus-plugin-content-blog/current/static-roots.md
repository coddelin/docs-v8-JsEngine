---
title: 'Statische Wurzeln: Objekte mit zur Kompilierungszeit konstanten Adressen'
author: 'Olivier Flückiger'
avatars:
  - olivier-flueckiger
date: 2024-02-05
tags:
  - JavaScript
description: "Statische Wurzeln machen die Adressen bestimmter JS-Objekte zu einer zur Kompilierungszeit konstanten Größe."
tweet: ''
---

Haben Sie sich jemals gefragt, woher `undefined`, `true` und andere zentrale JavaScript-Objekte stammen? Diese Objekte sind die Atome eines jeden benutzerdefinierten Objekts und müssen zuerst vorhanden sein. V8 nennt sie unbewegliche, unveränderliche Wurzeln, und sie befinden sich in ihrem eigenen Heap – dem schreibgeschützten Heap. Da sie ständig verwendet werden, ist ein schneller Zugriff entscheidend. Und was könnte schneller sein, als ihre Speicheradresse zur Kompilierungszeit korrekt zu erraten?

<!--truncate-->
Betrachten Sie als Beispiel die äußerst häufige `IsUndefined`-[API-Funktion](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-value.h?q=symbol:%5Cbv8::Value::IsUndefined%5Cb%20case:yes). Anstatt die Adresse des `undefined`-Objekts für Referenzen nachschlagen zu müssen, was wäre, wenn wir einfach prüfen könnten, ob ein Objektzeiger mit, sagen wir, `0x61` endet, um zu wissen, ob es `undefined` ist. Genau das erreicht die V8-Funktion *statische Wurzeln*. Dieser Beitrag beleuchtet die Hürden, die wir überwinden mussten, um dies zu erreichen. Die Funktion ist in Chrome 111 eingetroffen und hat Leistungsverbesserungen im gesamten VM gebracht, insbesondere eine Beschleunigung von C++-Code und eingebauten Funktionen.

## Bootstrapping des schreibgeschützten Heaps

Das Erstellen der schreibgeschützten Objekte benötigt etwas Zeit, daher erstellt V8 sie zur Kompilierungszeit. Um V8 zu kompilieren, wird zunächst ein minimales Proto-V8-Binärdatei namens `mksnapshot` kompiliert. Dieses erstellt alle gemeinsamen schreibgeschützten Objekte sowie den nativen Code von eingebauten Funktionen und schreibt sie in einen Schnappschuss. Anschließend wird die eigentliche V8-Binärdatei kompiliert und mit dem Schnappschuss gebündelt. Um V8 zu starten, wird der Schnappschuss in den Speicher geladen, und wir können sofort mit der Nutzung seines Inhalts beginnen. Das folgende Diagramm zeigt den vereinfachten Build-Prozess für die eigenständige `d8`-Binärdatei.

![](/_img/static-roots/static-roots1.svg)

Sobald `d8` läuft, haben alle schreibgeschützten Objekte ihren festen Platz im Speicher und bewegen sich nie. Beim JITten von Code können wir z. B. direkt auf `undefined` über seine Adresse verweisen. Beim Erstellen des Schnappschusses und beim Kompilieren des C++-Codes für libv8 ist die Adresse jedoch noch nicht bekannt. Sie hängt von zwei zur Build-Zeit unbekannten Faktoren ab: erstens vom Binärlayout des schreibgeschützten Heaps und zweitens davon, wo sich dieser im Speicherplatz befindet.

## Wie lassen sich Adressen vorhersagen?

V8 verwendet [Pointer-Kompression](https://v8.dev/blog/pointer-compression). Anstatt vollständiger 64-Bit-Adressen verweisen wir auf Objekte mittels eines 32-Bit-Offsets in einem 4-GB-Speicherbereich. Für viele Operationen wie Eigenchaftsladungen oder Vergleiche ist der 32-Bit-Offset in diesem Bereich ausreichend, um ein Objekt eindeutig zu identifizieren. Daher ist unser zweites Problem – unbekannter Ort des schreibgeschützten Heaps im Speicherplatz – tatsächlich kein Problem. Wir platzieren den schreibgeschützten Heap einfach zu Beginn jedes Pointer-Kompressionsbereichs, wodurch er eine bekannte Lage erhält. Von allen Objekten im V8-Heap hat `undefined` z. B. immer die kleinste komprimierte Adresse, beginnend bei 0x61 Bytes. So wissen wir, dass, wenn die unteren 32 Bits der vollständigen Adresse eines JS-Objekts 0x61 sind, es sich um `undefined` handeln muss.

Dies ist bereits nützlich, aber wir möchten diese Adresse im Schnappschuss und in libv8 verwenden können – ein scheinbar zirkuläres Problem. Wenn wir jedoch sicherstellen, dass `mksnapshot` einen deterministischen, bit-identischen schreibgeschützten Heap erstellt, können wir diese Adressen in verschiedenen Builds wiederverwenden. Um sie in libv8 selbst zu verwenden, bauen wir V8 im Grunde zweimal:

![](/_img/static-roots/static-roots2.svg)

Beim ersten Aufruf von `mksnapshot` wird nur eine Datei erzeugt, die die [Adressen](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/roots/static-roots.h) relativ zur Basis des Speicherbereichs jedes Objekts im schreibgeschützten Heap enthält. In der zweiten Build-Phase kompilieren wir libv8 erneut. Ein Flag stellt sicher, dass wir, wann immer wir auf `undefined` verweisen, buchstäblich `cage_base + StaticRoot::kUndefined` verwenden; der statische Versatz von `undefined` wird natürlich in der Datei static-roots.h definiert. Dies ermöglicht es dem C++-Compiler, der libv8 erstellt, und dem Builtins-Compiler in `mksnapshot`, in vielen Fällen viel effizienteren Code zu erstellen, da die Alternative darin besteht, die Adresse immer aus einer globalen Array-Liste mit Wurzelobjekten zu laden. Am Ende haben wir eine `d8`-Binärdatei, in der die komprimierte Adresse von `undefined` fest auf `0x61` kodiert ist.

Nun, im Prinzip funktioniert alles so, aber praktisch bauen wir V8 nur einmal – dafür hat niemand Zeit. Die generierte Datei static-roots.h wird im Quellcode-Repository zwischengespeichert und muss nur dann neu erstellt werden, wenn wir das Layout des schreibgeschützten Heaps ändern.

## Weitere Anwendungen

Apropos Praktikabilität, statische Wurzeln ermöglichen noch mehr Optimierungen. Zum Beispiel haben wir seitdem gängige Objekte zusammengefasst, was es uns ermöglicht hat, einige Operationen als Bereichsprüfungen über ihre Adressen zu implementieren. So befinden sich beispielsweise alle String-Maps (d.h. die [hidden-class](https://v8.dev/docs/hidden-classes)-Metaobjekte, die das Layout verschiedener String-Typen beschreiben) nebeneinander, daher ist ein Objekt eine Zeichenkette, wenn seine Map eine komprimierte Adresse zwischen `0xdd` und `0x49d` hat. Oder wahre Objekte müssen eine Adresse haben, die mindestens `0xc1` ist.

Nicht alles dreht sich um die Performanz des JITed-Codes in V8. Wie dieses Projekt gezeigt hat, kann eine relativ kleine Änderung am C++-Code ebenfalls erhebliche Auswirkungen haben. Zum Beispiel erzielte Speedometer 2, eine Benchmark, die die V8-API sowie die Interaktion zwischen V8 und dessen Embedder testet, dank statischer Wurzeln etwa 1% mehr Punkte auf einer M1-CPU.
