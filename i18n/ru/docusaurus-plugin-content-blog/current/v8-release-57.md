---
title: "Релиз V8 v5.7"
author: "команда V8"
date: "2017-02-06 13:33:37"
tags: 
  - релиз
description: "V8 v5.7 включает WebAssembly по умолчанию, улучшения производительности и расширенную поддержку функций языка ECMAScript."
---
Каждые шесть недель мы создаем новую ветку V8 в рамках нашего [процесса выпуска](/docs/release-process). Каждая версия создаётся из основной ветки Git V8 непосредственно перед этапом Beta Chrome. Сегодня мы рады представить нашу новейшую ветку, [V8 версии 5.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.7), которая будет находиться в бета-версии, пока не будет выпущена вместе с Chrome 57 Stable через несколько недель. V8 5.7 наполнен всевозможными полезными функциями для разработчиков. Предлагаем вам предварительный обзор некоторых основных моментов перед выпуском.

<!--truncate-->
## Улучшения производительности

### Родные асинхронные функции такие же быстрые, как Promise

Асинхронные функции теперь приблизительно такие же быстрые, как тот же код, написанный с использованием Promise. Производительность выполнения асинхронных функций увеличилась в четыре раза, согласно нашим [микротестам](https://codereview.chromium.org/2577393002). За тот же период общая производительность Promise также удвоилась.

![Улучшение производительности асинхронных функций в V8 на Linux x64](/_img/v8-release-57/async.png)

### Улучшения ES2015

V8 продолжает улучшать функциональность языка ES2015, чтобы разработчики могли использовать новые функции без потерь производительности. Оператор распространения, деструктуризация и генераторы теперь [приблизительно такие же быстрые, как их простые эквиваленты в ES5](https://fhinkel.github.io/six-speed/).

### RegExp быстрее на 15%

Перенос функций RegExp из реализации на JavaScript на основе самообслуживания в архитектуру генерации кода TurboFan привел к увеличению общей производительности RegExp примерно на 15%. Дополнительные подробности можно найти в [специальной публикации](/blog/speeding-up-regular-expressions).

## Функции языка JavaScript

Несколько недавних дополнений к стандартной библиотеке ECMAScript включены в этот выпуск. Два метода строки, [`padStart`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart) и [`padEnd`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd), предоставляют полезные функции форматирования строк, а [`Intl.DateTimeFormat.prototype.formatToParts`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat/formatToParts) дает разработчикам возможность настраивать форматирование даты/времени с учётом локали.

## WebAssembly включен

Chrome 57 (который включает V8 v5.7) будет первым релизом, в котором WebAssembly включен по умолчанию. Дополнительные сведения можно найти в документации на сайте [webassembly.org](http://webassembly.org/) и в документации API на [MDN](https://developer.mozilla.org/en-US/docs/WebAssembly/API).

## Дополнения к API V8

Ознакомьтесь с нашим [резюме изменений в API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Этот документ регулярно обновляется через несколько недель после каждого основного выпуска. Разработчики с [активной проверкой исходного кода V8](/docs/source-code#using-git) могут использовать `git checkout -b 5.7 -t branch-heads/5.7`, чтобы опробовать новые функции в V8 v5.7. Также вы можете [подписаться на бета-канал Chrome](https://www.google.com/chrome/browser/beta.html) и попробовать новые функции сами.

### `PromiseHook`

Этот C++ API позволяет пользователям реализовывать код профилирования, который отслеживает жизненный цикл Promise. Это позволяет Node использовать предстоящий [AsyncHook API](https://github.com/nodejs/node-eps/pull/18), который даёт возможность создавать [распространение контекста асинхронных операций](https://docs.google.com/document/d/1tlQ0R6wQFGqCS5KeIw0ddoLbaSYx6aU7vyXOkv-wvlM/edit#).

API `PromiseHook` предоставляет четыре функции жизненного цикла: init, resolve, before и after. Функция init запускается при создании нового Promise; функция resolve запускается при выполнении Promise; функции pre и post запускаются непосредственно перед и после [`PromiseReactionJob`](https://tc39.es/ecma262/#sec-promisereactionjob). Для получения дополнительной информации, пожалуйста, ознакомьтесь с [вопросом отслеживания](https://bugs.chromium.org/p/v8/issues/detail?id=4643) и [документом дизайна](https://docs.google.com/document/d/1rda3yKGHimKIhg5YeoAmCOtyURgsbTH_qaYR79FELlk/edit).
