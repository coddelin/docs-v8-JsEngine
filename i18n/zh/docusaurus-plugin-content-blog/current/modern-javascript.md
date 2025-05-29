---
title: 'ES2015、ES2016及更高版本'
author: 'V8团队，ECMAScript爱好者'
date: 2016-04-29 13:33:37
tags:
  - ECMAScript
description: 'V8 v5.2支持ES2015和ES2016！'
---
V8团队非常重视JavaScript语言的演进，使其成为一个能够表达更多内容且定义完善的语言，从而让编写快速、安全和正确的网络应用变得轻松。2015年6月，[ES2015规范](https://www.ecma-international.org/ecma-262/6.0/)由TC39标准委员会正式通过，这是JavaScript语言史上最大的一次更新。新特性包括[类](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)、[箭头函数](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)、[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)、[迭代器/生成器](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators)、[代理](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)、[知名符号](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Well-known_symbols)以及额外的语法糖。TC39还加快了新规格的发布步伐，并于2016年2月发布了[ES2016候选草案](https://tc39.es/ecma262/2016/)，预计在夏季正式通过。虽然由于较短的发布时间周期，ES2016的更新没有ES2015那么全面，但它引入了[指数运算符](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Arithmetic_Operators#Exponentiation)和[`Array.prototype.includes`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes)。

<!--truncate-->
今天，我们达到了一个重要里程碑：**V8支持ES2015和ES2016**。您现在可以在Chrome Canary中使用这些新的语言特性，它们将在Chrome 52中默认发布。

由于规范演进的性质、不同类型一致性测试之间的差异以及维护网络兼容性的复杂性，确定JavaScript引擎完全支持某一版本的ECMAScript可能会很困难。阅读本文，了解为什么规范支持比版本号更复杂，为什么正确尾调用仍在讨论中，以及有哪些限制仍然存在。

## 演进中的规范

当TC39决定更频繁地发布JavaScript规范更新时，语言的最新版本成为主要的草稿版本。虽然ECMAScript规范版本仍然每年生成并通过批准，V8实现了最新通过的版本（例如ES2015）、某些足够接近标准化且安全实施的功能（例如ES2016候选草案中的指数运算符和`Array.prototype.includes()`），以及来自更新草案的错误修复和网络兼容性修正。采用这种方式的部分原因是浏览器中的语言实现应该与规范匹配，即使需要更新的是规范。实际上，实现通过的规范版本的过程经常发现构成下一版本规范的许多修复和澄清。

![当前正在发布的演进中的ECMAScript规范部分](/_img/modern-javascript/shipped-features.png)

例如，在实现ES2015[正则表达式粘性标志](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky)时，V8团队发现ES2015规范的语义会破坏许多现有站点（包括使用流行的[XRegExp库](https://github.com/slevithan/xregexp)2.x.x版本的所有站点）。由于兼容性是网络的基石，来自V8和Safari JavaScriptCore团队的工程师[提出了一项修正](https://github.com/tc39/ecma262/pull/511)正则表达式规范的建议来解决这种破坏，TC39同意了该修正。该修正不会出现在ES2017之前的批准版本中，但它仍然是ECMAScript语言的一部分，我们已经实施了它以便发布正则表达式粘性标志。

语言规范的不断完善，以及每个版本（包括尚未正式批准的草案）替代、修正和澄清了之前的版本，使得ES2015和ES2016的支持背后的复杂性难以理解。虽然无法简洁地说明，但最准确的说法可能是_V8支持符合“不断维护的未来ECMAScript标准草案”_！

## 测量一致性

为了理清这一规范的复杂性，目前有多种方法可以衡量JavaScript引擎与ECMAScript标准的兼容性。V8团队以及其他浏览器厂商使用[Test262测试套件](https://github.com/tc39/test262)作为符合不断维护的未来ECMAScript标准的金标准。这个测试套件不断更新以匹配规范，并提供了16000个独立的功能测试，用于测试所有构成兼容且合规的JavaScript实现的功能和边缘情况。目前，V8通过了约98%的Test262测试，剩下的2%是一些极少数的边缘情况和尚未准备好发布的未来ES功能。

由于难以浏览大量的Test262测试，还存在其它的合规测试，比如[Kangax兼容性表](http://kangax.github.io/compat-table/ES2015/)。Kangax使得人们可以轻松浏览某个特定功能（例如[箭头函数](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)）是否已经在某个引擎中实现，但不测试Test262所涵盖的所有合规边缘情况。目前，Chrome Canary在ES2015的Kangax表格上得分为98%，在Kangax中与ES2016相关的部分（例如ESnext选项卡下标注为“2016 features”和“2016 misc”的部分）得分为100%。

Kangax ES2015表格剩下的2%测试[正确尾调用](http://www.2ality.com/2015/06/tail-call-optimization.html)，这是一项在V8中已实现但在Chrome Canary中因下文详述的开发者体验问题而有意关闭的功能。启用“Experimental JavaScript features”标志（强制开启该功能）后，Canary在ES2015的Kangax表格上的得分将为100%。

## 正确尾调用

正确尾调用已经实现但尚未发布，因为对该功能的变更[目前正在TC39讨论中](https://github.com/tc39/proposal-ptc-syntax)。ES2015规定严格模式下尾位置函数调用永远不会导致堆栈溢出。尽管对于某些编程模式这是一个有用的保证，但当前语义存在两个问题。首先，由于尾调用消除是隐式的，[程序员很难识别](http://2ality.com/2015/06/tail-call-optimization.html#checking-whether-a-function-call-is-in-a-tail-position)哪些函数实际上处于尾调用位置。这意味着开发者可能直到堆栈溢出才会发现程序中尾调用放置错误。其次，实现正确尾调用需要从堆栈中省略尾调用堆栈帧，这丢失了执行流的信息。这又导致了以下两个后果：

1. 调试时堆栈显示出现不连续部分，使得理解程序如何执行到当前点更为困难，
2. [`error.stack`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Stack) 包含的执行流信息减少，这可能会破坏收集和分析客户端错误的遥测软件。

实现一个[影子堆栈](https://bugs.webkit.org/attachment.cgi?id=274472&action=review)可以提高调用堆栈的可读性，但V8和DevTools团队认为，调试时显示的堆栈完全确定且始终与虚拟机堆栈的真实状态相一致是最简单、最可靠且最准确的调试方式。此外，影子堆栈在性能上代价过高，无法始终启用。

基于这些原因，V8团队强烈支持通过特殊语法表示正确尾调用。TC39中有一个待定提案[syntactic tail calls](https://github.com/tc39/proposal-ptc-syntax)，由Mozilla和微软的委员会成员共同支持。我们已经实现并阶段性完成了ES2015规范中指定的正确尾调用，并开始实施新提案中指定的语法尾调用。在默认发布隐式正确尾调用或语法尾调用之前，V8团队计划在下次TC39会议上解决该问题。与此同时，您可以使用V8标志`--harmony-tailcalls`和`--harmony-explicit-tailcalls`测试每个版本。**更新：**这些标志已被移除。

## 模块

ES2015最令人兴奋的承诺之一是支持JavaScript模块，以将应用程序的不同部分组织并分隔到各自的命名空间中。ES2015规定了[`import`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)和[`export`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export)声明用于模块，但未规定模块如何加载到JavaScript程序中。在浏览器中，加载行为最近通过[`<script type="module">`](https://blog.whatwg.org/js-modules)进行了规定。尽管需要额外的标准化工作来指定高级动态模块加载API，但Chromium对模块脚本标签的支持已经在[开发中](https://groups.google.com/a/chromium.org/d/msg/blink-dev/uba6pMr-jec/tXdg6YYPBAAJ)。您可以通过[启动问题](https://bugs.chromium.org/p/v8/issues/detail?id=1569)跟踪实现工作，或者在[whatwg/loader](https://github.com/whatwg/loader)仓库中阅读有关实验性加载器API想法的更多信息。

## ESnext及未来

未来，开发者可以期待ECMAScript更新以更小、更频繁的更新形式出现，并伴随着更短的实现周期。V8团队已经在努力将即将推出的功能带入运行时，例如[`async`/`await`](https://github.com/tc39/ecmascript-asyncawait)关键字，[`Object.values`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/values)/[`Object.entries`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries)，[`String.prototype.{padStart,padEnd}`](http://tc39.es/proposal-string-pad-start-end/)以及[RegExp向后查找](/blog/regexp-lookbehind-assertions)。请持续关注我们关于ESnext实现进展和现有ES2015以及ES2016+功能性能优化的更新。

我们致力于继续发展JavaScript，并在早期实现新功能、确保现有网页的兼容性和稳定性，以及就设计问题向TC39提供实现反馈之间取得适当平衡。我们期待看到开发者利用这些新功能构建出的非凡体验。
