---
title: 'Aidez-nous à tester l'avenir de V8 !'
author: 'Daniel Clifford ([@expatdanno](https://twitter.com/expatdanno)), Original Munich V8 Brewer'
date: 2017-02-14 13:33:37
tags:
  - internals
description: 'Découvrez dès aujourd'hui la nouvelle pipeline du compilateur V8 avec Ignition et TurboFan dans Chrome Canary !'
---
L'équipe V8 travaille actuellement sur une nouvelle pipeline de compilateur par défaut qui nous aidera à améliorer la vitesse de [JavaScript en conditions réelles](/blog/real-world-performance). Vous pouvez découvrir cette nouvelle pipeline dès aujourd'hui dans Chrome Canary, afin de nous aider à vérifier qu'il n'y a pas de surprises lorsque nous déploierons cette nouvelle configuration sur tous les canaux Chrome.

<!--truncate-->
La nouvelle pipeline de compilateur utilise l'[interpréteur Ignition](/blog/ignition-interpreter) et le [compilateur TurboFan](/docs/turbofan) pour exécuter tout le JavaScript (au lieu de la pipeline classique composée des compilateurs Full-codegen et Crankshaft). Un sous-ensemble aléatoire d'utilisateurs des canaux Chrome Canary et Chrome Developer teste déjà cette nouvelle configuration. Cependant, tout le monde peut activer la nouvelle pipeline (ou revenir à l'ancienne) en modifiant une option dans about:flags.

Vous pouvez contribuer à tester cette nouvelle pipeline en l'activant et en l'utilisant avec Chrome sur vos sites web préférés. Si vous êtes développeur web, nous vous invitons à tester vos applications web avec cette nouvelle pipeline de compilateur. Si vous constatez une régression en termes de stabilité, de précision ou de performance, veuillez [signaler le problème au traceur de bugs de V8](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline).

## Comment activer la nouvelle pipeline

### Dans Chrome 58

1. Installez la dernière version [Beta](https://www.google.com/chrome/browser/beta.html)
2. Ouvrez l'URL `about:flags` dans Chrome
3. Recherchez "**Experimental JavaScript Compilation Pipeline**" et définissez-le sur "**Enabled**"

![](/_img/test-the-future/58.png)

### Dans Chrome 59.0.3056 et versions ultérieures

1. Installez la dernière version [Canary](https://www.google.com/chrome/browser/canary.html) ou [Dev](https://www.google.com/chrome/browser/desktop/index.html?extra=devchannel)
2. Ouvrez l'URL `about:flags` dans Chrome
3. Recherchez "**Classic JavaScript Compilation Pipeline**" et définissez-le sur "**Disabled**"

![](/_img/test-the-future/59.png)

La valeur standard est "**Default**", ce qui signifie que soit la nouvelle **soit** l'ancienne pipeline est active en fonction de la configuration du test A/B.

## Comment signaler des problèmes

Veuillez nous informer si votre expérience de navigation change de manière significative lors de l'utilisation de la nouvelle pipeline par rapport à la pipeline par défaut. Si vous êtes développeur web, testez la performance de la nouvelle pipeline sur votre application web (mobile) pour voir comment elle est affectée. Si vous découvrez que votre application web se comporte étrangement (ou que des tests échouent), veuillez nous en informer :

1. Assurez-vous d'avoir correctement activé la nouvelle pipeline comme décrit dans la section précédente.
2. [Créez un bug sur le traceur de bugs de V8](https://bugs.chromium.org/p/v8/issues/entry?template=Bug%20report%20for%20the%20new%20pipeline).
3. Joignez un échantillon de code que nous pouvons utiliser pour reproduire le problème.
