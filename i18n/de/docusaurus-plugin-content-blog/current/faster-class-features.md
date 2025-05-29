---
title: 'Schnellere Initialisierung von Instanzen mit neuen Klassenfeatures'
author: '[Joyee Cheung](https://twitter.com/JoyeeCheung), Instanzinitialisierer'
avatars:
  - 'joyee-cheung'
date: 2022-04-20
tags:
  - internals
description: 'Die Initialisierung von Instanzen mit neuen Klassenfeatures ist seit V8 v9.7 schneller geworden.'
tweet: '1517041137378373632'
---

Klassenfelder wurden in V8 seit v7.2 eingeführt, und private Klassenmethoden wurden seit v8.4 verfügbar. Nachdem die Vorschläge 2021 die Stufe 4 erreicht hatten, begann die Arbeit an der Verbesserung der Unterstützung für die neuen Klassenfeatures in V8 - bis dahin gab es zwei Hauptprobleme, die ihre Akzeptanz beeinträchtigten:

<!--truncate-->
1. Die Initialisierung von Klassenfeldern und privaten Methoden war viel langsamer als die Zuweisung gewöhnlicher Eigenschaften.
2. Die Klassenfeld-Initialisierer funktionierten nicht in [Startup-Snapshots](https://v8.dev/blog/custom-startup-snapshots), die von Einbettungen wie Node.js und Deno verwendet werden, um das Bootstrapping von sich selbst oder Benutzeranwendungen zu beschleunigen.

Das erste Problem wurde in V8 v9.7 behoben und die Lösung für das zweite Problem wurde in V8 v10.0 veröffentlicht. Dieser Artikel behandelt die Lösung des ersten Problems. Weitere Informationen über die Behebung des Snapshot-Problems finden Sie in [diesem Beitrag](https://joyeecheung.github.io/blog/2022/04/14/fixing-snapshot-support-of-class-fields-in-v8/).

## Optimierung von Klassenfeldern

Um die Leistungslücke zwischen der Zuweisung gewöhnlicher Eigenschaften und der Initialisierung von Klassenfeldern zu schließen, haben wir das bestehende [Inline-Cache (IC)-System](https://mathiasbynens.be/notes/shapes-ics) so aktualisiert, dass es mit letzteren funktioniert. Vor v9.7 verwendete V8 immer einen kostspieligen Laufzeitaufruf für Klassenfeld-Initialisierungen. Ab v9.7 verwendet V8 ein neues IC, um die Operation zu beschleunigen, wenn es das Initialisierungsmuster für ausreichend vorhersagbar hält - ähnlich wie bei der Zuweisung gewöhnlicher Eigenschaften.

![Leistung von Initialisierungen, optimiert](/_img/faster-class-features/class-fields-performance-optimized.svg)

![Leistung von Initialisierungen, interpretiert](/_img/faster-class-features/class-fields-performance-interpreted.svg)

### Die ursprüngliche Implementierung von Klassenfeldern

Für die Implementierung privater Felder verwendet V8 interne private Symbole &mdash; sie sind eine interne V8-Datenstruktur, die Standard-`Symbolen` ähnelt, aber bei der Verwendung als Eigenschaftenschlüssel nicht aufzählbar ist. Betrachten wir dieses Klassenskript als Beispiel:


```js
class A {
  #a = 0;
  b = this.#a;
}
```

V8 sammelt die Klassenfeld-Initialisierer (`#a = 0` und `b = this.#a`) und generiert eine synthetische Instanzmitgliedsfunktion mit den Initialisierern als Funktionskörper. Der hierfür erzeugte Bytecode sah früher so aus:

```cpp
// Lade das private Symbol für `#a` in r1
LdaImmutableCurrentContextSlot [2]
Star r1

// Lade 0 in r2
LdaZero
Star r2

// Verschiebe das Ziel in r0
Mov <this>, r0

// Verwenden der %AddPrivateField()-Laufzeitfunktion, um 0 als den Wert der
// durch das private Symbol `#a` gekennzeichneten Eigenschaft in der Instanz zu speichern,
// also `#a = 0`.
CallRuntime [AddPrivateField], r0-r2

// Lade den Eigenschaftsnamen `b` in r1
LdaConstant [0]
Star r1

// Lade das private Symbol für `#a`
LdaImmutableCurrentContextSlot [2]

// Lade den Wert der durch `#a` gekennzeichneten Eigenschaft aus der Instanz in r2
LdaKeyedProperty <this>, [0]
Star r2

// Verschiebe das Ziel in r0
Mov <this>, r0

// Verwenden der %CreateDataProperty()-Laufzeitfunktion, um die Eigenschaft
// durch `#a` als den Wert der durch `b` gekennzeichneten Eigenschaft zu speichern,
// also `b = this.#a`
CallRuntime [CreateDataProperty], r0-r2
```

Vergleichen Sie die Klasse im obigen Schnipsel mit einer solchen Klasse:

```js
class A {
  constructor() {
    this._a = 0;
    this.b = this._a;
  }
}
```

Technisch gesehen sind diese beiden Klassen nicht gleichwertig, selbst wenn der Unterschied in der Sichtbarkeit zwischen `this.#a` und `this._a` ignoriert wird. Die Spezifikation verlangt "define"-Semantik anstelle von "set"-Semantik. Das bedeutet, dass die Initialisierung von Klassenfeldern keine Setter oder `set` Proxy-Fallen auslöst. Eine Annäherung an die erste Klasse sollte daher `Object.defineProperty()` anstelle einfacher Zuweisungen verwenden, um die Eigenschaften zu initialisieren. Außerdem sollte es eine Ausnahme werfen, wenn das private Feld in der Instanz bereits existiert (für den Fall, dass das Ziel, das initialisiert wird, im Basiskonstruktor als andere Instanz überschrieben wird):

```js
class A {
  constructor() {
    // Was der %AddPrivateField()-Aufruf ungefähr bedeutet:
    const _a = %PrivateSymbol('#a')
    if (_a in this) {
      throw TypeError('Doppelte Initialisierung von #a nicht erlaubt auf demselben Objekt');
    }
    Object.defineProperty(this, _a, {
      writable: true,
      configurable: false,
      enumerable: false,
      value: 0
    });
    // Was der %CreateDataProperty()-Aufruf ungefähr bedeutet:
    Object.defineProperty(this, 'b', {
      writable: true,
      configurable: true,
      enumerable: true,
      value: this[_a]
    });
  }
}
```
Um die festgelegte Semantik vor Abschluss des Vorschlags umzusetzen, verwendete V8 Aufrufe von Laufzeitfunktionen, da diese flexibler sind. Wie oben im Bytecode gezeigt, wurde die Initialisierung öffentlicher Felder mit `%CreateDataProperty()`-Laufzeitaufrufen implementiert, während die Initialisierung privater Felder mit `%AddPrivateField()` erfolgte. Da Aufrufe in die Laufzeit erhebliche Überkopfkosten verursachen, war die Initialisierung von Klassenfeldern im Vergleich zur Zuordnung gewöhnlicher Objekteigenschaften deutlich langsamer.

In den meisten Anwendungsfällen sind die semantischen Unterschiede jedoch unerheblich. Es wäre schön, in diesen Fällen die Leistung der optimierten Eigenschaftenzuweisung zu haben &mdash; daher wurde nach Abschluss des Vorschlags eine optimiertere Implementierung durchgeführt.

### Optimierung privater Klassenfelder und berechneter öffentlicher Klassenfelder

Um die Initialisierung privater Klassenfelder und berechneter öffentlicher Klassenfelder zu beschleunigen, führte die Implementierung eine neue Mechanik ein, um diese Operationen in das [Inline-Cache (IC) System](https://mathiasbynens.be/notes/shapes-ics) einzubinden. Diese neue Mechanik besteht aus drei zusammenarbeitenden Komponenten:

- Im Bytecode-Generator ein neuer Bytecode `DefineKeyedOwnProperty`. Dieser wird erzeugt, wenn Code für die AST-Knoten `ClassLiteral::Property` generiert wird, die Klassenfeld-Initialisierer repräsentieren.
- Im TurboFan-JIT ein entsprechender IR-Opcode `JSDefineKeyedOwnProperty`, der aus dem neuen Bytecode kompiliert werden kann.
- Im IC-System ein neues `DefineKeyedOwnIC`, das im Interpreten-Handler des neuen Bytecodes sowie im aus dem neuen IR-Opcode kompilierten Code verwendet wird. Zur Vereinfachung der Implementierung verwendet das neue IC Teile des Codes von `KeyedStoreIC`, der ursprünglich für gewöhnliche Eigenschaftenzuweisungen gedacht war.

Wenn V8 nun auf diese Klasse stößt:

```js
class A {
  #a = 0;
}
```

wird der folgende Bytecode für den Initialisierer `#a = 0` generiert:

```cpp
// Lade das private Namensymbol für `#a` in r1
LdaImmutableCurrentContextSlot [2]
Star0

// Verwende den DefineKeyedOwnProperty-Bytecode, um 0 als Wert
// der Eigenschaft zu speichern, die durch das private Namensymbol `#a`
// im Instanzobjekt angegeben wurde, also `#a = 0`.
LdaZero
DefineKeyedOwnProperty <this>, r0, [0]
```

Wenn der Initialisierer oft genug ausgeführt wird, reserviert V8 einen [Feedback-Vektor-Slot](https://ponyfoo.com/articles/an-introduction-to-speculative-optimization-in-v8) für jedes zu initialisierende Feld. Der Slot enthält den Schlüssel des hinzuzufügenden Felds (im Falle eines privaten Felds das private Namensymbol) und ein Paar von [versteckten Klassen](https://v8.dev/docs/hidden-classes), zwischen denen die Instanz infolge der Feldinitialisierung übergegangen ist. Bei späteren Initialisierungen nutzt das IC das Feedback, um zu überprüfen, ob die Felder in derselben Reihenfolge bei Instanzen mit denselben versteckten Klassen initialisiert werden. Wenn die Initialisierung dem Muster entspricht, das V8 zuvor gesehen hat (was normalerweise der Fall ist), folgt V8 dem schnellen Pfad und führt die Initialisierung mit vorgefertigtem Code aus, anstatt in die Laufzeit zu springen, wodurch die Operation beschleunigt wird. Wenn die Initialisierung keinem von V8 zuvor gesehenen Muster entspricht, erfolgt ein Rückfall auf einen Laufzeitaufruf, um die langsamen Fälle zu behandeln.

### Optimierung benannter öffentlicher Klassenfelder

Um die Initialisierung benannter öffentlicher Klassenfelder zu beschleunigen, wurde der vorhandene Bytecode `DefineNamedOwnProperty` wiederverwendet, der auf `DefineNamedOwnIC` entweder im Interpreten oder durch den aus dem IR-Opcode `JSDefineNamedOwnProperty` kompilierten Code zugreift.

Wenn V8 nun auf diese Klasse stößt:

```js
class A {
  #a = 0;
  b = this.#a;
}
```

wird der folgende Bytecode für den Initialisierer `b = this.#a` generiert:

```cpp
// Lade das private Namensymbol für `#a`
LdaImmutableCurrentContextSlot [2]

// Lade den Wert der durch `#a` gekennzeichneten Eigenschaft von der Instanz in r2
// Hinweis: LdaKeyedProperty wurde umbenannt in GetKeyedProperty in der Umgestaltung
GetKeyedProperty <this>, [2]

// Verwende den DefineKeyedOwnProperty-Bytecode, um die durch `#a` gekennzeichnete
// Eigenschaft als Wert der durch `b` gekennzeichneten Eigenschaft zu speichern,
// also `b = this.#a;`.
DefineNamedOwnProperty <this>, [0], [4]
```

Die ursprüngliche `DefineNamedOwnIC`-Mechanik konnte nicht einfach in die Handhabung benannter öffentlicher Klassenfelder eingebunden werden, da sie ursprünglich nur für die Initialisierung von Objekt-Literalen vorgesehen war. Zuvor erwartete sie, dass das zu initialisierende Ziel ein Objekt ist, das seit seiner Erstellung noch nicht vom Benutzer verändert wurde, was für Objekt-Literale immer der Fall war. Klassenfelder können jedoch auf benutzerdefinierten Objekten initialisiert werden, wenn die Klasse von einer Basisklasse abgeleitet wird, deren Konstruktor das Ziel überschreibt:

```js
class A {
  constructor() {
    return new Proxy(
      { a: 1 },
      {
        defineProperty(object, key, desc) {
          console.log('object:', object);
          console.log('key:', key);
          console.log('desc:', desc);
          return true;
        }
      });
  }
}

class B extends A {
  a = 2;
  #b = 3;  // Nicht beobachtbar.
}

// object: { a: 1 },
// key: 'a',
// desc: {value: 2, writable: true, enumerable: true, configurable: true}
new B();
```
Um mit diesen Zielen umzugehen, haben wir die IC so gepatcht, dass sie auf die Laufzeit zurückgreift, wenn sie sieht, dass das zu initialisierende Objekt ein Proxy ist, wenn das zu definierende Feld bereits auf dem Objekt existiert oder wenn das Objekt einfach eine versteckte Klasse hat, die die IC zuvor nicht gesehen hat. Es ist weiterhin möglich, die Randfälle zu optimieren, falls diese häufig genug auftreten, aber bisher scheint es besser, deren Leistung für eine einfachere Implementierung zu opfern.

## Optimierung privater Methoden

### Die Implementierung privater Methoden

In [der Spezifikation](https://tc39.es/ecma262/#sec-privatemethodoraccessoradd) werden private Methoden so beschrieben, als ob sie auf den Instanzen installiert sind, nicht jedoch in der Klasse. Um jedoch Speicherplatz zu sparen, speichert V8's Implementierung die privaten Methoden zusammen mit einem privaten Marken-Symbol in einem Kontext, der mit der Klasse verknüpft ist. Wenn der Konstruktor aufgerufen wird, speichert V8 nur eine Referenz zu diesem Kontext in der Instanz, wobei das private Marken-Symbol als Schlüssel dient.

![Evaluierung und Instanziierung von Klassen mit privaten Methoden](/_img/faster-class-features/class-evaluation-and-instantiation.svg)

Wenn auf die privaten Methoden zugegriffen wird, durchläuft V8 die Kontext-Kette ausgehend vom Ausführungskontext, um den Klassen-Kontext zu finden, liest einen statisch bekannten Slot aus dem gefundenen Kontext, um das private Marken-Symbol für die Klasse zu erhalten, und überprüft dann, ob die Instanz eine Eigenschaft hat, die durch dieses Marken-Symbol gekennzeichnet ist, um festzustellen, ob die Instanz aus dieser Klasse erstellt wurde. Wenn die Marken-Prüfung bestanden wurde, lädt V8 die private Methode aus einem anderen bekannten Slot im gleichen Kontext und schließt den Zugriff ab.

![Zugriff auf private Methoden](/_img/faster-class-features/access-private-methods.svg)

Nehmen Sie diesen Ausschnitt als Beispiel:

```js
class A {
  #a() {}
}
```

V8 erzeugte früher den folgenden Bytecode für den Konstruktor von `A`:

```cpp
// Lade das private Marken-Symbol für die Klasse A aus dem Kontext
// und speichere es in r1.
LdaImmutableCurrentContextSlot [3]
Star r1

// Lade das Zielobjekt in r0.
Mov <this>, r0
// Lade den aktuellen Kontext in r2.
Mov <context>, r2
// Aufruf der Laufzeit-Funktion %AddPrivateBrand(), um den Kontext mit dem privaten Marken-Symbol
// als Schlüssel in der Instanz zu speichern.
CallRuntime [AddPrivateBrand], r0-r2
```

Da es auch einen Aufruf der Laufzeit-Funktion `%AddPrivateBrand()` gab, verursachte der Overhead, dass der Konstruktor viel langsamer war als Konstruktoren von Klassen mit nur öffentlichen Methoden.

### Optimierung der Initialisierung privater Marken

Um die Installation der privaten Marken zu beschleunigen, nutzen wir in den meisten Fällen einfach die `DefineKeyedOwnProperty`-Mechanik, die für die Optimierung privater Felder hinzugefügt wurde:

```cpp
// Lade das private Marken-Symbol für die Klasse A aus dem Kontext
// und speichere es in r1
LdaImmutableCurrentContextSlot [3]
Star0

// Verwende den DefineKeyedOwnProperty-Bytecode, um den
// Kontext mit dem privaten Marken-Symbol als Schlüssel in der Instanz zu speichern
Ldar <context>
DefineKeyedOwnProperty <this>, r0, [0]
```

![Leistung der Instanzinitialisierungen von Klassen mit verschiedenen Methoden](/_img/faster-class-features/private-methods-performance.svg)

Es gibt jedoch eine Einschränkung: Wenn die Klasse eine abgeleitete Klasse ist, deren Konstruktor `super()` aufruft, muss die Initialisierung der privaten Methoden - und in unserem Fall die Installation des privaten Marken-Symbols - nach der Rückkehr von `super()` erfolgen:

```js
class A {
  constructor() {
    // Dies führt bei einem neuen B()-Aufruf zu einem Fehler, da super() noch nicht zurückgekehrt ist.
    this.callMethod();
  }
}

class B extends A {
  #method() {}
  callMethod() { return this.#method(); }
  constructor(o) {
    super();
  }
};
```

Wie zuvor beschrieben, speichert V8 beim Initialisieren der Marke auch eine Referenz zum Klassen-Kontext in der Instanz. Diese Referenz wird nicht für Marken-Prüfungen verwendet, sondern ist für den Debugger bestimmt, um eine Liste privater Methoden von der Instanz abzurufen, ohne zu wissen, aus welcher Klasse sie konstruiert wurde. Wenn `super()` direkt im Konstruktor aufgerufen wird, kann V8 den Kontext einfach aus dem Kontextregister laden (was `Mov <context>, r2` oder `Ldar <context>` in den Bytecodes oben macht), um die Initialisierung durchzuführen. Aber `super()` kann auch von einer verschachtelten Pfeilfunktion, die wiederum in einem anderen Kontext aufgerufen wird, ausgeführt werden. In diesem Fall greift V8 auf eine Laufzeit-Funktion (nach wie vor `%AddPrivateBrand()` genannt) zurück, um den Klassen-Kontext in der Kontext-Kette zu suchen, anstatt sich auf das Kontextregister zu verlassen. Zum Beispiel für die `callSuper`-Funktion unten:

```js
class A extends class {} {
  #method() {}
  constructor(run) {
    const callSuper = () => super();
    // ...etwas tun
    run(callSuper)
  }
};

new A((fn) => fn());
```

V8 erzeugt nun den folgenden Bytecode:

```cpp
// Ruft den Super-Konstruktor auf, um die Instanz zu erstellen
// und speichert sie in r3.
...

// Lade das private Marken-Symbol aus dem Klassen-Kontext in der Tiefe 1
// vom aktuellen Kontext und speichere es in r4
LdaImmutableContextSlot <context>, [3], [1]
Star4

// Lade die Tiefe 1 als Smi in r6
LdaSmi [1]
Star6

// Lade den aktuellen Kontext in r5
Mov <context>, r5

// Verwende die %AddPrivateBrand(), um den Klassen-Kontext in der Tiefe 1
// vom aktuellen Kontext zu lokalisieren und ihn mit dem privaten Marken-Symbol
// als Schlüssel in der Instanz zu speichern
CallRuntime [AddPrivateBrand], r3-r6
```

In diesem Fall sind die Kosten des Laufzeitaufrufs wieder vorhanden, sodass die Initialisierung von Instanzen dieser Klasse immer noch langsamer sein wird als die Initialisierung von Instanzen von Klassen mit nur öffentlichen Methoden. Es ist möglich, einen dedizierten Bytecode zu verwenden, um das zu implementieren, was `%AddPrivateBrand()` ausführt, aber da das Aufrufen von `super()` in einer verschachtelten Pfeilfunktion ziemlich selten ist, haben wir erneut die Leistung zugunsten der Einfachheit der Implementierung eingetauscht.

## Abschließende Hinweise

Die in diesem Blogbeitrag erwähnte Arbeit ist auch in der [Node.js 18.0.0 Veröffentlichung](https://nodejs.org/en/blog/announcements/v18-release-announce/) enthalten. Zuvor hatte Node.js in einigen eingebauten Klassen, die private Felder verwendeten, auf Symbol-Properties umgestellt, um sie in den eingebetteten Bootstrap-Snapshot aufzunehmen und die Leistung der Konstruktoren zu verbessern (siehe [diesen Blogbeitrag](https://www.nearform.com/blog/node-js-and-the-struggles-of-being-an-eventtarget/) für mehr Kontext). Mit der verbesserten Unterstützung von Klassen-Features in V8 hat Node.js in diesen Klassen [wieder auf private Klassenfelder umgestellt](https://github.com/nodejs/node/pull/42361) und Node.js's Benchmarks zeigten, dass [diese Änderungen keine Leistungsregressionen verursachten](https://github.com/nodejs/node/pull/42361#issuecomment-1068961385).

Vielen Dank an Igalia und Bloomberg für die Umsetzung dieser Implementierung!
