---
title: "Publication de la version V8 v7.7"
author: "Mathias Bynens ([@mathias](https://twitter.com/mathias)), rédacteur paresseux des notes de version"
avatars: 
  - "mathias-bynens"
date: "2019-08-13 16:45:00"
tags: 
  - version
description: "V8 v7.7 introduit une affectation différée des retours, une compilation WebAssembly en arrière-plan plus rapide, des améliorations des traces de pile et de nouvelles fonctionnalités pour Intl.NumberFormat."
tweet: "1161287541611323397"
---
Tous les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](/docs/release-process). Chaque version est issue directement de la branche principale Git de V8, juste avant une étape importante Beta de Chrome. Aujourd’hui, nous sommes ravis d’annoncer notre toute dernière branche, [V8 version 7.7](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/7.7), actuellement en version bêta avant sa publication coordonnée avec Chrome 77 Stable dans quelques semaines. V8 v7.7 regorge de nouvelles fonctionnalités destinées aux développeurs. Ce billet présente un aperçu de certains points forts en prévision de sa mise en production.

<!--truncate-->
## Performances (taille et vitesse)

### Attribution différée des retours

Afin d'optimiser JavaScript, V8 collecte des retours sur les types d’opérandes transmis à diverses opérations (e.g. `+` ou `o.foo`). Ces retours sont utilisés pour optimiser ces opérations en les adaptant à ces types spécifiques. Ces informations sont stockées dans des “vecteurs de retour”, et bien qu'elles soient très importantes pour obtenir des temps d'exécution plus rapides, elles impliquent des coûts en termes de mémoire pour leur attribution.

Pour réduire l’utilisation de mémoire de V8, nous attribuons désormais les vecteurs de retour de manière différée, uniquement après que la fonction a exécuté une certaine quantité de bytecode. Cela permet d’éviter l’attribution des vecteurs de retour pour des fonctions de courte durée qui ne bénéficient pas des retours collectés. Nos expériences en laboratoire montrent que l’attribution différée des vecteurs de retour permet d’économiser environ 2 à 8 % de la taille du tas de V8.

![](/_img/v8-release-77/lazy-feedback-allocation.svg)

Nos expériences en extérieur montrent que cela réduit la taille du tas de V8 de 1 à 2 % sur les ordinateurs de bureau et de 5 à 6 % sur les plateformes mobiles utilisées par les utilisateurs de Chrome. Il n'y a pas de régressions de performance sur les ordinateurs de bureau, et sur les plateformes mobiles nous avons même constaté une amélioration des performances sur les téléphones d'entrée de gamme avec une mémoire limitée. Restez à l’écoute pour un billet de blog plus détaillé sur notre récent travail pour économiser de la mémoire.

### Compilation scalable de WebAssembly en arrière-plan

Au cours des versions précédentes, nous avons travaillé sur l’évolutivité de la compilation en arrière-plan de WebAssembly. Plus votre ordinateur a de cœurs, plus vous bénéficiez de ces améliorations. Les graphiques ci-dessous ont été créés sur une machine Xeon à 24 cœurs, en compilant [le démo Epic ZenGarden](https://s3.amazonaws.com/mozilla-games/ZenGarden/EpicZenGarden.html). Selon le nombre de threads utilisés, la compilation prend moins de la moitié du temps comparé à V8 v7.4.

![](/_img/v8-release-77/liftoff-compilation-speedup.svg)

![](/_img/v8-release-77/turbofan-compilation-speedup.svg)

### Améliorations des traces de pile

Presque toutes les erreurs levées par V8 capturent une trace de pile au moment de leur création. Cette trace de pile peut être accédée depuis JavaScript via la propriété non standard `error.stack`. La première fois qu'une trace de pile est récupérée via `error.stack`, V8 sérialise la trace de pile structurée sous-jacente en une chaîne de caractères. Cette trace sérialisée est ensuite conservée pour accélérer les futurs accès à `error.stack`.

Au cours des dernières versions, nous avons travaillé sur quelques [refactorisations internes de la logique des traces de pile](https://docs.google.com/document/d/1WIpwLgkIyeHqZBc9D3zDtWr7PL-m_cH6mfjvmoC6kSs/edit) ([bug de suivi](https://bugs.chromium.org/p/v8/issues/detail?id=8742)), simplifiant le code et améliorant les performances de sérialisation des traces de pile de jusqu’à 30 %.

## Fonctionnalités du langage JavaScript

[L’API `Intl.NumberFormat`](/features/intl-numberformat) pour le formatage de nombres tenant compte de la langue locale gagne de nouvelles fonctionnalités dans cette version ! Elle prend désormais en charge la notation compacte, la notation scientifique, la notation d'ingénierie, l’affichage des signes et les unités de mesure.

```js
const formatter = new Intl.NumberFormat('en', {
  style: 'unit',
  unit: 'meter-per-second',
});
formatter.format(299792458);
// → '299,792,458 m/s'
```

Consultez [notre expliquant de fonctionnalités](/features/intl-numberformat) pour plus de détails.

## API de V8

Veuillez utiliser `git log branch-heads/7.6..branch-heads/7.7 include/v8.h` pour obtenir une liste des changements de l’API.

Les développeurs disposant d’un [dépôt V8 actif](/docs/source-code#using-git) peuvent utiliser `git checkout -b 7.7 -t branch-heads/7.7` pour expérimenter les nouvelles fonctionnalités de V8 v7.7. Alternativement, vous pouvez [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer les nouvelles fonctionnalités vous-même bientôt.
