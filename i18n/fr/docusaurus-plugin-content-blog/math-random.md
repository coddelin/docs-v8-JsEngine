---
title: "Il y a `Math.random()`, et puis il y a `Math.random()`"
author: "Yang Guo ([@hashseed](https://twitter.com/hashseed)), ingénieur logiciel et concepteur de dés"
avatars: 
  - "yang-guo"
date: "2015-12-17 13:33:37"
tags: 
  - ECMAScript
  - internals
description: "L’implémentation de V8 pour Math.random utilise désormais un algorithme appelé xorshift128+, améliorant la qualité de la distribution aléatoire par rapport à l’ancienne implémentation MWC1616."
---
> `Math.random()` retourne une valeur `Number` avec un signe positif, supérieure ou égale à `0` mais inférieure à `1`, choisie de manière aléatoire ou pseudo-aléatoire avec une distribution approximativement uniforme sur cette plage, en utilisant un algorithme ou une stratégie dépendant de l’implémentation. Cette fonction ne prend aucun argument.

<!--truncate-->
— _[ES 2015, section 20.2.2.27](http://tc39.es/ecma262/#sec-math.random)_

`Math.random()` est la source de hasard la plus connue et la plus utilisée en JavaScript. Dans V8 et la plupart des autres moteurs JavaScript, elle est implémentée à l’aide d’un [générateur de nombres pseudo-aléatoires](https://fr.wikipedia.org/wiki/G%C3%A9n%C3%A9rateur_de_nombres_pseudo-al%C3%A9atoires) (PRNG). Comme pour tous les PRNG, le nombre aléatoire est dérivé d’un état interne, modifié par un algorithme fixe pour chaque nouveau nombre aléatoire. Ainsi, pour un état initial donné, la séquence de nombres aléatoires est déterministe. Étant donné que la taille des bits n de l’état interne est limitée, les nombres qu’un PRNG génère finiront par se répéter. La limite supérieure de la période de ce [cycle de permutation](https://fr.wikipedia.org/wiki/Permutation_cyclique) est 2<sup>n</sup>.

Il existe de nombreux algorithmes PRNG différents; parmi les plus connus figurent [Mersenne-Twister](https://fr.wikipedia.org/wiki/Mersenne_Twister) et [LCG](https://fr.wikipedia.org/wiki/G%C3%A9n%C3%A9rateur_lin%C3%A9aire_congruentiel). Chacun a ses caractéristiques particulières, avantages et inconvénients. Idéalement, il utiliserait le moins de mémoire possible pour l’état initial, serait rapide à exécuter, aurait une période longue et offrirait une répartition aléatoire de haute qualité. Alors que l’utilisation de la mémoire, les performances et la longueur de la période peuvent facilement être mesurées ou calculées, la qualité est plus difficile à déterminer. Il existe une grande quantité de mathématiques derrière les tests statistiques pour vérifier la qualité des nombres aléatoires. La suite de tests PRNG standard de facto, [TestU01](http://simul.iro.umontreal.ca/testu01/tu01.html), implémente beaucoup de ces tests.

Jusqu’à [fin 2015](https://github.com/v8/v8/blob/ceade6cf239e0773213d53d55c36b19231c820b5/src/js/math.js#L143) (jusqu’à la version 4.9.40), le choix de PRNG de V8 était MWC1616 (multiplication avec retenue, combinant deux parties 16 bits). Il utilise 64 bits d’état interne et ressemble à peu près à ceci :

```cpp
uint32_t state0 = 1;
uint32_t state1 = 2;
uint32_t mwc1616() {
  state0 = 18030 * (state0 & 0xFFFF) + (state0 >> 16);
  state1 = 30903 * (state1 & 0xFFFF) + (state1 >> 16);
  return state0 << 16 + (state1 & 0xFFFF);
}
```

La valeur 32 bits est ensuite convertie en un nombre à virgule flottante entre 0 et 1 conformément à la spécification.

MWC1616 utilise peu de mémoire et est assez rapide à calculer, mais offre malheureusement une qualité médiocre :

- Le nombre de valeurs aléatoires qu’il peut générer est limité à 2<sup>32</sup> par opposition aux 2<sup>52</sup> nombres entre 0 et 1 que la représentation à virgule flottante de double précision peut représenter.
- La moitié supérieure significative du résultat dépend presque entièrement de la valeur de state0. La longueur de la période serait au maximum de 2<sup>32</sup>, mais au lieu de quelques grands cycles de permutation, il y a de nombreux cycles courts. Avec un état initial mal choisi, la longueur du cycle pourrait être inférieure à 40 millions.
- Il échoue à de nombreux tests statistiques de la suite TestU01.

Cela nous a été [signalé](https://medium.com/@betable/tifu-by-using-math-random-f1c308c4fd9d), et après avoir compris le problème et fait quelques recherches, nous avons décidé de réimplémenter `Math.random` sur la base d’un algorithme appelé [xorshift128+](http://vigna.di.unimi.it/ftp/papers/xorshiftplus.pdf). Il utilise 128 bits d’état interne, a une longueur de période de 2<sup>128</sup> - 1 et réussit tous les tests de la suite TestU01.

L’implémentation [a été intégrée dans V8 v4.9.41.0](https://github.com/v8/v8/blob/085fed0fb5c3b0136827b5d7c190b4bd1c23a23e/src/base/utils/random-number-generator.h#L102) quelques jours après que le problème ait été porté à notre attention. Elle est devenue disponible dans Chrome 49. Firefox ([voir ici](https://bugzilla.mozilla.org/show_bug.cgi?id=322529#c99)) et Safari ([voir ici](https://bugs.webkit.org/show_bug.cgi?id=151641)) ont également adopté xorshift128+.

Dans V8 v7.1, l’implémentation a été à nouveau ajustée [CL](https://chromium-review.googlesource.com/c/v8/v8/+/1238551/5) en se basant uniquement sur state0. Veuillez consulter plus de détails sur l’implémentation dans le [code source](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/base/utils/random-number-generator.h;l=119?q=XorShift128&sq=&ss=chromium).

Ne vous y trompez pas cependant : même si xorshift128+ représente une énorme amélioration par rapport à MWC1616, il n'est toujours pas [cryptographiquement sûr](https://en.wikipedia.org/wiki/Cryptographically_secure_pseudorandom_number_generator). Pour des cas d'utilisation tels que le hachage, la génération de signatures et le chiffrement/déchiffrement, les PRNG ordinaires sont inappropriés. L'API Web Cryptography introduit [`window.crypto.getRandomValues`](https://developer.mozilla.org/en-US/docs/Web/API/RandomSource/getRandomValues), une méthode qui retourne des valeurs aléatoires cryptographiquement sécurisées, au prix d'une diminution de performance.

Veuillez garder à l'esprit que si vous trouvez des domaines d'amélioration dans V8 et Chrome, même ceux qui — comme celui-ci — n'affectent pas directement la conformité au standard, la stabilité ou la sécurité, veuillez soumettre [un problème sur notre traqueur de bugs](https://bugs.chromium.org/p/v8/issues/entry?template=Defect%20report%20from%20user).
