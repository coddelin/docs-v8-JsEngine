---
title: 'Accélérer les expressions régulières V8'
author: 'Jakob Gruber, Ingénieur Logiciel Régulier'
avatars:
  - 'jakob-gruber'
date: 2017-01-10 13:33:37
tags:
  - internals
  - RegExp
description: 'V8 a récemment migré les fonctions intégrées des expressions régulières d'une implémentation en JavaScript autonome à une implémentation qui s'intègre directement dans notre nouvelle architecture de génération de code basée sur TurboFan.'
---
Cet article de blog traite de la récente migration des fonctions intégrées des expressions régulières dans V8, passant d'une implémentation en JavaScript autonome à une implémentation qui s'intègre directement dans notre nouvelle architecture de génération de code basée sur [TurboFan](/blog/v8-release-56).

<!--truncate-->
L'implémentation des expressions régulières dans V8 est construite sur [Irregexp](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html), largement considéré comme l'un des moteurs d'expressions régulières les plus rapides. Alors que le moteur lui-même encapsule la logique de bas niveau pour effectuer la correspondance de motifs avec des chaînes, les fonctions sur le prototype des expressions régulières, telles que [`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec), effectuent le travail supplémentaire nécessaire pour exposer cette fonctionnalité à l'utilisateur.

Historiquement, divers composants de V8 ont été implémentés en JavaScript. Jusqu'à récemment, `regexp.js` était l'un d'entre eux, hébergeant l'implémentation du constructeur d'expressions régulières, toutes ses propriétés ainsi que celles de son prototype.

Malheureusement, cette approche présente des inconvénients, notamment des performances imprévisibles et des transitions coûteuses vers le runtime C++ pour les fonctionnalités de bas niveau. L'ajout récent de la sous-classification intégrée dans ES6 (permettant aux développeurs JavaScript de fournir leur propre implémentation personnalisée des expressions régulières) a engendré une pénalité de performance supplémentaire pour les expressions régulières, même si l'expression régulière intégrée n'est pas sous-classée. Ces régressions ne pouvaient pas être entièrement résolues dans l'implémentation autonome en JavaScript.

Nous avons donc décidé de migrer l'implémentation des expressions régulières hors du JavaScript. Cependant, préserver les performances s'est avéré plus difficile que prévu. Une migration initiale vers une implémentation entièrement en C++ était significativement plus lente, atteignant seulement environ 70 % des performances de l'implémentation originale. Après quelques investigations, nous avons trouvé plusieurs causes :

- [`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec) contient quelques zones extrêmement sensibles à la performance, notamment la transition vers le moteur d'expressions régulières sous-jacent et la construction du résultat des expressions régulières avec ses appels associés à des sous-chaînes. Pour ces opérations, l'implémentation JavaScript s'appuyait sur des morceaux de code hautement optimisés appelés « stubs », écrits soit en langage d'assemblage natif soit en s'intégrant directement dans le pipeline du compilateur optimisant. Il n'est pas possible d'accéder à ces stubs depuis le C++, et leurs équivalents en runtime sont significativement plus lents.
- Les accès aux propriétés telles que `lastIndex` des expressions régulières peuvent être coûteux, nécessitant éventuellement des recherches par nom et des traversées de la chaîne de prototypes. Le compilateur optimisant de V8 peut souvent remplacer automatiquement ces accès par des opérations plus efficaces, tandis que ces cas doivent être traités explicitement en C++.
- En C++, les références aux objets JavaScript doivent être encapsulées dans ce que l'on appelle des `Handle`s pour coopérer avec le ramasse-miettes. La gestion des Handle génère un surcoût supplémentaire par rapport à l'implémentation JavaScript simple.

Notre nouveau design pour la migration des expressions régulières est basé sur le [CodeStubAssembler](/blog/csa), un mécanisme qui permet aux développeurs de V8 d'écrire du code indépendant de la plateforme qui sera ensuite traduit en code rapide et spécifique à la plateforme par le même backend qui est également utilisé pour le nouveau compilateur optimisant TurboFan. L'utilisation du CodeStubAssembler nous permet de résoudre tous les défauts de l'implémentation C++ initiale. Les stubs (tels que le point d'entrée dans le moteur d'expressions régulières) peuvent être facilement appelés depuis le CodeStubAssembler. Alors que les accès rapides aux propriétés doivent encore être implémentés explicitement via des chemins rapides, ces accès sont extrêmement efficaces dans le CodeStubAssembler. Les Handle n'existent tout simplement pas en dehors du C++. Et puisque l'implémentation fonctionne maintenant à un niveau très bas, nous pouvons prendre des raccourcis supplémentaires, comme éviter une construction coûteuse du résultat lorsqu'elle n'est pas nécessaire.

Les résultats ont été très positifs. Notre score sur [une charge de travail conséquente de RegExp](https://github.com/chromium/octane/blob/master/regexp.js) s'est amélioré de 15 %, récupérant largement nos récentes pertes de performance liées au sous-classement. Les microbenchmarks (Figure 1) montrent des améliorations généralisées, allant de 7 % pour [`RegExp.prototype.exec`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec), jusqu'à 102 % pour [`RegExp.prototype[@@split]`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/@@split).

![Figure 1 : Accélération des RegExp décomposée par fonction](/_img/speeding-up-regular-expressions/perf.png)

Alors, comment pouvez-vous, en tant que développeur JavaScript, garantir que vos RegExp soient rapides ? Si vous ne souhaitez pas explorer les entrailles des RegExp, assurez-vous que ni l'instance RegExp, ni son prototype ne soient modifiés afin d'obtenir les meilleures performances :

```js
const re = /./g;
re.exec('');  // Chemin rapide.
re.new_property = 'lent';
RegExp.prototype.new_property = 'aussi lent';
re.exec('');  // Chemin lent.
```

Et bien que le sous-classement de RegExp puisse être utile dans certains cas, soyez conscient que les instances de RegExp sous-classées nécessitent une gestion plus générique et empruntent donc le chemin lent :

```js
class SlowRegExp extends RegExp {}
new SlowRegExp(".", "g").exec('');  // Chemin lent.
```

La migration complète des RegExp sera disponible dans V8 v5.7.
