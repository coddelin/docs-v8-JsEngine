---
title: &apos;Debuggen über das V8-Inspector-Protokoll&apos;
description: &apos;Diese Seite soll Embeds die grundlegenden Werkzeuge bereitstellen, die sie benötigen, um Debugging-Unterstützung in V8 zu implementieren.&apos;
---
V8 bietet sowohl für Benutzer als auch für Embeds umfassende Debugging-Funktionen. Benutzer interagieren normalerweise über die [Chrome DevTools](https://developer.chrome.com/devtools)-Schnittstelle mit dem V8-Debugger. Embeds (einschließlich DevTools) müssen direkt auf das [Inspector-Protokoll](https://chromedevtools.github.io/debugger-protocol-viewer/tot/) zurückgreifen.

Diese Seite soll Embeds die grundlegenden Werkzeuge bereitstellen, die sie benötigen, um Debugging-Unterstützung in V8 zu implementieren.

## Verbindung zum Inspector herstellen

Die [Befehlszeilendebug-Shell `d8`](/docs/d8) von V8 enthält eine einfache Inspector-Integration durch [`InspectorFrontend`](https://cs.chromium.org/chromium/src/v8/src/d8/d8.cc?l=2286&rcl=608c4a9c391f3b7cac68068d61f2a8996f216973) und [`InspectorClient`](https://cs.chromium.org/chromium/src/v8/src/d8/d8.cc?l=2355&rcl=608c4a9c391f3b7cac68068d61f2a8996f216973). Der Client richtet einen Kommunikationskanal für Nachrichten ein, die vom Embedder an V8 gesendet werden:

```cpp
static void SendInspectorMessage(
    const v8::FunctionCallbackInfo<v8::Value>& args) {
  // [...] Erstellen Sie eine StringView, die der Inspector verstehen kann.
  session->dispatchProtocolMessage(message_view);
}
```

In der Zwischenzeit richtet das Frontend einen Kanal für Nachrichten ein, die von V8 an den Embedder gesendet werden, indem `sendResponse` und `sendNotification` implementiert werden, die dann an:

```cpp
void Send(const v8_inspector::StringView& string) {
  // [...] String-Transformationen.
  // Abrufen der globalen Eigenschaft namens &apos;receive&apos; aus dem aktuellen Kontext.
  Local<String> callback_name =
      v8::String::NewFromUtf8(isolate_, "receive", v8::NewStringType::kNormal)
          .ToLocalChecked();
  Local<Context> context = context_.Get(isolate_);
  Local<Value> callback =
      context->Global()->Get(context, callback_name).ToLocalChecked();
  // Und rufen Sie es auf, um die Nachricht an JS weiterzuleiten.
  if (callback->IsFunction()) {
    // [...]
    MaybeLocal<Value> result = Local<Function>::Cast(callback)->Call(
        context, Undefined(isolate_), 1, args);
  }
}
```

## Verwendung des Inspector-Protokolls

Fortsetzung unseres Beispiels: `d8` leitet Inspector-Nachrichten an JavaScript weiter. Der folgende Code implementiert eine grundlegende, aber vollständig funktionsfähige Interaktion mit dem Inspector über `d8`:

```js
// inspector-demo.js
// Empfängerfunktion, die von d8 aufgerufen wird.
function receive(message) {
  print(message)
}

const msg = JSON.stringify({
  id: 0,
  method: &apos;Debugger.enable&apos;,
});

// Funktion aufrufen, die von d8 bereitgestellt wird.
send(msg);

// Führen Sie diese Datei aus, indem Sie &apos;d8 --enable-inspector inspector-demo.js&apos; ausführen.
```

## Weitere Dokumentation

Ein ausführlicheres Beispiel für die Verwendung der Inspector-API finden Sie unter [`test-api.js`](https://cs.chromium.org/chromium/src/v8/test/debugger/test-api.js?type=cs&q=test-api&l=1), das eine einfache Debugging-API für die Verwendung durch V8’s Test-Suite implementiert.

V8 enthält auch eine alternative Inspector-Integration unter [`inspector-test.cc`](https://cs.chromium.org/chromium/src/v8/test/inspector/inspector-test.cc?q=inspector-te+package:%5Echromium$&l=1).

Das Chrome-DevTools-Wiki bietet [vollständige Dokumentation](https://chromedevtools.github.io/debugger-protocol-viewer/tot/) über alle verfügbaren Funktionen.
