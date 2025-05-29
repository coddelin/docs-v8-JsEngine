---
title: '使用 V8 的基于采样的分析器'
description: '本文档解释如何使用 V8 的基于采样的分析器。'
---
V8 内置了基于采样的性能分析工具。性能分析默认处于关闭状态，但可以通过 `--prof` 命令行选项启用。采样器会记录 JavaScript 和 C/C++ 代码的堆栈信息。

## 构建

根据 [Building with GN](/docs/build-gn) 的说明构建 `d8` shell。

## 命令行

要开始性能分析，请使用 `--prof` 选项。当进行性能分析时，V8 会生成一个名为 `v8.log` 的文件，里面包含性能分析数据。

Windows:

```bash
build\Release\d8 --prof script.js
```

其他平台（如果要分析 `x64` 构建，请将 `ia32` 替换为 `x64`）：

```bash
out/ia32.release/d8 --prof script.js
```

## 处理生成的输出

日志文件处理通过在 d8 shell 中运行 JS 脚本完成。为了使其工作，您的 V8 源代码文件夹的根目录中需要有一个 `d8` 二进制文件（或者符号链接，或者在 Windows 上是 `d8.exe`），或者位于环境变量 `D8_PATH` 指定的路径中。注意：此二进制文件仅用于处理日志，而不是实际分析，因此版本等无关紧要。

**确保用于分析的 `d8` 未通过 `is_component_build` 构建！**

Windows:

```bash
tools\windows-tick-processor.bat v8.log
```

Linux:

```bash
tools/linux-tick-processor v8.log
```

macOS:

```bash
tools/mac-tick-processor v8.log
```

## `--prof` 的 Web UI

使用 `--preprocess` 预处理日志（以解析 C++ 符号等）。

```bash
$V8_PATH/tools/linux-tick-processor --preprocess > v8.json
```

在浏览器中打开 [`tools/profview/index.html`](https://v8.dev/tools/head/profview)，然后选择 `v8.json` 文件。

## 示例输出

```
统计性能分析结果来自 benchmarks\v8.log，（4192 次采样，0 未归类，0 被排除）。

 [共享库]:
   采样数  总计   非库   名称
      9    0.2%    0.0%  C:\WINDOWS\system32\ntdll.dll
      2    0.0%    0.0%  C:\WINDOWS\system32\kernel32.dll

 [JavaScript]:
   采样数  总计   非库   名称
    741   17.7%   17.7%  LazyCompile: am3 crypto.js:108
    113    2.7%    2.7%  LazyCompile: Scheduler.schedule richards.js:188
    103    2.5%    2.5%  LazyCompile: rewrite_nboyer earley-boyer.js:3604
    103    2.5%    2.5%  LazyCompile: TaskControlBlock.run richards.js:324
     96    2.3%    2.3%  Builtin: JSConstructCall
    ...

 [C++]:
   采样数  总计   非库   名称
     94    2.2%    2.2%  v8::internal::ScavengeVisitor::VisitPointers
     33    0.8%    0.8%  v8::internal::SweepSpace
     32    0.8%    0.8%  v8::internal::Heap::MigrateObject
     30    0.7%    0.7%  v8::internal::Heap::AllocateArgumentsObject
    ...


 [GC]:
   采样数  总计   非库   名称
    458   10.9%

 [自底向上（重）性能分析]:
  注意：百分比显示特定调用者在其父调用总量中的占比。
  占比不足 2.0% 的调用者不予显示。

   采样数 父级 所属名称
    741   17.7%  LazyCompile: am3 crypto.js:108
    449   60.6%    LazyCompile: montReduce crypto.js:583
    393   87.5%      LazyCompile: montSqrTo crypto.js:603
    212   53.9%        LazyCompile: bnpExp crypto.js:621
    212  100.0%          LazyCompile: bnModPowInt crypto.js:634
    212  100.0%            LazyCompile: RSADoPublic crypto.js:1521
    181   46.1%        LazyCompile: bnModPow crypto.js:1098
    181  100.0%          LazyCompile: RSADoPrivate crypto.js:1628
    ...
```

## 分析 Web 应用

如今，高度优化的虚拟机可使 Web 应用以非常快的速度运行。但不能仅依赖它们实现卓越性能：精心优化的算法或代价较低的功能通常可以在所有浏览器上实现多倍的速度提升。[Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools/)的 [CPU 分析器](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/reference)帮助您分析代码的瓶颈。但有时，您可能需要更深层次、更细粒度的分析，这就是 V8 内部分析工具派上用场的地方。

让我们使用该分析器检查 [Mandelbrot 浏览器演示](https://web.archive.org/web/20130313064141/http://ie.microsoft.com/testdrive/performance/mandelbrotexplorer/)，这是微软为配合 IE10 一起 [发布](https://blogs.msdn.microsoft.com/ie/2012/11/13/ie10-fast-fluid-perfect-for-touch-and-available-now-for-windows-7/) 的。在演示发布后，V8 修复了一个导致计算性能不必要降低的漏洞（因此导致了 Chrome 在演示博客文章中的表现不佳），并进一步优化了引擎，实现了一种比标准系统库提供的更快的 `exp()` 的近似值。随着这些更改，**在 Chrome 中演示的运行速度比之前测量的快了 8 倍**。

但是，如果你希望代码在所有浏览器上运行得更快呢？你应该首先**了解是什么使你的CPU保持繁忙**。使用以下命令行参数运行Chrome（Windows和Linux [Canary](https://tools.google.com/dlpage/chromesxs)），它会为你指定的URL输出分析器的tick信息（在`v8.log`文件中），在我们的示例中是一个没有使用Web Worker的本地版本Mandelbrot演示：

```bash
./chrome --js-flags=&apos;--prof&apos; --no-sandbox &apos;http://localhost:8080/&apos;
```

准备测试案例时，请确保加载后立即开始工作，并在计算完成后关闭Chrome（按Alt+F4），这样日志文件中只有你关心的ticks。此外，请注意使用这种技术尚不能正确分析Web Worker。

然后，使用随V8附带的`tick-processor`脚本（或新的实用Web版本）处理`v8.log`文件：

```bash
v8/tools/linux-tick-processor v8.log
```

以下是经过处理的输出的一个有趣片段，应该引起你的注意：

```
从null统计分析结果，（14306 ticks, 0未计入, 0排除）。
 [共享库]:
   ticks  总数  非库部分   名称
   6326   44.2%    0.0%  /lib/x86_64-linux-gnu/libm-2.15.so
   3258   22.8%    0.0%  /.../chrome/src/out/Release/lib/libv8.so
   1411    9.9%    0.0%  /lib/x86_64-linux-gnu/libpthread-2.15.so
     27    0.2%    0.0%  /.../chrome/src/out/Release/lib/libwebkit.so
```

顶部部分显示V8在一个操作系统相关的系统库中花费的时间比它自己的代码要多。让我们通过检查“自下而上”输出部分，了解是什么原因导致这一现象，其中你可以通过缩进内容阅读为“被以下调用”（行开头为`*`表明函数已被TurboFan优化）：

```
[自下而上（重负载）分析]:
  注意:百分比表示某个调用者在其父调用的总数中的占比。
  占比不到2.0%的调用者将不显示。

   ticks 父级   名称
   6326   44.2%  /lib/x86_64-linux-gnu/libm-2.15.so
   6325  100.0%    LazyCompile: *exp native math.js:91
   6314   99.8%      LazyCompile: *calculateMandelbrot http://localhost:8080/Demo.js:215
```

超过**44%的总时间花在执行系统库中的`exp()`函数**！加上调用系统库的一些开销，这意味着大约三分之二的总时间花在执行`Math.exp()`上。

如果查看JavaScript代码，你会发现`exp()`仅用于生成一个平滑的灰度调色板。有无数方法可以生成平滑的灰度调色板，但假设你真的非常喜欢指数梯度。在这里可以进行算法优化。

你会注意到`exp()`的参数范围为`-4 < x < 0`，因此我们可以安全地用范围内的[Taylor展开](https://en.wikipedia.org/wiki/Taylor_series)替换它，该方法能以仅一次乘法和几次除法生成相同的平滑渐变：

```
exp(x) ≈ 1 / ( 1 - x + x * x / 2) 对于 -4 < x < 0
```

以这种方式调整算法可以使性能比最新Canary提升额外30%，比基于系统库的Chrome Canary中的`Math.exp()`提升5倍。

![](/_img/docs/profile/mandelbrot.png)

这个例子展示了V8的内部分析器如何帮助你更深入地了解代码瓶颈，并表明更智能的算法可以进一步提高性能。

想了解更多关于代表现代复杂且需求苛刻的网络应用基准测试的信息，请阅读[如何测量真实世界性能](/blog/real-world-performance)。
