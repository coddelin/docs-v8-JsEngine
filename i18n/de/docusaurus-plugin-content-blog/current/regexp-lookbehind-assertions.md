---
title: &apos;RegExp Lookbehind Assertions&apos;
author: &apos;Yang Guo, Regular Expression Engineer&apos;
avatars:
  - &apos;yang-guo&apos;
date: 2016-02-26 13:33:37
tags:
  - ECMAScript
  - RegExp
description: &apos;JavaScript Reguläre Ausdrücke erhalten neue Funktionalität: Lookbehind Assertions.&apos;
---
Eingeführt mit der dritten Ausgabe der ECMA-262-Spezifikation sind reguläre Ausdrücke seit 1999 Teil von JavaScript. In Bezug auf Funktionalität und Ausdruckskraft spiegelt die Implementierung regulärer Ausdrücke in JavaScript ungefähr die anderer Programmiersprachen wider.

<!--truncate-->
Eine Funktion in JavaScript&apos;s RegExp, die oft übersehen wird, aber manchmal sehr nützlich sein kann, sind Lookahead-Assertions. Zum Beispiel können wir eine Folge von Ziffern, die von einem Prozentzeichen gefolgt wird, mit `/\d+(?=%)/` matchen. Das Prozentzeichen selbst ist nicht Teil des Match-Ergebnisses. Die Negation davon, `/\d+(?!%)/`, würde eine Folge von Ziffern matchen, die nicht von einem Prozentzeichen gefolgt wird:

```js
/\d+(?=%)/.exec(&apos;100% der US-Präsidenten waren Männer&apos;); // [&apos;100&apos;]
/\d+(?!%)/.exec(&apos;das sind alle 44 von ihnen&apos;);                // [&apos;44&apos;]
```

Das Gegenteil von Lookahead, Lookbehind-Assertions, fehlte bisher in JavaScript, ist aber in anderen Implementierungen regulärer Ausdrücke, wie z. B. im .NET-Framework, verfügbar. Anstatt vorauszulesen, liest die Engine für reguläre Ausdrücke rückwärts nach dem Match innerhalb der Assertion. Eine Folge von Ziffern, die von einem Dollarzeichen gefolgt wird, kann mit `/(?<=\$)\d+/` gematcht werden, wobei das Dollarzeichen nicht Teil des Match-Ergebnisses wäre. Die Negation davon, `/(?<!\$)\d+/`, matcht eine Folge von Ziffern, die auf alles außer einem Dollarzeichen folgt.

```js
/(?<=\$)\d+/.exec(&apos;Benjamin Franklin ist auf der $100 Note&apos;); // [&apos;100&apos;]
/(?<!\$)\d+/.exec(&apos;es ist etwa €90 wert&apos;);                  // [&apos;90&apos;]
```

Im Allgemeinen gibt es zwei Ansätze zur Implementierung von Lookbehind-Assertions. Perl beispielsweise erfordert, dass Lookbehind-Muster eine feste Länge haben. Das bedeutet, dass Quantifizierer wie `*` oder `+` nicht erlaubt sind. Auf diese Weise kann die Engine für reguläre Ausdrücke um diese feste Länge zurückspringen und das Lookbehind genau so matchen, wie sie ein Lookahead von der zurückgesprungenen Position aus matchen würde.

Die Engine für reguläre Ausdrücke im .NET-Framework verfolgt einen anderen Ansatz. Anstatt wissen zu müssen, wie viele Zeichen das Lookbehind-Muster matcht, matcht es das Lookbehind-Muster einfach rückwärts, während es Zeichen gegen die normale Leserichtung prüft. Das bedeutet, dass das Lookbehind-Muster die vollständige Syntax für reguläre Ausdrücke nutzen und Muster beliebiger Länge matchen kann.

Offensichtlich ist die zweite Option leistungsfähiger als die erste. Aus diesem Grund haben das V8-Team und die TC39-Champions für diese Funktion sich darauf geeinigt, dass JavaScript die ausdrucksstärkere Version übernehmen sollte, obwohl deren Implementierung etwas komplexer ist.

Da Lookbehind-Assertions rückwärts matchen, gibt es einige subtile Verhaltensweisen, die sonst als überraschend gelten könnten. Zum Beispiel erfasst eine Capture-Gruppe mit einem Quantifizierer das letzte Match. Normalerweise ist das das ganz rechts liegende Match. Aber innerhalb einer Lookbehind-Assertion matchen wir von rechts nach links, daher wird das ganz links liegende Match erfasst:

```js
/h(?=(\w)+)/.exec(&apos;hodor&apos;);  // [&apos;h&apos;, &apos;r&apos;]
/(?<=(\w)+)r/.exec(&apos;hodor&apos;); // [&apos;r&apos;, &apos;h&apos;]
```

Eine Capture-Gruppe kann per Back-Reference nach ihrer Erfassung referenziert werden. Normalerweise muss sich die Back-Reference rechts von der Capture-Gruppe befinden. Andernfalls würde sie den leeren String matchen, da noch nichts erfasst wurde. Innerhalb einer Lookbehind-Assertion ist die Match-Richtung jedoch umgekehrt:

```js
/(?<=(o)d\1)r/.exec(&apos;hodor&apos;); // null
/(?<=\1d(o))r/.exec(&apos;hodor&apos;); // [&apos;r&apos;, &apos;o&apos;]
```

Lookbehind-Assertions befinden sich derzeit in einem sehr [frühen Stadium](https://github.com/tc39/proposal-regexp-lookbehind) des TC39-Spezifikationsprozesses. Da sie jedoch eine offensichtliche Erweiterung der RegExp-Syntax darstellen, haben wir beschlossen, ihre Implementierung zu priorisieren. Sie können bereits mit Lookbehind-Assertions experimentieren, indem Sie V8 Version 4.9 oder höher mit `--harmony` ausführen oder experimentelle JavaScript-Funktionen aktivieren (verwenden Sie `about:flags`) in Chrome ab Version 49.
