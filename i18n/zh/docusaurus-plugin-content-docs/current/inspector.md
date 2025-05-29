---
title: '通过 V8 检查器协议进行调试'
description: '本页面旨在为嵌入者提供实现 V8 中调试支持所需的基本工具。'
---
V8 为用户和嵌入者提供了广泛的调试功能。用户通常通过 [Chrome 开发者工具](https://developer.chrome.com/devtools) 接口与 V8 调试器进行交互。嵌入者（包括开发者工具）需要直接依赖 [检查器协议](https://chromedevtools.github.io/debugger-protocol-viewer/tot/)。

本页面旨在为嵌入者提供实现 V8 中调试支持所需的基本工具。

## 连接到检查器

V8 的 [命令行调试工具 `d8`](/docs/d8) 通过 [`InspectorFrontend`](https://cs.chromium.org/chromium/src/v8/src/d8/d8.cc?l=2286&rcl=608c4a9c391f3b7cac68068d61f2a8996f216973) 和 [`InspectorClient`](https://cs.chromium.org/chromium/src/v8/src/d8/d8.cc?l=2355&rcl=608c4a9c391f3b7cac68068d61f2a8996f216973) 提供了一个简单的检查器集成。客户端为从嵌入者发送到 V8 的消息设置了一个通信通道：

```cpp
static void SendInspectorMessage(
    const v8::FunctionCallbackInfo<v8::Value>& args) {
  // [...] 创建一个检查器可以理解的 StringView。
  session->dispatchProtocolMessage(message_view);
}
```

同时，前端通过实现 `sendResponse` 和 `sendNotification` 为从 V8 发送到嵌入者的消息建立了一个通道，这些方法随后转发给：

```cpp
void Send(const v8_inspector::StringView& string) {
  // [...] 字符串转换。
  // 从当前上下文中获取名为 'receive' 的全局属性。
  Local<String> callback_name =
      v8::String::NewFromUtf8(isolate_, "receive", v8::NewStringType::kNormal)
          .ToLocalChecked();
  Local<Context> context = context_.Get(isolate_);
  Local<Value> callback =
      context->Global()->Get(context, callback_name).ToLocalChecked();
  // 调用它以将消息传递给 JS。
  if (callback->IsFunction()) {
    // [...]
    MaybeLocal<Value> result = Local<Function>::Cast(callback)->Call(
        context, Undefined(isolate_), 1, args);
  }
}
```

## 使用检查器协议

继续我们的示例，`d8` 将检查器消息转发给 JavaScript。以下代码通过 `d8` 实现了一个基本但功能完整的与检查器的交互：

```js
// inspector-demo.js
// 由 d8 调用的接收函数。
function receive(message) {
  print(message)
}

const msg = JSON.stringify({
  id: 0,
  method: 'Debugger.enable',
});

// 调用 d8 提供的函数。
send(msg);

// 通过执行 'd8 --enable-inspector inspector-demo.js' 来运行此文件。
```

## 更多文档

检查器 API 使用的更完整示例可以在 [`test-api.js`](https://cs.chromium.org/chromium/src/v8/test/debugger/test-api.js?type=cs&q=test-api&l=1) 中找到，它为 V8 的测试套件实现了一个简单的调试 API。

V8 还包含一个替代的检查器集成，位于 [`inspector-test.cc`](https://cs.chromium.org/chromium/src/v8/test/inspector/inspector-test.cc?q=inspector-te+package:%5Echromium$&l=1)。

Chrome 开发者工具 wiki 提供了 [完整文档](https://chromedevtools.github.io/debugger-protocol-viewer/tot/) 来描述所有可用功能。
