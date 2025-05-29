---
title: 'Отладка через протокол V8 Inspector'
description: 'Эта страница предназначена для предоставления внедряющим пользователям базовых инструментов, необходимых для реализации поддержки отладки в V8.'
---
V8 предоставляет обширные возможности отладки как для пользователей, так и для внедряющих. Пользователи обычно взаимодействуют с отладчиком V8 через интерфейс [Chrome DevTools](https://developer.chrome.com/devtools). Внедряющие (включая DevTools) должны напрямую полагаться на [Inspector Protocol](https://chromedevtools.github.io/debugger-protocol-viewer/tot/).

Эта страница предназначена для предоставления внедряющим пользователям базовых инструментов, необходимых для реализации поддержки отладки в V8.

## Подключение к Inspector

[Командная оболочка d8](/docs/d8) в V8 включает простую интеграцию с Inspector через [`InspectorFrontend`](https://cs.chromium.org/chromium/src/v8/src/d8/d8.cc?l=2286&rcl=608c4a9c391f3b7cac68068d61f2a8996f216973) и [`InspectorClient`](https://cs.chromium.org/chromium/src/v8/src/d8/d8.cc?l=2355&rcl=608c4a9c391f3b7cac68068d61f2a8996f216973). Клиент создает канал связи для передачи сообщений от внедряющего пользователя к V8:

```cpp
static void SendInspectorMessage(
    const v8::FunctionCallbackInfo<v8::Value>& args) {
  // [...] Создаем StringView, понятный Inspector.
  session->dispatchProtocolMessage(message_view);
}
```

Между тем, фронтенд создает канал для передачи сообщений от V8 к внедряющему пользователю, реализуя `sendResponse` и `sendNotification`, которые затем перенаправляются:

```cpp
void Send(const v8_inspector::StringView& string) {
  // [...] Трансформация строки.
  // Получаем глобальное свойство с названием 'receive' из текущего контекста.
  Local<String> callback_name =
      v8::String::NewFromUtf8(isolate_, "receive", v8::NewStringType::kNormal)
          .ToLocalChecked();
  Local<Context> context = context_.Get(isolate_);
  Local<Value> callback =
      context->Global()->Get(context, callback_name).ToLocalChecked();
  // И вызываем его для передачи сообщения в JS.
  if (callback->IsFunction()) {
    // [...]
    MaybeLocal<Value> result = Local<Function>::Cast(callback)->Call(
        context, Undefined(isolate_), 1, args);
  }
}
```

## Использование протокола Inspector

Продолжая наш пример, `d8` перенаправляет сообщения от Inspector в JavaScript. Следующий код реализует базовое, но полностью функциональное взаимодействие с Inspector через `d8`:

```js
// inspector-demo.js
// Функция-получатель, вызываемая d8.
function receive(message) {
  print(message)
}

const msg = JSON.stringify({
  id: 0,
  method: 'Debugger.enable',
});

// Вызываем функцию, предоставленную d8.
send(msg);

// Запустите этот файл, введя команду 'd8 --enable-inspector inspector-demo.js'.
```

## Дополнительная документация

Более детализированный пример использования API Inspector доступен в [`test-api.js`](https://cs.chromium.org/chromium/src/v8/test/debugger/test-api.js?type=cs&q=test-api&l=1), который реализует простой API отладки для использования тестового набора V8.

V8 также содержит альтернативную интеграцию Inspector в [`inspector-test.cc`](https://cs.chromium.org/chromium/src/v8/test/inspector/inspector-test.cc?q=inspector-te+package:%5Echromium$&l=1).

Wiki Chrome DevTools предоставляет [полную документацию](https://chromedevtools.github.io/debugger-protocol-viewer/tot/) для всех доступных функций.
