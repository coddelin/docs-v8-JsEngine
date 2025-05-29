---
title: "WebAssembly 与 JavaScript BigInt 的集成"
author: "Alon Zakai"
avatars: 
  - "alon-zakai"
date: 2020-11-12
tags: 
  - WebAssembly
  - ECMAScript
description: "BigInt 使在 JavaScript 和 WebAssembly 之间传递 64 位整数变得简单。本文解释了这意味着什么以及为什么有用，包括让开发者更容易、让代码运行更快，以及加速构建时间。"
tweet: "1331966281571037186"
---
JS-BigInt-Integration 特性使在 JavaScript 和 WebAssembly 之间传递 64 位整数变得简单。本文解释了这意味着什么以及为什么有用，包括让开发者更容易、让代码运行更快，以及加速构建时间。

<!--truncate-->
## 64 位整数

JavaScript 的 Numbers 是双精度类型，即 64 位浮点值。这样的值可以完全精准地包含任何 32 位整数，但不能完全包含所有的 64 位整数。而 WebAssembly 则完全支持 64 位整数，即 `i64` 类型。当将两者连接在一起时会出现问题：比如当一个 Wasm 函数返回一个 i64 类型时，如果从 JavaScript 调用它，虚拟机会抛出类似这样的异常：

```
TypeError: Wasm function signature contains illegal type
```

如错误所说，`i64` 对 JavaScript 来说并不是合法类型。

从历史上看，解决此问题的最佳方法是对 Wasm 进行“合法化”。合法化的意思是，将 Wasm 的导入和导出转换为对 JavaScript 来说合法的类型。实际上，这涉及到两方面：

1. 将 64 位整数参数替换为两个 32 位参数，分别表示低位和高位。
2. 将 64 位整数返回值替换为表示低位的一个 32 位值，另一个 32 位值用于表示高位。

例如，考虑以下 Wasm 模块：

```wasm
(module
  (func $send_i64 (param $x i64)
    ..))
```

合法化会将其转换为：

```wasm
(module
  (func $send_i64 (param $x_low i32) (param $x_high i32)
    (local $x i64) ;; 其余代码将使用的实际值
    ;; 将 $x_low 和 $x_high 合并为 $x 的代码
    ..))
```

合法化是在运行虚拟机之前完成的工具处理。例如，Binaryen 工具链库中有一个叫合法化 JavaScript 接口的处理模块，当需要时，Emscripten 会自动运行它。

## 合法化的缺点

合法化对很多情况下工作得还不错，但也存在一些缺点，比如将 32 位片段合并或拆分为 64 位值所需的额外工作。虽然这种情况很少发生在关键路径上，但一旦发生，性能下降可能很明显——后续我们会看到一些具体数据。

另一个令人烦恼的问题是，合法化会对用户产生影响，因为它改变了 JavaScript 和 Wasm 之间的接口。比如：

```c
// example.c

#include <stdint.h>

extern void send_i64_to_js(int64_t);

int main() {
  send_i64_to_js(0xABCD12345678ULL);
}
```

```javascript
// example.js

mergeInto(LibraryManager.library, {
  send_i64_to_js: function(value) {
    console.log("JavaScript 接收：0x" + value.toString(16));
  }
});
```

这是一个简单的 C 程序，它调用了一个 JavaScript 库函数（即在 C 中定义一个 extern C 函数，并在 JavaScript 中实现它，作为在 Wasm 和 JavaScript 之间进行调用的一种简单且底层的方式）。该程序所做的仅仅是将一个 `i64` 传递到 JavaScript 中，我们尝试在那边打印出来。

我们可以用以下命令来构建它：

```
emcc example.c --js-library example.js -o out.js
```

运行时，我们并没有得到预期的结果：

```
node out.js
JavaScript 接收：0x12345678
```

我们发送的是 `0xABCD12345678`，但只接收到 `0x12345678` 😔。这里发生的事情是，合法化将 `i64` 转为了两个 `i32`，而我们的代码只接收了低 32 位，忽略了发送的另一个参数。若要正确处理，我们需要像这样处理：

```javascript
  // 这个 i64 被分解为两个32位的参数，“低位”和“高位”。
  send_i64_to_js: function(low, high) {
    console.log("JavaScript 接收：0x" + high.toString(16) + low.toString(16));
  }
```

现在运行，我们得到：

```
JavaScript 接收：0xabcd12345678
```

正如你所看到的，合法化是可以使用的。但它确实有点烦人！

## 解决方案：JavaScript BigInts

JavaScript 现在有了 [BigInt](/features/bigint) 值，可以表示任意大小的整数，因此可以正确表示 64 位整数。自然地，人们希望使用这些值来表示 Wasm 的 `i64` 类型。这正是 JS-BigInt-Integration 功能的作用！

Emscripten 支持 Wasm BigInt 集成，我们可以通过添加 `-s WASM_BIGINT` 来编译原始示例（无需进行合法化的任何技巧）：

```
emcc example.c --js-library example.js -o out.js -s WASM_BIGINT
```

然后我们可以运行它（请注意，目前我们需要为 Node.js 传递一个参数以启用 BigInt 集成）：

```
node --experimental-wasm-bigint a.out.js
JS 收到: 0xabcd12345678
```

完美，正是我们想要的！

不仅如此，这种方法更加简单，而且更快。如前所述，在实际操作中，`i64` 的转换很少发生在热点路径上，但如果确实发生，减速可能非常明显。如果我们将上述示例转化为基准测试，并多次调用 `send_i64_to_js`，那么使用 BigInt 的版本会快 18%。

BigInt 集成的另一个好处是工具链可以避免合法化。如果 Emscripten 不需要进行合法化，那么它可能不需要对 LLVM 生成的 Wasm 进行任何处理，从而加速构建时间。如果你使用 `-s WASM_BIGINT` 构建且不提供要求进行更改的其他标志，则可以得到这种速度提升。例如，`-O0 -s WASM_BIGINT` 是可以的（但是优化后的构建会[运行 Binaryen 优化器](https://emscripten.org/docs/optimizing/Optimizing-Code.html#link-times)，这对代码体积优化很重要）。

## 结论

WebAssembly BigInt 集成已经在[多个浏览器](https://webassembly.org/roadmap/)中实现，包括 Chrome 85（发布于 2020-08-25），您今天就可以试用它！
