---
title: "Depuración mediante el protocolo V8 Inspector"
description: "Esta página está destinada a proporcionar a los integradores las herramientas básicas que necesitan para implementar soporte de depuración en V8."
---
V8 ofrece funcionalidades extensivas de depuración tanto a usuarios como a integradores. Los usuarios habitualmente interactúan con el depurador de V8 a través de la interfaz de [Chrome DevTools](https://developer.chrome.com/devtools). Los integradores (incluyendo DevTools) necesitan depender directamente del [Protocolo de Inspector](https://chromedevtools.github.io/debugger-protocol-viewer/tot/).

Esta página está destinada a proporcionar a los integradores las herramientas básicas que necesitan para implementar soporte de depuración en V8.

## Conectándose al Inspector

[La consola de depuración de línea de comandos `d8`](/docs/d8) de V8 incluye una integración simple con el inspector mediante el [`InspectorFrontend`](https://cs.chromium.org/chromium/src/v8/src/d8/d8.cc?l=2286&rcl=608c4a9c391f3b7cac68068d61f2a8996f216973) y [`InspectorClient`](https://cs.chromium.org/chromium/src/v8/src/d8/d8.cc?l=2355&rcl=608c4a9c391f3b7cac68068d61f2a8996f216973). El cliente establece un canal de comunicación para los mensajes enviados desde el integrador a V8:

```cpp
static void SendInspectorMessage(
    const v8::FunctionCallbackInfo<v8::Value>& args) {
  // [...] Crear un StringView que el Inspector pueda entender.
  session->dispatchProtocolMessage(message_view);
}
```

Mientras tanto, el frontend establece un canal para los mensajes enviados de V8 al integrador implementando `sendResponse` y `sendNotification`, que luego reenvían a:

```cpp
void Send(const v8_inspector::StringView& string) {
  // [...] Transformaciones de cadena.
  // Obtener la propiedad global llamada 'receive' del contexto actual.
  Local<String> callback_name =
      v8::String::NewFromUtf8(isolate_, "receive", v8::NewStringType::kNormal)
          .ToLocalChecked();
  Local<Context> context = context_.Get(isolate_);
  Local<Value> callback =
      context->Global()->Get(context, callback_name).ToLocalChecked();
  // Y llamarlo para pasar el mensaje a JS.
  if (callback->IsFunction()) {
    // [...]
    MaybeLocal<Value> result = Local<Function>::Cast(callback)->Call(
        context, Undefined(isolate_), 1, args);
  }
}
```

## Usando el Protocolo del Inspector

Continuando con nuestro ejemplo, `d8` reenvía los mensajes del inspector a JavaScript. El siguiente código implementa una interacción básica, pero completamente funcional, con el Inspector a través de `d8`:

```js
// inspector-demo.js
// Función receptora llamada por d8.
function receive(message) {
  print(message)
}

const msg = JSON.stringify({
  id: 0,
  method: 'Debugger.enable',
});

// Llamar a la función proporcionada por d8.
send(msg);

// Ejecutar este archivo con el comando 'd8 --enable-inspector inspector-demo.js'.
```

## Documentación adicional

Un ejemplo más desarrollado del uso de la API del Inspector está disponible en [`test-api.js`](https://cs.chromium.org/chromium/src/v8/test/debugger/test-api.js?type=cs&q=test-api&l=1), que implementa una API de depuración simple para el uso en la suite de pruebas de V8.

V8 también contiene una integración alternativa del Inspector en [`inspector-test.cc`](https://cs.chromium.org/chromium/src/v8/test/inspector/inspector-test.cc?q=inspector-te+package:%5Echromium$&l=1).

El wiki de Chrome DevTools proporciona [documentación completa](https://chromedevtools.github.io/debugger-protocol-viewer/tot/) de todas las funciones disponibles.
