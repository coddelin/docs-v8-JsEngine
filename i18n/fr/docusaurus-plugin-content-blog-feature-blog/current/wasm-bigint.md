---
title: &apos;Intégration de WebAssembly avec JavaScript BigInt&apos;
author: &apos;Alon Zakai&apos;
avatars:
  - &apos;alon-zakai&apos;
date: 2020-11-12
tags:
  - WebAssembly
  - ECMAScript
description: &apos;Les BigInts permettent de passer facilement des entiers 64 bits entre JavaScript et WebAssembly. Cet article explique ce que cela signifie et pourquoi c&apos;est utile, y compris la simplification pour les développeurs, l&apos;accélération de l&apos;exécution du code, et également la réduction des temps de compilation.&apos;
tweet: &apos;1331966281571037186&apos;
---
La fonctionnalité [JS-BigInt-Integration](https://github.com/WebAssembly/JS-BigInt-integration) permet de passer facilement des entiers 64 bits entre JavaScript et WebAssembly. Cet article explique ce que cela signifie et pourquoi c&apos;est utile, y compris la simplification pour les développeurs, l&apos;accélération de l&apos;exécution du code, et également la réduction des temps de compilation.

<!--truncate-->
## Entiers 64 bits

Les nombres en JavaScript sont des nombres à virgule flottante 64 bits. Une telle valeur peut contenir un entier 32 bits avec une précision complète, mais pas tous les entiers 64 bits. WebAssembly, en revanche, prend entièrement en charge les entiers 64 bits, avec le type `i64`. Un problème survient lors de la connexion des deux : si une fonction Wasm retourne un `i64`, par exemple, la machine virtuelle lance une exception si vous l&apos;appelez depuis JavaScript, quelque chose comme ceci :

```
TypeError: Wasm function signature contains illegal type
```

Comme le dit l&apos;erreur, `i64` n&apos;est pas un type valide pour JavaScript.

Historiquement, la meilleure solution pour cela était la « légalisation » du Wasm. La légalisation consiste à convertir les imports et exports Wasm pour utiliser des types valides pour JavaScript. En pratique, cela effectuait deux choses :

1. Remplacer un paramètre entier 64 bits par deux entiers 32 bits, représentant respectivement les bits de poids faible et élevé.
2. Remplacer une valeur de retour entière 64 bits par une valeur de retour 32 bits représentant les bits de poids faible, et utiliser une autre valeur de 32 bits pour les bits de poids élevé.

Par exemple, considérez ce module Wasm :

```wasm
(module
  (func $send_i64 (param $x i64)
    ..))
```

La légalisation le transformerait en cela :

```wasm
(module
  (func $send_i64 (param $x_low i32) (param $x_high i32)
    (local $x i64) ;; la vraie valeur utilisée par le reste du code
    ;; code pour combiner $x_low et $x_high en $x
    ..))
```

La légalisation est effectuée côté outils, avant que cela n&apos;atteigne la machine virtuelle qui l&apos;exécute. Par exemple, la bibliothèque d&apos;outils [Binaryen](https://github.com/WebAssembly/binaryen) possède une étape appelée [LegalizeJSInterface](https://github.com/WebAssembly/binaryen/blob/fd7e53fe0ae99bd27179cb35d537e4ce5ec1fe11/src/passes/LegalizeJSInterface.cpp) qui effectue cette transformation, laquelle est exécutée automatiquement dans [Emscripten](https://emscripten.org/) lorsque cela est nécessaire.

## Inconvénients de la légalisation

La légalisation fonctionne bien pour de nombreuses choses, mais elle a des inconvénients, comme le travail supplémentaire nécessaire pour combiner ou diviser les morceaux 32 bits en valeurs 64 bits. Bien que cela soit rare sur un chemin critique, lorsque cela se produit, le ralentissement peut être notable - nous verrons quelques chiffres plus tard.

Un autre inconvénient est que la légalisation est perceptible par les utilisateurs, car elle modifie l&apos;interface entre JavaScript et Wasm. Voici un exemple :

```c
// example.c

#include <stdint.h>

extern void send_i64_to_js(int64_t);

int main() {
  send_i64_to_js(0xABCD12345678ULL);
}
```

```javascript
// example.js

mergeInto(LibraryManager.library, {
  send_i64_to_js: function(value) {
    console.log("JS received: 0x" + value.toString(16));
  }
});
```

Ceci est un petit programme C qui appelle une fonction de [bibliothèque JavaScript](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html#implement-c-in-javascript) (c&apos;est-à-dire que nous définissons une fonction externe C en C, et nous l&apos;implémentons en JavaScript, comme un moyen simple et de bas niveau pour appeler entre Wasm et JavaScript). Tout ce que fait ce programme, c&apos;est envoyer un `i64` à JavaScript, où nous essayons de l&apos;imprimer.

Nous pouvons le construire avec

```
emcc example.c --js-library example.js -o out.js
```

Lorsque nous l&apos;exécutons, nous n&apos;obtenons pas ce à quoi nous nous attendions :

```
node out.js
JS received: 0x12345678
```

Nous avons envoyé `0xABCD12345678` mais n&apos;avons reçu que `0x12345678` 😔. Ce qui se passe ici, c&apos;est que la légalisation a transformé ce `i64` en deux `i32`, et notre code n&apos;a reçu que les 32 bits de poids faible, en ignorant un autre paramètre qui a été envoyé. Pour gérer les choses correctement, nous devrions faire quelque chose comme ceci :

```javascript
  // Le i64 est divisé en deux paramètres 32 bits, « low » et « high ».
  send_i64_to_js: function(low, high) {
    console.log("JS received: 0x" + high.toString(16) + low.toString(16));
  }
```

En exécutant ceci maintenant, nous obtenons

```
JS received: 0xabcd12345678
```

Comme vous pouvez le voir, il est possible de vivre avec la légalisation. Mais cela peut être un peu agaçant !

## La solution : les BigInts en JavaScript

JavaScript possède désormais des valeurs [BigInt](/features/bigint), qui représentent des entiers de taille arbitraire, ce qui permet de représenter correctement les entiers 64 bits. Il est naturel de vouloir utiliser ceux-ci pour représenter les `i64` provenant de Wasm. C’est précisément ce que permet la fonctionnalité d’intégration JS-BigInt !

Emscripten prend en charge l’intégration des BigInt pour Wasm, ce qui nous permet de compiler l’exemple original (sans aucun hack pour la légalisation), simplement en ajoutant `-s WASM_BIGINT` :

```
emcc example.c --js-library example.js -o out.js -s WASM_BIGINT
```

Nous pouvons alors l’exécuter (notez qu’actuellement, nous devons passer un flag à Node.js pour activer l’intégration de BigInt) :

```
node --experimental-wasm-bigint a.out.js
JS reçu : 0xabcd12345678
```

Parfait, exactement ce que nous voulions !

Et non seulement c’est plus simple, mais c’est aussi plus rapide. Comme mentionné précédemment, en pratique, il est rare que des conversions `i64` se produisent sur un chemin d’exécution critique, mais quand c’est le cas, le ralentissement peut être notable. Si nous transformons l’exemple ci-dessus en un benchmark, exécutant de nombreuses appels à `send_i64_to_js`, alors la version BigInt est 18 % plus rapide.

Un autre avantage de l’intégration BigInt est que la chaîne d’outils peut éviter la légalisation. Si Emscripten n’a pas besoin de légaliser, il peut ne pas avoir de travail à effectuer sur le Wasm que LLVM produit, ce qui accélère les temps de construction. Vous pouvez obtenir cette accélération si vous construisez avec `-s WASM_BIGINT` et ne fournissez aucun autre flag nécessitant des modifications. Par exemple, `-O0 -s WASM_BIGINT` fonctionne (mais les constructions optimisées [utilisent l’optimiseur Binaryen](https://emscripten.org/docs/optimizing/Optimizing-Code.html#link-times), ce qui est important pour la taille).

## Conclusion

L’intégration de WebAssembly BigInt a été implémentée dans [plusieurs navigateurs](https://webassembly.org/roadmap/), y compris Chrome 85 (publié le 2020-08-25), donc vous pouvez l’essayer dès aujourd’hui !
