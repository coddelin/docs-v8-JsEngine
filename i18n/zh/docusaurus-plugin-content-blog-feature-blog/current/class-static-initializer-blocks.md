---
title: "类的静态初始化块"
author: "郭舒语 ([@_shu](https://twitter.com/_shu))"
avatars: 
  - "shu-yu-guo"
date: 2021-03-30
tags: 
  - ECMAScript
description: "JavaScript 类获得用于静态初始化的专用语法。"
tweet: "1376925666780798989"
---
新的类静态初始化块语法允许开发者将针对某个类定义只运行一次的代码集中到一个地方。考虑下面的示例，其中一个伪随机数生成器使用静态块在 `class MyPRNG` 定义被评估时初始化一个熵池。

<!--truncate-->
```js
class MyPRNG {
  constructor(seed) {
    if (seed === undefined) {
      if (MyPRNG.entropyPool.length === 0) {
        throw new Error('熵池耗尽');
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

## 作用域

每个静态初始化块都有其独立的 `var` 和 `let`/`const` 作用域。就像静态字段初始化器中一样，静态块中的 `this` 值是类构造函数本身。同样，静态块中的 `super.property` 指的是超类的静态属性。

```js
var y = '外部 y';
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
// 由于静态块是其独立的 `var` 作用域，`var` 不会提升！
y;
// → '外部 y'
```

## 多个静态块

一个类可以有多个静态初始化块。这些块按文本顺序进行评估。此外，如果有任何静态字段，所有静态元素都会按文本顺序进行评估。

```js
class C {
  static field1 = console.log('字段 1');
  static {
    console.log('静态块 1');
  }
  static field2 = console.log('字段 2');
  static {
    console.log('静态块 2');
  }
}
// → 字段 1
//   静态块 1
//   字段 2
//   静态块 2
```

## 访问私有字段

由于类静态初始化块始终嵌套在类内部，它可以访问该类的私有字段。

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
getDPrivateField(new D('私有'));
// → 私有
```

就是这样了。祝你愉快使用面向对象！

## 类静态初始化块支持

<feature-support chrome="91 https://bugs.chromium.org/p/v8/issues/detail?id=11375"
                 firefox="不支持"
                 safari="不支持"
                 nodejs="不支持"
                 babel="支持 https://babeljs.io/docs/en/babel-plugin-proposal-class-static-block"></feature-support>
