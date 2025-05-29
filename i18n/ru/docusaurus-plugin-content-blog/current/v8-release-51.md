---
title: &apos;V8 выпуск v5.1&apos;
author: &apos;команда V8&apos;
date: 2016-04-23 13:33:37
tags:
  - выпуск
description: &apos;V8 v5.1 предлагает улучшения производительности, снижение задержек и потребления памяти, а также расширенную поддержку функций языка ECMAScript.&apos;
---
Первым шагом в [процессе выпуска V8](/docs/release-process) является создание новой ветки из главной ветки Git непосредственно перед ветвлением Chromium для этапа Chrome Beta (примерно каждые шесть недель). Наша новейшая ветка выпуска — [V8 v5.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/5.1), которая останется в бета-версии, пока мы не выпустим стабильную сборку вместе с Chrome 51 Stable. Вот основные особенности версии V8, предназначенные для разработчиков.

<!--truncate-->
## Улучшенная поддержка ECMAScript

V8 v5.1 содержит ряд изменений, направленных на соответствие черновой спецификации ES2017.

### `Symbol.species`

Методы массива, такие как `Array.prototype.map`, создают экземпляры подкласса в качестве их результата, с возможностью настроить это путем изменения [`Symbol.species`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/species). Аналогичные изменения внесены в другие встроенные классы.

### Настройка `instanceof`

Конструкторы могут реализовывать собственный метод [`Symbol.hasInstance`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Other_symbols), который переопределяет стандартное поведение.

### Завершение итератора

Итераторы, созданные в рамках [`цикла for`-`of`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of) (или другой встроенной итерации, такой как оператор [spread](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator)), теперь проверяются на наличие метода завершения, который вызывается, если цикл завершается преждевременно. Это можно использовать для очистки после завершения итерации.

### Метод `exec` в подклассах RegExp

Подклассы RegExp могут переопределять метод `exec`, чтобы изменять только основной алгоритм сопоставления, с гарантией вызова этого метода высокоуровневыми функциями, такими как `String.prototype.replace`.

### Вывод имени функции

Имена функций, выводимые для функциональных выражений, теперь обычно становятся доступными через свойство [`name`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name) функций, в соответствии с формализацией этих правил в ES2015. Это может изменить существующие трассировки стека и предоставить другие имена, чем в предыдущих версиях V8. Также это дает полезные имена свойствам и методам с вычисляемыми именами свойств:

```js
class Container {
  ...
  [Symbol.iterator]() { ... }
  ...
}
const c = new Container;
console.log(c[Symbol.iterator].name);
// → &apos;[Symbol.iterator]&apos;
```

### `Array.prototype.values`

Аналогично другим типам коллекций, метод [`values`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/values) в `Array` возвращает итератор по содержимому массива.

## Улучшения производительности

V8 v5.1 также предлагает несколько заметных улучшений производительности следующих функций JavaScript:

- Выполнение циклов, таких как `for`-`in`
- `Object.assign`
- Инициализация `Promise` и `RegExp`
- Вызов `Object.prototype.hasOwnProperty`
- `Math.floor`, `Math.round`, и `Math.ceil`
- `Array.prototype.push`
- `Object.keys`
- `Array.prototype.join` и `Array.prototype.toString`
- Разворачивание повторяющихся строк, например `&apos;.&apos;.repeat(1000)`

## WebAssembly (Wasm)

V8 v5.1 имеет предварительную поддержку [WebAssembly](/blog/webassembly-experimental). Вы можете включить ее с помощью флага `--expose_wasm` в `d8`. Или вы можете попробовать [демо Wasm](https://webassembly.github.io/demo/) с Chrome 51 (Beta Channel).

## Память

V8 реализовал дополнительные этапы [Orinoco](/blog/orinoco):

- Параллельная эвакуация молодого поколения
- Масштабируемые наборы памяти
- Черное выделение памяти

Эффект — снижение задержек и потребления памяти в критические моменты.

## API V8

Пожалуйста, ознакомьтесь с нашим [резюме изменений API](https://bit.ly/v8-api-changes). Этот документ регулярно обновляется через несколько недель после каждого крупного выпуска.

Разработчики с [активным репозиторием V8](https://v8.dev/docs/source-code#using-git) могут использовать команду `git checkout -b 5.1 -t branch-heads/5.1`, чтобы экспериментировать с новыми функциями V8 v5.1. Или вы можете [подписаться на бета-канал Chrome](https://www.google.com/chrome/browser/beta.html) и в скором времени попробовать новые функции самостоятельно.
