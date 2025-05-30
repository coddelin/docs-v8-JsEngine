---
title: "BigInt: JavaScript 中任意精度的整数"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias))"
avatars: 
  - "mathias-bynens"
date: 2018-05-01
tags: 
  - ECMAScript
  - ES2020
  - io19
description: "BigInt 是 JavaScript 中的一个新型数字原始值，可表示任意精度的整数。本文通过对比 JavaScript 中的 BigInt 和 Number，逐步介绍 BigInt 的一些使用场景，并说明 Chrome 67 中的新功能。"
tweet: "990991035630206977"
---
`BigInt` 是 JavaScript 中的一种新型数字原始值，可以表示任意精度的整数。通过 `BigInt`，您可以安全地存储并操作即使超出 `Number` 安全整数限制的大整数。本文通过对比 JavaScript 中的 `BigInt` 和 `Number`，逐步介绍它的一些使用场景，并说明 Chrome 67 中的新功能。

<!--truncate-->
## 使用场景

任意精度的整数为 JavaScript 解锁了许多新场景。

`BigInt` 能够正确地执行整数运算而不会溢出。这本身就开启了无数新可能。例如，在金融科技中，大数的数学运算是常见的应用场景。

[大整数 ID](https://developer.twitter.com/en/docs/basics/twitter-ids) 和 [高精度时间戳](https://github.com/nodejs/node/pull/20220) 无法在 JavaScript 中安全地表示为 `Number`。这[经常](https://github.com/stedolan/jq/issues/1399)导致[现实中的 bug](https://github.com/nodejs/node/issues/12115)，迫使 JavaScript 开发者用字符串来表示这些数据。有了 `BigInt`，现在可以将这些数据表示为数值。

`BigInt` 可以为未来的 `BigDecimal` 实现奠定基础。这将有助于以小数精度表示金额并准确操作这些金额（即所谓的 `0.10 + 0.20 !== 0.30` 问题）。

以前，拥有这些使用场景的 JavaScript 应用必须依赖用户空间的库来模拟类似 `BigInt` 的功能。当 `BigInt` 广泛可用后，这些应用可以用原生的 `BigInt` 替代这些运行时依赖。这有助于减少加载时间、解析时间和编译时间，此外还提供显著的运行时性能提升。

![Chrome 中原生的 `BigInt` 实现性能优于流行的用户空间库。](/_img/bigint/performance.svg)

## 当前状况：`Number`

JavaScript 中的 `Number` 是以 [双精度浮点数](https://en.wikipedia.org/wiki/Floating-point_arithmetic) 表示的。这意味着它们具有有限的精度。`Number.MAX_SAFE_INTEGER` 常量表示可以安全递增的最大整数。它的值是 `2**53-1`。

```js
const max = Number.MAX_SAFE_INTEGER;
// → 9_007_199_254_740_991
```

:::note
**注意：** 为了便于阅读，我使用下划线作为分隔符，将这个大数字的每千位进行分组。[数字文字分隔符提案](/features/numeric-separators) 使得普通 JavaScript 数字字面量也能实现这一功能。
:::

递增一次会给出预期结果：

```js
max + 1;
// → 9_007_199_254_740_992 ✅
```

但如果再次递增，结果将不再能准确表示为 JavaScript 的 `Number`：

```js
max + 2;
// → 9_007_199_254_740_992 ❌
```

注意，`max + 1` 的结果与 `max + 2` 相同。每当我们在 JavaScript 中获得这个特定数值时，无法判断它是否准确。任何超出安全整数范围的整数运算（即从 `Number.MIN_SAFE_INTEGER` 到 `Number.MAX_SAFE_INTEGER` 之间）都有可能丢失精度。因此，我们只能依赖安全范围内的数字整数值。

## 新亮点：`BigInt`

`BigInt` 是 JavaScript 中的一种新型数字原始值，可以表示具有 [任意精度](https://en.wikipedia.org/wiki/Arbitrary-precision_arithmetic) 的整数。有了 `BigInt`，您可以安全地存储并操作即使超出 `Number` 安全整数限制的大整数。

要创建一个 `BigInt`，只需在任意整数字面量后添加 `n` 后缀。例如，`123` 变为 `123n`。全局函数 `BigInt(number)` 可用于将一个 `Number` 转换为 `BigInt`。换句话说，`BigInt(123) === 123n`。让我们使用这两种技术来解决之前的问题：

```js
BigInt(Number.MAX_SAFE_INTEGER) + 2n;
// → 9_007_199_254_740_993n ✅
```

这是另一个例子，我们正在将两个 `Number` 相乘：

```js
1234567890123456789 * 123;
// → 151851850485185200000 ❌
```

观察最低有效位的数字 `9` 和 `3`，我们知道乘法的结果应以 `7` 结尾（因为 `9 * 3 === 27`）。然而，结果以一串零结尾。这显然不对！让我们改用 `BigInt` 再试一次：

```js
1234567890123456789n * 123n;
// → 151851850485185185047n ✅
```

这次我们得到了正确的结果。

`Number`的安全整数限制不适用于`BigInt`。因此，使用`BigInt`我们可以执行正确的整数运算，而不用担心精度丢失。

### 一个新的原始值类型

`BigInt`是JavaScript语言中的一种新原始值类型。因此，它有自己的类型，可以使用`typeof`运算符检测：

```js
typeof 123;
// → 'number'
typeof 123n;
// → 'bigint'
```

由于`BigInt`是一个独立的类型，因此`BigInt`严格来说永远不会等于`Number`，例如`42n !== 42`。要比较`BigInt`与`Number`，可以将其中一个转换为另一个的类型后再进行比较，或者使用抽象相等`==`：

```js
42n === BigInt(42);
// → true
42n == 42;
// → true
```

在转换为布尔值时（例如使用`if`、`&&`、`||`或`Boolean(int)`），`BigInt`与`Number`遵循相同的逻辑。

```js
if (0n) {
  console.log('if');
} else {
  console.log('else');
}
// → 输出 'else'，因为`0n`为假值。
```

### 运算符

`BigInt`支持最常见的运算符。二元`+`、`-`、`*`和`**`均如预期工作。`/`和`%`也可用，必要时向零舍入。位运算`|`、`&`、`<<`、`>>`和`^`进行位算术，假设使用[二的补码表示法](https://en.wikipedia.org/wiki/Two%27s_complement)处理负值，就像`Number`一样。

```js
(7 + 6 - 5) * 4 ** 3 / 2 % 3;
// → 1
(7n + 6n - 5n) * 4n ** 3n / 2n % 3n;
// → 1n
```

一元`-`可用于表示负的`BigInt`值，例如`-42n`。但不支持一元`+`，因为这会破坏asm.js代码，它期望`+x`要么生成一个`Number`要么抛出异常。

一个需要注意的是，不允许在`BigInt`和`Number`之间混合操作。这是一个好事，因为任何隐式强制转换都可能丢失信息。以下示例展示了这种情况：

```js
BigInt(Number.MAX_SAFE_INTEGER) + 2.5;
// → ?? 🤔
```

结果应该是什么？没有好的答案。`BigInt`无法表示分数，而`Number`无法表示超出安全整数限制的`BigInt`。因此，在`BigInt`和`Number`之间混合操作会导致`TypeError`异常。

唯一的例外是比较运算符，例如`===`（如前所述），`<`和`>=`——因为它们返回布尔值，没有精度丢失的风险。

```js
1 + 1n;
// → TypeError
123 < 124n;
// → true
```

由于`BigInt`和`Number`通常不能混合使用，请避免重载或魔法般“升级”现有代码以使用`BigInt`代替`Number`。选择其中一个领域进行操作，然后保持一致。对于操作潜在大整数的新API，`BigInt`是最佳选择。而对于已知在安全整数范围内的整数值，`Number`仍然是合理的选择。

另一个需要注意的是，[`>>>`运算符](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators#Unsigned_right_shift)，执行无符号右移，对于始终有符号的`BigInt`来说没有意义。因此，`>>>`不适用于`BigInt`。

### API

有一些新的`BigInt`特定API可用。

全局`BigInt`构造函数类似于`Number`构造函数：它将其参数转换为`BigInt`（如前所述）。如果转换失败，则抛出`SyntaxError`或`RangeError`异常。

```js
BigInt(123);
// → 123n
BigInt(1.5);
// → RangeError
BigInt('1.5');
// → SyntaxError
```

第一个示例中将数值字面量传递给`BigInt()`。这是一个糟糕的做法，因为`Number`存在精度丢失，可能在转换为`BigInt`之前就已经丢失了精度：

```js
BigInt(123456789123456789);
// → 123456789123456784n ❌
```

因此，我们建议要么使用`BigInt`字面量表示法（带有`n`后缀），要么传递一个字符串（而不是`Number`！）给`BigInt()`：

```js
123456789123456789n;
// → 123456789123456789n ✅
BigInt('123456789123456789');
// → 123456789123456789n ✅
```

有两个库函数可以将`BigInt`值封装为、有符号或无符号整数，限制为特定位数。`BigInt.asIntN(width, value)`将一个`BigInt`值封装为`width`位二进制有符号整数，`BigInt.asUintN(width, value)`将其封装为`width`位二进制无符号整数。例如，如果进行64位算术运算，可以使用这些API保持在适当范围内：

```js
// 能够表示为64位有符号整数的最大BigInt值。
const max = 2n ** (64n - 1n) - 1n;
BigInt.asIntN(64, max);
// → 9223372036854775807n
BigInt.asIntN(64, max + 1n);
// → -9223372036854775808n
//   ^ 因为溢出变为负数
```


注意，当我们传递一个超出64位整数范围（即绝对数值为63位+1位符号位）的 `BigInt` 值时，溢出会立即发生。

`BigInt` 可以准确表示常用于其他编程语言中的64位有符号和无符号整数。两种新的类型数组形式，`BigInt64Array` 和 `BigUint64Array`，使得高效表示和操作此类值的列表变得更容易：

```js
const view = new BigInt64Array(4);
// → [0n, 0n, 0n, 0n]
view.length;
// → 4
view[0];
// → 0n
view[0] = 42n;
view[0];
// → 42n
```

`BigInt64Array` 类型确保其值保持在有符号64位限制内。

```js
// 可以表示为有符号64位整数的最高可能的 BigInt 值。
const max = 2n ** (64n - 1n) - 1n;
view[0] = max;
view[0];
// → 9_223_372_036_854_775_807n
view[0] = max + 1n;
view[0];
// → -9_223_372_036_854_775_808n
//   ^ 因为溢出而变为负数
```

`BigUint64Array` 类型则使用无符号64位限制来做相同操作。

## Polyfill 和转换 BigInt

在撰写本文时，`BigInt` 仅在 Chrome 中支持。其他浏览器正在积极实现该功能。但是如果你希望 *今天* 使用 `BigInt` 功能而不牺牲浏览器兼容性，该怎么办？我很高兴你问了！答案可以说是…相当有趣。

与其他现代 JavaScript 特性不同，`BigInt` 不可能合理地转换为 ES5。

`BigInt` 提案 [改变了运算符的行为](#operators)（比如 `+`, `>=` 等），以支持 `BigInt`。这些改变无法直接 Polyfill，也使得在大多数情况下使用 Babel 或类似工具将 `BigInt` 代码转换为回退代码变得不可行。原因是这样的转换必须替换程序中的 *每一个运算符* 为调用某个函数以对输入执行类型检查，这会导致无法接受的运行时性能损失。此外，它会极大地增加任何转换后的代码包的文件大小，负面影响下载、解析和编译时间。

一个更可行且具有前瞻性的解决方案是暂时使用 [JSBI 库](https://github.com/GoogleChromeLabs/jsbi#why) 编写代码。JSBI 是 `BigInt` 在 V8 和 Chrome 中实现的 JavaScript 移植版 — 它在设计上完全像原生 `BigInt` 功能一样工作。不同之处在于，它不是依赖语法，而是暴露 [API](https://github.com/GoogleChromeLabs/jsbi#how)：

```js
import JSBI from './jsbi.mjs';

const max = JSBI.BigInt(Number.MAX_SAFE_INTEGER);
const two = JSBI.BigInt('2');
const result = JSBI.add(max, two);
console.log(result.toString());
// → '9007199254740993'
```

一旦所有你关心的浏览器原生支持了 `BigInt`，你可以 [使用 `babel-plugin-transform-jsbi-to-bigint` 将代码转换为原生的 `BigInt` 代码](https://github.com/GoogleChromeLabs/babel-plugin-transform-jsbi-to-bigint)，然后移除 JSBI 依赖。例如，上述代码可以被转换为：

```js
const max = BigInt(Number.MAX_SAFE_INTEGER);
const two = 2n;
const result = max + two;
console.log(result);
// → '9007199254740993'
```

## 拓展阅读

如果你对 `BigInt` 在幕后如何工作（例如，它们在内存中的表示方式，以及如何执行操作）感兴趣，[阅读我们关于实现细节的 V8 博客文章](/blog/bigint)。

## `BigInt` 支持

<feature-support chrome="67 /blog/bigint"
                 firefox="68 https://wingolog.org/archives/2019/05/23/bigint-shipping-in-firefox"
                 safari="14"
                 nodejs="12 https://twitter.com/mathias/status/1120700101637353473"
                 babel="yes #polyfilling-transpiling"></feature-support>
