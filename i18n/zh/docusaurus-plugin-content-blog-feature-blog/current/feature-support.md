---
title: '功能支持'
permalink: /features/support/
layout: layouts/base.njk
description: '本文档解释了在V8网站上使用的JavaScript和WebAssembly语言功能支持列表。'
---
# JavaScript/Wasm 功能支持

[我们的JavaScript和WebAssembly语言功能解释](/features)通常包括如下的功能支持列表：

<feature-support chrome="71"
                 firefox="65"
                 safari="12"
                 nodejs="12"
                 babel="yes"></feature-support>

没有任何支持的功能看起来像这样：

<feature-support chrome="no"
                 firefox="no"
                 safari="no"
                 nodejs="no"
                 babel="no"></feature-support>

对于前沿功能，在不同环境下常常可以看到混合支持：

<feature-support chrome="partial"
                 firefox="yes"
                 safari="yes"
                 nodejs="no"
                 babel="yes"></feature-support>

目标是提供一个功能成熟度的快速概览，不仅限于V8和Chrome，还包括更广泛的JavaScript生态系统。请注意，这不仅限于像V8这样的活跃开发的JavaScript虚拟机中的原生实现，还包括工具支持，这里用[Babel](https://babeljs.io/)图标表示。

<!--truncate-->
Babel条目涵盖了多种含义：

- 对于语法语言功能，例如[class fields](/features/class-fields)，它指代转译支持。
- 对于作为新API的语言功能，例如[`Promise.allSettled`](/features/promise-combinators#promise.allsettled)，它指代polyfill支持。（Babel通过[core-js项目](https://github.com/zloirock/core-js)提供polyfills。）

Chrome图标表示V8、Chromium以及基于Chromium的浏览器。
