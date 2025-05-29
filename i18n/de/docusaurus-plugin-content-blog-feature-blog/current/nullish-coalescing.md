---
title: "Nullish Coalescing"
author: "Justin Ridgewell"
avatars:
  - "justin-ridgewell"
date: 2019-09-17
tags:
  - ECMAScript
  - ES2020
description: "Der JavaScript-Operator für nullish coalescing ermöglicht sicherere Standardausdrücke."
tweet: "1173971116865523714"
---
Der [Nullish-Coalescing-Vorschlag](https://github.com/tc39/proposal-nullish-coalescing/) (`??`) fügt einen neuen Kurzschlussoperator hinzu, der für die Verarbeitung von Standardwerten gedacht ist.

Sie kennen möglicherweise bereits die anderen Kurzschlussoperatoren `&&` und `||`. Beide Operatoren arbeiten mit „truthy“ und „falsy“ Werten. Stellen Sie sich das Codebeispiel `lhs && rhs` vor. Wenn `lhs` (_) _linke Seite_) nicht wahrheitsgemäß ist, wird der Ausdruck zu `lhs`. Andernfalls wird er zu `rhs` (_) _rechte Seite_) ausgewertet. Das Gegenteil gilt für das Codebeispiel `lhs || rhs`. Wenn `lhs` wahrheitsgemäß ist, wird der Ausdruck zu `lhs` ausgewertet. Andernfalls wird er zu `rhs` ausgewertet.

<!--truncate-->
Aber was genau bedeutet „truthy“ und „falsy“? In Spezifikationsterms entspricht dies der abstrakten Operation [`ToBoolean`](https://tc39.es/ecma262/#sec-toboolean). Für uns normale JavaScript-Entwickler ist **alles** wahrheitsgemäß, außer den „falsy“-Werten `undefined`, `null`, `false`, `0`, `NaN` und der leere String `''`. (Technisch gesehen ist der Wert, der mit `document.all` assoziiert wird, ebenfalls nicht wahrheitsgemäß, aber darauf kommen wir später zurück.)

Also, was ist das Problem mit `&&` und `||`? Und warum brauchen wir einen neuen Nullish-Coalescing-Operator? Es liegt daran, dass diese Definition von „truthy“ und „falsy“ nicht jedes Szenario abdeckt und dies zu Fehlern führt. Stellen Sie sich Folgendes vor:

```js
function Component(props) {
  const enable = props.enabled || true;
  // …
}
```

In diesem Beispiel behandeln wir die Eigenschaft `enabled` als eine optionale boolesche Eigenschaft, die steuert, ob eine Funktionalität innerhalb der Komponente aktiviert ist. Das bedeutet, dass wir `enabled` explizit auf `true` oder `false` setzen können. Da es sich jedoch um eine _optionale_ Eigenschaft handelt, können wir sie implizit auf `undefined` setzen, indem wir sie einfach gar nicht setzen. Ist sie auf `undefined` gesetzt, wollen wir sie behandeln, als wäre die Komponente `enabled = true` (der Standardwert).

Möglicherweise haben Sie den Fehler im Codebeispiel bereits entdeckt. Wenn wir `enabled = true` explizit setzen, ist die `enable`-Variable `true`. Wenn wir `enabled = undefined` implizit setzen, ist die `enable`-Variable `true`. Und wenn wir `enabled = false` explizit setzen, ist die `enable`-Variable immer noch `true`! Unsere Absicht war, den Wert standardmäßig auf `true` zu setzen, aber wir hatten unseren Wert tatsächlich erzwungen. Die Lösung in diesem Fall ist, sehr explizit über die Werte zu sein, die wir erwarten:

```js
function Component(props) {
  const enable = props.enabled !== false;
  // …
}
```

Wir sehen diesen Bug bei jedem falsy-Wert auftauchen. Dies hätte sehr leicht ein optionaler String sein können (bei dem der leere String `''` als gültige Eingabe angesehen wird) oder eine optionale Zahl (bei der `0` als gültige Eingabe angesehen wird). Dies ist ein so häufiges Problem, dass der Nullish-Coalescing-Operator eingeführt wird, um diese Art von Standardwertzuweisung zu behandeln:

```js
function Component(props) {
  const enable = props.enabled ?? true;
  // …
}
```

Der Nullish-Coalescing-Operator (`??`) funktioniert sehr ähnlich wie der `||`-Operator, außer dass wir beim Evaluieren des Operators nicht „truthy“ verwenden. Stattdessen nutzen wir die Definition von „nullish“, was bedeutet „ist der Wert strikt gleich `null` oder `undefined`“. Stellen Sie sich den Ausdruck `lhs ?? rhs` vor: Wenn `lhs` nicht nullish ist, wird er zu `lhs` ausgewertet. Andernfalls wird er zu `rhs` ausgewertet.

Explizit bedeutet das, dass die Werte `false`, `0`, `NaN` und der leere String `''` alle falsy Werte sind, die nicht nullish sind. Wenn solche falsy-aber-nicht-nullish-Werte die linke Seite von `lhs ?? rhs` sind, wird der Ausdruck zu ihnen statt zur rechten Seite ausgewertet. Bugs beseitigt!

```js
false ?? true;   // => false
0 ?? 1;          // => 0
'' ?? 'default'; // => ''

null ?? [];      // => []
undefined ?? []; // => []
```

## Was ist mit Standardzuweisungen beim Destructuring?

Möglicherweise haben Sie bemerkt, dass das letzte Codebeispiel auch behoben werden könnte, indem Standardzuweisungen innerhalb eines Objekt-Destructuring verwendet werden:

```js
function Component(props) {
  const {
    enabled: enable = true,
  } = props;
  // …
}
```

Es ist etwas umständlich, aber immer noch völlig gültiges JavaScript. Es verwendet jedoch leicht unterschiedliche Semantiken. Standardzuweisungen innerhalb von Objekt-Destructuring prüfen, ob die Eigenschaft strikt gleich `undefined` ist, und setzen in diesem Fall die Zuweisung.

Aber diese strikten Gleichheitstests für nur `undefined` sind nicht immer wünschenswert, und ein Objekt zum Destructuring steht nicht immer zur Verfügung. Beispielsweise möchten Sie möglicherweise die Rückgabewerte einer Funktion standardmäßig setzen (kein Objekt zum Destructuring). Oder vielleicht gibt die Funktion `null` zurück (was bei DOM-APIs üblich ist). Dies sind die Zeiten, in denen Sie zu Nullish-Coalescing greifen möchten:

```js
// Prägnantes Nullish-Coalescing
const link = document.querySelector('link') ?? document.createElement('link');

// Standard-Dekonstruktion mit Boilerplate
const {
  link = document.createElement('link'),
} = {
  link: document.querySelector('link') || undefined
};
```

Außerdem funktionieren bestimmte neue Features wie [optionale Verkettung](/features/optional-chaining) nicht perfekt mit Dekonstruktionen. Da Dekonstruktionen ein Objekt erfordern, müssen Sie die Dekonstruktion absichern, falls die optionale Verkettung `undefined` anstelle eines Objekts zurückgibt. Mit nullish coalescing haben wir dieses Problem nicht:

```js
// Optionale Verkettung und nullish coalescing zusammen
const link = obj.deep?.container.link ?? document.createElement('link');

// Standard-Dekonstruktion mit optionaler Verkettung
const {
  link = document.createElement('link'),
} = (obj.deep?.container || {});
```

## Operatoren kombinieren und abgleichen

Das Entwerfen einer Programmiersprache ist schwierig, und wir können nicht immer neue Operatoren ohne eine gewisse Mehrdeutigkeit in der Absicht des Entwicklers erstellen. Wenn Sie jemals die Operatoren `&&` und `||` gemischt haben, haben Sie wahrscheinlich selbst diese Mehrdeutigkeit festgestellt. Stellen Sie sich den Ausdruck `lhs && middle || rhs` vor. In JavaScript wird dies tatsächlich so geparst wie der Ausdruck `(lhs && middle) || rhs`. Stellen Sie sich nun den Ausdruck `lhs || middle && rhs` vor. Dieser wird tatsächlich so geparst wie `lhs || (middle && rhs)`.

Sie können wahrscheinlich erkennen, dass der Operator `&&` eine höhere Vorrangigkeit für seine linke und rechte Seite hat als der Operator `||`. Das bedeutet, dass die implizierten Klammern den `&&` anstelle des `||` umschließen. Beim Entwerfen des `??`-Operators mussten wir entscheiden, welche Vorrangigkeit er haben sollte. Er könnte entweder:

1. eine niedrigere Vorrangigkeit als sowohl `&&` als auch `||` haben
1. niedriger als `&&` aber höher als `||` sein
1. eine höhere Vorrangigkeit als sowohl `&&` als auch `||` haben

Für jede dieser Vorrangigkeitsdefinitionen mussten wir sie dann durch die vier möglichen Testfälle durchgehen:

1. `lhs && middle ?? rhs`
1. `lhs ?? middle && rhs`
1. `lhs || middle ?? rhs`
1. `lhs ?? middle || rhs`

In jedem Testausdruck mussten wir entscheiden, wo die implizierten Klammern hingehören. Und wenn sie den Ausdruck nicht genau so umschlossen, wie der Entwickler es beabsichtigt hatte, hätten wir schlecht geschriebenen Code. Leider konnte einer der Testausdrücke, egal welche Vorrangigkeitsstufe wir wählten, die Absichten des Entwicklers verletzen.

Am Ende haben wir uns entschieden, explizite Klammern zu verlangen, wenn `??` mit (`&&` oder `||`) gemischt wird (beachten Sie, dass ich explizit meine Klammerngruppierung verwendet habe! Meta-Witz!). Wenn Sie diese mischen, müssen Sie eine der Operatorgruppen in Klammern setzen, sonst erhalten Sie einen Syntaxfehler.

```js
// Explizite Klammergruppen sind erforderlich, um sie zu kombinieren
(lhs && middle) ?? rhs;
lhs && (middle ?? rhs);

(lhs ?? middle) && rhs;
lhs ?? (middle && rhs);

(lhs || middle) ?? rhs;
lhs || (middle ?? rhs);

(lhs ?? middle) || rhs;
lhs ?? (middle || rhs);
```

Auf diese Weise stimmt der Sprachparser immer mit dem überein, was der Entwickler beabsichtigt hat. Und jeder, der später den Code liest, kann ihn sofort verstehen. Toll!

## Sagen Sie mir etwas über `document.all`

[`document.all`](https://developer.mozilla.org/en-US/docs/Web/API/Document/all) ist ein spezieller Wert, den Sie niemals verwenden sollten. Aber wenn Sie ihn benutzen, ist es am besten, Sie wissen, wie er mit „truthy“ und „nullish“ interagiert.

`document.all` ist ein array-ähnliches Objekt, was bedeutet, dass es indizierte Eigenschaften wie ein Array und eine Länge hat. Objekte sind normalerweise truthy — aber überraschenderweise tut `document.all` so, als wäre es ein falsy-Wert! Tatsächlich ist es lose gleich sowohl `null` als auch `undefined` (was normalerweise bedeutet, dass es überhaupt keine Eigenschaften haben kann).

Beim Verwenden von `document.all` mit entweder `&&` oder `||` tut es so, als wäre es falsy. Aber es ist nicht streng gleich `null` oder `undefined`, daher ist es nicht nullish. Wenn Sie `document.all` mit `??` verwenden, verhält es sich wie jedes andere Objekt.

```js
document.all || true; // => true
document.all ?? true; // => HTMLAllCollection[]
```

## Unterstützung für nullish coalescing

<feature-support chrome="80 https://bugs.chromium.org/p/v8/issues/detail?id=9547"
                 firefox="72 https://bugzilla.mozilla.org/show_bug.cgi?id=1566141"
                 safari="13.1 https://webkit.org/blog/10247/new-webkit-features-in-safari-13-1/"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-nullish-coalescing-operator"></feature-support>
