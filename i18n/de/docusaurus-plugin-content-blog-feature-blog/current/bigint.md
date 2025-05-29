---
title: "BigInt: Ganzzahlen mit beliebiger Genauigkeit in JavaScript"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2018-05-01
tags:
  - ECMAScript
  - ES2020
  - io19
description: "BigInts sind eine neue numerische Primitive in JavaScript, die Ganzzahlen mit beliebiger Genauigkeit darstellen können. Dieser Artikel erklärt einige Anwendungsfälle und vergleicht die neue Funktionalität in Chrome 67 durch den Vergleich von BigInts mit Zahlen in JavaScript."
tweet: "990991035630206977"
---
`BigInt`s sind eine neue numerische Primitive in JavaScript, die Ganzzahlen mit beliebiger Genauigkeit darstellen können. Mit `BigInt`s können Sie große Ganzzahlen sicher speichern und bearbeiten, sogar über die sichere Ganzzahlen-Grenze von `Number`s hinaus. Dieser Artikel erklärt einige Anwendungsfälle und vergleicht die neue Funktionalität in Chrome 67 mit `Number`s in JavaScript.

<!--truncate-->
## Anwendungsfälle

Ganzzahlen mit beliebiger Genauigkeit eröffnen eine Vielzahl neuer Anwendungsfälle für JavaScript.

`BigInt`s ermöglichen es, korrekte Ganzzahl-Arithmetik ohne Überläufe durchzuführen. Dies allein eröffnet zahllose neue Möglichkeiten. Mathematische Operationen mit großen Zahlen werden beispielsweise häufig in Finanztechnologie verwendet.

[Große Ganzzahlen-IDs](https://developer.twitter.com/en/docs/basics/twitter-ids) und [hochgenaue Zeitstempel](https://github.com/nodejs/node/pull/20220) können nicht sicher als `Number`s in JavaScript dargestellt werden. Dies führt häufig zu [realen Fehlern](https://github.com/nodejs/node/issues/12115) und zwingt JavaScript-Entwickler dazu, sie stattdessen als Strings darzustellen. Mit `BigInt` können diese Daten jetzt als numerische Werte dargestellt werden.

`BigInt` könnte die Grundlage für eine zukünftige `BigDecimal`-Implementierung bilden. Dies wäre nützlich, um Geldbeträge mit Dezimalgenauigkeit darzustellen und genau zu berechnen (also das Problem `0.10 + 0.20 !== 0.30`).

Früher mussten JavaScript-Anwendungen mit diesen Anwendungsfällen auf Bibliotheken aus der Benutzerumgebung zurückgreifen, die `BigInt`-ähnliche Funktionen nachahmen. Sobald `BigInt` allgemein verfügbar wird, können solche Anwendungen diese Laufzeitabhängigkeiten zugunsten von nativen `BigInt`s entfernen. Dies trägt dazu bei, die Ladezeit, die Analysezeit und die Kompilierungszeit zu reduzieren und bietet darüber hinaus signifikante Laufzeit-Verbesserungen.

![Die native `BigInt`-Implementierung in Chrome ist leistungsfähiger als beliebte Bibliotheken aus der Benutzerumgebung.](/_img/bigint/performance.svg)

## Der Status quo: `Number`

`Number`s in JavaScript werden als [Doppelgenaue Fließkommazahlen](https://en.wikipedia.org/wiki/Floating-point_arithmetic) dargestellt. Dies bedeutet, dass sie begrenzte Genauigkeit haben. Die Konstante `Number.MAX_SAFE_INTEGER` gibt die größte mögliche Ganzzahl an, die sicher erhöht werden kann. Ihr Wert ist `2**53-1`.

```js
const max = Number.MAX_SAFE_INTEGER;
// → 9_007_199_254_740_991
```

:::note
**Hinweis:** Zur besseren Lesbarkeit gruppiere ich die Ziffern in dieser großen Zahl tausenderweise und benutze Unterstriche als Separatoren. [Der Vorschlag für numerische Literal-Separatoren](/features/numeric-separators) ermöglicht genau dies für häufig verwendete JavaScript-Zahlenliterale.
:::

Wenn man sie einmal erhöht, erhält man das erwartete Ergebnis:

```js
max + 1;
// → 9_007_199_254_740_992 ✅
```

Wenn man sie jedoch ein zweites Mal erhöht, ist das Ergebnis nicht mehr exakt als JavaScript-`Number` darstellbar:

```js
max + 2;
// → 9_007_199_254_740_992 ❌
```

Beachten Sie, wie `max + 1` dasselbe Ergebnis wie `max + 2` produziert. Wenn wir diesen bestimmten Wert in JavaScript erhalten, gibt es keine Möglichkeit zu erkennen, ob er genau ist oder nicht. Jede Berechnung mit Ganzzahlen außerhalb des sicheren Bereichs (d. h. von `Number.MIN_SAFE_INTEGER` bis `Number.MAX_SAFE_INTEGER`) verliert möglicherweise an Genauigkeit. Daher können wir uns nur auf numerische Ganzzahlen innerhalb des sicheren Bereichs verlassen.

## Das neue Highlight: `BigInt`

`BigInt`s sind eine neue numerische Primitive in JavaScript, die Ganzzahlen mit [beliebiger Genauigkeit](https://en.wikipedia.org/wiki/Arbitrary-precision_arithmetic) darstellen können. Mit `BigInt`s können Sie große Ganzzahlen sicher speichern und bearbeiten, sogar über die sichere Ganzzahlen-Grenze von `Number`s hinaus.

Um ein `BigInt` zu erstellen, fügen Sie das Suffix `n` zu einem Ganzzahlen-Literal hinzu. Zum Beispiel wird `123` zu `123n`. Die globale `BigInt(number)`-Funktion kann verwendet werden, um eine `Number` in ein `BigInt` umzuwandeln. Mit anderen Worten: `BigInt(123) === 123n`. Verwenden wir diese beiden Techniken, um das zuvor gezeigte Problem zu lösen:

```js
BigInt(Number.MAX_SAFE_INTEGER) + 2n;
// → 9_007_199_254_740_993n ✅
```

Hier ist ein weiteres Beispiel, bei dem wir zwei `Number`s multiplizieren:

```js
1234567890123456789 * 123;
// → 151851850485185200000 ❌
```

Betrachten wir die am wenigsten signifikanten Ziffern `9` und `3`, wissen wir, dass das Ergebnis der Multiplikation mit `7` enden sollte (da `9 * 3 === 27`). Das Ergebnis endet jedoch mit einer Reihe von Nullen. Das kann nicht stimmen! Versuchen wir es stattdessen mit `BigInt`s:

```js
1234567890123456789n * 123n;
// → 151851850485185185047n ✅
```

Dieses Mal erhalten wir das korrekte Ergebnis.

Die Grenzen sicherer Ganzzahlen für `Number`s gelten nicht für `BigInt`s. Daher können wir mit `BigInt` genaue Ganzzahlarithmetik durchführen, ohne uns um den Verlust von Genauigkeit sorgen zu müssen.

### Ein neuer primitiver Datentyp

`BigInt`s sind ein neuer primitiver Datentyp in der JavaScript-Sprache. Als solcher haben sie ihren eigenen Typ, der mit dem Operator `typeof` erkannt werden kann:

```js
typeof 123;
// → 'number'
typeof 123n;
// → 'bigint'
```

Da `BigInt`s ein separater Typ sind, ist ein `BigInt` niemals streng gleich (`strictly equal`) einer `Number`, z. B. `42n !== 42`. Um ein `BigInt` mit einer `Number` zu vergleichen, konvertieren Sie entweder das eine in den Typ des anderen, bevor Sie den Vergleich durchführen, oder verwenden Sie die abstrakte Gleichheit (`==`):

```js
42n === BigInt(42);
// → true
42n == 42;
// → true
```

Wenn `BigInt`s in einen booleschen Wert (z. B. beim Verwenden von `if`, `&&`, `||` oder `Boolean(int)`) umgewandelt werden, verhalten sie sich genauso wie `Number`s.

```js
if (0n) {
  console.log('if');
} else {
  console.log('else');
}
// → schreibt 'else' in die Konsole, da `0n` falsy ist.
```

### Operatoren

`BigInt`s unterstützen die gängigsten Operatoren. Die binären Operatoren `+`, `-`, `*` und `**` funktionieren wie erwartet. `/` und `%` funktionieren ebenfalls und runden, wie nötig, auf Null. Bitweise Operationen wie `|`, `&`, `<<`, `>>` und `^` führen bitweise Arithmetik aus, basierend auf der [Zweier-Komplement-Darstellung](https://de.wikipedia.org/wiki/Zweierkomplement) für negative Werte, genauso wie bei `Number`s.

```js
(7 + 6 - 5) * 4 ** 3 / 2 % 3;
// → 1
(7n + 6n - 5n) * 4n ** 3n / 2n % 3n;
// → 1n
```

Das unäre `-` kann verwendet werden, um einen negativen `BigInt`-Wert anzugeben, z. B. `-42n`. Das unäre `+` wird _nicht_ unterstützt, da es asm.js-Code brechen würde, der erwartet, dass `+x` immer entweder eine `Number` oder eine Ausnahme erzeugt.

Ein Problem ist, dass es nicht erlaubt ist, Operationen zwischen `BigInt`s und `Number`s zu mischen. Dies ist gut, da jede implizite Umwandlung Informationen verlieren könnte. Betrachten Sie dieses Beispiel:

```js
BigInt(Number.MAX_SAFE_INTEGER) + 2.5;
// → ?? 🤔
```

Was sollte das Ergebnis sein? Es gibt hier keine gute Antwort. `BigInt`s können keine Brüche darstellen, und `Number`s können `BigInt`s jenseits der Grenze sicherer Ganzzahlen nicht darstellen. Aus diesem Grund führt das Mischen von Operationen zwischen `BigInt`s und `Number`s zu einer `TypeError`-Ausnahme.

Die einzige Ausnahme von dieser Regel sind Vergleichsoperatoren wie `===` (wie bereits erwähnt), `<` und `>=` – da sie boolesche Werte zurückgeben, besteht kein Risiko eines Genauigkeitsverlustes.

```js
1 + 1n;
// → TypeError
123 < 124n;
// → true
```

Da `BigInt`s und `Number`s im Allgemeinen nicht gemischt werden, vermeiden Sie bitte das Überladen oder magische „Upgraden“ Ihres bestehenden Codes zur Verwendung von `BigInt`s anstelle von `Number`s. Entscheiden Sie sich, in welchem dieser beiden Bereiche Sie arbeiten möchten, und bleiben Sie dabei. Für _neue_ APIs, die mit potenziell großen Ganzzahlen arbeiten, ist `BigInt` die beste Wahl. `Number`s sind nach wie vor sinnvoll für Ganzzahlen, die sicher innerhalb des Bereichs sicherer Ganzzahlen liegen.

Eine weitere Sache, die zu beachten ist, ist, dass [der Operator `>>>`](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators#Unsigned_right_shift), der ein unsigned right shift durchführt, für `BigInt`s keinen Sinn ergibt, da sie immer vorzeichenbehaftet sind. Aus diesem Grund funktioniert `>>>` nicht mit `BigInt`s.

### API

Es sind mehrere neue, `BigInt`-spezifische APIs verfügbar.

Der globale `BigInt`-Konstruktor ist dem `Number`-Konstruktor ähnlich: Er konvertiert sein Argument in ein `BigInt` (wie bereits erwähnt). Wenn die Konvertierung fehlschlägt, wird eine `SyntaxError`- oder `RangeError`-Ausnahme ausgelöst.

```js
BigInt(123);
// → 123n
BigInt(1.5);
// → RangeError
BigInt('1.5');
// → SyntaxError
```

Das erste dieser Beispiele übergibt ein numerisches Literal an `BigInt()`. Dies ist eine schlechte Praxis, da `Number`s unter Genauigkeitsverlust leiden können, und so könnten wir bereits vor der `BigInt`-Konvertierung Genauigkeit verlieren:

```js
BigInt(123456789123456789);
// → 123456789123456784n ❌
```

Aus diesem Grund empfehlen wir, entweder die `BigInt`-Literalnotation (mit dem `n`-Suffix) zu verwenden oder stattdessen einen String (keine `Number`!) an `BigInt()` zu übergeben:

```js
123456789123456789n;
// → 123456789123456789n ✅
BigInt('123456789123456789');
// → 123456789123456789n ✅
```

Zwei Bibliotheksfunktionen ermöglichen das Einwickeln von `BigInt`-Werten als entweder vorzeichenbehaftete oder vorzeichenlose Ganzzahlen, beschränkt auf eine bestimmte Anzahl von Bits. `BigInt.asIntN(width, value)` wickelt einen `BigInt`-Wert in eine `width` Stellen breite binäre vorzeichenbehaftete Ganzzahl ein, und `BigInt.asUintN(width, value)` wickelt einen `BigInt`-Wert in eine binäre vorzeichenlose Ganzzahl ein, die `width` Stellen hat. Wenn Sie beispielsweise 64-Bit-Arithmetik durchführen, können Sie diese APIs verwenden, um innerhalb des entsprechenden Bereichs zu bleiben:

```js
// Höchster möglicher BigInt-Wert, der als
// vorzeichenbehaftete 64-Bit-Ganzzahl dargestellt werden kann.
const max = 2n ** (64n - 1n) - 1n;
BigInt.asIntN(64, max);
→ 9223372036854775807n
BigInt.asIntN(64, max + 1n);
// → -9223372036854775808n
//   ^ negativ aufgrund von Überlauf
```

Beachten Sie, wie ein Überlauf auftritt, sobald wir einen `BigInt`-Wert übergeben, der den Bereich eines 64-Bit-Ganzzahls überschreitet (d. h. 63 Bits für den absoluten numerischen Wert + 1 Bit für das Vorzeichen).

`BigInt` ermöglicht es, 64-Bit vorzeichenbehaftete und vorzeichenlose Ganzzahlen präzise darzustellen, die in anderen Programmiersprachen häufig verwendet werden. Zwei neue Typed-Array-Varianten, `BigInt64Array` und `BigUint64Array`, erleichtern es, Listen solcher Werte effizient darzustellen und mit ihnen zu arbeiten:

```js
const view = new BigInt64Array(4);
// → [0n, 0n, 0n, 0n]
view.length;
// → 4
view[0];
// → 0n
view[0] = 42n;
view[0];
// → 42n
```

Die Variante `BigInt64Array` stellt sicher, dass ihre Werte innerhalb der 64-Bit-Grenze mit Vorzeichen bleiben.

```js
// Höchst möglicher BigInt-Wert, der als
// vorzeichenbehaftete 64-Bit-Ganzzahl dargestellt werden kann.
const max = 2n ** (64n - 1n) - 1n;
view[0] = max;
view[0];
// → 9_223_372_036_854_775_807n
view[0] = max + 1n;
view[0];
// → -9_223_372_036_854_775_808n
//   ^ negativ wegen Überlauf
```

Die Variante `BigUint64Array` macht das Gleiche unter Verwendung der vorzeichenlosen 64-Bit-Grenze.

## Polyfilling und Transpiling von BigInts

Zum Zeitpunkt des Schreibens werden `BigInt`s nur in Chrome unterstützt. Andere Browser arbeiten aktiv an deren Implementierung. Aber was, wenn Sie die `BigInt`-Funktionalität *heute* nutzen möchten, ohne die Browserkompatibilität zu opfern? Ich freue mich, dass Sie fragen! Die Antwort ist … interessant, gelinde gesagt.

Im Gegensatz zu den meisten anderen modernen JavaScript-Features können `BigInt`s nicht vernünftig auf ES5 transpiliert werden.

Der `BigInt`-Vorschlag [ändert das Verhalten von Operatoren](#operators) (wie `+`, `>=`, etc.), damit sie mit `BigInt`s funktionieren. Diese Änderungen können nicht direkt polyfillt werden, und sie machen es auch in den meisten Fällen unpraktikabel, `BigInt`-Code mit Babel oder ähnlichen Tools auf Rückfallcode zu transpiliert. Der Grund ist, dass ein solcher Transpilierprozess *jeden einzelnen Operator* im Programm durch einen Funktionsaufruf ersetzen müsste, der Typprüfungen an seinen Eingaben durchführt, was eine unzumutbare Laufzeitleistungseinbuße bedeuten würde. Darüber hinaus würde die Dateigröße jedes transpilierten Bundles erheblich zunehmen, was sich negativ auf die Download-, Parser- und Kompilierzeiten auswirken würde.

Eine machbarere und zukunftssichere Lösung besteht darin, Ihren Code vorerst mit der [JSBI-Bibliothek](https://github.com/GoogleChromeLabs/jsbi#why) zu schreiben. JSBI ist eine JavaScript-Portierung der `BigInt`-Implementierung in V8 und Chrome — sie verhält sich designbedingt genau wie die native `BigInt`-Funktionalität. Der Unterschied besteht darin, dass sie anstelle der Syntax [eine API](https://github.com/GoogleChromeLabs/jsbi#how) bereitstellt:

```js
import JSBI from './jsbi.mjs';

const max = JSBI.BigInt(Number.MAX_SAFE_INTEGER);
const two = JSBI.BigInt('2');
const result = JSBI.add(max, two);
console.log(result.toString());
// → '9007199254740993'
```

Sobald `BigInt`s in allen von Ihnen verwendeten Browsern nativ unterstützt werden, können Sie [mithilfe von `babel-plugin-transform-jsbi-to-bigint` Ihren Code in nativen `BigInt`-Code transpiliert](https://github.com/GoogleChromeLabs/babel-plugin-transform-jsbi-to-bigint) und die JSBI-Abhängigkeit entfernen. Zum Beispiel wird das obige Beispiel auf Folgendes transpiliert:

```js
const max = BigInt(Number.MAX_SAFE_INTEGER);
const two = 2n;
const result = max + two;
console.log(result);
// → '9007199254740993'
```

## Weiterführende Literatur

Wenn Sie daran interessiert sind, wie `BigInt`s hinter den Kulissen funktionieren (z. B. wie sie im Speicher dargestellt werden und wie Operationen mit ihnen durchgeführt werden), [lesen Sie unseren V8-Blogbeitrag mit Implementierungsdetails](/blog/bigint).

## `BigInt`-Unterstützung

<feature-support chrome="67 /blog/bigint"
                 firefox="68 https://wingolog.org/archives/2019/05/23/bigint-shipping-in-firefox"
                 safari="14"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes #polyfilling-transpiling"></feature-support>
