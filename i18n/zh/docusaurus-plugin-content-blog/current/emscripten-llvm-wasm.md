---
title: "Emscripten 和 LLVM WebAssembly 后端"
author: "Alon Zakai"
avatars:
  - "alon-zakai"
date: 2019-07-01 16:45:00
tags:
  - WebAssembly
  - 工具
description: "Emscripten 正在切换到 LLVM WebAssembly 后端，从而显著加快链接时间，并带来许多其他益处。"
tweet: "1145704863377981445"
---
通常，WebAssembly 是从源语言编译而来的，这意味着开发者需要使用工具才能应用它。因此，V8 团队致力于相关的开源项目，例如 [LLVM](http://llvm.org/)、[Emscripten](https://emscripten.org/)、[Binaryen](https://github.com/WebAssembly/binaryen/) 和 [WABT](https://github.com/WebAssembly/wabt)。本文介绍了我们在 Emscripten 和 LLVM 上的一些工作，这些工作将很快允许 Emscripten 默认切换到 [LLVM WebAssembly 后端](https://github.com/llvm/llvm-project/tree/main/llvm/lib/Target/WebAssembly) —— 请测试并报告任何问题！

<!--truncate-->
LLVM WebAssembly 后端在 Emscripten 中已经作为一种选项存在了一段时间，因为我们在后端与其在 Emscripten 中的集成工作是并行进行的，并与开源 WebAssembly 工具社区的其他人进行了合作。目前，它已达到能够在大多数指标上超越旧的 “[fastcomp](https://github.com/emscripten-core/emscripten-fastcomp/)” 后端的阶段，因此我们希望将其设为默认选项。在此之前发布这一公告，是为了尽可能多地进行测试。

这次升级的重要原因包括以下几点：

- **链接速度更快**：LLVM WebAssembly 后端与 [`wasm-ld`](https://lld.llvm.org/WebAssembly.html) 一起完全支持使用 WebAssembly 对象文件进行增量编译。Fastcomp 使用的是位代码文件中的 LLVM IR，这意味着链接时所有 IR 都将由 LLVM 编译。这是链接时间缓慢的主要原因。而使用 WebAssembly 对象文件时，`.o` 文件中已包含经过编译的 WebAssembly（以可链接的形式，就像原生链接一样）。因此，链接步骤可以比 Fastcomp 快得多 —— 我们下面将看到一个实际案例的 7 倍加速！
- **更快更小的代码**：我们在 LLVM WebAssembly 后端以及 Emscripten 后运行的 Binaryen 优化器上投入了大量工作。结果是 LLVM WebAssembly 后端路径在速度和体积方面现在都超过了 Fastcomp。
- **支持所有 LLVM IR**：Fastcomp 可以处理由 `clang` 生成的 LLVM IR，但由于其架构，它经常在其他来源上失败，特别是在将 IR “合法化”为 Fastcomp 能处理的类型时。而 LLVM WebAssembly 后端则使用通用的 LLVM 后端基础架构，因此可以应对所有情况。
- **新的 WebAssembly 功能**：Fastcomp 在运行 `asm2wasm` 之前会编译为 asm.js，这意味着很难处理诸如尾调用、异常、SIMD 等新的 WebAssembly 功能。WebAssembly 后端是处理这些功能的自然场所，事实上我们也正在处理所有刚提到的功能！
- **更快的上游更新**：与上一个点相关，使用上游 WebAssembly 后端意味着我们始终可以使用最新的 LLVM 上游版本，这意味着我们可以立即获取 `clang` 中的新 C++ 语言功能、新的 LLVM IR 优化等。

## 测试

若要测试 WebAssembly 后端，只需使用 [最新的 `emsdk`](https://github.com/emscripten-core/emsdk) 并执行

```
emsdk install latest-upstream
emsdk activate latest-upstream
```

这里的“上游”指的是 LLVM WebAssembly 后端位于上游 LLVM，与 Fastcomp 不同。事实上，由于它在上游，你不需要使用 `emsdk`，如果你自己构建了普通的 LLVM+`clang`！（要将这样的构建用于 Emscripten，只需在你的 `.emscripten` 文件中添加路径即可。）

目前使用 `emsdk [install|activate] latest` 仍然使用 Fastcomp。此外还有“latest-fastcomp”，效果相同。等我们切换默认后端时，“latest” 将与“latest-upstream”相同，而届时“latest-fastcomp”将是获取 Fastcomp 的唯一方式。Fastcomp 作为一个选项仍然存在，只要它还有用；有关这方面的更多说明，请见文末。

## 历史

这将是Emscripten的**第三个**后端，也是**第二次**迁移。第一个后端是用JavaScript编写的，它以文本形式解析LLVM IR。这在2010年进行实验时非常有用，但也有明显的缺点，包括LLVM的文本格式会发生变化以及编译速度不如我们所希望的那么快。2013年，一个新的后端被写入LLVM的一个分支中，昵称为“fastcomp”。它的设计目的是生成[asm.js](https://en.wikipedia.org/wiki/Asm.js)，早期的JS后端曾被修改以支持asm.js（但效果不佳）。因此，代码质量和编译时间得到了很大的改进。

这对于Emscripten来说也是一个相对较小的变化。尽管Emscripten是一个编译器，原始后端和fastcomp在项目中一直占比较小的部分——更多的代码集中在系统库、工具链集成、语言绑定等方面。因此，虽然切换编译器后端是一个巨大的变化，但它仅影响整个项目的一部分。

## 基准测试

### 代码体积

![代码体积测量（值越低越好）](/_img/emscripten-llvm-wasm/size.svg)

（这里的所有体积都以fastcomp进行归一化。）如你所见，WebAssembly后端的体积几乎总是更小！这种差异在左侧更小的微基准测试中更加明显（名称为小写），此时系统库的新改进更为重要。但即使在右侧的大多数宏基准测试中（名称为大写的），即真实世界的代码库中，也存在代码体积的减少。宏基准测试中唯一的回归是LZMA，其中更新的LLVM做出了一种不太幸运的内联决策。

总体而言，宏基准测试的体积平均缩小了**3.7%**。对于编译器升级来说，这已经很不错了！我们在测试套件之外的真实代码库中也看到了类似的结果，例如，[BananaBread](https://github.com/kripken/BananaBread/)，一个将[Cube 2游戏引擎](http://cubeengine.com/)移植到网络上的项目，体积减少了超过**6%**，[Doom 3](http://www.continuation-labs.com/projects/d3wasm/)则减少了**15%**！

这些体积改进（以及我们稍后会讨论的速度改进）归因于以下几个因素：

- LLVM的后端代码生成更智能，可以执行像[GVN](https://en.wikipedia.org/wiki/Value_numbering)这样的简单后端（如fastcomp）无法做到的事情。
- 更新版本的LLVM具有更好的IR优化。
- 我们在调试Binaryen优化器以适配WebAssembly后端的输出方面做了大量工作，如前所述。

### 速度

![速度测量（值越低越好）](/_img/emscripten-llvm-wasm/speed.svg)

（测量基于V8。）在微基准测试中，速度表现不一——这并不令人意外，因为大多数基准测试都由单个函数甚至循环主导，因此Emscripten生成代码的任何更改都可能导致VM进行幸运或不幸运的优化选择。总体而言，速度保持不变、提高或退化的微基准测试数量大致相等。观察更真实的宏基准测试，虽然LZMA再次是一个例外，仍然是因为前面提到的不幸内联决策，但其他所有宏基准测试的性能都有所提升！

宏基准测试的整体平均变化是**3.2%**的加速。

### 构建时间

![BananaBread的编译和链接时间测量（值越低越好）](/_img/emscripten-llvm-wasm/build.svg)

构建时间的变化因项目而异，但这里是一些来自BananaBread的示例数据，这是一个完整但紧凑的游戏引擎，包含112个文件和95,287行代码。左侧是编译步骤的构建时间，即将源文件编译为目标文件，这里使用项目的默认`-O3`（所有时间都以fastcomp归一化）。如你所见，使用WebAssembly后端时，编译阶段会稍微长一点，这可以理解，因为在此阶段我们完成了更多的工作——而不仅仅像fastcomp那样将源文件快速编译为字节码，我们还将字节码编译为WebAssembly。

看右侧，这是链接阶段的时间（也以fastcomp归一化），即生成最终可执行文件，这里选用`-O0`，适合增量构建（对于完全优化的构建，你可能会使用`-O3`，见下文）。事实证明，编译阶段的轻微增长是值得的，因为链接阶段**快了超过7倍**！这是增量编译的真正优势：链接阶段的大部分只是一种快速的目标文件拼接。如果你仅更改一个源文件并重新构建，那么你几乎只需要快速的链接阶段，因此在实际开发中，你可以一直看到这种速度提升。

如上所述，构建时间的变化因项目而异。在比BananaBread更小的项目中，链接时间速度提升可能会更小，而在更大的项目中可能会更大。另一个因素是优化：如上所述，测试是在使用`-O0`标志下链接的，但对于发布版构建可能需要使用`-O3`，在这种情况下Emscripten将对最终的WebAssembly调用Binaryen优化器，运行[meta-dce](https://hacks.mozilla.org/2018/01/shrinking-webassembly-and-javascript-code-sizes-in-emscripten/)以及其他有助于代码大小和速度的功能。当然，这会额外耗费时间，但对于发布版构建是值得的——在BananaBread中，它将WebAssembly从2.65MB缩小到1.84MB，改进超过**30%**——但对于快速增量构建，你可以使用`-O0`跳过这些操作。

## 已知问题

虽然LLVM WebAssembly后端通常在代码大小和速度上都有优势，但我们也发现了一些例外情况：

- [Fasta](https://github.com/emscripten-core/emscripten/blob/incoming/tests/fasta.cpp)在没有[非捕获浮点转整数转换](https://github.com/WebAssembly/nontrapping-float-to-int-conversions)的情况下会出现退化，该功能是一个新的WebAssembly特性，未包含在WebAssembly MVP中。根本原因在于，在MVP中，如果浮点数转换为整数超出了有效整数范围，则会产生异常。其理由是，在C语言中这种行为本身是未定义的行为，并且容易由虚拟机实现。然而，这种方式与LLVM编译浮点数到整数的方式不太匹配，结果是需要额外的保护措施，增加了代码大小和开销。较新的非捕获操作解决了这个问题，但可能尚未在所有浏览器中支持。你可以通过编译源文件时使用`-mnontrapping-fptoint`来使用这些新操作。
- LLVM WebAssembly后端不仅是一个与fastcomp不同的后端，还使用了一个较新的LLVM。较新的LLVM可能会做出不同的内联决策，这些决策（在没有配置文件引导优化的情况下）基于启发式方法可能会有利或不利。我们之前提到的一个具体例子是在LZMA基准测试中，较新的LLVM将一个函数内联了5次，从而导致负面影响。如果你在自己的项目中遇到类似问题，可以选择性地使用`-Os`构建某些源文件以专注于代码大小，或使用`__attribute__((noinline))`等方法。

可能还有更多我们尚未意识到需要优化的问题——如果你发现了任何问题，请告诉我们！

## 其他变化

有少量Emscripten功能与fastcomp和/或asm.js相关联，这意味着它们无法直接在WebAssembly后端中使用。因此我们正在开发替代方案。

### JavaScript输出

在某些情况下，非WebAssembly输出仍然重要——尽管所有主流浏览器已经支持WebAssembly有一段时间了，但仍然有一部分旧设备、旧手机等不支持WebAssembly。此外，随着WebAssembly增加新功能，这种问题将继续存在。编译到JS是一种保证兼容所有设备的方法，即使构建不会像WebAssembly那样小或快。使用fastcomp时，我们直接使用asm.js输出，但使用WebAssembly后端显然需要其他方法。我们正在使用Binaryen的[`wasm2js`](https://github.com/WebAssembly/binaryen#wasm2js)工具来实现该目的，顾名思义，它将WebAssembly编译为JS。

这或许值得写一个完整的博客文章，但简而言之，一个关键的设计决策是没有必要再支持asm.js。asm.js可以运行得比普通JS快得多，但事实证明几乎所有支持asm.js AOT优化的浏览器都支持WebAssembly（实际上，Chrome通过将asm.js内部转换为WebAssembly进行优化！）。因此，当我们谈到JS回退选项时，也许不需要使用asm.js；实际上它更简单，使我们能够支持更多WebAssembly功能，并且显著减小JS的大小！因此，`wasm2js`并不以asm.js为目标。

然而，这种设计的一个副作用是，如果你在支持asm.js AOT优化的现代浏览器中测试fastcomp的asm.js构建与WebAssembly后端的JS构建相比，asm.js可能会快得多——这可能是你自己的浏览器的情况，但不是实际需要非WebAssembly选项的浏览器的情况！要进行适当的比较，你应该使用一个不支持asm.js优化的浏览器或禁用这些优化。如果`wasm2js`输出仍然较慢，请告诉我们！

`wasm2js`缺少一些使用较少的功能，例如动态链接和线程，但大多数代码应该可以正常工作，并且已经经过仔细模糊测试。要测试JS输出，只需使用`-s WASM=0`禁用WebAssembly进行构建。`emcc`会为你运行`wasm2js`，如果这是一个优化构建，它还会运行各种有用的优化。

### 其他可能注意到的事情

- [Asyncify](https://github.com/emscripten-core/emscripten/wiki/Asyncify)和[Emterpreter](https://github.com/emscripten-core/emscripten/wiki/Emterpreter)选项仅在fastcomp中工作。替代方案正在[开发](https://github.com/WebAssembly/binaryen/pull/2172)[中](https://github.com/WebAssembly/binaryen/pull/2173)[](https://github.com/emscripten-core/emscripten/pull/8808)[](https://github.com/emscripten-core/emscripten/issues/8561)。我们预计它最终会比之前的选项有所改进。
- 需要重新构建预编译库：如果您有使用fastcomp构建的某些`library.bc`，那么需要使用更新的Emscripten从源代码重新构建。这在过去fastcomp升级LLVM到一个改变了位代码格式的新版本时也是如此，而现在这种更改（从位代码改为WebAssembly目标文件）带来了相同的影响。

## 结论

我们目前的主要目标是修复与此更改相关的任何错误。请进行测试并提交问题！

在一切稳定后，我们将把默认编译器后端切换为上游的WebAssembly后端。如前所述，fastcomp将仍是一个可选项。

我们希望最终完全去除fastcomp。这样可以减轻大量维护工作，使我们能够更加专注于WebAssembly后端的新功能开发，加快Emscripten的整体改进，以及其他许多好处。请告诉我们在您的代码库上的测试结果，以便我们开始为移除fastcomp规划时间表。

### 感谢

感谢所有参与LLVM WebAssembly后端、`wasm-ld`、Binaryen、Emscripten以及本文提到的其他内容开发的人！这些了不起的人的部分名单包括：aardappel、aheejin、alexcrichton、dschuff、jfbastien、jgravelle、nwilson、sbc100、sunfish、tlively、yurydelendik。
