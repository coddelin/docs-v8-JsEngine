---
title: "私有品牌检查，也就是 `#foo in obj`"
author: "Marja Hölttä ([@marjakh](https://twitter.com/marjakh))"
avatars:
  - "marja-holtta"
date: 2021-04-14
tags:
  - ECMAScript
description: "私有品牌检查允许测试对象中是否存在私有字段。"
tweet: "1382327454975590401"
---

[`in` 操作符](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in) 可以用来测试给定对象（或它的原型链上的任意对象）中是否有给定的属性：

```javascript
const o1 = {'foo': 0};
console.log('foo' in o1); // true
const o2 = {};
console.log('foo' in o2); // false
const o3 = Object.create(o1);
console.log('foo' in o3); // true
```

私有品牌检查功能扩展了 `in` 操作符，支持 [私有类字段](https://v8.dev/features/class-fields#private-class-fields)：

```javascript
class A {
  static test(obj) {
    console.log(#foo in obj);
  }
  #foo = 0;
}

A.test(new A()); // true
A.test({}); // false

class B {
  #foo = 0;
}

A.test(new B()); // false; 它不是同一个 #foo
```

由于私有名称仅在定义它们的类内部可用，所以测试也必须发生在类内部，例如在上面 `static test` 方法中。

子类实例接收来自父类的私有字段作为自己的属性：

```javascript
class SubA extends A {};
A.test(new SubA()); // true
```

但是通过 `Object.create` 创建的对象（或者通过 `__proto__` 设置器或 `Object.setPrototypeOf` 后来设置了原型的对象）没有作为自己的属性接收到私有字段。因为私有字段查找仅适用于自己的属性，所以 `in` 操作符找不到这些继承的字段：

<!--truncate-->
```javascript
const a = new A();
const o = Object.create(a);
A.test(o); // false, 私有字段被继承而非拥有
A.test(o.__proto__); // true

const o2 = {};
Object.setPrototypeOf(o2, a);
A.test(o2); // false, 私有字段被继承而非拥有
A.test(o2.__proto__); // true
```

访问不存在的私有字段会抛出错误——不同于普通属性，访问不存在的属性返回 `undefined` 并且不会抛出。在私有品牌检查出现之前，开发者不得不使用 `try`-`catch` 来为对象没有所需的私有字段的情况实现回退行为：

```javascript
class D {
  use(obj) {
    try {
      obj.#foo;
    } catch {
      // obj 没有 #foo 的回退处理
    }
  }
  #foo = 0;
}
```

现在可以通过私有品牌检查测试私有字段的存在性：

```javascript
class E {
  use(obj) {
    if (#foo in obj) {
      obj.#foo;
    } else {
      // obj 没有 #foo 的回退处理
    }
  }
  #foo = 0;
}
```

但请注意——一个私有字段的存在并不保证对象拥有类中声明的所有私有字段！以下示例展示了一个仅拥有其类声明的两个私有字段之一的半构建对象：

```javascript
let halfConstructed;
class F {
  m() {
    console.log(#x in this); // true
    console.log(#y in this); // false
  }
  #x = 0;
  #y = (() => {
    halfConstructed = this;
    throw 'error';
  })();
}

try {
  new F();
} catch {}

halfConstructed.m();
```

## 私有品牌检查支持

<feature-support chrome="91 https://bugs.chromium.org/p/v8/issues/detail?id=11374"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>
