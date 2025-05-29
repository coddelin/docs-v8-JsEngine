---
title: "Subsume JSON a.k.a. JSON ⊂ ECMAScript"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-08-14
tags: 
  - ES2019
description: "JSON ist jetzt ein syntaktisches Teilmengen von ECMAScript."
tweet: "1161649929904885762"
---
Mit [dem _JSON ⊂ ECMAScript_ Vorschlag](https://github.com/tc39/proposal-json-superset) wird JSON zu einer syntaktischen Teilmenge von ECMAScript. Wenn Sie überrascht sind, dass dies nicht bereits der Fall war, sind Sie nicht allein!

## Das alte ES2018-Verhalten

In ES2018 konnten ECMAScript-Stringliterale keine unescaped U+2028 LINE SEPARATOR und U+2029 PARAGRAPH SEPARATOR Zeichen enthalten, da sie selbst in diesem Kontext als Zeilenabschlusszeichen betrachtet wurden:

```js
// Ein String, der ein rohes U+2028-Zeichen enthält.
const LS = ' ';
// → ES2018: SyntaxError

// Ein String, der ein rohes U+2029-Zeichen enthält, erzeugt durch `eval`:
const PS = eval('"\u2029"');
// → ES2018: SyntaxError
```

Dies ist problematisch, weil JSON-Strings _diese Zeichen_ enthalten können. Daher mussten Entwickler spezialisierte Nachbearbeitungslogik implementieren, wenn sie gültiges JSON in ECMAScript-Programme einbetten wollten, um mit diesen Zeichen umzugehen. Ohne solche Logik hätte der Code subtile Bugs oder sogar [Sicherheitsprobleme](#security) enthalten können!

<!--truncate-->
## Das neue Verhalten

In ES2019 können Stringliterale nun rohe U+2028 und U+2029 Zeichen enthalten, wodurch das verwirrende Missverhältnis zwischen ECMAScript und JSON beseitigt wird.

```js
// Ein String, der ein rohes U+2028-Zeichen enthält.
const LS = ' ';
// → ES2018: SyntaxError
// → ES2019: keine Ausnahme

// Ein String, der ein rohes U+2029-Zeichen enthält, erzeugt durch `eval`:
const PS = eval('"\u2029"');
// → ES2018: SyntaxError
// → ES2019: keine Ausnahme
```

Diese kleine Verbesserung vereinfacht das mentale Modell für Entwickler erheblich (ein Randfall weniger zum Erinnern!) und reduziert die Notwendigkeit für spezielle Nachbearbeitungslogik beim Einbetten gültigen JSONs in ECMAScript-Programme.

## JSON in JavaScript-Programme einbetten

Infolge dieses Vorschlags kann `JSON.stringify` jetzt verwendet werden, um gültige ECMAScript-String-, Objekt- und Arrayliterale zu generieren. Und aufgrund des separaten [_wohlgeformte `JSON.stringify`_ Vorschlags](/features/well-formed-json-stringify) können diese Literale sicher in UTF-8 und anderen Kodierungen dargestellt werden (was hilfreich ist, wenn Sie versuchen, sie in eine Datei auf der Festplatte zu schreiben). Dies ist äußerst nützlich für Metaprogrammierungsanwendungsfälle, wie z. B. das dynamische Erstellen von JavaScript-Quellcode und das Schreiben auf die Festplatte.

Hier ist ein Beispiel für das Erstellen eines gültigen JavaScript-Programms, das ein gegebenes Datenobjekt einbettet, indem die JSON-Grammatik jetzt eine Teilmenge von ECMAScript ist:

```js
// Ein JavaScript-Objekt (oder Array oder String), das einige Daten darstellt.
const data = {
  LineTerminators: '\n\r  ',
  // Hinweis: Der String enthält 4 Zeichen: '\n\r\u2028\u2029'.
};

// Die Daten in ihre JSON-String-form umwandeln. Dank JSON ⊂
// ECMAScript ist die Ausgabe von `JSON.stringify` garantiert
// ein syntaktisch gültiges ECMAScript-Literal:
const jsObjectLiteral = JSON.stringify(data);

// Ein gültiges ECMAScript-Programm erstellen, das die Daten als Objekt
// Literal einbettet.
const program = `const data = ${ jsObjectLiteral };`;
// → 'const data = {"LineTerminators":"…"};'
// (Zusätzliche Escaping ist erforderlich, wenn das Ziel ein eingebettetes <script> ist.)

// Eine Datei mit dem ECMAScript-Programm auf die Festplatte schreiben.
saveToDisk(filePath, program);
```

Das oben gezeigte Skript erzeugt den folgenden Code, der zu einem äquivalenten Objekt ausgewertet wird:

```js
const data = {"LineTerminators":"\n\r  "};
```

## JSON in JavaScript-Programme mit `JSON.parse` einbetten

Wie im [_die Kosten von JSON_](/blog/cost-of-javascript-2019#json) erklärt, kann anstatt die Daten als JavaScript-Objektliteral inline einzubetten, so:

```js
const data = { foo: 42, bar: 1337 }; // 🐌
```

…die Daten in JSON-String-form dargestellt und dann zur Laufzeit JSON-geparst werden, um die Leistung bei großen Objekten (10 kB+) zu verbessern:

```js
const data = JSON.parse('{"foo":42,"bar":1337}'); // 🚀
```

Hier ist eine Beispielimplementierung:

```js
// Ein JavaScript-Objekt (oder Array, oder String), das einige Daten darstellt.
const data = {
  LineTerminators: '\n\r  ',
  // Hinweis: Der String enthält 4 Zeichen: '\n\r\u2028\u2029'.
};

// Die Daten in ihre JSON-String-form umwandeln.
const json = JSON.stringify(data);

// Jetzt möchten wir das JSON in einen Skriptkörper als JavaScript
// String-Literal einfügen, gemäß https://v8.dev/blog/cost-of-javascript-2019#json,
// indem spezielle Zeichen wie `"` in den Daten escaped werden.
// Dank JSON ⊂ ECMAScript ist die Ausgabe von `JSON.stringify`
// garantiert ein syntaktisch gültiges ECMAScript-Literal:
const jsStringLiteral = JSON.stringify(json);
// Ein gültiges ECMAScript-Programm erstellen, das das JavaScript-String
// Literal darstellt, das die JSON-Daten innerhalb eines `JSON.parse`-Aufrufs einbettet.
const program = `const data = JSON.parse(${ jsStringLiteral });`;
// → 'const data = JSON.parse("…");'
// (Zusätzliches Escaping ist erforderlich, wenn das Ziel ein Inline-<script> ist.)

// Schreibe eine Datei mit dem ECMAScript-Programm auf die Festplatte.
saveToDisk(filePath, program);
```

Das obige Skript erzeugt den folgenden Code, der in ein gleichwertiges Objekt ausgewertet wird:

```js
const data = JSON.parse("{\"LineTerminators\":\"\\n\\r  \"}");
```

[Googles Benchmark, der `JSON.parse` mit JavaScript-Objekt-Literalen vergleicht](https://github.com/GoogleChromeLabs/json-parse-benchmark), nutzt diese Technik während des Build-Schritts. Die Chrome DevTools-Funktion „als JS kopieren“ wurde [deutlich vereinfacht](https://chromium-review.googlesource.com/c/chromium/src/+/1464719/9/third_party/blink/renderer/devtools/front_end/elements/DOMPath.js), indem eine ähnliche Technik übernommen wurde.

## Eine Anmerkung zur Sicherheit

JSON ⊂ ECMAScript reduziert die Diskrepanz zwischen JSON und ECMAScript speziell im Fall von Zeichenkettenliteralen. Da Zeichenkettenliterale auch in anderen JSON-kompatiblen Datenstrukturen wie Objekten und Arrays vorkommen können, werden diese Fälle ebenfalls behandelt, wie die obigen Codebeispiele zeigen.

Allerdings werden U+2028 und U+2029 weiterhin als Zeilenabschlusszeichen in anderen Teilen der ECMAScript-Grammatik behandelt. Dies bedeutet, dass es weiterhin Fälle gibt, in denen es unsicher ist, JSON in JavaScript-Programme einzufügen. Betrachten Sie dieses Beispiel, bei dem ein Server benutzergelieferte Inhalte nach einer Verarbeitung durch `JSON.stringify()` in eine HTML-Antwort einfügt:

```ejs
<script>
  // Debug-Info:
  // User-Agent: <%= JSON.stringify(ua) %>
</script>
```

Beachten Sie, dass das Ergebnis von `JSON.stringify` in einen Kommentar innerhalb des Skripts eingefügt wird.

Wenn es wie im obigen Beispiel verwendet wird, gibt `JSON.stringify()` garantiert eine einzelne Zeile zurück. Das Problem ist, dass die Definition einer „einzelnen Zeile“ [zwischen JSON und ECMAScript unterschiedlich ist](https://speakerdeck.com/mathiasbynens/hacking-with-unicode?slide=136). Wenn `ua` ein unescaped U+2028- oder U+2029-Zeichen enthält, brechen wir aus dem einzeiligen Kommentar aus und führen den Rest von `ua` als JavaScript-Quellcode aus:

```html
<script>
  // Debug-Info:
  // User-Agent: "Benutzerdefinierte Zeichenkette<U+2028>  alert('XSS');//"
</script>
<!-- …entspricht: -->
<script>
  // Debug-Info:
  // User-Agent: "Benutzerdefinierte Zeichenkette
  alert('XSS');//"
</script>
```

:::note
**Hinweis:** Im obigen Beispiel wird das rohe unescaped U+2028-Zeichen zur besseren Verständlichkeit als `<U+2028>` dargestellt.
:::

JSON ⊂ ECMAScript hilft hier nicht, da es nur Zeichenkettenliterale betrifft — und in diesem Fall wird die Ausgabe von `JSON.stringify` in eine Position eingefügt, in der sie nicht direkt ein JavaScript-Zeichenkettenliteral erzeugt.

Sofern kein spezielles Nachbearbeiten dieser beiden Zeichen eingeführt wird, weist der obige Code-Schnipsel eine Sicherheitslücke für Cross-Site-Scripting (XSS) auf!

:::note
**Hinweis:** Es ist äußerst wichtig, von Benutzern kontrollierte Eingabe zu bearbeiten, um alle speziellen Zeichensequenzen je nach Kontext zu escapen. In diesem speziellen Fall wird in ein `<script>`-Tag eingefügt, daher müssen wir (auch) [`</script`, `<script` und `<!-​-`](https://mathiasbynens.be/notes/etago#recommendations) escapen.
:::

## Unterstützung für JSON ⊂ ECMAScript

<feature-support chrome="66 /blog/v8-release-66#json-ecmascript"
                 firefox="ja"
                 safari="ja"
                 nodejs="10"
                 babel="ja https://github.com/babel/babel/tree/master/packages/babel-plugin-proposal-json-strings"></feature-support>
