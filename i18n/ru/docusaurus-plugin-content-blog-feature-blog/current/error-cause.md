---
title: "Причины ошибок"
author: "Victor Gomes ([@VictorBFG](https://twitter.com/VictorBFG))"
avatars:
  - "victor-gomes"
date: 2021-07-07
tags:
  - ECMAScript
description: "JavaScript теперь поддерживает причины ошибок."
tweet: "1412774651558862850"
---

Представьте, что у вас есть функция, вызывающая две отдельные рабочие нагрузки `doSomeWork` и `doMoreWork`. Обе функции могут вызывать одинаковые ошибки, но вам нужно обрабатывать их по-разному.

Перехват ошибки и повторное её выбрасывание с дополнительной контекстной информацией - это распространённый подход к решению этой проблемы, например:

```js
function doWork() {
  try {
    doSomeWork();
  } catch (err) {
    throw new CustomError('Некоторая работа не выполнена', err);
  }
  doMoreWork();
}

try {
  doWork();
} catch (err) {
  // Ошибка |err| происходит из |doSomeWork| или |doMoreWork|?
}
```

К сожалению, указанное выше решение трудоёмко, так как необходимо создавать собственный `CustomError`. И, что ещё хуже, ни одно средство для разработчиков не может предоставить полезные диагностические сообщения для неожиданных исключений, так как нет консенсуса по поводу того, как правильно представлять эти ошибки.

<!--truncate-->
Ранее не хватало стандартного способа связывания ошибок. Теперь JavaScript поддерживает причины ошибок. Дополнительный параметр `options` можно добавить в конструктор `Error` со свойством `cause`, значение которого будет присвоено экземплярам ошибки. Ошибки можно легко связывать.

```js
function doWork() {
  try {
    doSomeWork();
  } catch (err) {
    throw new Error('Некоторая работа не выполнена', { cause: err });
  }
  try {
    doMoreWork();
  } catch (err) {
    throw new Error('Дополнительная работа не выполнена', { cause: err });
  }
}

try {
  doWork();
} catch (err) {
  switch(err.message) {
    case 'Некоторая работа не выполнена':
      handleSomeWorkFailure(err.cause);
      break;
    case 'Дополнительная работа не выполнена':
      handleMoreWorkFailure(err.cause);
      break;
  }
}
```

Эта функция доступна в V8 v9.3.

## Поддержка причин ошибок

<feature-support chrome="93 https://chromium-review.googlesource.com/c/v8/v8/+/2784681"
                 firefox="91 https://bugzilla.mozilla.org/show_bug.cgi?id=1679653"
                 safari="15 https://bugs.webkit.org/show_bug.cgi?id=223302"
                 nodejs="no"
                 babel="no"></feature-support>
