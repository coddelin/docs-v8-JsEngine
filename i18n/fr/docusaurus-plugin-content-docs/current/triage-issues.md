---
title: "Triages des problèmes"
description: "Ce document explique comment traiter les problèmes dans le traqueur de bugs de V8."
---
Ce document explique comment traiter les problèmes dans le [traqueur de bugs de V8](/bugs).

## Comment obtenir le tri d'un problème

- *Traqueur V8*: Définissez l'état sur `Non trié`
- *Traqueur Chromium*: Définissez l'état sur `Non trié` et ajoutez le composant `Blink>JavaScript`

## Comment attribuer des problèmes V8 dans le traqueur Chromium

Veuillez déplacer les problèmes vers la file d'attente des shérifs spécialisés V8, dans l'une des
catégories suivantes :

- Mémoire : `component:blink>javascript status=Untriaged label:Performance-Memory`
    - Apparaîtra dans [cette](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=component%3Ablink%3Ejavascript+status%3DUntriaged+label%3APerformance-Memory+&colspec=ID+Pri+M+Stars+ReleaseBlock+Cr+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=tiles) recherche
- Stabilité : `status=available,untriaged component:Blink>JavaScript label:Stability -label:Clusterfuzz`
    - Apparaîtra dans [cette](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=status%3Davailable%2Cuntriaged+component%3ABlink%3EJavaScript+label%3AStability+-label%3AClusterfuzz&colspec=ID+Pri+M+Stars+ReleaseBlock+Component+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=ids) recherche
    - Aucun cc nécessaire, le problème sera trié automatiquement par un shérif
- Performance : `status=untriaged component:Blink>JavaScript label:Performance`
    - Apparaîtra dans [cette](https://bugs.chromium.org/p/chromium/issues/list?colspec=ID%20Pri%20M%20Stars%20ReleaseBlock%20Cr%20Status%20Owner%20Summary%20OS%20Modified&x=m&y=releaseblock&cells=tiles&q=component%3Ablink%3Ejavascript%20status%3DUntriaged%20label%3APerformance&can=2) recherche
    - Aucun cc nécessaire, le problème sera trié automatiquement par un shérif
- Clusterfuzz : Définissez le bug sur l'état suivant :
    - `label:ClusterFuzz component:Blink>JavaScript status:Untriaged`
    - Apparaîtra dans [cette](https://bugs.chromium.org/p/chromium/issues/list?can=2&q=label%3AClusterFuzz+component%3ABlink%3EJavaScript+status%3AUntriaged&colspec=ID+Pri+M+Stars+ReleaseBlock+Component+Status+Owner+Summary+OS+Modified&x=m&y=releaseblock&cells=ids) recherche.
    - Aucun cc nécessaire, le problème sera trié automatiquement par un shérif
- Sécurité : Tous les problèmes de sécurité sont triés par les shérifs de sécurité de Chromium. Veuillez consulter [la signalisation des bugs de sécurité](/docs/security-bugs) pour plus d'informations.

Si vous avez besoin de l'attention d'un shérif, veuillez consulter les informations de rotation.

Utilisez le composant `Blink>JavaScript` pour tous les problèmes.

**Veuillez noter que cela s'applique uniquement aux problèmes suivis dans le traqueur de problèmes Chromium.**
