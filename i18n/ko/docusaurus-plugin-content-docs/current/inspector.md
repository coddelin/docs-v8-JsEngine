---
title: "V8 인스펙터 프로토콜을 통한 디버깅"
description: "이 페이지는 V8에서 디버깅 기능을 구현하기 위해 필요로 하는 기본적인 도구를 제공하기 위해 만들어졌습니다."
---
V8은 사용자 및 임베더들에게 광범위한 디버깅 기능을 제공합니다. 사용자들은 일반적으로 [Chrome DevTools](https://developer.chrome.com/devtools) 인터페이스를 통해 V8 디버거와 상호작용합니다. 임베더들(DevTools 포함)은 [Inspector Protocol](https://chromedevtools.github.io/debugger-protocol-viewer/tot/)에 직접 의존해야 합니다.

이 페이지는 V8에서 디버깅 기능을 구현하기 위해 임베더들에게 필요한 기본적인 도구를 제공하기 위해 만들어졌습니다.

## 인스펙터 연결

V8의 [명령줄 디버그 셸 `d8`](/docs/d8)은 [`InspectorFrontend`](https://cs.chromium.org/chromium/src/v8/src/d8/d8.cc?l=2286&rcl=608c4a9c391f3b7cac68068d61f2a8996f216973) 및 [`InspectorClient`](https://cs.chromium.org/chromium/src/v8/src/d8/d8.cc?l=2355&rcl=608c4a9c391f3b7cac68068d61f2a8996f216973)을 통한 간단한 인스펙터 통합을 포함합니다. 클라이언트는 임베더에서 V8로 보내진 메시지를 위한 통신 채널을 설정합니다:

```cpp
static void SendInspectorMessage(
    const v8::FunctionCallbackInfo<v8::Value>& args) {
  // [...] 인스펙터가 이해할 수 있는 StringView 생성.
  session->dispatchProtocolMessage(message_view);
}
```

한편, 프론트엔드는 `sendResponse` 및 `sendNotification`을 구현하면서 V8에서 임베더로 보내진 메시지를 위한 채널을 설정합니다. 이는 다음으로 전달됩니다:

```cpp
void Send(const v8_inspector::StringView& string) {
  // [...] 문자열 변환.
  // 현재 컨텍스트에서 'receive'라는 글로벌 속성을 가져옵니다.
  Local<String> callback_name =
      v8::String::NewFromUtf8(isolate_, "receive", v8::NewStringType::kNormal)
          .ToLocalChecked();
  Local<Context> context = context_.Get(isolate_);
  Local<Value> callback =
      context->Global()->Get(context, callback_name).ToLocalChecked();
  // 메시지를 JS로 전달하기 위해 호출합니다.
  if (callback->IsFunction()) {
    // [...]
    MaybeLocal<Value> result = Local<Function>::Cast(callback)->Call(
        context, Undefined(isolate_), 1, args);
  }
}
```

## 인스펙터 프로토콜 사용

예제를 계속해서, `d8`은 인스펙터 메시지를 JavaScript로 전달합니다. 아래 코드는 `d8`을 통해 인스펙터와 기본적이지만 완전히 작동하는 상호작용을 구현합니다:

```js
// inspector-demo.js
// d8에서 호출하는 수신 함수.
function receive(message) {
  print(message)
}

const msg = JSON.stringify({
  id: 0,
  method: 'Debugger.enable',
});

// d8에서 제공하는 함수 호출.
send(msg);

// 이 파일을 실행하려면 'd8 --enable-inspector inspector-demo.js'를 실행하십시오.
```

## 추가 문서

인스펙터 API 사용의 더 잘 설계된 예제는 V8 테스트 스위트에서 사용되는 간단한 디버깅 API를 구현하는 [`test-api.js`](https://cs.chromium.org/chromium/src/v8/test/debugger/test-api.js?type=cs&q=test-api&l=1)에서 확인할 수 있습니다.

V8은 [`inspector-test.cc`](https://cs.chromium.org/chromium/src/v8/test/inspector/inspector-test.cc?q=inspector-te+package:%5Echromium$&l=1)에서 대체 인스펙터 통합도 포함하고 있습니다.

Chrome DevTools 위키는 사용 가능한 모든 함수에 대한 [전체 문서](https://chromedevtools.github.io/debugger-protocol-viewer/tot/)를 제공합니다.
