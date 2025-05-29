---
title: &apos;`Intl.ListFormat`&apos;
author: &apos;Матиас Биненс ([@mathias](https://twitter.com/mathias)) и Фрэнк Юнг-Фонг Танг&apos;
avatars:
  - &apos;mathias-bynens&apos;
  - &apos;frank-tang&apos;
date: 2018-12-18
tags:
  - Intl
  - Node.js 12
  - io19
description: &apos;API Intl.ListFormat позволяет локализованно форматировать списки без ущерба для производительности.&apos;
tweet: &apos;1074966915557351424&apos;
---
Современные веб-приложения часто используют списки, состоящие из динамических данных. Например, приложение для просмотра фотографий может отображать что-то вроде:

> Эта фотография включает **Аду, Эдит и _Грейс_**.

Текстовая игра может иметь другой вид списка:

> Выберите свою суперсилу: **невидимость, психокинез или _эмпатию_**.

Так как у каждого языка есть свои собственные правила форматирования списков и слова, реализация локализованного форматирования списка является нетривиальной задачей. Это требует не только списка всех слов (например, «и» или «или» в приведенных выше примерах) для каждого поддерживаемого языка — к тому же нужно описать точные правила форматирования для всех этих языков! [Unicode CLDR](http://cldr.unicode.org/translation/lists) предоставляет эти данные, но чтобы использовать их в JavaScript, их нужно интегрировать и включить в библиотеку. Это, к сожалению, увеличивает размер пакета для таких библиотек, что негативно сказывается на времени загрузки, стоимости обработки/компиляции и потреблении памяти.

<!--truncate-->
Совершенно новый API `Intl.ListFormat` перекладывает эту задачу на JavaScript-движок, который может предоставлять данные локализации и делать их доступными непосредственно разработчикам JavaScript. `Intl.ListFormat` позволяет локализованно форматировать списки без ущерба для производительности.

## Примеры использования

Следующий пример показывает, как создать форматтер списка для соединений, используя английский язык:

```js
const lf = new Intl.ListFormat(&apos;en&apos;);
lf.format([&apos;Frank&apos;]);
// → &apos;Frank&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;]);
// → &apos;Frank and Christine&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;, &apos;Flora&apos;]);
// → &apos;Frank, Christine, and Flora&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;, &apos;Flora&apos;, &apos;Harrison&apos;]);
// → &apos;Frank, Christine, Flora, and Harrison&apos;
```

Используя параметр `options`, также можно работать с дизъюнкциями («или» на английском):

```js
const lf = new Intl.ListFormat(&apos;en&apos;, { type: &apos;disjunction&apos; });
lf.format([&apos;Frank&apos;]);
// → &apos;Frank&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;]);
// → &apos;Frank or Christine&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;, &apos;Flora&apos;]);
// → &apos;Frank, Christine, or Flora&apos;
lf.format([&apos;Frank&apos;, &apos;Christine&apos;, &apos;Flora&apos;, &apos;Harrison&apos;]);
// → &apos;Frank, Christine, Flora, or Harrison&apos;
```

Вот пример использования другого языка (китайского, с языковым кодом `zh`):

```js
const lf = new Intl.ListFormat(&apos;zh&apos;);
lf.format([&apos;永鋒&apos;]);
// → &apos;永鋒&apos;
lf.format([&apos;永鋒&apos;, &apos;新宇&apos;]);
// → &apos;永鋒和新宇&apos;
lf.format([&apos;永鋒&apos;, &apos;新宇&apos;, &apos;芳遠&apos;]);
// → &apos;永鋒、新宇和芳遠&apos;
lf.format([&apos;永鋒&apos;, &apos;新宇&apos;, &apos;芳遠&apos;, &apos;澤遠&apos;]);
// → &apos;永鋒、新宇、芳遠和澤遠&apos;
```

Параметр `options` позволяет более продвинутое использование. Вот обзор различных опций и их комбинаций, а также их соответствие шаблонам списков, определенным [UTS#35](https://unicode.org/reports/tr35/tr35-general.html#ListPatterns):


| Тип                   | Опции                                    | Описание                                                                                         | Примеры                              |
| --------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------ |
| стандартный (или нет типа) | `{}` (по умолчанию)                        | Типичный список с «и» для произвольных заполнителей                                              | `&apos;January, February, and March&apos;` |
| или                   | `{ type: &apos;disjunction&apos; }`                 | Типичный список с «или» для произвольных заполнителей                                            | `&apos;January, February, or March&apos;`  |
| единица               | `{ type: &apos;unit&apos; }`                        | Список, подходящий для широких единиц измерения                                                  | `&apos;3 feet, 7 inches&apos;`             |
| единица-короткий      | `{ type: &apos;unit&apos;, style: &apos;short&apos; }`        | Список, подходящий для коротких единиц измерения                                                 | `&apos;3 ft, 7 in&apos;`                   |
| единица-узкий         | `{ type: &apos;unit&apos;, style: &apos;narrow&apos; }`       | Список, подходящий для узких единиц измерения, где пространство экрана строго ограничено         | `&apos;3′ 7″&apos;`                        |


Учтите, что во многих языках (например, английском) может не быть различий между многими из этих списков. В других же изменение пробелов, длины или наличия соединительного слова, а также разделителей может быть явным.

## Заключение

По мере того как API `Intl.ListFormat` становится все более доступным, вы обнаружите, что библиотеки отказываются от зависимости от жестко закодированных баз данных CLDR в пользу встроенной функции форматирования списков, тем самым улучшая производительность времени загрузки, времени разбора и компиляции, производительность во время выполнения и использование памяти.

## Поддержка `Intl.ListFormat`

<feature-support chrome="72 /blog/v8-release-72#intl.listformat"
                 firefox="нет"
                 safari="нет"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="нет"></feature-support>
