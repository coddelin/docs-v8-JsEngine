---
title: "Évaluer la couverture du code"
description: "Ce document explique quoi faire si vous travaillez sur un changement dans V8 et que vous souhaitez évaluer sa couverture de code."
---
Vous travaillez sur un changement. Vous souhaitez évaluer la couverture de code pour votre nouveau code.

V8 fournit deux outils pour cela : en local, sur votre machine ; et avec la prise en charge des infrastructures de construction.

## Local

Relatif à la racine du dépôt v8, utilisez `./tools/gcov.sh` (testé sur linux). Cela utilise les outils de couverture de code de gnu et des scripts pour produire un rapport HTML, où vous pouvez examiner les informations de couverture par répertoire, fichier, puis ligne de code.

Le script construit V8 dans un répertoire `out` séparé, en utilisant les paramètres `gcov`. Nous utilisons un répertoire séparé pour éviter d'écraser vos paramètres de construction normaux. Ce répertoire séparé est appelé `cov` — il est créé directement à la racine du dépôt. `gcov.sh` exécute ensuite la suite de tests et produit le rapport. Le chemin vers le rapport est fourni à la fin du script.

Si votre changement comporte des composants spécifiques à une architecture, vous pouvez collecter cumulativement la couverture des exécutions spécifiques à l'architecture.

```bash
./tools/gcov.sh x64 arm
```

Cela reconstruit sur place pour chaque architecture, en écrasant les binaires de l'exécution précédente, mais en préservant et en accumulant les résultats de couverture.

Par défaut, le script collecte les résultats des exécutions en mode `Release`. Si vous voulez `Debug`, vous pouvez le spécifier :

```bash
BUILD_TYPE=Debug ./tools/gcov.sh x64 arm arm64
```

Exécuter le script sans options affichera également un résumé des options.

## Bot de couverture de code

Pour chaque modification effectuée, nous exécutons une analyse de couverture sur x64 — voir le [bot de couverture](https://ci.chromium.org/p/v8/builders/luci.v8.ci/V8%20Linux64%20-%20gcov%20coverage). Nous ne faisons pas fonctionner les bots de couverture pour d'autres architectures.

Pour obtenir le rapport d'une exécution particulière, vous voulez lister les étapes de construction, trouver celle intitulée « rapport de couverture gsutil » (vers la fin), et ouvrir le « rapport » qu'elle contient.
