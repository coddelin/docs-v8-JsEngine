---
title: 'Publication V8 v8.5'
author: 'Zeynep Cankara, suivant quelques cartes'
avatars:
 - 'zeynep-cankara'
date: 2020-07-21
tags:
 - publication
description: 'La version V8 v8.5 propose Promise.any, String#replaceAll, des opérateurs d'affectation logiques, la prise en charge du multi-valeur WebAssembly et du BigInt, ainsi que des améliorations de performances.'
tweet:
---
Tous les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](https://v8.dev/docs/release-process). Chaque version est issue du master Git de V8 juste avant une étape bêta de Chrome. Aujourd'hui, nous sommes ravis d'annoncer notre nouvelle branche, [V8 version 8.5](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.5), qui est en bêta jusqu'à sa publication en coordination avec Chrome 85 Stable dans quelques semaines. V8 v8.5 regorge de nombreuses nouveautés destinées aux développeurs. Ce post offre un aperçu de certains points forts en prévision de la publication.

<!--truncate-->
## JavaScript

### `Promise.any` et `AggregateError`

`Promise.any` est un combinateur de promesses qui résout la promesse résultante dès qu'une des promesses d'entrée est accomplie.

```js
const promises = [
  fetch('/endpoint-a').then(() => 'a'),
  fetch('/endpoint-b').then(() => 'b'),
  fetch('/endpoint-c').then(() => 'c'),
];
try {
  const first = await Promise.any(promesses);
  // L'une des promesses a été accomplie.
  console.log(first);
  // → p. ex. 'b'
} catch (error) {
  // Toutes les promesses ont été rejetées.
  console.assert(error instanceof AggregateError);
  // Affiche les valeurs de rejet :
  console.log(error.errors);
}
```

Si toutes les promesses d'entrée sont rejetées, la promesse résultante est rejetée avec un objet `AggregateError` contenant une propriété `errors` qui contient un tableau des valeurs de rejet.

Veuillez consulter [notre explication](https://v8.dev/features/promise-combinators#promise.any) pour en savoir plus.

### `String.prototype.replaceAll`

`String.prototype.replaceAll` fournit un moyen simple de remplacer toutes les occurrences d'une sous-chaîne sans créer un `RegExp` global.

```js
const queryString = 'q=query+string+parameters';

// Fonctionne, mais nécessite une escapade dans les expressions régulières.
queryString.replace(/\+/g, ' ');
// → 'q=query string parameters'

// Plus simple !
queryString.replaceAll('+', ' ');
// → 'q=query string parameters'
```

Veuillez consulter [notre explication](https://v8.dev/features/string-replaceall) pour en savoir plus.

### Opérateurs d'affectation logique

Les opérateurs d'affectation logique sont de nouveaux opérateurs d'affectation composés qui combinent les opérations logiques `&&`, `||`, ou `??` avec une affectation.

```js
x &&= y;
// À peu près équivalent à x && (x = y)
x ||= y;
// À peu près équivalent à x || (x = y)
x ??= y;
// À peu près équivalent à x ?? (x = y)
```

Notez que, contrairement aux opérateurs d'affectation composés mathématiques et bit à bit, les opérateurs d'affectation logique n'effectuent que conditionnellement l'affectation.

Veuillez lire [notre explication](https://v8.dev/features/logical-assignment) pour une explication plus détaillée.

## WebAssembly

### Liftoff déployé sur toutes les plateformes

Depuis V8 v6.9, [Liftoff](https://v8.dev/blog/liftoff) a été utilisé comme compilateur de base pour WebAssembly sur les plateformes Intel (et Chrome 69 l'a activé sur les systèmes de bureau). Comme nous étions préoccupés par l'augmentation de la mémoire (due à un plus grand nombre de codes générés par le compilateur de base), nous l'avons retenu pour les systèmes mobiles jusqu'à présent. Après quelques expérimentations au cours des derniers mois, nous sommes convaincus que l'augmentation de la mémoire est négligeable dans la plupart des cas, ce qui nous permet enfin d'activer Liftoff par défaut sur toutes les architectures, augmentant ainsi la vitesse de compilation, en particulier sur les appareils arm (32 et 64 bits). Chrome 85 suit cette tendance et déploie Liftoff.

### Prise en charge du multi-valeur déployée

La prise en charge de WebAssembly pour [les blocs de code multi-valeurs et les retours de fonction](https://github.com/WebAssembly/multi-value) est maintenant disponible pour une utilisation générale. Cela reflète la fusion récente de la proposition dans la norme officielle de WebAssembly et est pris en charge par tous les niveaux de compilation.

Par exemple, ceci est maintenant une fonction valide en WebAssembly :

```wasm
(func $swap (param i32 i32) (result i32 i32)
  (local.get 1) (local.get 0)
)
```

Si la fonction est exportée, elle peut également être appelée depuis JavaScript, et elle retourne un tableau :

```js
instance.exports.swap(1, 2);
// → [2, 1]
```

Inversement, si une fonction JavaScript retourne un tableau (ou tout autre itérateur), elle peut être importée et appelée comme une fonction avec plusieurs retours à l'intérieur du module WebAssembly :

```js
new WebAssembly.Instance(module, {
  imports: {
    swap: (x, y) => [y, x],
  },
});
```

```wasm
(func $main (result i32 i32)
  i32.const 0
  i32.const 1
  call $swap
)
```

Plus important encore, les chaînes d'outils peuvent désormais utiliser cette fonctionnalité pour générer un code plus compact et plus rapide au sein d'un module WebAssembly.

### Prise en charge de JS BigInts

Le support de WebAssembly pour [convertir les valeurs WebAssembly I64 depuis et vers les BigInts de JavaScript](https://github.com/WebAssembly/JS-BigInt-integration) a été livré et est disponible pour une utilisation générale conformément aux dernières modifications de la norme officielle.

Ainsi, les fonctions WebAssembly avec des paramètres et des valeurs de retour de type i64 peuvent être appelées depuis JavaScript sans perte de précision :

```wasm
(module
  (func $add (param $x i64) (param $y i64) (result i64)
    local.get $x
    local.get $y
    i64.add)
  (export "add" (func $add)))
```

Depuis JavaScript, seuls les BigInts peuvent être passés en tant que paramètre I64:

```js
WebAssembly.instantiateStreaming(fetch('i64.wasm'))
  .then(({ module, instance }) => {
    instance.exports.add(12n, 30n);
    // → 42n
    instance.exports.add(12, 30);
    // → TypeError: les paramètres ne sont pas de type BigInt
  });
```

## API V8

Veuillez utiliser `git log branch-heads/8.4..branch-heads/8.5 include/v8.h` pour obtenir une liste des modifications de l'API.

Les développeurs ayant un dépôt V8 actif peuvent utiliser `git checkout -b 8.5 -t branch-heads/8.5` pour expérimenter les nouvelles fonctionnalités dans V8 v8.5. Vous pouvez également [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer les nouvelles fonctionnalités bientôt.
