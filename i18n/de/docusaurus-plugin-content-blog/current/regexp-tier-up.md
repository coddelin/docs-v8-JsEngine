---
title: 'Verbesserung der regulären Ausdrücke in V8'
author: 'Patrick Thier und Ana Peško, regelmäßige Meinungsäußerungen über reguläre Ausdrücke'
avatars:
  - 'patrick-thier'
  - 'ana-pesko'
date: 2019-10-04 15:24:16
tags:
  - internals
  - RegExp
description: 'In diesem Blog-Beitrag beschreiben wir, wie wir die Vorteile der Interpretation von regulären Ausdrücken nutzen und gleichzeitig die Nachteile mindern.'
tweet: '1180131710568030208'
---
In der Standardkonfiguration kompiliert V8 reguläre Ausdrücke beim ersten Ausführen in nativen Code. Im Rahmen unserer Arbeit an [JIT-less V8](/blog/jitless) haben wir einen Interpreter für reguläre Ausdrücke eingeführt. Das Interpretieren von regulären Ausdrücken hat den Vorteil, weniger Speicher zu verwenden, geht jedoch mit einem Leistungseinbußen einher. In diesem Blog-Beitrag beschreiben wir, wie wir die Vorteile des Interpretierens von regulären Ausdrücken nutzen und die Nachteile mindern.

<!--truncate-->
## Tier-up-Strategie für RegExp

Wir wollen die ‚besten Eigenschaften beider Welten‘ für reguläre Ausdrücke nutzen. Dazu kompilieren wir zunächst alle regulären Ausdrücke zu Bytecode und interpretieren sie. So sparen wir viel Speicher, und insgesamt (und mit dem neuen, schnelleren Interpreter) ist die Leistungseinbuße akzeptabel. Wenn ein regulärer Ausdruck mit demselben Muster erneut verwendet wird, betrachten wir ihn als ‚heiß‘ und kompilieren ihn erneut in nativen Code. Ab diesem Punkt führen wir die Ausführung so schnell wie möglich fort.

Es gibt viele verschiedene Pfade durch den regulären Ausdruck-Code in V8, abhängig von der aufgerufenen Methode, ob es sich um einen globalen oder nicht-globalen RegExp handelt, und ob wir den schnellen oder langsamen Pfad wählen. Das gesagt, wollen wir die Tier-up-Entscheidung so zentralisiert wie möglich gestalten. Wir haben ein Ticks-Feld zum RegExp-Objekt von V8 hinzugefügt, das zur Laufzeit auf einen bestimmten Wert initialisiert wird. Dieser Wert gibt die Anzahl der Male an, die der reguläre Ausdruck interpretiert wird, bevor wir zu einem Compiler hochstufen. Jedes Mal, wenn der reguläre Ausdruck interpretiert wird, verringern wir das Ticks-Feld um 1. In einem eingebauten Code, der in [CodeStubAssembler](/blog/csa) geschrieben ist und für alle regulären Ausdrücke aufgerufen wird, überprüfen wir das Ticks-Flag bei jeder Ausführung. Sobald die Ticks 0 erreichen, wissen wir, dass wir den regulären Ausdruck in nativen Code erneut kompilieren müssen, und springen zum Runtime, um dies zu tun.

Wir haben erwähnt, dass reguläre Ausdrücke unterschiedliche Ausführungspfade haben können. Für den Fall von globalen Ersetzungen mit Funktionen als Parameter unterscheiden sich die Implementierungen für nativen Code und Bytecode. Der native Code erwartet ein Array, um alle Übereinstimmungen im Voraus zu speichern, während der Bytecode jeweils eine Übereinstimmung verarbeitet. Aufgrund dessen haben wir uns entschieden, für diesen Anwendungsfall immer direkt auf nativen Code hochzustufen.

## Beschleunigung des RegExp-Interpreters

### Reduzierung des Laufzeit-Overheads

Wenn ein regulärer Ausdruck ausgeführt wird, wird ein eingebauter Code aufgerufen, der in [CodeStubAssembler](/blog/csa) geschrieben ist. Dieser eingebauter Code überprüfte zuvor, ob das Code-Feld des JSRegExp-Objekts JIT-kompilierten nativen Code enthielt, der direkt ausgeführt werden konnte, und rief andernfalls eine Laufzeitmethode auf, um den RegExp zu kompilieren (oder im JIT-less-Modus zu interpretieren). Im JIT-less-Modus führte jede Ausführung eines regulären Ausdrucks durch die V8-Laufzeit, was ziemlich teuer ist, da wir zwischen JavaScript und C++-Code auf dem Ausführungsstapel wechseln müssen.

Ab V8 v7.8 wird jedes Mal, wenn der RegExp-Compiler Bytecode generiert, um einen regulären Ausdruck zu interpretieren, ein Trampolin zum RegExp-Interpreter zusätzlich zum generierten Bytecode im Code-Feld des JSRegExp-Objekts gespeichert. Dadurch wird der Interpreter jetzt direkt aus dem eingebauten Code aufgerufen, ohne Umweg über die Laufzeit.

### Neue Dispatch-Methode

Der RegExp-Interpreter verwendete zuvor eine einfache `switch`-basierte Dispatch-Methode. Der Hauptnachteil dieser Methode ist, dass die CPU große Schwierigkeiten hat, das nächste auszuführende Bytecode vorherzusagen, was zu vielen Verzweigungsmissvorhersagen führt und die Ausführung verlangsamt.

Wir haben die Dispatch-Methode in V8 v7.8 auf Threaded Code geändert. Diese Methode ermöglicht es dem Zweigvorhersager der CPU, das nächste Bytecode basierend auf dem derzeit ausgeführten Bytecode vorherzusagen, wodurch weniger Fehlvorhersagen entstehen. Im Detail verwenden wir eine Dispatch-Tabelle, die eine Zuordnung zwischen jeder Bytecode-ID und der Adresse des Handlers, der den Bytecode implementiert, speichert. Der Interpreter von V8 [Ignition](/docs/ignition) verwendet ebenfalls diesen Ansatz. Ein großer Unterschied zwischen Ignition und dem RegExp-Interpreter besteht jedoch darin, dass die Bytecode-Handler von Ignition in [CodeStubAssembler](/blog/csa) geschrieben sind, während der gesamte RegExp-Interpreter in C++ unter Verwendung von [berechneten `goto`s](https://gcc.gnu.org/onlinedocs/gcc/Labels-as-Values.html) (eine GNU-Erweiterung auch von clang unterstützt) geschrieben ist, was einfacher zu lesen und zu warten ist als CSA. Für Compiler, die keine berechneten Gotos unterstützen, greifen wir auf die alte `switch`-basierte Dispatch-Methode zurück.

### Bytecode-Peephole-Optimierung

Bevor wir über Bytecode-Peephole-Optimierung sprechen, werfen wir einen Blick auf ein motivierendes Beispiel.

```js
const re = /[^_]*/;
const str = 'a0b*c_ef';
re.exec(str);
// → findet 'a0b*c'
```

Für dieses einfache Muster erstellt der RegExp-Compiler 3 Bytecodes, die für jedes Zeichen ausgeführt werden. Auf einer hohen Ebene sind diese:

1. Aktuelles Zeichen laden.
1. Prüfen, ob das Zeichen `'_'` entspricht.
1. Wenn nicht, aktuelle Position im Zielstring vorwärts bewegen und `goto 1`.

Für unseren Zielstring interpretieren wir 17 Bytecodes, bis wir ein nicht passendes Zeichen finden. Die Idee der Peephole-Optimierung besteht darin, Sequenzen von Bytecodes durch neue optimierte Bytecodes zu ersetzen, die die Funktionalität mehrerer Bytecodes kombinieren. In unserem Beispiel können wir sogar die durch `goto` implizit erstellte Schleife explizit in den neuen Bytecode einbauen, sodass ein einzelner Bytecode alle passenden Zeichen verarbeitet und 16 Dispatches einspart.

Obwohl das Beispiel erfunden ist, tritt die hier beschriebene Bytecode-Sequenz häufig auf echten Websites auf. Wir haben [echte Websites](/blog/real-world-performance) analysiert und neue optimierte Bytecodes für die häufigsten Bytecode-Sequenzen erstellt, die wir gefunden haben.

## Ergebnisse

![Abbildung 1: Speichereinsparungen für verschiedene Tier-Up-Werte](/_img/regexp-tier-up/results-memory.svg)

Abbildung 1 zeigt die Auswirkungen verschiedener Tier-Up-Strategien auf den Speicher beim Browsen durch Facebook-, Reddit-, Twitter- und Tumblr-Geschichten. Der Standard entspricht der Größe des JIT-codierten Codes, und anschließend haben wir die Größe des RegExp-Codes, den wir letztendlich verwenden (Bytecode-Größe, wenn wir kein Tier-Up durchführen, nativer Code, wenn wir es tun), für Ticks, die mit 1, 10 und 100 initialisiert wurden. Schließlich haben wir die Größe des RegExp-Codes, wenn wir alle regulären Ausdrücke interpretieren. Wir haben diese Ergebnisse und andere Benchmarks genutzt, um zu entscheiden, das Tier-Up mit Ticks, die auf 1 initialisiert sind, zu aktivieren, d.h., wir interpretieren den regulären Ausdruck einmal und führen dann das Tier-Up durch.

Mit dieser Tier-Up-Strategie konnten wir die Heap-Code-Größe von V8 auf echten Websites um 4 bis 7 % und die effektive Größe von V8 um 1 bis 2 % reduzieren.

![Abbildung 2: RegExp-Leistungsvergleich](/_img/regexp-tier-up/results-speed.svg)

Abbildung 2 zeigt die Auswirkungen auf die Leistung des RegExp-Interpreters für alle in diesem Blogbeitrag beschriebenen Verbesserungen[^strict-bounds] in der RexBench-Benchmark-Suite. Zum Vergleich wird auch die Leistung von JIT-kompiliertem RegExp angezeigt (Native).

[^strict-bounds]: Die hier gezeigten Ergebnisse beinhalten auch eine Verbesserung der regulären Ausdrücke, die bereits in den [V8 v7.8 Release Notes](/blog/v8-release-78#faster-regexp-match-failures) beschrieben wurde.

Der neue Interpreter ist bis zu 2× schneller als der alte und im Durchschnitt etwa 1,45× schneller. Wir kommen sogar bei den meisten Benchmarks nahe an die Leistung von JIT-codierten RegExp heran, wobei Regex DNA die einzige Ausnahme ist. Der Grund, warum interpretierte RegExp bei diesem Benchmark so viel langsamer sind als JIT-codierte RegExp, liegt an den langen Zielstrings (~300.000 Zeichen), die verwendet werden. Obwohl wir den Dispatch-Overhead auf ein Minimum reduziert haben, summiert sich der Overhead bei Strings mit mehr als 1.000 Zeichen, was zu einer langsameren Ausführung führt. Da der Interpreter bei langen Strings viel langsamer ist, haben wir ein Heuristik eingeführt, das für diese Strings frühzeitig das Tier-Up durchführt.

## Fazit

Ab V8 v7.9 (Chrome 79) führen wir ein Tier-Up für reguläre Ausdrücke durch, anstatt sie voreilig zu kompilieren. Daher wird der Interpreter, der zuvor nur in JIT-losen V8-Versionen verwendet wurde, jetzt überall eingesetzt. Dadurch sparen wir Speicher. Wir haben den Interpreter beschleunigt, um dies möglich zu machen. Aber dies ist nicht das Ende der Geschichte – in Zukunft sind weitere Verbesserungen zu erwarten.

Wir möchten diese Gelegenheit nutzen, uns bei allen im V8-Team für ihre Unterstützung während unseres Praktikums zu bedanken. Es war eine großartige Erfahrung!
