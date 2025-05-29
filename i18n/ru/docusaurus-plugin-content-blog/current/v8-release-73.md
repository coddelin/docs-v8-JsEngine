---
title: "Релиз V8 версии 7.3"
author: "Клеменс Бакес, мастер компиляции"
avatars: 
  - clemens-backes
date: "2019-02-07 11:30:42"
tags: 
  - release
description: "V8 v7.3 включает улучшения производительности WebAssembly и асинхронного кода, асинхронные трассировки стека, Object.fromEntries, String#matchAll и многое другое!"
tweet: "1093457099441561611"
---
Каждые шесть недель мы создаем новую ветку V8 в рамках нашего [процесса релиза](/docs/release-process). Каждая версия создается из главной ветки Git V8 незадолго до достижения этапа бета-версии Chrome. Сегодня мы рады сообщить о нашей новой ветке, [версии V8 7.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.3), которая находится в стадии бета-тестирования до выпуска в стабильной версии Chrome 73 через несколько недель. V8 версии 7.3 наполнен разнообразными улучшениями для разработчиков. Этот пост представляет некоторую информацию о главных новинках в преддверии выпуска.

<!--truncate-->
## Асинхронные трассировки стека

Мы включаем флаг [--async-stack-traces](/blog/fast-async#improved-developer-experience) по умолчанию. [Асинхронные трассировки стека с нулевой стоимостью](https://bit.ly/v8-zero-cost-async-stack-traces) упрощают диагностику проблем в производственном коде, насыщенном асинхронными операциями, так как свойство `error.stack`, которое обычно отправляется в журналы/сервисные логи, теперь предоставляет больше сведений о причинах проблемы.

## Ускоренный `await`

В связи с вышеупомянутым флагом `--async-stack-traces`, мы также включаем по умолчанию флаг `--harmony-await-optimization`, который является предварительным условием для `--async-stack-traces`. Подробнее читайте в разделе [ускоренные асинхронные функции и обещания](/blog/fast-async#await-under-the-hood).

## Ускоренный запуск Wasm

Благодаря оптимизациям внутри Liftoff, мы значительно улучшили скорость компиляции WebAssembly без ухудшения качества сгенерированного кода. Для большинства рабочих нагрузок время компиляции сократилось на 15–25%.

![Время компиляции Liftoff на [демо Epic ZenGarden](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html)](/_img/v8-release-73/liftoff-epic.svg)

## Особенности языка JavaScript

Версия V8 v7.3 включает несколько новых функций языка JavaScript.

### `Object.fromEntries`

API `Object.entries` не является чем-то новым:

```js
const object = { x: 42, y: 50 };
const entries = Object.entries(object);
// → [['x', 42], ['y', 50]]
```

К сожалению, до сих пор не было простого способа преобразовать результат `entries` обратно в эквивалентный объект… до сих пор! В версии V8 v7.3 добавлена поддержка [`Object.fromEntries()`](/features/object-fromentries), нового встроенного API, который выполняет обратную операцию для `Object.entries`:

```js
const result = Object.fromEntries(entries);
// → { x: 42, y: 50 }
```

Для получения дополнительной информации и примеров использования см. [объяснение функции `Object.fromEntries`](/features/object-fromentries).

### `String.prototype.matchAll`

Один из распространенных вариантов использования глобальных (`g`) или липких (`y`) регулярных выражений — применять их к строке и перебирать все совпадения. Новый API `String.prototype.matchAll` упрощает это как никогда прежде, особенно для регулярных выражений с группами захвата:

```js
const string = 'Любимые репозитории на GitHub: tc39/ecma262 v8/v8.dev';
const regex = /\b(?<owner>[a-z0-9]+)\/(?<repo>[a-z0-9\.]+)\b/g;

for (const match of string.matchAll(regex)) {
  console.log(`${match[0]} на ${match.index} из '${match.input}'`);
  console.log(`→ владелец: ${match.groups.owner}`);
  console.log(`→ репозиторий: ${match.groups.repo}`);
}

// Вывод:
//
// tc39/ecma262 на 23 из 'Любимые репозитории на GitHub: tc39/ecma262 v8/v8.dev'
// → владелец: tc39
// → репозиторий: ecma262
// v8/v8.dev на 36 из 'Любимые репозитории на GitHub: tc39/ecma262 v8/v8.dev'
// → владелец: v8
// → репозиторий: v8.dev
```

Для более подробной информации прочитайте [объяснение функции `String.prototype.matchAll`](/features/string-matchall).

### `Atomics.notify`

`Atomics.wake` был переименован в `Atomics.notify`, в соответствии с [последними изменениями спецификации](https://github.com/tc39/ecma262/pull/1220).

## API V8

Используйте `git log branch-heads/7.2..branch-heads/7.3 include/v8.h`, чтобы получить список изменений API.

Разработчики с [активной копией V8](/docs/source-code#using-git) могут использовать `git checkout -b 7.3 -t branch-heads/7.3`, чтобы протестировать новые функции в версии V8 v7.3. В качестве альтернативы вы можете [подписаться на бета-канал Chrome](https://www.google.com/chrome/browser/beta.html) и вскоре попробовать новые функции самостоятельно.
