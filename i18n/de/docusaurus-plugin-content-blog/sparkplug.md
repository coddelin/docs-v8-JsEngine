---
title: "Sparkplug — ein nicht optimierender JavaScript-Compiler"
author: "[Leszek Swirski](https://twitter.com/leszekswirski) — vielleicht nicht der hellste Funke, aber zumindest der schnellste"
avatars: 
  - leszek-swirski
date: 2021-05-27
tags: 
  - JavaScript
extra_links: 
  - href: "https://fonts.googleapis.com/css?family=Gloria+Hallelujah&display=swap"
    rel: "stylesheet"
description: "In V8 v9.1 verbessern wir die Leistung von V8 um 5–15% mit Sparkplug: einem neuen, nicht optimierenden JavaScript-Compiler."
tweet: "1397945205198835719"
---

<!-- markdownlint-capture -->
<!-- markdownlint-disable no-inline-html -->
<style>
  svg \{
    --other-frame-bg: rgb(200 200 200 / 20%);
    --machine-frame-bg: rgb(200 200 200 / 50%);
    --js-frame-bg: rgb(212 205 100 / 60%);
    --interpreter-frame-bg: rgb(215 137 218 / 50%);
    --sparkplug-frame-bg: rgb(235 163 104 / 50%);
  \}
  svg text \{
    font-family: Gloria Hallelujah, cursive;
  \}
  .flipped .frame \{
    transform: scale(1, -1);
  \}
  .flipped .frame text \{
    transform:scale(1, -1);
  \}
</style>
<!-- markdownlint-restore -->

<!--truncate-->
Einen Hochleistungs-JavaScript-Engine zu schreiben erfordert mehr als nur einen hoch optimierenden Compiler wie TurboFan zu haben. Insbesondere für kurzlebige Sitzungen, wie das Laden von Websites oder der Nutzung von Kommandozeilenwerkzeugen, gibt es viel Arbeit, die stattfindet, bevor der optimierende Compiler überhaupt anfangen kann zu arbeiten, geschweige denn die optimierten Codes zu erzeugen.

Aus diesem Grund haben wir seit 2016 aufgehört, synthetische Benchmarks (wie Octane) zu verfolgen, und uns stattdessen darauf konzentriert, die [realen Leistungsdaten](/blog/real-world-performance) zu messen. Zudem haben wir seitdem intensiv an der Performance von JavaScript außerhalb des optimierenden Compilers gearbeitet. Dies umfasste Arbeiten am Parser, Streaming, unserem Objektmodell, der Gleichzeitigkeit im Garbage Collector, der Zwischenspeicherung kompilierten Codes… kurz gesagt, uns wurde nie langweilig.

Wenn wir jedoch die Leistung der eigentlichen initialen JavaScript-Ausführung verbessern, stoßen wir auf Einschränkungen bei der Optimierung unseres Interpreters. Der Interpreter von V8 ist hoch optimiert und sehr schnell, aber Interpreter haben inhärente Overheads, die wir nicht loswerden können; Dinge wie Bytecode-Dekodierungs-Overheads oder Dispositions-Overheads, die ein wesentlicher Bestandteil der Funktionalität eines Interpreters sind.

Mit unserem derzeitigen Zwei-Compiler-Modell können wir nicht viel schneller zu optimiertem Code übergehen; wir können (und tun es) daran arbeiten, die Optimierung schneller zu gestalten, aber irgendwann wird man nur schneller, indem man Optimierungsdurchläufe entfernt, was jedoch die Spitzenleistung verringert. Noch schlimmer ist, dass wir nicht wirklich früher zu optimieren beginnen können, da wir noch kein stabiles Feedback zur Objektform haben.

Darf ich vorstellen: Sparkplug — unser neuer, nicht optimierender JavaScript-Compiler, den wir mit V8 v9.1 veröffentlichen und der sich zwischen den Ignition-Interpreter und den TurboFan optimierenden Compiler einfügt.

![Die neue Compiler-Pipeline](/_svg/sparkplug/pipeline.svg)

## Ein schneller Compiler

Sparkplug wurde entwickelt, um schnell zu kompilieren. Sehr schnell. So schnell, dass wir im Grunde zu jederzeit kompilieren können, was uns erlaubt, viel aggressiver zu Sparkplug-Code aufzusteigen als zu TurboFan-Code.

Es gibt ein paar Tricks, die den Sparkplug-Compiler so schnell machen. Zunächst einmal „schummelt“ er; die Funktionen, die er kompiliert, wurden bereits in Bytecode kompiliert, und der Bytecode-Compiler hat bereits die meiste harte Arbeit erledigt, wie Variablenauflösung, Feststellung, ob Klammern tatsächlich Pfeilfunktionen sind, Entzuckerung von Destrukturierungsanweisungen und so weiter. Sparkplug kompiliert aus Bytecode anstelle von JavaScript-Quelltext und muss sich daher um nichts davon kümmern.

Der zweite Trick ist, dass Sparkplug keine Zwischendarstellung (Intermediate Representation, IR) wie die meisten Compiler erzeugt. Stattdessen kompiliert Sparkplug direkt in Maschinencode in einem einzigen linearen Durchlauf über den Bytecode und erzeugt Code, der der Ausführung dieses Bytecodes entspricht. Tatsächlich besteht der gesamte Compiler aus einer [`switch`-Anweisung](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/baseline/baseline-compiler.cc;l=465;drc=55cbb2ce3be503d9096688b72d5af0e40a9e598b) innerhalb einer [`for`-Schleife](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/baseline/baseline-compiler.cc;l=290;drc=9013bf7765d7febaa58224542782307fa952ac14), die an feste Maschinen-Code-Generierungsfunktionen für jedes Bytecode übergibt.

```cpp
// Der Sparkplug-Compiler (gekürzt).
for (; !iterator.done(); iterator.Advance()) {
  VisitSingleBytecode();
}
```

Das Fehlen von IR bedeutet, dass der Compiler nur begrenzte Optimierungsmöglichkeiten hat, außer sehr lokalen Peephole-Optimierungen. Es bedeutet auch, dass wir die gesamte Implementierung separat für jede unterstützte Architektur portieren müssen, da es keinen architekturunabhängigen Zwischenstadium gibt. Wie sich jedoch herausstellt, ist keines davon ein Problem: Ein schneller Compiler ist ein einfacher Compiler, sodass der Code ziemlich leicht zu portieren ist; und Sparkplug muss keine schweren Optimierungen durchführen, da wir später in der Pipeline ohnehin einen großartigen optimierenden Compiler haben.

:::note
Technisch gesehen führen wir derzeit zwei Durchläufe über das Bytecode aus - einen, um Schleifen zu entdecken, und einen zweiten, um den eigentlichen Code zu generieren. Wir planen jedoch, den ersten Durchlauf irgendwann endgültig zu entfernen.
:::

## Interpreter-kompatible Frames

Das Hinzufügen eines neuen Compilers zu einer bestehenden und ausgereiften JavaScript-VM ist eine einschüchternde Aufgabe. Es gibt viele Dinge, die man über die Standardausführung hinaus unterstützen muss; V8 verfügt über einen Debugger, einen stapelspazierenden CPU-Profiler, Stapel-Traces für Ausnahmen, Integration in das Tier-Up, On-Stack-Ersatz für optimierten Code bei heißen Schleifen ... das ist eine Menge.

Sparkplug macht einen geschickten Kunstgriff, der die meisten dieser Probleme vereinfacht, indem es „interpreter-kompatible Stack-Frames“ beibehält.

Spulen wir ein wenig zurück. Stack-Frames sind, wie Codeausführung den Funktionsstatus speichert; wann immer Sie eine neue Funktion aufrufen, erstellt sie einen neuen Stack-Frame für die lokalen Variablen dieser Funktion. Ein Stack-Frame wird durch einen Frame-Pointer (der seinen Anfang markiert) und einen Stack-Pointer (der sein Ende markiert) definiert:

![Ein Stack-Frame mit Stack- und Frame-Pointern](/_svg/sparkplug/basic-frame.svg)

:::note
<!-- markdownlint-capture -->
<!-- markdownlint-disable no-inline-html -->
An diesem Punkt wird ungefähr die Hälfte von Ihnen schreien und sagen: „Dieses Diagramm macht keinen Sinn, Stapel wachsen offensichtlich in die entgegengesetzte Richtung!“. Keine Sorge, ich habe einen Button für Sie erstellt: <button id="flipStacksButton">Ich denke, Stapel wachsen nach oben</button>
<script src="/js/sparkplug.js">
</script>
<!-- markdownlint-restore -->
:::

Wenn eine Funktion aufgerufen wird, wird die Rücksprungadresse auf den Stapel gelegt; diese wird von der Funktion abgerufen, wenn sie zurückkehrt, um zu wissen, wohin sie zurückkehren soll. Dann, wenn diese Funktion einen neuen Frame erstellt, speichert sie den alten Frame-Pointer auf dem Stapel und setzt den neuen Frame-Pointer auf den Anfang ihres eigenen Stack-Frames. Dadurch hat der Stapel eine Kette von Frame-Pointern, die jeweils den Anfang eines Frames markieren, der auf den vorherigen zeigt:

![Stack-Frames für mehrere Übertragungen](/_svg/sparkplug/machine-frame.svg)

:::note
Genau genommen ist dies lediglich eine Konvention, die vom generierten Code befolgt wird, keine Voraussetzung. Es ist jedoch eine ziemlich universelle Konvention; die einzige Zeit, in der sie wirklich gebrochen wird, ist, wenn Stack-Frames vollständig ausgelassen werden oder wenn Debugging-Sidetables verwendet werden können, um Stack-Frames zu durchsuchen.
:::

Dies ist die allgemeine Stapelstruktur für alle Arten von Funktionen; es gibt dann Konventionen, wie Argumente übergeben werden und wie die Funktion Werte in ihrem Frame speichert. In V8 haben wir die Konvention für JavaScript-Frames, dass die Argumente (einschließlich des Empfängers) [in umgekehrter Reihenfolge](/blog/adaptor-frame) auf den Stapel gelegt werden, bevor die Funktion aufgerufen wird, und dass die ersten paar Plätze auf dem Stapel folgende sind: die aktuelle Funktion, die aufgerufen wird; der Kontext, mit dem sie aufgerufen wird; und die Anzahl der übergebenen Argumente. Dies ist unser „standardmäßiges“ JS-Frame-Layout:

![Ein V8-JavaScript-Stack-Frame](/_svg/sparkplug/js-frame.svg)

Diese JS-Aufrufkonvention wird sowohl von optimierten als auch interpretierten Frames geteilt und ermöglicht es uns beispielsweise, den Stack mit minimalem Overhead zu durchsuchen, wenn wir Code im Leistungsbereich des Debuggers analysieren.

Im Fall des Ignition-Interpreters wird die Konvention expliziter. Ignition ist ein registerbasierter Interpreter, was bedeutet, dass es virtuelle Register gibt (nicht zu verwechseln mit Maschinenregistern!), die den aktuellen Zustand des Interpreters speichern - dazu gehören lokale JavaScript-Funktionsvariablen (var/let/const-Deklarationen) und temporäre Werte. Diese Register werden auf dem Stack-Frame des Interpreters gespeichert, zusammen mit einem Pointer auf das ausgeführte Bytecode-Array und dem Offset des aktuellen Bytecodes innerhalb dieses Arrays:

![Ein V8-Interpreter-Stack-Frame](/_svg/sparkplug/interpreter-frame.svg)

Sparkplug erstellt und verwaltet absichtlich ein Frame-Layout, das mit dem Frame des Interpreters übereinstimmt; wann immer der Interpreter einen Registerwert speichern würde, speichert Sparkplug ebenfalls einen. Es tut dies aus mehreren Gründen:

1. Es vereinfacht die Sparkplug-Kompilierung; Sparkplug kann einfach das Verhalten des Interpreters spiegeln, ohne eine Art Zuordnung von Interpreter-Registern zu Sparkplug-Zuständen aufrechterhalten zu müssen.
2. Es beschleunigt auch die Kompilierung, da der Bytecode-Compiler die schwierige Arbeit der Registerzuordnung bereits erledigt hat.
3. Es macht die Integration mit dem Rest des Systems beinahe trivial; der Debugger, der Profiler, das Entrollen von Stapeln bei Ausnahmen, das Drucken von Stapel-Traces - all diese Operationen durchlaufen die Stapel, um herauszufinden, welcher aktuelle Stapel ausführender Funktionen vorhanden ist, und alle diese Operationen funktionieren mit Sparkplug nahezu unverändert weiter, da sie, soweit sie betroffen sind, nur einen Interpreter-Frame haben.
1. Es macht den Austausch von Stapelrahmen (On-Stack Replacement, OSR) trivial. OSR tritt auf, wenn die aktuell ausgeführte Funktion während der Ausführung ersetzt wird; derzeit geschieht dies, wenn eine interpretierte Funktion sich in einer heißen Schleife befindet (wo sie auf optimierten Code für diese Schleife hochgestuft wird) und wenn der optimierte Code deoptimiert wird (wo sie herabgestuft wird und die Funktion in der Interpreterausführung fortgesetzt wird). Da Sparkplug-Frames Interpreter-Frames spiegeln, funktioniert jegliche OSR-Logik, die für den Interpreter funktioniert, auch für Sparkplug; noch besser, wir können fast ohne Übersetzungsaufwand zwischen Interpreter- und Sparkplug-Code wechseln.

Eine kleine Veränderung am Interpreter-Stapelrahmen besteht darin, dass wir während der Sparkplug-Code-Ausführung den Bytecode-Versatz nicht auf dem neuesten Stand halten. Stattdessen speichern wir eine bidirektionale Zuordnung vom Sparkplug-Code-Adressbereich zum entsprechenden Bytecode-Versatz; eine relativ einfache Zuordnung, da der Sparkplug-Code direkt aus einem linearen Durchgang über den Bytecode erzeugt wird. Immer wenn ein Zugriff auf den Stapelrahmen den „Bytecode-Versatz“ für ein Sparkplug-Frame wissen möchte, suchen wir die aktuell ausgeführte Anweisung in dieser Zuordnung und geben den entsprechenden Bytecode-Versatz zurück. Ebenso können wir den aktuellen Bytecode-Versatz in der Zuordnung nachschlagen und zur entsprechenden Sparkplug-Anweisung springen, wenn wir OSR vom Interpreter zu Sparkplug durchführen wollen.

Sie werden feststellen, dass wir nun einen ungenutzten Slot im Stapelrahmen haben, wo sich der Bytecode-Versatz befinden würde; einen, den wir nicht entfernen können, da wir den Rest des Stapels unverändert lassen möchten. Wir nutzen diesen Stapel-Slot stattdessen, um den „Feedback-Vektor“ für die aktuell ausgeführte Funktion zwischenzuspeichern; dies ist der Vektor, der Objektdaten speichert und für die meisten Operationen geladen werden muss. Wir müssen nur bei OSR darauf achten, entweder den korrekten Bytecode-Versatz oder den korrekten Feedback-Vektor für diesen Slot einzusetzen.

Der Sparkplug-Stapelrahmen sieht somit folgendermaßen aus:

![Ein V8 Sparkplug-Stapelrahmen](/_svg/sparkplug/sparkplug-frame.svg)

## Übergabe an eingebaute Funktionen

Sparkplug generiert tatsächlich sehr wenig eigenen Code. Die Semantik von JavaScript ist komplex, und es würde viel Code erfordern, selbst die einfachsten Operationen durchzuführen. Sparkplug dazu zu zwingen, diesen Code bei jeder Kompilierung inline zu regenerieren, wäre aus mehreren Gründen schlecht:

  1. Es würde die Kompilierungszeiten spürbar erhöhen, allein durch die Menge des benötigten Codes,
  2. Es würde den Speicherverbrauch des Sparkplug-Codes erhöhen, und
  3. Wir müssten die Code-Generierung für viele JavaScript-Funktionen für Sparkplug neu implementieren, was wahrscheinlich mehr Fehler und eine größere Sicherheitsangriffsfläche bedeutet.

Anstatt all dies zu tun, ruft der meiste Sparkplug-Code einfach „eingebaute Funktionen“ auf – kleine Schnipsel von Maschinen-Code, die in die Binärdatei eingebettet sind, um die eigentliche Arbeit zu erledigen. Diese eingebauten Funktionen sind entweder dieselben, die der Interpreter verwendet, oder teilen zumindest den Großteil ihres Codes mit den Bytecode-Handlern des Interpreters.

Tatsächlich besteht Sparkplug-Code im Wesentlichen nur aus Aufrufen von eingebauten Funktionen und Steuerfluss:

Sie denken vielleicht jetzt: „Nun, was bringt das Ganze? Tut Sparkplug nicht einfach dasselbe wie der Interpreter?“ — und Sie hätten teilweise Recht. In vielerlei Hinsicht ist Sparkplug „nur“ eine Serialisierung der Interpreterausführung, die dieselben eingebauten Funktionen aufruft und denselben Stapelrahmen beibehält. Dennoch ist selbst dies den Aufwand wert, da es diejenigen Interpreter-Überkopfaufwände entfernt (oder prä-kompiliert), die nicht entfernt werden können, wie Operandendekodierung und Bytecode-Dispatch.

Es stellt sich heraus, dass Interpreter viele CPU-Optimierungen vereiteln: Statische Operanden werden dynamisch vom Interpreter aus dem Speicher gelesen, wodurch die CPU entweder ins Stocken gerät oder spekulieren muss, was die Werte sein könnten; das Dispatching zum nächsten Bytecode erfordert eine erfolgreiche Verzweigungsvorhersage, um leistungsfähig zu bleiben, und selbst wenn die Spekulationen und Vorhersagen korrekt sind, mussten Sie immer noch all diesen Dekodierungs- und Dispatching-Code ausführen und wertvollen Speicherplatz in Ihren Puffern und Caches verwenden. Eine CPU ist im Wesentlichen selbst ein Interpreter, wenn auch für Maschinencode; aus dieser Sichtweise ist Sparkplug ein „Transpiler“ vom Ignition-Bytecode zum CPU-Bytecode, der Ihre Funktionen vom „Emulator“ zum „nativen“ Code überführt.

## Leistung

Wie gut funktioniert Sparkplug im wirklichen Leben? Wir haben Chrome 91 mit einigen Benchmarks auf einigen unserer Leistungs-Bots getestet, mit und ohne Sparkplug, um die Auswirkungen zu sehen.

Spoiler-Alarm: Wir sind ziemlich zufrieden.

:::note
Die unten aufgeführten Benchmarks zeigen verschiedene Bots, die verschiedene Betriebssysteme verwenden. Obwohl das Betriebssystem im Namen des Bots prominent ist, glauben wir, dass es tatsächlich keinen großen Einfluss auf die Ergebnisse hat. Vielmehr haben die verschiedenen Maschinen auch unterschiedliche CPU- und Speicherkonfigurationen, von denen wir glauben, dass sie die Hauptquelle der Unterschiede sind.
:::

# Speedometer

[Speedometer](https://browserbench.org/Speedometer2.0/) ist ein Benchmark, der versucht, die Nutzung von Website-Frameworks in der realen Welt zu emulieren, indem eine TODO-Listen-Verfolgungs-Webanwendung mit einigen beliebten Frameworks erstellt und die Leistung dieser Anwendung beim Hinzufügen und Löschen von TODOs getestet wird. Wir haben festgestellt, dass es eine großartige Reflexion von Lade- und Interaktionsverhalten in der realen Welt ist, und wir haben wiederholt festgestellt, dass Verbesserungen beim Speedometer sich in unseren realen Metriken widerspiegeln.

Mit Sparkplug verbessert sich der Speedometer-Wert je nach Bot, den wir betrachten, um 5-10%.

![Median Verbesserung des Speedometer-Scores mit Sparkplug, basierend auf mehreren Performance-Bots. Fehlerbalken zeigen die interquartile Spannweite.](/_img/sparkplug/benchmark-speedometer.svg)

# Durchsuchen von Benchmarks

Speedometer ist ein großartiger Benchmark, aber er erzählt nur einen Teil der Geschichte. Zusätzlich haben wir eine Reihe von „Browsing-Benchmarks“, die Aufzeichnungen von echten Websites enthalten, die wir wiedergeben, ein wenig Skriptinteraktion hinzufügen und einen realistischeren Blick darauf bekommen können, wie sich unsere verschiedenen Kennzahlen in der realen Welt verhalten.

Bei diesen Benchmarks haben wir uns entschieden, unsere Kennzahl „V8-Hauptthread-Zeit“ zu betrachten, die die Gesamtzeit misst, die in V8 (einschließlich Kompilierung und Ausführung) im Hauptthread verbracht wird (d. h. ohne Streaming-Parsing oder optimierte Hintergrundkompilierung). Dies ist unsere beste Methode, um zu sehen, wie gut sich Sparkplug selbst bezahlt macht, während andere Quellen von Benchmark-Rauschen ausgeschlossen werden.

Die Ergebnisse variieren stark und sind stark abhängig von Maschine und Website, aber im Großen und Ganzen sehen sie großartig aus: Wir sehen Verbesserungen im Bereich von etwa 5–15%.

::: figure Median Verbesserung der V8-Hauptthread-Zeit bei unseren Browsing-Benchmarks mit 10 Wiederholungen. Fehlerbalken zeigen die interquartile Spannweite.
![Ergebnis für linux-perf Bot](/_img/sparkplug/benchmark-browsing-linux-perf.svg) ![Ergebnis für win-10-perf Bot](/_img/sparkplug/benchmark-browsing-win-10-perf.svg) ![Ergebnis für benchmark-browsing-mac-10_13_laptop_high_end-perf Bot](/_img/sparkplug/benchmark-browsing-mac-10_13_laptop_high_end-perf.svg) ![Ergebnis für mac-10_12_laptop_low_end-perf Bot](/_img/sparkplug/benchmark-browsing-mac-10_12_laptop_low_end-perf.svg) ![Ergebnis für mac-m1_mini_2020 Bot](/_img/sparkplug/benchmark-browsing-mac-m1_mini_2020-perf.svg)
:::

Abschließend: V8 hat einen neuen super-schnellen nicht-optimierenden Compiler, der die Leistung von V8 bei realen Benchmarks um 5–15% verbessert. Er ist bereits in V8 v9.1 hinter der `--sparkplug` Flag verfügbar und wird in Chrome 91 eingeführt.
