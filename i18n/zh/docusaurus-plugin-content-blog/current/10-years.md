---
title: "庆祝V8发布十周年"
author: "Mathias Bynens（[@mathias](https://twitter.com/mathias)），V8历史学者"
avatars:
  - "mathias-bynens"
date: 2018-09-11 19:00:00
tags:
  - 基准测试
description: "概述V8项目在过去10年中的主要里程碑，以及在项目仍处于保密阶段时的早期发展。"
tweet: "1039559389324238850"
---
本月标志着不仅是谷歌浏览器发布的十周年，同时也是V8项目发布的十周年。这篇文章概述了V8项目在过去10年中的主要里程碑，以及项目仍处于保密阶段时的早期发展。

<!--truncate-->
<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/G0vnrPTuxZA" width="640" height="360" loading="lazy"></iframe>
  </div>
  <figcaption>使用<a href="http://gource.io/"><code>gource</code></a>创建的V8代码库随时间变化的可视化。</figcaption>
</figure>

## 在V8发布之前：早期岁月

谷歌在**2006**年秋季聘请了[Lars Bak](https://en.wikipedia.org/wiki/Lars_Bak_%28computer_programmer%29)，让他为谷歌浏览器开发一款全新的JavaScript引擎。当时，谷歌浏览器仍是谷歌内部的秘密项目。Lars刚刚从硅谷回到丹麦奥胡斯。由于那里没有谷歌办公室且Lars想继续留在丹麦，Lars和几位项目的初始工程师在他的农场的一幢附属建筑里开始了项目的开发。这款新的JavaScript运行时被命名为“V8”，这是对经典肌肉车强劲引擎的一种幽默引用。后来，随着V8团队的壮大，开发人员从他们简陋的工作地点搬到了奥胡斯的一座现代化办公室，但团队仍秉持着专注于打造全球最快JavaScript运行时的独特驱动力。

## V8的发布与发展

V8在[谷歌浏览器发布](https://blog.chromium.org/2008/09/welcome-to-chromium_02.html)的同一天，即**2008**年的9月2日，开放了源代码。[首个提交](https://chromium.googlesource.com/v8/v8/+/43d26ecc3563a46f62a0224030667c8f8f3f6ceb)可以追溯到2008年6月30日。在此日期之前，V8的开发是在一个私有CVS仓库中进行的。起初，V8仅支持ia32和ARM指令集，并使用[SCons](https://scons.org/)作为其构建系统。

**2009**年推出了一款全新的正则表达式引擎，名为[Irregexp](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html)，显著提高了实际使用中的正则表达式性能。随着x64移植的引入，支持的指令集数量从两种增加到三种。2009年还标志着[Node.js项目的首次发布](https://github.com/nodejs/node-v0.x-archive/releases/tag/v0.0.1)，该项目将V8嵌入其中。V8可以被非浏览器项目嵌入的可能性在原始的谷歌浏览器漫画中[明确提到](https://www.google.com/googlebooks/chrome/big_16.html)。随着Node.js的实际实现，它成为了最受欢迎的JavaScript生态系统之一。

**2010**年，随着V8引入全新的优化JIT编译器，运行时性能得到了重大提升。[Crankshaft](https://blog.chromium.org/2010/12/new-crankshaft-for-v8.html)生成的机器码比之前（未命名）的V8编译器快了两倍，且体积减少了30%。同年，V8新增了第四个指令集：32位MIPS。

**2011**年，垃圾回收性能得到了极大的提升。[新引入的增量垃圾回收器](https://blog.chromium.org/2011/11/game-changer-for-interactive.html)大幅减少了暂停时间，同时保持了卓越的峰值性能和低内存使用率。V8提出了孤立体（Isolates）的概念，使嵌入者可以在一个进程中创建多个V8运行时实例，为谷歌浏览器中轻量级Web Workers铺平了道路。V8进行了首次构建系统迁移，从SCons转向[GYP](https://gyp.gsrc.io/)。我们实现了对ES5严格模式的支持。同时，开发工作从奥胡斯搬到了慕尼黑（德国），并在新引领团队的领导下与原团队成员密切合作。

**2012** 对于 V8 项目来说是一个具有里程碑意义的一年。团队进行了速度冲刺，以优化通过 [SunSpider](https://webkit.org/perf/sunspider/sunspider.html) 和 [Kraken](https://krakenbenchmark.mozilla.org/) 基准测试套件测量的 V8 性能。之后，我们开发了一个名为 [Octane](https://chromium.github.io/octane/) 的新基准测试套件（以 [V8 Bench](http://www.netchain.com/Tools/v8/) 为核心），它将性能竞争推到了最前沿，并刺激了所有主要 JS 引擎在运行时和 JIT 技术上的重大改进。这些努力的一个成果是将 V8 运行时分析器中用于检测 “热” 函数的随机采样方法切换为基于计数的确定性技术。这显著降低了某些页面加载（或基准测试运行）随机变慢的可能性。

**2013** 出现了一个名为 [asm.js](http://asmjs.org/) 的 JavaScript 低级子集。由于 asm.js 仅限于静态类型的算术、函数调用以及仅包含原始类型的堆访问，因此经过验证的 asm.js 代码可以以可预测的性能运行。我们发布了 Octane 的新版本 [Octane 2.0](https://blog.chromium.org/2013/11/announcing-octane-20.html)，其中包括现有基准测试的更新以及针对 asm.js 等使用场景的新基准测试。Octane 推动了诸如 [分配折叠](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/42478.pdf) 和 [基于分配站点的类型转换和预分配优化](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/43823.pdf) 等新编译器优化的发展，显著提高了峰值性能。作为我们内部昵称为 “Handlepocalypse” 的一部分，V8 Handle API 被完全重写，使其更易于正确和安全地使用。同样在 2013 年，Chrome 的 `TypedArray`s JavaScript 实现 [从 Blink 移动到了 V8](https://codereview.chromium.org/13064003)。

**2014** 年，V8 将部分 JIT 编译工作移至主线程之外，通过 [并行编译](https://blog.chromium.org/2014/02/compiling-in-background-for-smoother.html) 减少卡顿并显著改善性能。当年晚些时候，我们 [推出](https://github.com/v8/v8/commit/a1383e2250dc5b56b777f2057f1600537f02023e) 了一种新的优化编译器的初始版本，名为 TurboFan。同时，我们的合作伙伴帮助将 V8 移植到三种新的指令集架构：PPC、MIPS64 和 ARM64。继 Chromium 之后，V8 转换到了另一个构建系统 [GN](https://gn.googlesource.com/gn/#gn)。V8 测试基础设施进行了显著改进，现在有一个 _Tryserver_ 可用于在各种构建机器人上测试每个补丁的登陆之前。至于版本控制，V8 从 SVN 迁移到 Git。

**2015** 是 V8 许多方面繁忙的一年。我们实现了 [代码缓存和脚本流式处理](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html)，显著加快了网页加载时间。我们针对运行时系统使用分配记忆体的工作在 [ISMM 2015](https://ai.google/research/pubs/pub43823) 上发表。当年晚些时候，我们 [启动了](https://github.com/v8/v8/commit/7877c4e0c77b5c2b97678406eab7e9ad6eba4a4d) 新解释器 Ignition 的开发工作。我们尝试了通过 [强模式](https://docs.google.com/document/d/1Qk0qC4s_XNCLemj42FqfsRLp49nDQMZ1y7fwf5YjaI4/view) 子集化 JavaScript 的方法以实现更强的保证和更可预测的性能。我们在标志后实现了强模式，但后来发现其收益不足以抵消成本。增设一个 [提交队列](https://dev.chromium.org/developers/testing/commit-queue) 显著提高了生产力和稳定性。V8 的垃圾回收器还与嵌入者（例如 Blink）开始合作，以便在空闲期间安排垃圾回收工作。[空闲垃圾回收](/blog/free-garbage-collection) 显著减少了可观察到的垃圾回收卡顿和内存消耗。12 月，[第一个 WebAssembly 原型](https://github.com/titzer/v8-native-prototype) 在 V8 中登陆。

在 **2016** 年，我们完成了 ES2015（以前称为“ES6”）功能集的最后几个部分的发布（包括 promises、类语法、词法作用域、解构以及更多），并且还发布了一些 ES2016 的功能。我们还开始推出新的 Ignition 和 TurboFan 流水线，用它来[编译和优化 ES2015 和 ES2016 的功能](/blog/v8-release-56)，并默认为[低端 Android 设备](/blog/ignition-interpreter)启用 Ignition。我们成功的关于空闲时间垃圾回收的工作在 [PLDI 2016](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/45361.pdf) 中进行展示。我们启动了[Orinoco 项目](/blog/orinoco)，这是一个新的主要并行和并发的垃圾收集器，用于 V8 来减少主线程垃圾收集时间。在一个重大的重新聚焦中，我们将性能优化的重点从合成微基准测试转向更为严谨的[真实世界性能](/blog/real-world-performance)测量和优化。在调试方面，V8 inspector 从 Chromium [迁移](/blog/v8-release-55)到 V8，使得任何 V8 嵌入器（而不仅仅是 Chromium）都可以使用 Chrome 开发者工具来调试在 V8 上运行的 JavaScript。WebAssembly 原型从原型阶段毕业到实验性支持，与其他浏览器供应商协调推出了[WebAssembly 实验性支持](/blog/webassembly-experimental)。V8 获得了 [ACM SIGPLAN 编程语言软件奖](http://www.sigplan.org/Awards/Software/)。并且添加了另一个移植平台：S390。

在 **2017** 年，我们最终完成了对引擎的多年改造，默认启用了新的 [Ignition 和 TurboFan](/blog/launching-ignition-and-turbofan) 流水线。这使我们后来可以从代码库中移除 Crankshaft ([删除了 130,380 行代码](https://chromium-review.googlesource.com/c/v8/v8/+/547717)) 和 [Full-codegen](https://chromium-review.googlesource.com/c/v8/v8/+/584773)。我们发布了 Orinoco v1.0，包括[并发标记](/blog/concurrent-marking)、并发清扫、并行垃圾回收和并行压缩。我们正式将 Node.js 认可为与 Chromium 同级的 V8 嵌入者。从那时起，如果某个 V8 补丁会导致 Node.js 测试套件失败，就不可能被通过和合并。我们的基础设施获得了正确性模糊测试支持，确保任何一段代码在无论哪种配置下运行都能产生一致的结果。

在一个全行业协调的发布中，V8 [启用了 WebAssembly 的默认支持](/blog/v8-release-57)。我们实现了 [JavaScript 模块](/features/modules)支持以及完整的 ES2017 和 ES2018 功能集（包括异步函数、共享内存、异步迭代、剩余/展开属性以及正则表达式功能）。我们发布了[原生支持 JavaScript 代码覆盖](/blog/javascript-code-coverage)，并推出了 [Web 工具基准测试](/blog/web-tooling-benchmark)，帮助我们测量 V8 的优化如何影响真实世界开发者工具及其生成的 JavaScript 输出的性能。[从 JavaScript 对象到 C++ DOM 对象的包装追踪](/blog/tracing-js-dom)，以及反向追踪，让我们能够解决 Chrome 中长期存在的内存泄漏问题，并有效地处理 JavaScript 和 Blink 堆上的对象的传递闭包。我们随后使用该基础设施来提高堆快照开发工具的功能。

**2018** 年，一次全行业范围的安全事件——[Spectre/Meltdown 漏洞](https://googleprojectzero.blogspot.com/2018/01/reading-privileged-memory-with-side.html)的公开披露颠覆了我们对 CPU 信息安全的认知。V8 工程师进行了广泛的主动攻击研究，以帮助理解对托管语言的威胁，并开发缓解措施。V8 发布了针对 Spectre 和类似侧信道攻击的[缓解措施](/docs/untrusted-code-mitigations)，以保护运行不可信代码的嵌入器。

最近，我们发布了一款名为 [Liftoff](/blog/liftoff) 的 WebAssembly 基线编译器，大幅减少了 WebAssembly 应用的启动时间，同时仍然实现了可预测的性能。我们发布了 [`BigInt`](/blog/bigint)，这是一种新的 JavaScript 原始类型，可以支持[任意精度整数](/features/bigint)。我们实现了[嵌入的内置函数](/blog/embedded-builtins)，并使其可以[惰性反序列化](/blog/lazy-deserialization)，显著减少了 V8 对多个隔离的内存占用。我们实现了[在后台线程编译脚本字节码](/blog/background-compilation)。我们启动了[统一 V8-Blink 堆项目](https://docs.google.com/presentation/d/12ZkJ0BZ35fKXtpM342PmKM5ZSxPt03_wsRgbsJYl3Pc)，以同步运行跨组件的 V8 和 Blink 垃圾回收。今年尚未结束……

## 性能起伏

Chrome 的 V8 Bench 分数历年来显示了 V8 变化对性能的影响。（我们使用 V8 Bench，因为这是少数仍然可以在最初的 Chrome beta 版本中运行的基准之一。）

![2008 年到 2018 年 Chrome 的 [V8 Bench](http://www.netchain.com/Tools/v8/) 分数](/_img/10-years/v8-bench.svg)

过去十年，我们在此基准测试中的分数提升了 **4 倍**！

然而，你可能会注意到多年来出现了两次性能下降。这两次性能下降都非常有趣，因为它们与 V8 历史上的重要事件有关联。2015 年的性能下降发生在 V8 发布 ES2015 功能的基线版本时。这些功能广泛影响了 V8 的代码库，因此我们在初始发布时优先考虑正确性，而不是性能。我们接受了这些轻微的速度回退，以尽快将功能提供给开发者。在 2018 年初，Spectre 漏洞被披露，V8 发布了缓解措施以保护用户免受潜在攻击，这导致性能再次下降。幸运的是，现在 Chrome 正在发布 [网站隔离](https://developers.google.com/web/updates/2018/07/site-isolation)，我们可以再次禁用这些缓解措施，从而恢复性能。

从此图表中还可以看出，大约在2013年开始趋于平稳。这是否意味着V8放弃了并停止在性能上的投入？恰恰相反！图表的平稳代表了V8团队从优化合成的微基准测试（如V8 Bench和Octane）转向优化[真实世界性能](/blog/real-world-performance)的转变。V8 Bench 是一项古老的基准测试，它既不使用任何现代JavaScript功能，也无法接近实际的生产代码。相比之下，更近代的 Speedometer 基准测试套件则不同：

![Chrome 从2013年至2018年的 [Speedometer 1](https://browserbench.org/Speedometer/) 得分](/_img/10-years/speedometer-1.svg)

虽然从2013年至2018年，V8 Bench的提升很小，但我们在 Speedometer 1 上的得分在这段时间内提高了（又）**4倍**。（我们使用了 Speedometer 1，因为 Speedometer 2 使用了2013年尚未支持的现代JavaScript功能。）

如今，我们有了[更好的](/blog/speedometer-2) [基准测试](/blog/web-tooling-benchmark)，能够更准确地反映现代JavaScript应用程序，除此之外，我们还[主动测量并优化现有的Web应用程序](https://www.youtube.com/watch?v=xCx4uC7mn6Y)。

## 总结

尽管V8最初是为Google Chrome构建的，但它一直是一个独立的项目，具有单独的代码库和嵌入API，允许任何程序使用其JavaScript执行服务。在过去的10年中，这个项目的开放性不仅使其成为Web平台的关键技术，也在像Node.js这样的其他领域中发挥了重要作用。在此过程中，V8项目不断演变，尽管经历了许多变化和显著增长，仍然保持相关性。

最初，V8只支持两种指令集。在过去的10年中，支持的平台列表扩大到八种：ia32、x64、ARM、ARM64、32位和64位MIPS、64位PPC以及S390。V8的构建系统从SCons迁移到GYP再到GN。项目从丹麦迁移到了德国，现在在全球范围内拥有工程师，包括伦敦、山景城和旧金山，还有许多来自非Google地区的贡献者。我们将整个JavaScript编译管线从无名组件转变为Full-codegen（一个基线编译器）和Crankshaft（一个反馈驱动的优化编译器），再到Ignition（一个解释器）和TurboFan（一个更好的反馈驱动优化编译器）。V8从“仅仅”是一个JavaScript引擎发展到还支持WebAssembly。JavaScript语言本身从ECMAScript 3发展到ES2018；最新的V8甚至实现了后ES2018的功能。

Web的发展历程悠久绵长。庆祝Chrome和V8的10岁生日是一个很好的机会来反思，即使这是一个重要的里程碑，Web平台的历程已持续了25年以上。我们毫不怀疑Web的故事在未来至少会继续这么长的时间。我们致力于确保V8、JavaScript和WebAssembly仍然是这个叙事中的有趣角色。我们对接下来的十年充满期待。敬请关注！
