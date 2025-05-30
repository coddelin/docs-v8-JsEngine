---
title: "Top-level `await`"
author: "Myles Borins ([@MylesBorins](https://twitter.com/MylesBorins))"
avatars: 
  - "myles-borins"
date: 2019-10-08
tags: 
  - ECMAScript
  - Node.js 14
description: "Top-level `await` kommt in JavaScript-Module! Bald können Sie `await` verwenden, ohne sich in einer asynchronen Funktion befinden zu müssen."
tweet: "1181581262399643650"
---
[Top-level `await`](https://github.com/tc39/proposal-top-level-await) ermöglicht Entwicklern, das `await`-Schlüsselwort außerhalb von asynchronen Funktionen zu verwenden. Es verhält sich wie eine große asynchrone Funktion, wodurch andere Module, die sie `importieren`, darauf warten, bevor sie beginnen, ihren Körper zu evaluieren.

<!--truncate-->
## Das alte Verhalten

Als `async`/`await` erstmals eingeführt wurde, führte der Versuch, ein `await` außerhalb einer `async`-Funktion zu verwenden, zu einem `SyntaxError`. Viele Entwickler verwendeten direkt aufgerufene asynchrone Funktionsausdrücke, um Zugriff auf die Funktionalität zu erhalten.

```js
await Promise.resolve(console.log('🎉'));
// → SyntaxError: await ist nur gültig in einer asynchronen Funktion

(async function() {
  await Promise.resolve(console.log('🎉'));
  // → 🎉
}());
```

## Das neue Verhalten

Mit top-level `await` funktioniert der obige Code wie erwartet innerhalb von [Modulen](/features/modules):

```js
await Promise.resolve(console.log('🎉'));
// → 🎉
```

:::note
**Hinweis:** Top-Level-`await` funktioniert _nur_ auf der obersten Ebene von Modulen. Es gibt keine Unterstützung für klassische Skripte oder nicht asynchrone Funktionen.
:::

## Anwendungsfälle

Diese Anwendungsfälle stammen aus dem [Spec Proposal Repository](https://github.com/tc39/proposal-top-level-await#use-cases).

### Dynamische Abhängigkeitspfadfindung

```js
const strings = await import(`/i18n/${navigator.language}`);
```

Dies ermöglicht es Modulen, Laufzeitwerte zu verwenden, um Abhängigkeiten zu bestimmen. Dies ist nützlich für Dinge wie Entwicklungs-/Produktionsaufteilungen, Internationalisierung, Umgebungssplits usw.

### Ressourceninitialisierung

```js
const connection = await dbConnector();
```

Dies ermöglicht es Modulen, Ressourcen darzustellen und auch Fehler zu erzeugen, in Fällen, in denen das Modul nicht verwendet werden kann.

### Abhängigkeits-Backups

Das folgende Beispiel versucht, eine JavaScript-Bibliothek von CDN A zu laden und wechselt zu CDN B, falls dies fehlschlägt:

```js
let jQuery;
try {
  jQuery = await import('https://cdn-a.example.com/jQuery');
} catch {
  jQuery = await import('https://cdn-b.example.com/jQuery');
}
```

## Modulausführungsreihenfolge

Eine der größten Veränderungen in JavaScript mit top-level `await` ist die Reihenfolge der Ausführung von Modulen in Ihrem Graph. Die JavaScript-Engine führt Module in [post-order traversal](https://en.wikibooks.org/wiki/A-level_Computing/AQA/Paper_1/Fundamentals_of_algorithms/Tree_traversal#Post-order) aus: Ausgehend vom ganz linken Teilbaum Ihres Modulgraphen werden Module ausgewertet, ihre Bindungen exportiert, und ihre Geschwister ausgeführt, gefolgt von ihren Eltern. Dieser Algorithmus läuft rekursiv, bis er die Wurzel Ihres Modulgraphen ausführt.

Vor top-level `await` war diese Reihenfolge immer synchron und deterministisch: Zwischen mehreren Ausführungen Ihres Codes war Ihr Graph garantiert, in der gleichen Reihenfolge ausgeführt zu werden. Sobald top-level `await` implementiert ist, bleibt diese Garantie bestehen, aber nur, solange Sie kein top-level `await` verwenden.

Hier ist, was passiert, wenn Sie top-level `await` in einem Modul verwenden:

1. Die Ausführung des aktuellen Moduls wird verschoben, bis das erwartete Versprechen aufgelöst wird.
1. Die Ausführung des übergeordneten Moduls wird verschoben, bis das untergeordnete Modul, das `await` aufgerufen hat, und alle seine Geschwister Bindungen exportieren.
1. Die Geschwistermodule und Geschwister der übergeordneten Module können weiterhin in derselben synchronen Reihenfolge ausgeführt werden — vorausgesetzt, es gibt keine Zyklen oder andere `await`-Promises im Graphen.
1. Das Modul, das `await` aufgerufen hat, setzt seine Ausführung fort, nachdem das `await`-Promise aufgelöst wird.
1. Das übergeordnete Modul und nachfolgende Baumstrukturen werden in synchroner Reihenfolge ausgeführt, solange keine weiteren `await`-Promises vorhanden sind.

## Funktioniert das nicht bereits in DevTools?

Ja, tatsächlich! Der REPL in [Chrome DevTools](https://developers.google.com/web/updates/2017/08/devtools-release-notes#await), [Node.js](https://github.com/nodejs/node/issues/13209) und Safari Web Inspector hat top-level `await` schon seit einiger Zeit unterstützt. Diese Funktionalität war jedoch nicht standardmäßig und auf den REPL begrenzt! Sie unterscheidet sich vom Vorschlag für top-level `await`, der Teil der Sprachspezifikation ist und nur für Module gilt. Um Produktionscode, der auf top-level `await` basiert, so zu testen, dass er vollständig mit den Semantiken des Specs-Vorschlags übereinstimmt, stellen Sie sicher, dass Sie in Ihrer tatsächlichen App testen und nicht nur in DevTools oder im Node.js REPL!

## Ist top-level `await` nicht ein Problem?

Vielleicht haben Sie den [berüchtigten Gist](https://gist.github.com/Rich-Harris/0b6f317657f5167663b493c722647221) von [Rich Harris](https://twitter.com/Rich_Harris) gesehen, der ursprünglich eine Reihe von Bedenken bezüglich top-level `await` skizzierte und die JavaScript-Sprache aufforderte, das Feature nicht zu implementieren. Einige spezifische Bedenken waren:

- Top-level `await` könnte die Ausführung blockieren.
- Top-level `await` könnte das Abrufen von Ressourcen blockieren.
- Es gäbe keine klare Interoperabilitätslösung für CommonJS-Module.

Die Version des Vorschlags in Phase 3 adressiert diese Themen direkt:

- Da Geschwistermodule gleichzeitig ausgeführt werden können, gibt es keine definitive Blockierung.
- Top-level `await` findet während der Ausführungsphase des Modulgraphen statt. Zu diesem Zeitpunkt wurden alle Ressourcen bereits abgerufen und verknüpft. Es besteht kein Risiko, dass das Abrufen von Ressourcen blockiert wird.
- Top-level `await` ist auf Module beschränkt. Es gibt ausdrücklich keine Unterstützung für Skripte oder CommonJS-Module.

Wie bei jeder neuen Sprachfunktion gibt es immer ein Risiko für unerwartetes Verhalten. Zum Beispiel könnten zirkuläre Modulabhängigkeiten bei top-level `await` zu einer Sackgasse führen.

Ohne top-level `await` verwenden JavaScript-Entwickler oft asynchrone sofort aufgerufene Funktionsausdrücke, nur um Zugriff auf `await` zu erhalten. Leider führt dieses Muster zu weniger Determinismus in der Ausführung des Modulgraphen und zur geringeren statischen Analysierbarkeit von Anwendungen. Aus diesen Gründen wurde das Fehlen von top-level `await` als ein höheres Risiko angesehen als die mit der Funktion eingeführten Gefahren.

## Unterstützung für top-level `await`

<feature-support chrome="89 https://bugs.chromium.org/p/v8/issues/detail?id=9344"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1519100"
                 safari="15 https://bugs.webkit.org/show_bug.cgi?id=202484"
                 nodejs="14"
                 babel="no https://github.com/babel/proposals/issues/44"></feature-support>
