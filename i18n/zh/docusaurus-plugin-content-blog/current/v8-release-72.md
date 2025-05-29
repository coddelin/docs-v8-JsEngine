---
title: "V8 发布 v7.2"
author: "Andreas Haas，陷阱处理者"
avatars:
  - andreas-haas
date: 2018-12-18 11:48:21
tags:
  - 发布
description: "V8 v7.2 具有高速 JavaScript 解析、更快的 async-await、IA32 平台下的内存消耗减少、公共类字段及更多功能！"
tweet: "1074978755934863361"
---
每六周，我们会根据我们的[发布流程](/docs/release-process)创建一个新的 V8 分支。每个版本都在 Chrome Beta 的里程碑之前从 V8 的 Git 主分支分出。今天我们很高兴宣布最新的分支 [V8 版本 7.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.2)，其将在未来几周与 Chrome 72 稳定版同步发布。目前处于 Beta 状态。V8 v7.2 充满了各种面向开发者的好功能。这篇文章提供了即将发布的亮点预览。

<!--truncate-->
## 内存

[嵌入式内建函数](/blog/embedded-builtins)现在支持并默认在 IA32 架构上启用。

## 性能

### JavaScript 解析

平均来说，网页启动时花费的 V8 时间中有 9.5% 用于解析 JavaScript。因此，我们重点优化了 V8 并在 v7.2 中实现了最快的 JavaScript 解析器。解析速度显著提高。从 v7.0 开始，桌面端的解析速度大约提高了 30%。以下图表记录了最近几个月中我们在 Facebook 实际加载基准测试中的令人印象深刻的改进。

![Facebook.com 上的 V8 解析时间（越低越好）](/_img/v8-release-72/facebook-parse-time.png)

我们在不同的情况下都集中关注了解析器。以下图表显示了相对于最新 v7.2 版本在几个常见网站上的改进。

![相对于 V8 v7.2 的解析时间（越低越好）](/_img/v8-release-72/relative-parse-times.svg)

总之，最近的改进使解析时间的平均占比从 9.5% 降低到 7.5%，从而加快了加载时间，使页面响应更快。

### `async`/`await`

V8 v7.2 提供了[更快的 `async`/`await` 实现](/blog/fast-async#await-under-the-hood)，默认启用。我们提出了[规范提案](https://github.com/tc39/ecma262/pull/1250)，目前正在收集网络兼容性数据，以便将更改正式合并到 ECMAScript 规范中。

### 展开元素

当展开元素出现在数组字面量的前面，例如 `[...x]` 或 `[...x, 1, 2]` 时，V8 v7.2 显著提高了性能。此改进适用于展开数组、原始字符串、集合、映射键、映射值，以及由此扩展的 `Array.from(x)`。有关更多详细信息，请参阅[我们关于加速展开元素的深入文章](/blog/spread-elements)。

### WebAssembly

我们分析了一些 WebAssembly 基准测试并利用它们指导顶级执行层的代码生成改进。特别是，V8 v7.2 在优化编译器的调度器中启用了节点拆分，并在后端引入了循环旋转。此外，我们改进了包装器缓存并引入了自定义包装器，从而减少调用导入的 JavaScript 数学函数的开销。此外，我们设计了一些寄存器分配器的更改，这些更改提高了将在以后的版本中实现的许多代码模式的性能。

### 陷阱处理器

陷阱处理器提高了 WebAssembly 代码的一般吞吐量。它们已经在 V8 v7.2 中实现并可用于 Windows、macOS 和 Linux。它们已经在 Chromium 的 Linux 上启用。当稳定性得到确认后，Windows 和 macOS 也将开启。目前我们正在努力让它们在 Android 上也可用。

## 异步堆栈跟踪

正如[之前提到的](/blog/fast-async#improved-developer-experience)，我们添加了一项称为[零成本异步堆栈跟踪](https://bit.ly/v8-zero-cost-async-stack-traces)的新功能，它通过异步调用帧丰富了 `error.stack` 属性。目前可以通过 `--async-stack-traces` 命令行标志启用。

## JavaScript 语言功能

### 公共类字段

V8 v7.2 增加了对[公共类字段](/features/class-fields)的支持。以往的写法如下：

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}

class Cat extends Animal {
  constructor(name) {
    super(name);
    this.likesBaths = false;
  }
  meow() {
    console.log('喵喵！');
  }
}
```

现在可以这样写：

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}

class Cat extends Animal {
  likesBaths = false;
  meow() {
    console.log('喵喵！');
  }
}
```

对[私有类字段](/features/class-fields#private-class-fields)的支持计划在未来的 V8 版本中实现。

### `Intl.ListFormat`

V8 v7.2 增加了对[`Intl.ListFormat` 提案](/features/intl-listformat)的支持，从而启用列表的本地化格式化。

```js
const lf = new Intl.ListFormat('en');
lf.format(['Frank']);
// → 'Frank'
lf.format(['Frank', 'Christine']);
// → 'Frank and Christine'
lf.format(['Frank', 'Christine', 'Flora']);
// → 'Frank, Christine, and Flora'
lf.format(['Frank', 'Christine', 'Flora', 'Harrison']);
// → 'Frank, Christine, Flora, and Harrison'
```

欲了解更多信息和使用示例，请查看[我们的 `Intl.ListFormat` 说明文档](/features/intl-listformat)。

### 合理格式的 `JSON.stringify`

`JSON.stringify` 现在为独立代理添加了转义序列，使其输出为有效的 Unicode（可以用 UTF-8 表示）：

```js
// 旧行为：
JSON.stringify('\uD800');
// → '"�"'

// 新行为：
JSON.stringify('\uD800');
// → '"\\ud800"'
```

欲了解更多信息，请参阅[我们的合理格式 `JSON.stringify` 说明文档](/features/well-formed-json-stringify)。

### 模块命名空间导出

在[JavaScript 模块](/features/modules)中，已经可以使用以下语法：

```js
import * as utils from './utils.mjs';
```

然而，以前并不存在对称的 `export` 语法...[直到现在](/features/module-namespace-exports)：

```js
export * as utils from './utils.mjs';
```

这等同于以下内容：

```js
import * as utils from './utils.mjs';
export { utils };
```

## V8 API

请使用 `git log branch-heads/7.1..branch-heads/7.2 include/v8.h` 获取 API 变更列表。

拥有[活跃的 V8 checkout](/docs/source-code#using-git) 的开发者可以使用 `git checkout -b 7.2 -t branch-heads/7.2` 对 V8 v7.2 的新功能进行实验。或者，您可以[订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，并很快自己尝试新功能。
