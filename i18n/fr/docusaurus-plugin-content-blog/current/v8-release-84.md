---
title: &apos;Sortie V8 v8.4&apos;
author: &apos;Camillo Bruni, profitant de nouveaux booléens&apos;
avatars:
 - &apos;camillo-bruni&apos;
date: 2020-06-30
tags:
 - sortie
description: &apos;V8 v8.4 propose des références faibles et des performances améliorées pour WebAssembly.&apos;
tweet: &apos;1277983235641761795&apos;
---
Tous les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de sortie](https://v8.dev/docs/release-process). Chaque version est dérivée du maître Git de V8 juste avant une étape Beta de Chrome. Aujourd’hui, nous sommes ravis d’annoncer notre nouvelle branche, [V8 version 8.4](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.4), qui est en phase beta jusqu’à sa sortie en coordination avec la version stable de Chrome 84 dans quelques semaines. V8 v8.4 regorge de nombreuses fonctionnalités axées sur les développeurs. Ce poste fournit un aperçu de certains faits saillants en prévision de la sortie.

<!--truncate-->
## WebAssembly

### Temps de démarrage amélioré

Le compilateur de base de WebAssembly ([Liftoff](https://v8.dev/blog/liftoff)) prend maintenant en charge les [instructions atomiques](https://github.com/WebAssembly/threads) et les [opérations de mémoire en bloc](https://github.com/WebAssembly/bulk-memory-operations). Cela signifie que même si vous utilisez ces ajouts relativement récents aux spécifications, vous bénéficiez de temps de démarrage extrêmement rapides.

### Meilleur débogage

Dans le cadre des efforts continus pour améliorer l’expérience de débogage dans WebAssembly, nous sommes désormais en mesure d’inspecter n’importe quelle trame WebAssembly qui est active chaque fois que vous mettez en pause l’exécution ou atteignez un point de rupture.
Cela a été réalisé en réutilisant [Liftoff](https://v8.dev/blog/liftoff) pour le débogage. Par le passé, tout le code contenant des points de rupture ou parcouru au pas devait être exécuté dans l’interpréteur WebAssembly, ce qui ralentissait considérablement l’exécution (souvent d’environ 100×). Avec Liftoff, vous perdez seulement environ un tiers de vos performances, mais vous pouvez parcourir tout le code et l’inspecter à tout moment.

### Essai d’origine SIMD

La proposition SIMD permet à WebAssembly de tirer parti des instructions vectorielles couramment disponibles sur le matériel pour accélérer les charges de travail intensives en calcul. V8 dispose du [support](https://v8.dev/features/simd) pour la [proposition de SIMD WebAssembly](https://github.com/WebAssembly/simd). Pour activer cette fonction dans Chrome, utilisez le drapeau `chrome://flags/#enable-webassembly-simd` ou inscrivez-vous à un [essai d’origine](https://developers.chrome.com/origintrials/#/view_trial/-4708513410415853567). Les [essais d’origine](https://github.com/GoogleChrome/OriginTrials/blob/gh-pages/developer-guide.md) permettent aux développeurs de expérimenter une fonctionnalité avant qu’elle ne soit standardisée et fournissent des retours d’information précieux. Une fois qu’une origine est inscrite à l’essai, les utilisateurs bénéficient de la fonctionnalité pendant toute la durée de l’essai sans avoir besoin de mettre à jour les drapeaux de Chrome.

## JavaScript

### Références faibles et finaliseurs

:::note
**Attention !** Les références faibles et les finaliseurs sont des fonctionnalités avancées ! Elles dépendent du comportement de la collecte des déchets. La collecte des déchets est non déterministe et peut ne pas se produire du tout.
:::

JavaScript est un langage à gestion automatique de la mémoire, ce qui signifie que la mémoire occupée par des objets qui ne sont plus accessibles par le programme peut être automatiquement récupérée lorsque le collecteur de déchets fonctionne. À l’exception des références dans `WeakMap` et `WeakSet`, toutes les références en JavaScript sont fortes et empêchent que l’objet référencé soit collectée comme déchet. Par exemple,

```js
const globalRef = {
  callback() { console.log(&apos;foo&apos;); }
};
// Tant que globalRef est accessible via la portée globale,
// ni lui ni la fonction dans sa propriété callback ne seront collectés.
```

Les programmeurs JavaScript peuvent désormais conserver des objets faiblement grâce à la fonctionnalité `WeakRef`. Les objets référencés par des références faibles ne empêchent pas leur collecte comme déchets s’ils ne sont pas également fortement référencés.

```js
const globalWeakRef = new WeakRef({
  callback() { console.log(&apos;foo&apos;); }
});

(async function() {
  globalWeakRef.deref().callback();
  // Affiche “foo” dans la console. globalWeakRef est garanti d’être vivant
  // pour le premier tour de la boucle d’événements après sa création.

  await new Promise((resolve, reject) => {
    setTimeout(() => { resolve(&apos;foo&apos;); }, 42);
  });
  // Attendre un tour de la boucle d’événements.

  globalWeakRef.deref()?.callback();
  // L’objet à l’intérieur de globalWeakRef peut être collecté comme déchet
  // après le premier tour puisqu’il n’est pas autrement accessible.
})();
```

La fonctionnalité accompagnant les `WeakRef`s est `FinalizationRegistry`, qui permet aux programmeurs d’enregistrer des rappels à invoquer après qu’un objet a été collecté comme déchet. Par exemple, le programme ci-dessous peut afficher `42` dans la console après que l'objet inaccessible dans l’IIFE a été collecté.

```js
const registry = new FinalizationRegistry((heldValue) => {
  console.log(heldValue);
});

(function () {
  const garbage = {};
  registry.register(garbage, 42);
  // Le deuxième argument est la valeur “gardée” qui est passée
  // au finaliseur lorsque le premier argument est collecté comme déchet.
})();
```

Les finaliseurs sont programmés pour s'exécuter dans la boucle d'événements et n'interrompent jamais l'exécution synchronisée de JavaScript.

Ce sont des fonctionnalités avancées et puissantes, et avec un peu de chance, votre programme n'en aura pas besoin. Consultez notre [article explicatif](https://v8.dev/features/weak-references) pour en savoir plus à leur sujet !

### Méthodes et accesseurs privés

Les champs privés, qui ont été introduits dans la version v7.4, sont complétés par la prise en charge des méthodes et accesseurs privés. Syntaxiquement, les noms des méthodes et accesseurs privés commencent par `#`, tout comme les champs privés. Voici un bref aperçu de la syntaxe.

```js
class Component {
  #privateMethod() {
    console.log("Je ne suis appelable qu'à l'intérieur de Component!");
  }
  get #privateAccessor() { return 42; }
  set #privateAccessor(x) { }
}
```

Les méthodes et accesseurs privés ont les mêmes règles de portée et sémantiques que les champs privés. Consultez notre [article explicatif](https://v8.dev/features/class-fields) pour en savoir plus.

Merci à [Igalia](https://twitter.com/igalia) pour avoir contribué à l'implémentation !

## API V8

Veuillez utiliser `git log branch-heads/8.3..branch-heads/8.4 include/v8.h` pour obtenir une liste des changements de l'API.

Les développeurs avec une copie actuelle de V8 peuvent utiliser `git checkout -b 8.4 -t branch-heads/8.4` pour expérimenter les nouvelles fonctionnalités de V8 v8.4. Vous pouvez également [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt les nouvelles fonctionnalités par vous-même.
