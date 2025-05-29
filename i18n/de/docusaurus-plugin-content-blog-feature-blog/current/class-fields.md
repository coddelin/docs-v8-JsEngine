---
title: 'Öffentliche und private Klassenfelder'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2018-12-13
tags:
  - ECMAScript
  - ES2022
  - io19
  - Node.js 14
description: 'Mehrere Vorschläge erweitern die bestehende JavaScript-Klassensyntax um neue Funktionen. Dieser Artikel erklärt die neue Syntax von öffentlichen Klassenfeldern in V8 v7.2 und Chrome 72 sowie die kommende Syntax von privaten Klassenfeldern.'
tweet: '1121395767170740225'
---
Mehrere Vorschläge erweitern die bestehende JavaScript-Klassensyntax um neue Funktionen. Dieser Artikel erklärt die neue Syntax von öffentlichen Klassenfeldern in V8 v7.2 und Chrome 72 sowie die kommende Syntax von privaten Klassenfeldern.

Hier ist ein Codebeispiel, das eine Instanz einer Klasse namens `IncreasingCounter` erstellt:

```js
const counter = new IncreasingCounter();
counter.value;
// protokolliert 'Den aktuellen Wert abrufen!'
// → 0
counter.increment();
counter.value;
// protokolliert 'Den aktuellen Wert abrufen!'
// → 1
```

Beachten Sie, dass der Zugriff auf `value` einen Code ausführt (d. h., er protokolliert eine Nachricht), bevor das Ergebnis zurückgegeben wird. Überlegen Sie sich nun, wie Sie diese Klasse in JavaScript implementieren würden? 🤔

## ES2015-Klassensyntax

So könnte `IncreasingCounter` unter Verwendung der ES2015-Klassensyntax implementiert werden:

```js
class IncreasingCounter {
  constructor() {
    this._count = 0;
  }
  get value() {
    console.log('Den aktuellen Wert abrufen!');
    return this._count;
  }
  increment() {
    this._count++;
  }
}
```

Die Klasse installiert den `value`-Getter und eine `increment`-Methode auf dem Prototyp. Interessanterweise hat die Klasse einen Konstruktor, der eine Instanzeigenschaft `_count` erstellt und ihren Standardwert auf `0` setzt. Derzeit verwenden wir oft das Unterstrichpräfix, um anzuzeigen, dass `_count` nicht direkt von Konsumenten der Klasse verwendet werden sollte, aber das ist nur eine Konvention; es ist keine _wirklich_ „private“ Eigenschaft mit speziellen Semantiken, die von der Sprache durchgesetzt werden.

<!--truncate-->
```js
const counter = new IncreasingCounter();
counter.value;
// protokolliert 'Den aktuellen Wert abrufen!'
// → 0

// Nichts hindert die Leute daran, die
// Instanzeigenschaft `_count` zu lesen oder zu manipulieren. 😢
counter._count;
// → 0
counter._count = 42;
counter.value;
// protokolliert 'Den aktuellen Wert abrufen!'
// → 42
```

## Öffentliche Klassenfelder

Die neue Syntax für öffentliche Klassenfelder erlaubt es uns, die Klassendefinition zu vereinfachen:

```js
class IncreasingCounter {
  _count = 0;
  get value() {
    console.log('Den aktuellen Wert abrufen!');
    return this._count;
  }
  increment() {
    this._count++;
  }
}
```

Die `_count`-Eigenschaft wird jetzt schön oben in der Klasse deklariert. Wir brauchen keinen Konstruktor mehr, nur um einige Felder zu definieren. Praktisch!

Die `_count`-Eigenschaft ist jedoch immer noch eine öffentliche Eigenschaft. In diesem speziellen Beispiel möchten wir verhindern, dass Personen direkt auf die Eigenschaft zugreifen.

## Private Klassenfelder

Hier kommen die privaten Klassenfelder ins Spiel. Die neue Syntax für private Felder ähnelt öffentlichen Feldern, außer dass [sie das Feld als privat kennzeichnen, indem Sie `#` verwenden](https://github.com/tc39/proposal-class-fields/blob/master/PRIVATE_SYNTAX_FAQ.md). Sie können das `#` als Teil des Feldnamens betrachten:

```js
class IncreasingCounter {
  #count = 0;
  get value() {
    console.log('Den aktuellen Wert abrufen!');
    return this.#count;
  }
  increment() {
    this.#count++;
  }
}
```

Private Felder sind außerhalb des Klassenkörpers nicht zugänglich:

```js
const counter = new IncreasingCounter();
counter.#count;
// → SyntaxError
counter.#count = 42;
// → SyntaxError
```

## Öffentliche und private statische Eigenschaften

Die Syntax von Klassenfeldern kann auch verwendet werden, um öffentliche und private statische Eigenschaften und Methoden zu erstellen:

```js
class FakeMath {
  // `PI` ist eine statische öffentliche Eigenschaft.
  static PI = 22 / 7; // Nah genug.

  // `#totallyRandomNumber` ist eine statische private Eigenschaft.
  static #totallyRandomNumber = 4;

  // `#computeRandomNumber` ist eine statische private Methode.
  static #computeRandomNumber() {
    return FakeMath.#totallyRandomNumber;
  }

  // `random` ist eine statische öffentliche Methode (ES2015-Syntax)
  // die `#computeRandomNumber` verwendet.
  static random() {
    console.log('Ich habe gehört, du magst Zufallszahlen…');
    return FakeMath.#computeRandomNumber();
  }
}

FakeMath.PI;
// → 3.142857142857143
FakeMath.random();
// protokolliert 'Ich habe gehört, du magst Zufallszahlen…'
// → 4
FakeMath.#totallyRandomNumber;
// → SyntaxError
FakeMath.#computeRandomNumber();
// → SyntaxError
```

## Einfacheres Unterklassen-Erstellen

Die Vorteile der Klassenfeld-Syntax werden noch klarer, wenn es um Unterklassen geht, die zusätzliche Felder einführen. Stellen Sie sich die folgende Basisklasse `Animal` vor:

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}
```

Um eine `Cat`-Unterklasse zu erstellen, die eine zusätzliche Instanzeigenschaft einführt, musste man bisher `super()` aufrufen, um den Konstruktor der Basisklasse `Animal` auszuführen, bevor man die Eigenschaft erstellt:

```js
class Cat extends Animal {
  constructor(name) {
    super(name);
    this.likesBaths = false;
  }
  meow() {
    console.log('Miau!');
  }
}
```

Das ist eine Menge Boilerplate-Code, nur um anzugeben, dass Katzen keine Bäder mögen. Glücklicherweise entfernt die Klassenfeld-Syntax die Notwendigkeit für den gesamten Konstruktor, einschließlich des umständlichen `super()`-Aufrufs:

```js
class Cat extends Animal {
  likesBaths = false;
  meow() {
    console.log('Miau!');
  }
}
```

## Feature-Unterstützung

### Unterstützung für öffentliche Klassenfelder

<feature-support chrome="72 /blog/v8-release-72#public-class-fields"
                 firefox="ja https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/69#JavaScript"
                 safari="ja https://bugs.webkit.org/show_bug.cgi?id=174212"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="ja https://babeljs.io/docs/en/babel-plugin-proposal-class-properties"></feature-support>

### Unterstützung für private Klassenfelder

<feature-support chrome="74 /blog/v8-release-74#private-class-fields"
                 firefox="90 https://spidermonkey.dev/blog/2021/05/03/private-fields-ship.html"
                 safari="ja"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="ja https://babeljs.io/docs/en/babel-plugin-proposal-class-properties"></feature-support>

### Unterstützung für private Methoden und Zugriffe

<feature-support chrome="84 /blog/v8-release-84#private-methods-and-accessors"
                 firefox="90 https://spidermonkey.dev/blog/2021/05/03/private-fields-ship.html"
                 safari="ja https://webkit.org/blog/11989/new-webkit-features-in-safari-15/"
                 nodejs="14.6.0"
                 babel="ja https://babeljs.io/docs/en/babel-plugin-proposal-private-methods"></feature-support>
