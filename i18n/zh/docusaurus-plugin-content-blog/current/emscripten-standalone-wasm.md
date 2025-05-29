---
title: '脱离网络：使用 Emscripten 的独立 WebAssembly 二进制文件'
author: 'Alon Zakai'
avatars:
  - 'alon-zakai'
date: 2019-11-21
tags:
  - WebAssembly
  - 工具
description: 'Emscripten 现在支持独立的 Wasm 文件，无需依赖 JavaScript。'
tweet: '1197547645729988608'
---
Emscripten 一直以来主要专注于编译到 Web 和其他 JavaScript 环境（如 Node.js）。但是，随着 WebAssembly 开始在*不需要*JavaScript 的情况下被使用，出现了一些新的用例，因此我们一直在努力支持从 Emscripten 发出的[**独立 Wasm**](https://github.com/emscripten-core/emscripten/wiki/WebAssembly-Standalone) 文件，这些文件不依赖于 Emscripten 的 JS 运行时！本文会解释为什么这很有趣。

<!--truncate-->
## 在 Emscripten 中使用独立模式

首先，让我们看看这个新功能能做些什么！与[这篇文章](https://hacks.mozilla.org/2018/01/shrinking-webassembly-and-javascript-code-sizes-in-emscripten/)类似，我们从一个简单的 "hello world" 类型程序开始，它导出一个用于将两个数字相加的函数：

```c
// add.c
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
int add(int x, int y) {
  return x + y;
}
```

我们通常会用类似 `emcc -O3 add.c -o add.js` 的命令来构建它，这将生成 `add.js` 和 `add.wasm`。相反，我们让 `emcc` 只发出 Wasm 文件：

```
emcc -O3 add.c -o add.wasm
```

当 `emcc` 看到我们只需要 Wasm 文件时，它会使其 "独立" —— 尽可能独立运行的 Wasm 文件，无需 Emscripten 的任何 JavaScript 运行时代码。

反编译后，它非常简洁——仅有 87 字节！它包含显而易见的 `add` 函数

```lisp
(func $add (param $0 i32) (param $1 i32) (result i32)
 (i32.add
  (local.get $0)
  (local.get $1)
 )
)
```

以及另一个函数 `_start`，

```lisp
(func $_start
 (nop)
)
```

`_start` 是 [WASI](https://github.com/WebAssembly/WASI) 规范的一部分，并且 Emscripten 的独立模式会生成它，以便可以在 WASI 运行时中运行。（通常 `_start` 会执行全局初始化，但这里我们不需要任何初始化，所以它是空的。）

### 编写你自己的 JavaScript 加载器

像这样的独立 Wasm 文件的另一个优点是可以编写自定义 JavaScript 来加载和运行它，这可以根据你的用例非常简洁。例如，在 Node.js 中我们可以这样做：

```js
// load-add.js
const binary = require('fs').readFileSync('add.wasm');

WebAssembly.instantiate(binary).then(({ instance }) => {
  console.log(instance.exports.add(40, 2));
});
```

仅仅 4 行代码！运行后会按预期输出 `42`。请注意，虽然这个示例非常简单，但有些情况下你可能根本不需要太多 JavaScript，并且可能比 Emscripten 的默认 JavaScript 运行时做得更好（默认运行时支持各种环境和选项）。一个现实世界中的示例是在 [zeux 的 meshoptimizer](https://github.com/zeux/meshoptimizer/blob/bdc3006532dd29b03d83dc819e5fa7683815b88e/js/meshopt_decoder.js) 中——只用了 57 行代码，包括内存管理、增长等！

### 在 Wasm 运行时中运行

独立 Wasm 文件的另一个优点是可以在像 [wasmer](https://wasmer.io)、[wasmtime](https://github.com/bytecodealliance/wasmtime) 或 [WAVM](https://github.com/WAVM/WAVM) 这样的 Wasm 运行时中运行。例如，考虑以下 "hello world":

```cpp
// hello.cpp
#include <stdio.h>

int main() {
  printf("hello, world!\n");
  return 0;
}
```

我们可以在任何一个运行时中构建并运行它：

```bash
$ emcc hello.cpp -O3 -o hello.wasm
$ wasmer run hello.wasm
hello, world!
$ wasmtime hello.wasm
hello, world!
$ wavm run hello.wasm
hello, world!
```

Emscripten 尽可能多地使用 WASI API，因此像这样的程序最终会完全使用 WASI，并且可以运行在支持 WASI 的运行时中（稍后会讨论关于需要超出 WASI 的程序的说明）。

### 构建 Wasm 插件

除了 Web 和服务器外，Wasm 的一个激动人心的领域是**插件**。例如，一个图像编辑器可能有 Wasm 插件，可以对图像执行滤镜和其他操作。对于这种类型的用例，你需要一个独立的 Wasm 二进制，就像到目前为止的示例一样，但它还需要为嵌入式应用程序提供正确的 API。

插件有时与动态库相关，因为动态库是实现它们的一种方法。Emscripten通过 [SIDE_MODULE](https://github.com/emscripten-core/emscripten/wiki/Linking#general-dynamic-linking) 选项支持动态库，这已经是一种构建Wasm插件的方法。本文所述的新独立Wasm选项在多个方面是对该方法的改进：首先，动态库具有可重定位内存，如果您不需要它（如果加载后未将Wasm与其他Wasm链接，则不需要），这会增加开销。其次，独立输出也被设计为可以在Wasm运行时中运行，如前所述。

好，到目前为止一切顺利：Emscripten可以像以前一样生成JavaScript + WebAssembly，现在也可以只生成WebAssembly，这使您可以在没有JavaScript的地方运行它，比如Wasm运行时，或者您可以编写自己的自定义JavaScript加载代码等。现在让我们讨论背景和技术细节！

## WebAssembly的两个标准API

WebAssembly只能访问作为导入接收的API——核心Wasm规范没有具体的API细节。鉴于Wasm的当前发展方向，看起来将有三个主要类别的API供人们导入和使用：

- **Web API**：这是Wasm程序在Web上使用的，是现有的JavaScript也可以使用的标准化API。目前这些API是通过JS粘合代码间接调用，但未来通过 [接口类型](https://github.com/WebAssembly/interface-types/blob/master/proposals/interface-types/Explainer.md) 将直接调用它们。
- **WASI API**：WASI专注于在服务器上为Wasm标准化API。
- **其他API**：各种自定义嵌入将定义自己的应用程序特定API。例如，我们之前提到的图像编辑器的例子，该编辑器使用Wasm插件实现视觉效果的API。请注意，插件可能还可以访问“系统”API，如本地动态库，或者它可能被很好地沙盒化，没有任何导入（如果嵌入只调用其方法）。

WebAssembly处于有趣的位置，因为它拥有 [两个标准化的API集合](https://www.goodreads.com/quotes/589703-the-good-thing-about-standards-is-that-there-are-so)。这确实有意义，因为一个是针对Web，另一个是针对服务器，它们确实有不同的要求；出于类似原因，Node.js在Web上与JavaScript的API并不完全相同。

然而，除Web和服务器之外，还有Wasm插件。例如，插件可以在可能在Web上的应用程序内运行（就像 [JS插件](https://www.figma.com/blog/an-update-on-plugin-security/#a-technology-change)）或离线；此外，无论嵌入应用程序所在的环境是哪里，插件环境都既不是Web，也不是服务器环境。所以不立即清楚将使用哪个API集合——这可能取决于移植的代码、嵌入的Wasm运行时等。

## 尽可能统一

Emscripten希望在这个方面提供帮助的一个具体方式是尽可能使用WASI API，以避免 **不必要的** API差异。如前所述，在Web上Emscripten代码通过JavaScript间接访问Web API，因此如果JavaScript API像WASI一样，我们就可以消除不必要的API差异，并且同一个二进制也可以在服务器上运行。换句话说，如果Wasm想记录一些信息，它需要调用JS，如下所示：

```js
wasm   =>   function musl_writev(..) { .. console.log(..) .. }
```

`musl_writev` 是Linux系统调用接口的一个实现，[musl libc](https://www.musl-libc.org) 使用它将数据写入文件描述符，并最终调用 `console.log` 记录正确的数据。Wasm模块导入并调用该 `musl_writev`，它定义了JS与Wasm之间的ABI。该ABI是任意的（实际上Emscripten随着时间推移已优化了其ABI）。如果我们用匹配WASI的ABI替换它，我们可以得到以下内容：

```js
wasm   =>   function __wasi_fd_write(..) { .. console.log(..) .. }
```

这不是很大的变化，只需要对ABI进行一些重构，在JS环境中运行不会有太大影响。但是现在Wasm可以在没有JS的情况下运行，因为WASI运行时可以识别该WASI API！这就是之前提到的独立Wasm示例工作的方式，只需通过重构Emscripten以使用WASI API。

Emscripten使用WASI API的另一个优势是我们可以通过发现实际的问题来帮助WASI规范。例如，我们发现 [更改WASI“whence”常量](https://github.com/WebAssembly/WASI/pull/106) 会很有用，并且我们开始了一些围绕 [代码大小](https://github.com/WebAssembly/WASI/issues/109) 和 [POSIX兼容性](https://github.com/WebAssembly/WASI/issues/122) 的讨论。

Emscripten尽可能使用WASI也是有用的，因为它使用户可以使用一个SDK来定位Web、服务器和插件环境。Emscripten并不是唯一允许这样做的SDK，因为WASI SDK的输出可以通过 [WASI Web Polyfill](https://wasi.dev/polyfill/) 或Wasmer的 [wasmer-js](https://github.com/wasmerio/wasmer-js) 在Web上运行，但Emscripten的Web输出更紧凑，因此可以在不影响Web性能的情况下使用单个SDK。

说到这里，你可以通过一个命令从 Emscripten 中生成一个独立的 Wasm 文件，并可选择生成附带的 JS 文件：

```
emcc -O3 add.c -o add.js -s STANDALONE_WASM
```

这会生成 `add.js` 和 `add.wasm` 文件。Wasm 文件是独立的，就像之前我们只生成了一个 Wasm 文件时一样（我们指定了 `-o add.wasm` 时会自动设置 `STANDALONE_WASM` 标志），但现在还新增了一个可以加载并运行 Wasm 文件的 JS 文件。如果你不想自己编写 JS 文件，也可以在网络上运行它。

## 我们需要非独立的 Wasm 吗？

为什么 `STANDALONE_WASM` 标志会存在？理论上 Emscripten 可以总是设置 `STANDALONE_WASM`，这样会更简单。但独立的 Wasm 文件无法依赖 JS，这有一些弊端：

- 我们无法缩短 Wasm 的导入和导出名称，因为缩短名称需要 Wasm 和使用它的加载器双方都保持一致。
- 通常我们会在 JS 中创建 Wasm 的内存（Memory），这样 JS 在启动期间就可以开始使用内存，从而实现并行工作。而在独立的 Wasm 中，我们必须在 Wasm 内创建内存。
- 有些 API 在 JS 中更容易实现。例如，当 C 断言失败时调用的 [`__assert_fail`](https://github.com/emscripten-core/emscripten/pull/9558)，它通常是通过 [JS 实现的](https://github.com/emscripten-core/emscripten/blob/2b42a35f61f9a16600c78023391d8033740a019f/src/library.js#L1235)。实现只是简短的一行代码，甚至包括它调用的 JS 函数，总的代码大小也非常小。而在独立版本中，我们无法依赖 JS，因此我们使用了 [musl 的 `assert.c`](https://github.com/emscripten-core/emscripten/blob/b8896d18f2163dbf2fa173694eeac71f6c90b68c/system/lib/libc/musl/src/exit/assert.c#L4)。这种方式需要使用 `fprintf`，这会引入大量的 C `stdio` 支持库，包括一些使用间接调用的代码段，这让移除未使用的函数变得困难。总体来说，许多类似的小细节会导致代码总大小有差异。

如果你希望在网络和其他环境上运行，并且希望实现 100% 最优的代码大小和启动时间，你应该生成两个独立的版本，一个带有 `-s STANDALONE`，一个不带。这非常简单，只需要切换一个标志即可！

## 必须的 API 差异

我们看到 Emscripten 尽可能使用 WASI API 来避免 **不必要的** API 差异。那么是否存在一些 **必须的** 差异呢？遗憾的是，有些 WASI API 确实需要权衡。例如：

- WASI 不支持各种 POSIX 功能，例如 [用户/组/全体文件权限](https://github.com/WebAssembly/WASI/issues/122)，导致你无法完全实现一个（Linux）系统命令 `ls`（参见链接中的详细信息）。Emscripten 的现有文件系统层支持部分此类功能，因此如果我们为所有文件操作切换到 WASI API，那么我们将 [失去部分 POSIX 支持](https://github.com/emscripten-core/emscripten/issues/9479#issuecomment-542815711)。
- WASI 的 `path_open` [在代码大小上有成本](https://github.com/WebAssembly/WASI/issues/109)，因为它强制在 Wasm 中处理额外的权限，而这在网络环境中是多余的。
- WASI 不提供 [内存增长的通知 API](https://github.com/WebAssembly/WASI/issues/82)，因此 JS 运行时必须不断检查内存是否增长，如果增长则更新视图，在每次导入和导出时都如此。为避免这些开销，Emscripten 提供了一个通知 API：`emscripten_notify_memory_growth`，可以在 zeux 的 meshoptimizer 中看到 [单行代码实现](https://github.com/zeux/meshoptimizer/blob/bdc3006532dd29b03d83dc819e5fa7683815b88e/js/meshopt_decoder.js#L10)（我们之前提到过）。

未来 WASI 可能会增加更多的 POSIX 支持以及内存增长通知等功能 —— WASI 仍然处于高度实验性阶段，并预计会有显著变化。目前，为了避免对 Emscripten 的功能产生退化，如果你使用某些功能时，我们不会生成 100% 的 WASI 二进制文件。特别是，打开文件会使用 POSIX 方法而不是 WASI，这意味着如果你调用 `fopen`，生成的 Wasm 文件将不是 100% 的 WASI —— 然而，如果你只是使用 `printf`（它操作已经打开的 `stdout`），那么这将是 100% 的 WASI，就像我们在开头看到的 "hello world" 示例那样，Emscripten 的输出可以在 WASI 运行时中运行。

如果对用户有用，我们可以添加一个 `PURE_WASI` 选项，以牺牲代码大小换取严格的 WASI 合规性。但如果这并不急迫（并且到目前为止我们看到的大多数插件用例并不需要完整的文件 I/O），我们也许可以等待 WASI 改进到 Emscripten 能移除这些非 WASI API 的地步。这将是最好的结果，我们正为此努力工作，你可以在上述链接中看到相关进展。

然而，即使 WASI 确实有所改进，也无法避免前面提到的 Wasm 有两个标准化 API 的事实。未来，我预计 Emscripten 会通过接口类型直接调用 Web API，因为这样比调用一个类似 WASI 的 JS API 然后再调用 Web API（如前面的 `musl_writev` 示例中）更加紧凑。我们可以在这里采用某种 polyfill 或翻译层来提供帮助，但我们不希望不必要地使用它，因此我们需要为 Web 和 WASI 环境分别构建。（这有点令人遗憾；理论上，如果 WASI 是 Web API 的超集，就可以避免这种情况，但显然这会在服务器端带来妥协。）

## 当前状态

已经有许多功能可以正常使用！主要的限制包括：

- **WebAssembly 的限制**：由于 Wasm 的限制，像 C++ 异常、setjmp 和 pthreads 等各种功能依赖于 JavaScript，并且目前没有很好的非 JS 替代方案。（Emscripten 可能会开始支持一些功能 [通过 Asyncify](https://www.youtube.com/watch?v=qQOP6jqZqf8&list=PLqh1Mztq_-N2OnEXkdtF5yymcihwqG57y&index=2&t=0s)，或者我们可能只是等待 [原生 Wasm 功能](https://github.com/WebAssembly/exception-handling/blob/master/proposals/Exceptions.md) 在虚拟机中实现。）
- **WASI 的限制**：像 OpenGL 和 SDL 这样的库和 API 还没有与之对应的 WASI API。

你**还是可以**在 Emscripten 的独立模式下使用所有这些，但输出将包含对 JS 运行时支持代码的调用。因此，它不会是 100% 的 WASI（出于类似的原因，这些功能在 WASI SDK 中也不起作用）。这些 Wasm 文件无法在 WASI 运行时中运行，但你可以在 Web 上使用它们，也可以为它们编写自己的 JS 运行时。你还可以将它们用作插件；例如，一个游戏引擎可以有插件通过 OpenGL 进行渲染，开发者将以独立模式编译它们，然后在引擎的 Wasm 运行时中实现 OpenGL 的导入。独立 Wasm 模式在这里仍然有所帮助，因为它使输出尽可能独立化，这是 Emscripten 所能做到的。

你可能还会发现有些 API 确实有非 JS 替代方案，但我们尚未转换，因为工作仍在进行中。请[提交问题](https://github.com/emscripten-core/emscripten/issues)，同时我们一如既往地欢迎你的帮助！
