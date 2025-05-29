---
title: &apos;V8インスペクタープロトコルを使用したデバッグ&apos;
description: &apos;このページは、V8におけるデバッグサポートを実装するための基本的なツールを埋め込み者に提供することを目的としています。&apos;
---
V8は、ユーザーおよび埋め込み者の両方に対して広範なデバッグ機能を提供します。ユーザーは通常、[Chrome DevTools](https://developer.chrome.com/devtools)インターフェースを通じてV8デバッガを操作します。埋め込み者（DevToolsを含む）は、[Inspector Protocol](https://chromedevtools.github.io/debugger-protocol-viewer/tot/)を直接利用する必要があります。

このページは、V8におけるデバッグサポートを実装するために必要な基本的なツールを埋め込み者に提供することを目的としています。

## インスペクタへの接続

V8の[コマンドラインデバッグシェル`d8`](/docs/d8)は、[`InspectorFrontend`](https://cs.chromium.org/chromium/src/v8/src/d8/d8.cc?l=2286&rcl=608c4a9c391f3b7cac68068d61f2a8996f216973)および[`InspectorClient`](https://cs.chromium.org/chromium/src/v8/src/d8/d8.cc?l=2355&rcl=608c4a9c391f3b7cac68068d61f2a8996f216973)を通じて簡単なインスペクタ統合を含んでいます。クライアントは、埋め込み者からV8へ送信されるメッセージの通信チャネルを設定します:

```cpp
static void SendInspectorMessage(
    const v8::FunctionCallbackInfo<v8::Value>& args) {
  // [...] Inspectorが理解できるStringViewを作成します。
  session->dispatchProtocolMessage(message_view);
}
```

一方で、フロントエンドは、`sendResponse`および`sendNotification`を実装して、V8から埋め込み者に送信されるメッセージのチャネルを確立し、以下に転送します:

```cpp
void Send(const v8_inspector::StringView& string) {
  // [...] 文字列変換。
  // 現在のコンテキストから&apos;receive&apos;という名前のグローバルプロパティを取得します。
  Local<String> callback_name =
      v8::String::NewFromUtf8(isolate_, "receive", v8::NewStringType::kNormal)
          .ToLocalChecked();
  Local<Context> context = context_.Get(isolate_);
  Local<Value> callback =
      context->Global()->Get(context, callback_name).ToLocalChecked();
  // そしてそれを呼び出して、メッセージをJSに渡します。
  if (callback->IsFunction()) {
    // [...]
    MaybeLocal<Value> result = Local<Function>::Cast(callback)->Call(
        context, Undefined(isolate_), 1, args);
  }
}
```

## インスペクタープロトコルの使用

例を続けると、`d8`はインスペクタメッセージをJavaScriptに転送します。以下のコードは、`d8`を介したインスペクタとの基本的ながら完全に機能的なやり取りを実装しています:

```js
// inspector-demo.js
// d8によって呼び出される受信関数。
function receive(message) {
  print(message)
}

const msg = JSON.stringify({
  id: 0,
  method: &apos;Debugger.enable&apos;,
});

// d8が提供する関数を呼び出します。
send(msg);

// このファイルを&apos;d8 --enable-inspector inspector-demo.js&apos;で実行します。
```

## さらなるドキュメント

インスペクタAPIの使用例として、[`test-api.js`](https://cs.chromium.org/chromium/src/v8/test/debugger/test-api.js?type=cs&q=test-api&l=1)があり、これはV8のテストスイートで使用するための単純なデバッグAPIを実装しています。

V8には、[`inspector-test.cc`](https://cs.chromium.org/chromium/src/v8/test/inspector/inspector-test.cc?q=inspector-te+package:%5Echromium$&l=1)で代替のインスペクタ統合も含まれています。

Chrome DevToolsのWikiでは、利用可能なすべての機能についての[完全なドキュメント](https://chromedevtools.github.io/debugger-protocol-viewer/tot/)が提供されています。
