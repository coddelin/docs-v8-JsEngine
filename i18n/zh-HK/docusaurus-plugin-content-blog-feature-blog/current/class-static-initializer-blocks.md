---
title: &apos;類別靜態初始化區塊&apos;
author: &apos;Shu-yu Guo ([@_shu](https://twitter.com/_shu))&apos;
avatars:
  - &apos;shu-yu-guo&apos;
date: 2021-03-30
tags:
  - ECMAScript
description: &apos;JavaScript 類別獲得用於靜態初始化的專用語法。&apos;
tweet: &apos;1376925666780798989&apos;
---
新的類別靜態初始化區塊語法允許開發者將應該在某個類別定義中執行一次的代碼集中到一個地方。以下是一個示例，其中一個偽隨機數生成器使用靜態區塊在 `class MyPRNG` 定義被評估時初始化熵池一次。

<!--truncate-->
```js
class MyPRNG {
  constructor(seed) {
    if (seed === undefined) {
      if (MyPRNG.entropyPool.length === 0) {
        throw new Error(&apos;熵池耗盡&apos;);
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

## 範疇

每個靜態初始化區塊都有自己獨立的 `var` 和 `let`/`const` 範疇。就像在靜態字段初始化器中一樣，靜態區塊中的 `this` 值是類別構造函數本身。同樣，靜態區塊中的 `super.property` 指的是父類的靜態屬性。

```js
var y = &apos;外部的 y&apos;;
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
// 由於靜態區塊是它自己的 `var` 範疇，因此 `var` 不會提升！
y;
// → &apos;外部的 y&apos;
```

## 多個靜態區塊

一個類別可以有多個靜態初始化區塊。這些區塊會按照文本順序進行評估。此外，如果存在任何靜態字段，所有靜態元素都按文本順序進行評估。

```js
class C {
  static field1 = console.log(&apos;字段 1&apos;);
  static {
    console.log(&apos;靜態區塊 1&apos;);
  }
  static field2 = console.log(&apos;字段 2&apos;);
  static {
    console.log(&apos;靜態區塊 2&apos;);
  }
}
// → 字段 1
//   靜態區塊 1
//   字段 2
//   靜態區塊 2
```

## 訪問私有字段

由於類別靜態初始化區塊始終嵌套在類別內部，它可以訪問該類別的私有字段。

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
getDPrivateField(new D(&apos;私有&apos;));
// → 私有
```

以上就是內容。祝你在面向對象編程中愉快！

## 類別靜態初始化區塊支援

<feature-support chrome="91 https://bugs.chromium.org/p/v8/issues/detail?id=11375"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="yes https://babeljs.io/docs/en/babel-plugin-proposal-class-static-block"></feature-support>
