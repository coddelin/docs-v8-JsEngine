---
title: &apos;Construire V8 à partir du code source&apos;
description: &apos;Ce document explique comment construire V8 à partir de sa source.&apos;
---
Pour pouvoir construire V8 à partir de zéro sur Windows/Linux/macOS pour x64, veuillez suivre les étapes suivantes.

## Obtenir le code source de V8

Suivez les instructions de notre guide sur [comment récupérer le code source de V8](/docs/source-code).

## Installer les dépendances de compilation

1. Pour macOS : installez Xcode et acceptez son contrat de licence. (Si vous avez installé les outils en ligne de commande séparément, [supprimez-les d'abord](https://bugs.chromium.org/p/chromium/issues/detail?id=729990#c1).)

1. Assurez-vous d'être dans le répertoire source de V8. Si vous avez suivi toutes les étapes de la section précédente, vous êtes déjà au bon endroit.

1. Téléchargez toutes les dépendances nécessaires à la construction :

   ```bash
   gclient sync
   ```

   Pour les employés de Google - Si vous voyez des erreurs de type Failed to fetch file ou Login required en lançant les hooks, essayez d'abord de vous authentifier auprès de Google Storage en exécutant :

   ```bash
   gsutil.py config
   ```

   Connectez-vous avec votre compte @google.com et entrez `0` lorsqu'il vous sera demandé un ID de projet.

1. Cette étape est uniquement nécessaire sous Linux. Installez des dépendances supplémentaires pour la construction :

    ```bash
    ./build/install-build-deps.sh
    ```

## Construire V8

1. Assurez-vous d'être dans le répertoire source de V8 sur la branche `main`.

    ```bash
    cd /path/to/v8
    ```

1. Récupérez les dernières modifications et installez toutes nouvelles dépendances nécessaires à la construction :

    ```bash
    git pull && gclient sync
    ```

1. Compilez le code source :

    ```bash
    tools/dev/gm.py x64.release
    ```

    Ou, pour compiler le code source et exécuter immédiatement les tests :

    ```bash
    tools/dev/gm.py x64.release.check
    ```

    Pour plus d'informations sur le script d'assistance `gm.py` et les commandes qu'il déclenche, consultez [Build avec GN](/docs/build-gn).
