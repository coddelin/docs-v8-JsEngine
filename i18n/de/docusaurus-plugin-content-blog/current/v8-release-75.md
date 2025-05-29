---
title: &apos;V8-Veröffentlichung v7.5&apos;
author: &apos;Dan Elphick, der Schrecken der Veralteten&apos;
avatars:
  - &apos;dan-elphick&apos;
date: 2019-05-16 15:00:00
tags:
  - release
description: &apos;V8 v7.5 bietet implizites Caching von WebAssembly-Kompilierungsartefakten, Speicheroperationen im Bulk, numerische Trenner in JavaScript und vieles mehr!&apos;
tweet: &apos;1129073370623086593&apos;
---
Alle sechs Wochen erstellen wir im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process) einen neuen Branch von V8. Jede Version wird direkt vom Git-Master von V8 vor einem Chrome Beta-Meilenstein verzweigt. Heute freuen wir uns, unseren neuesten Branch, [V8 Version 7.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.5), ankündigen zu dürfen. Dieser befindet sich bis zur Veröffentlichung in Kooperation mit Chrome 75 Stable in mehreren Wochen in der Beta-Phase. V8 v7.5 ist vollgepackt mit allerlei Entwickler-freundlichen Neuerungen. In diesem Beitrag geben wir eine Vorschau auf einige Highlights vor der Veröffentlichung.

<!--truncate-->
## WebAssembly

### Implizites Caching

Wir planen, implizites Caching von WebAssembly-Kompilierungsartefakten in Chrome 75 einzuführen. Dies bedeutet, dass Benutzer, die dieselbe Seite ein zweites Mal besuchen, die bereits gesehenen WebAssembly-Module nicht erneut kompilieren müssen. Stattdessen werden sie aus dem Cache geladen. Dies funktioniert ähnlich wie [Chromiums JavaScript-Code-Cache](/blog/code-caching-for-devs).

Falls Sie eine ähnliche Funktion in Ihre V8-Integration einbauen möchten, lassen Sie sich von der Chromium-Implementierung inspirieren.

### Speicheroperationen im Bulk

[Der Vorschlag zu Speicheroperationen im Bulk](https://github.com/webassembly/bulk-memory-operations) fügt WebAssembly neue Instruktionen zum Aktualisieren großer Speicher- oder Tabellenbereiche hinzu.

`memory.copy` kopiert Daten von einem Bereich in einen anderen, selbst wenn sich die Bereiche überlappen (ähnlich wie C’s `memmove`). `memory.fill` füllt einen Bereich mit einem bestimmten Byte (ähnlich wie C’s `memset`). Ähnlich wie `memory.copy` kopiert `table.copy` von einem Tabellenbereich in einen anderen, selbst wenn sich die Bereiche überlappen.

```wasm
;; Kopiere 500 Bytes von Quelle 1000 zu Ziel 0.
(memory.copy (i32.const 0) (i32.const 1000) (i32.const 500))

;; Fülle 1000 Bytes beginnend bei Adresse 100 mit dem Wert `123`.
(memory.fill (i32.const 100) (i32.const 123) (i32.const 1000))

;; Kopiere 10 Tabellenelemente von Quelle 5 zu Ziel 15.
(table.copy (i32.const 15) (i32.const 5) (i32.const 10))
```

Der Vorschlag bietet auch eine Möglichkeit, einen konstanten Bereich in den linearen Speicher oder eine Tabelle zu kopieren. Dazu müssen wir zunächst ein „passives“ Segment definieren. Im Gegensatz zu „aktiven“ Segmenten werden diese Segmente nicht während der Modul-Instanziierung initialisiert. Stattdessen können sie mit den Instruktionen `memory.init` und `table.init` in einen Speicher- oder Tabellenbereich kopiert werden.

```wasm
;; Definiere ein passives Datensegment.
(data $hello passive "Hello WebAssembly")

;; Kopiere "Hello" in den Speicher bei Adresse 10.
(memory.init (i32.const 10) (i32.const 0) (i32.const 5))

;; Kopiere "WebAssembly" in den Speicher bei Adresse 1000.
(memory.init (i32.const 1000) (i32.const 6) (i32.const 11))
```

## Numerische Trenner in JavaScript

Große numerische Literale sind für die menschliche Wahrnehmung schwer schnell zu erfassen, besonders bei vielen sich wiederholenden Ziffern:

```js
1000000000000
   1019436871.42
```

Um die Lesbarkeit zu verbessern, ermöglicht [eine neue JavaScript-Sprachfunktion](/features/numeric-separators) Unterstriche als Trenner in numerischen Literalen. Die obigen Beispiele können nun neu geschrieben werden, um die Ziffern beispielsweise in Tausendergruppen zu gruppieren:

```js
1_000_000_000_000
    1_019_436_871.42
```

Nun ist es einfacher zu erkennen, dass die erste Zahl eine Billion ist und die zweite Zahl in der Größenordnung von einer Milliarde liegt.

Weitere Beispiele und zusätzliche Informationen zu numerischen Trennern finden Sie in [unserer Erklärung](/features/numeric-separators).

## Leistung

### Skript-Streaming direkt aus dem Netzwerk

Ab Chrome 75 kann V8 Skripte direkt aus dem Netzwerk in den Streaming-Parser streamen, ohne auf den Hauptthread von Chrome zu warten.

Während frühere Chrome-Versionen bereits Streaming-Parsing und -Kompilierung unterstützten, mussten die Skriptquelldaten, die aus dem Netzwerk kamen, aus historischen Gründen zuerst an den Hauptthread von Chrome weitergeleitet werden, bevor sie an den Streamer weitergeleitet wurden. Dies bedeutete oft, dass der Streaming-Parser auf Daten warten musste, die bereits aus dem Netzwerk eingegangen waren, jedoch noch nicht an die Streaming-Aufgabe weitergeleitet wurden, da sie durch andere Vorgänge im Hauptthread blockiert waren (wie HTML-Parsing, Layout oder andere JavaScript-Ausführung).

![Blockierte Hintergrund-Parsing-Aufgaben in Chrome 74 und älter](/_img/v8-release-75/before.jpg)

In Chrome 75 verbinden wir die Netzwerk-„Datenleitung“ direkt mit V8, sodass wir Netzwerkdaten direkt während des Streaming-Parsings lesen können, wodurch die Abhängigkeit vom Hauptthread entfällt.

![In Chrome 75+ werden Hintergrund-Parsing-Aufgaben nicht mehr durch Aktivitäten im Hauptthread blockiert.](/_img/v8-release-75/after.jpg)

Damit können wir Streaming-Kompilierungen früher abschließen, wodurch die Ladezeit von Seiten mit Streaming-Kompilierung verbessert wird. Außerdem wird die Anzahl der gleichzeitigen (aber blockierten) Streaming-Parse-Aufgaben reduziert, was den Speicherverbrauch verringert.

## V8 API

Bitte verwenden Sie `git log branch-heads/7.4..branch-heads/7.5 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem [aktiven V8-Checkout](/docs/source-code#using-git) können `git checkout -b 7.5 -t branch-heads/7.5` verwenden, um die neuen Funktionen in V8 v7.5 auszuprobieren. Alternativ können Sie [den Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
