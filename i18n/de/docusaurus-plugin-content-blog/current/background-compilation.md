---
title: 'Hintergrundkompilierung'
author: '[Ross McIlroy](https://twitter.com/rossmcilroy), Verteidiger des Hauptthreads'
avatars:
  - 'ross-mcilroy'
date: 2018-03-26 13:33:37
tags:
  - internals
description: 'Ab Chrome 66 kompiliert V8 JavaScript-Quellcode in einem Hintergrundthread, wodurch die Zeit, die auf dem Hauptthread für die Kompilierung verbracht wird, auf typischen Websites zwischen 5% und 20% reduziert wird.'
tweet: '978319362837958657'
---
TL;DR: Ab Chrome 66 kompiliert V8 JavaScript-Quellcode in einem Hintergrundthread, wodurch die Zeit, die auf dem Hauptthread für die Kompilierung verbracht wird, auf typischen Websites zwischen 5% und 20% reduziert wird.

## Hintergrund

Seit Version 41 unterstützt Chrome [das Parsen von JavaScript-Quelldateien in einem Hintergrundthread](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html) über die V8-API [`StreamedSource`](https://cs.chromium.org/chromium/src/v8/include/v8.h?q=StreamedSource&sq=package:chromium&l=1389). Dadurch kann V8 mit dem Parsen von JavaScript-Quellcode beginnen, sobald Chrome das erste Datenstück der Datei aus dem Netzwerk heruntergeladen hat, und parallel weiter parsen, während Chrome die Datei über das Netzwerk streamt. Dies kann erhebliche Ladezeitverbesserungen bieten, da V8 fast mit dem Parsen des JavaScripts fertig sein kann, wenn der Download der Datei abgeschlossen ist.

<!--truncate-->
Aufgrund von Einschränkungen im ursprünglichen Basiskompilierer von V8 musste V8 jedoch weiterhin zum Hauptthread zurückkehren, um das Parsen abzuschließen und das Skript in JIT-Maschinencode zu kompilieren, der den Code des Skripts ausführt. Mit der Umstellung auf unsere neue [Ignition + TurboFan-Pipeline](/blog/launching-ignition-and-turbofan) können wir nun auch die Bytecode-Kompilierung auf den Hintergrundthread verlagern, wodurch der Hauptthread von Chrome für eine reibungslosere und reaktionsschnellere Web-Browsing-Erfahrung entlastet wird.

## Aufbau eines Bytecode-Kompilierers für Hintergrundthreads

Der Ignition-Bytecode-Kompilierer von V8 nimmt den [abstrakten Syntaxbaum (AST)](https://de.wikipedia.org/wiki/Abstrakter_Syntaxbaum), der vom Parser erstellt wurde, als Eingabe und erzeugt einen Strom von Bytecode (`BytecodeArray`) zusammen mit zugehörigen Metadaten, die es dem Ignition-Interpreter ermöglichen, den JavaScript-Quellcode auszuführen.

![](/_img/background-compilation/bytecode.svg)

Der Bytecode-Kompilierer von Ignition wurde mit Mehrfachverarbeitung im Hinterkopf entwickelt, es waren jedoch einige Änderungen in der gesamten Kompilierungspipeline erforderlich, um die Hintergrundkompilierung zu ermöglichen. Eine der Hauptänderungen bestand darin, zu verhindern, dass die Kompilierungspipeline Objekte im JavaScript-Heap von V8 aufruft, während sie auf dem Hintergrundthread läuft. Objekte im Heap von V8 sind nicht threadsicher, da JavaScript Einzel-Thread-basiert ist und während der Hintergrundkompilierung vom Hauptthread oder vom Garbage Collector von V8 geändert werden könnte.

Es gab zwei Hauptphasen der Kompilierungspipeline, die auf Objekte im Heap von V8 zugriffen: AST-Internalisierung und Bytecode-Finalisierung. Die AST-Internalisierung ist ein Prozess, bei dem literale Objekte (Zeichenketten, Zahlen, Objektliterale, Boilerplate, etc.), die im AST identifiziert wurden, im Heap von V8 zugeordnet werden, sodass sie direkt vom generierten Bytecode verwendet werden können, wenn das Skript ausgeführt wird. Dieser Prozess geschah traditionell unmittelbar nachdem der Parser den AST erstellt hatte. Daher gab es eine Reihe von Schritten, die später in der Kompilierungspipeline darauf angewiesen waren, dass die literalen Objekte zugeordnet worden waren. Um die Hintergrundkompilierung zu ermöglichen, verschoben wir die AST-Internalisierung später in die Kompilierungspipeline, nachdem der Bytecode kompiliert worden war. Dies erforderte Änderungen an den späteren Phasen der Pipeline, um auf die _rohen_ eingebetteten Literalwerte im AST zuzugreifen, anstatt auf internalisierte Heap-Werte.

Die Bytecode-Finalisierung umfasst die Erstellung des endgültigen `BytecodeArray`-Objekts, das zur Ausführung der Funktion verwendet wird, zusammen mit zugehörigen Metadaten — beispielsweise ein `ConstantPoolArray`, das Konstanten speichert, auf die der Bytecode verweist, und eine `SourcePositionTable`, die die JavaScript-Quellzeilen- und Spaltennummern mit den Bytecode-Offsets verknüpft. Da JavaScript eine dynamische Sprache ist, müssen alle diese Objekte im JavaScript-Heap gespeichert werden, um sie von der Müllsammlung gesammelt werden zu können, falls die JavaScript-Funktion, die mit dem Bytecode verknüpft ist, gesammelt wird. Zuvor wurden einige dieser Metadatenobjekte während der Bytecode-Kompilierung zugeordnet und geändert, was den Zugriff auf den JavaScript-Heap umfasste. Um die Hintergrundkompilierung zu ermöglichen, wurde der Bytecode-Generator von Ignition umstrukturiert, um die Details dieser Metadaten zu verfolgen und ihre Zuweisung im JavaScript-Heap auf die absoluten Endphasen der Kompilierung zu verschieben.

Mit diesen Änderungen kann fast die gesamte Kompilierung des Skripts zu einem Hintergrundthread verlagert werden, wobei nur die kurzen AST-Internalisierungs- und Bytecode-Finalisierungsschritte auf dem Hauptthread kurz vor der Skriptausführung erfolgen.

![](/_img/background-compilation/threads.svg)

Derzeit werden nur Skriptcode auf oberster Ebene und sofort aufgerufene Funktionsausdrücke (IIFEs) in einem Hintergrund-Thread kompiliert — innere Funktionen werden weiterhin faul kompiliert (beim ersten Ausführen) im Hauptthread. Wir hoffen, die Hintergrundkompilierung in Zukunft auf weitere Situationen auszudehnen. Aber auch mit diesen Einschränkungen bleibt der Hauptthread länger frei, wodurch er andere Aufgaben ausführen kann, wie z. B. auf Benutzerinteraktionen zu reagieren, Animationen zu rendern oder allgemein ein reibungsloseres und reaktionsschnelleres Erlebnis zu ermöglichen.

## Ergebnisse

Wir haben die Leistung der Hintergrundkompilierung anhand unseres [Benchmarking-Frameworks für reale Anwendungen](/blog/real-world-performance) über eine Reihe beliebter Webseiten bewertet.

![](/_img/background-compilation/desktop.svg)

![](/_img/background-compilation/mobile.svg)

Der Anteil der Kompilierung, der in einem Hintergrund-Thread erfolgen kann, hängt davon ab, wie viel Bytecode während der Streaming-Skriptkompilierung auf oberster Ebene kompiliert wird im Vergleich zu faul kompilierten inneren Funktionen, wenn diese aufgerufen werden (was weiterhin im Hauptthread erfolgen muss). Aus diesem Grund variiert der Anteil der eingesparten Zeit im Hauptthread, wobei die meisten Seiten eine Reduzierung der Kompilierungszeit im Hauptthread um 5% bis 20% erzielen.

## Nächste Schritte

Was ist besser, als ein Skript in einem Hintergrund-Thread zu kompilieren? Das Skript überhaupt nicht kompilieren zu müssen! Neben der Hintergrundkompilierung arbeiten wir auch an der Verbesserung von V8's [Code-Caching-System](/blog/code-caching), um die Menge des von V8 zwischengespeicherten Codes zu erhöhen und somit das Laden von Seiten, die Sie häufig besuchen, zu beschleunigen. Wir hoffen, Ihnen bald Neuigkeiten zu diesem Thema bereitzustellen. Bleiben Sie dran!
