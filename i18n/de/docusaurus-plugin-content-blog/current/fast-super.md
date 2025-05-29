---
title: 'Super schnelle `super`-Eigenschaftszugriffe'
author: '[Marja Hölttä](https://twitter.com/marjakh), Super-Optimierer'
avatars:
  - marja-holtta
date: 2021-02-18
tags:
  - JavaScript
description: 'Schnellere `super`-Eigenschaftszugriffe in V8 v9.0'
tweet: '1362465295848333316'
---

Das [`super`-Schlüsselwort](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Operators/super) kann verwendet werden, um auf Eigenschaften und Funktionen des Elternobjekts eines Objekts zuzugreifen.

Früher wurde der Zugriff auf eine Super-Eigenschaft (wie `super.x`) über einen Laufzeitaufruf umgesetzt. Ab V8 v9.0 verwenden wir das [Inline-Cache-System (IC)](https://mathiasbynens.be/notes/shapes-ics) in nicht-optimiertem Code und generieren den entsprechenden optimierten Code für den Zugriff auf Super-Eigenschaften, ohne zur Laufzeit springen zu müssen.

<!--truncate-->
Wie Sie den folgenden Diagrammen entnehmen können, war der Zugriff auf Super-Eigenschaften aufgrund des Laufzeitaufrufs früher um eine Größenordnung langsamer als der normale Eigenschaftszugriff. Jetzt sind wir viel näher daran, gleichauf zu sein.

![Vergleich des `super`-Eigenschaftszugriffs mit normalem Eigenschaftszugriff, optimiert](/_img/fast-super/super-opt.svg)

![Vergleich des `super`-Eigenschaftszugriffs mit normalem Eigenschaftszugriff, nicht optimiert](/_img/fast-super/super-no-opt.svg)

Der Zugriff auf `super`-Eigenschaften ist schwierig zu benchmarken, da er innerhalb einer Funktion erfolgen muss. Wir können nicht einzelne Eigenschaftszugriffe benchmarken, sondern nur größere Arbeitsblöcke. Daher wird der Funktionsaufruf-Overhead in die Messung einbezogen. Die obigen Diagramme unterschätzen einigermaßen den Unterschied zwischen `super`-Eigenschaftszugriff und normalem Eigenschaftszugriff, sind jedoch genau genug, um den Unterschied zwischen dem alten und neuen Zugriff auf `super`-Eigenschaften zu demonstrieren.

Im nicht optimierten (interpretierten) Modus wird der Zugriff auf `super`-Eigenschaften immer langsamer sein als der normale Eigenschaftszugriff, da wir mehr Ladungen durchführen müssen (Lesen des Home-Objekts aus dem Kontext und Lesen des `__proto__` vom Home-Objekt). Im optimierten Code betten wir das Home-Objekt bereits immer, wo möglich, als Konstante ein. Dies könnte weiter verbessert werden, indem auch dessen `__proto__` als Konstante eingebettet wird.

### Prototypische Vererbung und `super`

Beginnen wir mit den Grundlagen: Was bedeutet der Zugriff auf `super`-Eigenschaften überhaupt?

```javascript
class A { }
A.prototype.x = 100;

class B extends A {
  m() {
    return super.x;
  }
}
const b = new B();
b.m();
```

Nun ist `A` die Oberklasse von `B` und `b.m()` gibt wie erwartet `100` zurück.

![Diagramm der Klassenvererbung](/_img/fast-super/inheritance-1.svg)

Die Realität der [prototypischen Vererbung von JavaScript](https://developer.mozilla.org/de/docs/Web/JavaScript/Inheritance_and_the_prototype_chain) ist komplizierter:

![Diagramm der prototypischen Vererbung](/_img/fast-super/inheritance-2.svg)

Wir müssen sorgfältig zwischen den Eigenschaften `__proto__` und `prototype` unterscheiden — sie bedeuten nicht dasselbe! Um es noch verwirrender zu machen, wird das Objekt `b.__proto__` oft als "`b`’s Prototype" bezeichnet.

`b.__proto__` ist das Objekt, von dem `b` Eigenschaften übernimmt. `B.prototype` ist das Objekt, das das `__proto__` von Objekten ist, die mit `new B()` erstellt werden, d.h. `b.__proto__ === B.prototype`.

Im Gegenzug hat `B.prototype` seine eigene `__proto__`-Eigenschaft, die gleich `A.prototype` ist. Zusammen bildet dies das sogenannte Prototypen-Kette:

```
b ->
 b.__proto__ === B.prototype ->
  B.prototype.__proto__ === A.prototype ->
   A.prototype.__proto__ === Object.prototype ->
    Object.prototype.__proto__ === null
```

Über diese Kette kann `b` auf alle Eigenschaften zugreifen, die in einem dieser Objekte definiert sind. Die Methode `m` ist eine Eigenschaft von `B.prototype` — `B.prototype.m` — und aus diesem Grund funktioniert `b.m()`.

Nun können wir `super.x` innerhalb von `m` als Eigenschafts-Suche definieren, bei der wir anfangen, die Eigenschaft `x` im `__proto__` des *Home-Objekts* zu suchen und in der Prototypen-Kette nach oben gehen, bis wir sie finden.

Das Home-Objekt ist das Objekt, in dem die Methode definiert ist — in diesem Fall ist das Home-Objekt von `m` `B.prototype`. Sein `__proto__` ist `A.prototype`, also dort beginnen wir mit der Suche nach der Eigenschaft `x`. Wir nennen `A.prototype` das *Startobjekt der Suche*. In diesem Fall finden wir die Eigenschaft `x` sofort im Startobjekt der Suche, aber grundsätzlich könnte sie auch irgendwo weiter oben in der Prototypen-Kette liegen.

Wenn `B.prototype` eine Eigenschaft namens `x` hätte, würden wir sie ignorieren, da wir die Suche darüber in der Prototypen-Kette beginnen. Außerdem hängt in diesem Fall die `super`-Eigenschaftssuche nicht vom *Empfänger* ab — dem Objekt, das den `this`-Wert hat, wenn die Methode aufgerufen wird.

```javascript
B.prototype.m.call(some_other_object); // gibt immer noch 100 zurück
```

Falls die Eigenschaft jedoch einen Getter hat, wird der Empfänger an den Getter als `this`-Wert übergeben.

Zusammenfassend: Beim Zugriff auf eine `super`-Eigenschaft, `super.x`, ist das Startobjekt der Suche das `__proto__` des Home-Objekts und der Empfänger ist der Empfänger der Methode, in der der `super`-Eigenschaftszugriff stattfindet.

Bei einem normalen Eigenschaftszugriff, `o.x`, beginnen wir mit der Suche nach der Eigenschaft `x` in `o` und gehen die Prototypenkette nach oben. Wenn `x` einen Getter hat, verwenden wir auch `o` als Empfänger – das Startobjekt der Suche und der Empfänger sind dasselbe Objekt (`o`).

*Ein Super-Eigenschaftszugriff ist genau wie ein regulärer Eigenschaftszugriff, bei dem das Startobjekt der Suche und der Empfänger unterschiedlich sind.*

### Schnellere Implementierung von `super`

Die obige Erkenntnis ist auch der Schlüssel zur Implementierung eines schnellen Zugriffs auf Super-Eigenschaften. V8 ist bereits darauf ausgelegt, Eigenschaftszugriffe schnell zu machen – nun haben wir es für den Fall verallgemeinert, bei dem Empfänger und Startobjekt der Suche unterschiedlich sind.

Das datengetriebene Inline-Cache-System von V8 ist der Kern für die Implementierung eines schnellen Eigenschaftszugriffs. Sie können darüber in der [Einführung auf hoher Ebene](https://mathiasbynens.be/notes/shapes-ics) oder in den detaillierteren Beschreibungen der [Objektdarstellung von V8](https://v8.dev/blog/fast-properties) und [wie das datengetriebene Inline-Cache-System von V8 implementiert ist](https://docs.google.com/document/d/1mEhMn7dbaJv68lTAvzJRCQpImQoO6NZa61qRimVeA-k/edit?usp=sharing) lesen.

Um `super` zu beschleunigen, haben wir einen neuen [Ignition](https://v8.dev/docs/ignition)-Bytecode, `LdaNamedPropertyFromSuper`, hinzugefügt, der es uns ermöglicht, uns in das IC-System im Interpreted-Modus einzuklinken und auch optimierten Code für den Zugriff auf Super-Eigenschaften zu generieren.

Mit dem neuen Bytecode können wir ein neues IC, `LoadSuperIC`, hinzufügen, um das Laden von Super-Eigenschaften zu beschleunigen. Ähnlich wie `LoadIC`, das normale Eigenschaftsladungen bearbeitet, verfolgt `LoadSuperIC` die Formen der gesehenen Startobjekte der Suche und merkt sich, wie Eigenschaften aus Objekten geladen werden können, die eine dieser Formen haben.

`LoadSuperIC` verwendet die bestehende IC-Struktur für Eigenschaftsladungen wieder, nur mit einem anderen Startobjekt der Suche. Da in der IC-Schicht bereits zwischen dem Startobjekt der Suche und dem Empfänger unterschieden wird, hätte die Implementierung einfach sein sollen. Aber da das Startobjekt der Suche und der Empfänger immer identisch waren, gab es Fehler, bei denen wir das Startobjekt der Suche verwendeten, obwohl wir den Empfänger meinten, und umgekehrt. Diese Fehler wurden behoben, und wir unterstützen nun ordnungsgemäß Fälle, in denen das Startobjekt der Suche und der Empfänger unterschiedlich sind.

Optimierter Code für den Zugriff auf Super-Eigenschaften wird von der Phase `JSNativeContextSpecialization` des [TurboFan](https://v8.dev/docs/turbofan)-Compilers generiert. Die Implementierung verallgemeinert die bestehende Mechanik der Eigenschaftssuche ([`JSNativeContextSpecialization::ReduceNamedAccess`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/js-native-context-specialization.cc;l=1130)), um den Fall zu behandeln, bei dem der Empfänger und das Startobjekt der Suche unterschiedlich sind.

Der optimierte Code wurde noch effizienter, als wir das Home-Objekt aus der `JSFunction`, in der es gespeichert war, in den Klassenkontext verschoben. TurboFan bettet es jetzt nach Möglichkeit als Konstante in den optimierten Code ein.

## Andere Verwendungen von `super`

`super` innerhalb von Methoden literaler Objekte funktioniert genauso wie innerhalb von Methoden von Klassen und wird ähnlich optimiert.

```javascript
const myproto = {
  __proto__: { 'x': 100 },
  m() { return super.x; }
};
const o = { __proto__: myproto };
o.m(); // gibt 100 zurück
```

Natürlich gibt es Sonderfälle, für die wir keine Optimierung vorgenommen haben. Beispielsweise wird das Schreiben von Super-Eigenschaften (`super.x = ...`) nicht optimiert. Außerdem führt die Verwendung von Mixins dazu, dass die Zugriffsstelle megamorph wird, was zu einem langsameren Zugriff auf Super-Eigenschaften führt:

```javascript
function createMixin(base) {
  class Mixin extends base {
    m() { return super.m() + 1; }
    //                ^ diese Zugriffsstelle ist megamorph
  }
  return Mixin;
}

class Base {
  m() { return 0; }
}

const myClass = createMixin(
  createMixin(
    createMixin(
      createMixin(
        createMixin(Base)
      )
    )
  )
);
(new myClass()).m();
```

Es gibt noch Arbeit zu erledigen, um sicherzustellen, dass alle objektorientierten Muster so schnell wie möglich sind – bleiben Sie dran für weitere Optimierungen!
