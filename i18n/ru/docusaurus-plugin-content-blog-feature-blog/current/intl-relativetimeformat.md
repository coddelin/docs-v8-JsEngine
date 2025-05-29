---
title: &apos;`Intl.RelativeTimeFormat`&apos;
author: &apos;Mathias Bynens ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-10-22
tags:
  - Intl
  - Node.js 12
  - io19
description: &apos;Intl.RelativeTimeFormat позволяет локализованно форматировать относительное время без ущерба для производительности.&apos;
tweet: &apos;1054387117571354624&apos;
---
Современные веб-приложения часто используют выражения вроде «вчера», «42 секунды назад» или «через 3 месяца» вместо полных дат и временных меток. Такие _значения относительного времени_ стали настолько распространёнными, что несколько популярных библиотек реализовали утилитарные функции для их локализованного форматирования. (Примеры включают [Moment.js](https://momentjs.com/), [Globalize](https://github.com/globalizejs/globalize) и [date-fns](https://date-fns.org/docs/).)

<!--truncate-->
Одна из проблем реализации локализованного форматирования относительного времени состоит в том, что вам нужна база привычных слов или выражений (например, «вчера» или «прошлый квартал») для каждого языка, который вы хотите поддерживать. [Unicode CLDR](http://cldr.unicode.org/) предоставляет эти данные, но чтобы использовать их в JavaScript, их необходимо внедрить и доставить вместе с остальным кодом библиотеки. К сожалению, это увеличивает размер пакета подобных библиотек, что отрицательно сказывается на времени загрузки, стоимости анализа/компиляции и потреблении памяти.

Совершенно новый API `Intl.RelativeTimeFormat` переносит эту нагрузку на движок JavaScript, который может поставлять локализованные данные непосредственно разработчикам JavaScript. `Intl.RelativeTimeFormat` позволяет локализованно форматировать относительное время без ущерба для производительности.

## Примеры использования

Следующий пример показывает, как создать форматировщик относительного времени с использованием английского языка.

```js
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;);

rtf.format(3.14, &apos;second&apos;);
// → &apos;in 3.14 seconds&apos;

rtf.format(-15, &apos;minute&apos;);
// → &apos;15 minutes ago&apos;

rtf.format(8, &apos;hour&apos;);
// → &apos;in 8 hours&apos;

rtf.format(-2, &apos;day&apos;);
// → &apos;2 days ago&apos;

rtf.format(3, &apos;week&apos;);
// → &apos;in 3 weeks&apos;

rtf.format(-5, &apos;month&apos;);
// → &apos;5 months ago&apos;

rtf.format(2, &apos;quarter&apos;);
// → &apos;in 2 quarters&apos;

rtf.format(-42, &apos;year&apos;);
// → &apos;42 years ago&apos;
```

Обратите внимание, что аргумент, переданный в конструктор `Intl.RelativeTimeFormat`, может быть либо строкой, содержащей [языковую метку BCP 47](https://tools.ietf.org/html/rfc5646), либо [массивом таких языковых меток](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation).

Вот пример использования другого языка (испанский):

```js
const rtf = new Intl.RelativeTimeFormat(&apos;es&apos;);

rtf.format(3.14, &apos;second&apos;);
// → &apos;dentro de 3,14 segundos&apos;

rtf.format(-15, &apos;minute&apos;);
// → &apos;hace 15 minutos&apos;

rtf.format(8, &apos;hour&apos;);
// → &apos;dentro de 8 horas&apos;

rtf.format(-2, &apos;day&apos;);
// → &apos;hace 2 días&apos;

rtf.format(3, &apos;week&apos;);
// → &apos;dentro de 3 semanas&apos;

rtf.format(-5, &apos;month&apos;);
// → &apos;hace 5 meses&apos;

rtf.format(2, &apos;quarter&apos;);
// → &apos;dentro de 2 trimestres&apos;

rtf.format(-42, &apos;year&apos;);
// → &apos;hace 42 años&apos;
```

Кроме того, конструктор `Intl.RelativeTimeFormat` принимает необязательный аргумент `options`, который позволяет детально управлять выводом. Чтобы продемонстрировать гибкость, давайте рассмотрим еще несколько примеров вывода на английском языке с использованием настроек по умолчанию:

```js
// Создайте форматировщик относительного времени для английского языка с использованием
// стандартных настроек (как и ранее). В этом примере стандартные
// значения переданы явно.
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, {
  localeMatcher: &apos;best fit&apos;, // другие значения: &apos;lookup&apos;
  style: &apos;long&apos;, // другие значения: &apos;short&apos; или &apos;narrow&apos;
  numeric: &apos;always&apos;, // другие значения: &apos;auto&apos;
});

// Теперь попробуем некоторые особые случаи!

rtf.format(-1, &apos;day&apos;);
// → &apos;1 day ago&apos;

rtf.format(0, &apos;day&apos;);
// → &apos;in 0 days&apos;

rtf.format(1, &apos;day&apos;);
// → &apos;in 1 day&apos;

rtf.format(-1, &apos;week&apos;);
// → &apos;1 week ago&apos;

rtf.format(0, &apos;week&apos;);
// → &apos;in 0 weeks&apos;

rtf.format(1, &apos;week&apos;);
// → &apos;in 1 week&apos;
```

Вы могли заметить, что вышеупомянутый форматировщик сформировал строку `&apos;1 day ago&apos;` вместо `&apos;yesterday&apos;`, и слегка неудобное `&apos;in 0 weeks&apos;` вместо `&apos;this week&apos;. Это происходит потому, что форматировщик по умолчанию использует числовое значение в выводе.

Чтобы изменить это поведение, установите опцию `numeric` в значение `&apos;auto&apos;` (вместо неявного значения по умолчанию `&apos;always&apos;`):

```js
// Создайте форматировщик относительного времени для английского языка, который
// не всегда должен использовать числовое значение в выводе.
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, { numeric: &apos;auto&apos; });

rtf.format(-1, &apos;day&apos;);
// → &apos;yesterday&apos;

rtf.format(0, &apos;day&apos;);
// → &apos;today&apos;

rtf.format(1, &apos;day&apos;);
// → &apos;tomorrow&apos;

rtf.format(-1, &apos;week&apos;);
// → &apos;last week&apos;

rtf.format(0, &apos;week&apos;);
// → &apos;this week&apos;

rtf.format(1, &apos;week&apos;);
// → &apos;next week&apos;
```

Аналогично другим классам `Intl`, `Intl.RelativeTimeFormat` имеет метод `formatToParts` в дополнение к методу `format`. Хотя `format` охватывает наиболее распространенный случай использования, метод `formatToParts` может быть полезен, если вам нужен доступ к отдельным частям сгенерированного вывода:

```js
// Создайте форматировщик относительного времени для английского языка,
// который не всегда должен использовать численное значение в выводе.
const rtf = new Intl.RelativeTimeFormat(&apos;en&apos;, { numeric: &apos;auto&apos; });

rtf.format(-1, &apos;day&apos;);
// → &apos;вчера&apos;

rtf.formatToParts(-1, &apos;day&apos;);
// → [{ type: &apos;literal&apos;, value: &apos;вчера&apos; }]

rtf.format(3, &apos;week&apos;);
// → &apos;через 3 недели&apos;

rtf.formatToParts(3, &apos;week&apos;);
// → [{ type: &apos;literal&apos;, value: &apos;через &apos; },
//    { type: &apos;integer&apos;, value: &apos;3&apos;, unit: &apos;week&apos; },
//    { type: &apos;literal&apos;, value: &apos; недели&apos; }]
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
