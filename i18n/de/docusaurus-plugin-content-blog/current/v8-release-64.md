---
title: 'V8-Version v6.4'
author: 'das V8-Team'
date: 2017-12-19 13:33:37
tags:
  - Veröffentlichung
description: 'V8 v6.4 bringt Leistungsverbesserungen, neue JavaScript-Sprachfunktionen und mehr.'
tweet: '943057597481082880'
---
Alle sechs Wochen erstellen wir einen neuen Zweig von V8 im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process). Jede Version wird direkt vor einem Chrome-Beta-Meilenstein von V8s Git Master abgezweigt. Heute freuen wir uns, unseren neuesten Zweig, [V8-Version 6.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.4), bekannt zu geben, der sich bis zur Veröffentlichung in Zusammenarbeit mit Chrome 64 Stable in mehreren Wochen in der Beta-Phase befindet. V8 v6.4 ist voller Entwicklerfreundlicher Verbesserungen. In diesem Beitrag geben wir einen Überblick über einige Highlights, die auf die Veröffentlichung vorbereiten.

<!--truncate-->
## Geschwindigkeit

V8 v6.4 [verbessert](https://bugs.chromium.org/p/v8/issues/detail?id=6971) die Leistung des `instanceof`-Operators um das 3,6-fache. Als direktes Ergebnis ist [uglify-js](http://lisperator.net/uglifyjs/) laut [V8s Web Tooling Benchmark](https://github.com/v8/web-tooling-benchmark) jetzt 15–20 % schneller.

Diese Veröffentlichung behebt auch einige Leistungseinbrüche bei `Function.prototype.bind`. Beispielsweise wird TurboFan nun [konsequent alle monomorphen Aufrufe](https://bugs.chromium.org/p/v8/issues/detail?id=6946) von `bind` inline geschaltet. Darüber hinaus unterstützt TurboFan auch das _Gebundene Callback-Muster_, was bedeutet, dass anstelle des Folgenden:

```js
doSomething(callback, someObj);
```

Jetzt folgendes verwendet werden kann:

```js
doSomething(callback.bind(someObj));
```

Auf diese Weise ist der Code besser lesbar und bietet trotzdem die gleiche Leistung.

Dank der neuesten Beiträge von [Peter Wong](https://twitter.com/peterwmwong) werden [`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap) und [`WeakSet`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet) nun mit dem [CodeStubAssembler](/blog/csa) implementiert, was zu Leistungsverbesserungen von bis zu 5× in allen Bereichen führt.

![](/_img/v8-release-64/weak-collection.svg)

Als Teil von V8s [laufender Bemühungen](https://bugs.chromium.org/p/v8/issues/detail?id=1956), die Leistung von Array-Built-ins zu verbessern, wurde die Leistung von `Array.prototype.slice` um ~4× verbessert, indem es mit dem CodeStubAssembler neu implementiert wurde. Außerdem werden Aufrufe von `Array.prototype.map` und `Array.prototype.filter` nun in vielen Fällen inline geschaltet, wodurch sie eine Leistungsprofil bieten, das mit handgeschriebenen Versionen konkurriert.

Wir haben daran gearbeitet, dass Zugriffe außerhalb der Grenzen von Arrays, typisierten Arrays und Zeichenketten [keine ~10× Leistungseinbuße mehr bedeuten](https://bugs.chromium.org/p/v8/issues/detail?id=7027), nachdem wir festgestellt haben, [dass dieses Codierungsmuster](/blog/elements-kinds#avoid-reading-beyond-length) in der Praxis verwendet wird.

## Speicher

V8s eingebettete Code-Objekte und Bytecode-Handler werden jetzt standardmäßig beim Snapshot lazy deserialisiert, was den Speicherverbrauch pro Isolate erheblich reduzieren kann. Benchmarks in Chrome zeigen Einsparungen von mehreren Hundert KB pro Tab beim Durchsuchen gängiger Websites.

![](/_img/v8-release-64/codespace-consumption.svg)

Freuen Sie sich auf einen dedizierten Blogbeitrag zu diesem Thema Anfang nächsten Jahres.

## ECMAScript-Sprachfunktionen

Diese V8-Version bietet Unterstützung für zwei neue spannende Funktionen bei regulären Ausdrücken.

In regulären Ausdrücken mit dem `/u`-Flag sind [Unicode-Eigenschaftsfluchten](https://mathiasbynens.be/notes/es-unicode-property-escapes) jetzt standardmäßig aktiviert.

```js
const regexGreekSymbol = /\p{Script_Extensions=Greek}/u;
regexGreekSymbol.test('π');
// → true
```

Die Unterstützung für [benannte Erfassungsgruppen](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features#named_captures) in regulären Ausdrücken ist jetzt standardmäßig aktiviert.

```js
const pattern = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/u;
const result = pattern.exec('2017-12-15');
// result.groups.year === '2017'
// result.groups.month === '12'
// result.groups.day === '15'
```

Weitere Details zu diesen Funktionen finden Sie in unserem Blogbeitrag mit dem Titel [Kommende Funktionen für reguläre Ausdrücke](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features).

Dank [Groupon](https://twitter.com/GrouponEng) implementiert V8 jetzt [`import.meta`](https://github.com/tc39/proposal-import-meta), was es Embettern ermöglicht, host-spezifische Metadaten zum aktuellen Modul offenzulegen. Chrome 64 zeigt beispielsweise die Modul-URL über `import.meta.url` an, und Chrome plant, in Zukunft weitere Eigenschaften zu `import.meta` hinzuzufügen.

Zur Unterstützung der lokalbewussten Formatierung von Zeichenfolgen, die von Internationalisierungsformatierern erzeugt werden, können Entwickler jetzt [`Intl.NumberFormat.prototype.formatToParts()`](https://github.com/tc39/proposal-intl-formatToParts) verwenden, um eine Zahl in eine Liste von Tokens und deren Typ zu formatieren. Danke an [Igalia](https://twitter.com/igalia) für die Implementierung dieser Funktion in V8!

## V8-API

Bitte verwenden Sie `git log branch-heads/6.3..branch-heads/6.4 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem [aktiven V8-Checkout](/docs/source-code#using-git) können `git checkout -b 6.4 -t branch-heads/6.4` nutzen, um mit den neuen Funktionen in V8 v6.4 zu experimentieren. Alternativ können Sie [den Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
