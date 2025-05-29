---
title: "V8 sans JIT"
author: "Jakob Gruber ([@schuay](https://twitter.com/schuay))"
avatars:
  - "jakob-gruber"
date: 2019-03-13 13:03:19
tags:
  - internes
description: 'V8 v7.4 prend en charge l'exécution de JavaScript sans allocation de mémoire exécutable à l'exécution.'
tweet: "1105777150051999744"
---
V8 v7.4 prend désormais en charge l'exécution de JavaScript sans allocation de mémoire exécutable à l'exécution.

Dans sa configuration par défaut, V8 repose fortement sur la capacité à allouer et modifier de la mémoire exécutable à l'exécution. Par exemple, le [compilateur optimisant TurboFan](/blog/turbofan-jit) crée du code natif pour les fonctions JavaScript (JS) les plus fréquemment utilisées à la volée, et la plupart des expressions régulières en JS sont compilées en code natif par le [moteur irregexp](https://blog.chromium.org/2009/02/irregexp-google-chromes-new-regexp.html). La création de mémoire exécutable à l'exécution est une partie de ce qui rend V8 rapide.

<!--truncate-->
Mais dans certaines situations, il peut être souhaitable d'exécuter V8 sans allocation de mémoire exécutable :

1. Certaines plateformes (par exemple, iOS, téléviseurs intelligents, consoles de jeux) interdisent l'accès en écriture à la mémoire exécutable pour les applications non privilégiées, ce qui a jusqu'ici rendu l'utilisation de V8 impossible sur ces plateformes ; et
1. interdire les écritures dans la mémoire exécutable réduit la surface d'attaque de l'application contre les exploits.

Le nouveau mode sans JIT de V8 vise à répondre à ces enjeux. Lorsqu'on démarre V8 avec l'option `--jitless`, V8 fonctionne sans aucune allocation de mémoire exécutable à l'exécution.

Comment cela fonctionne-t-il ? Essentiellement, V8 bascule en mode uniquement interpréteur en se basant sur nos technologies existantes : tout le code utilisateur JS passe par l'[interpréteur Ignition](/blog/ignition-interpreter), et la correspondance des expressions régulières est également interprétée. WebAssembly n'est actuellement pas pris en charge, mais l'interprétation reste une possibilité. Les fonctions natives de V8 sont toujours compilées en code natif, mais ne font plus partie du tas JS géré, grâce à nos efforts récents pour [les intégrer dans le binaire de V8](/blog/embedded-builtins).

Ces changements nous ont finalement permis de créer le tas de V8 sans nécessiter de permissions exécutables pour aucune de ses régions mémoire.

## Résultats

Étant donné que le mode sans JIT désactive le compilateur optimisant, il entraîne une pénalité de performance. Nous avons examiné divers benchmarks pour mieux comprendre comment les caractéristiques de performance de V8 changent. [Speedometer 2.0](/blog/speedometer-2) vise à représenter une application web typique ; le [Web Tooling Benchmark](/blog/web-tooling-benchmark) comprend un ensemble d'outils de développement JS courants ; et nous incluons également un benchmark simulant un [flux de navigation sur l'application YouTube Living Room](https://chromeperf.appspot.com/report?sid=518c637ffa0961f965afe51d06979375467b12b87e72061598763e5a36876306). Toutes les mesures ont été effectuées localement sur un ordinateur de bureau Linux x64 au cours de 5 exécutions.

![Mode sans JIT vs configuration par défaut de V8. Les scores sont normalisés à 100 pour la configuration par défaut de V8.](/_img/jitless/benchmarks.svg)

Speedometer 2.0 est environ 40 % plus lent en mode sans JIT. Environ la moitié de cette régression peut être attribuée au compilateur optimisant désactivé. L'autre moitié est causée par l'interpréteur d'expressions régulières, qui était initialement destiné à être un outil de débogage et verra des améliorations de performance à l'avenir.

Le Web Tooling Benchmark tend à passer davantage de temps dans du code optimisé par TurboFan et montre donc une régression plus importante de 80 % lorsque le mode sans JIT est activé.

Enfin, nous avons mesuré une session de navigation simulée sur l'application YouTube Living Room, incluant la lecture vidéo et la navigation dans les menus. Ici, le mode sans JIT est globalement similaire et ne montre qu'un ralentissement de 6 % dans l'exécution JS par rapport à une configuration standard de V8. Ce benchmark démontre comment la performance optimale du code n'est pas toujours corrélée à la [performance dans le monde réel](/blog/real-world-performance), et dans de nombreuses situations, les intégrateurs peuvent maintenir des performances raisonnables même en mode sans JIT.

La consommation de mémoire a légèrement changé, avec une diminution médiane de 1,7 % de la taille du tas de V8 lors du chargement d'un ensemble représentatif de sites web.

Nous encourageons les intégrateurs sur des plateformes restreintes ou avec des exigences de sécurité particulières à envisager le nouveau mode sans JIT de V8, désormais disponible dans V8 v7.4. Comme toujours, vos questions et commentaires sont les bienvenus sur le groupe de discussion [v8-users](https://groups.google.com/forum/#!forum/v8-users).

## FAQ

*Quelle est la différence entre `--jitless` et `--no-opt` ?*

`--no-opt` désactive le compilateur optimisant TurboFan. `--jitless` désactive toute allocation de mémoire exécutable à l'exécution.
