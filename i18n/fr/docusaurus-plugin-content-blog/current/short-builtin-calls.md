---
title: "Appels intégrés courts"
author: "[Toon Verwaest](https://twitter.com/tverwaes), The Big Short"
avatars: 
  - toon-verwaest
date: 2021-05-06
tags: 
  - JavaScript
description: "Dans V8 v9.1, nous avons temporairement désintégré les fonctions intégrées sur le bureau pour éviter des problèmes de performance résultant d'appels indirects éloignés."
tweet: "1394267917013897216"
---

Dans V8 v9.1, nous avons temporairement désactivé les [fonctionnalités intégrées](https://v8.dev/blog/embedded-builtins) sur le bureau. Bien que l'intégration des fonctionnalités améliore significativement l'utilisation de la mémoire, nous avons remarqué que les appels de fonction entre les fonctions intégrées et le code compilé JIT peuvent entraîner une pénalité de performance considérable. Ce coût dépend de la microarchitecture du processeur. Dans ce post, nous expliquerons pourquoi cela se produit, à quoi ressemblent les performances et ce que nous prévoyons de faire pour résoudre ce problème à long terme.

<!--truncate-->
## Allocation de code

Le code machine généré par les compilateurs à la volée (JIT) de V8 est alloué dynamiquement sur des pages de mémoire détenues par la machine virtuelle. V8 alloue des pages de mémoire dans une région d'espace d'adressage contigu, qui se trouve elle-même soit quelque part au hasard dans la mémoire (pour des raisons de [randomisation de la disposition de l'espace d'adressage](https://en.wikipedia.org/wiki/Address_space_layout_randomization)), soit quelque part à l'intérieur de la cage de mémoire virtuelle de 4 GiB que nous allouons pour [la compression des pointeurs](https://v8.dev/blog/pointer-compression).

Le code JIT de V8 appelle très couramment des fonctions intégrées. Les fonctions intégrées sont essentiellement des extraits de code machine qui sont inclus avec la machine virtuelle. Certaines fonctions intégrées implémentent des fonctions complètes de la bibliothèque standard JavaScript, comme [`Function.prototype.bind`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_objects/Function/bind), mais beaucoup d'entre elles sont des fragments d'aide de code machine qui comblent l'écart entre la sémantique de haut niveau de JS et les capacités de bas niveau du processeur. Par exemple, si une fonction JavaScript veut appeler une autre fonction JavaScript, il est courant que l'implémentation de la fonction appelle une fonction intégrée `CallFunction` qui détermine comment la fonction JavaScript cible doit être appelée; c'est-à-dire si elle est un proxy ou une fonction régulière, combien d'arguments elle attend, etc. Étant donné que ces extraits sont connus au moment où nous construisons la machine virtuelle, ils sont "intégrés" dans le binaire Chrome, ce qui signifie qu'ils se retrouvent dans la région de code binaire Chrome.

## Appels directs vs indirects

Sur les architectures 64 bits, le binaire Chrome, qui inclut ces fonctions intégrées, se trouve arbitrairement éloigné du code JIT. Avec l'ensemble d'instructions [x86-64](https://en.wikipedia.org/wiki/X86-64), cela signifie que nous ne pouvons pas utiliser des appels directs : ils utilisent un immédiat signé de 32 bits qui est utilisé comme décalage pour l'adresse de l'appel, et la cible peut être à plus de 2 GiB de distance. Par conséquent, nous devons nous appuyer sur des appels indirects via un registre ou un opérande en mémoire. Ces appels dépendent davantage de la prédiction, car il n'est pas immédiatement évident à partir de l'instruction d'appel elle-même quelle est la cible de l'appel. Sur [ARM64](https://en.wikipedia.org/wiki/AArch64), nous ne pouvons pas utiliser du tout des appels directs puisque la plage est limitée à 128 MiB. Cela signifie que dans les deux cas, nous dépendons de la précision du prédicteur de branche indirect du processeur.

## Limitations de la prédiction des branches indirectes

Lors du ciblage de x86-64, il serait idéal de s'appuyer sur des appels directs. Cela devrait réduire la pression sur le prédicteur de branche indirect, car la cible est connue après le décodage de l'instruction, mais cela ne nécessite pas non plus de charger la cible dans un registre à partir d'une constante ou d'une mémoire. Cependant, ce n'est pas seulement les différences évidentes visibles dans le code machine.

En raison de [Spectre v2](https://googleprojectzero.blogspot.com/2018/01/reading-privileged-memory-with-side.html), diverses combinaisons appareil/OS ont désactivé la prédiction des branches indirectes. Cela signifie que sur ces configurations, nous subirons des blocages très coûteux lors des appels de fonction depuis le code JIT qui s'appuie sur la fonction intégrée `CallFunction`.

Plus important encore, bien que les architectures d'ensemble d'instructions 64 bits (le « langage de haut niveau du processeur ») prennent en charge les appels indirects vers des adresses éloignées, la microarchitecture est libre d'implémenter des optimisations avec des limitations arbitraires. Il semble courant que les prédicteurs de branche indirecte supposent que les distances d'appel ne dépassent pas une certaine distance (par exemple, 4 GiB), nécessitant moins de mémoire par prédiction. Par exemple, le [manuel d'optimisation Intel](https://www.intel.com/content/dam/www/public/us/en/documents/manuals/64-ia-32-architectures-optimization-manual.pdf) indique explicitement :

> Pour les applications 64 bits, les performances de prédiction de branche peuvent être négativement impactées lorsque la cible d'une branche est à plus de 4 GB de distance de la branche.

Alors que sur ARM64, la portée d'appel architecturale pour les appels directs est limitée à 128 Mio, il s'avère que la puce [M1 d'Apple](https://en.wikipedia.org/wiki/Apple_M1) possède la même limitation microarchitecturale de portée de prédiction d'appel indirect de 4 Gio. Les appels indirects vers une cible d'appel plus éloignée que 4 Gio semblent toujours mal prédits. En raison de la taille particulièrement grande du [tampon de réorganisation](https://en.wikipedia.org/wiki/Re-order_buffer) du M1, le composant du processeur qui permet l'exécution spéculative et en désordre des instructions prédites futures, les erreurs fréquentes de prédiction entraînent une pénalité de performance exceptionnellement élevée.

## Solution temporaire : copier les fonctions intégrées

Pour éviter le coût des erreurs fréquentes de prédiction et pour éviter de dépendre inutilement de la prédiction de branche lorsque cela est possible sur x86-64, nous avons décidé de copier temporairement les fonctions intégrées dans la cage de compression de pointeurs de V8 sur les machines de bureau disposant de suffisamment de mémoire. Cela place le code copié des fonctions intégrées près du code généré dynamiquement. Les résultats de performance dépendent fortement de la configuration de l'appareil, mais voici quelques résultats provenant de nos bots de performance :

![Benchmarks de navigation enregistrés à partir de pages en direct](/_img/short-builtin-calls/v8-browsing.svg)

![Amélioration du score des benchmarks](/_img/short-builtin-calls/benchmarks.svg)

Déparer les fonctions intégrées augmente l'utilisation de la mémoire sur les appareils affectés de 1,2 à 1,4 Mio par instance V8. Comme solution à plus long terme, nous envisageons d'allouer du code JIT plus près du binaire Chrome. De cette manière, nous pourrons réintégrer les fonctions intégrées pour retrouver les avantages en termes de mémoire, tout en améliorant également les performances des appels du code généré par V8 vers le code C++.
