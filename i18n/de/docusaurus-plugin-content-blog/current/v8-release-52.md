---
title: "V8-Version v5.2"
author: "Das V8-Team"
date: 2016-06-04 13:33:37
tags:
  - Veröffentlichung
description: "V8 v5.2 enthält Unterstützung für die Sprachfeatures von ES2016."
---
Etwa alle sechs Wochen erstellen wir einen neuen Branch von V8 als Teil unseres [Veröffentlichungsprozesses](/docs/release-process). Jede Version wird direkt von V8s Git-Master abgezweigt, unmittelbar bevor Chrome für einen Chrome-Beta-Meilenstein verzweigt. Heute freuen wir uns, unseren neuesten Branch, [V8-Version 5.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.2), anzukündigen, der bis zur Veröffentlichung in Abstimmung mit Chrome 52 Stable in der Beta-Phase bleiben wird. V8 5.2 ist vollgepackt mit allerlei Entwickler-freundlichen Neuerungen, daher möchten wir Ihnen einen Einblick in einige Highlights geben, um die Veröffentlichung in einigen Wochen vorzubereiten.

<!--truncate-->
## ES2015- und ES2016-Unterstützung

V8 v5.2 enthält Unterstützung für ES2015 (auch bekannt als ES6) und ES2016 (auch bekannt als ES7).

### Exponentiationsoperator

Diese Version enthält Unterstützung für den ES2016-Exponentiationsoperator, eine Infix-Notation zur Ersetzung von `Math.pow`.

```js
let n = 3**3; // n == 27
n **= 2; // n == 729
```

### Weiterentwicklung der Spezifikation

Weitere Informationen zu den Herausforderungen hinter der Unterstützung von sich entwickelnden Spezifikationen und den fortlaufenden Standarddiskussionen zu Webkompatibilitätsfehlern und Tail Calls finden Sie im V8-Blogbeitrag [ES2015, ES2016 und darüber hinaus](/blog/modern-javascript).

## Leistung

V8 v5.2 enthält weitere Optimierungen zur Verbesserung der Leistung von JavaScript-Built-ins, einschließlich Verbesserungen für Array-Operationen wie die Methode isArray, den in-Operator und Function.prototype.bind. Dies ist Teil der laufenden Arbeit zur Beschleunigung von Built-ins auf Grundlage neuer Analysen von Laufzeitanrufstatistiken auf beliebten Webseiten. Weitere Informationen finden Sie in der [V8 Google I/O 2016 Präsentation](https://www.youtube.com/watch?v=N1swY14jiKc) und in einem bevorstehenden Blogbeitrag zu Leistungsoptimierungen, die aus realen Webseiten gewonnen wurden.

## V8-API

Bitte sehen Sie sich unsere [Zusammenfassung der API-Änderungen](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit) an. Dieses Dokument wird regelmäßig einige Wochen nach jeder Hauptversion aktualisiert.

Entwickler mit einem [aktiven V8-Checkout](https://v8.dev/docs/source-code#using-git) können `git checkout -b 5.2 -t branch-heads/5.2` nutzen, um die neuen Features in V8 v5.2 auszuprobieren. Alternativ können Sie [Chromes Beta-Kanal abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Features bald selbst ausprobieren.
