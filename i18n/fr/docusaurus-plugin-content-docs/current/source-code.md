---
title: "Vérification du code source de V8"
description: "Ce document explique comment vérifier le code source de V8 localement."
---
Ce document explique comment vérifier le code source de V8 localement. Si vous souhaitez simplement parcourir le code source en ligne, utilisez ces liens :

- [parcourir](https://chromium.googlesource.com/v8/v8/)
- [parcourir bleeding edge](https://chromium.googlesource.com/v8/v8/+/master)
- [modifications](https://chromium.googlesource.com/v8/v8/+log/master)

## Utilisation de Git

Le dépôt Git de V8 est situé à l'adresse https://chromium.googlesource.com/v8/v8.git, avec un miroir officiel sur GitHub : https://github.com/v8/v8.

Ne vous contentez pas de ‘git clone’ l'une de ces URL ! Si vous souhaitez construire V8 à partir de votre checkout, suivez plutôt les instructions ci-dessous pour tout configurer correctement.

## Instructions

1. Sous Linux ou macOS, installez d'abord Git puis [`depot_tools`](https://commondatastorage.googleapis.com/chrome-infra-docs/flat/depot_tools/docs/html/depot_tools_tutorial.html#_setting_up).

    Sous Windows, suivez les instructions de Chromium ([pour les employés de Google](https://goto.google.com/building-chrome-win), [pour les non-employés de Google](https://chromium.googlesource.com/chromium/src/+/master/docs/windows_build_instructions.md#Setting-up-Windows)) pour installer Git, Visual Studio, les outils de débogage pour Windows, et `depot_tools`.

1. Mettez à jour `depot_tools` en exécutant la commande suivante dans votre terminal ou shell. Sous Windows, cela doit être fait dans l'invite de commande (`cmd.exe`), et non dans PowerShell ou autres.

    ```
    gclient
    ```

1. Pour **l'accès en push**, vous devez configurer un fichier `.netrc` avec votre mot de passe Git :

    1. Allez sur https://chromium.googlesource.com/new-password et connectez-vous avec votre compte committer (généralement un compte `@chromium.org`). Remarque : créer un nouveau mot de passe ne révoque pas automatiquement les mots de passe précédemment créés. Veuillez vous assurer d'utiliser le même email que celui défini pour `git config user.email`.
    1. Regardez la grande boîte grise contenant les commandes shell. Collez ces lignes dans votre shell.

1. Obtenez maintenant le code source de V8, y compris toutes les branches et les dépendances :

    ```bash
    mkdir ~/v8
    cd ~/v8
    fetch v8
    cd v8
    ```

Après cela, vous êtes intentionnellement en état de tête détachée.

Optionnellement, vous pouvez spécifier comment les nouvelles branches doivent être suivies :

```bash
git config branch.autosetupmerge always
git config branch.autosetuprebase always
```

Alternativement, vous pouvez créer de nouvelles branches locales comme ceci (recommandé) :

```bash
git new-branch fix-bug-1234
```

## Rester à jour

Mettez à jour votre branche actuelle avec `git pull`. Notez que si vous n'êtes pas sur une branche, `git pull` ne fonctionnera pas, et vous devrez utiliser `git fetch` à la place.

```bash
git pull
```

Parfois, les dépendances de V8 sont mises à jour. Vous pouvez les synchroniser en exécutant :

```bash
gclient sync
```

## Envoi de code pour révision

```bash
git cl upload
```

## Commit

Vous pouvez utiliser la case à cocher CQ sur codereview pour effectuer les commits (préféré). Consultez également les [instructions Chromium](https://chromium.googlesource.com/chromium/src/+/master/docs/infra/cq.md) pour les drapeaux CQ et le dépannage.

Si vous avez besoin de plus de trybots que par défaut, ajoutez ce qui suit à votre message de commit sur Gerrit (par exemple pour ajouter un bot nosnap) :

```
CQ_INCLUDE_TRYBOTS=tryserver.v8:v8_linux_nosnap_rel
```

Pour intégrer manuellement, mettez à jour votre branche :

```bash
git pull --rebase origin
```

Ensuite, committez en utilisant

```bash
git cl land
```

## Jobs de test

Cette section est uniquement utile pour les membres du projet V8.

### Création d'un job de test à partir de codereview

1. Téléchargez un CL sur Gerrit.

    ```bash
    git cl upload
    ```

1. Essayez le CL en envoyant un job de test aux robots de test comme ceci :

    ```bash
    git cl try
    ```

1. Attendez que les robots de test construisent et que vous receviez un email avec le résultat. Vous pouvez également vérifier l'état du test sur votre patch dans Gerrit.

1. Si l'application du patch échoue, vous devez soit rebaser votre patch, soit spécifier la révision de V8 pour synchroniser avec :

```bash
git cl try --revision=1234
```

### Création d'un job de test à partir d'une branche locale

1. Commitez certaines modifications à une branche git dans le repo local.

1. Testez la modification en envoyant un job de test aux robots de test comme ceci :

    ```bash
    git cl try
    ```

1. Attendez que les robots de test construisent et que vous receviez un email avec le résultat. Remarque : il y a des problèmes avec certaines des répliques actuellement. L'envoi des jobs de test depuis codereview est recommandé.

### Arguments utiles

L'argument de révision indique aux robots de test quelle révision de la base de code est utilisée pour appliquer vos modifications locales. Sans la révision, [la révision LKGR de V8](https://v8-status.appspot.com/lkgr) est utilisée comme base.

```bash
git cl try --revision=1234
```

Pour éviter que votre job de test ne soit exécuté sur tous les robots, utilisez le drapeau `--bot` avec une liste de noms de builders séparés par des virgules. Exemple :

```bash
git cl try --bot=v8_mac_rel
```

### Visualisation du serveur de test

```bash
git cl try-results
```

## Branches de code source

Il existe plusieurs branches différentes de V8 ; si vous ne savez pas quelle version choisir, vous voudrez très probablement la version stable à jour. Consultez notre [Processus de Publication](/docs/release-process) pour plus d'informations sur les différentes branches utilisées.

Vous pourriez vouloir suivre la version de V8 que Chrome distribue sur ses canaux stables (ou bêta), voir https://omahaproxy.appspot.com/.
