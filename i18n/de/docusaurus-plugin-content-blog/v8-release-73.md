---
title: "V8-Veröffentlichung v7.3"
author: "Clemens Backes, Compiler-Bändiger"
avatars: 
  - clemens-backes
date: "2019-02-07 11:30:42"
tags: 
  - veröffentlichung
description: "V8 v7.3 bietet Verbesserungen in WebAssembly und asynchroner Leistung, asynchrone Stack-Traces, Object.fromEntries, String#matchAll und vieles mehr!"
tweet: "1093457099441561611"
---
Alle sechs Wochen erstellen wir einen neuen Branch von V8 im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process). Jede Version wird direkt vor einem Chrome-Beta-Meilenstein aus dem Git-Master von V8 verzweigt. Heute freuen wir uns, unseren neuesten Branch, [V8 Version 7.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.3), anzukündigen, der bis zu seiner Veröffentlichung in mehreren Wochen in Zusammenarbeit mit Chrome 73 Stable in der Beta-Phase ist. V8 v7.3 ist vollgepackt mit allerlei von Entwicklern geschätzten Features. Dieser Beitrag bietet einen Überblick über einige der Highlights als Vorgeschmack auf die Veröffentlichung.

<!--truncate-->
## Asynchrone Stack-Traces

Wir aktivieren die [Flagge `--async-stack-traces`](/blog/fast-async#improved-developer-experience) standardmäßig. [Kostenlose asynchrone Stack-Traces](https://bit.ly/v8-zero-cost-async-stack-traces) erleichtern die Diagnose von Problemen in Produktionsumgebungen mit stark asynchronem Code, da die `error.stack`-Eigenschaft, die normalerweise an Logdateien/-dienste gesendet wird, jetzt mehr Einsicht darüber bietet, was das Problem verursacht hat.

## Schnellere `await`-Operationen

Im Zusammenhang mit der oben genannten `--async-stack-traces`-Flagge aktivieren wir auch die `--harmony-await-optimization`-Flagge standardmäßig, da sie eine Voraussetzung für die `--async-stack-traces` ist. Siehe [schnellere asynchrone Funktionen und Promises](/blog/fast-async#await-under-the-hood) für weitere Details.

## Schnellere Wasm-Starts

Durch Optimierungen der internen Abläufe von Liftoff haben wir die WebAssembly-Kompilierungsgeschwindigkeit erheblich verbessert, ohne die Qualität des erzeugten Codes zu beeinträchtigen. Für die meisten Workloads wurde die Kompilierungszeit um 15–25 % reduziert.

![Liftoff-Kompilierungszeit auf [der Epic ZenGarden-Demo](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html)](/_img/v8-release-73/liftoff-epic.svg)

## JavaScript-Sprachfunktionen

V8 v7.3 kommt mit mehreren neuen JavaScript-Sprachfunktionen.

### `Object.fromEntries`

Die `Object.entries`-API ist nichts Neues:

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]
```

Leider gab es bisher keine einfache Möglichkeit, aus dem `entries`-Ergebnis wieder ein gleichwertiges Objekt zu erstellen… bis jetzt! V8 v7.3 unterstützt [`Object.fromEntries()`](/features/object-fromentries), eine neue eingebaute API, die die Umkehrung von `Object.entries` ausführt:

```js
const result = Object.fromEntries(entries);
// → { x: 42, y: 50 }
```

Für weitere Informationen und Anwendungsbeispiele, siehe [unsere Erklärung zu `Object.fromEntries`](/features/object-fromentries).

### `String.prototype.matchAll`

Ein häufiger Anwendungsfall von globalen (`g`) oder stickigen (`y`) regulären Ausdrücken ist die Anwendung auf eine Zeichenkette und das Iterieren durch alle Übereinstimmungen. Die neue `String.prototype.matchAll`-API erleichtert dies mehr denn je, insbesondere für reguläre Ausdrücke mit Erfassungsgruppen:

```js
const string = 'Lieblings-GitHub-Repos: tc39/ecma262 v8/v8.dev';
const regex = /\b(?<owner>[a-z0-9]+)\/(?<repo>[a-z0-9\.]+)\b/g;

for (const match of string.matchAll(regex)) {
  console.log(`${match[0]} bei ${match.index} mit '${match.input}'`);
  console.log(`→ Besitzer: ${match.groups.owner}`);
  console.log(`→ Repo: ${match.groups.repo}`);
}

// Ausgabe:
//
// tc39/ecma262 bei 23 mit 'Lieblings-GitHub-Repos: tc39/ecma262 v8/v8.dev'
// → Besitzer: tc39
// → Repo: ecma262
// v8/v8.dev bei 36 mit 'Lieblings-GitHub-Repos: tc39/ecma262 v8/v8.dev'
// → Besitzer: v8
// → Repo: v8.dev
```

Für weitere Details, lesen Sie [unsere Erklärung zu `String.prototype.matchAll`](/features/string-matchall).

### `Atomics.notify`

`Atomics.wake` wurde in `Atomics.notify` umbenannt und entspricht damit [einer aktuellen Spezifikationsänderung](https://github.com/tc39/ecma262/pull/1220).

## V8-API

Bitte verwenden Sie `git log branch-heads/7.2..branch-heads/7.3 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einer [aktiven V8-Auscheckung](/docs/source-code#using-git) können `git checkout -b 7.3 -t branch-heads/7.3` verwenden, um die neuen Funktionen in V8 v7.3 auszuprobieren. Alternativ können Sie sich [für den Beta-Kanal von Chrome einschreiben](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen schon bald selbst ausprobieren.
