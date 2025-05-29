---
title: "Améliorer les expressions régulières V8"
author: 'Patrick Thier et Ana Peško, exprimeurs réguliers d'opinions sur les expressions régulières'
avatars:
  - "patrick-thier"
  - "ana-pesko"
date: 2019-10-04 15:24:16
tags:
  - internals
  - RegExp
description: 'Dans cet article de blog, nous décrivons comment nous tirons parti des avantages de l'interprétation des expressions régulières tout en atténuant ses inconvénients.'
tweet: "1180131710568030208"
---
Dans sa configuration par défaut, V8 compile les expressions régulières en code natif lors de leur première exécution. Dans le cadre de notre travail sur [V8 sans JIT](/blog/jitless), nous avons introduit un interpréteur pour les expressions régulières. L'interprétation des expressions régulières présente l'avantage d'utiliser moins de mémoire, mais cela entraîne une pénalité en termes de performances. Dans cet article de blog, nous décrivons comment nous tirons parti des avantages de l'interprétation des expressions régulières tout en atténuant ses inconvénients.

<!--truncate-->
## Stratégie de montée en niveau pour RegExp

Nous voulons utiliser le ‘meilleur des deux mondes’ pour les expressions régulières. Pour cela, nous commençons par compiler toutes les expressions régulières en bytecode et les interpréter. De cette manière, nous économisons beaucoup de mémoire, et globalement (et avec le nouvel interpréteur plus rapide), la pénalité en termes de performances est acceptable. Si une expression régulière avec le même modèle est utilisée à nouveau, nous la considérons comme ‘chaude’, et nous recompilons en code natif. À partir de ce moment, nous continuons l'exécution aussi rapidement que possible.

Il existe de nombreux chemins différents à travers le code des expressions régulières dans V8, en fonction de la méthode invoquée, qu'il s'agisse d'une regexp globale ou non, et si nous empruntons le chemin rapide ou lent. Cela dit, nous voulons que la décision de montée en niveau soit aussi centralisée que possible. Nous avons ajouté un champ de ticks à l'objet RegExp de V8 qui est initialisé à une certaine valeur lors de l'exécution. Cette valeur représente le nombre de fois que l'expression régulière sera interprétée avant que nous montions en niveau vers le compilateur. Chaque fois que l'expression régulière est interprétée, nous décrémentons le champ de ticks de 1. Dans une fonction intégrée écrite en [CodeStubAssembler](/blog/csa) qui est invoquée pour toutes les expressions régulières, nous vérifions le drapeau des ticks à chaque exécution. Une fois que les ticks atteignent 0, nous savons que nous devons recompiler l'expression régulière en code natif, et nous basculons à l'exécution pour le faire.

Nous avons mentionné que les expressions régulières peuvent avoir différents chemins d'exécution. Dans le cas des remplacements globaux avec des fonctions comme paramètres, les implémentations pour le code natif et le bytecode diffèrent. Le code natif s'attend à un tableau pour stocker tous les correspondances à l'avance, tandis que le bytecode correspond une à la fois. Pour cette raison, nous avons décidé de toujours monter en niveau de manière anticipée vers le code natif pour ce cas d'utilisation.

## Accélérer l'interpréteur de RegExp

### Réduire les frais d'exécution

Lorsqu'une expression régulière est exécutée, une fonction intégrée écrite en [CodeStubAssembler](/blog/csa) est invoquée. Cette fonction intégrée vérifiait auparavant si le champ de code de l'objet JSRegExp contenait un code natif JITté qui pouvait être exécuté directement, et sinon appelait une méthode d'exécution pour compiler (ou interpréter en mode sans JIT) la RegExp. En mode sans JIT, chaque exécution d'une expression régulière passait par l'exécution de V8, ce qui est assez coûteux car nous devons passer entre le code JavaScript et C++ sur la pile d'exécution.

À partir de V8 v7.8, chaque fois que le compilateur RegExp génère du bytecode pour interpréter une expression régulière, un trampoline vers l'interpréteur RegExp est désormais stocké dans le champ de code de l'objet JSRegExp en plus du bytecode généré. Ainsi, l'interpréteur est désormais appelé directement à partir de la fonction intégrée sans détour par l'exécution.

### Nouvelle méthode de dispatch

L'interpréteur RegExp utilisait auparavant une simple méthode de dispatch basée sur `switch`. Le principal inconvénient de cette méthode est que le processeur a beaucoup de mal à prédire le prochain bytecode à exécuter, ce qui entraîne de nombreuses erreurs de prédiction, ralentissant l'exécution.

Nous avons changé la méthode de dispatch en code filé dans V8 v7.8. Cette méthode permet au prédicteur de branches du processeur de prédire le prochain bytecode en fonction du bytecode actuellement exécuté, entraînant moins d'erreurs de prédiction. Plus précisément, nous utilisons une table de dispatch, stockant une correspondance entre chaque ID de bytecode et l'adresse du gestionnaire implémentant le bytecode. L'interpréteur [Ignition](/docs/ignition) de V8 utilise également cette approche. Cependant, une grande différence entre Ignition et l'interpréteur RegExp est que les gestionnaires de bytecode d'Ignition sont écrits en [CodeStubAssembler](/blog/csa), tandis que l'ensemble de l'interpréteur RegExp est écrit en C++ à l'aide de [`goto`s calculés](https://gcc.gnu.org/onlinedocs/gcc/Labels-as-Values.html) (une extension GNU également prise en charge par clang), ce qui est plus facile à lire et à maintenir que CSA. Pour les compilateurs qui ne prennent pas en charge les `goto`s calculés, nous revenons à l'ancienne méthode de dispatch basée sur `switch`.

### Optimisation du peephole de bytecode

Avant de parler de l'optimisation du bytecode par recherche locale, examinons un exemple motivant.

```js
const re = /[^_]*/;
const str = 'a0b*c_ef';
re.exec(str);
// → correspond à 'a0b*c'
```

Pour ce motif simple, le compilateur RegExp crée 3 bytecodes qui sont exécutés pour chaque caractère. À un niveau élevé, ils sont :

1. Charger le caractère actuel.
1. Vérifier si le caractère est égal à `'_'`.
1. Si ce n'est pas le cas, avancer la position actuelle dans la chaîne de caractères et `goto 1`.

Pour notre chaîne de caractères, nous interprétons 17 bytecodes jusqu'à trouver un caractère qui ne correspond pas. L'idée de l'optimisation par recherche locale est de remplacer des séquences de bytecodes par un nouveau bytecode optimisé qui combine les fonctionnalités de plusieurs bytecodes. Dans notre exemple, nous pouvons même gérer explicitement la boucle implicite créée par le `goto` dans le nouveau bytecode. Ainsi, un seul bytecode gère tous les caractères correspondants, économisant 16 dispatches.

Bien que l'exemple soit inventé, la séquence de bytecodes décrite ici se produit fréquemment sur des sites web réels. Nous avons analysé [des sites web réels](/blog/real-world-performance) et créé de nouveaux bytecodes optimisés pour les séquences de bytecodes les plus fréquentes que nous avons rencontrées.

## Résultats

![Figure 1 : Économies de mémoire pour différentes valeurs de montée en tier](/_img/regexp-tier-up/results-memory.svg)

La figure 1 montre l'impact sur la mémoire de différentes stratégies de montée en tier pour Facebook, Reddit, Twitter et Tumblr lors de la navigation d'histoires. La valeur par défaut est la taille du code JITté, puis nous avons la taille du code regexp que nous utilisons (taille du bytecode si nous ne montons pas en tier, taille du code natif si nous le faisons) pour des ticks initialisés à 1, 10, et 100. Enfin, nous avons la taille du code regexp si nous interprétons toutes les expressions régulières. Nous avons utilisé ces résultats et d'autres benchmarks pour décider d'activer la montée en tier avec des ticks initialisés à 1, c'est-à-dire que nous interprétons l'expression régulière une fois, puis nous montons en tier.

Avec cette stratégie de montée en tier en place, nous avons réduit entre 4 et 7 % la taille de code de tas de V8 sur des sites réels et entre 1 et 2 % la taille effective de V8.

![Figure 2 : Comparaison des performances des expressions régulières](/_img/regexp-tier-up/results-speed.svg)

La figure 2 montre l'impact sur les performances de l'interpréteur RegExp pour toutes les améliorations décrites dans cet article de blog[^strict-bounds] sur la suite de benchmarks RexBench. À titre de référence, les performances des expressions régulières compilées JIT sont également montrées (Native).

[^strict-bounds]: Les résultats présentés ici incluent également une amélioration pour les expressions régulières déjà décrite dans les [notes de version de V8 v7.8](/blog/v8-release-78#faster-regexp-match-failures).

Le nouvel interpréteur est jusqu'à 2 fois plus rapide que l'ancien, avec une moyenne d'environ 1,45 fois plus rapide. Nous nous rapprochons même assez des performances des RegExp JITtées pour la plupart des benchmarks, avec Regex DNA étant l'unique exception. La raison pour laquelle les RegExp interprétées sont beaucoup plus lentes que les RegExp JITtées sur ce benchmark est due aux longues chaînes de caractères (~300 000 caractères) utilisées. Bien que nous ayons réduit au minimum le surcoût des dispatches, ce surcoût s'accumule sur les chaînes de plus de 1 000 caractères, ce qui entraîne une exécution plus lente. Parce que l'interpréteur est tellement plus lent sur les longues chaînes, nous avons ajouté une heuristique qui monte en tier rapidement pour ces chaînes.

## Conclusion

À partir de V8 v7.9 (Chrome 79), nous montons en tier les expressions régulières au lieu de les compiler immédiatement. Par conséquent, l'interpréteur, précédemment utilisé uniquement dans V8 sans JIT, est maintenant utilisé partout. En conséquence, nous économisons de la mémoire. Nous avons accéléré l'interpréteur pour rendre cela envisageable. Mais ce n'est pas la fin de l'histoire — de nouvelles améliorations peuvent être attendues à l'avenir.

Nous aimerions saisir cette occasion pour remercier toute l'équipe V8 pour leur soutien durant notre stage. Ce fut une expérience incroyable !
