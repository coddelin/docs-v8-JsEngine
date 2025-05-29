---
title: "Publication de V8 version v8.9"
author: 'Ingvar Stepanyan ([@RReverser](https://twitter.com/RReverser)), en attente d'un appel'
avatars:
 - "ingvar-stepanyan"
date: 2021-02-04
tags:
 - publication
description: 'La version v8.9 de V8 apporte des améliorations de performances pour les appels avec un décalage de taille d'arguments.'
tweet: "1357358418902802434"
---
Toutes les six semaines, nous créons une nouvelle branche de V8 dans le cadre de notre [processus de publication](https://v8.dev/docs/release-process). Chaque version est issue du Git master de V8 juste avant une étape bêta de Chrome. Aujourd'hui, nous sommes heureux d'annoncer notre nouvelle branche, [V8 version 8.9](https://chromium.googlesource.com/v8/v8.git/+log/branch-heads/8.9), qui est en bêta jusqu'à sa publication en coordination avec Chrome 89 Stable dans quelques semaines. V8 v8.9 est rempli de toutes sortes de fonctionnalités intéressantes pour les développeurs. Cet article propose un aperçu de quelques points forts en prévision de la publication.

<!--truncate-->
## JavaScript

### `await` au niveau supérieur

[`await` au niveau supérieur](https://v8.dev/features/top-level-await) est disponible dans le [moteur de rendu Blink](https://www.chromium.org/blink) 89, un moteur principal d'intégration de V8.

Dans V8 autonome, `await` au niveau supérieur reste derrière le drapeau `--harmony-top-level-await`.

Veuillez consulter [notre explicatif](https://v8.dev/features/top-level-await) pour plus de détails.

## Performances

### Appels plus rapides avec décalage de taille des arguments

JavaScript permet d'appeler une fonction avec un nombre d'arguments différent du nombre de paramètres attendus, c'est-à-dire qu'on peut passer soit moins soit plus d'arguments que les paramètres formels définis. Le premier cas est appelé sous-application et le second est appelé sur-application.

Dans le cas de sous-application, les paramètres restants sont assignés à la valeur `undefined`. Dans le cas de sur-application, les arguments restants peuvent être soit accessibles en utilisant le paramètre rest et la propriété `Function.prototype.arguments`, soit simplement superflus et ignorés. Nombre de frameworks web et Node.js utilisent désormais cette fonctionnalité JS pour accepter des paramètres optionnels et créer des API plus flexibles.

Jusqu'à récemment, V8 disposait d'une mécanique spéciale pour gérer le décalage de taille des arguments : le cadre d'adaptation des arguments. Malheureusement, l'adaptation des arguments engendre un coût en termes de performances et est couramment requise dans les frameworks modernes de front-end et de middleware. Il s'avère qu'avec une conception astucieuse (comme inverser l'ordre des arguments dans la pile), nous pouvons supprimer ce cadre supplémentaire, simplifier la base de code de V8 et éliminer presque entièrement la surcharge.

![Impact des performances de la suppression du cadre d'adaptation des arguments, tel que mesuré à travers un micro-benchmark.](/_img/v8-release-89/perf.svg)

Le graphique montre qu'il n'y a plus de surcharge lorsque l'on fonctionne en [mode sans JIT](https://v8.dev/blog/jitless) (Ignition) avec une amélioration de performances de 11,2 %. En utilisant TurboFan, nous obtenons jusqu'à 40 % de gain de vitesse. La surcharge par rapport au cas sans décalage est due à une petite optimisation dans l'[épilogue de la fonction](https://source.chromium.org/chromium/chromium/src/+/master:v8/src/compiler/backend/x64/code-generator-x64.cc;l=4905;drc=5056f555010448570f7722708aafa4e55e1ad052). Pour plus de détails, voir [le document de conception](https://docs.google.com/document/d/15SQV4xOhD3K0omGJKM-Nn8QEaskH7Ir1VYJb9_5SjuM/edit).

Si vous souhaitez en savoir plus sur les détails de ces améliorations, consultez le [article de blog dédié](https://v8.dev/blog/adaptor-frame).

## API V8

Veuillez utiliser `git log branch-heads/8.8..branch-heads/8.9 include/v8.h` pour obtenir une liste des changements d'API.

Les développeurs ayant un checkout V8 actif peuvent utiliser `git checkout -b 8.9 -t branch-heads/8.9` pour expérimenter les nouvelles fonctionnalités dans V8 v8.9. Alternativement, vous pouvez [vous abonner au canal bêta de Chrome](https://www.google.com/chrome/browser/beta.html) et essayer les nouvelles fonctionnalités par vous-même bientôt.
