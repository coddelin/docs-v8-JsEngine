---
title: "V8-Veröffentlichung v7.8"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), der faule Zauberer"
avatars: 
  - "ingvar-stepanyan"
date: 2019-09-27
tags: 
  - release
description: "V8 v7.8 bietet Streaming-Kompilierung beim Preload, WebAssembly C API, schnellere Objekt-Destrukturierung und reguläre Ausdrucks-Matching sowie verbesserte Startzeiten."
tweet: "1177600702861971459"
---
Alle sechs Wochen erstellen wir einen neuen Branch von V8 im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process). Jede Version wird direkt vor einem Chrome-Beta-Meilenstein von V8’s Git-Master verzweigt. Heute freuen wir uns, unseren neuesten Branch anzukündigen, [V8 Version 7.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.8), der sich in der Beta-Phase befindet, bis er in einigen Wochen zusammen mit Chrome 78 Stable veröffentlicht wird. V8 v7.8 ist vollgepackt mit verschiedenen Verbesserungen für Entwickler. Dieser Beitrag bietet eine Vorschau auf einige Highlights als Vorgeschmack auf die Veröffentlichung.

<!--truncate-->
## JavaScript-Leistung (Größe & Geschwindigkeit)

### Skript-Streaming beim Preload

Vielleicht erinnern Sie sich an [unsere Arbeit zum Skript-Streaming aus V8 v7.5](/blog/v8-release-75#script-streaming-directly-from-network), bei der wir unsere Hintergrundkompilierung verbessert haben, um Daten direkt aus dem Netzwerk zu lesen. In Chrome 78 aktivieren wir das Skript-Streaming während des Preloads.

Bisher begann das Skript-Streaming, wenn ein `<script>`-Tag während des HTML-Parsings gefunden wurde, und das Parsing wurde entweder pausiert, bis die Kompilierung abgeschlossen war (für normale Skripte), oder das Skript wurde ausgeführt, sobald die Kompilierung abgeschlossen war (für asynchrone Skripte). Das bedeutet, dass der Prozess für normale, synchrone Skripte wie dieses:

```html
<!DOCTYPE html>
<html>
<head>
  <script src="main.js"></script>
</head>
...
```

… vorher so aussah:

<figure>
  <img src="/_img/v8-release-78/script-streaming-0.svg" width="458" height="130" alt="" loading="lazy"/>
</figure>

Da synchrone Skripte `document.write()` verwenden können, müssen wir das Parsen des HTML pausieren, wenn wir das `<script>`-Tag sehen. Da die Kompilierung beginnt, wenn das `<script>`-Tag gefunden wird, gibt es eine große Lücke zwischen dem Parsen des HTML und dem tatsächlichen Ausführen des Skripts, während der wir die Seite nicht weiter laden können.

Allerdings treffen wir auch das `<script>`-Tag in einer früheren Phase, in der wir das HTML scannen, um Ressourcen zum Preladen zu finden, sodass der Prozess eigentlich eher so aussieht:

<figure>
  <img src="/_img/v8-release-78/script-streaming-1.svg" width="600" height="130" alt="" loading="lazy"/>
</figure>

Es ist eine ziemlich sichere Annahme, dass, wenn wir eine JavaScript-Datei vorladen, wir sie irgendwann ausführen wollen. Deshalb haben wir seit Chrome 76 mit Preload-Streaming experimentiert, bei dem das Laden des Skripts auch seine Kompilierung startet.

<figure>
  <img src="/_img/v8-release-78/script-streaming-2.svg" width="495" height="130" alt="" loading="lazy"/>
</figure>

Noch besser: Da wir mit der Kompilierung beginnen können, bevor das Skript vollständig geladen ist, sieht der Prozess mit Preload-Streaming tatsächlich so aus:

<figure>
  <img src="/_img/v8-release-78/script-streaming-3.svg" width="480" height="217" alt="" loading="lazy"/>
</figure>

Das bedeutet, dass wir in manchen Fällen die merkbare Kompilierzeit (die Lücke zwischen dem `<script>`-Tag-Sichtbarwerden und dem Starten der Skriptausführung) auf null reduzieren können. In unseren Experimenten sank diese merkbare Kompilierzeit durchschnittlich um 5–20%.

Die beste Nachricht ist, dass wir dank unserer Experimentier-Infrastruktur dies nicht nur standardmäßig in Chrome 78 aktivieren konnten, sondern es auch für Nutzer von Chrome 76 und höher einschalten konnten.

### Schnellere Objekt-Destrukturierung

Die Objekt-Destrukturierung der Form…

```js
const {x, y} = object;
```

… ist fast gleichbedeutend mit der entspannteren Form…

```js
const x = object.x;
const y = object.y;
```

… mit der Ausnahme, dass sie auch einen speziellen Fehler werfen muss, wenn `object` `undefined` oder `null` ist…

```
$ v8 -e 'const object = undefined; const {x, y} = object;'
unnamed:1: TypeError: Kann die Eigenschaft `x` von 'undefined' oder 'null' nicht destrukturieren.
const object = undefined; const {x, y} = object;
                                 ^
```

… anstatt des normalen Fehlers, den Sie erhalten würden, wenn Sie versuchen, auf `undefined` zuzugreifen:

```
$ v8 -e 'const object = undefined; object.x'
unnamed:1: TypeError: Kann die Eigenschaft 'x' von undefined nicht lesen
const object = undefined; object.x
                                 ^
```

Diese zusätzliche Prüfung machte die Destrukturierung langsamer als einfache Variablenzuweisung, wie [über Twitter berichtet](https://twitter.com/mkubilayk/status/1166360933087752197).

Seit V8 v7.8 ist die Objekt-Destrukturierung **genauso schnell** wie die entsprechende entspannte Variablenzuweisung (tatsächlich generieren wir für beide den gleichen Bytecode). Statt expliziter `undefined`/`null`-Prüfungen verlassen wir uns nun darauf, dass eine Ausnahme geworfen wird, wenn `object.x` geladen wird, und wir fangen die Ausnahme ab, wenn sie durch die Destrukturierung verursacht wurde.

### Lazy-Quellpositionsbestimmung

Beim Kompilieren von Bytecode aus JavaScript werden Quellpositions-Tabellen erstellt, die Bytecode-Sequenzen mit Zeichenpositionen im Quellcode verbinden. Diese Informationen werden jedoch nur verwendet, wenn Ausnahmen symbolisiert oder Entwickleraufgaben wie Debugging und Profilierung durchgeführt werden, und sind daher größtenteils verschwendeter Speicher.

Um dies zu vermeiden, kompilieren wir jetzt Bytecode, ohne Quellpositionen zu sammeln (vorausgesetzt, es ist kein Debugger oder Profiler angeschlossen). Die Quellpositionen werden nur gesammelt, wenn tatsächlich ein Stack-Trace generiert wird, beispielsweise beim Aufruf von `Error.stack` oder beim Drucken eines Stack-Traces einer Ausnahme in die Konsole. Dies hat jedoch einige Kosten, da die Funktion zum Generieren von Quellpositionen erneut geparst und kompiliert werden muss. Die meisten Websites symbolisieren Stack-Traces in der Produktion jedoch nicht, sodass keine beobachtbaren Leistungseinbußen auftreten. In unseren Labortests konnten wir eine Reduzierung der Speichernutzung von V8 um 1-2,5 % feststellen.

![Speichereinsparungen durch Lazy Quellpositionen auf einem AndroidGo-Gerät](/_img/v8-release-78/memory-savings.svg)

### Schnellere RegExp-Match-Fehler

In der Regel versucht ein regulärer Ausdruck (RegExp), eine Übereinstimmung zu finden, indem er vorwärts durch die Eingabestring iteriert und ab jeder Position nach einer Übereinstimmung sucht. Sobald diese Position nahe genug am Ende des Strings ist, sodass keine Übereinstimmung möglich ist, stoppt V8 jetzt (in den meisten Fällen) die Suche nach möglichen Startpunkten neuer Übereinstimmungen und kehrt stattdessen schnell einen Fehler zurück. Diese Optimierung gilt sowohl für kompilierte als auch für interpretierte reguläre Ausdrücke und führt zu Geschwindigkeitsverbesserungen bei Arbeitslasten, bei denen das Fehlen einer Übereinstimmung häufig vorkommt und die Mindestlänge einer erfolgreichen Übereinstimmung im Vergleich zur durchschnittlichen Eingabestring-Länge relativ groß ist.

Im UniPoker-Test von JetStream 2, der diese Arbeit inspirierte, bringt V8 v7.8 eine Verbesserung um 20% des Durchschnittsscores aller Iterationen.

## WebAssembly

### WebAssembly C/C++ API

Ab v7.8 schließt die V8-Implementierung der [Wasm C/C++ API](https://github.com/WebAssembly/wasm-c-api) den experimentellen Status ab und wird offiziell unterstützt. Sie ermöglicht die Verwendung eines speziellen Builds von V8 als WebAssembly-Ausführungs-Engine in Ihren C/C++-Anwendungen. Kein JavaScript erforderlich! Weitere Details und Anleitungen finden Sie in [der Dokumentation](https://docs.google.com/document/d/1oFPHyNb_eXg6NzrE6xJDNPdJrHMZvx0LqsD6wpbd9vY/edit).

### Verbesserte Startzeit

Das Aufrufen einer JavaScript-Funktion aus WebAssembly oder einer WebAssembly-Funktion aus JavaScript beinhaltet die Ausführung von Wrapper-Code, der für die Übersetzung der Funktionsargumente von einer Darstellung in die andere verantwortlich ist. Das Generieren dieser Wrapper kann recht teuer sein: Im [Epic ZenGarden-Demo](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html) nimmt die Kompilierung von Wrappern etwa 20 % der Modul-Startzeit (Kompilierung + Instanziierung) auf einer 18-Kern-Xeon-Maschine ein.

Für diese Version haben wir die Situation verbessert, indem wir Hintergrund-Threads auf Multi-Core-Maschinen besser genutzt haben. Wir haben auf jüngste Bemühungen zurückgegriffen, die [Funktionkompilierung zu skalieren](/blog/v8-release-77#wasm-compilation), und die Wrapper-Kompilierung in diese neue asynchrone Pipeline integriert. Die Wrapper-Kompilierung macht jetzt etwa 8 % der Modul-Startzeit des Epic ZenGarden-Demos auf derselben Maschine aus.

## V8 API

Bitte verwenden Sie `git log branch-heads/7.7..branch-heads/7.8 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem [aktiven V8-Checkout](/docs/source-code#using-git) können `git checkout -b 7.8 -t branch-heads/7.8` verwenden, um mit den neuen Funktionen in V8 v7.8 zu experimentieren. Alternativ können Sie [den Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
