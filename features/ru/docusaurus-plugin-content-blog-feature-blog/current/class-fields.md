---
title: &apos;Публичные и приватные поля классов&apos;
author: &apos;Матиас Биненс ([@mathias](https://twitter.com/mathias))&apos;
avatars:
  - &apos;mathias-bynens&apos;
date: 2018-12-13
tags:
  - ECMAScript
  - ES2022
  - io19
  - Node.js 14
description: &apos;Несколько предложений расширяют существующий синтаксис классов JavaScript новыми функциями. В этой статье объясняется новый синтаксис публичных полей классов в V8 v7.2 и Chrome 72, а также предстоящий синтаксис приватных полей классов.&apos;
tweet: &apos;1121395767170740225&apos;
---
Несколько предложений расширяют существующий синтаксис классов JavaScript новыми функциями. В этой статье объясняется новый синтаксис публичных полей классов в V8 v7.2 и Chrome 72, а также предстоящий синтаксис приватных полей классов.

Вот пример кода, который создает экземпляр класса с именем `IncreasingCounter`:

```js
const counter = new IncreasingCounter();
counter.value;
// выводит &apos;Получение текущего значения!&apos;
// → 0
counter.increment();
counter.value;
// выводит &apos;Получение текущего значения!&apos;
// → 1
```

Обратите внимание, что доступ к `value` выполняет некоторый код (например, записывает сообщение) перед возвратом результата. Теперь задайте себе вопрос, как вы бы реализовали этот класс на JavaScript? 🤔

## Синтаксис классов ES2015

Вот как можно было бы реализовать `IncreasingCounter` с использованием синтаксиса классов ES2015:

```js
class IncreasingCounter {
  constructor() {
    this._count = 0;
  }
  get value() {
    console.log(&apos;Получение текущего значения!&apos;);
    return this._count;
  }
  increment() {
    this._count++;
  }
}
```

Класс устанавливает геттер `value` и метод `increment` на прототипе. Более интересно то, что класс имеет конструктор, который создает свойство экземпляра `_count` и задает для него значение по умолчанию `0`. В настоящее время мы часто используем префикс подчеркивания, чтобы указать, что `_count` не должен напрямую использоваться потребителями класса, но это всего лишь соглашение; на самом деле это не _приватное_ свойство со специальной семантикой, обеспечиваемой языком.

<!--truncate-->
```js
const counter = new IncreasingCounter();
counter.value;
// выводит &apos;Получение текущего значения!&apos;
// → 0

// Ничто не мешает людям читать или изменять
// свойство экземпляра `_count`. 😢
counter._count;
// → 0
counter._count = 42;
counter.value;
// выводит &apos;Получение текущего значения!&apos;
// → 42
```

## Публичные поля классов

Новый синтаксис публичных полей классов позволяет упростить определение классов:

```js
class IncreasingCounter {
  _count = 0;
  get value() {
    console.log(&apos;Получение текущего значения!&apos;);
    return this._count;
  }
  increment() {
    this._count++;
  }
}
```

Свойство `_count` теперь удобно объявлено в начале класса. Теперь нам не нужен конструктор только для определения некоторых полей. Красота!

Однако поле `_count` все еще является публичным свойством. В этом конкретном примере мы хотим предотвратить прямой доступ к этому свойству.

## Приватные поля классов

На помощь приходят приватные поля классов. Новый синтаксис приватных полей похож на публичные поля, за исключением того, что [вы отмечаете поле как приватное, используя `#`](https://github.com/tc39/proposal-class-fields/blob/master/PRIVATE_SYNTAX_FAQ.md). Вы можете представить `#` как часть имени поля:

```js
class IncreasingCounter {
  #count = 0;
  get value() {
    console.log(&apos;Получение текущего значения!&apos;);
    return this.#count;
  }
  increment() {
    this.#count++;
  }
}
```

Приватные поля недоступны за пределами тела класса:

```js
const counter = new IncreasingCounter();
counter.#count;
// → SyntaxError
counter.#count = 42;
// → SyntaxError
```

## Публичные и приватные статические свойства

Синтаксис полей классов может быть использован для создания публичных и приватных статических свойств и методов:

```js
class FakeMath {
  // `PI` — статическое публичное свойство.
  static PI = 22 / 7; // Достаточно близко.

  // `#totallyRandomNumber` — статическое приватное свойство.
  static #totallyRandomNumber = 4;

  // `#computeRandomNumber` — статический приватный метод.
  static #computeRandomNumber() {
    return FakeMath.#totallyRandomNumber;
  }

  // `random` — статический публичный метод (синтаксис ES2015)
  // который использует `#computeRandomNumber`.
  static random() {
    console.log(&apos;Я слышал, вы любите случайные числа…&apos;);
    return FakeMath.#computeRandomNumber();
  }
}

FakeMath.PI;
// → 3.142857142857143
FakeMath.random();
// выводит &apos;Я слышал, вы любите случайные числа…&apos;
// → 4
FakeMath.#totallyRandomNumber;
// → SyntaxError
FakeMath.#computeRandomNumber();
// → SyntaxError
```

## Упрощенное наследование

Преимущества синтаксиса полей классов становятся еще более очевидными при работе с подклассами, которые добавляют дополнительные поля. Представьте следующий базовый класс `Animal`:

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}
```

Чтобы создать подкласс `Cat`, который добавляет дополнительное свойство экземпляра, ранее вам пришлось бы вызвать `super()` для выполнения конструктора базового класса `Animal` перед созданием свойства:

```js
class Cat extends Animal {
  constructor(name) {
    super(name);
    this.likesBaths = false;
  }
  мяукать() {
    console.log(&apos;Мяу!&apos;);
  }
}
```

Это много шаблонного кода только для того, чтобы указать, что кошки не любят принимать ванны. К счастью, синтаксис полей классов устраняет необходимость во всем конструкторе, включая неудобный вызов `super()`:

```js
class Cat extends Animal {
  likesBaths = false;
  мяукать() {
    console.log(&apos;Мяу!&apos;);
  }
}
```

## Поддержка функций

### Поддержка публичных полей класса

<feature-support chrome="72 /blog/v8-release-72#public-class-fields"
                 firefox="yes https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/69#JavaScript"
                 safari="yes https://bugs.webkit.org/show_bug.cgi?id=174212"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-class-properties"></feature-support>

### Поддержка приватных полей класса

<feature-support chrome="74 /blog/v8-release-74#private-class-fields"
                 firefox="90 https://spidermonkey.dev/blog/2021/05/03/private-fields-ship.html"
                 safari="yes"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-class-properties"></feature-support>

### Поддержка приватных методов и аксессоров

<feature-support chrome="84 /blog/v8-release-84#private-methods-and-accessors"
                 firefox="90 https://spidermonkey.dev/blog/2021/05/03/private-fields-ship.html"
                 safari="yes https://webkit.org/blog/11989/new-webkit-features-in-safari-15/"
                 nodejs="14.6.0"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-private-methods"></feature-support>
