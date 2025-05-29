---
title: '实现和发布 JavaScript/WebAssembly 语言特性'
description: '本文档解释了在 V8 中实现和发布 JavaScript 或 WebAssembly 语言特性的过程。'
---
通常情况下，V8 遵循 [Blink 的已定义共识标准的意向流程](https://www.chromium.org/blink/launching-features/#process-existing-standard)，用于 JavaScript 和 WebAssembly 语言特性。以下是 V8 的特定修订内容。请遵循 Blink 的意向流程，除非修订内容另有规定。

如果您对此主题有任何关于 JavaScript 特性的问题，请发送邮件至 syg@chromium.org 和 v8-dev@googlegroups.com。

对于 WebAssembly 特性，请发送邮件至 gdeepti@chromium.org 和 v8-dev@googlegroups.com。

## 修订内容

### JavaScript 特性通常会等到第 3 阶段及以上

一般来说，V8 会等待 JavaScript 特性提案推进至 [TC39 的第 3 阶段或更高阶段](https://tc39.es/process-document/)再实施。TC39 有自己的共识流程，第 3 阶段或以上标志着 TC39 代表（包括所有浏览器厂商）已对某个特性提案形成明确共识，即该特性提案已准备好实施。此外部共识流程意味着第 3 阶段及以上的特性无需发送除“意向发布”外的意向邮件。

### TAG 审查

小型 JavaScript 或 WebAssembly 特性不需要 TAG 审查，因为 TC39 和 Wasm CG 已提供了重要的技术监督。若特性较大或具有跨领域影响（例如需要更改其他 Web 平台 API 或修改 Chromium），则推荐进行 TAG 审查。

### 需要同时使用 V8 和 Blink 的标志

在实现特性时，需要同时使用 V8 标志和 Blink 的 `base::Feature`。

Blink 特性标志是必须的，这样 Chrome 在紧急情况下可以关闭某些特性而无需分发新的二进制文件。这通常在 [`gin/gin_features.h`](https://source.chromium.org/chromium/chromium/src/+/main:gin/gin_features.h)、[`gin/gin_features.cc`](https://source.chromium.org/chromium/chromium/src/+/main:gin/gin_features.cc) 和 [`gin/v8_initializer.cc`](https://source.chromium.org/chromium/chromium/src/+/main:gin/v8_initializer.cc) 中实现。

### 模糊测试是发布的必要条件

在正式发布之前，JavaScript 和 WebAssembly 特性必须经过最少 4 周或一个（1）版本周期的模糊测试，并且修复所有模糊测试发现的错误。

对于完成代码开发的 JavaScript 特性，通过将特性标志移至 [`src/flags/flag-definitions.h`](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/flags/flag-definitions.h) 中的 `JAVASCRIPT_STAGED_FEATURES_BASE` 宏来启动模糊测试。

至于 WebAssembly，请参阅 [WebAssembly 发布清单](/docs/wasm-shipping-checklist)。

### [Chromestatus](https://chromestatus.com/) 和审核门

Blink 的意向流程包含一系列审核门，必须在 [Chromestatus](https://chromestatus.com/) 中某特性的条目上获取批准后，才能发送“意向发布”邮件以寻求 API OWNER 批准。

这些审核门是针对 Web API 定制的，部分门可能不适用于 JavaScript 和 WebAssembly 特性。以下是一般性指导。具体细节因特性而异，请勿盲目应用指导！

#### 隐私

大多数 JavaScript 和 WebAssembly 特性对隐私没有影响。少数情况下，特性可能会添加新的指纹识别向量，从而揭示用户操作系统或硬件的相关信息。

#### 安全

虽然 JavaScript 和 WebAssembly 是安全漏洞攻击的常见媒介，但大多数新特性不会增加额外的攻击面。[模糊测试](#fuzzing) 是必须的，可以减轻部分风险。

影响已知流行攻击媒介（例如 JavaScript 中的 `ArrayBuffer`）的特性，以及可能启用侧信道攻击的特性，需要特别审查并获得审批。

#### 企业

在 TC39 和 Wasm CG 的标准化过程中，JavaScript 和 WebAssembly 特性已经经过严格的向后兼容性审查。特性有意向后向不兼容的情况极为罕见。

对于 JavaScript，可以通过 `chrome://flags/#disable-javascript-harmony-shipping` 禁用最近发布的特性。

#### 可调试性

JavaScript 和 WebAssembly 特性的可调试性因特性而异。仅添加新内置方法的 JavaScript 特性不需要额外的调试器支持，而增加新功能的 WebAssembly 特性可能需要显著的额外调试器支持。

详细信息请参阅 [JavaScript 特性调试清单](https://docs.google.com/document/d/1_DBgJ9eowJJwZYtY6HdiyrizzWzwXVkG5Kt8s3TccYE/edit#heading=h.u5lyedo73aa9) 和 [WebAssembly 特性调试清单](https://goo.gle/devtools-wasm-checklist)。

如果有疑问，则适用此门槛。

#### 测试

对于 JavaScript 特性来说，Test262 测试已经足够；对于 WebAssembly 特性来说，WebAssembly 规范测试已经足够。

不要求添加 Web 平台测试（WPT），因为 JavaScript 和 WebAssembly 语言特性本身已经拥有多个实现运行的互操作测试库。不过，如果你认为添加会有益的话，可以随意添加。

对于 JavaScript 特性，要求在 [Test262](https://github.com/tc39/test262) 中提供明确的正确性测试。需要注意的是，[staging 目录](https://github.com/tc39/test262/blob/main/CONTRIBUTING.md#staging)中的测试也是足够的。

对于 WebAssembly 特性，要求在 [WebAssembly 规范测试库](https://github.com/WebAssembly/spec/tree/master/test) 中提供明确的正确性测试。

对于性能测试，JavaScript 已经是绝大多数现有性能基准（例如 Speedometer）的底层。

### 抄送对象

**每封**关于“意图 `$操作`”的邮件（例如“实施意图”）应该同时抄送 &lt;v8-users@googlegroups.com> 和 &lt;blink-dev@chromium.org>。这样可以确保其他 V8 嵌入者也能了解情况。

### 规范库链接

Blink 意图流程要求提供说明文件。可以直接链接到相关的规范库，而无需编写新的文档（例如 [`import.meta`](https://github.com/tc39/proposal-import-meta)）。
