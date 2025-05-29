---
title: "V8-Veröffentlichung v9.4"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))"
avatars:
 - "ingvar-stepanyan"
date: 2021-09-06
tags:
 - veröffentlichung
description: "Mit der V8-Veröffentlichung v9.4 kommen Klassen statische Initialisierungsblöcke zu JavaScript."
tweet: "1434915404418277381"
---
Alle sechs Wochen erstellen wir einen neuen Branch von V8 im Rahmen unseres [Release-Prozesses](https://v8.dev/docs/release-process). Jede Version wird unmittelbar vor einem Chrome-Beta-Meilenstein aus V8s Git-Master abgeleitet. Heute freuen wir uns, unseren neuesten Branch anzukündigen, [V8-Version 9.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.4), der sich mehrere Wochen lang in der Beta-Phase befindet, bis er zusammen mit Chrome 94 Stable veröffentlicht wird. V8 v9.4 ist voll von allerlei Entwickler-freundlichen Neuerungen. Dieser Beitrag gibt einen Ausblick auf einige der Highlights im Voraus der Veröffentlichung.

<!--truncate-->
## JavaScript

### Klassen statische Initialisierungsblöcke

Klassen erhalten die Fähigkeit, Code zu gruppieren, der einmal pro Klassenbewertung ausgeführt werden soll, mithilfe von statischen Initialisierungsblöcken.

```javascript
class C {
  // Dieser Block wird ausgeführt, wenn die Klasse selbst bewertet wird
  static { console.log("C's statischer Block"); }
}
```

Ab Version v9.4 stehen Klassen statische Initialisierungsblöcke ohne das `--harmony-class-static-blocks`-Flag zur Verfügung. Für alle detaillierten Semantiken rund um die Bereichsdefinition dieser Blöcke lesen Sie bitte [unsere Erklärung](https://v8.dev/features/class-static-initializer-blocks).

## V8 API

Bitte verwenden Sie `git log branch-heads/9.3..branch-heads/9.4 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem aktiven V8-Checkout können `git checkout -b 9.4 -t branch-heads/9.4` verwenden, um die neuen Funktionen in V8 v9.4 auszuprobieren. Alternativ können Sie [den Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
