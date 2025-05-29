---
title: 'RegExp `v` Flag mit Mengennotation und Eigenschaften von Zeichenketten'
author: 'Mark Davis ([@mark_e_davis](https://twitter.com/mark_e_davis)), Markus Scherer und Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mark-davis'
  - 'markus-scherer'
  - 'mathias-bynens'
date: 2022-06-27
tags:
  - ECMAScript
description: 'Das neue RegExp `v`-Flag aktiviert den `unicodeSets`-Modus und ermöglicht die Unterstützung erweiterter Zeichenklassen, einschließlich Unicode-Eigenschaften von Zeichenketten, Mengennotation und verbesserter Groß-/Kleinschreibung-übergreifender Übereinstimmung.'
tweet: '1541419838513594368'
---
JavaScript unterstützt reguläre Ausdrücke seit ECMAScript 3 (1999). Sechzehn Jahre später führte ES2015 [Unicode-Modus (das `u`-Flag)](https://mathiasbynens.be/notes/es6-unicode-regex), [Sticky-Modus (das `y`-Flag)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky#description) und [die `RegExp.prototype.flags` Getter-Funktion](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/flags) ein. Weitere drei Jahre später führte ES2018 [`dotAll`-Modus (das `s`-Flag)](https://mathiasbynens.be/notes/es-regexp-proposals#dotAll), [Lookbehind-Assertions](https://mathiasbynens.be/notes/es-regexp-proposals#lookbehinds), [Named Capture Groups](https://mathiasbynens.be/notes/es-regexp-proposals#named-capture-groups) und [Unicode-Zeicheneigenschafts-Auswege](https://mathiasbynens.be/notes/es-unicode-property-escapes) ein. Und in ES2020 erleichterte [`String.prototype.matchAll`](https://v8.dev/features/string-matchall) die Arbeit mit regulären Ausdrücken. JavaScript-Regular Expressions haben sich enorm weiterentwickelt und verbessern sich weiterhin.

<!--truncate-->
Das jüngste Beispiel hierfür ist [der neue `unicodeSets`-Modus, der mithilfe des `v`-Flags aktiviert wird](https://github.com/tc39/proposal-regexp-v-flag). Dieser neue Modus ermöglicht die Unterstützung von _erweiterten Zeichenklassen_, einschließlich der folgenden Funktionen:

- [Unicode-Eigenschaften von Zeichenketten](/features/regexp-v-flag#unicode-properties-of-strings)
- [Mengennotation + Zeichenketten-Literal-Syntax](/features/regexp-v-flag#set-notation)
- [verbesserte Abrundung der Groß-/Kleinschreibung](/features/regexp-v-flag#ignoreCase)

Dieser Artikel behandelt all diese Themen. Aber zuerst — hier ist, wie Sie das neue Flag nutzen können:

```js
const re = /…/v;
```

Das `v`-Flag kann mit bestehenden regulären Ausdrücken-Flags kombiniert werden, mit einer bemerkenswerten Ausnahme. Das `v`-Flag aktiviert alle positiven Eigenschaften des `u`-Flags, jedoch mit zusätzlichen Funktionen und Verbesserungen — einige davon sind nicht rückwärtskompatibel mit dem `u`-Flag. Entscheidend ist, dass `v` ein vollständig separater Modus von `u` ist und nicht ein ergänzender Modus. Aus diesem Grund können die Flags `v` und `u` nicht kombiniert werden — der Versuch, beide Flags für denselben regulären Ausdruck zu verwenden, führt zu einem Fehler. Die einzigen gültigen Optionen sind: entweder `u` nutzen, oder `v`, oder weder `u` noch `v`. Aber da `v` die funktionsreichste Option darstellt, ist die Wahl klar…

Tauchen wir in die neue Funktionalität ein!

## Unicode-Eigenschaften von Zeichenketten

Der Unicode-Standard weist jedem Symbol verschiedene Eigenschaften und Eigenschaftswerte zu. Um beispielsweise die Symbole zu erhalten, die im griechischen Schriftsystem verwendet werden, durchsuchen Sie die Unicode-Datenbank nach Symbolen, deren Eigenschaftswert `Script_Extensions` `Greek` enthält.

Mit den Unicode-Zeicheneigenschaftsauswegen von ES2018 ist es möglich, diese Unicode-Zeichen-Eigenschaften direkt in ECMAScript-Regular-Expressions zu verwenden. Beispielsweise stimmt das Muster `\p{Script_Extensions=Greek}` mit jedem Symbol überein, das im griechischen Schriftsystem verwendet wird:

```js
const regexGreekSymbol = /\p{Script_Extensions=Greek}/u;
regexGreekSymbol.test('π');
// → true
```

Definitionsgemäß erweitern sich Unicode-Zeicheneigenschaften zu einer Menge von Codepunkten und können somit als Zeichenklasse transpiliert werden, die die Codepunkte enthält, mit denen sie übereinstimmen. Beispielsweise ist `\p{ASCII_Hex_Digit}` gleichbedeutend mit `[0-9A-Fa-f]`: es stimmt immer nur mit einem einzelnen Unicode-Zeichen/Codepunkt gleichzeitig überein. In manchen Situationen reicht das nicht aus:

```js
// Unicode definiert eine Zeicheneigenschaft namens “Emoji”.
const re = /^\p{Emoji}$/u;

// Übereinstimmung mit einem Emoji, das aus nur 1 Codepunkt besteht:
re.test('⚽'); // '\u26BD'
// → true ✅

// Übereinstimmung mit einem Emoji, das aus mehreren Codepunkten besteht:
re.test('👨🏾‍⚕️'); // '\u{1F468}\u{1F3FE}\u200D\u2695\uFE0F'
// → false ❌
```

Im obigen Beispiel stimmt der reguläre Ausdruck nicht mit dem 👨🏾‍⚕️ Emoji überein, da es aus mehreren Codepunkten besteht und `Emoji` eine Unicode-_Zeichen_-Eigenschaft ist.

Glücklicherweise definiert der Unicode-Standard auch mehrere [Eigenschaften von Zeichenketten](https://www.unicode.org/reports/tr18/#domain_of_properties). Solche Eigenschaften umfassen eine Menge von Zeichenketten, von denen jede einen oder mehrere Codepunkte enthält. In regulären Ausdrücken werden Eigenschaften von Zeichenketten in eine Menge von Alternativen übersetzt. Um dies zu veranschaulichen, stellen Sie sich eine Unicode-Eigenschaft vor, die auf die Zeichenketten `'a'`, `'b'`, `'c'`, `'W'`, `'xy'` und `'xyz'` zutrifft. Diese Eigenschaft wird in eines der folgenden regulären Ausdrucksmuster übersetzt (unter Verwendung von Alternativen): `xyz|xy|a|b|c|W` oder `xyz|xy|[a-cW]`. (Die längsten Zeichenketten zuerst, damit ein Präfix wie `'xy'` eine längere Zeichenkette wie `'xyz'` nicht verdeckt.) Im Gegensatz zu bestehenden Unicode-Escape-Eigenschaften kann dieses Muster mehrstellige Zeichenketten erfassen. Hier ist ein Beispiel für die Verwendung einer Eigenschaft von Zeichenketten:

```js
const re = /^\p{RGI_Emoji}$/v;

// Ein Emoji erfassen, das nur aus 1 Codepunkt besteht:
re.test('⚽'); // '\u26BD'
// → true ✅

// Ein Emoji erfassen, das aus mehreren Codepunkten besteht:
re.test('👨🏾‍⚕️'); // '\u{1F468}\u{1F3FE}\u200D\u2695\uFE0F'
// → true ✅
```

Dieser Codeausschnitt bezieht sich auf die Eigenschaft von Zeichenketten `RGI_Emoji`, die von Unicode als „die Teilmenge aller gültigen Emojis (Zeichen und Sequenzen), die für den allgemeinen Austausch empfohlen werden“ definiert ist. Damit können wir jetzt Emojis erfassen, unabhängig davon, wie viele Codepunkte sie im Hintergrund enthalten!

Das `v`-Flag ermöglicht von Anfang an die Unterstützung der folgenden Unicode-Eigenschaften von Zeichenketten:

- `Basic_Emoji`
- `Emoji_Keycap_Sequence`
- `RGI_Emoji_Modifier_Sequence`
- `RGI_Emoji_Flag_Sequence`
- `RGI_Emoji_Tag_Sequence`
- `RGI_Emoji_ZWJ_Sequence`
- `RGI_Emoji`

Diese Liste der unterstützten Eigenschaften könnte in Zukunft wachsen, da der Unicode-Standard zusätzliche Eigenschaften von Zeichenketten definiert. Obwohl alle aktuellen Eigenschaften von Zeichenketten emoji-bezogen sind, könnten zukünftige Eigenschaften von Zeichenketten völlig andere Anwendungsfälle bedienen.

:::note
**Hinweis:** Obwohl Eigenschaften von Zeichenketten derzeit über das neue `v`-Flag aktiviert werden, [planen wir, sie schließlich auch im `u`-Modus verfügbar zu machen](https://github.com/tc39/proposal-regexp-v-flag/issues/49).
:::

## Mengen-Notation + Zeichenkettenliteral-Syntax

Beim Arbeiten mit `\p{…}`-Escapes (sei es bei Zeichen-Eigenschaften oder den neuen Eigenschaften von Zeichenketten) kann es nützlich sein, Differenzen/Subtraktion oder Schnittmengen durchzuführen. Mit dem `v`-Flag können Zeichenklassen jetzt geschachtelt werden, und diese Mengenoperationen können darin durchgeführt werden, anstatt mit angrenzenden Lookahead-, Lookbehind-Aussagen oder langen Zeichenklassen, die die berechneten Bereiche ausdrücken.

### Differenz/Subtraktion mit `--`

Die Syntax `A--B` kann verwendet werden, um Zeichenketten zu erfassen, die _in `A`, aber nicht in `B`_ enthalten sind, also Differenz/Subtraktion.

Zum Beispiel, wenn Sie alle griechischen Symbole außer dem Buchstaben `π` erfassen möchten. Mit Mengen-Notation ist dies trivial zu lösen:

```js
/[\p{Script_Extensions=Greek}--π]/v.test('π'); // → false
```

Durch die Verwendung von `--` für Differenz/Subtraktion erledigt die Regex-Engine die harte Arbeit für Sie, während Ihr Code lesbar und wartbar bleibt.

Was ist, wenn wir anstelle eines einzelnen Zeichens die Menge der Zeichen `α`, `β` und `γ` subtrahieren möchten? Kein Problem - wir können eine geschachtelte Zeichenklasse verwenden und deren Inhalt subtrahieren:

```js
/[\p{Script_Extensions=Greek}--[αβγ]]/v.test('α'); // → false
/[\p{Script_Extensions=Greek}--[α-γ]]/v.test('β'); // → false
```

Ein anderes Beispiel ist das Erfassen von nicht-ASCII-Ziffern, zum Beispiel um sie später in ASCII-Ziffern umzuwandeln:

```js
/[\p{Decimal_Number}--[0-9]]/v.test('𑜹'); // → true
/[\p{Decimal_Number}--[0-9]]/v.test('4'); // → false
```

Die Mengen-Notation kann auch mit den neuen Eigenschaften von Zeichenketten verwendet werden:

```js
// Hinweis: 🏴 besteht aus 7 Codepunkten.

/^\p{RGI_Emoji_Tag_Sequence}$/v.test('🏴'); // → true
/^[\p{RGI_Emoji_Tag_Sequence}--\q{🏴}]$/v.test('🏴'); // → false
```

Dieses Beispiel erfasst jede RGI-E-Emoji-Tag-Sequenz _außer_ der Flagge Schottlands. Beachten Sie die Verwendung von `\q{…}`, einer neuen Syntax für Zeichenkettenliterale innerhalb von Zeichenklassen. Zum Beispiel erfasst `\q{a|bc|def}` die Zeichenketten `a`, `bc` und `def`. Ohne `\q{…}` wäre es nicht möglich, fest kodierte mehrstellige Zeichenketten zu subtrahieren.

### Schnittmenge mit `&&`

Die `A&&B`-Syntax erfasst Zeichenketten, die _in sowohl `A` als auch `B`_ enthalten sind, also Schnittmenge. Dies ermöglicht es, Dinge wie griechische Buchstaben zu erfassen:

```js
const re = /[\p{Script_Extensions=Greek}&&\p{Letter}]/v;
// U+03C0 GRIECHISCHER BUCHSTABE PI
re.test('π'); // → true
// U+1018A GRIECHISCHES NULLZEICHEN
re.test('𐆊'); // → false
```

Erfassen aller ASCII-Leerzeichen:

```js
const re = /[\p{White_Space}&&\p{ASCII}]/v;
re.test('\n'); // → true
re.test('\u2028'); // → false
```

Oder Erfassen aller mongolischen Zahlen:

```js
const re = /[\p{Script_Extensions=Mongolian}&&\p{Number}]/v;
// U+1817 MONGOLISCHE ZIFFER SIEBEN
re.test('᠗'); // → true
// U+1834 MONGOLISCHER BUCHSTABE CHA
re.test('ᠴ'); // → false
```

### Vereinigung

Zeichenketten zu erfassen, die _in A oder in B_ enthalten sind, war zuvor bereits für einstellige Zeichenketten möglich, indem eine Zeichenklasse wie `[\p{Letter}\p{Number}]` verwendet wurde. Mit dem `v`-Flag wird diese Funktionalität leistungsfähiger, da sie nun auch mit Eigenschaften von Zeichenketten oder Zeichenkettenliteralen kombiniert werden kann:

```js
const re = /^[\p{Emoji_Keycap_Sequence}\p{ASCII}\q{🇧🇪|abc}xyz0-9]$/v;

re.test('4️⃣'); // → true
re.test('_'); // → true
re.test('🇧🇪'); // → true
re.test('abc'); // → true
re.test('x'); // → true
re.test('4'); // → true
```

Die Zeichenklasse in diesem Muster kombiniert:

- eine Eigenschaft von Zeichenketten (`\p{Emoji_Keycap_Sequence}`)
- eine Zeichen-Eigenschaft (`\p{ASCII}`)
- die Syntax für Zeichenketten-Literale für die mehrstelligen Zeichenketten `🇧🇪` und `abc`
- klassische Zeichenklassen-Syntax für einzelne Zeichen `x`, `y` und `z`
- klassische Zeichensatz-Syntax für den Zeichenbereich von `0` bis `9`

Ein weiteres Beispiel ist das Matching aller häufig verwendeten Flaggen-Emojis, unabhängig davon, ob sie als zweibuchstabiger ISO-Code (`RGI_Emoji_Flag_Sequence`) oder als spezieller Tag-Sequenz (`RGI_Emoji_Tag_Sequence`) codiert sind:

```js
const reFlag = /[\p{RGI_Emoji_Flag_Sequence}\p{RGI_Emoji_Tag_Sequence}]/v;
// Eine Flaggen-Sequenz, bestehend aus 2 Codepunkten (Flagge von Belgien):
reFlag.test('🇧🇪'); // → true
// Eine Tag-Sequenz, bestehend aus 7 Codepunkten (Flagge von England):
reFlag.test('🏴'); // → true
// Eine Flaggen-Sequenz, bestehend aus 2 Codepunkten (Flagge der Schweiz):
reFlag.test('🇨🇭'); // → true
// Eine Tag-Sequenz, bestehend aus 7 Codepunkten (Flagge von Wales):
reFlag.test('🏴'); // → true
```

## Verbesserte Groß-/Kleinschreibungs-unabhängige Übereinstimmung

Das ES2015 `u`-Flag leidet unter [verwirrendem Verhalten bei der Groß-/Kleinschreibungs-unabhängigen Übereinstimmung](https://github.com/tc39/proposal-regexp-v-flag/issues/30). Betrachten Sie die folgenden zwei regulären Ausdrücke:

```js
const re1 = /\p{Lowercase_Letter}/giu;
const re2 = /[^\P{Lowercase_Letter}]/giu;
```

Der erste Ausdruck stimmt mit allen Kleinbuchstaben überein. Der zweite Ausdruck verwendet `\P` anstelle von `\p`, um mit allen Zeichen außer Kleinbuchstaben übereinzustimmen, wird dann jedoch in einer negierten Zeichengruppe (`[^…]`) verpackt. Beide regulären Ausdrücke werden durch das Setzen des `i`-Flags (`ignoreCase`) groß-/kleinschreibungs-unabhängig gemacht.

Intuitiv könnte man erwarten, dass beide regulären Ausdrücke sich gleich verhalten. Tatsächlich verhalten sie sich jedoch sehr unterschiedlich:

```js
const re1 = /\p{Lowercase_Letter}/giu;
const re2 = /[^\P{Lowercase_Letter}]/giu;

const string = 'aAbBcC4#';

string.replaceAll(re1, 'X');
// → 'XXXXXX4#'

string.replaceAll(re2, 'X');
// → 'aAbBcC4#''
```

Das neue `v`-Flag verhält sich weniger überraschend. Mit dem `v`-Flag anstelle des `u`-Flags verhalten sich beide Ausdrücke gleich:

```js
const re1 = /\p{Lowercase_Letter}/giv;
const re2 = /[^\P{Lowercase_Letter}]/giv;

const string = 'aAbBcC4#';

string.replaceAll(re1, 'X');
// → 'XXXXXX4#'

string.replaceAll(re2, 'X');
// → 'XXXXXX4#'
```

Allgemeiner macht das `v`-Flag `[^\p{X}]` ≍ `[\P{X}]` ≍ `\P{X}` und `[^\P{X}]` ≍ `[\p{X}]` ≍ `\p{X}`, unabhängig davon, ob das `i`-Flag gesetzt ist oder nicht.

## Weiterführende Literatur

[Das Proposals-Repository](https://github.com/tc39/proposal-regexp-v-flag) enthält weitere Details und Hintergrundinformationen zu diesen Funktionen und ihren Designentscheidungen.

Im Rahmen unserer Arbeit an diesen JavaScript-Funktionen gingen wir über „nur“ Vorschläge für Spezifikationsänderungen in ECMAScript hinaus. Wir haben die Definition von „Eigenschaften von Zeichenfolgen“ an [Unicode UTS#18](https://unicode.org/reports/tr18/#Notation_for_Properties_of_Strings) übermittelt, sodass andere Programmiersprachen ähnliche Funktionen auf einheitliche Weise implementieren können. Wir schlagen auch [eine Änderung am HTML-Standard vor](https://github.com/whatwg/html/pull/7908), um diese neuen Funktionen auch im `pattern`-Attribut zu ermöglichen.

## RegExp-`v`-Flag-Unterstützung

V8 v11.0 (Chrome 110) bietet experimentelle Unterstützung für diese neue Funktionalität über das `--harmony-regexp-unicode-sets`-Flag. V8 v12.0 (Chrome 112) hat die neuen Funktionen standardmäßig aktiviert. Babel unterstützt auch das Transpilieren des `v`-Flags — [probieren Sie die Beispiele aus diesem Artikel im Babel REPL aus](https://babeljs.io/repl#?code_lz=MYewdgzgLgBATgUxgXhgegNoYIYFoBmAugGTEbC4AWhhaAbgNwBQTaaMAKpQJYQy8xKAVwDmSQCgEMKHACeMIWFABbJQjBRuYEfygBCVmlCRYCJSABW3FOgA6ABwDeAJQDiASQD6AUTOWAvvTMQA&presets=stage-3)! Die untenstehende Unterstützungs-Tabelle enthält Links zu Tracking-Issues, bei denen Sie sich für Updates anmelden können.

<feature-support chrome="112 https://bugs.chromium.org/p/v8/issues/detail?id=11935"
                 firefox="116 https://bugzilla.mozilla.org/show_bug.cgi?id=regexp-v-flag"
                 safari="17 https://bugs.webkit.org/show_bug.cgi?id=regexp-v-flag"
                 nodejs="20"
                 babel="7.17.0 https://babeljs.io/blog/2022/02/02/7.17.0"></feature-support>
