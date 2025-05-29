---
title: "Статические блоки инициализации классов"
author: "Shu-yu Guo ([@_shu](https://twitter.com/_shu))"
avatars:
  - "shu-yu-guo"
date: 2021-03-30
tags:
  - ECMAScript
description: "Классы JavaScript получили синтаксис для статической инициализации."
tweet: "1376925666780798989"
---
Новый синтаксис статического блока инициализации классов позволяет разработчикам собирать код, который должен выполняться один раз для определения класса, и размещать его в одном месте. Рассмотрим следующий пример, где генератор псевдослучайных чисел использует статический блок для инициализации пула энтропии один раз, когда выполняется определение `class MyPRNG`.

<!--truncate-->
```js
class MyPRNG {
  constructor(seed) {
    if (seed === undefined) {
      if (MyPRNG.entropyPool.length === 0) {
        throw new Error('Пул энтропии исчерпан');
      }
      seed = MyPRNG.entropyPool.pop();
    }
    this.seed = seed;
  }

  getRandom() { … }

  static entropyPool = [];
  static {
    for (let i = 0; i < 512; i++) {
      this.entropyPool.push(probeEntropySource());
    }
  }
}
```

## Область видимости

Каждый статический блок инициализации имеет свою собственную область видимости для `var` и `let`/`const`. Как и в инициализаторах статических полей, значение `this` в статических блоках относится к самому классу-конструктору. Аналогично, `super.property` внутри статического блока ссылается на статическое свойство родительского класса.

```js
var y = 'внешний y';
class A {
  static fieldA = 'A.fieldA';
}
class B extends A {
  static fieldB = 'B.fieldB';
  static {
    let x = super.fieldA;
    // → 'A.fieldA'
    var y = this.fieldB;
    // → 'B.fieldB'
  }
}
// Поскольку статические блоки имеют свою область видимости `var`, `var` не всплывает!
y;
// → 'внешний y'
```

## Несколько блоков

Класс может иметь более одного статического блока инициализации. Эти блоки выполняются в порядке их текстового расположения. Кроме того, если есть статические поля, все статические элементы выполняются в текстовом порядке.

```js
class C {
  static field1 = console.log('поле 1');
  static {
    console.log('статический блок 1');
  }
  static field2 = console.log('поле 2');
  static {
    console.log('статический блок 2');
  }
}
// → поле 1
//   статический блок 1
//   поле 2
//   статический блок 2
```

## Доступ к приватным полям

Поскольку статический блок инициализации класс всегда вложен внутри класса, он имеет доступ к приватным полям этого класса.

```js
let getDPrivateField;
class D {
  #privateField;
  constructor(v) {
    this.#privateField = v;
  }
  static {
    getDPrivateField = (d) => d.#privateField;
  }
}
getDPrivateField(new D('приватное'));
// → приватное
```

Это все. Удачной объектно-ориентированности!

## Поддержка статических блоков инициализации классов

<feature-support chrome="91 https://bugs.chromium.org/p/v8/issues/detail?id=11375"
                 firefox="нет"
                 safari="нет"
                 nodejs="нет"
                 babel="да https://babeljs.io/docs/en/babel-plugin-proposal-class-static-block"></feature-support>
