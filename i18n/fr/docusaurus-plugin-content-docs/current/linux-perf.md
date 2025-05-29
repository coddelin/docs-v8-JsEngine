---
title: "Intégration de `perf` de V8 sous Linux"
description: 'Ce document explique comment analyser les performances du code JIT de V8 avec l'outil `perf` de Linux.'
---
V8 prend en charge l'outil `perf` de Linux en natif. Cela est activé via les options de ligne de commande `--perf-prof`.
V8 génère des données de performance pendant l'exécution dans un fichier qui peut être utilisé pour analyser les performances du code JIT de V8 (y compris les noms des fonctions JS) avec l'outil `perf` de Linux.

## Exigences

- Version 5 ou supérieure de `linux-perf` (les versions précédentes ne prennent pas en charge le JIT). (Voir les instructions à la [fin](#build-perf))
- Construire V8/Chrome avec `enable_profiling=true` pour un meilleur symbolisme du code C++.

## Compilation de V8

Pour utiliser l'intégration de V8 avec `perf` sous Linux, vous devez le compiler avec le drapeau GN `enable_profiling = true` :

```bash
echo 'enable_profiling = true' >> out/x64.release/args.gn
autoninja -C out/x64.release
```

## Profilage de `d8` avec [`linux-perf-d8.py`](https://source.chromium.org/search?q=linux-perf-d8.py)

Après avoir compilé `d8`, vous pouvez commencer à utiliser linux perf :

```bash
tools/profiling/linux-perf-d8.py out/x64.release/d8 path/to/test.js;
```

Un exemple plus complet :

```bash
echo '(function f() {
    var s = 0; for (var i = 0; i < 1000000000; i++) { s += i; } return s;
  })();' > test.js;

# Utilisez des drapeaux V8 personnalisés et un répertoire de sortie séparé pour moins d'encombrement :
mkdir perf_results
tools/profiling/linux-perf-d8.py --perf-data-dir=perf_results \
    out/x64.release/d8 --expose-gc --allow-natives-syntax test.js;

# Interface utilisateur avancée (`-flame` est réservé aux employés de Google, utilisez `-web` comme alternative publique) :
pprof -flame perf_results/XXX_perf.data.jitted;
# Outil basé sur le terminal :
perf report -i perf_results/XXX_perf.data.jitted;
```

Consultez `linux-perf-d8.py --help` pour plus de détails. Notez que vous pouvez utiliser tous les drapeaux `d8` après l'argument du binaire d8.


## Profilage de Chrome ou content_shell avec [linux-perf-chrome.py](https://source.chromium.org/search?q=linux-perf-chrome.py)

1. Vous pouvez utiliser le script [linux-perf-chrome.py](https://source.chromium.org/search?q=linux-perf-chrome.py) pour profiler Chrome. Assurez-vous d'ajouter les [drapeaux GN requis pour Chrome](https://chromium.googlesource.com/chromium/src/+/master/docs/profiling.md#General-checkout-setup) pour obtenir des symboles C++ corrects.

1. Une fois votre compilation prête, vous pouvez profiler un site web avec des symboles complets pour le code C++ et JS.

    ```bash
    mkdir perf_results;
    tools/profiling/linux-perf-chrome.py out/x64.release/chrome \
        --perf-data-dir=perf_results --timeout=30
    ```

1. Naviguez vers votre site web, puis fermez le navigateur (ou attendez que le `--timeout` se termine).
1. Après avoir quitté le navigateur, `linux-perf.py` post-traitera les fichiers et affichera une liste avec un fichier de résultat pour chaque processus de rendu :

   ```
   chrome_renderer_1583105_3.perf.data.jitted      19.79MiB
   chrome_renderer_1583105_2.perf.data.jitted       8.59MiB
   chrome_renderer_1583105_4.perf.data.jitted       0.18MiB
   chrome_renderer_1583105_1.perf.data.jitted       0.16MiB
   ```

## Exploration des résultats de linux-perf

Enfin, vous pouvez utiliser l'outil `perf` de Linux pour explorer le profil d'un processus de rendu d8 ou Chrome :

```bash
perf report -i perf_results/XXX_perf.data.jitted
```

Vous pouvez également utiliser [pprof](https://github.com/google/pprof) pour générer plus de visualisations :

```bash
# Remarque : `-flame` est réservé à Google, utilisez `-web` comme alternative publique :
pprof -flame perf_results/XXX_perf.data.jitted;
```

## Utilisation à bas niveau de linux-perf

### Utilisation directe de linux-perf avec `d8`

Selon votre cas d'utilisation, vous pourriez vouloir utiliser linux-perf directement avec `d8`.
Cela nécessite un processus en deux étapes : d'abord, `perf record` crée un fichier `perf.data` qui doit être post-traité avec `perf inject` pour y injecter les symboles JS.

``` bash
perf record --call-graph=fp --clockid=mono --freq=max \
    --output=perf.data
    out/x64.release/d8 \
      --perf-prof --no-write-protect-code-memory \
      --interpreted-frames-native-stack \
    test.js;
perf inject --jit --input=perf.data --output=perf.data.jitted;
perf report --input=perf.data.jitted;
```

### Drapeaux linux-perf de V8

[`--perf-prof`](https://source.chromium.org/search?q=FLAG_perf_prof) est utilisé dans la ligne de commande de V8 pour enregistrer des échantillons de performance dans le code JIT.

[`--nowrite-protect-code-memory`](https://source.chromium.org/search?q=FLAG_nowrite_protect_code_memory) est requis pour désactiver la protection en écriture pour la mémoire de code. Cela est nécessaire car `perf` ignore les informations sur les pages de code lorsqu'il détecte l'événement correspondant à la suppression du bit d'écriture sur la page de code. Voici un exemple qui enregistre des échantillons à partir d'un fichier JavaScript de test :

[`--interpreted-frames-native-stack`](https://source.chromium.org/search?q=FLAG_interpreted_frames_native_stack) est utilisé pour créer différents points d'entrée (versions copiées de InterpreterEntryTrampoline) pour les fonctions interprétées afin qu'elles puissent être distinguées par `perf` uniquement sur la base de l'adresse. Étant donné que l'InterpreterEntryTrampoline doit être copié, cela implique une légère régression en termes de performance et de mémoire.


### Utilisation de linux-perf directement avec Chrome

1. Vous pouvez utiliser les mêmes options V8 pour profiler Chrome lui-même. Suivez les instructions ci-dessus pour les bonnes options V8 et ajoutez les [options GN de Chrome requises](https://chromium.googlesource.com/chromium/src/+/master/docs/profiling.md#General-checkout-setup) à votre build de Chrome.

1. Une fois votre build prêt, vous pouvez profiler un site web avec à la fois les symboles complets pour le code C++ et JS.

    ```bash
    out/x64.release/chrome \
        --user-data-dir=`mktemp -d` \
        --no-sandbox --incognito --enable-benchmarking \
        --js-flags='--perf-prof --no-write-protect-code-memory --interpreted-frames-native-stack'
    ```

1. Après avoir démarré Chrome, trouvez l'identifiant du processus de rendu à l'aide du gestionnaire des tâches et utilisez-le pour commencer le profilage :

    ```bash
    perf record -g -k mono -p $RENDERER_PID -o perf.data
    ```

1. Naviguez jusqu'à votre site web, puis continuez avec la section suivante expliquant comment évaluer le résultat de perf.

1. Une fois l'exécution terminée, combinez les informations statiques recueillies par l'outil `perf` avec les échantillons de performance générés par V8 pour le code JIT :

   ```bash
   perf inject --jit --input=perf.data --output=perf.data.jitted
   ```

1. Enfin, vous pouvez utiliser l'outil Linux `perf` [pour explorer](#Explore-linux-perf-results)

## Compiler `perf`

Si vous disposez d'un noyau Linux obsolète, vous pouvez compiler linux-perf avec prise en charge du JIT localement.

- Installez un nouveau noyau Linux, puis redémarrez votre machine :

  ```bash
   sudo apt-get install linux-generic-lts-wily;
  ```

- Installez les dépendances :

  ```bash
  sudo apt-get install libdw-dev libunwind8-dev systemtap-sdt-dev libaudit-dev \
     libslang2-dev binutils-dev liblzma-dev;
  ```

- Téléchargez les sources du noyau incluant la dernière version source de l'outil `perf` :

  ```bash
  cd some/directory;
  git clone --depth 1 git://git.kernel.org/pub/scm/linux/kernel/git/tip/tip.git;
  cd tip/tools/perf;
  make
  ```

Dans les étapes suivantes, invoquez `perf` comme `some/director/tip/tools/perf/perf`.
