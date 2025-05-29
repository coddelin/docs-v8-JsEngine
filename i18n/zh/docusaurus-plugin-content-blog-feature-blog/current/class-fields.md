---
title: '公共和私有类字段'
author: 'Mathias Bynens ([@mathias](https://twitter.com/mathias))'
avatars:
  - 'mathias-bynens'
date: 2018-12-13
tags:
  - ECMAScript
  - ES2022
  - io19
  - Node.js 14
description: '多个提案扩展了现有的JavaScript类语法，新增了功能。本文解释了V8 v7.2和Chrome 72中的公共类字段的新语法，以及即将到来的私有类字段语法。'
tweet: '1121395767170740225'
---
多个提案扩展了现有的JavaScript类语法，新增了功能。本文解释了V8 v7.2和Chrome 72中的公共类字段的新语法，以及即将到来的私有类字段语法。

以下是一个创建名为`IncreasingCounter`的类实例的代码示例：

```js
const counter = new IncreasingCounter();
counter.value;
// 输出 '获取当前值!'
// → 0
counter.increment();
counter.value;
// 输出 '获取当前值!'
// → 1
```

注意，访问`value`会执行一些代码（例如打印一条消息）然后返回结果。现在请思考，如何在JavaScript中实现这个类呢？🤔

## ES2015类语法

以下是使用ES2015类语法实现`IncreasingCounter`的方法：

```js
class IncreasingCounter {
  constructor() {
    this._count = 0;
  }
  get value() {
    console.log('获取当前值!');
    return this._count;
  }
  increment() {
    this._count++;
  }
}
```

该类在原型上安装了`value`的getter和一个`increment`方法。更有趣的是，类具有一个构造函数，该构造函数创建了一个实例属性`_count`并将其默认值设置为`0`。目前我们倾向于使用下划线前缀来表示`_count`不应该被类的使用者直接使用，但这只是一种约定，并不是一种真正的由语言强制执行的“私有”属性。

<!--truncate-->
```js
const counter = new IncreasingCounter();
counter.value;
// 输出 '获取当前值!'
// → 0

// 没有什么能阻止人们读取或篡改
// `_count`实例属性。😢
counter._count;
// → 0
counter._count = 42;
counter.value;
// 输出 '获取当前值!'
// → 42
```

## 公共类字段

新的公共类字段语法允许我们简化类定义：

```js
class IncreasingCounter {
  _count = 0;
  get value() {
    console.log('获取当前值!');
    return this._count;
  }
  increment() {
    this._count++;
  }
}
```

`_count`属性现在可以很好地声明在类的顶部。我们不再需要构造函数来定义某些字段。很简洁！

然而，`_count`字段仍然是一个公共属性。在这个特定示例中，我们希望阻止人们直接访问该属性。

## 私有类字段

这就是私有类字段的用武之地。新的私有字段语法类似于公共字段，只不过[通过使用`#`标记字段为私有字段](https://github.com/tc39/proposal-class-fields/blob/master/PRIVATE_SYNTAX_FAQ.md)。可以将`#`看作是字段名称的一部分：

```js
class IncreasingCounter {
  #count = 0;
  get value() {
    console.log('获取当前值!');
    return this.#count;
  }
  increment() {
    this.#count++;
  }
}
```

私有字段不能在类体外部访问：

```js
const counter = new IncreasingCounter();
counter.#count;
// → SyntaxError
counter.#count = 42;
// → SyntaxError
```

## 公共和私有静态属性

类字段语法也可以用来创建公共和私有静态属性和方法：

```js
class FakeMath {
  // `PI`是一个静态公共属性。
  static PI = 22 / 7; // 大致准确。

  // `#totallyRandomNumber`是一个静态私有属性。
  static #totallyRandomNumber = 4;

  // `#computeRandomNumber`是一个静态私有方法。
  static #computeRandomNumber() {
    return FakeMath.#totallyRandomNumber;
  }

  // `random`是一个静态公共方法(ES2015语法)
  // 它使用了`#computeRandomNumber`。
  static random() {
    console.log('听说你喜欢随机数…');
    return FakeMath.#computeRandomNumber();
  }
}

FakeMath.PI;
// → 3.142857142857143
FakeMath.random();
// 输出 '听说你喜欢随机数…'
// → 4
FakeMath.#totallyRandomNumber;
// → SyntaxError
FakeMath.#computeRandomNumber();
// → SyntaxError
```

## 更简单的子类化

当处理引入额外字段的子类时，类字段语法的好处更加清晰。设想以下基类`Animal`：

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}
```

为了创建一个引入额外实例属性的`Cat`子类，你以前不得不调用`super()`来运行`Animal`基类的构造函数，然后再创建该属性：

```js
class Cat extends Animal {
  constructor(name) {
    super(name);
    this.likesBaths = false;
  }
  meow() {
    console.log('喵！');
  }
}
```

仅仅为了表示猫不喜欢洗澡就需要写这么多样板代码。幸运的是，类字段语法消除了对整个构造函数的需要，包括那个笨拙的 `super()` 调用：

```js
class Cat extends Animal {
  likesBaths = false;
  meow() {
    console.log('喵！');
  }
}
```

## 功能支持

### 支持公共类字段

<feature-support chrome="72 /blog/v8-release-72#public-class-fields"
                 firefox="yes https://developer.mozilla.org/zh-CN/docs/Mozilla/Firefox/Releases/69#JavaScript"
                 safari="yes https://bugs.webkit.org/show_bug.cgi?id=174212"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://babeljs.io/docs/zh-hans/babel-plugin-proposal-class-properties"></feature-support>

### 支持私有类字段

<feature-support chrome="74 /blog/v8-release-74#private-class-fields"
                 firefox="90 https://spidermonkey.dev/blog/2021/05/03/private-fields-ship.html"
                 safari="yes"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes https://babeljs.io/docs/zh-hans/babel-plugin-proposal-class-properties"></feature-support>

### 支持私有方法和访问器

<feature-support chrome="84 /blog/v8-release-84#private-methods-and-accessors"
                 firefox="90 https://spidermonkey.dev/blog/2021/05/03/private-fields-ship.html"
                 safari="yes https://webkit.org/blog/11989/new-webkit-features-in-safari-15/"
                 nodejs="14.6.0"
                 babel="yes https://babeljs.io/docs/zh-hans/babel-plugin-proposal-private-methods"></feature-support>
