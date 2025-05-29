---
title: "Version V8 v9.1"
author: "Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), testant ma marque personnelle"
avatars:
 - "ingvar-stepanyan"
date: 2021-05-04
tags:
 - sortie
description: "La version V8 v9.1 apporte la prise en charge des vérifications de marque privée, await au niveau supérieur activé par défaut et des améliorations de performances."
tweet: "1389613320953532417"
---
Tous les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](https://v8.dev/docs/release-process). Chaque version est issue du dépôt maître de Git V8 juste avant une étape Beta de Chrome. Aujourd'hui, nous sommes ravis d'annoncer notre nouvelle branche, [version V8 v9.1](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.1), actuellement en phase bêta et prévue pour une sortie en coordination avec Chrome 91 Stable dans quelques semaines. V8 v9.1 est rempli de nouveautés pour les développeurs. Cet article offre un aperçu des points forts dans l'attente de la sortie officielle.

<!--truncate-->
## JavaScript

### Améliorations du `FastTemplateCache`

L'API V8 fournit une interface `Template` aux intégrateurs à partir de laquelle de nouvelles instances peuvent être créées.

La création et la configuration de nouvelles instances d'objets nécessitent plusieurs étapes, ce qui est souvent plus rapide par clonage d'objets existants. V8 utilise une stratégie de cache à deux niveaux (un cache rapide avec un petit tableau et un cache lent avec un grand dictionnaire) pour rechercher les objets créés récemment à partir des modèles et les cloner directement.

Auparavant, l'index de cache pour les modèles était attribué lors de leur création, plutôt qu'au moment de leur insertion dans le cache. Cela entraînait une réserve du cache rapide pour les modèles souvent jamais instanciés. Corriger cela a permis une amélioration de 4,5 % dans le benchmark Speedometer2-FlightJS.

### Await au niveau supérieur

[Await au niveau supérieur](https://v8.dev/features/top-level-await) est activé par défaut dans V8 à partir de la version v9.1 et ne nécessite plus l'option `--harmony-top-level-await`.

Veuillez noter que dans le moteur de rendu [Blink](https://www.chromium.org/blink), await au niveau supérieur était déjà [activé par défaut](https://v8.dev/blog/v8-release-89#top-level-await) depuis la version 89.

Les intégrateurs doivent noter qu'avec cette activation, `v8::Module::Evaluate` retourne toujours un objet `v8::Promise` au lieu de la valeur de complétion. Le `Promise` est résolu avec la valeur de complétion si l'évaluation du module réussit et rejeté en cas d'échec. Si le module évalué n'est pas asynchrone (c'est-à-dire qu'il ne contient pas d'await au niveau supérieur) et n'a pas de dépendances asynchrones, le `Promise` retourné sera soit rempli soit rejeté. Sinon, le `Promise` retourné restera en attente.

Veuillez consulter [notre explication](https://v8.dev/features/top-level-await) pour plus de détails.

### Vérifications de marque privée, alias `#foo in obj`

La syntaxe de vérification de marque privée est activée par défaut dans v9.1 et ne nécessite pas `--harmony-private-brand-checks`. Cette fonctionnalité étend l'opérateur [`in`](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Operators/in) pour fonctionner également avec les noms des champs privés `#`, comme illustré dans l'exemple suivant.

```javascript
class A {
  static test(obj) {
    console.log(#foo in obj);
  }

  #foo = 0;
}

A.test(new A()); // true
A.test({}); // false
```

Pour en savoir plus, consultez [notre explication](https://v8.dev/features/private-brand-checks).

### Appels intégrés courts

Dans cette version, nous avons temporairement désactivé les fonctions intégrées embarquées (défaisant les [fonctions embarquées](https://v8.dev/blog/embedded-builtins)) sur les ordinateurs de bureau 64 bits. Le gain de performance en désactivant les fonctions intégrées sur ces machines compense les coûts mémoire. Cela est dû à des détails architecturaux et micro-architecturaux.

Nous publierons bientôt un article de blog séparé avec plus de détails.

## API V8

Veuillez utiliser `git log branch-heads/9.0..branch-heads/9.1 include/v8.h` pour obtenir une liste des changements dans l'API.

Les développeurs disposant d'une copie active de V8 peuvent utiliser `git checkout -b 9.1 -t branch-heads/9.1` pour expérimenter les nouvelles fonctionnalités de V8 v9.1. Alternativement, vous pouvez [vous abonner au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer bientôt les nouvelles fonctionnalités par vous-même.
