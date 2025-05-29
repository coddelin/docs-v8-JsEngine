---
title: &apos;Chrome accueille Speedometer 2.0 !&apos;
author: &apos;les équipes Blink et V8&apos;
date: 2018-01-24 13:33:37
tags:
  - benchmarks
description: &apos;Un aperçu des améliorations de performance que nous avons apportées jusqu&apos;à présent à Blink et V8, basées sur Speedometer 2.0.&apos;
tweet: &apos;956232641736421377&apos;
---
Depuis la sortie initiale de Speedometer 1.0 en 2014, les équipes Blink et V8 utilisent ce benchmark comme proxy pour l&apos;utilisation réelle des frameworks JavaScript populaires et ont réalisé des gains de vitesse considérables sur ce benchmark. Nous avons vérifié indépendamment que ces améliorations se traduisent par des bénéfices réels pour les utilisateurs en mesurant sur des sites Web réels et avons observé que les améliorations des temps de chargement des pages des sites populaires ont également amélioré le score de Speedometer.

<!--truncate-->
Pendant ce temps, JavaScript a évolué rapidement, ajoutant de nombreuses nouvelles fonctionnalités au langage avec ES2015 et les standards ultérieurs. Il en va de même pour les frameworks eux-mêmes, et ainsi Speedometer 1.0 est devenu obsolète au fil du temps. L&apos;utilisation de Speedometer 1.0 comme indicateur d&apos;optimisation comporte donc le risque de ne pas mesurer les nouveaux modèles de code activement utilisés.

Les équipes Blink et V8 accueillent favorablement [la récente version mise à jour du benchmark Speedometer 2.0](https://webkit.org/blog/8063/speedometer-2-0-a-benchmark-for-modern-web-app-responsiveness/). Appliquer le concept original à une liste de frameworks contemporains, de transpileurs et de fonctionnalités ES2015 rend ce benchmark à nouveau idéal pour les optimisations. Speedometer 2.0 est un excellent ajout à [notre ensemble d&apos;outils de benchmarking pour les performances réelles](/blog/real-world-performance).

## Performances actuelles de Chrome

Les équipes Blink et V8 ont déjà terminé un premier tour d&apos;améliorations, soulignant l&apos;importance de ce benchmark pour nous et poursuivant notre voyage en nous concentrant sur les performances réelles. En comparant Chrome 60 de juillet 2017 avec le dernier Chrome 64, nous avons réalisé environ une amélioration de 21 % du score total (exécutions par minute) sur un MacBook Pro de mi-2016 (4 cœurs, 16 Go de RAM).

![Comparaison des scores Speedometer 2 entre Chrome 60 et 64](/_img/speedometer-2/scores.png)

Examinons de plus près les éléments individuels de Speedometer 2.0. Nous avons doublé les performances du runtime React en améliorant [`Function.prototype.bind`](https://chromium.googlesource.com/v8/v8/+/808dc8cff3f6530a627ade106cbd814d16a10a18). Vanilla-ES2015, AngularJS, Preact et VueJS ont enregistré une amélioration de 19 % à 42 % grâce à [l&apos;accélération de l&apos;analyse JSON](https://chromium-review.googlesource.com/c/v8/v8/+/700494) et à diverses autres corrections de performance. Le runtime de l&apos;application jQuery-TodoMVC a été réduit grâce à des améliorations de l&apos;implémentation du DOM de Blink, notamment [des contrôles de formulaire plus légers](https://chromium.googlesource.com/chromium/src/+/f610be969095d0af8569924e7d7780b5a6a890cd) et [des ajustements de notre analyseur HTML](https://chromium.googlesource.com/chromium/src/+/6dd09a38aaae9c15adf5aad966f761f180bf1cef). Des ajustements supplémentaires des caches en ligne de V8 en combinaison avec le compilateur optimisant ont permis d&apos;améliorer les performances à tous les niveaux.

![Améliorations des scores pour chaque sous-test de Speedometer 2 de Chrome 60 à 64](/_img/speedometer-2/improvements.png)

Un changement significatif par rapport à Speedometer 1.0 est le calcul du score final. Auparavant, la moyenne de tous les scores favorisait uniquement le travail sur les éléments les plus lents. Lorsque nous examinons les temps absolus passés sur chaque élément, nous constatons par exemple que la version EmberJS-Debug prend environ 35 fois plus de temps que le benchmark le plus rapide. Ainsi, pour améliorer le score global, se concentrer sur EmberJS-Debug a le plus grand potentiel.

![](/_img/speedometer-2/time.png)

Speedometer 2.0 utilise la moyenne géométrique pour le score final, favorisant des investissements égaux dans chaque framework. Prenons notre récente amélioration de 16,5 % de Preact mentionnée ci-dessus. Il serait plutôt injuste de renoncer à l&apos;amélioration de 16,5 % simplement à cause de sa faible contribution au temps total.

Nous sommes impatients d&apos;apporter de nouvelles améliorations de performance à Speedometer 2.0 et, par conséquent, à l&apos;ensemble du Web. Restez à l&apos;écoute pour plus de démonstrations de performance.
