---
title: "Optimierung von Hashtabellen: Verbergen des Hashcodes"
author: "[Sathya Gunasekaran](https://twitter.com/_gsathya), Hüter der Hashcodes"
avatars: 
  - "sathya-gunasekaran"
date: "2018-01-29 13:33:37"
tags: 
  - internals
tweet: "958046113390411776"
description: "Mehrere JavaScript-Datenstrukturen wie Map, Set, WeakSet und WeakMap verwenden unter der Haube Hashtabellen. Dieser Artikel erklärt, wie V8 v6.3 die Leistung von Hashtabellen verbessert."
---
ECMAScript 2015 führte mehrere neue Datenstrukturen wie Map, Set, WeakSet und WeakMap ein, die alle unter der Haube Hashtabellen verwenden. Dieser Beitrag beschreibt die [jüngsten Verbesserungen](https://bugs.chromium.org/p/v8/issues/detail?id=6404) in der Art und Weise, wie [V8 v6.3+](/blog/v8-release-63) die Schlüssel in Hashtabellen speichert.

<!--truncate-->
## Hashcode

Eine [_Hashfunktion_](https://de.wikipedia.org/wiki/Hashfunktion) wird verwendet, um einen gegebenen Schlüssel auf einen Ort in der Hashtabelle abzubilden. Ein _Hashcode_ ist das Ergebnis des Aufrufs dieser Hashfunktion mit einem bestimmten Schlüssel.

In V8 ist der Hashcode einfach eine Zufallszahl, unabhängig vom Objektwert. Daher können wir ihn nicht neu berechnen, was bedeutet, dass wir ihn speichern müssen.

Für JavaScript-Objekte, die als Schlüssel verwendet wurden, wurde der Hashcode zuvor als privates Symbol am Objekt gespeichert. Ein privates Symbol in V8 ist ähnlich wie ein [`Symbol`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol), außer dass es nicht aufzählbar ist und nicht in benutzerseitiges JavaScript gelangt.

```js
function GetObjectHash(key) {
  let hash = key[hashCodeSymbol];
  if (IS_UNDEFINED(hash)) {
    hash = (MathRandom() * 0x40000000) | 0;
    if (hash === 0) hash = 1;
    key[hashCodeSymbol] = hash;
  }
  return hash;
}
```

Dies funktionierte gut, da wir keinen Speicherplatz für ein Hashcode-Feld reservieren mussten, bis das Objekt zu einer Hashtabelle hinzugefügt wurde, woraufhin ein neues privates Symbol am Objekt gespeichert wurde.

V8 konnte auch die Suche nach dem Hashcode-Symbol wie jede andere Eigenschaftensuche mit dem IC-System optimieren, was sehr schnelle Suchvorgänge für den Hashcode ermöglichte. Dies funktioniert gut für [monomorphe IC-Suchen](https://de.wikipedia.org/wiki/Inline_caching#Monomorphes_inline_caching), wenn die Schlüssel die gleiche [versteckte Klasse](/) haben. Jedoch folgt der meiste Code in der realen Welt nicht diesem Muster, und oft haben die Schlüssel unterschiedliche versteckte Klassen, was zu langsamen [megamorphen IC-Suchen](https://de.wikipedia.org/wiki/Inline_caching#Megamorphen_inline_caching) des Hashcodes führt.

Ein weiteres Problem mit dem Ansatz des privaten Symbols war, dass es eine [Übergangszeit der versteckten Klasse](/#fast-property-access) im Schlüssel beim Speichern des Hashcodes auslöste. Dies führte nicht nur zu schlechtem polymorphem Code für die Hashcode-Suche, sondern auch für andere Eigenschaftensuchen am Schlüssel und zu [Deoptimierungen](https://floitsch.blogspot.com/2012/03/optimizing-for-v8-inlining.html) von optimiertem Code.

## Backing-Stores von JavaScript-Objekten

Ein JavaScript-Objekt (`JSObject`) in V8 verwendet zwei Wörter (neben seinem Header): ein Wort zur Speicherung eines Zeigers auf den Elemente-Backing-Store und ein anderes Wort zur Speicherung eines Zeigers auf den Eigenschaften-Backing-Store.

Der Elemente-Backing-Store wird verwendet, um Eigenschaften zu speichern, die wie [Array-Indizes](https://tc39.es/ecma262/#sec-array-index) aussehen, während der Eigenschaften-Backing-Store für die Speicherung von Eigenschaften verwendet wird, deren Schlüssel Zeichenketten oder Symbole sind. Weitere Informationen zu diesen Backing-Stores finden Sie in diesem [V8-Blogbeitrag](/blog/fast-properties) von Camillo Bruni.

```js
const x = {};
x[1] = 'bar';      // ← gespeichert in Elemente
x['foo'] = 'bar';  // ← gespeichert in Eigenschaften
```

## Verbergen des Hashcodes

Die einfachste Lösung zum Speichern des Hashcodes wäre, die Größe eines JavaScript-Objekts um ein Wort zu erweitern und den Hashcode direkt am Objekt zu speichern. Dies würde jedoch Speicherplatz für Objekte verschwenden, die nicht zu einer Hashtabelle hinzugefügt werden. Stattdessen könnten wir versuchen, den Hashcode im Elemente-Store oder Eigenschaften-Store zu speichern.

Der Elemente-Backing-Store ist ein Array, das seine Länge und alle Elemente enthält. Hier gibt es nicht viel zu tun, da das Speichern des Hashcodes in einem reservierten Slot (wie dem 0. Index) trotzdem Speicherplatz verschwendet, wenn wir das Objekt nicht als Schlüssel in einer Hashtabelle verwenden.

Schauen wir uns den Eigenschaften-Backing-Store an. Es gibt zwei Arten von Datenstrukturen, die als Eigenschaften-Backing-Store verwendet werden: Arrays und Wörterbücher.

Im Gegensatz zum im Elemente-Backing-Store verwendeten Array, das kein oberes Limit hat, hat das im Eigenschaften-Backing-Store verwendete Array ein oberes Limit von 1022 Werten. V8 wechselt bei Überschreitung dieses Limits aus Leistungsgründen zur Verwendung eines Wörterbuchs. (Ich vereinfache dies ein wenig – V8 kann auch in anderen Fällen ein Wörterbuch verwenden, aber es gibt ein festes oberes Limit für die Anzahl der Werte, die im Array gespeichert werden können.)

Die drei möglichen Zustände für den Eigenschaften-Backing-Store sind:

1. leer (keine Eigenschaften)
2. Array (kann bis zu 1022 Werte speichern)
3. Wörterbuch

Lassen Sie uns jedes einzelne besprechen.

### Der Eigenschaftenspeicher ist leer

Im leeren Fall können wir den Hashcode direkt in diesem Offset auf dem `JSObject` speichern.

![](/_img/hash-code/properties-backing-store-empty.png)

### Der Eigenschaftenspeicher ist ein Array

V8 stellt Ganzzahlen kleiner als 2<sup>31</sup> (auf 32-Bit-Systemen) unverpackt als [Smi](https://wingolog.org/archives/2011/05/18/value-representation-in-javascript-implementations) dar. Bei einem Smi ist das niederwertigste Bit ein Tag, das zur Unterscheidung von Zeigern verwendet wird, während die verbleibenden 31 Bits den tatsächlichen Ganzzahlwert enthalten.

Normalerweise speichern Arrays ihre Länge als Smi. Da wir wissen, dass die maximale Kapazität dieses Arrays nur 1022 beträgt, benötigen wir nur 10 Bits, um die Länge zu speichern. Die verbleibenden 21 Bits können wir verwenden, um den Hashcode zu speichern!

![](/_img/hash-code/properties-backing-store-array.png)

### Der Eigenschaftenspeicher ist ein Wörterbuch

Im Wörterbuchfall vergrößern wir die Wörterbuchgröße um 1 Wort, um den Hashcode in einem eigenen Feld am Anfang des Wörterbuchs zu speichern. Wir nehmen in diesem Fall möglicherweise eine Speicherplatzverschwendung in Kauf, da der proportionale Größenzuwachs nicht so groß ist wie im Array-Fall.

![](/_img/hash-code/properties-backing-store-dictionary.png)

Mit diesen Änderungen muss die Hashcode-Abfrage nicht mehr die komplexen JavaScript-Eigenschaftsabfragen durchlaufen.

## Leistungsverbesserungen

Der [SixSpeed](https://github.com/kpdecker/six-speed)-Benchmark verfolgt die Leistung von Map und Set, und diese Änderungen führten zu einer Verbesserung von ~500%.

![](/_img/hash-code/sixspeed.png)

Diese Änderung führte auch zu einer 5%igen Verbesserung beim Basic-Benchmark in [ARES6](https://webkit.org/blog/7536/jsc-loves-es6/).

![](/_img/hash-code/ares-6.png)

Dies führte außerdem zu einer 18%igen Verbesserung in einem der Benchmarks der [Emberperf](http://emberperf.eviltrout.com/)-Benchmark-Suite, die Ember.js testet.

![](/_img/hash-code/emberperf.jpg)
