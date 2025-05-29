---
title: "Logische Zuweisung"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu))"
avatars: 
  - "shu-yu-guo"
date: 2020-05-07
tags: 
  - ECMAScript
  - ES2021
  - Node.js 16
description: "JavaScript unterstützt jetzt zusammengesetzte Zuweisungen mit logischen Operationen."
tweet: "1258387483823345665"
---
JavaScript unterstützt eine Reihe von [zusammengesetzten Zuweisungsoperatoren](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Assignment_Operators), mit denen Programmierer eine binäre Operation zusammen mit einer Zuweisung prägnant ausdrücken können. Derzeit werden nur mathematische oder bitweise Operationen unterstützt.

<!--truncate-->
Was bisher gefehlt hat, ist die Möglichkeit, logische Operationen mit Zuweisungen zu kombinieren. Bis jetzt! JavaScript unterstützt jetzt logische Zuweisungen mit den neuen Operatoren `&&=`, `||=` und `??=`.

## Logische Zuweisungsoperatoren

Bevor wir uns mit den neuen Operatoren befassen, lassen Sie uns eine Auffrischung der bestehenden zusammengesetzten Zuweisungsoperatoren machen. Beispielsweise entspricht die Bedeutung von `lhs += rhs` ungefähr `lhs = lhs + rhs`. Diese grobe Äquivalenz gilt für alle bestehenden Operatoren `@=`, wobei `@` für einen binären Operator wie `+` oder `|` steht. Es ist zu beachten, dass dies streng genommen nur korrekt ist, wenn `lhs` eine Variable ist. Bei komplexeren linken Seiten in Ausdrücken wie `obj[computedPropertyName()] += rhs`, wird die linke Seite nur einmal ausgewertet.

Tauchen wir nun in die neuen Operatoren ein. Im Gegensatz zu den bestehenden Operatoren bedeutet `lhs @= rhs` nicht ungefähr `lhs = lhs @ rhs`, wenn `@` eine logische Operation ist: `&&`, `||` oder `??`.

```js
// Zur zusätzlichen Wiederholung hier die Semantik von logisch UND:
x && y
// → y, wenn x wahrheitsgetreu ist
// → x, wenn x nicht wahrheitsgetreu ist

// Zunächst logische UND-Zuweisung. Die beiden folgenden Zeilen
// sind gleichwertig.
// Beachten Sie, dass wie bei bestehenden zusammengesetzten Zuweisungsoperatoren
// komplexere linke Seiten nur einmal ausgewertet werden.
x &&= y;
x && (x = y);

// Die Semantik von logisch ODER:
x || y
// → x, wenn x wahrheitsgetreu ist
// → y, wenn x nicht wahrheitsgetreu ist

// Ähnlich, logische ODER-Zuweisung:
x ||= y;
x || (x = y);

// Semantik des Nullish-Koaleszenz-Operators:
x ?? y
// → y, wenn x nullish (null oder undefined) ist
// → x, wenn x nicht nullish ist

// Schließlich, Nullish-Koaleszenz-Zuweisung:
x ??= y;
x ?? (x = y);
```

## Kurzschluss-Semantik

Im Gegensatz zu ihren mathematischen und bitweisen Gegenstücken folgen logische Zuweisungen dem Kurzschlussverhalten ihrer jeweiligen logischen Operationen. Sie führen _nur_ eine Zuweisung aus, wenn die logische Operation die rechte Seite auswerten würde.

Auf den ersten Blick mag dies verwirrend erscheinen. Warum nicht bedingungslos der linken Seite wie bei anderen zusammengesetzten Zuweisungen zuweisen?

Dafür gibt es einen guten praktischen Grund. Wenn logische Operationen mit einer Zuweisung kombiniert werden, kann die Zuweisung eine Nebenwirkung verursachen, die bedingt basierend auf dem Ergebnis dieser logischen Operation auftreten sollte. Eine Nebenwirkung bedingungslos zu verursachen, kann die Leistung oder sogar die Korrektheit des Programms negativ beeinflussen.

Lassen Sie uns dies mit einem Beispiel konkretisieren, das zwei Versionen einer Funktion zeigt, die eine Standardnachricht in einem Element setzt.

```js
// Zeigt eine Standardnachricht an, wenn sie nichts überschreibt.
// Weist nur zu innerHTML zu, wenn es leer ist. Verursacht nicht,
// dass die inneren Elemente von msgElement den Fokus verlieren.
function setDefaultMessage() {
  msgElement.innerHTML ||= '<p>Keine Nachrichten<p>';
}

// Zeigt eine Standardnachricht an, wenn sie nichts überschreibt.
// Fehlerhaft! Kann dazu führen, dass die inneren Elemente von
// msgElement jedes Mal den Fokus verlieren, wenn sie aufgerufen wird.
function setDefaultMessageBuggy() {
  msgElement.innerHTML = msgElement.innerHTML || '<p>Keine Nachrichten<p>';
}
```

:::note
**Hinweis:** Weil die `innerHTML` Eigenschaft [spezifiziert](https://w3c.github.io/DOM-Parsing/#dom-innerhtml-innerhtml) ist, den leeren String anstelle von `null` oder `undefined` zurückzugeben, muss `||=` anstelle von `??=` verwendet werden. Beachten Sie beim Schreiben von Code, dass viele Web-APIs `null` oder `undefined` nicht verwenden, um leer oder nicht vorhanden zu bedeuten.
:::

In HTML ist die Zuweisung zur `.innerHTML` Eigenschaft eines Elements zerstörerisch. Innere Kinder werden gelöscht und neue Kinder, die aus der neu zugewiesenen Zeichenkette geparst wurden, werden eingefügt. Selbst wenn die neue Zeichenkette dieselbe wie die alte Zeichenkette ist, verursacht dies sowohl zusätzliche Arbeit als auch, dass die inneren Elemente den Fokus verlieren. Aus diesem praktischen Grund, um unerwünschte Nebenwirkungen zu vermeiden, unterbrechen die Semantiken der logischen Zuweisungsoperatoren die Zuweisung.

Es kann hilfreich sein, über die Symmetrie mit anderen zusammengesetzten Zuweisungsoperatoren auf folgende Weise nachzudenken. Mathematische und bitweise Operatoren sind bedingungslos, und daher ist auch die Zuweisung bedingungslos. Logische Operatoren sind bedingt, und daher ist auch die Zuweisung bedingt.

## Unterstützung für logische Zuweisung

<feature-support chrome="85"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1629106"
                 safari="14 https://developer.apple.com/documentation/safari-release-notes/safari-14-beta-release-notes#Neue-Funktionen:~:text=Logischer%20Zuordnungsoperator%20Support%20hinzugef%C3%BCgt."
                 nodejs="16"
                 babel="ja https://babeljs.io/docs/en/babel-plugin-proposal-logical-assignment-operators"></feature-support>
