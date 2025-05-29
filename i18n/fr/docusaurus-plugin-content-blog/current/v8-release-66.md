---
title: &apos;Publication de V8 v6.6&apos;
author: &apos;l&apos;équipe V8&apos;
date: 2018-03-27 13:33:37
tags:
  - version
description: &apos;V8 v6.6 inclut des liaisons optionnelles dans catch, une extension du découpage des chaînes, plusieurs améliorations des performances de l&apos;analyse/l&apos;exécution/l&apos;compilation, et bien plus encore !&apos;
tweet: &apos;978534399938584576&apos;
---
Toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est dérivée de la branche master de V8 juste avant une étape de bêta de Chrome. Aujourd&apos;hui, nous sommes ravis d&apos;annoncer notre nouvelle branche, [V8 version 6.6](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/6.6), qui est en bêta jusqu&apos;à sa publication en coordination avec Chrome 66 Stable dans quelques semaines. V8 v6.6 est remplie de nouvelles fonctionnalités destinées aux développeurs. Ce post offre un aperçu des points forts en préparation au lancement.

<!--truncate-->
## Fonctionnalités du langage JavaScript

### Révision de `Function.prototype.toString`  #function-tostring

[`Function.prototype.toString()`](/features/function-tostring) renvoie désormais des tranches exactes du texte du code source, y compris les espaces et les commentaires. Voici un exemple comparant l&apos;ancien comportement avec le nouveau :

```js
// Notez le commentaire entre le mot-clé `function`
// et le nom de la fonction, ainsi que l&apos;espace suivant
// le nom de la fonction.
function /* un commentaire */ foo () {}

// Précédemment :
foo.toString();
// → &apos;function foo() {}&apos;
//             ^ pas de commentaire
//                ^ pas d&apos;espace

// Maintenant :
foo.toString();
// → &apos;function /* commentaire */ foo () {}&apos;
```

### JSON ⊂ ECMAScript

Les caractères séparateurs de ligne (U+2028) et séparateurs de paragraphe (U+2029) sont désormais autorisés dans les littéraux de chaîne, [conformément au format JSON](/features/subsume-json). Auparavant, ces symboles étaient considérés comme des terminateurs de ligne dans les littéraux de chaîne, ce qui entraînait une exception `SyntaxError`.

### Liaison optionnelle dans `catch`

L&apos;instruction `catch` dans les blocs `try` peut désormais être [utilisée sans paramètre](/features/optional-catch-binding). Cela est utile si vous n&apos;avez pas besoin de l&apos;objet `exception` dans le code qui gère cette exception.

```js
try {
  doSomethingThatMightThrow();
} catch { // → Regarde maman, pas de liaison !
  handleException();
}
```

### Découpage unilatéral des chaînes

En plus de `String.prototype.trim()`, V8 implémente maintenant [`String.prototype.trimStart()` et `String.prototype.trimEnd()`](/features/string-trimming). Cette fonctionnalité était auparavant disponible via les méthodes non standard `trimLeft()` et `trimRight()`, qui restent des alias des nouvelles méthodes pour assurer la compatibilité avec les versions antérieures.

```js
const string = &apos;  bonjour le monde  &apos;;
string.trimStart();
// → &apos;bonjour le monde  &apos;
string.trimEnd();
// → &apos;  bonjour le monde&apos;
string.trim();
// → &apos;bonjour le monde&apos;
```

### `Array.prototype.values`

[La méthode `Array.prototype.values()`](https://tc39.es/ecma262/#sec-array.prototype.values) donne aux tableaux la même interface d&apos;itération que les collections `Map` et `Set` d&apos;ES2015 : tous peuvent désormais être parcourus par `keys`, `values` ou `entries` en appelant la méthode du même nom. Ce changement peut potentiellement être incompatible avec le code JavaScript existant. Si vous rencontrez des comportements étranges ou des erreurs sur un site web, essayez de désactiver cette fonctionnalité via `chrome://flags/#enable-array-prototype-values` et [soumettre un rapport d&apos;erreur](https://bugs.chromium.org/p/v8/issues/entry?template=Defect+report+from+user).

## Mise en cache du code après exécution

Les termes _chargement froid_ et _chargement chaud_ sont peut-être familiers pour les personnes préoccupées par les performances de chargement. Dans V8, il existe également le concept de _chargement actif_. Expliquons les différents niveaux avec Chrome intégrant V8 comme exemple :

- **Chargement froid :** Chrome visite la page web pour la première fois et n&apos;a aucune donnée mise en cache.
- **Chargement chaud :** Chrome se souvient que la page web a déjà été visitée et peut récupérer certains éléments (par exemple, des images et des fichiers sources de script) depuis le cache. V8 reconnaît que la page contient le même fichier de script et met en cache le code compilé avec le fichier de script dans le cache disque.
- **Chargement actif :** Au troisième visite de la page web, lorsque Chrome charge le fichier de script depuis le cache disque, il fournit également à V8 le code mis en cache lors du chargement précédent. V8 peut utiliser ce code mis en cache pour éviter d&apos;avoir à analyser et compiler le script à partir de zéro.

Avant la version 6.6 de V8, nous mettions en cache le code généré immédiatement après la compilation de niveau supérieur. V8 ne compile que les fonctions qui sont connues pour être exécutées immédiatement lors de la compilation de niveau supérieur et marque les autres fonctions pour une compilation paresseuse. Cela signifiait que le code mis en cache incluait uniquement le code de niveau supérieur, tandis que toutes les autres fonctions devaient être compilées lentement à partir de zéro à chaque chargement de la page. À partir de la version 6.6, V8 met en cache le code généré après l'exécution de niveau supérieur du script. Au fur et à mesure que nous exécutons le script, davantage de fonctions sont compilées paresseusement et peuvent être incluses dans le cache. En conséquence, ces fonctions n'ont pas besoin d'être compilées lors de futurs chargements de pages, réduisant ainsi le temps de compilation et d'analyse dans les scénarios de chargement intensif de 20 à 60 %. Le changement visible pour l'utilisateur est un fil principal moins congestionné, offrant ainsi une expérience de chargement plus fluide et plus rapide.

Restez à l'écoute pour un article de blog détaillé sur ce sujet prochainement.

## Compilation en arrière-plan

Depuis quelque temps, V8 est capable de [analyser le code JavaScript sur un fil d'arrière-plan](https://blog.chromium.org/2015/03/new-javascript-techniques-for-rapid.html). Avec le nouvel [interpréteur de bytecode Ignition de V8, lancé l'année dernière](/blog/launching-ignition-and-turbofan), nous avons pu étendre cette prise en charge pour permettre également la compilation du code source JavaScript en bytecode sur un fil d'arrière-plan. Cela permet aux intégrateurs de réaliser plus de travaux hors du fil principal, le libérant pour exécuter davantage de JavaScript et réduire les ralentissements. Nous avons activé cette fonctionnalité dans Chrome 66, où nous observons entre 5 % et 20 % de réduction du temps de compilation sur le fil principal pour les sites web typiques. Pour plus de détails, veuillez consulter [l'article de blog récent sur cette fonctionnalité](/blog/background-compilation).

## Suppression de la numérotation AST

Nous avons continué à récolter les avantages de la simplification de notre pipeline de compilation après le [lancement d'Ignition et TurboFan l'année dernière](/blog/launching-ignition-and-turbofan). Notre pipeline précédent nécessitait une étape post-analyse appelée "numérotation AST", où les nœuds dans l'arbre syntaxique abstrait généré étaient numérotés pour que les différents compilateurs l'utilisant disposent d'un point de référence commun.

Au fil du temps, ce passage de post-traitement avait gonflé pour inclure d'autres fonctionnalités : numérotation des points de suspension pour les générateurs et les fonctions async, collecte des fonctions internes pour une compilation anticipée, initialisation des littéraux ou détection des schémas de code non optimisables.

Avec le nouveau pipeline, le bytecode Ignition est devenu le point de référence commun, et la numérotation elle-même n'était plus nécessaire — mais les fonctionnalités restantes étaient encore nécessaires, et le passage de numérotation de l'AST demeurait.

Dans V8 v6.6, nous avons finalement réussi à [déplacer ou déprécier ces fonctionnalités restantes](https://bugs.chromium.org/p/v8/issues/detail?id=7178) dans d'autres passages, nous permettant de supprimer cette analyse de l'arbre. Cela a entraîné une amélioration de 3 à 5 % du temps de compilation réel.

## Améliorations de performances asynchrones

Nous avons réussi à obtenir de belles améliorations de performances pour les promesses et les fonctions asynchrones, et avons particulièrement réussi à réduire l'écart entre les fonctions asynchrones et les chaînes de promesses désucrées.

![Améliorations des performances des promesses](/_img/v8-release-66/promise.svg)

En outre, les performances des générateurs asynchrones et de l'itération asynchrone ont été améliorées de manière significative, les rendant une option viable pour le futur Node 10 LTS, qui est prévu pour inclure V8 v6.6. Par exemple, considérez l'implémentation suivante de la séquence de Fibonacci :

```js
async function* fibonacciSequence() {
  for (let a = 0, b = 1;;) {
    yield a;
    const c = a + b;
    a = b;
    b = c;
  }
}

async function fibonacci(id, n) {
  for await (const value of fibonacciSequence()) {
    if (n-- === 0) return value;
  }
}
```

Nous avons mesuré les améliorations suivantes pour ce modèle, avant et après la transpilation Babel :

![Améliorations de performances des générateurs asynchrones](/_img/v8-release-66/async-generator.svg)

Enfin, les [améliorations de bytecode](https://chromium-review.googlesource.com/c/v8/v8/+/866734) pour les "fonctions suspendables" telles que les générateurs, fonctions asynchrones et modules, ont amélioré les performances de ces fonctions lors de l'exécution dans l'interpréteur, et réduit leur taille compilée. Nous prévoyons d'améliorer encore davantage les performances des fonctions asynchrones et des générateurs asynchrones avec les prochaines versions, restez à l'écoute.

## Améliorations de performances des tableaux

Les performances de débit de `Array#reduce` ont été augmentées de plus de 10× pour les tableaux doubles creux ([voir notre article de blog pour une explication de ce que sont les tableaux creux et packés](/blog/elements-kinds)). Cela élargit le chemin rapide pour les cas où `Array#reduce` est appliqué à des tableaux doubles creux et packés.

![Améliorations des performances de `Array.prototype.reduce`](/_img/v8-release-66/array-reduce.svg)

## Atténuations contre le code non fiable

Dans V8 v6.6, nous avons introduit davantage [d'atténuations des vulnérabilités des canaux auxiliaires](/docs/untrusted-code-mitigations) pour empêcher la fuite d'informations vers le code JavaScript et WebAssembly non fiable.

## GYP est supprimé

Il s'agit de la première version de V8 livrée officiellement sans fichiers GYP. Si votre produit a besoin des fichiers GYP supprimés, vous devez les copier dans votre propre dépôt de code source.

## Profilage de la mémoire

Les DevTools de Chrome peuvent désormais tracer et prendre des instantanés des objets DOM C++ et afficher tous les objets DOM accessibles depuis JavaScript avec leurs références. Cette fonctionnalité est l'un des avantages du nouveau mécanisme de traçage C++ du collecteur de déchets V8. Pour plus d'informations, veuillez consulter [l'article de blog dédié](/blog/tracing-js-dom).

## API V8

Veuillez utiliser `git log branch-heads/6.5..branch-heads/6.6 include/v8.h` pour obtenir une liste des modifications de l'API.
