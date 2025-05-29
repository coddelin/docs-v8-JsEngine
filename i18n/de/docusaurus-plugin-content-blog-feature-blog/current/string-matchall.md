---
title: &apos;`String.prototype.matchAll`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-02-02
tags:
  - ECMAScript
  - ES2020
  - io19
description: &apos;String.prototype.matchAll erleichtert das Iterieren über alle Übereinstimmungsobjekte, die ein bestimmter regulärer Ausdruck erzeugt.&apos;
---
Es ist üblich, denselben regulären Ausdruck wiederholt auf einen String anzuwenden, um alle Übereinstimmungen zu erhalten. Bis zu einem gewissen Grad ist dies heute bereits durch die Methode `String#match` möglich.

In diesem Beispiel finden wir alle Wörter, die nur aus hexadezimalen Ziffern bestehen, und protokollieren dann jede Übereinstimmung:

```js
const string = &apos;Magische Hex-Zahlen: DEADBEEF CAFE&apos;;
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
for (const match of string.match(regex)) {
  console.log(match);
}

// Ausgabe:
//
// &apos;DEADBEEF&apos;
// &apos;CAFE&apos;
```

Dies gibt Ihnen jedoch nur die _Substrings_, die übereinstimmen. Normalerweise möchten Sie nicht nur die Substrings, sondern auch zusätzliche Informationen wie den Index jedes Substrings oder die Gruppen, die innerhalb jeder Übereinstimmung erfasst wurden.

Es ist bereits möglich, dies zu erreichen, indem man eine eigene Schleife schreibt und die Übereinstimmungsobjekte selbst verfolgt, aber das ist ein wenig lästig und nicht sehr bequem:

```js
const string = &apos;Magische Hex-Zahlen: DEADBEEF CAFE&apos;;
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
let match;
while (match = regex.exec(string)) {
  console.log(match);
}

// Ausgabe:
//
// [ &apos;DEADBEEF&apos;, index: 19, input: &apos;Magische Hex-Zahlen: DEADBEEF CAFE&apos; ]
// [ &apos;CAFE&apos;,     index: 28, input: &apos;Magische Hex-Zahlen: DEADBEEF CAFE&apos; ]
```

Die neue API `String#matchAll` macht dies einfacher als je zuvor: Sie können jetzt eine einfache `for`-`of`-Schleife schreiben, um alle Übereinstimmungsobjekte zu erhalten.

```js
const string = &apos;Magische Hex-Zahlen: DEADBEEF CAFE&apos;;
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
for (const match of string.matchAll(regex)) {
  console.log(match);
}

// Ausgabe:
//
// [ &apos;DEADBEEF&apos;, index: 19, input: &apos;Magische Hex-Zahlen: DEADBEEF CAFE&apos; ]
// [ &apos;CAFE&apos;,     index: 28, input: &apos;Magische Hex-Zahlen: DEADBEEF CAFE&apos; ]
```

`String#matchAll` ist besonders nützlich für reguläre Ausdrücke mit Gruppenerfassung. Es gibt Ihnen vollständige Informationen für jede einzelne Übereinstimmung, einschließlich der erfassten Gruppen.

```js
const string = &apos;Lieblings-GitHub-Repos: tc39/ecma262 v8/v8.dev&apos;;
const regex = /\b(?<owner>[a-z0-9]+)\/(?<repo>[a-z0-9\.]+)\b/g;
for (const match of string.matchAll(regex)) {
  console.log(`${match[0]} bei ${match.index} mit &apos;${match.input}&apos;`);
  console.log(`→ Besitzer: ${match.groups.owner}`);
  console.log(`→ Repo: ${match.groups.repo}`);
}

<!--truncate-->
// Ausgabe:
//
// tc39/ecma262 bei 23 mit &apos;Lieblings-GitHub-Repos: tc39/ecma262 v8/v8.dev&apos;
// → Besitzer: tc39
// → Repo: ecma262
// v8/v8.dev bei 36 mit &apos;Lieblings-GitHub-Repos: tc39/ecma262 v8/v8.dev&apos;
// → Besitzer: v8
// → Repo: v8.dev
```

Die allgemeine Idee ist, dass Sie einfach eine einfache `for`-`of`-Schleife schreiben, und `String#matchAll` übernimmt den Rest für Sie.

:::note
**Hinweis:** Wie der Name schon sagt, ist `String#matchAll` darauf ausgelegt, _alle_ Übereinstimmungsobjekte zu durchlaufen. Es sollte daher mit globalen regulären Ausdrücken verwendet werden, d. h. solchen mit gesetztem `g`-Flag, da alle nicht-globalen regulären Ausdrücke höchstens eine einzige Übereinstimmung erzeugen würden. Das Aufrufen von `matchAll` mit einem nicht-globalen regulären Ausdruck führt zu einer `TypeError`-Ausnahme.
:::

## Unterstützung für `String.prototype.matchAll`

<feature-support chrome="73 /blog/v8-release-73#string.prototype.matchall"
                 firefox="67"
                 safari="13"
                 nodejs="12"
                 babel="ja https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
