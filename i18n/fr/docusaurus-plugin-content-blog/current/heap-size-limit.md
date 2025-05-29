---
title: "Un petit pas pour Chrome, un grand bond pour V8"
author: "les gardiens du tas Ulan Degenbaev, Hannes Payer, Michael Lippautz, et le guerrier DevTools Alexey Kozyatinskiy"
avatars: 
  - "ulan-degenbaev"
  - "michael-lippautz"
  - "hannes-payer"
date: "2017-02-09 13:33:37"
tags: 
  - mémoire
description: "V8 a récemment augmenté sa limite stricte de taille de tas."
---
V8 a une limite stricte sur la taille de son tas. Cela sert de protection contre les applications qui présentent des fuites de mémoire. Lorsqu'une application atteint cette limite stricte, V8 effectue une série de collectes de déchets en dernier recours. Si ces collectes de déchets ne permettent pas de libérer de la mémoire, V8 arrête l'exécution et signale une panne due à un manque de mémoire. Sans cette limite stricte, une application présentant une fuite de mémoire pourrait utiliser toute la mémoire du système, nuisant aux performances des autres applications.

<!--truncate-->
Ironiquement, ce mécanisme de protection rend l'investigation des fuites de mémoire plus difficile pour les développeurs JavaScript. L'application peut manquer de mémoire avant que le développeur ne parvienne à inspecter le tas dans DevTools. De plus, le processus DevTools lui-même peut manquer de mémoire car il utilise une instance ordinaire de V8. Par exemple, prendre un instantané de tas de [cette démo](https://ulan.github.io/misc/heap-snapshot-demo.html) interrompt l'exécution en raison d'un manque de mémoire sur la version stable actuelle de Chrome.

Historiquement, la limite de tas de V8 était commodément fixée pour s'adapter à la plage d'entiers signés sur 32 bits avec une certaine marge. Au fil du temps, cette commodité a entraîné un code bâclé dans V8 mélangeant les types de différentes largeurs de bits, ce qui a effectivement empêché la possibilité d'augmenter la limite. Nous avons récemment nettoyé le code du collecteur de déchets, permettant l'utilisation de tailles de tas plus grandes. DevTools utilise déjà cette fonctionnalité, et prendre un instantané de tas dans la démo mentionnée précédemment fonctionne comme prévu dans la dernière version de Chrome Canary.

Nous avons également ajouté une fonctionnalité dans DevTools pour mettre l'application en pause lorsqu'elle est proche de manquer de mémoire. Cette fonctionnalité est utile pour enquêter sur les bogues qui amènent l'application à allouer beaucoup de mémoire en peu de temps. Lors de l'exécution de [cette démo](https://ulan.github.io/misc/oom.html) avec la dernière version de Chrome Canary, DevTools met l'application en pause avant la panne due au manque de mémoire et augmente la limite de tas, donnant à l'utilisateur une chance d'inspecter le tas, d'évaluer des expressions sur la console pour libérer de la mémoire, puis de reprendre l'exécution pour un débogage plus approfondi.

![](/_img/heap-size-limit/debugger.png)

Les intégrateurs de V8 peuvent augmenter la limite de tas en utilisant la fonction [`set_max_old_generation_size_in_bytes`](https://codesearch.chromium.org/chromium/src/v8/include/v8-isolate.h?q=set_max_old_generation_size_in_bytes) de l'API `ResourceConstraints`. Mais attention, certaines phases du collecteur de déchets ont une dépendance linéaire avec la taille du tas. Les pauses de collecte de déchets peuvent augmenter avec des tas plus grands.
