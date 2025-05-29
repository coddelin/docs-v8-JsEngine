---
title: "V8 Veröffentlichung v5.0"
author: "das V8-Team"
date: 2016-03-15 13:33:37
tags:
  - Veröffentlichung
description: "V8 v5.0 kommt mit Leistungsverbesserungen und bietet Unterstützung für mehrere neue ES2015-Sprachfeatures."
---
Der erste Schritt im V8-[Veröffentlichungsprozess](/docs/release-process) ist eine neue Branching vom Git-Master direkt bevor Chromium für einen Chrome-Beta-Meilenstein (etwa alle sechs Wochen) brancht. Unsere neueste Veröffentlichungs-Branch ist [V8 v5.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.0), die bis zum Erscheinen einer stabilen Version zusammen mit Chrome 50 Stable im Beta-Status bleiben wird. Hier sind die Highlights der neuen, entwicklerorientierten Features in dieser Version von V8.

<!--truncate-->
:::note
**Hinweis:** Die Versionsnummer 5.0 trägt keine semantische Bedeutung und markiert keine Hauptveröffentlichung (im Gegensatz zu einer kleineren Veröffentlichung).
:::

## Verbesserte ECMAScript 2015 (ES6)-Unterstützung

V8 v5.0 enthält eine Reihe von ES2015-Features im Zusammenhang mit der Verarbeitung regulärer Ausdrücke (Regex).

### Unicode-Flag für RegExp

Das [Unicode-Flag für RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Parameters), `u`, schaltet einen neuen Unicode-Modus für die Verarbeitung regulärer Ausdrücke ein. Das Unicode-Flag behandelt Muster und Regex-Strings als eine Reihe von Unicode-Codepoints und ermöglicht außerdem neue Syntax für Unicode-Codepoint-Escapes.

```js
/😊{2}/.test('😊😊');
// false

/😊{2}/u.test('😊😊');
// true

/\u{76}\u{38}/u.test('v8');
// true

/\u{1F60A}/u.test('😊');
// true
```

Das `u`-Flag sorgt außerdem dafür, dass das `.`-Atom (auch bekannt als der Single-Character-Matcher) jedes Unicode-Symbol und nicht nur die Charaktere in der Basic Multilingual Plane (BMP) matcht.

```js
const string = 'der 🅛 Zug';

/der\s.\szug/.test(string);
// false

/der\s.\szug/u.test(string);
// true
```

### Anpassungshooks für RegExp

ES2015 beinhaltet Hooks für RegExp-Unterklassen, um die Semantik des Matchings zu verändern. Unterklassen können Methoden überschreiben, die `Symbol.match`, `Symbol.replace`, `Symbol.search` und `Symbol.split` heißen, um das Verhalten von RegExp-Unterklassen in Bezug auf `String.prototype.match` und ähnliche Methoden zu ändern.

## Leistungsverbesserungen bei ES2015- und ES5-Features

Version 5.0 bringt auch einige bemerkenswerte Leistungsverbesserungen für bereits implementierte ES2015- und ES5-Features.

Die Implementierung von Rest-Parametern ist 8-10x schneller als in der vorherigen Version, was es effizienter macht, große Argumentmengen in ein einziges Array nach einem Funktionsaufruf zu sammeln. `Object.keys`, nützlich zum Iterieren über die aufzählbaren Eigenschaften eines Objekts in derselben Reihenfolge wie `for`-`in`, ist jetzt etwa 2x schneller.

## V8 API

Bitte sehen Sie sich unsere [Zusammenfassung der API-Änderungen](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit) an. Dieses Dokument wird in der Regel einige Wochen nach jeder größeren Veröffentlichung regelmäßig aktualisiert.

Entwickler mit einem [aktiven V8-Checkout](https://v8.dev/docs/source-code#using-git) können `git checkout -b 5.0 -t branch-heads/5.0` verwenden, um mit den neuen Features in V8 5.0 zu experimentieren. Alternativ können Sie [Chrome's Beta-Kanal abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Features bald selbst ausprobieren.
