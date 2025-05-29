---
title: "V8-Version v5.8 veröffentlicht"
author: "das V8-Team"
date: "2017-03-20 13:33:37"
tags: 
  - Veröffentlichung
description: "V8 v5.8 ermöglicht die Nutzung beliebiger Heap-Größen und verbessert die Startleistung."
---
Alle sechs Wochen erstellen wir einen neuen Branch von V8 im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process). Jede Version wird direkt vor einem Chrome-Beta-Meilenstein aus dem Git-Master von V8 abgezweigt. Heute freuen wir uns, unseren neuesten Branch, [V8-Version 5.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.8), anzukündigen, der sich bis zur gemeinsamen Veröffentlichung mit Chrome 58 Stable in einigen Wochen in der Beta-Phase befinden wird. V8 5.8 ist vollgepackt mit allerlei Entwicklerfreundlichem. Wir möchten Ihnen einen Vorgeschmack auf einige Highlights geben, um Sie auf die Veröffentlichung einzustimmen.

<!--truncate-->
## Beliebige Heap-Größen

Historisch gesehen wurde das V8 Heap-Limit zweckmäßig so eingestellt, dass es in den Bereich eines vorzeichenbehafteten 32-Bit-Ganzzahlwerts mit etwas Spielraum passt. Mit der Zeit führte diese Zweckmäßigkeit zu nachlässigem Code in V8, der Typen mit unterschiedlichen Bitbreiten vermischte, wodurch die Möglichkeit, das Limit zu erhöhen, effektiv unterbrochen wurde. In V8 v5.8 haben wir die Nutzung beliebiger Heap-Größen ermöglicht. Weitere Informationen finden Sie im [dedizierten Blogbeitrag](/blog/heap-size-limit).

## Startleistung

In V8 v5.8 haben wir die Arbeiten zur schrittweisen Reduzierung der Zeit fortgesetzt, die V8 während des Starts benötigt. Reduzierungen der Zeit für die Code-Kompilierung und -Analyse sowie Optimierungen im IC-System führten zu ~5% Verbesserungen bei unseren [realistischen Start-Workloads](/blog/real-world-performance).

## V8-API

Bitte lesen Sie unsere [Zusammenfassung der API-Änderungen](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Dieses Dokument wird regelmäßig aktualisiert, ein paar Wochen nach jeder Hauptveröffentlichung.

Entwickler mit einem [aktiven V8-Checkout](/docs/source-code#using-git) können `git checkout -b 5.8 -t branch-heads/5.8` verwenden, um die neuen Funktionen in V8 5.8 auszuprobieren. Alternativ können Sie [den Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
