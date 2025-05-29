---
title: 'Applications rapides et parallèles avec SIMD WebAssembly'
author: 'Deepti Gandluri ([@dptig](https://twitter.com/dptig)), Thomas Lively ([@tlively52](https://twitter.com/tlively52)), Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))'
date: 2020-01-30
updated: 2022-11-06
tags:
  - WebAssembly
description: 'Apporter les opérations vectorielles à WebAssembly'
tweet: '1222944308183085058'
---
SIMD signifie _Single Instruction, Multiple Data_. Les instructions SIMD sont une classe spéciale d'instructions qui exploitent le parallélisme des données dans les applications en effectuant simultanément la même opération sur plusieurs éléments de données. Les applications intensives en calcul comme les codecs audio/vidéo, les processeurs d'image, sont toutes des exemples d'applications qui tirent parti des instructions SIMD pour accélérer les performances. La plupart des architectures modernes supportent certains variantes d'instructions SIMD.

<!--truncate-->
La proposition SIMD de WebAssembly définit un sous-ensemble portable et performant d'opérations SIMD disponibles sur la plupart des architectures modernes. Cette proposition a dérivé de nombreux éléments de la [proposition SIMD.js](https://github.com/tc39/ecmascript_simd), qui elle-même dérivait à l'origine de la spécification [Dart SIMD](https://www.researchgate.net/publication/261959129_A_SIMD_programming_model_for_dart_javascriptand_other_dynamically_typed_scripting_languages). La proposition SIMD.js était une API proposée au TC39 avec de nouveaux types et fonctions pour effectuer des calculs SIMD, mais celle-ci a été archivée en faveur d'un support plus transparent des opérations SIMD dans WebAssembly. La [proposition SIMD de WebAssembly](https://github.com/WebAssembly/simd) a été introduite comme un moyen pour les navigateurs d'exploiter le parallélisme au niveau des données en utilisant le matériel sous-jacent.

## Proposition SIMD pour WebAssembly

L'objectif général de la proposition SIMD pour WebAssembly est d'introduire des opérations vectorielles dans la spécification de WebAssembly, d'une manière qui garantit des performances portables.

Le jeu d'instructions SIMD est large et varié selon les architectures. Les opérations incluses dans la proposition SIMD de WebAssembly consistent en des opérations bien supportées sur une grande variété de plateformes et ayant prouvé leur efficacité. À cet effet, la proposition actuelle se limite à normaliser les opérations SIMD à largeur fixe de 128 bits.

La proposition actuelle introduit un nouveau type de valeur `v128`, et un certain nombre de nouvelles opérations qui fonctionnent sur ce type. Les critères utilisés pour déterminer ces opérations sont :

- Les opérations doivent être bien supportées sur plusieurs architectures modernes.
- Les gains de performance doivent être positifs sur plusieurs architectures pertinentes au sein d'un groupe d'instructions.
- L'ensemble d'opérations choisi doit minimiser les goulets d'étranglement de performance, le cas échéant.

La proposition est désormais dans [l'état finalisé (phase 4)](https://github.com/WebAssembly/simd/issues/480), tant V8 que la chaîne d'outils ont des implémentations fonctionnelles.

## Activation du support SIMD

### Détection des fonctionnalités

Tout d'abord, notez que SIMD est une nouvelle fonctionnalité et qu'elle n'est pas encore disponible sur tous les navigateurs prenant en charge WebAssembly. Vous pouvez vérifier quels navigateurs supportent les nouvelles fonctionnalités de WebAssembly sur le site [webassembly.org](https://webassembly.org/roadmap/).

Pour garantir que tous les utilisateurs puissent charger votre application, vous devez construire deux versions différentes - une avec SIMD activé et une sans SIMD - et charger la version correspondante en fonction des résultats de la détection de fonctionnalités. Pour détecter SIMD au moment de l'exécution, vous pouvez utiliser la bibliothèque [`wasm-feature-detect`](https://github.com/GoogleChromeLabs/wasm-feature-detect) et charger le module correspondant comme suit :

```js
import { simd } from 'wasm-feature-detect';

(async () => {
  const hasSIMD = await simd();
  const module = await (
    hasSIMD
      ? import('./module-with-simd.js')
      : import('./module-without-simd.js')
  );
  // …utilisez maintenant `module` comme vous le feriez normalement
})();
```

Pour en savoir plus sur la construction du code avec support SIMD, consultez la section [ci-dessous](#building-with-simd-support).

### Support SIMD dans les navigateurs

Le support SIMD pour WebAssembly est disponible par défaut à partir de Chrome 91. Assurez-vous d'utiliser la dernière version de la chaîne d'outils comme indiqué ci-dessous, ainsi que la dernière version de wasm-feature-detect pour détecter les moteurs prenant en charge la version finale de la spécification. Si quelque chose semble incorrect, veuillez [signaler un problème](https://crbug.com/v8).

Le support SIMD pour WebAssembly est également disponible dans Firefox 89 et versions ultérieures.

## Construction avec support SIMD

### Construction de C / C++ pour cibler SIMD

Le support SIMD pour WebAssembly dépend de l'utilisation d'une version récente de clang avec le backend LLVM de WebAssembly activé. Emscripten supporte également la proposition SIMD pour WebAssembly. Installez et activez la distribution `latest` d'emscripten en utilisant [emsdk](https://emscripten.org/docs/getting_started/downloads.html) pour utiliser les fonctionnalités SIMD.

```bash
./emsdk install latest
./emsdk activate latest
```

Il existe plusieurs façons d'activer la génération de code SIMD lors du portage de votre application pour utiliser SIMD. Une fois la dernière version d'Emscripten installée, compilez avec Emscripten et passez l'option `-msimd128` pour activer SIMD.

```bash
emcc -msimd128 -O3 foo.c -o foo.js
```

Les applications déjà portées pour utiliser WebAssembly peuvent bénéficier de SIMD sans modification du code source grâce aux optimisations d'autovectorisation de LLVM.

Ces optimisations peuvent transformer automatiquement les boucles effectuant des opérations arithmétiques à chaque itération en boucles équivalentes qui effectuent les mêmes opérations arithmétiques sur plusieurs entrées à la fois en utilisant des instructions SIMD. Les autovectorisateurs de LLVM sont activés par défaut aux niveaux d'optimisation `-O2` et `-O3` lorsque l'option `-msimd128` est fournie.

Par exemple, considérez la fonction suivante qui multiplie les éléments de deux tableaux d'entrée et stocke les résultats dans un tableau de sortie.

```cpp
void multiply_arrays(int* out, int* in_a, int* in_b, int size) {
  for (int i = 0; i < size; i++) {
    out[i] = in_a[i] * in_b[i];
  }
}
```

Sans passer l'option `-msimd128`, le compilateur génère cette boucle WebAssembly :

```wasm
(loop
  (i32.store
    … obtenir l'adresse dans `out` …
    (i32.mul
      (i32.load … obtenir l'adresse dans `in_a` …)
      (i32.load … obtenir l'adresse dans `in_b` …)
  …
)
```

Mais lorsque l'option `-msimd128` est utilisée, l'autovectorisateur transforme cela en code incluant la boucle suivante :

```wasm
(loop
  (v128.store align=4
    … obtenir l'adresse dans `out` …
    (i32x4.mul
       (v128.load align=4 … obtenir l'adresse dans `in_a` …)
       (v128.load align=4 … obtenir l'adresse dans `in_b` …)
    …
  )
)
```

Le corps de la boucle a la même structure, mais des instructions SIMD sont utilisées pour charger, multiplier et stocker quatre éléments à la fois dans le corps de la boucle.

Pour un contrôle plus précis des instructions SIMD générées par le compilateur, incluez le fichier d'en-tête [`wasm_simd128.h`](https://github.com/llvm/llvm-project/blob/master/clang/lib/Headers/wasm_simd128.h), qui définit un ensemble d'intrinsics. Les intrinsics sont des fonctions spéciales qui, lorsqu'elles sont appelées, seront transformées par le compilateur en instructions SIMD WebAssembly correspondantes, sauf si le compilateur peut effectuer d'autres optimisations.

Par exemple, voici la même fonction que précédemment, réécrite manuellement pour utiliser les intrinsics SIMD.

```cpp
#include <wasm_simd128.h>

void multiply_arrays(int* out, int* in_a, int* in_b, int size) {
  for (int i = 0; i < size; i += 4) {
    v128_t a = wasm_v128_load(&in_a[i]);
    v128_t b = wasm_v128_load(&in_b[i]);
    v128_t prod = wasm_i32x4_mul(a, b);
    wasm_v128_store(&out[i], prod);
  }
}
```

Ce code réécrit manuellement suppose que les tableaux d'entrée et de sortie sont alignés, ne se chevauchent pas et que `size` est un multiple de quatre. L'autovectorisateur ne peut pas faire ces hypothèses et doit générer un code supplémentaire pour gérer les cas où elles ne sont pas vraies, donc le code SIMD écrit à la main finit souvent par être plus petit que le code SIMD autovectorisé.

### Cross-compilation de projets C / C++ existants

De nombreux projets existants prennent déjà en charge SIMD lorsqu'ils ciblent d'autres plateformes, en particulier les instructions [SSE](https://en.wikipedia.org/wiki/Streaming_SIMD_Extensions) et [AVX](https://en.wikipedia.org/wiki/Advanced_Vector_Extensions) sur les plateformes x86 / x86-64, ainsi que les instructions [NEON](https://en.wikipedia.org/wiki/ARM_architecture#Advanced_SIMD_(Neon)) sur les plateformes ARM. Il existe deux façons couramment utilisées pour les implémenter.

La première consiste à utiliser des fichiers d'assemblage qui s'occupent des opérations SIMD et sont liés aux fichiers C / C++ lors du processus de construction. La syntaxe et les instructions de l'assemblage sont très spécifiques à la plateforme et non portables, donc, pour profiter de SIMD, ces projets doivent ajouter WebAssembly comme cible supplémentaire prise en charge et réimplémenter les fonctions correspondantes en utilisant soit le [format texte WebAssembly](https://webassembly.github.io/spec/core/text/index.html), soit les intrinsics décrits [ci-dessus](#building-c-%2F-c%2B%2B-to-target-simd).

Une autre approche courante consiste à utiliser directement les intrinsics SSE / SSE2 / AVX / NEON dans le code C / C++, et ici Emscripten peut aider. Emscripten [fournit des en-têtes compatibles et une couche d'émulation](https://emscripten.org/docs/porting/simd.html) pour tous ces ensembles d'instructions, ainsi qu'une couche d'émulation qui les compile directement en intrinsics Wasm lorsque c'est possible, ou en code scalaire sinon.

Pour cross-compiler de tels projets, commencez par activer SIMD via des options de configuration spécifiques au projet, par exemple `./configure --enable-simd` pour qu'il passe `-msse`, `-msse2`, `-mavx` ou `-mfpu=neon` au compilateur et appelle les intrinsics correspondants. Ensuite, ajoutez l'option `-msimd128` pour activer également SIMD WebAssembly, soit en utilisant `CFLAGS=-msimd128 make …` / `CXXFLAGS="-msimd128 make …`, soit en modifiant directement la configuration de construction lors du ciblage WebAssembly.

### Construction de projets Rust pour cibler SIMD

Lors de la compilation de code Rust pour cibler SIMD WebAssembly, vous devrez activer la même fonctionnalité LLVM `simd128` que dans Emscripten.

Si vous pouvez contrôler directement les options `rustc` ou via la variable d'environnement `RUSTFLAGS`, passez l'option `-C target-feature=+simd128` :

```bash
rustc … -C target-feature=+simd128 -o out.wasm
```

ou

```bash
RUSTFLAGS="-C target-feature=+simd128" cargo build
```

Comme dans Clang / Emscripten, les autovectoriseurs de LLVM sont activés par défaut pour le code optimisé lorsque la fonctionnalité `simd128` est activée.

Par exemple, l'équivalent en Rust de l'exemple `multiply_arrays` ci-dessus

```rust
pub fn multiply_arrays(out: &mut [i32], in_a: &[i32], in_b: &[i32]) {
  in_a.iter()
    .zip(in_b)
    .zip(out)
    .for_each(|((a, b), dst)| {
        *dst = a * b;
    });
}
```

produirait un code similaire autovectorisé pour la partie alignée des entrées.

Afin d'avoir un contrôle manuel sur les opérations SIMD, vous pouvez utiliser la chaîne d'outils nightly, activer la fonctionnalité Rust `wasm_simd` et invoquer les intrinsics directement depuis l'espace de noms [`std::arch::wasm32`](https://doc.rust-lang.org/stable/core/arch/wasm32/index.html#simd) :

```rust
#![feature(wasm_simd)]

use std::arch::wasm32::*;

pub unsafe fn multiply_arrays(out: &mut [i32], in_a: &[i32], in_b: &[i32]) {
  in_a.chunks(4)
    .zip(in_b.chunks(4))
    .zip(out.chunks_mut(4))
    .for_each(|((a, b), dst)| {
      let a = v128_load(a.as_ptr() as *const v128);
      let b = v128_load(b.as_ptr() as *const v128);
      let prod = i32x4_mul(a, b);
      v128_store(dst.as_mut_ptr() as *mut v128, prod);
    });
}
```

Sinon, utilisez une bibliothèque d'assistance comme [`packed_simd`](https://crates.io/crates/packed_simd_2) qui abstrait les implémentations SIMD sur diverses plateformes.

## Cas d'utilisation captivants

La proposition SIMD de WebAssembly vise à accélérer les applications à hautes capacités de calcul, comme les codecs audio/vidéo, les applications de traitement d'image, les applications cryptographiques, etc. Actuellement, WebAssembly SIMD est pris en charge de manière expérimentale dans des projets open source largement utilisés comme [Halide](https://github.com/halide/Halide/blob/master/README_webassembly.md), [OpenCV.js](https://docs.opencv.org/3.4/d5/d10/tutorial_js_root.html), et [XNNPACK](https://github.com/google/XNNPACK).

Quelques démos intéressantes proviennent du projet [MediaPipe](https://github.com/google/mediapipe) de l'équipe Google Research.

D'après leur description, MediaPipe est un cadre pour construire des pipelines d'apprentissage machine appliqués multimodaux (par exemple, vidéo, audio, toutes les données de séries temporelles). Et ils ont aussi une [version Web](https://developers.googleblog.com/2020/01/mediapipe-on-web.html) !

Une des démos les plus visuellement attrayantes où il est facile d'observer la différence de performance avec SIMD est une version uniquement CPU (non GPU) d'un système de suivi des mains. [Sans SIMD](https://storage.googleapis.com/aim-bucket/users/tmullen/demos_10_2019_cdc/rebuild_04_2021/mediapipe_handtracking/gl_graph_demo.html), vous pouvez obtenir seulement environ 14-15 FPS (images par seconde) sur un ordinateur portable moderne, tandis que [avec SIMD activé dans Chrome Canary](https://storage.googleapis.com/aim-bucket/users/tmullen/demos_10_2019_cdc/rebuild_04_2021/mediapipe_handtracking_simd/gl_graph_demo.html), vous obtenez une expérience beaucoup plus fluide à 38-40 FPS.

<figure>
  <video autoplay muted playsinline loop width="600" height="216" src="/_img/simd/hand.mp4"></video>
</figure>

Un autre ensemble intéressant de démos qui utilise SIMD pour une expérience fluide provient d'OpenCV - une bibliothèque de vision par ordinateur populaire qui peut également être compilée en WebAssembly. Elles sont disponibles via [ce lien](https://bit.ly/opencv-camera-demos), ou vous pouvez consulter les versions pré-enregistrées ci-dessous :

<figure>
  <video autoplay muted playsinline loop width="256" height="512" src="/_img/simd/credit-card.mp4"></video>
  <figcaption>Lecture de carte</figcaption>
</figure>

<figure>
  <video autoplay muted playsinline loop width="600" height="646" src="/_img/simd/invisibility-cloak.mp4"></video>
  <figcaption>Cape d'invisibilité</figcaption>
</figure>

<figure>
  <video autoplay muted playsinline loop width="600" height="658" src="/_img/simd/emotion-recognizer.mp4"></video>
  <figcaption>Remplacement par des emojis</figcaption>
</figure>

## Travaux futurs

La proposition actuelle SIMD à largeur fixe est en [Phase 4](https://github.com/WebAssembly/meetings/blob/master/process/phases.md#3-implementation-phase-community--working-group), donc elle est considérée comme terminée.

Certaines explorations des extensions SIMD futures ont commencé dans les propositions [Relaxed SIMD](https://github.com/WebAssembly/relaxed-simd) et [Flexible Vectors](https://github.com/WebAssembly/flexible-vectors), qui, au moment de l'écriture, sont en Phase 1.
