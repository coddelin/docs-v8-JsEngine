---
title: &apos;V8-Version v6.7&apos;
author: &apos;das V8-Team&apos;
date: 2018-05-04 13:33:37
tags:
  - Veröffentlichung
tweet: &apos;992506342391742465&apos;
description: &apos;V8 v6.7 fügt weitere Maßnahmen gegen nicht vertrauenswürdigen Code hinzu und bietet BigInt-Unterstützung.&apos;
---
Alle sechs Wochen erstellen wir im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process) einen neuen Branch von V8. Jede Version wird direkt vor einem Chrome-Beta-Meilenstein von V8's Git-Master abgezweigt. Heute freuen wir uns, unseren neuesten Branch, [V8-Version 6.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.7), anzukündigen, der sich bis zur Veröffentlichung in Koordination mit Chrome 67 Stable in einigen Wochen in der Beta-Phase befindet. V8 v6.7 ist vollgepackt mit allerlei Entwicklertools und neuen Funktionen. Dieser Beitrag gibt eine Vorschau auf einige der Highlights in Erwartung der Veröffentlichung.

<!--truncate-->
## JavaScript-Sprachfunktionen

V8 v6.7 wird standardmäßig mit aktivierter BigInt-Unterstützung ausgeliefert. BigInts sind eine neue numerische Primitive in JavaScript, die ganze Zahlen mit beliebiger Präzision darstellen können. Lesen Sie [unsere BigInt-Feature-Erklärung](/features/bigint) für weitere Informationen darüber, wie BigInts in JavaScript verwendet werden können, und schauen Sie sich [unseren Beitrag mit weiteren Details zur V8-Implementierung](/blog/bigint) an.

## Maßnahmen gegen nicht vertrauenswürdigen Code

In V8 v6.7 haben wir [weitere Maßnahmen gegen Seitenkanal-Schwachstellen](/docs/untrusted-code-mitigations) implementiert, um Informationslecks bei nicht vertrauenswürdigem JavaScript- und WebAssembly-Code zu verhindern.

## V8 API

Bitte verwenden Sie `git log branch-heads/6.6..branch-heads/6.7 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem [aktiven V8-Checkout](/docs/source-code#using-git) können `git checkout -b 6.7 -t branch-heads/6.7` verwenden, um die neuen Funktionen von V8 v6.7 auszuprobieren. Alternativ können Sie sich [für den Chrome-Beta-Kanal anmelden](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
