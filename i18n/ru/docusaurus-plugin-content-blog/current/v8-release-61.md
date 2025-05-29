---
title: 'Версия V8 v6.1'
author: 'Команда V8'
date: 2017-08-03 13:33:37
tags:
  - релиз
description: 'V8 v6.1 включает уменьшение размера бинарного файла и улучшения производительности. Кроме того, asm.js теперь проверяется и компилируется в WebAssembly.'
---
Каждые шесть недель мы создаем новую ветку V8 в рамках нашего [процесса релиза](/docs/release-process). Каждая версия ответвляется от Git master V8 непосредственно перед этапом бета версии Chrome. Сегодня мы рады объявить о нашей новой ветке, [версии V8 6.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.1), которая находится в стадии бета-тестирования до её выпуска в стабильной версии Chrome 61 через несколько недель. V8 v6.1 наполнен различными улучшениями для разработчиков. Мы хотим предложить вам предварительный обзор некоторых из основных моментов в преддверии релиза.

<!--truncate-->
## Улучшения производительности

Обход всех элементов Maps и Sets — либо через [итерацию](http://exploringjs.com/es6/ch_iteration.html), либо через методы [`Map.prototype.forEach`](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach) / [`Set.prototype.forEach`](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Set/forEach) — стал значительно быстрее, с увеличением производительности до 11× по сравнению с версией V8 6.0. Ознакомьтесь с [посвященной этому постом в блоге](https://benediktmeurer.de/2017/07/14/faster-collection-iterators/) для получения дополнительной информации.

![](/_img/v8-release-61/iterating-collections.svg)

Помимо этого, работа над производительностью других языковых функций также продолжалась. Например, метод [`Object.prototype.isPrototypeOf`](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Object/isPrototypeOf), который важен для кода без конструкторов, использующего в основном объектные литералы и `Object.create` вместо классов и функций-конструкторов, теперь всегда так же быстр, а часто и быстрее, чем использование [оператора `instanceof`](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Operators/instanceof).

![](/_img/v8-release-61/checking-prototype.svg)

Вызовы функций и конструкторов с переменным количеством аргументов также стали значительно быстрее. Вызовы, выполненные с помощью [`Reflect.apply`](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Reflect/apply) и [`Reflect.construct`](https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Reflect/construct), получили увеличение производительности до 17× в последней версии.

![](/_img/v8-release-61/call-construct.svg)

`Array.prototype.forEach` теперь встроен в TurboFan и оптимизирован для всех основных типов элементов без дырок [elements kinds](/blog/elements-kinds).

## Уменьшение размера бинарного файла

Команда V8 полностью удалила устаревший компилятор Crankshaft, что значительно уменьшило размер бинарного файла. Вместе с удалением генератора встроенных функций это уменьшает размер развернутого бинарного файла V8 более чем на 700 КБ, в зависимости от конкретной платформы.

## asm.js теперь проверяется и компилируется в WebAssembly

Если V8 обнаруживает код asm.js, он пытается его проверить. Валидный код asm.js затем транспилируется в WebAssembly. Согласно оценкам производительности V8, это, как правило, увеличивает пропускную производительность. Из-за добавленного этапа проверки возможно появление изолированных регрессий начальной производительности.

Обратите внимание, что эта функция была включена по умолчанию только на стороне Chromium. Если вы интегратор и хотите использовать валидатор asm.js, активируйте флаг `--validate-asm`.

## WebAssembly

При отладке WebAssembly теперь можно отображать локальные переменные в DevTools, когда устанавливается точка останова в коде WebAssembly.

## API V8

Обязательно ознакомьтесь с нашим [обзором изменений API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Этот документ регулярно обновляется через несколько недель после каждого основного релиза.

Разработчики с [активной проверкой исходного кода V8](/docs/source-code#using-git) могут использовать `git checkout -b 6.1 -t branch-heads/6.1` для экспериментов с новыми функциями в V8 v6.1. Или же вы можете [подписаться на бета-канал Chrome](https://www.google.com/chrome/browser/beta.html) и вскоре сами опробовать новые функции.
