---
title: '代码缓存'
author: '杨果 ([@hashseed](https://twitter.com/hashseed))，软件工程师'
avatars:
  - 'yang-guo'
date: 2015-07-27 13:33:37
tags:
  - 内部机制
description: 'V8 现在支持（字节）代码缓存，即缓存 JavaScript 解析和编译的结果。'
---
V8 使用[即时编译](https://en.wikipedia.org/wiki/Just-in-time_compilation)（JIT）来执行 JavaScript 代码。这意味着在运行脚本之前必须立即对其进行解析和编译，这可能会导致相当大的开销。正如我们[最近宣布](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html)，代码缓存是一种减少开销的技术。首次编译脚本时，会生成并存储缓存数据。下次 V8 需要编译相同的脚本时，即使在不同的 V8 实例中，也可以使用缓存数据重新生成编译结果，而无需从头编译。因此，脚本执行速度显著提高。

<!--truncate-->
代码缓存自 V8 4.2 版本起就已可用，并且不限于 Chrome。它通过 V8 的 API 公开，使每个嵌入 V8 的应用都能利用它。[测试用例](https://chromium.googlesource.com/v8/v8.git/+/4.5.56/test/cctest/test-api.cc#21090)用于测试此功能，也可以作为使用此 API 的示例。

当脚本由 V8 编译时，可以通过选项 `v8::ScriptCompiler::kProduceCodeCache` 生成缓存数据以加快后续编译速度。如果编译成功，缓存数据将被附加到源对象中，并可以通过 `v8::ScriptCompiler::Source::GetCachedData` 检索。然后可以将其持久化，例如写入磁盘，以供后续使用。

在后续编译过程中，可以将之前生成的缓存数据附加到源对象中，并传递选项 `v8::ScriptCompiler::kConsumeCodeCache`。这一次，代码生成速度会显著提高，因为 V8 会跳过代码编译阶段，直接从提供的缓存数据中反序列化代码。

生成缓存数据会带来一定的计算和内存成本。基于这一原因，Chrome 仅在几天内看到相同脚本至少两次时才会生成缓存数据。这样，Chrome 能够平均将脚本文件转化为可执行代码速度提高一倍，为用户在每次后续页面加载时节省宝贵的时间。
