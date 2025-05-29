---
title: "React 中 V8 性能瓶颈的故事"
author: "Benedikt Meurer（[@bmeurer](https://twitter.com/bmeurer)）和 Mathias Bynens（[@mathias](https://twitter.com/mathias)）"
avatars: 
  - "benedikt-meurer"
  - "mathias-bynens"
date: "2019-08-28 16:45:00"
tags: 
  - 内部原理
  - 演示
description: "本文描述了 V8 如何为各种 JavaScript 值选择最佳的内存表示形式，以及这些选择如何影响 Shape 机制——这有助于解释 React 核心中最近的一个 V8 性能瓶颈问题。"
tweet: "1166723359696130049"
---
[之前](https://mathiasbynens.be/notes/shapes-ics)，我们讨论了 JavaScript 引擎如何通过使用 Shapes 和 Inline Caches 优化对象和数组的访问，并特别探讨了[引擎如何加速原型属性访问](https://mathiasbynens.be/notes/prototypes)。本文将描述 V8 如何为各种 JavaScript 值选择最佳的内存表示形式，以及这些选择如何影响 Shape 机制——所有这些都有助于解释[React 核心中最近的一个 V8 性能瓶颈](https://github.com/facebook/react/issues/14365)。

<!--truncate-->
:::note
**注意：** 如果你更喜欢观看演示而不是阅读文章，请享受下面的视频！如果不感兴趣，可以跳过视频继续阅读。
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/0I0d8LkDqyc" width="640" height="360" loading="lazy" allowfullscreen></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=0I0d8LkDqyc">“JavaScript 引擎基础：优点、缺点和陷阱”</a>，由 Mathias Bynens 和 Benedikt Meurer 在 AgentConf 2019 上讲解。</figcaption>
</figure>

## JavaScript 类型

每个 JavaScript 值都有（当前）的八种不同类型之一：`Number`、`String`、`Symbol`、`BigInt`、`Boolean`、`Undefined`、`Null` 和 `Object`。

![](/_img/react-cliff/01-javascript-types.svg)

有一个显著的例外，这些类型可以通过 JavaScript 中的 `typeof` 操作符观察到：

```js
typeof 42;
// → 'number'
typeof 'foo';
// → 'string'
typeof Symbol('bar');
// → 'symbol'
typeof 42n;
// → 'bigint'
typeof true;
// → 'boolean'
typeof undefined;
// → 'undefined'
typeof null;
// → 'object' 🤔
typeof { x: 42 };
// → 'object'
```

`typeof null` 返回 `'object'`，而不是 `'null'`，尽管 `Null` 是其自身的类型。为了理解原因，请注意，所有 JavaScript 类型可分为两组：

- **对象**（即 `Object` 类型）
- **原始值**（即任何非对象值）

因此，`null` 表示“没有对象值”，而 `undefined` 表示“没有值”。

![](/_img/react-cliff/02-primitives-objects.svg)

按照这种思路，Brendan Eich 设计了 JavaScript，使 `typeof` 对右边所有值（即所有对象和 `null` 值）返回 `'object'`，参考了 Java 的精神。这也是为什么 `typeof null === 'object'` 尽管规范中有单独的 `Null` 类型。

![](/_img/react-cliff/03-primitives-objects-typeof.svg)

## 值表示

JavaScript 引擎必须能够在内存中表示任意 JavaScript 值。然而，需要注意的是，JavaScript 值的类型与 JavaScript 引擎在内存中表示值的方式是独立的。

例如，值 `42` 在 JavaScript 中的类型是 `number`。

```js
typeof 42;
// → 'number'
```

在内存中表示整数值 `42` 的方式有多种：

:::table-wrapper
| 表示方式                     | 位数                                                                              |
| -------------------------- | --------------------------------------------------------------------------------- |
| 补码 8 位                 | `0010 1010`                                                                       |
| 补码 32 位                | `0000 0000 0000 0000 0000 0000 0010 1010`                                         |
| 打包的二进制编码十进制 (BCD) | `0100 0010`                                                                       |
| 32 位 IEEE-754 浮点数       | `0100 0010 0010 1000 0000 0000 0000 0000`                                         |
| 64 位 IEEE-754 浮点数       | `0100 0000 0100 0101 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000` |
:::

ECMAScript 标准将数字定义为 64 位浮点值，也称为“双精度浮点”或 `Float64`。然而，这并不意味着 JavaScript 引擎始终以 Float64 表示数字——这样做效率会非常低！引擎可以选择其他内部表示形式，只要其可观察行为完全匹配 Float64 即可。

在真实世界的 JavaScript 应用程序中，大多数数字恰好是 [有效的 ECMAScript 数组索引](https://tc39.es/ecma262/#array-index)，即范围从 0 到 2³²−2 的整数值。

```js
array[0]; // 最小的可能数组索引。
array[42];
array[2**32-2]; // 最大的可能数组索引。
```

JavaScript 引擎可以选择一种优化的内存表示来优化通过索引访问数组元素的代码。处理器执行内存访问操作时，数组索引必须可用在 [二进制补码](https://en.wikipedia.org/wiki/Two%27s_complement) 中。将数组索引表示为 Float64 反而会浪费资源，因为引擎每次有人访问数组元素时都需要在 Float64 和二进制补码之间来回转换。

32 位二进制补码表示不仅对数组操作有用。总体来说，**处理器执行整数操作要比执行浮点操作快得多**。因此在下面的示例中，第一种循环与第二种循环相比轻松快了两倍。

```js
for (let i = 0; i < 1000; ++i) {
  // 快 🚀
}

for (let i = 0.1; i < 1000.1; ++i) {
  // 慢 🐌
}
```

操作本身也是如此。下面代码中的取模操作性能取决于你是否正在处理整数。

```js
const remainder = value % divisor;
// 如果 `value` 和 `divisor` 表示为整数，则快速 🚀，
// 否则则慢 🐌。
```

如果两个操作数都表示为整数，CPU 可以非常高效地计算结果。对于 `divisor` 是 2 的幂的情况，V8 还有额外的快速路径。如果值表示为浮点数，则计算复杂得多且耗时更长。

由于整数操作通常比浮点操作执行速度更快，似乎引擎可以始终使用二进制补码来处理所有整数和所有整数操作的结果。不幸的是，这将违反 ECMAScript 规范！ECMAScript 标准采用 Float64，因此**某些整数操作实际上会产生浮点数**。在这些情况下确保 JS 引擎生成正确的结果非常重要。

```js
// Float64 有一个 53 位的安全整数范围。超出该范围，
// 就会失去精度。
2**53 === 2**53+1;
// → true

// Float64 支持负零，因此 -1 * 0 必须是 -0，
// 但无法用二进制补码表示负零。
-1*0 === -0;
// → true

// Float64 有无穷大，可以通过零除运算产生。
1/0 === Infinity;
// → true
-1/0 === -Infinity;
// → true

// Float64 也有 NaN。
0/0 === NaN;
```

即使左侧的值是整数，但右侧的所有值都是浮点数。这就是为什么使用 32 位二进制补码无法正确执行上述任何操作。JavaScript 引擎必须特别小心，确保整数操作适当回退以生成高精度的 Float64 结果。

对于 31 位有符号整数范围内的小整数，V8 使用一种特殊表示方式叫作 `Smi`。任何不是 `Smi` 的内容都表示为 `HeapObject`，即内存中某个实体的地址。对于数字，我们使用一种特殊的 `HeapObject`，“堆数字” (`HeapNumber`)，来表示未在 `Smi` 范围内的数字。

```js
 -Infinity // HeapNumber
-(2**30)-1 // HeapNumber
  -(2**30) // Smi
       -42 // Smi
        -0 // HeapNumber
         0 // Smi
       4.2 // HeapNumber
        42 // Smi
   2**30-1 // Smi
     2**30 // HeapNumber
  Infinity // HeapNumber
       NaN // HeapNumber
```

如上例所示，某些 JavaScript 数字表示为 `Smi`，而其它则表示为 `HeapNumber`。V8 对 `Smi` 进行了专门优化，因为小整数在真实的 JavaScript 程序中非常常见。`Smi` 不需要在内存中分配为专用实体，并且通常能够快速执行整数操作。

这里的重要启示是，**即使具有相同 JavaScript 类型的值，在幕后也可以以完全不同的方式表示，用作优化**。

### `Smi` vs. `HeapNumber` vs. `MutableHeapNumber`

以下是其底层工作原理。假设您有以下对象：

```js
const o = {
  x: 42,  // Smi
  y: 4.2, // HeapNumber
};
```

值 `42` 可以编码为 `Smi`，因此可以直接存储在对象本身内。而值 `4.2` 则需要一个单独的实体来保存值，对象指向该实体。

![](/_img/react-cliff/04-smi-vs-heapnumber.svg)

现在，假设我们运行以下代码段：

```js
o.x += 10;
// → o.x 现在是 52
o.y += 1;
// → o.y 现在是 5.2
```

在这种情况下，由于新值 `52` 也适合 `Smi` 范围，因此可以就地更新 `x` 的值。

![](/_img/react-cliff/05-update-smi.svg)

然而，新的值 `y=5.2` 无法适应 `Smi`，并且也不同于之前的值 `4.2`，所以 V8 必须为 `y` 的赋值分配一个新的 `HeapNumber` 实体。

![](/_img/react-cliff/06-update-heapnumber.svg)

`HeapNumber` 是不可变的，这使得某些优化成为可能。例如，如果我们将 `y` 的值赋给 `x`：

```js
o.x = o.y;
// → o.x 现在是 5.2
```

…我们现在可以只链接到同一个 `HeapNumber`，而不必为相同的值分配一个新的。

![](/_img/react-cliff/07-heapnumbers.svg)

`HeapNumber` 不可变的一个缺点是，如果频繁更新超出 `Smi` 范围的字段值，就会很慢，例如以下例子：

```js
// 创建一个 `HeapNumber` 实例。
const o = { x: 0.1 };

for (let i = 0; i < 5; ++i) {
  // 创建一个额外的 `HeapNumber` 实例。
  o.x += 1;
}
```

第一行会创建一个初始值为 `0.1` 的 `HeapNumber` 实例。循环体将此值更改为 `1.1`、`2.1`、`3.1`、`4.1`，最后是 `5.1`，在此过程中总共创建了六个 `HeapNumber` 实例，其中有五个在循环结束后变成垃圾。

![](/_img/react-cliff/08-garbage-heapnumbers.svg)

为了避免这个问题，V8 提供了一种优化方式，可以直接更新非 `Smi` 数字字段。当一个数字字段保存的值超出 `Smi` 范围时，V8 会将该字段标记为形状上的 `Double` 字段，并分配一个所谓的 `MutableHeapNumber`，其中保存实际值并以 Float64 编码。

![](/_img/react-cliff/09-mutableheapnumber.svg)

当你的字段值发生变化时，V8 不再需要分配一个新的 `HeapNumber`，而是可以直接就地更新 `MutableHeapNumber`。

![](/_img/react-cliff/10-update-mutableheapnumber.svg)

然而，这种方法也有一个问题。由于 `MutableHeapNumber` 的值可以变化，很重要的一点是这些值不能被传递。

![](/_img/react-cliff/11-mutableheapnumber-to-heapnumber.svg)

例如，如果你将 `o.x` 赋给另一个变量 `y`，你肯定不希望 `y` 的值在 `o.x` 下次变化时也随之变化——这将违反 JavaScript 规范！所以当访问 `o.x` 时，必须先将这个数字重新封装为一个普通的 `HeapNumber`，然后再将其赋给 `y`。

对于浮点数，V8 会在后台完成上述所有“封装”的操作。但对于小整数，采用 `MutableHeapNumber` 方法会效率低下，因为 `Smi` 是更高效的表示方式。

```js
const object = { x: 1 };
// → 在 object 中 `x` 没有“封装操作”

object.x += 1;
// → 更新 object 中 `x` 的值
```

为避免效率低下，我们需要做的只是将形状上的字段标记为 `Smi` 表示，并在值适合小整数范围时直接就地更新数字值。

![](/_img/react-cliff/12-smi-no-boxing.svg)

## 形状的弃用和迁移

那么如果一个字段最初包含一个 `Smi`，但后来保存了一个超出小整数范围的数字会怎样？例如在这种情况中，有两个对象都使用同一个形状，其中 `x` 最初被表示为 `Smi`：

```js
const a = { x: 1 };
const b = { x: 2 };
// → 对象现在的 `x` 是 `Smi` 字段

b.x = 0.2;
// → `b.x` 现在被表示为 `Double`

y = a.x;
```

最初有两个对象指向同一个形状，其中 `x` 被标记为 `Smi` 表示：

![](/_img/react-cliff/13-shape.svg)

当 `b.x` 更改为 `Double` 表示时，V8 会分配一个新的形状，其中 `x` 被分配为 `Double` 表示，并且指向空形状。V8 还会分配一个 `MutableHeapNumber` 来保存属性 `x` 的新值 `0.2`。然后我们更新对象 `b` 以指向这个新形状，并将对象中的插槽更改为指向之前分配的位于偏移量 0 的 `MutableHeapNumber`。最后，我们将旧形状标记为已弃用，并从过渡树中取消链接。这是通过为空形状到新创建的形状添加一个新的 `'x'` 过渡来完成的。

![](/_img/react-cliff/14-shape-transition.svg)

在此时我们不能完全移除旧形状，因为它仍然被 `a` 使用，并且急切地遍历内存以找到所有指向旧形状的对象并更新它们代价过高。相反，V8 会延迟执行：任何对 `a` 的属性访问或赋值操作都会首先将其迁移到新形状。这样做的目的是最终使得已弃用的形状不可到达，并由垃圾回收器移除。

![](/_img/react-cliff/15-shape-deprecation.svg)

如果改变表示的字段 _不是_ 链条中的最后一个会发生更加棘手的情况：

```js
const o = {
  x: 1,
  y: 2,
  z: 3,
};

o.y = 0.1;
```

在这种情况下，V8 需要找到所谓的 _分裂形状_，即链条中在相关属性被引入之前的最后一个形状。在这里我们更改了 `y`，所以我们需要找到没有 `y` 的最后一个形状，在我们的示例中是引入了 `x` 的形状。

![](/_img/react-cliff/16-split-shape.svg)

从分裂形状开始，我们为 `y` 创建一个新的过渡链，重新执行所有以前的过渡，但将 `'y'` 标记为 `Double` 表示。我们使用这个新的过渡链更新 `y`，并将旧的子树标记为已弃用。在最后一步中，我们将实例 `o` 迁移到新形状，并使用 `MutableHeapNumber` 来保存现在的 `y` 值。这样，新对象不会沿着旧路径创建，一旦旧形状的所有引用消失，树中弃用的形状部分将会消失。

## 可扩展性和完整性级别转换

`Object.preventExtensions()` 防止向对象添加新属性。如果尝试添加，它会抛出一个异常。（如果你不在严格模式下，它不会抛出异常，而是静默什么都不做。）

```js
const object = { x: 1 };
Object.preventExtensions(object);
object.y = 2;
// TypeError: 无法添加属性 y;
//            object 是不可扩展的
```

`Object.seal` 作用与 `Object.preventExtensions` 相同，但它还将所有属性标记为不可配置，这意味着你不能删除它们，也不能更改它们的可枚举性、可配置性或可写性。

```js
const object = { x: 1 };
Object.seal(object);
object.y = 2;
// TypeError: 无法添加属性 y;
//            object 是不可扩展的
delete object.x;
// TypeError: 无法删除属性 x
```

`Object.freeze` 作用与 `Object.seal` 相同，但它还通过将现有属性标记为不可写来防止更改其值。

```js
const object = { x: 1 };
Object.freeze(object);
object.y = 2;
// TypeError: 无法添加属性 y;
//            object 是不可扩展的
delete object.x;
// TypeError: 无法删除属性 x
object.x = 3;
// TypeError: 无法分配给只读属性 x
```

让我们考虑一个具体的例子，有两个对象都只有一个属性 `x`，然后我们阻止向第二个对象添加进一步的扩展。

```js
const a = { x: 1 };
const b = { x: 2 };

Object.preventExtensions(b);
```

起初情况如我们之前所知，从空形状过渡到一个新的形状，该形状包含属性 `'x'`（表示为 `Smi`）。当我们阻止扩展到 `b` 时，我们执行了一种特殊过渡到一个标记为不可扩展的新形状。这种特殊过渡没有引入任何新属性 —— 它实际上只是一个标记。

![](/_img/react-cliff/17-shape-nonextensible.svg)

注意，我们不能只是就地更新 `x` 的形状，因为它被另一个对象 `a` 使用，而后者仍然是可扩展的。

## React 的性能问题

让我们把所有学到的结合起来，理解[最近的 React 问题 #14365](https://github.com/facebook/react/issues/14365)。当 React 团队对实际应用程序进行性能分析时，他们发现了一个影响 React 核心的奇怪 V8 性能突变点。下面是这个错误的一个简化重现方法：

```js
const o = { x: 1, y: 2 };
Object.preventExtensions(o);
o.y = 0.2;
```

我们有一个具有两个字段 `Smi` 表示的对象。我们阻止该对象进一步扩展，并最终将第二个字段强制为 `Double` 表示。

正如我们之前了解到的，这大致创建了以下设置：

![](/_img/react-cliff/18-repro-shape-setup.svg)

两个属性都标记为 `Smi` 表示，最终过渡是扩展性过渡，以将形状标记为不可扩展。

现在我们需要将 `y` 更改为 `Double` 表示，这意味着我们需要再次从找到分裂形状开始。在这种情况下，分裂形状是引入 `x` 的形状。但现在 V8 混淆了，因为分裂形状是可扩展的，而当前形状被标记为不可扩展。在这个情况下，V8 不知道如何正确地重放过渡。因此，V8 基本上放弃了试图理解这一点，而是创建了一个未连接到现有形状树且未与任何其他对象共享的单独形状。可以将其视为一个“孤岛形状”：

![](/_img/react-cliff/19-orphaned-shape.svg)

如果这种情况发生在许多对象上，你可以想象情况会很糟糕，因为这使整个形状系统变得无效。

在 React 的情况下，具体发生了什么：每个 `FiberNode` 有几个字段，当启用性能分析时，这些字段旨在保存时间戳。

```js
class FiberNode {
  constructor() {
    this.actualStartTime = 0;
    Object.preventExtensions(this);
  }
}

const node1 = new FiberNode();
const node2 = new FiberNode();
```

这些字段（例如 `actualStartTime`）初始化为 `0` 或 `-1`，因此以 `Smi` 表示开始。但稍后，这些字段中存储了来自 [`performance.now()`](https://w3c.github.io/hr-time/#dom-performance-now) 的实际浮点时间戳，导致它们变为 `Double` 表示，因为它们不适合 `Smi`。此外，React 还阻止了对 `FiberNode` 实例的扩展。

最初上述简化的例子看起来是这样的：

![](/_img/react-cliff/20-fibernode-shape.svg)

有两个实例共享一个形状树，一切如预期正常工作。但之后，当你存储实际时间戳时，V8 找分裂形状时就困惑了：

![](/_img/react-cliff/21-orphan-islands.svg)

V8为`node1`分配了一个新的孤立形状，稍后同样的事情发生在`node2`上，导致出现两个孤立岛屿，每个都有其独立的形状。许多实际的React应用程序不只是有两个，而是有成千上万个这样的`FiberNode`。可以想象，这种情况对V8的性能并不是特别有利。

幸运的是，[我们已经修复了这个性能瓶颈](https://chromium-review.googlesource.com/c/v8/v8/+/1442640/)，在[V8 v7.4](/blog/v8-release-74)中，我们正在[研究如何使字段表示更改的成本更低](https://bit.ly/v8-in-place-field-representation-changes)，以消除任何剩余的性能瓶颈。通过修复，V8现在执行了正确的操作：

![](/_img/react-cliff/22-fix.svg)

两个`FiberNode`实例指向一个不可扩展形状，其中`'actualStartTime'`是一个`Smi`字段。当对`node1.actualStartTime`的第一次赋值发生时，会创建一个新的过渡链，之前的链被标记为已弃用：

![](/_img/react-cliff/23-fix-fibernode-shape-1.svg)

请注意，可扩展性转换现在在新链中被正确地重放。

![](/_img/react-cliff/24-fix-fibernode-shape-2.svg)

在对`node2.actualStartTime`赋值后，两个节点都引用了新形状，而过渡树的已弃用部分可以被垃圾回收器清理。

:::note
**注意：** 你可能会认为所有这些形状弃用/迁移很复杂，你是对的。事实上，我们怀疑在实际网站上它引发了更多问题（在性能、内存使用和复杂性方面）而非帮助，尤其是随着[指针压缩](https://bugs.chromium.org/p/v8/issues/detail?id=7703)功能的引入，我们将不再能用它来在对象内联存储双值字段。所以，我们希望[完全移除V8的形状弃用机制](https://bugs.chromium.org/p/v8/issues/detail?id=9606)。你可以说这是_\*戴上墨镜\*_ 被弃用中。_耶……_
:::

React团队通过确保`FiberNode`上的所有时间和持续时间字段一开始都以`Double`表示[缓解了此问题](https://github.com/facebook/react/pull/14383)：

```js
class FiberNode {
  constructor() {
    // 从一开始就强制使用`Double`表示。
    this.actualStartTime = Number.NaN;
    // 后面，你仍然可以初始化为你想要的值：
    this.actualStartTime = 0;
    Object.preventExtensions(this);
  }
}

const node1 = new FiberNode();
const node2 = new FiberNode();
```

除了`Number.NaN`，任何不在`Smi`范围内的浮点值都可以使用。例如`0.000001`、`Number.MIN_VALUE`、`-0`和`Infinity`。

值得指出的是，具体的React问题是V8特有的，通常开发者不应针对特定版本的JavaScript引擎进行优化。不过，当事情不工作时，能找到解决方法还是很不错的。

请记住，JavaScript引擎在底层执行了一些魔法，如果可以的话，尽量避免混合类型，你可以通过以下方式帮助引擎优化。例如，不要用`null`初始化你的数值字段，因为这会禁用字段表示跟踪的所有优势，同时也让代码更具可读性：

```js
// 不要这样做！
class Point {
  x = null;
  y = null;
}

const p = new Point();
p.x = 0.1;
p.y = 402;
```

换句话说，**编写可读的代码，性能会因此而来！**

## 收获要点

我们在这篇深入分析中讨论了以下内容：

- JavaScript区分“原始值”和“对象”，而`typeof`有时会误导。
- 即使具有相同JavaScript类型的值，在底层可能有不同表示。
- V8尝试为JavaScript程序中的每个属性找到最佳表示。
- 我们讨论了V8如何处理形状弃用和迁移，包括可扩展性转换。

基于这些知识，我们总结了一些实用的JavaScript编码建议，可帮助提升性能：

- 始终以相同的方式初始化对象，以便形状能有效运行。
- 为字段选择合理的初始值，以帮助JavaScript引擎进行表示选择。
