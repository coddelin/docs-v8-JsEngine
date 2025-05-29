---
title: "V8 Veröffentlichung v7.1"
author: "Stephan Herhut ([@herhut](https://twitter.com/herhut)), geklonter Kloner von Klonen"
avatars:
  - stephan-herhut
date: 2018-10-31 15:44:37
tags:
  - veröffentlichung
description: "V8 v7.1 bietet eingebettete Bytecode-Handler, verbesserte TurboFan-Fluchtanalyse, postMessage(wasmModule), Intl.RelativeTimeFormat und globalThis!"
tweet: "1057645773465235458"
---
Alle sechs Wochen erstellen wir einen neuen Zweig von V8 im Rahmen unseres [Release-Prozesses](/docs/release-process). Jede Version wird unmittelbar vor einem Chrome-Beta-Meilenstein aus V8’s Git-Master abgezweigt. Heute freuen wir uns, unseren neuesten Zweig, [V8 Version 7.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.1), bekannt zu geben, der bis zur Veröffentlichung in Abstimmung mit Chrome 71 Stable in einigen Wochen in der Betaphase ist. V8 v7.1 ist randvoll mit allerlei Entwickler-Features. Dieser Beitrag bietet eine Vorschau auf einige der Highlights in Erwartung der Veröffentlichung.

<!--truncate-->
## Speicher

Nach der Arbeit in v6.9/v7.0 zur [Einbettung von Builtins direkt in die Binärdatei](/blog/embedded-builtins) sind Bytecode-Handler für den Interpreter nun ebenfalls [in die Binärdatei eingebettet](https://bugs.chromium.org/p/v8/issues/detail?id=8068). Dies spart durchschnittlich etwa 200 KB pro Isolate.

## Leistung

Die Fluchtanalyse in TurboFan, die skalare Ersetzungen für Objekte durchführt, die einer Optimierungseinheit lokal zugeordnet sind, wurde verbessert, um auch [lokale Funktionskontexte für höherstufige Funktionen](https://bit.ly/v8-turbofan-context-sensitive-js-operators) zu handhaben, wenn Variablen aus dem umgebenden Kontext zu einem lokalen Abschluss entweichen. Betrachten Sie das folgende Beispiel:

```js
function mapAdd(a, x) {
  return a.map(y => y + x);
}
```

Beachten Sie, dass `x` eine freie Variable des lokalen Abschlusses `y => y + x` ist. V8 v7.1 kann nun die Kontextzuweisung von `x` vollständig auslassen, was in einigen Fällen eine Verbesserung von bis zu **40%** ergibt.

![Leistungssteigerung mit neuer Fluchtanalyse (niedriger ist besser)](/_img/v8-release-71/improved-escape-analysis.svg)

Die Fluchtanalyse ist nun auch in der Lage, einige Fälle von Variablenindexzugriff auf lokale Arrays zu eliminieren. Hier ist ein Beispiel:

```js
function sum(...args) {
  let total = 0;
  for (let i = 0; i < args.length; ++i)
    total += args[i];
  return total;
}

function sum2(x, y) {
  return sum(x, y);
}
```

Beachten Sie, dass die `args` lokal zu `sum2` sind (unter der Annahme, dass `sum` in `sum2` eingebettet ist). In V8 v7.1 kann TurboFan nun die Zuweisung von `args` vollständig eliminieren und den Variablenindexzugriff `args[i]` durch eine Ternär-Operation der Form `i === 0 ? x : y` ersetzen. Dies ergibt eine Verbesserung von ~2% beim JetStream/EarleyBoyer-Benchmark. Wir könnten diese Optimierung in Zukunft auf Arrays mit mehr als zwei Elementen ausweiten.

## Strukturierte Klonierung von Wasm-Modulen

Schließlich wird [`postMessage` für Wasm-Module unterstützt](https://github.com/WebAssembly/design/pull/1074). `WebAssembly.Module`-Objekte können jetzt an Web-Worker übergeben werden. Zur Klarstellung: Dies bezieht sich lediglich auf Web-Worker (gleicher Prozess, anderer Thread) und nicht auf prozessübergreifende Szenarien (wie cross-origin `postMessage` oder geteilte Web-Worker).

## JavaScript-Sprachfunktionen

[Die `Intl.RelativeTimeFormat` API](/features/intl-relativetimeformat) ermöglicht die formatierte Anzeige relativer Zeiten (z. B. „gestern“, „vor 42 Sekunden“ oder „in 3 Monaten“) lokalisiert und ohne Leistungseinbußen. Hier ist ein Beispiel:

```js
// Erstellen Sie einen Formatter für relative Zeitangaben in englischer Sprache,
// der nicht immer numerische Werte in der Ausgabe verwenden muss.
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → 'gestern'

rtf.format(0, 'day');
// → 'heute'

rtf.format(1, 'day');
// → 'morgen'

rtf.format(-1, 'week');
// → 'letzte Woche'

rtf.format(0, 'week');
// → 'diese Woche'

rtf.format(1, 'week');
// → 'nächste Woche'
```

Lesen Sie [unsere Einführung zu `Intl.RelativeTimeFormat`](/features/intl-relativetimeformat), um mehr Informationen zu erhalten.

V8 v7.1 fügt außerdem Unterstützung für [den `globalThis`-Vorschlag](/features/globalthis) hinzu, der eine universelle Methode bietet, um auf das globale Objekt zuzugreifen, selbst in strikten Funktionen oder Modulen, unabhängig von der Plattform.

## V8 API

Bitte verwenden Sie `git log branch-heads/7.0..branch-heads/7.1 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem [aktiven V8-Checkout](/docs/source-code#using-git) können `git checkout -b 7.1 -t branch-heads/7.1` verwenden, um mit den neuen Funktionen in V8 v7.1 zu experimentieren. Alternativ können Sie [Chrome’s Beta-Kanal abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
