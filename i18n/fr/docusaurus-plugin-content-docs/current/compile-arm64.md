---
title: 'Compilation sur Linux Arm64'
description: 'Astuces et conseils pour compiler V8 nativement sur Linux Arm64'
---
Si vous avez suivi les instructions sur la façon de [récupérer le code source](/docs/source-code) et [compiler](/docs/build-gn) V8 sur une machine qui n'est ni un x86 ni un Mac équipé d'Apple Silicon, vous avez peut-être rencontré quelques difficultés, dues au système de build qui télécharge des binaires natifs sans pouvoir les exécuter. Cependant, même si l'utilisation d'une machine Linux Arm64 pour travailler sur V8 n'est __pas officiellement supportée__, surmonter ces obstacles est assez simple.

## Contournement de `vpython`

`fetch v8`, `gclient sync` et d'autres commandes de `depot_tools` utilisent un wrapper pour python appelé "vpython". Si vous rencontrez des erreurs liées à cela, vous pouvez définir la variable suivante pour utiliser l'installation python du système à la place :

```bash
export VPYTHON_BYPASS="manually managed python not supported by chrome operations"
```

## Binaire `ninja` compatible

La première chose à faire est de s'assurer d'utiliser un binaire natif pour `ninja`, que nous choisissons à la place de celui de `depot_tools`. Une méthode simple pour le faire est de modifier votre PATH comme suit lors de l'installation de `depot_tools` :

```bash
export PATH=$PATH:/path/to/depot_tools
```

De cette manière, vous pourrez utiliser l'installation `ninja` de votre système, si elle est disponible. Sinon, vous pouvez [le construire à partir du code source](https://github.com/ninja-build/ninja#building-ninja-itself).

## Compilation de clang

Par défaut, V8 voudra utiliser sa propre version de clang qui pourrait ne pas fonctionner sur votre machine. Vous pourriez ajuster les arguments GN pour [utiliser le clang ou GCC du système](#system_clang_gcc), mais vous pourriez préférer utiliser le même clang que celui d'origine, car il s'agit de la version la mieux supportée.

Vous pouvez le compiler localement directement à partir du dépôt de V8 :

```bash
./tools/clang/scripts/build.py --without-android --without-fuchsia \
                               --host-cc=gcc --host-cxx=g++ \
                               --gcc-toolchain=/usr \
                               --use-system-cmake --disable-asserts
```

## Configuration manuelle des arguments GN

Les scripts pratiques peuvent ne pas fonctionner par défaut. Vous devrez donc configurer les arguments GN manuellement en suivant le [manuel](/docs/build-gn#gn). Vous pouvez obtenir les configurations "release", "optdebug" et "debug" habituelles avec les arguments suivants :

- `release`

```bash
is_debug=false
```

- `optdebug`

```bash
is_debug=true
v8_enable_backtrace=true
v8_enable_slow_dchecks=true
```

- `debug`

```bash
is_debug=true
v8_enable_backtrace=true
v8_enable_slow_dchecks=true
v8_optimized_debug=false
```

## Utilisation de clang ou GCC du système

Compiler avec GCC consiste simplement à désactiver l'utilisation de clang :

```bash
is_clang=false
```

Notez que par défaut, V8 utilisera `lld` pour l'édition de liens, ce qui nécessite une version récente de GCC. Vous pouvez utiliser `use_lld=false` pour passer à l'éditeur de liens gold ou ajouter `use_gold=false` pour utiliser `ld`.

Si vous souhaitez utiliser le clang installé avec votre système, par exemple dans `/usr`, vous pouvez utiliser les arguments suivants :

```bash
clang_base_path="/usr"
clang_use_chrome_plugins=false
```

Cependant, étant donné que la version de clang du système peut ne pas être bien supportée, vous devrez probablement faire face à des avertissements, tels que des options de compilation inconnues. Dans ce cas, il est utile de ne pas traiter les avertissements comme des erreurs avec :

```bash
treat_warnings_as_errors=false
```
