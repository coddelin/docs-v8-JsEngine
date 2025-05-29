---
title: "Lazy-Deserialisierung"
author: "Jakob Gruber ([@schuay](https://twitter.com/schuay))"
avatars:
  - "jakob-gruber"
date: 2018-02-12 13:33:37
tags:
  - internals
description: "Lazy-Deserialisierung, verfügbar in V8 v6.4, reduziert den Speicherverbrauch von V8 durchschnittlich um über 500 KB pro Browser-Tab."
tweet: "962989179914383360"
---
TL;DR: Die Lazy-Deserialisierung wurde kürzlich standardmäßig in [V8 v6.4](/blog/v8-release-64) aktiviert und reduziert den Speicherverbrauch von V8 durchschnittlich um über 500 KB pro Browser-Tab. Lesen Sie weiter, um mehr zu erfahren!

## Einführung in V8-Snapshots

Doch zunächst wollen wir einen Schritt zurücktreten und uns ansehen, wie V8 Heap-Snapshots verwendet, um die Erstellung neuer Isolates (die grob einem Browser-Tab in Chrome entsprechen) zu beschleunigen. Mein Kollege Yang Guo gab eine gute Einführung dazu in seinem Artikel über [benutzerdefinierte Start-Snapshots](/blog/custom-startup-snapshots):

<!--truncate-->
> Die JavaScript-Spezifikation umfasst viele integrierte Funktionen, von mathematischen Funktionen bis hin zu einer kompletten RegEx-Engine. Jeder neu erstellte V8-Kontext hat diese Funktionen von Anfang an verfügbar. Damit dies funktioniert, müssen das globale Objekt (zum Beispiel das `window`-Objekt in einem Browser) und alle integrierten Funktionen beim Erstellen des Kontexts eingerichtet und initialisiert werden, um in den Heap von V8 geladen zu werden. Dies von Grund auf neu zu tun, dauert recht lange.
>
> Glücklicherweise nutzt V8 eine Abkürzung, um die Dinge zu beschleunigen: ähnlich wie das Auftauen einer Tiefkühlpizza für ein schnelles Abendessen, deserialisieren wir ein zuvor erstelltes Snapshot direkt in den Heap, um einen initialisierten Kontext zu erhalten. Auf einem gewöhnlichen Desktop-Computer kann dies die Zeit zur Erstellung eines Kontexts von 40 ms auf weniger als 2 ms reduzieren. Auf einem durchschnittlichen Mobiltelefon könnte dies einen Unterschied zwischen 270 ms und 10 ms bedeuten.

Zusammenfassung: Snapshots sind entscheidend für die Startleistung, und sie werden deserialisiert, um den Anfangszustand des V8-Heaps für jedes Isolate zu erstellen. Die Größe des Snapshots bestimmt somit die Mindestgröße des V8-Heaps, und größere Snapshots bedeuten direkt einen höheren Speicherverbrauch pro Isolate.

Ein Snapshot enthält alles, was zur vollständigen Initialisierung eines neuen Isolates benötigt wird, einschließlich Sprachkonstanten (z. B. der Wert `undefined`), interne Bytecode-Handler, die vom Interpreter verwendet werden, integrierte Objekte (z. B. `String`) und die Funktionen, die auf den integrierten Objekten installiert sind (z. B. `String.prototype.replace`) zusammen mit ihren ausführbaren `Code`-Objekten.

![Größe des Start-Snapshots in Bytes von 2016-01 bis 2017-09. Die x-Achse zeigt V8-Revisionsnummern.](/_img/lazy-deserialization/startup-snapshot-size.png)

In den letzten zwei Jahren hat sich die Größe des Snapshots nahezu verdreifacht, von etwa 600 KB Anfang 2016 auf heute über 1500 KB. Der Großteil dieses Anstiegs stammt von serialisierten `Code`-Objekten, deren Anzahl (z. B. durch kürzliche Ergänzungen der JavaScript-Sprache entsprechend der Weiterentwicklung der Spezifikation) sowie ihre Größe (eingebaute Funktionen, die durch die neue [CodeStubAssembler](/blog/csa)-Pipeline generiert werden, werden als nativer Code ausgeliefert im Vergleich zu den kompakteren Bytecode- oder minimierten JS-Formaten) zugenommen haben.

Das sind schlechte Nachrichten, da wir den Speicherverbrauch so gering wie möglich halten möchten.

## Lazy-Deserialisierung

Einer der Hauptprobleme war, dass wir früher den gesamten Inhalt des Snapshots in jedes Isolate kopiert haben. Dies war insbesondere bei eingebauten Funktionen verschwenderisch, die alle bedingungslos geladen wurden, aber möglicherweise nie verwendet wurden.

Hier kommt die Lazy-Deserialisierung ins Spiel. Das Konzept ist ganz einfach: Was wäre, wenn wir die eingebauten Funktionen erst dann deserialisieren würden, wenn sie tatsächlich aufgerufen werden?

Eine schnelle Untersuchung einiger der beliebtesten Webseiten zeigte, dass dieser Ansatz recht attraktiv ist: Im Durchschnitt wurden nur 30% aller eingebauten Funktionen genutzt, wobei einige Seiten nur 16% nutzten. Dies sah äußerst vielversprechend aus, da die meisten dieser Seiten intensive JS-Nutzer sind und diese Zahlen daher als (unscharfe) Untergrenze potenzieller Speichereinsparungen für das Web insgesamt gesehen werden können.

Als wir anfingen, in diese Richtung zu arbeiten, stellte sich heraus, dass die Lazy-Deserialisierung sehr gut in die Architektur von V8 integriert wurde und nur wenige, meist nicht-invasive Designänderungen erforderlich waren, um loszulegen:

1. **Bekannte Positionen innerhalb des Snapshots.** Vor der Lazy-Deserialisierung war die Reihenfolge der Objekte innerhalb des serialisierten Snapshots irrelevant, da wir immer den gesamten Heap gleichzeitig deserialisierten. Die Lazy-Deserialisierung muss in der Lage sein, jede gegebene eingebaute Funktion individuell zu deserialisieren und muss daher wissen, wo sie sich innerhalb des Snapshots befindet.
2. **Deserialisierung einzelner Objekte.** Die Snapshots von V8 wurden ursprünglich für die vollständige Deserialisierung des Heaps entwickelt, und die Unterstützung für die Deserialisierung einzelner Objekte erforderte die Bewältigung einiger Eigenheiten wie nicht zusammenhängende Snapshot-Layouts (serialisierte Daten für ein Objekt könnten mit Daten für andere Objekte durchmischt sein) und sogenannte Rückverweise (die direkt auf zuvor deserialisierte Objekte innerhalb des aktuellen Laufs verweisen können).
3. **Der Mechanismus der verzögerten Deserialisierung selbst.** Zur Laufzeit muss der Handler für die verzögerte Deserialisierung a) bestimmen können, welches Codeobjekt zu deserialisieren ist, b) die tatsächliche Deserialisierung vornehmen und c) das serialisierte Codeobjekt an alle relevanten Funktionen anhängen.

Unsere Lösung für die ersten beiden Punkte war die Ergänzung eines neuen [speziellen Bereichs für eingebaute Funktionen](https://cs.chromium.org/chromium/src/v8/src/snapshot/snapshot.h?l=55&rcl=f5b1d1d4f29b238ca2f0a13bf3a7b7067854592d) im Snapshot, der nur serialisierte Codeobjekte enthalten darf. Die Serialisierung erfolgt in einer klar definierten Reihenfolge, und der Startoffset jedes `Code`-Objekts wird in einem speziellen Abschnitt innerhalb des Built-ins-Snapshot-Bereichs gespeichert. Sowohl Rückverweise als auch durchmischte Objektdaten sind nicht erlaubt.

[Verzögerte Deserialisierung eingebauter Funktionen](https://goo.gl/dxkYDZ) wird durch das passend benannte [`DeserializeLazy`-Built-in](https://cs.chromium.org/chromium/src/v8/src/builtins/x64/builtins-x64.cc?l=1355&rcl=f5b1d1d4f29b238ca2f0a13bf3a7b7067854592d) gehandhabt, das während der Deserialisierung auf alle verzögerten Built-in-Funktionen installiert wird. Wenn es zur Laufzeit aufgerufen wird, deserialisiert es das relevante `Code`-Objekt und installiert es schließlich sowohl auf die `JSFunction` (die das Funktionsobjekt darstellt) als auch auf das `SharedFunctionInfo` (gemeinsam genutzte Informationen zwischen Funktionen, die aus derselben Funktionsliteraldarstellung erstellt wurden). Jede eingebaute Funktion wird höchstens einmal deserialisiert.

Zusätzlich zu den eingebauten Funktionen haben wir auch [verzögerte Deserialisierung für Bytecode-Handler](https://goo.gl/QxZBL2) implementiert. Bytecode-Handler sind Codeobjekte, die die Logik zur Ausführung jedes Bytecodes innerhalb des [Ignition](/blog/ignition-interpreter)-Interpreters von V8 enthalten. Im Gegensatz zu den Built-ins haben sie weder eine zugehörige `JSFunction` noch ein `SharedFunctionInfo`. Stattdessen werden ihre Codeobjekte direkt in der [Dispatch-Tabelle](https://cs.chromium.org/chromium/src/v8/src/interpreter/interpreter.h?l=94&rcl=f5b1d1d4f29b238ca2f0a13bf3a7b7067854592d) gespeichert, in die der Interpreter indexiert, wenn er zum nächsten Bytecode-Handler weiterleitet. Die verzögerte Deserialisierung ist ähnlich wie bei Built-ins: Der [`DeserializeLazy`](https://cs.chromium.org/chromium/src/v8/src/interpreter/interpreter-generator.cc?l=3247&rcl=f5b1d1d4f29b238ca2f0a13bf3a7b7067854592d)-Handler bestimmt, welcher Handler zu deserialisieren ist, indem er das Bytecode-Array inspiziert, deserialisiert das Codeobjekt und speichert schließlich den deserialisierten Handler in der Dispatch-Tabelle. Auch hier wird jeder Handler höchstens einmal deserialisiert.

## Ergebnisse

Wir haben die eingesparte Speichermenge gemessen, indem wir die 1000 beliebtesten Webseiten mit Chrome 65 auf einem Android-Gerät geladen haben, mit und ohne verzögerte Deserialisierung.

![](/_img/lazy-deserialization/memory-savings.png)

Im Durchschnitt verringerte sich die Heap-Größe von V8 um 540 KB, wobei 25 % der getesteten Websites mehr als 620 KB sparten, 50 % mehr als 540 KB sparten und 75 % mehr als 420 KB sparten.

Die Laufzeitperformance (gemessen an Standard-JavaScript-Benchmarks wie Speedometer sowie an einer breiten Auswahl beliebter Webseiten) blieb von der verzögerten Deserialisierung unbeeinflusst.

## Nächste Schritte

Die verzögerte Deserialisierung stellt sicher, dass jede Isolate nur die eingebauten Codeobjekte lädt, die tatsächlich verwendet werden. Das ist bereits ein großer Gewinn, aber wir glauben, dass es möglich ist, noch einen Schritt weiterzugehen und die (eingebauten-bezogenen) Kosten jeder Isolate effektiv auf null zu reduzieren.

Wir hoffen, Ihnen später in diesem Jahr weitere Neuigkeiten in dieser Hinsicht präsentieren zu können. Bleiben Sie dran!
