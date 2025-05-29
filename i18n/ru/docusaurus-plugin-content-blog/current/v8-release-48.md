---
title: "Релиз V8 версии v4.8"
author: "команда V8"
date: 2015-11-25 13:33:37
tags:
  - релиз
description: "V8 v4.8 добавляет поддержку нескольких новых функций языка ES2015."
---
Примерно каждые шесть недель мы создаем новую ветку V8 в рамках [процесса выпуска](/docs/release-process). Каждая версия создается из основной ветки Git V8 непосредственно перед созданием ветки Chrome для этапа Beta. Сегодня мы рады объявить нашу новую ветку, [V8 версии 4.8](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/4.8), которая будет находиться в состоянии Beta до момента выпуска в координации с Chrome 48 Stable. V8 4.8 содержит ряд функций, ориентированных на разработчиков, поэтому мы хотим предоставить вам предварительный обзор некоторых основных моментов в ожидании выпуска через несколько недель.

<!--truncate-->
## Улучшенная поддержка ECMAScript 2015 (ES6)

Этот выпуск V8 обеспечивает поддержку двух [известных символов](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Well-known_symbols), встроенных символов из спецификации ES2015, которые позволяют разработчикам использовать несколько низкоуровневых языковых конструкций, которые ранее были скрыты.

### `@@isConcatSpreadable`

Имя для свойства с логическим значением, которое, если установлено в `true`, указывает, что объект должен быть развёрнут до его элементов массивов с помощью `Array.prototype.concat`.

```js
(function() {
  'use strict';
  class AutomaticallySpreadingArray extends Array {
    get [Symbol.isConcatSpreadable]() {
      return true;
    }
  }
  const first = [1];
  const second = new AutomaticallySpreadingArray();
  second[0] = 2;
  second[1] = 3;
  const all = first.concat(second);
  // Выводит [1, 2, 3]
  console.log(all);
}());
```

### `@@toPrimitive`

Имя метода для вызова объекта для неявного преобразования к примитивным значениям.

```js
(function(){
  'use strict';
  class V8 {
    [Symbol.toPrimitive](hint) {
      if (hint === 'string') {
        console.log('строка');
        return 'V8';
      } else if (hint === 'number') {
        console.log('число');
        return 8;
      } else {
        console.log('по умолчанию:' + hint);
        return 8;
      }
    }
  }

  const engine = new V8();
  console.log(Number(engine));
  console.log(String(engine));
}());
```

### `ToLength`

Спецификация ES2015 корректирует абстрактную операцию для преобразования типа, чтобы преобразовать аргумент в целое число, подходящее для использования в качестве длины объекта, подобного массиву. (Хотя это изменение не может быть напрямую видимым, оно может быть косвенно заметным при работе с объектами, подобными массиву, с отрицательной длиной.)

## API V8

Пожалуйста, ознакомьтесь с нашим [резюме изменений API](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit). Этот документ регулярно обновляется через несколько недель после каждого крупного выпуска.

Разработчики с [активной копией V8](https://v8.dev/docs/source-code#using-git) могут использовать команду `git checkout -b 4.8 -t branch-heads/4.8` для экспериментов с новыми функциями в V8 версии 4.8. В качестве альтернативы вы можете [подписаться на Beta-канал Chrome](https://www.google.com/chrome/browser/beta.html) и скоро попробовать новые функции самостоятельно.
