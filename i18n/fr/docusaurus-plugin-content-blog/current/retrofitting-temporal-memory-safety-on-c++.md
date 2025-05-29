---
title: "Réadaptation de la sécurité mémoire temporelle sur C++"
author: "Anton Bikineev, Michael Lippautz ([@mlippautz](https://twitter.com/mlippautz)), Hannes Payer ([@PayerHannes](https://twitter.com/PayerHannes))"
avatars: 
  - anton-bikineev
  - michael-lippautz
  - hannes-payer
date: 2022-06-14
tags: 
  - internals
  - mémoire
  - sécurité
description: "Éliminer les vulnérabilités liées aux utilisations après libération (use-after-frees) dans Chrome grâce à l'analyse du tas."
---
:::note
**Remarque :** Cet article a été initialement publié sur le [blog de sécurité de Google](https://security.googleblog.com/2022/05/retrofitting-temporal-memory-safety-on-c.html).
:::

[La sécurité mémoire dans Chrome](https://security.googleblog.com/2021/09/an-update-on-memory-safety-in-chrome.html) est un effort perpétuel pour protéger nos utilisateurs. Nous expérimentons constamment différentes technologies pour devancer les acteurs malveillants. Dans cet esprit, cet article évoque notre démarche d'utilisation des technologies d'analyse du tas afin d'améliorer la sécurité mémoire de C++.

<!--truncate-->
Commençons par le début. Tout au long de la vie d'une application, son état est généralement représenté en mémoire. La sécurité mémoire temporelle fait référence au problème de garantir que la mémoire est toujours accessible avec les informations les plus récentes sur sa structure, son type. Malheureusement, C++ ne fournit pas de telles garanties. Bien qu'il existe un intérêt pour des langages différents de C++ avec des garanties de sécurité mémoire plus solides, de larges bases de code comme Chromium utiliseront C++ dans un avenir prévisible.

```cpp
auto* foo = new Foo();
delete foo;
// La position mémoire pointée par foo ne représente plus
// un objet Foo, car l'objet a été supprimé (libéré).
foo->Process();
```

Dans l'exemple ci-dessus, `foo` est utilisé après que sa mémoire ait été restituée au système sous-jacent. Le pointeur obsolète est appelé un [dangling pointer (pointeur pendu)](https://en.wikipedia.org/wiki/Dangling_pointer) et tout accès via celui-ci entraîne une utilisation après libération (use-after-free, UAF). Dans le meilleur des cas, de telles erreurs entraînent des plantages bien définis, dans le pire des cas, elles causent des dysfonctionnements subtils exploitables par des acteurs malveillants.

Les UAF sont souvent difficiles à repérer dans de grandes bases de code où la propriété des objets est transférée entre divers composants. Le problème général est si répandu qu'à ce jour, l'industrie et le monde académique proposent régulièrement des stratégies d'atténuation. Les exemples sont infinis : les smart pointers (pointeurs intelligents) de toutes sortes en C++ sont utilisés pour mieux définir et gérer la propriété au niveau des applications ; l'analyse statique dans les compilateurs est utilisée pour éviter de compiler du code problématique à la base ; là où l'analyse statique échoue, des outils dynamiques comme les [sanitisers pour C++](https://github.com/google/sanitizers) peuvent intercepter les accès et détecter les problèmes lors d'exécutions spécifiques.

L'utilisation de C++ dans Chrome n'est malheureusement pas différente ici et la majorité des [bug de sécurité de haute gravité sont des problèmes UAF](https://www.chromium.org/Home/chromium-security/memory-safety/). Afin de détecter les problèmes avant qu'ils n'atteignent la production, toutes les techniques susmentionnées sont utilisées. En plus des tests réguliers, des fuzzers garantissent qu'il y a toujours de nouvelles entrées à exploiter pour les outils dynamiques. Chrome va même plus loin et utilise un ramasse-miettes C++ appelé [Oilpan](https://v8.dev/blog/oilpan-library), qui dévie des sémantiques C++ traditionnelles mais fournit une sécurité mémoire temporelle là où il est utilisé. Là où une telle déviation est déraisonnable, un nouveau type de smart pointer appelé [MiraclePtr](https://security.googleblog.com/2021/09/an-update-on-memory-safety-in-chrome.html) a été introduit récemment pour provoquer un crash déterministe lors des accès à des pointeurs pendus quand utilisé. Oilpan, MiraclePtr et les solutions basées sur les pointeurs intelligents nécessitent des adaptations significatives du code applicatif.

Au cours de la dernière décennie, une autre approche a connu un certain succès : la mise en quarantaine de la mémoire. L'idée de base est de placer explicitement la mémoire libérée en quarantaine et de ne la rendre disponible que lorsqu'une certaine condition de sécurité est atteinte. Microsoft a distribué des versions de cette stratégie d'atténuation dans ses navigateurs : [MemoryProtector](https://securityintelligence.com/understanding-ies-new-exploit-mitigations-the-memory-protector-and-the-isolated-heap/) dans Internet Explorer en 2014 et son successeur [MemGC](https://securityintelligence.com/memgc-use-after-free-exploit-mitigation-in-edge-and-ie-on-windows-10/) dans Edge (pré-Chromium) en 2015. Dans le [noyau Linux](https://a13xp0p0v.github.io/2020/11/30/slab-quarantine.html), une approche probabiliste a été utilisée où la mémoire était simplement recyclée à terme. Et cette approche a attiré l'attention dans le milieu académique ces dernières années avec l'article [MarkUs](https://www.cst.cam.ac.uk/blog/tmj32/addressing-temporal-memory-safety). Le reste de cet article résume notre parcours d'expérimentation avec des quarantaines et l'analyse du tas dans Chrome.

(À ce stade, on peut se demander où se situe l'étiquetage de la mémoire dans ce contexte – continuez à lire !)

## Quarantaine et balayage du tas, les bases

L'idée principale pour assurer la sécurité temporelle en utilisant la quarantaine et le balayage du tas est d'éviter de réutiliser la mémoire tant qu'il n'est pas prouvé qu'il n'existe plus de pointeurs pendants qui y font référence. Pour éviter de modifier le code utilisateur C++ ou sa sémantique, l'allocateur de mémoire fournissant `new` et `delete` est intercepté.

![Figure 1 : principes de la quarantaine](/_img/retrofitting-temporal-memory-safety-on-c++/basics.svg)

Lors de l'invocation de `delete`, la mémoire est en réalité placée en quarantaine, où elle ne peut pas être réutilisée pour de futurs appels à `new` par l'application. À un certain moment, un balayage du tas est déclenché, lequel scanne tout le tas, à la manière d'un ramasse-miettes, pour trouver des références aux blocs de mémoire mis en quarantaine. Les blocs qui n'ont pas de références entrantes depuis la mémoire régulière de l'application sont transférés à nouveau à l'allocateur où ils peuvent être réutilisés pour des allocations ultérieures.

Il existe diverses options de durcissement qui entraînent un coût de performance :

- Réinitialiser la mémoire mise en quarantaine avec des valeurs spéciales (par exemple zéro) ;
- Arrêter tous les threads de l'application lorsque le balayage est en cours ou balayer le tas de manière concurrente ;
- Intercepter les écritures mémoire (par exemple via la protection des pages) pour capturer les mises à jour de pointeurs ;
- Balayer la mémoire mot par mot pour détecter d'éventuels pointeurs (gestion conservatrice) ou fournir des descripteurs pour les objets (gestion précise) ;
- Séparer la mémoire de l'application en partitions sûres et non sûres afin d'exclure certains objets soit sensibles aux performances soit pouvant être prouvés statiquement comme sûrs à ignorer ;
- Balayer la pile d'exécution en plus de simplement balayer la mémoire du tas ;

Nous appelons la collection des différentes versions de ces algorithmes *StarScan* [stɑː skæn], ou *\*Scan* pour faire court.

## Vérification de la réalité

Nous appliquons \*Scan aux parties non gérées du processus du rendu et utilisons [Speedometer2](https://browserbench.org/Speedometer2.0/) pour évaluer l'impact sur les performances.

Nous avons expérimenté différentes versions de \*Scan. Pour minimiser autant que possible le surcoût en termes de performance, nous évaluons une configuration qui utilise un thread séparé pour balayer le tas et évite de réinitialiser automatiquement la mémoire mise en quarantaine lors de l'exécution de `delete`, mais réinitialise cette mémoire uniquement lors de l'exécution de \*Scan. Nous incluons toute la mémoire allouée avec `new` et ne faisons pas de distinction entre les sites et types d'allocation, pour simplifier cette première implémentation.

![Figure 2 : Balayage dans un thread séparé](/_img/retrofitting-temporal-memory-safety-on-c++/separate-thread.svg)

Notez que la version proposée de \*Scan n'est pas complète. Concrètement, un acteur malveillant pourrait exploiter une condition de concurrence avec le thread de balayage en déplaçant un pointeur pendant d'une région mémoire non balayée vers une région déjà balayée. Résoudre cette condition de concurrence nécessite de suivre les écritures dans les blocs de mémoire déjà balayée, par exemple en utilisant des mécanismes de protection mémoire pour intercepter ces accès, ou en arrêtant tous les threads de l'application dans des points sûrs pour empêcher toute modification du graphe des objets. Dans tous les cas, résoudre ce problème entraîne un coût de performance et présente un intéressant compromis entre performance et sécurité. Notez que ce type d'attaque n'est pas générique et ne fonctionne pas pour tous les UAF. Les problèmes, comme ceux décrits dans l'introduction, ne seraient pas vulnérables à de telles attaques, car le pointeur pendant n'est pas copié.

Étant donné que les bénéfices en termes de sécurité dépendent réellement de la granularité de ces points sûrs et que nous souhaitons expérimenter avec la version la plus rapide possible, nous avons complètement désactivé les points sûrs.

Exécuter notre version de base sur Speedometer2 réduit le score total de 8 %. Dommage…

D'où vient tout ce surcoût ? Sans surprise, le balayage du tas est limité par la mémoire et assez coûteux, car toute la mémoire utilisateur doit être parcourue et examinée pour trouver des références par le thread de balayage.

Pour réduire la régression, nous avons implémenté diverses optimisations visant à améliorer la vitesse brute du balayage. Naturellement, la manière la plus rapide de balayer la mémoire est de ne pas la balayer du tout, et nous avons donc partitionné le tas en deux classes : la mémoire qui peut contenir des pointeurs et celle que nous pouvons prouver statiquement comme ne contenant pas de pointeurs, par exemple les chaînes de caractères. Nous évitons de balayer la mémoire qui ne peut contenir aucun pointeur. Notez qu'une telle mémoire fait toujours partie de la quarantaine ; elle n'est simplement pas balayée.

Nous avons étendu ce mécanisme pour couvrir également les allocations servant de mémoire de support pour d'autres allocateurs, par exemple la mémoire de zone gérée par V8 pour le compilateur JavaScript optimisé. De telles zones sont toujours libérées d'un seul coup (cf. gestion de la mémoire basée sur les régions) et la sécurité temporelle est établie par d'autres moyens dans V8.

En plus, nous avons appliqué plusieurs micro-optimisations pour accélérer et éliminer des calculs : nous utilisons des tables d'aide pour le filtrage des pointeurs ; nous nous appuyons sur SIMD pour la boucle de balayage limitée par la mémoire ; et nous minimisons le nombre de récupérations et d'instructions préfixées par des verrous.

Nous améliorons également l'algorithme de planification initial qui lance simplement une analyse de tas lorsqu'une certaine limite est atteinte, en ajustant le temps passé à analyser par rapport à l'exécution du code de l'application (voir l'utilisation du mutateur dans la [littérature sur la collecte des déchets](https://dl.acm.org/doi/10.1145/604131.604155)).

Au final, l'algorithme reste limité par la mémoire et l'analyse demeure une procédure remarquablement coûteuse. Les optimisations ont permis de réduire la régression de Speedometer2 de 8 % à 2 %.

Bien que nous ayons amélioré le temps brut d'analyse, le fait que la mémoire soit mise en quarantaine augmente l'ensemble de travail global d'un processus. Pour quantifier davantage ce surcoût, nous utilisons un ensemble sélectionné de [benchmarks de navigation réels de Chrome](https://chromium.googlesource.com/catapult/) pour mesurer la consommation de mémoire. \*L'analyse dans le processus de rendu augmente la consommation de mémoire d'environ 12 %. C’est cette augmentation de l’ensemble de travail qui entraîne plus de mémoire paginée, ce qui est perceptible dans les parcours rapides de l’application.

## La mémoire matérielle avec balisage à la rescousse

MTE (Memory Tagging Extension) est une nouvelle extension de l'architecture ARM v8.5A qui aide à détecter les erreurs dans l'utilisation de la mémoire des logiciels. Ces erreurs peuvent être des erreurs spatiales (par exemple, accès hors limites) ou des erreurs temporelles (utilisation après libération). L'extension fonctionne comme suit. Chaque tranche de 16 octets de mémoire est assignée à un tag de 4 bits. Les pointeurs se voient également assigner un tag de 4 bits. L'allocateur est responsable de renvoyer un pointeur avec le même tag que la mémoire allouée. Les instructions de charge et de stockage vérifient que les tags du pointeur et de la mémoire correspondent. Si les tags de l'emplacement mémoire et du pointeur ne correspondent pas, une exception matérielle est levée.

MTE n'offre pas de protection déterministe contre l'utilisation après libération. Étant donné que le nombre de bits de tag est limité, il est possible que les tags de la mémoire et du pointeur correspondent en raison d'un débordement. Avec 4 bits, seulement 16 réallocations suffisent pour que les tags correspondent. Un acteur malveillant pourrait exploiter ce débordement de bits de tag pour obtenir une utilisation après libération simplement en attendant que le tag d'un pointeur flottant corresponde (à nouveau) à la mémoire à laquelle il pointe.

\*L'analyse peut être utilisée pour résoudre ce cas problématique. Lors de chaque appel `delete`, le tag du bloc de mémoire sous-jacent est incrémenté par le mécanisme MTE. La plupart du temps, le bloc sera disponible pour réallocation car le tag peut être incrémenté dans la plage de 4 bits. Des pointeurs obsolètes se référeraient à l'ancien tag et provoqueraient ainsi un crash fiable lors de leur dé-référencement. Lors du débordement du tag, l'objet est alors placé en quarantaine et traité par \*l'analyse. Une fois que l'analyse vérifie qu'il n'y a plus de pointeurs flottants vers ce bloc de mémoire, il est renvoyé à l'allocateur. Cela réduit le nombre d'analyses et leurs coûts associés d'environ 16 fois.

L'image suivante illustre ce mécanisme. Le pointeur vers `foo` a initialement un tag de `0x0E`, ce qui lui permet d'être incrémenté une fois de plus pour l'allocation de `bar`. Lors de l'invocation de `delete` pour `bar`, le tag déborde et la mémoire est effectivement mise en quarantaine de \*l'analyse.

![Figure 3: MTE](/_img/retrofitting-temporal-memory-safety-on-c++/mte.svg)

Nous avons testé sur un matériel réel prenant en charge MTE et refait les expériences dans le processus de rendu. Les résultats sont prometteurs car la régression de Speedometer était dans le bruit de fond et nous n'avons régressé l'empreinte mémoire que d'environ 1 % sur les histoires de navigation réelles de Chrome.

Est-ce un véritable [repas gratuit](https://en.wikipedia.org/wiki/No_free_lunch_theorem) ? Il s'avère que MTE a un certain coût qui a déjà été payé. Plus précisément, PartitionAlloc, qui est l'allocateur sous-jacent de Chrome, exécute déjà les opérations de gestion des tags pour tous les appareils compatibles MTE par défaut. En outre, pour des raisons de sécurité, la mémoire devrait vraiment être effacée avec empressement. Pour quantifier ces coûts, nous avons effectué des expériences sur un prototype matériel précoce prenant en charge MTE dans plusieurs configurations :

 A. MTE désactivé et sans effacement de la mémoire ;
 B. MTE désactivé mais avec effacement de la mémoire ;
 C. MTE activé sans \*l'analyse ;
 D. MTE activé avec \*l'analyse ;

(Nous sommes également conscients qu'il existe des modes MTE synchrones et asynchrones qui affectent également le déterminisme et les performances. Pour les besoins de cette expérience, nous avons continué à utiliser le mode asynchrone.)

![Figure 4: Régression MTE](/_img/retrofitting-temporal-memory-safety-on-c++/mte-regression.svg)

Les résultats montrent que MTE et l'effacement de la mémoire entraînent un certain coût, qui est d'environ 2 % sur Speedometer2. Notez que ni PartitionAlloc, ni le matériel n'ont encore été optimisés pour ces scénarios. L'expérience montre également que l'ajout de \*l'analyse par-dessus MTE ne s'accompagne d'aucun coût mesurable.

## Conclusions
