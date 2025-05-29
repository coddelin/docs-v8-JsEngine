---
title: "V8发布v6.2"
author: "V8团队"
date: 2017-09-11 13:33:37
tags:
  - 发布
description: "V8 v6.2包括性能改进、更多JavaScript语言特性、增加的最大字符串长度等内容。"
---
每六周，我们都会按照[发布流程](/docs/release-process)创建一个新的V8分支。每个版本都会在Chrome Beta里程碑之前直接从V8的Git主分支分支出来。今天我们很高兴地宣布我们的最新分支，[V8版本6.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.2)，它将在几周内随Chrome 62 Stable协调发布前处于测试阶段。V8 v6.2为开发者带来了各种各样的好东西。这篇文章提供了一些亮点的预览，以期待正式发布。

<!--truncate-->
## 性能改进

[`Object#toString`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString)的性能之前已被认定为一个潜在瓶颈，因为它经常被类似[lodash](https://lodash.com/)和[underscore.js](http://underscorejs.org/)这样的流行库和像[AngularJS](https://angularjs.org/)这样的框架使用。诸如[`_.isPlainObject`](https://github.com/lodash/lodash/blob/6cb3460fcefe66cb96e55b82c6febd2153c992cc/isPlainObject.js#L13-L50)、[`_.isDate`](https://github.com/lodash/lodash/blob/6cb3460fcefe66cb96e55b82c6febd2153c992cc/isDate.js#L8-L25)、[`angular.isArrayBuffer`](https://github.com/angular/angular.js/blob/464dde8bd12d9be8503678ac5752945661e006a5/src/Angular.js#L739-L741)或[`angular.isRegExp`](https://github.com/angular/angular.js/blob/464dde8bd12d9be8503678ac5752945661e006a5/src/Angular.js#L680-L689)等各种辅助函数经常用于应用程序和库代码中执行运行时类型检查。

随着ES2015的出现，`Object#toString`通过新的[`Symbol.toStringTag`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag)符号可以被猴子补丁化，这也使得`Object#toString`变得更为复杂、更难加速。在本次发布中，我们将最初在[SpiderMonkey JavaScript引擎](https://bugzilla.mozilla.org/show_bug.cgi?id=1369042#c0)中实现的一项优化移植到V8中，大幅提高`Object#toString`的吞吐量，性能提升达**6.5倍**。

![](/_img/v8-release-62/perf.svg)

它还对Speedometer浏览器基准测试特别是AngularJS子测试产生了影响，我们测得了3%的显著改进。阅读[详细博客文章](https://ponyfoo.com/articles/investigating-performance-object-prototype-to-string-es2015)以获取更多信息。

![](/_img/v8-release-62/speedometer.svg)

我们还显著提高了[ES2015代理](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)的性能，将通过`someProxy(params)`或`new SomeOtherProxy(params)`调用代理对象的速度提升了最多**5倍**：

![](/_img/v8-release-62/proxy-call-construct.svg)

同样，通过`someProxy.property`访问代理对象属性的性能也提高了近**6.5倍**：

![](/_img/v8-release-62/proxy-property.svg)

这是一项正在进行的实习项目的一部分。敬请期待更详细的博客文章和最终结果。

我们还很高兴地宣布，由于[Peter Wong](https://twitter.com/peterwmwong)的[贡献](https://chromium-review.googlesource.com/c/v8/v8/+/620150)，[`String#includes`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes)内置函数的性能自上一个版本以来提高了超过**3倍**。

内部哈希表的哈希码查找速度大幅加快，从而提高了`Map`、`Set`、`WeakMap`和`WeakSet`的性能。一篇即将发布的博客文章将详细解释这一优化。

![](/_img/v8-release-62/hashcode-lookups.png)

垃圾收集器现在使用[并行收集器](https://bugs.chromium.org/p/chromium/issues/detail?id=738865)来收集堆的所谓年轻代。

## 增强的低内存模式

在过去的几个版本中，V8的低内存模式得到了增强（例如通过[将初始半空间大小设置为512 KB](https://chromium-review.googlesource.com/c/v8/v8/+/594387)）。低内存设备现在更少遇到内存不足的情况。然而，这种低内存行为可能对运行时性能产生负面影响。

## 更多的正则表达式功能

默认启用了[正则表达式的`dotAll`模式](https://github.com/tc39/proposal-regexp-dotall-flag)，通过`s`标志启用。在`dotAll`模式下，正则表达式中的`.`原子可以匹配任意字符，包括行终止符。

```js
/foo.bar/su.test('foo\nbar'); // true
```

[后置断言](https://github.com/tc39/proposal-regexp-lookbehind)，另一个新的正则表达式特性，现在默认可用。名称已经很好地描述了它的意义。后置断言提供了一种将模式限制为仅在其前面有后置组中指定模式时匹配的方法。它同时提供匹配和非匹配两种风味：

```js
/(?<=\$)\d+/.exec('1美元约合¥123'); // ['1']
/(?<!\$)\d+/.exec('1美元约合¥123'); // ['123']
```

关于这些功能的更多详细信息，请参阅我们的博客文章[即将到来的正则表达式功能](https://developers.google.com/web/updates/2017/07/upcoming-regexp-features)。

## 模板字面量修订

[根据相关提案](https://tc39.es/proposal-template-literal-revision)，模板字面量中的转义序列限制已被放宽。这使得模板标签有了新的使用场景，例如编写一个LaTeX处理器。

```js
const latex = (strings) => {
  // …
};

const document = latex`
\newcommand{\fun}{\textbf{有趣!}}
\newcommand{\unicode}{\textbf{Unicode!}}
\newcommand{\xerxes}{\textbf{国王!}}
h上面的 breve 在 \u{h}处 // 非法标记!
`;
```

## 增加最大字符串长度

64位平台上的最大字符串长度从 `2**28 - 16` 增加到 `2**30 - 25` 个字符。

## Full-codegen 已移除

在V8 v6.2中，旧的管道的最后几个主要部分已经移除。在此次发布中删除了超过30K行的代码——这是减少代码复杂性的一次显著胜利。

## V8 API

请查看我们的[API更改摘要](https://docs.google.com/document/d/1g8JFi8T_oAE_7uAri7Njtig7fKaPDfotU6huOa1alds/edit)。该文档在每次主要发布后会定期更新。

拥有[活跃的V8检出版本](/docs/source-code#using-git)的开发者可以使用 `git checkout -b 6.2 -t branch-heads/6.2` 来试验V8 v6.2中的新功能。或者，您可以[订阅Chrome Beta频道](https://www.google.com/chrome/browser/beta.html)，并很快亲自试用新功能。
