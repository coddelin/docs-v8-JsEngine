---
title: "Oilpan中的指针压缩"
author: "Anton Bikineev 和 Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz))，行走的反汇编程序"
avatars: 
  - anton-bikineev
  - michael-lippautz
date: 2022-11-28
tags: 
  - 内部构造
  - 内存
  - cppgc
description: "Oilpan中的指针压缩允许压缩C++指针，并最多减少33%的堆大小。"
tweet: "1597274125780893697"
---

> 当我编译一个使用少于4GB RAM的程序时，却用64位指针，这绝对是愚蠢的。当这样的指针值出现在结构中时，既浪费了一半的内存，也实质上丢掉了一半的缓存。
>
> – [Donald Knuth (2008)](https://cs.stanford.edu/~knuth/news08.html)

<!--truncate-->

几乎从未有过比这更真实的话语。我们也看到CPU厂商实际上并未真正发运[64位CPU](https://en.wikipedia.org/wiki/64-bit_computing#Limits_of_processors)，而Android设备厂商则选择了仅提供[39位的地址空间](https://www.kernel.org/doc/Documentation/arm64/memory.txt)，以加速内核中的页面表遍历。V8在Chrome中运行时还将[站点隔离到不同的进程中](https://www.chromium.org/Home/chromium-security/site-isolation/)，进一步限制了单个标签页实际需要的地址空间需求。这些都并非完全崭新的话题，因此我们在2020年推出了[V8的指针压缩](https://v8.dev/blog/pointer-compression)，并在Web的内存利用方面看到了显著改善。使用[Oilpan库](https://v8.dev/blog/oilpan-library)让我们能够控制另一个Web构建模块。[Oilpan](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/cppgc/README.md)是一个用于C++的基于追踪的垃圾收集器，它用于支持Blink中的文档对象模型，因此是优化内存的一个有趣目标。

## 背景

指针压缩是一种在64位平台上减少指针大小的机制。Oilpan中的指针封装在一个称为[`Member`](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/cppgc/member.h)的智能指针中。在未压缩堆布局中，`Member`引用直接指向堆对象，即每个引用使用了8字节的内存。在这种情况下，堆可能散布于整个地址空间，因为每个指针都包含了引用对象的所有相关信息。

![未压缩堆布局](/_img/oilpan-pointer-compression/uncompressed-layout.svg)

在压缩堆布局中，`Member`引用仅仅是堆笼中的偏移量，堆笼是一个连续的内存区域。通过指向堆笼开始位置的基指针（base）和成员引用的结合构成了一个完整指针，这类似于[分段寻址](https://en.wikipedia.org/wiki/Memory_segmentation#Segmentation_without_paging)的工作方式。堆笼的大小受偏移量可用的位数限制。例如，一个4GB大小的堆笼需要32位偏移量。

![压缩堆布局](/_img/oilpan-pointer-compression/compressed-layout.svg)

令人欣慰的是，64位平台上的Oilpan堆已经包含在这样一个4GB堆笼中，以便通过将任意有效堆指针向下对齐到最近的4GB边界来引用垃圾收集器元数据。

Oilpan还支持在同一进程中创建多个堆，例如，支持Blink中具有自己C++堆的Web工作线程。这种设置带来的问题是如何映射多个堆到可能存在的多个堆笼。由于堆绑定到Blink中的原生线程，这里使用的解决方案是通过线程本地基指针引用堆笼。根据V8及其嵌入器的编译方式，线程本地存储（TLS）模型可以进行限制，以加速从内存加载基指针的速度。然而，为支持Android，最终需要使用最通用的TLS模式，因为在这个平台上渲染器（以及V8）是通过`dlopen`加载的。这些限制使得从性能角度来看，TLS的使用变得不可行[^1]。为了提供最佳性能，Oilpan和V8类似，当使用指针压缩时会将所有堆分配到单个堆笼中。虽然这限制了总体可用内存，但我们认为这是可以接受的，因为指针压缩本身已经旨在减少内存。如果单个4GB堆笼证明过于限制，当前的压缩方案允许将堆笼大小扩展到16GB，而不会影响性能。

## Oilpan中的实现

### 要求

到目前为止，我们讨论了一种简单的编码方案，其中完整的指针通过将基址与存储在成员指针中的偏移量相加来形成。不幸的是，实际实现的方案并不是那么简单，因为Oilpan要求Member可以被赋值为以下之一：

1. 指向对象的有效堆指针；
2. C++ `nullptr`（或类似的）；
3. 需在编译时已知的哨兵值。例如，该哨兵值可用于在哈希表中标记被删除的值，同时支持`nullptr`作为条目。

`nullptr` 和哨兵值相关的棘手部分在于调用方无法通过显式类型来捕获这些：

```cpp
void* ptr = member.get();
if (ptr == nullptr) { /* ... * }
```

由于没有显式类型来存储可能被压缩的`nullptr`值，因此需要实际解压缩才能与常量进行比较。

考虑到这种用法，我们寻找了一种可以透明处理情况1到3的方案。由于压缩和解压缩序列会在任何使用Member的地方内联，以下属性也是期望的：

- 快速和紧凑的指令序列以最大程度减少指令缓存未命中。
- 无分支的指令序列以避免耗尽分支预测器。

由于预期读操作远多于写操作，我们允许一种非对称方案，在这种方案中优先考虑快速解压缩。

### 压缩和解压缩

为简洁起见，此描述仅涵盖所用的最终压缩方案。有关我们如何得出此方案以及考虑的替代方案的更多信息，请参阅我们的[设计文档](https://docs.google.com/document/d/1neGN8Jq-1JLrWK3cvwRIfrSjLgE0Srjv-uq7Ze38Iao)。

如今实现的方案的主要思想是通过利用堆笼的对齐性，将常规堆指针与`nullptr`和哨兵值分开。本质上，堆笼以这样的对齐方式分配，使得高半字的最低有效位始终被设置。我们分别用U<sub>31</sub>...U<sub>0</sub>和L<sub>31</sub>...L<sub>0</sub>表示高半（每部分32位）。

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | 高半字                                  | 低半字                                  |
| ------------ | ---------------------------------------: | -----------------------------------------: |
| 堆指针         | <tt>U<sub>31</sub>...U<sub>1</sub>1</tt> | <tt>L<sub>31</sub>...L<sub>3</sub>000</tt> |
| `nullptr`    | <tt>0...0</tt>                           | <tt>0...000</tt>                           |
| 哨兵值         | <tt>0...0</tt>                           | <tt>0...010</tt>                           |
<!-- markdownlint-enable no-inline-html -->
:::

压缩通过简单地右移一位并截断值的高半部分来生成压缩值。通过这种方式，对齐位（现在成为压缩值的最高有效位）表示有效的堆指针。

:::table-wrapper
| C++                                             | x64 汇编    |
| :---------------------------------------------- | :---------- |
| ```cpp                                          | ```asm      \
| uint32_t Compress(void* ptr) \{                  | mov rax, rdi  \
|   return ((uintptr_t)ptr) >> 1;                 | shr rax       \
| \}                                               | ```           \
| ```                                             |               |
:::

压缩值的编码如下：

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | 压缩值                                 |
| ------------ | -------------------------------------: |
| 堆指针         | <tt>1L<sub>31</sub>...L<sub>2</sub>00</tt> |
| `nullptr`    | <tt>0...00</tt>                            |
| 哨兵值         | <tt>0...01</tt>                            |
<!-- markdownlint-enable no-inline-html -->
:::

请注意，这种方式可以判断压缩值表示的是堆指针、`nullptr`还是哨兵值，这对于避免用户代码中的无用解压缩非常重要（见下文）。

接下来解压缩的想法是，依赖于一个特定设计的基址指针，其中低32位设置为1。

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | 高半字                                  | 低半字        |
| ------------ | --------------------------------------: | -------------: |
| 基地址        | <tt>U<sub>31</sub>...U<sub>1</sub>1</tt> | <tt>1...1</tt> |
<!-- markdownlint-enable no-inline-html -->
:::


解压缩操作首先对压缩值进行符号扩展，然后左移以还原符号位的压缩操作。生成的中间值编码如下：

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
|              | 高半字     | 低半字                                  |
| ------------ | ----------: | ----------------------------------------: |
| 堆指针         | <tt>1...1</tt> | <tt>L<sub>31</sub>...L<sub>3</sub>000</tt> |
| `nullptr`    | <tt>0...0</tt> | <tt>0...000</tt>                           |
| sentinel     | <tt>0...0</tt> | <tt>0...010</tt>                           |
<!-- markdownlint-enable no-inline-html -->
:::

最终，解压后的指针只是该中间值与基指针之间的按位与操作结果。

:::table-wrapper
| C++                                                    | x64 汇编          |
| :----------------------------------------------------- | :----------------- |
| ```cpp                                                 | ```asm             \
| void* Decompress(uint32_t compressed) \{                | movsxd rax, edi    \
|   uintptr_t intermediate =                             | add rax, rax       \
|       (uintptr_t)((int32_t)compressed)  &lt;&lt;1;           | and rax, qword ptr \
|   return (void*)(intermediate & base);                 |     [rip + base]   \
| \}                                                      | ```                \
| ```                                                    |                    |
:::

生成的方案通过无分支的非对称方案透明地处理了情况 1.-3。压缩使用了3字节，不包含初始寄存器移动，因为调用会被内联。解压使用了13字节，包括初始的符号扩展寄存器移动。

## 选定的细节

上一节解释了所采用的压缩方案。为了实现高性能，需要一种紧凑的压缩方案。上述压缩方案在 Speedometer 中仍会产生可观察的回归。接下来的段落解释了一些需要改进 Oilpan 性能到接受水平的细节。

### 优化笼基加载

从技术上讲，根据 C++ 的术语，全局基指针不能是常量，因为它是在 `main()` 之后，在嵌入器初始化 Oilpan 时的运行时初始化的。让这个全局变量可变会阻碍重要的常量传播优化，例如编译器无法证明一个随机调用不会修改基指针并且需要加载两次:

:::table-wrapper
<!-- markdownlint-disable no-inline-html -->
| C++                        | x64 汇编                      |
| :------------------------- | :---------------------------- |
| ```cpp                     | ```asm                        \
| void foo(GCed*);           | baz(Member&lt;GCed>):            \
| void bar(GCed*);           |   movsxd rbx, edi             \
|                            |   add rbx, rbx                \
| void baz(Member&lt;GCed> m) \{ |   mov rdi, qword ptr          \
|   foo(m.get());            |       [rip + base]            \
|   bar(m.get());            |   and rdi, rbx                \
| }                          |   call foo(GCed*)             \
| ```                        |   and rbx, qword ptr          \
|                            |       [rip + base] # 额外加载 \
|                            |   mov rdi, rbx                \
|                            |   jmp bar(GCed*)              \
|                            | ```                           |
<!-- markdownlint-enable no-inline-html -->
:::

通过一些额外的属性，我们教会了 clang 将全局基指针视为常量，从而实际上在一个上下文中仅进行一次加载。

### 完全避免解压

最快的指令序列就是一个无操作指令！考虑到这一点，对于许多指针操作，冗余的压缩和解压可以轻松避免。显而易见，对于检查 Member 是否为 nullptr，我们不需要解压。在从一个 Member 构建或分配到另一个 Member 时，我们不需要解压和压缩。指针的比较通过压缩得以保留，因此我们还可以避免对它们的转换。Member 抽象在这里很好地充当了瓶颈。

使用压缩指针可以加速哈希计算。用于哈希计算的解压是冗余的，因为固定的基指针不会增加哈希熵。相反，可以使用一个更简单的32位整数哈希函数。Blink 中有许多使用 Member 作为键的哈希表；32位哈希使集合速度更快！

### 帮助 clang 优化失败的地方

在观察生成的代码时，我们发现了另一个有趣的地方，编译器没有执行足够的优化:

:::table-wrapper
| C++                               | x64 汇编                |
| :-------------------------------- | :----------------------- |
| ```cpp                            | ```asm                  \
| extern const uint64_t base;       | Assign(unsigned int):    \
| extern std::atomic_bool enabled;  |   mov dword ptr [rdi], esi \
|                                   |   mov rdi, qword ptr     \
| void Assign(uint32_t ptr) \{       |       [rip + base]       \
|   ptr_ = ptr                      |   mov al, byte ptr         \
|   WriteBarrier(Decompress(ptr));  |       [rip + enabled]      \
| }                                 |   test al, 1               \
|                                   |   jne .LBB4_2 # 很少见     \
| void WriteBarrier(void* ptr) \{    |   ret                      \
|   if (LIKELY(                     | .LBB4_2:                   \
|       !enabled.load(relaxed)))    |   movsxd rax, esi          \
|     return;                       |   add rax, rax             \
|   SlowPath(ptr);                  |   and rdi, rax             \
| }                                 |   jmp SlowPath(void*)      \
| ```                               | ```                        |
:::

生成的代码在热的基本块中执行了基本加载，即使变量在其中未被使用并且可以轻松下沉到下面的基本块中，在那里调用了 `SlowPath()` 并实际使用了解压后的指针。编译器保守地决定不将非原子加载与原子放松加载重新排序，即使从语言规则上讲是完全合法的。我们手动将解压操作移到了原子读取之后，以使写屏障的赋值尽可能高效。


### 改进 Blink 中的数据结构紧凑性

很难估计将 Oilpan 指针大小减半的效果。本质上，它应该会改善“紧凑”数据结构（如此类指针的容器）的内存利用率。本地测量显示 Oilpan 内存减少了大约 16%。然而，调查显示，对于某些类型，我们并没有减少它们的实际大小，而只是增加了字段之间的内部填充。

为了最大限度地减少这种填充，我们编写了一个 clang 插件，该插件会自动识别此类垃圾回收类，重新排序字段可减少整个类大小。由于 Blink 代码库中存在许多此类情况，我们对最常使用的类进行了重新排序，详见 [设计文档](https://docs.google.com/document/d/1bE5gZOCg7ipDUOCylsz4_shz1YMYG5-Ycm0911kBKFA)。

### 失败的尝试：限制堆笼大小

并非所有优化都取得了成功。在尝试进一步优化压缩的过程中，我们将堆笼限制为 2GB。我们确保笼基址的低半字中的最高有效位为 1，这使我们可以完全避免移位。压缩变成了简单的截断，解压变成了简单的加载和按位与操作。

考虑到 Blink 渲染器中的 Oilpan 内存平均使用不到 10MB，我们认为可以安全地采用更快的方案并限制笼大小。不幸的是，在发布优化后，我们在某些罕见的工作负载中开始收到内存不足的错误报告。最终我们决定撤销此优化。

## 结果与未来

Oilpan 中的指针压缩在 **Chrome 106** 中默认启用。我们在各方面看到了显著的内存改进：


<!-- markdownlint-disable no-inline-html -->
| Blink 内存 | P50                                                 | P99                                               |
| -----------: | :-------------------------------------------------: | :-----------------------------------------------: |
| Windows      | **<span style={{color:'green'}}>-21% (-1.37MB)</span>** | **<span style={{color:'green'}}>-33% (-59MB)</span>** |
| Android      | **<span style={{color:'green'}}>-6% (-0.1MB)</span>**   | **<span style={{color:'green'}}>-8% (-3.9MB)</span>** |
<!-- markdownlint-enable no-inline-html -->


报告的数字表示通过 Oilpan 分配的 Blink 内存在整个用户场景中的第 50 和第 99 百分位。报告的数据显示了 Chrome 105 和 106 稳定版本之间的差异。以 MB 表示的绝对数字提供了用户可以期待看到的下限。由于对 Chrome 整体内存消耗的间接影响，真正的改进通常略高于所述数字。更大的相对改进表明此类情况中数据的紧凑性更好，这是内存更多被用在具有良好紧凑性的集合（例如 vector）中的标志。改进的数据结构填充已在 Chrome 108 中发布，并平均显示 Blink 内存的额外 4% 改进。

由于 Oilpan 在 Blink 中普遍存在，其性能成本可以通过 [Speedometer2](https://browserbench.org/Speedometer2.1/) 进行估算。基于线程局部版本的 [初始原型](https://chromium-review.googlesource.com/c/v8/v8/+/2739979) 显示了 15% 的回归。通过上述所有优化，我们未观察到显著的回归。

### 保守的栈扫描

在 Oilpan 中，栈会通过保守扫描来找到指向堆的指针。在压缩指针的情况下，这意味着我们必须将每个半字作为潜在指针处理。此外，在压缩过程中，编译器可能决定将中间值溢出到栈中，这意味着扫描工具必须考虑所有可能的中间值（在我们的压缩方案中唯一可能的中间值是被截断但尚未移位的值）。扫描中间值会增加误报的数量（即看起来像压缩指针的半字），从而将内存优化减少了大约3%（否则预计内存优化为24%）。

### 其他压缩方式

过去我们在 V8 JavaScript 和 Oilpan 上应用压缩时获得了显著的改进。我们认为这种模式可以应用到 Chrome 的其他智能指针（例如 `base::scoped_refptr`），这些指针已经指向其他堆区域。初步实验[显示](https://docs.google.com/document/d/1Rlr7FT3kulR8O-YadgiZkdmAgiSq0OaB8dOFNqf4cD8/edit)出了令人鼓舞的结果。

研究还表明，大部分内存实际上是通过 vtable 持有的。因此，我们已经在 Android64 上[启用了](https://docs.google.com/document/d/1rt6IOEBevCkiVjiARUy8Ib1c5EAxDtW0wdFoTiijy1U/edit?usp=sharing)相对 vtable ABI，这会压缩虚拟表，使我们能够节省更多内存，同时改善启动性能。

[^1]: 感兴趣的读者可以参考 Blink 的 [`ThreadStorage::Current()`](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/platform/heap/thread_state_storage.cc;drc=603337a74bf04efd536b251a7f2b4eb44fe153a9;l=19)，查看用不同模式编译 TLS 访问的结果。
[^2]: 数据是通过 Chrome 的用户指标分析框架收集的。
