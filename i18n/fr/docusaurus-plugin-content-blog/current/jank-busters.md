---
title: "Jank Busters Partie Un"
author: "les jank busters : Jochen Eisinger, Michael Lippautz et Hannes Payer"
avatars:
  - "michael-lippautz"
  - "hannes-payer"
date: 2015-10-30 13:33:37
tags:
  - mémoire
description: 'Cet article discute des optimisations mises en œuvre entre Chrome 41 et Chrome 46 qui réduisent significativement les pauses de la collecte des ordures, améliorant ainsi l'expérience utilisateur.'
---
Le jank, ou en d'autres termes les saccades visibles, peut être remarqué lorsque Chrome n'arrive pas à rendre une image dans les 16,66 ms (perturbant le mouvement à 60 images par seconde). À ce jour, la plupart des travaux de collecte des ordures de V8 sont effectués sur le thread principal de rendu, cf. Figure 1, entraînant souvent du jank lorsque trop d'objets doivent être maintenus. Éliminer le jank a toujours été une priorité élevée pour l'équipe V8 ([1](https://blog.chromium.org/2011/11/game-changer-for-interactive.html), [2](https://www.youtube.com/watch?v=3vPOlGRH6zk), [3](/blog/free-garbage-collection)). Cet article discute de quelques optimisations mises en œuvre entre Chrome 41 et Chrome 46 qui réduisent significativement les pauses de la collecte des ordures, offrant une meilleure expérience utilisateur.

<!--truncate-->
![Figure 1 : Collecte des ordures effectuée sur le thread principal](/_img/jank-busters/gc-main-thread.png)

Une source majeure de jank pendant la collecte des ordures est le traitement des diverses structures de données comptables. Beaucoup de ces structures de données permettent des optimisations qui ne sont pas liées à la collecte des ordures. Deux exemples sont la liste de tous les ArrayBuffers et la liste des vues de chaque ArrayBuffer. Ces listes permettent une implémentation efficace de l'opération DetachArrayBuffer sans imposer aucun impact sur les performances lors de l'accès à une vue d'ArrayBuffer. Toutefois, dans des situations où une page Web crée des millions d'ArrayBuffers (par exemple, des jeux basés sur WebGL), la mise à jour de ces listes pendant la collecte des ordures entraîne un jank significatif. Dans Chrome 46, nous avons supprimé ces listes et détecté les tampons détachés en insérant des contrôles avant chaque chargement et stockage dans les ArrayBuffers. Cela amortit le coût de la traversée de la grande liste comptable pendant la collecte des ordures en le répartissant sur toute l'exécution du programme, entraînant moins de jank. Bien que les contrôles par accès puissent théoriquement ralentir le débit des programmes qui utilisent intensément les ArrayBuffers, en pratique, le compilateur d'optimisation de V8 peut souvent éliminer les contrôles redondants et déplacer les contrôles restants hors des boucles, ce qui permet une exécution beaucoup plus fluide avec peu ou pas de pénalité de performance globale.

Une autre source de jank est la tenue de livres associée au suivi de la durée de vie des objets partagés entre Chrome et V8. Bien que les tas de mémoire de Chrome et V8 soient distincts, ils doivent être synchronisés pour certains objets, comme les nœuds DOM, qui sont implémentés dans le code C++ de Chrome mais accessibles depuis JavaScript. V8 crée un type de données opaque appelé un handle qui permet à Chrome de manipuler un objet du tas V8 sans connaître aucun des détails de l'implémentation. La durée de vie de l'objet est liée au handle : tant que Chrome conserve le handle, le collecteur d'ordures de V8 ne supprimera pas l'objet. V8 crée une structure de données interne appelée référence globale pour chaque handle qu'il renvoie à Chrome via l'API V8, et ces références globales indiquent au collecteur d'ordures de V8 que l'objet est toujours vivant. Pour les jeux WebGL, Chrome peut créer des millions de tels handles, et V8, à son tour, doit créer les références globales correspondantes pour gérer leur cycle de vie. Le traitement de ces énormes quantités de références globales pendant la pause principale de la collecte des ordures est observable sous forme de jank. Heureusement, les objets communiqués à WebGL sont souvent simplement transmis et ne sont jamais réellement modifiés, permettant une simple analyse statique [escape analysis](https://en.wikipedia.org/wiki/Escape_analysis). En essence, pour les fonctions WebGL connues pour généralement prendre de petits tableaux comme paramètres, les données sous-jacentes sont copiées dans la pile, rendant une référence globale obsolète. Le résultat d'une approche mixte est une réduction du temps de pause jusqu'à 50 % pour les jeux WebGL gourmands en rendu.

La majorité de la collecte des ordures de V8 est effectuée sur le thread principal de rendu. Déplacer les opérations de collecte des ordures vers des threads concurrents réduit le temps d'attente pour le collecteur d'ordures et réduit davantage le jank. Cela est une tâche intrinsèquement compliquée, car l'application JavaScript principale et le collecteur d'ordures peuvent simultanément observer et modifier les mêmes objets. Jusqu'à présent, la concurrence était limitée au balayage de l'ancienne génération du tas régulier d'objet JS. Récemment, nous avons également implémenté le balayage concurrent de l'espace de code et de mappage du tas V8. De plus, nous avons implémenté le démapage concurrent des pages inutilisées pour réduire le travail qui doit être effectué sur le thread principal, cf. Figure 2.

![Figure 2: Certaines opérations de collecte des ordures effectuées sur les threads de collecte des ordures concurrente.](/_img/jank-busters/gc-concurrent-threads.png)

L'impact des optimisations discutées est clairement visible dans les jeux basés sur WebGL, par exemple [la démo Oort Online de Turbolenz](http://oortonline.gl/). La vidéo suivante compare Chrome 41 à Chrome 46:

<figure>
  <div class="video video-16:9">
    <iframe src="https://www.youtube.com/embed/PgrCJpbTs9I" width="640" height="360" loading="lazy"></iframe>
  </div>
</figure>

Nous sommes actuellement en train de rendre davantage de composants de la collecte des ordures incrémentiels, concurrents et parallèles, pour réduire encore plus les temps de pause de collecte des ordures sur le thread principal. Restez à l'écoute, car nous avons des correctifs intéressants en préparation.
