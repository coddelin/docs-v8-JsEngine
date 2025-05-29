---
title: "V8 релиз v6.0"
author: "команда V8"
date: 2017-06-09 13:33:37
tags:
  - релиз
description: "V8 v6.0 включает в себя несколько улучшений производительности и вводит поддержку `SharedArrayBuffer` и свойств rest/spread объектов."
---
Каждые шесть недель мы создаем новую ветку V8 в рамках нашего [процесса релиза](/docs/release-process). Каждая версия выделяется из Git-мастера V8 непосредственно перед этапом Beta Chrome. Сегодня мы рады объявить о нашей новой ветке, [V8 версии 6.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.0), которая будет в бета-версии до выпуска в координации со стабильным Chrome 60 через несколько недель. V8 6.0 содержит множество полезных функций для разработчиков. Мы хотим дать вам предварительный просмотр некоторых из основных моментов в ожидании релиза.

<!--truncate-->
## `SharedArrayBuffer`

V8 v6.0 вводит поддержку [`SharedArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer), низкоуровневого механизма для совместного использования памяти между JavaScript-воркерами и синхронизации управления потоком между воркерами. SharedArrayBuffer предоставляют JavaScript доступ к общей памяти, атомикам и futex'ам. SharedArrayBuffers также открывают возможность переноса многопоточных приложений на веб через asm.js или WebAssembly.

Для краткого низкоуровневого руководства ознакомьтесь с [страницей руководства](https://github.com/tc39/ecmascript_sharedmem/blob/master/TUTORIAL.md) спецификации или проконсультируйтесь с [документацией Emscripten](https://kripken.github.io/emscripten-site/docs/porting/pthreads.html) для переноса pthreads.

## Свойства rest/spread объектов

Этот релиз вводит свойства rest для деструктуризации объекта и свойства spread для объектных литералов. Свойства rest/spread объектов являются функциями на стадии 3 ES.next.

Свойства spread также предоставляют краткую альтернативу `Object.assign()` в многих ситуациях.

```js
// Свойства rest для деструктуризации объекта:
const person = {
  firstName: 'Себастьян',
  lastName: 'Markbåge',
  country: 'США',
  state: 'CA',
};
const { firstName, lastName, ...rest } = person;
console.log(firstName); // Себастьян
console.log(lastName); // Markbåge
console.log(rest); // { country: 'США', state: 'CA' }

// Свойства spread для объектных литералов:
const personCopy = { firstName, lastName, ...rest };
console.log(personCopy);
// { firstName: 'Себастьян', lastName: 'Markbåge', country: 'США', state: 'CA' }
```

Для получения дополнительной информации см. [наш объяснение свойств rest и spread объектов](/features/object-rest-spread).

## Производительность ES2015

V8 v6.0 продолжает улучшать производительность функций ES2015. Этот релиз содержит оптимизации реализации языковых функций, что в целом дает примерно 10%-ное улучшение [ARES-6](http://browserbench.org/ARES-6/) оценки V8.

## API V8

Пожалуйста, ознакомьтесь с нашим [кратким описанием изменений API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Этот документ регулярно обновляется через несколько недель после каждого основного релиза.

Разработчики с [активным checkout V8](/docs/source-code#using-git) могут использовать `git checkout -b 6.0 -t branch-heads/6.0`, чтобы поэкспериментировать с новыми функциями V8 6.0. Или вы можете [подписаться на Beta-канал Chrome](https://www.google.com/chrome/browser/beta.html) и попробовать новые функции самостоятельно в ближайшее время.
