---
title: "一种将垃圾回收编程语言高效引入WebAssembly的新方法"
author: "阿隆·扎凯"
avatars:
  - "alon-zakai"
date: 2023-11-01
tags:
  - WebAssembly
tweet: "1720161507324076395"
---

最近一篇关于[WebAssembly垃圾回收（WasmGC）](https://developer.chrome.com/blog/wasmgc)的文章从高层次解释了[垃圾回收（GC）提案](https://github.com/WebAssembly/gc)旨在更好地支持在Wasm中流行的垃圾回收语言的重要性。在本文中，我们将深入探讨诸如Java、Kotlin、Dart、Python和C#等垃圾回收语言如何移植到Wasm中。其实有两种主要的方法：

<!--truncate-->
- “**传统**”移植方法，其中语言的现有实现被编译为WasmMVP，也就是在2017年推出的WebAssembly最低可行产品。
- **WasmGC**移植方法，其中语言被编译为Wasm本身的GC结构，这些结构是在最近的GC提案中定义的。

我们将解释这两种方法是什么以及它们之间的技术权衡，特别是在体积和速度方面的权衡。在此过程中，我们将看到WasmGC具有几个主要优势，但它也需要工具链和虚拟机（VM）的新工作。本文后半部分将解释V8团队在这些领域的工作，包括基准测试数据。如果您对Wasm、GC或两者感兴趣，我们希望您会觉得这篇文章有趣，并确保查看文章末尾的演示和入门链接！

## “传统”移植方法

语言通常是如何移植到新架构的呢？比如说Python想要运行在[ARM架构](https://en.wikipedia.org/wiki/ARM_architecture_family)上，或者Dart想要运行在[MIPS架构](https://en.wikipedia.org/wiki/MIPS_architecture)上。一般的思路是重新编译VM到该架构。除此之外，如果VM有架构相关的代码，比如即时编译（JIT）或提前编译（AOT），那么您还需要为JIT/AOT实现一个针对新架构的后端。这种方法非常合理，因为代码库的主要部分通常可以重新编译为您要移植的新架构：


![移植后的VM的结构](/_img/wasm-gc-porting/ported-vm.svg "左侧为包括解析器、垃圾回收器、优化器、库支持和更多内容的主要运行时代码；右侧为x64、ARM等单独的后端代码。")

在这张图中，解析器、库支持、垃圾回收器、优化器等都是所有架构都共享的主运行时代码。移植到新架构只需要为它开发一个新的后端，这相对而言是一小段代码。

Wasm是一个低级编译目标，因此传统的移植方法可以使用也就不足为奇了。从Wasm开始以来，我们已看到这种方法在许多情况下工作良好，例如针对Python的[Pyodide](https://pyodide.org/en/stable/)和针对C#的[Blazor](https://dotnet.microsoft.com/en-us/apps/aspnet/web-apps/blazor)（注意Blazor同时支持[AOT](https://learn.microsoft.com/en-us/aspnet/core/blazor/host-and-deploy/webassembly?view=aspnetcore-7.0#ahead-of-time-aot-compilation)和[JIT](https://github.com/dotnet/runtime/blob/main/docs/design/mono/jiterpreter.md)编译，因此它是一个涵盖所有上述内容的好例子）。在所有这些情况下，语言的运行时被编译为WasmMVP，就像任何其他程序被编译为Wasm一样，因此结果使用了WasmMVP的线性内存、表、函数等。

如前所述，这是语言通常移植到新架构的方式，所以它非常合理，因为您可以重用几乎所有现有的VM代码，包括语言实现和优化。然而事实证明，这种方法在Wasm上有几个特定的缺点，而WasmGC就可以在这方面提供帮助。

## WasmGC移植方法

简言之，WebAssembly的GC提案（“WasmGC”）让您可以定义结构体和数组类型，并执行操作，例如创建它们的实例、读取和写入字段、在类型之间进行转换等。（更多详情请参阅[提案概述](https://github.com/WebAssembly/gc/blob/main/proposals/gc/Overview.md)）。这些对象由Wasm VM自身的GC实现管理，这是与传统移植方法的主要区别。

可以这样理解：_如果传统移植方法是将一种语言移植到一种**架构**，那么WasmGC方法非常类似于将一种语言移植到一种**虚拟机（VM）**_。例如，如果你想将Java移植到JavaScript，那么你可以使用像[J2CL](https://j2cl.io)这样的编译器，它将Java对象表示为JavaScript对象，然后这些JavaScript对象会像其他对象一样由JavaScript虚拟机管理。将语言移植到现有的虚拟机是非常有用的技术，可以通过编译为[JavaScript](https://gist.github.com/matthiasak/c3c9c40d0f98ca91def1)、[JVM](https://en.wikipedia.org/wiki/List_of_JVM_languages)和[CLR](https://en.wikipedia.org/wiki/List_of_CLI_languages)的所有语言证明这一点。

这种架构/虚拟机的比喻并不完全准确，特别是因为WasmGC旨在比我们上段提到的其他虚拟机更低级。然而，WasmGC定义了虚拟机管理的结构体和数组以及描述其形状和关系的类型系统，将语言移植到WasmGC的过程是用这些原语表示你的语言的结构；这肯定比传统的移植到WasmMVP（将所有内容降为线性内存中的无类型字节）要高级。因此，WasmGC非常类似于将语言移植到虚拟机，并且它共享这样的移植的优势，尤其是在与目标虚拟机良好集成以及重用其优化方面。

## 比较两种方法

现在我们已经了解了GC语言的两种移植方法，接下来看看它们如何比较。

### 引入内存管理代码

实际上，许多Wasm代码运行在已经有垃圾收集器的虚拟机中，比如Web上的虚拟机，以及像[Node.js](https://nodejs.org/)、[workerd](https://github.com/cloudflare/workerd)、[Deno](https://deno.com/)和[Bun](https://bun.sh)这样的运行时环境。在这些环境中，引入一个垃圾回收实现会为Wasm二进制文件增加不必要的大小。事实上，这不仅仅是使用WasmMVP的GC语言的问题，还包括使用线性内存的语言，比如C、C++和Rust，因为在这些语言中进行任何有趣的分配的代码最终都会捆绑`malloc/free`来管理线性内存，这需要几千字节的代码。例如，`dlmalloc`需要6K，甚至一个为节省大小而降低速度的malloc，比如[`emmalloc`](https://groups.google.com/g/emscripten-discuss/c/SCZMkfk8hyk/m/yDdZ8Db3AwAJ)，也需要超过1K。而使用WasmGC，虚拟机会自动管理我们的内存，因此在Wasm中我们根本不需要任何内存管理代码——既不需要GC，也不需要`malloc/free`。在[之前提到的关于WasmGC的文章](https://developer.chrome.com/blog/wasmgc)中，对`fannkuch`基准测试的大小进行了测量，WasmGC的大小明显小于C或Rust——**2.3** K对比 **6.1-9.6** K——正是这个原因。

### 循环收集

在浏览器中，Wasm通常与JavaScript（通过JavaScript与Web API交互）交互，但在WasmMVP（甚至在[引用类型](https://github.com/WebAssembly/reference-types/blob/master/proposals/reference-types/Overview.md)提案中），没有办法在Wasm和JS之间创建双向链接，从而支持细粒度的循环收集。对JS对象的链接只能放在Wasm表中，而链接回Wasm只能引用整个Wasm实例作为一个大的单一对象，如下所示：


![JS和整个Wasm模块之间的循环](/_img/wasm-gc-porting/cycle2.svg "单个JS对象引用一个大Wasm实例，而不是内部的单个对象。")

这不足以高效地收集部分在编译的虚拟机中部分在JavaScript中的具体对象循环。而在WasmGC中，我们定义虚拟机感知的Wasm对象，因此可以实现从Wasm到JavaScript以及从JavaScript回到Wasm的正确引用：

![JS和WasmGC对象之间的循环链接](/_img/wasm-gc-porting/cycle3.svg "JS和Wasm对象之间的链接。")

### 堆栈上的GC引用

GC语言必须识别堆栈上的引用，也就是调用范围内局部变量的引用，因为这些引用可能是确保对象存活的唯一因素。在GC语言的传统移植中，这会是一个问题，因为Wasm的沙箱机制阻止程序检查自己的堆栈。传统移植有解决方案，比如影子堆栈（[可以自动完成](https://github.com/WebAssembly/binaryen/blob/main/src/passes/SpillPointers.cpp)），或者只在堆栈上没有东西时进行垃圾回收（比如JavaScript事件循环的各个回合之间）。一种可能的未来改进是为Wasm加入[堆栈扫描支持](https://github.com/WebAssembly/design/issues/1459)，这对传统移植会有所帮助。目前，只有WasmGC可以无额外开销地处理堆栈引用，并且它会完全自动完成，因为Wasm虚拟机负责GC。

### GC效率

一个相关问题是执行垃圾回收的效率。两种移植方法在这方面都有潜在优势。传统移植可以重用现有虚拟机中的优化，这些优化可能针对特定语言进行了调整，例如重点优化内部指针或短期对象。而另一方面，运行于Web上的WasmGC移植可以利用使JavaScript垃圾回收快速化的所有工作成果，包括使用像[代际垃圾回收](https://en.wikipedia.org/wiki/Tracing_garbage_collection#Generational_GC_(ephemeral_GC))、[增量回收](https://en.wikipedia.org/wiki/Tracing_garbage_collection#Stop-the-world_vs._incremental_vs._concurrent)等技术。WasmGC还将垃圾回收交给虚拟机处理，这简化了实现高效写屏障之类的问题。

WasmGC的另一个优势是垃圾回收可以感知内存压力，并据此调整堆大小和回收频率，就像现在Web上的JavaScript虚拟机已经做到的一样。

### 内存碎片化

随着时间推移，尤其是在长时间运行的程序中，`malloc/free`操作在WasmMVP线性内存上可能导致*碎片化*。想象我们总共有2MB的内存，并且正中间有一个现存的小分配，仅仅是几个字节。在像C、C++和Rust这样的语言中，无法在运行时移动任意分配，因此我们在该分配的左侧和右侧几乎分别有1MB内存。但这些是两个独立的碎片，因此如果我们尝试分配1.5MB内存会失败，尽管我们确实有足够的未分配内存总量：


![](/_img/wasm-gc-porting/fragment1.svg "线性内存中间有个粗鲁的小分配，分裂了两半的空闲空间。")

这种碎片化可能迫使Wasm模块更频繁地增长内存，[增加开销并可能导致内存不足错误](https://github.com/WebAssembly/design/issues/1397)；[改进](https://github.com/WebAssembly/design/issues/1439)正在设计中，但这是一个具挑战性的问题。这是所有WasmMVP程序中的问题，包括GC语言的传统移植（注意GC对象本身可能是可移动的，但运行时本身的部分不是）。然而，WasmGC避免了这个问题，因为内存完全由虚拟机管理，虚拟机可以移动它们以压缩垃圾回收堆并避免碎片化。

### 开发者工具集成

在传统的WasmMVP移植中，对象被放置在线性内存中，开发者工具很难提供有用的信息，因为这些工具仅能看到没有高级类型信息的字节。另一方面，在WasmGC中，虚拟机管理GC对象，因此可以实现更好的集成。例如，在Chrome中你可以使用堆分析器来测量WasmGC程序的内存使用情况：


![WasmGC代码运行在Chrome堆分析器中](/_img/wasm-gc-porting/devtools.png)

上面的图显示了Chrome开发者工具中的Memory标签，其中我们拥有运行WasmGC代码的页面的堆快照，该代码在[链表](https://gist.github.com/kripken/5cd3e18b6de41c559d590e44252eafff)中创建了1001个小对象。你可以看到对象类型的名称`$Node`，以及用于引用链表中下一个对象的字段`$next`。所有常见的堆快照信息都在其中，比如对象的数量、浅尺寸、保留尺寸等，让我们轻松看到WasmGC对象实际使用了多少内存。其他Chrome开发者工具功能如调试器也能够在WasmGC对象上正常工作。

### 语言语义

当你在传统移植中重新编译一个虚拟机时，你会得到你期望的精确语言，因为你在运行实现该语言的熟悉代码。这是一个主要的优势！相比之下，在WasmGC移植中，你可能最终会为了效率而考虑语义上的妥协。这是因为在WasmGC中，我们定义了新的GC类型——结构体和数组——并编译到它们。因此，我们不能简单地将用C、C++、Rust或类似语言编写的虚拟机编译到这种形式，因为这些语言只会编译到线性内存，而WasmGC不能帮助绝大多数现有的虚拟机代码库。相反，在WasmGC移植中，你通常会编写新的代码，将你的语言构造转化为WasmGC原语。而这种转化有多种方式，每种都有不同的权衡。

是否需要妥协取决于特定语言的构造如何能在WasmGC中实现。例如，WasmGC结构体字段具有固定索引和类型，因此希望以更动态方式访问字段的语言[可能会面临挑战](https://github.com/WebAssembly/gc/issues/397)；为此有多种解决方案，在这些解决方案中，一些选项可能更简单或更快，但无法支持语言的所有原始语义。（WasmGC当前还有其他限制，例如，它缺少[内部指针](https://go.dev/blog/ismmkeynote)；随着时间推移，这些问题预计会[改进](https://github.com/WebAssembly/gc/blob/main/proposals/gc/Post-MVP.md)。）

正如我们提到的，将代码编译为WasmGC类似于编译到现有的虚拟机，并且在这种移植中有许多合理的妥协。例如，[dart2js（将Dart编译为JavaScript）中的数字与Dart虚拟机中的数字表现不同](https://dart.dev/guides/language/numbers)，以及[IronPython（将Python编译为.NET）中的字符串行为像C#字符串](https://nedbatchelder.com/blog/201703/ironpython_is_weird.html)。因此，并非语言的所有程序都可以在这种移植上运行，但这些选择是有充分理由的：将dart2js中的数字实现为JavaScript数字可以让虚拟机很好地优化它们，而在IronPython中使用.NET字符串意味着可以将这些字符串无额外开销地传递给其他.NET代码。

虽然在WasmGC移植中可能需要妥协，但与JavaScript相比，WasmGC作为一个编译目标也有一些优势。例如，虽然dart2js有我们刚才提到的数值限制，[dart2wasm](https://flutter.dev/wasm)（将Dart编译为WasmGC）完全按照预期行为运行，无需妥协（这是可能的，因为Wasm对于Dart所需的数值类型有高效表示）。

为什么这对传统移植不是问题？只是因为它们将现有的虚拟机重新编译到线性内存中，在那里对象以无类型字节方式存储，这比WasmGC更低级。当所有你拥有的都是无类型字节时，你就有更多的灵活性来进行各种低级（可能是不安全的）操作，而通过重新编译现有的虚拟机，你可以获得该虚拟机的所有技巧。

### 工具链的工作量

正如我们在上一小节中提到的，WasmGC移植无法简单地重新编译现有的虚拟机。你可能能够重用某些代码（例如解析逻辑和AOT优化，因为它们在运行时不与GC集成），但一般来说，WasmGC移植需要大量的新代码。

相比之下，传统移植到WasmMVP可以更简单和更快：例如，你可以在几分钟内将Lua虚拟机（用C编写）编译到Wasm。然而，Lua的WasmGC移植则需要更多的工作，因为你需要编写代码将Lua的构造降低为WasmGC结构和数组，并且需要决定如何在WasmGC类型系统的特定约束内实际实现这一点。

因此，更大的工具链工作量是WasmGC移植的一个重要缺点。然而，鉴于我们之前提到的所有优势，我们认为WasmGC仍然非常有吸引力！理想的情况是WasmGC的类型系统能够高效支持所有语言，并且所有语言都投入努力实现WasmGC移植。这其中的第一部分将通过[WasmGC类型系统的未来扩展](https://github.com/WebAssembly/gc/blob/main/proposals/gc/Post-MVP.md)来实现，而对于第二部分，我们可以通过尽可能共享工具链方面的工作来减少WasmGC移植所涉及的工作。幸运的是，事实证明WasmGC使共享工具链工作非常实际，这将在下一节中看到。

## 优化WasmGC

我们已经提到，WasmGC移植具有潜在的速度优势，例如使用较少的内存以及重用宿主GC中的优化。在本节中，我们将展示WasmGC相对于WasmMVP的其他有趣优化优势，这些优势可能对WasmGC移植的设计以及最终结果的速度产生很大的影响。

这里的关键问题是*WasmGC比WasmMVP更高级*。为了直观感受这一点，请记住我们之前提到过，传统移植到WasmMVP类似于移植到新架构，而WasmGC移植类似于移植到新虚拟机，而虚拟机当然是架构上的高级抽象——高级表示通常更可优化。我们也许可以通过一个具体的伪代码例子更清楚地看到这一点：

```csharp
func foo() {
  let x = allocate<T>(); // 分配一个GC对象。
  x.val = 10;            // 将字段设置为10。
  let y = allocate<T>(); // 分配另一个对象。
  y.val = x.val;         // 这必须是10。
  return y.val;          // 这也必须是10。
}
```

如注释所示，`x.val`将包含`10`，`y.val`也会包含`10`，因此最终返回也是`10`，然后优化器甚至可以移除分配操作，使其变为：

```csharp
func foo() {
  return 10;
}
```

很好！不幸的是，这在WasmMVP中是不可能的，因为每次分配都会转换成调用`malloc`，这是Wasm中的一个大而复杂的函数，对线性内存有副作用。由于这些副作用，优化器必须假定第二次分配（针对`y`）可能会改变`x.val`值，而它也驻留在线性内存中。内存管理是复杂的，当我们在Wasm的低级实现它时，我们的优化选项受到限制。

相比之下，在WasmGC中我们在较高级别操作：每次分配执行的是`struct.new`指令，这是一个我们实际可以推理的虚拟机操作，优化器也可以跟踪引用以得出`x.val`确实被值`10`恰好写入一次。因此我们可以按预期将这个函数优化为简单地返回`10`！

除了分配之外，WasmGC添加的其他内容还有显式函数指针（`ref.func`）以及使用它们的调用（`call_ref`）、结构体和数组字段上的类型（不像无类型的线性内存）等等。因此，WasmGC是比WasmMVP更高级的中间表示（IR），并且更加可优化。

如果WasmMVP的可优化性有限，为什么它的速度如此之快？毕竟，Wasm 可以接近于完全的原生速度运行。这是因为WasmMVP通常是像LLVM这样强大优化编译器的输出。LLVM IR（像WasmGC但不像WasmMVP）对分配等有特殊表示方式，因此LLVM可以优化我们讨论的内容。WasmMVP的设计是使大多数优化在编译链的Wasm*之前*进行，而Wasm虚拟机只做“最后一英里”的优化（如寄存器分配之类的事情）。

WasmGC能否采用与WasmMVP类似的编译链模型，特别是使用LLVM？不幸的是，不能，因为LLVM不支持WasmGC（某些程度的支持[已被探索](https://github.com/Igalia/ref-cpp)，但几乎看不到全面支持如何实现）。此外，许多垃圾回收语言不使用LLVM——在该领域存在多种多样的编译链。因此，我们需要为WasmGC寻找其他方案。

幸运的是，正如我们提到的，WasmGC的可优化性很高，这为我们开辟了新的方案。以下是对此的一种看法：

![WasmMVP和WasmGC编译链工作流程](/_img/wasm-gc-porting/workflows1.svg)

WasmMVP和WasmGC的工作流程都从左边的两个框框开始：我们从源代码开始，以特定语言的方式处理和优化（每种语言对自身的了解最为深入）。然后出现一个区别：对于WasmMVP，我们必须先执行通用优化然后再转化为Wasm，而对于WasmGC，我们可以选择先转化为Wasm然后再优化。这一点很重要，因为在转化之后进行优化有很大的优势：这样我们可以在编译为WasmGC的所有语言之间共享通用优化的编译链代码。下图展示了这一点：


![多个WasmGC编译链由Binaryen优化器优化](/_img/wasm-gc-porting/workflows2.svg "左边的几种语言编译为中间的WasmGC，所有数据流向Binaryen优化器（wasm-opt）")

由于我们可以在编译为WasmGC之后进行通用优化，Wasm到Wasm的优化器可以帮助所有WasmGC编译链。因此，V8团队在[Binaryen](https://github.com/WebAssembly/binaryen/)中投资了WasmGC，所有编译链都可以使用它作为`wasm-opt`命令行工具。我们将在下一小节着重讨论这一点。

### 编译链优化

[Binaryen](https://github.com/WebAssembly/binaryen/)，这是WebAssembly优化器项目，已经对WasmMVP内容（如内联、常量传播、死代码消除等）提供了[广泛的优化](https://www.youtube.com/watch?v=_lLqZR4ufSI)，几乎所有这些优化也适用于WasmGC。然而，正如我们之前提到的，WasmGC允许我们进行比WasmMVP更多的优化，因此我们也相应编写了许多新的优化：

- [逃逸分析](https://github.com/WebAssembly/binaryen/blob/main/src/passes/Heap2Local.cpp)：将堆分配移至局部变量。
- [去虚拟化](https://github.com/WebAssembly/binaryen/blob/main/src/passes/ConstantFieldPropagation.cpp)：将间接调用转换为直接调用（随后可能被内联）。
- [更强大的全局死代码消除](https://github.com/WebAssembly/binaryen/pull/4621)。
- [全局类型感知的程序内容流分析（GUFA）](https://github.com/WebAssembly/binaryen/pull/4598)。
- [类型转换优化](https://github.com/WebAssembly/binaryen/blob/main/src/passes/OptimizeCasts.cpp)：例如移除冗余类型转换并将其提前到更早位置。
- [类型修剪](https://github.com/WebAssembly/binaryen/blob/main/src/passes/GlobalTypeOptimization.cpp)。
- [类型合并](https://github.com/WebAssembly/binaryen/blob/main/src/passes/TypeMerging.cpp)。
- 类型精细化（用于[局部变量](https://github.com/WebAssembly/binaryen/blob/main/src/passes/LocalSubtyping.cpp)、[全局变量](https://github.com/WebAssembly/binaryen/blob/main/src/passes/GlobalRefining.cpp)、[字段](https://github.com/WebAssembly/binaryen/blob/main/src/passes/TypeRefining.cpp)和[签名](https://github.com/WebAssembly/binaryen/blob/main/src/passes/SignatureRefining.cpp)）。

这只是我们正在进行的一些工作的简短列表。关于Binaryen的新GC优化及其使用方法的更多信息，请参阅[Binaryen文档](https://github.com/WebAssembly/binaryen/wiki/GC-Optimization-Guidebook)。

为了衡量Binaryen中所有这些优化的效果，让我们看看使用和不使用`wasm-opt`的Java性能，测试基于将Java编译为WasmGC的[J2Wasm](https://github.com/google/j2cl/tree/master/samples/wasm)编译器的输出：

![使用和未使用wasm-opt时的Java性能](/_img/wasm-gc-porting/benchmark1.svg "Box2D、DeltaBlue、RayTrace和Richards基准测试全集显示使用wasm-opt后性能提升")

这里，“未使用wasm-opt”表示我们未运行Binaryen的优化，但仍在虚拟机和J2Wasm编译器中进行了优化。如图所示，`wasm-opt`在每个基准中都提供了显著的加速，平均使其**快1.9倍**。

总结来说，`wasm-opt` 可以被任何编译到 WasmGC 的工具链使用，并避免在每一个工具链中重新实现通用优化的需要。此外，随着我们继续改进 Binaryen 的优化，所有使用 `wasm-opt` 的工具链都会受益，就像对 LLVM 的改进会帮助所有使用 LLVM 编译到 WasmMVP 的语言一样。

工具链优化只是整体的一部分。正如我们接下来会看到的，在 Wasm 虚拟机中的优化也至关重要。

### V8 优化

正如我们提到的，WasmGC 比 WasmMVP 更容易优化，并且不仅工具链能从中受益，虚拟机也可以。这非常重要，因为垃圾回收语言（GC 语言）与编译到 WasmMVP 的语言不同。举例来说，在内联（Inlining）这一最重要的优化之一中，像 C、C++ 和 Rust 此类语言在编译时进行内联，而像 Java 和 Dart 此类 GC 语言通常运行在一个能够在运行时进行内联和优化的虚拟机中。这种性能模型影响了语言设计以及人们如何在 GC 语言中编写代码。

例如，在像 Java 这样的语言中，所有调用一开始都是间接调用（一个子类可以覆盖父类的函数，即使是通过父类类型的引用来调用子类时）。每当工具链可以将间接调用转换为直接调用时，我们都会受益，但在现实中的 Java 程序中，许多代码模式实际上包含大量间接调用，或者至少无法静态地推断为直接调用。为了很好地处理这些情况，我们在 V8 中实现了 **推测内联（speculative inlining）**，也就是说，在运行时记录间接调用的情况，如果发现某个调用点的行为相对简单（调用目标少），我们便在适当的保护检查下进行内联，这比完全将这些事情留给工具链处理更接近 Java 的正常优化方式。

实际数据验证了这种方法。我们测试了 Google Sheets 计算引擎的性能，这是一个用来计算电子表格公式的 Java 代码库，该代码库此前是通过 [J2CL](https://j2cl.io) 编译为 JavaScript 的。V8 团队与 Sheets 和 J2CL 团队合作，将这段代码移植到 WasmGC，一方面是因为预期 Sheets 的性能提升，另一方面是为 WasmGC 规范过程提供有用的实际反馈。从性能角度看，推测内联是我们在 V8 中为 WasmGC 实现的最重要的单个优化，正如下图所示：


![Java 性能在不同 V8 优化下的表现](/_img/wasm-gc-porting/benchmark2.svg "WasmGC 延迟：无优化、其他优化、推测内联，以及推测内联 + 其他优化。最显著的性能提升是添加推测内联。")

这里的“其他优化”指的是除了推测内联之外的优化，我们为了测量目的而关闭了这些优化，包括：负载消除（load elimination）、基于类型的优化（type-based optimizations）、分支消除（branch elimination）、常量折叠（constant folding）、逃逸分析（escape analysis）、以及公共子表达式消除（common subexpression elimination）。“无优化”意味着关闭了上述所有优化以及推测内联（但 V8 中还有其他优化，我们无法轻易关闭；因此这里的数字只是一个近似值）。推测内联带来的性能大幅提升——大约 **30%** 的加速（！）——相比所有其他优化的总和，显示了内联优化在编译的 Java 上的重要性。

除了推测内联之外，WasmGC 基于 V8 中现有的 Wasm 支持，因此可以从相同的优化管道、寄存器分配、分层编译等等中获益。除此之外，WasmGC 的特定方面还可以通过额外的优化获益，其中最明显的是优化 WasmGC 提供的新指令，例如实现高效的类型转换。此外，我们还做了一项重要的工作：在优化器中利用 WasmGC 的类型信息。例如，`ref.test` 在运行时检查引用是否是特定类型，在这样的检查成功之后，我们知道 `ref.cast`（对相同类型的强制类型转换）也一定会成功。这对于优化 Java 中的如下模式是有帮助的：

```java
if (ref instanceof Type) {
  foo((Type) ref); // 这个向下类型转换可以被消除。
}
```

这些优化在推测内联之后尤为有用，因为在这种情况下我们观察到比工具链在生成 Wasm 时更多的信息。

总体而言，在 WasmMVP 中，工具链和虚拟机优化之间有着相当清晰的分工：我们在工具链中尽可能多地完成优化，只把必要的部分留给虚拟机，这样也更简化了虚拟机的设计。而在 WasmGC 中，这种平衡可能会有所变化，因为我们看到对 GC 语言需要在运行时做更多优化，而且 WasmGC 本身也更容易优化，这使得工具链与虚拟机的优化之间有更多的重叠。观察生态系统在这方面的发展会非常有趣。

## 演示和现状

你现在可以使用 WasmGC！在 W3C 达到[第四阶段](https://github.com/WebAssembly/meetings/blob/main/process/phases.md#4-standardize-the-feature-working-group)后，WasmGC 现在已成为一个完整的最终标准，而 Chrome 119 已经支持它。通过该浏览器（或任何其他支持 WasmGC 的浏览器；例如，Firefox 120 预计将在本月晚些时候发布，支持 WasmGC），你可以运行这个 [Flutter 演示](https://flutterweb-wasm.web.app/)，其中 Dart 编译为 WasmGC 驱动应用的逻辑，包括其小部件、布局和动画。

![Flutter 演示在 Chrome 119 中运行。](/_img/wasm-gc-porting/flutter-wasm-demo.png "由 Flutter WasmGC 渲染的 Material 3。")

## 入门

如果你对使用 WasmGC 感兴趣，以下链接可能对你有帮助：

- 目前多个工具链已经支持 WasmGC，包括 [Dart](https://flutter.dev/wasm)、[Java (J2Wasm)](https://github.com/google/j2cl/blob/master/docs/getting-started-j2wasm.md)、[Kotlin](https://kotl.in/wasmgc)、[OCaml (wasm_of_ocaml)](https://github.com/ocaml-wasm/wasm_of_ocaml)、和 [Scheme (Hoot)]( https://gitlab.com/spritely/guile-hoot)。
- 我们在开发者工具部分展示输出的小程序的[源代码](https://gist.github.com/kripken/5cd3e18b6de41c559d590e44252eafff)是一个手工编写“hello world” WasmGC 程序的示例。（特别是你可以看到定义的 `$Node` 类型然后使用 `struct.new` 创建它。）
- Binaryen 的 wiki 提供了关于编译器如何生成高效优化的 WasmGC 代码的[文档](https://github.com/WebAssembly/binaryen/wiki/GC-Implementation---Lowering-Tips)。前面提到的各种面向 WasmGC 的工具链链接也很有学习价值，例如，你可以查看 Binaryen 的 passes 和 flags，参见 [Java](https://github.com/google/j2cl/blob/8609e47907cfabb7c038101685153d3ebf31b05b/build_defs/internal_do_not_use/j2wasm_application.bzl#L382-L415)、[Dart](https://github.com/dart-lang/sdk/blob/f36c1094710bd51f643fb4bc84d5de4bfc5d11f3/sdk/bin/dart2wasm#L135)、和 [Kotlin](https://github.com/JetBrains/kotlin/blob/f6b2c642c2fff2db7f9e13cd754835b4c23e90cf/libraries/tools/kotlin-gradle-plugin/src/common/kotlin/org/jetbrains/kotlin/gradle/targets/js/binaryen/BinaryenExec.kt#L36-L67)。

## 总结

WasmGC 是在 WebAssembly 中实现 GC 语言的一种新颖且有前景的方法。在某些情况下，通过重新编译虚拟机到 Wasm 的传统移植方式仍然是最合理的选项，但我们希望因其优势，WasmGC 移植技术能成为更受欢迎的选择：WasmGC 移植程序的体积可以比传统移植程序更小——甚至比用 C、C++ 或 Rust 写的 WasmMVP 程序还小——并且在循环收集、内存使用、开发者工具等方面能更好地与 Web 集成。WasmGC 还是一种更具优化能力的表示形式，这可以提供显著的速度优势以及更好地在不同语言之间共享工具链开发工作的机会。

