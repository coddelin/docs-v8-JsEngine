---
title: &apos;Sparkplug — un compilateur JavaScript non optimisant&apos;
author: &apos;[Leszek Swirski](https://twitter.com/leszekswirski) — peut-être pas l&apos;étincelle la plus brillante, mais au moins la plus rapide&apos;
avatars:
  - leszek-swirski
date: 2021-05-27
tags:
  - JavaScript
extra_links:
  - href: https://fonts.googleapis.com/css?family=Gloria+Hallelujah&display=swap
    rel: stylesheet
description: &apos;Avec V8 v9.1, nous améliorons les performances de V8 de 5 à 15 % grâce à Sparkplug : un nouveau compilateur JavaScript non optimisant.&apos;
tweet: &apos;1397945205198835719&apos;
---

<!-- markdownlint-capture -->
<!-- markdownlint-disable no-inline-html -->
<style>
  svg \{
    --other-frame-bg: rgb(200 200 200 / 20%);
    --machine-frame-bg: rgb(200 200 200 / 50%);
    --js-frame-bg: rgb(212 205 100 / 60%);
    --interpreter-frame-bg: rgb(215 137 218 / 50%);
    --sparkplug-frame-bg: rgb(235 163 104 / 50%);
  \}
  svg text \{
    font-family: Gloria Hallelujah, cursive;
  \}
  .flipped .frame \{
    transform: scale(1, -1);
  \}
  .flipped .frame text \{
    transform:scale(1, -1);
  \}
</style>
<!-- markdownlint-restore -->

<!--truncate-->
Écrire un moteur JavaScript performant demande plus que simplement avoir un compilateur très optimisant comme TurboFan. En particulier pour les sessions de courte durée, comme le chargement de sites web ou les outils en ligne de commande, il se passe beaucoup de choses avant même que le compilateur optimisant ait la possibilité de commencer à optimiser, sans parler d’avoir le temps de générer du code optimisé.

C’est pour cette raison que, depuis 2016, nous nous sommes éloignés des benchmarks synthétiques (comme Octane) pour mesurer [les performances dans le monde réel](/blog/real-world-performance), et pourquoi depuis lors nous avons travaillé intensément sur les performances de JavaScript en dehors du compilateur optimisant. Cela a impliqué de travailler sur l’analyse syntaxique, le streaming, notre modèle d’objet, la concurrence dans le collecteur de déchets, la mise en cache du code compilé… disons simplement que nous n’étions jamais ennuyés.

Cependant, en cherchant à améliorer les performances de l’exécution initiale du JavaScript, nous atteignons des limitations en optimisant notre interpréteur. L’interpréteur de V8 est hautement optimisé et très rapide, mais les interpréteurs ont des surcharges inhérentes dont nous ne pouvons pas nous débarrasser ; des éléments comme les surcharges de décodage du bytecode ou les surcharges de dispatching font partie intégrante des fonctionnalités d’un interpréteur.

Avec notre modèle actuel à deux compilateurs, nous ne pouvons pas atteindre le code optimisé beaucoup plus rapidement ; nous pouvons (et sommes) en train de travailler pour rendre l’optimisation plus rapide, mais à un certain point, vous ne pouvez aller plus vite qu’en supprimant des passes d’optimisation, ce qui réduit les performances maximales. Pire encore, nous ne pouvons vraiment pas commencer à optimiser plus tôt, car nous n’aurons pas encore de feedback sur les formes d’objets stables.

Arrive Sparkplug : notre nouveau compilateur JavaScript non optimisant que nous lançons avec V8 v9.1, qui se place entre l’interpréteur Ignition et le compilateur optimisant TurboFan.

![Le nouveau pipeline de compilation](/_svg/sparkplug/pipeline.svg)

## Un compilateur rapide

Sparkplug est conçu pour compiler rapidement. Très rapidement. À tel point que nous pouvons pratiquement compiler quand nous voulons, nous permettant de passer plus agressivement au code Sparkplug que nous ne le pouvons au code TurboFan.

Il y a quelques astuces qui rendent le compilateur Sparkplug rapide. Tout d’abord, il triche ; les fonctions qu’il compile ont déjà été compilées en bytecode, et le compilateur de bytecode a déjà fait la plupart du travail difficile comme la résolution des variables, la détermination de si les parenthèses sont réellement des fonctions fléchées, la réécriture des instructions de déstructuration, et ainsi de suite. Sparkplug compile à partir du bytecode plutôt qu’à partir du code source JavaScript, et n’a donc pas à se préoccuper de tout cela.

La deuxième astuce est que Sparkplug ne génère aucune représentation intermédiaire (IR) comme le font la plupart des compilateurs. Au lieu de cela, Sparkplug compile directement en code machine dans un seul passage linéaire sur le bytecode, générant du code qui correspond à l’exécution de ce bytecode. En fait, tout le compilateur est une [instruction `switch`](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/baseline/baseline-compiler.cc;l=465;drc=55cbb2ce3be503d9096688b72d5af0e40a9e598b) à l’intérieur d’une [boucle `for`](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/baseline/baseline-compiler.cc;l=290;drc=9013bf7765d7febaa58224542782307fa952ac14), exécutant des fonctions de génération de code machine fixes par bytecode.

```cpp
// Le compilateur Sparkplug (abrégé).
for (; !iterator.done(); iterator.Advance()) {
  VisitSingleBytecode();
}
```

Le manque d'IR signifie que le compilateur a des opportunités d'optimisation limitées, au-delà des très locales optimisations de fenêtres de code. Cela signifie également que nous devons porter l'intégralité de l'implémentation séparément pour chaque architecture que nous supportons, puisqu'il n'y a pas d'étape intermédiaire indépendante de l'architecture. Mais, il se trouve qu'aucun de ces éléments n'est problématique : un compilateur rapide est un compilateur simple, donc le code est assez facile à porter ; et Sparkplug n'a pas besoin d'une optimisation lourde, car nous avons de toute façon un excellent compilateur d'optimisation plus tard dans le pipeline.

::: note
Techniquement, nous effectuons actuellement deux passes sur le bytecode — une pour découvrir les boucles, et une seconde pour générer le code réel. Nous prévoyons cependant de supprimer la première étape à terme.
:::

## Cadres compatibles avec l'interpréteur

Ajouter un nouveau compilateur à une machine virtuelle JavaScript existante et mature est une tâche intimidante. Il y a toutes sortes de choses que vous devez prendre en charge au-delà de l'exécution standard ; V8 possède un débogueur, un profilage CPU par analyse des piles, il y a des traces de pile pour les exceptions, une intégration dans le processus de montée en gamme, un remplacement en pile pour optimiser le code des boucles chaudes… c'est beaucoup.

Sparkplug fait un habile tour de passe-passe qui simplifie la plupart de ces problèmes, en maintenant des « cadres de pile compatibles avec l'interpréteur ».

Reprenons un peu. Les cadres de pile sont la manière dont l'exécution du code stocke l'état des fonctions ; chaque fois que vous appelez une nouvelle fonction, elle crée un nouveau cadre de pile pour les variables locales de cette fonction. Un cadre de pile est défini par un pointeur de cadre (marquant son début) et un pointeur de pile (marquant sa fin) :

![Un cadre de pile, avec des pointeurs de cadre et de pile](/_svg/sparkplug/basic-frame.svg)

::: note
<!-- markdownlint-capture -->
<!-- markdownlint-disable no-inline-html -->
À ce stade, environ la moitié d'entre vous criera en disant : « Ce diagramme n'a pas de sens, les piles croissent évidemment dans l'autre direction ! ». Ne vous inquiétez pas, j'ai créé un bouton pour vous : <button id="flipStacksButton">Je pense que les piles croissent vers le haut</button>
<script src="/js/sparkplug.js">
</script>
<!-- markdownlint-restore -->
:::

Lorsqu'une fonction est appelée, l'adresse de retour est poussée dans la pile ; ceci est retiré par la fonction au moment de son retour, pour savoir où retourner. Ensuite, quand cette fonction crée un nouveau cadre, elle sauvegarde l'ancien pointeur de cadre dans la pile et définit le nouveau pointeur de cadre au début de son propre cadre de pile. Ainsi, la pile possède une chaîne de pointeurs de cadre, chacun marquant le début d'un cadre qui pointe vers le précédent :

![Cadres de pile pour plusieurs appels](/_svg/sparkplug/machine-frame.svg)

::: note
À strictement parler, ceci est juste une convention suivie par le code généré, non une exigence. C'est tout de même une convention assez universelle ; les seules exceptions proviennent lorsque les cadres de pile sont complètement elidés ou lorsque des tables auxiliaires de débogage peuvent être utilisées pour parcourir les cadres de pile.
:::

C'est la disposition générale de la pile pour tous les types de fonction ; il y a ensuite des conventions sur la manière dont les arguments sont passés et sur la manière dont la fonction stocke les valeurs dans son cadre. Dans V8, nous avons la convention pour les cadres JavaScript où les arguments (y compris le récepteur) sont poussés [dans l'ordre inverse](/blog/adaptor-frame) dans la pile avant que la fonction ne soit appelée, et où les premiers emplacements dans la pile sont : la fonction actuelle appelée ; le contexte avec lequel elle est appelée ; et le nombre d'arguments passés. C'est notre disposition de cadre JS « standard » :

![Un cadre de pile JavaScript dans V8](/_svg/sparkplug/js-frame.svg)

Cette convention d'appel JS est partagée entre les cadres optimisés et interprétés, et c'est ce qui nous permet, par exemple, de parcourir la pile avec un minimum de surcharge lors du profilage du code dans le panneau de performance du débogueur.

Dans le cas de l'interpréteur Ignition, la convention devient plus explicite. Ignition est un interpréteur basé sur des registres, ce qui signifie qu'il y a des registres virtuels (à ne pas confondre avec les registres machine !) qui stockent l'état actuel de l'interpréteur — cela inclut les variables locales des fonctions JavaScript (déclarations var/let/const) et les valeurs temporaires. Ces registres sont stockés dans le cadre de pile de l'interpréteur, ainsi qu'un pointeur vers le tableau de bytecode en cours d'exécution et le décalage du bytecode actuel dans ce tableau :

![Un cadre de pile de l'interpréteur V8](/_svg/sparkplug/interpreter-frame.svg)

Sparkplug crée intentionnellement et maintient une disposition du cadre qui correspond au cadre de l'interpréteur ; chaque fois que l'interpréteur aurait stocké une valeur de registre, Sparkplug en stocke également une. Il le fait pour plusieurs raisons :

1. Cela simplifie la compilation avec Sparkplug ; Sparkplug peut simplement refléter le comportement de l'interpréteur sans avoir à maintenir une sorte de mappage des registres de l'interpréteur à l'état de Sparkplug.
1. Cela accélère également la compilation, puisque le compilateur de bytecode a déjà fait le travail difficile de l'allocation des registres.
1. Cela rend presque triviale l'intégration avec le reste du système ; le débogueur, le profileur, le désempilement des exceptions, l'impression des traces de pile, toutes ces opérations parcourent les piles pour découvrir quelle pile de fonctions en exécution est en cours, et toutes ces opérations continuent de fonctionner avec Sparkplug presque inchangées, car pour autant qu'elles soient concernées, tout ce qu'elles voient est un cadre de l'interpréteur.
1. Cela rend le remplacement sur la pile (OSR) trivial. L'OSR se produit lorsque la fonction actuellement exécutée est remplacée en cours d'exécution ; actuellement, cela se produit lorsqu'une fonction interprétée est dans une boucle active (où elle passe à un code optimisé pour cette boucle), et lorsque le code optimisé est désoptimisé (où il rétrograde et continue l'exécution de la fonction dans l'interpréteur). Avec des cadres Sparkplug reflétant les cadres de l'interpréteur, toute logique OSR qui fonctionne pour l'interpréteur fonctionnera pour Sparkplug ; encore mieux, nous pouvons passer de l'interpréteur au code Sparkplug avec presque aucun surcoût de traduction de cadre.

Nous apportons un petit changement au cadre de pile de l'interpréteur : nous ne maintenons pas le décalage de bytecode à jour pendant l'exécution du code Sparkplug. À la place, nous stockons une correspondance bidirectionnelle entre la plage d'adresses du code Sparkplug et le décalage de bytecode correspondant ; une correspondance relativement simple à encoder, puisque le code Sparkplug est émis directement à partir d'un parcours linéaire du bytecode. Chaque fois qu'un accès au cadre de pile souhaite connaître le "décalage de bytecode" pour un cadre Sparkplug, nous consultons l'instruction actuellement exécutée dans cette correspondance et retournons le décalage de bytecode correspondant. De même, chaque fois que nous voulons effectuer un OSR de l'interpréteur vers Sparkplug, nous pouvons consulter le décalage de bytecode actuel dans la correspondance et sauter à l'instruction Sparkplug correspondante.

Vous remarquerez que nous avons maintenant un emplacement inutilisé dans le cadre de pile, là où le décalage de bytecode serait ; un emplacement que nous ne pouvons pas supprimer car nous voulons garder le reste de la pile inchangé. Nous réutilisons cet emplacement de pile pour mettre en cache le "vecteur de rétroaction" pour la fonction actuellement exécutée ; un vecteur qui stocke les données de forme d'objet et qui doit être chargé pour la plupart des opérations. Tout ce que nous avons à faire, c'est d'être un peu prudents autour de l'OSR pour veiller à remplacer soit le décalage de bytecode correct, soit le vecteur de rétroaction correct pour cet emplacement.

Ainsi, le cadre de pile Sparkplug est :

![Un cadre de pile Sparkplug de V8](/_svg/sparkplug/sparkplug-frame.svg)

## Délégation aux fonctions intégrées

Sparkplug génère en fait très peu de son propre code. La sémantique de JavaScript est complexe, et cela nécessiterait beaucoup de code pour exécuter même les opérations les plus simples. Forcer Sparkplug à régénérer ce code en ligne à chaque compilation serait mauvais pour plusieurs raisons :

  1. Cela augmenterait de manière notable les temps de compilation, juste à cause de la quantité de code à générer,
  2. Cela augmenterait la consommation de mémoire du code Sparkplug, et
  3. Nous devrions réimplémenter la génération de code pour de nombreuses fonctionnalités JavaScript pour Sparkplug, ce qui signifierait probablement plus de bugs et une plus grande surface de sécurité.

Donc, au lieu de tout cela, la plupart du code de Sparkplug se contente d'appeler des "fonctions intégrées", de petits morceaux de code machine intégrés au binaire, pour effectuer le vrai travail. Ces fonctions intégrées sont soit les mêmes que celles utilisées par l'interpréteur, soit partagent au moins la majorité de leur code avec les gestionnaires de bytecode de l'interpréteur.

En fait, le code Sparkplug se résume essentiellement à des appels intégrés et au contrôle de flux :

Vous pourriez maintenant penser : « Eh bien, à quoi bon tout cela alors ? Sparkplug ne fait-il pas juste le même travail que l'interpréteur ? » — et vous n'auriez pas tout à fait tort. À bien des égards, Sparkplug est "simplement" une sérialisation de l'exécution de l'interpréteur, appelant les mêmes fonctions intégrées et maintenant le même cadre de pile. Néanmoins, même cela vaut la peine, car cela élimine (ou plus précisément, précompile) ces surcharges d'interpréteur inévitables, comme le décodage des opérandes et l'envoi au bytecode suivant.

Il s'avère que les interpréteurs contournent de nombreuses optimisations CPU : les opérandes statiques sont lus dynamiquement depuis la mémoire par l'interpréteur, forçant le CPU à stagner ou à spéculer sur ce que pourraient être les valeurs ; l'envoi au bytecode suivant nécessite une prédiction réussie de branche pour rester performant, et même si les spéculations et les prédictions sont correctes, vous avez quand même dû exécuter tout le code de décodage et d'envoi, et vous avez toujours utilisé un espace précieux dans vos différents buffers et caches. Un CPU est en fait un interpréteur lui-même, bien qu'un pour le code machine ; vu sous cet angle, Sparkplug est un "transpileur" de bytecode Ignition au bytecode du CPU, déplaçant l'exécution de vos fonctions d'un "émulateur" à une exécution "native".

## Performance

Alors, comment fonctionne Sparkplug dans la vraie vie ? Nous avons exécuté Chrome 91 avec quelques benchmarks, sur quelques-uns de nos robots de performance, avec et sans Sparkplug, pour voir son impact.

Spoiler alert : nous sommes assez satisfaits.

::: note
Les benchmarks ci-dessous listent divers robots exécutant divers systèmes d'exploitation. Bien que le système d'exploitation soit proéminent dans le nom du robot, nous ne pensons pas qu'il ait réellement beaucoup d'impact sur les résultats. En revanche, les différentes machines ont également des configurations CPU et mémoire différentes, dont nous pensons qu'elles sont la principale source des différences.
:::

# Speedometer

[Speedometer](https://browserbench.org/Speedometer2.0/) est un benchmark qui tente d'émuler l'utilisation des frameworks de sites web du monde réel, en construisant une application web de suivi de liste de tâches à l'aide de quelques frameworks populaires, et en testant les performances de cette application lors de l'ajout et de la suppression de tâches. Nous avons constaté qu'il reflète très bien les comportements réels de chargement et d'interaction, et nous avons constaté à plusieurs reprises que les améliorations apportées à Speedometer se reflètent dans nos métriques du monde réel.

Avec Sparkplug, le score Speedometer s'améliore de 5 à 10 %, selon le robot que nous examinons.

![Amélioration médiane du score Speedometer avec Sparkplug, à travers plusieurs bots de performance. Les barres d'erreur indiquent l'intervalle interquartile.](/_img/sparkplug/benchmark-speedometer.svg)

# Évaluations de navigation

Speedometer est une excellente référence, mais elle ne raconte qu'une partie de l'histoire. Nous avons également un ensemble de « benchmarks de navigation », qui sont des enregistrements d'un ensemble de sites Web réels que nous pouvons rejouer, script un peu d'interaction, et obtenir une vue plus réaliste de la façon dont nos divers métriques se comportent dans le monde réel.

Sur ces benchmarks, nous avons choisi d'examiner notre métrique « temps du thread principal de V8 », qui mesure le temps total passé dans V8 (y compris la compilation et l'exécution) sur le thread principal (c'est-à-dire à l'exclusion de l'analyse en flux continu ou de la compilation optimisée en arrière-plan). C'est notre meilleur moyen de voir comment Sparkplug s'amortit tout en excluant d'autres sources de bruit de benchmark.

Les résultats sont variés, et dépendent beaucoup de la machine et du site Web, mais dans l'ensemble ils sont excellents : nous constatons des améliorations de l'ordre de 5 à 15 %.

::: figure Amélioration médiane du temps du thread principal de V8 sur nos benchmarks de navigation avec 10 répétitions. Les barres d'erreur indiquent l'intervalle interquartile.
![Résultat pour linux-perf bot](/_img/sparkplug/benchmark-browsing-linux-perf.svg) ![Résultat pour win-10-perf bot](/_img/sparkplug/benchmark-browsing-win-10-perf.svg) ![Résultat pour benchmark-browsing-mac-10_13_laptop_high_end-perf bot](/_img/sparkplug/benchmark-browsing-mac-10_13_laptop_high_end-perf.svg) ![Résultat pour mac-10_12_laptop_low_end-perf bot](/_img/sparkplug/benchmark-browsing-mac-10_12_laptop_low_end-perf.svg) ![Résultat pour mac-m1_mini_2020 bot](/_img/sparkplug/benchmark-browsing-mac-m1_mini_2020-perf.svg)
:::

En conclusion : V8 dispose d'un nouveau compilateur non-optimisant ultra-rapide, qui améliore les performances de V8 sur les benchmarks du monde réel de 5 à 15 %. Il est déjà disponible dans V8 v9.1 derrière le flag `--sparkplug`, et nous le déploierons dans Chrome 91.
