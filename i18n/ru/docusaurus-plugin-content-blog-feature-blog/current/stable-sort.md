---
title: "Стабильная `Array.prototype.sort`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2019-07-02
tags:
  - ECMAScript
  - ES2019
  - io19
description: "Теперь гарантируется стабильность Array.prototype.sort."
tweet: "1146067251302244353"
---
Допустим, у вас есть массив собак, где каждая собака имеет имя и рейтинг. (Если это кажется странным примером, знайте, что существует аккаунт в Twitter, который специализируется именно на этом… Не спрашивайте!)

```js
// Обратите внимание, что массив предварительно отсортирован по алфавиту по `name`.
const doggos = [
  { name: 'Abby',   rating: 12 },
  { name: 'Bandit', rating: 13 },
  { name: 'Choco',  rating: 14 },
  { name: 'Daisy',  rating: 12 },
  { name: 'Elmo',   rating: 12 },
  { name: 'Falco',  rating: 13 },
  { name: 'Ghost',  rating: 14 },
];
// Сортируем собак по рейтингу в порядке убывания.
// (Это обновляет `doggos` на месте.)
doggos.sort((a, b) => b.rating - a.rating);
```

<!--truncate-->
Массив предварительно отсортирован по алфавиту по имени. Чтобы сортировать по рейтингу (чтобы сначала получить собак с самым высоким рейтингом), мы используем `Array#sort`, передавая пользовательский колбэк, который сравнивает рейтинги. Вот результат, который вы, вероятно, ожидаете:

```js
[
  { name: 'Choco',  rating: 14 },
  { name: 'Ghost',  rating: 14 },
  { name: 'Bandit', rating: 13 },
  { name: 'Falco',  rating: 13 },
  { name: 'Abby',   rating: 12 },
  { name: 'Daisy',  rating: 12 },
  { name: 'Elmo',   rating: 12 },
]
```

Собаки сортируются по рейтингу, но внутри каждого рейтинга они все еще отсортированы по алфавиту по имени. Например, Choco и Ghost имеют одинаковый рейтинг 14, но Choco появляется перед Ghost в результате сортировки, потому что это тот порядок, который они имели в исходном массиве.

Однако, чтобы получить этот результат, движок JavaScript не может просто использовать _любой_ алгоритм сортировки — он должен быть так называемой «стабильной сортировкой». Долгое время спецификация JavaScript не требовала стабильности сортировки для `Array#sort` и оставляла это на усмотрение реализации. И поскольку это поведение не было определено, вы также могли получить этот результат, где Ghost неожиданно появляется перед Choco:

```js
[
  { name: 'Ghost',  rating: 14 }, // 😢
  { name: 'Choco',  rating: 14 }, // 😢
  { name: 'Bandit', rating: 13 },
  { name: 'Falco',  rating: 13 },
  { name: 'Abby',   rating: 12 },
  { name: 'Daisy',  rating: 12 },
  { name: 'Elmo',   rating: 12 },
]
```

Другими словами, разработчики JavaScript не могли полагаться на стабильность сортировки. На практике ситуация была еще более раздражающей, так как некоторые движки JavaScript использовали стабильную сортировку для коротких массивов и нестабильную сортировку для больших массивов. Это было действительно сбивающим с толку, так как разработчики тестировали свой код, видели стабильный результат, но внезапно получали нестабильный результат в продакшене, когда массив немного увеличивался.

Но есть хорошие новости. Мы [предложили изменение в спецификации](https://github.com/tc39/ecma262/pull/1340), которое делает `Array#sort` стабильным, и оно было принято. Все основные движки JavaScript теперь реализуют стабильную `Array#sort`. Это просто еще одна вещь, о которой не нужно беспокоиться как разработчику JavaScript. Отлично!

(О, и [мы сделали то же самое для `TypedArray`](https://github.com/tc39/ecma262/pull/1433): теперь эта сортировка тоже стабильная.)

:::note
**Примечание:** Хотя стабильность теперь требуется в соответствии со спецификацией, движки JavaScript по-прежнему могут использовать любой алгоритм сортировки, который они предпочитают. [V8 использует Timsort](/blog/array-sort#timsort), например. Спецификация не предписывает какой-либо конкретный алгоритм сортировки.
:::

## Поддержка функции

### Стабильная `Array.prototype.sort`

<feature-support chrome="70 /blog/v8-release-70#javascript-language-features"
                 firefox="yes"
                 safari="yes"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-array"></feature-support>

### Стабильная `%TypedArray%.prototype.sort`

<feature-support chrome="74 https://bugs.chromium.org/p/v8/issues/detail?id=8567"
                 firefox="67 https://bugzilla.mozilla.org/show_bug.cgi?id=1290554"
                 safari="yes"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-typed-arrays"></feature-support>
