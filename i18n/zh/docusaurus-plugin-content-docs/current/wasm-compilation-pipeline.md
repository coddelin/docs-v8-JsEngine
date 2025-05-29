---
title: 'WebAssembly 编译管线'
description: '本文讲解了 V8 的 WebAssembly 编译器及其在何时编译 WebAssembly 代码。'
---

WebAssembly 是一种二进制格式，它允许您高效且安全地在网页上运行 JavaScript 以外的编程语言的代码。在本文中，我们深入探讨 V8 的 WebAssembly 编译管线，并解释我们如何利用不同的编译器来提供良好的性能。

## Liftoff

起初，V8 不会编译 WebAssembly 模块中的任何函数。相反，当函数第一次被调用时，函数会通过基线编译器 [Liftoff](/blog/liftoff) 懒惰编译。Liftoff 是一个[单遍编译器](https://en.wikipedia.org/wiki/One-pass_compiler)，这意味着它会遍历 WebAssembly 代码一次，并立即为每条 WebAssembly 指令生成机器代码。单遍编译器擅长快速生成代码，但只能应用一小部分优化。实际上，Liftoff 可以非常快速地编译 WebAssembly 代码，可达每秒几十兆字节。

一旦 Liftoff 编译完成，生成的机器代码会被注册到 WebAssembly 模块中，以便未来的函数调用可以直接使用已编译的代码。

## TurboFan

Liftoff 在非常短的时间内生成了相当快的机器代码。然而，由于它是独立地为每条 WebAssembly 指令生成代码，因此几乎没有优化空间，比如改进寄存器分配或常见的编译器优化（例如冗余加载消除、强度削减或函数内联）。

这就是为什么经常被执行的“热点”函数会被重新编译，并使用 [TurboFan](/docs/turbofan) 编译器优化。TurboFan 是 V8 中用于 WebAssembly 和 JavaScript 的优化编译器。TurboFan 是一个[多遍编译器](https://en.wikipedia.org/wiki/Multi-pass_compiler)，这意味着它在生成机器代码之前会构建多个内部表示。这些额外的内部表示允许进行优化和更好的寄存器分配，从而生成显著更快的代码。

V8 会监测 WebAssembly 函数的调用频率。一旦函数达到某个阈值，该函数会被认为是“热点”，并触发后台线程的重新编译。一旦编译完成，新代码会被注册到 WebAssembly 模块中，替换现有的 Liftoff 代码。之后对该函数的所有新调用将使用由 TurboFan 生成的新优化代码，而不是 Liftoff 代码。不过请注意，我们不进行堆栈内替换。这意味着如果 TurboFan 代码在函数调用后才可用，该函数调用会继续使用 Liftoff 代码进行执行。

## 代码缓存

如果 WebAssembly 模块是通过 `WebAssembly.compileStreaming` 编译的，那么由 TurboFan 生成的机器代码也会被缓存。当同一个 WebAssembly 模块从同一个 URL 再次获取时，可以直接使用缓存的代码，而无需额外的编译。有关代码缓存的更多信息，请参阅[另一篇博客文章](/blog/wasm-code-caching)。

当生成的 TurboFan 代码达到一定阈值时，代码缓存将会被触发。这意味着对于大型 WebAssembly 模块，TurboFan 代码会被增量地缓存，而对于小型 WebAssembly 模块，TurboFan 代码可能永远不会被缓存。Liftoff 代码不会被缓存，因为 Liftoff 编译速度几乎与从缓存加载代码一样快。

## 调试

如前所述，TurboFan 应用了许多优化，其中许多涉及重新排序代码、消除变量甚至跳过整个代码段。这意味着，如果您希望在特定指令处设置断点，程序实际应该在哪一处停止可能并不清楚。换句话说，TurboFan 生成的代码并不适合调试。因此，当通过打开开发者工具开始调试时，所有的 TurboFan 代码都会被替换为 Liftoff 代码（“降级”），因为每个 WebAssembly 指令都精确映射到一个机器代码段，并且所有的局部和全局变量都保持完整。

## 性能分析

为了使事情有点复杂，当在开发者工具中打开性能分析标签并点击“记录”按钮时，所有代码将再次“升级”（使用 TurboFan 重新编译）。“记录”按钮开始性能分析。分析 Liftoff 代码并不能代表实际情况，因为 Liftoff 代码仅在 TurboFan 尚未完成时使用，而且可能比 TurboFan 的输出要慢得多，而后者将在绝大多数时间内运行。

## 实验标志

为了进行实验，可以配置 V8 和 Chrome 仅使用 Liftoff 或仅使用 TurboFan 来编译 WebAssembly 代码。甚至可以尝试延迟编译，函数只有在首次被调用时才会被编译。以下标志启用这些实验模式：

- 仅 Liftoff：
    - 在 V8 中，设置 `--liftoff --no-wasm-tier-up` 标志。
    - 在 Chrome 中，禁用 WebAssembly 分层编译（`chrome://flags/#enable-webassembly-tiering`），并启用 WebAssembly 基线编译器（`chrome://flags/#enable-webassembly-baseline`）。

- 仅 TurboFan：
    - 在 V8 中，设置 `--no-liftoff --no-wasm-tier-up` 标志。
    - 在 Chrome 中，禁用 WebAssembly 分层编译（`chrome://flags/#enable-webassembly-tiering`），并禁用 WebAssembly 基线编译器（`chrome://flags/#enable-webassembly-baseline`）。

- 延迟编译：
    - 延迟编译是一种在函数首次调用时才进行编译的模式。类似于生产环境配置，函数首先使用 Liftoff 编译（阻塞执行）。在 Liftoff 编译完成后，函数在后台用 TurboFan 重新编译。
    - 在 V8 中，设置 `--wasm-lazy-compilation` 标志。
    - 在 Chrome 中，启用 WebAssembly 延迟编译（`chrome://flags/#enable-webassembly-lazy-compilation`）。

## 编译时间

有不同的方法可以测量 Liftoff 和 TurboFan 的编译时间。在 V8 的生产配置中，可以通过测量 `new WebAssembly.Module()` 完成所需的时间，或者测量 `WebAssembly.compile()` Promise 解析的时间来计算 Liftoff 的编译时间。要测量 TurboFan 的编译时间，也可以在仅使用 TurboFan 的配置中以相同方式进行。

![[Google Earth](https://earth.google.com/web) 中的 WebAssembly 编译跟踪。](/_img/wasm-compilation-pipeline/trace.svg)

编译的更多详细信息可以通过在 `chrome://tracing/` 中启用 `v8.wasm` 分类来测量。Liftoff 编译的时间从开始编译到 `wasm.BaselineFinished` 事件为止，TurboFan 编译结束于 `wasm.TopTierFinished` 事件。编译本身从 `WebAssembly.compileStreaming()` 的 `wasm.StartStreamingCompilation` 事件开始，或者从 `new WebAssembly.Module()` 的 `wasm.SyncCompile` 事件开始，或者从 `WebAssembly.compile()` 的 `wasm.AsyncCompile` 事件开始。Liftoff 编译以 `wasm.BaselineCompilation` 事件表示，TurboFan 编译以 `wasm.TopTierCompilation` 事件表示。上图显示了为 Google Earth 记录的跟踪数据，突出显示了关键事件。

通过 `v8.wasm.detailed` 分类可以获取更详细的跟踪数据，其中包括单个函数的编译时间等信息。
