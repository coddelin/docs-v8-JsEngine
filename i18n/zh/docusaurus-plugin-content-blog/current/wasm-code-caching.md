---
title: '代码缓存为WebAssembly开发者服务'
author: '[比尔·巴奇](https://twitter.com/billb)，让缓存充满Ca-ching！'
avatars:
  - bill-budge
date: 2019-06-17
tags:
  - WebAssembly
  - 内部工作原理
description: '本文介绍了Chrome的WebAssembly代码缓存机制，以及开发者如何利用该机制来加速加载具有大型WebAssembly模块的应用程序。'
tweet: '1140631433532334081'
---
开发者中流传着这样一句话：最快的代码是不需要运行的代码。同样，最快的编译代码是不需要编译的代码。WebAssembly代码缓存是Chrome和V8中的一种新型优化，通过缓存编译器生成的原生代码来避免代码编译。我们之前已经[写过](/blog/code-caching)[关于](/blog/improved-code-caching)[如何](/blog/code-caching-for-devs)Chrome和V8缓存JavaScript代码的内容，以及利用这种优化的最佳实践。在这篇博客文章中，我们将描述Chrome的WebAssembly代码缓存的工作原理，并说明开发者如何利用它来加速加载具有大型WebAssembly模块的应用程序。

<!--截断-->
## WebAssembly编译回顾

WebAssembly是一种在Web上运行非JavaScript代码的方式。一个Web应用可以通过加载`.wasm`资源来使用WebAssembly，该资源包含来自其他语言（如C、C++或Rust等）的部分编译代码。WebAssembly编译器的任务是解码`.wasm`资源，验证其格式是否正确，然后将其编译成可在用户机器上执行的原生机器代码。

V8有两个用于WebAssembly的编译器：Liftoff和TurboFan。[Liftoff](/blog/liftoff)是一个基线编译器，它尽可能快地编译模块，以便尽早开始执行。TurboFan是V8的优化编译器，适用于JavaScript和WebAssembly。它在后台运行以生成高质量的原生代码，从而使Web应用在长期使用中获得最佳性能。对于大型WebAssembly模块，TurboFan可能需要较长的时间——30秒到一分钟或更长时间——才能完全编译成原生代码。

代码缓存正是为了解决这个问题。一旦TurboFan完成了对大型WebAssembly模块的编译，Chrome即可将代码保存到缓存中，以便下次加载模块时，可以跳过Liftoff和TurboFan的编译，达到更快的启动速度并减少电力消耗——编译代码是非常耗CPU的。

WebAssembly代码缓存使用的是与JavaScript代码缓存相同的机制。我们使用同类型的存储方式，以及相同的双键缓存技术，这种技术根据[站点隔离](https://developers.google.com/web/updates/2018/07/site-isolation)（Chrome的重要安全功能）的要求，将不同来源编译的代码分开。

## WebAssembly代码缓存算法

目前，WebAssembly缓存仅对流式API调用（`compileStreaming`和`instantiateStreaming`）实现。这些API基于对`.wasm`资源的HTTP获取，使得使用Chrome的资源获取和缓存机制更加方便，并提供了一个便捷的资源URL作为标识WebAssembly模块的键。缓存算法如下工作：

1. 当首次请求`.wasm`资源（即_冷启动_）时，Chrome从网络下载资源并将其传输流发送给V8进行编译。同时，Chrome将`.wasm`资源存储在浏览器的资源缓存中，该资源缓存存储在用户设备的文件系统中。此资源缓存能让Chrome在下一次加载资源时加快速度。
1. 当TurboFan完全编译完成模块，并且`.wasm`资源足够大（目前为128 kB）时，Chrome将编译后的代码写入WebAssembly代码缓存中。这个代码缓存与第1步中的资源缓存物理上是分开的。
1. 当第二次请求`.wasm`资源（即_热点运行_）时，Chrome从资源缓存加载`.wasm`资源，同时查询代码缓存。如果缓存命中，则编译的模块字节被发送到渲染进程并传递给V8，V8会反序列化代码而不是编译模块。反序列化比编译更快且更少占用CPU资源。
1. 缓存的代码可能已经失效。这可能是因为`.wasm`资源发生了变化，或者因为V8发生了改变，考虑到Chrome快速的发布周期（约每6周一次更新），这类情况是预期中的。在这种情况下，缓存中的原生代码会被清除，编译按照第1步继续进行。

基于以上描述，我们可以给出一些建议来优化您网站对WebAssembly代码缓存的使用。

## 提示 1：使用 WebAssembly 流式 API

由于代码缓存仅在使用流式 API 时起作用，请用 `compileStreaming` 或 `instantiateStreaming` 来编译或实例化 WebAssembly 模块，就像以下这段 JavaScript 代码片段所示：

```js
(async () => {
  const fetchPromise = fetch(&apos;fibonacci.wasm&apos;);
  const { instance } = await WebAssembly.instantiateStreaming(fetchPromise);
  const result = instance.exports.fibonacci(42);
  console.log(result);
})();
```

这篇[文章](https://developers.google.com/web/updates/2018/04/loading-wasm)详细介绍了使用 WebAssembly 流式 API 的优势。Emscripten 在为应用程序生成加载器代码时默认尝试使用此 API。请注意，使用流式 API 需要 `.wasm` 资源具有正确的 MIME 类型，因此服务器必须在响应中发送 `Content-Type: application/wasm` 头。

## 提示 2：保持缓存友好

由于代码缓存依赖于资源 URL 以及 `.wasm` 资源是否是最新的，开发者应尽量保持两者的稳定性。如果从不同的 URL 获取 `.wasm` 资源，则会被视为不同，V8 必须重新编译模块。同样，如果资源缓存中的 `.wasm` 资源不再有效，Chrome 也会丢弃任何已缓存的代码。

### 保持代码稳定

每当你发布新的 WebAssembly 模块时，它必须被完全重新编译。仅在需要提供新功能或修复漏洞时发布新版本代码。当代码未更改时，请告知 Chrome。当浏览器发出 HTTP 请求获取资源 URL（例如 WebAssembly 模块）时，会包含该 URL 上次获取的日期和时间。如果服务器知道文件未更改，它可以返回 `304 Not Modified` 响应，告知 Chrome 和 V8 缓存资源和缓存代码仍然有效。另一方面，返回 `200 OK` 响应会更新缓存的 `.wasm` 资源并使代码缓存失效，使 WebAssembly 返回冷启动状态。请遵循[网络资源最佳实践](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching)，通过响应告知浏览器 `.wasm` 资源是否可缓存，其有效期，以及上次修改时间。

### 不要更改代码的 URL

缓存的已编译代码与 `.wasm` 资源的 URL 相关联，这使得无需扫描实际资源就可以轻松查找。这意味着更改资源的 URL（包括任何查询参数！）会在资源缓存中创建一个新条目，这也需要完全重新编译并创建新的代码缓存条目。

### 尺寸要大（但不要太大！）

WebAssembly 代码缓存的主要启发式规则是 `.wasm` 资源的大小。如果 `.wasm` 资源小于某个阈值，我们不会缓存已编译模块的字节码。原因在于 V8 可以快速编译小模块，可能比从缓存中加载已编译代码还快。目前，这个阈值为 128 kB 或更大。

但更大并不总是更好。由于缓存会占用用户计算机上的空间，Chrome 小心控制不要占用过多空间。目前，桌面计算机上的代码缓存通常存储几百 MB 的数据。由于 Chrome 的缓存还限制了缓存中最大条目的大小占总缓存大小的一定比例，已编译的 WebAssembly 代码的进一步限制约为 150 MB（总缓存大小的一半）。需要注意的是，在典型的桌面计算机上，已编译模块通常是对应 `.wasm` 资源大小的 5-7 倍。

这种大小的启发式规则（与其他缓存行为类似）可能会随着我们为用户和开发者找到最佳解决方案而发生变化。

### 使用 Service Worker

WebAssembly 代码缓存已为 workers 和 service workers 启用，因此可以使用它们加载、编译和缓存新版本的代码，以便下次应用启动时可用。每个网站必须至少完整编译一次 WebAssembly 模块——使用 workers 隐藏这个过程，以免影响用户体验。

## 追踪

作为开发者，你可能想要检查由 Chrome 缓存的已编译模块。默认情况下，Chrome 开发者工具不会显示 WebAssembly 代码缓存事件，因此找出模块是否被缓存的最佳方式是使用稍低级别的 `chrome://tracing` 功能。

`chrome://tracing` 会记录某段时间内 Chrome 的跟踪信息。追踪会记录整个浏览器的行为，包括其他标签页、窗口和扩展，因此最好在一个干净的用户配置文件下进行，没有扩展启用，也没有其他浏览器标签页打开：

```bash
# 使用全新的用户配置文件并禁用扩展启动一个新的Chrome浏览器会话
google-chrome --user-data-dir="$(mktemp -d)" --disable-extensions
```

转到`chrome://tracing`并单击“记录”以开始跟踪会话。在出现的对话窗口中，单击“编辑类别”，然后在右侧“默认禁用的类别”下勾选`devtools.timeline`类别（您可以取消选中任何其他预选类别以减少收集的数据量）。然后单击对话框中的“记录”按钮开始跟踪。

在另一个标签页中加载或重新加载您的应用程序。运行足够长的时间（至少10秒），以确保TurboFan编译完成。完成后，单击“停止”结束跟踪。一个事件时间线视图将出现。在跟踪窗口的右上角有一个文本框，就在“视图选项”的右边。输入`v8.wasm`以过滤掉非WebAssembly事件。您应该会看到以下一个或多个事件：

- `v8.wasm.streamFromResponseCallback` — 传递给instantiateStreaming的资源获取接收到了响应。
- `v8.wasm.compiledModule` — TurboFan完成了对`.wasm`资源的编译。
- `v8.wasm.cachedModule` — Chrome将编译好的模块写入了代码缓存。
- `v8.wasm.moduleCacheHit` — Chrome在加载`.wasm`资源时从缓存中找到了代码。
- `v8.wasm.moduleCacheInvalid` — V8无法反序列化缓存的代码，因为它已过期。

在初始运行时，我们期望看到`v8.wasm.streamFromResponseCallback`和`v8.wasm.compiledModule`事件。这表明WebAssembly模块已接收并且编译成功。如果两个事件都未观察到，请检查您的WebAssembly流API调用是否正常工作。

在初始运行之后，如果超过了体积阈值，我们也期望看到`v8.wasm.cachedModule`事件，这意味着编译后的代码被发送到了缓存中。但可能由于某种原因，即使有该事件，写入未成功。目前无法观察到这一点，但事件的元数据可以显示代码的大小。非常大的模块可能无法适应缓存。

当缓存正常工作时，热运行会产生两个事件：`v8.wasm.streamFromResponseCallback`和`v8.wasm.moduleCacheHit`。这些事件的元数据可以让您看到编译代码的大小。

关于使用`chrome://tracing`的更多信息，请参阅[我们关于为开发者提供的JavaScript（字节码）缓存文章](/blog/code-caching-for-devs)。

## 结论

对于大多数开发者来说，代码缓存应该是“即插即用”的。与任何缓存一样，它在环境稳定时效果最好。Chrome的缓存启发式可能会在不同的版本间发生变化，但代码缓存具有可以利用的行为，以及可以避免的限制。通过`chrome://tracing`进行仔细分析，可以帮助您调整和优化您的Web应用程序对WebAssembly代码缓存的使用。
