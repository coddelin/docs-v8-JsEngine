---
title: 'Релиз V8 v4.7'
author: 'команда V8'
date: 2015-10-14 13:33:37
tags:
  - релиз
description: 'V8 v4.7 включает сниженное потребление памяти и поддержку новых возможностей языка ES2015.'
---
Примерно каждые шесть недель мы создаем новую ветку V8 в рамках нашего [процесса выпуска](https://v8.dev/docs/release-process). Каждая версия ответвляется от основной ветки Git в V8 перед созданием соответствующей версии Chrome Beta. Сегодня мы рады объявить о нашей новой ветке, [версии V8 4.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.7), которая будет в стадии бета-тестирования, пока не выйдет вместе со стабильной версией Chrome 47. V8 v4.7 предлагает множество приятных возможностей для разработчиков, и мы хотели бы заранее рассказать об основных из них в ожидании официального выпуска через несколько недель.

<!--truncate-->
## Улучшенная поддержка ECMAScript 2015 (ES6)

### Оператор rest

[Оператор rest](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Functions/rest_parameters) позволяет разработчику передавать неопределенное количество аргументов в функцию. Он похож на объект `arguments`.

```js
// Без оператора rest
function concat() {
  var args = Array.prototype.slice.call(arguments, 1);
  return args.join('');
}

// С оператором rest
function concatWithRest(...strings) {
  return strings.join('');
}
```

## Поддержка предстоящих возможностей ES

### `Array.prototype.includes`

[`Array.prototype.includes`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes) — это новая возможность, которая в настоящее время является предложением третьей стадии для включения в ES2016. Она предоставляет краткий синтаксис для определения, содержится ли элемент в массиве, возвращая логическое значение.

```js
[1, 2, 3].includes(3); // true
['apple', 'banana', 'cherry'].includes('apple'); // true
['apple', 'banana', 'cherry'].includes('peach'); // false
```

## Снижение нагрузки на память при парсинге

[Недавние изменения в парсере V8](https://code.google.com/p/v8/issues/detail?id=4392) значительно снизили объем памяти, потребляемой при парсинге файлов с большими вложенными функциями. В частности, это позволяет V8 запускать более крупные модули asm.js, чем это было возможно ранее.

## API V8

Пожалуйста, ознакомьтесь с нашим [резюме изменений API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Этот документ регулярно обновляется через несколько недель после каждого крупного выпуска. Разработчики с [активной копией V8](https://v8.dev/docs/source-code#using-git) могут использовать `git checkout -b 4.7 -t branch-heads/4.7` для экспериментов с новыми функциями в V8 v4.7. В качестве альтернативы вы можете [подписаться на бета-канал Chrome](https://www.google.com/chrome/browser/beta.html) и в скором времени протестировать новые возможности самостоятельно.
