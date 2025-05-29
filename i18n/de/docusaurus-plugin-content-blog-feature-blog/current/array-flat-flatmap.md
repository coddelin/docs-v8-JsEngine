---
title: &apos;`Array.prototype.flat` und `Array.prototype.flatMap`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2019-06-11
tags:
  - ECMAScript
  - ES2019
  - io19
description: &apos;Array.prototype.flat reduziert ein Array bis zur angegebenen Tiefe. Array.prototype.flatMap entspricht einem Map gefolgt von einem separaten Flat.&apos;
tweet: &apos;1138457106380709891&apos;
---
## `Array.prototype.flat`

Das Array in diesem Beispiel ist mehrere Ebenen tief: Es enthält ein Array, das wiederum ein weiteres Array enthält.

```js
const array = [1, [2, [3]]];
//            ^^^^^^^^^^^^^ äußeres Array
//                ^^^^^^^^  inneres Array
//                    ^^^   innerstes Array
```

`Array#flat` gibt eine reduzierte Version eines gegebenen Arrays zurück.

```js
array.flat();
// → [1, 2, [3]]

// …entspricht folgendem:
array.flat(1);
// → [1, 2, [3]]
```

Die Standardtiefe ist `1`, aber Sie können jede Zahl übergeben, um rekursiv bis zu dieser Tiefe zu reduzieren. Um rekursiv zu reduzieren, bis das Ergebnis keine verschachtelten Arrays mehr enthält, geben wir `Infinity` weiter.

```js
// Rekursiv reduzieren, bis das Array keine verschachtelten Arrays mehr enthält:
array.flat(Infinity);
// → [1, 2, 3]
```

Warum heißt diese Methode `Array.prototype.flat` und nicht `Array.prototype.flatten`? [Lesen Sie unseren Bericht zu #SmooshGate, um es herauszufinden!](https://developers.google.com/web/updates/2018/03/smooshgate)

## `Array.prototype.flatMap`

Hier ist ein weiteres Beispiel. Wir haben eine Funktion `duplicate`, die einen Wert nimmt und ein Array zurückgibt, das diesen Wert zweimal enthält. Wenn wir `duplicate` auf jeden Wert in einem Array anwenden, erhalten wir ein verschachteltes Array.

```js
const duplicate = (x) => [x, x];

[2, 3, 4].map(duplicate);
// → [[2, 2], [3, 3], [4, 4]]
```

Sie können dann `flat` auf das Ergebnis aufrufen, um das Array zu reduzieren:

```js
[2, 3, 4].map(duplicate).flat(); // 🐌
// → [2, 2, 3, 3, 4, 4]
```

Da dieses Muster in der funktionalen Programmierung so häufig vorkommt, gibt es jetzt eine eigene Methode `flatMap` dafür.

```js
[2, 3, 4].flatMap(duplicate); // 🚀
// → [2, 2, 3, 3, 4, 4]
```

`flatMap` ist ein wenig effizienter, als `map` gefolgt von einem separaten `flat` zu verwenden.

Interessiert an Anwendungsfällen für `flatMap`? Schauen Sie sich [Axel Rauschmayers Erklärung](https://exploringjs.com/impatient-js/ch_arrays.html#flatmap-mapping-to-zero-or-more-values) an.

## Unterstützung für `Array#{flat,flatMap}`

<feature-support chrome="69 /blog/v8-release-69#javascript-language-features"
                 firefox="62"
                 safari="12"
                 nodejs="11"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-array"></feature-support>
