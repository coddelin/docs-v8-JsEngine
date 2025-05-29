---
title: "更快地初始化具有新类特性的实例"
author: "[Joyee Cheung](https://twitter.com/JoyeeCheung)，实例初始化器"
avatars:
  - "joyee-cheung"
date: 2022-04-20
tags:
  - 内部
description: "自 V8 v9.7 以来，使用新类特性初始化实例的速度已经加快。"
tweet: "1517041137378373632"
---

类字段从 v7.2 开始在 V8 中推出，私有类方法从 v8.4 开始推出。随着提案在 2021 年达到第 4 阶段后，V8 开始着手改善对新类特性的支持——在此之前，这些特性应用存在两大主要问题：

<!--truncate-->
1. 类字段和私有方法的初始化比普通属性的赋值慢得多。
2. 在 [启动快照](https://v8.dev/blog/custom-startup-snapshots) 中，类字段初始值设定项有问题，而启动快照用于 Node.js 和 Deno 等嵌入器加快自身或用户应用程序的启动。

第一个问题已在 V8 v9.7 中修复，第二个问题的修复已在 V8 v10.0 中发布。这篇文章讨论了第一个问题如何解决，至于快照问题的修复，请参阅 [这篇文章](https://joyeecheung.github.io/blog/2022/04/14/fixing-snapshot-support-of-class-fields-in-v8/)。

## 优化类字段

为消除普通属性赋值与类字段初始化之间的性能差距，我们更新了现有的 [内联缓存（IC）系统](https://mathiasbynens.be/notes/shapes-ics) 以支持后者。在 v9.7 之前，V8 总是使用昂贵的运行时调用来进行类字段初始化。而从 v9.7 起，当 V8 认为初始化模式足够可预测时，它会使用新的 IC 来加速操作，就像普通属性赋值一样。

![初始化性能，优化后](/_img/faster-class-features/class-fields-performance-optimized.svg)

![初始化性能，解释执行](/_img/faster-class-features/class-fields-performance-interpreted.svg)

### 类字段的原始实现

为了实现私有字段，V8 使用内部的私有符号——它们是类似标准 `Symbol` 的内部 V8 数据结构，但在作为属性键使用时不可枚举。以下是一个示例类：


```js
class A {
  #a = 0;
  b = this.#a;
}
```

V8 会收集类字段初始值设定项（`#a = 0` 和 `b = this.#a`），并生成一个以这些初始值设定项作为函数体的合成实例成员函数。对此合成函数生成的字节码大致如下：

```cpp
// 将私有名称符号 `#a` 加载到 r1
LdaImmutableCurrentContextSlot [2]
Star r1

// 将 0 加载到 r2
LdaZero
Star r2

// 将目标移至 r0
Mov <this>, r0

// 使用 %AddPrivateField() 运行时函数存储属性键为私有名称符号 `#a` 的属性的值为 0，
// 即 `#a = 0`。
CallRuntime [AddPrivateField], r0-r2

// 将属性名 `b` 加载到 r1
LdaConstant [0]
Star r1

// 加载私有名称符号 `#a`
LdaImmutableCurrentContextSlot [2]

// 从实例中加载键为 `#a` 的属性值到 r2
LdaKeyedProperty <this>, [0]
Star r2

// 将目标移至 r0
Mov <this>, r0

// 使用 %CreateDataProperty() 运行时函数存储键为 `#a` 的属性作为键为 `b` 的属性的值，
// 即 `b = this.#a`
CallRuntime [CreateDataProperty], r0-r2
```

将上面的类与以下的类进行比较：

```js
class A {
  constructor() {
    this._a = 0;
    this.b = this._a;
  }
}
```

技术上这两个类并不完全等价，即使忽略 `this.#a` 和 `this._a` 的可见性差异。规范要求类字段初始化采用“定义”语义而非“设置”语义。也就是说，类字段的初始化不会触发 setter 或 `set` 代理陷阱。所以，第一个类的近似实现应使用 `Object.defineProperty()` 而非简单赋值来初始化属性。此外，如果实例中已经存在私有字段，它应该抛出错误（比如目标被覆盖从基类构造函数初始化为另一个实例时）：

```js
class A {
  constructor() {
    // 大致的 %AddPrivateField() 调用翻译为：
    const _a = %PrivateSymbol('#a')
    if (_a in this) {
      throw TypeError('不能在同一对象上二次初始化 #a');
    }
    Object.defineProperty(this, _a, {
      writable: true,
      configurable: false,
      enumerable: false,
      value: 0
    });
    // 大致的 %CreateDataProperty() 调用翻译为：
    Object.defineProperty(this, 'b', {
      writable: true,
      configurable: true,
      enumerable: true,
      value: this[_a]
    });
  }
}
```

在提案最终定稿之前，为了实现指定的语义，V8 使用了调用运行时函数的方式，因为它们更灵活。如上面的字节码所示，公共字段的初始化使用了 `%CreateDataProperty()` 运行时调用，而私有字段的初始化使用了 `%AddPrivateField()`。由于进入运行时调用会产生显著的开销，与普通对象属性的赋值相比，类字段的初始化速度要慢得多。

然而，在大多数使用场景中，语义差异并不显著。在这些情况下，能够像优化过的属性赋值那样拥有良好的性能是理想的 —— 因此在提案最终定稿后创建了一个更优的实现。

### 优化私有类字段和计算出的公共类字段

为了加速私有类字段和计算出的公共类字段的初始化，这一实现引入了一种新机制，它在处理这些操作时与[内联缓存(IC)系统](https://mathiasbynens.be/notes/shapes-ics)集成。该新机制由三个协作组件组成：

- 在字节码生成器中，一个新的字节码 `DefineKeyedOwnProperty`。在为表示类字段初始化器的 `ClassLiteral::Property` AST 节点生成代码时使用。
- 在 TurboFan JIT 中，一个对应的 IR 操作码 `JSDefineKeyedOwnProperty`，可以从新的字节码编译而来。
- 在 IC 系统中，一个新的 `DefineKeyedOwnIC`，它用于新字节码的解释器处理程序以及从新的 IR 操作码编译的代码。为了简化实现，新的 IC 复用了某些用于普通属性存储的 `KeyedStoreIC` 中的代码。

现在，当 V8 遇到如下类时：

```js
class A {
  #a = 0;
}
```

它为初始化器 `#a = 0` 生成以下字节码：

```cpp
// 将 `#a` 的私有名称符号加载到寄存器 r1
LdaImmutableCurrentContextSlot [2]
Star0

// 使用 DefineKeyedOwnProperty 字节码将 0 存储为属性值，
// 属性键是私有名称符号 `#a`，即 `#a = 0`。
LdaZero
DefineKeyedOwnProperty <this>, r0, [0]
```

当初始化器被执行足够多次时，V8 为每个正在初始化的字段分配一个[反馈向量槽](https://ponyfoo.com/articles/an-introduction-to-speculative-optimization-in-v8)。该槽包含添加的字段的键（对私有字段而言，是私有名称符号）以及实例在字段初始化过程中转换的两个[隐藏类](https://v8.dev/docs/hidden-classes)之间的配对。在后续初始化中，IC 使用反馈来判断实例上字段的初始化是否以相同顺序进行，并具有相同的隐藏类。如果初始化模式与 V8 以前见过的一致（通常如此），V8 将选择快速路径，使用预生成的代码进行初始化，而不是调用运行时，从而加速操作。如果初始化与 V8 以前见过的模式不符，则回退到运行时调用以处理慢速情况。

### 优化命名的公共类字段

为了加速命名的公共类字段的初始化，我们重用了现有的 `DefineNamedOwnProperty` 字节码，该字节码通过 `DefineNamedOwnIC` 调用，无论是在解释器中还是通过从 `JSDefineNamedOwnProperty` IR 操作码编译的代码。

现在，当 V8 遇到如下类时：

```js
class A {
  #a = 0;
  b = this.#a;
}
```

它为初始化器 `b = this.#a` 生成以下字节码：

```cpp
// 加载 `#a` 的私有名称符号
LdaImmutableCurrentContextSlot [2]

// 从实例加载由 `#a` 键控的属性值到 r2
// 注意：在重构中，LdaKeyedProperty 被重命名为 GetKeyedProperty
GetKeyedProperty <this>, [2]

// 使用 DefineKeyedOwnProperty 字节码存储由 `#a` 键控的属性，
// 作为由 `b` 键控的属性值，即 `b = this.#a;`
DefineNamedOwnProperty <this>, [0], [4]
```

原始的 `DefineNamedOwnIC` 机制不能直接用于处理命名的公共类字段，因为它最初仅用于对象字面初始化。之前它假设目标对象在创建之后未被用户接触过，这对对象字面来说总是成立，但对于类字段，当类继承一个构造函数覆盖目标的基类时，字段可以在用户定义的对象上初始化：

```js
class A {
  constructor() {
    return new Proxy(
      { a: 1 },
      {
        defineProperty(object, key, desc) {
          console.log('object:', object);
          console.log('key:', key);
          console.log('desc:', desc);
          return true;
        }
      });
  }
}

class B extends A {
  a = 2;
  #b = 3;  // 不可见。
}

// object: { a: 1 },
// key: 'a',
// desc: {value: 2, writable: true, enumerable: true, configurable: true}
new B();
```

为了解决这些目标，我们修补了 IC，使其在检测到正在初始化的对象是代理、字段已经存在于对象上，或者对象只是具有 IC 未见过的隐藏类时，回退到运行时。如果这些边界情况变得足够普遍，我们仍然可以对其进行优化，但目前看来，为了实现的简单性，牺牲这些的性能更为划算。

## 优化私有方法

### 私有方法的实现

在[规范](https://tc39.es/ecma262/#sec-privatemethodoraccessoradd)中，私有方法被描述为似乎是安装在实例上而非类上。然而，为了节省内存，V8 的实现将私有方法和私有标识符符号一起存储在与类关联的上下文中。当调用构造函数时，V8 仅将对该上下文的引用存储在实例中，使用私有标识符符号作为键。

![带有私有方法的类的评估和实例化示意图](/_img/faster-class-features/class-evaluation-and-instantiation.svg)

当访问私有方法时，V8 从执行上下文开始遍历上下文链，找到类的上下文，从找到的上下文中读取已知槽位以获得类的私有标识符符号，然后检查实例是否具有以该标识符为键的属性，以判断实例是否来自该类。如果标识符检查通过，V8 会从同一上下文中的另一个已知槽位加载私有方法，并完成访问。

![访问私有方法示意图](/_img/faster-class-features/access-private-methods.svg)

以下是一个示例代码片段：

```js
class A {
  #a() {}
}
```

V8 之前会为 `A` 的构造函数生成以下字节码：

```cpp
// 从上下文加载类 A 的私有标识符符号
// 并将其存储到 r1。
LdaImmutableCurrentContextSlot [3]
Star r1

// 将目标加载到 r0。
Mov <this>, r0
// 将当前上下文加载到 r2。
Mov <context>, r2
// 调用运行时函数 %AddPrivateBrand()，将上下文
// 存储到以私有标识符符号为键的实例中。
CallRuntime [AddPrivateBrand], r0-r2
```

由于还调用了运行时函数 `%AddPrivateBrand()`，因此这一开销使得构造函数远比仅包含公共方法的类的构造函数慢。

### 优化私有标识符初始化

为了加快私有标识符的安装，在大多数情况下，我们仅重用了为了优化私有字段而添加的 `DefineKeyedOwnProperty` 机制：

```cpp
// 从上下文加载类 A 的私有标识符符号
// 并将其存储到 r1
LdaImmutableCurrentContextSlot [3]
Star0

// 使用 DefineKeyedOwnProperty 字节码，将
// 上下文存储到以私有标识符为键的实例中
Ldar <context>
DefineKeyedOwnProperty <this>, r0, [0]
```

![具有不同方法的类的实例初始化性能示意图](/_img/faster-class-features/private-methods-performance.svg)

然而，需要注意的是：如果该类是一个派生类，且其构造函数调用了 `super()`，私有方法的初始化 - 在我们的实现中为私有标识符的安装 - 必须在 `super()` 返回后进行：

```js
class A {
  constructor() {
    // 以下调用来自新 B()，在 super() 尚未返回之前会抛出错误。
    this.callMethod();
  }
}

class B extends A {
  #method() {}
  callMethod() { return this.#method(); }
  constructor(o) {
    super();
  }
};
```

如前所述，在初始化标识符时，V8 还会在实例中存储对类上下文的引用。该引用并未用于标识符检查，而是为了调试器使用，从实例中检索私有方法的列表，而不需要知道该实例是从哪个类构造的。当在构造函数中直接调用 `super()` 时，V8 可以简单地从上下文寄存器加载上下文（正如上述字节码中的 `Mov <context>, r2` 或 `Ldar <context>` 所做的一样）来完成初始化，但 `super()` 也可以从嵌套箭头函数中调用，而箭头函数又可以从不同的上下文中调用。这种情况下，V8 会回退到运行时函数（仍然命名为 `%AddPrivateBrand()`），在上下文链中寻找类上下文，而不是依赖上下文寄存器。例如，对于下面的 `callSuper` 函数：

```js
class A extends class {} {
  #method() {}
  constructor(run) {
    const callSuper = () => super();
    // ...执行其他操作
    run(callSuper)
  }
};

new A((fn) => fn());
```

V8 现在会生成以下字节码：

```cpp
// 调用超级构造函数来构造实例
// 并将其存储到 r3。
...

// 从当前上下文深度为 1 的类上下文加载
// 私有标识符符号，并将其存储到 r4
LdaImmutableContextSlot <context>, [3], [1]
Star4

// 将深度 1 作为 Smi 加载到 r6
LdaSmi [1]
Star6

// 将当前上下文加载到 r5
Mov <context>, r5

// 使用 %AddPrivateBrand() 定位当前上下文深度为 1 的类上下文
// 并将其以私有标识符符号为键存储到实例中
CallRuntime [AddPrivateBrand], r3-r6
```

在这种情况下，运行时调用的开销回来了，因此初始化此类的实例仍然会比仅有公共方法的类初始化要慢。可以使用专用的字节码来实现 `%AddPrivateBrand()` 的功能，但由于在嵌套箭头函数中调用 `super()` 的情况相当少见，我们再次在实现的简单性和性能之间进行了权衡。

## 最后备注

这篇博客文章中提到的工作也包含在 [Node.js 18.0.0 版本](https://nodejs.org/en/blog/announcements/v18-release-announce/) 中。此前，Node.js 在一些内置类中改用符号属性，替代私有字段，以将它们纳入嵌入式引导快照中，并提升构造函数的性能（更多背景信息请参阅[这篇博客文章](https://www.nearform.com/blog/node-js-and-the-struggles-of-being-an-eventtarget/)）。随着 V8 对类特性的支持改进，Node.js 在这些类中[切换回了私有类字段](https://github.com/nodejs/node/pull/42361)，Node.js 的基准测试显示，[这些更改没有引入任何性能回退](https://github.com/nodejs/node/pull/42361#issuecomment-1068961385)。

感谢 Igalia 和 Bloomberg 对这一实现的贡献！
