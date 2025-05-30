---
title: "快速并行应用与WebAssembly SIMD"
author: "Deepti Gandluri（[@dptig](https://twitter.com/dptig)）, Thomas Lively（[@tlively52](https://twitter.com/tlively52)）, Ingvar Stepanyan（[@RReverser](https://twitter.com/RReverser)）"
date: 2020-01-30
updated: 2022-11-06
tags: 
  - WebAssembly
description: "为WebAssembly带来矢量运算"
tweet: "1222944308183085058"
---
SIMD代表 _单指令，多数据_。SIMD指令是一类特殊的指令，通过在多个数据元素上同时执行相同的操作来利用应用程序中的数据并行性。计算密集型应用程序如音频/视频编解码器、图像处理器，都是利用SIMD指令加速性能的例子。大多数现代架构都支持某些变体的SIMD指令。

<!--truncate-->
WebAssembly SIMD 提案定义了一个跨大多数现代架构可用的便携、高性能的SIMD运算子集。此提案的许多元素源自 [SIMD.js 提案](https://github.com/tc39/ecmascript_simd)，而该提案最初又源自 [Dart SIMD](https://www.researchgate.net/publication/261959129_A_SIMD_programming_model_for_dart_javascriptand_other_dynamically_typed_scripting_languages) 规范。SIMD.js 提案是TC39提出的一个API，用于引入新的类型和函数来执行SIMD计算，但后来被存档以支持在WebAssembly中更透明地支持SIMD操作。[WebAssembly SIMD 提案](https://github.com/WebAssembly/simd) 被引入，以使浏览器能够利用底层硬件的数据级并行性。

## WebAssembly SIMD 提案

WebAssembly SIMD 提案的高层次目标是以一种保证可移植性能的方式将矢量运算引入到WebAssembly规范中。

SIMD指令集很大，并且在各个架构之间各不相同。WebAssembly SIMD 提案中包含的操作集由在多种平台上支持良好的操作组成，并被证明具有高性能。为此，目前的提案仅限于标准化固定宽度的128位SIMD操作。

目前的提案引入了一个新的 `v128` 值类型，以及操作该类型的新操作。确定这些操作的标准如下:

- 这些操作应该在多个现代架构中得到良好支持。
- 在一个指令组中，在多个相关架构上性能提升应为正。
- 选定的操作集应该尽量减少性能断崖的情况。

该提案现已进入[最终阶段（第四阶段）](https://github.com/WebAssembly/simd/issues/480)，V8和工具链都已有可用的实现。

## 启用SIMD支持

### 特性检测

首先，请注意，SIMD是一项新特性，目前尚未在所有支持WebAssembly的浏览器中可用。您可以在[webassembly.org](https://webassembly.org/roadmap/)网站上找到支持新WebAssembly功能的浏览器列表。

为了确保所有用户都能加载您的应用程序，您需要构建两个不同的版本 - 一个启用了SIMD，另一个没有启用 - 并根据特性检测结果加载相应的版本。在运行时检测SIMD，您可以使用[`wasm-feature-detect`](https://github.com/GoogleChromeLabs/wasm-feature-detect)库，并像这样加载相应的模块:

```js
import { simd } from 'wasm-feature-detect';

(async () => {
  const hasSIMD = await simd();
  const module = await (
    hasSIMD
      ? import('./module-with-simd.js')
      : import('./module-without-simd.js')
  );
  // …然后像平常一样使用`module`
})();
```

要了解如何构建支持SIMD的代码，请查看[下文](#building-with-simd-support)部分。

### 浏览器中的SIMD支持

WebAssembly SIMD 支持从Chrome 91开始默认可用。请确保按照下文所述使用最新版本的工具链，以及最新版本的wasm-feature-detect，以检测支持最终版本规范的引擎。如果有问题，请[提交错误报告](https://crbug.com/v8)。

WebAssembly SIMD 还在Firefox 89及更高版本中得到支持。

## 构建支持SIMD的应用

### 构建目标为SIMD的C / C++代码

WebAssembly的SIMD支持依赖于使用启用WebAssembly LLVM后端的clang的最新构建版本。Emscripten也支持WebAssembly SIMD提案。使用[emsdk](https://emscripten.org/docs/getting_started/downloads.html)安装并激活`latest`发行版以使用SIMD功能。

```bash
./emsdk install latest
./emsdk activate latest
```

在将应用程序移植为使用SIMD时，有几种启用生成SIMD代码的方法。一旦安装了最新的上游emscripten版本，使用emscripten进行编译，并传递`-msimd128`标志以启用SIMD。

```bash
emcc -msimd128 -O3 foo.c -o foo.js
```

已经移植为使用WebAssembly的应用程序可以受益于SIMD，而无需进行源代码修改，这得益于LLVM的自动矢量化优化。

这些优化可以自动将运行在每次迭代中执行算术操作的循环转换为等效的循环，这些循环使用SIMD指令一次对多个输入执行相同的算术操作。当提供`-msimd128`标志时，LLVM的自动矢量化器在优化级别`-O2`和`-O3`默认启用。

例如，考虑以下函数，该函数将两个输入数组的元素相乘并将结果存储在输出数组中。

```cpp
void multiply_arrays(int* out, int* in_a, int* in_b, int size) {
  for (int i = 0; i < size; i++) {
    out[i] = in_a[i] * in_b[i];
  }
}
```

在未传递`-msimd128`标志的情况下，编译器会发出如下的WebAssembly循环代码：

```wasm
(loop
  (i32.store
    … 获取`out`的地址 …
    (i32.mul
      (i32.load … 获取`in_a`的地址 …)
      (i32.load … 获取`in_b`的地址 …)
  …
)
```

但在使用`-msimd128`标志时，自动矢量化器会将其转换为包含以下循环的代码：

```wasm
(loop
  (v128.store align=4
    … 获取`out`的地址 …
    (i32x4.mul
       (v128.load align=4 … 获取`in_a`的地址 …)
       (v128.load align=4 … 获取`in_b`的地址 …)
    …
  )
)
```

循环体具有相同的结构，但在循环体内使用SIMD指令一次加载、相乘和存储四个元素。

为了对编译器生成的SIMD指令进行更细粒度的控制，可以包含[`wasm_simd128.h`头文件](https://github.com/llvm/llvm-project/blob/master/clang/lib/Headers/wasm_simd128.h)，该文件定义了一组内置函数。内置函数是特殊函数，当被调用时，编译器会将其转换为相应的WebAssembly SIMD指令，除非可以进行进一步优化。

例如，以下是使用SIMD内置函数手动重写的上述函数。

```cpp
#include <wasm_simd128.h>

void multiply_arrays(int* out, int* in_a, int* in_b, int size) {
  for (int i = 0; i < size; i += 4) {
    v128_t a = wasm_v128_load(&in_a[i]);
    v128_t b = wasm_v128_load(&in_b[i]);
    v128_t prod = wasm_i32x4_mul(a, b);
    wasm_v128_store(&out[i], prod);
  }
}
```

该手动重写的代码假定输入和输出数组是对齐的并且没有别名，并且size是四的倍数。自动矢量化器无法做出这些假设，因此必须生成额外的代码来处理这些假设不成立的情况，因此手写的SIMD代码通常比自动矢量化的SIMD代码更小。

### 交叉编译现有C / C++项目

许多现有项目在针对其他平台时已经支持SIMD，特别是x86 / x86-64平台上的[SSE](https://en.wikipedia.org/wiki/Streaming_SIMD_Extensions)和[AVX](https://en.wikipedia.org/wiki/Advanced_Vector_Extensions)指令，以及ARM平台上的[NEON](https://en.wikipedia.org/wiki/ARM_architecture#Advanced_SIMD_(Neon))指令。这些通常有两种实现方式。

第一种是通过汇编文件完成SIMD操作，并在构建过程中与C / C++链接在一起。汇编语法和指令高度依赖平台且不可移植，因此，为了使用SIMD，这样的项目需要添加WebAssembly作为额外支持的目标，并使用[WebAssembly文本格式](https://webassembly.github.io/spec/core/text/index.html)或上面描述的内置函数重新实现相关功能。

另一种常见方法是直接从C / C++代码中使用SSE / SSE2 / AVX / NEON的内置函数，Emscripten可以提供帮助。Emscripten[提供了兼容头文件和仿真层](https://emscripten.org/docs/porting/simd.html)用于所有这些指令集，并通过仿真层将它们直接编译为Wasm内置指令（如果可能）或标量化代码（否则）。

要交叉编译这样的项目，首先通过项目特定的配置标志启用SIMD，例如`./configure --enable-simd`，这样它会将`-msse`、`-msse2`、`-mavx`或`-mfpu=neon`传递给编译器并调用相应的内置函数。然后，另外传递`-msimd128`以启用WebAssembly SIMD，可以通过使用`CFLAGS=-msimd128 make …` / `CXXFLAGS="-msimd128 make …`或者直接修改构建配置来指定Wasm目标。

### 构建Rust以面向SIMD

在将Rust代码编译为面向WebAssembly SIMD时，需要像上面在Emscripten中一样启用`simd128`的LLVM特性。

如果可以通过环境变量`RUSTFLAGS`直接控制`rustc`标志，请传递`-C target-feature=+simd128`：

```bash
rustc … -C target-feature=+simd128 -o out.wasm
```

或者

```bash
RUSTFLAGS="-C target-feature=+simd128" cargo build
```

与 Clang / Emscripten 中一样，当启用 `simd128` 特性时，LLVM 的自动向量化器会在优化后的代码中默认启用。

例如，上述 `multiply_arrays` 示例的 Rust 等价代码

```rust
pub fn multiply_arrays(out: &mut [i32], in_a: &[i32], in_b: &[i32]) {
  in_a.iter()
    .zip(in_b)
    .zip(out)
    .for_each(|((a, b), dst)| {
        *dst = a * b;
    });
}
```

会为输入数据中对齐的部分生成类似的自动向量化代码。

为了手动控制 SIMD 操作，可以使用 nightly 工具链，启用 Rust 特性 `wasm_simd`，并直接调用 [`std::arch::wasm32`](https://doc.rust-lang.org/stable/core/arch/wasm32/index.html#simd) 命名空间中的内建函数：

```rust
#![feature(wasm_simd)]

use std::arch::wasm32::*;

pub unsafe fn multiply_arrays(out: &mut [i32], in_a: &[i32], in_b: &[i32]) {
  in_a.chunks(4)
    .zip(in_b.chunks(4))
    .zip(out.chunks_mut(4))
    .for_each(|((a, b), dst)| {
      let a = v128_load(a.as_ptr() as *const v128);
      let b = v128_load(b.as_ptr() as *const v128);
      let prod = i32x4_mul(a, b);
      v128_store(dst.as_mut_ptr() as *mut v128, prod);
    });
}
```

另外，也可以使用一个类似 [`packed_simd`](https://crates.io/crates/packed_simd_2) 的辅助 crate，其对各种平台上的 SIMD 实现进行了抽象封装。

## 吸引人的使用案例

WebAssembly SIMD 提案旨在加速高计算量的应用，例如音频/视频编解码器、图像处理应用和加密应用等。目前，WebAssembly SIMD 在一些广泛使用的开源项目中已得到实验性支持，如 [Halide](https://github.com/halide/Halide/blob/master/README_webassembly.md)、[OpenCV.js](https://docs.opencv.org/3.4/d5/d10/tutorial_js_root.html) 和 [XNNPACK](https://github.com/google/XNNPACK)。

一些有趣的演示来自 Google Research 团队的 [MediaPipe 项目](https://github.com/google/mediapipe)。

根据其描述，MediaPipe 是一个用于构建多模态（如视频、音频或任意时间序列数据）应用的机器学习管道框架，并且它也有 [Web 版本](https://developers.googleblog.com/2020/01/mediapipe-on-web.html)！

其中一个最具视觉吸引力的演示，是一个仅依赖 CPU 的（非 GPU）手部追踪系统构建。当 [未启用 SIMD](https://storage.googleapis.com/aim-bucket/users/tmullen/demos_10_2019_cdc/rebuild_04_2021/mediapipe_handtracking/gl_graph_demo.html) 时，在现代笔记本电脑上只能获得大约 14-15 FPS（帧率）；而当 [在 Chrome Canary 中启用 SIMD](https://storage.googleapis.com/aim-bucket/users/tmullen/demos_10_2019_cdc/rebuild_04_2021/mediapipe_handtracking_simd/gl_graph_demo.html) 时，可以获得更加流畅的体验，达到 38-40 FPS。

<figure>
  <video autoplay muted playsinline loop width="600" height="216" src="/_img/simd/hand.mp4"></video>
</figure>

另一个利用 SIMD 提供流畅体验的有趣演示系列来自 OpenCV - 一个流行的计算机视觉库，它也可以编译为 WebAssembly。它们可以通过此 [链接](https://bit.ly/opencv-camera-demos) 查看，也可以观看下面的预录版本：

<figure>
  <video autoplay muted playsinline loop width="256" height="512" src="/_img/simd/credit-card.mp4"></video>
  <figcaption>读取信用卡</figcaption>
</figure>

<figure>
  <video autoplay muted playsinline loop width="600" height="646" src="/_img/simd/invisibility-cloak.mp4"></video>
  <figcaption>隐形斗篷</figcaption>
</figure>

<figure>
  <video autoplay muted playsinline loop width="600" height="658" src="/_img/simd/emotion-recognizer.mp4"></video>
  <figcaption>表情替换</figcaption>
</figure>

## 未来工作

当前的固定宽度 SIMD 提案处于 [阶段 4](https://github.com/WebAssembly/meetings/blob/master/process/phases.md#3-implementation-phase-community--working-group)，因此被认为是完整的。

一些未来扩展 SIMD 的探索已开始，比如 [Relaxed SIMD](https://github.com/WebAssembly/relaxed-simd) 和 [Flexible Vectors](https://github.com/WebAssembly/flexible-vectors) 提案，目前处于阶段 1。
