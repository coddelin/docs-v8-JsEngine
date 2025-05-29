---
title: &apos;Ein kleiner Schritt für Chrome, ein großer Sprung für V8&apos;
author: &apos;Wächter des Heap Ulan Degenbaev, Hannes Payer, Michael Lippautz und DevTools-Krieger Alexey Kozyatinskiy&apos;
avatars:
  - &apos;ulan-degenbaev&apos;
  - &apos;michael-lippautz&apos;
  - &apos;hannes-payer&apos;
date: 2017-02-09 13:33:37
tags:
  - Speicher
description: &apos;V8 hat kürzlich sein hartes Limit für die Heap-Größe erhöht.&apos;
---
V8 hat ein hartes Limit für seine Heap-Größe. Dies dient als Schutzmechanismus gegen Anwendungen mit Speicherlecks. Wenn eine Anwendung dieses harte Limit erreicht, führt V8 eine Reihe von Notfall-Garbage-Collections durch. Wenn die Garbage-Collections nicht helfen, Speicher freizugeben, stoppt V8 die Ausführung und meldet einen Speicherfehler. Ohne das harte Limit könnte eine undichte Anwendung den gesamten Systemspeicher beanspruchen und die Leistung anderer Anwendungen beeinträchtigen.

<!--truncate-->
Ironischerweise erschwert dieser Schutzmechanismus es JavaScript-Entwicklern, Speicherlecks zu untersuchen. Die Anwendung kann den Speicher ausschöpfen, bevor der Entwickler den Heap in DevTools untersuchen kann. Außerdem kann der DevTools-Prozess selbst den Speicher ausschöpfen, da er eine gewöhnliche V8-Instanz verwendet. Beispielsweise bricht das Erstellen eines Heap-Snapshots von [diesem Demo](https://ulan.github.io/misc/heap-snapshot-demo.html) die Ausführung aufgrund von Speichermangel auf dem aktuellen stabilen Chrome ab.

Historisch wurde das V8-Heap-Limit bequem so eingestellt, dass es in den Bereich des vorzeichenbehafteten 32-Bit-Integers mit etwas Spielraum passte. Im Laufe der Zeit führte diese Bequemlichkeit zu nachlässigem Code in V8, der Typen unterschiedlicher Bitbreiten mischte und effektiv die Möglichkeit brach, das Limit zu erhöhen. Kürzlich haben wir den Garbage-Collector-Code bereinigt, sodass die Verwendung größerer Heap-Größen möglich wurde. DevTools nutzt diese Funktion bereits und das Erstellen eines Heap-Snapshots im zuvor genannten Demo funktioniert wie erwartet im neuesten Chrome Canary.

Wir haben auch eine Funktion in DevTools hinzugefügt, um die Anwendung anzuhalten, wenn sie kurz davor ist, den Speicher auszuschöpfen. Diese Funktion ist nützlich, um Fehler zu untersuchen, die dazu führen, dass die Anwendung in kurzer Zeit viel Speicher zuweist. Beim Ausführen [dieses Demos](https://ulan.github.io/misc/oom.html) mit dem neuesten Chrome Canary hält DevTools die Anwendung vor dem Speichermangel an und erhöht das Heap-Limit, sodass der Benutzer die Möglichkeit hat, den Heap zu untersuchen, Ausdrücke in der Konsole zu evaluieren, um Speicher freizugeben, und dann die Ausführung zur weiteren Fehlersuche fortzusetzen.

![](/_img/heap-size-limit/debugger.png)

V8-Embedder können das Heap-Limit mithilfe der Funktion [`set_max_old_generation_size_in_bytes`](https://codesearch.chromium.org/chromium/src/v8/include/v8-isolate.h?q=set_max_old_generation_size_in_bytes) der `ResourceConstraints` API erhöhen. Aber Vorsicht, einige Phasen im Garbage Collector haben eine lineare Abhängigkeit von der Heap-Größe. Garbage-Collection-Pausen können mit größeren Heaps zunehmen.
