---
title: "Finden von Elementen in `Array`s und TypedArrays"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu))"
avatars:
  - "shu-yu-guo"
date: 2021-10-27
tags:
  - ECMAScript
description: "JavaScript-Methoden zum Finden von Elementen in Arrays und TypedArrays"
tweet: "1453354998063149066"
---
## Elemente von Anfang an finden

Das Finden eines Elements, das eine bestimmte Bedingung in einem `Array` erfüllt, ist eine häufige Aufgabe und wird mit den Methoden `find` und `findIndex` von `Array.prototype` sowie den verschiedenen TypedArray-Prototypen durchgeführt. `Array.prototype.find` nimmt ein Prädikat und gibt das erste Element im Array zurück, für das dieses Prädikat `true` zurückgibt. Wenn das Prädikat für kein Element `true` zurückgibt, gibt die Methode `undefined` zurück.

<!--truncate-->
```js
const inputArray = [{v:1}, {v:2}, {v:3}, {v:4}, {v:5}];
inputArray.find((element) => element.v % 2 === 0);
// → {v:2}
inputArray.find((element) => element.v % 7 === 0);
// → undefined
```

`Array.prototype.findIndex` funktioniert ähnlich, außer dass es den Index zurückgibt, wenn das Element gefunden wird, und `-1`, wenn es nicht gefunden wird. Die TypedArray-Versionen von `find` und `findIndex` arbeiten genau gleich, mit dem einzigen Unterschied, dass sie auf TypedArray-Instanzen anstatt auf Array-Instanzen arbeiten.

```js
inputArray.findIndex((element) => element.v % 2 === 0);
// → 1
inputArray.findIndex((element) => element.v % 7 === 0);
// → -1
```

## Elemente vom Ende aus finden

Was ist, wenn Sie das letzte Element im `Array` finden möchten? Dieser Anwendungsfall tritt oft natürlich auf, z. B. wenn man mehrere Übereinstimmungen zugunsten des letzten Elements deduplizieren möchte oder im Voraus weiß, dass sich das Element wahrscheinlich am Ende des `Array` befindet. Mit der Methode `find` besteht eine Lösung darin, zunächst die Eingabe umzukehren, wie folgt:

```js
inputArray.reverse().find(predicate)
```

Dies kehrt jedoch das ursprüngliche `inputArray` an Ort und Stelle um, was manchmal unerwünscht ist.

Mit den Methoden `findLast` und `findLastIndex` kann dieser Anwendungsfall direkt und ergonomisch gelöst werden. Sie verhalten sich genau wie ihre Gegenstücke `find` und `findIndex`, außer dass sie ihre Suche vom Ende des `Array` oder TypedArray aus starten.

```js
const inputArray = [{v:1}, {v:2}, {v:3}, {v:4}, {v:5}];
inputArray.findLast((element) => element.v % 2 === 0);
// → {v:4}
inputArray.findLast((element) => element.v % 7 === 0);
// → undefined
inputArray.findLastIndex((element) => element.v % 2 === 0);
// → 3
inputArray.findLastIndex((element) => element.v % 7 === 0);
// → -1
```

## Unterstützung von `findLast` und `findLastIndex`

<feature-support chrome="97"
                 firefox="no https://bugzilla.mozilla.org/show_bug.cgi?id=1704385"
                 safari="partial https://bugs.webkit.org/show_bug.cgi?id=227939"
                 nodejs="no"
                 babel="yes https://github.com/zloirock/core-js#array-find-from-last"></feature-support>
