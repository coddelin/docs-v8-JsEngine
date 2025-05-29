---
title: "V8中的元素种类"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars:
  - "mathias-bynens"
date: 2017-09-12 13:33:37
tags:
  - 内部原理
  - 演讲
description: "这篇技术深度剖析文章解释了V8如何在幕后优化数组操作，以及这对JavaScript开发者意味着什么。"
tweet: "907608362191376384"
---
:::note
**注意:** 如果你更喜欢观看演示而不是阅读文章，那么请欣赏下面的视频！
:::

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/m9cTaYI95Zc" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

JavaScript对象可以拥有与之相关的任意属性。对象属性的名称可以包含任何字符。JavaScript引擎可以选择优化的一种有趣场景是属性名称纯粹为数字的情况，尤其是[数组索引](https://tc39.es/ecma262/#array-index)。

<!--truncate-->
在V8中，具有整数名称的属性——这些属性最常见的形式是通过`Array`构造函数生成的对象——会被特殊处理。尽管在许多情况下，这些数字索引的属性行为与其他属性类似，但出于优化的目的，V8选择将它们与非数字属性分开存储。在内部，V8甚至为这些属性赋予了一个特殊的名称：_元素_。对象具有映射到值的[属性](/blog/fast-properties)，而数组具有映射到元素的索引。

尽管这些内部原理从未直接向JavaScript开发者公开，但它们解释了为什么某些代码模式会比其他模式运行得更快。

## 常见的元素种类

在运行JavaScript代码时，V8会跟踪每个数组包含的元素类型。这些信息使得V8能够专门针对这种类型的元素优化数组上的任何操作。例如，当您在数组上调用`reduce`、`map`或`forEach`时，V8可以基于数组包含的元素类型优化这些操作。

以下是一个示例数组：

```js
const array = [1, 2, 3];
```

它包含什么种类的元素？如果您询问`typeof`运算符，它会告诉您该数组包含`number`类型的元素。在语言层面，这是您能得到的所有信息：JavaScript不区分整数、小数和双精度数——它们都只是数字。然而，在引擎层面，我们可以进行更精确的区分。这个数组的元素种类是`PACKED_SMI_ELEMENTS`。在V8中，术语Smi指的是存储小整数的特定格式。（稍后我们会讨论`PACKED`部分。）

后来向该数组添加一个浮点数会使其转变为更通用的元素种类：

```js
const array = [1, 2, 3];
// 元素种类：PACKED_SMI_ELEMENTS
array.push(4.56);
// 元素种类：PACKED_DOUBLE_ELEMENTS
```

向数组中添加一个字符串文字再次改变了它的元素种类。

```js
const array = [1, 2, 3];
// 元素种类：PACKED_SMI_ELEMENTS
array.push(4.56);
// 元素种类：PACKED_DOUBLE_ELEMENTS
array.push('x');
// 元素种类：PACKED_ELEMENTS
```

我们已经看到三种不同的元素种类，它们具有以下基本类型：

- <b>Sm</b>all <b>i</b>ntegers，也称为Smi。
- 双精度数，用于浮点数和无法表示为Smi的整数。
- 常规元素，用于无法表示为Smi或双精度数的值。

请注意，双精度数是Smi的一种更通用的变体，而常规元素是在双精度数之上进一步概括。可以表示为Smi的数字集是可以表示为双精度数的数字集的子集。

重点在于元素种类的转换只能是单向的：从具体（例如`PACKED_SMI_ELEMENTS`）到更通用（例如`PACKED_ELEMENTS`）。一旦某个数组被标记为`PACKED_ELEMENTS`，它就不能回到`PACKED_DOUBLE_ELEMENTS`。

我们到目前为止学到了以下内容：

- V8为每个数组分配了一种元素种类。
- 数组的元素种类不是固定的——它可以在运行时发生变化。在前面的例子中，我们从`PACKED_SMI_ELEMENTS`转变为`PACKED_ELEMENTS`。
- 元素种类的转换只能是从具体种类到更通用种类。

## `PACKED`与`HOLEY`种类

到目前为止，我们仅处理了密集或打包数组。在数组中创建空洞（即使数组变得稀疏）会将元素种类降级为其“空洞”变体：

```js
const array = [1, 2, 3, 4.56, 'x'];
// 元素种类：PACKED_ELEMENTS
array.length; // 5
array[9] = 1; // array[5]到array[8]现在是空洞
// 元素种类：HOLEY_ELEMENTS
```

V8 对此作出区分，因为对紧凑数组的操作可以比对稀疏数组的操作更积极地进行优化。对于紧凑数组，大多数操作都能高效执行。而相比而言，对稀疏数组的操作则需要额外的检查以及在原型链上耗时的查找。

到目前为止，我们讨论的每一种基本元素类型（即 Smis、浮点数和普通元素）都有两种版本：紧凑型和稀疏型。不仅可以从某种 `PACKED_SMI_ELEMENTS` 转换为 `PACKED_DOUBLE_ELEMENTS`，还可以从任何 `PACKED` 类型转换为其对应的 `HOLEY` 类型。

总结如下：

- 最常见的元素类型有 `PACKED` 和 `HOLEY` 两种版本。
- 对紧凑数组的操作比对稀疏数组的操作更高效。
- 元素的类型可以从 `PACKED` 转换为 `HOLEY` 类型。

## 元素类型的格点结构

V8 将这种标签转换系统实现为一个[格点结构](https://en.wikipedia.org/wiki/Lattice_%28order%29)。以下是只包含最常见的元素类型的简化可视化：

![](/_img/elements-kinds/lattice.svg)

只能从格点中向下进行转换。一旦向一个包含 Smis 的数组中添加了一个浮点数，数组就会被标记为 DOUBLE，即使你之后用 Smi 覆盖了浮点数。同理，一旦在数组中创建了一个空洞，数组就会永远被标记为稀疏型，即使你之后填补了空洞。

:::note
**更新于 2025-02-28:** 针对 [`Array.prototype.fill`](https://chromium-review.googlesource.com/c/v8/v8/+/6285929)，现在有一个例外情况。
:::

V8 当前区分了[21种不同的元素类型](https://cs.chromium.org/chromium/src/v8/src/elements-kind.h?l=14&rcl=ec37390b2ba2b4051f46f153a8cc179ed4656f5d)，每种类型都有其对应的优化方式。

通常，越具体的元素类型能进行越细粒度的优化。在格点上元素类型越往下，对象操作的速度可能就越慢。为了获得最佳性能，尽量避免不必要的转移到不太具体的类型——使用最适合你情况的具体类型。

## 性能技巧

在大多数情况下，元素类型跟踪系统在后台无形地运行，你无需担心。但以下是一些能帮你最大限度地利用这个系统的建议。

### 避免读取数组长度之外的内容

有点出乎意料的是（考虑到本文标题），我们最重要的性能建议与元素类型跟踪并无直接关系（尽管底层的原理有些类似）。读取超出数组长度的内容可能会严重影响性能，例如读取 `array[42]` 而 `array.length === 5`。在这个例子中，数组索引 `42` 超出了范围，属性在数组自身中不存在，因此 JavaScript 引擎必须执行耗时的原型链查找。一旦加载操作进入了这种情况，V8 会记住“这个加载需要处理特殊情况”，之后再读取越界内容时，速度永远无法恢复到之前的水平。

不要像这样写你的循环：

```js
// 不要这样做！
for (let i = 0, item; (item = items[i]) != null; i++) {
  doSomething(item);
}
```

这段代码读取了数组中的所有元素，然后多读取了一个。它会在找到 `undefined` 或 `null` 元素后才结束。（jQuery 在一些地方也使用这种模式。）

相反，应以传统方式编写循环，并一直迭代直到遇到最后一个元素。

```js
for (let index = 0; index < items.length; index++) {
  const item = items[index];
  doSomething(item);
}
```

当你循环的集合是可迭代的（例如数组和 `NodeList`），这更好：直接使用 `for-of`。

```js
for (const item of items) {
  doSomething(item);
}
```

对于数组，你可以使用内置的 `forEach` 方法：

```js
items.forEach((item) => {
  doSomething(item);
});
```

如今，`for-of` 和 `forEach` 的性能与传统的 `for` 循环相当。

避免读取超出数组长度的内容！在这种情况下，V8 的边界检查失败，属性存在检查失败，然后 V8 需要查找原型链。如果你之后意外地在计算中使用该值，影响会更糟，例如：

```js
function Maximum(array) {
  let max = 0;
  for (let i = 0; i <= array.length; i++) { // 错误的比较！
    if (array[i] > max) max = array[i];
  }
  return max;
}
```

在这里，最后一次迭代会读取超出数组长度的内容，这会返回 `undefined`，这不仅让加载操作受到影响，还污染了比较：现在不仅需要比较数字，还要处理特殊情况。将终止条件修复为正确的 `i < array.length`，对于该示例能带来 **6倍** 的性能提升（测量对象是包含 10,000 个元素的数组，因此迭代次数仅下降了 0.01%）。

### 避免元素类型的转换

通常，如果需要对数组执行大量操作，请尝试使用尽可能具体的元素种类，以便 V8 可以尽可能优化这些操作。

这比看起来更难。例如，只需将 `-0` 添加到一个小整数数组中，就足以使其转换为 `PACKED_DOUBLE_ELEMENTS`。

```js
const array = [3, 2, 1, +0];
// PACKED_SMI_ELEMENTS
array.push(-0);
// PACKED_DOUBLE_ELEMENTS
```

因此，对该数组进行的任何后续操作都将以完全不同的方式优化，而不是针对 Smis 的方式。

避免使用 `-0`，除非您明确需要在代码中区分 `-0` 和 `+0`。（很可能您不需要。）

同样的情况也适用于 `NaN` 和 `Infinity`。它们表示为双精度数，因此向一个 `SMI_ELEMENTS` 数组中添加一个 `NaN` 或 `Infinity` 就会使其转换为 `DOUBLE_ELEMENTS`。

```js
const array = [3, 2, 1];
// PACKED_SMI_ELEMENTS
array.push(NaN, Infinity);
// PACKED_DOUBLE_ELEMENTS
```

如果您计划对整数数组执行大量操作，请考虑在初始化值时规范化 `-0` 并阻止 `NaN` 和 `Infinity`。这样可以让数组坚持使用 `PACKED_SMI_ELEMENTS` 类型。这种一次性的规范化成本可能值得后续的优化。

事实上，如果您正在对数字数组进行数学运算，请考虑使用 TypedArray。我们也有专门的元素类型用于处理它们。

### 优先使用数组而不是类数组对象

JavaScript 中的一些对象——尤其是 DOM 中——看起来像数组，尽管它们不是正式的数组。您可以自己创建类数组对象：

```js
const arrayLike = {};
arrayLike[0] = 'a';
arrayLike[1] = 'b';
arrayLike[2] = 'c';
arrayLike.length = 3;
```

这个对象有一个 `length` 属性，并支持索引访问元素（就像数组一样！），但它的原型上缺少像 `forEach` 这样的数组方法。虽然仍然可以对它调用数组泛型方法：

```js
Array.prototype.forEach.call(arrayLike, (value, index) => {
  console.log(`${ index }: ${ value }`);
});
// 这会记录 '0: a'，然后是 '1: b'，最后是 '2: c'。
```

这段代码在类数组对象上调用了内置的 `Array.prototype.forEach`，并且它按预期工作。然而，这比在适当的数组上调用 `forEach` 要慢，后者在 V8 中被高度优化。如果您计划对这个对象多次使用数组内置方法，请考虑事先将它转换为一个实际的数组：

```js
const actualArray = Array.prototype.slice.call(arrayLike, 0);
actualArray.forEach((value, index) => {
  console.log(`${ index }: ${ value }`);
});
// 这会记录 '0: a'，然后是 '1: b'，最后是 '2: c'。
```

这种一次性的转换成本可能值得后续的优化，尤其是当您计划对数组执行大量操作时。

例如，`arguments` 对象是一个类数组对象。可以对它调用数组内置方法，但这些操作不会像对真正数组一样得到完全优化。

```js
const logArgs = function() {
  Array.prototype.forEach.call(arguments, (value, index) => {
    console.log(`${ index }: ${ value }`);
  });
};
logArgs('a', 'b', 'c');
// 这会记录 '0: a'，然后是 '1: b'，最后是 '2: c'。
```

ES2015 的剩余参数可以在这里有所帮助。它们生成可代替类数组 `arguments` 对象的真正数组，是一种优雅的替代方法。

```js
const logArgs = (...args) => {
  args.forEach((value, index) => {
    console.log(`${ index }: ${ value }`);
  });
};
logArgs('a', 'b', 'c');
// 这会记录 '0: a'，然后是 '1: b'，最后是 '2: c'。
```

如今，没有充分的理由直接使用 `arguments` 对象。

通常情况下，尽可能避免使用类数组对象，而是使用真正的数组。

### 避免多态性

如果您的代码处理不同元素类型的数组，它可能导致多态操作，这比仅操作单一元素类型的代码要慢。

考虑以下示例，其中一个库函数被不同元素类型调用。（请注意，这不是原生的 `Array.prototype.forEach`，原生函数有额外的优化支持，而不仅仅是本文讨论的元素类型相关优化。）

```js
const each = (array, callback) => {
  for (let index = 0; index < array.length; ++index) {
    const item = array[index];
    callback(item);
  }
};
const doSomething = (item) => console.log(item);

each([], () => {});

each(['a', 'b', 'c'], doSomething);
// `each` 被 `PACKED_ELEMENTS` 类型调用。V8 使用内联缓存
// （或“IC”）来记住 `each` 是用这种特定元素类型调用的。
// V8 是乐观的，并假定 `array.length` 和 `array[index]`
// 在 `each` 函数中的访问是单态的（即仅收到一种元素类型），
// 直到被证明不是这样。对于后续每次调用 `each`，
// V8 会检查元素类型是否为 `PACKED_ELEMENTS`。
// 如果是，V8 可以重用先前生成的代码。如果不是，则需要更多工作。

each([1.1, 2.2, 3.3], doSomething);
// `each` 被调用时使用 `PACKED_DOUBLE_ELEMENTS`。由于 V8 现在在其 IC 中看到了不同的元素种类传递给 `each`，因此
// `each` 函数内部的 `array.length` 和 `array[index]` 的访问被标记为多态。现在，每次调用 `each` 时，V8 需要进行额外的检查：一个用于 `PACKED_ELEMENTS`
//（如之前一样），一个新的用于 `PACKED_DOUBLE_ELEMENTS`，还有一个用于任何其他的元素种类（如之前一样）。这会导致性能
// 下降。

each([1, 2, 3], doSomething);
// `each` 被调用时使用 `PACKED_SMI_ELEMENTS`。这引发了另一个多态级别的出现。现在，`each` 的 IC 中有三种不同的元素种类。
// 从现在起，对于每次 `each` 调用，还需要另一种元素种类检查，以重用为 `PACKED_SMI_ELEMENTS` 生成的代码。
// 这会带来性能成本。
```

内置方法（例如 `Array.prototype.forEach`）可以更高效地处理这种多态性，因此在性能敏感的情况下，建议优先使用它们而不是用户库函数。

在 V8 上关于单态与多态的另一个例子涉及对象形状，也就是对象的隐藏类。要了解该情况，可以参考 [Vyacheslav 的文章](https://mrale.ph/blog/2015/01/11/whats-up-with-monomorphism.html)。

### 避免创建空洞

对于真实的编码模式，访问稀疏数组或填充数组之间的性能差异通常很小，不值得关注甚至无法衡量。如果（很大的“如果”！）您的性能测量表明在优化代码中节省每一步机器指令都是值得的，那么可以尝试让数组保持为填充模式。例如，我们尝试创建一个数组：

```js
const array = new Array(3);
// 此时，数组是稀疏的，因此它被标记为
// `HOLEY_SMI_ELEMENTS`，即在当前信息下最具体的可能性。
array[0] = 'a';
// 等等，那是一个字符串而不是小整数… 所以种类
// 转换为 `HOLEY_ELEMENTS`。
array[1] = 'b';
array[2] = 'c';
// 在此时，数组中的三个位置都已填充，因此
// 数组是填充的（即不再是稀疏的）。然而，我们不能
// 转换为更具体的种类，例如 `PACKED_ELEMENTS`。
// 元素种类仍为 `HOLEY_ELEMENTS`。
```

一旦数组被标记为稀疏，它将永远保持稀疏状态——即使后来其所有元素都存在！

创建数组的更好方法是改用文字方式：

```js
const array = ['a', 'b', 'c'];
// 元素种类：PACKED_ELEMENTS
```

如果您事先不知道所有的值，可以创建一个空数组，然后后来用 `push` 将值添加到其中。

```js
const array = [];
// …
array.push(someValue);
// …
array.push(someOtherValue);
```

这种方法可确保数组从不转换为稀疏元素种类。因此，对于该数组上的某些操作，V8 可能能够生成略微更快的优化代码。

## 调试元素种类

要确定某个对象的“元素种类”，获取 `d8` 的调试版本（可通过在调试模式下[从源码构建](/docs/build)或使用 [`jsvu`](https://github.com/GoogleChromeLabs/jsvu) 获取预编译二进制文件），然后运行：

```bash
out/x64.debug/d8 --allow-natives-syntax
```

这会打开一个 `d8` REPL，其中[特殊函数](https://cs.chromium.org/chromium/src/v8/src/runtime/runtime.h?l=20&rcl=05720af2b09a18be5c41bbf224a58f3f0618f6be)（例如 `%DebugPrint(object)`）可用。其输出中的 “elements” 字段显示您传递给它的任何对象的“元素种类”。

```js
d8> const array = [1, 2, 3]; %DebugPrint(array);
DebugPrint: 0x1fbbad30fd71: [JSArray]
 - map = 0x10a6f8a038b1 [FastProperties]
 - prototype = 0x1212bb687ec1
 - elements = 0x1fbbad30fd19 <FixedArray[3]> [PACKED_SMI_ELEMENTS (COW)]
 - length = 3
 - properties = 0x219eb0702241 <FixedArray[0]> {
    #length: 0x219eb0764ac9 <AccessorInfo> (const accessor descriptor)
 }
 - elements= 0x1fbbad30fd19 <FixedArray[3]> {
           0: 1
           1: 2
           2: 3
 }
[…]
```

请注意，“COW” 表示 [写时复制](https://en.wikipedia.org/wiki/Copy-on-write)，这是另一种内部优化。暂时不必担心这个——这是另一个博客文章讨论的话题！

调试版本中提供的另一个有用的标志是 `--trace-elements-transitions`。启用它可以在任何元素种类转换发生时让 V8 通知您。

```bash
$ cat my-script.js
const array = [1, 2, 3];
array[3] = 4.56;

$ out/x64.debug/d8 --trace-elements-transitions my-script.js
elements transition [PACKED_SMI_ELEMENTS -> PACKED_DOUBLE_ELEMENTS] in ~+34 at x.js:2 for 0x1df87228c911 <JSArray[3]> from 0x1df87228c889 <FixedArray[3]> to 0x1df87228c941 <FixedDoubleArray[22]>
```
