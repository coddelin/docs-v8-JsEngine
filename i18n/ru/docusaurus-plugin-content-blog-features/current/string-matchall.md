---
title: "`String.prototype.matchAll`"
author: "Матиас Биненс ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2019-02-02
tags: 
  - ECMAScript
  - ES2020
  - io19
description: "String.prototype.matchAll делает проще итерацию по всем объектам совпадения от заданного регулярного выражения."
---
Часто нужно повторно применять одно и то же регулярное выражение к строке, чтобы получить все совпадения. В некоторой степени это уже возможно с помощью метода `String#match`.

В этом примере мы найдем все слова, состоящие только из шестнадцатеричных символов, а затем выведем каждое совпадение:

```js
const string = 'Magic hex numbers: DEADBEEF CAFE';
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
for (const match of string.match(regex)) {
  console.log(match);
}

// Результат:
//
// 'DEADBEEF'
// 'CAFE'
```

Однако это дает только _подстроки_, которые соответствуют. Обычно требуется не только подстроки, но и дополнительная информация, такая как индекс каждой подстроки или группы захвата внутри каждого совпадения.

Уже сейчас можно достичь этого, написав собственный цикл и ведя учет объектов совпадений вручную, но это немного неудобно и не очень удобно:

```js
const string = 'Magic hex numbers: DEADBEEF CAFE';
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
let match;
while (match = regex.exec(string)) {
  console.log(match);
}

// Результат:
//
// [ 'DEADBEEF', index: 19, input: 'Magic hex numbers: DEADBEEF CAFE' ]
// [ 'CAFE',     index: 28, input: 'Magic hex numbers: DEADBEEF CAFE' ]
```

Новый API `String#matchAll` делает это проще, чем когда-либо: теперь вы можете написать простой цикл `for`-`of`, чтобы получить все объекты совпадений.

```js
const string = 'Magic hex numbers: DEADBEEF CAFE';
const regex = /\b\p{ASCII_Hex_Digit}+\b/gu;
for (const match of string.matchAll(regex)) {
  console.log(match);
}

// Результат:
//
// [ 'DEADBEEF', index: 19, input: 'Magic hex numbers: DEADBEEF CAFE' ]
// [ 'CAFE',     index: 28, input: 'Magic hex numbers: DEADBEEF CAFE' ]
```

`String#matchAll` особенно полезен для регулярных выражений с группами захвата. Он предоставляет полную информацию для каждого отдельного совпадения, включая группы захвата.

```js
const string = 'Favorite GitHub repos: tc39/ecma262 v8/v8.dev';
const regex = /\b(?<owner>[a-z0-9]+)\/(?<repo>[a-z0-9\.]+)\b/g;
for (const match of string.matchAll(regex)) {
  console.log(`${match[0]} на ${match.index} в '${match.input}'`);
  console.log(`→ владелец: ${match.groups.owner}`);
  console.log(`→ репо: ${match.groups.repo}`);
}

<!--truncate-->
// Результат:
//
// tc39/ecma262 на 23 в 'Favorite GitHub repos: tc39/ecma262 v8/v8.dev'
// → владелец: tc39
// → репо: ecma262
// v8/v8.dev на 36 в 'Favorite GitHub repos: tc39/ecma262 v8/v8.dev'
// → владелец: v8
// → репо: v8.dev
```

Главная идея заключается в том, что вы просто пишете простой цикл `for`-`of`, а `String#matchAll` берет на себя остальное.

:::note
**Примечание:** Как следует из названия, `String#matchAll` предназначен для итерации по _всем_ объектам совпадений. Следовательно, его следует использовать с глобальными регулярными выражениями, то есть с установленным флагом `g`, так как любые неглобальные регулярные выражения дадут только одно совпадение (максимум). Вызов `matchAll` с неглобальным регулярным выражением приводит к исключению `TypeError`.
:::

## Поддержка `String.prototype.matchAll`

<feature-support chrome="73 /blog/v8-release-73#string.prototype.matchall"
                 firefox="67"
                 safari="13"
                 nodejs="12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-string-and-regexp"></feature-support>
