---
title: "Statistiques d'Appels au Runtime"
description: "Ce document explique comment utiliser les Statistiques d'Appels au Runtime pour obtenir des métriques détaillées internes à V8."
---
[Le panneau Performance de DevTools](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/) fournit des informations sur les performances de runtime de votre application web en visualisant diverses métriques internes à Chrome. Cependant, certaines métriques de bas niveau de V8 ne sont pas actuellement exposées dans DevTools. Cet article vous guide à travers la manière la plus robuste de collecter des métriques détaillées internes à V8, appelées Statistiques d'Appels au Runtime ou RCS, via `chrome://tracing`.

La fonctionnalité de traçage enregistre le comportement de l'ensemble du navigateur, y compris les autres onglets, fenêtres et extensions, elle fonctionne donc mieux lorsqu'elle est réalisée dans un profil utilisateur propre, avec les extensions désactivées, et sans autres onglets du navigateur ouverts :

```bash
# Démarrez une nouvelle session du navigateur Chrome avec un profil utilisateur propre et les extensions désactivées
google-chrome --user-data-dir="$(mktemp -d)" --disable-extensions
```

Tapez l'URL de la page que vous souhaitez mesurer dans le premier onglet, mais ne chargez pas encore la page.

![](/_img/rcs/01.png)

Ajoutez un deuxième onglet et ouvrez `chrome://tracing`. Astuce : vous pouvez simplement entrer `chrome:tracing`, sans les barres obliques.

![](/_img/rcs/02.png)

Cliquez sur le bouton “Enregistrer” pour préparer l'enregistrement d'une trace. Choisissez d'abord “Développeur web” et sélectionnez ensuite “Modifier les catégories”.

![](/_img/rcs/03.png)

Sélectionnez `v8.runtime_stats` dans la liste. En fonction de la profondeur de votre enquête, vous pouvez également sélectionner d'autres catégories.

![](/_img/rcs/04.png)

Appuyez sur “Enregistrer” et revenez au premier onglet pour charger la page. Le moyen le plus rapide est d'utiliser <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>1</kbd> pour passer directement au premier onglet, puis d'appuyer sur <kbd>Entrée</kbd> pour valider l'URL saisie.

![](/_img/rcs/05.png)

Attendez que votre page soit entièrement chargée ou que le tampon soit plein, puis arrêtez l'enregistrement en appuyant sur “Stop”.

![](/_img/rcs/06.png)

Recherchez une section “Renderer” qui contient le titre de la page web de l'onglet enregistré. Le moyen le plus simple de le faire est de cliquer sur “Processus”, puis de cliquer sur “Aucun” pour désélectionner toutes les entrées, et enfin de sélectionner uniquement le processus de rendu qui vous intéresse.

![](/_img/rcs/07.png)

Sélectionnez les événements de trace/tranches en appuyant sur <kbd>Shift</kbd> et en les faisant glisser. Assurez-vous de couvrir _toutes_ les sections, y compris `CrRendererMain` et les éventuels `ThreadPoolForegroundWorker`. Un tableau contenant toutes les tranches sélectionnées apparaîtra en bas.

![](/_img/rcs/08.png)

Faites défiler vers le haut droit du tableau et cliquez sur le lien à côté de “Tableau des statistiques d'appels au Runtime”.

![](/_img/rcs/09.png)

Dans la vue qui apparaît, faites défiler jusqu'en bas pour voir un tableau détaillé montrant où V8 passe son temps.

![](/_img/rcs/10.png)

En ouvrant une catégorie, vous pouvez approfondir encore davantage les données.

![](/_img/rcs/11.png)

## Interface en ligne de commande

Exécutez [`d8`](/docs/d8) avec `--runtime-call-stats` pour obtenir des métriques RCS depuis la ligne de commande :

```bash
d8 --runtime-call-stats foo.js
```
