---
title: &apos;Optionale Verkettung&apos;
author: &apos;Maya Armyanova ([@Zmayski](https://twitter.com/Zmayski)), Brecherin optionaler Verkettungen&apos;
avatars:
  - &apos;maya-armyanova&apos;
date: 2019-08-27
tags:
  - ECMAScript
  - ES2020
description: &apos;Optionale Verkettung ermöglicht eine lesbare und prägnante Ausdrucksweise von Eigenschaftszugriffen mit integriertem Nullwert-Check.&apos;
tweet: &apos;1166360971914481669&apos;
---
Lange Reihen von Eigenschaftszugriffen in JavaScript können fehleranfällig sein, da jeder von ihnen den Wert `null` oder `undefined` (auch als „nullish“-Werte bekannt) ergeben könnte. Das Überprüfen der Existenz von Eigenschaften auf jedem Schritt verwandelt sich leicht in eine tief verschachtelte Struktur von `if`-Anweisungen oder eine lange `if`-Bedingung, die die Eigenschaftszugriffsreihe repliziert:

<!--truncate-->
```js
// Fehleranfällig, könnte eine Ausnahme werfen.
const nameLength = db.user.name.length;

// Weniger fehleranfällig, aber schwerer zu lesen.
let nameLength;
if (db && db.user && db.user.name)
  nameLength = db.user.name.length;
```

Das oben genannte kann auch unter Verwendung des ternären Operators ausgedrückt werden, was die Lesbarkeit nicht gerade verbessert:

```js
const nameLength =
  (db
    ? (db.user
      ? (db.user.name
        ? db.user.name.length
        : undefined)
      : undefined)
    : undefined);
```

## Einführung des Operators für optionale Verkettung

Natürlich möchten Sie keinen solchen Code schreiben, daher ist eine Alternative wünschenswert. Einige andere Sprachen bieten eine elegante Lösung für dieses Problem mit einer Funktion namens „optionale Verkettung“. Laut einem [aktuellen Spezifikationsvorschlag](https://github.com/tc39/proposal-optional-chaining) ist „eine optionale Verkettung eine Kette aus einem oder mehreren Eigenschaftszugriffen und Funktionsaufrufen, von denen der erste mit dem Token `?.` beginnt“.

Mit dem neuen Operator für optionale Verkettung können wir das obige Beispiel wie folgt umschreiben:

```js
// Überprüft weiterhin auf Fehler und ist viel besser lesbar.
const nameLength = db?.user?.name?.length;
```

Was passiert, wenn `db`, `user` oder `name` `undefined` oder `null` ist? Mit dem Operator für optionale Verkettung initialisiert JavaScript `nameLength` auf `undefined`, anstatt eine Ausnahme zu werfen.

Beachten Sie, dass dieses Verhalten auch robuster ist als unsere Überprüfung auf `if (db && db.user && db.user.name)`. Was wäre zum Beispiel, wenn `name` immer garantiert ein String wäre? Wir könnten `name?.length` auf `name.length` ändern. Wenn `name` dann ein leerer String wäre, würden wir dennoch die korrekte Länge `0` erhalten. Denn der leere String ist ein falsy-Wert: Er verhält sich wie `false` in einer `if`-Klausel. Der Operator für optionale Verkettung behebt diese häufige Fehlerquelle.

## Zusätzliche Syntaxformen: Aufrufe und dynamische Eigenschaften

Es gibt auch eine Version des Operators für optionale Methodenaufrufe:

```js
// Erweitert die Schnittstelle mit einer optionalen Methode,
// die nur für Admin-Benutzer vorhanden ist.
const adminOption = db?.user?.validateAdminAndGetPrefs?.().option;
```

Die Syntax kann unerwartet wirken, da `?.()` der tatsächliche Operator ist, der auf den Ausdruck _davor_ angewendet wird.

Es gibt eine dritte Verwendung des Operators, nämlich den optionalen Zugriff auf dynamische Eigenschaften, der über `?.[]` erfolgt. Er gibt entweder den durch das Argument in den Klammern referenzierten Wert zurück oder `undefined`, falls kein Objekt vorhanden ist, von dem der Wert abgerufen werden kann. Hier ist ein möglicher Anwendungsfall, basierend auf dem obigen Beispiel:

```js
// Erweitert die Fähigkeiten des statischen Eigenschaftszugriffs
// mit einem dynamisch generierten Eigenschaftsnamen.
const optionName = &apos;optionale Einstellung&apos;;
const optionLength = db?.user?.preferences?.[optionName].length;
```

Diese letzte Form ist auch zum optionalen Indizieren von Arrays verfügbar, z. B.:

```js
// Wenn das `usersArray` `null` oder `undefined` ist,
// wird `userName` auf elegante Weise auf `undefined` ausgewertet.
const userIndex = 42;
const userName = usersArray?.[userIndex].name;
```

Der Operator für optionale Verkettung kann mit dem [Nullwert-verschmelzenden `??` Operator](/features/nullish-coalescing) kombiniert werden, wenn ein nicht-`undefined` Standardwert benötigt wird. Dies ermöglicht einen sicheren Zugriff auf tiefe Eigenschaften mit einem angegebenen Standardwert und adressiert einen häufigen Anwendungsfall, für den früher benutzerdefinierte Bibliotheken wie [lodash&apos;s `_.get`](https://lodash.dev/docs/4.17.15#get) erforderlich waren:

```js
const object = { id: 123, names: { first: &apos;Alice&apos;, last: &apos;Smith&apos; }};

{ // Mit lodash:
  const firstName = _.get(object, &apos;names.first&apos;);
  // → &apos;Alice&apos;

  const middleName = _.get(object, &apos;names.middle&apos;, &apos;(kein zweiter Name)&apos;);
  // → &apos;(kein zweiter Name)&apos;
}

{ // Mit optionaler Verkettung und Nullwert-Verschmelzung:
  const firstName = object?.names?.first ?? &apos;(kein erster Name)&apos;;
  // → &apos;Alice&apos;

  const middleName = object?.names?.middle ?? &apos;(kein zweiter Name)&apos;;
  // → &apos;(kein zweiter Name)&apos;
}
```

## Eigenschaften des Operators für optionale Verkettung

Der Operator für optionale Verkettung hat einige interessante Eigenschaften: _Kurzschluss_, _Stapeln_ und _optionale Löschung_. Lassen Sie uns jede dieser Eigenschaften mit einem Beispiel durchgehen.

_Kurzschluss_ bedeutet, den Rest des Ausdrucks nicht auszuwerten, wenn ein Operator für optionale Verkettung frühzeitig zurückkehrt:

```js
// `age` wird nur inkrementiert, wenn `db` und `user` definiert sind.
db?.user?.grow(++age);
```

_Stapeln_ bedeutet, dass mehr als ein optionaler Verkettungsoperator auf eine Sequenz von Eigenschaftszugriffen angewendet werden kann:

```js
// Eine optionale Verkettung kann von einer weiteren optionalen Verkettung gefolgt werden.
const firstNameLength = db.users?.[42]?.names.first.length;
```

Dennoch sollte man vorsichtig sein, mehr als einen optionalen Verkettungsoperator in einer einzigen Kette zu verwenden. Wenn ein Wert garantiert nicht null oder undefiniert ist, wird die Verwendung von `?.` zum Zugriff auf seine Eigenschaften eher nicht empfohlen. Im obigen Beispiel wird angenommen, dass `db` immer definiert ist, aber `db.users` und `db.users[42]` möglicherweise nicht. Wenn es einen solchen Nutzer in der Datenbank gibt, wird davon ausgegangen, dass `names.first.length` immer definiert ist.

_Optionales Löschen_ bedeutet, dass der `delete`-Operator mit einer optionalen Verkettung kombiniert werden kann:

```js
// `db.user` wird nur gelöscht, wenn `db` definiert ist.
delete db?.user;
```

Weitere Details finden Sie im [_Semantik_-Abschnitt des Vorschlags](https://github.com/tc39/proposal-optional-chaining#semantics).

## Unterstützung für optionales Verkettung

<feature-support chrome="80 https://bugs.chromium.org/p/v8/issues/detail?id=9553"
                 firefox="74 https://bugzilla.mozilla.org/show_bug.cgi?id=1566143"
                 safari="13.1 https://bugs.webkit.org/show_bug.cgi?id=200199"
                 nodejs="14 https://medium.com/@nodejs/node-js-version-14-available-now-8170d384567e"
                 babel="ja https://babeljs.io/docs/en/babel-plugin-proposal-optional-chaining"></feature-support>
