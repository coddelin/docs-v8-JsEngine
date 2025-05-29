---
title: 'Chrome欢迎Speedometer 2.0！'
author: '来自Blink和V8团队'
date: 2018-01-24 13:33:37
tags:
  - 基准测试
description: '基于Speedometer 2.0，概述我们在Blink和V8中迄今为止所进行的性能改进。'
tweet: '956232641736421377'
---
自从Speedometer 1.0于2014年首次发布以来，Blink和V8团队一直将其作为衡量流行JavaScript框架实际使用的基准测试，我们在该基准测试中取得了显著的加速成效。我们通过对比真实网站进行独立验证，证实了这些改进确实给用户带来了实际好处，数据显示流行网站的页面加载时间的改善也提高了Speedometer的得分。

<!--truncate-->
与此同时，JavaScript迅速演变，通过ES2015和后续标准加入了许多新的语言特性。同样，各种框架本身也在演变，因此Speedometer 1.0随着时间推移变得过时。使用Speedometer 1.0作为优化指标可能导致无法衡量那些正在积极使用的新代码模式的风险。

Blink和V8团队欢迎[更新版Speedometer 2.0基准测试的最近发布](https://webkit.org/blog/8063/speedometer-2-0-a-benchmark-for-modern-web-app-responsiveness/)。将原始概念应用于当代框架、转译器和ES2015特性列表，使得这个基准测试再次成为优化的理想候选。Speedometer 2.0是[我们真实世界性能基准工具箱](/blog/real-world-performance)中的一大亮点。

## Chrome迄今的表现

Blink和V8团队已经完成了第一轮的改进，突显了这项基准测试对我们的重要性，并延续了我们关注真实世界性能的旅程。将2017年7月的Chrome 60与最新的Chrome 64进行比较，我们在配备中2016年款Macbook Pro（4核，16GB RAM）上的总得分（每分钟运行次数）实现了约21%的性能提升。

![Chrome 60与64间Speedometer 2得分的比较](/_img/speedometer-2/scores.png)

让我们深入到Speedometer 2.0的各个项目。通过改进[`Function.prototype.bind`](https://chromium.googlesource.com/v8/v8/+/808dc8cff3f6530a627ade106cbd814d16a10a18)，我们将React运行时的性能提高了一倍。由于[加速JSON解析](https://chromium-review.googlesource.com/c/v8/v8/+/700494)和各种其他性能修复，Vanilla-ES2015、AngularJS、Preact和VueJS的性能提升了19%-42%。通过对Blink DOM实现的改进（包括[更轻量的表单控件](https://chromium.googlesource.com/chromium/src/+/f610be969095d0af8569924e7d7780b5a6a890cd)和[我们的HTML解析器的调整](https://chromium.googlesource.com/chromium/src/+/6dd09a38aaae9c15adf5aad966f761f180bf1cef)），jQuery-TodoMVC应用的运行时得以减少。结合V8的内联缓存的额外调整和优化编译器，在各个方面均获得了改进。

![从Chrome 60到64，Speedometer 2中每个子测试的得分改进](/_img/speedometer-2/improvements.png)

与Speedometer 1.0相比，Speedometer 2.0评分计算有了显著变化。此前所有分数的平均值更倾向于只针对最慢的项目进行优化。当我们查看每个项目的绝对耗时时，发现例如EmberJS-Debug版本所耗时间约是最快基准测试的35倍。因此，为了提升总分，专注于EmberJS-Debug的优化具有最大潜力。

![](/_img/speedometer-2/time.png)

Speedometer 2.0使用几何平均值作为最终得分计算，更倾向于在每个框架上进行均衡投入。让我们再看看我们之前提到的对Preact的16.5%的改进。如果因为其对总时间贡献较小而忽视这16.5%的改进，那么这未免太不公平了。

我们期待为Speedometer 2.0以及整个网络带来进一步的性能改进。请继续关注更多的性能提升干货。
