---
title: 'Version V8 v9.2'
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser))'
avatars:
 - 'ingvar-stepanyan'
date: 2021-07-16
tags:
 - publication
description: 'La version V8 v9.2 introduit une méthode `at` pour l'indexation relative et des améliorations de la compression des pointeurs.'
tweet: ''
---
Toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](https://v8.dev/docs/release-process). Chaque version est dérivée du master Git de V8 juste avant une étape de Chrome Beta. Aujourd'hui, nous sommes heureux d'annoncer notre dernière branche, [version V8 9.2](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/9.2), qui est en bêta jusqu'à sa publication en coordination avec Chrome 92 Stable dans quelques semaines. V8 v9.2 est rempli de toutes sortes de nouveautés pour les développeurs. Ce post offre un aperçu de certains des points forts en attendant la publication.

<!--truncate-->
## JavaScript

### Méthode `at`

La nouvelle méthode `at` est désormais disponible sur les tableaux, les tableaux typés et les chaînes de caractères. Lorsqu'elle reçoit une valeur négative, elle effectue un indexage relatif à partir de la fin de l'élément indexable. Lorsqu'elle reçoit une valeur positive, elle se comporte identiquement à l'accès par propriété. Par exemple, `[1,2,3].at(-1)` est `3`. Voir plus de détails sur [notre documentation](https://v8.dev/features/at-method).

## Cage partagée de compression des pointeurs

V8 prend en charge [la compression des pointeurs](https://v8.dev/blog/pointer-compression) sur les plateformes 64 bits, y compris x64 et arm64. Cela est réalisé en divisant un pointeur 64 bits en deux moitiés. Les 32 bits supérieurs peuvent être considérés comme une base tandis que les 32 bits inférieurs peuvent être considérés comme un indice dans cette base.

```
            |----- 32 bits -----|----- 32 bits -----|
Pointeur :  |________base_______|_______index_______|
```

Actuellement, un Isolate effectue toutes les allocations dans le tas GC au sein d'une "cage" mémoire virtuelle de 4 Go, garantissant que tous les pointeurs ont la même adresse de base supérieure de 32 bits. Avec l'adresse de base maintenue constante, les pointeurs 64 bits peuvent être passés uniquement en utilisant l'indice 32 bits, car le pointeur complet peut être reconstruit.

Avec v9.2, la valeur par défaut est modifiée pour que tous les Isolates d'un processus partagent la même cage mémoire virtuelle de 4 Go. Cela a été fait en prévision du prototypage de fonctionnalités expérimentales de mémoire partagée en JS. Avec chaque thread de travail ayant son propre Isolate et donc sa propre cage mémoire virtuelle de 4 Go, les pointeurs ne pouvaient pas être transmis entre Isolates avec une cage par Isolate car ils ne partageaient pas la même adresse de base. Ce changement présente également l'avantage supplémentaire de réduire la pression sur la mémoire virtuelle lors de la mise en route des threads de travail.

Le compromis du changement est que la taille totale du tas V8 sur tous les threads d'un processus est limitée à un maximum de 4 Go. Cette limitation peut être indésirable pour les charges de travail serveur qui génèrent de nombreux threads par processus, car cela entraînera une pénurie de mémoire virtuelle plus rapidement qu'auparavant. Les intégrateurs peuvent désactiver le partage de la cage de compression des pointeurs avec l'argument GN `v8_enable_pointer_compression_shared_cage = false`.

## API V8

Veuillez utiliser `git log branch-heads/9.1..branch-heads/9.2 include/v8.h` pour obtenir une liste des changements de l'API.

Les développeurs ayant un checkout actif de V8 peuvent utiliser `git checkout -b 9.2 -t branch-heads/9.2` pour expérimenter avec les nouvelles fonctionnalités de V8 v9.2. Alternativement, vous pouvez [vous inscrire au canal Beta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer les nouvelles fonctionnalités bientôt.
