---
title: &apos;Débogage via le protocole d'Inspecteur V8&apos;
description: &apos;Cette page est destinée à fournir aux intégrateurs les outils de base dont ils ont besoin pour implémenter la prise en charge du débogage dans V8.&apos;
---
V8 offre de nombreuses fonctionnalités de débogage aux utilisateurs et aux intégrateurs. Les utilisateurs interagissent généralement avec le débogueur V8 via l'interface [Chrome DevTools](https://developer.chrome.com/devtools). Les intégrateurs (y compris DevTools) doivent s'appuyer directement sur le [protocole Inspecteur](https://chromedevtools.github.io/debugger-protocol-viewer/tot/).

Cette page est destinée à fournir aux intégrateurs les outils de base dont ils ont besoin pour implémenter la prise en charge du débogage dans V8.

## Connexion à l'Inspecteur

La [console de débogage en ligne de commande `d8`](/docs/d8) de V8 inclut une intégration simple de l'inspecteur via [`InspectorFrontend`](https://cs.chromium.org/chromium/src/v8/src/d8/d8.cc?l=2286&rcl=608c4a9c391f3b7cac68068d61f2a8996f216973) et [`InspectorClient`](https://cs.chromium.org/chromium/src/v8/src/d8/d8.cc?l=2355&rcl=608c4a9c391f3b7cac68068d61f2a8996f216973). Le client configure un canal de communication pour les messages envoyés par l'intégrateur à V8 :

```cpp
static void SendInspectorMessage(
    const v8::FunctionCallbackInfo<v8::Value>& args) {
  // [...] Créer une StringView que l'inspecteur peut comprendre.
  session->dispatchProtocolMessage(message_view);
}
```

Pendant ce temps, le frontend établit un canal pour les messages envoyés de V8 à l'intégrateur en implémentant `sendResponse` et `sendNotification`, qui sont ensuite transmis à :

```cpp
void Send(const v8_inspector::StringView& string) {
  // [...] Transformations de chaîne.
  // Récupérer la propriété globale appelée &apos;receive&apos; du contexte actuel.
  Local<String> callback_name =
      v8::String::NewFromUtf8(isolate_, "receive", v8::NewStringType::kNormal)
          .ToLocalChecked();
  Local<Context> context = context_.Get(isolate_);
  Local<Value> callback =
      context->Global()->Get(context, callback_name).ToLocalChecked();
  // Et l'appeler pour transmettre le message à JS.
  if (callback->IsFunction()) {
    // [...]
    MaybeLocal<Value> result = Local<Function>::Cast(callback)->Call(
        context, Undefined(isolate_), 1, args);
  }
}
```

## Utilisation du protocole Inspecteur

En poursuivant avec notre exemple, `d8` transmet les messages de l'inspecteur à JavaScript. Le code suivant implémente une interaction basique, mais entièrement fonctionnelle avec l'Inspecteur via `d8` :

```js
// inspector-demo.js
// Fonction receveuse appelée par d8.
function receive(message) {
  print(message)
}

const msg = JSON.stringify({
  id: 0,
  method: &apos;Debugger.enable&apos;,
});

// Appeler la fonction fournie par d8.
send(msg);

// Exécutez ce fichier en exécutant &apos;d8 --enable-inspector inspector-demo.js&apos;.
```

## Documentation supplémentaire

Un exemple plus complet d'utilisation de l'API Inspecteur est disponible à [`test-api.js`](https://cs.chromium.org/chromium/src/v8/test/debugger/test-api.js?type=cs&q=test-api&l=1), qui implémente une API de débogage simple pour être utilisée par la suite de tests de V8.

V8 contient également une autre intégration Inspecteur à [`inspector-test.cc`](https://cs.chromium.org/chromium/src/v8/test/inspector/inspector-test.cc?q=inspector-te+package:%5Echromium$&l=1).

Le wiki de Chrome DevTools fournit une [documentation complète](https://chromedevtools.github.io/debugger-protocol-viewer/tot/) de toutes les fonctions disponibles.
