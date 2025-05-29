---
title: '在V8中实现排序'
author: 'Simon Zünd ([@nimODota](https://twitter.com/nimODota))，一致的比较器'
avatars:
  - simon-zuend
date: 2018-09-28 11:20:37
tags:
  - ECMAScript
  - 内部机制
description: '从V8 v7.0 / Chrome 70开始，Array.prototype.sort变为稳定排序算法。'
tweet: '1045656758700650502'
---
`Array.prototype.sort`是V8中最后几个用自托管JavaScript实现的内置函数之一。移植它为我们提供了实验不同算法和实现策略的机会，并最终在V8 v7.0 / Chrome 70中[让它变得稳定](https://mathiasbynens.be/demo/sort-stability)。

<!--truncate-->
## 背景

在JavaScript中排序是困难的。本文讲述了排序算法和JavaScript语言交互中的一些特殊情况，描述了我们将V8迁移至一个稳定算法并使性能更加可预测的过程。

比较不同的排序算法时，我们会关注它们的最坏和平均性能，这些性能通常用渐近增长界限（即“大O”记法）来描述内存操作或比较次数的增长情况。请注意，在动态语言（如JavaScript）中，比较操作通常比内存访问贵得多。这是因为排序过程中比较两个值通常需要调用用户代码。

让我们看一个简单的例子，用户提供的比较函数将一些数字按升序排序。一个_一致的_比较函数会根据两个提供的值是否更小、更大或相等分别返回`-1`（或其他负值）、`0`或`1`（或其他正值）。未遵循这种模式的比较函数是_不一致的_，可能具有任意副作用，例如修改它意图排序的数组。

```js
const array = [4, 2, 5, 3, 1];

function compare(a, b) {
  // 任意代码可在此处，例如 `array.push(1);`。
  return a - b;
}

// 一个“典型”的排序调用。
array.sort(compare);
```

即使在下一个例子中，也可能发生用户代码的调用。“默认”比较函数会调用两个值的`toString`，并对字符串表示进行字典序比较。

```js
const array = [4, 2, 5, 3, 1];

array.push({
  toString() {
    // 任意代码可在此处，例如 `array.push(1);`。
    return '42';
  }
});

// 未提供比较函数的排序。
array.sort();
```

### 使用访问器和原型链交互的更多情况

这是我们离开规范并进入“实现定义的”行为领域的部分。规范列出了一整套条件，在满足这些条件时，允许引擎随意排序对象/数组——或完全不排序。引擎仍然需要遵循一些基本规则，但其他部分基本上可以自由选择。一方面，这给了引擎开发者试验不同实现的自由。另一方面，用户希望某种合理的行为，即便规范并不要求一定有。这种情况复杂的是，“合理行为”往往不容易界定。

这一节展示了`Array#sort`仍然存在一些引擎行为差异的地方。这些是困难的边界情况，如上所述，“正确的做法”其实并不总是很明确。我们_强烈_建议不要编写这样的代码；引擎不会针对它进行优化。

第一个例子展示了带有一些访问器（例如getter和setter）以及“调用日志”的数组在不同JavaScript引擎中的表现。访问器是结果排序顺序实现定义的首个案例：

```js
const array = [0, 1, 2];

Object.defineProperty(array, '0', {
  get() { console.log('get 0'); return 0; },
  set(v) { console.log('set 0'); }
});

Object.defineProperty(array, '1', {
  get() { console.log('get 1'); return 1; },
  set(v) { console.log('set 1'); }
});

array.sort();
```

以下是该代码片段在各个引擎中的输出。请注意，这里没有“正确”或“错误”的答案——规范将此交由实现决定！

```
// Chakra
get 0
get 1
set 0
set 1

// JavaScriptCore
get 0
get 1
get 0
get 0
get 1
get 1
set 0
set 1

// V8
get 0
get 0
get 1
get 1
get 1
get 0

#### SpiderMonkey
get 0
get 1
set 0
set 1
```

下一个例子展示了与原型链的交互。为了简洁，我们不展示调用日志。

```js
const object = {
 1: 'd1',
 2: 'c1',
 3: 'b1',
 4: undefined,
 __proto__: {
   length: 10000,
   1: 'e2',
   10: 'a2',
   100: 'b2',
   1000: 'c2',
   2000: undefined,
   8000: 'd2',
   12000: 'XX',
   __proto__: {
     0: 'e3',
     1: 'd3',
     2: 'c3',
     3: 'b3',
     4: 'f3',
     5: 'a3',
     6: undefined,
   },
 },
};
Array.prototype.sort.call(object);
```

输出显示了排序后的 `object`。同样，这里没有标准答案。这个例子只是展示了索引属性与原型链之间交互是多么奇怪：

```js
// Chakra
[&apos;a2&apos;, &apos;a3&apos;, &apos;b1&apos;, &apos;b2&apos;, &apos;c1&apos;, &apos;c2&apos;, &apos;d1&apos;, &apos;d2&apos;, &apos;e3&apos;, undefined, undefined, undefined]

// JavaScriptCore
[&apos;a2&apos;, &apos;a2&apos;, &apos;a3&apos;, &apos;b1&apos;, &apos;b2&apos;, &apos;b2&apos;, &apos;c1&apos;, &apos;c2&apos;, &apos;d1&apos;, &apos;d2&apos;, &apos;e3&apos;, undefined]

// V8
[&apos;a2&apos;, &apos;a3&apos;, &apos;b1&apos;, &apos;b2&apos;, &apos;c1&apos;, &apos;c2&apos;, &apos;d1&apos;, &apos;d2&apos;, &apos;e3&apos;, undefined, undefined, undefined]

// SpiderMonkey
[&apos;a2&apos;, &apos;a3&apos;, &apos;b1&apos;, &apos;b2&apos;, &apos;c1&apos;, &apos;c2&apos;, &apos;d1&apos;, &apos;d2&apos;, &apos;e3&apos;, undefined, undefined, undefined]
```

### V8 在排序之前和之后做了什么

:::note
**注意：** 本节在2019年6月更新，反映了 V8 v7.7 中 `Array#sort` 的预处理和后处理的变化。
:::

V8 在实际排序之前进行了一步预处理，并在排序完成后进行了一步后处理。基本思想是将所有非 `undefined` 值收集到一个临时列表中，对该临时列表进行排序，然后将排序后的值写回原始数组或对象。这使得 V8 在排序过程中无需担心与访问器或原型链的交互。

规范期望 `Array#sort` 产生的排序可以概念上分为三个部分：

  1. 所有非 `undefined` 值根据比较函数排序。
  1. 所有 `undefined` 值。
  1. 所有空洞，即不存在的属性。

实际的排序算法只需要应用于第一部分。为实现这一目标，V8 的预处理步骤大致如下：

  1. 令 `length` 为数组或对象的 `”length”` 属性的值。
  1. 令 `numberOfUndefineds` 为 0。
  1. 对范围 `[0, length)` 中的每个 `value`：
    a. 如果 `value` 是一个空洞：不执行任何操作
    b. 如果 `value` 是 `undefined`：将 `numberOfUndefineds` 加 1。
    c. 否则将 `value` 添加到临时列表 `elements`。

执行完这些步骤后，所有非 `undefined` 值都包含在临时列表 `elements` 中。`undefined` 值只是被计数，而不是添加到 `elements`。如上所述，规范要求 `undefined` 值必须排序到末尾。此外，`undefined` 值并不会实际传递给用户提供的比较函数，所以我们可以只计算发生的 `undefined` 数量。

下一步是实际对 `elements` 进行排序。详细描述请参阅 [关于 TimSort 的部分](/blog/array-sort#timsort)。

排序完成后，需要将排序后的值写回到原始数组或对象中。后处理步骤包括三个阶段，处理概念性的部分：

  1. 将 `elements` 的所有值写回到范围 `[0, elements.length)` 的原始对象中。
  1. 将范围 `[elements.length, elements.length + numberOfUndefineds)` 中的所有值设置为 `undefined`。
  1. 删除范围 `[elements.length + numberOfUndefineds, length)` 中的所有值。

步骤 3 是必要的，以防原始对象在排序范围内包含空洞。范围 `[elements.length + numberOfUndefineds, length)` 中的值已经被移到前面，不执行步骤 3 会导致重复值。

## 历史

`Array.prototype.sort` 和 `TypedArray.prototype.sort` 依赖于使用 JavaScript 编写的同一快速排序实现。排序算法本身相当简单：基础是快速排序，并为较短的数组（长度 < 10）提供插入排序回退。插入排序回退也用于当快速排序递归达到一个子数组长度为 10 时。插入排序对于较小数组更高效，因为快速排序在分区后会递归调用两次。每次这样的递归调用都有创建（和丢弃）堆栈帧的开销。

选择合适的枢轴元素对快速排序来说影响很大。V8 采用了两种策略：

- 枢轴被选为子数组的首元素、尾元素以及第三个元素的中位数。对于较小的数组，该第三个元素只是中间元素。
- 对于较大的数组，先取样本，然后对样本进行排序，排序后的样本中位数作为上述计算中的第三个元素。

快速排序的优势之一是它可以就地排序。内存开销来自于在排序大数组时分配一个小型数组作为样本，以及 log(n) 的堆栈空间。缺点是它不是一个稳定的算法，并且有可能出现最坏情况，让快速排序退化为 𝒪(n²)。

### 引入 V8 Torque

作为 V8 博客的忠实读者，您可能已经听说过 [`CodeStubAssembler`](/blog/csa) 或简称 CSA。CSA 是 V8 的一个组件，它允许我们直接在 C++ 中编写低级 TurboFan IR，随后通过 TurboFan 的后端将其转换为适当架构的机器码。

CSA 被广泛用于编写所谓的 JavaScript 内建函数的“快速路径”。内建函数的快速路径版本通常会检查某些不变量是否成立（例如，原型链上没有元素，没有访问器等），然后使用更快、更具体的操作来实现内建功能。这可以使执行时间比更通用的版本快一个数量级。

CSA 的缺点在于它确实可以看作是一种汇编语言。使用显式的 `labels` 和 `gotos` 来建模控制流，这使得在 CSA 中实现更复杂的算法变得难以阅读且容易出错。

引入了 [V8 Torque](/docs/torque)。Torque 是一种具有类似 TypeScript 语法的领域特定语言，目前唯一的编译目标是 CSA。Torque 提供的控制级别几乎与 CSA 相同，同时提供了更高级的构造如 `while` 和 `for` 循环。此外，它是强类型的，未来还将包含安全检查，例如自动边界检查，为 V8 工程师提供更强的保证。

在 V8 Torque 中重新实现的第一个主要内建函数是 [`TypedArray#sort`](/blog/v8-release-68) 和 [`Dataview` 操作](/blog/dataview)。这两者的附加目的是向 Torque 开发者提供反馈，说明需要哪些语言特性以及应使用哪些惯用语法高效编写内建函数。在撰写本文时，几个 `JSArray` 内建函数的自托管 JavaScript 备选实现已经迁移到 Torque（例如 `Array#unshift`），而其他的一些则被完全重写（例如 `Array#splice` 和 `Array#reverse`）。

### 将 `Array#sort` 移至 Torque

最初的 `Array#sort` Torque 版本基本上是 JavaScript 实现的直接移植。唯一的区别是在较大数组中，没有使用采样方法，而是随机选择用于枢轴计算的第三个元素。

这种方法效果尚可，但由于它仍然使用快速排序，`Array#sort` 依然是不稳定的。[对稳定的 `Array#sort` 的请求](https://bugs.chromium.org/p/v8/issues/detail?id=90) 是 V8 错误跟踪器中最古老的票据之一。下一步实验 Timsort 给了我们很多好处。首先，我们喜欢 Timsort 的稳定性以及它提供的一些漂亮的算法保证（见下一节）。其次，由于 Torque 仍在开发中，通过使用 Timsort 实现一个更加复杂的内建函数如 `Array#sort`，让我们获得了很多影响 Torque 作为语言的发展方向的可操作反馈。

## Timsort

Timsort 最初由 Tim Peters 于 2002 年为 Python 开发，可以被描述为一种自适应的稳定的归并排序变体。尽管细节相当复杂，可以参考 [作者本人](https://github.com/python/cpython/blob/master/Objects/listsort.txt) 或 [维基百科页面](https://en.wikipedia.org/wiki/Timsort) 的描述，但基本概念很容易理解。虽然归并排序通常以递归方式工作，Timsort 是迭代式的。它从左到右处理数组，寻找所谓的 _run_。run 简单来说就是已经排序的序列。这包括“排序错误方向”的序列，因为这些序列只需反转即可形成一个 run。在排序过程开始时，根据输入的长度确定一个最小 run 长度。如果 Timsort 找不到这种最小 run 长度的自然 run，会用插入排序“人工提升”一个 run。

通过这种方式找到的 run 会使用一个栈进行跟踪，该栈记录每个 run 的起始索引和长度。栈中的 run 会不时合并，直到只剩下一个已排序的 run。Timsort 在决定合并哪些 run 时尝试保持平衡。一方面，你希望尽早合并，因为这些 run 的数据很可能已经在缓存中，另一方面，你希望尽可能晚地合并以利用数据中可能出现的模式。为了实现这一点，Timsort 保持了两个不变性。假设 `A`、`B` 和 `C` 是栈顶的三个 run：

- `|C| > |B| + |A|`
- `|B| > |A|`

![合并 `A` 与 `B` 前后的 run 栈示意图](/_img/array-sort/runs-stack.svg)

图中显示了 `|A| > |B|` 的情况，因此 `B` 会与较小的 run 合并。

请注意，Timsort 只会合并连续的 run，这是为了保持稳定性，否则相等的元素会在 run 之间转移。此外，第一个不变性确保了 run 的长度至少以斐波那契数的速度增长，当我们知道最大数组长度时，即可给出 run 栈大小的上限。

现在可以看到，已经排序的序列以 𝒪(n) 的复杂度进行排序，因为这样的数组会成为单个 run，且无需合并。最坏情况是 𝒪(n log n)。这些算法特性以及 Timsort 的稳定性是最终选择 Timsort 而非快速排序的原因之一。

### 在 Torque 中实现 Timsort

内置函数通常具有不同的代码路径，这些路径会根据各种变量在运行时进行选择。最通用的版本可以处理任何类型的对象，无论它是 `JSProxy`，有拦截器，还是在获取或设置属性时需要进行原型链查找。
通用路径在大多数情况下相对较慢，因为它需要考虑所有可能情况。但如果我们能提前知道要排序的对象是一个只包含 Smis 的简单 `JSArray`，那么所有这些昂贵的 `[[Get]]` 和 `[[Set]]` 操作都可以被替换为对 `FixedArray` 的简单加载和存储。主要的区分因素是 [`ElementsKind`](/blog/elements-kinds)。

现在的问题变成了如何实现快速路径。核心算法对所有情况都保持一致，只是我们访问元素的方式会根据 `ElementsKind` 发生变化。一种实现方式是在每个调用点派发到正确的“访问器”。可以设想，每次进行“加载”/“存储”操作时，通过选择的快速路径选择不同的分支。

另一个解决方案（这也是最初尝试的方法）是为每条快速路径复制整个内置函数，并内联正确的加载/存储访问方法。然而，这种方法对于 Timsort 来说不可行，因为它是一个大型内置函数，为每条快速路径制作一个副本总共需要 106 KB，这是单个内置函数所需的空间太大了。

最终的解决方案略有不同。每条快速路径的每个加载/存储操作都被放到自己的“迷你内置函数”中。请参见显示 `FixedDoubleArray` 的“加载”操作的代码示例。

```torque
Load<FastDoubleElements>(
    context: Context, sortState: FixedArray, elements: HeapObject,
    index: Smi): Object {
  try {
    const elems: FixedDoubleArray = UnsafeCast<FixedDoubleArray>(elements);
    const value: float64 =
        LoadDoubleWithHoleCheck(elems, index) otherwise Bailout;
    return AllocateHeapNumberWithValue(value);
  }
  label Bailout {
    // 预处理步骤通过将所有元素压缩到数组起始位置移除了所有空洞。
    // 找到空洞意味着 cmp 函数或 ToString 改变了数组。
    return Failure(sortState);
  }
}
```

相比之下，最通用的“加载”操作只是调用 `GetProperty`。然而，上述版本生成高效且快速的机器代码来加载和转换一个 `Number`，而 `GetProperty` 是对另一个内置函数的调用，这可能涉及原型链查找或调用访问器函数。

```js
builtin Load<ElementsAccessor : type>(
    context: Context, sortState: FixedArray, elements: HeapObject,
    index: Smi): Object {
  return GetProperty(context, elements, index);
}
```

快速路径然后简单地变成了一组函数指针。这意味着我们只需要核心算法的一份副本，同时在前期设置好所有相关的函数指针。虽然这大大减少了所需的代码空间（降到 20k），但代价是每个访问点会有间接分支。这因最近改用 [嵌入式内置函数](/blog/embedded-builtins) 而更加严重。

### 排序状态

![](/_img/array-sort/sort-state.svg)

上图显示了“排序状态”。这是一个 `FixedArray`，用于跟踪排序时需要的所有信息。每次调用 `Array#sort` 时，都会分配这样的排序状态。条目 4 到 7 是上述组成快速路径的一组函数指针。

每次从用户的 JavaScript 代码返回时，都会使用“检查”内置函数来检查是否可以继续当前快速路径。它使用“初始接收器映射”和“初始接收器长度”来实现此功能。如果用户代码修改了当前对象，我们就会放弃排序运行，将所有指针重置为它们的最通用版本，并重新开始排序过程。槽 8 中的“退出状态”用于表示此重置。

“比较”条目可以指向两个不同的内置函数。一个调用用户提供的比较函数，另一个实现默认比较，即对两个参数调用 `toString`，然后进行词典顺序比较。

其余字段（快速路径 ID 除外）是特定于 Timsort 的。运行堆栈（如上所述）被初始化为大小 85，这足以排序长度为 2<sup>64</sup> 的数组。临时数组用于合并运行。它根据需要增长，但永远不会超过输入长度的 `n/2`。

### 性能权衡

将排序从自托管的JavaScript迁移到Torque会带来性能上的权衡。由于`Array#sort`是用Torque编写的，它现在是静态编译的代码，这意味着我们仍然可以针对某些[`ElementsKind`](/blog/elements-kinds)构建快速路径，但它永远不会像高度优化的TurboFan版本那样快，因为TurboFan可以利用类型反馈。另一方面，在代码不够热以至于无法进行JIT编译或者调用点是多态的情况下，我们只能使用解释器或缓慢/通用版本。此外，解析、编译以及可能优化自托管JavaScript版本也是一种开销，而在Torque实现中无需这种开销。

虽然Torque方法不会实现相同的排序性能峰值，但它避免了性能断崖。最终结果是排序性能比以前更加可预测。请记住，Torque仍在变化之中，除了针对CSA，它未来可能还会针对TurboFan，使得可以对Torque编写的代码进行JIT编译。

### 微基准测试

在开始重新实现`Array#sort`之前，我们添加了许多不同的微基准测试，以更好地理解这一重新实现的影响。第一张图表显示了使用用户提供的比较函数排序各种ElementsKind的“正常”使用场景。

请记住，在这些场景中，JIT编译器可以完成很多工作，因为排序几乎是我们全部的工作。这也使得优化编译器可以在JavaScript版本中内联比较函数，而Torque情形中则有从内建代码到JavaScript的调用开销。即便如此，我们在几乎所有情况下都有更好的表现。

![](/_img/array-sort/micro-bench-basic.svg)

接下来的图表显示了Timsort处理完全排序或已经按某种方式排序的子序列数组时的影响。图表以Quicksort为基准，并显示了Timsort的加速效果（例如在“DownDown”情况下，加速效果可达17倍，数组由两个逆序排序的序列组成）。如图所示，除了随机数据的情况外，Timsort在其他所有情况下表现更好，即使在上面的微基准测试中，Quicksort在排序`PACKED_SMI_ELEMENTS`时性能优于Timsort。

![](/_img/array-sort/micro-bench-presorted.svg)

### 网站工具基准

[网站工具基准](https://github.com/v8/web-tooling-benchmark)是一组通常由网页开发人员使用的工具的工作负载集合，例如Babel和TypeScript。图表将JavaScript的Quicksort作为基准，并比较Timsort相对于它的加速效果。在几乎所有基准测试中，我们保持了相同的性能，除了chai的例外情况。

![](/_img/array-sort/web-tooling-benchmark.svg)

chai基准测试中有*三分之一*的时间花在单一比较函数中（一个字符串距离计算）。该基准测试是chai测试套件本身。由于数据的关系，Timsort在这种情况下需要更多比较，这对总体运行时间产生了更大的影响，因为这么大的时间部分都花在该特定比较函数中。

### 内存影响

在浏览约50个网站（包括移动端和桌面端）时分析V8堆快照，没有显示任何内存性能下降或改善。一方面，这令人惊讶：从Quicksort转换为Timsort引入了合并运行所需的临时数组，其大小可能比用于采样的临时数组大得多。另一方面，这些临时数组的生命周期非常短（仅为`sort`调用期间），可以在V8的新空间中快速分配和丢弃。

## 结论

总而言之，我们对基于Torque实现的Timsort的算法属性和可预测的性能行为感觉更加满意。Timsort自V8 v7.0和Chrome 70开始可用。祝大家排序愉快！
