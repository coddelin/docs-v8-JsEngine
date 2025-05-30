---
title: "Iterator-Helfer"
author: "Rezvan Mahdavi Hezaveh"
avatars: 
  - "rezvan-mahdavi-hezaveh"
date: 2024-03-27
tags: 
  - ECMAScript
description: "Schnittstellen, die bei der allgemeinen Nutzung und Verarbeitung von Iteratoren helfen."
tweet: ""
---

*Iterator-Helfer* sind eine Sammlung neuer Methoden auf dem Iterator-Prototyp, die bei der allgemeinen Verwendung von Iteratoren helfen. Da sich diese Hilfsmethoden auf dem Iterator-Prototyp befinden, erhalten alle Objekte, die `Iterator.prototype` in ihrer Prototypenkette haben (z. B. Array-Iteratoren), diese Methoden. In den folgenden Abschnitten erklären wir die Iterator-Helfer. Alle bereitgestellten Beispiele funktionieren auf einer Blog-Archivseite, die eine Liste von Blog-Beiträgen enthält, und veranschaulichen, wie Iterator-Helfer beim Finden und Bearbeiten der Beiträge hilfreich sind. Sie können sie auf der [V8-Blogseite](https://v8.dev/blog) ausprobieren!

<!--truncate-->

## .map(mapperFn)

`map` nimmt eine Mapperfunktion als Argument an. Diese Hilfsmethode gibt einen Iterator von Werten zurück, bei denen die Mapperfunktion auf die ursprünglichen Iteratorwerte angewendet wurde.

```javascript
// Wählen Sie die Liste der Blog-Beiträge von einer Blog-Archivseite aus.
const posts = document.querySelectorAll('li:not(header li)');

// Holen Sie die Liste der Beiträge, geben Sie eine Liste ihres Textinhalts (Titel) zurück und protokollieren Sie sie.
for (const post of posts.values().map((x) => x.textContent)) {
  console.log(post);
}
```

## .filter(filtererFn)

`filter` nimmt eine Filterfunktion als Argument an. Diese Hilfsmethode gibt einen Iterator von Werten aus dem ursprünglichen Iterator zurück, für die die Filterfunktion einen wahrheitswertigen Wert zurückgab.

```javascript
// Wählen Sie die Liste der Blog-Beiträge von einer Blog-Archivseite aus.
const posts = document.querySelectorAll('li:not(header li)');

// Filtern Sie Blog-Beiträge, die `V8` in ihrem Textinhalt (Titel) enthalten, und protokollieren Sie sie.
for (const post of posts.values().filter((x) => x.textContent.includes('V8'))) {
  console.log(post);
} 
```

## .take(limit)

`take` nimmt eine Ganzzahl als Argument. Diese Hilfsmethode gibt einen Iterator von Werten aus dem ursprünglichen Iterator zurück, bis zu `limit` Werten.

```javascript
// Wählen Sie die Liste der Blog-Beiträge von einer Blog-Archivseite aus.
const posts = document.querySelectorAll('li:not(header li)');

// Wählen Sie 10 aktuelle Blog-Beiträge aus und protokollieren Sie sie.
for (const post of posts.values().take(10)) {
  console.log(post);
}
```

## .drop(limit)

`drop` nimmt eine Ganzzahl als Argument. Diese Hilfsmethode gibt einen Iterator von Werten aus dem ursprünglichen Iterator zurück, beginnend mit dem Wert nach den `limit` Werten.

```javascript
// Wählen Sie die Liste der Blog-Beiträge von einer Blog-Archivseite aus.
const posts = document.querySelectorAll('li:not(header li)');

// Überspringen Sie 10 aktuelle Blog-Beiträge und protokollieren Sie den Rest.
for (const post of posts.values().drop(10)) {
  console.log(post);
}
```

## .flatMap(mapperFn)

`flatMap` nimmt eine Mapperfunktion als Argument an. Diese Hilfsmethode gibt einen Iterator der Werte der Iteratoren zurück, die durch Anwenden der Mapperfunktion auf die ursprünglichen Iteratorwerte erzeugt werden. Das heißt, die Iteratoren, die von der Mapperfunktion zurückgegeben werden, werden zu einem Iterator zusammengeführt, der von dieser Hilfsmethode zurückgegeben wird.

```javascript
// Wählen Sie die Liste der Blog-Beiträge von einer Blog-Archivseite aus.
const posts = document.querySelectorAll('li:not(header li)');

// Holen Sie die Liste der Tags der Blog-Beiträge und protokollieren Sie sie. Jeder Beitrag kann mehr als
// ein Tag haben.
for (const tag of posts.values().flatMap((x) => x.querySelectorAll('.tag').values())) {
    console.log(tag.textContent);
}
```

## .reduce(reducer [, initialValue ])

`reduce` nimmt eine Reduzierfunktion und einen optionalen Anfangswert. Diese Hilfsmethode gibt einen Wert als Ergebnis der Anwendung der Reduzierfunktion auf jeden Wert des Iterators zurück, wobei der letzte Rückgabewert der Reduzierfunktion beibehalten wird. Der Anfangswert wird als Ausgangspunkt für die Reduzierfunktion verwendet, wenn sie den ersten Wert des Iterators verarbeitet.

```javascript
// Wählen Sie die Liste der Blog-Beiträge von einer Blog-Archivseite aus.
const posts = document.querySelectorAll('li:not(header li)');

// Holen Sie die Liste der Tags für alle Beiträge.
const tagLists = posts.values().flatMap((x) => x.querySelectorAll('.tag').values());

// Holen Sie den Textinhalt für jedes Tag in der Liste.
const tags = tagLists.map((x) => x.textContent);

// Zählt Beiträge mit dem Tag 'security'.
const count = tags.reduce((sum , value) => sum + (value === 'security' ? 1 : 0), 0);
console.log(count);
```

## .toArray()

`toArray` gibt ein Array aus den Iteratorwerten zurück.

```javascript
// Wählen Sie die Liste der Blog-Beiträge von einer Blog-Archivseite aus.
const posts = document.querySelectorAll('li:not(header li)');

// Erstellen Sie ein Array aus der Liste von 10 aktuellen Blog-Beiträgen.
const arr = posts.values().take(10).toArray();
```

## .forEach(fn)

`forEach` nimmt eine Funktion als Argument und wird auf jedes Element des Iterators angewendet. Diese Hilfsmethode wird wegen ihrer Nebenwirkungen aufgerufen und gibt `undefined` zurück.

```javascript
// Wählen Sie die Liste der Blog-Beiträge von einer Blog-Archivseite aus.
const posts = document.querySelectorAll('li:not(header li)');

// Holen Sie sich die Daten, an denen mindestens ein Blogbeitrag veröffentlicht wurde, und loggen Sie sie.
const dates = new Set();
const forEach = posts.values().forEach((x) => dates.add(x.querySelector('time')));
console.log(dates);
```

## .some(fn)

`some` nimmt eine Prädikatfunktion als Argument. Dieser Helfer gibt `true` zurück, wenn ein beliebiges Iterator-Element `true` ausgibt, wenn die Funktion darauf angewendet wird. Der Iterator wird nach dem Aufruf von `some` verbraucht.

```javascript
// Wählen Sie die Liste der Blogbeiträge von einer Blog-Archiv-Seite aus.
const posts = document.querySelectorAll('li:not(header li)');

// Finden Sie heraus, ob der Textinhalt (Titel) eines Blogbeitrags das Schlüsselwort `Iterators` enthält.
// Schlüsselwort.
posts.values().some((x) => x.textContent.includes('Iterators'));
```

## .every(fn)

`every` nimmt eine Prädikatfunktion als Argument. Dieser Helfer gibt `true` zurück, wenn jedes Iterator-Element `true` ausgibt, wenn die Funktion darauf angewendet wird. Der Iterator wird nach dem Aufruf von `every` verbraucht.

```javascript
// Wählen Sie die Liste der Blogbeiträge von einer Blog-Archiv-Seite aus.
const posts = document.querySelectorAll('li:not(header li)');

// Finden Sie heraus, ob der Textinhalt (Titel) aller Blogbeiträge das Schlüsselwort `V8` enthält.
posts.values().every((x) => x.textContent.includes('V8'));
```

## .find(fn)

`find` nimmt eine Prädikatfunktion als Argument. Dieser Helfer gibt den ersten Wert des Iterators zurück, für den die Funktion einen Wahrheitswert ausgibt, oder `undefined`, wenn kein Wert des Iterators dies tut.

```javascript
// Wählen Sie die Liste der Blogbeiträge von einer Blog-Archiv-Seite aus.
const posts = document.querySelectorAll('li:not(header li)');

// Loggen Sie den Textinhalt (Titel) des aktuellen Blogbeitrags, der das Schlüsselwort `V8` enthält.
console.log(posts.values().find((x) => x.textContent.includes('V8')).textContent);
```

## Iterator.from(object)

`from` ist eine statische Methode und nimmt ein Objekt als Argument. Wenn das `object` bereits eine Instanz von Iterator ist, gibt der Helfer es direkt zurück. Wenn das `object` `Symbol.iterator` hat, was bedeutet, dass es iterabel ist, wird seine `Symbol.iterator`-Methode aufgerufen, um den Iterator zu erhalten, und der Helfer gibt ihn zurück. Ansonsten wird ein neues `Iterator`-Objekt (das vom `Iterator.prototype` erbt und `next()` und `return()`-Methoden hat) erstellt, das das `object` umschließt und von diesem Helfer zurückgegeben wird.

```javascript
// Wählen Sie die Liste der Blogbeiträge von einer Blog-Archiv-Seite aus.
const posts = document.querySelectorAll('li:not(header li)');

// Zuerst erstellen Sie einen Iterator aus den Beiträgen. Dann loggen Sie den Textinhalt (Titel) des aktuellen Blogbeitrags, der das Schlüsselwort `V8` enthält.
console.log(Iterator.from(posts).find((x) => x.textContent.includes('V8')).textContent);
```

## Verfügbarkeit

Iterator-Helfer sind in V8 v12.2 verfügbar.

## Unterstützung für Iterator-Helfer

<feature-support chrome="122 https://chromestatus.com/feature/5102502917177344"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1568906"
                 safari="no https://bugs.webkit.org/show_bug.cgi?id=248650" 
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#iterator-helpers"></feature-support>
