---
title: "V8-Version v4.9"
author: "das V8-Team"
date: 2016-01-26 13:33:37
tags:
  - Veröffentlichung
description: "V8 v4.9 kommt mit einer verbesserten `Math.random`-Implementierung und Unterstützung für mehrere neue ES2015-Sprachfeatures."
---
Etwa alle sechs Wochen erstellen wir einen neuen Branch von V8 im Rahmen unseres [Veröffentlichungsprozesses](/docs/release-process). Jede Version wird direkt aus dem Git-Master von V8 branchiert, unmittelbar bevor Chrome für einen Chrome-Beta-Meilenstein branchiert. Heute freuen wir uns, unseren neuesten Branch, [V8-Version 4.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.9), bekannt zu geben, der bis zur Veröffentlichung in Abstimmung mit Chrome 49 Stable Beta sein wird. V8 4.9 ist vollgepackt mit allerlei Entwickler-Goodies, und wir möchten Ihnen einen Vorgeschmack auf einige der Highlights geben, die in mehreren Wochen veröffentlicht werden.

<!--truncate-->
## 91 % ECMAScript 2015 (ES6)-Unterstützung

In der V8-Version 4.9 haben wir mehr JavaScript ES2015-Features ausgeliefert als in jeder anderen vorherigen Version, was uns wie im [Kangax-Kompatibilitätstabelle](https://kangax.github.io/compat-table/es6/) gemessen (Stand 26. Januar) zu einer 91%-Abdeckung bringt. V8 unterstützt jetzt Destructuring, Default-Parameter, Proxy-Objekte und die Reflect-API. Version 4.9 macht blockbezogene Konstrukte wie `class` und `let` auch außerhalb des Strict-Modus verfügbar und fügt Unterstützung für das Sticky-Flag bei regulären Ausdrücken und anpassbare `Object.prototype.toString`-Ausgabe hinzu.

### Destructuring

Variable Deklarationen, Parameter und Zuweisungen unterstützen jetzt [Destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment) von Objekten und Arrays durch Muster. Zum Beispiel:

```js
const o = {a: [1, 2, 3], b: {p: 4}, c: {q: 5}};
let {a: [x, y], b: {p}, c, d} = o;              // x=1, y=2, p=4, c={q: 5}
[x, y] = [y, x];                                // x=2, y=1
function f({a, b}) { return [a, b]; }
f({a: 4});                                      // [4, undefined]
```

Array-Muster können Restmuster enthalten, die den Rest des Arrays zugewiesen bekommen:

```js
const [x, y, ...r] = [1, 2, 3, 4];              // x=1, y=2, r=[3,4]
```

Außerdem können Musterelemente mit Standardwerten versehen werden, die verwendet werden, falls die entsprechende Eigenschaft keinen Treffer hat:

```js
const {a: x, b: y = x} = {a: 4};                // x=4, y=4
// oder…
const [x, y = 0, z = 0] = [1, 2];               // x=1, y=2, z=0
```

Destructuring kann verwendet werden, um den Zugriff auf Daten aus Objekten und Arrays kompakter zu gestalten.

### Proxies & Reflect

Nach Jahren der Entwicklung wird nun eine vollständige Implementierung von [Proxies](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) ausgeliefert, die mit der ES2015-Spezifikation übereinstimmt. Proxies sind ein leistungsstarker Mechanismus zur Virtualisierung von Objekten und Funktionen durch eine Reihe von entwicklerdefinierten Hooks, um den Zugriff auf Eigenschaften individuell anzupassen. Neben der Objektvirtualisierung können Proxies verwendet werden, um Abfangmechanismen zu implementieren, Validierungen für das Setzen von Eigenschaften hinzuzufügen, Debugging und Profiling zu vereinfachen und fortgeschrittene Abstraktionen wie [Membranen](http://tvcutsem.github.io/js-membranes/) freizuschalten.

Um ein Objekt zu proxen, müssen Sie ein Handler-Placeholder-Objekt erstellen, das verschiedene Fallen definiert, und es auf das Zielobjekt anwenden, das der Proxy virtualisiert:

```js
const target = {};
const handler = {
  get(target, name='world') {
    return `Hallo, ${name}!`;
  }
};

const foo = new Proxy(target, handler);
foo.bar;
// → 'Hallo, bar!'
```

Das Proxy-Objekt wird von dem Reflect-Modul begleitet, das geeignete Standardwerte für alle Proxy-Fallen definiert:

```js
const debugMe = new Proxy({}, {
  get(target, name, receiver) {
    console.log(`Debug: Zugriff auf Feld: ${name}`);
    return Reflect.get(target, name, receiver);
  },
  set(target, name, value, receiver) {
    console.log(`Debug: Feld: ${name}, Wert: ${value}`);
    return Reflect.set(target, name, value, receiver);
  }
});

debugMe.name = 'John Doe';
// Debug: Feld: name, Wert: John Doe
const title = `Herr ${debugMe.name}`; // → 'Herr John Doe'
// Debug: Zugriff auf Feld: name
```

Weitere Informationen zur Verwendung von Proxies und der Reflect-API finden Sie im Beispielbereich auf der [MDN-Proxy-Seite](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy#Examples).

### Standardparameter

In ES5 und früher erforderten optionale Parameter in Funktionsdefinitionen Boilerplate-Code, um zu überprüfen, ob Parameter undefiniert waren:

```js
function sublist(list, start, end) {
  if (typeof start === 'undefined') start = 0;
  if (typeof end === 'undefined') end = list.length;
  ...
}
```

ES2015 ermöglicht jetzt, dass Funktionsparameter [Standardwerte](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters) haben, was klarere und prägnantere Funktionsdefinitionen ermöglicht:

```js
function sublist(list, start = 0, end = list.length) { … }
sublist([1, 2, 3], 1);
// sublist([1, 2, 3], 1, 3)
```

Standardparameter und Destrukturierung können natürlich kombiniert werden:

```js
function vector([x, y, z] = []) { … }
```

### Klassen & lexikalische Deklarationen im „sloppy mode“

V8 unterstützt lexikalische Deklarationen (`let`, `const`, block-lokale `function`) und Klassen seit den Versionen 4.1 bzw. 4.2, aber bisher war der strikte Modus erforderlich, um sie zu verwenden. Ab V8-Version 4.9 sind alle diese Features nun auch außerhalb des strikten Modus gemäß der ES2015-Spezifikation aktiviert. Dadurch wird das Prototyping in der DevTools-Konsole viel einfacher, auch wenn wir Entwickler generell ermutigen, neuen Code auf den strikten Modus umzustellen.

### Reguläre Ausdrücke

V8 unterstützt nun das neue [Sticky-Flag](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky) für reguläre Ausdrücke. Das Sticky-Flag schaltet um, ob die Suche in Zeichenfolgen am Anfang der Zeichenfolge (normal) oder ab der `lastIndex`-Eigenschaft (sticky) beginnt. Dieses Verhalten ist nützlich, um beliebig lange Eingabestrings mit vielen unterschiedlichen regulären Ausdrücken effizient zu parsen. Um eine sticky-Suche zu aktivieren, fügt man das `y`-Flag zu einem regulären Ausdruck hinzu: (z. B. `const regex = /foo/y;`).

### Anpassbare `Object.prototype.toString`-Ausgabe

Mit `Symbol.toStringTag` können benutzerdefinierte Typen jetzt angepasste Ausgaben zurückgeben, wenn sie an `Object.prototype.toString` übergeben werden (entweder direkt oder als Ergebnis der Zeichenfolgenkonvertierung):

```js
class Custom {
  get [Symbol.toStringTag]() {
    return 'Custom';
  }
}
Object.prototype.toString.call(new Custom);
// → '[object Custom]'
String(new Custom);
// → '[object Custom]'
```

## Verbesserte `Math.random()`

V8 v4.9 beinhaltet eine Verbesserung der Implementierung von `Math.random()`. [Wie letzten Monat angekündigt](/blog/math-random) haben wir V8s PRNG-Algorithmus zu [xorshift128+](http://vigna.di.unimi.it/ftp/papers/xorshiftplus.pdf) gewechselt, um eine höhere Qualität der Pseudozufallszahlen zu erzielen.

## V8-API

Bitte sehen Sie sich unsere [Zusammenfassung der API-Änderungen](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit) an. Dieses Dokument wird regelmäßig einige Wochen nach jeder Hauptversion aktualisiert.

Entwickler mit einem [aktiven V8-Checkout](https://v8.dev/docs/source-code#using-git) können `git checkout -b 4.9 -t branch-heads/4.9` verwenden, um die neuen Features in V8 v4.9 auszuprobieren. Alternativ können Sie den [Chrome-Beta-Kanal](https://www.google.com/chrome/browser/beta.html) abonnieren und die neuen Funktionen bald selbst ausprobieren.
