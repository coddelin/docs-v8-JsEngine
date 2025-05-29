---
title: 'V8沙盒'
description: 'V8具有一个轻量级的进程内沙盒，以限制内存损坏漏洞的影响'
author: 'Samuel Groß'
avatars:
  - samuel-gross
date: 2024-04-04
tags:
 - 安全
---

经过近三年的时间，从[最初的设计文档](https://docs.google.com/document/d/1FM4fQmIhEqPG8uGp5o9A-mnPB5BOeScZYpkHjo0KKA8/edit?usp=sharing)到[数百个代码提交](https://github.com/search?q=repo%3Av8%2Fv8+%5Bsandbox%5D&type=commits&s=committer-date&o=desc)，V8沙盒——一个面向V8的轻量级进程内沙盒——现在已经发展到不再被认为是实验性的安全特性。从今天开始，[V8沙盒被纳入Chrome漏洞奖励计划](https://g.co/chrome/vrp/#v8-sandbox-bypass-rewards) (VRP)。虽然在其成为强大的安全边界之前仍有许多问题需要解决，但纳入漏洞奖励计划是朝着这一方向的重要一步。因此，Chrome 123可以被视为沙盒的某种“测试版”发布。这篇博客文章借此机会讨论了沙盒的动机，展示了它如何防止V8中的内存损坏扩散到主进程，并最终解释了为什么它是实现内存安全的必要步骤。

<!--truncate-->

# 动机

内存安全仍然是一个重要问题：在过去三年中[实际捕获的Chrome漏洞](https://docs.google.com/spreadsheets/d/1lkNJ0uQwbeC1ZTRrxdtuPLCIl7mlUreoKfSIgajnSyY/edit?usp=sharing) (2021 - 2023) 都始于Chrome渲染进程中的内存损坏漏洞，并被利用进行远程代码执行 (RCE)。其中60%的漏洞发生在V8。然而，有一个问题需要注意：V8漏洞很少是“经典”的内存损坏问题（例如，释放后使用、越界访问等），而是微妙的逻辑问题，这些问题反过来可能被用来损坏内存。因此，大多数现有的内存安全解决方案对V8来说并不适用。尤其是，既不能[切换到内存安全语言](https://www.cisa.gov/resources-tools/resources/case-memory-safe-roadmaps)，如Rust，也不能使用当前或未来的硬件内存安全功能，如[内存标记](https://newsroom.arm.com/memory-safety-arm-memory-tagging-extension)，来解决今天V8所面临的安全挑战。

为了理解原因，可以考虑一个高度简化的、假设的JavaScript引擎漏洞：`JSArray::fizzbuzz()`的实现，该方法将数组中能被3整除的值替换为“fizz”，能被5整除的值替换为“buzz”，同时能被3和5整除的值替换为“fizzbuzz”。下面是用C++实现的该函数。`JSArray::buffer_`可以被认为是`JSValue*`，即指向JavaScript值数组的指针，而`JSArray::length_`包含该缓冲区当前的大小。

```cpp
 1. for (int index = 0; index < length_; index++) {
 2.     JSValue js_value = buffer_[index];
 3.     int value = ToNumber(js_value).int_value();
 4.     if (value % 15 == 0)
 5.         buffer_[index] = JSString("fizzbuzz");
 6.     else if (value % 5 == 0)
 7.         buffer_[index] = JSString("buzz");
 8.     else if (value % 3 == 0)
 9.         buffer_[index] = JSString("fizz");
10. }
```

看起来很简单？然而，这里有一个相当微妙的漏洞：第3行中的`ToNumber`转换可能具有副作用，因为它可能调用用户定义的JavaScript回调。这样的回调可能会缩小数组，从而导致后续的越界写入。以下JavaScript代码可能会导致内存损坏：

```js
let array = new Array(100);
let evil = { [Symbol.toPrimitive]() { array.length = 1; return 15; } };
array.push(evil);
// 在索引100处，|evil|的@@toPrimitive回调在上面的第3行被调用，
// 缩小数组到长度1并重新分配其备份缓冲区。后续写入（第5行）发生越界。
array.fizzbuzz();
```

注意，这种漏洞可能发生在手写的运行时代码（就像上面的例子）或者由优化即时(JIT)编译器在运行时生成的机器代码（如果该函数是用JavaScript实现的）。在前一种情况下，程序员可能会认为不需要对存储操作进行显式边界检查，因为该索引刚刚被访问过。在后一种情况下，这可能是编译器在其优化阶段（例如[冗余消除](https://en.wikipedia.org/wiki/Partial-redundancy_elimination)或[边界检查消除](https://en.wikipedia.org/wiki/Bounds-checking_elimination)）得出同样的不正确结论，因为它没有正确建模`ToNumber()`的副作用。


虽然这是一个人为设计的简单漏洞（由于模糊测试工具的改进、开发者意识的提高以及研究人员的关注，这种特定的漏洞模式现在大多已经灭绝），但理解为何现代JavaScript引擎中的漏洞难以以通用的方式缓解仍然很有意义。考虑使用像Rust这样的内存安全语言的方法，在这种语言中，编译器有责任保证内存安全。在上述示例中，内存安全语言可能会阻止在解释器使用的手写运行时代码中出现此问题。然而，它*无法*阻止任何即时编译器中的漏洞，因为此类漏洞是逻辑问题，而不是"经典"的内存破坏漏洞。只有编译器生成的代码才会引发内存破坏。从根本上讲，问题在于，*如果编译器直接成为攻击面的一部分，则编译器无法保证内存安全*。

类似地，禁用即时编译器也只能算是部分解决方案：从历史上看，V8中发现和利用的大约一半漏洞影响了其编译器之一，而其余的则出现在其他组件中，如运行时函数、解释器、垃圾回收器或解析器。对这些组件使用内存安全语言并移除即时编译器可能有效，但会显著降低引擎的性能（针对计算密集型任务的负载类型，这种性能下降范围通常在1.5~10倍甚至更多）。

现在，我们来考虑广泛流行的硬件安全机制，特别是[内存标记](https://googleprojectzero.blogspot.com/2023/08/mte-as-implemented-part-1.html)。有许多原因表明内存标记同样不是一种有效的解决方案。例如，CPU侧信道（可以[轻松从JavaScript中利用](https://security.googleblog.com/2021/03/a-spectre-proof-of-concept-for-spectre.html)）可能被用来泄露标记值，从而使攻击者能够绕过缓解措施。此外，由于[指针压缩](https://v8.dev/blog/pointer-compression)，V8指针中目前没有标记位的空间。因此，整个堆区域必须标记相同的标记，从而无法检测跨对象的破坏。因此，虽然内存标记[在某些攻击面上可能非常有效](https://googleprojectzero.blogspot.com/2023/08/mte-as-implemented-part-2-mitigation.html)，但在JavaScript引擎的情况下，可能对攻击者构不成太多障碍。

总之，现代JavaScript引擎往往包含复杂的二阶逻辑漏洞，提供了强大的开发利用原语。这些漏洞无法通过适用于典型内存破坏问题的相同技术来有效保护。然而，今天在V8中发现并利用的几乎所有漏洞都有一个共同点：最终的内存破坏必然发生在V8堆中，因为编译器和运行时（几乎）只操作V8的`HeapObject`实例。这正是沙盒派上用场的地方。


# V8（堆）沙盒

沙盒的基本理念是隔离V8的（堆）内存，使其内的任何内存破坏无法"扩散"至进程内存的其他部分。

作为沙盒设计的一个激励示例，考虑现代操作系统中[用户空间和内核空间的分离](https://en.wikipedia.org/wiki/User_space_and_kernel_space)。从历史来看，所有应用程序和操作系统的内核共享相同的（物理）内存地址空间。因此，用户应用程序中的任何内存错误都可能通过，例如，破坏内核内存来使整个系统崩溃。另一方面，在现代操作系统中，每个用户态的应用程序都有自己专用的（虚拟）地址空间。因此，任何内存错误都仅限于应用程序本身，其余系统受到保护。换句话说，错误的应用程序可以导致自身崩溃，但不会影响系统的其他部分。同样，V8沙盒尝试隔离由V8执行的不可信JavaScript/WebAssembly代码，以便V8中的漏洞不会影响主机进程的其余部分。

原则上，[沙盒可以通过硬件支持来实现](https://docs.google.com/document/d/12MsaG6BYRB-jQWNkZiuM3bY8X2B2cAsCMLLdgErvK4c/edit?usp=sharing)：类似于用户空间-内核空间分离，当进入或离开沙盒代码时，V8会执行一些模式切换指令，使CPU无法访问沙盒外的内存。但实际上，今天没有合适的硬件功能可用，因此目前的沙盒完全是基于软件实现的。

基于[软件的沙盒](https://docs.google.com/document/d/1FM4fQmIhEqPG8uGp5o9A-mnPB5BOeScZYpkHjo0KKA8/edit?usp=sharing)的基本思路是用"与沙盒兼容"的替代品取代所有可以访问沙盒外内存的数据类型。尤其是，所有指针（无论是指向V8堆上的对象还是内存中的其他地方）和64位大小都必须移除，因为攻击者可能会破坏它们以随后访问进程中的其他内存。这意味着诸如栈之类的内存区域不能置于沙盒内，因为由于硬件和操作系统限制，它们必须包含指针（例如返回地址）。因此，基于软件的沙盒仅将V8堆置于沙盒中，其整体构造因此类似于[WebAssembly使用的沙盒模型](https://webassembly.org/docs/security/)。

要理解其实际工作原理，查看内存损坏后的漏洞执行步骤会很有帮助。RCE漏洞的目标通常是执行权限提升攻击，例如执行shellcode或进行返回导向编程（ROP）式攻击。对于这些攻击，漏洞首先需要在进程中具备随意读写内存的能力，例如接下来可以破坏一个函数指针或在内存中放置一个ROP有效载荷并转到该位置。针对一个破坏V8堆内存的漏洞，攻击者因此会寻找类似如下的对象：

```cpp
class JSArrayBuffer: public JSObject {
  private:
    byte* buffer_;
    size_t size_;
};
```

鉴于此，攻击者可以破坏buffer指针或大小值来构造任意读写原语。这就是沙盒旨在阻止的步骤。特别是，启用沙盒后，并假设引用的buffer位于沙盒内部，上述对象将变为：

```cpp
class JSArrayBuffer: public JSObject {
  private:
    sandbox_ptr_t buffer_;
    sandbox_size_t size_;
};
```

其中`sandbox_ptr_t`是在沙盒基地址起的40位偏移量（对于1TB沙盒）。类似地，`sandbox_size_t`是一种"沙盒兼容"大小，[当前限制为32GB](https://source.chromium.org/chromium/chromium/src/+/main:v8/include/v8-internal.h;l=231;drc=5bdda7d5edcac16b698026b78c0eec6d179d3573)。
或者，如果引用的buffer位于沙盒外部，对象将变成：

```cpp
class JSArrayBuffer: public JSObject {
  private:
    external_ptr_t buffer_;
};
```

在这里，`external_ptr_t`通过指针表间接引用buffer（及其大小）（类似于[UNIX内核的文件描述符表](https://en.wikipedia.org/wiki/File_descriptor)或[WebAssembly.Table](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Table)），从而提供内存安全保障。

在两种情况下，攻击者都将无法"触及"沙盒之外的地址空间的其他部分。而是需要额外的漏洞：一个V8沙盒绕过漏洞。下图总结了高层设计，有兴趣的读者可以在[`src/sandbox/README.md`](https://chromium.googlesource.com/v8/v8.git/+/refs/heads/main/src/sandbox/README.md)链接的设计文档中找到更详细的技术信息。

![沙盒设计的高层图](/_img/sandbox/sandbox.svg)

仅仅将指针和大小转换为不同的表示方式对于像V8这样复杂的应用程序来说是不够的，还有[许多其他问题](https://issues.chromium.org/hotlists/4802478)需要解决。例如，随着沙盒的引入，类似如下的代码突然变得有问题：

```cpp
std::vector<std::string> JSObject::GetPropertyNames() {
    int num_properties = TotalNumberOfProperties();
    std::vector<std::string> properties(num_properties);

    for (int i = 0; i < NumberOfInObjectProperties(); i++) {
        properties[i] = GetNameOfInObjectProperty(i);
    }

    // 处理其他类型的属性
    // ...
```

这段代码作出了这样的（合理）假设：直接存储在JSObject中的属性数量必须小于该对象的总属性数量。然而，假设这些数字仅仅以整数形式存储在JSObject的某个位置，攻击者可能会破坏其中一个数字，从而打破这个不变性。随后，访问越出沙盒的`std::vector`将会越界。添加显式的边界检查，例如使用[`SBXCHECK`](https://chromium.googlesource.com/v8/v8.git/+/0deeaf5f593b98d6a6a2bb64e3f71d39314c727c)，可以解决这一问题。

令人鼓舞的是，到目前为止发现的几乎所有"沙盒违规"都是类似这样的：简单（一级）内存损坏错误，例如use-after-free或由于缺乏边界检查导致的越界访问。与V8中通常发现的二级漏洞不同，这些沙盒漏洞实际上可以通过早期讨论的方法进行预防或缓解。事实上，上述特定漏洞今天已经可以缓解，因为[Chrome的libc++加固](http://issues.chromium.org/issues/40228527)。因此，希望从长远来看，沙盒成为一个**更具防御能力的安全边界**，而不是V8本身。虽然目前可用的沙盒漏洞数据集非常有限，但今天启动的VRP集成有望帮助更清晰地绘制关于沙盒攻击表面上遇到的漏洞类型的图景。

## 性能

这种方法的一个主要优势是它本质上成本低：沙盒带来的开销主要来自于对外部对象使用指针表间接引用（大约需要额外加载一个内存块）以及使用偏移量代替原始指针（主要只需要一次移位加法操作，非常低廉）。因此，在典型负载下（通过[Speedometer](https://browserbench.org/Speedometer3.0/)和[JetStream](https://browserbench.org/JetStream/)基准测试套件测量），沙盒的当前开销仅为大约1%或更少。这使得V8沙盒可以在兼容平台上默认启用。

## 测试

任何安全边界的一个理想特性是可测试性：能够手动和自动测试承诺的安全保证在实际中是否真正有效。这需要一个明确的攻击者模型、一种“模拟”攻击者的方法，以及理想情况下自动确定安全边界何时失效的方法。V8沙箱满足了所有这些要求：

1. **明确的攻击者模型**：假设攻击者可以在V8沙箱内任意读写。目标是防止沙箱外的内存损坏。
2. **模拟攻击者的方法**：当使用 `v8_enable_memory_corruption_api = true` 标志构建时，V8提供了一个“内存损坏API”。它模拟从典型的V8漏洞获得的原语，特别是提供对沙箱内部的完整读写访问。
3. **检测“沙箱违规”的方法**：V8提供了一个“沙箱测试”模式（通过 `--sandbox-testing` 或 `--sandbox-fuzzing` 启用），该模式安装了一个[信号处理程序](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/sandbox/testing.cc;l=425;drc=97b7d0066254778f766214d247b65d01f8a81ebb)，用于确定诸如 `SIGSEGV` 之类的信号是否表示沙箱安全保证的违规。

最终，这使沙箱能够集成到Chrome的VRP程序中，并由专门的模糊测试工具进行测试。

## 用法

必须在构建时通过 `v8_enable_sandbox` 构建标志启用/禁用V8沙箱。由于技术原因，无法在运行时启用/禁用沙箱。V8沙箱需要64位系统，因为它需要预留大量虚拟地址空间，目前大约为一太字节。

在过去的两年中，V8沙箱已经默认启用于Android、ChromeOS、Linux、macOS和Windows上的64位版本（特别是x64和arm64）的Chrome。尽管沙箱尚未（并且仍未）功能完整，这主要是为了确保它不会引起稳定性问题，并收集现实世界中的性能统计数据。因此，最近的V8漏洞已经不得不绕过沙箱，这为其安全特性提供了早期的有用反馈。


# 结论

V8沙箱是一种新型的安全机制，旨在防止V8中的内存损坏影响进程中的其他内存。沙箱的动机是当前内存安全技术在优化JavaScript引擎方面基本上不可适用。虽然这些技术无法防止V8本身的内存损坏，但它们实际上可以保护V8沙箱攻击面。因此，沙箱是迈向内存安全的必要一步。
