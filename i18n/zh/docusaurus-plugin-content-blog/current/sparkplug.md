---
title: "Sparkplug——一种非优化的JavaScript编译器"
author: "[Leszek Swirski](https://twitter.com/leszekswirski)——也许不是最聪明的火花，但至少是最快的一个"
avatars: 
  - leszek-swirski
date: 2021-05-27
tags: 
  - JavaScript
extra_links: 
  - href: "https://fonts.googleapis.com/css?family=Gloria+Hallelujah&display=swap"
    rel: "stylesheet"
description: "在V8 v9.1中，我们通过Sparkplug改进了V8的性能，提升了5-15%。Sparkplug是一款新的非优化JavaScript编译器。"
tweet: "1397945205198835719"
---

<!-- markdownlint-capture -->
<!-- markdownlint-disable no-inline-html -->
<style>
  svg \{
    --other-frame-bg: rgb(200 200 200 / 20%);
    --machine-frame-bg: rgb(200 200 200 / 50%);
    --js-frame-bg: rgb(212 205 100 / 60%);
    --interpreter-frame-bg: rgb(215 137 218 / 50%);
    --sparkplug-frame-bg: rgb(235 163 104 / 50%);
  \}
  svg text \{
    font-family: Gloria Hallelujah, cursive;
  \}
  .flipped .frame \{
    transform: scale(1, -1);
  \}
  .flipped .frame text \{
    transform:scale(1, -1);
  \}
</style>
<!-- markdownlint-restore -->

<!--truncate-->
编写高性能JavaScript引擎不仅仅需要拥有一个高度优化的编译器，例如TurboFan。尤其是对于短暂的会话，比如加载网站或命令行工具，有很多工作是在优化编译器甚至还没开始优化之前完成的，更不用说有时间生成优化后的代码了。

这就是自2016年以来，我们从追踪合成基准测试（例如Octane）转向测量[真实世界性能](/blog/real-world-performance)的原因，从那时起，我们就致力于提高JavaScript在优化编译器之外的性能。这包括对解析器、流媒体、我们的对象模型、垃圾收集器中的并发性、缓存编译代码等的工作……可以说我们从来没有感到无聊。

然而，当我们致力于改进初始JavaScript执行的性能时，我们开始在优化解释器方面遇到瓶颈。V8的解释器是高度优化且非常快速的，但解释器本身存在一些我们无法消除的开销，比如字节码解码开销或调度开销，这些是解释器功能的固有部分。

有了当前的两编译器模式，我们无法更快地升级到优化代码；我们可以（并正在）努力使优化速度更快，但到某个时候，只有通过删除优化过程才能变得更快，而这会降低峰值性能。更糟的是，我们无法更早开始优化，因为那时我们的对象形态反馈还不够稳定。

这时候就轮到Sparkplug登场了：我们随V8 v9.1发布的新的非优化JavaScript编译器，它恰好介于Ignition解释器和TurboFan优化编译器之间。

![新的编译器流程图](/_svg/sparkplug/pipeline.svg)

## 一个快速的编译器

Sparkplug旨在以极快的速度进行编译。非常快。快到我们几乎可以随时编译，使我们比生成TurboFan代码更积极地升级到Sparkplug代码。

使Sparkplug编译器变快的有几个技巧。首先，它作弊；它编译的函数已经被编译成字节码，字节码编译器已经完成了大部分繁重的工作，例如变量解析、确定括号是否是真正的箭头函数、简化解构语句等等。Sparkplug从字节码而不是JavaScript源代码进行编译，因此无需担心这些问题。

第二个技巧是Sparkplug不像大多数编译器那样生成任何中间表示（IR）。相反，Sparkplug在字节码上进行单线性遍历时直接编译成机器代码，生成与字节码执行匹配的代码。事实上，整个编译器是一个[`switch`语句](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/baseline/baseline-compiler.cc;l=465;drc=55cbb2ce3be503d9096688b72d5af0e40a9e598b)嵌套在一个[`for`循环](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/baseline/baseline-compiler.cc;l=290;drc=9013bf7765d7febaa58224542782307fa952ac14)内，其功能是将字节码映射到固定的每字节码机器代码生成函数。

```cpp
// Sparkplug编译器（简略版）。
for (; !iterator.done(); iterator.Advance()) {
  VisitSingleBytecode();
}
```

缺乏中间表示语言（IR）意味着编译器的优化机会有限，仅限于非常局部的窥孔优化。此外，这也意味着我们必须单独将整个实现移植到我们支持的每一种架构上，因为没有中间的与架构无关的阶段。但是，事实证明，这些都不是问题：快速的编译器就是简单的编译器，因此代码非常容易移植；而且Sparkplug无需进行大量优化，因为我们在管道的后续阶段已经有一个强大的优化编译器。

::: 注意
从技术上讲，我们目前对字节码进行了两次遍历——一次是发现循环，另一场是生成实际代码。不过，我们计划最终去掉第一遍。
:::

## 与解释器兼容的帧

为成熟的JavaScript虚拟机添加一个新的编译器是一项艰巨的任务。除了标准执行之外，还有各种事情需要支持；V8具有调试器、堆栈遍历CPU分析器，还有异常的堆栈跟踪、与分级性能提升的集成、对热循环替换为优化代码的在堆栈上替换…这些工作量很大。

Sparkplug通过巧妙的手法简化了大多数问题，那就是它维护了“与解释器兼容的堆栈帧”。

让我们回顾一下。堆栈帧是代码执行存储函数状态的方式；每当您调用一个新函数时，它都会为该函数的局部变量创建一个新的堆栈帧。堆栈帧由一个帧指针（标记其开始）和一个堆栈指针（标记其结束）定义：

![一个堆栈帧，带有堆栈和帧指针](/_svg/sparkplug/basic-frame.svg)

::: 注意
<!-- markdownlint-capture -->
<!-- markdownlint-disable no-inline-html -->
这时，大概你们当中的一半人会尖叫，说“这个图表没有意义，堆栈显然是向相反方向增长的！”别担心，我为你做了一个按钮：<button id="flipStacksButton">我认为堆栈是向上增长的</button>
<script src="/js/sparkplug.js">
</script>
<!-- markdownlint-restore -->
:::

当一个函数被调用时，返回地址被压入堆栈；在该函数返回时，从堆栈弹出该地址以知道返回到哪里。然后，当该函数创建一个新帧时，它会将旧帧指针保存到堆栈上，并将新帧指针设置为其自身堆栈帧的开始。因此，堆栈有一系列帧指针，每个帧指针标记一个帧的开头，并指向上一个帧的开始：

![多个调用的堆栈帧](/_svg/sparkplug/machine-frame.svg)

::: 注意
严格来说，这只是生成代码遵循的一种约定，而不是强制要求。然而，这几乎是一个普遍的约定；唯一打破它的是完全省略堆栈帧的情况，或者使用调试辅助表来遍历堆栈帧的情况。
:::

这是所有类型函数的一般堆栈布局；然后还有关于参数如何传递以及函数如何在其帧中存储值的约定。在V8中，我们对于JavaScript帧的约定是，在调用函数之前，参数（包括接收者）[按逆序](/blog/adaptor-frame)压入堆栈，并且堆栈上的前几个槽位是：当前调用的函数；调用时的上下文；以及传递的参数数量。这是我们的“标准”JavaScript帧布局：

![一个V8 JavaScript堆栈帧](/_svg/sparkplug/js-frame.svg)

这种JavaScript调用约定在优化框架和解释框架之间是共享的，这也是为什么我们在调试工具的性能面板中对代码进行分析时，可以以最小的开销遍历堆栈。

在Ignition解释器的情况下，这种约定变得更加明确。Ignition是基于寄存器的解释器，这意味着它有虚拟寄存器（不要与机器寄存器混淆！）来存储解释器的当前状态——包括JavaScript函数的局部变量（var/let/const 声明）和临时值。这些寄存器存储在解释器的堆栈帧上，以及指向正在执行的字节码数组的指针，以及该数组内当前字节码的偏移量：

![一个V8解释器堆栈帧](/_svg/sparkplug/interpreter-frame.svg)

Sparkplug有意创建并维护一个与解释器帧匹配的帧布局；任何时候解释器会存储一个寄存器值，Sparkplug也会存储一个。这样做有几个原因：

1. 这简化了Sparkplug编译；Sparkplug可以直接镜像解释器的行为，而无需从解释器寄存器到Sparkplug状态进行某种映射。
1. 它还提高了编译速度，因为字节码编译器已经完成了分配寄存器的工作。
1. 它使与系统其余部分的集成几乎变得微不足道；调试器、分析器、异常堆栈展开、堆栈跟踪打印，所有这些操作都通过堆栈遍历来发现当前正在执行的函数堆栈，并且所有这些操作在Sparkplug中几乎保持不变，因为从它们的角度来看，它们只有一个解释器帧。
1. 它使得栈上替换（OSR）变得非常简单。OSR是在当前执行的函数在执行过程中被替换；目前这种情况会发生在一个解释执行的函数处于热循环中时（此时它会升级到该循环的优化代码），以及当优化代码降级时（此时它会降级并在解释器中继续执行函数）。由于Sparkplug的帧与解释器帧一致，任何适用于解释器的OSR逻辑都可以适用于Sparkplug; 更好的是，我们可以几乎零帧翻译开销地在解释器和Sparkplug代码之间切换。

我们对解释器栈帧做了一个小小的改动，那就是在Sparkplug代码执行期间，我们不再实时更新字节码的偏移量。取而代之的是，我们存储了一个从Sparkplug代码地址范围到对应字节码偏移量的双向映射；这是一个相对简单的映射，因为Sparkplug代码是从对字节码的线性遍历直接生成的。每当栈帧访问想知道Sparkplug帧的“字节码偏移量”时，我们就在此映射中查找当前正在执行的指令并返回对应的字节码偏移量。同样，每当我们想从解释器OSR到Sparkplug时，也可以在映射中查找当前字节码偏移量，并跳转到对应的Sparkplug指令。

您可能会注意到，现在在栈帧上有一个未使用的插槽，它通常存储字节码偏移量；但我们不能移除这个插槽，因为我们希望保持栈的其他部分不变。我们重新利用了这个栈插槽，将其用来缓存当前执行函数的“反馈向量”；这个向量存储了对象形状数据，并且在大多数操作中需要加载。我们所需要做的仅仅是在OSR期间稍加小心，确保为这个插槽交换正确的字节码偏移量或正确的反馈向量。

因此，Sparkplug栈帧如下所示：

![一个V8 Sparkplug栈帧](/_svg/sparkplug/sparkplug-frame.svg)

## 委托给内建函数

Sparkplug实际上并没有生成太多自己的代码。JavaScript的语义非常复杂，即使是实现最简单的操作也会需要大量代码。如果强迫Sparkplug在每次编译时内联重新生成这些代码，会产生多个不利影响：

  1. 需要生成的大量代码会显著增加编译时间，
  2. 会增加Sparkplug代码的内存消耗，
  3. 我们需要重新为Sparkplug实现一堆JavaScript功能的代码生成，这可能会导致更多的BUG和更大的安全隐患。

因此，大多数Sparkplug代码仅仅是调用“内建函数”，这些内建函数是嵌入到二进制文件中的小段机器代码，用于完成实际的繁琐工作。这些内建函数要么是与解释器使用的完全相同，要么至少与解释器的字节码处理程序代码大部分共享。

实际上，Sparkplug代码基本上只是内建函数调用和控制流：

您可能会想，“那么，这一切的意义是什么？Sparkplug不就是在做与解释器一样的工作吗？”—— 您这么说也并非完全错误。从许多方面来看，Sparkplug“只是”解释器执行的一种序列化，它调用相同的内建函数，并维护相同的栈帧。然而，即便只是这样也值得，因为它消除了（或更准确地说，预编译了）那些无法移除的解释器开销，比如操作数解码和字节码切换。

事实证明，解释器会削弱许多CPU优化：静态操作数被解释器动态从内存读取，这迫使CPU要么中断，要么预测这些值可能是什么；切换到下一个字节码要求分支预测成功才能保持性能，即使推测和预测是正确的，你仍然需要执行所有这些解码和切换代码，还占用了缓存和缓冲区中的宝贵空间。从某种意义上说，CPU本身就是一个解释器，只不过是用来解释机器代码的；从这种角度看，Sparkplug是一个从Ignition字节码到CPU字节码的“转译器”，将您的函数从运行在一个“模拟器”中转移到在“本机”运行。

## 性能

那么，Sparkplug在现实生活中表现如何？我们用几个基准测试，在我们的几台性能测试机器人上，分别在启用和不启用Sparkplug的情况下运行了Chrome 91，看它的影响如何。

剧透一下：我们非常满意。

::: 提示
以下基准测试列出了运行各种操作系统的各种测试机器人。虽然操作系统在机器人的名称中显眼，但我们认为它实际上对结果的影响不大。相反，不同的机器还有不同的CPU和内存配置，我们相信这些配置是差异的主要来源。
:::

# Speedometer

[Speedometer](https://browserbench.org/Speedometer2.0/) 是一个基准测试，试图通过使用几个流行的框架构建一个待办事项清单跟踪的web应用，并在添加和删除待办事项时压力测试该应用的性能，来模拟真实世界网站框架的使用。我们发现它非常能够反映真实世界的加载和交互行为，并且我们多次发现，Speedometer的改进也反映在我们的真实世界指标中。

使用Sparkplug后，Speedometer得分提升了5-10%，具体取决于我们查看的是哪个机器人。

![使用 Sparkplug 后 Speedometer 分数的中位数改进，来自多个性能机器人。误差线表示四分位范围。](/_img/sparkplug/benchmark-speedometer.svg)

# 浏览基准测试

Speedometer 是一个很棒的基准测试，但它只展示了部分情况。我们另外还有一组“浏览基准测试”，这些基准测试是一些真实网站的录制，我们可以重放、脚本化一些交互，并更真实地观察我们各种指标在实际应用中的表现。

在这些基准测试中，我们选择关注我们的“V8 主线程时间”指标，该指标测量在主线程中 V8 所花费的总时间（包括编译和执行时间），排除流式解析或后台优化编译时间。这是我们查看 Sparkplug 效益，同时排除其他基准噪音影响的最佳方式。

结果差异较大，且依赖于机器和网站，但总体来说表现很好：我们观察到大约 5-15% 的改进。

::: 图表 我们的浏览基准测试中 10 次重复条件下 V8 主线程时间的中位数改进。误差线表示四分位范围。
![Linux 性能机器人结果](/_img/sparkplug/benchmark-browsing-linux-perf.svg) ![Win-10 性能机器人结果](/_img/sparkplug/benchmark-browsing-win-10-perf.svg) ![Mac-10_13 高端笔记本性能机器人结果](/_img/sparkplug/benchmark-browsing-mac-10_13_laptop_high_end-perf.svg) ![Mac-10_12 低端笔记本性能机器人结果](/_img/sparkplug/benchmark-browsing-mac-10_12_laptop_low_end-perf.svg) ![Mac-M1 Mini 2020 性能机器人结果](/_img/sparkplug/benchmark-browsing-mac-m1_mini_2020-perf.svg)
:::

总结：V8 有了一个新的超快速非优化编译器，其在实际基准测试中提升了 V8 性能 5-15%。它已经在 V8 v9.1 中通过 `--sparkplug` 标志提供，我们将在 Chrome 91 中逐步推出。
