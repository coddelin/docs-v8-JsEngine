---
title: 'Un V8 plus léger'
author: 'Mythri Alle, Dan Elphick, et [Ross McIlroy](https://twitter.com/rossmcilroy), observateurs de poids du V8'
avatars:
  - 'mythri-alle'
  - 'dan-elphick'
  - 'ross-mcilroy'
date: 2019-09-12 12:44:37
tags:
  - internes
  - mémoire
  - présentations
description: 'Le projet V8 Lite a considérablement réduit la surcharge mémoire de V8 sur des sites web typiques, voici comment nous l'avons fait.'
tweet: '1172155403343298561'
---
Fin 2018, nous avons lancé un projet nommé V8 Lite, visant à réduire drastiquement la consommation de mémoire de V8. Initialement, ce projet était conçu comme un mode *Lite* distinct de V8, destiné spécifiquement aux appareils mobiles à faible mémoire ou aux cas d'utilisations embarqués privilégiant la réduction de l'utilisation de la mémoire plutôt que la vitesse d'exécution. Cependant, au cours de ce travail, nous avons réalisé que bon nombre des optimisations mémoire que nous avions conçues pour ce mode *Lite* pouvaient être intégrées au V8 ordinaire, bénéficiant ainsi à tous les utilisateurs de V8.

<!--truncate-->
Dans cet article, nous mettons en lumière certaines des optimisations principales que nous avons développées et les économies de mémoire qu'elles ont apportées dans des charges de travail réelles.

:::note
**Note :** Si vous préférez regarder une présentation plutôt que lire des articles, profitez de la vidéo ci-dessous ! Sinon, passez la vidéo et continuez votre lecture.
:::

<figure>
  <div class="video video-16:9">
    <iframe width="560" height="315" src="https://www.youtube.com/embed/56ogP8-eRqA" allow="picture-in-picture" allowfullscreen loading="lazy"></iframe>
  </div>
  <figcaption><a href="https://www.youtube.com/watch?v=56ogP8-eRqA">“V8 Lite — réduire la mémoire JavaScript”</a> présenté par Ross McIlroy à BlinkOn 10.</figcaption>
</figure>

## Mode Lite

Pour optimiser l'utilisation de la mémoire de V8, il nous fallait d'abord comprendre comment la mémoire est utilisée par V8 et quels types d'objets contribuent à une grande proportion de la taille du tas de V8. Nous avons utilisé les outils de [visualisation de la mémoire](/blog/optimizing-v8-memory#memory-visualization) de V8 pour tracer la composition du tas sur un certain nombre de pages web typiques.

<figure>
  <img src="/_img/v8-lite/memory-categorization.svg" width="950" height="440" alt="" loading="lazy"/>
  <figcaption>Pourcentage du tas de V8 utilisé par différents types d'objets lors du chargement du site Times of India.</figcaption>
</figure>

Ce faisant, nous avons déterminé qu'une proportion significative du tas de V8 était dédiée à des objets non essentiels à l'exécution de JavaScript, mais utilisés pour optimiser l'exécution de JavaScript et gérer des situations exceptionnelles. Voici quelques exemples : du code optimisé ; des retours d'information de types utilisés pour déterminer comment optimiser le code ; des métadonnées redondantes pour les liaisons entre les objets C++ et JavaScript ; des métadonnées nécessaires uniquement dans des circonstances exceptionnelles telles que la symbolisation des traces de pile ; et du code bytecode pour les fonctions qui ne sont exécutées que quelques fois lors du chargement de la page.

En conséquence, nous avons commencé à travailler sur un mode *Lite* de V8 qui privilégie les économies de mémoire en réduisant considérablement l'allocation de ces objets optionnels, au détriment de la vitesse d'exécution de JavaScript.

![](/_img/v8-lite/v8-lite.png)

Un certain nombre de modifications du mode *Lite* pouvaient être effectuées en configurant les paramètres existants de V8, par exemple, en désactivant le compilateur TurboFan de V8. Cependant, d'autres nécessitaient des modifications plus approfondies de V8.

En particulier, nous avons décidé que puisque le mode *Lite* n'optimise pas le code, nous pouvions éviter de collecter les retours d'information de types requis par le compilateur optimisant. Lors de l'exécution du code dans l'interpréteur Ignition, V8 collecte des informations sur les types d'opérandes passés à diverses opérations (par exemple, `+` ou `o.foo`), afin d'adapter ultérieurement l'optimisation à ces types. Ces informations sont stockées dans des *vecteurs de feedback* qui constituent une part significative de l'utilisation mémoire du tas de V8. Le mode *Lite* pouvait éviter d'allouer ces vecteurs de feedback, mais l'interpréteur et certaines parties de l'infrastructure de cache inline de V8 s'attendaient à ce que ces vecteurs de feedback soient disponibles, nécessitant ainsi un important remaniement pour pouvoir prendre en charge cette exécution sans feedback.

Le mode *Lite* a été lancé dans V8 v7.3 et offre une réduction de 22 % de la taille du tas typique des pages web par rapport à V8 v7.1 en désactivant l'optimisation du code, en n'allouant pas de vecteurs de feedback et en vieillissant le bytecode rarement exécuté (décrit ci-dessous). Cela représente un bon résultat pour les applications qui souhaitent explicitement sacrifier les performances pour une meilleure utilisation de la mémoire. Cependant, au cours de ce travail, nous avons réalisé que nous pouvions atteindre la majorité des économies de mémoire du mode *Lite* sans aucun impact sur les performances en rendant V8 plus paresseux dans ses allocations.

## Allocation paresseuse des feedbacks

Désactiver complètement l'allocation du vecteur de rétroaction non seulement empêche l'optimisation du code par le compilateur TurboFan de V8, mais empêche également V8 d'effectuer la [mise en cache en ligne](https://mathiasbynens.be/notes/shapes-ics#ics) des opérations courantes, comme le chargement des propriétés des objets dans l'interpréteur Ignition. Par conséquent, cela a provoqué une régression significative du temps d'exécution de V8, réduisant le temps de chargement des pages de 12 % et augmentant le temps CPU utilisé par V8 de 120 % dans des scénarios typiques de pages web interactives.

Pour apporter la plupart de ces économies à V8 ordinaire sans ces régressions, nous avons adopté une approche où nous allouons paresseusement les vecteurs de rétroaction après que la fonction a exécuté une certaine quantité de bytecode (actuellement 1KB). Comme la plupart des fonctions ne sont pas exécutées très souvent, nous évitons l'allocation de vecteurs de rétroaction dans la plupart des cas, mais nous les allouons rapidement lorsque cela est nécessaire pour éviter les régressions de performance tout en permettant l'optimisation du code.

Une complication supplémentaire avec cette approche est liée au fait que les vecteurs de rétroaction forment un arbre, les vecteurs de rétroaction pour les fonctions internes étant conservés en tant qu'entrées dans le vecteur de rétroaction de leur fonction externe. Cela est nécessaire pour que les fermetures de fonction nouvellement créées reçoivent le même tableau de vecteurs de rétroaction que toutes les autres fermetures créées pour la même fonction. Avec l'allocation paresseuse des vecteurs de rétroaction, nous ne pouvons pas former cet arbre à l'aide des vecteurs de rétroaction, car il n'est pas garanti qu'une fonction externe ait alloué son vecteur de rétroaction au moment où une fonction interne le fait. Pour résoudre ce problème, nous avons créé un nouveau `ClosureFeedbackCellArray` pour maintenir cet arbre, puis nous remplaçons le `ClosureFeedbackCellArray` d'une fonction par un `FeedbackVector` complet lorsqu'il devient plus utilisé.

![Arbres de vecteurs de rétroaction avant et après l'allocation paresseuse des rétroactions.](/_img/v8-lite/lazy-feedback.svg)

Nos expériences en laboratoire et les télémétriques en champs n'ont montré aucune régression de performance pour les rétroactions paresseuses sur desktop, et sur les plateformes mobiles, nous avons constaté une amélioration des performances sur les appareils bas de gamme grâce à une réduction du ramassage des ordures. Par conséquent, nous avons activé l'allocation paresseuse des rétroactions dans toutes les versions de V8, y compris en *mode Lite*, où la légère régression de mémoire par rapport à notre approche initiale d'absence d'allocation de rétroaction est plus que compensée par l'amélioration des performances dans le monde réel.

## Positions sources paresseuses

Lors de la compilation de bytecode à partir de JavaScript, des tables de positions sources sont générées pour relier les séquences de bytecode aux positions des caractères dans le code source JavaScript. Cependant, cette information n'est nécessaire que lors de la symbolisation des exceptions ou lors de l'exécution de tâches de développement telles que le débogage, et est donc rarement utilisée.

Pour éviter ce gaspillage, nous compilons maintenant le bytecode sans collecter les positions sources (à condition qu'aucun débogueur ou profileur ne soit attaché). Les positions sources ne sont collectées que lorsqu'une trace de pile est effectivement générée, par exemple lors de l'appel `Error.stack` ou de l'affichage de la trace de pile d'une exception dans la console. Cela a cependant un coût, car générer des positions sources nécessite de réanalyser et compiler la fonction, mais la plupart des sites web ne symbolisent pas les traces de pile en production et ne subissent donc aucun impact perceptible sur les performances.

Un problème que nous avons dû résoudre avec ce travail était d'exiger une génération répétable de bytecode, ce qui n'avait pas été garanti auparavant. Si V8 génère un bytecode différent lorsqu'il collecte les positions sources par rapport au code original, alors les positions sources ne correspondent pas et les traces de pile pourraient pointer vers la mauvaise position dans le code source.

Dans certaines circonstances, V8 pouvait générer un bytecode différent selon qu'une fonction était [compilée de manière immédiate ou paresseuse](/blog/preparser#skipping-inner-functions), en raison de la perte de certaines informations du parseur entre l'analyse immédiate initiale d'une fonction et la compilation paresseuse ultérieure. Ces divergences étaient pour la plupart bénignes, par exemple perdre de vue le fait qu'une variable est immuable et donc ne pas pouvoir l'optimiser en tant que telle. Cependant, certaines des divergences découvertes par ce travail avaient le potentiel de provoquer une exécution incorrecte du code dans certaines circonstances. En conséquence, nous avons corrigé ces divergences et ajouté des vérifications ainsi qu'un mode de stress pour garantir que la compilation immédiate et paresseuse d'une fonction produisent toujours des résultats cohérents, ce qui nous confère une plus grande confiance dans la précision et la cohérence du parseur et du pré-parseur de V8.

## Vidage du bytecode

Le bytecode compilé à partir du code source JavaScript occupe une part importante de l'espace du tas V8, typiquement autour de 15 %, y compris les métadonnées associées. Il existe de nombreuses fonctions qui ne sont exécutées que pendant l'initialisation ou qui sont rarement utilisées après avoir été compilées.

En conséquence, nous avons ajouté une prise en charge pour vider le bytecode compilé des fonctions pendant le ramassage des ordures s'ils n'ont pas été exécutés récemment. Pour ce faire, nous suivons l'*ancienneté* du bytecode d'une fonction, augmentant l'*ancienneté* à chaque [ramassage d'ordures majeur (mark-compact)](/blog/trash-talk#major-gc), et la réinitialisant à zéro lorsque la fonction est exécutée. Tout bytecode qui dépasse un seuil d’ancienneté est éligible pour être collecté lors du prochain ramassage des ordures. S'il est collecté puis exécuté plus tard, il est recompilé.

Il y avait des défis techniques pour s'assurer que le bytecode n'était purgé que lorsque cela n'était plus nécessaire. Par exemple, si la fonction `A` appelle une autre fonction de longue durée `B`, la fonction `A` pourrait être vieillie alors qu'elle est toujours sur la pile. Nous ne voulons pas purger le bytecode de la fonction `A` même si elle atteint son seuil de vieillissement, car nous devons y revenir lorsque la fonction de longue durée `B` revient. Ainsi, nous traitons le bytecode comme faiblement maintenu par une fonction lorsqu'il atteint son seuil de vieillissement, mais fortement maintenu par toute référence à celui-ci sur la pile ou ailleurs. Nous ne purgeons le code que lorsqu'il ne reste aucun lien fort.

En plus de purger le bytecode, nous purgeons également les vecteurs de feedback associés à ces fonctions purgées. Cependant, nous ne pouvons pas purger les vecteurs de feedback pendant le même cycle de GC que le bytecode, car ils ne sont pas retenus par le même objet - le bytecode est maintenu par un `SharedFunctionInfo` indépendant du contexte natif, tandis que le vecteur de feedback est retenu par le contexte natif dépendant `JSFunction`. Par conséquent, nous purgeons les vecteurs de feedback lors du cycle de GC suivant.

![La disposition des objets pour une fonction vieillie après deux cycles de GC.](/_img/v8-lite/bytecode-flushing.svg)

## Optimisations supplémentaires

En plus de ces projets majeurs, nous avons également identifié et corrigé quelques inefficacités.

La première consistait à réduire la taille des objets `FunctionTemplateInfo`. Ces objets stockent des métadonnées internes sur les [`FunctionTemplate`s](/docs/embed#templates), qui permettent aux implémenteurs, comme Chrome, de fournir des implémentations de fonctions en callbacks C++ pouvant être appelées par du code JavaScript. Chrome introduit beaucoup de FunctionTemplates pour implémenter les API Web du DOM, et par conséquent les objets `FunctionTemplateInfo` contribuaient à la taille de l'espace mémoire de V8. Après avoir analysé l'utilisation typique des FunctionTemplates, nous avons constaté que des onze champs d'un objet `FunctionTemplateInfo`, seuls trois étaient généralement définis à une valeur non par défaut. Nous avons donc scindé l'objet `FunctionTemplateInfo` de manière à ce que les champs rares soient stockés dans une table secondaire qui n'est allouée à la demande que si nécessaire.

La deuxième optimisation est liée à la manière dont nous désoptimisons à partir du code optimisé de TurboFan. Étant donné que TurboFan réalise des optimisations spéculatives, il pourrait devoir revenir à l'interpréteur (désoptimiser) si certaines conditions ne tiennent plus. Chaque point de désoptimisation a un identifiant qui permet au runtime de déterminer où, dans le bytecode, il doit reprendre l'exécution dans l'interpréteur. Auparavant, cet identifiant était calculé en faisant sauter le code optimisé à un certain offset dans une grande table de saut, qui chargeait l'identifiant correct dans un registre avant de sauter dans le runtime pour effectuer la désoptimisation. Cela avait l'avantage de n'exiger qu'une seule instruction de saut dans le code optimisé pour chaque point de désoptimisation. Cependant, la table de saut de désoptimisation était préallouée et devait être suffisamment grande pour supporter toute la plage d'identifiants de désoptimisation. Nous avons modifié TurboFan pour que les points de désoptimisation dans le code optimisé chargent directement l'identifiant de désoptimisation avant d'appeler le runtime. Cela nous a permis de supprimer entièrement cette grande table de saut, au prix d'une légère augmentation de la taille du code optimisé.

## Résultats

Nous avons publié les optimisations décrites ci-dessus au cours des sept dernières versions de V8. En général, elles ont d'abord été intégrées en *mode Lite*, avant d'être plus tard introduites dans la configuration par défaut de V8.

![Taille moyenne de l'espace mémoire de V8 pour un ensemble de pages web typiques sur un appareil AndroidGo.](/_img/v8-lite/savings-by-release.svg)

![Répartition par page des économies de mémoire de V8 v7.8 (Chrome 78) par rapport à v7.1 (Chrome 71).](/_img/v8-lite/breakdown-by-page.svg)

Au cours de cette période, nous avons réduit la taille de l'espace mémoire de V8 de 18 % en moyenne sur une variété de sites web typiques, ce qui correspond à une diminution moyenne de 1,5 Mo pour les appareils mobiles AndroidGo bas de gamme. Cela a été possible sans impact significatif sur les performances JavaScript, que ce soit dans les benchmarks ou tel que mesuré lors d'interactions réelles sur des pages web.

Le *mode Lite* peut offrir des économies de mémoire supplémentaires au prix d'un ralentissement du débit d'exécution JavaScript en désactivant l'optimisation des fonctions. En moyenne, le *mode Lite* offre 22 % d'économie de mémoire, certaines pages atteignant jusqu'à 32 % de réduction. Cela correspond à une réduction de 1,8 Mo de la taille de l'espace mémoire de V8 sur un appareil AndroidGo.

![Répartition des économies de mémoire de V8 v7.8 (Chrome 78) par rapport à v7.1 (Chrome 71).](/_img/v8-lite/breakdown-by-optimization.svg)

Lorsqu'on examine l'impact de chaque optimisation individuelle, il est clair que différentes pages tirent une proportion différente de leur bénéfice de chacune de ces optimisations. À l'avenir, nous continuerons à identifier des optimisations potentielles qui pourraient encore réduire l'utilisation de la mémoire de V8 tout en restant extrêmement rapide dans l'exécution de JavaScript.
