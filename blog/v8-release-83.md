---
title: "V8 版本 v8.3"
author: "[Victor Gomes](https://twitter.com/VictorBFG)，在家安全办公"
avatars: 
 - "victor-gomes"
date: 2020-05-04
tags: 
 - release
description: "V8 v8.3 提供更快的 ArrayBuffers、更大的 Wasm 内存以及弃用的 API。"
tweet: "1257333120115847171"
---

每六周，我们会根据 [发布流程](https://v8.dev/docs/release-process)创建一个新的 V8 分支。每个版本都是从 V8 的 Git 主分支在 Chrome Beta 里程碑之前立即分支出来的。今天我们很高兴宣布我们的最新分支 [V8 版本 8.3](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.3)，该版本在发布前与 Chrome 83 稳定版协调几周内保持 Beta 状态。V8 v8.3 向开发者提供了各种功能改进。本篇文章将预览一些重要功能以期待正式发布。

<!--truncate-->
## 性能

### 在垃圾回收器中更快的 `ArrayBuffer` 跟踪

`ArrayBuffer` 的底层存储是在 V8 堆之外通过 `ArrayBuffer::Allocator` 分配的，由嵌入者提供。当垃圾回收器回收 `ArrayBuffer` 对象时，这些底层存储需要被释放。V8 v8.3 提供了一种全新的机制用于跟踪 `ArrayBuffer` 和它们的底层存储，使垃圾回收器可以在不影响应用的同时迭代并释放底层存储。更多详情请参见 [此设计文档](https://docs.google.com/document/d/1-ZrLdlFX1nXT3z-FAgLbKal1gI8Auiaya_My-a0UJ28/edit#heading=h.gfz6mi5p212e)。这一机制将 `ArrayBuffer`密集型工作负载的总垃圾回收暂停时间减少了 50%。

### 更大的 Wasm 内存

根据更新后的 [WebAssembly 规范](https://webassembly.github.io/spec/js-api/index.html#limits)，V8 v8.3 现在允许模块请求最多 4GB 的内存，从而支持更加内存密集型的使用场景运行于由 V8 驱动的平台上。但请注意，这么大的内存可能不会始终在用户的系统上可用；我们建议以较小的尺寸创建内存，根据需要增长，并优雅地处理增长失败情况。

## 修复

### 对原型链上带类型数组的对象的存储

根据 JavaScript 规范，当向指定键存储值时，我们需要沿着原型链检查该键是否已经存在原型上。这些键通常不会存在于原型链上，因此 V8 在安全的情况下安装快速查找处理器以避免原型链遍历。

然而，我们最近发现一个特定场景下 V8 错误地安装了这种快速查找处理器，导致错误行为。当 `TypedArray` 位于原型链上时，所有对超出 `TypedArray` 边界的键的存储都应被忽略。例如，下例中的 `v[2]` 不应该向 `v` 添加属性，后续读取的结果应返回 undefined。

```js
v = {};
v.__proto__ = new Int32Array(1);
v[2] = 123;
return v[2]; // 应返回 undefined
```

V8 的快速查找处理器未处理此情况，导致我们在以上示例中返回 `123`。V8 v8.3 修复了此问题，当 `TypedArray` 位于原型链上时不使用快速查找处理器。鉴于这是不常见的案例，我们的基准测试中未发现任何性能回退。

## V8 API

### 弃用实验性 WeakRefs 和 FinalizationRegistry API

以下实验性与 WeakRefs 相关的 API 已被弃用：

- `v8::FinalizationGroup`
- `v8::Isolate::SetHostCleanupFinalizationGroupCallback`

`FinalizationRegistry`（从 `FinalizationGroup` 重命名）是 [JavaScript 弱引用提案](https://v8.dev/features/weak-references)的一部分，为 JavaScript 程序员提供注册最终处理器的方式。这些 API 供嵌入者安排和运行 `FinalizationRegistry` 清理任务，其中注册的最终处理器被调用；这些 API 被弃用是因为已不再需要此操作。现在 V8 使用嵌入者的 `v8::Platform` 提供的前台任务运行程序自动安排 `FinalizationRegistry` 清理任务，无需额外嵌入者代码。

### 其他 API 更改

请使用 `git log branch-heads/8.1..branch-heads/8.3 include/v8.h` 来获取 API 更改的列表。

拥有活动 V8 检出的开发者可以使用 `git checkout -b 8.3 -t branch-heads/8.3` 来尝试 V8 v8.3 的新功能。此外，你可以[订阅 Chrome 的 Beta 频道](https://www.google.com/chrome/browser/beta.html)，不久即可亲自体验这些新功能。
