---
title: &apos;Релиз V8 v6.4&apos;
author: &apos;команда V8&apos;
date: 2017-12-19 13:33:37
tags:
  - выпуск
description: &apos;V8 v6.4 включает улучшения производительности, новые возможности языка JavaScript и многое другое.&apos;
tweet: &apos;943057597481082880&apos;
---
Каждые шесть недель мы создаем новую ветку V8 в рамках нашего [процесса выпуска](/docs/release-process). Каждая версия ветвится от основной Git-ветки V8 прямо перед этапом Beta Chrome. Сегодня мы рады объявить о нашей новейшей ветке, [версии V8 6.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.4), которая находится в бета-версии до своего выпуска вместе со стабильной версией Chrome 64 через несколько недель. V8 v6.4 наполнен разнообразными полезными улучшениями для разработчиков. В этом сообщении представлен предварительный обзор некоторых ключевых моментов в преддверии релиза.

<!--truncate-->
## Скорость

V8 v6.4 [улучшает](https://bugs.chromium.org/p/v8/issues/detail?id=6971) производительность оператора `instanceof` в 3,6 раза. Как прямой результат, [uglify-js](http://lisperator.net/uglifyjs/) теперь работает на 15–20% быстрее согласно [инструментальному тесту V8](https://github.com/v8/web-tooling-benchmark).

В этом выпуске также решены проблемы производительности в `Function.prototype.bind`. Например, TurboFan теперь [постоянно встраивает](https://bugs.chromium.org/p/v8/issues/detail?id=6946) все мономорфные вызовы функции `bind`. Кроме того, TurboFan также поддерживает _паттерн привязанных обратных вызовов_, что позволяет вместо следующего:

```js
doSomething(callback, someObj);
```

использовать:

```js
doSomething(callback.bind(someObj));
```

Таким образом, код становится более читаемым, при этом вы сохраняете ту же производительность.

Благодаря последним взносам от [Питера Вонга](https://twitter.com/peterwmwong), [`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap) и [`WeakSet`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet) теперь реализованы с использованием [CodeStubAssembler](/blog/csa), что приводит к улучшению производительности до 5 раз на всех уровнях.

![](/_img/v8-release-64/weak-collection.svg)

В рамках [непрерывных усилий](https://bugs.chromium.org/p/v8/issues/detail?id=1956) V8 по улучшению производительности встроенных методов массивов, мы увеличили производительность `Array.prototype.slice` примерно в 4 раза, переосмыслив его реализацию с использованием CodeStubAssembler. Кроме того, вызовы `Array.prototype.map` и `Array.prototype.filter` теперь встроены во многих случаях, что обеспечивает производительность, сравнимую с версиями, написанными вручную.

Мы стремились к тому, чтобы загрузки за пределами массива, типизированного массива и строки [не вызывали падения производительности](https://bugs.chromium.org/p/v8/issues/detail?id=7027) в 10 раз после того, как заметили [этот паттерн кодирования](/blog/elements-kinds#avoid-reading-beyond-length), используемый в дикой природе.

## Память

Встроенные кодовые объекты и обработчики байт-кода V8 теперь десериализуются по запросу из снимка, что может значительно сократить использованную память для каждого Isolate. Тесты в Chrome показывают экономию в несколько сотен килобайт на вкладку при просмотре популярных сайтов.

![](/_img/v8-release-64/codespace-consumption.svg)

Ищите отдельную публикацию в блоге на эту тему в начале следующего года.

## Возможности языка ECMAScript

Этот релиз V8 включает поддержку двух новых интересных возможностей регулярных выражений.

В регулярных выражениях с флагом `/u` [экраны свойств Unicode](https://mathiasbynens.be/notes/es-unicode-property-escapes) теперь включены по умолчанию.

```js
const regexGreekSymbol = /\p{Script_Extensions=Greek}/u;
regexGreekSymbol.test(&apos;π&apos;);
// → true
```

Поддержка [именованных групп захвата](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features#named_captures) в регулярных выражениях теперь включена по умолчанию.

```js
const pattern = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/u;
const result = pattern.exec(&apos;2017-12-15&apos;);
// result.groups.year === &apos;2017&apos;
// result.groups.month === &apos;12&apos;
// result.groups.day === &apos;15&apos;
```

Подробнее об этих функциях можно узнать в нашем посте в блоге под названием [Предстоящие возможности регулярных выражений](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features).

Благодаря [Groupon](https://twitter.com/GrouponEng) V8 теперь реализует [`import.meta`](https://github.com/tc39/proposal-import-meta), который позволяет встраивающим элементам отображать метаданные хоста о текущем модуле. Например, Chrome 64 предоставляет URL модуля через `import.meta.url`, и Chrome планирует добавить больше свойств в `import.meta` в будущем.

Для улучшения форматирования строк, созданных интернационализированными форматтерами, разработчики теперь могут использовать [`Intl.NumberFormat.prototype.formatToParts()`](https://github.com/tc39/proposal-intl-formatToParts), чтобы форматировать число в список токенов и их типов. Спасибо [Igalia](https://twitter.com/igalia) за реализацию этого в V8!

## API V8

Пожалуйста, используйте `git log branch-heads/6.3..branch-heads/6.4 include/v8.h`, чтобы получить список изменений API.

Разработчики с [активной копией V8](/docs/source-code#using-git) могут использовать `git checkout -b 6.4 -t branch-heads/6.4`, чтобы работать с новыми функциями в V8 версии 6.4. В качестве альтернативы вы можете [подписаться на бета-канал Chrome](https://www.google.com/chrome/browser/beta.html) и вскоре попробовать новые функции самостоятельно.
