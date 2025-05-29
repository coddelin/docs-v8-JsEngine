---
title: '不信任代码的缓解措施'
description: '如果您嵌入了V8并运行不可信的JavaScript代码，请启用V8的缓解措施，以帮助防御推测性侧信道攻击。'
---
2018年初，Google的Project Zero研究人员披露了[一类新的攻击](https://googleprojectzero.blogspot.com/2018/01/reading-privileged-memory-with-side.html)，这种攻击[利用](https://security.googleblog.com/2018/01/more-details-about-mitigations-for-cpu_4.html)许多CPU使用的推测执行优化。由于V8使用优化的JIT编译器TurboFan以提高JavaScript的运行速度，在某些情况下，它易受披露中描述的侧信道攻击的影响。

## 如果您只执行可信代码，一切不会改变

如果您的产品仅使用嵌入的V8实例来执行完全由您控制的JavaScript或WebAssembly代码，那么您使用的V8可能不会受到推测性侧信道攻击（SSCA）漏洞的影响。例如，仅运行您信任的代码的Node.js实例就是一个不受影响的例子。

为了利用这一漏洞，攻击者必须在您的嵌入环境中执行精心制作的JavaScript或WebAssembly代码。如果作为开发人员，您对嵌入的V8实例中执行的代码具有完全控制权，那么这种情况很可能无法发生。然而，如果您的嵌入V8实例允许下载和执行任意或不可信的JavaScript或WebAssembly代码，或者甚至生成并随后执行不完全受您控制的JavaScript或WebAssembly代码（例如，将其用作编译目标），则您可能需要考虑缓解措施。

## 如果您确实执行了不可信代码……

### 更新到最新的V8以利用缓解措施并启用这些措施

从[V8 v6.4.388.18](https://chromium.googlesource.com/v8/v8/+/e6eddfe4d1ed9d96b453d14b84ac19769388d8b1)开始，V8自身提供了针对该类攻击的缓解措施，因此建议将您的嵌入式V8版本更新到[v6.4.388.18](https://chromium.googlesource.com/v8/v8/+/e6eddfe4d1ed9d96b453d14b84ac19769388d8b1)或更高版本。包括仍使用FullCodeGen和/或CrankShaft的旧版本V8在内，均未提供SSCA缓解措施。

从[V8 v6.4.388.18](https://chromium.googlesource.com/v8/v8/+/e6eddfe4d1ed9d96b453d14b84ac19769388d8b1)开始，V8中新增了一个旨在帮助防御SSCA漏洞的标志。该标志名为`--untrusted-code-mitigations`，并通过构建时的GN标志`v8_untrusted_code_mitigations`在运行时默认启用。

以下缓解措施通过运行时标志`--untrusted-code-mitigations`启用：

- 在WebAssembly和asm.js中，在内存访问前屏蔽地址，确保推测性执行的内存加载无法访问WebAssembly和asm.js堆外的内存。
- 在JIT代码中屏蔽用于访问JavaScript数组和字符串的索引，以确保在推测性执行路径中无法进行不应由JavaScript代码访问的数组和字符串到内存地址的加载。

嵌入者应注意，这些缓解措施可能伴随性能上的权衡。实际影响显著取决于您的工作负载。例如，对于Speedometer这样的工作负载，影响可以忽略不计，但对于更极端的计算工作负载，影响可能高达15%。如果您完全信任嵌入式V8实例执行的JavaScript和WebAssembly代码，您可以在运行时通过指定`--no-untrusted-code-mitigations`标志来禁用这些JIT缓解措施。在构建时可使用`v8_untrusted_code_mitigations` GN标志启用或禁用缓解措施。

请注意，在默认情况下，V8会在嵌入者被假定使用进程隔离的平台（如Chromium使用站点隔离的平台）上禁用这些缓解措施。

### 在单独的进程中对不可信的执行进行沙盒化

如果您在与任何敏感数据分离的单独进程中执行不可信的JavaScript和WebAssembly代码，SSCA的潜在影响将大大降低。通过进程隔离，SSCA攻击只能观察到与执行代码一同隔离在同一进程中的数据，而不是其他进程中的数据。

### 考虑调整您提供的高精度定时器

高精度定时器使得更容易观察SSCA漏洞中的侧信道。如果您的产品提供的高精度定时器可以被不可信的JavaScript或WebAssembly代码访问，请考虑将这些定时器变得更粗或为其添加抖动。
