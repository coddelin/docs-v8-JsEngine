---
title: "`Intl.RelativeTimeFormat`"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2018-10-22
tags: 
  - Intl
  - Node.js 12
  - io19
description: "Intl.RelativeTimeFormat позволяет локализованно форматировать относительное время без ущерба для производительности."
tweet: "1054387117571354624"
---
Современные веб-приложения часто используют выражения вроде «вчера», «42 секунды назад» или «через 3 месяца» вместо полных дат и временных меток. Такие _значения относительного времени_ стали настолько распространёнными, что несколько популярных библиотек реализовали утилитарные функции для их локализованного форматирования. (Примеры включают [Moment.js](https://momentjs.com/), [Globalize](https://github.com/globalizejs/globalize) и [date-fns](https://date-fns.org/docs/).)

<!--truncate-->
Одна из проблем реализации локализованного форматирования относительного времени состоит в том, что вам нужна база привычных слов или выражений (например, «вчера» или «прошлый квартал») для каждого языка, который вы хотите поддерживать. [Unicode CLDR](http://cldr.unicode.org/) предоставляет эти данные, но чтобы использовать их в JavaScript, их необходимо внедрить и доставить вместе с остальным кодом библиотеки. К сожалению, это увеличивает размер пакета подобных библиотек, что отрицательно сказывается на времени загрузки, стоимости анализа/компиляции и потреблении памяти.

Совершенно новый API `Intl.RelativeTimeFormat` переносит эту нагрузку на движок JavaScript, который может поставлять локализованные данные непосредственно разработчикам JavaScript. `Intl.RelativeTimeFormat` позволяет локализованно форматировать относительное время без ущерба для производительности.

## Примеры использования

Следующий пример показывает, как создать форматировщик относительного времени с использованием английского языка.

```js
const rtf = new Intl.RelativeTimeFormat('en');

rtf.format(3.14, 'second');
// → 'in 3.14 seconds'

rtf.format(-15, 'minute');
// → '15 minutes ago'

rtf.format(8, 'hour');
// → 'in 8 hours'

rtf.format(-2, 'day');
// → '2 days ago'

rtf.format(3, 'week');
// → 'in 3 weeks'

rtf.format(-5, 'month');
// → '5 months ago'

rtf.format(2, 'quarter');
// → 'in 2 quarters'

rtf.format(-42, 'year');
// → '42 years ago'
```

Обратите внимание, что аргумент, переданный в конструктор `Intl.RelativeTimeFormat`, может быть либо строкой, содержащей [языковую метку BCP 47](https://tools.ietf.org/html/rfc5646), либо [массивом таких языковых меток](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation).

Вот пример использования другого языка (испанский):

```js
const rtf = new Intl.RelativeTimeFormat('es');

rtf.format(3.14, 'second');
// → 'dentro de 3,14 segundos'

rtf.format(-15, 'minute');
// → 'hace 15 minutos'

rtf.format(8, 'hour');
// → 'dentro de 8 horas'

rtf.format(-2, 'day');
// → 'hace 2 días'

rtf.format(3, 'week');
// → 'dentro de 3 semanas'

rtf.format(-5, 'month');
// → 'hace 5 meses'

rtf.format(2, 'quarter');
// → 'dentro de 2 trimestres'

rtf.format(-42, 'year');
// → 'hace 42 años'
```

Кроме того, конструктор `Intl.RelativeTimeFormat` принимает необязательный аргумент `options`, который позволяет детально управлять выводом. Чтобы продемонстрировать гибкость, давайте рассмотрим еще несколько примеров вывода на английском языке с использованием настроек по умолчанию:

```js
// Создайте форматировщик относительного времени для английского языка с использованием
// стандартных настроек (как и ранее). В этом примере стандартные
// значения переданы явно.
const rtf = new Intl.RelativeTimeFormat('en', {
  localeMatcher: 'best fit', // другие значения: 'lookup'
  style: 'long', // другие значения: 'short' или 'narrow'
  numeric: 'always', // другие значения: 'auto'
});

// Теперь попробуем некоторые особые случаи!

rtf.format(-1, 'day');
// → '1 day ago'

rtf.format(0, 'day');
// → 'in 0 days'

rtf.format(1, 'day');
// → 'in 1 day'

rtf.format(-1, 'week');
// → '1 week ago'

rtf.format(0, 'week');
// → 'in 0 weeks'

rtf.format(1, 'week');
// → 'in 1 week'
```

Вы могли заметить, что вышеупомянутый форматировщик сформировал строку `'1 day ago'` вместо `'yesterday'`, и слегка неудобное `'in 0 weeks'` вместо `'this week'. Это происходит потому, что форматировщик по умолчанию использует числовое значение в выводе.

Чтобы изменить это поведение, установите опцию `numeric` в значение `'auto'` (вместо неявного значения по умолчанию `'always'`):

```js
// Создайте форматировщик относительного времени для английского языка, который
// не всегда должен использовать числовое значение в выводе.
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → 'yesterday'

rtf.format(0, 'day');
// → 'today'

rtf.format(1, 'day');
// → 'tomorrow'

rtf.format(-1, 'week');
// → 'last week'

rtf.format(0, 'week');
// → 'this week'

rtf.format(1, 'week');
// → 'next week'
```

Аналогично другим классам `Intl`, `Intl.RelativeTimeFormat` имеет метод `formatToParts` в дополнение к методу `format`. Хотя `format` охватывает наиболее распространенный случай использования, метод `formatToParts` может быть полезен, если вам нужен доступ к отдельным частям сгенерированного вывода:

```js
// Создайте форматировщик относительного времени для английского языка,
// который не всегда должен использовать численное значение в выводе.
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

rtf.format(-1, 'day');
// → 'вчера'

rtf.formatToParts(-1, 'day');
// → [{ type: 'literal', value: 'вчера' }]

rtf.format(3, 'week');
// → 'через 3 недели'

rtf.formatToParts(3, 'week');
// → [{ type: 'literal', value: 'через ' },
//    { type: 'integer', value: '3', unit: 'week' },
//    { type: 'literal', value: ' недели' }]
```

Для получения дополнительной информации о доступных параметрах и их поведении см. [документацию API в репозитории предложения](https://github.com/tc39/proposal-intl-relative-time#api).

## Заключение

`Intl.RelativeTimeFormat` доступен по умолчанию в V8 v7.1 и Chrome 71. По мере того, как этот API становится более широко доступным, библиотеки, такие как [Moment.js](https://momentjs.com/), [Globalize](https://github.com/globalizejs/globalize) и [date-fns](https://date-fns.org/docs/) будут отказываться от зависимости от жестко закодированных баз данных CLDR в пользу встроенной функциональности форматирования относительного времени, что улучшит производительность загрузки, анализа и компиляции, производительность выполнения и использование памяти.

## Поддержка `Intl.RelativeTimeFormat`

<feature-support chrome="71 /blog/v8-release-71#javascript-language-features"
                 firefox="65"
                 safari="14"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="no"></feature-support>
