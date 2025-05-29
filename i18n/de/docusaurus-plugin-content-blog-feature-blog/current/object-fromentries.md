---
title: "`Object.fromEntries`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)), JavaScript-Zauberer"
avatars:
  - "mathias-bynens"
date: 2019-06-18
tags:
  - ECMAScript
  - ES2019
  - io19
description: "Object.fromEntries ist eine nützliche Ergänzung zur eingebauten JavaScript-Bibliothek, die Object.entries ergänzt."
tweet: "1140993821897121796"
---
`Object.fromEntries` ist eine nützliche Ergänzung zur eingebauten JavaScript-Bibliothek. Bevor erklärt wird, was es tut, hilft es, die bereits vorhandene API `Object.entries` zu verstehen.

## `Object.entries`

Die `Object.entries`-API existiert schon seit einiger Zeit.

<feature-support chrome="54"
                 firefox="47"
                 safari="10.1"
                 nodejs="7"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-object"></feature-support>

Für jedes Schlüssel-Wert-Paar in einem Objekt liefert `Object.entries` ein Array, bei dem das erste Element der Schlüssel und das zweite Element der Wert ist.

`Object.entries` ist besonders nützlich in Kombination mit `for`-`of`, da es ermöglicht, sehr elegant über alle Schlüssel-Wert-Paare in einem Objekt zu iterieren:

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]

for (const [key, value] of entries) {
  console.log(`Der Wert von ${key} ist ${value}.`);
}
// Ausgabe:
// Der Wert von x ist 42.
// Der Wert von y ist 50.
```

Leider gibt es keinen einfachen Weg, um aus dem Ergebnis von entries wieder ein äquivalentes Objekt zu erzeugen… bis jetzt!

## `Object.fromEntries`

Die neue API `Object.fromEntries` führt das Umkehrverfahren von `Object.entries` durch. Dies erleichtert die Rekonstruktion eines Objekts basierend auf seinen Einträgen:

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]

const result = Object.fromEntries(entries);
// → { x: 42, y: 50 }
```

Ein üblicher Anwendungsfall ist das Transformieren von Objekten. Dies können Sie jetzt tun, indem Sie über deren Einträge iterieren und dann Methoden für Arrays verwenden, die Ihnen möglicherweise schon bekannt sind:

```js
const object = { x: 42, y: 50, abc: 9001 };
const result = Object.fromEntries(
  Object.entries(object)
    .filter(([ key, value ]) => key.length === 1)
    .map(([ key, value ]) => [ key, value * 2 ])
);
// → { x: 84, y: 100 }
```

In diesem Beispiel filtern wir mit `filter` das Objekt, um nur Schlüssel der Länge `1` zu erhalten, das heißt, nur die Schlüssel `x` und `y`, nicht jedoch den Schlüssel `abc`. Wir verwenden dann `map`, um über die verbleibenden Einträge zu iterieren und ein aktualisiertes Schlüssel-Wert-Paar für jeden zurückzugeben. In diesem Beispiel verdoppeln wir jeden Wert, indem wir ihn mit `2` multiplizieren. Das Endergebnis ist ein neues Objekt mit nur den Eigenschaften `x` und `y` und den neuen Werten.

<!--truncate-->
## Objekte vs. Maps

JavaScript unterstützt auch `Map`s, die oft eine geeignetere Datenstruktur als reguläre Objekte sind. In Code, den Sie vollständig kontrollieren, könnten Sie daher Maps anstelle von Objekten verwenden. Aber als Entwickler können Sie nicht immer die Darstellung bestimmen. Manchmal stammen die Daten, die Sie verwenden, aus einer externen API oder einer Bibliotheksfunktion, die Ihnen ein Objekt anstelle einer Map gibt.

`Object.entries` machte es einfach, Objekte in Maps zu konvertieren:

```js
const object = { language: 'JavaScript', coolness: 9001 };

// Das Objekt in eine Map umwandeln:
const map = new Map(Object.entries(object));
```

Der Umkehrfall ist genauso nützlich: Selbst wenn Ihr Code Maps verwendet, müssen Sie Ihre Daten möglicherweise irgendwann serialisieren, z. B. um sie in JSON zu konvertieren, um eine API-Anfrage zu senden. Oder vielleicht müssen Sie die Daten an eine andere Bibliothek übergeben, die ein Objekt anstelle einer Map erwartet. In diesen Fällen müssen Sie ein Objekt basierend auf den Map-Daten erstellen. `Object.fromEntries` macht dies trivial:

```js
// Die Map zurück in ein Objekt umwandeln:
const objectCopy = Object.fromEntries(map);
// → { language: 'JavaScript', coolness: 9001 }
```

Mit sowohl `Object.entries` als auch `Object.fromEntries` in der Sprache können Sie jetzt problemlos zwischen Maps und Objekten konvertieren.

### Warnung: Datenverlust beachten

Wenn Sie Maps wie im obigen Beispiel in einfache Objekte umwandeln, gibt es eine implizite Annahme, dass jeder Schlüssel eindeutig serialisiert wird. Wenn diese Annahme nicht zutrifft, kommt es zu Datenverlust:

```js
const map = new Map([
  [{}, 'a'],
  [{}, 'b'],
]);
Object.fromEntries(map);
// → { '[object Object]': 'b' }
// Hinweis: Der Wert 'a' ist nicht mehr auffindbar, da beide Schlüssel
// zum gleichen Wert '[object Object]' serialisiert werden.
```

Vor der Verwendung von `Object.fromEntries` oder einer anderen Technik, um eine Map in ein Objekt umzuwandeln, stellen Sie sicher, dass die Schlüssel der Map eindeutige `toString`-Ergebnisse erzeugen.

## Unterstützung für `Object.fromEntries`

<feature-support chrome="73 /blog/v8-release-73#object.fromentries"
                 firefox="63"
                 safari="12.1"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-object"></feature-support>
