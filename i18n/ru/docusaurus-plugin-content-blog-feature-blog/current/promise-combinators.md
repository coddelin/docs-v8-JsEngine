---
title: 'Комбинаторы Promise'
author: 'Маттиас Биненс ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2019-06-12
tags:
  - ECMAScript
  - ES2020
  - ES2021
  - io19
  - Node.js 16
description: 'В JavaScript есть четыре комбинатора promise: Promise.all, Promise.race, Promise.allSettled и Promise.any.'
tweet: '1138819493956710400'
---
С момента появления промисов в ES2015 JavaScript поддерживал ровно два комбинатора promise: статические методы `Promise.all` и `Promise.race`.

Два новых предложения в настоящее время проходят процесс стандартизации: `Promise.allSettled` и `Promise.any`. С этими дополнениями в JavaScript будут доступны четыре комбинатора promise, каждый из которых позволяет решать свои задачи.

<!--truncate-->
Вот обзор этих четырех комбинаторов:


| имя                                        | описание                                       | статус                                                          |
| ------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| [`Promise.allSettled`](#promise.allsettled) | не прерывается при ошибке                      | [добавлено в ES2020 ✅](https://github.com/tc39/proposal-promise-allSettled) |
| [`Promise.all`](#promise.all)               | прерывается, если хотя бы одно значение отклонено | добавлено в ES2015 ✅                                              |
| [`Promise.race`](#promise.race)             | прерывается при первом разрешении или отклонении | добавлено в ES2015 ✅                                              |
| [`Promise.any`](#promise.any)               | прерывается при первом успешном исполнении       | [добавлено в ES2021 ✅](https://github.com/tc39/proposal-promise-any)        |


Теперь рассмотрим пример использования каждого комбинатора.

## `Promise.all`

<feature-support chrome="32"
                 firefox="29"
                 safari="8"
                 nodejs="0.12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.all` позволяет узнать, когда либо все входные промисы выполнены, либо какой-то из них отклонен.

Представьте, что пользователь нажимает кнопку, и вы хотите загрузить несколько таблиц стилей, чтобы отобразить полностью новый пользовательский интерфейс. Программа запускает HTTP-запрос для каждой таблицы стилей параллельно:

```js
const promises = [
  fetch('/component-a.css'),
  fetch('/component-b.css'),
  fetch('/component-c.css'),
];
try {
  const styleResponses = await Promise.all(promises);
  enableStyles(styleResponses);
  renderNewUi();
} catch (reason) {
  displayError(reason);
}
```

Вы хотите начать отображение нового UI только когда _все_ запросы завершены успешно. Если что-то пойдет не так, вы хотите показать сообщение об ошибке как можно быстрее, не дожидаясь завершения остальных.

В такой ситуации удобно использовать `Promise.all`: вы хотите узнать, когда все промисы выполнены, _или_ как только один из них отклонен.

## `Promise.race`

<feature-support chrome="32"
                 firefox="29"
                 safari="8"
                 nodejs="0.12"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.race` полезен, если вы хотите выполнить несколько промисов и выполнить действие либо…

1. с первым успешным результатом (в случае исполнения одного из промисов), _или_
1. как только один из промисов отклонен.

Иными словами, если один из промисов отклоняется, вы хотите сохранить эту ошибку для обработки отдельно. Вот пример:

```js
try {
  const result = await Promise.race([
    performHeavyComputation(),
    rejectAfterTimeout(2000),
  ]);
  renderResult(result);
} catch (error) {
  renderError(error);
}
```

Мы запускаем вычислительно дорогую задачу, которая может занять много времени, но ставим её в гонку с промисом, отклоняющимся через 2 секунды. В зависимости от того, какой из промисов исполнится или отклонится первым, мы либо отображаем вычисленный результат, либо сообщение об ошибке, используя два разных пути выполнения.

## `Promise.allSettled`

<feature-support chrome="76"
                 firefox="71 https://bugzilla.mozilla.org/show_bug.cgi?id=1549176"
                 safari="13"
                 nodejs="12.9.0 https://nodejs.org/en/blog/release/v12.9.0/"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.allSettled` сигнализирует, когда все входные промисы _разрешены_, что означает их _исполнение_ или _отклонение_. Это полезно в случаях, когда вас не интересует состояние промиса, а только факт завершения работы, независимо от успешности.

Например, вы можете запустить серию независимых вызовов API и использовать `Promise.allSettled`, чтобы убедиться, что все они завершены, прежде чем выполнять что-то другое, например, удалять индикатор загрузки:

```js
const promises = [
  fetch('/api-call-1'),
  fetch('/api-call-2'),
  fetch('/api-call-3'),
];
// Представьте, что некоторые из этих запросов не удались, а некоторые прошли успешно.

await Promise.allSettled(promises);
// Все вызовы API завершены (либо с ошибкой, либо успешно).
removeLoadingIndicator();
```

## `Promise.any`

<feature-support chrome="85 https://bugs.chromium.org/p/v8/issues/detail?id=9808"
                 firefox="79 https://bugzilla.mozilla.org/show_bug.cgi?id=1568903"
                 safari="14 https://bugs.webkit.org/show_bug.cgi?id=202566"
                 nodejs="16"
                 babel="yes https://github.com/zloirock/core-js#ecmascript-promise"></feature-support>

`Promise.any` дает сигнал, как только один из промисов будет выполнен. Это похоже на `Promise.race`, за исключением того, что `any` не отклоняется сразу, когда один из промисов отклоняется.

```js
const promises = [
  fetch('/endpoint-a').then(() => 'a'),
  fetch('/endpoint-b').then(() => 'b'),
  fetch('/endpoint-c').then(() => 'c'),
];
try {
  const first = await Promise.any(promises);
  // Любой из промисов был выполнен.
  console.log(first);
  // → например, 'b'
} catch (error) {
  // Все промисы были отклонены.
  console.assert(error instanceof AggregateError);
  // Лог ошибок отклонения:
  console.log(error.errors);
  // → [
  //     <TypeError: Failed to fetch /endpoint-a>,
  //     <TypeError: Failed to fetch /endpoint-b>,
  //     <TypeError: Failed to fetch /endpoint-c>
  //   ]
}
```

Этот пример кода проверяет, какой из конечных точек отвечает быстрее всего, а затем логирует её. Только если _все_ запросы завершаются неудачно, мы попадаем в блок `catch`, где можно обработать ошибки.

`Promise.any` может представлять множество ошибок одновременно. Чтобы поддерживать это на уровне языка, был введен новый тип ошибок под названием `AggregateError`. Помимо базового использования в приведенном выше примере, объекты `AggregateError` также могут быть программно сконструированы, так же как и другие типы ошибок:

```js
const aggregateError = new AggregateError([errorA, errorB, errorC], 'Что-то пошло не так!');
```
