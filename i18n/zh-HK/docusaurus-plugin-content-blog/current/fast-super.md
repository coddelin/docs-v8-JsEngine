---
title: '超高速的 `super` 屬性訪問'
author: '[Marja Hölttä](https://twitter.com/marjakh)，super 優化器'
avatars:
  - marja-holtta
date: 2021-02-18
tags:
  - JavaScript
description: '在 V8 v9.0 中更快的 super 屬性訪問'
tweet: '1362465295848333316'
---

[`super` 關鍵字](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Operators/super) 可用於訪問物件父級的屬性和函數。

以前，訪問 super 屬性（如 `super.x`）是通過執行期呼叫實現的。從 V8 v9.0 開始，我們在未優化的程式碼中重用了[內聯快取（IC）系統](https://mathiasbynens.be/notes/shapes-ics)，並為 super 屬性訪問生成適當的優化程式碼，而無需跳轉到執行期。

<!--truncate-->
從下面的圖表可以看到，super 屬性訪問過去因執行期呼叫比普通屬性訪問慢了一個數量級。現在我們已經非常接近兩者的性能。

![對比 super 屬性訪問和普通屬性訪問，已優化](/_img/fast-super/super-opt.svg)

![對比 super 屬性訪問和普通屬性訪問，未優化](/_img/fast-super/super-no-opt.svg)

super 屬性訪問很難進行基準測試，因為它必須發生在函數內。我們無法僅對單個屬性訪問進行基準測試，只能測試更大塊的程式碼，因此測量中包含了函數調用的開銷。上述圖表對 super 屬性訪問和普通屬性訪問之間的差異有所低估，但它們足以顯示舊實現與新實現之間的區別。

在未優化（解釋器）模式下，super 屬性訪問總是比普通屬性訪問慢，因為我們需要更多的載入操作（從上下文讀取 home object，並從 home object 讀取其 `__proto__`）。在優化程式碼中，我們已儘可能將 home object 嵌入為常量。這還可以進一步改進，通過將其 `__proto__` 也嵌入為常量。

### 原型繼承與 `super`

我們從基礎開始 - super 屬性訪問究竟是什麼意思？

```javascript
class A { }
A.prototype.x = 100;

class B extends A {
  m() {
    return super.x;
  }
}
const b = new B();
b.m();
```

現在，`A` 是 `B` 的超類別，而 `b.m()` 返回我們預期的 `100`。

![類別繼承圖](/_img/fast-super/inheritance-1.svg)

[JavaScript 的原型繼承](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Inheritance_and_the_prototype_chain) 的實際情況更為複雜：

![原型繼承圖](/_img/fast-super/inheritance-2.svg)

我們需要仔細區分 `__proto__` 和 `prototype` 屬性——它們不是一回事！讓人更困惑的是，物件 `b.__proto__` 通常被稱為 "`b` 的原型"。

`b.__proto__` 是 `b` 繼承屬性的物件。`B.prototype` 是使用 `new B()` 創建的物件其 `__proto__` 的物件，也就是說 `b.__proto__ === B.prototype`。

接著，`B.prototype` 擁有自己的 `__proto__` 屬性，該屬性等於 `A.prototype`。這形成了所謂的原型鏈：

```
b ->
 b.__proto__ === B.prototype ->
  B.prototype.__proto__ === A.prototype ->
   A.prototype.__proto__ === Object.prototype ->
    Object.prototype.__proto__ === null
```

通過這個鏈條，`b` 可以訪問這些物件中定義的所有屬性。方法 `m` 是 `B.prototype` 的屬性 - `B.prototype.m` - 這就是為什麼 `b.m()` 能生效。

現在我們可以將 `m` 裡的 `super.x` 定義為一次屬性查找，從 home object 的 `__proto__` 開始查找屬性 `x`，然後沿原型鏈上溯，直到找到它為止。

home object 是定義該方法的物件 - 在該例中，`B.prototype` 是 `m` 的 home object。它的 `__proto__` 是 `A.prototype`，所以我們從這裡開始查找屬性 `x`。在該範例中，我們在查找起始物件中就找到了屬性 `x`，但通常情況下，它也可能位於原型鏈的更上層。

如果 `B.prototype` 中有名為 `x` 的屬性，我們會忽略它，因為我們是從原型鏈上一層以上開始查找的。另外，在這種情況下，super 屬性查找與方法調用時的接收者（`this` 的值）無關。

```javascript
B.prototype.m.call(some_other_object); // 仍然返回 100
```

不過，如果該屬性有 getter，那麼接收者會作為 `this` 值傳遞給 getter。

總結來說：在 super 屬性訪問中，`super.x` 的查找起始物件是 home object 的 `__proto__`，而接收者是執行 super 屬性訪問的函數的接收者。

在普通的屬性存取`o.x`中，我們從物件`o`開始尋找屬性`x`，並沿著原型鏈向上查找。如果`x`碰巧有一個取值器，我們會使用`o`作為接收者——查找起始物件和接收者為同一物件(`o`)。

*Super屬性存取與普通屬性存取相似，但查找起始物件與接收者是不同的。*

### 實現更快的`super`

上述理解也是實現快速super屬性存取的關鍵。V8已經設計為使屬性存取快速——現在我們將其泛化，適用於接收者與查找起始物件不同的情況。

V8的數據驅動內聯快取系統是實現快速屬性存取的核心部分。您可以閱讀[高層次介紹](https://mathiasbynens.be/notes/shapes-ics)（以上鏈結），或更詳細的[關於V8的物件表示](https://v8.dev/blog/fast-properties)和[V8的數據驅動內聯快取系統如何實現](https://docs.google.com/document/d/1mEhMn7dbaJv68lTAvzJRCQpImQoO6NZa61qRimVeA-k/edit?usp=sharing)描述。

為了加速`super`，我們在[Ignition](https://v8.dev/docs/ignition)字節碼中添加了一個新的操作碼`LdaNamedPropertyFromSuper`，使我們能在解釋模式下插入IC系統，並為super屬性存取生成優化代碼。

有了新的字節碼，我們可以新增一個新的IC`LoadSuperIC`來加速super屬性加載。類似於處理普通屬性加載的`LoadIC`，`LoadSuperIC`記錄了它看到的查找起始物件的形狀，並記住如何從具有這些形狀之一的物件中加載屬性。

`LoadSuperIC`重用了現有的IC機制來加載屬性，只是在查找起始物件不同的情況下。由於IC層已經區分了查找起始物件與接收者，實現應該是容易的。但是，由於查找起始物件與接收者過去始終是相同的，因此出現了一些問題，比如我們會使用查找起始物件即使我們本意是指接收者，反之亦然。這些問題已經修復，我們現在正確支持查找起始物件與接收者不同的情況。

TurboFan編譯器的[JSNativeContextSpecialization](https://v8.dev/docs/turbofan)階段生成針對super屬性存取的優化代碼。該實現將現有的屬性查找機制([`JSNativeContextSpecialization::ReduceNamedAccess`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/js-native-context-specialization.cc;l=1130))泛化，以處理接收者與查找起始物件不同的情況。

當我們把主物件從先前存放的`JSFunction`中移出時，優化代碼變得更有效率。現在它存放在類別上下文中，使得TurboFan在可能的情況下，將其作為常數嵌入到優化代碼中。

## `super`的其他用法

在物件字面量方法中的`super`用法與在類方法中的用法一樣，並且有相似的優化。

```javascript
const myproto = {
  __proto__: { 'x': 100 },
  m() { return super.x; }
};
const o = { __proto__: myproto };
o.m(); // 返回100
```

當然，有一些我們未優化的特殊情況。例如，寫入super屬性（`super.x = ...`）未經過優化。此外，使用mixin會使存取位置超形態化，導致super屬性存取變慢：

```javascript
function createMixin(base) {
  class Mixin extends base {
    m() { return super.m() + 1; }
    //                ^ 此存取位置是超形態化的
  }
  return Mixin;
}

class Base {
  m() { return 0; }
}

const myClass = createMixin(
  createMixin(
    createMixin(
      createMixin(
        createMixin(Base)
      )
    )
  )
);
(new myClass()).m();
```

我們還需要進一步努力，以確保所有物件導向模式的運行速度都達到最佳性能——敬請期待進一步的優化！
