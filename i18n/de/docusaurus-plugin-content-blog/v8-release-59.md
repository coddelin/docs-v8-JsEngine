---
title: "V8-Version v5.9"
author: "das V8-Team"
date: "2017-04-27 13:33:37"
tags: 
  - Veröffentlichung
description: "V8 v5.9 beinhaltet die neue Ignition + TurboFan-Pipeline und fügt WebAssembly TrapIf-Unterstützung auf allen Plattformen hinzu."
---
Alle sechs Wochen erstellen wir im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process) einen neuen Branch von V8. Jede Version wird direkt vor einem Chrome Beta-Meilenstein aus dem Git-Master von V8 abgezweigt. Heute freuen wir uns, unseren neuesten Branch, [V8-Version 5.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.9), bekannt zu geben, der sich bis zur Veröffentlichung in Koordination mit Chrome 59 Stable in einigen Wochen in der Beta-Phase befindet. V8 5.9 ist voller verschiedenster Entwicklerfunktionen. Wir möchten Ihnen einen Vorgeschmack auf einige der Highlights vor der Veröffentlichung geben.

<!--truncate-->
## Ignition+TurboFan aktiviert

V8 v5.9 wird die erste Version sein, bei der Ignition+TurboFan standardmäßig aktiviert ist. Im Allgemeinen sollte diese Änderung zu einem geringeren Speicherverbrauch und einem schnelleren Start von Webanwendungen führen. Da die neue Pipeline bereits umfangreich getestet wurde, erwarten wir keine Stabilitäts- oder Leistungsprobleme. Falls Ihr Code jedoch plötzlich eine deutliche Leistungsverschlechterung zeigt, [melden Sie sich bitte bei uns](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline).

Weitere Informationen finden Sie in [unserem Blogbeitrag](/blog/launching-ignition-and-turbofan).

## WebAssembly `TrapIf`-Unterstützung auf allen Plattformen

[WebAssembly `TrapIf`-Unterstützung](https://chromium.googlesource.com/v8/v8/+/98fa962e5f342878109c26fd7190573082ac3abe) reduzierte die Zeit, die für das Kompilieren von Code aufgewendet wird, erheblich (~30%).

![](/_img/v8-release-59/angrybots.png)

## V8 API

Bitte sehen Sie sich unsere [Zusammenfassung der API-Änderungen](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit) an. Dieses Dokument wird regelmäßig einige Wochen nach jeder Hauptveröffentlichung aktualisiert.

Entwickler mit einem [aktiven V8-Checkout](/docs/source-code#using-git) können `git checkout -b 5.9 -t branch-heads/5.9` verwenden, um die neuen Funktionen in V8 5.9 zu testen. Alternativ können Sie [den Chrome Beta-Kanal abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
