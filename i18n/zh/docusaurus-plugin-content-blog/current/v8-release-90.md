---
title: "V8 发布 v9.0"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))，站内分享"
avatars:
 - "ingvar-stepanyan"
date: 2021-03-17
tags:
 - 发布
description: "V8 v9.0 发布，新增支持正则表达式匹配索引，并带来多种性能改进。"
tweet: "1372227274712494084"
---
每六周，我们会按照[发布流程](https://v8.dev/docs/release-process)创建一个新的 V8 分支。每个版本都会在 Chrome Beta 里程碑发布之前从 V8 的 Git 主分支分出。今天我们很高兴地宣布我们的最新分支 [V8 版本 9.0](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.0)。此版本目前处于 Beta 阶段，将在几周后与 Chrome 90 稳定版同时发布。V8 v9.0 包含了各种对开发者友好的新功能。这篇文章将提前预览一些亮点。

<!--truncate-->
## JavaScript

### 正则表达式匹配索引

从 v9.0 开始，开发者可以选择获取正则表达式匹配中捕获组的起始和结束位置数组。当正则表达式带有 `/d` 标志时，这个数组可以通过匹配对象的 `.indices` 属性获得。

```javascript
const re = /(a)(b)/d;      // 注意 /d 标志。
const m = re.exec('ab');
console.log(m.indices[0]); // 索引 0 是整个匹配。
// → [0, 2]
console.log(m.indices[1]); // 索引 1 是第一个捕获组。
// → [0, 1]
console.log(m.indices[2]); // 索引 2 是第二个捕获组。
// → [1, 2]
```

请参阅[我们的说明文档](https://v8.dev/features/regexp-match-indices)了解详细信息。

### 更快的 `super` 属性访问

通过使用 V8 的内联缓存系统和 TurboFan 的优化代码生成，访问 `super` 属性（例如 `super.x`）已得到优化。通过这些改进，`super` 属性访问的性能现已接近普通属性访问，如下图所示。

![对比 super 属性访问与普通属性访问的性能优化图](/_img/fast-super/super-opt.svg)

请参阅[专门的博客文章](https://v8.dev/blog/fast-super)了解更多详情。

### 禁止 `for ( async of`

最近发现并[修复](https://chromium-review.googlesource.com/c/v8/v8/+/2683221)了一个[语法歧义问题](https://github.com/tc39/ecma262/issues/2034)。

现在不再解析 `for ( async of` 语法结构。

## WebAssembly

### 更快的 JS 到 Wasm 调用

V8 为 WebAssembly 和 JavaScript 函数的参数使用了不同的表示方式。因此，当 JavaScript 调用导出的 WebAssembly 函数时，此调用需要通过所谓的 *JS-to-Wasm 包装器*，负责在 JavaScript 和 WebAssembly 之间调整参数和结果。

然而，这增加了性能开销，使 JavaScript 到 WebAssembly 的调用不如 JavaScript 到 JavaScript 的调用快。为了尽量减少这种开销，JS-to-Wasm 包装器现在可以在调用现场内联，简化代码并移除额外的帧。

假设我们有一个用于将两个双精度浮点数相加的 WebAssembly 函数，如下所示：

```cpp
double addNumbers(double x, double y) {
  return x + y;
}
```

然后我们从 JavaScript 调用它来相加一些向量（用类型化数组表示）：

```javascript
const addNumbers = instance.exports.addNumbers;

function vectorSum(len, v1, v2) {
  const result = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    result[i] = addNumbers(v1[i], v2[i]);
  }
  return result;
}

const N = 100_000_000;
const v1 = new Float64Array(N);
const v2 = new Float64Array(N);
for (let i = 0; i < N; i++) {
  v1[i] = Math.random();
  v2[i] = Math.random();
}

// 预热。
for (let i = 0; i < 5; i++) {
  vectorSum(N, v1, v2);
}

// 测量。
console.time();
const result = vectorSum(N, v1, v2);
console.timeEnd();
```

在这个简化的微基准测试中，我们看到以下改进：

![微基准测试对比图](/_img/v8-release-90/js-to-wasm.svg)

此功能仍为实验性功能，可通过 `--turbo-inline-js-wasm-calls` 标志启用。

更多详情请参阅[设计文档](https://docs.google.com/document/d/1mXxYnYN77tK-R1JOVo6tFG3jNpMzfueQN1Zp5h3r9aM/edit)。

## V8 API

请使用 `git log branch-heads/8.9..branch-heads/9.0 include/v8.h` 获取 API 更改列表。

拥有活动 V8 检出版本的开发者可以使用 `git checkout -b 9.0 -t branch-heads/9.0` 来试验 V8 v9.0 中的新功能。或者，您可以[订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，不久后即可亲自尝试这些新功能。
