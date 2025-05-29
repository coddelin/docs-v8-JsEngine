---
title: "`String.prototype.replaceAll`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2019-11-11
tags:
  - ECMAScript
  - ES2021
  - Node.js 16
description: "JavaScript unterstützt jetzt die globale Ersetzung von Teilzeichenfolgen durch die neue `String.prototype.replaceAll` API."
tweet: "1193917549060280320"
---
Wenn Sie jemals mit Zeichenfolgen in JavaScript gearbeitet haben, sind Sie wahrscheinlich auf die Methode `String#replace` gestoßen. `String.prototype.replace(searchValue, replacement)` gibt eine Zeichenfolge zurück, bei der einige Übereinstimmungen basierend auf den angegebenen Parametern ersetzt werden:

<!--truncate-->
```js
'abc'.replace('b', '_');
// → 'a_c'

'🍏🍋🍊🍓'.replace('🍏', '🥭');
// → '🥭🍋🍊🍓'
```

Ein häufiger Anwendungsfall ist das Ersetzen _aller_ Instanzen einer bestimmten Teilzeichenfolge. Allerdings berücksichtigt `String#replace` diesen Anwendungsfall nicht direkt. Wenn `searchValue` eine Zeichenfolge ist, wird nur das erste Vorkommen der Teilzeichenfolge ersetzt:

```js
'aabbcc'.replace('b', '_');
// → 'aa_bcc'

'🍏🍏🍋🍋🍊🍊🍓🍓'.replace('🍏', '🥭');
// → '🥭🍏🍋🍋🍊🍊🍓🍓'
```

Um dieses Problem zu umgehen, verwandeln Entwickler die Suchzeichenfolge häufig in einen regulären Ausdruck mit dem globalen (`g`) Flag. Auf diese Weise ersetzt `String#replace` _alle_ Übereinstimmungen:

```js
'aabbcc'.replace(/b/g, '_');
// → 'aa__cc'

'🍏🍏🍋🍋🍊🍊🍓🍓'.replace(/🍏/g, '🥭');
// → '🥭🥭🍋🍋🍊🍊🍓🍓'
```

Als Entwickler ist es ärgerlich, diese Zeichenfolgen-in-Regulär-Ausdruck-Konvertierung durchführen zu müssen, wenn Sie wirklich nur eine globale Ersetzung von Teilzeichenfolgen wünschen. Noch wichtiger ist, dass diese Konvertierung fehleranfällig ist und eine häufige Fehlerquelle darstellt! Betrachten Sie das folgende Beispiel:

```js
const queryString = 'q=query+string+parameters';

queryString.replace('+', ' ');
// → 'q=query string+parameters' ❌
// Nur das erste Vorkommen wird ersetzt.

queryString.replace(/+/, ' ');
// → SyntaxError: ungültiger regulärer Ausdruck ❌
// Es stellt sich heraus, dass `+` ein Sonderzeichen innerhalb von regulären Ausdrucksmustern ist.

queryString.replace(/\+/, ' ');
// → 'q=query string+parameters' ❌
// Das Escapen spezieller regulärer Ausdruckszeichen macht den regulären Ausdruck gültig, aber
// dies ersetzt immer noch nur das erste Vorkommen von `+` in der Zeichenfolge.

queryString.replace(/\+/g, ' ');
// → 'q=query string parameters' ✅
// Das Escapen spezieller regulärer Ausdruckszeichen UND das Verwenden des `g` Flags machen es funktional.
```

Eine Zeichenfolge wie `'+'` in einen globalen regulären Ausdruck umzuwandeln, besteht nicht nur darin, die `'` Anführungszeichen zu entfernen, sie in `/` Schrägstriche einzukapseln und das `g` Flag hinzuzufügen – wir müssen alle Zeichen escapen, die in regulären Ausdrücken eine besondere Bedeutung haben. Das ist leicht zu vergessen und schwer richtig zu machen, da JavaScript keinen eingebauten Mechanismus zum Escapieren von regulären Ausdrucksmustern bietet.

Ein alternativer Workaround ist die Kombination von `String#split` mit `Array#join`:

```js
const queryString = 'q=query+string+parameters';
queryString.split('+').join(' ');
// → 'q=query string parameters'
```

Dieser Ansatz vermeidet jedes Escapen, bringt jedoch den Aufwand mit sich, die Zeichenfolge in ein Array von Teilen zu zerlegen, nur um sie anschließend wieder zusammenzufügen.

Offensichtlich sind keine dieser Lösungen ideal. Wäre es nicht großartig, wenn eine grundlegende Operation wie die globale Ersetzung von Teilzeichenfolgen in JavaScript unkompliziert wäre?

## `String.prototype.replaceAll`

Die neue Methode `String#replaceAll` löst diese Probleme und bietet einen unkomplizierten Mechanismus zur Durchführung der globalen Ersetzung von Teilzeichenfolgen:

```js
'aabbcc'.replaceAll('b', '_');
// → 'aa__cc'

'🍏🍏🍋🍋🍊🍊🍓🍓'.replaceAll('🍏', '🥭');
// → '🥭🥭🍋🍋🍊🍊🍓🍓'

const queryString = 'q=query+string+parameters';
queryString.replaceAll('+', ' ');
// → 'q=query string parameters'
```

Um Konsistenz mit den bereits vorhandenen APIs in der Sprache zu gewährleisten, verhält sich `String.prototype.replaceAll(searchValue, replacement)` genauso wie `String.prototype.replace(searchValue, replacement)`, mit den folgenden zwei Ausnahmen:

1. Wenn `searchValue` eine Zeichenfolge ist, ersetzt `String#replace` nur das erste Vorkommen der Teilzeichenfolge, während `String#replaceAll` _alle_ Vorkommen ersetzt.
1. Wenn `searchValue` ein nicht-globaler regulärer Ausdruck ist, ersetzt `String#replace` nur eine einzelne Übereinstimmung, ähnlich wie es sich bei Zeichenfolgen verhält. `String#replaceAll` hingegen löst in diesem Fall eine Ausnahme aus, da dies wahrscheinlich ein Fehler ist: Wenn Sie wirklich „alle“ Übereinstimmungen ersetzen möchten, würden Sie einen globalen regulären Ausdruck verwenden; wenn Sie nur eine einzige Übereinstimmung ersetzen möchten, können Sie `String#replace` verwenden.

Der wichtige neue Funktionsumfang liegt im ersten Punkt. `String.prototype.replaceAll` bereichert JavaScript mit einer erstklassigen Unterstützung für die globale Ersetzung von Teilzeichenfolgen ohne die Notwendigkeit von regulären Ausdrücken oder anderen Umgehungsmöglichkeiten.

## Eine Anmerkung zu speziellen Ersetzungsmustern

Es ist erwähnenswert: Sowohl `replace` als auch `replaceAll` unterstützen [spezielle Ersetzungsmuster](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement). Obwohl diese Muster am nützlichsten in Kombination mit regulären Ausdrücken sind, wirken einige von ihnen (`$$`, `$&`, ``$` ``, und `$'`) auch bei einfacher Zeichenkettenersetzung, was überraschend sein kann:

```js
'xyz'.replaceAll('y', '$$');
// → 'x$z' (nicht 'x$$z')
```

Falls Ihre Ersetzungszeichenfolge eines dieser Muster enthält und Sie sie unverändert verwenden möchten, können Sie das magische Substitutionsverhalten umgehen, indem Sie eine Ersetzungsfunktion verwenden, die die Zeichenfolge zurückgibt:

```js
'xyz'.replaceAll('y', () => '$$');
// → 'x$$z'
```

## Unterstützung für `String.prototype.replaceAll`

<feature-support chrome="85 https://bugs.chromium.org/p/v8/issues/detail?id=9801"
                 firefox="77 https://bugzilla.mozilla.org/show_bug.cgi?id=1608168#c8"
                 safari="13.1 https://webkit.org/blog/10247/new-webkit-features-in-safari-13-1/"
                 nodejs="16"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
