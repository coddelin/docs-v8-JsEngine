---
title: &apos;Релиз V8 версии 9.9&apos;
author: &apos;Ингвар Степанян ([@RReverser](https://twitter.com/RReverser)), на его 99%&apos;
avatars:
 - &apos;ingvar-stepanyan&apos;
date: 2022-01-31
tags:
 - release
description: &apos;Релиз V8 версии 9.9 приносит новые API интернационализации.&apos;
tweet: &apos;1488190967727411210&apos;
---
Каждые четыре недели мы создаем новую ветку V8 как часть нашего [процесса релиза](https://v8.dev/docs/release-process). Каждая версия разветвлена от основного Git репозитория V8 незадолго до достижения этапа Beta Chrome. Сегодня мы рады объявить о нашей новой ветке, [V8 версия 9.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.9), которая находится в версии Beta до ее выпуска, координируемого со стабильной версией Chrome 99 через несколько недель. V8 версии 9.9 предоставит множество полезных возможностей для разработчиков. В этом посте представлен предварительный обзор некоторых ключевых особенностей в ожидании релиза.

<!--truncate-->
## JavaScript

### Расширения Intl.Locale

В версии 7.4 мы запустили API [`Intl.Locale`](https://v8.dev/blog/v8-release-74#intl.locale). С версией 9.9 мы добавили семь новых свойств в объект `Intl.Locale`: `calendars`, `collations`, `hourCycles`, `numberingSystems`, `timeZones`, `textInfo` и `weekInfo`.

Свойства `calendars`, `collations`, `hourCycles`, `numberingSystems` и `timeZones` объекта `Intl.Locale` возвращают массив предпочтительных идентификаторов, находящихся в общем использовании, предназначенный для использования с другими API `Intl`:

```js
const arabicEgyptLocale = new Intl.Locale(&apos;ar-EG&apos;)
// ar-EG
arabicEgyptLocale.calendars
// [&apos;gregory&apos;, &apos;coptic&apos;, &apos;islamic&apos;, &apos;islamic-civil&apos;, &apos;islamic-tbla&apos;]
arabicEgyptLocale.collations
// [&apos;compat&apos;, &apos;emoji&apos;, &apos;eor&apos;]
arabicEgyptLocale.hourCycles
// [&apos;h12&apos;]
arabicEgyptLocale.numberingSystems
// [&apos;arab&apos;]
arabicEgyptLocale.timeZones
// [&apos;Africa/Cairo&apos;]
```

Свойство `textInfo` в объекте `Intl.Locale` возвращает объект для указания информации, связанной с текстом. В данный момент оно содержит только одно свойство, `direction`, которое указывает направление текста по умолчанию в данном языке. Оно предназначено для использования с [атрибутом HTML `dir`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir) и [свойством CSS `direction`](https://developer.mozilla.org/en-US/docs/Web/CSS/direction). Оно указывает порядок символов - `ltr` (слева направо) или `rtl` (справа налево):

```js
arabicEgyptLocale.textInfo
// { direction: &apos;rtl&apos; }
japaneseLocale.textInfo
// { direction: &apos;ltr&apos; }
chineseTaiwanLocale.textInfo
// { direction: &apos;ltr&apos; }
```

Свойство `weekInfo` объекта `Intl.Locale` возвращает объект для указания информации, связанной с неделей. Свойство `firstDay` в возвращаемом объекте — это число, в диапазоне от 1 до 7, указывающее, какой день недели считается первым днем в календаре. 1 означает понедельник, 2 — вторник, 3 — среду, 4 — четверг, 5 — пятницу, 6 — субботу и 7 — воскресенье. Свойство `minimalDays` объекта указывает минимальное количество дней, необходимых в первой неделе месяца или года для календарных целей. Свойство `weekend` в возвращаемом объекте — массив целых чисел, обычно содержащий два элемента, закодированных так же, как `firstDay`. Оно указывает, какие дни недели считаются выходными днями в календаре. Заметьте, что число выходных дней различается в зависимости от языка и может не быть последовательным.

```js
arabicEgyptLocale.weekInfo
// {firstDay: 6, weekend: [5, 6], minimalDays: 1}
// Первый день недели — суббота. Выходные дни — пятница и суббота.
// Первая неделя месяца или года — это неделя, содержащая хотя бы один день
// этого месяца или года.
```

### Перечисление Intl

В версии 9.9 мы добавили новую функцию [`Intl.supportedValuesOf(code)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/supportedValuesOf), которая возвращает массив поддерживаемых идентификаторов в V8 для API Intl. Поддерживаемые значения `code` включают `calendar`, `collation`, `currency`, `numberingSystem`, `timeZone` и `unit`. Информация в этом новом методе предназначена для того, чтобы веб-разработчики могли легко узнавать, какие значения поддерживаются реализацией.

```js
Intl.supportedValuesOf(&apos;calendar&apos;)
// [&apos;buddhist&apos;, &apos;chinese&apos;, &apos;coptic&apos;, &apos;dangi&apos;, ...]

Intl.supportedValuesOf(&apos;collation&apos;)
// [&apos;big5han&apos;, &apos;compat&apos;, &apos;dict&apos;, &apos;emoji&apos;, ...]

Intl.supportedValuesOf(&apos;currency&apos;)
// [&apos;ADP&apos;, &apos;AED&apos;, &apos;AFA&apos;, &apos;AFN&apos;, &apos;ALK&apos;, &apos;ALL&apos;, &apos;AMD&apos;, ...]

Intl.supportedValuesOf(&apos;numberingSystem&apos;)
// [&apos;adlm&apos;, &apos;ahom&apos;, &apos;arab&apos;, &apos;arabext&apos;, &apos;bali&apos;, ...]

Intl.supportedValuesOf(&apos;timeZone&apos;)
// [&apos;Africa/Abidjan&apos;, &apos;Africa/Accra&apos;, &apos;Africa/Addis_Ababa&apos;, &apos;Africa/Algiers&apos;, ...]

Intl.supportedValuesOf(&apos;unit&apos;)
// [&apos;acre&apos;, &apos;bit&apos;, &apos;byte&apos;, &apos;celsius&apos;, &apos;centimeter&apos;, ...]
```

## API V8

Используйте `git log branch-heads/9.8..branch-heads/9.9 include/v8\*.h`, чтобы получить список изменений в API.
