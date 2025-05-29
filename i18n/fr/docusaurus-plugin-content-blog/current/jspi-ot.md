---
title: 'L'intégration des promesses JavaScript de WebAssembly (JSPI) entre en phase de test origin'
description: 'Nous expliquons le début de la phase d'essai pour le JSPI'
author: 'Francis McCabe, Thibaud Michaud, Ilya Rezvov, Brendan Dahl'
date: 2024-03-06
tags:
  - WebAssembly
---
L'API d'intégration des promesses JavaScript (JSPI) de WebAssembly entre en phase de test origin, avec la version M123 de Chrome. Cela signifie que vous pouvez tester si vous et vos utilisateurs pouvez profiter de cette nouvelle API.

JSPI est une API qui permet à du code dit séquentiel – qui a été compilé en WebAssembly – d'accéder à des API Web qui sont _asynchrones_. De nombreuses API Web sont conçues en termes de `Promise`s JavaScript : au lieu de réaliser immédiatement l'opération demandée, elles renvoient une `Promise` pour le faire. Lorsque l'action est finalement réalisée, le gestionnaire de tâches du navigateur déclenche les callbacks liés à la Promise. JSPI s'intègre dans cette architecture permettant à une application WebAssembly d'être suspendue lorsque la `Promise` est retournée et reprise lorsque celle-ci est résolue.

<!--truncate-->
Vous pouvez en savoir plus sur JSPI et comment l'utiliser [ici](https://v8.dev/blog/jspi). La spécification elle-même est disponible [ici](https://github.com/WebAssembly/js-promise-integration).

## Exigences

En plus de vous inscrire à la phase de test origin, vous devrez également générer le WebAssembly et JavaScript appropriés. Si vous utilisez Emscripten, cela est simple. Assurez-vous d'utiliser au moins la version 3.1.47.

## Inscription à la phase de test origin

JSPI est encore en phase de pré-lancement ; il est en cours de processus de standardisation et ne sera complètement publié qu'une fois arrivé à la phase 4 de ce processus. Pour l'utiliser dès aujourd'hui, vous pouvez définir un paramètre dans le navigateur Chrome ; ou, vous pouvez demander un jeton de test origin qui permettra à vos utilisateurs de l'accéder sans avoir à définir eux-mêmes le paramètre.

Pour vous inscrire, vous pouvez aller [ici](https://developer.chrome.com/origintrials/#/register_trial/1603844417297317889), et assurez-vous de suivre le processus d'inscription. Pour en savoir plus sur les phases de test origin en général, [ceci](https://developer.chrome.com/docs/web-platform/origin-trials) est un bon point de départ.

## Quelques mises en garde potentielles

Il y a eu quelques [discussions](https://github.com/WebAssembly/js-promise-integration/issues) dans la communauté WebAssembly concernant certains aspects de l'API JSPI. Par conséquent, certains changements sont envisagés, ce qui prendra du temps pour se propager dans le système. Nous prévoyons que ces changements seront *lancés en douceur* : nous partagerons les changements lorsqu'ils seront disponibles. Cependant, l'API existante sera maintenue au moins jusqu'à la fin de la phase de test origin.

De plus, certains problèmes connus sont peu susceptibles d'être complètement résolus au cours de cette période de test origin :

Pour les applications qui créent intensivement des calculs parallèles, les performances d'une séquence encapsulée (c'est-à-dire utilisant JSPI pour accéder à une API asynchrone) peuvent en souffrir. Cela est dû au fait que les ressources utilisées lors de la création de l'appel encapsulé ne sont pas mises en cache entre les appels ; nous comptons sur la collecte des déchets pour nettoyer les piles créées.
Nous affectons actuellement une pile de taille fixe pour chaque appel encapsulé. Cette pile est nécessairement grande pour permettre des applications complexes. Cependant, cela signifie également qu'une application ayant un grand nombre d'appels encapsulés simples _en cours d'exécution_ peut éprouver une pression mémoire.

Aucun de ces problèmes ne devrait entraver l'expérimentation avec JSPI ; nous nous attendons à ce qu'ils soient résolus avant que JSPI ne soit officiellement publié.

## Retours

Étant donné que JSPI est un effort en voie de standardisation, nous préférons que tout problème et retour soient partagés [ici](https://github.com/WebAssembly/js-promise-integration/issues). Cependant, les rapports de bugs peuvent être soumis sur le site de rapport de bugs standard de Chrome [ici](https://issues.chromium.org/new). Si vous soupçonnez un problème lié à la génération de code, utilisez [ceci](https://github.com/emscripten-core/emscripten/issues) pour signaler un problème.

Enfin, nous aimerions entendre parler des avantages que vous avez découverts. Utilisez le [suivi des problèmes](https://github.com/WebAssembly/js-promise-integration/issues) pour partager votre expérience.
