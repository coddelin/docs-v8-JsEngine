---
title: 'V8如何衡量真实世界的性能'
author: 'V8团队'
date: 2016-12-21 13:33:37
tags:
  - 基准测试
description: 'V8团队开发了一种新方法来衡量和理解真实的JavaScript性能。'
---
在过去的一年里，V8团队开发了一种新方法来衡量和理解真实的JavaScript性能。我们利用从中获得的洞察力改变了V8团队加速JavaScript的方法。我们新的真实世界关注点代表了从传统性能关注点的重大转变。我们相信，当我们在2017年继续应用这一方法时，它将显著提高用户和开发人员在Chrome和Node.js中对V8真实世界JavaScript性能的依赖性。

<!--truncate-->
“衡量的东西会得到改善”这一古老格言在JavaScript虚拟机（VM）开发领域尤其适用。选择合适的指标来指导性能优化是VM团队随时能做的最重要的事情之一。以下时间线大致说明了自V8初次发布以来JavaScript基准测试如何演变：

![JavaScript基准测试的演变](/_img/real-world-performance/evolution.png)

历史上，V8和其他JavaScript引擎通过合成基准测试来衡量性能。最初，VM开发人员使用了诸如[SunSpider](https://webkit.org/perf/sunspider/sunspider.html)和[Kraken](http://krakenbenchmark.mozilla.org/)的微基准测试。随着浏览器市场的成熟，第二个基准测试时代开始了，这期间使用了更大的但仍然是合成的测试套件，如[Octane](http://chromium.github.io/octane/)和[JetStream](http://browserbench.org/JetStream/)。

微基准测试和静态测试套件有一些优点：它们容易启动、易于理解，并能在任何浏览器中运行，使比较分析变得简单。但这种便利也带来了一些弊端。由于它们包含的测试用例数量有限，很难设计出能准确反映整个网页特征的基准测试。此外，基准测试通常更新不频繁，因此它们往往难以跟上JavaScript开发中的新趋势和模式。最后，多年来VM作者探索了传统基准测试的每一个角落，并在此过程中发现并利用了通过在基准测试执行过程中重新整理甚至跳过外部不可观察工作的机会来提高基准测试分数。这种以基准测试分数为驱动的改进和为基准测试过度优化往往无法为用户或开发人员提供太多实际好处，而历史表明，从长期来看，很难制作出“不可操纵”的合成基准测试。

## 测量真实网站：WebPageReplay与运行时调用统计

基于传统静态基准测试只能展示性能故事一部分的直觉，V8团队着手通过基准测试实际网站的加载来测量真实的性能。我们希望衡量反映终端用户实际浏览网页方式的用例，因此我们决定从像Twitter、Facebook和Google Maps这样的网站中提取性能指标。利用名为[WebPageReplay](https://github.com/chromium/web-page-replay)的Chrome基础设施，我们能够确定性地记录和重放网页加载。

与此同时，我们开发了一款名为运行时调用统计（Runtime Call Stats）的工具，可以让我们分析不同的JavaScript代码如何加重不同V8模块的负担。首次，我们不仅能够轻松地针对真实网站测试V8的更改，还能完全理解在不同工作负载下V8为何以及如何表现出不同的性能。

我们现在通过一个大约25个网站的测试套件来监控变化，以指导V8的优化。除了前述网站和来自Alexa Top 100的其他网站，我们还选择了使用常见框架（如React、Polymer、Angular、Ember等等）实现的网站，不同地理区域的网站，以及开发团队与我们合作的网站或库，例如Wikipedia、Reddit、Twitter和Webpack。我们相信，这25个网站能代表整个网络，并且这些网站的性能改进能直接反映到如今JavaScript开发者编写的网站上的类似性能提升。

有关我们的测试套件和运行时调用统计工具开发的深入演讲，请参阅[BlinkOn 6关于真实世界性能的演讲](https://www.youtube.com/watch?v=xCx4uC7mn6Y)。您甚至可以[自己运行运行时调用统计工具](/docs/rcs)。

## 实现真正的改变

通过使用运行时调用统计分析这些新的、真实世界的性能指标，并将其与传统基准进行比较，我们更加深入地了解了各种工作负载对V8的不同压力方式。

根据这些测量结果，我们发现Octane性能实际上是大多数25个测试网站性能的一个较差的代理。如下图所示：Octane的彩条分布与其他工作负载非常不同，特别是与那些真实世界的网站相比。当运行Octane时，V8的瓶颈通常是JavaScript代码的执行。然而，大多数真实世界的网站更多地对V8的解析器和编译器施加压力。我们意识到，为了Octane进行的优化往往对真实世界网页没有影响，有些情况下甚至[使得真实世界网站更慢](https://benediktmeurer.de/2016/12/16/the-truth-about-traditional-javascript-benchmarks/#a-closer-look-at-octane)。

![在Chrome 57上运行Octane的所有时间分布、运行Speedometer项目的时间分布以及加载我们测试套件中网站的时间分布](/_img/real-world-performance/startup-distribution.png)

我们还发现另一个基准对于真实网站而言实际上是一个更好的代理。 [Speedometer](http://browserbench.org/Speedometer/)，一个WebKit基准，其中包括使用React、Angular、Ember和其他框架编写的应用程序，展示了与25个网站非常相似的运行时特征。尽管没有任何基准能够完全匹配真实网页的精度，但我们认为Speedometer比Octane更能模拟现代JavaScript在网络上的真实工作负载。

## 底线：让所有人都体验更快的V8

在过去的一年中，通过真实网站测试套件和运行时调用统计工具，我们能够实现V8性能优化，使网页加载速度平均提高了10-20%。鉴于Chrome历史上对页面加载优化的关注，2016年在这一指标上的两位数提升是一个重要的成就。同样的优化还使我们在Speedometer上的得分提高了20-30%。

这些性能改进应该反映在其他使用现代框架和类似JavaScript模式的网页中。我们对`Object.create`和[`Function.prototype.bind`](https://benediktmeurer.de/2015/12/25/a-new-approach-to-function-prototype-bind/)等内置函数的改进、对象工厂模式的优化、针对V8的[内联缓存](https://en.wikipedia.org/wiki/Inline_caching)的工作以及持续的解析器改进，旨在为所有开发者使用的被忽视的JavaScript领域带来普遍适用的改进，而不仅仅是我们跟踪的代表性网站。

我们计划扩大使用真实网站来指导V8性能工作。请关注更多关于基准和脚本性能的洞见。
