---
title: 'V8 релиз v8.7'
author: 'Ингвар Степанян ([RReverser](https://twitter.com/RReverser)), представитель V8'
avatars:
 - 'ingvar-stepanyan'
date: 2020-10-23
tags:
 - релиз
description: 'Релиз V8 v8.7 включает новый API для нативных вызовов, Atomics.waitAsync, исправления ошибок и улучшения производительности.'
tweet: '1319654229863182338'
---
Каждые шесть недель мы создаем новую ветвь V8 как часть нашего [процесса выпуска](https://v8.dev/docs/release-process). Каждая версия отделяется от основной ветви Git V8 непосредственно перед этапом бета-версии Chrome. Сегодня мы рады объявить о нашей новой ветви, [версии V8 8.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.7), которая находится в состоянии бета-версии до ее релиза вместе с Chrome 87 Stable через несколько недель. V8 v8.7 содержит множество нововведений для разработчиков. Этот пост предлагает предварительный обзор некоторых ключевых моментов в ожидании выпуска.

<!--truncate-->
## JavaScript

### Небезопасные быстрые вызовы JS

V8 v8.7 включает улучшенный API для выполнения нативных вызовов из JavaScript.

Функция все еще является экспериментальной и может быть включена с помощью флага `--turbo-fast-api-calls` в V8 или соответствующего флага `--enable-unsafe-fast-js-calls` в Chrome. Она предназначена для повышения производительности некоторых нативных графических API в Chrome, но также может быть использована другими внедряющими приложениями. Она предоставляет новые средства для разработчиков для создания экземпляров `v8::FunctionTemplate`, как это задокументировано в этом [заголовочном файле](https://source.chromium.org/chromium/chromium/src/+/master:v8/include/v8-fast-api-calls.h). Функции, созданные с использованием оригинального API, останутся неизменными.

Для получения дополнительной информации и списка доступных функций, пожалуйста, прочитайте [это объяснение](https://docs.google.com/document/d/1nK6oW11arlRb7AA76lJqrBIygqjgdc92aXUPYecc9dU/edit?usp=sharing).

### `Atomics.waitAsync`

[`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md) теперь доступен в V8 v8.7.

[`Atomics.wait`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/wait) и [`Atomics.notify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/notify) являются низкоуровневыми примитивами синхронизации, полезными для реализации мутексов и других методов синхронизации. Однако, поскольку `Atomics.wait` является блокирующим, его невозможно вызвать в основном потоке (попытка сделать это вызовет TypeError). Неблокирующая версия, [`Atomics.waitAsync`](https://github.com/tc39/proposal-atomics-wait-async/blob/master/PROPOSAL.md), может также использоваться в основном потоке.

Ознакомьтесь с [нашим объяснением API `Atomics`](https://v8.dev/features/atomics) для получения более подробной информации.

## API V8

Для получения списка изменений в API, пожалуйста, используйте `git log branch-heads/8.6..branch-heads/8.7 include/v8.h`.

Разработчики с активной копией репозитория V8 могут использовать `git checkout -b 8.7 -t branch-heads/8.7`, чтобы протестировать новые функции в V8 v8.7. Кроме того, вы можете [подписаться на бета-канал Chrome](https://www.google.com/chrome/browser/beta.html) и вскоре опробовать новые функции самостоятельно.
