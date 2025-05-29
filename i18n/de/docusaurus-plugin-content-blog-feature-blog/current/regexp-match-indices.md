---
title: 'RegExp-Match-Indizes'
author: 'Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski)), regelmäßig neue Features ausdrückend'
avatars:
  - 'maya-armyanova'
date: 2019-12-17
tags:
  - ECMAScript
  - Node.js 16
description: 'RegExp-Match-Indizes bieten `start`- und `end`-Indizes für jede gefangene Gruppe.'
tweet: '1206970814400270338'
---
JavaScript ist nun mit einer neuen Verbesserung für reguläre Ausdrücke ausgestattet, genannt „Match-Indizes“. Stellen Sie sich vor, Sie möchten ungültige Variablennamen in JavaScript-Code finden, die mit reservierten Wörtern übereinstimmen, und ein Caret sowie eine „Unterstreichung“ unter dem Variablennamen anzeigen, wie:

<!--truncate-->
```js
const function = foo;
      ^------- Ungültiger Variablenname
```

Im obigen Beispiel ist `function` ein reserviertes Wort und kann nicht als Variablenname verwendet werden. Dafür könnten wir die folgende Funktion schreiben:

```js
function displayError(text, message) {
  const re = /\b(continue|function|break|for|if)\b/d;
  const match = text.match(re);
  // Index `1` entspricht der ersten gefangenen Gruppe.
  const [start, end] = match.indices[1];
  const error = ' '.repeat(start) + // Position des Carets anpassen.
    '^' +
    '-'.repeat(end - start - 1) +   // Unterstrich hinzufügen.
    ' ' + message;                  // Nachricht hinzufügen.
  console.log(text);
  console.log(error);
}

const code = 'const function = foo;'; // fehlerhafter Code
displayError(code, 'Ungültiger Variablenname');
```

:::note
**Hinweis:** Zur Einfachheit enthält das obige Beispiel nur einige der JavaScript-[reservierten Wörter](https://mathiasbynens.be/notes/reserved-keywords).
:::

Kurz gesagt speichert das neue `indices`-Array die Start- und Endpositionen jeder gefangenen Gruppe. Dieses neue Array ist verfügbar, wenn der Quellregulärausdruck das `/d`-Flag für alle Builtins verwendet, die reguläre Ausdruck-Match-Objekte erzeugen, einschließlich `RegExp#exec`, `String#match` und [`String#matchAll`](https://v8.dev/features/string-matchall).

Lesen Sie weiter, wenn Sie sich für eine detailliertere Erklärung interessieren.

## Motivation

Lassen Sie uns zu einem komplexeren Beispiel übergehen und überlegen, wie Sie die Aufgabe des Parsens einer Programmiersprache lösen würden (zum Beispiel, was der [TypeScript-Compiler](https://github.com/microsoft/TypeScript/tree/master/src/compiler) macht) — teilen Sie zunächst den Eingabe-Quellcode in Token auf, und geben Sie diesen Tokens dann eine syntaktische Struktur. Wenn der Benutzer syntaktisch falschen Code geschrieben hat, möchten Sie ihm eine aussagekräftige Fehlermeldung anzeigen, idealerweise an der Stelle, an der der problematische Code zuerst aufgetreten ist. Zum Beispiel, geben Sie den folgenden Codeausschnitt:

```js
let foo = 42;
// anderer Code
let foo = 1337;
```

Wir möchten dem Programmierer einen Fehler wie folgt anzeigen:

```js
let foo = 1337;
    ^
SyntaxError: Identifier 'foo' wurde bereits deklariert
```

Um dies zu erreichen, benötigen wir einige Bausteine, der erste davon ist die Erkennung von TypeScript-Identifikatoren. Anschließend konzentrieren wir uns darauf, die genaue Position zu ermitteln, an der der Fehler aufgetreten ist. Betrachten wir das folgende Beispiel, in dem ein Regex verwendet wird, um zu überprüfen, ob ein String ein gültiger Identifikator ist:

```js
function isIdentifier(name) {
  const re = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;
  return re.exec(name) !== null;
}
```

:::note
**Hinweis:** Ein Parser aus der realen Welt könnte die neu eingeführten [Eigenschaften-Escapes in Regexes](https://github.com/tc39/proposal-regexp-unicode-property-escapes#other-examples) verwenden und den folgenden regulären Ausdruck verwenden, um alle gültigen ECMAScript-Identifikatornamen abzugleichen:

```js
const re = /^[$_\p{ID_Start}][$_\u200C\u200D\p{ID_Continue}]*$/u;
```

Zur Einfachheit bleiben wir bei unserem vorherigen Regex, das nur lateinische Buchstaben, Zahlen und Unterstriche abgleicht.
:::

Wenn wir einen Fehler bei einer Variablendeklaration wie oben entdecken und die genaue Position dem Benutzer anzeigen möchten, könnten wir den obigen Regex erweitern und eine ähnliche Funktion verwenden:

```js
function getDeclarationPosition(source) {
  const re = /(let|const|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/;
  const match = re.exec(source);
  if (!match) return -1;
  return match.index;
}
```

Man könnte die `index`-Eigenschaft des übereinstimmenden Objekts verwenden, das von `RegExp.prototype.exec` zurückgegeben wird, welche die Startposition der gesamten Übereinstimmung zurückgibt. Für Anwendungsfälle wie den oben beschriebenen möchten Sie jedoch oft (möglicherweise mehrere) gefangene Gruppen verwenden. Bis vor kurzem hat JavaScript nicht die Indizes offengelegt, an denen die von gefangenen Gruppen übereinstimmenden Teilstrings beginnen und enden.

## RegExp-Match-Indizes erklärt

Idealerweise möchten wir einen Fehler an der Position des Variablennamens ausgeben, nicht am `let`/`const`-Schlüsselwort (wie das obige Beispiel es tut). Aber dafür müssen wir die Position der gefangenen Gruppe mit Index `2` finden. (Index `1` bezieht sich auf die `(let|const|var)`-Gruppe und `0` bezieht sich auf die gesamte Übereinstimmung.)

Wie oben erwähnt, fügt [das neue JavaScript-Feature](https://github.com/tc39/proposal-regexp-match-indices) eine `indices`-Eigenschaft zum Ergebnis (dem Array von Teilstrings) von `RegExp.prototype.exec()` hinzu. Lassen Sie uns unser obiges Beispiel erweitern und diese neue Eigenschaft verwenden:

```js
function getVariablePosition(source) {
  // Beachten Sie das `d`-Flag, das `match.indices` aktiviert
  const re = /(let|const|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/d;
  const match = re.exec(source);
  if (!match) return undefined;
  return match.indices[2];
}
getVariablePosition('let foo');
// → [4, 7]
```

Dieses Beispiel gibt das Array `[4, 7]` zurück, welches die `[start, end)`-Position des übereinstimmenden Teilstrings aus der Gruppe mit Index `2` ist. Basierend auf diesen Informationen kann unser Compiler nun den gewünschten Fehler ausgeben.

## Zusätzliche Funktionen

Das `indices`-Objekt enthält auch eine `groups`-Eigenschaft, die durch die Namen der [benannten Erfassungsgruppen](https://mathiasbynens.be/notes/es-regexp-proposals#named-capture-groups) indexiert werden kann. Damit kann die vorherige Funktion wie folgt umgeschrieben werden:

```js
function getVariablePosition(source) {
  const re = /(?<keyword>let|const|var)\s+(?<id>[a-zA-Z_$][0-9a-zA-Z_$]*)/d;
  const match = re.exec(source);
  if (!match) return -1;
  return match.indices.groups.id;
}
getVariablePosition('let foo');
```

## Unterstützung für RegExp-Abgleich-Indizes

<feature-support chrome="90 https://bugs.chromium.org/p/v8/issues/detail?id=9548"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1519483"
                 safari="no https://bugs.webkit.org/show_bug.cgi?id=202475"
                 nodejs="16"
                 babel="no"></feature-support>
