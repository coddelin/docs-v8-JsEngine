---
title: &apos;WebAssembly JSPI hat eine neue API&apos;
description: &apos;Dieser Artikel beschreibt einige bevorstehende Änderungen an der JavaScript Promise Integration (JSPI) API.&apos;
author: &apos;Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl&apos;
date: 2024-06-04
tags:
  - WebAssembly
---
Die JavaScript Promise Integration (JSPI) API von WebAssembly hat eine neue API, verfügbar ab der Chrome-Version M126. Wir sprechen über die Änderungen, wie man sie mit Emscripten verwendet und was der Fahrplan für JSPI ist.

JSPI ist eine API, die es Anwendungen, die *sequentielle* APIs verwenden, ermöglicht, auf *asynchrone* Web-APIs zuzugreifen. Viele Web-APIs arbeiten mit JavaScript-`Promise`-Objekten: Statt die angeforderte Operation sofort auszuführen, geben sie ein `Promise` zur Ausführung zurück. Andererseits stammen viele Anwendungen, die in WebAssembly kompiliert wurden, aus der C/C++-Welt, die von APIs dominiert wird, bei denen der Aufrufer blockiert, bis die Operation abgeschlossen ist.

<!--truncate-->
JSPI greift in die Web-Architektur ein, um einer WebAssembly-Anwendung das Suspendieren zu ermöglichen, wenn das `Promise` zurückgegeben wird, und das Fortsetzen, wenn das `Promise` aufgelöst wird.

Sie können mehr über JSPI und dessen Nutzung [in diesem Blogeintrag](https://v8.dev/blog/jspi) und in der [Spezifikation](https://github.com/WebAssembly/js-promise-integration) erfahren.

## Was ist neu?

### Das Ende der `Suspender`-Objekte

Im Januar 2024 stimmte die Stacks-Untergruppe der Wasm CG [ab](https://github.com/WebAssembly/meetings/blob/297ac8b5ac00e6be1fe33b1f4a146cc7481b631d/stack/2024/stack-2024-01-29.md), die API für JSPI zu ändern. Konkret wird anstelle eines expliziten `Suspender`-Objekts die JavaScript/WebAssembly-Grenze als Trennlinie verwendet, um festzulegen, welche Berechnungen suspendiert werden.

Der Unterschied ist relativ gering, aber potenziell signifikant: Wenn eine Berechnung suspendiert werden soll, bestimmt der jüngste Aufruf einer umhüllten WebAssembly-Exportfunktion den &apos;Cut-Point&apos;, was suspendiert wird.

Die Implikation ist, dass ein Entwickler, der JSPI verwendet, etwas weniger Kontrolle über diesen Cut-Point hat. Andererseits macht das Wegfallen der Notwendigkeit, `Suspender`-Objekte explizit zu verwalten, die API erheblich benutzerfreundlicher.

### Kein `WebAssembly.Function` mehr

Eine weitere Änderung betrifft den Stil der API. Anstatt JSPI-Wrapper über den `WebAssembly.Function`-Konstruktor zu charakterisieren, stellen wir spezifische Funktionen und Konstruktoren bereit.

Dies hat mehrere Vorteile:

- Es entfernt die Abhängigkeit vom [*Type Reflection*-Vorschlag](https://github.com/WebAssembly/js-types).
- Es vereinfacht die Werkzeuge für JSPI: Die neuen API-Funktionen müssen nicht mehr explizit auf die WebAssembly-Typen von Funktionen verweisen.

Diese Änderung wurde durch die Entscheidung ermöglicht, keine explizit referenzierten `Suspender`-Objekte mehr zu verwenden.

### Rückkehr ohne Suspendieren

Eine dritte Änderung bezieht sich auf das Verhalten von aufrufenden Suspendierungen. Statt immer dann zu suspendieren, wenn von einem suspendierenden Import eine JavaScript-Funktion aufgerufen wird, suspendieren wir nur, wenn die JavaScript-Funktion tatsächlich ein `Promise` zurückgibt.

Diese Änderung, obwohl sie scheinbar gegen die [Empfehlungen](https://www.w3.org/2001/tag/doc/promises-guide#accepting-promises) der W3C TAG verstößt, stellt eine sichere Optimierung für JSPI-Benutzer dar. Sie ist sicher, weil JSPI tatsächlich die Rolle eines *Aufrufers* einer Funktion übernimmt, die ein `Promise` zurückgibt.

Diese Änderung wird wahrscheinlich nur minimale Auswirkungen auf die meisten Anwendungen haben; jedoch werden einige Anwendungen von merklichen Vorteilen durch das Vermeiden unnötiger Reisen zur Ereignisschleife des Browsers profitieren.

### Die neue API

Die API ist einfach: Es gibt eine Funktion, die eine aus einem WebAssembly-Modul exportierte Funktion entgegennimmt und sie in eine Funktion umwandelt, die ein `Promise` zurückgibt:

```js
Function Webassembly.promising(Function wsFun)
```

Beachten Sie, dass das Argument zwar als JavaScript-`Function` getypt ist, tatsächlich jedoch auf WebAssembly-Funktionen beschränkt ist.

Auf der suspendierenden Seite gibt es eine neue Klasse `WebAssembly.Suspending`, zusammen mit einem Konstruktor, der eine JavaScript-Funktion als Argument benötigt. In WebIDL wird dies wie folgt geschrieben:

```js
interface Suspending{
  constructor (Function fun);
}
```

Beachten Sie, dass sich diese API etwas asymmetrisch anfühlt: Es gibt eine Funktion, die eine WebAssembly-Funktion entgegennimmt und eine neue "promising" (_sic_) Funktion zurückgibt; während Sie zum Markieren einer suspendierenden Funktion diese in ein `Suspending`-Objekt einschließen. Dies spiegelt eine tiefere Realität wider, was hinter den Kulissen geschieht.

Das suspendierende Verhalten eines Imports ist intrinsischer Bestandteil des *Aufrufs* des Imports: d.h., eine Funktion innerhalb des instanziierten Moduls ruft den Import auf und wird dadurch suspendiert.

Andererseits nimmt die `promising`-Funktion eine reguläre WebAssembly-Funktion und gibt eine neue zurück, die auf das Suspendieren reagieren kann und ein `Promise` zurückgibt.

### Die neue API verwenden

Wenn Sie ein Emscripten-Benutzer sind, erfordert die Verwendung der neuen API in der Regel keine Änderungen an Ihrem Code. Sie müssen eine Version von Emscripten verwenden, die mindestens 3.1.61 ist, und Sie müssen eine Version von Chrome verwenden, die mindestens 126.0.6478.17 (Chrome M126) ist.

Wenn Sie Ihre eigene Integration erstellen, sollte Ihr Code erheblich einfacher sein. Insbesondere ist es nicht mehr notwendig, Code zu haben, der das übergebene `Suspender`-Objekt speichert (und es beim Aufrufen des Imports wieder abruft). Sie können einfach regulären sequenziellen Code innerhalb des WebAssembly-Moduls verwenden.

### Die alte API

Die alte API wird mindestens bis zum 29. Oktober 2024 (Chrome M128) weiterarbeiten. Danach planen wir, die alte API zu entfernen.

Beachten Sie, dass Emscripten selbst die alte API ab Version 3.1.61 nicht mehr unterstützt.

### Erkennen, welche API in Ihrem Browser aktiv ist

Das Wechseln von APIs sollte nie auf die leichte Schulter genommen werden. In diesem Fall können wir dies tun, da JSPI selbst noch vorläufig ist. Es gibt eine einfache Möglichkeit, zu testen, welche API in Ihrem Browser aktiviert ist:

```js
function oldAPI(){
  return WebAssembly.Suspender!=undefined
}

function newAPI(){
  return WebAssembly.Suspending!=undefined
}
```

Die Funktion `oldAPI` gibt 'true' zurück, wenn die alte JSPI-API in Ihrem Browser aktiviert ist, und die Funktion `newAPI` gibt 'true' zurück, wenn die neue JSPI-API aktiviert ist.

## Was passiert mit JSPI?

### Implementierungsaspekte

Die größte Änderung an JSPI, an der wir arbeiten, ist tatsächlich für die meisten Programmierer unsichtbar: sogenannte erweiterbare Stacks.

Die aktuelle Implementierung von JSPI basiert auf der Zuweisung von Stacks mit fester Größe. Tatsächlich sind die zugewiesenen Stacks recht groß. Dies liegt daran, dass wir in der Lage sein müssen, beliebige WebAssembly-Berechnungen unterzubringen, die möglicherweise tiefe Stacks erfordern, um Rekursion korrekt zu handhaben.

Diese Strategie ist jedoch nicht nachhaltig: Wir möchten Anwendungen mit Millionen von angehaltenen Koroutinen unterstützen; das ist nicht möglich, wenn jeder Stack 1 MB groß ist.

Erweiterbare Stacks beziehen sich auf eine Stack-Allocator-Strategie, die es einem WebAssembly-Stack ermöglicht, bei Bedarf zu wachsen. Auf diese Weise können wir mit sehr kleinen Stacks für Anwendungen beginnen, die nur wenig Speicherplatz benötigen, und den Stack erweitern, wenn die Anwendung keinen Platz mehr hat (bekannt als Stackoverflow).

Es gibt mehrere mögliche Techniken zur Implementierung erweiterbarer Stacks. Eine, die wir untersuchen, sind segmentierte Stacks. Ein segmentierter Stack besteht aus einer Kette von Stack-Regionen &mdash; jede hat eine feste Größe, aber verschiedene Segmente können unterschiedliche Größen haben.

Beachten Sie, dass wir zwar das Problem des Stacküberlaufs für Koroutinen lösen könnten, wir jedoch nicht planen, den Haupt- oder Zentralstack erweiterbar zu machen. Wenn Ihre Anwendung also keinen Stackplatz mehr hat, werden erweiterbare Stacks Ihr Problem nicht beheben, es sei denn, Sie verwenden JSPI.

### Der Standardisierungsprozess

Zum Zeitpunkt der Veröffentlichung gibt es einen aktiven [Origin-Trial für JSPI](https://v8.dev/blog/jspi-ot). Die neue API wird während des verbleibenden Origin-Trials verfügbar sein &mdash; mit Chrome M126.

Die vorherige API wird auch während des Origin-Trials verfügbar sein; es ist jedoch geplant, diese kurz nach Chrome M128 einzustellen.

Danach dreht sich der Hauptschwerpunkt von JSPI um den Standardisierungsprozess. JSPI befindet sich derzeit (zum Zeitpunkt der Veröffentlichung) in Phase 3 des W3C Wasm CG-Prozesses. Der nächste Schritt, nämlich der Übergang zu Phase 4, markiert die entscheidende Akzeptanz von JSPI als Standard-API für die JavaScript- und WebAssembly-Ökosysteme.

Wir möchten erfahren, was Sie von diesen Änderungen an JSPI halten! Nehmen Sie an der Diskussion im [W3C WebAssembly Community Group Repo](https://github.com/WebAssembly/js-promise-integration) teil.
