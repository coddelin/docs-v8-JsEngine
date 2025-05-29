---
title: &apos;Einstellungen der Veröffentlichungs-Blogbeiträge&apos;
author: &apos;Shu-yu Guo ([@shu_](https://twitter.com/_shu))&apos;
avatars:
 - &apos;shu-yu-guo&apos;
date: 2022-06-17
tags:
 - Veröffentlichung
description: &apos;V8 stellt die Veröffentlichungs-Blogbeiträge ein zugunsten des Chrome-Veröffentlichungsplans und funktionsbezogener Blogbeiträge.&apos;
tweet: &apos;1537857497825824768&apos;
---

Historisch gesehen gab es für jeden neuen Veröffentlichungszweig von V8 einen Blogbeitrag. Sie haben vielleicht bemerkt, dass es seit v9.9 keinen Veröffentlichungs-Blogbeitrag mehr gab. Ab v10.0 stellen wir die Veröffentlichungs-Blogbeiträge für jeden neuen Zweig ein. Aber keine Sorge, alle Informationen, die Sie bisher über Veröffentlichungs-Blogbeiträge erhalten haben, sind weiterhin verfügbar! Lesen Sie weiter, um zu erfahren, wo Sie diese Informationen zukünftig finden können.

<!--truncate-->
## Veröffentlichungszeitplan und aktuelle Version

Haben Sie die Veröffentlichungs-Blogbeiträge gelesen, um die aktuellste Version von V8 zu ermitteln?

V8 folgt dem Veröffentlichungszeitplan von Chrome. Für die aktuellste stabile Version von V8 konsultieren Sie bitte die [Chrome-Veröffentlichungsroadmap](https://chromestatus.com/roadmap).

Alle vier Wochen erstellen wir einen neuen Zweig von V8 im Rahmen unseres [Veröffentlichungsprozesses](https://v8.dev/docs/release-process). Jede Version wird aus dem Git-Master-Zweig von V8 verzweigt, unmittelbar bevor ein Chrome-Beta-Meilenstein erreicht wird. Solche Zweige befinden sich in der Beta-Phase und werden in Übereinstimmung mit der [Chrome-Veröffentlichungsroadmap](https://chromestatus.com/roadmap) zu Releases.

Um einen bestimmten V8-Zweig zu einer Chrome-Version zu finden:

1. Nehmen Sie die Chrome-Version und teilen Sie sie durch 10, um die V8-Version zu erhalten. Zum Beispiel ist Chrome 102 V8 10.2.
1. Für eine Versionsnummer X.Y finden Sie den Zweig unter der URL in folgendem Format:

```
https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/X.Y
```

Zum Beispiel finden Sie den 10.2-Zweig unter https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/10.2.

Weitere Informationen zu Versionsnummern und Zweigen finden Sie in [unserem detaillierten Artikel](https://v8.dev/docs/version-numbers).

Für eine V8-Version X.Y können Entwickler mit einem aktiven V8-Checkout `git checkout -b X.Y -t branch-heads/X.Y` verwenden, um mit den neuen Funktionen dieser Version zu experimentieren.

## Neue JavaScript- oder WebAssembly-Funktionen

Haben Sie die Veröffentlichungs-Blogbeiträge gelesen, um herauszufinden, welche neuen JavaScript- oder WebAssembly-Funktionen hinter einem Flag implementiert oder standardmäßig aktiviert wurden?

Konsultieren Sie bitte die [Chrome-Veröffentlichungsroadmap](https://chromestatus.com/roadmap), die neue Funktionen und ihre Meilensteine für jede Veröffentlichung auflistet.

Beachten Sie, dass [separate, detaillierte Funktionsartikel](/features) vor oder nach der Implementierung der Funktion in V8 veröffentlicht werden können.

## Bedeutende Leistungsverbesserungen

Haben Sie die Veröffentlichungs-Blogbeiträge gelesen, um mehr über bedeutende Leistungsverbesserungen zu erfahren?

In Zukunft werden wir unabhängige Blogbeiträge zu Leistungsverbesserungen schreiben, die wir hervorheben möchten, wie wir es in der Vergangenheit beispielsweise für Verbesserungen wie [Sparkplug](https://v8.dev/blog/sparkplug) getan haben.

## API-Änderungen

Haben Sie die Veröffentlichungs-Blogbeiträge gelesen, um mehr über API-Änderungen zu erfahren?

Um die Liste der Commits zu sehen, die die V8-API zwischen einer früheren Version A.B und einer späteren Version X.Y geändert haben, verwenden Sie `git log branch-heads/A.B..branch-heads/X.Y include/v8\*.h` in einem aktiven V8-Checkout.
