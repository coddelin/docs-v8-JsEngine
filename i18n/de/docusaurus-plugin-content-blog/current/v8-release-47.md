---
title: 'V8-Version v4.7'
author: 'das V8-Team'
date: 2015-10-14 13:33:37
tags:
  - Version
description: 'V8 v4.7 kommt mit reduziertem Speicherverbrauch und Unterstützung für neue ES2015 Sprachfunktionen.'
---
Etwa alle sechs Wochen erstellen wir einen neuen V8-Zweig im Rahmen unseres [Release-Prozesses](https://v8.dev/docs/release-process). Jede Version wird direkt vor der Chrome-Verzweigung für einen Chrome-Beta-Meilenstein aus dem Git-Master von V8 verzweigt. Heute freuen wir uns, unseren neuesten Zweig anzukündigen, [V8 Version 4.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.7), der sich in der Beta-Phase befindet, bis er zusammen mit Chrome 47 Stable veröffentlicht wird. V8 v4.7 ist voll mit allerlei Entwicklerproblemen, und wir möchten Ihnen einige Highlights bei der Vorfreude auf die Veröffentlichung in einigen Wochen vorstellen.

<!--truncate-->
## Verbesserte ECMAScript 2015 (ES6)-Unterstützung

### Rest-Operator

Der [Rest-Operator](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Functions/rest_parameters) ermöglicht es dem Entwickler, einer Funktion eine unbegrenzte Anzahl von Argumenten zu übergeben. Er ähnelt dem `arguments`-Objekt.

```js
// Ohne Rest-Operator
function concat() {
  var args = Array.prototype.slice.call(arguments, 1);
  return args.join('');
}

// Mit Rest-Operator
function concatWithRest(...strings) {
  return strings.join('');
}
```

## Unterstützung für kommende ES-Funktionen

### `Array.prototype.includes`

[`Array.prototype.includes`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes) ist eine neue Funktion, die sich derzeit im Stadium-3-Vorschlag für die Aufnahme in ES2016 befindet. Sie bietet eine komprimierte Syntax, um zu bestimmen, ob ein Element in einem bestimmten Array enthalten ist, indem ein boolescher Wert zurückgegeben wird.

```js
[1, 2, 3].includes(3); // true
['apfel', 'banane', 'kirsche'].includes('apfel'); // true
['apfel', 'banane', 'kirsche'].includes('pfrisch'); // false
```

## Verminderung des Speicherverbrauchs beim Parsen

[Neueste Änderungen am V8-Parser](https://code.google.com/p/v8/issues/detail?id=4392) reduzieren den Speicherverbrauch erheblich, wenn Dateien mit großen verschachtelten Funktionen geparst werden. Insbesondere ermöglicht dies V8, größere asm.js-Module auszuführen als bisher möglich.

## V8-API

Bitte schauen Sie sich unsere [Zusammenfassung der API-Änderungen](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit) an. Dieses Dokument wird regelmäßig einige Wochen nach jeder größeren Veröffentlichung aktualisiert. Entwickler mit einem [aktiven V8-Checkout](https://v8.dev/docs/source-code#using-git) können `git checkout -b 4.7 -t branch-heads/4.7` verwenden, um mit den neuen Funktionen in V8 v4.7 zu experimentieren. Alternativ können Sie [Chrome's Beta-Kanal abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
