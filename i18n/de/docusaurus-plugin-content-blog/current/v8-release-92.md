---
title: "V8-Version v9.2 veröffentlicht"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars:
 - "ingvar-stepanyan"
date: 2021-07-16
tags:
 - Veröffentlichung
description: "Die V8-Version v9.2 bringt eine `at`-Methode für relatives Indexing und Verbesserungen bei der Zeigerkomprimierung."
tweet: ""
---
Alle sechs Wochen erstellen wir einen neuen Branch von V8 im Rahmen unseres [Veröffentlichungsprozesses](https://v8.dev/docs/release-process). Jede Version wird direkt vor einem Chrome Beta-Meilenstein vom Git-Master von V8 abgezweigt. Heute freuen wir uns, unseren neuesten Branch ankündigen zu können, [V8-Version 9.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.2), der sich bis zur Veröffentlichung in mehreren Wochen in Zusammenarbeit mit Chrome 92 Stable in der Beta-Phase befindet. V8 v9.2 ist voller neuer Funktionen für Entwickler. Dieser Beitrag gibt eine Vorschau auf einige Highlights zur Vorbereitung der Veröffentlichung.

<!--truncate-->
## JavaScript

### `at`-Methode

Die neue `at`-Methode ist jetzt für Arrays, TypedArrays und Strings verfügbar. Wenn ein negativer Wert übergeben wird, erfolgt relatives Indexing vom Ende des indexierbaren Elements. Wenn ein positiver Wert übergeben wird, verhält sie sich identisch zum Zugriff auf Eigenschaften. Zum Beispiel ist `[1,2,3].at(-1)` `3`. Weitere Informationen finden Sie in [unserer Erklärung](https://v8.dev/features/at-method).

## Gemeinsamer Speicherbereich für Zeigerkomprimierung

V8 unterstützt [Zeigerkomprimierung](https://v8.dev/blog/pointer-compression) auf 64-Bit-Plattformen, einschließlich x64 und arm64. Dies wird erreicht, indem ein 64-Bit-Zeiger in zwei Hälften geteilt wird. Die oberen 32 Bits können als Basis betrachtet werden, während die unteren 32 Bits als Index in diese Basis angesehen werden können.

```
            |----- 32 Bits -----|----- 32 Bits -----|
Zeiger:     |________Basis______|_______Index_______|
```

Derzeit führt ein Isolat alle Allokationen im GC-Heap innerhalb eines 4-GB-virt. Speicherbereichs („Cage“) aus, was sicherstellt, dass alle Zeiger dieselbe obere 32-Bit-Basisadresse haben. Mit der konstant gehaltenen Basisadresse können 64-Bit-Zeiger ausschließlich unter Verwendung des 32-Bit-Indexes weitergegeben werden, da der vollständige Zeiger rekonstruiert werden kann.

Mit v9.2 wurde die Standardeinstellung geändert, sodass alle Isolate innerhalb eines Prozesses denselben 4-GB-virt. Speicherbereich teilen. Dies wurde in Erwartung von Prototypen experimenteller Shared-Memory-Funktionen in JS durchgeführt. Da jeder Worker-Thread sein eigenes Isolat und damit seinen eigenen 4-GB-virt. Speicherbereich hat, konnten Zeiger zwischen Isolaten mit einem per-Isolat-Cage nicht weitergegeben werden, da sie nicht dieselbe Basisadresse teilten. Diese Änderung bietet den zusätzlichen Vorteil, den Druck auf den virt. Speicher bei der Erstellung von Workers zu reduzieren.

Der Kompromiss der Änderung besteht darin, dass die Gesamtgröße des V8-Heaps über alle Threads in einem Prozess auf maximal 4 GB begrenzt ist. Diese Einschränkung kann für Server-Workloads, die viele Threads pro Prozess starten, unerwünscht sein, da der virt. Speicher schneller als zuvor erschöpft wird. Embedders können das Teilen des Speicherbereichs für die Zeigerkomprimierung mit dem GN-Argument `v8_enable_pointer_compression_shared_cage = false` deaktivieren.

## V8 API

Bitte verwenden Sie `git log branch-heads/9.1..branch-heads/9.2 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem aktiven V8-Checkout können `git checkout -b 9.2 -t branch-heads/9.2` verwenden, um die neuen Funktionen in V8 v9.2 auszuprobieren. Alternativ können Sie [dem Chrome-Betakanal beitreten](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
