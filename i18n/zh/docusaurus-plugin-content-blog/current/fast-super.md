---
title: "超级快速的`super`属性访问"
author: "[Marja Hölttä](https://twitter.com/marjakh)，超级优化师"
avatars:
  - marja-holtta
date: 2021-02-18
tags:
  - JavaScript
description: "在 V8 v9.0 中更快的 super 属性访问"
tweet: "1362465295848333316"
---

[`super` 关键字](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super) 可用于访问对象父级上的属性和函数。

以前，访问 super 属性（例如 `super.x`）是通过运行时调用实现的。从 V8 v9.0 开始，我们在非优化代码中重用了[内联缓存 (IC) 系统](https://mathiasbynens.be/notes/shapes-ics)，并且为 super 属性访问生成了适当的优化代码，而不需要跳转到运行时。

<!--truncate-->
如下面的图表所示，由于运行时调用的原因，super 属性访问以前比普通属性访问慢了一个数量级。现在，我们已经非常接近并驾齐驱。

![将 super 属性访问与常规属性访问进行比较（已优化）](/_img/fast-super/super-opt.svg)

![将 super 属性访问与常规属性访问进行比较（未优化）](/_img/fast-super/super-no-opt.svg)

super 属性访问很难基准测试，因为它必须发生在函数内部。我们不能基准测试单个属性访问，只能是较大的工作块。因此，测量中包含了函数调用开销。上述图表对 super 属性访问与普通属性访问之间的差异有所低估，但它们足以展示旧的超属性访问与新的超属性访问之间的差异。

在未优化（解释）的模式下，super 属性访问总是比普通属性访问慢，因为我们需要进行更多的加载操作（从上下文中读取 home 对象并从 home 对象中读取 `__proto__`）。在优化代码中，我们已经尽可能将 home 对象嵌入为常量。这可以通过将其 `__proto__` 也嵌入为常量而进一步改进。

### 原型继承和 `super`

让我们从基础开始——super 属性访问到底是什么意思？

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

现在 `A` 是 `B` 的超类，`b.m()` 会返回 `100`，正如你所料。

![类继承图](/_img/fast-super/inheritance-1.svg)

[JavaScript 的原型继承](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain) 的现实情况更复杂：

![原型继承图](/_img/fast-super/inheritance-2.svg)

我们需要仔细区分 `__proto__` 和 `prototype` 属性——它们的含义不同！更使人困惑的是，对象 `b.__proto__` 通常被称为“`b` 的原型”。

`b.__proto__` 是 `b` 继承属性的对象。而 `B.prototype` 是由 `new B()` 创建的对象的 `__proto__`，也就是说 `b.__proto__ === B.prototype`。

接下来，`B.prototype` 具有自己的 `__proto__` 属性，其值等于 `A.prototype`。这共同构成了所谓的原型链：

```
b ->
 b.__proto__ === B.prototype ->
  B.prototype.__proto__ === A.prototype ->
   A.prototype.__proto__ === Object.prototype ->
    Object.prototype.__proto__ === null
```

通过这个链，`b` 可以访问在这些对象中的任何一个定义的属性。方法 `m` 是 `B.prototype` 的属性——即 `B.prototype.m`——这也是为什么 `b.m()` 能够工作。

现在我们可以将 `super.x` 定义为一种属性查找，其中我们从*home 对象*的 `__proto__` 开始查找属性 `x`，并沿着原型链向上查找直到找到它。

home 对象是方法定义所在的对象——在此例中，`m` 的 home 对象是 `B.prototype`。其 `__proto__` 是 `A.prototype`，因此我们从这里开始查找属性 `x`。我们称 `A.prototype` 为*查找起点对象*。在这种情况下，我们在查找起点对象中立即找到了属性 `x`，但一般来说，它可能位于原型链的更上层。

如果 `B.prototype` 有一个名为 `x` 的属性，我们会忽略它，因为我们开始查找的位置是在原型链之上的。此外，在这种情况下，super 属性查找不依赖于*接收者*——即调用方法时作为 `this` 值的对象。

```javascript
B.prototype.m.call(some_other_object); // 仍然返回 100
```

不过，如果属性有一个 getter，那么接收者将作为 `this` 值传递给 getter。

总结：在 super 属性访问 `super.x` 中，查找起点对象是 home 对象的 `__proto__`，接收者是 super 属性访问发生的那个方法的接收者。

在正常的属性访问中，`o.x`，我们开始在`o`中查找属性`x`并遍历原型链。如果`x`碰巧有一个getter，我们还会使用`o`作为接收者——查找起点对象和接收者是同一个对象（`o`）。

*超级属性访问与普通属性访问类似，但查找起点对象和接收者不同。*

### 实现更快的`super`

上述认识也是实现快速超级属性访问的关键。V8已经设计为使属性访问变得快速——现在我们将其推广到接收者和查找起点对象不同时的情况。

V8的数据驱动内联缓存(IC)系统是实现快速属性访问的核心部分。您可以在上面链接的[高级介绍](https://mathiasbynens.be/notes/shapes-ics)中阅读相关内容，也可以查看[V8的对象表示](https://v8.dev/blog/fast-properties)和[如何实现V8的数据驱动内联缓存系统](https://docs.google.com/document/d/1mEhMn7dbaJv68lTAvzJRCQpImQoO6NZa61qRimVeA-k/edit?usp=sharing)的更详细描述。

为了加快`super`的访问，我们添加了一个新的[Ignition](https://v8.dev/docs/ignition)字节码`LdaNamedPropertyFromSuper`，它使我们能够在解释模式中插入到IC系统中，同时生成用于超级属性访问的优化代码。

通过新的字节码，我们可以添加一个新的IC`LoadSuperIC`，用于加速超级属性加载。与处理普通属性加载的`LoadIC`类似，`LoadSuperIC`会跟踪它见过的查找起点对象的形状，并记住如何从具有这些形状的对象加载属性。

`LoadSuperIC`重用了现有的用于属性加载的IC机制，只是使用了不同的查找起点对象。由于IC层已经区分查找起点对象和接收者，实现应该很简单。但由于查找起点对象和接收者始终是同一个对象，导致了一些错误，例如我们使用了查找起点对象，而实际上打算使用接收者，反之亦然。这些错误已经修复，我们现在正确支持查找起点对象和接收者不同的情况。

用于超级属性访问的优化代码由[TurboFan](https://v8.dev/docs/turbofan)编译器的`JSNativeContextSpecialization`阶段生成。实现基于现有的属性查找机制（[`JSNativeContextSpecialization::ReduceNamedAccess`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/js-native-context-specialization.cc;l=1130)）进行了推广，以处理接收者和查找起点对象不同的情况。

当我们将home对象从存储它的`JSFunction`中移出时，优化代码变得更加优化。现在它存储在类上下文中，这使得TurboFan可以尽可能将其嵌入到优化代码中作为常量。

## `super`的其他使用场景

`super`在对象字面量方法中的工作方式与在类方法中相同，并且进行了类似的优化。

```javascript
const myproto = {
  __proto__: { 'x': 100 },
  m() { return super.x; }
};
const o = { __proto__: myproto };
o.m(); // 返回 100
```

当然，还有一些我们没有优化的边界情况。例如，写入超级属性（`super.x = ...`）没有优化。此外，使用mixins会使访问位置变为megamoorphic，导致超级属性访问变慢：

```javascript
function createMixin(base) {
  class Mixin extends base {
    m() { return super.m() + 1; }
    //                ^ 此访问位置是megamoorphic
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

仍需继续努力以确保所有面向对象的模式尽可能获得最高速度优化——敬请关注进一步优化！
