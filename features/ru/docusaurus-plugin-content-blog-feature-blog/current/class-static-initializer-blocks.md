---
title: &apos;Статические блоки инициализации классов&apos;
author: &apos;Shu-yu Guo ([@_shu](https://twitter.com/_shu))&apos;
avatars:
  - &apos;shu-yu-guo&apos;
date: 2021-03-30
tags:
  - ECMAScript
description: &apos;Классы JavaScript получили синтаксис для статической инициализации.&apos;
tweet: &apos;1376925666780798989&apos;
---
Новый синтаксис статического блока инициализации классов позволяет разработчикам собирать код, который должен выполняться один раз для определения класса, и размещать его в одном месте. Рассмотрим следующий пример, где генератор псевдослучайных чисел использует статический блок для инициализации пула энтропии один раз, когда выполняется определение `class MyPRNG`.

<!--truncate-->
```js
class MyPRNG {
  constructor(seed) {
    if (seed === undefined) {
      if (MyPRNG.entropyPool.length === 0) {
        throw new Error(&apos;Пул энтропии исчерпан&apos;);
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
var y = &apos;внешний y&apos;;
class A {
  static fieldA = &apos;A.fieldA&apos;;
}
class B extends A {
  static fieldB = &apos;B.fieldB&apos;;
  static {
    let x = super.fieldA;
    // → &apos;A.fieldA&apos;
    var y = this.fieldB;
    // → &apos;B.fieldB&apos;
  }
}
// Поскольку статические блоки имеют свою область видимости `var`, `var` не всплывает!
y;
// → &apos;внешний y&apos;
```

## Несколько блоков

Класс может иметь более одного статического блока инициализации. Эти блоки выполняются в порядке их текстового расположения. Кроме того, если есть статические поля, все статические элементы выполняются в текстовом порядке.

```js
class C {
  static field1 = console.log(&apos;поле 1&apos;);
  static {
    console.log(&apos;статический блок 1&apos;);
  }
  static field2 = console.log(&apos;поле 2&apos;);
  static {
    console.log(&apos;статический блок 2&apos;);
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
getDPrivateField(new D(&apos;приватное&apos;));
// → приватное
```

Это все. Удачной объектно-ориентированности!

## Поддержка статических блоков инициализации классов

<feature-support chrome="91 https://bugs.chromium.org/p/v8/issues/detail?id=11375"
                 firefox="нет"
                 safari="нет"
                 nodejs="нет"
                 babel="да https://babeljs.io/docs/en/babel-plugin-proposal-class-static-block"></feature-support>
