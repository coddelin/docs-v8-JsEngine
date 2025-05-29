---
title: '透過 V8 Inspector Protocol 進行調試'
description: '本頁旨在向嵌入者提供實現 V8 調試支持所需的基本工具。'
---
V8 為使用者和嵌入者提供了廣泛的調試功能。使用者通常會通過 [Chrome DevTools](https://developer.chrome.com/devtools) 介面與 V8 調試器互動。嵌入者（包括 DevTools）需要直接依賴 [Inspector Protocol](https://chromedevtools.github.io/debugger-protocol-viewer/tot/)。

本頁旨在向嵌入者提供實現 V8 調試支持所需的基本工具。

## 連接到 Inspector

V8 的 [命令行調試外殼 `d8`](/docs/d8) 通過 [`InspectorFrontend`](https://cs.chromium.org/chromium/src/v8/src/d8/d8.cc?l=2286&rcl=608c4a9c391f3b7cac68068d61f2a8996f216973) 和 [`InspectorClient`](https://cs.chromium.org/chromium/src/v8/src/d8/d8.cc?l=2355&rcl=608c4a9c391f3b7cac68068d61f2a8996f216973) 包含了簡單的 Inspector 集成。客戶端為嵌入者向 V8 發送的消息建立了一個通信通道：

```cpp
static void SendInspectorMessage(
    const v8::FunctionCallbackInfo<v8::Value>& args) {
  // [...] 創建一個 Inspector 能理解的 StringView。
  session->dispatchProtocolMessage(message_view);
}
```

同時，前端通過實現 `sendResponse` 和 `sendNotification` 為 V8 向嵌入者發送的消息建立了一個通道，這些消息隨後轉發到：

```cpp
void Send(const v8_inspector::StringView& string) {
  // [...] 字符串轉換。
  // 從當前上下文中抓取名為 'receive' 的全局屬性。
  Local<String> callback_name =
      v8::String::NewFromUtf8(isolate_, "receive", v8::NewStringType::kNormal)
          .ToLocalChecked();
  Local<Context> context = context_.Get(isolate_);
  Local<Value> callback =
      context->Global()->Get(context, callback_name).ToLocalChecked();
  // 然後調用它將消息傳遞給 JS。
  if (callback->IsFunction()) {
    // [...]
    MaybeLocal<Value> result = Local<Function>::Cast(callback)->Call(
        context, Undefined(isolate_), 1, args);
  }
}
```

## 使用 Inspector Protocol

繼續我們的示例，`d8` 將 Inspector 消息轉發到 JavaScript。以下代碼實現了通過 `d8` 與 Inspector 進行的基本但完全可用的交互：

```js
// inspector-demo.js
// 接收器函數，由 d8 調用。
function receive(message) {
  print(message)
}

const msg = JSON.stringify({
  id: 0,
  method: 'Debugger.enable',
});

// 調用由 d8 提供的函數。
send(msg);

// 通過執行 'd8 --enable-inspector inspector-demo.js' 運行此文件。
```

## 進一步文檔

一個更完善的 Inspector API 使用示例可以在 [`test-api.js`](https://cs.chromium.org/chromium/src/v8/test/debugger/test-api.js?type=cs&q=test-api&l=1) 中找到，該示例為 V8 的測試套件實現了一個簡單的調試 API。

V8 也包含了一個替代的 Inspector 集成，位於 [`inspector-test.cc`](https://cs.chromium.org/chromium/src/v8/test/inspector/inspector-test.cc?q=inspector-te+package:%5Echromium$&l=1)。

Chrome DevTools 維基提供了所有可用功能的 [完整文檔](https://chromedevtools.github.io/debugger-protocol-viewer/tot/)。
