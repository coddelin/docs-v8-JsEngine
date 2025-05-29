---
title: "私有品牌檢查，也就是 `#foo in obj`"
author: "Marja Hölttä ([@marjakh](https://twitter.com/marjakh))"
avatars:
  - "marja-holtta"
date: 2021-04-14
tags:
  - ECMAScript
description: "私有品牌檢查允許測試物件中是否存在私有字段。"
tweet: "1382327454975590401"
---

The [`in` operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in) 可用於測試給定的物件（或其原型鏈上的任何物件）是否具有給定屬性:

```javascript
const o1 = {'foo': 0};
console.log('foo' in o1); // true
const o2 = {};
console.log('foo' in o2); // false
const o3 = Object.create(o1);
console.log('foo' in o3); // true
```

私有品牌檢查功能擴展了 `in` 操作符以支持[私有類字段](https://v8.dev/features/class-fields#private-class-fields):

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

A.test(new B()); // false; 它不是相同的 #foo
```

由於私有名稱僅在定義它們的類中可用，測試也必須發生在類內部，例如在像上面的 `static test` 方法中。

子類實例接收來自父類的私有字段作為自身屬性:

```javascript
class SubA extends A {};
A.test(new SubA()); // true
```

但是通過 `Object.create` 創建的物件（或稍後通過 `__proto__` 設置器或 `Object.setPrototypeOf` 設置了原型的物件）未接收到私有字段作為自身屬性。由於私有字段查找僅作用於自身屬性，`in` 操作符無法找到這些繼承的字段:

<!--truncate-->
```javascript
const a = new A();
const o = Object.create(a);
A.test(o); // false, 私有字段是繼承的而不是屬於自身
A.test(o.__proto__); // true

const o2 = {};
Object.setPrototypeOf(o2, a);
A.test(o2); // false, 私有字段是繼承的而不是屬於自身
A.test(o2.__proto__); // true
```

訪問不存在的私有字段會拋出錯誤——與正常屬性不同，當訪問不存在的屬性時會返回 `undefined` 而不拋出錯誤。在私有品牌檢查之前，開發者被迫使用 `try`-`catch` 來實現需要的私有字段不存在的情況下的回退行為:

```javascript
class D {
  use(obj) {
    try {
      obj.#foo;
    } catch {
      // 回退情況：obj 沒有 #foo
    }
  }
  #foo = 0;
}
```

現在可以使用私有品牌檢查來測試私有字段是否存在:

```javascript
class E {
  use(obj) {
    if (#foo in obj) {
      obj.#foo;
    } else {
      // 回退情況：obj 沒有 #foo
    }
  }
  #foo = 0;
}
```

但請注意——某個私有字段的存在並不保證該物件具有類中宣告的所有私有字段！以下示例顯示了一個半構造的物件，它僅具有類中宣告的兩個私有字段之一:

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

## 私有品牌檢查支持

<feature-support chrome="91 https://bugs.chromium.org/p/v8/issues/detail?id=11374"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>
