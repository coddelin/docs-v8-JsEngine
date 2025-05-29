---
title: 'V8 发布 v8.5'
author: 'Zeynep Cankara，追踪一些地图'
avatars:
 - 'zeynep-cankara'
date: 2020-07-21
tags:
 - 发布
description: 'V8 发布 v8.5 提供了 Promise.any、String#replaceAll、逻辑赋值运算符、WebAssembly 多值支持和 BigInt 支持，以及性能改进。'
tweet:
---
每六周，我们会根据[发布流程](https://v8.dev/docs/release-process)创建一个 V8 的新分支。每个版本都会在 Chrome Beta 里程碑之前立即从 V8 的 Git 主分支分出。今天，我们很高兴地宣布我们的最新分支，[V8 版本 8.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.5)，它将在几个星期后与 Chrome 85 稳定版一起发布。V8 v8.5 充满了各种对开发者有益的新功能。这篇文章展示了一些亮点内容的预览，期待发布。

<!--truncate-->
## JavaScript

### `Promise.any` 和 `AggregateError`

`Promise.any` 是一个 Promise 组合器，它在输入的任意一个 Promise 被满足时解析生成的 Promise。

```js
const promises = [
  fetch('/endpoint-a').then(() => 'a'),
  fetch('/endpoint-b').then(() => 'b'),
  fetch('/endpoint-c').then(() => 'c'),
];
try {
  const first = await Promise.any(promises);
  // 任意一个 Promise 被满足。
  console.log(first);
  // → 例如 'b'
} catch (error) {
  // 所有的 Promise 都被拒绝。
  console.assert(error instanceof AggregateError);
  // 记录拒绝的值：
  console.log(error.errors);
}
```

如果所有输入的 Promise 都被拒绝，则生成的 Promise 会以一个包含 `errors` 属性的 `AggregateError` 对象被拒绝，其中 `errors` 属性包含一个拒绝值的数组。

更多信息请参阅[我们的说明文档](https://v8.dev/features/promise-combinators#promise.any)。

### `String.prototype.replaceAll`

`String.prototype.replaceAll` 提供了一种简单的方法来替换所有出现的子字符串，无需创建全局的 `RegExp`。

```js
const queryString = 'q=query+string+parameters';

// 可行，但需要在正则表达式中进行转义。
queryString.replace(/\+/g, ' ');
// → 'q=query string parameters'

// 更简单！
queryString.replaceAll('+', ' ');
// → 'q=query string parameters'
```

更多信息请参阅[我们的说明文档](https://v8.dev/features/string-replaceall)。

### 逻辑赋值运算符

逻辑赋值运算符是新的复合赋值运算符，将逻辑操作 `&&`、`||` 或 `??` 与赋值相结合。

```js
x &&= y;
// 大致相当于 x && (x = y)
x ||= y;
// 大致相当于 x || (x = y)
x ??= y;
// 大致相当于 x ?? (x = y)
```

注意，与数学和位运算的复合赋值运算符不同，逻辑赋值运算符仅在条件成立时执行赋值。

更深入的解释请阅读[我们的说明文档](https://v8.dev/features/logical-assignment)。

## WebAssembly

### Liftoff 在所有平台上启用

自 V8 v6.9 起，[Liftoff](https://v8.dev/blog/liftoff) 被用于 Intel 平台上的 WebAssembly 基线编译器（Chrome 69 在桌面系统上启用了它）。由于我们担心基线编译器生成的代码增加会导致内存占用上升，因此到目前为止我们一直没有对移动设备启用它。在最近几个月的实验之后，我们确信在大多数情况下内存占用的增加可以忽略，因此我们终于在所有架构上默认启用了 Liftoff，带来了更快的编译速度，尤其是在 arm 设备（32 位和 64 位）上。Chrome 85 也随之启用了 Liftoff。

### 启用了多值支持

WebAssembly 对于[多值代码块和函数返回值](https://github.com/WebAssembly/multi-value)的支持现已可通用使用。这反映了官方 WebAssembly 标准中提案的最新合并，并得到了所有编译器级别的支持。

例如，这是一个有效的 WebAssembly 函数：

```wasm
(func $swap (param i32 i32) (result i32 i32)
  (local.get 1) (local.get 0)
)
```

如果该函数被导出，它也可以从 JavaScript 调用，并返回一个数组：

```js
instance.exports.swap(1, 2);
// → [2, 1]
```

反过来，如果一个 JavaScript 函数返回一个数组（或任何迭代器），它可以被导入并作为多返回值函数在 WebAssembly 模块内部调用：

```js
new WebAssembly.Instance(module, {
  imports: {
    swap: (x, y) => [y, x],
  },
});
```

```wasm
(func $main (result i32 i32)
  i32.const 0
  i32.const 1
  call $swap
)
```

更重要的是，工具链现在可以使用此功能在 WebAssembly 模块中生成更紧凑和更快的代码。

### 支持 JavaScript BigInts

WebAssembly支持[将WebAssembly I64值与JavaScript BigInts互相转换](https://github.com/WebAssembly/JS-BigInt-integration)功能已经发布，根据最新的官方标准，现在可以一般使用。

因此，具有i64参数和返回值的WebAssembly函数可以从JavaScript中调用而不会有精度损失：

```wasm
(module
  (func $add (param $x i64) (param $y i64) (result i64)
    local.get $x
    local.get $y
    i64.add)
  (export "add" (func $add)))
```

从JavaScript中，仅BigInts可以作为I64参数传递：

```js
WebAssembly.instantiateStreaming(fetch('i64.wasm'))
  .then(({ module, instance }) => {
    instance.exports.add(12n, 30n);
    // → 42n
    instance.exports.add(12, 30);
    // → TypeError: 参数不是BigInt类型
  });
```

## V8 API

请使用`git log branch-heads/8.4..branch-heads/8.5 include/v8.h`获取API更改列表。

开发者可以拥有一个活动的V8源码分支，通过`git checkout -b 8.5 -t branch-heads/8.5`来尝试V8 v8.5中的新功能。或者，您可以[订阅Chrome的Beta频道](https://www.google.com/chrome/browser/beta.html)以尽快体验新功能。
