---
title: "Construire V8 avec GN"
description: "Ce document explique comment utiliser GN pour construire V8."
---
V8 est construit avec l'aide de [GN](https://gn.googlesource.com/gn/+/master/docs/). GN est un système de construction méta, car il génère des fichiers de construction pour plusieurs autres systèmes de compilation. La manière dont vous compilez dépend donc du système de construction « back-end » et du compilateur que vous utilisez.
Les instructions ci-dessous supposent que vous avez déjà un [code source de V8](/docs/source-code) et que vous avez [installé les dépendances nécessaires](/docs/build).

Plus d'informations sur GN sont disponibles dans [la documentation de Chromium](https://www.chromium.org/developers/gn-build-configuration) ou dans [la documentation propre à GN](https://gn.googlesource.com/gn/+/master/docs/).

Construire V8 à partir du code source implique trois étapes :

1. générer des fichiers de construction
1. compiler
1. exécuter des tests

Il y a deux méthodes de travail pour construire V8 :

- la méthode pratique utilisant un script d'aide appelé `gm` qui combine agréablement les trois étapes
- la méthode brute, où vous exécutez chaque commande pour chaque étape manuellement

## Construire V8 avec `gm` (la méthode pratique)

`gm` est un script tout-en-un pratique qui génère des fichiers de construction, déclenche la compilation et éventuellement exécute également les tests. Il se trouve dans `tools/dev/gm.py` dans votre extrait de V8. Nous vous recommandons d'ajouter un alias à votre configuration de shell :

```bash
alias gm=/path/to/v8/tools/dev/gm.py
```

Vous pouvez ensuite utiliser `gm` pour construire V8 pour des configurations connues, telles que `x64.release` :

```bash
gm x64.release
```

Pour exécuter les tests juste après la construction, exécutez :

```bash
gm x64.release.check
```

`gm` affiche toutes les commandes qu'il exécute, ce qui facilite leur suivi et leur réexécution si nécessaire.

`gm` permet de créer les binaires nécessaires et d'exécuter des tests spécifiques avec une seule commande :

```bash
gm x64.debug mjsunit/foo cctest/test-bar/*
```

## Construire V8 : méthode brute et manuelle

### Étape 1 : générer des fichiers de construction

Il existe plusieurs façons de générer les fichiers de construction :

1. La méthode brute et manuelle implique d'utiliser directement `gn`.
1. Un script d'aide nommé `v8gen` rationalise le processus pour des configurations courantes.

#### Générer des fichiers de construction avec `gn`

Générez des fichiers de construction pour le répertoire `out/foo` en utilisant `gn` :

```bash
gn args out/foo
```

Cela ouvre une fenêtre d'éditeur pour spécifier les [arguments de `gn`](https://gn.googlesource.com/gn/+/master/docs/reference.md). Alternativement, vous pouvez passer les arguments en ligne de commande :

```bash
gn gen out/foo --args='is_debug=false target_cpu="x64" v8_target_cpu="arm64" use_goma=true'
```

Cela génère des fichiers de construction pour compiler V8 avec le simulateur arm64 en mode release en utilisant `goma` pour la compilation.

Pour un aperçu de tous les arguments `gn` disponibles, exécutez :

```bash
gn args out/foo --list
```

#### Générer des fichiers de construction avec `v8gen`

Le dépôt V8 inclut un script pratique `v8gen` pour générer plus facilement des fichiers de construction pour des configurations courantes. Nous vous recommandons d'ajouter un alias à votre configuration de shell :

```bash
alias v8gen=/path/to/v8/tools/dev/v8gen.py
```

Exécutez `v8gen --help` pour plus d'informations.

Lister les configurations disponibles (ou les bots d'un master) :

```bash
v8gen list
```

```bash
v8gen list -m client.v8
```

Construire comme un bot particulier du `client.v8` waterfall dans le dossier `foo` :

```bash
v8gen -b 'V8 Linux64 - debug builder' -m client.v8 foo
```

### Étape 2 : compiler V8

Pour construire tout V8 (en supposant que `gn` ait généré dans le dossier `x64.release`), exécutez :

```bash
ninja -C out/x64.release
```

Pour construire des cibles spécifiques comme `d8`, ajoutez-les à la commande :

```bash
ninja -C out/x64.release d8
```

### Étape 3 : exécuter des tests

Vous pouvez passer le répertoire de sortie au gestionnaire de tests. D'autres paramètres pertinents sont déduits de la construction :

```bash
tools/run-tests.py --outdir out/foo
```

Vous pouvez également tester votre construction la plus récente (dans `out.gn`) :

```bash
tools/run-tests.py --gn
```

**Problèmes de construction ? Déposez un rapport à [v8.dev/bug](https://v8.dev/bug) ou demandez de l'aide sur [v8-users@googlegroups.com](mailto:v8-users@googlegroups.com).**
