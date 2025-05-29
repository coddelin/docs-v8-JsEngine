---
title: 'V8-Version v7.2'
author: 'Andreas Haas, Verantwortlicher für Traps'
avatars:
  - andreas-haas
date: 2018-12-18 11:48:21
tags:
  - Veröffentlichung
description: 'V8 v7.2 bietet hochschnelles JavaScript-Parsing, schnellere Async-Await-Operationen, reduzierten Speicherverbrauch auf ia32, öffentliche Klassenfelder und vieles mehr!'
tweet: '1074978755934863361'
---
Alle sechs Wochen erstellen wir einen neuen Branch von V8 als Teil unseres [Veröffentlichungsprozesses](/docs/release-process). Jede Version wird direkt vor einem Chrome-Beta-Meilenstein vom Git-Master von V8 abgetrennt. Heute freuen wir uns, unseren neuesten Branch, [V8-Version 7.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.2), anzukündigen, der sich bis zur Veröffentlichung in mehreren Wochen in Koordination mit Chrome 72 Stable in der Beta-Phase befindet. V8 v7.2 ist voller Entwicklerfunktionen. Dieser Beitrag bietet eine Vorschau auf einige Highlights im Vorgriff auf die Veröffentlichung.

<!--truncate-->
## Speicher

[Eingebettete Builtins](/blog/embedded-builtins) werden jetzt auf der ia32-Architektur unterstützt und sind standardmäßig aktiviert.

## Leistung

### JavaScript-Parsing

Webseiten verbringen im Durchschnitt 9,5% der V8-Zeit beim Starten mit dem Parsing von JavaScript. Daher haben wir uns darauf konzentriert, mit v7.2 den bisher schnellsten JavaScript-Parser von V8 auszuliefern. Wir haben die Parsing-Geschwindigkeit durchweg drastisch verbessert. Seit v7.0 hat sich die Parsing-Geschwindigkeit auf Desktops um etwa 30% erhöht. Das folgende Diagramm dokumentiert die beeindruckenden Verbesserungen in unserem realen Benchmark für das Laden von Facebook in den letzten Monaten.

![V8-Parsing-Zeit auf facebook.com (niedriger ist besser)](/_img/v8-release-72/facebook-parse-time.png)

Wir haben uns gelegentlich auf den Parser konzentriert. Die folgenden Diagramme zeigen die Verbesserungen im Vergleich zur neuesten v7.2-Version auf mehreren beliebten Webseiten.

![V8-Parsing-Zeiten relativ zu V8 v7.2 (niedriger ist besser)](/_img/v8-release-72/relative-parse-times.svg)

Alles in allem haben die jüngsten Verbesserungen den durchschnittlichen Parsing-Prozentsatz von 9,5% auf 7,5% reduziert, was zu schnelleren Ladezeiten und reaktionsfähigeren Seiten führt.

### `async`/`await`

V8 v7.2 kommt mit [einer schnelleren `async`/`await`-Implementierung](/blog/fast-async#await-under-the-hood), die standardmäßig aktiviert ist. Wir haben [einen Spezifikationsvorschlag](https://github.com/tc39/ecma262/pull/1250) gemacht und sammeln derzeit Web-Kompatibilitätsdaten, um die Änderung offiziell in die ECMAScript-Spezifikation aufnehmen zu können.

### Spread-Elemente

V8 v7.2 verbessert die Leistung von Spread-Elementen erheblich, wenn sie am Anfang des Array-Literals auftreten, zum Beispiel `[...x]` oder `[...x, 1, 2]`. Die Verbesserung gilt für das Spreizen von Arrays, primitiven Zeichenketten, Sets, Map-Schlüsseln, Map-Werten und — dadurch bedingt — auch für `Array.from(x)`. Weitere Details finden Sie in [unserem ausführlichen Artikel über die Beschleunigung von Spread-Elementen](/blog/spread-elements).

### WebAssembly

Wir haben eine Reihe von WebAssembly-Benchmarks analysiert und diese genutzt, um eine verbesserte Code-Generierung im obersten Ausführungslayer zu entwickeln. Insbesondere ermöglicht V8 v7.2 das Node-Splitting im Scheduler des Optimierungs-Compilers und Loop-Rotation im Backend. Wir haben auch das Wrapper-Caching verbessert und benutzerdefinierte Wrapper eingeführt, die den Overhead beim Aufruf von importierten JavaScript-Mathematikfunktionen reduzieren. Darüber hinaus haben wir Änderungen am Register-Allocator entworfen, die die Leistung für viele Code-Muster verbessern und in einer späteren Version eingeführt werden.

### Trap-Handler

Trap-Handler verbessern den allgemeinen Durchsatz von WebAssembly-Code. Sie sind in V8 v7.2 unter Windows, macOS und Linux implementiert und verfügbar. In Chromium sind sie auf Linux aktiviert. Windows und macOS folgen, sobald Stabilitätsbestätigungen vorliegen. Derzeit arbeiten wir daran, sie auch auf Android verfügbar zu machen.

## Async-Stack-Traces

Wie [früher erwähnt](/blog/fast-async#improved-developer-experience) haben wir ein neues Feature namens [kostenlose Async-Stack-Traces](https://bit.ly/v8-zero-cost-async-stack-traces) hinzugefügt, das die `error.stack`-Eigenschaft mit asynchronen Aufrufrahmen anreichert. Es ist derzeit hinter der `--async-stack-traces`-Befehlszeilen-Flag verfügbar.

## JavaScript-Sprachfunktionen

### Öffentliche Klassenfelder

V8 v7.2 fügt Unterstützung für [öffentliche Klassenfelder](/features/class-fields) hinzu. Statt:

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}

class Cat extends Animal {
  constructor(name) {
    super(name);
    this.likesBaths = false;
  }
  meow() {
    console.log('Meow!');
  }
}
```

…kann man jetzt schreiben:

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}

class Cat extends Animal {
  likesBaths = false;
  meow() {
    console.log('Meow!');
  }
}
```

Die Unterstützung für [private Klassenfelder](/features/class-fields#private-class-fields) ist für eine zukünftige V8-Version geplant.

### `Intl.ListFormat`

V8 v7.2 fügt Unterstützung für [den Vorschlag `Intl.ListFormat`](/features/intl-listformat) hinzu, was die lokalisierte Formatierung von Listen ermöglicht.

```js
const lf = new Intl.ListFormat('en');
lf.format(['Frank']);
// → 'Frank'
lf.format(['Frank', 'Christine']);
// → 'Frank und Christine'
lf.format(['Frank', 'Christine', 'Flora']);
// → 'Frank, Christine und Flora'
lf.format(['Frank', 'Christine', 'Flora', 'Harrison']);
// → 'Frank, Christine, Flora und Harrison'
```

Weitere Informationen und Anwendungsbeispiele finden Sie in [unserem `Intl.ListFormat`-Erklärer](/features/intl-listformat).

### Wohlgeformtes `JSON.stringify`

`JSON.stringify` gibt jetzt Escape-Sequenzen für einzelne Surrogate aus, sodass die Ausgabe gültiges Unicode ist (und in UTF-8 darstellbar):

```js
// Altes Verhalten:
JSON.stringify('\uD800');
// → '"�"'

// Neues Verhalten:
JSON.stringify('\uD800');
// → '"\\ud800"'
```

Weitere Informationen finden Sie in [unserem Erklärer zu wohlgeformtem `JSON.stringify`](/features/well-formed-json-stringify).

### Modul-Namespace-Exporte

In [JavaScript-Modulen](/features/modules) war es bereits möglich, die folgende Syntax zu verwenden:

```js
import * as utils from './utils.mjs';
```

Allerdings existierte bis jetzt keine symmetrische `export`-Syntax… [bis jetzt](/features/module-namespace-exports):

```js
export * as utils from './utils.mjs';
```

Dies ist gleichbedeutend mit folgendem:

```js
import * as utils from './utils.mjs';
export { utils };
```

## V8-API

Bitte verwenden Sie `git log branch-heads/7.1..branch-heads/7.2 include/v8.h`, um eine Liste der API-Änderungen zu erhalten.

Entwickler mit einem [aktiven V8-Checkout](/docs/source-code#using-git) können `git checkout -b 7.2 -t branch-heads/7.2` verwenden, um mit den neuen Funktionen in V8 v7.2 zu experimentieren. Alternativ können Sie [den Beta-Kanal von Chrome abonnieren](https://www.google.com/chrome/browser/beta.html) und die neuen Funktionen bald selbst ausprobieren.
