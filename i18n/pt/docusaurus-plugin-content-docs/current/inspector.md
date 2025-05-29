---
title: 'Depuração pelo V8 Inspector Protocol'
description: 'Esta página tem o objetivo de fornecer aos embutidores as ferramentas básicas necessárias para implementar suporte à depuração no V8.'
---
O V8 oferece ampla funcionalidade de depuração para usuários e embutidores. Normalmente, os usuários interagem com o depurador V8 através da interface [Chrome DevTools](https://developer.chrome.com/devtools). Os embutidores (incluindo DevTools) precisam contar diretamente com o [Inspector Protocol](https://chromedevtools.github.io/debugger-protocol-viewer/tot/).

Esta página tem o objetivo de fornecer aos embutidores as ferramentas básicas necessárias para implementar suporte à depuração no V8.

## Conectando ao Inspector

O [shell de depuração na linha de comando do V8 `d8`](/docs/d8) inclui uma integração simples com o inspector por meio do [`InspectorFrontend`](https://cs.chromium.org/chromium/src/v8/src/d8/d8.cc?l=2286&rcl=608c4a9c391f3b7cac68068d61f2a8996f216973) e [`InspectorClient`](https://cs.chromium.org/chromium/src/v8/src/d8/d8.cc?l=2355&rcl=608c4a9c391f3b7cac68068d61f2a8996f216973). O cliente configura um canal de comunicação para mensagens enviadas do embutidor para o V8:

```cpp
static void SendInspectorMessage(
    const v8::FunctionCallbackInfo<v8::Value>& args) {
  // [...] Cria um StringView que o Inspector possa entender.
  session->dispatchProtocolMessage(message_view);
}
```

Enquanto isso, o frontend estabelece um canal para mensagens enviadas do V8 para o embutidor ao implementar `sendResponse` e `sendNotification`, que então se encaminham para:

```cpp
void Send(const v8_inspector::StringView& string) {
  // [...] Transformações de string.
  // Obtém a propriedade global chamada 'receive' do contexto atual.
  Local<String> callback_name =
      v8::String::NewFromUtf8(isolate_, "receive", v8::NewStringType::kNormal)
          .ToLocalChecked();
  Local<Context> context = context_.Get(isolate_);
  Local<Value> callback =
      context->Global()->Get(context, callback_name).ToLocalChecked();
  // E chama essa função para passar a mensagem ao JS.
  if (callback->IsFunction()) {
    // [...]
    MaybeLocal<Value> result = Local<Function>::Cast(callback)->Call(
        context, Undefined(isolate_), 1, args);
  }
}
```

## Usando o Inspector Protocol

Continuando com o nosso exemplo, `d8` encaminha mensagens do inspector ao JavaScript. O código abaixo implementa uma interação básica, mas totalmente funcional com o Inspector por meio do `d8`:

```js
// inspector-demo.js
// Função receptora chamada pelo d8.
function receive(message) {
  print(message)
}

const msg = JSON.stringify({
  id: 0,
  method: 'Debugger.enable',
});

// Chama a função fornecida pelo d8.
send(msg);

// Execute este arquivo com o comando 'd8 --enable-inspector inspector-demo.js'.
```

## Documentação adicional

Um exemplo mais elaborado de uso da API do Inspector está disponível em [`test-api.js`](https://cs.chromium.org/chromium/src/v8/test/debugger/test-api.js?type=cs&q=test-api&l=1), que implementa uma API de depuração simples para uso na suíte de testes do V8.

O V8 também contém uma integração alternativa com o Inspector em [`inspector-test.cc`](https://cs.chromium.org/chromium/src/v8/test/inspector/inspector-test.cc?q=inspector-te+package:%5Echromium$&l=1).

A wiki do Chrome DevTools fornece [documentação completa](https://chromedevtools.github.io/debugger-protocol-viewer/tot/) de todas as funções disponíveis.
