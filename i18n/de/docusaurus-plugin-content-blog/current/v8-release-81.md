---
title: "V8 Veröffentlichung v8.1"
author: "Dominik Inführ, international(ization) Mann des Geheimnisses"
avatars: 
  - "dominik-infuehr"
date: 2020-02-25
tags: 
  - veröffentlichung
description: "V8 v8.1 bietet verbesserte Unterstützung für Internationalisierung durch die neue Intl.DisplayNames API."
---

Alle sechs Wochen erstellen wir einen neuen Zweig von V8 als Teil unseres [Veröffentlichungsprozesses](https://v8.dev/docs/release-process). Jede Version wird direkt vor einem Chrome Beta-Meilenstein vom Git-Master-Zweig von V8 abgezweigt. Heute freuen wir uns, unseren neuesten Zweig, [V8 Version 8.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.1), anzukündigen, der sich bis zu seiner Veröffentlichung in Abstimmung mit Chrome 81 Stable in mehreren Wochen in der Beta-Phase befindet. V8 v8.1 ist vollgepackt mit allerlei Entwicklerfreundlichem. Dieser Beitrag bietet eine Vorschau auf einige der Highlights zur Vorbereitung auf die Veröffentlichung.

<!--truncate-->
## JavaScript

### `Intl.DisplayNames`

Die neue `Intl.DisplayNames` API ermöglicht es Programmierern, übersetzte Namen von Sprachen, Regionen, Schriftsystemen und Währungen mit Leichtigkeit anzuzeigen.

```js
const zhLanguageNames = new Intl.DisplayNames(['zh-Hant'], { type: 'language' });
const enRegionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const itScriptNames = new Intl.DisplayNames(['it'], { type: 'script' });
const deCurrencyNames = new Intl.DisplayNames(['de'], {type: 'currency'});

zhLanguageNames.of('fr');
// → 'Französisch'
enRegionNames.of('US');
// → 'Vereinigte Staaten'
itScriptNames.of('Latn');
// → 'lateinisch'
deCurrencyNames.of('JPY');
// → 'Japanischer Yen'
```

Übertragen Sie die Last der Pflege von Übersetzungsdaten noch heute an die Laufzeit! Siehe [unsere Funktionsbeschreibung](https://v8.dev/features/intl-displaynames) für Details zur vollständigen API und weitere Beispiele.

## V8 API

Bitte verwenden Sie `git log branch-heads/8.0..branch-heads/8.1 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem [aktiven V8 Checkout](/docs/source-code#using-git) können `git checkout -b 8.1 -t branch-heads/8.1` verwenden, um die neuen Funktionen in V8 v8.1 auszuprobieren. Alternativ können Sie [den Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
